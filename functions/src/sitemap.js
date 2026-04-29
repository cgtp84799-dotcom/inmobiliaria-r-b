// FIX [SEO]: sitemap ajustado a status published, prioridades y frecuencias objetivo para indexación inmobiliaria.
// functions/src/sitemap.js
// ═══════════════════════════════════════════════════════════════════════════
//  Sitemap engine — Inmobiliaria Rincón Bedoya y Asociados
//
//  Genera un SITEMAP INDEX + sub-sitemaps paginados según Google best practices
//  (≤ 50.000 URLs y ≤ 50 MB por archivo). Soporta image sitemap inline,
//  hreflang alternates, lastmod ISO-8601, changefreq y priority calculados.
//
//  Rutas servidas por esta función (según firebase.json rewrites):
//    /sitemap.xml              → sitemap index (apunta a los demás)
//    /sitemap-index.xml        → alias del índice
//    /sitemap-static.xml       → home, catálogo, contacto, políticas, hubs
//    /sitemap-cities.xml       → landing pages de ciudad y tipo-ciudad
//    /sitemap-properties.xml   → todas las propiedades publicadas
//                                (si hay > PAGE_SIZE, se pagina:
//                                /sitemap-properties-1.xml, -2.xml, …)
// ═══════════════════════════════════════════════════════════════════════════

const admin = require("firebase-admin");

const BASE_URL = "https://inmobiliaria-ryb-y-asociados.com";
const PAGE_SIZE = 5000;              // URLs por sub-sitemap de propiedades
const CACHE_SECONDS = 1800;          // 30 min en CDN
const PUBLIC_STATUS = new Set(["published"]);

// ─── Cobertura nacional para landing pages estratégicas ────────────────────
// Estas son las ciudades/departamentos para los que siempre existe una URL,
// aunque aún no haya propiedades en Firestore. Construyen autoridad temática.
const NATIONAL_DEPARTMENTS = [
  { slug: "caldas",         name: "Caldas" },
  { slug: "risaralda",      name: "Risaralda" },
  { slug: "quindio",        name: "Quindío" },
  { slug: "valle-del-cauca",name: "Valle del Cauca" },
  { slug: "antioquia",      name: "Antioquia" },
  { slug: "cundinamarca",   name: "Cundinamarca" },
  { slug: "santander",      name: "Santander" },
  { slug: "atlantico",      name: "Atlántico" },
  { slug: "tolima",         name: "Tolima" },
  { slug: "bolivar",        name: "Bolívar" },
];

const NATIONAL_CITIES = [
  // Eje cafetero (operación actual)
  "anserma", "manizales", "pereira", "armenia",
  "dosquebradas", "riosucio", "supia", "belalcazar",
  "filadelfia", "la-merced", "marmato", "quinchia",
  "la-virginia", "santa-rosa-de-cabal", "viterbo",
  "chinchina", "neira", "villamaria", "salamina",
  // Expansión nacional prioritaria
  "bogota", "medellin", "cali", "bucaramanga",
  "barranquilla", "cartagena", "santa-marta", "cucuta",
  "ibague", "villavicencio", "pasto", "monteria", "sincelejo",
];

// Combinaciones tipo × transacción para landing pages nacionales de alto tráfico
const TYPE_TRANSACTION_COMBOS = [
  { type: "casas",         tx: "venta",    priority: "0.9" },
  { type: "casas",         tx: "arriendo", priority: "0.85" },
  { type: "apartamentos",  tx: "venta",    priority: "0.9" },
  { type: "apartamentos",  tx: "arriendo", priority: "0.9" },
  { type: "fincas",        tx: "venta",    priority: "0.85" },
  { type: "lotes",         tx: "venta",    priority: "0.75" },
  { type: "locales",       tx: "arriendo", priority: "0.75" },
  { type: "locales",       tx: "venta",    priority: "0.7" },
  { type: "oficinas",      tx: "arriendo", priority: "0.7" },
  { type: "bodegas",       tx: "arriendo", priority: "0.65" },
];

// ─── Helpers ───────────────────────────────────────────────────────────────

function sanitizeStorageUrl(url) {
  if (!url || typeof url !== "string") return null;

  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const u = new URL(trimmed);

    // Solo Firebase Storage
    if (
      u.hostname === "firebasestorage.googleapis.com" ||
      u.hostname === "storage.googleapis.com"
    ) {
      const alt = u.searchParams.get("alt");

      // Dejamos SOLO alt=media, quitamos token
      u.search = alt ? `?alt=${alt}` : "";

      return u.toString();
    }

    return trimmed;
  } catch {
    return null;
  }
}

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

