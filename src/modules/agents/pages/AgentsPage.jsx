import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FaUsers, FaCalendarCheck, FaFileContract,
  FaChartLine, FaSearch, FaTrophy, FaMedal,
} from 'react-icons/fa';
import { useAgentStats } from '../hooks/useAgentStats';
import AgentCard from '../components/AgentCard';
import { formatCOP } from '../../../shared/utils/formatCurrency';

/**
 * AgentsPage — panel de control total de agentes.
 * Solo visible para admins.
 *
 * Muestra:
 *  - KPIs globales del equipo
 *  - Ranking por conversión
 *  - Grid de tarjetas de agentes con métricas individuales
 */
export default function AgentsPage() {
  const { stats, visits, contracts, users, loading } = useAgentStats(null);
  const [search, setSearch] = useState('');

  // Calcula métricas por agente a partir de datos ya cargados
  const agentMetrics = useMemo(() => {
    return users.map((u) => {
      const agentVisits    = visits.filter((v) =>
        v.agentEmail === u.email || v.agentId === u.id);
      const agentContracts = contracts.filter((c) =>
        c.agentEmail === u.email || c.agentId === u.id);

      const totalVisits     = agentVisits.length;
      const completedVisits = agentVisits.filter((v) => v.status === 'completed').length;
      const totalContracts  = agentContracts.length;
      const activeContracts = agentContracts.filter((c) => c.status === 'active').length;
      const totalRevenue    = agentContracts
        .filter((c) => c.status === 'active')
        .reduce((s, c) => s + (Number(c.value) || 0), 0);
      const conversionRate  = completedVisits > 0
        ? Math.min(100, Math.round((activeContracts / completedVisits) * 100))
        : 0;

      const now = new Date();
      const weeklyVisits = Array.from({ length: 6 }, (_, i) => {
        const start = new Date(now);
        start.setDate(start.getDate() - (5 - i) * 7 - start.getDay());
        const end = new Date(start); end.setDate(end.getDate() + 7);
        return agentVisits.filter((v) => {
          const d = v.createdAt?.toDate ? v.createdAt.toDate() : new Date(v.createdAt);
          return d >= start && d < end;
        }).length;
      });

      const visitsThisMonth = agentVisits.filter((v) => {
        const d = v.createdAt?.toDate ? v.createdAt.toDate() : new Date(v.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length;

      return {
        agent: u,
        stats: {
          totalVisits, completedVisits, totalContracts, activeContracts,
          totalRevenue, conversionRate, weeklyVisits, visitsThisMonth,
        },
      };
    });
  }, [users, visits, contracts]);

  // Ranking por conversión
  const ranking = useMemo(() =>
    [...agentMetrics]
      .sort((a, b) => b.stats.conversionRate - a.stats.conversionRate)
      .slice(0, 3),
    [agentMetrics],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return agentMetrics;
    const q = search.toLowerCase();
    return agentMetrics.filter(
      ({ agent }) =>
        agent.displayName?.toLowerCase().includes(q) ||
        agent.email?.toLowerCase().includes(q),
    );
  }, [agentMetrics, search]);

  // KPIs globales
  const globalKpis = [
    { icon: FaUsers,         label: 'Agentes activos', value: users.filter((u) => u.status === 'active').length, color: 'text-blue-400'   },
    { icon: FaCalendarCheck, label: 'Visitas totales', value: stats.totalVisits,    color: 'text-purple-400' },
    { icon: FaFileContract,  label: 'Contratos activos', value: stats.activeContracts, color: 'text-green-400' },
    { icon: FaChartLine,     label: 'Ingresos activos', value: formatCOP(stats.totalRevenue), color: 'text-primary'   },
  ];

  const rankIcons = [FaTrophy, FaMedal, FaMedal];
  const rankColors = ['text-yellow-400', 'text-[var(--color-text-muted)]', 'text-amber-600'];

  return (
    <div className="space-y-8">
      {/* ── Encabezado ── */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--color-text)] mb-1">
          Control de Agentes
        </h1>
        <p className="text-[var(--color-text-muted)] text-sm">
          Métricas en tiempo real de todo el equipo inmobiliario
        </p>
      </div>

      {/* ── KPIs globales ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {globalKpis.map(({ icon: Icon, label, value, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="bg-[var(--color-surface)]/70 border border-[var(--color-border)] rounded-2xl p-4"
          >
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`${color} text-sm`} />
              <span className="text-[var(--color-text-muted)] text-xs">{label}</span>
            </div>
            <p className={`text-xl font-extrabold ${color}`}>{loading ? '…' : value}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Ranking top 3 ── */}
      {!loading && ranking.length > 0 && (
        <div className="bg-[var(--color-surface)]/60 border border-[var(--color-border)] rounded-2xl p-5">
          <h2 className="text-[var(--color-text)] font-bold text-sm mb-4 flex items-center gap-2">
            <FaTrophy className="text-yellow-400" /> Ranking de conversión este período
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {ranking.map(({ agent, stats: s }, i) => {
              const RankIcon = rankIcons[i];
              const initials = (agent.displayName || agent.email || '?')
                .split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
              return (
                <div
                  key={agent.id}
                  className="flex items-center gap-3 bg-[var(--color-surface)]/60 rounded-xl p-3"
                >
                  <RankIcon className={`${rankColors[i]} text-xl flex-shrink-0`} />
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30
                    to-slate-700 flex items-center justify-center text-xs font-bold
                    text-primary border border-[var(--color-border)] overflow-hidden flex-shrink-0">
                    {agent.photoURL
                      ? <img src={agent.photoURL} alt="" className="w-full h-full object-cover" />
                      : initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[var(--color-text)] text-xs font-semibold truncate">
                      {agent.displayName || agent.email}
                    </p>
                    <p className="text-green-400 text-xs font-bold">{s.conversionRate}% conv.</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Buscador ── */}
      <div className="relative max-w-sm">
        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" size={12} />
        <input
          type="text"
          placeholder="Buscar agente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl
            pl-9 pr-4 py-2.5 text-sm text-[var(--color-text)] placeholder-slate-500
            focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
        />
      </div>

      {/* ── Grid de agentes ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-72 bg-[var(--color-surface)]/60 border border-[var(--color-border)] rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-[var(--color-text-muted)]">
          <FaUsers className="mx-auto text-4xl mb-3 opacity-20" />
          <p className="text-sm">No se encontraron agentes</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(({ agent, stats: s }, i) => (
            <AgentCard key={agent.id} agent={agent} stats={s} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}