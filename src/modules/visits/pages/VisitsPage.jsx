import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaCalendarCheck, FaSpinner, FaSearch,
  FaFilter, FaSyncAlt,
} from 'react-icons/fa';
import { useVisits } from '../hooks/useVisits';
import VisitCard from '../components/VisitCard';
import { VISIT_STATUS, VISIT_STATUS_LABELS } from '../types/visit.types';

/**
 * VisitsPage — panel de administración de visitas.
 *
 * Ruta: /usuarios/visitas  (solo admin / member con permisos)
 *
 * Tabs: Pendientes | Aprobadas | Completadas | Rechazadas | Todas
 */
const TABS = [
  { key: 'all',                         label: 'Todas'       },
  { key: VISIT_STATUS.PENDING,           label: 'Pendientes'  },
  { key: VISIT_STATUS.APPROVED,          label: 'Aprobadas'   },
  { key: VISIT_STATUS.COMPLETED,         label: 'Completadas' },
  { key: VISIT_STATUS.REJECTED,          label: 'Rechazadas'  },
];

export default function VisitsPage() {
  const { visits, loading, counts, approve, reject, complete, remove, reload } = useVisits();

  const [activeTab,  setActiveTab]  = useState('all');
  const [search,     setSearch]     = useState('');
  const [agentFilter, setAgentFilter] = useState('');

  // Lista de agentes únicos para el filtro
  const agents = useMemo(() => {
    const names = [...new Set(visits.map((v) => v.agentName).filter(Boolean))];
    return names.sort();
  }, [visits]);

  const filtered = useMemo(() => {
    let list = [...visits];
    if (activeTab !== 'all') list = list.filter((v) => v.status === activeTab);
    if (agentFilter)         list = list.filter((v) => v.agentName === agentFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((v) =>
        v.clientName?.toLowerCase().includes(q)      ||
        v.clientEmail?.toLowerCase().includes(q)     ||
        v.propertyName?.toLowerCase().includes(q)    ||
        v.propertyAddress?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [visits, activeTab, agentFilter, search]);

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-1">
            Visitas
          </h1>
          <p className="text-slate-400 text-sm">
            Gestiona las solicitudes de visita a propiedades
          </p>
        </div>
        <button
          onClick={reload}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl
            bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm
            border border-slate-700 transition-colors disabled:opacity-50"
        >
          <FaSyncAlt className={loading ? 'animate-spin' : ''} size={12} />
          Actualizar
        </button>
      </div>

      {/* KPIs rápidos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Pendientes',  count: counts[VISIT_STATUS.PENDING]   ?? 0, color: 'text-yellow-400' },
          { label: 'Aprobadas',   count: counts[VISIT_STATUS.APPROVED]  ?? 0, color: 'text-green-400'  },
          { label: 'Completadas', count: counts[VISIT_STATUS.COMPLETED] ?? 0, color: 'text-sky-400'    },
          { label: 'Rechazadas',  count: counts[VISIT_STATUS.REJECTED]  ?? 0, color: 'text-red-400'    },
        ].map(({ label, count, color }) => (
          <div key={label}
            className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-center">
            <p className={`text-2xl font-extrabold ${color}`}>{count}</p>
            <p className="text-slate-400 text-xs mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FaSearch className="absolute left-3 top-3 text-slate-400 text-sm" />
          <input
            type="text"
            placeholder="Buscar por cliente, propiedad..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl
              pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500
              focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
          />
        </div>
        {agents.length > 0 && (
          <select
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5
              text-sm text-slate-200 focus:border-primary outline-none transition-colors"
          >
            <option value="">Todos los agentes</option>
            {agents.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900/60 border border-slate-800
        rounded-2xl p-1 overflow-x-auto">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`relative flex-shrink-0 flex items-center gap-2 px-4 py-2
              rounded-xl text-sm font-semibold transition-all
              ${ activeTab === key
                ? 'bg-primary text-slate-950'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
          >
            {label}
            {key !== 'all' && counts[key] > 0 && (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full
                ${ activeTab === key
                  ? 'bg-slate-950/30 text-slate-950'
                  : key === VISIT_STATUS.PENDING
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-slate-700 text-slate-300'
                }`}>
                {counts[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
          <FaSpinner className="animate-spin text-3xl text-primary" />
          <p className="text-sm">Cargando visitas...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-3 text-slate-500">
          <FaCalendarCheck size={40} className="opacity-30" />
          <p className="text-sm">No hay visitas en esta categoría</p>
        </div>
      ) : (
        <motion.div layout className="space-y-3">
          <AnimatePresence initial={false}>
            {filtered.map((visit) => (
              <VisitCard
                key={visit.id}
                visit={visit}
                onApprove={approve}
                onReject={reject}
                onComplete={complete}
                onDelete={remove}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Pie */}
      {!loading && filtered.length > 0 && (
        <p className="text-slate-600 text-xs text-center">
          {filtered.length} visita{filtered.length !== 1 ? 's' : ''} mostrada{filtered.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