function mapTypePluralSlug(t = "") {
  const v = String(t).toLowerCase();
  if (v.includes("casa")) return "casas";
  if (v.includes("apart")) return "apartamentos";
  if (v.includes("lote")) return "lotes";
  if (v.includes("finca")) return "fincas";
  if (v.includes("local") || v.includes("comercial")) return "locales";
  if (v.includes("oficina")) return "oficinas";
  if (v.includes("bodega") || v.includes("warehouse")) return "bodegas";
  return "propiedades";
}

function mapTypeSingularSlug(t = "") {
  const v = String(t).toLowerCase();
  if (v.includes("casa")) return "casa";
  if (v.includes("apart")) return "apartamento";
  if (v.includes("lote")) return "lote";
  if (v.includes("finca")) return "finca";
  if (v.includes("local") || v.includes("comercial")) return "local";
  if (v.includes("oficina")) return "oficina";
  if (v.includes("bodega")) return "bodega";
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
  return s ? `/propiedades/zona/${s}` : null;
}

function buildTypeCityLandingPath(p = {}) {
  const ci = normalizeSlug(resolveCity(p));
  const ty = mapTypePluralSlug(resolveType(p));
  const tr = mapTransactionSlug(resolveTransaction(p));
  if (!ci || !ty) return null;
  return tr
    ? `/propiedades/zona/${ty}-en-${tr}-${ci}`
    : `/propiedades/zona/${ty}-en-${ci}`;
}

function normalizeAbsoluteUrl(url, baseUrl = BASE_URL) {
  const v = String(url || "").trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  return `${baseUrl}${v.startsWith("/") ? "" : "/"}${v}`;
}

function extractPropertyImages(data, baseUrl = BASE_URL) {
  // Prioridad: media.photos > images; tope de 5 imágenes por URL (Google las
  // cuenta al límite del sitemap-image).
  const fromMedia = Array.isArray(data?.media?.photos)
    ? data.media.photos
        .map((p) => sanitizeStorageUrl(p?.url))
        .filter(Boolean)
    : [];
  const fromRoot = Array.isArray(data?.images)
  ? data.images.map((url) => sanitizeStorageUrl(url)).filter(Boolean)
  : [];
  const merged = [...fromMedia, ...fromRoot].filter(Boolean);
  const unique = [...new Set(merged)];
  const selected = unique.slice(0, 5);

  const title = getSafeString(data.title, "Propiedad inmobiliaria");
  const city = getSafeString(resolveCity(data), "Caldas");
  const caption = `${title} en ${city} — Inmobiliaria Rincón Bedoya y Asociados`;

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

function nowIso() {
  return new Date().toISOString();
}

// ─── XML builders ──────────────────────────────────────────────────────────

function buildUrlNode(urlData) {
  const images = Array.isArray(urlData.images) ? urlData.images : [];
  const imgBlocks = images
    .map(
      (img) =>
        `\n    <image:image>\n` +
        `      <image:loc>${xmlEscape(img.loc)}</image:loc>\n` +
        `      <image:title><![CDATA[${img.title || ""}]]></image:title>\n` +
        `      <image:caption><![CDATA[${img.caption || ""}]]></image:caption>\n` +
        `    </image:image>`
    )
    .join("");

  const alternates = Array.isArray(urlData.alternates) ? urlData.alternates : [];
  const altBlocks = alternates
    .map(
      (alt) =>
        `\n    <xhtml:link rel="alternate" hreflang="${xmlEscape(alt.hreflang)}" href="${xmlEscape(alt.href)}"/>`
    )
    .join("");

  const lastmodBlock = urlData.lastmod
    ? `\n    <lastmod>${xmlEscape(urlData.lastmod)}</lastmod>`
    : "";

  return (
    `\n  <url>\n` +
    `    <loc>${xmlEscape(urlData.loc)}</loc>${lastmodBlock}\n` +
    `    <changefreq>${xmlEscape(urlData.changefreq || "weekly")}</changefreq>\n` +
    `    <priority>${xmlEscape(urlData.priority || "0.5")}</priority>` +
    altBlocks +
    imgBlocks +
    `\n  </url>`
  );
}

function wrapUrlset(urlNodesStr) {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset\n` +
    `  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n` +
    `  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"\n` +
    `  xmlns:xhtml="http://www.w3.org/1999/xhtml"\n` +
    `>${urlNodesStr}\n` +
    `</urlset>`
  );
}

