const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

if (!admin.apps.length) {
  admin.initializeApp();
}

const BASE_URL = "https://inmobiliaria-ryb-y-asociados.com";
const PUBLIC_STATUS = new Set([
  "",
  "disponible",
  "reservada",
  "published",
  "active",
  "available",
]);

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
  const decodedToken = await admin.auth().verifyIdToken(token);

  const callerEmail = String(decodedToken.email || "").trim().toLowerCase();
  if (!callerEmail) {
    const err = new Error("Token sin email");
    err.status = 401;
    throw err;
  }

  const callerDoc = await admin
    .firestore()
    .collection("users")
    .doc(callerEmail)
    .get();

  if (!callerDoc.exists || callerDoc.data()?.role !== "admin") {
    const err = new Error("Solo administradores");
    err.status = 403;
    throw err;
  }

  return { callerEmail };
}

function normalizeSlug(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function xmlEscape(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getSafeString(value, fallback = "") {
  const result = String(value ?? "").trim();
  return result || fallback;
}

function resolveCity(property = {}) {
  return getSafeString(property.location?.city || property.city || "");
}

function resolveType(property = {}) {
  return getSafeString(property.type || "propiedad", "propiedad");
}

function resolveTransaction(property = {}) {
  return getSafeString(property.transactionType || "");
}

function resolveRooms(property = {}) {
  return (
    property.rooms ??
    property.features?.rooms ??
    property.features?.bedrooms ??
    property.bedrooms ??
    null
  );
}

function isPublicProperty(property = {}) {
  const status = String(property.status || "").trim().toLowerCase();
  return PUBLIC_STATUS.has(status);
}

function mapTransactionSlug(transaction = "") {
  const value = String(transaction).toLowerCase();

  if (["sale", "venta", "compra"].includes(value)) return "venta";
  if (["rent", "arriendo", "alquiler", "renta"].includes(value)) return "arriendo";

  return "";
}

function mapTypeSlug(type = "") {
  const value = String(type).toLowerCase();

  if (value.includes("casa")) return "casas";
  if (value.includes("apart")) return "apartamentos";
  if (value.includes("lote")) return "lotes";
  if (value.includes("finca")) return "fincas";
  if (value.includes("local")) return "locales";

  return "propiedades";
}

function mapTypeSingularSlug(type = "") {
  const value = String(type).toLowerCase();

  if (value.includes("casa")) return "casa";
  if (value.includes("apart")) return "apartamento";
  if (value.includes("lote")) return "lote";
  if (value.includes("finca")) return "finca";
  if (value.includes("local")) return "local";

  return "propiedad";
}

function buildPropertySlug(property = {}) {
  const transactionSlug = mapTransactionSlug(resolveTransaction(property));
  const typeSlug = mapTypeSingularSlug(resolveType(property));
  const citySlug = normalizeSlug(resolveCity(property));
  const rooms = resolveRooms(property);

  const parts = [];

  if (transactionSlug) parts.push(transactionSlug);
  if (typeSlug) parts.push(typeSlug);
  if (citySlug) parts.push(citySlug);
  if (rooms) parts.push(`${rooms}-habitaciones`);

  return normalizeSlug(parts.join(" ")) || "propiedad";
}

function buildCityLandingPath(city) {
  const citySlug = normalizeSlug(city);
  if (!citySlug) return null;
  return `/propiedades/ciudad/${citySlug}`;
}

function buildTypeCityLandingPath(property = {}) {
  const citySlug = normalizeSlug(resolveCity(property));
  const typeSlug = mapTypeSlug(resolveType(property));
  const transactionSlug = mapTransactionSlug(resolveTransaction(property));

  if (!citySlug || !typeSlug) return null;

  if (transactionSlug) {
    return `/propiedades/zona/${typeSlug}-en-${transactionSlug}-${citySlug}`;
  }

  return `/propiedades/zona/${typeSlug}-en-${citySlug}`;
}

function normalizeAbsoluteUrl(url, baseUrl = BASE_URL) {
  const value = String(url || "").trim();
  if (!value) return "";

  if (/^https?:\/\//i.test(value)) return value;
  return `${baseUrl}${value.startsWith("/") ? "" : "/"}${value}`;
}

function extractPropertyImages(data, baseUrl = BASE_URL) {
  const rawImages = Array.isArray(data.images) ? data.images : [];
  const selected = rawImages.filter(Boolean).slice(0, 5);

  const title = getSafeString(data.title, "Propiedad inmobiliaria");
  const city = getSafeString(resolveCity(data), "Caldas");
  const caption = `${title} en ${city} - Inmobiliaria Rincón Bedoya y Asociados`;

  return selected
    .map((url) => normalizeAbsoluteUrl(url, baseUrl))
    .filter(Boolean)
    .map((loc) => ({
      loc,
      title,
      caption,
    }));
}

function toLastMod(value) {
  try {
    if (!value) return null;

    if (typeof value?.toDate === "function") {
      return value.toDate().toISOString();
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }

    return null;
  } catch (_) {
    return null;
  }
}

function buildUrlNode(urlData) {
  const images = Array.isArray(urlData.images) ? urlData.images : [];

  const imageBlocks = images
    .map(
      (img) => `
    <image:image>
      <image:loc>${xmlEscape(img.loc)}</image:loc>
      <image:title><![CDATA[${img.title || ""}]]></image:title>
      <image:caption><![CDATA[${img.caption || ""}]]></image:caption>
    </image:image>`
    )
    .join("");

  const lastmodBlock = urlData.lastmod
    ? `\n    <lastmod>${xmlEscape(urlData.lastmod)}</lastmod>`
    : "";

  return `
  <url>
    <loc>${xmlEscape(urlData.loc)}</loc>${lastmodBlock}
    <changefreq>${xmlEscape(urlData.changefreq || "weekly")}</changefreq>
    <priority>${xmlEscape(urlData.priority || "0.5")}</priority>${imageBlocks}
  </url>`;
}

/**
 * ELIMINAR USUARIO COMPLETO (Auth + Firestore + RTDB)
 * body = { data: { userId: "<email>" } }
 */
exports.deleteUserComplete = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      if (handlePreflight(req, res)) return;
      setCorsHeaders(req, res);

      if (req.method !== "POST") {
        return res.status(405).json({ error: "Método no permitido" });
      }

      await assertAdminFromRequest(req);

      const userIdRaw = req.body?.data?.userId;
      const userId = String(userIdRaw || "").trim().toLowerCase();

      if (!userId) {
        return res.status(400).json({ error: "userId es requerido" });
      }

      const userDoc = await admin.firestore().collection("users").doc(userId).get();

      if (!userDoc.exists) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }

      const userUid = userDoc.data()?.uid;

      if (userUid) {
        await admin.auth().deleteUser(userUid);
      }

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
});

