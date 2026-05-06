// functions/src/emailVerification.js
//
// ════════════════════════════════════════════════════════════════════════════
// SISTEMA DE VERIFICACIÓN DE EMAIL CUSTOM (sin Firebase Auth template)
// ════════════════════════════════════════════════════════════════════════════
//
// PROBLEMA RESUELTO:
//   La plantilla del email de verificación de Firebase Auth NO se puede
//   personalizar (es básica, sin diseño corporativo). Además, antes el
//   welcome email se enviaba al mismo tiempo que el de verificación, lo que
//   confundía al usuario.
//
// SOLUCIÓN:
//   1. requestEmailVerification (HTTP): genera un token aleatorio, lo
//      persiste en /emailVerifications con TTL de 24h, y envía un email
//      bonito con plantilla corporativa al usuario.
//   2. confirmEmailVerification (HTTP): valida el token, marca
//      `emailVerified: true` en Firebase Auth y en /users/{email}, borra
//      el token. El welcome email se dispara automáticamente desde
//      onUserUpdated cuando ve el cambio emailVerified false→true.
//
// FLUJO COMPLETO PARA CLIENTES (viewer):
//   Registro → ClientAuthPage llama requestEmailVerification
//     → email con link "/verificar-email/:token"
//   El usuario hace click → EmailVerifyTokenPage llama confirmEmailVerification
//     → emailVerified=true en Firestore → onUserUpdated dispara welcomeEmail
//
// FLUJO PARA STAFF (admin/member):
//   createUserByAdmin crea cuenta con status='pending', sin enviar welcome.
//   Se envía email de "configura tu contraseña" (password reset) con
//   plantilla corporativa.
//   Cuando el staff inicia sesión por primera vez, frontend marca
//   status='active' → onUserUpdated dispara el welcome del equipo.
// ════════════════════════════════════════════════════════════════════════════

const admin = require("firebase-admin");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const { SITE_URL: BASE_URL } = require("./site.config");
const { emailVerificationLinkEmail, staffPasswordSetupEmail } = require("./emails/users");

// ── Constantes ──────────────────────────────────────────────────────────────
const TOKEN_TTL_HOURS = 24;
const TOKEN_BYTE_LENGTH = 32; // 256 bits → URL-safe ~43 chars

const FROM_NAME = "Inmobiliaria Rincón Bedoya y Asociados";

// CORS — sólo dominios autorizados.
const ALLOWED_ORIGINS = new Set([
  "https://inmobiliaria-ryb-y-asociados.com",
  "https://www.inmobiliaria-ryb-y-asociados.com",
  "https://inmobiliaria-ryb-y-asociados.web.app",
  "https://inmobiliaria-ryb-y-asociados.firebaseapp.com",
  "http://localhost:5173",
  "http://localhost:4173",
  "http://127.0.0.1:5173",
]);

function setCorsHeaders(req, res) {
  const origin = req.headers.origin || "";
  const allowed = ALLOWED_ORIGINS.has(origin) ? origin : "";
  if (allowed) {
    res.set("Access-Control-Allow-Origin", allowed);
    res.set("Vary", "Origin");
  }
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function handlePreflight(req, res) {
  if (req.method === "OPTIONS") {
    setCorsHeaders(req, res);
    res.status(204).send("");
    return true;
  }
  return false;
}

function createTransport(gmailUser, gmailPass) {
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: gmailUser, pass: gmailPass },
  });
}

async function sendMail(transporter, gmailUser, { to, subject, html }, tag = "") {
  if (!to) {
    console.warn(`[${tag}] sendMail: destinatario vacío. Ignorado.`);
    return;
  }
  await transporter.sendMail({
    from: `"${FROM_NAME}" <${gmailUser}>`,
    to,
    subject,
    html,
  });
  console.log(`[${tag}] Email enviado → ${to} — ${subject}`);
}

