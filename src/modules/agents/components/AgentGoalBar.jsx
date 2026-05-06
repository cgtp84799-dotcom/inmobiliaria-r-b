// src/modules/agents/components/AgentGoalBar.jsx
// Barra de progreso de meta mensual
import { motion } from 'framer-motion';

const AgentGoalBar = ({ label, current, goal, color = 'primary' }) => {
  const pct = goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-[var(--color-text-muted)]">{label}</span>
        <span className={`text-${color} font-semibold tabular-nums`}>{current} / {goal}</span>
      </div>
      <div className="h-2 bg-[var(--color-surface)] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
          className={`h-full bg-${color} rounded-full`}
        />
      </div>
      <p className="text-right text-xs text-[var(--color-text-muted)] mt-0.5">{pct}%</p>
    </div>
  );
};

export default AgentGoalBar;