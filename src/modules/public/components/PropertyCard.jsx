// src/modules/properties/components/PropertyCard.jsx
import { useMemo } from "react";
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

// ─── Constantes ───────────────────────────────────────────────────────────────
const BASE_URL = "https://inmobiliaria-ryb-y-asociados.com";

const AVAILABLE_STATUSES = new Set(["disponible", "published", "active", "available"]);
const RESERVED_STATUSES  = new Set(["reservada", "reserved"]);

// ─── Helpers puros ────────────────────────────────────────────────────────────
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
  if (lower.includes("sale") || lower.includes("venta") || lower.includes("compra"))            return "venta";
  if (lower.includes("rent") || lower.includes("arriendo") || lower.includes("alquiler") || lower.includes("renta")) return "arriendo";
  return "";
};

const getTypeSlug = (type = "") => {
  const lower = String(type).toLowerCase();
  if (lower.includes("casa"))                               return "casa";
  if (lower.includes("apart"))                              return "apartamento";
  if (lower.includes("lote"))                               return "lote";
  if (lower.includes("finca"))                              return "finca";
  if (lower.includes("local") || lower.includes("comercial")) return "local";
  if (lower.includes("oficina"))                            return "oficina";
  if (lower.includes("bodega"))                             return "bodega";
  return "propiedad";
};

const resolveCity      = (p) => String(p?.location?.city      ?? p?.city      ?? "").trim();
const resolveRooms     = (p) => p?.features?.rooms     ?? p?.features?.bedrooms ?? p?.rooms     ?? p?.bedrooms  ?? null;
const resolveBathrooms = (p) => p?.features?.bathrooms  ?? p?.bathrooms  ?? null;
const resolveArea      = (p) => p?.features?.builtArea  ?? p?.features?.area    ?? p?.area      ?? null;
const resolvePrice     = (p) => p?.price?.sale          ?? p?.price?.rent       ?? p?.price     ?? 0;

const buildSlug = (property) => {
  const parts = [];
  const transaction = getTransactionSlug(property?.transactionType);
  const type        = getTypeSlug(property?.type);
  const city        = normalize(resolveCity(property));
  const rooms       = resolveRooms(property);
  if (transaction) parts.push(transaction);
  if (type)        parts.push(type);
  if (city)        parts.push(city);
  if (rooms)       parts.push(`${rooms}-habitaciones`);
  return normalize(parts.join(" ")) || "propiedad";
};

const getPropertyType = (type) => {
  const map = {
    house: "Casa",            casa: "Casa",
    apartment: "Apartamento", apartamento: "Apartamento",
    lot: "Lote",              lote: "Lote",
    farm: "Finca",            finca: "Finca",
    commercial: "Local Comercial", local: "Local Comercial",
    office: "Oficina",        oficina: "Oficina",
    warehouse: "Bodega",      bodega: "Bodega",
  };
  return map[String(type || "").toLowerCase()] || type || "Propiedad";
};

const getTransactionInfo = (transactionType) => {
  const lower = String(transactionType ?? "").toLowerCase();
  if (["sale", "venta", "compra"].includes(lower))                   return { text: "VENTA",    isVenta: true };
  if (["rent", "arriendo", "alquiler", "renta"].includes(lower))     return { text: "ARRIENDO", isVenta: false };
  return { text: lower ? lower.toUpperCase() : "PROPIEDAD", isVenta: false };
};

const formatPrice = (price) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", minimumFractionDigits: 0,
  }).format(Number(price) || 0);

// ─── Subcomponente: badge de característica ───────────────────────────────────
const FeatureBadge = ({ Icon, value, unit }) => (
  <div className="flex flex-col items-center p-2 bg-slate-800/40 rounded-lg hover:bg-slate-800 transition-colors">
    <Icon className="text-primary mb-1.5" size={16} />
    <span className="text-white font-black text-sm leading-none">{value ?? "—"}</span>
    <span className="text-slate-400 text-[10px] mt-0.5">{unit}</span>
  </div>
);

// ─── Componente principal ─────────────────────────────────────────────────────
/**
 * PropertyCard
 *
 * Props:
 *   property   — objeto de la propiedad (Firestore doc)
 *   isFavorite — boolean, estado real desde useFavorites hook (NO local state)
 *   onFavorite — fn(propertyId) → llama toggleFavorite del hook
 *
 * Uso correcto en el padre:
 *   const { isFavorite, toggleFavorite } = useFavorites();
 *   <PropertyCard
 *     property={p}
 *     isFavorite={isFavorite(p.id)}
 *     onFavorite={toggleFavorite}
 *   />
 */
