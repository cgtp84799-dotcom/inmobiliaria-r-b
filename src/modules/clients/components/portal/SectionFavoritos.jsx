// src/modules/clients/components/portal/SectionFavoritos.jsx
//
// FIX: resolveRooms, resolveBathrooms, resolveArea se usaban pero no estaban
// definidas en el scope de este archivo (estaban solo al final como helpers),
// lo que causaba ReferenceError en el render de las cards.
// Ahora se definen al inicio del archivo, antes de cualquier uso.

import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaHeart, FaHome, FaSearch, FaArrowRight,
  FaMapMarkerAlt, FaBed, FaBath, FaRulerCombined,
  FaCalendarAlt, FaBalanceScale, FaSpinner, FaTrash,
} from 'react-icons/fa';
import { formatCOP } from '../../../../shared/utils/formatCurrency';
import { useAuth } from '../../../../core/contexts/AuthContext';

// ─── Helpers (definidos antes de cualquier componente que los use) ─────────────
function resolvePrice(p) {
  return p.price?.sale ?? p.price?.rent ?? p.price ?? null;
}
function resolveRooms(p) {
  return p.features?.rooms ?? p.features?.bedrooms ?? p.bedrooms ?? p.rooms ?? null;
}
function resolveBathrooms(p) {
  return p.features?.bathrooms ?? p.bathrooms ?? null;
}
function resolveArea(p) {
  return p.features?.builtArea ?? p.features?.area ?? p.area ?? null;
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function SectionFavoritos({
  favProps,
  favLoading,
  onRemoveFavorite,
  selectedForCompare = [],
  onToggleCompare,
  compareMode = false,
}) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  function handleScheduleVisit(property) {
    const params = new URLSearchParams({
      propertyId:   property.id,
      propertyName: property.title || property.nombre || '',
      ...(property.slug    ? { slug: property.slug }           : {}),
      ...(property.address ? { address: property.address }     : {}),
      ...(currentUser?.email ? { clientEmail: currentUser.email } : {}),
    });
    navigate(`/agendar-visita?${params.toString()}`);
  }

  if (favLoading) {
    return (
      <div className="flex justify-center py-16">
        <FaSpinner className="text-amber-500 text-2xl animate-spin" />
      </div>
    );
  }

  if (!favProps.length) {
    return (
      <div className="text-center py-14">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-4">
          <FaHeart className="text-rose-400 text-2xl" />
        </div>
        <h3 className="text-white font-semibold mb-2">Aún no tienes favoritos</h3>
        <p className="text-slate-400 text-sm mb-5">
          Explora el catálogo y toca el corazón ❤️ en las propiedades que más te gusten.
        </p>
        <Link
          to="/catalogo"
          className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-sm transition shadow-lg shadow-amber-500/20"
        >
          <FaSearch /> Explorar catálogo
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <h2 className="text-lg font-bold text-white">
          Mis favoritos{' '}
          <span className="text-slate-500 font-normal text-sm">({favProps.length})</span>
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          {onToggleCompare && favProps.length >= 2 && (
            <button
              onClick={onToggleCompare}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition ${
                compareMode
                  ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                  : 'text-slate-400 border-slate-700/60 hover:text-white hover:border-slate-600'
              }`}
            >
              <FaBalanceScale className="text-[10px]" />
              {compareMode ? 'Salir de comparar' : 'Comparar propiedades'}
            </button>
          )}
          <Link
            to="/catalogo"
            className="text-xs text-amber-400 hover:underline flex items-center gap-1"
          >
            <FaSearch className="text-[10px]" /> Más propiedades
          </Link>
        </div>
      </div>

      {/* Grid de favoritos */}
      <AnimatePresence>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {favProps.map((p) => {
            const price      = resolvePrice(p);
            const rooms      = resolveRooms(p);
            const baths      = resolveBathrooms(p);
            const area       = resolveArea(p);
            const isSelected = selectedForCompare.includes(p.id);
            const cityText   = p.location?.city ?? p.city ?? null;

            return (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.2 }}
                className={`bg-slate-900/60 border rounded-2xl overflow-hidden transition group ${
                  isSelected
                    ? 'border-blue-500/50 ring-1 ring-blue-500/20'
                    : 'border-slate-800/60 hover:border-slate-700'
                }`}
              >
                {/* Imagen */}
                <div className="relative h-44 bg-slate-800 overflow-hidden">
                  {p.images?.[0] ? (
                    <img
                      src={p.images[0]}
                      alt={p.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FaHome className="text-slate-700 text-3xl" />
                    </div>
                  )}

                  {/* Botón quitar favorito */}
                  <button
                    onClick={() => onRemoveFavorite(p.id)}
                    title="Quitar de favoritos"
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-950/80 text-rose-400 hover:text-white hover:bg-rose-600 transition"
                  >
                    <FaHeart className="text-xs" />
                  </button>

                  {/* Toggle comparar */}
                  {compareMode && (
                    <button
                      onClick={() => onToggleCompare && onToggleCompare(p.id)}
                      className={`absolute top-2 left-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${
                        isSelected
                          ? 'bg-blue-500 border-blue-400 text-white'
                          : 'bg-slate-950/70 border-slate-500 text-transparent hover:border-blue-400'
                      }`}
                    >
                      {isSelected && <span className="text-[9px] font-bold">✓</span>}
                    </button>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <p className="text-white font-semibold text-sm truncate">{p.title}</p>

                  {cityText && (
                    <p className="text-slate-500 text-xs mt-0.5 flex items-center gap-1">
                      <FaMapMarkerAlt className="text-[9px]" /> {cityText}
                    </p>
                  )}

                  {price && (
                    <p className="text-amber-400 font-bold mt-1.5 text-sm">
                      {formatCOP ? formatCOP(price) : `$${Number(price).toLocaleString()}`}
                    </p>
                  )}

                  <div className="flex items-center gap-3 mt-2 text-slate-500 text-xs">
                    {rooms && (
                      <span className="flex items-center gap-1">
                        <FaBed className="text-[10px]" /> {rooms} hab.
                      </span>
                    )}
                    {baths && (
                      <span className="flex items-center gap-1">
                        <FaBath className="text-[10px]" /> {baths} baños
                      </span>
                    )}
                    {area && (
                      <span className="flex items-center gap-1">
                        <FaRulerCombined className="text-[10px]" /> {area}m²
                      </span>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="mt-3 flex gap-2">
                    <Link
                      to={`/propiedades/${p.slug || p.id}`}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 border border-amber-500/30 hover:border-amber-500/50 rounded-lg py-2 transition"
                    >
                      Ver <FaArrowRight className="text-[9px]" />
                    </Link>
                    <button
                      onClick={() => handleScheduleVisit(p)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 hover:border-emerald-500/50 rounded-lg py-2 transition"
                    >
                      <FaCalendarAlt className="text-[10px]" /> Visitar
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </AnimatePresence>

      {/* Footer de info */}
      {favProps.length > 0 && (
        <p className="text-center text-slate-600 text-xs mt-5">
          {favProps.length} propiedad{favProps.length !== 1 ? 'es' : ''} guardada{favProps.length !== 1 ? 's' : ''} · Haz clic en ❤️ para eliminar
        </p>
      )}
    </div>
  );
}