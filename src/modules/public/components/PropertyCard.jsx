// src/modules/public/components/PropertyCard.jsx
// ─────────────────────────────────────────────────────────────
// PropertyCard editorial — precio en Fraunces italic,
// badges sobrios (dorado + neutral), sin colores saturados.
// 100% tokens CSS — dark + light nativos.
//
// CAMBIOS:
//  · Integra useFavorites internamente — CatalogPage y LocationPage
//    ya NO necesitan pasar isFavorite/onFavorite como props.
//  · Cuando no hay sesión activa, muestra un modal de acceso
//    en lugar del simple toast.error, con CTA a /acceso-clientes.
// ─────────────────────────────────────────────────────────────

import { useMemo, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaBed, FaBath, FaRulerCombined, FaMapMarkerAlt,
  FaHeart, FaRegHeart, FaArrowRight, FaTimes, FaUserCircle,
} from "react-icons/fa";
import { useFavorites } from "../../clients/hooks/useFavorites";
import { PUBLIC_ROUTES } from "../../../core/config/routes.config";

const BASE_URL = "https://inmobiliaria-ryb-y-asociados.com";

const AVAILABLE_STATUSES = new Set(["disponible", "published", "active", "available"]);
const RESERVED_STATUSES  = new Set(["reservada", "reserved"]);

/* ─── Helpers ──────────────────────────────────────────────── */
const normalize = (v = "") =>
  String(v).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-").replace(/^-+|-+$/g, "");

const normalizeAbsoluteUrl = (url) => {
  const v = String(url || "").trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  return `${BASE_URL}${v.startsWith("/") ? "" : "/"}${v}`;
};

const getTransactionSlug = (tx = "") => {
  const l = String(tx).toLowerCase();
  if (l.includes("sale") || l.includes("venta") || l.includes("compra")) return "venta";
  if (l.includes("rent") || l.includes("arriendo") || l.includes("alquiler") || l.includes("renta")) return "arriendo";
  return "";
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

const resolveCity      = (p) => String(p?.location?.city ?? p?.city ?? "").trim();
const resolveRooms     = (p) => p?.features?.rooms ?? p?.features?.bedrooms ?? p?.rooms ?? p?.bedrooms ?? null;
const resolveBathrooms = (p) => p?.features?.bathrooms ?? p?.bathrooms ?? null;
const resolveArea      = (p) => p?.features?.builtArea ?? p?.features?.area ?? p?.area ?? null;
const resolvePrice     = (p) => p?.price?.sale ?? p?.price?.rent ?? p?.price ?? 0;

const buildSlug = (p) => {
  const parts = [];
  const tx = getTransactionSlug(p?.transactionType);
  const type = getTypeSlug(p?.type);
  const city = normalize(resolveCity(p));
  const rooms = resolveRooms(p);
  if (tx) parts.push(tx);
  if (type) parts.push(type);
  if (city) parts.push(city);
  if (rooms) parts.push(`${rooms}-habitaciones`);
  return normalize(parts.join(" ")) || "propiedad";
};

const getPropertyType = (type) => {
  const map = {
    house: "Casa", casa: "Casa",
    apartment: "Apartamento", apartamento: "Apartamento",
    lot: "Lote", lote: "Lote",
    farm: "Finca", finca: "Finca",
    commercial: "Local comercial", local: "Local comercial",
    office: "Oficina", oficina: "Oficina",
    warehouse: "Bodega", bodega: "Bodega",
  };
  return map[String(type || "").toLowerCase()] || type || "Propiedad";
};

const getTransactionInfo = (tx) => {
  const l = String(tx ?? "").toLowerCase();
  if (["sale", "venta", "compra"].includes(l))               return { text: "Venta", isVenta: true };
  if (["rent", "arriendo", "alquiler", "renta"].includes(l)) return { text: "Arriendo", isVenta: false };
  return { text: l ? l.charAt(0).toUpperCase() + l.slice(1) : "Propiedad", isVenta: false };
};

const formatPriceShort = (price, isRent = false) => {
  const n = Number(price) || 0;
  if (n === 0) return null;
  let num, unit;
  if (n >= 1_000_000_000)      { num = (n / 1_000_000_000).toFixed(1).replace(/\.0$/, ""); unit = "B"; }
  else if (n >= 1_000_000)     { num = (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, ""); unit = "M"; }
  else if (n >= 1_000)         { num = (n / 1_000).toFixed(0); unit = "K"; }
  else                         { num = String(n); unit = ""; }
  return { num, unit, suffix: isRent ? "/ mes" : "" };
};

/* ─── Feature ──────────────────────────────────────────────── */
const Feature = ({ Icon, value, unit, label }) => (
  <div className="property-card__feature" title={label}>
    <Icon className="property-card__feature-icon" />
    <span className="property-card__feature-value">
      {value ?? "—"}
      {value != null && unit && <span className="property-card__feature-unit">{unit}</span>}
    </span>
  </div>
);

/* ─── Modal de acceso ──────────────────────────────────────── */
// Se muestra cuando el usuario no tiene sesión y toca el corazón.
// Usa 100% tokens CSS del proyecto, sin colores hardcodeados.
const LoginPromptModal = ({ onClose }) => (
  <AnimatePresence>
    <motion.div
      key="fav-modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-labelledby="fav-modal-title"
    >
      <motion.div
        key="fav-modal-card"
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 24 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "1.25rem",
          boxShadow: "0 32px 64px -16px rgba(0,0,0,0.45)",
          maxWidth: "22rem",
          width: "100%",
          padding: "2rem 1.75rem 1.75rem",
          position: "relative",
        }}
      >
        {/* Cerrar */}
        <button
          onClick={onClose}
          aria-label="Cerrar"
          style={{
            position: "absolute",
            top: "1rem",
            right: "1rem",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--color-text-muted)",
            padding: "0.25rem",
            lineHeight: 1,
          }}
        >
          <FaTimes size={14} />
        </button>

        {/* Ícono */}
        <div
          style={{
            width: "3.25rem",
            height: "3.25rem",
            borderRadius: "50%",
            background: "rgba(var(--color-primary-rgb, 245,158,11), 0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "1.25rem",
          }}
        >
          <FaHeart size={22} style={{ color: "var(--color-primary, #f59e0b)" }} />
        </div>

        {/* Texto */}
        <h2
          id="fav-modal-title"
          style={{
            color: "var(--color-text)",
            fontSize: "1.2rem",
            fontWeight: 700,
            marginBottom: "0.5rem",
            lineHeight: 1.3,
          }}
        >
          Guarda tus propiedades favoritas
        </h2>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", lineHeight: 1.6, marginBottom: "1.5rem" }}>
          Crea una cuenta gratuita o inicia sesión para guardar propiedades y consultarlas desde tu portal personal.
        </p>

        {/* CTAs */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
          <Link
            to={PUBLIC_ROUTES.CLIENT_AUTH}
            onClick={onClose}
            className="btn-primary"
            style={{ textAlign: "center", justifyContent: "center" }}
          >
            <FaUserCircle style={{ marginRight: "0.4rem" }} />
            Crear cuenta o iniciar sesión
          </Link>
          <button
            onClick={onClose}
            className="btn-ghost"
            style={{ width: "100%", textAlign: "center", justifyContent: "center" }}
          >
            Seguir explorando
          </button>
        </div>

        {/* Fine print */}
        <p style={{
          color: "var(--color-text-faint, var(--color-text-muted))",
          fontSize: "0.7rem",
          textAlign: "center",
          marginTop: "1rem",
          opacity: 0.7,
        }}>
          Es gratis · Sin tarjeta · En segundos
        </p>
      </motion.div>
    </motion.div>
  </AnimatePresence>
);

