// src/modules/public/pages/PropertyDetailPage.jsx
// ─────────────────────────────────────────────────────────────
// Detalle editorial — Inmobiliaria Rincón Bedoya & Asociados
// · Diseño tokenizado (sin bg-[var(--color-surface)] ni chispero de colores)
// · SEO robusto: OG con imagen real de la propiedad
// · Schema.org completo (RealEstateListing + Breadcrumbs + Residence)
// · Twitter cards, locale, alt text, OG price tags
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  SeoHead,
  buildBreadcrumbSchema,
  buildRealEstateListingSchema,
} from "../../../shared/components/SEO";
import {
  FaBed, FaBath, FaRulerCombined, FaCar, FaMapMarkerAlt,
  FaArrowLeft, FaCheckCircle, FaWhatsapp, FaShare,
  FaHeart, FaRegHeart, FaSpinner, FaHome, FaLayerGroup,
  FaCalendarAlt, FaArrowRight, FaBalanceScale, FaShieldAlt,
  FaPhone,
} from "react-icons/fa";
import toast from "react-hot-toast";
import propertyService from "../../properties/services/property.service";
import ImageGallery from "../components/ImageGallery";
import PropertyContactForm from "../components/PropertyContactForm";
import PropertyMap from "../../properties/components/PropertyMap";
import Breadcrumbs from "../../../shared/components/UI/Breadcrumbs";
import { useFavorites } from "../../clients/hooks/useFavorites";
import { useReducedMotion } from "../../../shared/hooks/useReducedMotion";

import { SITE_URL as BASE_URL } from '../../../core/config/site.config';

/* ═══════════════════════════════════════════════════════════ */
/*  CONSTANTS                                                   */
/* ═══════════════════════════════════════════════════════════ */
const COMPANY_NAME  = "Inmobiliaria Rincón Bedoya y Asociados";
const COMPANY_PHONE = "573105968202";
const DEFAULT_OG    = `${BASE_URL}/og-default.jpg`;

/* ═══════════════════════════════════════════════════════════ */
/*  HELPERS                                                     */
/* ═══════════════════════════════════════════════════════════ */

const extractIdFromSlug = (s) => {
  if (!s) return null;
  const idx = s.lastIndexOf("-");
  if (idx === -1) return s;
  return s.substring(idx + 1) || s;
};

const normalize = (str = "") =>
  String(str).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-").replace(/^-+|-+$/g, "");

const normalizeAbsoluteUrl = (url) => {
  const v = String(url || "").trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  return `${BASE_URL}${v.startsWith("/") ? "" : "/"}${v}`;
};

const getTransactionLabel = (tx) => {
  const t = String(tx || "").toLowerCase();
  if (["sale", "venta", "compra"].includes(t))               return "Venta";
  if (["rent", "arriendo", "alquiler", "renta"].includes(t)) return "Arriendo";
  return "Propiedad";
};

const getTransactionSlug = (tx = "") => {
  const l = String(tx).toLowerCase();
  if (l.includes("sale") || l.includes("venta") || l.includes("compra"))                             return "venta";
  if (l.includes("rent") || l.includes("arriendo") || l.includes("alquiler") || l.includes("renta")) return "arriendo";
  return "";
};

const getTypeLabel = (t = "") => {
  const v = String(t).toLowerCase();
  if (v.includes("casa")) return "Casa";
  if (v.includes("apart")) return "Apartamento";
  if (v.includes("lote")) return "Lote";
  if (v.includes("local")) return "Local";
  if (v.includes("finca")) return "Finca";
  if (v.includes("oficina")) return "Oficina";
  if (v.includes("bodega")) return "Bodega";
  return "Propiedad";
};

const getTypeSlug = (t = "") => {
  const l = String(t).toLowerCase();
  if (l.includes("casa")) return "casa";
  if (l.includes("apart")) return "apartamento";
  if (l.includes("lote")) return "lote";
  if (l.includes("finca")) return "finca";
  if (l.includes("local") || l.includes("comercial")) return "local";
  if (l.includes("oficina")) return "oficina";
  if (l.includes("bodega")) return "bodega";
  return "propiedad";
};

