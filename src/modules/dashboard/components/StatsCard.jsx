import { motion } from 'framer-motion';

const StatsCard = ({ title, value, subtitle, icon: Icon, color = 'primary' }) => {
  const colorClasses = {
    primary: 'bg-primary/20 text-primary',
    blue: 'bg-blue-500/20 text-blue-400',
    green: 'bg-green-500/20 text-green-400',
    yellow: 'bg-yellow-500/20 text-yellow-400',
    red: 'bg-red-500/20 text-red-400'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-black/40 border border-primary/20 rounded-xl p-6 hover:border-primary/40 transition"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-light/70 text-sm mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-light mb-1">{value}</h3>
          {subtitle && (
            <p className="text-light/50 text-xs">{subtitle}</p>
          )}
        </div>
        
        {Icon && (
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <Icon className="text-2xl" />
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default StatsCard;