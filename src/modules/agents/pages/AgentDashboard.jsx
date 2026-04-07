// src/modules/agents/pages/AgentDashboard.jsx
// Dashboard exclusivo del rol AGENT — datos en tiempo real via Firestore

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  FaCalendarCheck, FaHourglassHalf, FaCheckCircle, FaTimesCircle,
  FaHome, FaFileContract, FaMoneyBillWave, FaBolt, FaArrowRight,
  FaBuilding, FaChartLine, FaTrophy,
} from 'react-icons/fa';
import { useAuth }           from '../../../core/contexts/AuthContext';
import { useAgentDashboard } from '../hooks/useAgentDashboard';
import AgentKPICard          from '../components/AgentKPICard';
import AgentVisitRow         from '../components/AgentVisitRow';
import AgentGoalBar          from '../components/AgentGoalBar';

// Metas mensuales configurables (después vendrán de Firestore settings)
const MONTHLY_GOALS = {
  visits:     20,
  properties:  8,
  contracts:   3,
};

const fmtCOP = (n) =>
  n ? `$${n.toLocaleString('es-CO')}` : '$0';

const fmtDate = (ts) => {
  if (!ts) return '--';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
};

const PROPERTY_STATUS_LABEL = {
  active:    { label: 'Activa',    color: 'green-400'  },
  inactive:  { label: 'Inactiva',  color: 'slate-400'  },
  sold:      { label: 'Vendida',   color: 'blue-400'   },
  rented:    { label: 'Arrendada', color: 'yellow-400' },
  suspended: { label: 'Suspendida',color: 'red-400'    },
};

const CONTRACT_STATUS_LABEL = {
  active:    { label: 'Vigente',   color: 'green-400'  },
  pending:   { label: 'Pendiente', color: 'yellow-400' },
  finished:  { label: 'Finalizado',color: 'slate-400'  },
  cancelled: { label: 'Cancelado', color: 'red-400'    },
};

