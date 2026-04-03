import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import {
  FaHome,
  FaSearch,
  FaMapMarkerAlt,
  FaChevronLeft,
  FaChevronRight,
  FaFilter,
} from "react-icons/fa";
import propertyService from "../../properties/services/property.service";
import PropertyCard from "../components/PropertyCard";
import Breadcrumbs from "../../../shared/components/UI/Breadcrumbs";

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
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function isTypeCitySlug(slug = "") {
  const lower = normalize(slug);
  return FILTER_KEYWORDS.some((kw) => lower.includes(kw));
}

function inferTransactionFromPath(segment = "") {
  const lower = normalize(segment);
  if (lower.includes("venta") || lower.includes("compra")) return "venta";
  if (
    lower.includes("arriendo") ||
    lower.includes("alquiler") ||
    lower.includes("renta")
  ) {
    return "arriendo";
  }
  return null;
}

function inferTypeFromSegment(segment = "") {
  const lower = normalize(segment);
  if (lower.includes("casa")) return "casa";
  if (lower.includes("apart")) return "apartamento";
  if (lower.includes("lote")) return "lote";
  if (lower.includes("finca")) return "finca";
  if (lower.includes("local") || lower.includes("comercial")) return "local";
  if (lower.includes("oficina")) return "oficina";
  if (lower.includes("bodega")) return "bodega";
  return null;
}

function inferCityFromSegment(segment = "") {
  const lower = normalize(segment);
  const keys = Object.keys(CITY_LABELS).sort((a, b) => b.length - a.length);
  return keys.find((key) => lower.includes(key)) || null;
}

function getTransactionSlug(transactionType = "") {
  const lower = String(transactionType).toLowerCase();
  if (
    lower.includes("sale") ||
    lower.includes("venta") ||
    lower.includes("compra")
  ) {
    return "venta";
  }
  if (
    lower.includes("rent") ||
    lower.includes("arriendo") ||
    lower.includes("alquiler") ||
    lower.includes("renta")
  ) {
    return "arriendo";
  }
  return "";
}

function getTypeSlug(type = "") {
  const lower = String(type).toLowerCase();
  if (lower.includes("casa")) return "casa";
  if (lower.includes("apart")) return "apartamento";
  if (lower.includes("lote")) return "lote";
  if (lower.includes("finca")) return "finca";
  if (lower.includes("local") || lower.includes("comercial")) return "local";
  if (lower.includes("oficina")) return "oficina";
  if (lower.includes("bodega")) return "bodega";
  return "propiedad";
}

function resolveCity(property) {
  return String(property?.location?.city ?? property?.city ?? "").trim();
}

function resolveRooms(property) {
  return (
    property?.features?.rooms ??
    property?.features?.bedrooms ??
    property?.rooms ??
    property?.bedrooms ??
    null
  );
}

function buildPropertyUrl(property) {
  const tx = getTransactionSlug(property?.transactionType);
  const type = getTypeSlug(property?.type);
  const city = normalize(resolveCity(property));
  const rooms = resolveRooms(property);

  const parts = [];
  if (tx) parts.push(tx);
  if (type) parts.push(type);
  if (city) parts.push(city);
  if (rooms) parts.push(`${rooms}-habitaciones`);

  const slug = normalize(parts.join(" ")) || "propiedad";
  return `${BASE_URL}/propiedades/${slug}-${property.id}`;
}

function matchesType(propertyType = "", inferredType = "") {
  const type = String(propertyType ?? "").toLowerCase();

  if (inferredType === "casa") return type.includes("casa");
  if (inferredType === "apartamento") return type.includes("apart");
  if (inferredType === "lote") return type.includes("lote");
  if (inferredType === "finca") return type.includes("finca");
  if (inferredType === "local") {
    return type.includes("local") || type.includes("comercial");
  }
  if (inferredType === "oficina") return type.includes("oficina");
  if (inferredType === "bodega") {
    return type.includes("bodega") || type.includes("warehouse");
  }

  return true;
}

function matchesTransaction(transactionType = "", inferredTransaction = "") {
  const tr = String(transactionType ?? "").toLowerCase();

  if (inferredTransaction === "venta") {
    return ["sale", "venta", "compra"].some((v) => tr.includes(v));
  }

  if (inferredTransaction === "arriendo") {
    return ["rent", "arriendo", "alquiler", "renta"].some((v) =>
      tr.includes(v)
    );
  }

  return true;
}