const PropertyCard = ({ property, isFavorite = false, onFavorite }) => {
  const navigate = useNavigate();

  // ── Valores derivados ─────────────────────────────────────────────────────
  const mainImage = useMemo(() => {
    const raw =
      property?.media?.photos?.[0]?.url ||
      property?.images?.[0] ||
      "https://via.placeholder.com/800x600?text=Sin+Imagen";
    return normalizeAbsoluteUrl(raw);
  }, [property]);

  const resolvedPrice    = useMemo(() => resolvePrice(property),     [property]);
  const cityText         = useMemo(() => resolveCity(property),      [property]);
  const addressText      = useMemo(() =>
    property?.location?.addressPublic ??
    property?.location?.address ??
    property?.address ??
    "Dirección no disponible",
  [property]);
  const neighborhood     = useMemo(() => property?.location?.neighborhood ?? property?.neighborhood ?? "", [property]);
  const roomsValue       = useMemo(() => resolveRooms(property),     [property]);
  const bathsValue       = useMemo(() => resolveBathrooms(property), [property]);
  const areaValue        = useMemo(() => resolveArea(property),      [property]);
  const detailUrl        = useMemo(() => `/propiedades/${buildSlug(property)}-${property?.id}`, [property]);
  const transactionInfo  = useMemo(() => getTransactionInfo(property?.transactionType), [property]);
  const statusNormalized = useMemo(() => String(property?.status ?? "").toLowerCase(), [property]);
  const isAvailable      = AVAILABLE_STATUSES.has(statusNormalized);
  const isReserved       = RESERVED_STATUSES.has(statusNormalized);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleFavoriteClick = (e) => {
    e.stopPropagation();
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

  // ── Render ────────────────────────────────────────────────────────────────
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

      {/* ── Imagen + overlays ── */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={mainImage}
          alt={`${getPropertyType(property?.type)} en ${
            transactionInfo.isVenta ? "venta" : "arriendo"
          }${cityText ? ` en ${cityText}` : ""} - ${property?.title || "Propiedad"}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.src = "https://via.placeholder.com/800x600?text=Sin+Imagen";
          }}
        />

        {/* Gradiente inferior */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Badges: estado y tipo de transacción */}
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

        {/* Botón favorito — estado controlado por prop, NO por useState local */}
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.92 }}
          onClick={handleFavoriteClick}
          className={`absolute top-3 right-3 w-10 h-10 backdrop-blur-md rounded-full flex items-center justify-center transition-all duration-200 shadow-xl border z-10 ${
            isFavorite
              ? "bg-red-500/20 border-red-500/50 hover:bg-red-500/30"
              : "bg-black/75 border-white/20 hover:bg-black/90"
          }`}
          aria-label={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
          aria-pressed={isFavorite}
          type="button"
        >
          {isFavorite ? (
            <motion.span
              key="filled"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1,   opacity: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <FaHeart className="text-red-500" size={18} />
            </motion.span>
          ) : (
            <motion.span
              key="outline"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1,   opacity: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <FaRegHeart className="text-white" size={18} />
            </motion.span>
          )}
        </motion.button>

        {/* Precio + flecha */}
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

      {/* ── Info ── */}
      <div className="p-3 sm:p-5">

        {/* Tipo de propiedad */}
        <div className="flex items-center gap-2 text-primary text-[11px] sm:text-sm font-bold mb-2">
          <FaHome className="text-base sm:text-lg" />
          <span className="uppercase tracking-wide">{getPropertyType(property?.type)}</span>
        </div>

        {/* Título */}
        <h3 className="text-sm sm:text-lg font-bold text-white mb-2 line-clamp-2 group-hover:text-primary transition-colors leading-snug">
          {property?.title || "Propiedad sin título"}
        </h3>

        {/* Ubicación */}
        <div className="flex items-start gap-2 text-slate-300 text-xs sm:text-sm mb-3 pb-3 border-b border-slate-800">
          <FaMapMarkerAlt className="mt-0.5 flex-shrink-0 text-primary" size={14} />
          <span className="min-w-0">
            <span className="text-slate-200 font-semibold">
              {cityText || "Ciudad no disponible"}
            </span>
            {neighborhood && (
              <span className="text-slate-400">{` • ${neighborhood}`}</span>
            )}
            <span className="block text-slate-500 line-clamp-1">{addressText}</span>
          </span>
        </div>

        {/* Características */}
        <div className="grid grid-cols-3 gap-2 mb-3 sm:mb-4">
          <FeatureBadge Icon={FaRulerCombined} value={areaValue}   unit="m²"    />
          <FeatureBadge Icon={FaBed}           value={roomsValue}  unit="Hab."  />
          <FeatureBadge Icon={FaBath}          value={bathsValue}  unit="Baños" />
        </div>

        {/* CTA */}
        <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
          <div className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-primary via-yellow-500 to-primary text-slate-900 font-black text-center rounded-xl group-hover:shadow-lg group-hover:shadow-primary/40 transition-all duration-300 flex items-center justify-center gap-2 text-sm">
            Ver detalles
            <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
          </div>
        </motion.div>
      </div>

      {/* Línea decorativa inferior */}
      <div className="h-1.5 bg-gradient-to-r from-transparent via-primary to-transparent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />

    </motion.article>
  );
};

export default PropertyCard;