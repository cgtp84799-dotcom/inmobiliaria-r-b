import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaCog, 
  FaHome, 
  FaUser, 
  FaSignOutAlt 
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../core/contexts/AuthContext';

const SettingsFab = () => {
  const [open, setOpen] = useState(false);
  const { currentUser, userData, signOut } = useAuth();
  const navigate = useNavigate();

  const handleGoPublic = () => {
    navigate('/propiedades');
    setOpen(false);
  };

  const handleProfile = () => {
    // más adelante creamos /dashboard/perfil
    navigate('/dashboard');
    setOpen(false);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
    setOpen(false);
  };

  if (!currentUser) return null; // solo en panel interno con usuario logueado

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Botón redondo principal */}
      <motion.button
        onClick={() => setOpen(!open)}
        whileTap={{ scale: 0.9 }}
        className="w-12 h-12 rounded-full bg-black/80 border border-primary-400
                   flex items-center justify-center text-primary-300
                   shadow-lg backdrop-blur-sm"
      >
        <FaCog className="animate-spin-slow" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="mt-3 w-64 bg-black/95 border border-primary-400
                       rounded-xl shadow-2xl p-4 text-sm text-slate-100
                       backdrop-blur-md"
          >
            {/* Cabecera */}
            <div className="mb-3">
              <p className="font-semibold text-primary-300">Configuración rápida</p>
              <p className="text-muted-soft mt-1 text-xs">
                {userData?.displayName || currentUser.email}
              </p>
            </div>

            {/* Ver como cliente (catálogo) */}
            <button
              onClick={handleGoPublic}
              className="w-full flex items-center justify-between px-3 py-2
                         rounded-lg bg-slate-800 hover:bg-slate-700 mb-2
                         text-xs border border-slate-600"
            >
              <span className="flex items-center space-x-2">
                <FaHome className="text-primary-300" />
                <span>Ver como cliente (catálogo)</span>
              </span>
            </button>

            {/* Ir al dashboard / perfil */}
            <button
              onClick={handleProfile}
              className="w-full flex items-center justify-between px-3 py-2
                         rounded-lg bg-slate-800 hover:bg-slate-700 mb-2
                         text-xs border border-slate-600"
            >
              <span className="flex items-center space-x-2">
                <FaUser className="text-primary-300" />
                <span>Volver al dashboard</span>
              </span>
            </button>

            {/* Cerrar sesión */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-between px-3 py-2
                         rounded-lg bg-red-600/90 hover:bg-red-500 text-xs
                         text-white mt-1"
            >
              <span className="flex items-center space-x-2">
                <FaSignOutAlt />
                <span>Cerrar sesión</span>
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SettingsFab;