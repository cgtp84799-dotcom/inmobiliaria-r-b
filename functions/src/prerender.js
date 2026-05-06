// functions/src/prerender.js
// ═══════════════════════════════════════════════════════════════════════════
//  Prerender engine — Inmobiliaria Rincón Bedoya y Asociados
// ═══════════════════════════════════════════════════════════════════════════

"use strict";

const https = require("https");
const path  = require("path");
const fs    = require("fs");
const admin = require("firebase-admin");

const { SITE_URL: BASE_URL } = require('./site.config');

// ─── Constantes ───────────────────────────────────────────────────────────────
const COMPANY_NAME  = "Inmobiliaria Rincón Bedoya y Asociados";
const COMPANY_PHONE = "+573105968202";
const LOGO_URL      = `${BASE_URL}/logo-light.png`;
const OG_DEFAULT    = `${BASE_URL}/og-default.jpg`;

// ─── Detección de crawlers ────────────────────────────────────────────────────
const CRAWLER_PATTERN = new RegExp([
  "googlebot", "google-inspectiontool", "adsbot-google", "mediapartners-google",
  "bingbot", "slurp", "duckduckbot", "baiduspider", "yandexbot", "sogou",
  "exabot", "ia_archiver",
  "facebookexternalhit", "facebookcatalog", "twitterbot", "linkedinbot",
  "whatsapp", "telegrambot", "discordbot", "slackbot",
  "semrushbot", "ahrefsbot", "mj12bot", "dotbot", "rogerbot",
  "w3c_validator", "google rich results", "chrome-lighthouse",
].join("|"), "i");

function isCrawler(userAgent) {
  if (!userAgent) return false;
  return CRAWLER_PATTERN.test(userAgent);
}

// ─── Detectar si la URL es un asset estático ─────────────────────────────────
const STATIC_ASSET_PATTERN = /\.(js|mjs|css|png|jpg|jpeg|webp|avif|svg|ico|woff|woff2|ttf|otf|eot|json|txt|xml|map|gz|br|pdf|mp4|webm|ogg|mp3|wav)$/i;

