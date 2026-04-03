import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FaBed,
  FaBath,
  FaRulerCombined,
  FaMapMarkerAlt,
  FaHeart,
  FaRegHeart,
  FaHome,
  FaArrowRight,
} from "react-icons/fa";

const BASE_URL = "https://inmobiliaria-ryb-y-asociados.com";

const normalize = (value = "") =>
  String(value)
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

const resolveCity = (property) =>
  String(property?.location?.city ?? property?.city ?? "").trim();

const resolveRooms = (property) =>
  property?.features?.rooms ??
  property?.features?.bedrooms ??
  property?.rooms ??
  property?.bedrooms ??
  null;

const resolveBathrooms = (property) =>
  property?.features?.bathrooms ?? property?.bathrooms ?? null;

const resolveArea = (property) =>
  property?.features?.builtArea ??
  property?.features?.area ??
  property?.area ??
  null;

const resolvePrice = (property) =>
  property?.price?.sale ?? property?.price?.rent ?? property?.price ?? 0;

const buildSlug = (property) => {
  const transaction = getTransactionSlug(property?.transactionType);
  const type = getTypeSlug(property?.type);
  const city = normalize(resolveCity(property));
  const rooms = resolveRooms(property);

  const parts = [];

  if (transaction) parts.push(transaction);
  if (type) parts.push(type);
  if (city) parts.push(city);
  if (rooms) parts.push(`${rooms}-habitaciones`);

  return normalize(parts.join(" ")) || "propiedad";
};

const AVAILABLE_STATUSES = new Set([
  "disponible",
  "published",
  "active",
  "available",
]);

const RESERVED_STATUSES = new Set(["reservada", "reserved"]);

