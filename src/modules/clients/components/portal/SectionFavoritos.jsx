// src/modules/clients/components/portal/SectionFavoritos.jsx
//
// MÓDULO B — Favoritos con botón "Agendar visita" directamente.
// Al hacer clic en "Agendar", navega a /agendar-visita con
// propertyId + propertyName + clientEmail pre-llenados como query params.
// ScheduleVisitPage ya lee esos params con useSearchParams.

import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaHeart, FaHome, FaSearch, FaArrowRight,
  FaMapMarkerAlt, FaBed, FaBath, FaRulerCombined,
  FaCalendarAlt, FaBalanceScale, FaSpinner,
} from 'react-icons/fa';
import { formatCOP } from '../../../../shared/utils/formatCurrency';
import { useAuth } from '../../../../core/contexts/AuthContext';

function resolvePrice(p) {
  return p.price?.sale ?? p.price?.rent ?? p.price ?? null;
}

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
      ...(property.slug   ? { slug: property.slug }            : {}),
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
          Explora el catálogo y guarda las propiedades que más te gusten.
        </p>
        <Link
          to="/catalogo"
          className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-sm transition"
        >
          <FaSearch /> Explorar catálogo
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-white">
          Mis favoritos{' '}
          <span className="text-slate-500 font-normal text-sm">({favProps.length})</span>
        </h2>
        <div className="flex items-center gap-2">
          {onToggleCompare && favProps.length >= 2 && (
            <button
              onClick={onToggleCompare}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition ${
                compareMode
                  ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                  : 'text-slate-400 border-slate-700/60 hover:text-white'
              }`}
            >
              <FaBalanceScale className="text-[10px]" />
              {compareMode ? 'Salir de comparar' : 'Comparar'}
            </button>
          )}
          <Link to="/catalogo" className="text-xs text-amber-400 hover:underline flex items-center gap-1">
            <FaSearch className="text-[10px]" /> Más propiedades
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {favProps.map((p) => {
          const price       = resolvePrice(p);
          const isSelected  = selectedForCompare.includes(p.id);

          return (
            <motion.div
              key={p.id}
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
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

              {/* Datos */}
              <div className="p-4">
                <p className="text-white font-semibold text-sm truncate">{p.title}</p>
                {(p.city || p.location?.city) && (
                  <p className="text-slate-500 text-xs mt-0.5 flex items-center gap-1">
                    <FaMapMarkerAlt className="text-[9px]" />
                    {p.location?.city ?? p.city}
                  </p>
                )}
                {price && (
                  <p className="text-amber-400 font-bold mt-1.5 text-sm">
                    {formatCOP ? formatCOP(price) : `$${Number(price).toLocaleString()}`}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-2 text-slate-500 text-xs">
                  {resolveRooms(p)      && <span className="flex items-center gap-1"><FaBed />{resolveRooms(p)}</span>}
                  {resolveBathrooms(p)  && <span className="flex items-center gap-1"><FaBath />{resolveBathrooms(p)}</span>}
                  {resolveArea(p)       && <span className="flex items-center gap-1"><FaRulerCombined />{resolveArea(p)}m²</span>}
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
    </div>
  );
}

// helpers usados también por SectionComparar
function resolveRooms(p) {
  return p.features?.rooms ?? p.features?.bedrooms ?? p.bedrooms ?? p.rooms ?? null;
}
function resolveBathrooms(p) {
  return p.features?.bathrooms ?? p.bathrooms ?? null;
}
function resolveArea(p) {
  return p.features?.area ?? p.area ?? null;
}