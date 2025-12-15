import { motion } from 'framer-motion';

const LoadingSpinner = ({ size = 'md', text = 'Cargando...' }) => {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <motion.div
        className={`${sizes[size]} border-4 border-primary/30 border-t-primary rounded-full`}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
      {text && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-light/70 mt-4"
        >
          {text}
        </motion.p>
      )}
    </div>
  );
};

export default LoadingSpinner;