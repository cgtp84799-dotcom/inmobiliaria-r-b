// ─── v2 imports ───────────────────────────────────────────────────────────────────────────
const { onRequest }          = require("firebase-functions/v2/https");
const { onDocumentWritten }  = require("firebase-functions/v2/firestore");
const { defineSecret }       = require("firebase-functions/params");
const { setGlobalOptions }   = require("firebase-functions/v2");
const admin                  = require("firebase-admin");
const cors                   = require("cors")({ origin: true });
const nodemailer             = require("nodemailer");

// ─── Opciones globales v2 ─────────────────────────────────────────────────────────
setGlobalOptions({ region: "us-central1", maxInstances: 10 });

if (!admin.apps.length) {
  admin.initializeApp();
}

// ─── Secrets ─────────────────────────────────────────────────────────────────
const GMAIL_USER = defineSecret("GMAIL_USER");
const GMAIL_PASS = defineSecret("GMAIL_PASS");

// ─── Constantes globales ──────────────────────────────────────────────────────
const BASE_URL     = "https://inmobiliaria-ryb-y-asociados.com";
const WHATSAPP_URL = "https://wa.me/573105968202";
const LOGO_URL     = `${BASE_URL}/logo.jpg.png`;
const FROM_NAME    = "Inmobiliaria Rincón Bedoya y Asociados";

const PUBLIC_STATUS = new Set([
  "", "disponible", "reservada", "published", "active", "available",
]);

// ─── Helpers CORS / Auth ──────────────────────────────────────────────────────
function setCorsHeaders(req, res) {
  res.set("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.set("Vary", "Origin");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
}
function handlePreflight(req, res) {
  if (req.method === "OPTIONS") { setCorsHeaders(req, res); return res.status(204).send(""); }
  return null;
}
async function assertAdminFromRequest(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    const err = new Error("No autenticado"); err.status = 401; throw err;
  }
  const token       = authHeader.split("Bearer ")[1];
  const decoded     = await admin.auth().verifyIdToken(token);
  const callerEmail = String(decoded.email || "").trim().toLowerCase();
  if (!callerEmail) { const err = new Error("Token sin email"); err.status = 401; throw err; }
  const callerDoc = await admin.firestore().collection("users").doc(callerEmail).get();
  if (!callerDoc.exists || callerDoc.data()?.role !== "admin") {
    const err = new Error("Solo administradores"); err.status = 403; throw err;
  }
  return { callerEmail };
}