/* ─── Principal ────────────────────────────────────────────── */
/**
 * PropertyCard
 *
 * Maneja favoritos internamente vía useFavorites.
 * Los padres (CatalogPage, LocationPage) NO necesitan pasar
 * isFavorite ni onFavorite — simplemente: <PropertyCard property={p} />
 */
const PropertyCard = ({ property }) => {
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite, loading: favLoading } = useFavorites();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const mainImage = useMemo(() => {
    const raw =
      property?.media?.photos?.[0]?.url ||
      property?.images?.[0] ||
      "/og-default.jpg";
    return normalizeAbsoluteUrl(raw);
  }, [property]);

  const resolvedPrice    = useMemo(() => resolvePrice(property), [property]);
  const cityText         = useMemo(() => resolveCity(property),  [property]);
  const addressText      = useMemo(() =>
    property?.location?.addressPublic ??
    property?.location?.address ??
    property?.address ??
    "", [property]);
  const neighborhood     = useMemo(() => property?.location?.neighborhood ?? property?.neighborhood ?? "", [property]);
  const roomsValue       = useMemo(() => resolveRooms(property),     [property]);
  const bathsValue       = useMemo(() => resolveBathrooms(property), [property]);
  const areaValue        = useMemo(() => resolveArea(property),      [property]);
  const detailUrl        = useMemo(() => `/propiedades/${buildSlug(property)}-${property?.id}`, [property]);
  const transactionInfo  = useMemo(() => getTransactionInfo(property?.transactionType), [property]);
  const statusNormalized = useMemo(() => String(property?.status ?? "").toLowerCase(), [property]);
  const isAvailable      = AVAILABLE_STATUSES.has(statusNormalized);
  const isReserved       = RESERVED_STATUSES.has(statusNormalized);
  const favActive        = useMemo(() => property?.id ? isFavorite(property.id) : false, [property?.id, isFavorite]);

  const priceParts = useMemo(
    () => formatPriceShort(resolvedPrice, !transactionInfo.isVenta),
    [resolvedPrice, transactionInfo.isVenta]
  );

  // toggleFavorite del hook ya sabe si hay sesión:
  // - Si no hay sesión: internamente no hace nada / lanza callback
  // - Aquí capturamos el caso "sin sesión" para mostrar el modal
  const handleFavoriteClick = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!property?.id) return;

    // El hook expone `currentUser` indirectamente a través de su comportamiento:
    // si no hay sesión, toggleFavorite no guarda nada y nosotros mostramos el modal.
    // Para detectarlo sin acoplar al hook, intentamos el toggle y el hook
    // nos devuelve false si no hay usuario (lo extendemos abajo con onUnauthenticated).
    toggleFavorite(property.id, () => setShowLoginModal(true));
  }, [property?.id, toggleFavorite]);

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
    <>
      {/* Modal de acceso — fuera del article para no bloquear el click */}
      {showLoginModal && <LoginPromptModal onClose={() => setShowLoginModal(false)} />}

      <motion.article
        whileHover={{ y: -4, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } }}
        className="property-card"
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        aria-label={`Ver detalles de ${property?.title || "la propiedad"}`}
      >
        {/* ═══ MEDIA ═══ */}
        <div className="property-card__media">
          <img
            src={mainImage}
            alt={`${getPropertyType(property?.type)} ${transactionInfo.isVenta ? "en venta" : "en arriendo"}${cityText ? ` en ${cityText}` : ""}${property?.features?.rooms ? ` · ${property.features.rooms} habitaciones` : ""}${cityText && property?.location?.department ? `, ${property.location.department}` : ""}`}
            width={800}
            height={600}
            className="property-card__img"
            loading="lazy"
            decoding="async"
            fetchPriority="auto"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.src = "/logo-ryb.png";
              e.currentTarget.onerror = null;
            }}
          />

          <div className="property-card__overlay" aria-hidden="true" />

          {/* Badges arriba-izquierda */}
          <div className="property-card__badges">
            {isAvailable && (
              <span className="property-card__badge property-card__badge--available">
                <span className="property-card__badge-dot" />
                Disponible
              </span>
            )}
            {isReserved && (
              <span className="property-card__badge property-card__badge--reserved">
                Reservada
              </span>
            )}
            <span className={`property-card__badge property-card__badge--tx ${transactionInfo.isVenta ? "is-sale" : "is-rent"}`}>
              {transactionInfo.text}
            </span>
          </div>

          {/* Favorito arriba-derecha */}
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={handleFavoriteClick}
            disabled={favLoading}
            className={`property-card__fav ${favActive ? "is-active" : ""}`}
            aria-label={favActive ? "Quitar de favoritos" : "Agregar a favoritos"}
            aria-pressed={favActive}
            type="button"
          >
            <AnimatePresence mode="wait" initial={false}>
              {favActive ? (
                <motion.span
                  key="heart-filled"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.18, type: "spring", stiffness: 400, damping: 20 }}
                >
                  <FaHeart />
                </motion.span>
              ) : (
                <motion.span
                  key="heart-outline"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <FaRegHeart />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>

          {/* Tipo chip abajo-izquierda */}
          <span className="property-card__type-chip">
            {getPropertyType(property?.type)}
          </span>
        </div>

        {/* ═══ BODY ═══ */}
        <div className="property-card__body">
          {/* Precio */}
          <div className="property-card__price-row">
            {priceParts ? (
              <p className="property-card__price">
                <span className="property-card__price-currency">$</span>
                <span className="property-card__price-num">{priceParts.num}</span>
                {priceParts.unit && <span className="property-card__price-unit">{priceParts.unit}</span>}
                {priceParts.suffix && <span className="property-card__price-suffix">{priceParts.suffix}</span>}
              </p>
            ) : (
              <p className="property-card__price property-card__price--ask">
                Consultar precio
              </p>
            )}
          </div>

          {/* Título */}
          <h3 className="property-card__title">
            {property?.title || "Propiedad sin título"}
          </h3>

          {/* Ubicación */}
          <div className="property-card__location">
            <FaMapMarkerAlt className="property-card__location-icon" />
            <div className="min-w-0 flex-1">
              <span className="property-card__location-city">
                {cityText || "Ubicación por confirmar"}
              </span>
              {neighborhood && (
                <span className="property-card__location-neighborhood">
                  {" · "}{neighborhood}
                </span>
              )}
              {addressText && (
                <span className="property-card__location-address">{addressText}</span>
              )}
            </div>
          </div>

          {/* Features */}
          {(areaValue != null || roomsValue != null || bathsValue != null) && (
            <div className="property-card__features">
              {areaValue != null && (
                <Feature Icon={FaRulerCombined} value={areaValue} unit="m²" label="Área" />
              )}
              {roomsValue != null && (
                <Feature Icon={FaBed} value={roomsValue} label="Habitaciones" />
              )}
              {bathsValue != null && (
                <Feature Icon={FaBath} value={bathsValue} label="Baños" />
              )}
            </div>
          )}

          {/* CTA */}
          <div className="property-card__cta">
            <span>Ver detalles</span>
            <FaArrowRight className="property-card__cta-arrow" />
          </div>
        </div>
      </motion.article>
    </>
  );
};

export default PropertyCard;