/**
 * CREAR USUARIO DESDE ADMIN (NO CAMBIA SESIÓN DEL ADMIN)
 * body = { data: { email, password, displayName, phone, role, status } }
 */
exports.createUserByAdmin = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      if (handlePreflight(req, res)) return;
      setCorsHeaders(req, res);

      if (req.method !== "POST") {
        return res.status(405).json({ error: "Método no permitido" });
      }

      await assertAdminFromRequest(req);

      const data = req.body?.data || {};
      const email = String(data.email || "").trim().toLowerCase();
      const password = String(data.password || "");
      const displayName = String(data.displayName || "").trim();
      const phone = String(data.phone || "").trim();
      const role = String(data.role || "member").trim();
      const status = String(data.status || "active").trim();

      if (!email || !password) {
        return res.status(400).json({ error: "email y password son requeridos" });
      }

      let userRecord;

      try {
        userRecord = await admin.auth().createUser({
          email,
          password,
          displayName,
          disabled: status === "blocked",
        });
      } catch (e) {
        if (e?.code === "auth/email-already-exists") {
          userRecord = await admin.auth().getUserByEmail(email);
        } else {
          throw e;
        }
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

      return res.status(200).json({
        result: { success: true, uid: userRecord.uid, email },
      });
    } catch (error) {
      setCorsHeaders(req, res);
      console.error("createUserByAdmin Error:", error);
      return res.status(error.status || 500).json({ error: error.message });
    }
  });
});

