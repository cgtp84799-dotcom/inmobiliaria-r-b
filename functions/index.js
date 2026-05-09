// functions/index.js
  // ─── v2 imports ───────────────────────────────────────────────────────────────
  const { onRequest }                          = require("firebase-functions/v2/https");
  const { onDocumentWritten, onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
  const { defineSecret }                       = require("firebase-functions/params");
  const { setGlobalOptions }                   = require("firebase-functions/v2");
  const { onSchedule }                         = require("firebase-functions/v2/scheduler");
  const admin                                  = require("firebase-admin");
  const nodemailer                             = require("nodemailer");

  const { handleSitemapRequest }   = require("./src/sitemap");
  const { handlePrerenderRequest } = require("./src/prerender");

  // ─── Emails (todos los builders centralizados) ────────────────────────────────
  const {
    // Visitas
    pendingVisitEmail,
    approvedVisitEmail,
    rejectedVisitEmail,
    rescheduledVisitEmail,
    agentVisitAssignedEmail,
    visitCancelledByClientEmail,
    visitCancelledAgentEmail,
    visitCancelledAdminEmail,
    // Usuarios
    welcomeEmail,
    accessRequestNotificationEmail,
    accessRequestApprovedEmail,
    accessRequestRejectedEmail,
    accountDeletionRequestEmail,
    // Contratos
    contractCreatedEmail,
    contractCreatedAgentEmail,
    contractStageAgentEmail,
    contractStageAdminEmail,
    getContractStageEmail,
    // Pagos y alertas — cliente
    paymentConfirmedEmail,
    paymentReminderEmail,
    paymentDueTodayEmail,
    latePaymentEmail,
    contractExpiryEmail,
    renewalWindowEmail,
    // Pagos y alertas — agente
    paymentConfirmedAgentEmail,
    paymentDueAgentEmail,
    latePaymentAgentEmail,
    contractExpiryAgentEmail,
    renewalWindowAgentEmail,
    // Pagos y alertas — admin
    paymentConfirmedAdminEmail,
    latePaymentAdminEmail,
    // Contactos / leads web
    contactReceivedEmail,
    contactReceivedAgentEmail,
    contactReceivedAdminEmail,
    // Documentos
    contractDocumentUploadedClientEmail,
  } = require("./src/emails");

  // ─── Email Verification (sistema custom) ───────────────────────────────────
  const {
    buildRequestEmailVerification,
    buildConfirmEmailVerification,
    sendStaffPasswordSetup,
  } = require("./src/emailVerification");

  // ─── Utils ────────────────────────────────────────────────────────────────────
  const { ymd, diffDays, parseDate } = require("./src/emails/utils");

  // ─── Rate Limiter ───────────────────────────────────────────────────────────
  const { rateLimiter } = require("./src/utils/rateLimiter");

  const { SITE_URL: BASE_URL } = require('./src/site.config');
  const SITE_URL = "https://inmobiliaria-ryb-y-asociados.com";

  // ─── Opciones globales ────────────────────────────────────────────────────────
  setGlobalOptions({ region: "us-central1", maxInstances: 10 });

  if (!admin.apps.length) admin.initializeApp();

  // ─── Secrets ──────────────────────────────────────────────────────────────────
  const PRERENDER_TOKEN = defineSecret("PRERENDER_TOKEN");
  const GMAIL_USER = defineSecret("GMAIL_USER");  
  const GMAIL_PASS = defineSecret("GMAIL_PASS");

  // ─── Constantes ───────────────────────────────────────────────────────────────
  const FROM_NAME  = "Inmobiliaria Rincón Bedoya y Asociados";

  // Status que se publican en el catálogo. Acepta canónicos + aliases legacy
  // para data antigua.
  const PUBLIC_STATUS = new Set([
    "", "published", "reserved",
    "disponible", "reservada", "active", "available",
  ]);

  // Orígenes permitidos para CORS — solo dominios de producción y desarrollo local.
  // Rechaza cualquier otro origen para prevenir llamadas cross-origin no autorizadas.
  const ALLOWED_ORIGINS = new Set([
    "https://inmobiliaria-ryb-y-asociados.com",
    "https://www.inmobiliaria-ryb-y-asociados.com",
    "https://inmobiliaria-ryb-y-asociados.web.app",
    "https://inmobiliaria-ryb-y-asociados.firebaseapp.com",
    "http://localhost:5173",
    "http://localhost:4173",
    "http://127.0.0.1:5173",
  ]);

  // ─────────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  function setCorsHeaders(req, res) {
    const origin = req.headers.origin || "";
    const allowed = ALLOWED_ORIGINS.has(origin) ? origin : "";
    if (allowed) {
      res.set("Access-Control-Allow-Origin", allowed);
      res.set("Vary", "Origin");
    }
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }

  function handlePreflight(req, res) {
    if (req.method === "OPTIONS") {
      setCorsHeaders(req, res);
      return res.status(204).send("");
    }
    return null;
  }

  async function assertAdminFromRequest(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      const err = new Error("No autenticado"); err.status = 401; throw err;
    }
    // revocadas o usuarios deshabilitados desde Admin. Antes: bastaba con que
    // el token no hubiera expirado (~1h) aunque el admin ya hubiera bloqueado
    // la cuenta desde la consola.
    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(
        authHeader.split("Bearer ")[1],
        true,
      );
    } catch (_e) {
      const err = new Error("Token inválido o revocado"); err.status = 401; throw err;
    }
    const callerEmail = String(decoded.email || "").trim().toLowerCase();
    if (!callerEmail) { const err = new Error("Token sin email"); err.status = 401; throw err; }
    // existe, probar versión lowercased. Evita DoS cuando un doc legacy
    // quedó con mayúsculas (migraciones antiguas).
    const users = admin.firestore().collection("users");
    let callerDoc = await users.doc(callerEmail).get();
    if (!callerDoc.exists) {
      const alt = decoded.email.trim();
      if (alt && alt !== callerEmail) {
        callerDoc = await users.doc(alt).get();
      }
    }
    if (!callerDoc.exists || callerDoc.data()?.role !== "admin") {
      const err = new Error("Solo administradores"); err.status = 403; throw err;
    }
    return { callerEmail };
  }
  // cree usuarios con roles arbitrarios ("superadmin", "root", etc.).
  const VALID_ROLES = new Set(["admin", "member", "viewer"]);
  const VALID_STATUSES = new Set(["active", "inactive", "pending", "blocked"]);

  // ╔══════════════════════════════════════════════════════════════════════╗
  // ║  PUSH_WORTHY_TYPES — DEBE estar SINCRONIZADO con NOTIF_TYPES en       ║
  // ║  src/core/services/notificationService.js                            ║
  // ║                                                                      ║
  // ║  Este Set es la whitelist de tipos que disparan FCM push automático  ║
  // ║  vía el trigger onNotificationCreated. Si un tipo no está aquí, la   ║
  // ║  notificación queda solo in-app (campana) y NUNCA llega como push    ║
  // ║  al celular del usuario.                                             ║
  // ║                                                                      ║
  // ║  ★ FIX CRÍTICO: antes faltaban los tipos de visitas confirmadas,     ║
  // ║  contratos creados, propiedades nuevas, documentos, consultas,       ║
  // ║  perfil — TODO el sistema estaba parcialmente roto porque sólo se    ║
  // ║  enviaban push para una pequeña fracción de eventos.                 ║
  // ╚══════════════════════════════════════════════════════════════════════╝
  const PUSH_WORTHY_TYPES = new Set([
    // ── Visitas ────────────────────────────────────────────────────────
    "visit_request",
    "visit_approved",
    "visit_rejected",
    "visit_rescheduled",
    "visit_cancelled_by_client",
    "visit_completed",
    "visit_assigned",

    // ── Contratos ──────────────────────────────────────────────────────
    "new_contract",
    "contract_assigned",
    "contract_status_changed",
    "contract_stage_changed",
    "contract_deleted",
    "milestone_completed",
    "payment_confirmed",
    "payment_late",
    "contract_document_uploaded",

    // ── Propiedades ────────────────────────────────────────────────────
    "property_created",
    "property_status_changed",
    "property_deleted",

    // ── Clientes / Usuarios ────────────────────────────────────────────
    "new_client",
    "client_deleted",
    "new_user",
    "user_deleted",
    "new_access_request",
    "account_deletion_requested",

    // ── Documentos (NUEVO) ─────────────────────────────────────────────
    "document_uploaded",
    "document_expiring",
    "document_deleted",

    // ── Consultas / Contactos (NUEVO) ──────────────────────────────────
    "new_contact",
    "contact_reply",

    // ── Perfil (NUEVO) ─────────────────────────────────────────────────
    "profile_updated",
    "password_changed",

    // ── Generales ──────────────────────────────────────────────────────
    "welcome",
    "manual",
    "task_assigned",
    "comment_reply",
    "system",
  ]);

  // Email validator — RFC 5322 simplificado para ganar en seguridad práctica.
  function isValidEmail(email) {
    return typeof email === "string"
        && email.length >= 5
        && email.length <= 254
        && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function createTransport(gmailUser, gmailPass) {
    return nodemailer.createTransport({ service: "gmail", auth: { user: gmailUser, pass: gmailPass } });
  }

  async function sendMail(transporter, gmailUser, { to, subject, html }, tag = "") {
    if (!to) { console.warn(`[${tag}] sendMail: destinatario vacío para "${subject}". Ignorado.`); return; }
    await transporter.sendMail({ from: `"${FROM_NAME}" <${gmailUser}>`, to, subject, html });
    console.log(`[${tag}] Email enviado → ${to} — ${subject}`);
  }
  // ─── Helper de push notifications ────────────────────────────────────────────
  // Envía una notificación push al dispositivo del usuario (si tiene token FCM).
  // Se llama automáticamente desde el trigger onNotificationCreated.
  async function sendPushToUser(userEmail, notification) {
    if (!userEmail) return;

    try {
      const userDoc = await admin
        .firestore()
        .collection("users")
        .doc(userEmail)
        .get();

      if (!userDoc.exists) return;

      const fcmToken = userDoc.data().fcmToken;
      if (!fcmToken) return;

      // URL final a abrir
      const finalUrl = notification.actionUrl
        ? (
            notification.actionUrl.startsWith("http")
              ? notification.actionUrl
              : `${SITE_URL}${notification.actionUrl}`
          )
        : `${SITE_URL}/`;

      await admin.messaging().send({
        token: fcmToken,

        notification: {
          title: notification.title || "Nueva notificación",
          body: notification.message || "",
        },

        webpush: {
          notification: {
            icon: `${SITE_URL}/android-chrome-192x192.png`,
            badge: `${SITE_URL}/favicon-32x32.png`,
            vibrate: [200, 100, 200],
            requireInteraction: true,
            tag: notification.type || "notif-ryb",
            renotify: true,

            data: {
              url: finalUrl,
              notifId: notification.id || null,
              type: notification.type || "manual",
              soundUrl: `${SITE_URL}/notification-sound.mp3`,
            },
          },

          fcmOptions: {
            link: finalUrl,
          },
        },

        android: {
          priority: "high",
          notification: {
            sound: "default",
            clickAction: "FLUTTER_NOTIFICATION_CLICK",
            channelId: "ryb_default",
          },
        },

        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1,
            },
          },
        },
      });

      console.log(`[PUSH] Enviado a ${userEmail}: ${notification.title}`);

    } catch (error) {

      // Limpiar token inválido
      if (
        error.code === "messaging/invalid-registration-token" ||
        error.code === "messaging/registration-token-not-registered"
      ) {
        await admin
          .firestore()
          .collection("users")
          .doc(userEmail)
          .update({
            fcmToken: admin.firestore.FieldValue.delete(),
          })
          .catch(() => {});
      }

      console.error(
        `[PUSH] Error enviando a ${userEmail}:`,
        error.message
      );
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // FUNCIÓN 1: deleteUserComplete  (v2 HTTP)
  // ═════════════════════════════════════════════════════════════════════════════
  exports.deleteUserComplete = onRequest({ cors: true }, async (req, res) => {
    const rateKey = req.headers.authorization
      ? `user:${req.headers.authorization}` 
      : `ip:${req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown'}`;
    const rateCheck = rateLimiter.check(rateKey, 20, 60000);
    res.set('X-RateLimit-Limit', 20);
    res.set('X-RateLimit-Remaining', rateCheck.remaining);
    if (!rateCheck.allowed) {
      return res.status(429).json({ error: 'Too many requests. Intenta de nuevo más tarde.' });
    }

    try {
      if (handlePreflight(req, res)) return;
      setCorsHeaders(req, res);
      if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
      const { callerEmail } = await assertAdminFromRequest(req);
      const userId = String(req.body?.data?.userId || "").trim().toLowerCase();
      if (!userId) return res.status(400).json({ error: "userId es requerido" });
      if (!isValidEmail(userId)) return res.status(400).json({ error: "userId debe ser un email válido" });
      if (userId === callerEmail) {
        return res.status(400).json({ error: "No puedes eliminar tu propia cuenta" });
      }
      const userDoc = await admin.firestore().collection("users").doc(userId).get();
      if (!userDoc.exists) return res.status(404).json({ error: "Usuario no encontrado" });
      const userUid = userDoc.data()?.uid;
      if (userUid) await admin.auth().deleteUser(userUid);
      await admin.firestore().collection("users").doc(userId).delete();
      if (userUid) {
        await admin.database().ref(`status/${userUid}`).remove();
        await admin.database().ref(`presence/${userUid}`).remove();
      }
      return res.status(200).json({
        result: {
          success: true,
          message: `Usuario ${userId} eliminado completamente`,
          deletedFrom: ["Authentication", "Firestore", "Realtime Database"],
        },
      });
    } catch (error) {
      setCorsHeaders(req, res);
      console.error("deleteUserComplete Error:", error);
      return res.status(error.status || 500).json({ error: error.message });
    }
  });

// ═════════════════════════════════════════════════════════════════════════════
// FUNCIÓN 2: createUserByAdmin  (v2 HTTP) — CON RATE LIMITING
// ═════════════════════════════════════════════════════════════════════════════
//
// REFACTOR (sistema de verificación custom):
//   • El usuario se crea con status='pending' (no 'active') si no se pasó
//     password explícitamente activable. Antes recibía el welcome al
//     instante aunque aún no hubiera entrado al panel.
//   • Si el admin pasó status='active' explícitamente Y un password, se
//     respeta el flujo antiguo (welcome inmediato vía onUserCreated).
//   • En el flujo nuevo (status='pending'), se envía un correo de
//     "configura tu contraseña" con plantilla corporativa (en lugar de
//     usar la plantilla de Firebase Auth que no se puede personalizar).
//   • El welcome del equipo se enviará después, cuando el usuario haga
//     login por primera vez y el frontend marque status='active'.
// ═════════════════════════════════════════════════════════════════════════════
exports.createUserByAdmin = onRequest(
  { cors: true, secrets: [GMAIL_USER, GMAIL_PASS] },
  async (req, res) => {
  const rateKey = req.headers.authorization
    ? `user:${req.headers.authorization}` 
    : `ip:${req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown'}`;
  const rateCheck = rateLimiter.check(rateKey, 20, 60000);
  res.set('X-RateLimit-Limit', 20);
  res.set('X-RateLimit-Remaining', rateCheck.remaining);
  if (!rateCheck.allowed) {
    return res.status(429).json({ error: 'Too many requests. Intenta de nuevo más tarde.' });
  }

  try {
    if (handlePreflight(req, res)) return;
    setCorsHeaders(req, res);
    if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
    await assertAdminFromRequest(req);
    const data        = req.body?.data || {};
    const email       = String(data.email || "").trim().toLowerCase();
    const password    = String(data.password || "");
    const displayName = String(data.displayName || "").trim();
    const phone       = String(data.phone || "").trim();
    const role        = String(data.role || "member").trim();
    // Cambio de default: si el admin no especifica status, usamos 'pending'
    // para que el welcome se difiera al primer login del usuario.
    const status      = String(data.status || "pending").trim();
    if (!email || !password) return res.status(400).json({ error: "email y password son requeridos" });
    if (!isValidEmail(email)) return res.status(400).json({ error: "email inválido" });
    if (password.length < 8)  return res.status(400).json({ error: "password debe tener al menos 8 caracteres" });
    if (!VALID_ROLES.has(role))     return res.status(400).json({ error: "role inválido" });
    if (!VALID_STATUSES.has(status)) return res.status(400).json({ error: "status inválido" });

    let userRecord;
    let preexisting = false;
    try {
      userRecord = await admin.auth().createUser({ email, password, displayName, disabled: status === "blocked" });
    } catch (e) {
      if (e?.code === "auth/email-already-exists") {
        userRecord = await admin.auth().getUserByEmail(email);
        preexisting = true;
      } else {
        throw e;
      }
    }
    // Firestore, NO sobreescribir — el admin debe usar updateUser. Esto
    // evita "account takeover" pasivo donde un admin cambia el role/status
    // de una cuenta existente sin pasar por flujos de auditoría.
    const existingDoc = await admin.firestore().collection("users").doc(email).get();
    if (preexisting && existingDoc.exists) {
      return res.status(409).json({
        error: "El usuario ya existe. Usa la función de edición para modificarlo.",
        existingRole: existingDoc.data()?.role,
      });
    }
    await admin.firestore().collection("users").doc(email).set(
      { uid: userRecord.uid, email, displayName, phone, role, status,
        // Email de cuenta interna: marcamos verificado en Auth para que el
        // staff no tenga que pasar por el flujo de verificación de cliente.
        emailVerified: true,
        emailVerifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );

    // Marcar emailVerified=true también en Firebase Auth (best effort).
    try {
      await admin.auth().updateUser(userRecord.uid, { emailVerified: true });
    } catch (e) {
      console.warn("[createUserByAdmin] no se pudo marcar emailVerified en Auth:", e.message);
    }

    // Enviar email custom de "configura tu contraseña" con plantilla
    // corporativa. NO usamos sendPasswordResetEmail nativo porque su
    // plantilla no se puede personalizar.
    if (status === "pending") {
      try {
        const gmailUser = GMAIL_USER.value();
        const gmailPass = GMAIL_PASS.value();
        if (gmailUser && gmailPass) {
          await sendStaffPasswordSetup({
            email, displayName, role,
            gmailUser, gmailPass,
          });
        } else {
          console.warn("[createUserByAdmin] credenciales SMTP no configuradas — email de setup no enviado.");
        }
      } catch (e) {
        // No bloqueamos la creación si el email falla — el admin puede
        // reenviar manualmente desde la UI.
        console.error("[createUserByAdmin] error enviando email de setup:", e);
      }
    }

    return res.status(200).json({ result: { success: true, uid: userRecord.uid, email, status } });
  } catch (error) {
    setCorsHeaders(req, res);
    console.error("createUserByAdmin Error:", error);
    return res.status(error.status || 500).json({ error: error.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// FUNCIÓN 3: generateSitemap  (v2 HTTP) — CON RATE LIMITING (lectura)
// ═════════════════════════════════════════════════════════════════════════════
exports.generateSitemap = onRequest({ cors: true }, async (req, res) => {
  const rateKey = `ip:${req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown'}`;
  const rateCheck = rateLimiter.check(rateKey, 200, 60000);
  res.set('X-RateLimit-Limit', 200);
  res.set('X-RateLimit-Remaining', rateCheck.remaining);
  if (!rateCheck.allowed) {
    return res.status(429).json({ error: 'Too many requests. Intenta de nuevo más tarde.' });
  }

  return handleSitemapRequest(req, res);
});

// ═════════════════════════════════════════════════════════════════════════════
// FUNCIÓN 4: serveApp — Prerender para crawlers, SPA para usuarios
// ═════════════════════════════════════════════════════════════════════════════
exports.serveApp = onRequest(
  { cors: false, timeoutSeconds: 30, memory: "256MiB", secrets: [PRERENDER_TOKEN] },
  handlePrerenderRequest
);

// ═════════════════════════════════════════════════════════════════════════════
// FUNCIÓN 5: onVisitStatusChanged  (v2 Firestore trigger)
// ═════════════════════════════════════════════════════════════════════════════
exports.onVisitStatusChanged = onDocumentWritten(
  { document: "visits/{visitId}", secrets: [GMAIL_USER, GMAIL_PASS] },
  async (event) => {
    const before = event.data?.before?.data() ?? null;
    const after  = event.data?.after?.data()  ?? null;
    if (!after) return;

    const prevStatus = before?.status ?? null;
    const nextStatus = String(after.status || "").trim().toLowerCase();
    if (prevStatus === nextStatus) return;

    console.log(`[onVisitStatusChanged] ${event.params.visitId}: ${prevStatus ?? "NEW"} → ${nextStatus}`);

    const gmailUser = GMAIL_USER.value();
    const gmailPass = GMAIL_PASS.value();
    if (!gmailUser || !gmailPass) {
      console.error("[onVisitStatusChanged] Secrets GMAIL_USER / GMAIL_PASS no disponibles.");
      return;
    }

    const transporter = createTransport(gmailUser, gmailPass);
    const send = (opts) => sendMail(transporter, gmailUser, opts, "onVisitStatusChanged");

    const d = {
      clientName:      String(after.clientName      || "Cliente").trim(),
      clientEmail:     String(after.clientEmail      || "").trim(),
      clientPhone:     String(after.clientPhone      || "").trim(),
      clientMessage:   String(after.notes            || "").trim(),
      propertyName:    String(after.propertyName     || "la propiedad").trim(),
      propertyAddress: String(after.propertyAddress  || "").trim(),
      requestedDate:   String(after.requestedDate    || "").trim(),
      requestedTime:   String(after.requestedTime    || "").trim(),
      proposedDate:    String(after.proposedDate     || "").trim(),
      proposedTime:    String(after.proposedTime     || "").trim(),
      agentName:       String(after.agentName        || "").trim(),
      agentEmail:      String(after.agentEmail       || "").trim(),
      adminNotes:      String(after.adminNotes       || "").trim(),
      notes:           String(after.notes            || "").trim(),
    };

    // Solo "pending" se maneja aquí (nueva creación).
    if (prevStatus === null && nextStatus === "pending") {
      const mail = pendingVisitEmail(d);
      await send({ to: d.clientEmail, ...mail });
      return;
    }
    // Los emails de approved/rejected/rescheduled antes los enviaba el frontend
    // vía la extensión /mail. Si la extensión está mal configurada o las rules
    // bloquean el doc, el email se pierde sin trazabilidad. Ahora también los
    // envía este trigger backend usando nodemailer directo — más confiable.
    //
    // NOTA: el frontend (visit.service.js) sigue enviando los suyos. Para
    // evitar emails duplicados al cliente, marca con `mailSentByFrontend: true`
    // si quiere desactivar el envío backend. Sin ese flag, este backend envía.
    if (d.clientEmail && !after.mailSentByFrontend) {
      // ── APROBADA ─────────────────────────────────────────────────────────
      if (nextStatus === "approved") {
        const mail = approvedVisitEmail(d);
        await send({ to: d.clientEmail, ...mail });
        // Notificar al agente si fue asignado
        if (d.agentEmail && d.agentEmail !== d.clientEmail) {
          const agentMail = agentVisitAssignedEmail(d);
          await send({ to: d.agentEmail, ...agentMail });
        }
        return;
      }
      // ── RECHAZADA ────────────────────────────────────────────────────────
      if (nextStatus === "rejected") {
        const mail = rejectedVisitEmail(d);
        await send({ to: d.clientEmail, ...mail });
        return;
      }
      // ── REAGENDADA ───────────────────────────────────────────────────────
      if (nextStatus === "rescheduled") {
        const mail = rescheduledVisitEmail(d);
        await send({ to: d.clientEmail, ...mail });
        return;
      }
    }

    // ── Cancelación del cliente desde el portal ───────────────────────────────
    // y cancelledByClient = true. Antes solo había notif in-app — agente y
    // admin se enteraban solo si abrían el panel. Ahora reciben email.
    const isCancelByClient =
      ["cancelada", "cancelled", "cancelado"].includes(nextStatus) &&
      after.cancelledByClient === true;

    if (isCancelByClient && prevStatus !== nextStatus) {
      const cancelData = {
        ...d,
        cancelReason: String(after.cancelReason || "").trim(),
        visitId: event.params.visitId,
      };

      // Cliente: confirmación de cancelación
      if (d.clientEmail) {
        const mail = visitCancelledByClientEmail(cancelData);
        await send({ to: d.clientEmail, ...mail });
      }

      // Agente: alerta operativa
      if (d.agentEmail && d.agentEmail !== d.clientEmail) {
        const mail = visitCancelledAgentEmail(cancelData);
        await send({ to: d.agentEmail, ...mail });
      }

      // Admins: visibilidad ejecutiva (no a quien sea cliente o agente)
      try {
        const adminsSnap = await admin.firestore()
          .collection("users")
          .where("role", "==", "admin")
          .get();
        const mail = visitCancelledAdminEmail(cancelData);
        for (const adminDoc of adminsSnap.docs) {
          const adminEmail = String(adminDoc.data().email || adminDoc.id || "").trim().toLowerCase();
          if (!adminEmail) continue;
          if (adminEmail === d.clientEmail.toLowerCase()) continue;
          if (adminEmail === d.agentEmail.toLowerCase())  continue;
          await send({ to: adminEmail, ...mail });
        }
      } catch (e) {
        console.error("[onVisitStatusChanged] error notificando admins de cancelación:", e);
      }
      return;
    }

    console.log(`[onVisitStatusChanged] Estado "${nextStatus}" manejado por visit.service.js. Ignorado.`);
  }
);

// ═════════════════════════════════════════════════════════════════════════════
// FUNCIÓN 6: onUserCreated  (v2 Firestore trigger)
// ═════════════════════════════════════════════════════════════════════════════
//
// REFACTOR (sistema de verificación custom):
//   El welcome email YA NO se envía aquí indiscriminadamente. Antes, llegaba
//   al mismo tiempo que el correo de verificación de Firebase Auth → confuso.
//
//   Ahora:
//     • viewer (cliente) sin emailVerified → NO se envía nada. El welcome
//       se dispara en onUserUpdated cuando emailVerified pasa de false→true
//       (después de que el usuario haga click en el link de verificación).
//     • viewer con emailVerified=true al crearse (caso Google sign-in
//       directo) → se envía welcome inmediato.
//     • admin/member con status=pending → NO se envía welcome (el usuario
//       aún tiene que configurar su contraseña). El welcome del equipo
//       se dispara en onUserUpdated cuando status pasa de pending→active
//       (primer login del staff).
//     • admin/member con status=active al crearse (caso legacy / docs
//       directos) → se envía welcome inmediato.
// ═════════════════════════════════════════════════════════════════════════════
exports.onUserCreated = onDocumentCreated(
  { document: "users/{email}", secrets: [GMAIL_USER, GMAIL_PASS] },
  async (event) => {
    const data = event.data?.data() ?? null;
    if (!data) return;
    const role  = String(data.role  || "").toLowerCase();
    const email = String(data.email || event.params.email || "").trim();
    if (!email) return;

    const validRoles = ["viewer", "admin", "member", "agent"];
    if (!validRoles.includes(role)) {
      console.log(`[onUserCreated] role="${role}" no reconocido — bienvenida omitida.`);
      return;
    }

    const status = String(data.status || "").toLowerCase();
    const emailVerified = data.emailVerified === true;

    // Decisión de cuándo enviar welcome al CREARSE el doc:
    //
    //   viewer + emailVerified=true → enviar (Google login)
    //   viewer + emailVerified=false → NO enviar (esperar verificación)
    //   admin/member + status=active → enviar (creación manual sin pending)
    //   admin/member + status=pending → NO enviar (esperar primer login)
    //
    let shouldSendNow = false;
    if (role === "viewer") {
      shouldSendNow = emailVerified;
    } else {
      shouldSendNow = status === "active";
    }

    if (!shouldSendNow) {
      console.log(`[onUserCreated] ${email} (role=${role}, status=${status}, emailVerified=${emailVerified}) — welcome diferido a onUserUpdated.`);
      return;
    }

    const gmailUser = GMAIL_USER.value();
    const gmailPass = GMAIL_PASS.value();
    if (!gmailUser || !gmailPass) return;

    const transporter = createTransport(gmailUser, gmailPass);
    const mail = welcomeEmail(data);
    await sendMail(transporter, gmailUser, { to: email, ...mail }, "onUserCreated");
  }
);

// ═════════════════════════════════════════════════════════════════════════════
// FUNCIÓN 6.B: onUserUpdated  (v2 Firestore trigger)
// ═════════════════════════════════════════════════════════════════════════════
//
// Detecta dos transiciones que disparan el welcome corporativo:
//
//   1. CLIENTE: emailVerified false → true
//      Sucede cuando el cliente hace click en el link y la CF
//      confirmEmailVerification actualiza /users/{email}. Le enviamos el
//      welcome del portal cliente.
//
//   2. STAFF: status pending → active
//      Sucede cuando un admin/member configura su contraseña por primera
//      vez y entra al panel (el frontend marca status=active al detectar
//      primer login de un usuario pending). Le enviamos el welcome del
//      equipo.
//
// Esta función reemplaza el comportamiento antiguo de onUserCreated, que
// enviaba el welcome inmediatamente al crearse el doc (causando que el
// cliente recibiera dos correos a la vez).
// ═════════════════════════════════════════════════════════════════════════════
exports.onUserWelcomeOnReady = onDocumentUpdated(
  { document: "users/{email}", secrets: [GMAIL_USER, GMAIL_PASS] },
  async (event) => {
    const before = event.data?.before?.data() ?? null;
    const after  = event.data?.after?.data()  ?? null;
    if (!before || !after) return;

    const role = String(after.role || "").toLowerCase();
    const email = String(after.email || event.params.email || "").trim();
    if (!email) return;

    const validRoles = ["viewer", "admin", "member", "agent"];
    if (!validRoles.includes(role)) return;

    // ── Detectar transición que dispara welcome ─────────────────────────────
    let triggered = false;
    let reason = "";

    if (role === "viewer") {
      // Cliente: emailVerified false → true
      const wasVerified = before.emailVerified === true;
      const isVerified  = after.emailVerified  === true;
      if (!wasVerified && isVerified) {
        triggered = true;
        reason = "viewer-email-verified";
      }
    } else {
      // Staff: status pending → active
      const wasPending = String(before.status || "").toLowerCase() === "pending";
      const isActive   = String(after.status  || "").toLowerCase() === "active";
      if (wasPending && isActive) {
        triggered = true;
        reason = "staff-activated";
      }
    }

    if (!triggered) return;

    // ── Idempotencia: si ya enviamos welcome, no reenviamos ─────────────────
    if (after.welcomeEmailSentAt) {
      console.log(`[onUserWelcomeOnReady] ${email}: welcome ya enviado previamente (${reason}) — ignorado.`);
      return;
    }

    const gmailUser = GMAIL_USER.value();
    const gmailPass = GMAIL_PASS.value();
    if (!gmailUser || !gmailPass) return;

    try {
      const transporter = createTransport(gmailUser, gmailPass);
      const mail = welcomeEmail(after);
      await sendMail(transporter, gmailUser, { to: email, ...mail }, `onUserWelcomeOnReady:${reason}`);

      // Marcar como enviado para evitar reenvíos por updates posteriores.
      await admin.firestore().collection("users").doc(email).set({
        welcomeEmailSentAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      console.log(`[onUserWelcomeOnReady] ${email}: welcome enviado (${reason}).`);
    } catch (e) {
      console.error(`[onUserWelcomeOnReady] error enviando welcome a ${email}:`, e);
    }
  }
);

// ═════════════════════════════════════════════════════════════════════════════
// FUNCIONES 6.C / 6.D: Verificación de email (sistema custom)
// ═════════════════════════════════════════════════════════════════════════════
//
// Reemplazan a sendEmailVerification de Firebase Auth (cuya plantilla NO
// puede personalizarse). El frontend llama:
//
//   • requestEmailVerification (POST, requires ID token)
//     → genera token único, lo guarda hasheado en /emailVerifications,
//       envía email con plantilla corporativa.
//
//   • confirmEmailVerification (POST, no requires ID token)
//     → valida token, marca emailVerified=true en Auth y Firestore.
//       onUserWelcomeOnReady detecta el cambio y envía welcome.
//
// Implementación detallada en ./src/emailVerification.js.
// ═════════════════════════════════════════════════════════════════════════════
exports.requestEmailVerification = buildRequestEmailVerification(onRequest, GMAIL_USER, GMAIL_PASS);
exports.confirmEmailVerification = buildConfirmEmailVerification(onRequest);

// ═════════════════════════════════════════════════════════════════════════════
// FUNCIÓN 7: onContractWritten  (v2 Firestore trigger)
// ═════════════════════════════════════════════════════════════════════════════
exports.onContractWritten = onDocumentWritten(
  { document: "contracts/{contractId}", secrets: [GMAIL_USER, GMAIL_PASS] },
  async (event) => {
    const before     = event.data?.before?.data() ?? null;
    const after      = event.data?.after?.data()  ?? null;
    const contractId = event.params.contractId;
    if (!after) return; // eliminado

    const gmailUser = GMAIL_USER.value();
    const gmailPass = GMAIL_PASS.value();
    if (!gmailUser || !gmailPass) return;

    const transporter = createTransport(gmailUser, gmailPass);
    const send = (opts) => sendMail(transporter, gmailUser, opts, "onContractWritten");

    const clientEmail = String(after.clientEmail || "").trim();
    const agentEmail  = String(after.agentEmail  || "").trim();

    // ── Helper: obtener emails de admins (lazy, solo si se necesitan) ────────
    const getAdminEmails = async () => {
      try {
        const snap = await admin.firestore()
          .collection("users")
          .where("role", "==", "admin")
          .get();
        return snap.docs
          .map((d) => String(d.data().email || d.id || "").trim().toLowerCase())
          .filter((e) => e && e !== clientEmail.toLowerCase() && e !== agentEmail.toLowerCase());
      } catch (e) {
        console.error("[onContractWritten] error obteniendo admins:", e);
        return [];
      }
    };

    // ── Contrato nuevo ────────────────────────────────────────────────────────
    if (!before) {
      // Cliente
      if (clientEmail) {
        const mail = contractCreatedEmail(after, contractId);
        await send({ to: clientEmail, ...mail });
      }
      // Agente asignado
      if (agentEmail) {
        const mail = contractCreatedAgentEmail(after);
        await send({ to: agentEmail, ...mail });
      }
      // contrato nuevo. Antes recibían el mismo template del agente — ahora
      // reciben uno dedicado con resumen ejecutivo, IDs y CTA al panel admin.
      const adminEmails = await getAdminEmails();
      if (adminEmails.length) {
        // Para creación: usamos contractStageAdminEmail con prevStatus vacío
        // y prevStage vacío — el template detectará que es un evento nuevo.
        const mail = contractStageAdminEmail(after, "", "", contractId);
        for (const adminEmail of adminEmails) {
          await send({ to: adminEmail, ...mail });
        }
      }
      return;
    }

    // ── Cambio de estado o etapa ──────────────────────────────────────────────
    const prevStatus = String(before.statusGeneral || before.status || "").toLowerCase();
    const nextStatus = String(after.statusGeneral  || after.status  || "").toLowerCase();
    const prevStage  = String(before.businessStage || "").toLowerCase();
    const nextStage  = String(after.businessStage  || "").toLowerCase();

    if (prevStatus !== nextStatus || prevStage !== nextStage) {
      // el businessStage al que se transicionó (cuota inicial, escritura
      // firmada, canon en mora, etc.). Antes todo usaba el mismo email genérico.
      if (clientEmail) {
        const mail = getContractStageEmail(after, prevStatus, prevStage);
        await send({ to: clientEmail, ...mail });
      }
      // (cliente, teléfono, IDs, CTA al panel) — no el mismo template del
      // cliente. Solo cuando cambia status o cuando cambia a etapa relevante
      // (no por cada micro-transición intermedia).
      const stageRequiresAgentNotice =
        ["reserva", "promesa_firmada", "credito_aprobado", "leasing_aprobado",
         "escritura_firmada", "registrado", "entregado",
         "arriendo_firmado", "arriendo_activo",
         "ventana_renovacion", "arriendo_finalizado"].includes(nextStage);
      const shouldNotifyAgent =
        agentEmail &&
        (prevStatus !== nextStatus || stageRequiresAgentNotice);

      if (shouldNotifyAgent) {
        const mail = contractStageAgentEmail(after, prevStatus, prevStage, contractId);
        await send({ to: agentEmail, ...mail });
      }
      // ejecutivo, IDs y CTA al panel admin. Antes recibían el mismo
      // genérico. Solo en cambios críticos para no saturar.
      const isCritical =
        nextStatus === "cancelado" ||
        nextStatus === "finalizado" ||
        ["entregado", "registrado", "arriendo_finalizado"].includes(nextStage);
      if (isCritical && (prevStatus !== nextStatus || prevStage !== nextStage)) {
        const adminEmails = await getAdminEmails();
        const mail = contractStageAdminEmail(after, prevStatus, prevStage, contractId);
        for (const adminEmail of adminEmails) {
          await send({ to: adminEmail, ...mail });
        }
      }
    }
  }
);

// ═════════════════════════════════════════════════════════════════════════════
// FUNCIÓN 8: onPaymentWritten  (v2 Firestore trigger)
// Confirma pagos al cliente cuando se marca un pago como pagado.
// ═════════════════════════════════════════════════════════════════════════════
exports.onPaymentWritten = onDocumentWritten(
  { document: "contracts/{contractId}/payments/{paymentId}", secrets: [GMAIL_USER, GMAIL_PASS] },
  async (event) => {
    const before     = event.data?.before?.data() ?? null;
    const after      = event.data?.after?.data()  ?? null;
    const contractId = event.params.contractId;
    if (!after) return;

    const prevStatus = String(before?.status || "").toLowerCase();
    const nextStatus = String(after.status   || "").toLowerCase();

    // Solo notificar cuando cambia a estado "pagado" / "paid"
    const isPaid = ["paid", "pagado"].includes(nextStatus);
    if (!isPaid || prevStatus === nextStatus) return;

    const gmailUser = GMAIL_USER.value();
    const gmailPass = GMAIL_PASS.value();
    if (!gmailUser || !gmailPass) return;

    // Leer datos del contrato padre
    const contractSnap = await admin.firestore().collection("contracts").doc(contractId).get();
    if (!contractSnap.exists) return;
    const contract = contractSnap.data();

    const clientEmail = String(contract.clientEmail || "").trim();
    const agentEmail  = String(contract.agentEmail  || "").trim();

    const transporter = createTransport(gmailUser, gmailPass);
    const send = (opts) => sendMail(transporter, gmailUser, opts, "onPaymentWritten");

    // Cliente: template emocional/humano
    if (clientEmail) {
      const mail = paymentConfirmedEmail(contract, after);
      await send({ to: clientEmail, ...mail });
    }
    // — antes recibía el mismo template del cliente ("confirmamos tu pago").
    if (agentEmail && agentEmail !== clientEmail) {
      const mail = paymentConfirmedAgentEmail(contract, after);
      await send({ to: agentEmail, ...mail });
    }
    // pagos > 5M COP, escrituración) para evitar saturación pero mantener
    // visibilidad de tesorería.
    const paidAmount = Number(after.paidAmount || after.amount || 0);
    const paymentKind = String(after.kind || "").toLowerCase();
    const isCriticalPayment =
      paymentKind === "initial" ||
      paymentKind === "cuota_inicial" ||
      paymentKind === "deed" ||
      paymentKind === "escritura" ||
      paidAmount >= 5_000_000;

    if (isCriticalPayment) {
      try {
        const adminsSnap = await admin.firestore()
          .collection("users")
          .where("role", "==", "admin")
          .get();
        const mail = paymentConfirmedAdminEmail(contract, after);
        for (const adminDoc of adminsSnap.docs) {
          const adminEmail = String(adminDoc.data().email || adminDoc.id || "").trim().toLowerCase();
          if (!adminEmail) continue;
          if (adminEmail === clientEmail.toLowerCase()) continue;
          if (adminEmail === agentEmail.toLowerCase())  continue;
          await send({ to: adminEmail, ...mail });
        }
      } catch (e) {
        console.error("[onPaymentWritten] error notificando admins:", e);
      }
    }
    // cliente está navegando el portal, ahora ve la confirmación al instante.
    if (clientEmail) {
      try {
        await admin.firestore().collection("notifications").add({
          userId:    clientEmail.toLowerCase(),
          type:      "payment_confirmed",
          title:     "✅ Pago registrado",
          message:   `Tu pago de "${contract.propertyName || "tu contrato"}" fue registrado correctamente.`,
          relatedId: contractId,
          actionUrl: "/portal",
          read:      false,
          readAt:    null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (e) {
        console.error("[onPaymentWritten] error creando notif in-app:", e);
      }
    }
  }
);

// ═════════════════════════════════════════════════════════════════════════════
// FUNCIÓN 9: onPropertyChanged  (v2 Firestore trigger — indexación pública)
// ═════════════════════════════════════════════════════════════════════════════
exports.onPropertyChanged = onDocumentWritten(
  { document: "properties/{propertyId}" },
  async (event) => {
    const before     = event.data?.before?.data() ?? null;
    const after      = event.data?.after?.data()  ?? null;
    const propertyId = event.params.propertyId;

    if (!before && !after) return;

    const db = admin.firestore();

    // Propiedad eliminada → quitar del índice público
    if (!after) {
      await db.collection("publicProperties").doc(propertyId).delete();
      console.log(`[onPropertyChanged] ${propertyId}: eliminada del índice público.`);
      return;
    }

    const statusNow = String(after.status || after.publicationStatus || "").toLowerCase().trim();
    const shouldBePublic = PUBLIC_STATUS.has(statusNow);

    if (!shouldBePublic) {
      await db.collection("publicProperties").doc(propertyId).delete();
      console.log(`[onPropertyChanged] ${propertyId}: status="${statusNow}" → removida del índice público.`);
      return;
    }

    // Proyección pública — solo los campos necesarios para el catálogo
    const publicData = {
      id:               propertyId,
      title:            after.title            || after.name || "",
      slug:             after.slug             || propertyId,
      status:           statusNow,
      type:             after.type             || "",
      subtype:          after.subtype          || "",
      price:            after.price            ?? null,
      priceMin:         after.priceMin         ?? null,
      priceMax:         after.priceMax         ?? null,
      city:             after.city             || "",
      neighborhood:     after.neighborhood     || "",
      address:          after.address          || "",
      bedrooms:         after.bedrooms         ?? null,
      bathrooms:        after.bathrooms        ?? null,
      area:             after.area             ?? null,
      images:           Array.isArray(after.images)    ? after.images.slice(0, 6)    : [],
      tags:             Array.isArray(after.tags)      ? after.tags                  : [],
      features:         Array.isArray(after.features)  ? after.features              : [],
      description:      after.description      || "",
      agentId:          after.agentId          || "",
      agentName:        after.agentName        || "",
      isFeatured:       Boolean(after.isFeatured),
      operationMode:    after.operationMode    || "",
      updatedAt:        after.updatedAt        || admin.firestore.FieldValue.serverTimestamp(),
      indexedAt:        admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection("publicProperties").doc(propertyId).set(publicData, { merge: true });
    console.log(`[onPropertyChanged] ${propertyId}: indexada en publicProperties (status="${statusNow}").`);
  }
);

// ═════════════════════════════════════════════════════════════════════════════
// FUNCIÓN 10: scheduledPaymentAlerts  (v2 Scheduler — diario 8am Bogotá)
// Envía recordatorios, mora y alertas de vencimiento de contratos.
// ═════════════════════════════════════════════════════════════════════════════
exports.scheduledPaymentAlerts = onSchedule(
  { schedule: "0 13 * * *", timeZone: "America/Bogota", secrets: [GMAIL_USER, GMAIL_PASS] },
  async () => {
    const TAG = "scheduledPaymentAlerts";
    const gmailUser = GMAIL_USER.value();
    const gmailPass = GMAIL_PASS.value();
    if (!gmailUser || !gmailPass) { console.error(`[${TAG}] Secrets no disponibles.`); return; }

    const transporter = createTransport(gmailUser, gmailPass);
    const send = (opts) => sendMail(transporter, gmailUser, opts, TAG);

    const db  = admin.firestore();
    const now = new Date();

    // Cache de admins (para mora crítica) — evita una query por cada caso
    let adminEmailsCache = null;
    const getAdmins = async () => {
      if (adminEmailsCache !== null) return adminEmailsCache;
      try {
        const snap = await db.collection("users").where("role", "==", "admin").get();
        adminEmailsCache = snap.docs
          .map((d) => String(d.data().email || d.id || "").trim().toLowerCase())
          .filter(Boolean);
      } catch (e) {
        console.error(`[${TAG}] error obteniendo admins:`, e);
        adminEmailsCache = [];
      }
      return adminEmailsCache;
    };

    // ── Leer contratos activos de arriendo ────────────────────────────────────
    const contractsSnap = await db
      .collection("contracts")
      .where("type", "==", "arriendo")
      .where("statusGeneral", "in", ["vigente", "activo", "active"])
      .get();

    for (const contractDoc of contractsSnap.docs) {
      const contract = contractDoc.data();
      const clientEmail = String(contract.clientEmail || "").trim();
      const agentEmail  = String(contract.agentEmail  || "").trim();
      const clientPhone = String(contract.clientPhone || "").trim();
      if (!clientEmail) continue;

      // ── Alertas de vencimiento del contrato ───────────────────────────────
      const endDate = parseDate(contract.endDate);
      if (endDate) {
        const daysToEnd = diffDays(endDate, now);
        if ([60, 30, 15].includes(daysToEnd)) {
          // Cliente: tono humano
          const clientMail = contractExpiryEmail({
            clientName:   contract.clientName    || "Cliente",
            propertyName: contract.propertyName  || "la propiedad",
            endDate,
            daysAhead: daysToEnd,
            isRent: true,
          });
          await send({ to: clientEmail, ...clientMail });
          // de gestión (cliente, teléfono, ID contrato), no el del cliente.
          if (agentEmail && agentEmail !== clientEmail) {
            const agentMail = contractExpiryAgentEmail({
              clientName:   contract.clientName,
              clientEmail,
              clientPhone,
              propertyName: contract.propertyName,
              endDate,
              daysAhead:    daysToEnd,
              isRent:       true,
              contractId:   contractDoc.id,
            });
            await send({ to: agentEmail, ...agentMail });
          }
        }
        // Ventana de renovación: 45 días antes
        if (daysToEnd === 45) {
          const clientMail = renewalWindowEmail({
            clientName:   contract.clientName   || "Cliente",
            propertyName: contract.propertyName || "la propiedad",
            endDate,
            daysAhead: daysToEnd,
          });
          await send({ to: clientEmail, ...clientMail });
          if (agentEmail && agentEmail !== clientEmail) {
            const agentMail = renewalWindowAgentEmail({
              clientName:   contract.clientName,
              clientEmail,
              clientPhone,
              propertyName: contract.propertyName,
              endDate,
              daysAhead:    daysToEnd,
              contractId:   contractDoc.id,
            });
            await send({ to: agentEmail, ...agentMail });
          }
        }
      }

      // ── Revisar cuotas del contrato ───────────────────────────────────────
      const paymentsSnap = await contractDoc.ref
        .collection("payments")
        .where("status", "not-in", ["paid", "pagado"])
        .get();

      for (const payDoc of paymentsSnap.docs) {
        const payment = payDoc.data();
        const dueDate = parseDate(payment.dueDate);
        if (!dueDate) continue;

        const diff = diffDays(dueDate, now);

        // Recordatorio anticipado (7 o 3 días antes) — solo cliente
        if (diff === 7 || diff === 3) {
          const mail = paymentReminderEmail({
            clientName:   contract.clientName   || "Cliente",
            propertyName: contract.propertyName || "la propiedad",
            amount:       payment.amount,
            dueDate,
            daysAhead: diff,
          });
          await send({ to: clientEmail, ...mail });
          continue;
        }

        // Vence hoy
        if (diff === 0) {
          // Cliente: tono humano
          const clientMail = paymentDueTodayEmail({
            clientName:   contract.clientName   || "Cliente",
            propertyName: contract.propertyName || "la propiedad",
            amount:       payment.amount,
          });
          await send({ to: clientEmail, ...clientMail });
          // mismo del cliente. Datos específicos para gestión hoy mismo.
          if (agentEmail && agentEmail !== clientEmail) {
            const agentMail = paymentDueAgentEmail({
              clientName:      contract.clientName,
              clientEmail,
              clientPhone,
              propertyName:    contract.propertyName,
              propertyAddress: contract.propertyAddress,
              amount:          payment.amount,
              dueDate,
              contractId:      contractDoc.id,
            });
            await send({ to: agentEmail, ...agentMail });
          }
          continue;
        }

        // En mora (1, 3, 7, 15, 30 días vencido)
        const daysLate = -diff;
        if (daysLate > 0 && [1, 3, 7, 15, 30].includes(daysLate)) {
          // Cliente: tono firme pero con apertura
          const clientMail = latePaymentEmail({
            clientName:   contract.clientName   || "Cliente",
            propertyName: contract.propertyName || "la propiedad",
            amount:       payment.amount,
            dueDate,
            daysLate,
          });
          await send({ to: clientEmail, ...clientMail });
          // cobranza adaptado a los días de mora.
          if (agentEmail && agentEmail !== clientEmail) {
            const agentMail = latePaymentAgentEmail({
              clientName:      contract.clientName,
              clientEmail,
              clientPhone,
              propertyName:    contract.propertyName,
              propertyAddress: contract.propertyAddress,
              amount:          payment.amount,
              dueDate,
              daysLate,
              contractId:      contractDoc.id,
            });
            await send({ to: agentEmail, ...agentMail });
          }
          // crítica (≥15d). Antes los admins quedaban ciegos a problemas
          // graves de cobranza hasta abrir el panel.
          if (daysLate >= 15) {
            const admins = await getAdmins();
            const adminMail = latePaymentAdminEmail({
              clientName:   contract.clientName,
              propertyName: contract.propertyName,
              amount:       payment.amount,
              dueDate,
              daysLate,
              agentName:    contract.agentName,
              agentEmail,
              contractId:   contractDoc.id,
            });
            for (const a of admins) {
              if (a === clientEmail.toLowerCase()) continue;
              if (a === agentEmail.toLowerCase())  continue;
              await send({ to: a, ...adminMail });
            }
          }
          // si el cliente tiene la app abierta no se enteraba hasta abrir
          // Gmail. Ahora aparece en su campana de notificaciones.
          try {
            await admin.firestore().collection("notifications").add({
              userId:    clientEmail,
              type:      "payment_late",
              title:     daysLate === 1 ? "Pago vencido" : `${daysLate} días de mora`,
              message:   `Tu cuota de "${contract.propertyName || "la propiedad"}" lleva ${daysLate} día(s) vencida. Por favor regulariza para evitar cargos adicionales.`,
              relatedId: contractDoc.id,
              actionUrl: "/portal",
              read:      false,
              readAt:    null,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          } catch (e) {
            console.error("[scheduledPaymentAlerts] error creando notif in-app de mora:", e);
          }
        }
      }
    }

    console.log(`[${TAG}] Ciclo completado — ${contractsSnap.size} contrato(s) revisados.`);
  }
);

// ═════════════════════════════════════════════════════════════════════════════
// FUNCIÓN 11: onAccessRequestCreated  (v2 Firestore trigger)
//
// AUDITORÍA: cuando alguien envía el formulario de "Solicitar acceso al
// portal", la app crea un doc en /accessRequests y notif in-app a admins.
// Pero el email a admins faltaba — admins quedaban sin alerta hasta abrir
// el panel. Ahora se envía email a TODOS los admins.
// ═════════════════════════════════════════════════════════════════════════════
exports.onAccessRequestCreated = onDocumentCreated(
  { document: "accessRequests/{requestId}", secrets: [GMAIL_USER, GMAIL_PASS] },
  async (event) => {
    const data = event.data?.data() ?? null;
    const requestId = event.params.requestId;
    if (!data) return;

    const gmailUser = GMAIL_USER.value();
    const gmailPass = GMAIL_PASS.value();
    if (!gmailUser || !gmailPass) return;

    // Obtener emails de admins
    const adminsSnap = await admin.firestore()
      .collection("users")
      .where("role", "==", "admin")
      .get();

    if (adminsSnap.empty) {
      console.warn("[onAccessRequestCreated] No hay admins configurados — solicitud no notificada.");
      return;
    }

    const transporter = createTransport(gmailUser, gmailPass);
    const send = (opts) => sendMail(transporter, gmailUser, opts, "onAccessRequestCreated");

    const mail = accessRequestNotificationEmail(data, requestId);

    for (const adminDoc of adminsSnap.docs) {
      const adminEmail = String(adminDoc.data().email || adminDoc.id || "").trim();
      if (adminEmail) {
        await send({ to: adminEmail, ...mail });
      }
    }

    console.log(`[onAccessRequestCreated] ${requestId}: ${adminsSnap.size} admin(s) notificado(s).`);
  }
);
// ═════════════════════════════════════════════════════════════════════════════
// FUNCIÓN 12: onAccessRequestUpdated  (v2 Firestore trigger)
//
// AUDITORÍA: cuando el admin aprueba o rechaza una solicitud de acceso desde
// /solicitudes (request.service.js), antes el solicitante quedaba en silencio
// — solo se actualizaba el doc en Firestore. Ahora recibe email.
// ═════════════════════════════════════════════════════════════════════════════
exports.onAccessRequestUpdated = onDocumentUpdated(
  { document: "accessRequests/{requestId}", secrets: [GMAIL_USER, GMAIL_PASS] },
  async (event) => {
    const before = event.data?.before?.data() ?? null;
    const after  = event.data?.after?.data()  ?? null;
    if (!before || !after) return;

    const prevStatus = String(before.status || "").toLowerCase();
    const nextStatus = String(after.status  || "").toLowerCase();
    if (prevStatus === nextStatus) return;

    const targetEmail = String(after.email || "").trim();
    if (!targetEmail) return;

    const gmailUser = GMAIL_USER.value();
    const gmailPass = GMAIL_PASS.value();
    if (!gmailUser || !gmailPass) return;

    const transporter = createTransport(gmailUser, gmailPass);
    const send = (opts) => sendMail(transporter, gmailUser, opts, "onAccessRequestUpdated");

    if (nextStatus === "approved") {
      const mail = accessRequestApprovedEmail(after);
      await send({ to: targetEmail, ...mail });
      console.log(`[onAccessRequestUpdated] ${event.params.requestId}: aprobada — email a ${targetEmail}`);
      return;
    }

    if (nextStatus === "rejected") {
      const mail = accessRequestRejectedEmail(after);
      await send({ to: targetEmail, ...mail });
      console.log(`[onAccessRequestUpdated] ${event.params.requestId}: rechazada — email a ${targetEmail}`);
      return;
    }

    console.log(`[onAccessRequestUpdated] ${event.params.requestId}: estado "${nextStatus}" sin handler — ignorado.`);
  }
);

// ═════════════════════════════════════════════════════════════════════════════
// FUNCIÓN 13: onContactCreated  (v2 Firestore trigger)
//
// AUDITORÍA: el formulario público (/contactos y "Pregunta sobre esta propiedad"
// de PropertyDetail) escribe en /contacts pero ANTES no había trigger — los
// admins quedaban ciegos a leads de la web. Ahora:
//   • Auto-respuesta al cliente confirmando recepción
//   • Email al agente asignado (si la propiedad tiene agentEmail)
//   • Email a admins
// ═════════════════════════════════════════════════════════════════════════════
exports.onContactCreated = onDocumentCreated(
  { document: "contacts/{contactId}", secrets: [GMAIL_USER, GMAIL_PASS] },
  async (event) => {
    const data = event.data?.data() ?? null;
    const contactId = event.params.contactId;
    if (!data) return;

    const gmailUser = GMAIL_USER.value();
    const gmailPass = GMAIL_PASS.value();
    if (!gmailUser || !gmailPass) return;

    const transporter = createTransport(gmailUser, gmailPass);
    const send = (opts) => sendMail(transporter, gmailUser, opts, "onContactCreated");

    const clientEmail = String(data.email || "").trim();

    // 1) Auto-respuesta al cliente
    if (clientEmail) {
      const mail = contactReceivedEmail(data);
      await send({ to: clientEmail, ...mail });
    }

    // 2) Email al agente asignado a la propiedad (si aplica)
    let agentEmail = "";
    const propertyId = String(data.propertyId || "").trim();
    if (propertyId) {
      try {
        const propSnap = await admin.firestore().collection("properties").doc(propertyId).get();
        if (propSnap.exists) {
          agentEmail = String(propSnap.data()?.agentEmail || "").trim().toLowerCase();
          if (agentEmail) {
            const mail = contactReceivedAgentEmail(data, contactId);
            await send({ to: agentEmail, ...mail });
          }
        }
      } catch (e) {
        console.error("[onContactCreated] error obteniendo propiedad:", e);
      }
    }

    // 3) Email a admins (todos)
    try {
      const adminsSnap = await admin.firestore()
        .collection("users")
        .where("role", "==", "admin")
        .get();
      const mail = contactReceivedAdminEmail(data, contactId);
      for (const adminDoc of adminsSnap.docs) {
        const adminEmail = String(adminDoc.data().email || adminDoc.id || "").trim().toLowerCase();
        if (!adminEmail) continue;
        if (adminEmail === clientEmail.toLowerCase()) continue;
        if (adminEmail === agentEmail) continue;
        await send({ to: adminEmail, ...mail });
      }
    } catch (e) {
      console.error("[onContactCreated] error notificando admins:", e);
    }

    // 4) Notif in-app a admins (visibilidad rápida en panel)
    try {
      const adminsSnap = await admin.firestore()
        .collection("users")
        .where("role", "==", "admin")
        .get();
      await Promise.all(adminsSnap.docs.map((adminDoc) =>
        admin.firestore().collection("notifications").add({
          userId:    adminDoc.id,
          type:      "contact_received",
          title:     "🆕 Nuevo lead web",
          message:   `${data.name || "Una persona"} dejó datos${data.propertyTitle ? ` interesada en "${data.propertyTitle}"` : ""}.`,
          relatedId: contactId,
          actionUrl: "/contactos",
          read:      false,
          readAt:    null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        })
      ));
    } catch (e) {
      console.error("[onContactCreated] error creando notif in-app:", e);
    }

    console.log(`[onContactCreated] ${contactId}: lead procesado.`);
  }
);

// ═════════════════════════════════════════════════════════════════════════════
// FUNCIÓN 14: onAccountDeletionRequested  (v2 Firestore trigger)
//
// AUDITORÍA: profile.service.js .requestAccountDeletion crea un doc en
// /accountDeletionRequests pero los admins NO recibían email — quedaban
// ciegos hasta abrir el panel.
// ═════════════════════════════════════════════════════════════════════════════
exports.onAccountDeletionRequested = onDocumentCreated(
  { document: "accountDeletionRequests/{requestId}", secrets: [GMAIL_USER, GMAIL_PASS] },
  async (event) => {
    const data = event.data?.data() ?? null;
    const requestId = event.params.requestId;
    if (!data) return;

    const gmailUser = GMAIL_USER.value();
    const gmailPass = GMAIL_PASS.value();
    if (!gmailUser || !gmailPass) return;

    const transporter = createTransport(gmailUser, gmailPass);
    const send = (opts) => sendMail(transporter, gmailUser, opts, "onAccountDeletionRequested");

    // Email a admins
    try {
      const adminsSnap = await admin.firestore()
        .collection("users")
        .where("role", "==", "admin")
        .get();
      const mail = accountDeletionRequestEmail(data, requestId);
      for (const adminDoc of adminsSnap.docs) {
        const adminEmail = String(adminDoc.data().email || adminDoc.id || "").trim().toLowerCase();
        if (!adminEmail) continue;
        if (adminEmail === String(data.email || "").toLowerCase()) continue;
        await send({ to: adminEmail, ...mail });
      }
    } catch (e) {
      console.error("[onAccountDeletionRequested] error notificando admins:", e);
    }

    // Notif in-app a admins
    try {
      const adminsSnap = await admin.firestore()
        .collection("users")
        .where("role", "==", "admin")
        .get();
      await Promise.all(adminsSnap.docs.map((adminDoc) =>
        admin.firestore().collection("notifications").add({
          userId:    adminDoc.id,
          type:      "account_deletion_requested",
          title:     "🗑️ Solicitud de eliminación de cuenta",
          message:   `${data.email || "Un usuario"} solicitó eliminar su cuenta. Revisa antes de procesar.`,
          relatedId: requestId,
          actionUrl: "/usuarios",
          read:      false,
          readAt:    null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        })
      ));
    } catch (e) {
      console.error("[onAccountDeletionRequested] error creando notif in-app:", e);
    }

    console.log(`[onAccountDeletionRequested] ${requestId}: solicitud notificada a admins.`);
  }
);

// ═════════════════════════════════════════════════════════════════════════════
// FUNCIÓN 15: onContractDocumentCreated  (v2 Firestore trigger)
//
// AUDITORÍA: cuando el agente sube un documento al contrato (subcollection
// /contracts/{id}/documents) el cliente NO se enteraba — ni email, ni notif.
// Ahora recibe email + notif in-app con CTA al portal.
// ═════════════════════════════════════════════════════════════════════════════
exports.onContractDocumentCreated = onDocumentCreated(
  { document: "contracts/{contractId}/documents/{documentId}", secrets: [GMAIL_USER, GMAIL_PASS] },
  async (event) => {
    const document = event.data?.data() ?? null;
    const { contractId, documentId } = event.params;
    if (!document) return;

    const gmailUser = GMAIL_USER.value();
    const gmailPass = GMAIL_PASS.value();
    if (!gmailUser || !gmailPass) return;

    // Leer contrato padre
    const contractSnap = await admin.firestore().collection("contracts").doc(contractId).get();
    if (!contractSnap.exists) return;
    const contract = contractSnap.data();

    const clientEmail = String(contract.clientEmail || "").trim();
    if (!clientEmail) {
      console.log(`[onContractDocumentCreated] contrato ${contractId} sin clientEmail — ignorado.`);
      return;
    }

    const transporter = createTransport(gmailUser, gmailPass);
    const send = (opts) => sendMail(transporter, gmailUser, opts, "onContractDocumentCreated");

    // Email al cliente
    const mail = contractDocumentUploadedClientEmail(contract, document);
    await send({ to: clientEmail, ...mail });

    // Notif in-app al cliente
    try {
      await admin.firestore().collection("notifications").add({
        userId:    clientEmail.toLowerCase(),
        type:      "contract_document_uploaded",
        title:     "📎 Nuevo documento disponible",
        message:   `Se cargó un documento nuevo en tu contrato de "${contract.propertyName || "tu propiedad"}". Revísalo en tu portal.`,
        relatedId: contractId,
        actionUrl: "/portal",
        read:      false,
        readAt:    null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (e) {
      console.error("[onContractDocumentCreated] error creando notif in-app:", e);
    }

    console.log(`[onContractDocumentCreated] ${contractId}/${documentId}: cliente notificado (${clientEmail}).`);
  }
);

// ═════════════════════════════════════════════════════════════════════════════
// FUNCIÓN 16: onVisitApprovedAdminNotice  (v2 Firestore trigger)
//
// AUDITORÍA: cuando una visita es aprobada, antes los admins NO recibían
// notif in-app — solo agente + cliente. Esto deja sin visibilidad operativa
// al admin sobre qué visitas se están confirmando. NO email (saturaría) —
// solo notif in-app silenciosa.
// ═════════════════════════════════════════════════════════════════════════════
exports.onVisitApprovedAdminNotice = onDocumentWritten(
  { document: "visits/{visitId}" },
  async (event) => {
    const before = event.data?.before?.data() ?? null;
    const after  = event.data?.after?.data()  ?? null;
    if (!after) return;

    const prevStatus = String(before?.status || "").toLowerCase();
    const nextStatus = String(after.status   || "").toLowerCase();
    if (prevStatus === nextStatus) return;
    if (nextStatus !== "approved") return;

    try {
      const adminsSnap = await admin.firestore()
        .collection("users")
        .where("role", "==", "admin")
        .get();
      const agentEmailLower = String(after.agentEmail || "").toLowerCase();

      await Promise.all(adminsSnap.docs.map((adminDoc) => {
        const adminEmail = String(adminDoc.data().email || adminDoc.id || "").trim().toLowerCase();
        if (!adminEmail) return Promise.resolve();
        // No duplicar al admin que también es agente de esta visita
        if (adminEmail === agentEmailLower) return Promise.resolve();
        return admin.firestore().collection("notifications").add({
          userId:    adminDoc.id,
          type:      "visit_approved",
          title:     "🗓️ Visita aprobada",
          message:   `${after.clientName || "Un cliente"} visitará "${after.propertyName || "una propiedad"}" el ${after.requestedDate || "—"}.`,
          relatedId: event.params.visitId,
          actionUrl: "/usuarios/visitas",
          read:      false,
          readAt:    null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }));
    } catch (e) {
      console.error("[onVisitApprovedAdminNotice] error:", e);
    }
  }
);
// ═════════════════════════════════════════════════════════════════════════════
// FUNCIÓN 17: onNotificationCreated  (v2 Firestore trigger)
//
// Envía automáticamente una notificación push cuando se crea un documento
// en /notifications y su tipo está en PUSH_WORTHY_TYPES.
// Así cualquier notificación in‑app (creada por frontend o backend) también
// llega como push al dispositivo del usuario.
// ═════════════════════════════════════════════════════════════════════════════
exports.onNotificationCreated = onDocumentCreated(
  { document: "notifications/{notificationId}" },
  async (event) => {
    const notif = event.data?.data() ?? null;
    if (!notif || !notif.userId) return;
    if (!PUSH_WORTHY_TYPES.has(notif.type)) return;
    await sendPushToUser(notif.userId, notif);
  }
);

// ═════════════════════════════════════════════════════════════════════════════
// FUNCIÓN 18: onContactCreatedNotify  (v2 Firestore trigger)  — NUEVO
//
// Cuando llega una consulta pública (/contacts), notifica a TODO el staff
// (admins + members). Esto es necesario porque el visitante público no tiene
// sesión y las reglas de Firestore le bloquean crear notifs directamente.
//
// Es independiente de onContactCreated (que envía emails) — éste solo
// crea las notifs in-app, que luego disparan push automáticamente vía
// onNotificationCreated.
// ═════════════════════════════════════════════════════════════════════════════
exports.onContactCreatedNotify = onDocumentCreated(
  { document: "contacts/{contactId}" },
  async (event) => {
    try {
      const contact = event.data?.data() ?? null;
      if (!contact) return;

      const contactId = event.params?.contactId;
      const subject = contact.propertyTitle
        ? `${contact.name || 'Alguien'} consulta sobre "${contact.propertyTitle}"`
        : `${contact.name || 'Alguien'} envió una consulta`;

      const staffSnap = await admin.firestore()
        .collection("users")
        .where("role", "in", ["admin", "member"])
        .get();

      const batch = admin.firestore().batch();
      staffSnap.docs.forEach((u) => {
        const ref = admin.firestore().collection("notifications").doc();
        batch.set(ref, {
          userId:    u.id,
          type:      "new_contact",
          title:     "✉️ Nueva consulta recibida",
          message:   `${subject} (${contact.email || 'sin email'})`,
          actionUrl: "/consultas",
          relatedId: contactId,
          read:      false,
          readAt:    null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          expiresAt: null,
        });
      });
      await batch.commit();
    } catch (e) {
      console.error("[onContactCreatedNotify] error:", e);
    }
  }
);

// ═════════════════════════════════════════════════════════════════════════════
// FUNCIÓN 19: onAccessRequestCreatedNotify  (v2 Firestore trigger)  — NUEVO
//
// Cuando llega una solicitud de acceso pública (/accessRequests), notifica
// a todos los admins. Mismo motivo: el solicitante no tiene sesión y no
// puede crear notifs por sí mismo.
// ═════════════════════════════════════════════════════════════════════════════
exports.onAccessRequestCreatedNotify = onDocumentCreated(
  { document: "accessRequests/{requestId}" },
  async (event) => {
    try {
      const req = event.data?.data() ?? null;
      if (!req) return;

      const requestId = event.params?.requestId;

      const adminsSnap = await admin.firestore()
        .collection("users")
        .where("role", "==", "admin")
        .get();

      const batch = admin.firestore().batch();
      adminsSnap.docs.forEach((u) => {
        const ref = admin.firestore().collection("notifications").doc();
        batch.set(ref, {
          userId:    u.id,
          type:      "new_access_request",
          title:     "🔔 Nueva solicitud de acceso",
          message:   `${req.name || 'Alguien'} (${req.email || 'sin email'}) solicitó acceso al sistema.`,
          actionUrl: "/solicitudes",
          relatedId: requestId,
          read:      false,
          readAt:    null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          expiresAt: null,
        });
      });
      await batch.commit();
    } catch (e) {
      console.error("[onAccessRequestCreatedNotify] error:", e);
    }
  }
);