// functions/index.js
// ─── v2 imports ───────────────────────────────────────────────────────────────
const { onRequest }                          = require("firebase-functions/v2/https");
const { onDocumentWritten, onDocumentCreated } = require("firebase-functions/v2/firestore");
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
  // Usuarios
  welcomeEmail,
  // Contratos
  contractCreatedEmail,
  contractCreatedAgentEmail,
  contractUpdatedEmail,
  // Pagos y alertas
  paymentConfirmedEmail,
  paymentReminderEmail,
  paymentDueTodayEmail,
  latePaymentEmail,
  contractExpiryEmail,
  renewalWindowEmail,
} = require("./src/emails");

// ─── Utils ────────────────────────────────────────────────────────────────────
const { ymd, diffDays, fmtDate, parseDate, statusLabel, stageLabel } = require("./src/emails/utils");

// ─── Opciones globales ────────────────────────────────────────────────────────
setGlobalOptions({ region: "us-central1", maxInstances: 10 });

if (!admin.apps.length) admin.initializeApp();

// ─── Secrets ──────────────────────────────────────────────────────────────────
const GMAIL_USER = defineSecret("GMAIL_USER");
const GMAIL_PASS = defineSecret("GMAIL_PASS");

// ─── Constantes ───────────────────────────────────────────────────────────────
const BASE_URL   = "https://inmobiliaria-ryb-y-asociados.com";
const FROM_NAME  = "Inmobiliaria Rincón Bedoya y Asociados";

