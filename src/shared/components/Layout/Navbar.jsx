import { Link } from 'react-router-dom';
import { FaHome, FaBuilding, FaEnvelope } from 'react-icons/fa';
import { motion } from 'framer-motion';
import NotificationBell from '../../../modules/notifications/components/NotificationBell';
import { useAuth } from '../../../core/contexts/AuthContext';

const Navbar = () => {
  const { currentUser } = useAuth();

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="bg-dark border-b border-primary/20 sticky top-0 z-50 backdrop-blur-sm bg-dark/90"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2 group">
            <motion.div
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.6 }}
            >
              <FaBuilding className="text-primary text-2xl" />
            </motion.div>
            <span className="text-primary font-bold text-xl group-hover:text-primary/80 transition">
              Rincón Bedoya & Asociados
            </span>
          </Link>
          
          <div className="flex items-center space-x-6">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link 
                to="/" 
                className="text-light hover:text-primary transition flex items-center space-x-2"
              >
                <FaHome />
                <span>Inicio</span>
              </Link>
            </motion.div>

            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link 
                to="/propiedades" 
                className="text-light hover:text-primary transition flex items-center space-x-2"
              >
                <FaBuilding />
                <span>Propiedades</span>
              </Link>
            </motion.div>

            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link 
                to="/contacto" 
                className="text-light hover:text-primary transition flex items-center space-x-2"
              >
                <FaEnvelope />
                <span>Contacto</span>
              </Link>
            </motion.div>

            {currentUser && <NotificationBell />}

            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link 
                to={currentUser ? "/dashboard" : "/login"}
                className="button-gold"
              >
                {currentUser ? 'Dashboard' : 'Acceso Agentes'}
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;