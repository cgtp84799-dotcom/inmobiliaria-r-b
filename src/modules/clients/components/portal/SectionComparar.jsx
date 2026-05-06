// src/modules/clients/components/portal/SectionComparar.jsx
//
// MÓDULO A — Comparador de propiedades favoritas
// El cliente elige 2 o 3 propiedades de sus favoritos y las ve lado a lado.
// Compara: precio, área, habitaciones, baños, ciudad, tipo, descripción.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaHome, FaBalanceScale, FaBed, FaBath, FaRulerCombined,
  FaMapMarkerAlt, FaHeart, FaSearch, FaCheck, FaTimes,
  FaArrowRight, FaInfoCircle,
} from 'react-icons/fa';
import { formatCOP } from '../../../../shared/utils/formatCurrency';

// ─── Helpers ──────────────────────────────────────────────────────────────────
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
  return p.features?.area ?? p.area ?? null;
}
function resolveCity(p) {
  return p.location?.city ?? p.city ?? null;
}
function resolveType(p) {
  return p.type ?? p.propertyType ?? null;
}

// ─── Selector de propiedades a comparar ──────────────────────────────────────
function PropertySelector({ favProps, selected, onToggle, maxSelect }) {
  if (!favProps.length) {
    return (
      <div className="text-center py-10">
        <FaHeart className="text-[var(--color-text-faint)] text-3xl mx-auto mb-3" />
        <p className="text-[var(--color-text-muted)] text-sm">No tienes favoritos aún.</p>
        <Link to="/catalogo" className="mt-3 inline-block text-amber-400 hover:underline text-sm">
          Explorar catálogo →
        </Link>
      </div>
    );
  }

  return (
    <div>
      <p className="text-[var(--color-text-muted)] text-xs mb-3">
        Selecciona de 2 a {maxSelect} propiedades para comparar
        <span className="ml-2 text-amber-400 font-semibold">({selected.length}/{maxSelect})</span>
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {favProps.map((p) => {
          const isSelected  = selected.includes(p.id);
          const isDisabled  = !isSelected && selected.length >= maxSelect;
          const price       = resolvePrice(p);
          return (
            <button
              key={p.id}
              onClick={() => !isDisabled && onToggle(p.id)}
              disabled={isDisabled}
              className={`
                relative text-left rounded-xl border overflow-hidden transition-all
                ${isSelected
                  ? 'border-amber-500/60 ring-1 ring-amber-500/30 bg-amber-500/5'
                  : isDisabled
                    ? 'border-[var(--color-border)]/40 opacity-40 cursor-not-allowed'
                    : 'border-[var(--color-border)]/60 hover:border-[var(--color-border)] bg-[var(--color-surface)]/40'
                }
              `}
            >
              {/* Imagen */}
              <div className="h-28 bg-[var(--color-surface)] overflow-hidden">
                {p.images?.[0] ? (
                  <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FaHome className="text-[var(--color-text-faint)] text-xl" />
                  </div>
                )}
              </div>
              {/* Info */}
              <div className="p-3">
                <p className="text-[var(--color-text)] text-xs font-semibold truncate">{p.title}</p>
                {resolveCity(p) && (
                  <p className="text-[var(--color-text-muted)] text-xs mt-0.5 flex items-center gap-1">
                    <FaMapMarkerAlt className="text-[9px]" /> {resolveCity(p)}
                  </p>
                )}
                {price && (
                  <p className="text-amber-400 font-bold text-xs mt-1">
                    {formatCOP ? formatCOP(price) : `$${Number(price).toLocaleString()}`}
                  </p>
                )}
              </div>
              {/* Check overlay */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center shadow-lg">
                  <FaCheck className="text-slate-950 text-[10px]" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Tabla de comparación ─────────────────────────────────────────────────────
function CompareTable({ properties }) {
  const rows = [
    {
      label: 'Precio',
      icon: null,
      render: (p) => {
        const v = resolvePrice(p);
        return v
          ? <span className="text-amber-400 font-bold">{formatCOP ? formatCOP(v) : `$${Number(v).toLocaleString()}`}</span>
          : <span className="text-[var(--color-text-faint)]">—</span>;
      },
      highlight: (vals) => {
        const nums = vals.map(resolvePrice).map(Number);
        const min  = Math.min(...nums.filter(Boolean));
        return (p) => Number(resolvePrice(p)) === min;
      },
    },
    {
      label: 'Tipo',
      render: (p) => resolveType(p)
        ? <span className="capitalize">{resolveType(p)}</span>
        : <span className="text-[var(--color-text-faint)]">—</span>,
    },
    {
      label: 'Ciudad',
      icon: FaMapMarkerAlt,
      render: (p) => resolveCity(p) || <span className="text-[var(--color-text-faint)]">—</span>,
    },
    {
      label: 'Habitaciones',
      icon: FaBed,
      render: (p) => {
        const v = resolveRooms(p);
        return v != null ? <span>{v}</span> : <span className="text-[var(--color-text-faint)]">—</span>;
      },
      highlight: (vals) => {
        const nums = vals.map(resolveRooms).map(Number);
        const max  = Math.max(...nums.filter(Boolean));
        return (p) => Number(resolveRooms(p)) === max;
      },
    },
    {
      label: 'Baños',
      icon: FaBath,
      render: (p) => {
        const v = resolveBathrooms(p);
        return v != null ? <span>{v}</span> : <span className="text-[var(--color-text-faint)]">—</span>;
      },
      highlight: (vals) => {
        const nums = vals.map(resolveBathrooms).map(Number);
        const max  = Math.max(...nums.filter(Boolean));
        return (p) => Number(resolveBathrooms(p)) === max;
      },
    },
    {
      label: 'Área',
      icon: FaRulerCombined,
      render: (p) => {
        const v = resolveArea(p);
        return v != null ? <span>{v} m²</span> : <span className="text-[var(--color-text-faint)]">—</span>;
      },
      highlight: (vals) => {
        const nums = vals.map(resolveArea).map(Number);
        const max  = Math.max(...nums.filter(Boolean));
        return (p) => Number(resolveArea(p)) === max;
      },
    },
    {
      label: 'Descripción',
      render: (p) => (
        <span className="text-[var(--color-text-muted)] text-xs leading-relaxed line-clamp-3">
          {p.description || p.descripcion || '—'}
        </span>
      ),
    },
  ];

  const colWidth = properties.length === 2 ? 'w-1/2' : 'w-1/3';

  return (
    <div className="overflow-x-auto">
      {/* Headers con imagen */}
      <div className="flex gap-0 mb-0">
        <div className="w-28 flex-shrink-0" />
        {properties.map((p) => (
          <div key={p.id} className={`${colWidth} flex-shrink-0 px-2`}>
            <div className="rounded-xl overflow-hidden border border-[var(--color-border)]/60 bg-[var(--color-surface)]/60">
              <div className="h-32 bg-[var(--color-surface)] overflow-hidden">
                {p.images?.[0] ? (
                  <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FaHome className="text-[var(--color-text-faint)] text-2xl" />
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="text-[var(--color-text)] font-semibold text-xs truncate">{p.title}</p>
                <Link
                  to={`/propiedades/${p.slug || p.id}`}
                  className="mt-1.5 text-[10px] text-amber-400 hover:underline flex items-center gap-1"
                >
                  Ver propiedad <FaArrowRight className="text-[8px]" />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filas de comparación */}
      <div className="mt-3 space-y-1.5">
        {rows.map((row) => {
          const hlFn = row.highlight?.(properties);
          return (
            <div key={row.label} className="flex gap-0 items-start">
              {/* Label */}
              <div className="w-28 flex-shrink-0 flex items-center gap-1.5 py-3 pr-2">
                {row.icon && <row.icon className="text-[var(--color-text-muted)] text-[10px] flex-shrink-0" />}
                <span className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide leading-tight">
                  {row.label}
                </span>
              </div>
              {/* Valores */}
              {properties.map((p) => {
                const highlighted = hlFn?.(p);
                return (
                  <div
                    key={p.id}
                    className={`
                      ${colWidth} flex-shrink-0 px-2 py-3 rounded-xl text-sm
                      ${highlighted
                        ? 'bg-amber-500/8 border border-amber-500/15'
                        : 'border border-transparent'
                      }
                    `}
                  >
                    {highlighted && (
                      <span className="text-[9px] text-amber-400 font-bold uppercase tracking-wide block mb-0.5">
                        ★ mejor
                      </span>
                    )}
                    {row.render(p)}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function SectionComparar({ favProps }) {
  const MAX_SELECT = 3;
  const [selected,  setSelected]  = useState([]);
  const [comparing, setComparing] = useState(false);

  function toggleSelect(id) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  const selectedProps = favProps.filter((p) => selected.includes(p.id));

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center">
            <FaBalanceScale className="text-blue-400 text-sm" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text)]">Comparar propiedades</h2>
            <p className="text-[var(--color-text-muted)] text-xs">Compara tus favoritos lado a lado</p>
          </div>
        </div>
        {selected.length >= 2 && !comparing && (
          <button
            onClick={() => setComparing(true)}
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-sm transition shadow-lg shadow-amber-500/20"
          >
            <FaBalanceScale className="text-xs" /> Comparar ({selected.length})
          </button>
        )}
        {comparing && (
          <button
            onClick={() => setComparing(false)}
            className="inline-flex items-center gap-2 border border-[var(--color-border)]/60 text-[var(--color-text-muted)] hover:text-[var(--color-text)] px-4 py-2 rounded-xl text-sm transition"
          >
            <FaTimes className="text-xs" /> Cambiar selección
          </button>
        )}
      </div>

      {/* Sin favoritos */}
      {!favProps.length && (
        <div className="text-center py-14">
          <FaHeart className="text-[var(--color-text-faint)] text-3xl mx-auto mb-3" />
          <h3 className="text-[var(--color-text)] font-semibold mb-2">Nada que comparar aún</h3>
          <p className="text-[var(--color-text-muted)] text-sm mb-4">
            Primero guarda propiedades en tus favoritos.
          </p>
          <Link
            to="/catalogo"
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-sm transition"
          >
            <FaSearch /> Explorar catálogo
          </Link>
        </div>
      )}

      {/* Selector */}
      {!comparing && favProps.length > 0 && (
        <PropertySelector
          favProps={favProps}
          selected={selected}
          onToggle={toggleSelect}
          maxSelect={MAX_SELECT}
        />
      )}

      {/* Tabla de comparación */}
      <AnimatePresence>
        {comparing && selectedProps.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {/* Info tip */}
            <div className="flex items-center gap-2 p-3 bg-blue-500/8 border border-blue-500/15 rounded-xl mb-4">
              <FaInfoCircle className="text-blue-400 text-xs flex-shrink-0" />
              <p className="text-xs text-[var(--color-text-muted)]">
                Los valores marcados con <span className="text-amber-400 font-semibold">★ mejor</span>{' '}
                indican el más favorable en cada categoría.
              </p>
            </div>
            <CompareTable properties={selectedProps} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}