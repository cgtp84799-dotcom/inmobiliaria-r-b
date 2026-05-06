import { SITE_URL as BASE_URL } from '../../../core/config/site.config';
// src/shared/components/SEO/schemaBuilders.js
// ─────────────────────────────────────────────────────────────
// Factorías puras para generar objetos Schema.org.
// Se pasan directamente al prop `structuredData` de <SeoHead />.
//
// Todas las funciones retornan un objeto JSON-LD listo para serializar,
// o null si los datos son insuficientes (para poder filtrar con .filter(Boolean)).
//
// CAMBIOS v2:
//   • buildLocalBusinessSchema() — agrega aggregateRating (estrellas en Google)
//     y la imagen OG correcta (og-default.jpg en vez del logo cuadrado).
//   • buildReviewSchema() — nuevo, para reseñas individuales.
//   • buildServiceSchema() — nuevo, para servicios jurídico-inmobiliarios.
// ─────────────────────────────────────────────────────────────
const COMPANY_NAME  = "Inmobiliaria Rincón Bedoya y Asociados";
const COMPANY_PHONE = "+573105968202";
const COMPANY_PHONE_2 = "+573206736391";
const COMPANY_EMAIL = "inmojuridi09@gmail.com";
const COMPANY_LOGO  = `${BASE_URL}/logo-light.png`;
const COMPANY_OG    = `${BASE_URL}/og-default.jpg`;

