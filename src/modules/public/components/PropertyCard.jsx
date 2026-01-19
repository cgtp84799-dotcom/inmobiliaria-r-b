import { useState } from "react";
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

const PropertyCard = ({ property, onFavorite }) => {
  const navigate = useNavigate();
  const [isFavorite, setIsFavorite] = useState(false);

  const mainImage =
    property.images?.[0] || "https://via.placeholder.com/800x600?text=Sin+Imagen";

  const formatPrice = (price) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(price || 0);
  };

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    setIsFavorite((v) => !v);
    if (onFavorite) onFavorite(property.id);
  };

  const handleCardClick = () => {
    navigate(`/propiedades/${property.id}`);
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
      office: "Oficina",
      warehouse: "Bodega",
    };
    const lower = String(type || "").toLowerCase();
    return types[lower] || type || "Propiedad";
  };

  const getTransactionType = () => {
    const type = property.transactionType;
    if (!type) return { text: "N/A", isVenta: false };

    const lower = String(type).toLowerCase();

    if (lower === "sale" || lower === "venta" || lower === "compra") {
      return { text: "VENTA", isVenta: true };
    }
    if (
      lower === "rent" ||
      lower === "arriendo" ||
      lower === "alquiler" ||
      lower === "renta"
    ) {
      return { text: "ARRIENDO", isVenta: false };
    }

    return { text: String(type).toUpperCase(), isVenta: false };
  };

  const transactionInfo = getTransactionType();

  const roomsValue =
    property.rooms ?? property.features?.bedrooms ?? property.bedrooms ?? null;
  const bathsValue = property.bathrooms ?? property.features?.bathrooms ?? null;
  const areaValue = property.area ?? property.features?.area ?? null;

  const addressText =
    property.address || property.location?.address || "Dirección no disponible";
  const cityText = property.city || property.location?.city || "";

  return (
    <motion.div
      whileHover={{ y: -3, transition: { duration: 0.22 } }}
      className="bg-slate-900 rounded-2xl overflow-hidden cursor-pointer group border border-slate-800 hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-primary/10"
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") handleCardClick();
      }}
    >
      {/* Imagen principal (más pequeña en móvil) */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={mainImage}
          alt={property.title || "Propiedad"}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src =
              "https://via.placeholder.com/800x600?text=Sin+Imagen";
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Badges superiores */}
        <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
          {property.status === "disponible" && (
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

        {/* Botón de favorito */}
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.92 }}
          onClick={handleFavoriteClick}
          className="absolute top-3 right-3 w-10 h-10 bg-black/75 hover:bg-black/90 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all duration-200 shadow-xl border border-white/20 z-10"
          aria-label={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
        >
          {isFavorite ? (
            <FaHeart className="text-red-500" size={18} />
          ) : (
            <FaRegHeart size={18} />
          )}
        </motion.button>

        {/* Precio */}
        <div className="absolute bottom-3 left-3 right-3 z-10">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <span className="inline-flex items-center px-3 py-2 rounded-xl bg-slate-950/90 backdrop-blur-md border border-primary/40 shadow-xl">
                <span className="text-primary font-black text-base sm:text-xl truncate">
                  {formatPrice(property.price)}
                </span>
              </span>
            </div>

            <div className="w-10 h-10 bg-primary/15 rounded-full flex items-center justify-center backdrop-blur-sm border border-primary/30 flex-shrink-0">
              <FaArrowRight className="text-primary" size={16} />
            </div>
          </div>
        </div>
      </div>

      {/* Contenido (más compacto en móvil) */}
      <div className="p-3 sm:p-5">
        {/* Tipo de propiedad */}
        <div className="flex items-center gap-2 text-primary text-[11px] sm:text-sm font-bold mb-2">
          <FaHome className="text-base sm:text-lg" />
          <span className="uppercase tracking-wide">
            {getPropertyType(property.type)}
          </span>
        </div>

        {/* Título (un poquito más pequeño en móvil) */}
        <h3 className="text-sm sm:text-lg font-bold text-white mb-2 line-clamp-2 group-hover:text-primary transition-colors leading-snug">
          {property.title || "Propiedad sin título"}
        </h3>

        {/* ✅ Ubicación: ciudad visible SIEMPRE primero */}
        <div className="flex items-start gap-2 text-slate-300 text-xs sm:text-sm mb-3 pb-3 border-b border-slate-800">
          <FaMapMarkerAlt className="mt-0.5 flex-shrink-0 text-primary" size={14} />
          <span className="min-w-0">
            <span className="text-slate-200 font-semibold">
              {cityText || "Ciudad no disponible"}
            </span>
            {property.neighborhood ? (
              <span className="text-slate-400">{" • "}{property.neighborhood}</span>
            ) : null}
            <span className="block text-slate-500 line-clamp-1">
              {addressText}
            </span>
          </span>
        </div>

        {/* Características */}
        <div className="grid grid-cols-3 gap-2 mb-3 sm:mb-4">
          <div className="flex flex-col items-center p-2 bg-slate-800/40 rounded-lg hover:bg-slate-800 transition-colors">
            <FaRulerCombined className="text-primary mb-1.5" size={16} />
            <span className="text-white font-black text-sm leading-none">
              {areaValue ? String(areaValue) : "—"}
            </span>
            <span className="text-slate-400 text-[10px] mt-0.5">m²</span>
          </div>

          <div className="flex flex-col items-center p-2 bg-slate-800/40 rounded-lg hover:bg-slate-800 transition-colors">
            <FaBed className="text-primary mb-1.5" size={16} />
            <span className="text-white font-black text-sm leading-none">
              {roomsValue !== null && roomsValue !== undefined ? String(roomsValue) : "—"}
            </span>
            <span className="text-slate-400 text-[10px] mt-0.5">Hab.</span>
          </div>

          <div className="flex flex-col items-center p-2 bg-slate-800/40 rounded-lg hover:bg-slate-800 transition-colors">
            <FaBath className="text-primary mb-1.5" size={16} />
            <span className="text-white font-black text-sm leading-none">
              {bathsValue !== null && bathsValue !== undefined ? String(bathsValue) : "—"}
            </span>
            <span className="text-slate-400 text-[10px] mt-0.5">Baños</span>
          </div>
        </div>

        {/* CTA */}
        <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
          <div className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-primary via-yellow-500 to-primary text-slate-900 font-black text-center rounded-xl group-hover:shadow-lg group-hover:shadow-primary/40 transition-all duration-300 flex items-center justify-center gap-2 text-sm">
            Ver detalles
            <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
          </div>
        </motion.div>
      </div>

      <div className="h-1.5 bg-gradient-to-r from-transparent via-primary to-transparent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
    </motion.div>
  );
};

export default PropertyCard;