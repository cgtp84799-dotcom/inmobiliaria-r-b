import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import {
  FaBed,
  FaBath,
  FaRuler,
  FaCar,
  FaMapMarkerAlt,
  FaArrowLeft,
  FaCheckCircle,
  FaWhatsapp,
  FaShare,
  FaHeart,
  FaRegHeart,
  FaSpinner,
  FaHome,
  FaLayerGroup,
  FaCalendarAlt,
} from "react-icons/fa";
import toast from "react-hot-toast";
import propertyService from "../../properties/services/property.service";
import ImageGallery from "../components/ImageGallery";
import PropertyContactForm from "../components/PropertyContactForm";
import PropertyMap from "../../properties/components/PropertyMap";
import Breadcrumbs from "../../../shared/components/UI/Breadcrumbs";

const BASE_URL = "https://inmobiliaria-ryb-y-asociados.com";
const COMPANY_NAME = "Inmobiliaria Rincón Bedoya y Asociados";
const COMPANY_PHONE = "573105968202";

const extractIdFromSlug = (slugValue) => {
  if (!slugValue) return null;
  const lastDash = slugValue.lastIndexOf("-");
  if (lastDash === -1) return slugValue;
  const id = slugValue.substring(lastDash + 1);
  return id || slugValue;
};

const normalize = (str = "") =>
  String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

