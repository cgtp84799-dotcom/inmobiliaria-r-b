// src/shared/components/SEO/seoContent.js
// ─────────────────────────────────────────────────────────────
// Base de contenido SEO reutilizable.
//
// Incluye:
//   • FAQs genéricas (homepage, catálogo)
//   • FAQs dinámicas por ciudad + tipo + transacción
//   • Texto SEO de párrafo para footer de listados
//   • Keywords estratégicas por zona
//
// Todas las funciones son puras: reciben contexto (ciudad, tipo, etc.)
// y retornan strings o arrays listos para renderizar.
// ─────────────────────────────────────────────────────────────

const COMPANY_NAME = "Inmobiliaria Rincón Bedoya y Asociados";
const COMPANY_PHONE_DISPLAY = "+57 310 596 8202";

/* ═══════════════════════════════════════════════════════════════════════════
 *  FAQs — genéricas para home y catálogo
 * ═══════════════════════════════════════════════════════════════════════════ */

export const HOMEPAGE_FAQS = [
  {
    question: "¿Qué servicios inmobiliarios ofrece Rincón Bedoya y Asociados?",
    answer: "Ofrecemos gestión inmobiliaria integral con respaldo jurídico: compra, venta y arriendo de casas, apartamentos, fincas, lotes y locales comerciales. Además realizamos saneamiento predial (Ley 1561), procesos de pertenencia, sucesiones, avalúos certificados y acompañamiento en remates judiciales en Colombia.",
  },
  {
    question: "¿En qué ciudades de Colombia operan?",
    answer: "Tenemos sede principal en Anserma, Caldas y operamos activamente en toda la región cafetera: Manizales, Pereira, Armenia, Dosquebradas, Riosucio, Supía, Belalcázar y más. Estamos en expansión nacional a Bogotá, Medellín, Cali, Barranquilla, Cartagena, Bucaramanga, Cúcuta, Santa Marta e Ibagué.",
  },
  {
    question: "¿Qué significa 'respaldo jurídico' en la gestión inmobiliaria?",
    answer: "Significa que cada operación está acompañada por nuestro equipo de abogados especializados en derecho inmobiliario. Verificamos la tradición del inmueble, paz y salvos, estado de la matrícula, servidumbres y posibles afectaciones antes de cualquier compra, venta o arriendo. Reducimos al mínimo el riesgo jurídico del cliente.",
  },
  {
    question: "¿Cómo publico mi propiedad con ustedes?",
    answer: "Escríbenos por WhatsApp al " + COMPANY_PHONE_DISPLAY + " o al correo inmojuridi09@gmail.com. Un asesor coordinará una visita de valoración, verificará los documentos del inmueble y te explicará los planes de comercialización disponibles.",
  },
  {
    question: "¿Cobran comisión solo si se cierra el negocio?",
    answer: "Sí. Nuestra comisión se cobra únicamente al cierre exitoso de la operación (venta o firma del contrato de arriendo). La evaluación inicial, la orientación jurídica preliminar y la publicación no tienen costo.",
  },
  {
    question: "¿Hacen avalúos certificados?",
    answer: "Sí. Realizamos avalúos comerciales con peritos certificados, válidos para procesos judiciales, notariales, bancarios o de negociación privada. Entregamos el informe físico y digital según los estándares técnicos exigidos en Colombia.",
  },
];