const PUBLIC_STATUS = new Set(["", "disponible", "reservada", "published", "active", "available"]);

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function setCorsHeaders(req, res) {
  res.set("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.set("Vary", "Origin");
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
  const decoded      = await admin.auth().verifyIdToken(authHeader.split("Bearer ")[1]);
  const callerEmail  = String(decoded.email || "").trim().toLowerCase();
  if (!callerEmail) { const err = new Error("Token sin email"); err.status = 401; throw err; }
  const callerDoc    = await admin.firestore().collection("users").doc(callerEmail).get();
  if (!callerDoc.exists || callerDoc.data()?.role !== "admin") {
    const err = new Error("Solo administradores"); err.status = 403; throw err;
  }
  return { callerEmail };
}

function createTransport(gmailUser, gmailPass) {
  return nodemailer.createTransport({ service: "gmail", auth: { user: gmailUser, pass: gmailPass } });
}

async function sendMail(transporter, gmailUser, { to, subject, html }, tag = "") {
  if (!to) { console.warn(`[${tag}] sendMail: destinatario vacío para "${subject}". Ignorado.`); return; }
  await transporter.sendMail({ from: `"${FROM_NAME}" <${gmailUser}>`, to, subject, html });
  console.log(`[${tag}] Email enviado → ${to} — ${subject}`);
}

// ═════════════════════════════════════════════════════════════════════════════
// FUNCIÓN 1: deleteUserComplete  (v2 HTTP)
// ═════════════════════════════════════════════════════════════════════════════
exports.deleteUserComplete = onRequest({ cors: true }, async (req, res) => {
  try {
    if (handlePreflight(req, res)) return;
    setCorsHeaders(req, res);
    if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
    await assertAdminFromRequest(req);
    const userId = String(req.body?.data?.userId || "").trim().toLowerCase();
    if (!userId) return res.status(400).json({ error: "userId es requerido" });
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
// FUNCIÓN 2: createUserByAdmin  (v2 HTTP)
// ═════════════════════════════════════════════════════════════════════════════
exports.createUserByAdmin = onRequest({ cors: true }, async (req, res) => {
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
    const status      = String(data.status || "active").trim();
    if (!email || !password) return res.status(400).json({ error: "email y password son requeridos" });
    let userRecord;
    try {
      userRecord = await admin.auth().createUser({ email, password, displayName, disabled: status === "blocked" });
    } catch (e) {
      if (e?.code === "auth/email-already-exists") userRecord = await admin.auth().getUserByEmail(email);
      else throw e;
    }
    await admin.firestore().collection("users").doc(email).set(
      { uid: userRecord.uid, email, displayName, phone, role, status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );
    return res.status(200).json({ result: { success: true, uid: userRecord.uid, email } });
  } catch (error) {
    setCorsHeaders(req, res);
    console.error("createUserByAdmin Error:", error);
    return res.status(error.status || 500).json({ error: error.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// FUNCIÓN 3: redirectToCustomDomain  (v2 HTTP)
// ═════════════════════════════════════════════════════════════════════════════
exports.redirectToCustomDomain = onRequest({ cors: true }, (req, res) => {
  const host = String(req.headers.host || "");
  if (host.includes("web.app") || host.includes("firebaseapp.com")) {
    return res.redirect(301, `${BASE_URL}${req.url}`);
  }
  return res.status(200).send("OK");
});

// ═════════════════════════════════════════════════════════════════════════════
// FUNCIÓN 4: generateSitemap  (v2 HTTP)
// ═════════════════════════════════════════════════════════════════════════════
exports.generateSitemap = onRequest({ cors: true }, handleSitemapRequest);

// ═════════════════════════════════════════════════════════════════════════════
// FUNCIÓN 5: serveApp — Prerender para crawlers, SPA para usuarios
// ═════════════════════════════════════════════════════════════════════════════
exports.serveApp = onRequest(
  { cors: false, timeoutSeconds: 30, memory: "256MiB", secrets: [] },
  handlePrerenderRequest
);

// ═════════════════════════════════════════════════════════════════════════════
// FUNCIÓN 6: onVisitStatusChanged  (v2 Firestore trigger)
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
    // approved / rejected / rescheduled los envía visit.service.js vía /mail
    // para evitar emails duplicados al cliente.
    if (prevStatus === null && nextStatus === "pending") {
      const mail = pendingVisitEmail(d);
      await send({ to: d.clientEmail, ...mail });
      return;
    }

    console.log(`[onVisitStatusChanged] Estado "${nextStatus}" manejado por visit.service.js. Ignorado.`);
  }
);

// ═════════════════════════════════════════════════════════════════════════════
// FUNCIÓN 7: onUserCreated  (v2 Firestore trigger)
// ═════════════════════════════════════════════════════════════════════════════
exports.onUserCreated = onDocumentCreated(
  { document: "users/{email}", secrets: [GMAIL_USER, GMAIL_PASS] },
  async (event) => {
    const data = event.data?.data() ?? null;
    if (!data) return;
    const role  = String(data.role  || "").toLowerCase();
    const email = String(data.email || event.params.email || "").trim();
    if (!email || role !== "viewer") return;

    const gmailUser = GMAIL_USER.value();
    const gmailPass = GMAIL_PASS.value();
    if (!gmailUser || !gmailPass) return;

    const transporter = createTransport(gmailUser, gmailPass);
    const mail = welcomeEmail(data);
    await sendMail(transporter, gmailUser, { to: email, ...mail }, "onUserCreated");
  }
);

// ═════════════════════════════════════════════════════════════════════════════
// FUNCIÓN 8: onContractWritten  (v2 Firestore trigger)
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

    // ── Contrato nuevo ────────────────────────────────────────────────────────
    if (!before) {
      if (clientEmail) {
        const mail = contractCreatedEmail(after, contractId);
        await send({ to: clientEmail, ...mail });
      }
      if (agentEmail) {
        const mail = contractCreatedAgentEmail(after);
        await send({ to: agentEmail, ...mail });
      }
      return;
    }

    // ── Cambio de estado o etapa ──────────────────────────────────────────────
    const prevStatus = String(before.statusGeneral || before.status || "").toLowerCase();
    const nextStatus = String(after.statusGeneral  || after.status  || "").toLowerCase();
    const prevStage  = String(before.businessStage || "").toLowerCase();
    const nextStage  = String(after.businessStage  || "").toLowerCase();

    if (prevStatus !== nextStatus || prevStage !== nextStage) {
      if (clientEmail) {
        const mail = contractUpdatedEmail(after, prevStatus, prevStage);
        await send({ to: clientEmail, ...mail });
      }
    }
  }
);

// ═════════════════════════════════════════════════════════════════════════════
// FUNCIÓN 9: onPaymentWritten  (v2 Firestore trigger)
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
    if (!clientEmail) return;

    const transporter = createTransport(gmailUser, gmailPass);
    const mail = paymentConfirmedEmail(contract, after);
    await sendMail(transporter, gmailUser, { to: clientEmail, ...mail }, "onPaymentWritten");
  }
);

// ═════════════════════════════════════════════════════════════════════════════
// FUNCIÓN 10: onPropertyChanged  (v2 Firestore trigger — indexación pública)
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
// FUNCIÓN 11: scheduledPaymentAlerts  (v2 Scheduler — diario 8am Bogotá)
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

    const db   = admin.firestore();
    const now  = new Date();
    const todayYmd = ymd(now);

    // ── Leer contratos activos de arriendo ────────────────────────────────────
    const contractsSnap = await db
      .collection("contracts")
      .where("type", "==", "arriendo")
      .where("statusGeneral", "in", ["vigente", "activo", "active"])
      .get();

    for (const contractDoc of contractsSnap.docs) {
      const contract = contractDoc.data();
      const clientEmail = String(contract.clientEmail || "").trim();
      if (!clientEmail) continue;

      // ── Alertas de vencimiento del contrato ───────────────────────────────
      const endDate = parseDate(contract.endDate);
      if (endDate) {
        const daysToEnd = diffDays(endDate, now);
        if ([60, 30, 15].includes(daysToEnd)) {
          await send({
            to: clientEmail,
            ...contractExpiryEmail({
              clientName:   contract.clientName    || "Cliente",
              propertyName: contract.propertyName  || "la propiedad",
              endDate,
              daysAhead: daysToEnd,
              isRent: true,
            }),
          });
        }
        // Ventana de renovación: 45 días antes
        if (daysToEnd === 45) {
          await send({
            to: clientEmail,
            ...renewalWindowEmail({
              clientName:   contract.clientName   || "Cliente",
              propertyName: contract.propertyName || "la propiedad",
              endDate,
              daysAhead: daysToEnd,
            }),
          });
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

        // Recordatorio anticipado (7 o 3 días antes)
        if (diff === 7 || diff === 3) {
          await send({
            to: clientEmail,
            ...paymentReminderEmail({
              clientName:   contract.clientName   || "Cliente",
              propertyName: contract.propertyName || "la propiedad",
              amount:       payment.amount,
              dueDate,
              daysAhead: diff,
            }),
          });
          continue;
        }

        // Vence hoy
        if (diff === 0) {
          await send({
            to: clientEmail,
            ...paymentDueTodayEmail({
              clientName:   contract.clientName   || "Cliente",
              propertyName: contract.propertyName || "la propiedad",
              amount:       payment.amount,
            }),
          });
          continue;
        }

        // En mora (1, 3, 7, 15, 30 días vencido)
        const daysLate = -diff;
        if (daysLate > 0 && [1, 3, 7, 15, 30].includes(daysLate)) {
          await send({
            to: clientEmail,
            ...latePaymentEmail({
              clientName:   contract.clientName   || "Cliente",
              propertyName: contract.propertyName || "la propiedad",
              amount:       payment.amount,
              dueDate,
              daysLate,
            }),
          });
        }
      }
    }

    console.log(`[${TAG}] Ciclo completado — ${contractsSnap.size} contrato(s) revisados.`);
  }
);