const LocationPage = () => {
  const { citySlug, typeCitySlug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const ITEMS_PER_PAGE = 9;

  const rawSegment = useMemo(
    () => String(typeCitySlug || citySlug || "").trim(),
    [typeCitySlug, citySlug]
  );

  const isZoneRoute = useMemo(() => {
    if (typeCitySlug) return true;
    return isTypeCitySlug(rawSegment);
  }, [typeCitySlug, rawSegment]);

  const normalizedCity = useMemo(() => {
    if (!rawSegment) return "";
    if (isZoneRoute) return inferCityFromSegment(rawSegment) || "";
    return normalize(rawSegment);
  }, [rawSegment, isZoneRoute]);

  const cityLabel = useMemo(() => {
    if (!normalizedCity) return "Caldas";
    return CITY_LABELS[normalizedCity] || humanizeSlug(normalizedCity);
  }, [normalizedCity]);

  const inferredTransaction = useMemo(() => {
    return isZoneRoute ? inferTransactionFromPath(rawSegment) : null;
  }, [isZoneRoute, rawSegment]);

  const inferredType = useMemo(() => {
    return isZoneRoute ? inferTypeFromSegment(rawSegment) : null;
  }, [isZoneRoute, rawSegment]);

  const typeLabel = useMemo(() => {
    return inferredType ? TYPE_LABELS[inferredType] || inferredType : "propiedades";
  }, [inferredType]);

  const h1Label = useMemo(() => {
    if (inferredType && inferredTransaction) {
      return `${
        typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)
      } en ${inferredTransaction} en ${cityLabel}`;
    }

    if (inferredType) {
      return `${
        typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)
      } en ${cityLabel}`;
    }

    return `Propiedades en ${cityLabel}`;
  }, [typeLabel, inferredTransaction, inferredType, cityLabel]);

  const seoTitle = `${h1Label} | ${COMPANY_NAME}`;

  const seoDescription = useMemo(() => {
    if (inferredType && inferredTransaction) {
      return `Encuentra ${typeLabel} en ${inferredTransaction} en ${cityLabel}. Publicaciones actualizadas con respaldo jurídico de ${COMPANY_NAME}.`;
    }

    if (inferredType) {
      return `Explora ${typeLabel} disponibles en ${cityLabel}. Propiedades publicadas con respaldo jurídico por ${COMPANY_NAME}.`;
    }

    return `Explora propiedades disponibles en ${cityLabel}. Casas, apartamentos, lotes, fincas y locales con respaldo jurídico de ${COMPANY_NAME}.`;
  }, [inferredType, inferredTransaction, typeLabel, cityLabel]);

  const canonicalSegment = useMemo(() => normalize(rawSegment), [rawSegment]);

  const seoUrl = useMemo(() => {
    if (isZoneRoute) {
      return `${BASE_URL}/propiedades/zona/${canonicalSegment}`;
    }
    return `${BASE_URL}/propiedades/ciudad/${normalizedCity || canonicalSegment}`;
  }, [isZoneRoute, canonicalSegment, normalizedCity]);

  const canonicalPath = useMemo(() => {
    try {
      return new URL(seoUrl).pathname;
    } catch {
      return isZoneRoute
        ? `/propiedades/zona/${canonicalSegment}`
        : `/propiedades/ciudad/${normalizedCity || canonicalSegment}`;
    }
  }, [seoUrl, isZoneRoute, canonicalSegment, normalizedCity]);

  useEffect(() => {
    if (!rawSegment) return;
    if (location.pathname !== canonicalPath) {
      navigate(canonicalPath, { replace: true });
    }
  }, [rawSegment, location.pathname, canonicalPath, navigate]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      try {
        const all = await propertyService.getPublicProperties();

        const filtered = all.filter((p) => {
          const status = String(p.status ?? "").toLowerCase();
          if (status && !PUBLIC_STATUSES.has(status)) return false;

          if (normalizedCity) {
            const pCity = normalize(resolveCity(p));
            if (!pCity.includes(normalizedCity)) return false;
          }

          if (inferredType && !matchesType(p.type, inferredType)) {
            return false;
          }

          if (inferredTransaction && !matchesTransaction(p.transactionType, inferredTransaction)) {
            return false;
          }

          return true;
        });

        setProperties(filtered);
        setCurrentPage(1);
      } catch (error) {
        console.error("LocationPage: error cargando propiedades:", error);
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
    { label: "Inicio", href: "/" },
    { label: "Propiedades", href: "/propiedades" },
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
        item: `${BASE_URL}/propiedades`,
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
          itemListElement: paginated.map((property, index) => ({
            "@type": "ListItem",
            position: startIndex + index + 1,
            url: buildPropertyUrl(property),
            name: property.title || `Propiedad en ${cityLabel}`,
          })),
        }
      : null;

  return (
    <div className="min-h-screen bg-dark">
      <Helmet>
        <html lang="es" />
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <meta
          name="robots"
          content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"
        />
        <link rel="canonical" href={seoUrl} />

        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:image" content={`${BASE_URL}/logo.jpg.png`} />
        <meta property="og:image:secure_url" content={`${BASE_URL}/logo.jpg.png`} />
        <meta property="og:url" content={seoUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={COMPANY_NAME} />
        <meta property="og:locale" content="es_CO" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seoTitle} />
        <meta name="twitter:description" content={seoDescription} />
        <meta name="twitter:image" content={`${BASE_URL}/logo.jpg.png`} />

        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>

        {itemListSchema && (
          <script type="application/ld+json">
            {JSON.stringify(itemListSchema)}
          </script>
        )}
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-5">
          <Breadcrumbs items={breadcrumbItems} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6"
        >
          <div>
            <p className="text-xs uppercase tracking-wide text-primary flex items-center gap-2 mb-1">
              <FaMapMarkerAlt /> Zona destacada
            </p>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-light mb-1">
              {h1Label}
            </h1>
            <p className="text-slate-400 text-sm sm:text-base">
              {inferredTransaction
                ? `Propiedades en ${inferredTransaction} con respaldo jurídico en ${cityLabel}.`
                : `Propiedades disponibles con respaldo jurídico en ${cityLabel}.`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/propiedades"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-700 text-slate-200 text-sm hover:border-primary hover:bg-slate-900 transition"
            >
              <FaSearch />
              <span>Ver todo el catálogo</span>
            </Link>
          </div>
        </motion.div>

        <div className="flex items-center justify-between gap-3 mb-4">
          <p className="text-xs sm:text-sm text-slate-400 flex items-center gap-2">
            <FaHome className="text-primary" />
            <span>
              {totalItems} propiedad{totalItems === 1 ? "" : "es"} encontrada
              {totalItems === 1 ? "" : "s"} en {cityLabel}
            </span>
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <FaSearch className="animate-spin text-primary text-4xl mr-3" />
            <p className="text-slate-400 text-sm">
              Cargando propiedades en {cityLabel}...
            </p>
          </div>
        ) : totalItems === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 text-center">
            <FaHome className="text-slate-600 text-4xl mx-auto mb-3" />
            <h2 className="text-light font-bold text-lg sm:text-xl mb-2">
              No encontramos propiedades en esta categoría
            </h2>
            <p className="text-slate-400 text-sm sm:text-base mb-4">
              Puedes revisar el catálogo completo o contactarnos directamente.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/propiedades"
                className="button-gold inline-flex items-center justify-center gap-2"
              >
                <FaSearch />
                <span>Ver todas las propiedades</span>
              </Link>

              <Link
                to="/contacto"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-700 text-slate-200 text-sm hover:border-primary hover:bg-slate-900 transition"
              >
                <FaFilter />
                <span>Solicitar búsqueda personalizada</span>
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {paginated.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-6">
                <button
                  onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                  disabled={safePage === 1}
                  className="px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-200 disabled:opacity-40 hover:border-primary/60 transition inline-flex items-center gap-2 text-sm"
                >
                  <FaChevronLeft />
                  <span>Anterior</span>
                </button>

                <span className="text-xs text-slate-400">
                  Página{" "}
                  <span className="text-slate-200 font-semibold">{safePage}</span>{" "}
                  de{" "}
                  <span className="text-slate-200 font-semibold">
                    {totalPages}
                  </span>
                </span>

                <button
                  onClick={() =>
                    setCurrentPage((page) => Math.min(page + 1, totalPages))
                  }
                  disabled={safePage === totalPages}
                  className="px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-200 disabled:opacity-40 hover:border-primary/60 transition inline-flex items-center gap-2 text-sm"
                >
                  <span>Siguiente</span>
                  <FaChevronRight />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LocationPage;