const getTypeCollectionSlug = (t = "") => {
  const l = String(t).toLowerCase();
  if (l.includes("casa")) return "casas";
  if (l.includes("apart")) return "apartamentos";
  if (l.includes("lote")) return "lotes";
  if (l.includes("finca")) return "fincas";
  if (l.includes("local") || l.includes("comercial")) return "locales";
  if (l.includes("oficina")) return "oficinas";
  if (l.includes("bodega")) return "bodegas";
  return "propiedades";
};

const getPropertyType = (t) => getTypeLabel(t) === "Local" ? "Local Comercial" : getTypeLabel(t);

const formatPrice = (price) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", minimumFractionDigits: 0,
  }).format(Number(price || 0));

const formatPriceShort = (price, isRent = false) => {
  const n = Number(price) || 0;
  if (n === 0) return null;
  let num, unit;
  if (n >= 1_000_000_000) { num = (n / 1_000_000_000).toFixed(1).replace(/\.0$/, ""); unit = "B"; }
  else if (n >= 1_000_000) { num = (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, ""); unit = "M"; }
  else if (n >= 1_000)     { num = (n / 1_000).toFixed(0); unit = "K"; }
  else                      { num = String(n); unit = ""; }
  return { num, unit, suffix: isRent ? "/ mes" : "" };
};

const toIsoDate = (v) => {
  if (!v) return undefined;
  if (typeof v?.toDate === "function") return v.toDate().toISOString();
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  return undefined;
};

const resolveCity         = (p) => String(p?.location?.city ?? p?.city ?? "").trim();
const resolveDepartment   = (p) => String(p?.location?.department ?? p?.department ?? "Caldas").trim();
const resolveNeighborhood = (p) => String(p?.location?.neighborhood ?? p?.neighborhood ?? "").trim();
const resolveAddress      = (p) => String(p?.location?.addressPublic ?? p?.address ?? "").trim();
const resolveLat          = (p) => p?.location?.geo?.lat ?? p?.latitude ?? null;
const resolveLng          = (p) => p?.location?.geo?.lng ?? p?.longitude ?? null;
const resolveRooms        = (p) => p?.features?.rooms ?? p?.features?.bedrooms ?? p?.rooms ?? p?.bedrooms ?? null;
const resolveArea         = (p) => p?.features?.builtArea ?? p?.area ?? null;
const resolveBathrooms    = (p) => p?.features?.bathrooms ?? p?.bathrooms ?? null;
const resolveParking      = (p) => p?.features?.parking ?? p?.parkingSpots ?? null;
const resolveFloors       = (p) => p?.features?.floor ?? p?.floors ?? null;
const resolveYearBuilt    = (p) => p?.features?.yearBuilt ?? p?.yearBuilt ?? null;
const resolveStratum      = (p) => p?.location?.stratum ?? p?.stratum ?? null;
const resolvePrice        = (p) => p?.price?.sale ?? p?.price?.rent ?? p?.price ?? null;

const getOfferAvailability = (status) => {
  const v = String(status || "").toLowerCase();
  if (v === "vendida" || v === "sold") return "https://schema.org/SoldOut";
  if (v === "reservada" || v === "reserved") return "https://schema.org/LimitedAvailability";
  return "https://schema.org/InStock";
};

const getResidenceSchemaType = (t = "") => {
  const l = String(t).toLowerCase();
  if (l.includes("apart")) return "Apartment";
  if (l.includes("casa")) return "House";
  if (l.includes("finca")) return "SingleFamilyResidence";
  return "Residence";
};

const buildCanonicalPropertyUrl = (property, fallbackSlug = "") => {
  if (!property?.id) return `${BASE_URL}/propiedades/${fallbackSlug}`;
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
};

const buildTypeCityLandingUrl = (property) => {
  const citySlug = normalize(resolveCity(property));
  const typeSlug = getTypeCollectionSlug(property?.type);
  const txSlug = getTransactionSlug(property?.transactionType);
  if (!citySlug || !typeSlug) return null;
  if (txSlug) return `${BASE_URL}/propiedades/zona/${typeSlug}-en-${txSlug}-${citySlug}`;
  return `${BASE_URL}/propiedades/zona/${typeSlug}-en-${citySlug}`;
};

