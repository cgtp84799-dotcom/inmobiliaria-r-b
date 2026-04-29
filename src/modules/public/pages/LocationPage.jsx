// FIX [CALIDAD]: feedback visible en errores de carga y respeto de reduced motion.
// src/modules/public/pages/LocationPage.jsx
// ─────────────────────────────────────────────────────────────
// Página de zona/ciudad editorial — misma lógica de SEO y slugs,
// UI reescrita con tokens semánticos y lenguaje Fraunces.
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  SeoHead,
  SeoTextBlock,
  buildBreadcrumbSchema,
  buildItemListSchema,
  buildFaqSchema,
  buildCollectionPageSchema,
  buildZoneFaqs,
  buildZoneSeoParagraphs,
} from "../../../shared/components/SEO";
import { useRelatedLinks } from "../../../shared/hooks/useSeo";
import { useReducedMotion } from "../../../shared/hooks/useReducedMotion";
import { findCity, findDepartment } from "../../../core/config/geography.config";
import { motion } from "framer-motion";
import {
  FaHome,
  FaSearch,
  FaMapMarkerAlt,
  FaChevronLeft,
  FaChevronRight,
  FaArrowRight,
  FaWhatsapp,
} from "react-icons/fa";
import propertyService from "../../properties/services/property.service";
import PropertyCard from "../components/PropertyCard";
import Breadcrumbs from "../../../shared/components/UI/Breadcrumbs";
import toast from "react-hot-toast";

const BASE_URL = "https://inmobiliaria-ryb-y-asociados.com";
const COMPANY_NAME = "Inmobiliaria Rincón Bedoya y Asociados";

const CITY_LABELS = {
  anserma: "Anserma",
  riosucio: "Riosucio",
  supia: "Supía",
  belalcazar: "Belalcázar",
  "la-merced": "La Merced",
  viterbo: "Viterbo",
  "dos-quebradas": "Dosquebradas",
  dosquebradas: "Dosquebradas",
  filadelfia: "Filadelfia",
  marmato: "Marmato",
  quinchia: "Quinchía",
  "la-virginia": "La Virginia",
  manizales: "Manizales",
  pereira: "Pereira",
  "santa-rosa-de-cabal": "Santa Rosa de Cabal",
};

const TYPE_LABELS = {
  casa: "casas",
  apartamento: "apartamentos",
  lote: "lotes",
  finca: "fincas",
  local: "locales comerciales",
  oficina: "oficinas",
  bodega: "bodegas",
};

const PUBLIC_STATUSES = new Set([
  "disponible",
  "reservada",
  "published",
  "active",
  "available",
]);

const FILTER_KEYWORDS = [
  "venta",
  "arriendo",
  "alquiler",
  "compra",
  "renta",
  "casa",
  "apart",
  "lote",
  "finca",
  "local",
  "bodega",
  "oficina",
];

// ─── Helpers de normalización ────────────────────────────────────────────────