function isStaticAsset(urlPath) {
  return (
    urlPath.startsWith("/assets/") ||
    urlPath.startsWith("/__/") ||
    urlPath.startsWith("/static/") ||
    STATIC_ASSET_PATTERN.test(urlPath)
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function extractPropertyId(urlPath) {
  const match = urlPath.match(/\/propiedades\/[^/]+-([a-zA-Z0-9]{6,})$/);
  return match ? match[1] : null;
}

function extractZoneSlug(urlPath) {
  const match = urlPath.match(/\/propiedades\/zona\/([^/]+)$/);
  return match ? match[1] : null;
}

function extractDeptSlug(urlPath) {
  const match = urlPath.match(/\/propiedades\/departamento\/([^/]+)$/);
  return match ? match[1] : null;
}

function formatPrice(price) {
  if (!price) return null;
  const n = Number(price);
  if (!n) return null;
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1).replace(/\.0$/, "")} B COP`;
  if (n >= 1_000_000)     return `$${(n / 1_000_000).toFixed(0)} M COP`;
  return `$${n.toLocaleString("es-CO")} COP`;
}

function resolveProperty(data) {
  return {
    title:       data.title || "Propiedad",
    description: data.description || "",
    type:        data.type || "Propiedad",
    tx:          data.transactionType || "",
    city:        data.location?.city || data.city || "Colombia",
    department:  data.location?.department || data.department || "Caldas",
    address:     data.location?.addressPublic || data.address || "",
    price:       data.price?.sale || data.price?.rent || data.price || null,
    rooms:       data.features?.rooms || data.features?.bedrooms || data.rooms || null,
    baths:       data.features?.bathrooms || data.bathrooms || null,
    area:        data.features?.builtArea || data.area || null,
    status:      data.status || "disponible",
    images:      [
      ...(data.media?.photos?.map(p => p?.url) || []),
      ...(data.images || []),
    ].filter(Boolean).slice(0, 5),
    lat:         data.location?.geo?.lat || data.lat || null,
    lng:         data.location?.geo?.lng || data.lng || null,
    createdAt:   data.createdAt || null,
    updatedAt:   data.updatedAt || null,
    amenities:   [...(data.amenities || []), ...(data.customAmenities || [])].filter(Boolean),
  };
}

function esc(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─── Leer index.html del hosting (para usuarios normales) ─────────────────────
// Firebase copia los archivos del hosting junto a las functions en el deploy.
// El index.html del dist se copia como static-index.html en el build script.
let _cachedIndexHtml = null;

function getIndexHtml() {
  if (_cachedIndexHtml) return _cachedIndexHtml;

  // Intentar varias rutas donde puede estar el index.html
  const candidates = [
    path.join(__dirname, "../static-index.html"),  // copiado por build script
    path.join(__dirname, "../../dist/index.html"), // dev local
    path.join(__dirname, "../public/index.html"),  // alternativa
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      _cachedIndexHtml = fs.readFileSync(p, "utf8");
      return _cachedIndexHtml;
    }
  }

  return null;
}

// ─── HTML Shell para crawlers ─────────────────────────────────────────────────
function buildHtmlShell({ title, description, canonical, ogImage, ogType = "website", price, schemas = [], bodyContent = "" }) {
  const schemasHtml = schemas.map(s =>
    `<script type="application/ld+json">${JSON.stringify(s)}</script>`
  ).join("\n    ");

  return `<!doctype html>
<html lang="es-CO">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}"/>
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1"/>
  <link rel="canonical" href="${esc(canonical)}"/>
  <link rel="alternate" hreflang="es-CO" href="${esc(canonical)}"/>
  <link rel="alternate" hreflang="es" href="${esc(canonical)}"/>
  <link rel="alternate" hreflang="x-default" href="${esc(canonical)}"/>
  <meta property="og:type" content="${esc(ogType)}"/>
  <meta property="og:url" content="${esc(canonical)}"/>
  <meta property="og:title" content="${esc(title)}"/>
  <meta property="og:description" content="${esc(description)}"/>
  <meta property="og:image" content="${esc(ogImage)}"/>
  <meta property="og:image:width" content="1200"/>
  <meta property="og:image:height" content="630"/>
  <meta property="og:image:alt" content="${esc(title)}"/>
  <meta property="og:locale" content="es_CO"/>
  <meta property="og:site_name" content="${esc(COMPANY_NAME)}"/>
  ${price ? `<meta property="product:price:amount" content="${Number(price)}"/>
  <meta property="product:price:currency" content="COP"/>` : ""}
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:site" content="@inmobiliaria_ryb"/>
  <meta name="twitter:title" content="${esc(title)}"/>
  <meta name="twitter:description" content="${esc(description)}"/>
  <meta name="twitter:image" content="${esc(ogImage)}"/>
  ${schemasHtml}
</head>
<body>
  <header>
    <a href="${BASE_URL}">
      <img src="${LOGO_URL}" alt="${esc(COMPANY_NAME)}" width="200"/>
    </a>
    <nav>
      <a href="${BASE_URL}">Inicio</a>
      <a href="${BASE_URL}/catalogo">Propiedades</a>
      <a href="${BASE_URL}/contacto">Contacto</a>
    </nav>
  </header>
  <main>${bodyContent}</main>
  <footer>
    <p>${esc(COMPANY_NAME)} — Cra 5 #9-28, Anserma, Caldas, Colombia</p>
    <p>Tel: ${esc(COMPANY_PHONE)}</p>
  </footer>
</body>
</html>`;
}

// ─── Prerender.io proxy ───────────────────────────────────────────────────────
function fetchFromPrerender(targetUrl, token) {
  return new Promise((resolve, reject) => {
    const prerenderUrl = `https://service.prerender.io/${targetUrl}`;
    const options = {
      headers: {
        "X-Prerender-Token": token,
        "User-Agent": "Prerender",
      },
    };
    https.get(prerenderUrl, options, (res) => {
      let html = "";
      res.setEncoding("utf8");
      res.on("data", chunk => { html += chunk; });
      res.on("end", () => resolve(html));
    }).on("error", reject);
  });
}

