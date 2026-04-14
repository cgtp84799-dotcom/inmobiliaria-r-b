// src/modules/clients/components/portal/SectionInicio.jsx

import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaHome, FaHeart, FaCalendarAlt, FaFileContract,
  FaSearch, FaArrowRight, FaMapMarkerAlt, FaClock,
} from 'react-icons/fa';
import { format, differenceInDays, differenceInHours, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCOP } from '../../../../shared/utils/formatCurrency';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return '¡Buenos días';
  if (h < 18) return '¡Buenas tardes';
  return '¡Buenas noches';
}

function Countdown({ dateStr, timeStr }) {
  if (!dateStr) return null;
  const dt = parseISO(`${dateStr}T${timeStr || '10:00'}`);
  if (!isValid(dt)) return null;

  const diffH = differenceInHours(dt, new Date());
  const diffD = differenceInDays(dt, new Date());
  let label = '';
  if (diffH < 0)        label = 'Visita pasada';
  else if (diffH < 24)  label = `Hoy en ${diffH}h`;
  else if (diffD === 1) label = 'Mañana';
  else                  label = `En ${diffD} días`;

  return (
    <span className="inline-flex items-center gap-1 bg-amber-500/15 text-amber-400 text-xs px-2.5 py-1 rounded-full font-semibold border border-amber-500/20">
      <FaClock className="text-[10px]" /> {label}
    </span>
  );
}

function fmtDate(val) {
  if (!val) return '—';
  const d = typeof val === 'string' ? parseISO(val) : val?.toDate?.() ?? null;
  if (!d || !isValid(d)) return '—';
  return format(d, "d 'de' MMMM, yyyy", { locale: es });
}

export default function SectionInicio({ clientData, visits, contracts, favProps, setTab }) {
  const name      = clientData?.nombre || 'Cliente';
  const nextVisit = visits.find((v) => v.status === 'approved' || v.status === 'pending');
  const favCount  = (clientData?.favorites ?? []).length;

  const kpis = [
    { label: 'Favoritos',  value: favCount,           icon: FaHeart,        color: 'text-rose-400',    bg: 'bg-rose-500/10',    border: 'border-rose-500/20'    },
    { label: 'Visitas',    value: visits.length,      icon: FaCalendarAlt,  color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20'    },
    { label: 'Contratos',  value: contracts.length,   icon: FaFileContract, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  ].filter((k) => k.value > 0);

  return (
    <div className="space-y-7">

      {/* Saludo */}
      <div>
        <h2 className="text-2xl font-bold text-white">
          {getGreeting()}, <span className="text-amber-400">{name.split(' ')[0]}</span>! 👋
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          {format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es })}
        </p>
      </div>

      {/* KPIs */}
      {kpis.length > 0 && (
        <div className={`grid gap-3 ${kpis.length === 3 ? 'grid-cols-3' : kpis.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {kpis.map((k) => (
            <motion.div
              key={k.label}
              whileHover={{ scale: 1.02 }}
              className={`${k.bg} border ${k.border} rounded-2xl p-4 text-center cursor-default`}
            >
              <k.icon className={`${k.color} text-lg mx-auto mb-1.5`} />
              <p className="text-2xl font-bold text-white leading-none">{k.value}</p>
              <p className="text-xs text-slate-400 mt-1">{k.label}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Próxima visita */}
      {nextVisit && (
        <div className="relative overflow-hidden bg-gradient-to-r from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-2xl p-5">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-amber-500/5 blur-2xl pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-amber-400 font-semibold uppercase tracking-wider">Próxima visita</span>
              <Countdown dateStr={nextVisit.requestedDate} timeStr={nextVisit.requestedTime} />
            </div>
            <p className="text-white font-semibold">{nextVisit.propertyName || 'Propiedad'}</p>
            {nextVisit.propertyAddress && (
              <p className="text-slate-400 text-sm mt-0.5 flex items-center gap-1">
                <FaMapMarkerAlt className="text-[10px]" /> {nextVisit.propertyAddress}
              </p>
            )}
            <p className="text-slate-400 text-sm mt-1">
              {fmtDate(nextVisit.requestedDate)}
              {nextVisit.requestedTime && ` · ${nextVisit.requestedTime}`}
            </p>
          </div>
        </div>
      )}

      {/* Favoritos preview */}
      {favProps.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-300">Tus favoritos</h3>
            <button
              onClick={() => setTab('favoritos')}
              className="text-xs text-amber-400 hover:underline flex items-center gap-1"
            >
              Ver todos <FaArrowRight className="text-[10px]" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {favProps.slice(0, 3).map((p) => (
              <Link
                key={p.id}
                to={`/propiedades/${p.slug || p.id}`}
                className="group bg-slate-900/60 border border-slate-800/60 rounded-xl overflow-hidden hover:border-amber-500/30 transition"
              >
                <div className="h-24 bg-slate-800 overflow-hidden">
                  {p.images?.[0] ? (
                    <img
                      src={p.images[0]}
                      alt={p.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FaHome className="text-slate-700 text-xl" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-white text-xs font-semibold truncate">{p.title}</p>
                  <p className="text-amber-400 text-xs font-bold mt-0.5">
                    {formatCOP ? formatCOP(p.price) : `$${p.price?.toLocaleString()}`}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Estado vacío */}
      {!nextVisit && favProps.length === 0 && (
        <div className="text-center py-14">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
            <FaHome className="text-amber-400 text-2xl" />
          </div>
          <h3 className="text-white font-semibold mb-2">Descubre tu próxima propiedad</h3>
          <p className="text-slate-400 text-sm mb-5 max-w-xs mx-auto">
            Explora nuestro catálogo y guarda las que más te interesen.
          </p>
          <Link
            to="/catalogo"
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-sm transition shadow-lg shadow-amber-500/20"
          >
            <FaSearch /> Explorar catálogo
          </Link>
        </div>
      )}
    </div>
  );
}