// ─── Helpers SEO / Sitemap ────────────────────────────────────────────────────
function normalizeSlug(v=""){return String(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"");}
function xmlEscape(v=""){return String(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");}
function getSafeString(v,fb=""){const r=String(v??"").trim();return r||fb;}
function resolveCity(p={}){return getSafeString(p.location?.city||p.city||"");}
function resolveType(p={}){return getSafeString(p.type||"propiedad","propiedad");}
function resolveTransaction(p={}){return getSafeString(p.transactionType||"");}
function resolveRooms(p={}){return p.rooms??p.features?.rooms??p.features?.bedrooms??p.bedrooms??null;}
function isPublicProperty(p={}){return PUBLIC_STATUS.has(String(p.status||"").trim().toLowerCase());}
function mapTransactionSlug(t=""){const v=String(t).toLowerCase();if(["sale","venta","compra"].includes(v))return"venta";if(["rent","arriendo","alquiler","renta"].includes(v))return"arriendo";return"";}
function mapTypeSlug(t=""){const v=String(t).toLowerCase();if(v.includes("casa"))return"casas";if(v.includes("apart"))return"apartamentos";if(v.includes("lote"))return"lotes";if(v.includes("finca"))return"fincas";if(v.includes("local"))return"locales";return"propiedades";}
function mapTypeSingularSlug(t=""){const v=String(t).toLowerCase();if(v.includes("casa"))return"casa";if(v.includes("apart"))return"apartamento";if(v.includes("lote"))return"lote";if(v.includes("finca"))return"finca";if(v.includes("local"))return"local";return"propiedad";}
function buildPropertySlug(p={}){const parts=[];const tr=mapTransactionSlug(resolveTransaction(p));const ty=mapTypeSingularSlug(resolveType(p));const ci=normalizeSlug(resolveCity(p));const ro=resolveRooms(p);if(tr)parts.push(tr);if(ty)parts.push(ty);if(ci)parts.push(ci);if(ro)parts.push(`${ro}-habitaciones`);return normalizeSlug(parts.join(" "))||"propiedad";}
function buildCityLandingPath(city){const s=normalizeSlug(city);return s?`/propiedades/ciudad/${s}`:null;}
function buildTypeCityLandingPath(p={}){const ci=normalizeSlug(resolveCity(p));const ty=mapTypeSlug(resolveType(p));const tr=mapTransactionSlug(resolveTransaction(p));if(!ci||!ty)return null;return tr?`/propiedades/zona/${ty}-en-${tr}-${ci}`:`/propiedades/zona/${ty}-en-${ci}`;}
function normalizeAbsoluteUrl(url,baseUrl=BASE_URL){const v=String(url||"").trim();if(!v)return"";if(/^https?:\/\//i.test(v))return v;return`${baseUrl}${v.startsWith("/")?"":"/"}${v}`;}
function extractPropertyImages(data,baseUrl=BASE_URL){const raw=Array.isArray(data.images)?data.images:[];const selected=raw.filter(Boolean).slice(0,5);const title=getSafeString(data.title,"Propiedad inmobiliaria");const city=getSafeString(resolveCity(data),"Caldas");const caption=`${title} en ${city} - Inmobiliaria Rincón Bedoya y Asociados`;return selected.map((u)=>normalizeAbsoluteUrl(u,baseUrl)).filter(Boolean).map((loc)=>({loc,title,caption}));}
function toLastMod(value){try{if(!value)return null;if(typeof value?.toDate==="function")return value.toDate().toISOString();if(value instanceof Date)return value.toISOString();const d=new Date(value);return!Number.isNaN(d.getTime())?d.toISOString():null;}catch(_){return null;}}
function buildUrlNode(urlData){const images=Array.isArray(urlData.images)?urlData.images:[];const imgBlocks=images.map((img)=>`\n    <image:image>\n      <image:loc>${xmlEscape(img.loc)}</image:loc>\n      <image:title><![CDATA[${img.title||""}]]></image:title>\n      <image:caption><![CDATA[${img.caption||""}]]></image:caption>\n    </image:image>`).join("");const lastmodBlock=urlData.lastmod?`\n    <lastmod>${xmlEscape(urlData.lastmod)}</lastmod>`:"";return`\n  <url>\n    <loc>${xmlEscape(urlData.loc)}</loc>${lastmodBlock}\n    <changefreq>${xmlEscape(urlData.changefreq||"weekly")}</changefreq>\n    <priority>${xmlEscape(urlData.priority||"0.5")}</priority>${imgBlocks}\n  </url>`;}

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
    return res.status(200).json({ result: { success: true, message: `Usuario ${userId} eliminado completamente`, deletedFrom: ["Authentication","Firestore","Realtime Database"] } });
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
    const data        = req.body?.data || {};
    const email       = String(data.email       || "").trim().toLowerCase();
    const password    = String(data.password    || "");
    const displayName = String(data.displayName || "").trim();
    const phone       = String(data.phone       || "").trim();
    const role        = String(data.role        || "member").trim();
    const status      = String(data.status      || "active").trim();
    if (!email || !password) return res.status(400).json({ error: "email y password son requeridos" });
    let userRecord;
    try {
      userRecord = await admin.auth().createUser({ email, password, displayName, disabled: status === "blocked" });
    } catch (e) {
      if (e?.code === "auth/email-already-exists") userRecord = await admin.auth().getUserByEmail(email);
      else throw e;
    }
    await admin.firestore().collection("users").doc(email).set(
      { uid: userRecord.uid, email, displayName, phone, role, status, updatedAt: admin.firestore.FieldValue.serverTimestamp(), createdAt: admin.firestore.FieldValue.serverTimestamp() },
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
      { loc: `${BASE_URL}/`,            priority: "1.0", changefreq: "daily"   },
      { loc: `${BASE_URL}/propiedades`, priority: "0.9", changefreq: "daily"   },
      { loc: `${BASE_URL}/contacto`,    priority: "0.7", changefreq: "monthly" },
      { loc: `${BASE_URL}/nosotros`,    priority: "0.6", changefreq: "monthly" },
    ];
    const snapshot           = await admin.firestore().collection("properties").get();
    const propertyUrls       = [];
    const cityLandingMap     = new Map();
    const typeCityLandingMap = new Map();
    snapshot.forEach((doc) => {
      const data = doc.data() || {};
      if (!isPublicProperty(data)) return;
      const slug    = buildPropertySlug(data);
      const loc     = `${BASE_URL}/propiedades/${slug}-${doc.id}`;
      const lastmod = toLastMod(data.updatedAt || data.createdAt);
      const images  = extractPropertyImages(data, BASE_URL);
      propertyUrls.push({ loc, priority: "0.8", changefreq: "daily", lastmod, images });
      const cityPath = buildCityLandingPath(resolveCity(data));
      if (cityPath && !cityLandingMap.has(cityPath))
        cityLandingMap.set(cityPath, { loc: `${BASE_URL}${cityPath}`, priority: "0.8", changefreq: "daily", lastmod });
      const typeCityPath = buildTypeCityLandingPath(data);
      if (typeCityPath && !typeCityLandingMap.has(typeCityPath))
        typeCityLandingMap.set(typeCityPath, { loc: `${BASE_URL}${typeCityPath}`, priority: "0.8", changefreq: "daily", lastmod });
    });
    const allUrls = [...staticUrls, ...cityLandingMap.values(), ...typeCityLandingMap.values(), ...propertyUrls];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset\n  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"\n>\n${allUrls.map(buildUrlNode).join("")}\n</urlset>`;
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
  const valueClass = accentColor
    ? `info-value accent" style="color:${accentColor}`
    : "info-value";
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
    region:   "us-central1",
    secrets:  [GMAIL_USER, GMAIL_PASS],
  },
  async (event) => {
    const before = event.data?.before?.data() ?? null;
    const after  = event.data?.after?.data()  ?? null;

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
      clientName:      String(after.clientName      || "Cliente").trim(),
      clientEmail:     String(after.clientEmail     || "").trim(),
      clientPhone:     String(after.clientPhone     || "").trim(),
      clientMessage:   String(after.notes           || "").trim(),
      propertyName:    String(after.propertyName    || "la propiedad").trim(),
      propertyAddress: String(after.propertyAddress || "").trim(),
      requestedDate:   String(after.requestedDate   || "").trim(),
      requestedTime:   String(after.requestedTime   || "").trim(),
      proposedDate:    String(after.proposedDate    || "").trim(),
      proposedTime:    String(after.proposedTime    || "").trim(),
      agentName:       String(after.agentName       || "").trim(),
      agentEmail:      String(after.agentEmail      || "").trim(),
      adminNotes:      String(after.adminNotes      || "").trim(),
      notes:           String(after.notes           || "").trim(),
    };

    const clientEmail = d.clientEmail;
    const agentEmail  = d.agentEmail;

    if (prevStatus === null && nextStatus === "pending") {
      await sendMail(transporter, gmailUser, {
        to:      clientEmail,
        subject: `✅ Solicitud de visita recibida — ${d.propertyName}`,
        html:    pendingHtml(d),
      });
      return;
    }

    if (nextStatus === "approved") {
      const emails = [];
      emails.push(sendMail(transporter, gmailUser, {
        to:      clientEmail,
        subject: `🎉 ¡Visita confirmada! — ${d.propertyName}`,
        html:    approvedHtml(d),
      }));
      if (agentEmail) {
        emails.push(sendMail(transporter, gmailUser, {
          to:      agentEmail,
          subject: `🏡 Nueva visita asignada — ${d.propertyName} (${d.requestedDate} ${d.requestedTime})`,
          html:    agentHtml(d),
        }));
      }
      await Promise.all(emails);
      return;
    }

    if (nextStatus === "rejected") {
      await sendMail(transporter, gmailUser, {
        to:      clientEmail,
        subject: `😔 Actualización sobre tu visita — ${d.propertyName}`,
        html:    rejectedHtml(d),
      });
      return;
    }

    if (nextStatus === "rescheduled") {
      await sendMail(transporter, gmailUser, {
        to:      clientEmail,
        subject: `📅 Nueva propuesta de fecha — ${d.propertyName}`,
        html:    rescheduledHtml(d),
      });
      return;
    }

    console.log(`[onVisitStatusChanged] Estado "${nextStatus}" no genera email. Ignorado.`);
  }
);
