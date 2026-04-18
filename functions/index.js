// ─── v2 imports ───────────────────────────────────────────────────────────────────────────
const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentWritten, onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const { setGlobalOptions } = require("firebase-functions/v2");
const { onSchedule } = require("firebase-functions/v2/scheduler"); // ← añadido para el cron
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });
const nodemailer = require("nodemailer");

// ─── Opciones globales v2 ─────────────────────────────────────────────────────────
setGlobalOptions({ region: "us-central1", maxInstances: 10 });

if (!admin.apps.length) {
  admin.initializeApp();
}

// ─── Secrets ─────────────────────────────────────────────────────────────────
const GMAIL_USER = defineSecret("GMAIL_USER");
const GMAIL_PASS = defineSecret("GMAIL_PASS");

// ─── Constantes globales ──────────────────────────────────────────────────────
const BASE_URL = "https://inmobiliaria-ryb-y-asociados.com";
const WHATSAPP_URL = "https://wa.me/573105968202";
const LOGO_URL = `${BASE_URL}/logo.jpg.png`;
const FROM_NAME = "Inmobiliaria Rincón Bedoya y Asociados";

const PUBLIC_STATUS = new Set(["", "disponible", "reservada", "published", "active", "available"]);

// ─── Helpers CORS / Auth ──────────────────────────────────────────────────────
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
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    const err = new Error("No autenticado");
    err.status = 401;
    throw err;
  }
  const token = authHeader.split("Bearer ")[1];
  const decoded = await admin.auth().verifyIdToken(token);
  const callerEmail = String(decoded.email || "").trim().toLowerCase();
  if (!callerEmail) {
    const err = new Error("Token sin email");
    err.status = 401;
    throw err;
  }
  const callerDoc = await admin.firestore().collection("users").doc(callerEmail).get();
  if (!callerDoc.exists || callerDoc.data()?.role !== "admin") {
    const err = new Error("Solo administradores");
    err.status = 403;
    throw err;
  }
  return { callerEmail };
}

