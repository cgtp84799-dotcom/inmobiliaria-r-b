import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCalendarCheck } from 'react-icons/fa';
import { useVisits } from '../hooks/useVisits';
import { useAuth } from '../../../core/contexts/AuthContext';
import VisitCard from '../components/VisitCard';
import { VISIT_STATUS, VISIT_STATUS_LABELS } from '../types/visit.types';
import { db } from '../../../core/config/firebase.config';
import { collection, getDocs, query, where } from 'firebase/firestore';

async function fetchAgents() {
  const [admins, members] = await Promise.all([
    getDocs(query(collection(db, 'users'), where('role', '==', 'admin'))),
    getDocs(query(collection(db, 'users'), where('role', '==', 'member'))),
  ]);
  return [
    ...admins.docs.map((d) => ({ uid: d.id, ...d.data() })),
    ...members.docs.map((d) => ({ uid: d.id, ...d.data() })),
  ];
}

const STATUS_FILTERS = [
  { label: 'Todas',            value: 'all' },
  { label: 'Pendientes',       value: VISIT_STATUS.PENDING },
  { label: 'Aprobadas',        value: VISIT_STATUS.APPROVED },
  { label: 'Nueva hora prop.', value: VISIT_STATUS.RESCHEDULED },
  { label: 'Completadas',      value: VISIT_STATUS.COMPLETED },
  { label: 'Rechazadas',       value: VISIT_STATUS.REJECTED },
];

const KPI_STATUSES = [
  VISIT_STATUS.PENDING,
  VISIT_STATUS.APPROVED,
  VISIT_STATUS.RESCHEDULED,
  VISIT_STATUS.COMPLETED,
];

export default function VisitsPage() {
  // ✅ AuthContext expone isAdmin e isMember directamente
  const { isAdmin, isMember } = useAuth();
  const canManage = isAdmin || isMember;

  const { visits, loading, counts, approve, reject, complete, reschedule, remove } = useVisits();
  const [filter, setFilter] = useState('all');
  const [agents, setAgents] = useState([]);

  useEffect(() => {
    if (isAdmin) {
      fetchAgents().then(setAgents).catch(console.error);
    }
  }, [isAdmin]);

  const filtered = filter === 'all'
    ? visits
    : visits.filter((v) => v.status === filter);

  return (
    <div className="space-y-6">

      {/* ── Header ────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-extrabold" style={{ color: 'var(--color-text)' }}>
          {isAdmin ? 'Gestión de Visitas' : 'Mis Visitas'}
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          {isAdmin
            ? `${visits.length} visita${visits.length !== 1 ? 's' : ''} en total`
            : `${counts[VISIT_STATUS.PENDING] ?? 0} pendiente(s) · ${visits.filter(v => v.status !== VISIT_STATUS.PENDING).length} asignada(s) a ti`
          }
        </p>
      </div>

      {/* ── KPIs ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {KPI_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(filter === s ? 'all' : s)}
            className={`rounded-2xl p-4 text-left border transition-all ${
              filter === s
                ? 'border-primary/50 bg-primary/10'
                : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
            }`}
          >
            <p className="text-2xl font-extrabold text-white">{counts[s] ?? 0}</p>
            <p className="text-xs text-slate-400 mt-0.5">{VISIT_STATUS_LABELS[s]}</p>
          </button>
        ))}
      </div>

      {/* ── Filtros ───────────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors border ${
              filter === f.value
                ? 'bg-primary text-slate-950 border-primary'
                : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:border-slate-500'
            }`}
          >
            {f.label}
            {f.value !== 'all' && counts[f.value] ? ` (${counts[f.value]})` : ''}
          </button>
        ))}
      </div>

      {/* ── Lista ─────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <FaCalendarCheck className="mx-auto text-4xl text-slate-700 mb-3" />
          <p className="text-slate-400 font-semibold">No hay visitas aquí todavía</p>
          <p className="text-slate-500 text-xs mt-2">
            {filter === 'all'
              ? 'Cuando llegue una solicitud aparecerá aquí automáticamente.'
              : 'Prueba con otro filtro o espera nuevas solicitudes.'}
          </p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-3">
            {filtered.map((visit) => (
              <VisitCard
                key={visit.id}
                visit={visit}
                agents={isAdmin ? agents : []}
                isAdmin={isAdmin}
                canManage={canManage}
                onApprove={canManage ? (v, notes, agentData) => approve(v, notes, agentData) : undefined}
                onReject={canManage  ? (v, notes)             => reject(v, notes)             : undefined}
                onComplete={canManage ? (visitId, notes)      => complete(visitId, notes)      : undefined}
                onReschedule={canManage ? (visitId, date, time, notes) =>
                  reschedule(
                    visits.find((v) => v.id === visitId) ?? { id: visitId },
                    date, time, notes,
                  ) : undefined
                }
                onDelete={isAdmin ? (visitId) => remove(visitId) : undefined}
              />
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