const normalizeAbsoluteUrl = (url) => {
  const value = String(url || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${BASE_URL}${value.startsWith("/") ? "" : "/"}${value}`;
};

const getTransactionLabel = (transactionType) => {
  const t = String(transactionType || "").toLowerCase();
  if (["sale", "venta", "compra"].includes(t)) return "Venta";
  if (["rent", "arriendo", "alquiler", "renta"].includes(t)) return "Arriendo";
  return "Propiedad";
};

const getTransactionSlug = (transactionType = "") => {
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
};

const getTypeLabel = (type) => {
  const value = String(type || "").toLowerCase();
  if (value.includes("casa")) return "Casa";
  if (value.includes("apart")) return "Apartamento";
  if (value.includes("lote")) return "Lote";
  if (value.includes("local")) return "Local";
  if (value.includes("finca")) return "Finca";
  if (value.includes("oficina")) return "Oficina";
  if (value.includes("bodega")) return "Bodega";
  return "Propiedad";
};

const getTypeSlug = (type = "") => {
  const lower = String(type).toLowerCase();
  if (lower.includes("casa")) return "casa";
  if (lower.includes("apart")) return "apartamento";
  if (lower.includes("lote")) return "lote";
  if (lower.includes("finca")) return "finca";
  if (lower.includes("local") || lower.includes("comercial")) return "local";
  if (lower.includes("oficina")) return "oficina";
  if (lower.includes("bodega")) return "bodega";
  return "propiedad";
};

const getTypeCollectionSlug = (type = "") => {
  const lower = String(type).toLowerCase();
  if (lower.includes("casa")) return "casas";
  if (lower.includes("apart")) return "apartamentos";
  if (lower.includes("lote")) return "lotes";
  if (lower.includes("finca")) return "fincas";
  if (lower.includes("local") || lower.includes("comercial")) return "locales";
  if (lower.includes("oficina")) return "oficinas";
  if (lower.includes("bodega")) return "bodegas";
  return "propiedades";
};

const getPropertyType = (type) => {
  const types = {
    house: "Casa",
    casa: "Casa",
    apartment: "Apartamento",
    apartamento: "Apartamento",
    lot: "Lote",
    lote: "Lote",
    farm: "Finca",
    finca: "Finca",
    commercial: "Local Comercial",
    local: "Local Comercial",
    office: "Oficina",
    oficina: "Oficina",
    warehouse: "Bodega",
    bodega: "Bodega",
  };

  const lower = String(type || "").toLowerCase();
  return types[lower] || getTypeLabel(type);
};

const getTransactionType = (type) => {
  if (!type) return "No especificado";
  const lower = String(type).toLowerCase();
  if (["sale", "venta", "sell", "compra"].includes(lower)) return "Venta";
  if (["rent", "arriendo", "alquiler", "renta"].includes(lower)) {
    return "Arriendo";
  }
  return type;
};

const formatPrice = (price) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(Number(price || 0));

const toIsoDate = (value) => {
  if (!value) return undefined;

  if (typeof value?.toDate === "function") {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  }

  return undefined;
};

const resolveCity = (property) =>
  String(property?.location?.city ?? property?.city ?? "").trim();

const resolveDepartment = (property) =>
  String(property?.location?.department ?? property?.department ?? "Caldas").trim();

const resolveNeighborhood = (property) =>
  String(property?.location?.neighborhood ?? property?.neighborhood ?? "").trim();

const resolveAddress = (property) =>
  String(
    property?.location?.addressPublic ??
      property?.address ??
      "Dirección no disponible"
  ).trim();

const resolveLat = (property) =>
  property?.location?.geo?.lat ?? property?.latitude ?? null;

const resolveLng = (property) =>
  property?.location?.geo?.lng ?? property?.longitude ?? null;

const resolveRooms = (property) =>
  property?.features?.rooms ??
  property?.features?.bedrooms ??
  property?.rooms ??
  property?.bedrooms ??
  null;

const resolveArea = (property) =>
  property?.features?.builtArea ?? property?.area ?? null;

const resolveBathrooms = (property) =>
  property?.features?.bathrooms ?? property?.bathrooms ?? null;

const resolveParking = (property) =>
  property?.features?.parking ?? property?.parkingSpots ?? null;

const resolveFloors = (property) =>
  property?.features?.floor ?? property?.floors ?? null;

const resolveYearBuilt = (property) =>
  property?.features?.yearBuilt ?? property?.yearBuilt ?? null;

const resolveStratum = (property) =>
  property?.location?.stratum ?? property?.stratum ?? null;

const resolvePrice = (property) =>
  property?.price?.sale ?? property?.price?.rent ?? property?.price ?? null;

const getOfferAvailability = (status) => {
  const value = String(status || "").toLowerCase();

  if (value === "vendida" || value === "sold") {
    return "https://schema.org/SoldOut";
  }

  if (value === "reservada" || value === "reserved") {
    return "https://schema.org/LimitedAvailability";
  }

  return "https://schema.org/InStock";
};

const getResidenceSchemaType = (type = "") => {
  const lower = String(type).toLowerCase();

  if (lower.includes("apart")) return "Apartment";
  if (lower.includes("casa")) return "House";
  if (lower.includes("finca")) return "SingleFamilyResidence";
  return "Residence";
};

const buildCanonicalPropertyUrl = (property, fallbackSlug = "") => {
  if (!property?.id) {
    return `${BASE_URL}/propiedades/${fallbackSlug}`;
  }

  const transaction = getTransactionSlug(property?.transactionType);
  const type = getTypeSlug(property?.type);
  const city = normalize(resolveCity(property));
  const rooms = resolveRooms(property);

  const parts = [];
  if (transaction) parts.push(transaction);
  if (type) parts.push(type);
  if (city) parts.push(city);
  if (rooms) parts.push(`${rooms}-habitaciones`);

  const slug = normalize(parts.join(" ")) || "propiedad";
  return `${BASE_URL}/propiedades/${slug}-${property.id}`;
};

const buildTypeCityLandingUrl = (property) => {
  const citySlug = normalize(resolveCity(property));
  const typeSlug = getTypeCollectionSlug(property?.type);
  const transactionSlug = getTransactionSlug(property?.transactionType);

  if (!citySlug || !typeSlug) return null;

  if (transactionSlug) {
    return `${BASE_URL}/propiedades/zona/${typeSlug}-en-${transactionSlug}-${citySlug}`;
  }

  return `${BASE_URL}/propiedades/zona/${typeSlug}-en-${citySlug}`;
};

const PropertyDetailPage = () => {
  const { slugId, slugOrCity } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const currentSlug = slugId || slugOrCity || "";
  const realId = extractIdFromSlug(currentSlug);

  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [featuresExpanded, setFeaturesExpanded] = useState(false);

  const loadProperty = async () => {
    setLoading(true);

    try {
      if (!realId) {
        console.error("[PropertyDetail] No realId obtenido del slug");
        setProperty(null);
        return;
      }

      const data = await propertyService.getPublicPropertyById(realId);
      setProperty(data || null);
    } catch (error) {
      console.error("Error cargando propiedad:", error);
      setProperty(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProperty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realId]);

  const city = useMemo(() => resolveCity(property), [property]);
  const department = useMemo(() => resolveDepartment(property), [property]);
  const neighborhood = useMemo(() => resolveNeighborhood(property), [property]);
  const addressPublic = useMemo(() => resolveAddress(property), [property]);
  const lat = useMemo(() => resolveLat(property), [property]);
  const lng = useMemo(() => resolveLng(property), [property]);
  const rooms = useMemo(() => resolveRooms(property), [property]);
  const area = useMemo(() => resolveArea(property), [property]);
  const bathrooms = useMemo(() => resolveBathrooms(property), [property]);
  const parkingSpots = useMemo(() => resolveParking(property), [property]);

  const transType = useMemo(
    () => getTransactionType(property?.transactionType),
    [property?.transactionType]
  );

  const isVenta = transType === "Venta";

  const amenities = useMemo(
    () =>
      [
        ...(property?.amenities || []),
        ...(property?.customAmenities || []),
      ].filter(Boolean),
    [property?.amenities, property?.customAmenities]
  );

  const baseFeatures = useMemo(() => {
    const items = [];
    const floors = resolveFloors(property);
    const stratum = resolveStratum(property);
    const yearBuilt = resolveYearBuilt(property);

    if (floors !== undefined && floors !== null) {
      items.push({ type: "base", icon: FaLayerGroup, label: `Piso ${floors}` });
    }

    if (stratum !== undefined && stratum !== null) {
      items.push({
        type: "base",
        icon: FaCheckCircle,
        label: `Estrato ${stratum}`,
      });
    }

    if (yearBuilt !== undefined && yearBuilt !== null) {
      items.push({
        type: "base",
        icon: FaCalendarAlt,
        label: `Año ${yearBuilt}`,
      });
    }

    return items;
  }, [property]);

  const allFeatures = useMemo(
    () => [
      ...baseFeatures,
      ...amenities.map((a) => ({
        type: "amenity",
        icon: FaCheckCircle,
        label: a,
      })),
    ],
    [baseFeatures, amenities]
  );

  const COLLAPSE_COUNT = 10;
  const visibleFeatures = featuresExpanded
    ? allFeatures
    : allFeatures.slice(0, COLLAPSE_COUNT);

  const typeLabel = getPropertyType(property?.type);
  const transactionLabel = getTransactionLabel(property?.transactionType);
  const typeLabelSeo = getTypeLabel(property?.type);
  const roomsTextSeo = rooms ? `${rooms} habitaciones · ` : "";

  const price = resolvePrice(property);
  const formattedPrice = price ? formatPrice(price) : null;

  const canonicalUrl = useMemo(
    () => buildCanonicalPropertyUrl(property, currentSlug),
    [property, currentSlug]
  );

  const canonicalPath = useMemo(() => {
    try {
      return new URL(canonicalUrl).pathname;
    } catch {
      return `/propiedades/${currentSlug}`;
    }
  }, [canonicalUrl, currentSlug]);

  useEffect(() => {
    if (!property?.id) return;
    if (location.pathname !== canonicalPath) {
      navigate(canonicalPath, { replace: true });
    }
  }, [property?.id, location.pathname, canonicalPath, navigate]);

  const seoTitle = property
    ? `${transactionLabel} de ${typeLabelSeo}${
        city ? ` en ${city}` : ""
      } | ${roomsTextSeo}${COMPANY_NAME}`
    : `Propiedad | ${COMPANY_NAME}`;

  const seoDescription = property
    ? `${transactionLabel} de ${typeLabelSeo.toLowerCase()} en ${
        city || "Caldas"
      }${rooms ? `, ${rooms} habitaciones` : ""}${
        formattedPrice ? `, valor aproximado ${formattedPrice}` : ""
      }. Asesoría jurídica y acompañamiento completo con ${COMPANY_NAME}.`
    : `Encuentra propiedades en venta y arriendo con respaldo jurídico en ${COMPANY_NAME}.`;

  const allImages = useMemo(() => {
    const merged = [
      ...(property?.media?.photos?.map((p) => p?.url) || []),
      ...(property?.images || []),
    ]
      .map(normalizeAbsoluteUrl)
      .filter(Boolean);

    return [...new Set(merged)];
  }, [property]);

  const seoImage = allImages[0] || `${BASE_URL}/logo.jpg.png`;
  const offerAvailability = getOfferAvailability(property?.status);

  const citySlug = normalize(city);
  const cityLandingUrl = citySlug
    ? `${BASE_URL}/propiedades/ciudad/${citySlug}`
    : null;

  const typeCityLandingUrl = buildTypeCityLandingUrl(property);

  const imageObjects =
    allImages.length > 0
      ? allImages.map((url, index) => ({
          "@type": "ImageObject",
          url,
          contentUrl: url,
          caption:
            property?.title ||
            `${typeLabelSeo} en ${city || "Caldas"} - ${COMPANY_NAME}`,
          representativeOfPage: index === 0,
        }))
      : [
          {
            "@type": "ImageObject",
            url: seoImage,
            contentUrl: seoImage,
            caption:
              property?.title ||
              `Propiedad en ${city || "Caldas"} - ${COMPANY_NAME}`,
            representativeOfPage: true,
          },
        ];

  const hasGeo =
    lat !== undefined &&
    lat !== null &&
    lng !== undefined &&
    lng !== null &&
    !Number.isNaN(Number(lat)) &&
    !Number.isNaN(Number(lng));

  const geoObject = hasGeo
    ? {
        "@type": "GeoCoordinates",
        latitude: Number(lat),
        longitude: Number(lng),
      }
    : undefined;

  const floorSizeObject =
    area !== undefined && area !== null
      ? {
          "@type": "QuantitativeValue",
          value: Number(area),
          unitCode: "MTK",
        }
      : undefined;

  const amenityFeatures =
    amenities.length > 0
      ? amenities.map((a) => ({
          "@type": "LocationFeatureSpecification",
          name: a,
          value: true,
        }))
      : undefined;

  const additionalProperty = [
    bathrooms !== undefined && bathrooms !== null
      ? {
          "@type": "PropertyValue",
          name: "Baños",
          value: bathrooms,
        }
      : null,
    parkingSpots !== undefined && parkingSpots !== null
      ? {
          "@type": "PropertyValue",
          name: "Parqueaderos",
          value: parkingSpots,
        }
      : null,
    resolveStratum(property) !== undefined && resolveStratum(property) !== null
      ? {
          "@type": "PropertyValue",
          name: "Estrato",
          value: resolveStratum(property),
        }
      : null,
    resolveYearBuilt(property) !== undefined && resolveYearBuilt(property) !== null
      ? {
          "@type": "PropertyValue",
          name: "Año de construcción",
          value: resolveYearBuilt(property),
        }
      : null,
  ].filter(Boolean);

  const mainEntity =
    property && !String(property?.type || "").toLowerCase().includes("lote")
      ? {
          "@type": getResidenceSchemaType(property?.type),
          name: property?.title || seoTitle,
          description: seoDescription,
          url: canonicalUrl,
          image: allImages.length > 0 ? allImages : [seoImage],
          numberOfRooms:
            rooms !== undefined && rooms !== null ? Number(rooms) : undefined,
          numberOfBedrooms:
            rooms !== undefined && rooms !== null ? Number(rooms) : undefined,
          numberOfBathroomsTotal:
            bathrooms !== undefined && bathrooms !== null
              ? Number(bathrooms)
              : undefined,
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
      ...(cityLandingUrl
        ? [
            {
              "@type": "ListItem",
              position: 3,
              name: `Propiedades en ${city}`,
              item: cityLandingUrl,
            },
          ]
        : []),
      ...(typeCityLandingUrl
        ? [
            {
              "@type": "ListItem",
              position: cityLandingUrl ? 4 : 3,
              name: `${getTypeCollectionSlug(property?.type)} en ${String(
                transactionLabel || ""
              ).toLowerCase()} ${city}`.trim(),
              item: typeCityLandingUrl,
            },
          ]
        : []),
      {
        "@type": "ListItem",
        position: typeCityLandingUrl ? (cityLandingUrl ? 5 : 4) : cityLandingUrl ? 4 : 3,
        name: property?.title || seoTitle,
        item: canonicalUrl,
      },
    ],
  };

  const realEstateListing = property
    ? {
        "@context": "https://schema.org",
        "@type": "RealEstateListing",
        name: property.title || seoTitle,
        description: seoDescription,
        url: canonicalUrl,
        mainEntityOfPage: canonicalUrl,
        image: imageObjects,
        datePosted: toIsoDate(
          property.createdAt || property.created_at || property.updatedAt
        ),
        category: `${transactionLabel} de ${typeLabelSeo}`,
        address: {
          "@type": "PostalAddress",
          streetAddress: addressPublic || "",
          addressLocality: city || "Anserma",
          addressRegion: department || "Caldas",
          addressCountry: "CO",
        },
        geo: geoObject,
        numberOfRooms:
          rooms !== undefined && rooms !== null ? Number(rooms) : undefined,
        floorSize: floorSizeObject,
        amenityFeature: amenityFeatures,
        additionalProperty:
          additionalProperty.length > 0 ? additionalProperty : undefined,
        mainEntity,
        offers: {
          "@type": "Offer",
          price: price ?? undefined,
          priceCurrency: "COP",
          availability: offerAvailability,
          url: canonicalUrl,
          itemCondition: "https://schema.org/UsedCondition",
          seller: {
            "@type": "RealEstateAgent",
            name: COMPANY_NAME,
            url: BASE_URL,
            telephone: `+${COMPANY_PHONE}`,
          },
        },
      }
    : null;

  const fullSchemaList =
    realEstateListing && breadcrumbsSchema
      ? [realEstateListing, breadcrumbsSchema]
      : realEstateListing || breadcrumbsSchema || null;

  const handleShare = async () => {
    const url = canonicalUrl || window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({
          title: property?.title || "Propiedad",
          text: `Mira esta propiedad: ${property?.title || ""}`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("¡Link copiado al portapapeles!");
      }
    } catch (error) {
      console.error("Error compartiendo propiedad:", error);
    }
  };

  const handleFavorite = () => {
    setIsFavorite((prev) => !prev);
    toast.success(
      isFavorite ? "Eliminado de favoritos" : "¡Agregado a favoritos!"
    );
  };

  const handleWhatsApp = () => {
    const message = `Hola, estoy interesado en: ${
      property?.title || "una propiedad"
    } - ${canonicalUrl || window.location.href}`;

    window.open(
      `https://wa.me/${COMPANY_PHONE}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark px-4">
        <div className="text-center">
          <FaSpinner className="animate-spin text-primary text-5xl mx-auto mb-4" />
          <p className="text-slate-400">Cargando propiedad...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark px-4">
        <Helmet>
          <title>Propiedad no encontrada | {COMPANY_NAME}</title>
          <meta
            name="robots"
            content="noindex,nofollow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"
          />
        </Helmet>

        <div className="text-center">
          <p className="text-slate-400 text-lg mb-4">Propiedad no encontrada</p>
          <Link to="/propiedades" className="button-gold inline-block">
            Ver todas las propiedades
          </Link>
        </div>
      </div>
    );
  }

  const breadcrumbItems = [
    { label: "Inicio", href: "/" },
    { label: "Propiedades", href: "/propiedades" },
    ...(citySlug
      ? [
          {
            label: `Propiedades en ${city}`,
            href: `/propiedades/ciudad/${citySlug}`,
          },
        ]
      : []),
    ...(typeCityLandingUrl
      ? [
          {
            label: `${getTypeCollectionSlug(property?.type)} en ${String(
              transactionLabel || ""
            ).toLowerCase()} ${city}`.trim(),
            href: typeCityLandingUrl.replace(BASE_URL, ""),
          },
        ]
      : []),
    { label: property.title || "Detalle de propiedad" },
  ];

  // ✔ La propiedad solo acepta visitas si su status lo permite
  const acceptsVisits = ![
    "vendida", "sold", "inactiva", "draft", "eliminada",
  ].includes(String(property?.status || "").toLowerCase());

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
        <link rel="canonical" href={canonicalUrl} />

        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:image" content={seoImage} />
        <meta property="og:image:secure_url" content={seoImage} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={COMPANY_NAME} />
        <meta property="og:locale" content="es_CO" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta
          property="og:image:alt"
          content={property?.title || "Propiedad inmobiliaria"}
        />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seoTitle} />
        <meta name="twitter:description" content={seoDescription} />
        <meta name="twitter:image" content={seoImage} />

        {fullSchemaList && (
          <script type="application/ld+json">
            {JSON.stringify(fullSchemaList)}
          </script>
        )}
      </Helmet>

      <div className="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6">
        <div className="mb-4 sm:mb-6">
          <Breadcrumbs items={breadcrumbItems} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
        >
          <Link
            to="/propiedades"
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition font-semibold"
          >
            <FaArrowLeft />
            <span className="hidden sm:inline">Volver al catálogo</span>
            <span className="sm:hidden">Volver</span>
          </Link>

          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleFavorite}
              className="p-2.5 sm:p-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-primary/50 rounded-lg transition"
              aria-label={
                isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"
              }
            >
              {isFavorite ? (
                <FaHeart className="text-red-500" size={20} />
              ) : (
                <FaRegHeart className="text-slate-400" size={20} />
              )}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleShare}
              className="p-2.5 sm:p-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-primary/50 rounded-lg transition"
              aria-label="Compartir"
            >
              <FaShare className="text-slate-400" size={20} />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleWhatsApp}
              className="px-3.5 py-2.5 sm:px-4 sm:py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-semibold flex items-center gap-2"
              aria-label="Contactar por WhatsApp"
            >
              <FaWhatsapp size={20} />
              <span className="hidden sm:inline">WhatsApp</span>
            </motion.button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-2 space-y-5 sm:space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <ImageGallery
                images={allImages}
                propertyTitle={property.title}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6"
            >
              <div className="flex flex-col gap-4 mb-5 sm:mb-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1.5 bg-primary/10 text-primary text-xs sm:text-sm font-bold rounded-lg border border-primary/30">
                    <FaHome className="inline mr-1" />
                    {typeLabel}
                  </span>

                  <span
                    className={`px-3 py-1.5 text-xs sm:text-sm font-bold rounded-lg border ${
                      isVenta
                        ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                        : "bg-green-500/10 text-green-400 border-green-500/30"
                    }`}
                  >
                    {transType}
                  </span>

                  {["disponible", "available", "published", "active"].includes(
                    String(property.status || "").toLowerCase()
                  ) && (
                    <span className="px-3 py-1.5 bg-green-500/10 text-green-400 text-xs sm:text-sm font-bold rounded-lg border border-green-500/30">
                      ✓ DISPONIBLE
                    </span>
                  )}

                  {["reservada", "reserved"].includes(
                    String(property.status || "").toLowerCase()
                  ) && (
                    <span className="px-3 py-1.5 bg-yellow-500/10 text-yellow-400 text-xs sm:text-sm font-bold rounded-lg border border-yellow-500/30">
                      ✓ RESERVADA
                    </span>
                  )}
                </div>

                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-light mb-2 sm:mb-3">
                      {property.title || "Propiedad sin título"}
                    </h1>
                    <div className="flex items-start gap-2 text-slate-400">
                      <FaMapMarkerAlt className="mt-1 flex-shrink-0 text-primary" />
                      <span className="text-sm sm:text-base">
                        {addressPublic}
                        {city && `, ${city}`}
                      </span>
                    </div>
                  </div>

                  <div className="text-left md:text-right">
                    <p className="text-primary font-bold text-2xl sm:text-3xl lg:text-4xl mb-1">
                      {formattedPrice || "Consultar precio"}
                    </p>
                    <p className="text-slate-400 text-xs sm:text-sm">
                      Precio de {String(transType).toLowerCase()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 py-5 sm:py-6 border-y border-slate-800">
                {area !== undefined && area !== null && (
                  <div className="text-center p-3 sm:p-4 bg-slate-800/50 rounded-xl">
                    <FaRuler className="text-primary text-2xl sm:text-3xl mx-auto mb-2" />
                    <p className="text-light font-bold text-lg sm:text-xl">
                      {area} m²
                    </p>
                    <p className="text-slate-400 text-xs sm:text-sm mt-1">
                      Área
                    </p>
                  </div>
                )}

                {rooms !== undefined && rooms !== null && (
                  <div className="text-center p-3 sm:p-4 bg-slate-800/50 rounded-xl">
                    <FaBed className="text-primary text-2xl sm:text-3xl mx-auto mb-2" />
                    <p className="text-light font-bold text-lg sm:text-xl">
                      {rooms}
                    </p>
                    <p className="text-slate-400 text-xs sm:text-sm mt-1">
                      Habitaciones
                    </p>
                  </div>
                )}

                {bathrooms !== undefined && bathrooms !== null && (
                  <div className="text-center p-3 sm:p-4 bg-slate-800/50 rounded-xl">
                    <FaBath className="text-primary text-2xl sm:text-3xl mx-auto mb-2" />
                    <p className="text-light font-bold text-lg sm:text-xl">
                      {bathrooms}
                    </p>
                    <p className="text-slate-400 text-xs sm:text-sm mt-1">
                      Baños
                    </p>
                  </div>
                )}

                {parkingSpots !== undefined && parkingSpots !== null && (
                  <div className="text-center p-3 sm:p-4 bg-slate-800/50 rounded-xl">
                    <FaCar className="text-primary text-2xl sm:text-3xl mx-auto mb-2" />
                    <p className="text-light font-bold text-lg sm:text-xl">
                      {parkingSpots}
                    </p>
                    <p className="text-slate-400 text-xs sm:text-sm mt-1">
                      Parqueaderos
                    </p>
                  </div>
                )}
              </div>

              {property.description && (
                <div className="mt-5 sm:mt-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-primary mb-3 flex items-center gap-2">
                    <FaHome />
                    Descripción
                  </h2>
                  <p className="text-slate-300 text-sm sm:text-base leading-relaxed whitespace-pre-line">
                    {property.description}
                  </p>
                </div>
              )}
            </motion.div>

            {allFeatures.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6"
              >
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h2 className="text-xl sm:text-2xl font-bold text-primary flex items-center gap-2">
                    <FaCheckCircle />
                    Características
                  </h2>

                  {allFeatures.length > COLLAPSE_COUNT && (
                    <button
                      type="button"
                      onClick={() => setFeaturesExpanded((v) => !v)}
                      className="text-xs sm:text-sm px-3 py-2 rounded-xl bg-primary/10 border border-primary/30 text-primary font-semibold hover:bg-primary/15 transition"
                    >
                      {featuresExpanded
                        ? "Ver menos"
                        : `Ver todas (${allFeatures.length})`}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {visibleFeatures.map((item, index) => {
                    const Icon = item.icon || FaCheckCircle;

                    return (
                      <div
                        key={`${item.type}-${item.label}-${index}`}
                        className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg"
                      >
                        <Icon
                          className="text-primary flex-shrink-0"
                          size={20}
                        />
                        <span className="text-slate-300">{item.label}</span>
                      </div>
                    );
                  })}
                </div>

                {!featuresExpanded && allFeatures.length > COLLAPSE_COUNT && (
                  <p className="text-slate-500 text-xs mt-3">
                    Mostrando {COLLAPSE_COUNT} de {allFeatures.length}.
                  </p>
                )}
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6"
            >
              <h2 className="text-xl sm:text-2xl font-bold text-primary mb-4 flex items-center gap-2">
                <FaMapMarkerAlt />
                Ubicación
              </h2>

              <div className="w-full h-64 sm:h-72 lg:h-80 rounded-xl overflow-hidden">
                <PropertyMap
                  address={addressPublic}
                  city={city}
                  department={department}
                  neighborhood={neighborhood}
                  latitude={lat}
                  longitude={lng}
                />
              </div>

              <p className="text-slate-400 text-xs sm:text-sm mt-3">
                <FaMapMarkerAlt className="inline mr-1 text-primary" />
                {addressPublic}
                {city && `, ${city}`}
              </p>
            </motion.div>
          </div>

          {/* ─ Panel lateral sticky ─ */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-1"
          >
            <div className="lg:sticky lg:top-6 space-y-4">

              {/* Botón Agendar Visita — solo si la propiedad sigue disponible */}
              {acceptsVisits && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="bg-slate-900 border border-primary/40 rounded-xl p-4 sm:p-5"
                >
                  <p className="text-slate-400 text-xs mb-3 text-center">
                    ¿Te interesa esta propiedad?
                  </p>
                  <Link
                    to={`/agendar-visita?propertyId=${property.id}`}
                    className="w-full flex items-center justify-center gap-2.5
                      py-3.5 px-5 rounded-xl font-bold text-slate-950
                      bg-primary hover:bg-primary/90 transition-all duration-200
                      shadow-lg shadow-primary/20 hover:shadow-primary/40
                      text-sm sm:text-base"
                  >
                    <FaCalendarAlt size={16} />
                    Agendar visita
                  </Link>
                  <p className="text-slate-600 text-xs text-center mt-2.5">
                    Gratis · Sin compromiso · Te confirmamos en horas
                  </p>
                </motion.div>
              )}

              {/* Formulario de contacto rápido */}
              <PropertyContactForm
                propertyTitle={property.title}
                propertyId={property.id}
              />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetailPage;
