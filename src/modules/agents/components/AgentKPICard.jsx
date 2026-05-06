// src/modules/agents/components/AgentKPICard.jsx
import { motion } from 'framer-motion';

const AgentKPICard = ({ icon: Icon, label, value, sub, color = 'primary', delay = 0, onClick }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    onClick={onClick}
    className={`card-soft p-5 flex items-center gap-4 ${
      onClick ? 'cursor-pointer hover:border-primary/40 transition-colors' : ''
    }`}
  >
    <div className={`w-12 h-12 rounded-xl bg-${color}/10 flex items-center justify-center flex-shrink-0`}>
      <Icon className={`text-${color} text-xl`} />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-[var(--color-text-muted)] truncate">{label}</p>
      <p className={`text-3xl font-bold text-${color} tabular-nums leading-tight`}>{value}</p>
      {sub && <p className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate">{sub}</p>}
    </div>
  </motion.div>
);

export default AgentKPICard;