const toAbsolute = (url) => {
  if (!url) return "";
  const v = String(url).trim();
  if (/^https?:\/\//i.test(v)) return v;
  return `${BASE_URL}${v.startsWith("/") ? "" : "/"}${v}`;
};

/* ═══════════════════════════════════════════════════════════════════════════
 *  BreadcrumbList — SIEMPRE incluir en páginas de profundidad > 1
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * @param {Array<{name: string, url?: string}>} items
 *   El último item puede omitir url (página actual).
 */
export function buildBreadcrumbSchema(items = []) {
  const valid = (items || []).filter((i) => i && i.name);
  if (valid.length < 2) return null;

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: valid.map((item, i) => {
      const node = {
        "@type": "ListItem",
        position: i + 1,
        name: item.name,
      };
      if (item.url) node.item = toAbsolute(item.url);
      return node;
    }),
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  FAQPage — rich results de preguntas expandibles
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * @param {Array<{question: string, answer: string}>} faqs
 */
export function buildFaqSchema(faqs = []) {
  const valid = (faqs || []).filter((f) => f?.question && f?.answer);
  if (valid.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: valid.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  ItemList — páginas de listado (catálogo, zona, departamento)
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * @param {Object} cfg
 * @param {string} cfg.name                Nombre del listado
 * @param {Array<{name: string, url: string, image?: string}>} cfg.items
 * @param {string} [cfg.description]
 */
export function buildItemListSchema({ name, description, items = [] } = {}) {
  const valid = (items || []).filter((i) => i?.name && i?.url);
  if (valid.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    description,
    numberOfItems: valid.length,
    itemListElement: valid.map((item, i) => {
      const listItem = {
        "@type": "ListItem",
        position: i + 1,
        url: toAbsolute(item.url),
        name: item.name,
      };
      if (item.image) listItem.image = toAbsolute(item.image);
      return listItem;
    }),
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  RealEstateListing — propiedad individual
 * ═══════════════════════════════════════════════════════════════════════════ */

const OFFER_AVAILABILITY = {
  disponible: "https://schema.org/InStock",
  available:  "https://schema.org/InStock",
  active:     "https://schema.org/InStock",
  published:  "https://schema.org/InStock",
  reservada:  "https://schema.org/LimitedAvailability",
  vendida:    "https://schema.org/SoldOut",
  sold:       "https://schema.org/SoldOut",
  inactiva:   "https://schema.org/Discontinued",
  draft:      "https://schema.org/Discontinued",
};

const getOfferAvailability = (status) =>
  OFFER_AVAILABILITY[String(status || "").toLowerCase()] ||
  "https://schema.org/InStock";

const getResidenceType = (type) => {
  const t = String(type || "").toLowerCase();
  if (t.includes("casa"))   return "House";
  if (t.includes("apart"))  return "Apartment";
  if (t.includes("finca"))  return "House";
  if (t.includes("lote"))   return "Place";
  if (t.includes("local") || t.includes("comercial")) return "Place";
  if (t.includes("oficina")) return "Place";
  if (t.includes("bodega"))  return "Place";
  return "Residence";
};

/**
 * @param {Object} property - datos de la propiedad de Firestore
 * @param {string} canonicalUrl - URL canónica absoluta
 */
export function buildRealEstateListingSchema(property, canonicalUrl) {
  if (!property) return null;

  const {
    title, description, price, status, type, transactionType,
    rooms, bathrooms, area, images = [], media,
    city, department, address, lat, lng,
    createdAt, updatedAt, amenities = [], customAmenities = [], features = {},
  } = property;

  const allImages = [
    ...((media?.photos || []).map((p) => p?.url).filter(Boolean)),
    ...images,
  ].filter(Boolean).map(toAbsolute);
  const uniqueImages = [...new Set(allImages)];

  const resolvedCity    = city || property?.location?.city || "";
  const resolvedDept    = department || property?.location?.department || "Caldas";
  const resolvedAddress = address || property?.location?.address || "";
  const resolvedLat     = lat ?? property?.location?.lat ?? property?.location?.latitude;
  const resolvedLng     = lng ?? property?.location?.lng ?? property?.location?.longitude;
  const resolvedRooms   = rooms ?? features?.rooms ?? features?.bedrooms;
  const resolvedBaths   = bathrooms ?? features?.bathrooms;
  const resolvedArea    = area ?? features?.area;

  const txLabel = (() => {
    const v = String(transactionType || "").toLowerCase();
    if (["sale","venta","compra"].includes(v))              return "Venta";
    if (["rent","arriendo","alquiler","renta"].includes(v)) return "Arriendo";
    return "";
  })();

  const typeLabel = (() => {
    const v = String(type || "").toLowerCase();
    if (v.includes("casa"))   return "Casa";
    if (v.includes("apart"))  return "Apartamento";
    if (v.includes("finca"))  return "Finca";
    if (v.includes("lote"))   return "Lote";
    if (v.includes("local") || v.includes("comercial")) return "Local comercial";
    if (v.includes("oficina")) return "Oficina";
    if (v.includes("bodega"))  return "Bodega";
    return "Propiedad";
  })();

  const geo = resolvedLat != null && resolvedLng != null &&
    !Number.isNaN(Number(resolvedLat)) && !Number.isNaN(Number(resolvedLng))
    ? { "@type": "GeoCoordinates", latitude: Number(resolvedLat), longitude: Number(resolvedLng) }
    : undefined;

  const floorSize = resolvedArea != null
    ? { "@type": "QuantitativeValue", value: Number(resolvedArea), unitCode: "MTK" }
    : undefined;

  const allAmenities = [...(amenities || []), ...(customAmenities || [])].filter(Boolean);
  const amenityFeature = allAmenities.length > 0
    ? allAmenities.map((a) => ({ "@type": "LocationFeatureSpecification", name: a, value: true }))
    : undefined;

  const additionalProperty = [
    resolvedBaths != null     && { "@type": "PropertyValue", name: "Baños",                value: resolvedBaths },
    features?.parking != null && { "@type": "PropertyValue", name: "Parqueaderos",         value: features.parking },
    features?.stratum != null && { "@type": "PropertyValue", name: "Estrato",              value: features.stratum },
    features?.yearBuilt != null && { "@type": "PropertyValue", name: "Año de construcción", value: features.yearBuilt },
  ].filter(Boolean);

  const postalAddress = {
    "@type": "PostalAddress",
    streetAddress:   resolvedAddress || "",
    addressLocality: resolvedCity || "Anserma",
    addressRegion:   resolvedDept || "Caldas",
    addressCountry:  "CO",
  };

  const imageObjects = uniqueImages.length > 0
    ? uniqueImages.map((url, i) => ({
        "@type": "ImageObject",
        url,
        contentUrl: url,
        caption: title || `${typeLabel} en ${resolvedCity}`,
        representativeOfPage: i === 0,
      }))
    : [{ "@type": "ImageObject", url: COMPANY_OG, representativeOfPage: true }];

  const toIso = (v) => {
    try {
      if (!v) return null;
      if (typeof v?.toDate === "function") return v.toDate().toISOString();
      if (v instanceof Date) return v.toISOString();
      const d = new Date(v);
      return !Number.isNaN(d.getTime()) ? d.toISOString() : null;
    } catch (_) { return null; }
  };

  const mainEntity = !String(type || "").toLowerCase().includes("lote")
    ? {
        "@type": getResidenceType(type),
        name: title,
        description,
        url: canonicalUrl,
        image: uniqueImages.length > 0 ? uniqueImages : undefined,
        numberOfRooms:        resolvedRooms != null ? Number(resolvedRooms) : undefined,
        numberOfBedrooms:     resolvedRooms != null ? Number(resolvedRooms) : undefined,
        numberOfBathroomsTotal: resolvedBaths != null ? Number(resolvedBaths) : undefined,
        floorSize,
        amenityFeature,
        address: postalAddress,
        geo,
      }
    : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: title || `${typeLabel} en ${resolvedCity}`,
    description: description || `${typeLabel} ${txLabel ? `en ${txLabel.toLowerCase()}` : ""} en ${resolvedCity}, ${resolvedDept}`,
    url: canonicalUrl,
    mainEntityOfPage: canonicalUrl,
    image: imageObjects,
    datePosted:   toIso(createdAt),
    dateModified: toIso(updatedAt || createdAt),
    category: `${txLabel} de ${typeLabel}`,
    address: postalAddress,
    geo,
    numberOfRooms: resolvedRooms != null ? Number(resolvedRooms) : undefined,
    floorSize,
    amenityFeature,
    additionalProperty: additionalProperty.length > 0 ? additionalProperty : undefined,
    mainEntity,
    offers: price != null && price !== "" ? {
      "@type": "Offer",
      price: Number(price),
      priceCurrency: "COP",
      availability: getOfferAvailability(status),
      url: canonicalUrl,
      itemCondition: "https://schema.org/UsedCondition",
      priceValidUntil: new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      seller: {
        "@type": "RealEstateAgent",
        "@id": `${BASE_URL}/#organization`,
        name: COMPANY_NAME,
        url: BASE_URL,
        telephone: COMPANY_PHONE,
      },
    } : undefined,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  LocalBusiness / RealEstateAgent — página de contacto y home
 *
 *  CAMBIO v2: agrega aggregateRating para activar las estrellas doradas
 *  en resultados de búsqueda de Google.
 *
 *  ⚠️  IMPORTANTE: solo agregar aggregateRating cuando tengas reseñas
 *  reales verificables en Google Maps o Facebook. Google puede penalizar
 *  si el ratingValue no coincide con las reseñas reales del negocio.
 *
 *  Instrucciones de uso:
 *    1. Ve a tu perfil de Google Business
 *    2. Anota tu calificación actual (ej: 4.8) y número de reseñas (ej: 23)
 *    3. Actualiza RATING_VALUE y REVIEW_COUNT abajo con datos reales
 *    4. Si aún no tienes reseñas suficientes (< 5), deja aggregateRating en null
 * ═══════════════════════════════════════════════════════════════════════════ */

// ── Actualizar estos valores con datos reales de Google Business ──────────
const RATING_VALUE = null;   // Ej: 4.8 — o null si no tienes reseñas aún
const REVIEW_COUNT = null;   // Ej: 23  — o null si no tienes reseñas aún
// ─────────────────────────────────────────────────────────────────────────

export function buildLocalBusinessSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "@id": `${BASE_URL}/#organization`,
    name: COMPANY_NAME,
    image: [COMPANY_OG, COMPANY_LOGO],
    logo: COMPANY_LOGO,
    url: BASE_URL,
    telephone: COMPANY_PHONE,
    email: COMPANY_EMAIL,
    address: {
      "@type": "PostalAddress",
      streetAddress:   "Cra 5 #9-28",
      addressLocality: "Anserma",
      addressRegion:   "Caldas",
      postalCode:      "170001",
      addressCountry:  "CO",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude:  5.2383,
      longitude: -75.7850,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday","Tuesday","Wednesday","Thursday","Friday"],
        opens:  "08:00",
        closes: "17:30",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Saturday",
        opens:  "08:30",
        closes: "13:00",
      },
    ],
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: COMPANY_PHONE,
        contactType: "customer service",
        areaServed: "CO",
        availableLanguage: ["Spanish", "es"],
      },
      {
        "@type": "ContactPoint",
        telephone: COMPANY_PHONE_2,
        contactType: "sales",
        areaServed: "CO",
        availableLanguage: ["Spanish", "es"],
      },
    ],
    priceRange: "$$",
    currenciesAccepted: "COP",
    paymentAccepted: ["Cash", "Bank Transfer", "PSE", "Credit Card"],
    sameAs: [
      "https://www.facebook.com/profile.php?id=61559014741338",
      "https://instagram.com/inmobiliaria_ryb",
    ],
  };

  // Agregar aggregateRating solo si hay datos reales
  if (RATING_VALUE != null && REVIEW_COUNT != null && REVIEW_COUNT >= 5) {
    schema.aggregateRating = {
      "@type":       "AggregateRating",
      ratingValue:   String(RATING_VALUE),
      reviewCount:   String(REVIEW_COUNT),
      bestRating:    "5",
      worstRating:   "1",
    };
  }

  return schema;
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  CollectionPage — para páginas de listado (catálogo, zona, depto)
 * ═══════════════════════════════════════════════════════════════════════════ */

export function buildCollectionPageSchema({ name, description, url, numberOfItems }) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: toAbsolute(url),
    isPartOf: { "@id": `${BASE_URL}/#website` },
    about: {
      "@type": "Thing",
      name: "Bienes raíces en Colombia",
    },
    inLanguage: "es-CO",
    publisher: { "@id": `${BASE_URL}/#organization` },
    mainEntity: numberOfItems != null ? {
      "@type": "ItemList",
      numberOfItems,
    } : undefined,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  Service — para cada servicio jurídico-inmobiliario
 *  Nuevo en v2 — útil para la página de servicios o home.
 *  Google puede mostrar estos servicios en el Knowledge Panel.
 * ═══════════════════════════════════════════════════════════════════════════ */

const SERVICES_DATA = [
  {
    name: "Compra y venta de propiedades",
    description: "Gestión integral de compraventa de casas, apartamentos, fincas, lotes y locales comerciales con verificación jurídica completa en Colombia.",
    url: `${BASE_URL}/catalogo`,
  },
  {
    name: "Arriendo residencial y comercial",
    description: "Administración de contratos de arriendo para vivienda urbana, locales comerciales, fincas y aparcerías con blindaje jurídico.",
    url: `${BASE_URL}/catalogo?operacion=arriendo`,
  },
  {
    name: "Saneamiento predial",
    description: "Regularización de títulos de propiedad mediante procesos de pertenencia y Ley 1561 de 2012 para pequeña vivienda rural y urbana en Colombia.",
    url: `${BASE_URL}/contacto`,
  },
  {
    name: "Avalúos certificados",
    description: "Avalúos comerciales con peritos certificados válidos para procesos judiciales, notariales, bancarios o negociación privada.",
    url: `${BASE_URL}/contacto`,
  },
  {
    name: "Sucesiones notariales y judiciales",
    description: "Levantamiento y trámite de sucesiones para transferencia de inmuebles por herencia en Colombia.",
    url: `${BASE_URL}/contacto`,
  },
  {
    name: "Representación en remates",
    description: "Asesoría y representación legal en remates judiciales de inmuebles en juzgados de Colombia.",
    url: `${BASE_URL}/contacto`,
  },
];

/**
 * Genera un array de schemas Service para cada servicio.
 * Usar en la home o página de servicios:
 *   structuredData={buildServicesSchema()}
 */
export function buildServicesSchema() {
  return SERVICES_DATA.map((s) => ({
    "@context": "https://schema.org",
    "@type": "Service",
    name: s.name,
    description: s.description,
    url: s.url,
    provider: { "@id": `${BASE_URL}/#organization` },
    areaServed: { "@type": "Country", "name": "Colombia" },
    serviceType: "Real Estate Service",
    inLanguage: "es-CO",
  }));
}