const AgentDashboard = () => {
  const { currentUser, userData } = useAuth();
  const email = currentUser?.email;

  const {
    loading,
    visitsToday, visitsPending, visitsCompleted, visitsCancelled,
    propertiesActive, propertiesTotal,
    contractsActive, contractsValue,
    visitsHoy, propertiesRecent, contractsRecent, activity,
    monthVisits, monthContracts, monthProperties,
  } = useAgentDashboard(email);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 18) return 'Buenas tardes';
    return 'Buenas noches';
  }, []);

  const nombre = userData?.displayName?.split(' ')[0] || 'Agente';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Cargando tu panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-8 max-w-7xl">

      {/* ── Saludo personal ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-primary">
            {greeting}, {nombre} 👋
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Aquí está el resumen de tu actividad hoy —{' '}
            {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <Link
          to="/visitas/nueva"
          className="button-gold inline-flex items-center gap-2 px-5 py-2.5 text-sm self-start sm:self-auto"
        >
          <FaCalendarCheck /> Agendar visita
        </Link>
      </motion.div>

      {/* ── KPIs principales ─────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Resumen general</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <AgentKPICard
            icon={FaCalendarCheck}
            label="Visitas hoy"
            value={visitsToday}
            sub={visitsPending > 0 ? `${visitsPending} pendientes` : 'Al día 🎉'}
            color="primary"
            delay={0}
          />
          <AgentKPICard
            icon={FaHourglassHalf}
            label="Visitas pendientes"
            value={visitsPending}
            sub="total sin completar"
            color="yellow-400"
            delay={0.05}
          />
          <AgentKPICard
            icon={FaHome}
            label="Propiedades activas"
            value={propertiesActive}
            sub={`${propertiesTotal} en total`}
            color="blue-400"
            delay={0.1}
          />
          <AgentKPICard
            icon={FaMoneyBillWave}
            label="Valor contratos activos"
            value={fmtCOP(contractsValue)}
            sub={`${contractsActive} contratos vigentes`}
            color="green-400"
            delay={0.15}
          />
        </div>
      </section>

      {/* ── Fila media: Visitas hoy + Metas del mes ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Visitas de hoy — ocupa 2 columnas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 card-soft p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <FaBolt className="text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-light">Visitas de hoy</h3>
                <p className="text-xs text-slate-400">{visitsHoy.length} programadas</p>
              </div>
            </div>
            <Link to="/visitas" className="text-xs text-primary hover:underline flex items-center gap-1">
              Ver todas <FaArrowRight className="text-xs" />
            </Link>
          </div>

          {visitsHoy.length === 0 ? (
            <div className="py-10 text-center">
              <FaCalendarCheck className="text-slate-700 text-4xl mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No tienes visitas programadas para hoy.</p>
              <Link to="/visitas/nueva" className="text-primary text-xs hover:underline mt-2 inline-block">
                ¿Agendamos una?
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {visitsHoy.map(v => <AgentVisitRow key={v.id} visit={v} />)}
            </div>
          )}
        </motion.div>

        {/* Metas del mes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="card-soft p-5"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-yellow-400/10 flex items-center justify-center">
              <FaTrophy className="text-yellow-400" />
            </div>
            <div>
              <h3 className="font-bold text-light">Metas del mes</h3>
              <p className="text-xs text-slate-400">
                {new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="space-y-5">
            <AgentGoalBar
              label="Visitas realizadas"
              current={monthVisits}
              goal={MONTHLY_GOALS.visits}
              color="primary"
            />
            <AgentGoalBar
              label="Propiedades captadas"
              current={monthProperties}
              goal={MONTHLY_GOALS.properties}
              color="blue-400"
            />
            <AgentGoalBar
              label="Contratos firmados"
              current={monthContracts}
              goal={MONTHLY_GOALS.contracts}
              color="green-400"
            />
          </div>
        </motion.div>
      </div>

      {/* ── Fila inferior: Propiedades + Contratos + Actividad ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Mis propiedades recientes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card-soft p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-400/10 flex items-center justify-center">
                <FaBuilding className="text-blue-400" />
              </div>
              <h3 className="font-bold text-light">Mis propiedades</h3>
            </div>
            <Link to="/propiedades" className="text-xs text-primary hover:underline flex items-center gap-1">
              Ver <FaArrowRight className="text-xs" />
            </Link>
          </div>

          {propertiesRecent.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">Aún no has registrado propiedades.</p>
          ) : (
            <div className="space-y-2">
              {propertiesRecent.slice(0, 5).map(p => {
                const s = PROPERTY_STATUS_LABEL[p.status] || { label: p.status, color: 'slate-400' };
                return (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FaHome className="text-slate-600 text-xs flex-shrink-0" />
                      <span className="text-sm text-light truncate">{p.title || p.address || 'Propiedad'}</span>
                    </div>
                    <span className={`text-xs text-${s.color} bg-${s.color}/10 px-2 py-0.5 rounded-full flex-shrink-0`}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Mis contratos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="card-soft p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-green-400/10 flex items-center justify-center">
                <FaFileContract className="text-green-400" />
              </div>
              <h3 className="font-bold text-light">Mis contratos</h3>
            </div>
            <Link to="/contratos" className="text-xs text-primary hover:underline flex items-center gap-1">
              Ver <FaArrowRight className="text-xs" />
            </Link>
          </div>

          {contractsRecent.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">Aún no tienes contratos registrados.</p>
          ) : (
            <div className="space-y-2">
              {contractsRecent.map(c => {
                const s = CONTRACT_STATUS_LABEL[c.status] || { label: c.status, color: 'slate-400' };
                return (
                  <div key={c.id} className="py-2 border-b border-slate-800 last:border-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-light truncate flex-1">
                        {c.clientName || c.propertyTitle || 'Contrato'}
                      </span>
                      <span className={`text-xs text-${s.color} bg-${s.color}/10 px-2 py-0.5 rounded-full flex-shrink-0`}>
                        {s.label}
                      </span>
                    </div>
                    {c.value && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        {fmtCOP(c.value)} · {fmtDate(c.startDate)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Actividad reciente */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card-soft p-5"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <FaChartLine className="text-primary" />
            </div>
            <h3 className="font-bold text-light">Actividad reciente</h3>
          </div>

          {activity.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">Sin actividad reciente.</p>
          ) : (
            <div className="space-y-3">
              {activity.slice(0, 8).map((a, i) => (
                <div key={a.id} className="flex items-start gap-3">
                  <div className="relative flex-shrink-0 mt-1">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    {i < activity.length - 1 && (
                      <div className="absolute left-[3px] top-3 w-px h-full bg-slate-800" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-light leading-snug">{a.message || a.title || 'Evento'}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{fmtDate(a.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Stats rápidas de visitas ──────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="grid grid-cols-3 gap-4"
      >
        {[
          { label: 'Visitas completadas', value: visitsCompleted, color: 'green-400',  icon: FaCheckCircle  },
          { label: 'Visitas pendientes',  value: visitsPending,   color: 'yellow-400', icon: FaHourglassHalf },
          { label: 'Visitas canceladas',  value: visitsCancelled, color: 'red-400',    icon: FaTimesCircle  },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="card-soft p-4 text-center">
            <Icon className={`text-${color} text-2xl mx-auto mb-2`} />
            <p className={`text-3xl font-bold text-${color} tabular-nums`}>{value}</p>
            <p className="text-xs text-slate-400 mt-1">{label}</p>
          </div>
        ))}
      </motion.div>

    </div>
  );
};

export default AgentDashboard;