/**
 * REDIRECCIÓN 301: .web.app y .firebaseapp.com → .com
 */
exports.redirectToCustomDomain = functions.https.onRequest((req, res) => {
  const host = String(req.headers.host || "");

  if (host.includes("web.app") || host.includes("firebaseapp.com")) {
    const newUrl = `${BASE_URL}${req.url}`;
    return res.redirect(301, newUrl);
  }

  return res.status(200).send("OK");
});

/**
 * SITEMAP DINÁMICO
 * Incluye:
 * - rutas estáticas
 * - landings por ciudad
 * - landings por tipo+operación+ciudad
 * - detalle de propiedades
 * - imágenes para Google Imágenes
 */
exports.generateSitemap = functions.https.onRequest(async (req, res) => {
  try {
    if (handlePreflight(req, res)) return;
    setCorsHeaders(req, res);

    if (req.method !== "GET") {
      return res.status(405).send("Método no permitido");
    }

    const staticUrls = [
      {
        loc: `${BASE_URL}/`,
        priority: "1.0",
        changefreq: "daily",
      },
      {
        loc: `${BASE_URL}/propiedades`,
        priority: "0.9",
        changefreq: "daily",
      },
      {
        loc: `${BASE_URL}/contacto`,
        priority: "0.7",
        changefreq: "monthly",
      },
      {
        loc: `${BASE_URL}/nosotros`,
        priority: "0.6",
        changefreq: "monthly",
      },
    ];

    const snapshot = await admin.firestore().collection("properties").get();

    const propertyUrls = [];
    const cityLandingMap = new Map();
    const typeCityLandingMap = new Map();

    snapshot.forEach((doc) => {
      const data = doc.data() || {};

      if (!isPublicProperty(data)) {
        return;
      }

      const propertySlug = buildPropertySlug(data);
      const propertyLoc = `${BASE_URL}/propiedades/${propertySlug}-${doc.id}`;
      const lastmod = toLastMod(data.updatedAt || data.createdAt);
      const images = extractPropertyImages(data, BASE_URL);

      propertyUrls.push({
        loc: propertyLoc,
        priority: "0.8",
        changefreq: "daily",
        lastmod,
        images,
      });

      const cityPath = buildCityLandingPath(resolveCity(data));
      if (cityPath && !cityLandingMap.has(cityPath)) {
        cityLandingMap.set(cityPath, {
          loc: `${BASE_URL}${cityPath}`,
          priority: "0.8",
          changefreq: "daily",
          lastmod,
        });
      }

      const typeCityPath = buildTypeCityLandingPath(data);
      if (typeCityPath && !typeCityLandingMap.has(typeCityPath)) {
        typeCityLandingMap.set(typeCityPath, {
          loc: `${BASE_URL}${typeCityPath}`,
          priority: "0.8",
          changefreq: "daily",
          lastmod,
        });
      }
    });

    const allUrls = [
      ...staticUrls,
      ...cityLandingMap.values(),
      ...typeCityLandingMap.values(),
      ...propertyUrls,
    ];

    const xmlItems = allUrls.map(buildUrlNode).join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
>
${xmlItems}
</urlset>`;

    res.set("Content-Type", "application/xml; charset=utf-8");
    res.set("Cache-Control", "public, max-age=900, s-maxage=900");

    return res.status(200).send(xml);
  } catch (error) {
    console.error("generateSitemap Error:", error);
    return res.status(500).send("Error generando sitemap");
  }
});