// ─── Generadores de HTML por tipo de página ───────────────────────────────────
async function buildHomeHtml() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${BASE_URL}/#website`,
    url: BASE_URL,
    name: COMPANY_NAME,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${BASE_URL}/catalogo?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };

  return buildHtmlShell({
    title: `Inmobiliaria en Colombia con respaldo jurídico | ${COMPANY_NAME}`,
    description: "Casas, apartamentos, fincas y locales en venta y arriendo en Colombia. Gestión inmobiliaria con verificación jurídica: saneamiento predial, pertenencia, sucesiones y avalúos certificados en Caldas, Risaralda y Eje Cafetero.",
    canonical: BASE_URL,
    ogImage: OG_DEFAULT,
    schemas: [schema],
    bodyContent: `
      <h1>Inmobiliaria Rincón Bedoya y Asociados — Gestión inmobiliaria con respaldo jurídico</h1>
      <p>Casas, apartamentos, fincas y locales en venta y arriendo en Colombia con verificación jurídica completa.</p>
      <h2>Servicios</h2>
      <ul>
        <li>Compra y venta de propiedades en Caldas, Risaralda, Quindío y Eje Cafetero</li>
        <li>Arriendo residencial y comercial</li>
        <li>Saneamiento predial — Ley 1561 de 2012</li>
        <li>Procesos de pertenencia</li>
        <li>Sucesiones notariales y judiciales</li>
        <li>Avalúos certificados</li>
        <li>Representación en remates judiciales</li>
        <li>Créditos hipotecarios</li>
      </ul>
      <p>Dirección: Cra 5 #9-28, Anserma, Caldas, Colombia.</p>
      <a href="${BASE_URL}/catalogo">Ver propiedades disponibles</a>
      <a href="${BASE_URL}/contacto">Contactar</a>
    `,
  });
}

async function buildCatalogHtml(queryParams) {
  const ciudad = queryParams.get("ciudad") || "";
  const tipo   = queryParams.get("tipo")   || "";
  const op     = queryParams.get("operacion") || "";

  const parts = [
    tipo   ? tipo   : "Propiedades",
    op     ? `en ${op}` : "",
    ciudad ? `en ${ciudad}` : "en Colombia",
  ].filter(Boolean);

  const title = `${parts.join(" ")} | ${COMPANY_NAME}`;
  const canonical = `${BASE_URL}/catalogo${queryParams.toString() ? "?" + queryParams.toString() : ""}`;

  return buildHtmlShell({
    title,
    description: `Encuentra ${parts.join(" ")} con verificación jurídica completa. ${COMPANY_NAME} ofrece propiedades con saneamiento predial y respaldo legal en toda Colombia.`,
    canonical,
    ogImage: OG_DEFAULT,
    bodyContent: `
      <h1>${esc(title)}</h1>
      <p>Catálogo de propiedades en venta y arriendo con verificación jurídica.</p>
      <a href="${BASE_URL}">Inicio</a>
      <a href="${BASE_URL}/contacto">Contactar agente</a>
    `,
  });
}

