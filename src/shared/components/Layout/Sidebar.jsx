import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaChartLine,
  FaBuilding,
  FaUsers,
  FaFolder,
  FaUserCog,
  FaEnvelope,
  FaCalendar,
  FaSignOutAlt,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import { useAuth } from "../../../core/contexts/AuthContext";
import { PRIVATE_ROUTES } from "../../../core/config/routes.config";

const Sidebar = ({
  isOpen,
  onClose,
  collapsed = false,
  onToggleCollapse = () => {},
  isHoverExpanded = false,
  onRequestCloseOverlay = () => {},
}) => {
  const location = useLocation();
  const { signOut, currentUser } = useAuth();

  const menuItems = [
    { icon: FaChartLine, label: "Dashboard", path: PRIVATE_ROUTES.DASHBOARD },
    { icon: FaBuilding, label: "Propiedades", path: PRIVATE_ROUTES.PROPERTIES },
    { icon: FaUsers, label: "Clientes", path: PRIVATE_ROUTES.CLIENTS },
    { icon: FaCalendar, label: "Calendario", path: PRIVATE_ROUTES.CALENDAR },
    { icon: FaEnvelope, label: "Consultas", path: PRIVATE_ROUTES.QUERIES },
    // ✅ Chat eliminado completamente del menú
    { icon: FaFolder, label: "Documentos", path: PRIVATE_ROUTES.DOCUMENTS },
    { icon: FaUserCog, label: "Usuarios", path: PRIVATE_ROUTES.USERS },
    { icon: FaUserCog, label: "Solicitudes", path: PRIVATE_ROUTES.REQUESTS },
  ];

  const isDesktop = () => window.innerWidth >= 1024;
  const showMobile = !isDesktop();
  const showDesktopOverlay = isDesktop() && isHoverExpanded;

  const handleNavigation = () => {
    if (!isDesktop()) onClose();
    // ✅ en desktop, si navegas desde el panel expandido, colapsa también
    onRequestCloseOverlay();
  };

  return (
    <>
      {/* OVERLAY (móvil) */}
      <AnimatePresence>
        {showMobile && isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 z-40 lg:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* OVERLAY (desktop blur) -> ✅ CERRAR al click */}
      <AnimatePresence>
        {showDesktopOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            onMouseDown={onRequestCloseOverlay}
            onClick={onRequestCloseOverlay}
            className="hidden lg:block fixed inset-0 z-[60] bg-black/25 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* SIDEBAR MINI (desktop) */}
      <aside
        className="
          hidden lg:flex fixed inset-y-0 left-0 z-40
          w-20 bg-slate-900 border-r border-slate-800
          flex-col h-[100dvh] max-h-[100dvh]
        "
      >
        {/* Header mini con logo */}
        <div className="h-20 flex items-center justify-center border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800 shrink-0 px-2">
          <img
            src="/logo.jpg.png"
            alt="Rincón Bedoya & Asociados"
            className="h-10 w-auto object-contain max-w-[64px]"
            draggable={false}
          />
        </div>

        <div className="p-3 border-b border-slate-800 bg-slate-800/40 shrink-0 flex justify-center">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/40 to-yellow-500/20 flex items-center justify-center text-primary font-bold border-2 border-primary/30 shadow-md overflow-hidden">
            {currentUser?.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              currentUser?.email?.[0]?.toUpperCase() || "U"
            )}
          </div>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto px-2 py-3 space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={handleNavigation}
                title={item.label}
                className={`
                  flex items-center justify-center rounded-xl transition-all duration-200 relative group overflow-hidden
                  px-2 py-3
                  ${
                    isActive
                      ? "bg-primary/20 text-primary font-semibold shadow-lg shadow-primary/10 border border-primary/40"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                  }
                `}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                )}
                <Icon className={`text-lg flex-shrink-0 ${isActive ? "text-primary" : ""}`} />
              </Link>
            );
          })}
        </nav>

        <div className="p-2 border-t border-slate-800 bg-slate-800/20 shrink-0">
          <button
            onClick={signOut}
            title="Cerrar sesión"
            className="
              flex items-center justify-center w-full rounded-xl transition-all duration-200 font-semibold
              text-red-400 hover:text-red-300 hover:bg-red-500/10
              border border-transparent hover:border-red-500/30
              px-2 py-3
            "
          >
            <FaSignOutAlt size={18} />
          </button>
        </div>
      </aside>

      {/* PANEL EXPANDIDO (desktop) -> ✅ se cierra al quitar el cursor */}
      <AnimatePresence>
        {showDesktopOverlay && (
          <motion.aside
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            transition={{ type: "tween", duration: 0.18, ease: "easeOut" }}
            onMouseLeave={onRequestCloseOverlay}
            className="
              hidden lg:flex fixed inset-y-0 left-0 z-[70]
              w-64 bg-slate-900 border-r border-slate-800 shadow-2xl
              flex-col h-[100dvh] max-h-[100dvh]
              pb-[env(safe-area-inset-bottom)]
            "
          >
            {/* Header overlay con logo */}
            <div className="px-4 sm:px-6 h-20 flex items-center justify-between border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src="/logo.jpg.png"
                  alt="Rincón Bedoya & Asociados"
                  className="h-12 w-auto object-contain max-w-[210px]"
                  draggable={false}
                />
              </div>

              <button
                onClick={onToggleCollapse}
                className="hidden lg:inline-flex p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
                title={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
              >
                {collapsed ? <FaChevronRight size={16} /> : <FaChevronLeft size={16} />}
              </button>
            </div>

            <div className="p-4 border-b border-slate-800 bg-slate-800/40 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/40 to-yellow-500/20 flex items-center justify-center text-primary font-bold border-2 border-primary/30 shadow-md flex-shrink-0 overflow-hidden">
                  {currentUser?.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    currentUser?.email?.[0]?.toUpperCase() || "U"
                  )}
                </div>

                <div className="overflow-hidden flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">
                    {currentUser?.displayName || "Usuario"}
                  </p>
                  <p className="text-xs text-slate-400 truncate">{currentUser?.email}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <p className="text-[10px] text-green-400 font-semibold">En línea</p>
                  </div>
                </div>
              </div>
            </div>

            <nav className="flex-1 min-h-0 overflow-y-auto px-2 py-3 space-y-1">
              {menuItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={handleNavigation}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 relative group overflow-hidden
                      ${
                        isActive
                          ? "bg-primary/20 text-primary font-semibold shadow-lg shadow-primary/10 border border-primary/40"
                          : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                      }
                    `}
                  >
                    {!isActive && (
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/0 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
                    )}

                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full"
                        transition={{ type: "tween", duration: 0.2 }}
                      />
                    )}

                    <Icon className={`text-lg flex-shrink-0 ${isActive ? "text-primary" : ""}`} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-800 bg-slate-800/20 shrink-0">
              <button
                onClick={() => {
                  signOut();
                  onRequestCloseOverlay();
                }}
                className="
                  flex items-center gap-3 w-full rounded-xl transition-all duration-200 font-semibold
                  text-red-400 hover:text-red-300 hover:bg-red-500/10
                  border border-transparent hover:border-red-500/30
                  px-4 py-3
                "
              >
                <FaSignOutAlt size={18} />
                <span className="text-sm">Cerrar Sesión</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* SIDEBAR MÓVIL */}
      <motion.aside
        initial={false}
        animate={{ x: isOpen ? 0 : -320 }}
        transition={{ type: "tween", duration: 0.22, ease: "easeOut" }}
        className={`
          lg:hidden fixed inset-y-0 left-0 z-50
          w-64 bg-slate-900 border-r border-slate-800 shadow-2xl
          flex flex-col
          h-[100dvh]
          max-h-[100dvh]
          pb-[env(safe-area-inset-bottom)]
        `}
      >
        {/* Header móvil con logo */}
        <div className="px-4 sm:px-6 h-20 flex items-center justify-between border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/logo.jpg.png"
              alt="Rincón Bedoya & Asociados"
              className="h-12 w-auto object-contain max-w-[210px]"
              draggable={false}
            />
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
            aria-label="Cerrar menú"
          >
            <FaTimes size={18} />
          </button>
        </div>

        <div className="p-4 border-b border-slate-800 bg-slate-800/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/40 to-yellow-500/20 flex items-center justify-center text-primary font-bold border-2 border-primary/30 shadow-md flex-shrink-0 overflow-hidden">
              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                currentUser?.email?.[0]?.toUpperCase() || "U"
              )}
            </div>

            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">
                {currentUser?.displayName || "Usuario"}
              </p>
              <p className="text-xs text-slate-400 truncate">{currentUser?.email}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto px-2 py-3 space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={handleNavigation}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 relative group overflow-hidden
                  ${
                    isActive
                      ? "bg-primary/20 text-primary font-semibold shadow-lg shadow-primary/10 border border-primary/40"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                  }
                `}
              >
                <Icon className={`text-lg flex-shrink-0 ${isActive ? "text-primary" : ""}`} />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-800/20 shrink-0">
          <button
            onClick={() => {
              signOut();
              onClose();
            }}
            className="
              flex items-center gap-3 w-full rounded-xl transition-all duration-200 font-semibold
              text-red-400 hover:text-red-300 hover:bg-red-500/10
              border border-transparent hover:border-red-500/30
              px-4 py-3
            "
          >
            <FaSignOutAlt size={18} />
            <span className="text-sm">Cerrar Sesión</span>
          </button>
        </div>
      </motion.aside>
    </>
  );
};

export default Sidebar;