export const CATALOG_FAQS = [
  {
    question: "¿Puedo filtrar propiedades por ciudad y tipo?",
    answer: "Sí. El catálogo permite filtrar por ciudad, tipo de propiedad (casa, apartamento, finca, lote, local), operación (venta o arriendo), rango de precio, número de habitaciones y baños. Los filtros se guardan en la URL para compartir búsquedas.",
  },
  {
    question: "¿Las propiedades publicadas están disponibles?",
    answer: "Sí. Actualizamos el estado de cada propiedad en tiempo real desde nuestro panel interno. Las que aparecen en el catálogo público están disponibles o reservadas; las vendidas o retiradas se despublican automáticamente.",
  },
  {
    question: "¿Cómo agendo una visita a una propiedad?",
    answer: "En cada ficha de propiedad puedes hacer clic en 'Contactar asesor' o 'Agendar visita'. También puedes escribirnos directamente por WhatsApp al " + COMPANY_PHONE_DISPLAY + " indicando la referencia de la propiedad de tu interés.",
  },
  {
    question: "¿Las fotos del catálogo son reales?",
    answer: "Sí. Todas las fotografías son tomadas por nuestro equipo o enviadas directamente por el propietario y verificadas por el asesor antes de publicar. No usamos imágenes genéricas ni renders.",
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
 *  FAQs dinámicas — por ciudad / tipo / transacción
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Genera FAQs específicas para una landing page de ciudad / tipo / transacción.
 *
 * @param {Object} ctx
 * @param {string} ctx.cityLabel        p.ej. "Manizales"
 * @param {string} [ctx.typeLabel]      p.ej. "casas", "apartamentos"
 * @param {string} [ctx.transactionLabel] p.ej. "venta", "arriendo"
 * @param {number} [ctx.count]          número de propiedades disponibles
 */
export function buildZoneFaqs({ cityLabel, typeLabel, transactionLabel, count }) {
  const what = typeLabel || "propiedades";
  const tx = transactionLabel || "venta o arriendo";
  const city = cityLabel || "la ciudad";

  const faqs = [
    {
      question: `¿Cuántas ${what} en ${tx} hay disponibles en ${city}?`,
      answer: count != null
        ? `Actualmente tenemos ${count} ${what} en ${tx} disponibles en ${city} y zonas aledañas. El inventario se actualiza diariamente desde nuestro sistema interno.`
        : `Nuestro inventario en ${city} se actualiza diariamente. Contáctanos por WhatsApp al ${COMPANY_PHONE_DISPLAY} y te enviamos el listado actual de ${what} en ${tx}.`,
    },
    {
      question: `¿Qué verificación jurídica hacen antes de publicar ${what} en ${city}?`,
      answer: `Revisamos el certificado de tradición y libertad, paz y salvos (predial, valorización, administración si aplica), estado de la matrícula inmobiliaria, servidumbres, gravámenes y afectaciones. Solo publicamos propiedades con situación jurídica clara, lo que reduce el riesgo para el comprador o arrendatario.`,
    },
    {
      question: `¿Atienden clientes de otras ciudades interesados en ${what} en ${city}?`,
      answer: `Sí. Coordinamos visitas virtuales por videollamada, enviamos documentación digital certificada y acompañamos todo el proceso a distancia. Al cierre, un asesor asiste a notaría en ${city} si es necesario.`,
    },
    {
      question: `¿Qué servicios adicionales ofrecen al comprar o arrendar en ${city}?`,
      answer: `Acompañamos el proceso con asesoría jurídica completa: redacción de promesa de compraventa o contrato de arriendo, revisión en notaría, trámites de escritura, cancelación de hipotecas y, si aplica, saneamiento predial o procesos de pertenencia.`,
    },
  ];

  return faqs;
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  Texto SEO — párrafo editorial para footer de listados
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Genera 2-3 párrafos de texto SEO con keywords naturales para el footer de
 * las páginas de listado. El tono es editorial (coincide con Fraunces).
 */
export function buildZoneSeoParagraphs({
  cityLabel,
  cityDepartment,
  typeLabel,
  typeLabelPlural,
  transactionLabel,
  transactionVerb,   // "en venta" | "en arriendo"
  count,
}) {
  const city = cityLabel || "la región cafetera";
  const dept = cityDepartment ? `, ${cityDepartment}` : "";
  const whatPlural = typeLabelPlural || "propiedades";
  const verb = transactionVerb || "en venta y arriendo";
  const tx = transactionLabel || "compra, venta o arriendo";

  const p1 = `¿Buscas ${whatPlural} ${verb} en ${city}${dept}? En ${COMPANY_NAME} encontrarás un inventario seleccionado${count != null ? ` de ${count} inmuebles` : ""} con verificación jurídica previa. Cada ficha incluye precio en pesos colombianos, área en metros cuadrados, número de habitaciones y baños, y fotografías reales de la propiedad.`;

  const p2 = `Más allá del portal, te acompañamos durante todo el proceso de ${tx}: revisión del certificado de tradición y libertad, paz y salvos, estudio de títulos, redacción de promesa o contrato, y trámite notarial. Si necesitas avalúo certificado, saneamiento predial bajo la Ley 1561 o un proceso de pertenencia, nuestro equipo jurídico lo gestiona directamente.`;

  const p3 = `Operamos con sede en Anserma, Caldas, y cubrimos toda la región cafetera: Manizales, Pereira, Armenia, Dosquebradas, Riosucio, Supía, Belalcázar y municipios cercanos. En expansión nacional atendemos también Bogotá, Medellín, Cali, Bucaramanga, Cartagena, Barranquilla, Santa Marta, Cúcuta, Ibagué y Villavicencio. Contáctanos por WhatsApp al ${COMPANY_PHONE_DISPLAY} para solicitar un asesor.`;

  return [p1, p2, p3];
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  Keywords por contexto
 * ═══════════════════════════════════════════════════════════════════════════ */

export function buildZoneKeywords({ cityLabel, typeLabelPlural, transactionLabel }) {
  const city = cityLabel || "colombia";
  const what = typeLabelPlural || "propiedades";
  const tx = transactionLabel || "venta";

  return [
    `${what} en ${tx} ${city}`,
    `${what} ${city}`,
    `inmobiliaria ${city}`,
    `${what.slice(0, -1)} en ${tx} ${city}`,
    `bienes raíces ${city}`,
    `finca raíz ${city}`,
    `inmuebles ${city}`,
    `${what} ${city} colombia`,
    `inmobiliaria con abogados ${city}`,
    `${what} con respaldo jurídico ${city}`,
  ].join(", ");
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  Titles / descriptions canónicos por tipo de página
 * ═══════════════════════════════════════════════════════════════════════════ */

export function buildZoneSeoTitle({ cityLabel, typeLabelPlural, transactionLabel, count }) {
  const what = typeLabelPlural
    ? typeLabelPlural.charAt(0).toUpperCase() + typeLabelPlural.slice(1)
    : "Propiedades";
  const tx = transactionLabel
    ? ` en ${transactionLabel.toLowerCase()}`
    : " en venta y arriendo";
  const where = cityLabel ? ` en ${cityLabel}` : " en Colombia";
  const countStr = count != null && count > 0 ? ` · ${count} disponibles` : "";
  return `${what}${tx}${where}${countStr} | ${COMPANY_NAME}`;
}

export function buildZoneSeoDescription({ cityLabel, typeLabelPlural, transactionLabel, count }) {
  const what = typeLabelPlural || "propiedades";
  const tx = transactionLabel || "venta y arriendo";
  const where = cityLabel ? ` en ${cityLabel}` : " en Colombia";
  const countStr = count != null && count > 0 ? `${count} ` : "";
  return `${countStr}${what} en ${tx}${where} con respaldo jurídico completo. Verificación de títulos, asesoría legal integral y acompañamiento notarial. ${COMPANY_NAME}.`;
}