async function buildPropertyDetailHtml(propertyId) {
  try {
    const db = admin.firestore();
    const snap = await db.collection("properties").doc(propertyId).get();

    if (!snap.exists || !snap.data()) return buildNotFoundHtml();

    const data = snap.data();
    const publicStatuses = new Set(["disponible","reservada","published","active","available",""]);
    if (!publicStatuses.has(String(data.status || "").toLowerCase())) return buildNotFoundHtml();

    const p = resolveProperty(data);

    const normalize = (s) => String(s).normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");

    const txSlug   = (() => { const v = String(p.tx).toLowerCase(); return v.includes("venta")||v.includes("sale") ? "venta" : v.includes("arriend")||v.includes("rent") ? "arriendo" : ""; })();
    const typeSlug = (() => { const v = String(p.type).toLowerCase(); return v.includes("casa")?"casa":v.includes("apart")?"apartamento":v.includes("finca")?"finca":v.includes("lote")?"lote":v.includes("local")?"local":v.includes("ofic")?"oficina":v.includes("bodega")?"bodega":"propiedad"; })();
    const citySlug = normalize(p.city);

    const slugParts = [txSlug, typeSlug, citySlug, p.rooms ? `${p.rooms}-habitaciones` : ""].filter(Boolean);
    const slug = normalize(slugParts.join("-")) || "propiedad";
    const canonicalUrl = `${BASE_URL}/propiedades/${slug}-${propertyId}`;

    return buildPropertyHtml(p, canonicalUrl);
  } catch (err) {
    console.error("[prerender] Error building property HTML:", propertyId, err.message);
    return buildFallbackHtml();
  }
}

function buildPropertyHtml(p, canonicalUrl) {
  const txLabel = (() => {
    const v = String(p.tx).toLowerCase();
    if (["sale","venta","compra"].includes(v)) return "en venta";
    if (["rent","arriendo","alquiler","renta"].includes(v)) return "en arriendo";
    return "";
  })();

  const typeLabel = (() => {
    const v = String(p.type).toLowerCase();
    if (v.includes("casa"))    return "Casa";
    if (v.includes("apart"))   return "Apartamento";
    if (v.includes("finca"))   return "Finca";
    if (v.includes("lote"))    return "Lote";
    if (v.includes("local"))   return "Local comercial";
    if (v.includes("oficina")) return "Oficina";
    if (v.includes("bodega"))  return "Bodega";
    return "Propiedad";
  })();

  const priceFormatted = formatPrice(p.price);
  const mainImage = p.images[0] || OG_DEFAULT;

  const title = `${typeLabel} ${txLabel} en ${p.city}${p.rooms ? ` · ${p.rooms} hab` : ""}${priceFormatted ? ` · ${priceFormatted}` : ""} | ${COMPANY_NAME}`;
  const description = [
    `${typeLabel} ${txLabel} en ${p.city}, ${p.department}.`,
    p.rooms    ? `${p.rooms} habitaciones.` : "",
    p.baths    ? `${p.baths} baños.` : "",
    p.area     ? `${p.area} m².` : "",
    priceFormatted ? `Precio: ${priceFormatted}.` : "",
    `Verificación jurídica completa por ${COMPANY_NAME}.`,
  ].filter(Boolean).join(" ");

  const availability = (() => {
    const s = String(p.status).toLowerCase();
    if (s === "vendida" || s === "sold") return "https://schema.org/SoldOut";
    if (s === "reservada") return "https://schema.org/LimitedAvailability";
    return "https://schema.org/InStock";
  })();

  const schemaListing = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: p.title,
    description: p.description || description,
    url: canonicalUrl,
    mainEntityOfPage: canonicalUrl,
    datePosted: p.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    image: p.images.length > 0
      ? p.images.map((url, i) => ({ "@type": "ImageObject", url, contentUrl: url, caption: `${typeLabel} ${txLabel} en ${p.city}`, representativeOfPage: i === 0 }))
      : [{ "@type": "ImageObject", url: OG_DEFAULT, representativeOfPage: true }],
    address: {
      "@type": "PostalAddress",
      streetAddress: p.address,
      addressLocality: p.city,
      addressRegion: p.department,
      addressCountry: "CO",
    },
    ...(p.lat && p.lng ? { geo: { "@type": "GeoCoordinates", latitude: p.lat, longitude: p.lng } } : {}),
    ...(p.rooms ? { numberOfRooms: Number(p.rooms) } : {}),
    ...(p.area  ? { floorSize: { "@type": "QuantitativeValue", value: Number(p.area), unitCode: "MTK" } } : {}),
    ...(p.amenities.length > 0 ? { amenityFeature: p.amenities.map(a => ({ "@type": "LocationFeatureSpecification", name: a, value: true })) } : {}),
    ...(p.price ? {
      offers: {
        "@type": "Offer",
        price: Number(p.price),
        priceCurrency: "COP",
        availability,
        url: canonicalUrl,
        priceValidUntil: new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString().slice(0, 10),
        seller: { "@type": "RealEstateAgent", "@id": `${BASE_URL}/#organization`, name: COMPANY_NAME, telephone: COMPANY_PHONE },
      }
    } : {}),
  };

  const schemaBreadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Catálogo", item: `${BASE_URL}/catalogo` },
      { "@type": "ListItem", position: 3, name: `${typeLabel} en ${p.city}`, item: canonicalUrl },
    ],
  };

  return buildHtmlShell({
    title, description, canonical: canonicalUrl,
    ogImage: mainImage, ogType: "article", price: p.price,
    schemas: [schemaListing, schemaBreadcrumb],
    bodyContent: `
      <h1>${esc(p.title)}</h1>
      <p>${esc(description)}</p>
      ${p.images.slice(0, 4).map(img => `<img src="${esc(img)}" alt="${esc(p.title)}" loading="lazy"/>`).join("")}
      <ul>
        ${p.rooms  ? `<li>Habitaciones: ${esc(p.rooms)}</li>`  : ""}
        ${p.baths  ? `<li>Baños: ${esc(p.baths)}</li>`         : ""}
        ${p.area   ? `<li>Área: ${esc(p.area)} m²</li>`        : ""}
        ${priceFormatted ? `<li>Precio: ${esc(priceFormatted)}</li>` : ""}
        <li>Ciudad: ${esc(p.city)}, ${esc(p.department)}</li>
        <li>Verificación jurídica: incluida</li>
      </ul>
      ${p.amenities.length > 0 ? `<ul>${p.amenities.map(a => `<li>${esc(a)}</li>`).join("")}</ul>` : ""}
      <a href="${esc(canonicalUrl)}">Ver propiedad completa</a>
      <a href="${BASE_URL}/catalogo">Ver más propiedades</a>
      <a href="${BASE_URL}/contacto">Contactar agente</a>
    `,
  });
}

