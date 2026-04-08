import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCalendarCheck } from 'react-icons/fa';
import { useVisits } from '../hooks/useVisits';
import { useAuth } from '../../../core/contexts/AuthContext';
import VisitCard from '../components/VisitCard';
import { VISIT_STATUS, VISIT_STATUS_LABELS } from '../types/visit.types';
import { db } from '../../../core/config/firebase.config';
import { collection, getDocs, query, where } from 'firebase/firestore';

// Solo el admin necesita la lista de agentes para elegir a quién asignar.
// El member se auto-asigna al aprobar, así que no necesita el selector.
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
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  const { visits, loading, counts, approve, reject, complete, reschedule, remove } = useVisits();
  const [filter, setFilter] = useState('all');
  const [agents, setAgents] = useState([]);

  // Solo el admin carga la lista de agentes
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
            : `${visits.filter(v => v.status === VISIT_STATUS.PENDING).length} pendiente(s) disponibles · ${visits.filter(v => v.status !== VISIT_STATUS.PENDING).length} asignada(s) a ti`
          }
        </p>
      </div>

      {/* ── Aviso para members (cómo funciona el sistema) ─────────── */}
      {!isAdmin && (
        <div className="bg-blue-500/10 border border-blue-500/25 rounded-2xl p-4">
          <p className="text-blue-300 text-sm font-semibold mb-1">¿Cómo funciona?</p>
          <p className="text-blue-200 text-xs leading-relaxed">
            Las visitas <strong>pendientes</strong> son solicitudes que aún nadie ha tomado.
            Si apruebas una, queda asignada a ti y desaparece para los demás agentes.
            Solo tú y el administrador podrán verla a partir de ese momento.
          </p>
        </div>
      )}

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
          <p className="text-slate-400">No hay visitas con este filtro</p>
          {!isAdmin && filter === 'all' && (
            <p className="text-slate-500 text-xs mt-2">
              Cuando llegue una nueva solicitud aparecerá aquí automáticamente.
            </p>
          )}
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-3">
            {filtered.map((visit) => (
              <VisitCard
                key={visit.id}
                visit={visit}
                agents={isAdmin ? agents : []}  // member no necesita el selector
                onApprove={(v, notes, agentData) => approve(v, notes, agentData)}
                onReject={(v, notes)             => reject(v, notes)}
                onComplete={(visitId, notes)      => complete(visitId, notes)}
                onReschedule={(visitId, date, time, notes) =>
                  reschedule(
                    visits.find((v) => v.id === visitId) ?? { id: visitId },
                    date, time, notes,
                  )
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