function buildSitemapIndex(entries) {
  const body = entries
    .map(
      (e) =>
        `\n  <sitemap>\n` +
        `    <loc>${xmlEscape(e.loc)}</loc>\n` +
        `    <lastmod>${xmlEscape(e.lastmod || nowIso())}</lastmod>\n` +
        `  </sitemap>`
    )
    .join("");
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
    body +
    `\n</sitemapindex>`
  );
}

// ─── Builders de URL sets ──────────────────────────────────────────────────

function buildStaticUrls() {
  const now = nowIso();
  const urls = [
    {
      loc: `${BASE_URL}/`,
      priority: "1.0",
      changefreq: "daily",
      lastmod: now,
      alternates: [
        { hreflang: "es-CO", href: `${BASE_URL}/` },
        { hreflang: "es",    href: `${BASE_URL}/` },
        { hreflang: "x-default", href: `${BASE_URL}/` },
      ],
    },
    {
      loc: `${BASE_URL}/catalogo`,
      priority: "0.9",
      changefreq: "weekly",
      lastmod: now,
    },
    {
      loc: `${BASE_URL}/contacto`,
      priority: "0.7",
      changefreq: "monthly",
      lastmod: now,
    },
    {
      loc: `${BASE_URL}/politica-privacidad`,
      priority: "0.6",
      changefreq: "monthly",
      lastmod: now,
    },
  ];

  // Hubs por departamento — aunque no haya propiedades aún, tienen valor SEO
  for (const dep of NATIONAL_DEPARTMENTS) {
    urls.push({
      loc: `${BASE_URL}/propiedades/departamento/${dep.slug}`,
      priority: "0.9",
      changefreq: "weekly",
      lastmod: now,
    });
  }

  // Landing pages tipo × transacción a nivel nacional
  for (const combo of TYPE_TRANSACTION_COMBOS) {
    urls.push({
      loc: `${BASE_URL}/propiedades/zona/${combo.type}-en-${combo.tx}-colombia`,
      priority: "0.9",
      changefreq: "weekly",
      lastmod: now,
    });
  }

  // Landing pages tipo × transacción × ciudad (combinaciones estratégicas)
  const priorityCities = [
    "bogota", "medellin", "cali", "pereira", "manizales",
    "armenia", "bucaramanga", "barranquilla", "cartagena",
    "anserma", "dosquebradas", "ibague",
  ];
  for (const combo of TYPE_TRANSACTION_COMBOS) {
    for (const city of priorityCities) {
      urls.push({
        loc: `${BASE_URL}/propiedades/zona/${combo.type}-en-${combo.tx}-${city}`,
        priority: "0.9",
        changefreq: "weekly",
        lastmod: now,
      });
    }
  }

  return urls;
}

function buildCityFallbackUrls() {
  const now = nowIso();
  return NATIONAL_CITIES.map((city) => ({
    loc: `${BASE_URL}/propiedades/zona/${city}`,
    priority: "0.9",
    changefreq: "weekly",
    lastmod: now,
  }));
}

// ─── Firestore fetchers ────────────────────────────────────────────────────

async function fetchPublicProperties() {
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

    propertyUrls.push({
      loc,
      priority: "0.8",
      changefreq: "weekly",
      lastmod,
      images,
    });

    const cityPath = buildCityLandingPath(resolveCity(data));
    if (cityPath && !cityLandingMap.has(cityPath)) {
      cityLandingMap.set(cityPath, {
        loc: `${BASE_URL}${cityPath}`,
        priority: "0.9",
        changefreq: "weekly",
        lastmod,
      });
    }

    const typeCityPath = buildTypeCityLandingPath(data);
    if (typeCityPath && !typeCityLandingMap.has(typeCityPath)) {
      typeCityLandingMap.set(typeCityPath, {
        loc: `${BASE_URL}${typeCityPath}`,
        priority: "0.9",
        changefreq: "weekly",
        lastmod,
      });
    }
  });

  // Ordenar propiedades por lastmod descendente (más recientes primero)
  propertyUrls.sort((a, b) => {
    if (!a.lastmod && !b.lastmod) return 0;
    if (!a.lastmod) return 1;
    if (!b.lastmod) return -1;
    return b.lastmod.localeCompare(a.lastmod);
  });

  return { propertyUrls, cityLandingMap, typeCityLandingMap };
}

// ─── Handlers por path ─────────────────────────────────────────────────────

