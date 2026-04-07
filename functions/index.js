// ─── v1 imports (funciones HTTP existentes) ──────────────────────────────────
const functionsV1 = require("firebase-functions/v1");
const admin       = require("firebase-admin");
const cors        = require("cors")({ origin: true });
const nodemailer  = require("nodemailer");

// ─── v2 imports (nuevo trigger Firestore) ────────────────────────────────────
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { defineSecret }      = require("firebase-functions/params");

if (!admin.apps.length) {
  admin.initializeApp();
}

// ─── Secrets (firebase functions:secrets:set GMAIL_USER GMAIL_PASS) ──────────
const GMAIL_USER = defineSecret("GMAIL_USER");
const GMAIL_PASS = defineSecret("GMAIL_PASS");

// ─── Constantes globales ──────────────────────────────────────────────────────
const BASE_URL     = "https://inmobiliaria-ryb-y-asociados.com";
const WHATSAPP_URL = "https://wa.me/573105968202";
const LOGO_URL     = `${BASE_URL}/logo.jpg.png`;
const FROM_NAME    = "Inmobiliaria Rinc\u00f3n Bedoya y Asociados";

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
function extractPropertyImages(data,baseUrl=BASE_URL){const raw=Array.isArray(data.images)?data.images:[];const selected=raw.filter(Boolean).slice(0,5);const title=getSafeString(data.title,"Propiedad inmobiliaria");const city=getSafeString(resolveCity(data),"Caldas");const caption=`${title} en ${city} - Inmobiliaria Rinc\u00f3n Bedoya y Asociados`;return selected.map((u)=>normalizeAbsoluteUrl(u,baseUrl)).filter(Boolean).map((loc)=>({loc,title,caption}));}
function toLastMod(value){try{if(!value)return null;if(typeof value?.toDate==="function")return value.toDate().toISOString();if(value instanceof Date)return value.toISOString();const d=new Date(value);return!Number.isNaN(d.getTime())?d.toISOString():null;}catch(_){return null;}}
function buildUrlNode(urlData){const images=Array.isArray(urlData.images)?urlData.images:[];const imgBlocks=images.map((img)=>`\n    <image:image>\n      <image:loc>${xmlEscape(img.loc)}</image:loc>\n      <image:title><![CDATA[${img.title||""}]]></image:title>\n      <image:caption><![CDATA[${img.caption||""}]]></image:caption>\n    </image:image>`).join("");const lastmodBlock=urlData.lastmod?`\n    <lastmod>${xmlEscape(urlData.lastmod)}</lastmod>`:"";return`\n  <url>\n    <loc>${xmlEscape(urlData.loc)}</loc>${lastmodBlock}\n    <changefreq>${xmlEscape(urlData.changefreq||"weekly")}</changefreq>\n    <priority>${xmlEscape(urlData.priority||"0.5")}</priority>${imgBlocks}\n  </url>`;}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCI\u00d3N 1: deleteUserComplete  (v1 HTTP)
// ═══════════════════════════════════════════════════════════════════════════════
exports.deleteUserComplete = functionsV1.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      if (handlePreflight(req, res)) return;
      setCorsHeaders(req, res);
      if (req.method !== "POST") return res.status(405).json({ error: "M\u00e9todo no permitido" });
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
});

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCI\u00d3N 2: createUserByAdmin  (v1 HTTP)
// ═══════════════════════════════════════════════════════════════════════════════
exports.createUserByAdmin = functionsV1.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      if (handlePreflight(req, res)) return;
      setCorsHeaders(req, res);
      if (req.method !== "POST") return res.status(405).json({ error: "M\u00e9todo no permitido" });
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
});

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCI\u00d3N 3: redirectToCustomDomain  (v1 HTTP)
// ═══════════════════════════════════════════════════════════════════════════════
exports.redirectToCustomDomain = functionsV1.https.onRequest((req, res) => {
  const host = String(req.headers.host || "");
  if (host.includes("web.app") || host.includes("firebaseapp.com")) {
    return res.redirect(301, `${BASE_URL}${req.url}`);
  }
  return res.status(200).send("OK");
});

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCI\u00d3N 4: generateSitemap  (v1 HTTP)
// ═══════════════════════════════════════════════════════════════════════════════
exports.generateSitemap = functionsV1.https.onRequest(async (req, res) => {
  try {
    if (handlePreflight(req, res)) return;
    setCorsHeaders(req, res);
    if (req.method !== "GET") return res.status(405).send("M\u00e9todo no permitido");
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
// FUNCI\u00d3N 5: onVisitStatusChanged  (v2 Firestore trigger)  ← NUEVA 3D
// Escucha /visits/{visitId} y env\u00eda emails al aprobar o rechazar una visita.
//
// SETUP (una sola vez):
//   firebase functions:secrets:set GMAIL_USER   → escribe el email Gmail
//   firebase functions:secrets:set GMAIL_PASS   → escribe el App Password Gmail
// ═══════════════════════════════════════════════════════════════════════════════
function buildTransporter(user, pass) {
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

function htmlWrapper(content, user) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:32px 16px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;">
  <tr><td style="background:#0d1117;padding:24px 32px;text-align:center;border-bottom:1px solid #334155;">
    <img src="${LOGO_URL}" alt="${FROM_NAME}" height="48" style="height:48px;object-fit:contain;"/>
  </td></tr>
  <tr><td style="padding:32px;">${content}</td></tr>
  <tr><td style="background:#0d1117;padding:16px 32px;border-top:1px solid #334155;text-align:center;">
    <p style="color:#64748b;font-size:12px;margin:0;">${FROM_NAME} &middot; Cra 5 No. 9-28, Anserma, Caldas<br/>
    <a href="${BASE_URL}" style="color:#c9a84c;text-decoration:none;">${BASE_URL}</a></p>
  </td></tr>
</table></td></tr></table></body></html>`;
}

function approvedHtml(d) {
  return htmlWrapper(`
    <h2 style="color:#c9a84c;font-size:22px;margin:0 0 8px;">Tu visita fue aprobada</h2>
    <p style="color:#94a3b8;font-size:14px;margin:0 0 24px;">Hola <strong style="color:#e2e8f0;">${d.clientName}</strong>, tenemos buenas noticias.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:12px;border:1px solid #334155;margin-bottom:24px;"><tr><td style="padding:20px 24px;">
      <table width="100%" cellpadding="6" cellspacing="0">
        <tr><td style="color:#64748b;font-size:13px;width:40%;">Propiedad</td><td style="color:#e2e8f0;font-size:13px;font-weight:600;">${d.propertyName}</td></tr>
        <tr><td style="color:#64748b;font-size:13px;">Fecha</td><td style="color:#e2e8f0;font-size:13px;font-weight:600;">${d.requestedDate}</td></tr>
        <tr><td style="color:#64748b;font-size:13px;">Hora</td><td style="color:#e2e8f0;font-size:13px;font-weight:600;">${d.requestedTime}</td></tr>
        ${d.agentName?`<tr><td style="color:#64748b;font-size:13px;">Agente</td><td style="color:#c9a84c;font-size:13px;font-weight:600;">${d.agentName}</td></tr>`:""}
        ${d.adminNotes?`<tr><td style="color:#64748b;font-size:13px;">Nota</td><td style="color:#94a3b8;font-size:13px;">${d.adminNotes}</td></tr>`:""}
      </table>
    </td></tr></table>
    <p style="color:#94a3b8;font-size:14px;">Por favor llega puntual. Si tienes alguna pregunta, cont\u00e1ctanos por WhatsApp.</p>
    <div style="text-align:center;margin-top:24px;">
      <a href="${WHATSAPP_URL}" style="display:inline-block;background:#c9a84c;color:#0f172a;text-decoration:none;font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px;">Contactar por WhatsApp</a>
    </div>`);
}

function rejectedHtml(d) {
  return htmlWrapper(`
    <h2 style="color:#f87171;font-size:22px;margin:0 0 8px;">Tu solicitud no pudo ser aprobada</h2>
    <p style="color:#94a3b8;font-size:14px;margin:0 0 24px;">Hola <strong style="color:#e2e8f0;">${d.clientName}</strong>, lamentamos informarte que tu solicitud para <strong style="color:#e2e8f0;">${d.propertyName}</strong> no pudo confirmarse.</p>
    ${d.adminNotes?`<div style="background:#0f172a;border-left:3px solid #f87171;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:24px;"><p style="color:#94a3b8;font-size:13px;margin:0;"><strong style="color:#e2e8f0;">Motivo:</strong> ${d.adminNotes}</p></div>`:""}
    <p style="color:#94a3b8;font-size:14px;">Te invitamos a explorar nuestro cat\u00e1logo o contactarnos.</p>
    <div style="text-align:center;margin-top:24px;">
      <a href="${BASE_URL}/catalogo" style="display:inline-block;background:#c9a84c;color:#0f172a;text-decoration:none;font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px;">Ver cat\u00e1logo</a>
      <a href="${WHATSAPP_URL}" style="display:inline-block;background:#1e293b;color:#c9a84c;text-decoration:none;font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px;border:1px solid #c9a84c;margin-left:8px;">Contactar</a>
    </div>`);
}

function agentHtml(d) {
  return htmlWrapper(`
    <h2 style="color:#c9a84c;font-size:22px;margin:0 0 8px;">Nueva visita asignada</h2>
    <p style="color:#94a3b8;font-size:14px;margin:0 0 24px;">Hola <strong style="color:#e2e8f0;">${d.agentName}</strong>, tienes una visita confirmada.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:12px;border:1px solid #334155;margin-bottom:24px;"><tr><td style="padding:20px 24px;">
      <table width="100%" cellpadding="6" cellspacing="0">
        <tr><td style="color:#64748b;font-size:13px;width:40%;">Cliente</td><td style="color:#e2e8f0;font-size:13px;font-weight:600;">${d.clientName}</td></tr>
        <tr><td style="color:#64748b;font-size:13px;">Email</td><td style="color:#e2e8f0;font-size:13px;">${d.clientEmail||"-"}</td></tr>
        <tr><td style="color:#64748b;font-size:13px;">Tel\u00e9fono</td><td style="color:#e2e8f0;font-size:13px;">${d.clientPhone||"-"}</td></tr>
        <tr><td style="color:#64748b;font-size:13px;">Propiedad</td><td style="color:#e2e8f0;font-size:13px;font-weight:600;">${d.propertyName}</td></tr>
        <tr><td style="color:#64748b;font-size:13px;">Fecha</td><td style="color:#e2e8f0;font-size:13px;font-weight:600;">${d.requestedDate}</td></tr>
        <tr><td style="color:#64748b;font-size:13px;">Hora</td><td style="color:#e2e8f0;font-size:13px;font-weight:600;">${d.requestedTime}</td></tr>
      </table>
    </td></tr></table>
    <div style="text-align:center;margin-top:24px;">
      <a href="${BASE_URL}/usuarios/visitas" style="display:inline-block;background:#c9a84c;color:#0f172a;text-decoration:none;font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px;">Ver panel de visitas</a>
    </div>`);
}

exports.onVisitStatusChanged = onDocumentUpdated(
  {
    document : "visits/{visitId}",
    region   : "us-central1",
    secrets  : [GMAIL_USER, GMAIL_PASS],
  },
  async (event) => {
    const before = event.data.before.data();
    const after  = event.data.after.data();
    if (!before || !after || before.status === after.status) return null;

    const user        = GMAIL_USER.value();
    const pass        = GMAIL_PASS.value();
    const transporter = buildTransporter(user, pass);
    const from        = `"${FROM_NAME}" <${user}>`;
    const promises    = [];

    // pending → approved
    if (before.status === "pending" && after.status === "approved") {
      if (after.clientEmail)
        promises.push(transporter.sendMail({ from, to: after.clientEmail, subject: `Visita aprobada \u2014 ${after.propertyName}`, html: approvedHtml(after) }));
      if (after.agentEmail)
        promises.push(transporter.sendMail({ from, to: after.agentEmail, subject: `Nueva visita asignada \u2014 ${after.propertyName}`, html: agentHtml(after) }));
    }

    // pending → rejected
    if (before.status === "pending" && after.status === "rejected") {
      if (after.clientEmail)
        promises.push(transporter.sendMail({ from, to: after.clientEmail, subject: `Actualizaci\u00f3n sobre tu solicitud \u2014 ${after.propertyName}`, html: rejectedHtml(after) }));
    }

    try { await Promise.allSettled(promises); }
    catch (e) { console.error("[visitEmails] Error:", e); }
    return null;
  }
);
