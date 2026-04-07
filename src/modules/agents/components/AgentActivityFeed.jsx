import { motion, AnimatePresence } from 'framer-motion';
import {
  FaCalendarCheck, FaFileContract, FaClock, FaCheckCircle,
  FaTimesCircle, FaHourglass,
} from 'react-icons/fa';
import { formatCOP } from '../../../shared/utils/formatCurrency';

/**
 * AgentActivityFeed — timeline de actividad reciente (visitas + contratos).
 * Recibe recentActivity[] del hook useAgentStats.
 */
export default function AgentActivityFeed({ activities = [], loading = false }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-slate-800 rounded w-3/4" />
              <div className="h-2.5 bg-slate-800 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!activities.length) {
    return (
      <div className="py-10 text-center text-slate-500">
        <FaClock className="mx-auto text-3xl mb-2 opacity-30" />
        <p className="text-sm">Sin actividad reciente</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Línea vertical */}
      <div className="absolute left-3.5 top-0 bottom-0 w-px bg-slate-800" />

      <AnimatePresence initial={false}>
        <div className="space-y-1">
          {activities.map((item, i) => (
            <ActivityItem key={item.id} item={item} index={i} />
          ))}
        </div>
      </AnimatePresence>
    </div>
  );
}

function ActivityItem({ item, index }) {
  const isVisit    = item.type === 'visit';
  const Icon       = isVisit ? FaCalendarCheck : FaFileContract;
  const typeColor  = isVisit ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400';

  const statusIcon = {
    pending:   <FaHourglass   className="text-yellow-400" size={10} />,
    approved:  <FaCheckCircle className="text-green-400"  size={10} />,
    completed: <FaCheckCircle className="text-primary"    size={10} />,
    rejected:  <FaTimesCircle className="text-red-400"    size={10} />,
    active:    <FaCheckCircle className="text-green-400"  size={10} />,
    expired:   <FaTimesCircle className="text-slate-500"  size={10} />,
    cancelled: <FaTimesCircle className="text-red-400"    size={10} />,
    draft:     <FaHourglass   className="text-slate-400"  size={10} />,
  }[item.status] ?? null;

  const timeAgo = item.date ? getTimeAgo(item.date) : '—';

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      className="flex gap-3 pl-1 py-2 hover:bg-slate-800/30 rounded-xl
        px-2 transition-colors group"
    >
      {/* Ícono del tipo */}
      <div className={`w-7 h-7 rounded-full flex items-center justify-center
        flex-shrink-0 relative z-10 ${typeColor}`}>
        <Icon size={11} />
      </div>

      {/* Contenido */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-slate-200 text-xs font-semibold truncate">{item.title}</p>
            <p className="text-slate-500 text-[11px] truncate">{item.client}</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {statusIcon}
            <span className="text-slate-600 text-[10px] whitespace-nowrap">{timeAgo}</span>
          </div>
        </div>
        {item.value && (
          <p className="text-green-400 text-[10px] font-semibold mt-0.5">
            {formatCOP(item.value)}
          </p>
        )}
        {!item.value && item.agent && (
          <p className="text-slate-600 text-[10px] mt-0.5 truncate">Agente: {item.agent}</p>
        )}
      </div>
    </motion.div>
  );
}

function getTimeAgo(date) {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'ahora';
  if (mins < 60)  return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs  < 24)  return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7)   return `hace ${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5)  return `hace ${weeks} sem.`;
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}
