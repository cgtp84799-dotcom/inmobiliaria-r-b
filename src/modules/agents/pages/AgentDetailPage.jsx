import { useParams, Link } from 'react-router-dom';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  FaArrowLeft, FaCalendarCheck, FaFileContract,
  FaChartLine, FaEnvelope, FaUser,
  FaTrophy, FaCheckCircle, FaHourglass,
} from 'react-icons/fa';
import { useAgentStats } from '../hooks/useAgentStats';
import AgentActivityFeed from '../components/AgentActivityFeed';
import AgentPerformanceChart from '../components/AgentPerformanceChart';
import { PRIVATE_ROUTES } from '../../../core/config/routes.config';
import { formatCOP } from '../../../shared/utils/formatCurrency';

/**
 * AgentDetailPage — perfil completo de un agente.
 * Ruta: /agentes/:agentId
 *
 * Secciones:
 *  1. Header con foto, nombre, rol, estado
 *  2. KPIs individuales (6 métricas)
 *  3. Gráfica de rendimiento últimos 6 meses
 *  4. Feed de actividad reciente (visitas + contratos)
 *  5. Desglose de visitas por estado
 *  6. Desglose de contratos por tipo
 */
export default function AgentDetailPage() {
  const { agentId } = useParams();
  const { stats, visits, contracts, users, loading } = useAgentStats(null);

  // Encontrar el agente en la lista de usuarios
  const agent = useMemo(
    () => users.find((u) => u.id === agentId),
    [users, agentId],
  );

  // Filtrar datos de este agente específico
  const agentVisits    = useMemo(
    () => visits.filter((v) => v.agentEmail === agent?.email || v.agentId === agentId),
    [visits, agent, agentId],
  );
  const agentContracts = useMemo(
    () => contracts.filter((c) => c.agentEmail === agent?.email || c.agentId === agentId),
    [contracts, agent, agentId],
  );

  // Métricas individuales calculadas
  const metrics = useMemo(() => {
    const completedVisits = agentVisits.filter((v) => v.status === 'completed').length;
    const activeContracts = agentContracts.filter((c) => c.status === 'active').length;
    const totalRevenue    = agentContracts
      .filter((c) => c.status === 'active')
      .reduce((s, c) => s + (Number(c.value) || 0), 0);
    const conversionRate  = completedVisits > 0
      ? Math.min(100, Math.round((activeContracts / completedVisits) * 100))
      : 0;

    const now = new Date();
    const monthlyData = Array.from({ length: 6 }, (_, i) => {
      const date  = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const m     = date.getMonth();
      const y     = date.getFullYear();
      const label = date.toLocaleDateString('es-CO', { month: 'short' });
      const toD   = (v) => v?.toDate ? v.toDate() : (v ? new Date(v) : null);
      return {
        label,
        visits: agentVisits.filter((v) => {
          const d = toD(v.createdAt); return d && d.getMonth() === m && d.getFullYear() === y;
        }).length,
        contracts: agentContracts.filter((c) => {
          const d = toD(c.createdAt); return d && d.getMonth() === m && d.getFullYear() === y;
        }).length,
      };
    });

    const recentActivity = [
      ...agentVisits.slice(0, 15).map((v) => ({
        id: v.id, type: 'visit',
        title:  v.propertyTitle || v.propertyAddress || 'Propiedad sin nombre',
        client: v.clientName || v.visitorName || v.email || '—',
        status: v.status,
        date:   v.createdAt?.toDate ? v.createdAt.toDate() : (v.createdAt ? new Date(v.createdAt) : null),
        agent:  v.agentName || v.agentEmail || '—',
      })),
      ...agentContracts.slice(0, 15).map((c) => ({
        id: c.id, type: 'contract',
        title:  c.propertyName || '—',
        client: c.clientName  || '—',
        status: c.status,
        date:   c.createdAt?.toDate ? c.createdAt.toDate() : (c.createdAt ? new Date(c.createdAt) : null),
        agent:  c.agentName || c.agentEmail || '—',
        value:  c.value,
      })),
    ].filter((a) => a.date).sort((a, b) => b.date - a.date).slice(0, 25);

    return {
      totalVisits:    agentVisits.length,
      completedVisits,
      pendingVisits:  agentVisits.filter((v) => v.status === 'pending').length,
      rejectedVisits: agentVisits.filter((v) => v.status === 'rejected').length,
      totalContracts:  agentContracts.length,
      activeContracts,
      totalRevenue,
      conversionRate,
      monthlyData,
      recentActivity,
    };
  }, [agentVisits, agentContracts]);

  const initials = (agent?.displayName || agent?.email || '?')
    .split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  const roleLabels = { admin: 'Administrador', member: 'Miembro', agent: 'Agente', viewer: 'Lector' };
  const roleColors = {
    admin:  'text-red-400    bg-red-500/10    border-red-500/30',
    member: 'text-blue-400   bg-blue-500/10   border-blue-500/30',
    agent:  'text-green-400  bg-green-500/10  border-green-500/30',
    viewer: 'text-slate-400  bg-slate-500/10  border-slate-500/30',
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 bg-slate-900/60 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-900/60 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="py-20 text-center">
        <FaUser className="mx-auto text-5xl text-slate-700 mb-4" />
        <p className="text-slate-400">Agente no encontrado</p>
        <Link to={PRIVATE_ROUTES.AGENTS}
          className="mt-4 inline-flex items-center gap-2 text-primary text-sm hover:underline">
          <FaArrowLeft size={12} /> Volver a agentes
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">

      {/* ── Botón volver ── */}
      <Link
        to={PRIVATE_ROUTES.AGENTS}
        className="inline-flex items-center gap-2 text-slate-400 hover:text-primary
          text-sm transition-colors"
      >
        <FaArrowLeft size={12} /> Todos los agentes
      </Link>

      {/* ── Header del agente ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6
          flex flex-col sm:flex-row items-start sm:items-center gap-5
          relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/4
          via-transparent to-transparent pointer-events-none" />

        {/* Avatar grande */}
        <div className="relative flex-shrink-0">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/30 to-slate-700
            flex items-center justify-center text-2xl font-bold text-primary
            border-2 border-slate-700 overflow-hidden">
            {agent.photoURL
              ? <img src={agent.photoURL} alt={agent.displayName} className="w-full h-full object-cover" />
              : initials}
          </div>
          <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900
            shadow-sm ${
              agent.status === 'active' ? 'bg-green-400 shadow-green-400/40' : 'bg-slate-500'
            }`}
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-extrabold text-white truncate">
            {agent.displayName || 'Sin nombre'}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <FaEnvelope className="text-slate-500" size={11} />
            <span className="text-slate-400 text-sm">{agent.email}</span>
          </div>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
              text-xs font-semibold border ${roleColors[agent.role] ?? roleColors.member}`}>
              {roleLabels[agent.role] ?? 'Miembro'}
            </span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
              text-xs font-semibold border ${
                agent.status === 'active'
                  ? 'text-green-400 bg-green-500/10 border-green-500/30'
                  : 'text-slate-400 bg-slate-500/10 border-slate-500/30'
              }`}>
              {agent.status === 'active' ? 'Activo' : 'Inactivo'}
            </span>
          </div>
        </div>

        {/* Tasa de conversión destacada */}
        <div className="text-center flex-shrink-0">
          <div className="flex items-center gap-1.5 justify-center">
            <FaTrophy className="text-yellow-400" size={16} />
            <p className="text-3xl font-extrabold text-yellow-400">
              {metrics.conversionRate}%
            </p>
          </div>
          <p className="text-slate-500 text-xs mt-0.5">Tasa de conversión</p>
        </div>
      </motion.div>

      {/* ── KPIs individuales ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { icon: FaCalendarCheck, label: 'Visitas totales',    value: metrics.totalVisits,     color: 'text-blue-400'   },
          { icon: FaCheckCircle,   label: 'Completadas',        value: metrics.completedVisits,  color: 'text-green-400'  },
          { icon: FaHourglass,     label: 'Pendientes',         value: metrics.pendingVisits,    color: 'text-yellow-400' },
          { icon: FaFileContract,  label: 'Contratos',          value: metrics.totalContracts,   color: 'text-purple-400' },
          { icon: FaCheckCircle,   label: 'Vigentes',           value: metrics.activeContracts,  color: 'text-green-400'  },
          { icon: FaChartLine,     label: 'Ingresos activos',   value: formatCOP(metrics.totalRevenue), color: 'text-primary' },
        ].map(({ icon: Icon, label, value, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 text-center"
          >
            <Icon className={`${color} text-lg mx-auto mb-1.5`} />
            <p className={`text-lg font-extrabold ${color} leading-none`}>{value}</p>
            <p className="text-slate-500 text-[11px] mt-1 leading-tight">{label}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Gráfica + Feed ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Gráfica de rendimiento */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5">
          <h2 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
            <FaChartLine className="text-primary" /> Rendimiento últimos 6 meses
          </h2>
          <AgentPerformanceChart monthlyData={metrics.monthlyData} loading={loading} />
        </div>

        {/* Feed de actividad */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 max-h-[400px] overflow-y-auto">
          <h2 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
            <FaCalendarCheck className="text-blue-400" /> Actividad reciente
          </h2>
          <AgentActivityFeed activities={metrics.recentActivity} loading={loading} />
        </div>
      </div>

      {/* ── Desglose visitas por estado ── */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5">
        <h2 className="text-white font-bold text-sm mb-4">Visitas por estado</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Pendientes',    count: metrics.pendingVisits,   color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
            { label: 'Completadas',   count: metrics.completedVisits, color: 'bg-green-500/20  text-green-400  border-green-500/30'  },
            { label: 'Rechazadas',    count: metrics.rejectedVisits,  color: 'bg-red-500/20    text-red-400    border-red-500/30'    },
            { label: 'Total visitas', count: metrics.totalVisits,     color: 'bg-blue-500/20   text-blue-400   border-blue-500/30'   },
          ].map(({ label, count, color }) => (
            <div key={label} className={`rounded-xl p-3 text-center border ${color}`}>
              <p className="text-2xl font-extrabold">{count}</p>
              <p className="text-xs mt-1 opacity-80">{label}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