/* ═══════════════════════════════════════════════════════════ */
/*  COMPONENTE                                                  */
/* ═══════════════════════════════════════════════════════════ */

const PropertyDetailPage = () => {
  const { slugId, slugOrCity } = useParams();
  const currentSlug = slugId || slugOrCity || "";
  const realId = useMemo(() => extractIdFromSlug(currentSlug), [currentSlug]);

  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [featuresExpanded, setFeaturesExpanded] = useState(false);
  const { isFavorite, toggleFavorite } = useFavorites();
  const reducedMotion = useReducedMotion();

  const loadProperty = async () => {
    setLoading(true);
    try {
      if (!realId) { setProperty(null); return; }
      const data = await propertyService.getPublicPropertyById(realId);
      setProperty(data || null);
    } catch (err) {
      console.error("Error cargando propiedad:", err);
      toast.error("No se pudo cargar esta propiedad.");
      setProperty(null);
    } finally {
      setLoading(false);
      if (typeof window !== "undefined") window.prerenderReady = true;
    }
  };

  useEffect(() => { loadProperty(); /* eslint-disable-next-line */ }, [realId]);

  /* ── Valores derivados ────────────────────────────────── */
  const city         = useMemo(() => resolveCity(property),         [property]);
  const department   = useMemo(() => resolveDepartment(property),   [property]);
  const neighborhood = useMemo(() => resolveNeighborhood(property), [property]);
  const addressPublic = useMemo(() => resolveAddress(property),     [property]);
  const lat          = useMemo(() => resolveLat(property),          [property]);
  const lng          = useMemo(() => resolveLng(property),          [property]);
  const rooms        = useMemo(() => resolveRooms(property),        [property]);
  const area         = useMemo(() => resolveArea(property),         [property]);
  const bathrooms    = useMemo(() => resolveBathrooms(property),    [property]);
  const parkingSpots = useMemo(() => resolveParking(property),      [property]);
  const price        = useMemo(() => resolvePrice(property),        [property]);

  const transactionLabel = useMemo(() => getTransactionLabel(property?.transactionType), [property]);
  const typeLabel        = useMemo(() => getPropertyType(property?.type), [property]);
  const typeLabelSeo     = useMemo(() => getTypeLabel(property?.type), [property]);
  const isVenta = transactionLabel === "Venta";
  const formattedPrice = price ? formatPrice(price) : null;
  const priceParts = useMemo(() => formatPriceShort(price, !isVenta), [price, isVenta]);

  const amenities = useMemo(
    () => [...(property?.amenities || []), ...(property?.customAmenities || [])].filter(Boolean),
    [property]
  );

  const baseFeatures = useMemo(() => {
    const items = [];
    const floors = resolveFloors(property);
    const stratum = resolveStratum(property);
    const yearBuilt = resolveYearBuilt(property);
    if (floors != null)     items.push({ icon: FaLayerGroup,  label: `Piso ${floors}` });
    if (stratum != null)    items.push({ icon: FaCheckCircle, label: `Estrato ${stratum}` });
    if (yearBuilt != null)  items.push({ icon: FaCalendarAlt, label: `Año ${yearBuilt}` });
    return items;
  }, [property]);

  const allFeatures = useMemo(
    () => [...baseFeatures, ...amenities.map((a) => ({ icon: FaCheckCircle, label: a }))],
    [baseFeatures, amenities]
  );

  const COLLAPSE_COUNT = 10;
  const visibleFeatures = featuresExpanded ? allFeatures : allFeatures.slice(0, COLLAPSE_COUNT);

  const allImages = useMemo(() => {
    const merged = [
      ...(property?.media?.photos?.map((p) => p?.url) || []),
      ...(property?.images || []),
    ].map(normalizeAbsoluteUrl).filter(Boolean);
    return [...new Set(merged)];
  }, [property]);

  /* ── SEO image: real de la propiedad, con fallback dorado ── */
  const seoImage = allImages[0] || DEFAULT_OG;

  const canonicalUrl = useMemo(
    () => buildCanonicalPropertyUrl(property, currentSlug),
    [property, currentSlug]
  );

  /* ── SEO title/desc: rico en contexto ──────────────────── */
  const seoTitle = property
    ? `${typeLabelSeo} ${isVenta ? "en venta" : "en arriendo"}${city ? ` en ${city}` : ""}${rooms ? ` · ${rooms} hab` : ""}${formattedPrice && isVenta ? ` · ${formattedPrice}` : ""} | ${COMPANY_NAME}`
    : `Propiedad | ${COMPANY_NAME}`;

  const seoDescription = property
    ? `${typeLabelSeo} ${isVenta ? "en venta" : "en arriendo"}${city ? ` en ${city}` : ""}${rooms ? `, ${rooms} habitaciones` : ""}${bathrooms ? `, ${bathrooms} baños` : ""}${area ? `, ${area} m²` : ""}${formattedPrice ? `. ${isVenta ? "Precio" : "Canon mensual"}: ${formattedPrice}` : ""}. Verificación jurídica completa por ${COMPANY_NAME}.`
    : `Encuentra propiedades en venta y arriendo con respaldo jurídico en ${COMPANY_NAME}.`;

  const offerAvailability = getOfferAvailability(property?.status);
  const citySlug = normalize(city);
  const cityLandingUrl = citySlug ? `${BASE_URL}/propiedades/zona/${citySlug}` : null;
  const typeCityLandingUrl = buildTypeCityLandingUrl(property);

  const hasGeo = lat != null && lng != null && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng));
  const geoObject = hasGeo ? { "@type": "GeoCoordinates", latitude: Number(lat), longitude: Number(lng) } : undefined;

  const floorSizeObject = area != null ? { "@type": "QuantitativeValue", value: Number(area), unitCode: "MTK" } : undefined;
  const amenityFeatures = amenities.length > 0
    ? amenities.map((a) => ({ "@type": "LocationFeatureSpecification", name: a, value: true }))
    : undefined;

  const imageObjects = allImages.length > 0
    ? allImages.map((url, i) => ({
        "@type": "ImageObject", url, contentUrl: url,
        caption: property?.title || `${typeLabelSeo} en ${city || "Caldas"} - ${COMPANY_NAME}`,
        representativeOfPage: i === 0,
      }))
    : [{ "@type": "ImageObject", url: seoImage, contentUrl: seoImage, caption: `Propiedad en ${city || "Caldas"}`, representativeOfPage: true }];

  const additionalProperty = [
    bathrooms != null    && { "@type": "PropertyValue", name: "Baños",        value: bathrooms },
    parkingSpots != null && { "@type": "PropertyValue", name: "Parqueaderos", value: parkingSpots },
    resolveStratum(property) != null && { "@type": "PropertyValue", name: "Estrato", value: resolveStratum(property) },
    resolveYearBuilt(property) != null && { "@type": "PropertyValue", name: "Año de construcción", value: resolveYearBuilt(property) },
  ].filter(Boolean);

  const mainEntity = property && !String(property?.type || "").toLowerCase().includes("lote")
    ? {
        "@type": getResidenceSchemaType(property?.type),
        name: property?.title || seoTitle,
        description: seoDescription,
        url: canonicalUrl,
        image: allImages.length > 0 ? allImages : [seoImage],
        numberOfRooms: rooms != null ? Number(rooms) : undefined,
        numberOfBedrooms: rooms != null ? Number(rooms) : undefined,
        numberOfBathroomsTotal: bathrooms != null ? Number(bathrooms) : undefined,
        floorSize: floorSizeObject,
        amenityFeature: amenityFeatures,
        address: {
          "@type": "PostalAddress",
          streetAddress: addressPublic || "",
          addressLocality: city || "Anserma",
          addressRegion: department || "Caldas",
          addressCountry: "CO",
        },
        geo: geoObject,
      }
    : undefined;

  const breadcrumbsSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio",      item: `${BASE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Propiedades", item: `${BASE_URL}/catalogo` },
      ...(cityLandingUrl     ? [{ "@type": "ListItem", position: 3, name: `Propiedades en ${city}`, item: cityLandingUrl }] : []),
      ...(typeCityLandingUrl ? [{ "@type": "ListItem", position: cityLandingUrl ? 4 : 3, name: `${getTypeCollectionSlug(property?.type)} en ${String(transactionLabel).toLowerCase()} ${city}`.trim(), item: typeCityLandingUrl }] : []),
      { "@type": "ListItem", position: typeCityLandingUrl ? (cityLandingUrl ? 5 : 4) : cityLandingUrl ? 4 : 3, name: property?.title || seoTitle, item: canonicalUrl },
    ],
  };

  const realEstateListing = property ? {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: property.title || seoTitle,
    description: seoDescription,
    url: canonicalUrl,
    mainEntityOfPage: canonicalUrl,
    image: imageObjects,
    datePosted: toIsoDate(property.createdAt || property.created_at || property.updatedAt),
    category: `${transactionLabel} de ${typeLabelSeo}`,
    address: {
      "@type": "PostalAddress",
      streetAddress: addressPublic || "",
      addressLocality: city || "Anserma",
      addressRegion: department || "Caldas",
      addressCountry: "CO",
    },
    geo: geoObject,
    numberOfRooms: rooms != null ? Number(rooms) : undefined,
    floorSize: floorSizeObject,
    amenityFeature: amenityFeatures,
    additionalProperty: additionalProperty.length > 0 ? additionalProperty : undefined,
    mainEntity,
    offers: {
      "@type": "Offer",
      price: price ?? undefined,
      priceCurrency: "COP",
      availability: offerAvailability,
      url: canonicalUrl,
      itemCondition: "https://schema.org/UsedCondition",
      seller: { "@type": "RealEstateAgent", name: COMPANY_NAME, url: BASE_URL, telephone: `+${COMPANY_PHONE}` },
    },
  } : null;

  const fullSchemaList = realEstateListing && breadcrumbsSchema
    ? [realEstateListing, breadcrumbsSchema]
    : realEstateListing || breadcrumbsSchema || null;

  /* ── Handlers ─────────────────────────────────────────── */
  const isFavoriteProperty = useMemo(
    () => (property?.id ? isFavorite(property.id) : false),
    [property, isFavorite]
  );

  const handleShare = async () => {
    const url = canonicalUrl || window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: property?.title || "Propiedad",
          text: `${typeLabelSeo} ${isVenta ? "en venta" : "en arriendo"}${city ? ` en ${city}` : ""}${formattedPrice ? ` · ${formattedPrice}` : ""}`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("¡Link copiado al portapapeles!");
      }
    } catch {}
  };

  const handleFavorite = () => {
    if (!property?.id) return;
    toggleFavorite(property.id);
    toast.success(isFavoriteProperty ? "Eliminado de favoritos" : "¡Agregado a favoritos!");
  };

  const handleWhatsApp = () => {
    const msg = `Hola, estoy interesado en: ${property?.title || "una propiedad"}\n\n${canonicalUrl}`;
    window.open(`https://wa.me/${COMPANY_PHONE}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  /* ══════════════════════════════════════════════════════ */
  /*  LOADING / NOT FOUND                                    */
  /* ══════════════════════════════════════════════════════ */
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center">
          <FaSpinner
            className="animate-spin mx-auto mb-4"
            style={{ color: "var(--color-gold, #b45309)", fontSize: "2.5rem" }}
          />
          <p style={{ color: "var(--color-text-muted)" }}>Cargando propiedad...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <SeoHead
          title={`Propiedad no encontrada | ${COMPANY_NAME}`}
          description="Esta propiedad ya no está disponible o la URL es incorrecta. Explora el catálogo completo de propiedades verificadas."
          path="/catalogo"
          noindex
          nofollow={false}
        />
        <div className="text-center max-w-md">
          <FaHome
            className="mx-auto mb-4"
            style={{ color: "var(--color-text-faint)", fontSize: "3rem" }}
          />
          <h1 className="heading-section text-3xl mb-3">
            Propiedad <em>no encontrada</em>
          </h1>
          <p style={{ color: "var(--color-text-muted)" }} className="mb-6">
            Esta propiedad ya no está disponible o la URL es incorrecta.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/catalogo" className="btn-primary">
              Ver todas las propiedades
            </Link>
            <Link to="/contacto" className="btn-secondary">
              Buscar con un asesor
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const breadcrumbItems = [
    { label: "Inicio", href: "/" },
    { label: "Propiedades", href: "/catalogo" },
    ...(citySlug ? [{ label: `Propiedades en ${city}`, href: `/propiedades/zona/${citySlug}` }] : []),
    { label: property.title || "Detalle" },
  ];

  const acceptsVisits = !["vendida", "sold", "inactiva", "draft", "eliminada"].includes(
    String(property?.status || "").toLowerCase()
  );

  /* ══════════════════════════════════════════════════════ */
  /*  RENDER                                                 */
  /* ══════════════════════════════════════════════════════ */

  return (
    <div>
      <SeoHead
        title={seoTitle}
        description={seoDescription}
        path={canonicalUrl.replace(BASE_URL, "")}
        image={seoImage}
        imageAlt={property?.title || `${typeLabelSeo} en ${city}`}
        type="website"
        price={price || undefined}
        priceCurrency="COP"
        availability={
          ["vendida", "sold"].includes(String(property?.status || "").toLowerCase())
            ? "out of stock"
            : "in stock"
        }
        publishedTime={toIsoDate(property?.createdAt || property?.created_at)}
        modifiedTime={toIsoDate(property?.updatedAt || property?.updated_at)}
        structuredData={[
          buildRealEstateListingSchema(
            {
              ...property,
              title: property.title,
              description: seoDescription,
              price,
              status: property.status,
              type: property.type,
              transactionType: property.transactionType,
              rooms,
              bathrooms,
              area,
              images: allImages,
              city,
              department,
              address: addressPublic,
              lat,
              lng,
              createdAt: property.createdAt,
              updatedAt: property.updatedAt,
              amenities: property.amenities,
              customAmenities: property.customAmenities,
              features: property.features,
            },
            canonicalUrl,
          ),
          buildBreadcrumbSchema([
            { name: "Inicio",       url: "/" },
            { name: "Propiedades",  url: "/catalogo" },
            ...(cityLandingUrl ? [{
              name: `Propiedades en ${city}`,
              url: cityLandingUrl,
            }] : []),
            ...(typeCityLandingUrl ? [{
              name: `${getTypeCollectionSlug(property?.type)} en ${String(transactionLabel).toLowerCase()} ${city}`.trim(),
              url: typeCityLandingUrl,
            }] : []),
            { name: property?.title || seoTitle },
          ]),
        ].filter(Boolean)}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="mb-5">
          <Breadcrumbs items={breadcrumbItems} />
        </div>

        {/* ═══ Toolbar superior ═══ */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8"
        >
          <Link to="/catalogo" className="detail-back-link">
            <FaArrowLeft className="text-xs" />
            <span>Volver al catálogo</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleFavorite}
              className={`detail-action-btn ${isFavoriteProperty ? "is-active-fav" : ""}`}
              aria-label={isFavoriteProperty ? "Quitar de favoritos" : "Agregar a favoritos"}
            >
              {isFavoriteProperty ? <FaHeart /> : <FaRegHeart />}
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="detail-action-btn"
              aria-label="Compartir"
            >
              <FaShare />
            </button>

            <button
              type="button"
              onClick={handleWhatsApp}
              className="btn-primary detail-wa-btn"
              aria-label="Contactar por WhatsApp"
            >
              <FaWhatsapp />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>
          </div>
        </motion.div>

        {/* ═══ Grid principal ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">

          {/* ─── Columna izquierda ─── */}
          <div className="lg:col-span-2 space-y-5 sm:space-y-6">

            {/* Galería */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="detail-gallery-wrap"
            >
              <ImageGallery images={allImages} propertyTitle={property.title} />
            </motion.div>

            {/* Info principal */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="detail-card"
            >
              {/* Chips */}
              <div className="flex flex-wrap items-center gap-2 mb-5">
                <span className="detail-chip detail-chip--type">{typeLabel}</span>
                <span className={`detail-chip detail-chip--tx ${isVenta ? "is-sale" : "is-rent"}`}>
                  {transactionLabel}
                </span>
                {["disponible", "available", "published", "active"].includes(
                  String(property.status || "").toLowerCase()
                ) && (
                  <span className="detail-chip detail-chip--available">
                    <span className="detail-chip__dot" />
                    Disponible
                  </span>
                )}
                {["reservada", "reserved"].includes(
                  String(property.status || "").toLowerCase()
                ) && (
                  <span className="detail-chip detail-chip--reserved">Reservada</span>
                )}
              </div>

              {/* Título + precio */}
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 md:items-end">
                <div className="min-w-0">
                  <h1 className="detail-title">
                    {property.title || "Propiedad sin título"}
                  </h1>
                  <div className="detail-location">
                    <FaMapMarkerAlt className="detail-location__icon" />
                    <span>
                      {addressPublic && <span>{addressPublic}</span>}
                      {city && <span>{addressPublic ? ", " : ""}{city}</span>}
                      {department && <span>, {department}</span>}
                    </span>
                  </div>
                </div>

                {/* Precio editorial */}
                <div className="detail-price-block">
                  {priceParts ? (
                    <>
                      <p className="detail-price">
                        <span className="detail-price__currency">$</span>
                        <span className="detail-price__num">{priceParts.num}</span>
                        {priceParts.unit && (
                          <span className="detail-price__unit">{priceParts.unit}</span>
                        )}
                        {priceParts.suffix && (
                          <span className="detail-price__suffix">{priceParts.suffix}</span>
                        )}
                      </p>
                      <p className="detail-price__label">{formatPrice(price)}</p>
                    </>
                  ) : (
                    <p className="detail-price detail-price--ask">Consultar precio</p>
                  )}
                </div>
              </div>

              {/* Stats grid */}
              {(area != null || rooms != null || bathrooms != null || parkingSpots != null) && (
                <div className="detail-stats">
                  {area != null && (
                    <div className="detail-stat">
                      <FaRulerCombined className="detail-stat__icon" />
                      <span className="detail-stat__value">
                        {area}<span className="detail-stat__unit"> m²</span>
                      </span>
                      <span className="detail-stat__label">Área</span>
                    </div>
                  )}
                  {rooms != null && (
                    <div className="detail-stat">
                      <FaBed className="detail-stat__icon" />
                      <span className="detail-stat__value">{rooms}</span>
                      <span className="detail-stat__label">Habitaciones</span>
                    </div>
                  )}
                  {bathrooms != null && (
                    <div className="detail-stat">
                      <FaBath className="detail-stat__icon" />
                      <span className="detail-stat__value">{bathrooms}</span>
                      <span className="detail-stat__label">Baños</span>
                    </div>
                  )}
                  {parkingSpots != null && (
                    <div className="detail-stat">
                      <FaCar className="detail-stat__icon" />
                      <span className="detail-stat__value">{parkingSpots}</span>
                      <span className="detail-stat__label">Parqueaderos</span>
                    </div>
                  )}
                </div>
              )}

              {/* Descripción */}
              {property.description && (
                <div
                  className="mt-6 pt-6"
                  style={{ borderTop: "1px solid var(--color-divider)" }}
                >
                  <h2 className="detail-section-title">Descripción</h2>
                  <p className="detail-description">{property.description}</p>
                </div>
              )}
            </motion.div>

            {/* Características */}
            {allFeatures.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="detail-card"
              >
                <div className="flex items-center justify-between gap-3 mb-5">
                  <h2 className="detail-section-title mb-0">Características</h2>
                  {allFeatures.length > COLLAPSE_COUNT && (
                    <button
                      type="button"
                      onClick={() => setFeaturesExpanded((v) => !v)}
                      className="detail-features-toggle"
                    >
                      {featuresExpanded ? "Ver menos" : `Ver todas (${allFeatures.length})`}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {visibleFeatures.map((item, i) => {
                    const Icon = item.icon || FaCheckCircle;
                    return (
                      <div key={`f-${i}`} className="detail-feature-item">
                        <Icon className="detail-feature-item__icon" />
                        <span>{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Ubicación + mapa */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="detail-card"
            >
              <h2 className="detail-section-title">Ubicación</h2>
              <div className="detail-map-wrap">
                <PropertyMap
                  address={addressPublic}
                  city={city}
                  department={department}
                  neighborhood={neighborhood}
                  latitude={lat}
                  longitude={lng}
                />
              </div>
              <p className="detail-map-caption">
                <FaMapMarkerAlt className="text-xs" style={{ color: "var(--color-gold, #b45309)" }} />
                <span>
                  {addressPublic && `${addressPublic}, `}
                  {city}
                  {department && `, ${department}`}
                </span>
              </p>
            </motion.div>

            {/* Promesa editorial */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="detail-promise"
            >
              <span className="eyebrow mb-4">Nuestro compromiso</span>
              <h3 className="detail-promise__title">
                Esta propiedad pasó por <em>nuestro equipo jurídico.</em>
              </h3>
              <div className="detail-promise__grid">
                <div className="detail-promise__item">
                  <FaBalanceScale className="detail-promise__icon" />
                  <span>Verificación de tradición y libertad</span>
                </div>
                <div className="detail-promise__item">
                  <FaShieldAlt className="detail-promise__icon" />
                  <span>Acompañamiento en notaría</span>
                </div>
                <div className="detail-promise__item">
                  <FaCheckCircle className="detail-promise__icon" />
                  <span>Sin letras pequeñas</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* ─── Columna derecha (sticky) ─── */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-1"
          >
            <div className="lg:sticky lg:top-24 space-y-4">

              {/* Agendar visita */}
              {acceptsVisits && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="detail-visit-card"
                >
                  <span className="eyebrow mb-3">Visita guiada</span>
                  <h3 className="detail-visit-card__title">
                    ¿Te interesa? <em>Agendemos una visita.</em>
                  </h3>
                  <p className="detail-visit-card__desc">
                    Un asesor te acompaña sin costo. Agenda horario y recibe confirmación en minutos.
                  </p>
                  <Link
                    to={`/agendar-visita?propertyId=${property.id}`}
                    className="btn-primary w-full"
                  >
                    <FaCalendarAlt />
                    Agendar visita
                  </Link>
                  <div className="detail-visit-card__perks">
                    <span>Gratis</span>
                    <span className="detail-visit-card__dot" />
                    <span>Sin compromiso</span>
                    <span className="detail-visit-card__dot" />
                    <span>Confirmación en horas</span>
                  </div>
                </motion.div>
              )}

              {/* Contact form */}
              <PropertyContactForm
                propertyTitle={property.title}
                propertyId={property.id}
              />

              {/* Contacto rápido */}
              <div className="detail-quick-contact">
                <span className="eyebrow mb-3">Contacto directo</span>
                <a href={`tel:+${COMPANY_PHONE}`} className="detail-quick-contact__link">
                  <FaPhone className="detail-quick-contact__icon" />
                  <div className="flex-1">
                    <span className="detail-quick-contact__label">Llamar</span>
                    <span className="detail-quick-contact__value">+57 310 596 8202</span>
                  </div>
                  <FaArrowRight className="text-xs" style={{ color: "var(--color-text-faint)" }} />
                </a>
                <button
                  type="button"
                  onClick={handleWhatsApp}
                  className="detail-quick-contact__link detail-quick-contact__link--wa"
                >
                  <FaWhatsapp className="detail-quick-contact__icon" style={{ color: "#25d366" }} />
                  <div className="flex-1">
                    <span className="detail-quick-contact__label">WhatsApp</span>
                    <span className="detail-quick-contact__value">Respuesta inmediata</span>
                  </div>
                  <FaArrowRight className="text-xs" style={{ color: "var(--color-text-faint)" }} />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetailPage;