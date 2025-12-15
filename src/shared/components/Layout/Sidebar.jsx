import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FaChartLine,
  FaBuilding, 
  FaUsers, 
  FaFileContract, 
  FaComments, 
  FaFolder,
  FaUserCog,
  FaEnvelope,
  FaCalendar,
  FaSignOutAlt,
  FaCircle,
  FaUserPlus
} from 'react-icons/fa';
import { useAuth } from '../../../core/contexts/AuthContext';

const Sidebar = () => {
  const location = useLocation();
  const { signOut, currentUser } = useAuth();

  const menuItems = [
    { icon: FaChartLine, label: 'Dashboard', path: '/dashboard' },
    { icon: FaBuilding, label: 'Propiedades', path: '/dashboard/propiedades' },
    { icon: FaUsers, label: 'Clientes', path: '/dashboard/clientes' },
    { icon: FaCalendar, label: 'Calendario', path: '/dashboard/calendario' },
    { icon: FaEnvelope, label: 'Consultas', path: '/dashboard/consultas' },
    { icon: FaComments, label: 'Chat', path: '/dashboard/chat' },
    { icon: FaFolder, label: 'Documentos', path: '/dashboard/documentos' },
    { icon: FaUserCog, label: 'Usuarios', path: '/dashboard/usuarios' },
    { icon: FaUserPlus, label: 'Solicitudes', path: '/dashboard/solicitudes' } // ✅ NUEVO
  ];

  return (
    <aside className="w-64 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-r border-slate-800 fixed h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-800">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-yellow-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <FaBuilding className="text-slate-950 text-lg" />
            </div>
            <div>
              <h2 className="text-primary font-bold text-lg">Panel Interno</h2>
              <p className="text-slate-400 text-xs">Rincón Bedoya & Asociados</p>
            </div>
          </div>
          
          {/* Usuario actual */}
          {currentUser && (
            <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-slate-950/50 rounded-lg border border-slate-800">
              <FaCircle className="text-green-400 text-xs animate-pulse" />
              <span className="text-slate-300 text-sm truncate">{currentUser.email}</span>
            </div>
          )}
        </motion.div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 p-4 overflow-y-auto">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <motion.div
              key={item.path}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
            >
              <Link
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-2 transition-all duration-300 group relative overflow-hidden ${
                  isActive 
                    ? 'bg-gradient-to-r from-primary to-yellow-600 text-slate-950 font-bold shadow-lg shadow-primary/30' 
                    : 'text-slate-300 hover:bg-slate-800/50 hover:text-primary'
                }`}
              >
                {/* Efecto hover de fondo */}
                {!isActive && (
                  <span className="absolute inset-0 bg-gradient-to-r from-primary/10 to-yellow-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                )}
                
                {/* Icono con animación */}
                <Icon className="text-lg relative z-10 transition-transform duration-300 group-hover:scale-110" />
                
                {/* Label */}
                <span className="relative z-10">{item.label}</span>
                
                {/* Indicador activo */}
                {isActive && (
                  <motion.span
                    layoutId="activeTab"
                    className="absolute right-2 w-2 h-2 bg-slate-950 rounded-full"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* Footer con botón de cerrar sesión */}
      <div className="p-4 border-t border-slate-800">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={signOut}
          className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 
                     text-white font-semibold py-3 rounded-xl transition-all duration-300
                     flex items-center justify-center gap-2 shadow-lg hover:shadow-red-500/30"
        >
          <FaSignOutAlt />
          <span>Cerrar Sesión</span>
        </motion.button>
      </div>
    </aside>
  );
};

export default Sidebar;