const PropertyCard = ({ property, onFavorite }) => {
  const navigate = useNavigate();
  const [isFavorite, setIsFavorite] = useState(false);

  const mainImage = useMemo(() => {
    const raw =
      property?.media?.photos?.[0]?.url ||
      property?.images?.[0] ||
      "https://via.placeholder.com/800x600?text=Sin+Imagen";

    return normalizeAbsoluteUrl(raw);
  }, [property]);

  const resolvedPrice = useMemo(() => resolvePrice(property), [property]);
  const cityText = useMemo(() => resolveCity(property), [property]);

  const addressText = useMemo(
    () =>
      property?.location?.addressPublic ??
      property?.location?.address ??
      property?.address ??
      "Dirección no disponible",
    [property]
  );

  const neighborhood = useMemo(
    () => property?.location?.neighborhood ?? property?.neighborhood ?? "",
    [property]
  );

  const roomsValue = useMemo(() => resolveRooms(property), [property]);
  const bathsValue = useMemo(() => resolveBathrooms(property), [property]);
  const areaValue = useMemo(() => resolveArea(property), [property]);

  const formatPrice = (price) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(Number(price) || 0);

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

    return types[String(type || "").toLowerCase()] || type || "Propiedad";
  };

  const getTransactionType = () => {
    const lower = String(property?.transactionType ?? "").toLowerCase();

    if (["sale", "venta", "compra"].includes(lower)) {
      return { text: "VENTA", isVenta: true };
    }

    if (["rent", "arriendo", "alquiler", "renta"].includes(lower)) {
      return { text: "ARRIENDO", isVenta: false };
    }

    return { text: lower ? lower.toUpperCase() : "PROPIEDAD", isVenta: false };
  };

  const transactionInfo = getTransactionType();

  const statusNormalized = String(property?.status ?? "").toLowerCase();
  const isAvailable = AVAILABLE_STATUSES.has(statusNormalized);
  const isReserved = RESERVED_STATUSES.has(statusNormalized);

  const detailUrl = useMemo(() => {
    const slug = buildSlug(property);
    return `/propiedades/${slug}-${property?.id}`;
  }, [property]);

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    setIsFavorite((prev) => !prev);
    if (onFavorite) onFavorite(property.id);
  };

  const handleCardClick = () => {
    if (!property?.id) return;
    navigate(detailUrl);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleCardClick();
    }
  };

  return (
    <motion.article
      whileHover={{ y: -3, transition: { duration: 0.22 } }}
      className="bg-slate-900 rounded-2xl overflow-hidden cursor-pointer group border border-slate-800 hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-primary/10"
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label={`Ver detalles de ${property?.title || "la propiedad"}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={mainImage}
          alt={`${getPropertyType(property?.type)} en ${
            transactionInfo.isVenta ? "venta" : "arriendo"
          }${cityText ? ` en ${cityText}` : ""} - ${
            property?.title || "Propiedad"
          }`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.src =
              "https://via.placeholder.com/800x600?text=Sin+Imagen";
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
          {isAvailable && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="px-2.5 py-1 bg-emerald-500 text-white text-[10px] sm:text-xs font-black rounded-lg shadow-xl backdrop-blur-sm flex items-center gap-1.5 border border-emerald-400 w-fit"
            >
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              DISPONIBLE
            </motion.span>
          )}

          {isReserved && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="px-2.5 py-1 bg-yellow-500 text-slate-950 text-[10px] sm:text-xs font-black rounded-lg shadow-xl backdrop-blur-sm flex items-center gap-1.5 border border-yellow-300 w-fit"
            >
              <span className="w-2 h-2 bg-slate-950 rounded-full" />
              RESERVADA
            </motion.span>
          )}

          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className={`px-3 py-1.5 text-[10px] sm:text-xs font-black rounded-lg shadow-xl backdrop-blur-sm border w-fit ${
              transactionInfo.isVenta
                ? "bg-blue-600 text-white border-blue-400"
                : "bg-orange-600 text-white border-orange-400"
            }`}
          >
            {transactionInfo.text}
          </motion.span>
        </div>

        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.92 }}
          onClick={handleFavoriteClick}
          className="absolute top-3 right-3 w-10 h-10 bg-black/75 hover:bg-black/90 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all duration-200 shadow-xl border border-white/20 z-10"
          aria-label={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
          type="button"
        >
          {isFavorite ? (
            <FaHeart className="text-red-500" size={18} />
          ) : (
            <FaRegHeart size={18} />
          )}
        </motion.button>

        <div className="absolute bottom-3 left-3 right-3 z-10">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <span className="inline-flex items-center px-3 py-2 rounded-xl bg-slate-950/90 backdrop-blur-md border border-primary/40 shadow-xl">
                <span className="text-primary font-black text-base sm:text-xl truncate">
                  {resolvedPrice ? formatPrice(resolvedPrice) : "Consultar precio"}
                </span>
              </span>
            </div>

            <div className="w-10 h-10 bg-primary/15 rounded-full flex items-center justify-center backdrop-blur-sm border border-primary/30 flex-shrink-0">
              <FaArrowRight className="text-primary" size={16} />
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-5">
        <div className="flex items-center gap-2 text-primary text-[11px] sm:text-sm font-bold mb-2">
          <FaHome className="text-base sm:text-lg" />
          <span className="uppercase tracking-wide">
            {getPropertyType(property?.type)}
          </span>
        </div>

        <h3 className="text-sm sm:text-lg font-bold text-white mb-2 line-clamp-2 group-hover:text-primary transition-colors leading-snug">
          {property?.title || "Propiedad sin título"}
        </h3>

        <div className="flex items-start gap-2 text-slate-300 text-xs sm:text-sm mb-3 pb-3 border-b border-slate-800">
          <FaMapMarkerAlt
            className="mt-0.5 flex-shrink-0 text-primary"
            size={14}
          />
          <span className="min-w-0">
            <span className="text-slate-200 font-semibold">
              {cityText || "Ciudad no disponible"}
            </span>
            {neighborhood ? (
              <span className="text-slate-400">{` • ${neighborhood}`}</span>
            ) : null}
            <span className="block text-slate-500 line-clamp-1">
              {addressText}
            </span>
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3 sm:mb-4">
          <div className="flex flex-col items-center p-2 bg-slate-800/40 rounded-lg hover:bg-slate-800 transition-colors">
            <FaRulerCombined className="text-primary mb-1.5" size={16} />
            <span className="text-white font-black text-sm leading-none">
              {areaValue ?? "—"}
            </span>
            <span className="text-slate-400 text-[10px] mt-0.5">m²</span>
          </div>

          <div className="flex flex-col items-center p-2 bg-slate-800/40 rounded-lg hover:bg-slate-800 transition-colors">
            <FaBed className="text-primary mb-1.5" size={16} />
            <span className="text-white font-black text-sm leading-none">
              {roomsValue ?? "—"}
            </span>
            <span className="text-slate-400 text-[10px] mt-0.5">Hab.</span>
          </div>

          <div className="flex flex-col items-center p-2 bg-slate-800/40 rounded-lg hover:bg-slate-800 transition-colors">
            <FaBath className="text-primary mb-1.5" size={16} />
            <span className="text-white font-black text-sm leading-none">
              {bathsValue ?? "—"}
            </span>
            <span className="text-slate-400 text-[10px] mt-0.5">Baños</span>
          </div>
        </div>

        <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
          <div className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-primary via-yellow-500 to-primary text-slate-900 font-black text-center rounded-xl group-hover:shadow-lg group-hover:shadow-primary/40 transition-all duration-300 flex items-center justify-center gap-2 text-sm">
            Ver detalles
            <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
          </div>
        </motion.div>
      </div>

      <div className="h-1.5 bg-gradient-to-r from-transparent via-primary to-transparent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
    </motion.article>
  );
};

export default PropertyCard;