async function renderSitemapIndex() {
  const { propertyUrls } = await fetchPublicProperties();
  const now = nowIso();
  const entries = [
    { loc: `${BASE_URL}/sitemap-static.xml`,   lastmod: now },
    { loc: `${BASE_URL}/sitemap-cities.xml`,   lastmod: now },
  ];

  // Paginación del sitemap de propiedades
  const totalPages = Math.max(1, Math.ceil(propertyUrls.length / PAGE_SIZE));
  if (totalPages === 1) {
    entries.push({ loc: `${BASE_URL}/sitemap-properties.xml`, lastmod: now });
  } else {
    for (let i = 1; i <= totalPages; i++) {
      entries.push({
        loc: `${BASE_URL}/sitemap-properties-${i}.xml`,
        lastmod: now,
      });
    }
  }

  return buildSitemapIndex(entries);
}

async function renderStaticSitemap() {
  const urls = buildStaticUrls();
  const body = urls.map(buildUrlNode).join("");
  return wrapUrlset(body);
}

async function renderCitiesSitemap() {
  const { cityLandingMap, typeCityLandingMap } = await fetchPublicProperties();

  // Merge: empezamos con las ciudades nacionales (fallback) y luego
  // sobreescribimos con las reales de Firestore cuando existan.
  const combined = new Map();
  for (const url of buildCityFallbackUrls()) {
    combined.set(url.loc, url);
  }
  for (const [, url] of cityLandingMap) combined.set(url.loc, url);
  for (const [, url] of typeCityLandingMap) combined.set(url.loc, url);

  const urls = [...combined.values()].sort((a, b) => a.loc.localeCompare(b.loc));
  const body = urls.map(buildUrlNode).join("");
  return wrapUrlset(body);
}

async function renderPropertiesSitemap(page = null) {
  const { propertyUrls } = await fetchPublicProperties();

  let slice = propertyUrls;
  if (page != null) {
    const start = (page - 1) * PAGE_SIZE;
    slice = propertyUrls.slice(start, start + PAGE_SIZE);
  }

  const body = slice.map(buildUrlNode).join("");
  return wrapUrlset(body);
}

// ─── Router principal ──────────────────────────────────────────────────────

function parseSitemapPath(rawPath) {
  // Normaliza: quita query string y trailing slash
  const p = String(rawPath || "/").split("?")[0].replace(/\/+$/, "") || "/";

  if (p === "/sitemap.xml" || p === "/sitemap-index.xml" || p === "/") {
    return { type: "index" };
  }
  if (p === "/sitemap-static.xml") {
    return { type: "static" };
  }
  if (p === "/sitemap-cities.xml") {
    return { type: "cities" };
  }
  if (p === "/sitemap-properties.xml") {
    return { type: "properties", page: null };
  }
  const m = p.match(/^\/sitemap-properties-(\d+)\.xml$/);
  if (m) {
    return { type: "properties", page: parseInt(m[1], 10) };
  }
  return { type: "index" }; // fallback a índice
}

/**
 * Handler principal exportable. Usar desde functions/index.js:
 *
 *   const { handleSitemapRequest } = require("./src/sitemap");
 *   exports.generateSitemap = onRequest({ cors: true }, handleSitemapRequest);
 */
async function handleSitemapRequest(req, res) {
  try {
    if (req.method === "OPTIONS") {
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
      res.set("Access-Control-Allow-Headers", "Content-Type");
      return res.status(204).send("");
    }
    if (req.method !== "GET") {
      return res.status(405).send("Método no permitido");
    }

    const route = parseSitemapPath(req.path || req.url || "/");

    let xml;
    switch (route.type) {
      case "index":
        xml = await renderSitemapIndex();
        break;
      case "static":
        xml = await renderStaticSitemap();
        break;
      case "cities":
        xml = await renderCitiesSitemap();
        break;
      case "properties":
        xml = await renderPropertiesSitemap(route.page);
        break;
      default:
        xml = await renderSitemapIndex();
    }

    res.set("Content-Type", "application/xml; charset=utf-8");
    res.set(
      "Cache-Control",
      `public, max-age=${CACHE_SECONDS}, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS * 2}`
    );
    res.set("X-Robots-Tag", "noindex");
    return res.status(200).send(xml);
  } catch (error) {
    console.error("[sitemap] Error:", error);
    return res.status(500).send("Error generando sitemap");
  }
}

module.exports = {
  handleSitemapRequest,
  // exporta helpers por si otras funciones los usan
  buildPropertySlug,
  buildCityLandingPath,
  buildTypeCityLandingPath,
  mapTransactionSlug,
  mapTypePluralSlug,
  mapTypeSingularSlug,
  normalizeSlug,
  isPublicProperty,
};