async function buildZoneHtml(zoneSlug) {
  const cityMatch = zoneSlug.match(/-([a-z]+)$/);
  const typeMatch = zoneSlug.match(/^([a-z]+)/);
  const city      = cityMatch ? cityMatch[1] : "Colombia";
  const type      = typeMatch ? typeMatch[1] : "Propiedades";
  const canonical = `${BASE_URL}/propiedades/zona/${zoneSlug}`;
  const title     = `${type.charAt(0).toUpperCase() + type.slice(1)} en ${city.charAt(0).toUpperCase() + city.slice(1)} | ${COMPANY_NAME}`;

  return buildHtmlShell({
    title,
    description: `Encuentra ${type} en venta y arriendo en ${city}. ${COMPANY_NAME} ofrece propiedades con verificación jurídica completa, saneamiento predial y asesoría legal especializada.`,
    canonical, ogImage: OG_DEFAULT,
    schemas: [{
      "@context": "https://schema.org", "@type": "CollectionPage",
      name: title, url: canonical,
      isPartOf: { "@id": `${BASE_URL}/#website` }, inLanguage: "es-CO",
    }],
    bodyContent: `
      <h1>${esc(title)}</h1>
      <p>Propiedades en venta y arriendo en ${esc(city)} con verificación jurídica completa.</p>
      <a href="${BASE_URL}/catalogo">Ver todo el catálogo</a>
      <a href="${BASE_URL}">Inicio</a>
      <a href="${BASE_URL}/contacto">Contactar</a>
    `,
  });
}