function isValidEmail(email) {
  return typeof email === "string"
      && email.length >= 5
      && email.length <= 254
      && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ── Generación de token seguro ──────────────────────────────────────────────
//
// Usamos crypto.randomBytes en lugar de Math.random(). Token guardado como
// hash SHA-256 en Firestore (no plaintext) para mitigar leak de DB.
function generateToken() {
  return crypto.randomBytes(TOKEN_BYTE_LENGTH).toString("base64url");
}

function hashToken(plainToken) {
  return crypto.createHash("sha256").update(plainToken).digest("hex");
}

// ════════════════════════════════════════════════════════════════════════════
// FUNCIÓN: requestEmailVerification
// ════════════════════════════════════════════════════════════════════════════
//
// Llamada por el frontend justo después de createUserWithEmailAndPassword.
// Requiere ID Token válido (usuario debe estar logueado en Firebase Auth).
// Si la cuenta ya está verificada, no hace nada (devuelve 200).
//
// Body: { } (no requiere datos — el email viene del ID token)
function buildRequestEmailVerification(onRequest, GMAIL_USER, GMAIL_PASS) {
  return onRequest(
    { cors: true, secrets: [GMAIL_USER, GMAIL_PASS] },
    async (req, res) => {
      try {
        if (handlePreflight(req, res)) return;
        setCorsHeaders(req, res);
        if (req.method !== "POST") {
          return res.status(405).json({ error: "Método no permitido" });
        }

        // Verificar ID token
        const authHeader = req.headers.authorization || "";
        if (!authHeader.startsWith("Bearer ")) {
          return res.status(401).json({ error: "No autenticado" });
        }
        let decoded;
        try {
          decoded = await admin.auth().verifyIdToken(authHeader.split("Bearer ")[1], true);
        } catch (_e) {
          return res.status(401).json({ error: "Token inválido" });
        }

        const uid = decoded.uid;
        const email = String(decoded.email || "").trim().toLowerCase();
        if (!email || !isValidEmail(email)) {
          return res.status(400).json({ error: "Email no disponible en el token" });
        }

        // Si Auth ya dice verificado, no hace falta enviar nada.
        const userRecord = await admin.auth().getUser(uid).catch(() => null);
        if (userRecord?.emailVerified) {
          // Sincronizar Firestore por si quedó desfasado.
          try {
            await admin.firestore().collection("users").doc(email).set({
              emailVerified: true,
              emailVerifiedAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
          } catch (_) {}
          return res.status(200).json({ result: { alreadyVerified: true } });
        }

        // Rate limit por email — máx 5 envíos en 15 minutos.
        const verifsRef = admin.firestore().collection("emailVerifications");
        const recentCutoff = admin.firestore.Timestamp.fromMillis(
          Date.now() - 15 * 60 * 1000
        );
        const recentSnap = await verifsRef
          .where("email", "==", email)
          .where("createdAt", ">=", recentCutoff)
          .get()
          .catch(() => ({ size: 0 }));
        if (recentSnap.size >= 5) {
          return res.status(429).json({
            error: "Demasiados envíos. Espera unos minutos antes de reintentar.",
          });
        }

        // Invalidar tokens previos del mismo email (no esperar — best effort).
        try {
          const oldTokens = await verifsRef
            .where("email", "==", email)
            .where("usedAt", "==", null)
            .get();
          const batch = admin.firestore().batch();
          oldTokens.forEach((d) => batch.update(d.ref, { invalidatedAt: admin.firestore.FieldValue.serverTimestamp() }));
          if (!oldTokens.empty) await batch.commit();
        } catch (e) {
          console.warn("[requestEmailVerification] no se invalidaron tokens previos:", e.message);
        }

        // Generar nuevo token
        const plainToken = generateToken();
        const tokenHash = hashToken(plainToken);
        const expiresAt = admin.firestore.Timestamp.fromMillis(
          Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000
        );

        await verifsRef.add({
          email,
          uid,
          tokenHash,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          expiresAt,
          usedAt: null,
          invalidatedAt: null,
        });

        // Construir URL de verificación
        const verifyUrl = `${BASE_URL}/verificar-email/${encodeURIComponent(plainToken)}`;

        // Obtener displayName del Firestore o de Auth
        let displayName = userRecord?.displayName || "";
        try {
          const userDoc = await admin.firestore().collection("users").doc(email).get();
          if (userDoc.exists) {
            displayName = userDoc.data()?.displayName || displayName;
          }
        } catch (_) {}

        // Enviar email
        const gmailUser = GMAIL_USER.value();
        const gmailPass = GMAIL_PASS.value();
        if (!gmailUser || !gmailPass) {
          console.error("[requestEmailVerification] credenciales SMTP no configuradas");
          return res.status(500).json({ error: "Servidor de correo no configurado" });
        }

        const transporter = createTransport(gmailUser, gmailPass);
        const mail = emailVerificationLinkEmail({
          displayName,
          email,
          verifyUrl,
          ttlHours: TOKEN_TTL_HOURS,
        });
        await sendMail(transporter, gmailUser, { to: email, ...mail }, "requestEmailVerification");

        return res.status(200).json({ result: { sent: true } });
      } catch (error) {
        setCorsHeaders(req, res);
        console.error("[requestEmailVerification] error:", error);
        return res.status(500).json({ error: error.message || "Error interno" });
      }
    }
  );
}

// ════════════════════════════════════════════════════════════════════════════
// FUNCIÓN: confirmEmailVerification
// ════════════════════════════════════════════════════════════════════════════
//
// Llamada por el frontend cuando el usuario hace click en el link y aterriza
// en /verificar-email/:token. NO requiere ID token (el usuario podría
// verificar desde otro dispositivo / sin sesión activa).
//
// Body: { token: "<plain-token>" }
function buildConfirmEmailVerification(onRequest) {
  return onRequest(
    { cors: true },
    async (req, res) => {
      try {
        if (handlePreflight(req, res)) return;
        setCorsHeaders(req, res);
        if (req.method !== "POST") {
          return res.status(405).json({ error: "Método no permitido" });
        }

        const data = req.body?.data || req.body || {};
        const plainToken = String(data.token || "").trim();
        if (!plainToken || plainToken.length < 10) {
          return res.status(400).json({ error: "Token inválido" });
        }

        const tokenHash = hashToken(plainToken);
        const verifsRef = admin.firestore().collection("emailVerifications");
        const snap = await verifsRef.where("tokenHash", "==", tokenHash).limit(1).get();

        if (snap.empty) {
          return res.status(404).json({
            error: "Enlace inválido o ya usado",
            code: "token_not_found",
          });
        }

        const doc = snap.docs[0];
        const tokenData = doc.data();

        // Validaciones
        if (tokenData.usedAt) {
          return res.status(410).json({
            error: "Este enlace ya fue utilizado",
            code: "token_used",
          });
        }
        if (tokenData.invalidatedAt) {
          return res.status(410).json({
            error: "Este enlace fue invalidado por uno más reciente. Solicita un nuevo correo.",
            code: "token_invalidated",
          });
        }
        const expiresAt = tokenData.expiresAt?.toDate?.() || new Date(0);
        if (expiresAt.getTime() < Date.now()) {
          return res.status(410).json({
            error: "El enlace expiró. Solicita uno nuevo.",
            code: "token_expired",
          });
        }

        const email = String(tokenData.email || "").trim().toLowerCase();
        const uid = String(tokenData.uid || "").trim();
        if (!email || !uid) {
          return res.status(500).json({ error: "Token corrupto" });
        }

        // Marcar token como usado (atómico: si dos clicks simultáneos,
        // sólo uno tiene éxito).
        await admin.firestore().runTransaction(async (tx) => {
          const fresh = await tx.get(doc.ref);
          if (fresh.data()?.usedAt) {
            const e = new Error("Token ya usado en otro click");
            e.alreadyUsed = true;
            throw e;
          }
          tx.update(doc.ref, {
            usedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }).catch((e) => {
          if (e.alreadyUsed) {
            // Si era una carrera y otro click ya marcó: continuamos.
            // El estado final de Auth/Firestore será el correcto.
            return;
          }
          throw e;
        });

        // Marcar email verificado en Firebase Auth (Admin SDK).
        try {
          await admin.auth().updateUser(uid, { emailVerified: true });
        } catch (e) {
          console.error("[confirmEmailVerification] updateUser falló:", e.message);
          // No bloqueamos — Firestore se actualiza igual.
        }

        // Marcar en Firestore. Esto dispara onUserWelcomeOnReady → welcome.
        //
        // OJO: solo activamos status='active' si el usuario es viewer
        // (cliente). Los staff (admin/member) tienen su propio flujo de
        // activación (primer login → AuthContext) y no deberían pasar por
        // aquí, pero por defensa-en-profundidad NO tocamos su status para
        // evitar saltar el paso de "configura tu contraseña".
        try {
          const userDocRef = admin.firestore().collection("users").doc(email);
          const existingUser = await userDocRef.get();
          const existingRole = String(existingUser.data()?.role || "").toLowerCase();

          const updates = {
            emailVerified: true,
            emailVerifiedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          };

          // Solo viewers pasan a 'active' aquí. Staff usa su propio flujo.
          if (existingRole === "viewer" || !existingRole) {
            updates.status = "active";
          }

          await userDocRef.set(updates, { merge: true });
        } catch (e) {
          console.error("[confirmEmailVerification] Firestore update falló:", e.message);
        }

        console.log(`[confirmEmailVerification] ${email} verificado correctamente.`);
        return res.status(200).json({ result: { verified: true, email } });
      } catch (error) {
        setCorsHeaders(req, res);
        console.error("[confirmEmailVerification] error:", error);
        return res.status(500).json({ error: error.message || "Error interno" });
      }
    }
  );
}

// ════════════════════════════════════════════════════════════════════════════
// FUNCIÓN: sendStaffPasswordSetup (al crear usuario interno)
// ════════════════════════════════════════════════════════════════════════════
//
// Llamada por createUserByAdmin después de crear la cuenta. Genera un link
// de reset de contraseña con Admin SDK (sin pasar por la plantilla de
// Firebase Auth) y lo envía con el template corporativo.
//
// Esta función NO se expone como endpoint HTTP; es helper interno.
async function sendStaffPasswordSetup({
  email,
  displayName,
  role,
  gmailUser,
  gmailPass,
}) {
  if (!email || !gmailUser || !gmailPass) return;

  // Generar link de reset de contraseña con Admin SDK (sin enviar email).
  let setupLink;
  try {
    setupLink = await admin.auth().generatePasswordResetLink(email, {
      url: `${BASE_URL}/login`,
      handleCodeInApp: false,
    });
  } catch (e) {
    console.error("[sendStaffPasswordSetup] generatePasswordResetLink falló:", e.message);
    // Fallback: mandar al login sin link directo (peor UX pero no bloquea).
    setupLink = `${BASE_URL}/login`;
  }

  const transporter = createTransport(gmailUser, gmailPass);
  const mail = staffPasswordSetupEmail({
    displayName,
    email,
    role,
    setupLink,
  });
  await sendMail(transporter, gmailUser, { to: email, ...mail }, "sendStaffPasswordSetup");
}

module.exports = {
  buildRequestEmailVerification,
  buildConfirmEmailVerification,
  sendStaffPasswordSetup,
};