function normalize(str = "") {
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function humanizeSlug(slug = "") {
  return String(slug)
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const isTypeCitySlug = (slug = "") =>
  FILTER_KEYWORDS.some((k) => normalize(slug).includes(k));

// ─── Parser de slugs de zona ────────────────────────────────────────────────

const TYPE_PLURALS_TO_KEY = {
  casas: "casa",
  apartamentos: "apartamento",
  lotes: "lote",
  fincas: "finca",
  locales: "local",
  "locales-comerciales": "local",
  oficinas: "oficina",
  bodegas: "bodega",
};

function parseZoneSlug(slug = "") {
  const normalized = normalize(slug);

  if (CITY_LABELS[normalized]) {
    return {
      city: normalized,
      type: null,
      transaction: null,
    };
  }

  const cityKeys = Object.keys(CITY_LABELS).sort((a, b) => b.length - a.length);

  const matchedCity =
    cityKeys.find(
      (key) => normalized === key || normalized.endsWith(`-${key}`)
    ) || null;

  if (!matchedCity) {
    return {
      city: null,
      type: null,
      transaction: null,
    };
  }

  const withoutCity = normalized
    .replace(new RegExp(`-?${matchedCity}$`), "")
    .replace(/^-+|-+$/g, "");

  const parts = withoutCity.split("-").filter(Boolean);

  let transaction = null;
  if (parts.includes("venta") || parts.includes("compra")) {
    transaction = "venta";
  } else if (
    parts.includes("arriendo") ||
    parts.includes("alquiler") ||
    parts.includes("renta")
  ) {
    transaction = "arriendo";
  }

  let type = null;

  const pluralMatch = Object.keys(TYPE_PLURALS_TO_KEY).find((plural) =>
    withoutCity.includes(plural)
  );

  if (pluralMatch) {
    type = TYPE_PLURALS_TO_KEY[pluralMatch];
  } else {
    if (withoutCity.includes("casa")) type = "casa";
    else if (withoutCity.includes("apart")) type = "apartamento";
    else if (withoutCity.includes("lote")) type = "lote";
    else if (withoutCity.includes("finca")) type = "finca";
    else if (
      withoutCity.includes("local") ||
      withoutCity.includes("comercial")
    ) {
      type = "local";
    } else if (withoutCity.includes("oficina")) type = "oficina";
    else if (withoutCity.includes("bodega")) type = "bodega";
  }

  return {
    city: matchedCity,
    type,
    transaction,
  };
}

// ─── Helpers de propiedades ─────────────────────────────────────────────────

const resolveCity = (p) => String(p?.location?.city ?? p?.city ?? "").trim();

const resolveRooms = (p) =>
  p?.features?.rooms ??
  p?.features?.bedrooms ??
  p?.rooms ??
  p?.bedrooms ??
  null;

function getTransactionSlug(tx = "") {
  const l = String(tx).toLowerCase();
  if (l.includes("sale") || l.includes("venta") || l.includes("compra")) {
    return "venta";
  }
  if (
    l.includes("rent") ||
    l.includes("arriendo") ||
    l.includes("alquiler") ||
    l.includes("renta")
  ) {
    return "arriendo";
  }
  return "";
}

function getTypeSlug(t = "") {
  const l = String(t).toLowerCase();
  if (l.includes("casa")) return "casa";
  if (l.includes("apart")) return "apartamento";
  if (l.includes("lote")) return "lote";
  if (l.includes("finca")) return "finca";
  if (l.includes("local") || l.includes("comercial")) return "local";
  if (l.includes("oficina")) return "oficina";
  if (l.includes("bodega")) return "bodega";
  return "propiedad";
}

function buildPropertyUrl(p) {
  const tx = getTransactionSlug(p?.transactionType);
  const type = getTypeSlug(p?.type);
  const city = normalize(resolveCity(p));
  const rooms = resolveRooms(p);

  const parts = [];
  if (tx) parts.push(tx);
  if (type) parts.push(type);
  if (city) parts.push(city);
  if (rooms) parts.push(`${rooms}-habitaciones`);

  const slug = normalize(parts.join(" ")) || "propiedad";
  return `${BASE_URL}/propiedades/${slug}-${p.id}`;
}

function matchesType(t = "", inf = "") {
  const type = String(t ?? "").toLowerCase();
  if (inf === "casa") return type.includes("casa");
  if (inf === "apartamento") return type.includes("apart");
  if (inf === "lote") return type.includes("lote");
  if (inf === "finca") return type.includes("finca");
  if (inf === "local") {
    return type.includes("local") || type.includes("comercial");
  }
  if (inf === "oficina") return type.includes("oficina");
  if (inf === "bodega") {
    return type.includes("bodega") || type.includes("warehouse");
  }
  return true;
}

function matchesTransaction(tx = "", inf = "") {
  const tr = String(tx ?? "").toLowerCase();
  if (inf === "venta") {
    return ["sale", "venta", "compra"].some((v) => tr.includes(v));
  }
  if (inf === "arriendo") {
    return ["rent", "arriendo", "alquiler", "renta"].some((v) =>
      tr.includes(v)
    );
  }
  return true;
}

// ─── Componente principal ───────────────────────────────────────────────────

const LocationPage = () => {
  const { city: citySlug, typeCity: typeCitySlug } = useParams()

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const reducedMotion = useReducedMotion();

  const ITEMS_PER_PAGE = 9;

  const rawSegment = useMemo(
    () => String(typeCitySlug || citySlug || "").trim(),
    [typeCitySlug, citySlug]
  );

  const isZoneRoute = useMemo(() => {
    if (typeCitySlug) return true;
    return isTypeCitySlug(rawSegment);
  }, [typeCitySlug, rawSegment]);

  const parsedZone = useMemo(
    () =>
      rawSegment
        ? parseZoneSlug(rawSegment)
        : { city: null, type: null, transaction: null },
    [rawSegment]
  );

  const normalizedCity = useMemo(() => {
    if (!rawSegment) return "";
    if (isZoneRoute) return parsedZone.city || "";
    return normalize(rawSegment);
  }, [rawSegment, isZoneRoute, parsedZone]);

  const cityLabel = useMemo(() => {
    if (!normalizedCity) return "Ubicación";
    return CITY_LABELS[normalizedCity] || humanizeSlug(normalizedCity);
  }, [normalizedCity]);

  const inferredTransaction = useMemo(
    () => (isZoneRoute ? parsedZone.transaction : null),
    [isZoneRoute, parsedZone]
  );

  const inferredType = useMemo(
    () => (isZoneRoute ? parsedZone.type : null),
    [isZoneRoute, parsedZone]
  );

  const typeLabel = useMemo(
    () =>
      inferredType ? TYPE_LABELS[inferredType] || inferredType : "propiedades",
    [inferredType]
  );

  const h1Label = useMemo(() => {
    if (inferredType && inferredTransaction) {
      return `${
        typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)
      } en ${inferredTransaction} en ${cityLabel}`;
    }
    if (inferredType) {
      return `${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} en ${cityLabel}`;
    }
    return `Propiedades en ${cityLabel}`;
  }, [typeLabel, inferredTransaction, inferredType, cityLabel]);

  const seoTitle = `${h1Label} | ${COMPANY_NAME}`;

  const seoDescription = useMemo(() => {
    if (inferredType && inferredTransaction) {
      return `Encuentra ${typeLabel} en ${inferredTransaction} en ${cityLabel}. Publicaciones actualizadas con respaldo jurídico de ${COMPANY_NAME}.`;
    }
    if (inferredType) {
      return `Explora ${typeLabel} disponibles en ${cityLabel}. Propiedades con respaldo jurídico por ${COMPANY_NAME}.`;
    }
    return `Explora propiedades disponibles en ${cityLabel}. Casas, apartamentos, lotes y fincas con respaldo jurídico de ${COMPANY_NAME}.`;
  }, [inferredType, inferredTransaction, typeLabel, cityLabel]);

  const canonicalSegment = useMemo(() => normalize(rawSegment), [rawSegment]);

  const seoUrl = useMemo(() => {
    if (isZoneRoute) {
      return `${BASE_URL}/propiedades/zona/${canonicalSegment}`;
    }
    return `${BASE_URL}/propiedades/ciudad/${normalizedCity || canonicalSegment}`;
  }, [isZoneRoute, canonicalSegment, normalizedCity]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      try {
        const all = await propertyService.getPublicProperties();
        const list = Array.isArray(all) ? all : [];

        const filtered = list.filter((p) => {
          const status = String(p?.status ?? "").toLowerCase();

          if (status && !PUBLIC_STATUSES.has(status)) return false;

          if (normalizedCity) {
            const pCity = normalize(resolveCity(p));
            if (pCity !== normalizedCity && !pCity.includes(normalizedCity)) {
              return false;
            }
          }

          if (inferredType && !matchesType(p?.type, inferredType)) {
            return false;
          }

          if (
            inferredTransaction &&
            !matchesTransaction(p?.transactionType, inferredTransaction)
          ) {
            return false;
          }

          return true;
        });

        setProperties(filtered);
        setCurrentPage(1);
      } catch (err) {
        console.error("LocationPage: error cargando propiedades:", err);
        toast.error("No se pudo cargar la zona solicitada.");
        setProperties([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [normalizedCity, inferredType, inferredTransaction]);

  const totalItems = properties.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
  const paginated = properties.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const breadcrumbItems = [
    { label: "Propiedades", href: "/catalogo" },
    { label: h1Label },
  ];

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Inicio",
        item: `${BASE_URL}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Propiedades",
        item: `${BASE_URL}/catalogo`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: h1Label,
        item: seoUrl,
      },
    ],
  };

  const itemListSchema =
    paginated.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: h1Label,
          description: seoDescription,
          url: seoUrl,
          numberOfItems: paginated.length,
          itemListOrder: "https://schema.org/ItemListOrderAscending",
          itemListElement: paginated.map((p, idx) => ({
            "@type": "ListItem",
            position: startIndex + idx + 1,
            url: buildPropertyUrl(p),
            name: p?.title || `Propiedad en ${cityLabel}`,
          })),
        }
      : null;
// ─── SEO enriquecido ──────────────────────────────────────────────
const cityInfo = findCity(normalizedCity);
const deptInfo = cityInfo ? findDepartment(cityInfo.department) : null;

const breadcrumbItemsSeo = [
  { name: "Inicio",        url: "/" },
  { name: "Propiedades",   url: "/catalogo" },
  ...(deptInfo ? [{
    name: deptInfo.name,
    url: `/propiedades/departamento/${deptInfo.slug}`,
  }] : []),
  { name: cityLabel || humanizeSlug(rawSegment) },
];

const zoneFaqs = buildZoneFaqs({
  cityLabel,
  typeLabel: inferredType,
  transactionLabel: inferredTransaction,
  count: totalItems,
});

const zoneParagraphs = buildZoneSeoParagraphs({
  cityLabel,
  cityDepartment: deptInfo?.name,
  typeLabel: inferredType,
  typeLabelPlural: inferredType ? `${inferredType}s` : "propiedades",
  transactionLabel: inferredTransaction,
  transactionVerb: inferredTransaction ? `en ${inferredTransaction}` : "en venta y arriendo",
  count: totalItems,
});

const relatedLinks = useRelatedLinks({
  citySlug: normalizedCity,
  typeSlug: inferredType,
  transactionSlug: inferredTransaction,
});

const schemaItemsHydrated = paginated.slice(0, 20).map((p) => ({
  name: p?.title || `Propiedad en ${cityLabel}`,
  url: buildPropertyUrl(p),
  image: p?.media?.photos?.[0]?.url || p?.images?.[0] || undefined,
}));
  return (
    <div>
<SeoHead
  title={seoTitle}
  description={seoDescription}
  path={seoUrl.replace(BASE_URL, "")}
  structuredData={[
    buildBreadcrumbSchema(breadcrumbItemsSeo),
    buildCollectionPageSchema({
      name: seoTitle,
      description: seoDescription,
      url: seoUrl,
      numberOfItems: totalItems,
    }),
    buildItemListSchema({
      name: seoTitle,
      description: seoDescription,
      items: schemaItemsHydrated,
    }),
    buildFaqSchema(zoneFaqs),
  ].filter(Boolean)}
/>

      <section className="catalog-hero">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <Breadcrumbs items={breadcrumbItems} />

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 max-w-3xl"
          >
            <span className="eyebrow">
              <FaMapMarkerAlt
                className="text-[10px] mr-1"
                aria-hidden="true"
              />
              Zona destacada · {cityLabel}
            </span>

            <h1 className="heading-display mt-6 text-[clamp(2rem,4.5vw+0.5rem,4rem)]">
              {inferredType && inferredTransaction ? (
                <>
                  {typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)}{" "}
                  <em>en {inferredTransaction}</em>
                  <br />
                  en {cityLabel}
                </>
              ) : inferredType ? (
                <>
                  {typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)}{" "}
                  <em>en {cityLabel}</em>
                </>
              ) : (
                <>
                  Propiedades <em>en {cityLabel}</em>
                </>
              )}
            </h1>

            <p
              className="mt-5 text-base sm:text-lg leading-relaxed max-w-2xl"
              style={{ color: "var(--color-text-muted)" }}
            >
              {inferredTransaction
                ? `Publicaciones ${
                    inferredTransaction === "venta" ? "en venta" : "en arriendo"
                  } con respaldo jurídico verificado en ${cityLabel}.`
                : `Propiedades disponibles con respaldo jurídico integral en ${cityLabel}.`}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-7 flex flex-wrap items-center gap-3"
          >
            <Link to="/catalogo" className="btn-secondary">
              <FaSearch className="text-xs" /> Ver todo el catálogo
            </Link>

            <span
              className="text-sm"
              style={{ color: "var(--color-text-muted)" }}
            >
              <strong style={{ color: "var(--color-text)" }}>{totalItems}</strong>{" "}
              {totalItems === 1
                ? "propiedad encontrada"
                : "propiedades encontradas"}
            </span>
          </motion.div>
        </div>
      </section>

      <section className="pb-16 sm:pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="catalog-skeleton">
                  <div className="catalog-skeleton__img skeleton" />
                  <div className="p-4 space-y-3">
                    <div className="skeleton h-4 w-3/4" />
                    <div className="skeleton h-3 w-1/2" />
                    <div className="skeleton h-5 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : totalItems === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="catalog-empty"
            >
              <div className="catalog-empty__icon">
                <FaHome />
              </div>

              <h2
                className="font-display text-2xl sm:text-3xl mt-6"
                style={{ color: "var(--color-text)" }}
              >
                Todavía no hay propiedades{" "}
                <em
                  style={{
                    color: "#d97706",
                    fontStyle: "italic",
                    fontWeight: 400,
                  }}
                >
                  publicadas en {cityLabel}.
                </em>
              </h2>

              <p
                className="mt-3 max-w-md text-base"
                style={{ color: "var(--color-text-muted)" }}
              >
                Nuestra cartera cambia semanalmente. Déjanos tus preferencias y
                te avisamos apenas llegue algo en {cityLabel}.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/catalogo" className="btn-secondary">
                  <FaSearch /> Ver todo el catálogo
                </Link>

                <a
                  href={`https://wa.me/573105968202?text=${encodeURIComponent(
                    `Hola, busco ${typeLabel} en ${cityLabel}. ¿Tienen algo disponible?`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                >
                  <FaWhatsapp /> Solicitar búsqueda personalizada
                </a>
              </div>
            </motion.div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {paginated.map((property) => (
                  <motion.div
                    key={property.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    <PropertyCard property={property} />
                  </motion.div>
                ))}
              </div>

              {totalPages > 1 && (
                <nav
                  className="catalog-pagination mt-10"
                  aria-label="Paginación"
                >
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={safePage === 1}
                    className="catalog-pagination__btn"
                    aria-label="Anterior"
                  >
                    <FaChevronLeft />
                  </button>

                  <span
                    className="px-4 text-sm"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Página{" "}
                    <strong style={{ color: "var(--color-text)" }}>
                      {safePage}
                    </strong>{" "}
                    de{" "}
                    <strong style={{ color: "var(--color-text)" }}>
                      {totalPages}
                    </strong>
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(p + 1, totalPages))
                    }
                    disabled={safePage === totalPages}
                    className="catalog-pagination__btn"
                    aria-label="Siguiente"
                  >
                    <FaChevronRight />
                  </button>
                </nav>
              )}

              <div className="mt-12 catalog-help-banner">
                <div>
                  <span
                    className="text-xs font-bold uppercase tracking-[0.15em] mb-2 block"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    ¿Buscas algo específico en {cityLabel}?
                  </span>

                  <h3
                    className="font-display text-2xl sm:text-3xl"
                    style={{ color: "var(--color-text)" }}
                  >
                    Tenemos propiedades{" "}
                    <em
                      style={{
                        color: "#d97706",
                        fontStyle: "italic",
                        fontWeight: 400,
                      }}
                    >
                      que no publicamos.
                    </em>
                  </h3>

                  <p
                    className="mt-3 text-sm max-w-xl"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Si no encuentras lo ideal aquí, escríbenos — parte de nuestra
                    cartera llega primero a clientes registrados.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <a
                    href={`https://wa.me/573105968202?text=${encodeURIComponent(
                      `Hola, busco ${typeLabel} en ${cityLabel}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary"
                  >
                    <FaWhatsapp /> WhatsApp
                  </a>

                  <Link to="/contacto" className="btn-secondary">
                    Dejar consulta <FaArrowRight className="text-xs" />
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
  <SeoTextBlock
    title={`Más sobre propiedades en ${cityLabel}`}
    paragraphs={zoneParagraphs}
    faqs={zoneFaqs}
    relatedLinks={relatedLinks}
    relatedTitle="Otras búsquedas en la zona"
  />
</section>
    </div>
  );
};

export default LocationPage;