function buildNotFoundHtml() {
  return buildHtmlShell({
    title: `Página no encontrada | ${COMPANY_NAME}`,
    description: "La página que buscas no existe. Explora nuestro catálogo de propiedades en venta y arriendo.",
    canonical: `${BASE_URL}/404`, ogImage: OG_DEFAULT,
    bodyContent: `
      <h1>Página no encontrada</h1>
      <p>La propiedad que buscas no existe o no está disponible.</p>
      <a href="${BASE_URL}/catalogo">Ver propiedades disponibles</a>
      <a href="${BASE_URL}">Volver al inicio</a>
    `,
  });
}

function buildFallbackHtml() {
  return buildHtmlShell({
    title: `Propiedades en Colombia | ${COMPANY_NAME}`,
    description: "Casas, apartamentos, fincas y locales en venta y arriendo en Colombia con verificación jurídica completa.",
    canonical: BASE_URL, ogImage: OG_DEFAULT,
    bodyContent: `
      <h1>${esc(COMPANY_NAME)}</h1>
      <p>Gestión inmobiliaria con respaldo jurídico en Colombia.</p>
      <a href="${BASE_URL}/catalogo">Ver propiedades</a>
      <a href="${BASE_URL}/contacto">Contactar</a>
    `,
  });
}

// ─── Handler principal ────────────────────────────────────────────────────────
async function handlePrerenderRequest(req, res) {
  const userAgent = req.headers["user-agent"] || "";
  const urlPath   = req.path || "/";

  // ── 1. NUNCA interceptar assets estáticos ───────────────────────────────────
  // Los archivos .js, .css, imágenes, etc. deben ser servidos por Firebase
  // Hosting directamente. Si llegan aquí es un error de configuración —
  // los dejamos pasar con 404 en lugar de romper la app con HTML.
  if (isStaticAsset(urlPath)) {
    console.warn("[prerender] Asset interceptado incorrectamente:", urlPath);
    res.set("Cache-Control", "no-store");
    return res.status(404).send("Not found");
  }

  // ── 2. Usuario real → servir index.html ────────────────────────────────────
  // Para usuarios normales servimos el index.html del build de React.
  // Firebase Hosting normalmente haría esto, pero como usamos una Cloud
  // Function como catch-all, tenemos que hacerlo nosotros.
  if (!isCrawler(userAgent)) {
    const indexHtml = getIndexHtml();

    if (indexHtml) {
      res.set("Content-Type", "text/html; charset=utf-8");
      res.set("Cache-Control", "no-store, no-cache, must-revalidate");
      res.set("X-Served-By", "prerender-function");
      return res.status(200).send(indexHtml);
    }

    // Si por alguna razón no se encuentra el index.html (nunca debería pasar
    // en producción si el build script copió el archivo), devolver un HTML
    // mínimo que carga la SPA desde el dominio raíz — sin redirect que rompa assets.
    console.error("[prerender] CRÍTICO: static-index.html no encontrado en", path.join(__dirname, "../static-index.html"));
    res.set("Content-Type", "text/html; charset=utf-8");
    res.set("Cache-Control", "no-store");
    return res.status(200).send(`<!doctype html>
<html lang="es-CO">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Cargando... | Inmobiliaria Rincón Bedoya</title>
  <script>
    // El index.html estático no está disponible — redirigir al hosting directamente
    // usando la URL actual para no perder la ruta
    if (!window.location.search.includes('_fb=1')) {
      window.location.replace(window.location.href + (window.location.search ? '&' : '?') + '_fb=1');
    }
  </script>
</head>
<body><p>Cargando...</p></body>
</html>`);
  }

  // ── 3. Crawler detectado → servir HTML pre-renderizado ─────────────────────
  try {
    const prerenderToken = process.env.PRERENDER_TOKEN || "";
    const fullUrl = `${BASE_URL}${urlPath}${req.search || ""}`;

    // Modo A: Prerender.io (con token configurado)
    // Prerender.io ejecuta React completo y espera window.prerenderReady = true
    if (prerenderToken) {
      const html = await fetchFromPrerender(fullUrl, prerenderToken);
      res.set("Content-Type", "text/html; charset=utf-8");
      res.set("X-Prerender", "prerender-io");
      res.set("Cache-Control", "public, max-age=300, s-maxage=3600");
      return res.status(200).send(html);
    }

    // Modo B: HTML estático generado desde Firestore (sin Prerender.io)
    // Genera HTML mínimo con title, description y schema para cada tipo de página.
    let html;
    const searchParams = new URLSearchParams(req.query || {});

    if (urlPath === "/" || urlPath === "") {
      html = await buildHomeHtml();

    } else if (urlPath === "/catalogo" || urlPath.startsWith("/catalogo?")) {
      html = await buildCatalogHtml(searchParams);

    } else if (urlPath.startsWith("/propiedades/zona/")) {
      const zoneSlug = extractZoneSlug(urlPath);
      html = zoneSlug ? await buildZoneHtml(zoneSlug) : await buildFallbackHtml();

    } else if (urlPath.startsWith("/propiedades/departamento/")) {
      const deptSlug = extractDeptSlug(urlPath);
      html = deptSlug ? await buildZoneHtml(deptSlug) : await buildFallbackHtml();

    } else if (urlPath.startsWith("/propiedades/")) {
      const propertyId = extractPropertyId(urlPath);
      html = propertyId
        ? await buildPropertyDetailHtml(propertyId)
        : await buildFallbackHtml();

    } else if (urlPath === "/contacto") {
      html = buildHtmlShell({
        title: `Contacto | ${COMPANY_NAME}`,
        description: `Contacta a ${COMPANY_NAME} para comprar, vender o arrendar propiedades en Colombia. Teléfono: ${COMPANY_PHONE}.`,
        canonical: `${BASE_URL}/contacto`,
        ogImage: OG_DEFAULT,
        bodyContent: `
          <h1>Contacto — ${esc(COMPANY_NAME)}</h1>
          <p>Estamos disponibles para acompañarte en todo el proceso inmobiliario.</p>
          <ul>
            <li>Teléfono: <a href="tel:${COMPANY_PHONE}">${esc(COMPANY_PHONE)}</a></li>
            <li>Email: <a href="mailto:inmojuridi09@gmail.com">inmojuridi09@gmail.com</a></li>
            <li>Dirección: Cra 5 #9-28, Anserma, Caldas, Colombia</li>
          </ul>
          <a href="${BASE_URL}">Inicio</a>
          <a href="${BASE_URL}/catalogo">Ver propiedades</a>
        `,
      });

    } else if (urlPath === "/politica-privacidad") {
      html = buildHtmlShell({
        title: `Política de Privacidad | ${COMPANY_NAME}`,
        description: `Política de privacidad y tratamiento de datos personales de ${COMPANY_NAME}.`,
        canonical: `${BASE_URL}/politica-privacidad`,
        ogImage: OG_DEFAULT,
        bodyContent: `<h1>Política de Privacidad</h1><a href="${BASE_URL}">Inicio</a>`,
      });

    } else {
      html = await buildFallbackHtml();
    }

    res.set("Content-Type", "text/html; charset=utf-8");
    res.set("X-Prerender", "static-fallback");
    res.set("Cache-Control", "public, max-age=300, s-maxage=3600");
    return res.status(200).send(html);

  } catch (err) {
    console.error("[prerender] Error inesperado:", urlPath, err.message);

    // En caso de error, intentar servir el index.html para no romper la navegación
    const indexHtml = getIndexHtml();
    if (indexHtml) {
      res.set("Content-Type", "text/html; charset=utf-8");
      res.set("Cache-Control", "no-store");
      return res.status(200).send(indexHtml);
    }

    // Último recurso: página de error simple (no redirect que cause loops)
    res.set("Content-Type", "text/html; charset=utf-8");
    return res.status(500).send(`<!doctype html><html><head><title>Error</title></head><body><h1>Error temporal</h1><a href="${BASE_URL}">Volver al inicio</a></body></html>`);
  }
}

module.exports = { handlePrerenderRequest, isCrawler };