// ─── Helpers SEO / Sitemap ────────────────────────────────────────────────────
function normalizeSlug(v = "") {
  return String(v)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
function xmlEscape(v = "") {
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
function getSafeString(v, fb = "") {
  const r = String(v ?? "").trim();
  return r || fb;
}
function resolveCity(p = {}) {
  return getSafeString(p.location?.city || p.city || "");
}
function resolveType(p = {}) {
  return getSafeString(p.type || "propiedad", "propiedad");
}
function resolveTransaction(p = {}) {
  return getSafeString(p.transactionType || "");
}
function resolveRooms(p = {}) {
  return p.rooms ?? p.features?.rooms ?? p.features?.bedrooms ?? p.bedrooms ?? null;
}
function isPublicProperty(p = {}) {
  return PUBLIC_STATUS.has(String(p.status || "").trim().toLowerCase());
}
function mapTransactionSlug(t = "") {
  const v = String(t).toLowerCase();
  if (["sale", "venta", "compra"].includes(v)) return "venta";
  if (["rent", "arriendo", "alquiler", "renta"].includes(v)) return "arriendo";
  return "";
}
function mapTypeSlug(t = "") {
  const v = String(t).toLowerCase();
  if (v.includes("casa")) return "casas";
  if (v.includes("apart")) return "apartamentos";
  if (v.includes("lote")) return "lotes";
  if (v.includes("finca")) return "fincas";
  if (v.includes("local")) return "locales";
  return "propiedades";
}
function mapTypeSingularSlug(t = "") {
  const v = String(t).toLowerCase();
  if (v.includes("casa")) return "casa";
  if (v.includes("apart")) return "apartamento";
  if (v.includes("lote")) return "lote";
  if (v.includes("finca")) return "finca";
  if (v.includes("local")) return "local";
  return "propiedad";
}
function buildPropertySlug(p = {}) {
  const parts = [];
  const tr = mapTransactionSlug(resolveTransaction(p));
  const ty = mapTypeSingularSlug(resolveType(p));
  const ci = normalizeSlug(resolveCity(p));
  const ro = resolveRooms(p);
  if (tr) parts.push(tr);
  if (ty) parts.push(ty);
  if (ci) parts.push(ci);
  if (ro) parts.push(`${ro}-habitaciones`);
  return normalizeSlug(parts.join(" ")) || "propiedad";
}
function buildCityLandingPath(city) {
  const s = normalizeSlug(city);
  return s ? `/propiedades/ciudad/${s}` : null;
}
function buildTypeCityLandingPath(p = {}) {
  const ci = normalizeSlug(resolveCity(p));
  const ty = mapTypeSlug(resolveType(p));
  const tr = mapTransactionSlug(resolveTransaction(p));
  if (!ci || !ty) return null;
  return tr ? `/propiedades/zona/${ty}-en-${tr}-${ci}` : `/propiedades/zona/${ty}-en-${ci}`;
}
function normalizeAbsoluteUrl(url, baseUrl = BASE_URL) {
  const v = String(url || "").trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  return `${baseUrl}${v.startsWith("/") ? "" : "/"}${v}`;
}
function extractPropertyImages(data, baseUrl = BASE_URL) {
  const raw = Array.isArray(data.images) ? data.images : [];
  const selected = raw.filter(Boolean).slice(0, 5);
  const title = getSafeString(data.title, "Propiedad inmobiliaria");
  const city = getSafeString(resolveCity(data), "Caldas");
  const caption = `${title} en ${city} - Inmobiliaria Rincón Bedoya y Asociados`;
  return selected
    .map((u) => normalizeAbsoluteUrl(u, baseUrl))
    .filter(Boolean)
    .map((loc) => ({ loc, title, caption }));
}
function toLastMod(value) {
  try {
    if (!value) return null;
    if (typeof value?.toDate === "function") return value.toDate().toISOString();
    if (value instanceof Date) return value.toISOString();
    const d = new Date(value);
    return !Number.isNaN(d.getTime()) ? d.toISOString() : null;
  } catch (_) {
    return null;
  }
}
function buildUrlNode(urlData) {
  const images = Array.isArray(urlData.images) ? urlData.images : [];
  const imgBlocks = images
    .map(
      (img) =>
        `\n    <image:image>\n      <image:loc>${xmlEscape(img.loc)}</image:loc>\n      <image:title><![CDATA[${
          img.title || ""
        }]]></image:title>\n      <image:caption><![CDATA[${img.caption || ""}]]></image:caption>\n    </image:image>`
    )
    .join("");
  const lastmodBlock = urlData.lastmod ? `\n    <lastmod>${xmlEscape(urlData.lastmod)}</lastmod>` : "";
  return `\n  <url>\n    <loc>${xmlEscape(urlData.loc)}</loc>${lastmodBlock}\n    <changefreq>${xmlEscape(
    urlData.changefreq || "weekly"
  )}</changefreq>\n    <priority>${xmlEscape(urlData.priority || "0.5")}</priority>${imgBlocks}\n  </url>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIÓN 1: deleteUserComplete  (v2 HTTP)
// ═══════════════════════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIÓN 2: createUserByAdmin  (v2 HTTP)
// ═══════════════════════════════════════════════════════════════════════════════
exports.createUserByAdmin = onRequest({ cors: true }, async (req, res) => {
  try {
    if (handlePreflight(req, res)) return;
    setCorsHeaders(req, res);
    if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
    await assertAdminFromRequest(req);
    const data = req.body?.data || {};
    const email = String(data.email || "").trim().toLowerCase();
    const password = String(data.password || "");
    const displayName = String(data.displayName || "").trim();
    const phone = String(data.phone || "").trim();
    const role = String(data.role || "member").trim();
    const status = String(data.status || "active").trim();
    if (!email || !password) return res.status(400).json({ error: "email y password son requeridos" });
    let userRecord;
    try {
      userRecord = await admin.auth().createUser({
        email,
        password,
        displayName,
        disabled: status === "blocked",
      });
    } catch (e) {
      if (e?.code === "auth/email-already-exists") userRecord = await admin.auth().getUserByEmail(email);
      else throw e;
    }
    await admin
      .firestore()
      .collection("users")
      .doc(email)
      .set(
        {
          uid: userRecord.uid,
          email,
          displayName,
          phone,
          role,
          status,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    return res.status(200).json({ result: { success: true, uid: userRecord.uid, email } });
  } catch (error) {
    setCorsHeaders(req, res);
    console.error("createUserByAdmin Error:", error);
    return res.status(error.status || 500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIÓN 3: redirectToCustomDomain  (v2 HTTP)
// ═══════════════════════════════════════════════════════════════════════════════
exports.redirectToCustomDomain = onRequest({ cors: true }, (req, res) => {
  const host = String(req.headers.host || "");
  if (host.includes("web.app") || host.includes("firebaseapp.com")) {
    return res.redirect(301, `${BASE_URL}${req.url}`);
  }
  return res.status(200).send("OK");
});

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIÓN 4: generateSitemap  (v2 HTTP)
// ═══════════════════════════════════════════════════════════════════════════════
exports.generateSitemap = onRequest({ cors: true }, async (req, res) => {
  try {
    if (handlePreflight(req, res)) return;
    setCorsHeaders(req, res);
    if (req.method !== "GET") return res.status(405).send("Método no permitido");
    const staticUrls = [
      { loc: `${BASE_URL}/`, priority: "1.0", changefreq: "daily" },
      { loc: `${BASE_URL}/propiedades`, priority: "0.9", changefreq: "daily" },
      { loc: `${BASE_URL}/contacto`, priority: "0.7", changefreq: "monthly" },
      { loc: `${BASE_URL}/nosotros`, priority: "0.6", changefreq: "monthly" },
    ];
    const snapshot = await admin.firestore().collection("properties").get();
    const propertyUrls = [];
    const cityLandingMap = new Map();
    const typeCityLandingMap = new Map();
    snapshot.forEach((doc) => {
      const data = doc.data() || {};
      if (!isPublicProperty(data)) return;
      const slug = buildPropertySlug(data);
      const loc = `${BASE_URL}/propiedades/${slug}-${doc.id}`;
      const lastmod = toLastMod(data.updatedAt || data.createdAt);
      const images = extractPropertyImages(data, BASE_URL);
      propertyUrls.push({ loc, priority: "0.8", changefreq: "daily", lastmod, images });
      const cityPath = buildCityLandingPath(resolveCity(data));
      if (cityPath && !cityLandingMap.has(cityPath))
        cityLandingMap.set(cityPath, {
          loc: `${BASE_URL}${cityPath}`,
          priority: "0.8",
          changefreq: "daily",
          lastmod,
        });
      const typeCityPath = buildTypeCityLandingPath(data);
      if (typeCityPath && !typeCityLandingMap.has(typeCityPath))
        typeCityLandingMap.set(typeCityPath, {
          loc: `${BASE_URL}${typeCityPath}`,
          priority: "0.8",
          changefreq: "daily",
          lastmod,
        });
    });
    const allUrls = [...staticUrls, ...cityLandingMap.values(), ...typeCityLandingMap.values(), ...propertyUrls];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset\n  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"\n>\n${allUrls
      .map(buildUrlNode)
      .join("")}\n</urlset>`;
    res.set("Content-Type", "application/xml; charset=utf-8");
    res.set("Cache-Control", "public, max-age=900, s-maxage=900");
    return res.status(200).send(xml);
  } catch (error) {
    console.error("generateSitemap Error:", error);
    return res.status(500).send("Error generando sitemap");
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIÓN 5: onVisitStatusChanged  (v2 Firestore trigger)
// ═══════════════════════════════════════════════════════════════════════════════

const CSS_BASE = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; background-color: #f0f4f8; font-family: 'Inter', 'Segoe UI', Arial, sans-serif; }
  .wrapper { background: #f0f4f8; padding: 40px 16px; }
  .container { max-width: 600px; margin: 0 auto; }
  .card { background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
  .header { padding: 32px 40px 28px; text-align: center; }
  .logo { height: 52px; object-fit: contain; }
  .body { padding: 36px 40px; }
  .footer { background: #f8f9fb; border-top: 1px solid #e8ecf0; padding: 20px 40px; text-align: center; }
  .footer p { color: #9ca3af; font-size: 12px; line-height: 1.6; margin: 0; }
  .footer a { color: #b8952a; text-decoration: none; }
  .emoji-icon { font-size: 40px; display: block; margin: 0 auto 16px; text-align: center; }
  .title { font-size: 24px; font-weight: 700; margin: 0 0 8px; line-height: 1.3; }
  .subtitle { font-size: 15px; color: #6b7280; margin: 0 0 28px; line-height: 1.6; }
  .info-card { background: #f8f9fb; border: 1px solid #e8ecf0; border-radius: 14px; padding: 20px 24px; margin: 0 0 24px; }
  .info-row { display: flex; align-items: flex-start; padding: 8px 0; border-bottom: 1px solid #f0f2f5; }
  .info-row:last-child { border-bottom: none; padding-bottom: 0; }
  .info-label { font-size: 12px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; width: 120px; flex-shrink: 0; padding-top: 2px; }
  .info-value { font-size: 14px; color: #1f2937; font-weight: 500; flex: 1; }
  .info-value.accent { font-weight: 700; }
  .note-box { border-radius: 12px; padding: 14px 18px; margin: 0 0 24px; }
  .btn-primary { display: inline-block; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 32px; border-radius: 50px; transition: all 0.2s; }
  .btn-secondary { display: inline-block; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 24px; border-radius: 50px; border: 2px solid; margin-left: 10px; }
  .btn-center { text-align: center; margin-top: 28px; }
  .divider { height: 1px; background: #f0f2f5; margin: 24px 0; }
  .tip { font-size: 13px; color: #9ca3af; line-height: 1.6; margin: 0; }
`;

function htmlWrapper(headerBg, content) {
  return `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <title>${FROM_NAME}</title>
  <style>${CSS_BASE}</style>
</head>
<body>
<div class="wrapper">
  <div class="container">
    <div class="card">
      <div class="header" style="background:${headerBg};">
        <img src="${LOGO_URL}" alt="${FROM_NAME}" class="logo" width="auto" height="52"/>
      </div>
      <div class="body">
        ${content}
      </div>
      <div class="footer">
        <p>
          <strong style="color:#374151;">${FROM_NAME}</strong><br/>
          Cra 5 No. 9-28, Anserma, Caldas, Colombia<br/>
          <a href="tel:+573105968202">+57 310 596 8202</a> &nbsp;·&nbsp;
          <a href="${BASE_URL}">${BASE_URL}</a>
        </p>
        <p style="margin-top:12px; font-size:11px;">
          Este correo fue generado automáticamente. Por favor no respondas a este mensaje.
        </p>
      </div>
    </div>
  </div>
</div>
</body>
</html>`;
}

function infoRow(label, value, accentColor) {
  if (!value) return "";
  const valueClass = accentColor ? `info-value accent" style="color:${accentColor}` : "info-value";
  return `
    <div class="info-row">
      <span class="info-label">${label}</span>
      <span class="${valueClass}">${value}</span>
    </div>`;
}

function pendingHtml(d) {
  return htmlWrapper(
    "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
    `
    <span class="emoji-icon">⏳</span>
    <h1 class="title" style="color:#b8952a; text-align:center;">Solicitud recibida</h1>
    <p class="subtitle" style="text-align:center;">
      Hola <strong style="color:#1f2937;">${d.clientName}</strong>,<br/>
      recibimos tu solicitud de visita. Nuestro equipo la revisará y te confirmará
      <strong style="color:#b8952a;">en menos de 24 horas</strong>.
    </p>
    <div class="info-card">
      ${infoRow("🏠 Propiedad", d.propertyName, "#b8952a")}
      ${infoRow("📅 Fecha solicitada", d.requestedDate)}
      ${infoRow("🕐 Hora solicitada", d.requestedTime)}
      ${d.notes ? infoRow("💬 Tu mensaje", d.notes) : ""}
    </div>
    <div class="note-box" style="background:#fffbeb; border-left:4px solid #f59e0b;">
      <p style="margin:0; font-size:13px; color:#92400e; font-weight:600;">¿Qué sigue?</p>
      <p style="margin:6px 0 0; font-size:14px; color:#78350f; line-height:1.7;">
        Un asesor revisará tu solicitud y te enviará un correo de confirmación con los detalles de la visita.
      </p>
    </div>
    <div class="btn-center">
      <a href="${WHATSAPP_URL}" class="btn-primary" style="background:linear-gradient(135deg,#b8952a,#d4a836); color:#ffffff;">
        💬 Contactar por WhatsApp
      </a>
      <a href="${BASE_URL}/propiedades" class="btn-secondary" style="color:#b8952a; border-color:#b8952a;">
        Ver más propiedades
      </a>
    </div>
    `
  );
}

function approvedHtml(d) {
  return htmlWrapper(
    "linear-gradient(135deg, #1a2a1a 0%, #2d4a2d 100%)",
    `
    <span class="emoji-icon">🎉</span>
    <h1 class="title" style="color:#166534; text-align:center;">¡Tu visita está confirmada!</h1>
    <p class="subtitle" style="text-align:center;">
      Hola <strong style="color:#1f2937;">${d.clientName}</strong>,<br/>
      nos alegra informarte que tu solicitud de visita fue <strong style="color:#166534;">aprobada</strong>.
    </p>
    <div class="info-card">
      ${infoRow("🏠 Propiedad", d.propertyName, "#166534")}
      ${infoRow("📅 Fecha", d.requestedDate)}
      ${infoRow("🕐 Hora", d.requestedTime)}
      ${d.agentName ? infoRow("👤 Agente", d.agentName, "#b8952a") : ""}
      ${d.adminNotes ? infoRow("💬 Nota", d.adminNotes) : ""}
    </div>
    ${d.adminNotes ? `
    <div class="note-box" style="background:#f0fdf4; border-left:4px solid #22c55e;">
      <p style="margin:0; font-size:13px; color:#15803d; font-weight:600;">Mensaje del agente</p>
      <p style="margin:6px 0 0; font-size:14px; color:#166534;">${d.adminNotes}</p>
    </div>` : ""}
    <div class="divider"></div>
    <p style="font-size:14px; color:#374151; line-height:1.7; margin:0 0 8px;">
      📌 <strong>Recuerda llegar puntualmente</strong> a la hora indicada.
    </p>
    <p class="tip">Lleva contigo tu documento de identidad. El agente te recibirá en la propiedad.</p>
    <div class="btn-center">
      <a href="${WHATSAPP_URL}" class="btn-primary" style="background:linear-gradient(135deg,#166534,#15803d); color:#ffffff;">
        💬 Confirmar por WhatsApp
      </a>
      <a href="${BASE_URL}/propiedades" class="btn-secondary" style="color:#166534; border-color:#166534;">
        Ver más propiedades
      </a>
    </div>
    `
  );
}

function rejectedHtml(d) {
  return htmlWrapper(
    "linear-gradient(135deg, #1a1010 0%, #3d1515 100%)",
    `
    <span class="emoji-icon">😔</span>
    <h1 class="title" style="color:#991b1b; text-align:center;">Solicitud no disponible</h1>
    <p class="subtitle" style="text-align:center;">
      Hola <strong style="color:#1f2937;">${d.clientName}</strong>,<br/>
      lamentamos informarte que tu solicitud de visita para
      <strong style="color:#1f2937;">${d.propertyName}</strong> no pudo ser aprobada en este momento.
    </p>
    ${d.adminNotes ? `
    <div class="note-box" style="background:#fef2f2; border-left:4px solid #ef4444;">
      <p style="margin:0; font-size:13px; color:#991b1b; font-weight:600;">Motivo</p>
      <p style="margin:6px 0 0; font-size:14px; color:#7f1d1d;">${d.adminNotes}</p>
    </div>` : ""}
    <div class="info-card">
      ${infoRow("🏠 Propiedad", d.propertyName)}
      ${infoRow("📅 Fecha solicitada", d.requestedDate)}
      ${infoRow("🕐 Hora solicitada", d.requestedTime)}
    </div>
    <div class="note-box" style="background:#fffbeb; border-left:4px solid #f59e0b;">
      <p style="margin:0; font-size:13px; color:#92400e; font-weight:600;">¿Qué puedes hacer?</p>
      <p style="margin:6px 0 0; font-size:14px; color:#78350f; line-height:1.7;">
        • Escríbenos por WhatsApp para intentar otra fecha.<br/>
        • Explora nuestras otras propiedades disponibles.
      </p>
    </div>
    <div class="btn-center">
      <a href="${WHATSAPP_URL}" class="btn-primary" style="background:linear-gradient(135deg,#b45309,#d97706); color:#ffffff;">
        💬 Contactar por WhatsApp
      </a>
      <a href="${BASE_URL}/propiedades" class="btn-secondary" style="color:#b45309; border-color:#b45309;">
        Ver catálogo
      </a>
    </div>
    <div class="divider"></div>
    <p class="tip" style="text-align:center;">Gracias por confiar en nosotros. Seguimos a tu disposición.</p>
    `
  );
}

function rescheduledHtml(d) {
  const newDate = d.proposedDate || d.requestedDate;
  const newTime = d.proposedTime || d.requestedTime;
  return htmlWrapper(
    "linear-gradient(135deg, #0f2040 0%, #1e3a6e 100%)",
    `
    <span class="emoji-icon">📅</span>
    <h1 class="title" style="color:#1e40af; text-align:center;">Propuesta de nueva fecha</h1>
    <p class="subtitle" style="text-align:center;">
      Hola <strong style="color:#1f2937;">${d.clientName}</strong>,<br/>
      hemos reservado una nueva hora para tu visita a
      <strong style="color:#1f2937;">${d.propertyName}</strong>.
      Por favor <strong style="color:#1e40af;">confirma si la nueva fecha te queda bien</strong>.
    </p>
    <div class="info-card">
      <p style="font-size:11px; font-weight:700; color:#9ca3af; text-transform:uppercase; letter-spacing:1px; margin:0 0 12px;">Nueva propuesta</p>
      ${infoRow("🏠 Propiedad", d.propertyName, "#1e40af")}
      ${infoRow("📅 Nueva fecha", newDate, "#1e40af")}
      ${infoRow("🕐 Nueva hora", newTime, "#1e40af")}
      ${d.agentName ? infoRow("👤 Agente", d.agentName) : ""}
    </div>
    ${d.adminNotes ? `
    <div class="note-box" style="background:#eff6ff; border-left:4px solid #3b82f6;">
      <p style="margin:0; font-size:13px; color:#1d4ed8; font-weight:600;">Nota del agente</p>
      <p style="margin:6px 0 0; font-size:14px; color:#1e3a8a;">${d.adminNotes}</p>
    </div>` : ""}
    <p style="font-size:14px; color:#374151; line-height:1.7; margin:0 0 24px; text-align:center;">
      Si esta nueva fecha <strong>no te conviene</strong>, contáctanos y buscaremos otra alternativa.
    </p>
    <div class="btn-center">
      <a href="${WHATSAPP_URL}" class="btn-primary" style="background:linear-gradient(135deg,#1e40af,#2563eb); color:#ffffff;">
        ✅ Confirmar nueva fecha
      </a>
      <a href="${WHATSAPP_URL}" class="btn-secondary" style="color:#1e40af; border-color:#1e40af;">
        Proponer otra fecha
      </a>
    </div>
    `
  );
}

function agentHtml(d) {
  return htmlWrapper(
    "linear-gradient(135deg, #1a1f2e 0%, #2d3548 100%)",
    `
    <span class="emoji-icon">🏡</span>
    <h1 class="title" style="color:#b8952a; text-align:center;">Nueva visita asignada</h1>
    <p class="subtitle" style="text-align:center;">
      Hola <strong style="color:#1f2937;">${d.agentName}</strong>,<br/>
      tienes una nueva visita confirmada. Revisa todos los detalles a continuación.
    </p>
    <div class="info-card" style="border:2px solid #fef3c7;">
      <p style="font-size:11px; font-weight:700; color:#9ca3af; text-transform:uppercase; letter-spacing:1px; margin:0 0 12px;">Datos del cliente</p>
      ${infoRow("👤 Nombre", d.clientName, "#1f2937")}
      ${infoRow("📧 Email", d.clientEmail || "—")}
      ${infoRow("📱 Teléfono", d.clientPhone || "—")}
      ${d.clientMessage ? infoRow("💬 Mensaje", d.clientMessage) : ""}
    </div>
    <div class="info-card">
      <p style="font-size:11px; font-weight:700; color:#9ca3af; text-transform:uppercase; letter-spacing:1px; margin:0 0 12px;">Detalle de la visita</p>
      ${infoRow("🏠 Propiedad", d.propertyName, "#b8952a")}
      ${infoRow("📅 Fecha", d.requestedDate, "#1e40af")}
      ${infoRow("🕐 Hora", d.requestedTime, "#1e40af")}
      ${d.propertyAddress ? infoRow("📍 Dirección", d.propertyAddress) : ""}
    </div>
    <div class="note-box" style="background:#fffbeb; border-left:4px solid #f59e0b;">
      <p style="margin:0; font-size:13px; color:#92400e; font-weight:600;">⚠️ Recuerda</p>
      <p style="margin:6px 0 0; font-size:14px; color:#78350f; line-height:1.7;">
        Llega con al menos 10 minutos de anticipación.<br/>
        Confirma la visita con el cliente un día antes.
      </p>
    </div>
    <div class="btn-center">
      <a href="${BASE_URL}/usuarios/visitas" class="btn-primary" style="background:linear-gradient(135deg,#b8952a,#d4a836); color:#ffffff;">
        📋 Ver panel de visitas
      </a>
      <a href="${WHATSAPP_URL}" class="btn-secondary" style="color:#b8952a; border-color:#b8952a;">
        Contactar cliente
      </a>
    </div>
    `
  );
}

function createTransport(gmailUser, gmailPass) {
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: gmailUser, pass: gmailPass },
  });
}

async function sendMail(transporter, gmailUser, { to, subject, html }) {
  if (!to) {
    console.warn(`[onVisitStatusChanged] sendMail: destinatario vacío para "${subject}". Ignorado.`);
    return;
  }
  await transporter.sendMail({
    from: `"${FROM_NAME}" <${gmailUser}>`,
    to,
    subject,
    html,
  });
  console.log(`[onVisitStatusChanged] Email enviado a ${to} — ${subject}`);
}

exports.onVisitStatusChanged = onDocumentWritten(
  {
    document: "visits/{visitId}",
    region: "us-central1",
    secrets: [GMAIL_USER, GMAIL_PASS],
  },
  async (event) => {
    const before = event.data?.before?.data() ?? null;
    const after = event.data?.after?.data() ?? null;

    if (!after) {
      console.log("[onVisitStatusChanged] Documento eliminado. Ignorado.");
      return;
    }

    const prevStatus = before?.status ?? null;
    const nextStatus = String(after.status || "").trim().toLowerCase();

    if (prevStatus === nextStatus) {
      console.log(`[onVisitStatusChanged] Estado sin cambio (${nextStatus}). Ignorado.`);
      return;
    }

    console.log(`[onVisitStatusChanged] ${event.params.visitId}: ${prevStatus ?? "NEW"} → ${nextStatus}`);

    const gmailUser = GMAIL_USER.value();
    const gmailPass = GMAIL_PASS.value();

    if (!gmailUser || !gmailPass) {
      console.error("[onVisitStatusChanged] Secrets GMAIL_USER / GMAIL_PASS no disponibles.");
      return;
    }

    const transporter = createTransport(gmailUser, gmailPass);

    const d = {
      clientName: String(after.clientName || "Cliente").trim(),
      clientEmail: String(after.clientEmail || "").trim(),
      clientPhone: String(after.clientPhone || "").trim(),
      clientMessage: String(after.notes || "").trim(),
      propertyName: String(after.propertyName || "la propiedad").trim(),
      propertyAddress: String(after.propertyAddress || "").trim(),
      requestedDate: String(after.requestedDate || "").trim(),
      requestedTime: String(after.requestedTime || "").trim(),
      proposedDate: String(after.proposedDate || "").trim(),
      proposedTime: String(after.proposedTime || "").trim(),
      agentName: String(after.agentName || "").trim(),
      agentEmail: String(after.agentEmail || "").trim(),
      adminNotes: String(after.adminNotes || "").trim(),
      notes: String(after.notes || "").trim(),
    };

    const clientEmail = d.clientEmail;
    const agentEmail = d.agentEmail;

    if (prevStatus === null && nextStatus === "pending") {
      await sendMail(transporter, gmailUser, {
        to: clientEmail,
        subject: `✅ Solicitud de visita recibida — ${d.propertyName}`,
        html: pendingHtml(d),
      });
      return;
    }

if (nextStatus === "approved") {
      // Email manejado por visit.service.js → extensión /mail
      console.log(`[onVisitStatusChanged] approved — email delegado a extensión /mail`);
      return;
    }

    if (nextStatus === "rejected") {
      // Email manejado por visit.service.js → extensión /mail
      console.log(`[onVisitStatusChanged] rejected — email delegado a extensión /mail`);
      return;
    }

    if (nextStatus === "rescheduled") {
      // Email manejado por visit.service.js → extensión /mail
      console.log(`[onVisitStatusChanged] rescheduled — email delegado a extensión /mail`);
      return;
    }
    }

    console.log(`[onVisitStatusChanged] Estado "${nextStatus}" no genera email. Ignorado.`);
  }
);

exports.onUserCreated = onDocumentCreated(
  {
    document: "users/{email}",
    region: "us-central1",
    secrets: [GMAIL_USER, GMAIL_PASS],
  },
  async (event) => {
    const data = event.data?.data() ?? null;
    if (!data) return;

    const role = String(data.role || "").toLowerCase();
    const email = String(data.email || event.params.email || "").trim();
    const name = String(data.displayName || "").split(" ")[0] || "Cliente";

    if (!email) return;
    if (role !== "viewer") return;

    const gmailUser = GMAIL_USER.value();
    const gmailPass = GMAIL_PASS.value();
    if (!gmailUser || !gmailPass) return;

    const transporter = createTransport(gmailUser, gmailPass);

    const html = htmlWrapper(
      "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      `
      <div style="text-align:center;font-size:56px;margin-bottom:20px;">🏠</div>
      <h1 class="title" style="text-align:center;color:#b8952a;">¡Bienvenido, ${name}!</h1>
      <p class="subtitle" style="text-align:center;">
        Tu cuenta en R&B Inmobiliaria ya está activa.<br/>
        Desde tu portal personal puedes gestionar todo.
      </p>
      <div class="info-card">
        <div class="info-row">
          <span class="info-label">📅</span>
          <span class="info-value">Agendar y seguir el estado de tus visitas</span>
        </div>
        <div class="info-row">
          <span class="info-label">📋</span>
          <span class="info-value">Acceder a tus contratos y descargar documentos</span>
        </div>
        <div class="info-row">
          <span class="info-label">❤️</span>
          <span class="info-value">Guardar tus propiedades favoritas</span>
        </div>
        <div class="info-row">
          <span class="info-label">🔔</span>
          <span class="info-value">Recibir notificaciones sobre tus solicitudes</span>
        </div>
      </div>
      <div class="btn-center">
        <a href="${BASE_URL}/portal" class="btn-primary" style="background:linear-gradient(135deg,#b8952a,#d4a836);color:#ffffff;">
          Ir a mi portal →
        </a>
        <a href="${BASE_URL}/catalogo" class="btn-secondary" style="color:#b8952a;border-color:#b8952a;">
          Ver propiedades
        </a>
      </div>
      <div class="divider"></div>
      <p class="tip" style="text-align:center;">
        ¿Tienes preguntas? Escríbenos al
        <a href="https://wa.me/573105968202" style="color:#b8952a;font-weight:600;">WhatsApp 310 596 8202</a>
        o al correo
        <a href="mailto:inmojuridi09@gmail.com" style="color:#b8952a;">inmojuridi09@gmail.com</a>
      </p>
      `
    );

    await sendMail(transporter, gmailUser, {
      to: email,
      subject: `¡Bienvenido a R&B Inmobiliaria, ${name}! 🏠`,
      html,
    });

    console.log(`[onUserCreated] Email de bienvenida enviado a ${email}`);
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIÓN 7: onContractCreated — notifica al cliente cuando se crea un contrato
// ═══════════════════════════════════════════════════════════════════════════════

exports.onContractCreated = onDocumentCreated(
  {
    document: "contracts/{contractId}",
    region: "us-central1",
    secrets: [GMAIL_USER, GMAIL_PASS],
  },
  async (event) => {
    const data = event.data?.data() ?? null;
    if (!data) return;

    const clientEmail = String(data.clientEmail || "").trim();
    if (!clientEmail) return;

    if (data.status === "borrador") return;

    const gmailUser = GMAIL_USER.value();
    const gmailPass = GMAIL_PASS.value();
    if (!gmailUser || !gmailPass) return;

    const transporter = createTransport(gmailUser, gmailPass);
    const d = {
      clientName: String(data.clientName || "Cliente").trim(),
      propertyName: String(data.propertyName || "la propiedad").trim(),
      type: String(data.type || "contrato").trim(),
      value: Number(data.value || 0),
      startDate: String(data.startDate || "").trim(),
      endDate: String(data.endDate || "").trim(),
      agentName: String(data.agentName || "").trim(),
      agentEmail: String(data.agentEmail || "").trim(),
    };

    const typeLabel = { venta: "Venta", arriendo: "Arriendo", promesa: "Promesa de compraventa" };
    const valueStr =
      d.value > 0
        ? new Intl.NumberFormat("es-CO", {
            style: "currency",
            currency: "COP",
            minimumFractionDigits: 0,
          }).format(d.value)
        : "—";

    const html = htmlWrapper(
      "linear-gradient(135deg, #0c2340 0%, #1a3a6e 100%)",
      `
      <span class="emoji-icon">📋</span>
      <h1 class="title" style="color:#1e40af;text-align:center;">Nuevo contrato registrado</h1>
      <p class="subtitle" style="text-align:center;">
        Hola <strong style="color:#1f2937;">${d.clientName}</strong>,<br/>
        se ha registrado un contrato a tu nombre. Aquí tienes los detalles:
      </p>
      <div class="info-card">
        ${infoRow("📋 Tipo", typeLabel[d.type] || d.type, "#1e40af")}
        ${infoRow("🏠 Propiedad", d.propertyName, "#b8952a")}
        ${infoRow("💰 Valor", valueStr, "#166534")}
        ${d.startDate ? infoRow("📅 Inicio", d.startDate) : ""}
        ${d.endDate ? infoRow("📅 Fin", d.endDate) : ""}
        ${d.agentName ? infoRow("👤 Agente", d.agentName) : ""}
      </div>
      <div class="note-box" style="background:#eff6ff;border-left:4px solid #3b82f6;">
        <p style="margin:0;font-size:13px;color:#1d4ed8;font-weight:600;">¿Qué sigue?</p>
        <p style="margin:6px 0 0;font-size:14px;color:#1e3a8a;line-height:1.7;">
          Puedes consultar y descargar el documento desde tu portal personal.
          Si tienes dudas, no dudes en contactar a tu agente o a nuestro equipo.
        </p>
      </div>
      <div class="btn-center">
        <a href="${BASE_URL}/portal" class="btn-primary" style="background:linear-gradient(135deg,#1e40af,#2563eb);color:#ffffff;">
          Ver en mi portal →
        </a>
        <a href="https://wa.me/573105968202" class="btn-secondary" style="color:#1e40af;border-color:#1e40af;">
          Contactar agente
        </a>
      </div>
      `
    );

    await sendMail(transporter, gmailUser, {
      to: clientEmail,
      subject: `📋 Contrato registrado — ${d.propertyName}`,
      html,
    });

    if (d.agentEmail && d.agentEmail !== gmailUser) {
      const agentHtmlContent = htmlWrapper(
        "linear-gradient(135deg,#1a1f2e,#2d3548)",
        `
        <span class="emoji-icon">🏡</span>
        <h1 class="title" style="color:#b8952a;text-align:center;">Contrato creado</h1>
        <p class="subtitle" style="text-align:center;">
          Hola <strong style="color:#1f2937;">${d.agentName}</strong>,<br/>
          se registró un nuevo contrato bajo tu gestión.
        </p>
        <div class="info-card">
          ${infoRow("👤 Cliente", d.clientName, "#1f2937")}
          ${infoRow("🏠 Propiedad", d.propertyName, "#b8952a")}
          ${infoRow("💰 Valor", valueStr, "#166534")}
          ${infoRow("📋 Tipo", typeLabel[d.type] || d.type, "#1e40af")}
        </div>
        <div class="btn-center">
          <a href="${BASE_URL}/contratos" class="btn-primary" style="background:linear-gradient(135deg,#b8952a,#d4a836);color:#ffffff;">
            Ver en panel
          </a>
        </div>
        `
      );
      await sendMail(transporter, gmailUser, {
        to: d.agentEmail,
        subject: `📋 Contrato registrado — ${d.propertyName} · ${d.clientName}`,
        html: agentHtmlContent,
      });
    }

    console.log(`[onContractCreated] Email enviado a ${clientEmail}`);
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIÓN 8: processContractAlerts — Cloud Function programada (cron)
// ═══════════════════════════════════════════════════════════════════════════════

const ALERT_RULES = {
  rent: {
    beforeDueDays: [5, 1],
    onDueDay: true,
    lateDays: [1, 3, 8],
    contractExpiryDays: [60, 30, 15],
    renewalWindowDays: [60, 30],
  },
  sale: {
    promiseDueDays: [5, 1],
    deedSigningDays: [7, 1],
    deliveryDays: [3, 1],
  },
};

function parseDate(v) {
  if (!v) return null;
  if (v?.toDate) return v.toDate();
  if (v instanceof Date) return v;
  const d = new Date(v);
  return isNaN(d) ? null : d;
}
function diffDays(a, b) {
  const ms = a.getTime() - b.getTime();
  return Math.round(ms / 86400000);
}
function fmtDateCO(d) {
  if (!d) return "—";
  return d.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
}
function fmtCOP(n) {
  if (!n) return "—";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(n);
}
function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function emitAlert({
  contractId,
  alertKey,
  notificationsForUserIds,
  notificationPayload,
  emailRecipient,
  emailSubject,
  emailHtml,
  transporter,
  gmailUser,
}) {
  const db = admin.firestore();
  const alertsRef = db.collection("contracts").doc(contractId).collection("alerts_sent");

  const existing = await alertsRef.where("alertKey", "==", alertKey).limit(1).get();
  if (!existing.empty) {
    return { sent: false, reason: "duplicate" };
  }

  await alertsRef.add({
    alertKey,
    sentAt: admin.firestore.FieldValue.serverTimestamp(),
    channels: { inApp: true, email: !!emailRecipient },
    recipients: notificationsForUserIds,
  });

  const notifCol = db.collection("notifications");
  const notifTasks = notificationsForUserIds
    .filter(Boolean)
    .map((uid) =>
      notifCol
        .add({
          ...notificationPayload,
          userId: String(uid).trim().toLowerCase(),
          alertKey,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        })
        .catch((e) => console.warn("[emitAlert] notif:", e?.message))
    );
  await Promise.all(notifTasks);

  if (emailRecipient && transporter && gmailUser) {
    try {
      await sendMail(transporter, gmailUser, {
        to: emailRecipient,
        subject: emailSubject,
        html: emailHtml,
      });
    } catch (e) {
      console.warn("[emitAlert] email failed:", e?.message);
    }
  }

  return { sent: true };
}

function buildPaymentReminderEmail({ clientName, propertyName, amount, dueDate, daysAhead }) {
  return {
    subject: `💰 Recordatorio de pago — ${propertyName} (${daysAhead}d)`,
    html: htmlWrapper(
      "linear-gradient(135deg, #0c2340 0%, #1a3a6e 100%)",
      `
      <span class="emoji-icon">💰</span>
      <h1 class="title" style="color:#1e40af;text-align:center;">Recordatorio de pago</h1>
      <p class="subtitle" style="text-align:center;">
        Hola <strong style="color:#1f2937;">${clientName}</strong>,<br/>
        tu próximo pago de arriendo vence en
        <strong style="color:#1e40af;">${daysAhead} día${daysAhead === 1 ? "" : "s"}</strong>.
      </p>
      <div class="info-card">
        ${infoRow("🏠 Propiedad",    propertyName,         "#b8952a")}
        ${infoRow("📅 Fecha límite", fmtDateCO(dueDate),   "#1e40af")}
        ${infoRow("💰 Valor",        fmtCOP(amount),       "#166534")}
      </div>
      <div class="btn-center">
        <a href="${BASE_URL}/portal" class="btn-primary" style="background:linear-gradient(135deg,#1e40af,#2563eb);color:#ffffff;">
          Ver en mi portal →
        </a>
      </div>
      `
    ),
  };
}

function buildPaymentDueTodayEmail({ clientName, propertyName, amount }) {
  return {
    subject: `📅 Tu pago vence HOY — ${propertyName}`,
    html: htmlWrapper(
      "linear-gradient(135deg, #c2410c 0%, #ea580c 100%)",
      `
      <span class="emoji-icon">📅</span>
      <h1 class="title" style="color:#c2410c;text-align:center;">Tu pago vence hoy</h1>
      <p class="subtitle" style="text-align:center;">
        Hola <strong style="color:#1f2937;">${clientName}</strong>,<br/>
        recuerda que el pago de tu arriendo de
        <strong>${propertyName}</strong> vence hoy.
      </p>
      <div class="info-card">
        ${infoRow("💰 Valor", fmtCOP(amount), "#c2410c")}
      </div>
      <div class="btn-center">
        <a href="${BASE_URL}/portal" class="btn-primary" style="background:linear-gradient(135deg,#c2410c,#ea580c);color:#ffffff;">
          Ver en mi portal →
        </a>
      </div>
      `
    ),
  };
}

function buildLatePaymentEmail({ clientName, propertyName, amount, dueDate, daysLate }) {
  return {
    subject: `⚠️ Pago vencido — ${propertyName} (${daysLate}d en mora)`,
    html: htmlWrapper(
      "linear-gradient(135deg, #991b1b 0%, #b91c1c 100%)",
      `
      <span class="emoji-icon">⚠️</span>
      <h1 class="title" style="color:#991b1b;text-align:center;">Pago en mora</h1>
      <p class="subtitle" style="text-align:center;">
        Hola <strong style="color:#1f2937;">${clientName}</strong>,<br/>
        tu pago de arriendo de <strong>${propertyName}</strong> está en mora desde hace
        <strong style="color:#991b1b;">${daysLate} día${daysLate === 1 ? "" : "s"}</strong>.
      </p>
      <div class="info-card">
        ${infoRow("📅 Fecha vencimiento", fmtDateCO(dueDate), "#991b1b")}
        ${infoRow("💰 Valor",             fmtCOP(amount),     "#991b1b")}
      </div>
      <div class="note-box" style="background:#fef2f2;border-left:4px solid #dc2626;">
        <p style="margin:0;font-size:13px;color:#991b1b;font-weight:600;">Acción recomendada</p>
        <p style="margin:6px 0 0;font-size:14px;color:#7f1d1d;line-height:1.7;">
          Por favor regulariza el pago lo antes posible o contacta a tu agente para coordinar.
        </p>
      </div>
      <div class="btn-center">
        <a href="${WHATSAPP_URL}" class="btn-primary" style="background:linear-gradient(135deg,#dc2626,#ef4444);color:#ffffff;">
          Contactar inmediatamente
        </a>
      </div>
      `
    ),
  };
}

function buildContractExpiryEmail({ clientName, propertyName, endDate, daysAhead, isRent }) {
  return {
    subject: `📆 Tu contrato vence en ${daysAhead} días — ${propertyName}`,
    html: htmlWrapper(
      "linear-gradient(135deg, #92400e 0%, #b45309 100%)",
      `
      <span class="emoji-icon">📆</span>
      <h1 class="title" style="color:#92400e;text-align:center;">Tu contrato está por vencer</h1>
      <p class="subtitle" style="text-align:center;">
        Hola <strong style="color:#1f2937;">${clientName}</strong>,<br/>
        tu contrato de <strong>${propertyName}</strong> vence en
        <strong style="color:#92400e;">${daysAhead} día${daysAhead === 1 ? "" : "s"}</strong>.
      </p>
      <div class="info-card">
        ${infoRow("📅 Fecha vencimiento", fmtDateCO(endDate), "#92400e")}
      </div>
      <div class="note-box" style="background:#fffbeb;border-left:4px solid #f59e0b;">
        <p style="margin:0;font-size:13px;color:#92400e;font-weight:600;">¿Qué sigue?</p>
        <p style="margin:6px 0 0;font-size:14px;color:#78350f;line-height:1.7;">
          ${
            isRent
              ? "Contacta a tu agente para definir si deseas renovar el arriendo o coordinar la entrega del inmueble."
              : "Contacta a tu agente para revisar los próximos pasos."
          }
        </p>
      </div>
      <div class="btn-center">
        <a href="${BASE_URL}/portal" class="btn-primary" style="background:linear-gradient(135deg,#b45309,#d97706);color:#ffffff;">
          Ver en mi portal →
        </a>
      </div>
      `
    ),
  };
}

function buildRenewalWindowEmail({ clientName, propertyName, endDate, daysAhead }) {
  return {
    subject: `🔁 Ventana de renovación abierta — ${propertyName}`,
    html: htmlWrapper(
      "linear-gradient(135deg, #166534 0%, #15803d 100%)",
      `
      <span class="emoji-icon">🔁</span>
      <h1 class="title" style="color:#166534;text-align:center;">Es momento de pensar en la renovación</h1>
      <p class="subtitle" style="text-align:center;">
        Hola <strong style="color:#1f2937;">${clientName}</strong>,<br/>
        tu arriendo de <strong>${propertyName}</strong> vence en
        <strong style="color:#166534;">${daysAhead} días</strong>.
      </p>
      <div class="info-card">
        ${infoRow("📅 Fin del contrato", fmtDateCO(endDate), "#166534")}
      </div>
      <p style="text-align:center;color:#374151;font-size:14px;margin:16px 0 0;">
        Si deseas renovar, este es un buen momento para conversarlo con tu agente.
      </p>
      <div class="btn-center">
        <a href="${WHATSAPP_URL}" class="btn-primary" style="background:linear-gradient(135deg,#15803d,#16a34a);color:#ffffff;">
          Hablar con mi agente
        </a>
      </div>
      `
    ),
  };
}

exports.processContractAlerts = onSchedule(
  {
    schedule: "every 6 hours",
    region: "us-central1",
    timeZone: "America/Bogota",
    secrets: [GMAIL_USER, GMAIL_PASS],
    memory: "512MiB",
    timeoutSeconds: 540,
  },
  async () => {
    const startTime = Date.now();
    const db = admin.firestore();

    const gmailUser = GMAIL_USER.value();
    const gmailPass = GMAIL_PASS.value();
    const transporter = gmailUser && gmailPass ? createTransport(gmailUser, gmailPass) : null;
    if (!transporter) {
      console.warn("[processContractAlerts] sin credenciales Gmail — solo notificaciones in-app");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = {
      contractsScanned: 0,
      alertsSent: 0,
      duplicatesSkipped: 0,
      errors: 0,
    };

    let contractsSnap;
    try {
      contractsSnap = await db.collection("contracts").where("statusGeneral", "==", "vigente").get();
    } catch (e) {
      console.error("[processContractAlerts] query falló:", e?.message);
      return;
    }

    let legacySnap;
    try {
      legacySnap = await db.collection("contracts").where("status", "==", "vigente").get();
    } catch {
      legacySnap = { docs: [] };
    }

    const contractsById = new Map();
    for (const d of contractsSnap.docs) contractsById.set(d.id, d);
    for (const d of legacySnap.docs) if (!contractsById.has(d.id)) contractsById.set(d.id, d);

    for (const docSnap of contractsById.values()) {
      stats.contractsScanned++;
      try {
        const contract = { id: docSnap.id, ...docSnap.data() };
        await processOneContract({ contract, today, transporter, gmailUser, stats });
      } catch (e) {
        stats.errors++;
        console.error(`[processContractAlerts] error en contrato ${docSnap.id}:`, e?.message);
      }
    }

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`[processContractAlerts] OK en ${elapsed}s — ${JSON.stringify(stats)}`);
  }
);

async function processOneContract({ contract, today, transporter, gmailUser, stats }) {
  const clientEmail = String(contract.clientEmail || "").trim().toLowerCase();
  const agentEmail = String(contract.agentEmail || "").trim().toLowerCase();
  const propertyName = String(contract.propertyName || "tu propiedad");
  const clientName = String(contract.clientName || "Cliente");
  const type = String(contract.type || "");

  if (!clientEmail) return;

  const userIds = [clientEmail, agentEmail].filter(Boolean);

  const endDate = parseDate(contract.endDate);
  if (endDate) {
    const daysToEnd = diffDays(endDate, today);

    if (type === "arriendo") {
      for (const d of ALERT_RULES.rent.contractExpiryDays) {
        if (daysToEnd === d) {
          const alertKey = `contract_expiry_${d}d_${contract.id}`;
          const { subject, html } = buildContractExpiryEmail({
            clientName,
            propertyName,
            endDate,
            daysAhead: d,
            isRent: true,
          });
          const r = await emitAlert({
            contractId: contract.id,
            alertKey,
            notificationsForUserIds: userIds,
            notificationPayload: {
              type: "contrato_por_vencer",
              title: "Tu contrato está por vencer",
              message: `El contrato de "${propertyName}" vence en ${d} días.`,
              actionUrl: "/portal",
            },
            emailRecipient: clientEmail,
            emailSubject: subject,
            emailHtml: html,
            transporter,
            gmailUser,
          });
          if (r.sent) stats.alertsSent++;
          else if (r.reason === "duplicate") stats.duplicatesSkipped++;
        }
      }
      for (const d of ALERT_RULES.rent.renewalWindowDays) {
        if (daysToEnd === d) {
          const alertKey = `renewal_window_${d}d_${contract.id}`;
          const { subject, html } = buildRenewalWindowEmail({
            clientName,
            propertyName,
            endDate,
            daysAhead: d,
          });
          const r = await emitAlert({
            contractId: contract.id,
            alertKey,
            notificationsForUserIds: userIds,
            notificationPayload: {
              type: "recordatorio_renovacion",
              title: "Ventana de renovación abierta",
              message: `Considera renovar el contrato de "${propertyName}" (vence en ${d} días).`,
              actionUrl: "/portal",
            },
            emailRecipient: clientEmail,
            emailSubject: subject,
            emailHtml: html,
            transporter,
            gmailUser,
          });
          if (r.sent) stats.alertsSent++;
          else if (r.reason === "duplicate") stats.duplicatesSkipped++;
        }
      }
    }

    if (type === "venta" || type === "promesa") {
      const stage = contract.businessStage || "";

      if (stage === "promesa_firmada") {
        for (const d of ALERT_RULES.sale.promiseDueDays) {
          if (daysToEnd === d) {
            await emitGenericStageAlert({
              contract,
              alertKey: `promise_due_${d}d_${contract.id}`,
              type: "promesa_por_vencer",
              title: "Plazo de promesa próximo",
              message: `La promesa de "${propertyName}" vence en ${d} días.`,
              userIds,
              transporter,
              gmailUser,
              stats,
            });
          }
        }
      }

      if (stage === "minuta_preparacion" || stage === "credito_aprobado" || stage === "leasing_aprobado") {
        for (const d of ALERT_RULES.sale.deedSigningDays) {
          if (daysToEnd === d) {
            await emitGenericStageAlert({
              contract,
              alertKey: `deed_due_${d}d_${contract.id}`,
              type: "escritura_por_firmar",
              title: "Firma de escritura próxima",
              message: `La firma de la escritura para "${propertyName}" se aproxima (${d} días).`,
              userIds,
              transporter,
              gmailUser,
              stats,
            });
          }
        }
      }

      if (stage === "registrado") {
        for (const d of ALERT_RULES.sale.deliveryDays) {
          if (daysToEnd === d) {
            await emitGenericStageAlert({
              contract,
              alertKey: `delivery_due_${d}d_${contract.id}`,
              type: "entrega_proxima",
              title: "Entrega de inmueble próxima",
              message: `La entrega de "${propertyName}" está prevista en ${d} días.`,
              userIds,
              transporter,
              gmailUser,
              stats,
            });
          }
        }
      }
    }
  }

  if (type !== "arriendo") return;

  const paymentsSnap = await admin
    .firestore()
    .collection("contracts")
    .doc(contract.id)
    .collection("payments")
    .get();

  for (const pSnap of paymentsSnap.docs) {
    const payment = { id: pSnap.id, ...pSnap.data() };
    const status = payment.status || "pendiente";
    const dueDate = parseDate(payment.dueDate);
    if (!dueDate) continue;

    dueDate.setHours(0, 0, 0, 0);
    const daysToDue = diffDays(dueDate, today);

    if (status === "pendiente" && daysToDue > 0) {
      for (const d of ALERT_RULES.rent.beforeDueDays) {
        if (daysToDue === d) {
          const alertKey = `payment_reminder_${d}d_${contract.id}_${payment.id}`;
          const { subject, html } = buildPaymentReminderEmail({
            clientName,
            propertyName,
            amount: payment.amount,
            dueDate,
            daysAhead: d,
          });
          const r = await emitAlert({
            contractId: contract.id,
            alertKey,
            notificationsForUserIds: userIds,
            notificationPayload: {
              type: "recordatorio_pago",
              title: "Próximo pago de arriendo",
              message: `El pago "${payment.label || `cuota ${payment.order}`}" de "${propertyName}" vence en ${d} día${
                d === 1 ? "" : "s"
              }.`,
              actionUrl: "/portal",
            },
            emailRecipient: clientEmail,
            emailSubject: subject,
            emailHtml: html,
            transporter,
            gmailUser,
          });
          if (r.sent) stats.alertsSent++;
          else if (r.reason === "duplicate") stats.duplicatesSkipped++;
        }
      }
    }

    if (status === "pendiente" && daysToDue === 0 && ALERT_RULES.rent.onDueDay) {
      const alertKey = `payment_due_today_${contract.id}_${payment.id}_${ymd(today)}`;
      const { subject, html } = buildPaymentDueTodayEmail({
        clientName,
        propertyName,
        amount: payment.amount,
      });
      const r = await emitAlert({
        contractId: contract.id,
        alertKey,
        notificationsForUserIds: userIds,
        notificationPayload: {
          type: "pago_hoy",
          title: "Tu pago vence hoy",
          message: `Recuerda pagar el canon de "${propertyName}" hoy.`,
          actionUrl: "/portal",
        },
        emailRecipient: clientEmail,
        emailSubject: subject,
        emailHtml: html,
        transporter,
        gmailUser,
      });
      if (r.sent) stats.alertsSent++;
      else if (r.reason === "duplicate") stats.duplicatesSkipped++;
    }

    if ((status === "pendiente" || status === "vencido") && daysToDue < 0) {
      const daysLate = Math.abs(daysToDue);
      for (const d of ALERT_RULES.rent.lateDays) {
        if (daysLate === d) {
          const alertKey = `payment_late_${d}d_${contract.id}_${payment.id}`;
          const { subject, html } = buildLatePaymentEmail({
            clientName,
            propertyName,
            amount: payment.amount,
            dueDate,
            daysLate: d,
          });
          const r = await emitAlert({
            contractId: contract.id,
            alertKey,
            notificationsForUserIds: userIds,
            notificationPayload: {
              type: "mora",
              title: "Pago en mora",
              message: `El pago de "${propertyName}" lleva ${d} día${d === 1 ? "" : "s"} en mora.`,
              actionUrl: "/portal",
            },
            emailRecipient: clientEmail,
            emailSubject: subject,
            emailHtml: html,
            transporter,
            gmailUser,
          });
          if (r.sent) stats.alertsSent++;
          else if (r.reason === "duplicate") stats.duplicatesSkipped++;

          if (status !== "vencido") {
            pSnap.ref
              .update({
                status: "vencido",
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              })
              .catch(() => {});
          }
        }
      }
    }
  }
}

async function emitGenericStageAlert({
  contract,
  alertKey,
  type,
  title,
  message,
  userIds,
  transporter,
  gmailUser,
  stats,
}) {
  const propertyName = String(contract.propertyName || "tu propiedad");
  const clientName = String(contract.clientName || "Cliente");
  const clientEmail = String(contract.clientEmail || "").trim().toLowerCase();

  const html = htmlWrapper(
    "linear-gradient(135deg, #0c2340 0%, #1a3a6e 100%)",
    `
    <span class="emoji-icon">📋</span>
    <h1 class="title" style="color:#1e40af;text-align:center;">${title}</h1>
    <p class="subtitle" style="text-align:center;">
      Hola <strong style="color:#1f2937;">${clientName}</strong>,<br/>
      ${message}
    </p>
    <div class="info-card">
      ${infoRow("🏠 Propiedad", propertyName, "#b8952a")}
    </div>
    <div class="btn-center">
      <a href="${BASE_URL}/portal" class="btn-primary" style="background:linear-gradient(135deg,#1e40af,#2563eb);color:#ffffff;">
        Ver en mi portal →
      </a>
    </div>
    `
  );

  const r = await emitAlert({
    contractId: contract.id,
    alertKey,
    notificationsForUserIds: userIds,
    notificationPayload: { type, title, message, actionUrl: "/portal" },
    emailRecipient: clientEmail,
    emailSubject: title,
    emailHtml: html,
    transporter,
    gmailUser,
  });
  if (r.sent) stats.alertsSent++;
  else if (r.reason === "duplicate") stats.duplicatesSkipped++;
}
// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIÓN 9: onContractUpdated — envía email al cliente cuando cambia el estado
// del contrato (activado, finalizado, cancelado, etc.)
// ═══════════════════════════════════════════════════════════════════════════════

exports.onContractUpdated = onDocumentWritten(
  {
    document: "contracts/{contractId}",
    region: "us-central1",
    secrets: [GMAIL_USER, GMAIL_PASS],
  },
  async (event) => {
    const before = event.data?.before?.data?.() ?? null;
    const after = event.data?.after?.data?.() ?? null;
    if (!before || !after) return; // creación o eliminación (ya cubiertas)

    const prevStatus = before.statusGeneral || before.status;
    const nextStatus = after.statusGeneral || after.status;
    const prevStage = before.businessStage;
    const nextStage = after.businessStage;

    // Solo enviar email si cambió el status O la etapa
    if (prevStatus === nextStatus && prevStage === nextStage) return;

    const clientEmail = String(after.clientEmail || "").trim();
    if (!clientEmail) return;

    const gmailUser = GMAIL_USER.value();
    const gmailPass = GMAIL_PASS.value();
    if (!gmailUser || !gmailPass) return;

    const transporter = createTransport(gmailUser, gmailPass);
    const clientName = String(after.clientName || "Cliente").trim();
    const propertyName = String(after.propertyName || "la propiedad").trim();
    const typeLabel = { venta: "Venta", arriendo: "Arriendo", promesa: "Promesa" };
    const contractType = typeLabel[after.type] || after.type || "Contrato";

    // ── Email por cambio de STATUS ────────────────────────────────────────
    if (prevStatus !== nextStatus) {
      const statusLabels = {
        vigente: "Vigente ✅",
        finalizado: "Finalizado 🏁",
        cancelado: "Cancelado ❌",
        pausado: "Pausado ⏸️",
        vencido: "Vencido ⚠️",
        borrador: "Borrador 📝",
      };
      const statusColors = {
        vigente: "#166534",
        finalizado: "#1e40af",
        cancelado: "#991b1b",
        pausado: "#92400e",
        vencido: "#d97706",
        borrador: "#6b7280",
      };
      const label = statusLabels[nextStatus] || nextStatus;
      const color = statusColors[nextStatus] || "#1f2937";
      const gradients = {
        vigente: "linear-gradient(135deg, #1a2a1a 0%, #2d4a2d 100%)",
        finalizado: "linear-gradient(135deg, #0f2040 0%, #1e3a6e 100%)",
        cancelado: "linear-gradient(135deg, #1a1010 0%, #3d1515 100%)",
        pausado: "linear-gradient(135deg, #1a1a0f 0%, #3d3515 100%)",
        vencido: "linear-gradient(135deg, #1a1a0f 0%, #3d3515 100%)",
      };

      let actionText = "";
      if (nextStatus === "vigente") actionText = "Tu contrato ahora está activo. Los pagos y etapas se gestionan desde tu portal.";
      else if (nextStatus === "finalizado") actionText = "El contrato ha concluido. Si deseas renovar o iniciar un nuevo proceso, contáctanos.";
      else if (nextStatus === "cancelado") actionText = "Si consideras que esto es un error, comunícate con tu agente inmediatamente.";
      else if (nextStatus === "pausado") actionText = "El contrato está temporalmente pausado. Te notificaremos cuando se reactive.";

      const html = htmlWrapper(
        gradients[nextStatus] || "linear-gradient(135deg, #0c2340 0%, #1a3a6e 100%)",
        `
        <h1 class="title" style="color:${color};text-align:center;">Contrato actualizado: ${label}</h1>
        <p class="subtitle" style="text-align:center;">
          Hola <strong style="color:#1f2937;">${clientName}</strong>,<br/>
          tu contrato de <strong>${contractType}</strong> para
          <strong style="color:${color};">${propertyName}</strong> ha cambiado de estado.
        </p>
        <div class="info-card">
          ${infoRow("📋 Tipo", contractType, color)}
          ${infoRow("🏠 Propiedad", propertyName, "#b8952a")}
          ${infoRow("📊 Estado anterior", statusLabels[prevStatus] || prevStatus)}
          ${infoRow("📊 Nuevo estado", label, color)}
          ${after.agentName ? infoRow("👤 Agente", after.agentName) : ""}
        </div>
        ${actionText ? `
        <div class="note-box" style="background:${color}11;border-left:4px solid ${color};">
          <p style="margin:0;font-size:14px;color:${color};line-height:1.7;">${actionText}</p>
        </div>` : ""}
        <div class="btn-center">
          <a href="${BASE_URL}/portal" class="btn-primary" style="background:linear-gradient(135deg,${color},${color}cc);color:#ffffff;">
            Ver en mi portal →
          </a>
          <a href="${WHATSAPP_URL}" class="btn-secondary" style="color:${color};border-color:${color};">
            Contactar agente
          </a>
        </div>
        `
      );

      await sendMail(transporter, gmailUser, {
        to: clientEmail,
        subject: `📋 Tu contrato de ${propertyName} — ${label}`,
        html,
      });

      // También al agente
      if (after.agentEmail && after.agentEmail !== gmailUser) {
        const agentHtml = htmlWrapper(
          "linear-gradient(135deg,#1a1f2e,#2d3548)",
          `
          <h1 class="title" style="color:#b8952a;text-align:center;">Contrato actualizado</h1>
          <p class="subtitle" style="text-align:center;">
            El contrato de <strong>${propertyName}</strong> con <strong>${clientName}</strong>
            cambió a <strong style="color:${color};">${label}</strong>.
          </p>
          <div class="info-card">
            ${infoRow("📊 Estado", label, color)}
            ${infoRow("🏠 Propiedad", propertyName, "#b8952a")}
            ${infoRow("👤 Cliente", clientName)}
          </div>
          <div class="btn-center">
            <a href="${BASE_URL}/contratos" class="btn-primary" style="background:linear-gradient(135deg,#b8952a,#d4a836);color:#ffffff;">
              Ver en panel
            </a>
          </div>
          `
        );
        await sendMail(transporter, gmailUser, {
          to: after.agentEmail,
          subject: `📋 Contrato ${label} — ${propertyName} · ${clientName}`,
          html: agentHtml,
        });
      }

      console.log(`[onContractUpdated] Email status ${prevStatus}→${nextStatus} enviado a ${clientEmail}`);
    }

    // ── Email por cambio de ETAPA (sin cambio de status) ──────────────────
    else if (prevStage !== nextStage && nextStage) {
      const stageLabels = {
        negociacion: "Negociación",
        reserva: "Reserva",
        promesa_firmada: "Promesa firmada",
        cuota_inicial: "Cuota inicial",
        financiacion: "Financiación",
        credito_aprobado: "Crédito aprobado",
        leasing_aprobado: "Leasing aprobado",
        minuta_preparacion: "Preparación de minuta",
        escritura_firmada: "Escritura firmada",
        registrado: "Registrado",
        entregado: "Entregado",
        borrador_arriendo: "Borrador",
        arriendo_firmado: "Arriendo firmado",
        arriendo_activo: "Arriendo activo",
        canon_por_vencer: "Canon por vencer",
        canon_en_mora: "Canon en mora",
        ventana_renovacion: "Renovación próxima",
        arriendo_finalizado: "Arriendo finalizado",
      };
      const stageLabel = stageLabels[nextStage] || nextStage;

      const html = htmlWrapper(
        "linear-gradient(135deg, #0c2340 0%, #1a3a6e 100%)",
        `
        <h1 class="title" style="color:#1e40af;text-align:center;">Tu contrato avanzó</h1>
        <p class="subtitle" style="text-align:center;">
          Hola <strong style="color:#1f2937;">${clientName}</strong>,<br/>
          tu contrato de <strong>${contractType}</strong> para
          <strong style="color:#1e40af;">${propertyName}</strong> pasó a la etapa:
        </p>
        <div style="text-align:center;margin:20px 0;">
          <span style="display:inline-block;background:#1e40af22;color:#1e40af;font-weight:700;font-size:16px;padding:10px 24px;border-radius:50px;border:2px solid #1e40af44;">
            ${stageLabel}
          </span>
        </div>
        <div class="info-card">
          ${infoRow("📋 Tipo", contractType, "#1e40af")}
          ${infoRow("🏠 Propiedad", propertyName, "#b8952a")}
        </div>
        <div class="btn-center">
          <a href="${BASE_URL}/portal" class="btn-primary" style="background:linear-gradient(135deg,#1e40af,#2563eb);color:#ffffff;">
            Ver en mi portal →
          </a>
        </div>
        `
      );

      await sendMail(transporter, gmailUser, {
        to: clientEmail,
        subject: `📋 Tu contrato avanzó — ${stageLabel}`,
        html,
      });

      console.log(`[onContractUpdated] Email etapa ${prevStage}→${nextStage} enviado a ${clientEmail}`);
    }
  }
);