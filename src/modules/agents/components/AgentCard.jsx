import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  FaUser, FaEye, FaCalendarCheck, FaFileContract,
  FaChartLine, FaArrowRight,
} from 'react-icons/fa';
import { PRIVATE_ROUTES } from '../../../core/config/routes.config';
import { formatCOP } from '../../../shared/utils/formatCurrency';

/**
 * AgentCard — tarjeta compacta de agente con foto, métricas clave y sparkline.
 * Se usa en AgentsPage (lista/grid de agentes).
 */
export default function AgentCard({ agent, stats, index = 0 }) {
  const initials = (agent.displayName || agent.email || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Sparkline SVG inline a partir de weeklyVisits
  const spark = stats?.weeklyVisits ?? [0, 0, 0, 0, 0, 0];
  const max   = Math.max(...spark, 1);
  const W = 80; const H = 28;
  const pts = spark.map((v, i) => {
    const x = (i / (spark.length - 1)) * W;
    const y = H - (v / max) * H;
    return `${x},${y}`;
  }).join(' ');

  const roleColors = {
    admin:  { bg: 'bg-red-500/20',    text: 'text-red-400',    border: 'border-red-500/30'    },
    member: { bg: 'bg-blue-500/20',   text: 'text-blue-400',   border: 'border-blue-500/30'   },
    agent:  { bg: 'bg-green-500/20',  text: 'text-green-400',  border: 'border-green-500/30'  },
    viewer: { bg: 'bg-slate-500/20',  text: 'text-[var(--color-text-muted)]',  border: 'border-slate-500/30'  },
  };
  const rc = roleColors[agent.role] ?? roleColors.member;

  const statusDot = agent.status === 'active'
    ? 'bg-green-400 shadow-green-400/50'
    : 'bg-slate-500';

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.4 }}
      whileHover={{ y: -4 }}
      className="bg-[var(--color-surface)]/70 border border-[var(--color-border)] hover:border-primary/40
        rounded-2xl p-5 flex flex-col gap-4 transition-colors relative overflow-hidden"
    >
      {/* Gradiente decorativo de fondo */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-transparent pointer-events-none" />

      {/* Cabecera: avatar + nombre + rol */}
      <div className="flex items-start gap-3">
        <div className="relative flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-slate-700
            flex items-center justify-center font-bold text-primary text-sm overflow-hidden
            border-2 border-[var(--color-border)]">
            {agent.photoURL
              ? <img src={agent.photoURL} alt={agent.displayName} className="w-full h-full object-cover" />
              : initials}
          </div>
          {/* Indicador de estado en tiempo real */}
          <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full
            border-2 border-[var(--color-border)] ${statusDot} shadow-sm`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[var(--color-text)] font-bold text-sm truncate">
            {agent.displayName || 'Sin nombre'}
          </p>
          <p className="text-[var(--color-text-muted)] text-xs truncate">{agent.email}</p>
          <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full
            text-[10px] font-semibold border ${rc.bg} ${rc.text} ${rc.border}`}>
            {agent.role === 'admin' ? 'Admin' :
             agent.role === 'agent' ? 'Agente' : 'Miembro'}
          </span>
        </div>
      </div>

      {/* KPIs en grid 2×2 */}
      <div className="grid grid-cols-2 gap-2">
        <Kpi icon={FaCalendarCheck} label="Visitas" value={stats?.totalVisits ?? 0}  color="text-blue-400" />
        <Kpi icon={FaFileContract}  label="Contratos" value={stats?.totalContracts ?? 0} color="text-purple-400" />
        <Kpi icon={FaChartLine}     label="Conv. %" value={`${stats?.conversionRate ?? 0}%`} color="text-green-400" />
        <Kpi icon={FaEye}           label="Este mes" value={stats?.visitsThisMonth ?? 0} color="text-yellow-400" />
      </div>

      {/* Revenue */}
      {(stats?.totalRevenue ?? 0) > 0 && (
        <div className="flex items-center justify-between bg-[var(--color-surface)]/60 rounded-xl px-3 py-2">
          <span className="text-[var(--color-text-muted)] text-xs">Ingresos activos</span>
          <span className="text-green-400 text-xs font-bold">{formatCOP(stats.totalRevenue)}</span>
        </div>
      )}

      {/* Sparkline semanal */}
      <div className="flex items-end gap-2">
        <span className="text-[var(--color-text-muted)] text-[10px]">6 sem.</span>
        <svg width={W} height={H} className="overflow-visible">
          <defs>
            <linearGradient id={`spark-${agent.id}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="#d4a843" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#d4a843" stopOpacity="1"   />
            </linearGradient>
          </defs>
          <polyline
            points={pts}
            fill="none"
            stroke={`url(#spark-${agent.id})`}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {spark.map((v, i) => (
            <circle
              key={i}
              cx={(i / (spark.length - 1)) * W}
              cy={H - (v / max) * H}
              r={i === spark.length - 1 ? 3 : 1.5}
              fill="#d4a843"
            />
          ))}
        </svg>
        <span className="text-[var(--color-text-muted)] text-[10px] ml-auto">
          {spark[spark.length - 1]} esta sem.
        </span>
      </div>

      {/* Botón de detalle */}
      <Link
        to={PRIVATE_ROUTES.AGENT_DETAIL.replace(':agentId', agent.id)}
        className="flex items-center justify-center gap-2 w-full py-2 rounded-xl
          bg-[var(--color-surface)] hover:bg-primary/20 border border-[var(--color-border)] hover:border-primary/50
          text-[var(--color-text-muted)] hover:text-primary text-xs font-semibold transition-all duration-200"
      >
        Ver perfil completo <FaArrowRight size={10} />
      </Link>
    </motion.div>
  );
}

function Kpi({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-[var(--color-surface)]/60 rounded-xl p-2.5 flex items-center gap-2">
      <Icon className={`${color} text-xs flex-shrink-0`} />
      <div>
        <p className="text-[var(--color-text)] text-sm font-bold leading-none">{value}</p>
        <p className="text-[var(--color-text-muted)] text-[10px]">{label}</p>
      </div>
    </div>
  );
}