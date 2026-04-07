import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaChartLine, FaBuilding, FaUsers, FaFolder, FaUserCog,
  FaEnvelope, FaCalendar, FaSignOutAlt, FaTimes,
  FaChevronLeft, FaChevronRight, FaShieldAlt, FaEye, FaUser,
  FaFileContract, FaCalendarCheck, FaUserTie,
} from "react-icons/fa";
import { useAuth } from "../../../core/contexts/AuthContext";
import { PRIVATE_ROUTES } from "../../../core/config/routes.config";
import { hasPermission, USER_ROLES } from "../../../modules/users/types/user.types";

const SB = {
  bg:        "var(--color-sidebar-bg)",
  border:    "var(--color-sidebar-border)",
  text:      "var(--color-sidebar-text)",
  muted:     "var(--color-sidebar-muted)",
  hoverBg:   "var(--color-sidebar-hover-bg)",
  activeBg:  "var(--color-sidebar-active-bg)",
};

const Sidebar = ({
  isOpen,
  onClose,
  collapsed = false,
  onToggleCollapse = () => {},
  isHoverExpanded = false,
  onRequestCloseOverlay = () => {},
}) => {
  const location = useLocation();

  // FIX — role viene de userData (Firestore), NO de currentUser (Firebase Auth).
  // currentUser es el objeto nativo de Firebase Auth; role vive en Firestore.
  // Usar currentUser?.role era incorrecto: resultaba undefined para viewers/agents.
  const { signOut, currentUser, userData } = useAuth();
  const role = userData?.role;

  // FIX — rol AGENT añadido con su badge y ícono correcto
  const roleMeta = {
    [USER_ROLES.ADMIN]:  { label: "Administrador",      color: "text-red-400",   bg: "bg-red-500/15",   icon: FaShieldAlt },
    [USER_ROLES.MEMBER]: { label: "Miembro del equipo",  color: "text-blue-400",  bg: "bg-blue-500/15",  icon: FaUsers     },
    [USER_ROLES.AGENT]:  { label: "Agente inmobiliario", color: "text-green-400", bg: "bg-green-500/15", icon: FaUserTie   },
    [USER_ROLES.VIEWER]: { label: "Solo lectura",        color: "text-slate-400", bg: "bg-slate-500/15", icon: FaEye       },
  };
  const currentRoleMeta = roleMeta[role] || roleMeta[USER_ROLES.VIEWER];
  const RoleIcon = currentRoleMeta.icon;

  const allMenuItems = [
    { icon: FaChartLine,     label: "Dashboard",   path: PRIVATE_ROUTES.DASHBOARD,  visible: true },
    { icon: FaBuilding,      label: "Propiedades", path: PRIVATE_ROUTES.PROPERTIES, visible: hasPermission(role, "properties", "read") },
    { icon: FaUsers,         label: "Clientes",    path: PRIVATE_ROUTES.CLIENTS,    visible: hasPermission(role, "clients",    "read") },
    // FIX — contratos verificaba permisos de 'clients' en lugar de 'contracts'
    { icon: FaFileContract,  label: "Contratos",   path: PRIVATE_ROUTES.CONTRACTS,  visible: hasPermission(role, "contracts",  "read") },
    { icon: FaCalendarCheck, label: "Visitas",     path: PRIVATE_ROUTES.VISITS,     visible: hasPermission(role, "visits",     "read") },
    { icon: FaCalendar,      label: "Calendario",  path: PRIVATE_ROUTES.CALENDAR,   visible: true },
    { icon: FaEnvelope,      label: "Consultas",   path: PRIVATE_ROUTES.QUERIES,    visible: true },
    { icon: FaFolder,        label: "Documentos",  path: PRIVATE_ROUTES.DOCUMENTS,  visible: hasPermission(role, "documents", "read") },
    { icon: FaUserCog,       label: "Usuarios",    path: PRIVATE_ROUTES.USERS,      visible: hasPermission(role, "users",     "read") },
    { icon: FaUserCog,       label: "Solicitudes", path: PRIVATE_ROUTES.REQUESTS,   visible: hasPermission(role, "users",     "create") },
    { icon: FaUser,          label: "Mi Perfil",   path: PRIVATE_ROUTES.PROFILE,    visible: true },
  ];

  const menuItems = allMenuItems.filter((item) => item.visible);
  const isDesktop = () => window.innerWidth >= 1024;
  const showMobile = !isDesktop();
  const showDesktopOverlay = isDesktop() && isHoverExpanded;

  const handleNavigation = () => {
    if (!isDesktop()) onClose();
    onRequestCloseOverlay();
  };

  const RoleBadge = () => (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold border ${currentRoleMeta.color} ${currentRoleMeta.bg} border-current/30 mt-1`}>
      <RoleIcon size={9} />
      {currentRoleMeta.label}
    </div>
  );

  const SidebarHeader = ({ showClose = false }) => (
    <div
      className="px-4 sm:px-6 h-20 flex items-center justify-between shrink-0 border-b"
      style={{
        background: `linear-gradient(to right, ${SB.bg}, color-mix(in srgb, ${SB.bg} 80%, #2a2825))`,
        borderColor: SB.border,
      }}
    >
      <img src="/logo.jpg.png" alt="Rincón Bedoya" className="h-12 w-auto object-contain max-w-[210px]" draggable={false} />
      {showClose && (
        <button
          onClick={showMobile ? onClose : onToggleCollapse}
          className="p-2 rounded-lg transition-all"
          style={{ color: SB.muted }}
        >
          {showMobile ? <FaTimes size={18} /> : (collapsed ? <FaChevronRight size={16} /> : <FaChevronLeft size={16} />)}
        </button>
      )}
    </div>
  );

  const UserCard = ({ mini = false }) => (
    <div
      className="p-4 shrink-0 border-b"
      style={{ background: "rgba(255,255,255,0.03)", borderColor: SB.border }}
    >
      <div className={`flex ${mini ? "justify-center" : "items-center gap-3"}`}>
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500/30 to-yellow-700/20 flex items-center justify-center text-yellow-400 font-bold border-2 border-yellow-500/30 shadow-md flex-shrink-0 overflow-hidden">
          {currentUser?.photoURL
            ? <img src={currentUser.photoURL} alt="Avatar" className="w-full h-full object-cover" />
            : currentUser?.email?.[0]?.toUpperCase() || "U"}
        </div>
        {!mini && (
          <div className="overflow-hidden flex-1 min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: "#f1f0ed" }}>
              {userData?.displayName || currentUser?.displayName || "Usuario"}
            </p>
            <p className="text-xs truncate" style={{ color: SB.muted }}>{currentUser?.email}</p>
            <RoleBadge />
          </div>
        )}
      </div>
    </div>
  );

  const NavItems = ({ showLabel = true }) => (
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
            className={`flex items-center ${showLabel ? "gap-3 px-4" : "justify-center px-2"} py-3 rounded-xl transition-all duration-200 relative group overflow-hidden`}
            style={{
              backgroundColor: isActive ? SB.activeBg : "transparent",
              color: isActive ? "#fbbf24" : SB.text,
              fontWeight: isActive ? 600 : 400,
            }}
            onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = SB.hoverBg; }}
            onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            {isActive && (
              <motion.span
                layoutId={showLabel ? "active-expanded" : "active-mini"}
                className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-yellow-400 rounded-r-full"
                transition={{ type: "tween", duration: 0.2 }}
              />
            )}
            <Icon className="text-lg flex-shrink-0" style={{ color: isActive ? "#fbbf24" : SB.text }} />
            {showLabel && <span className="text-sm">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );

  const SignOutBtn = ({ compact = false }) => (
    <div
      className="p-4 shrink-0 border-t"
      style={{ background: "rgba(255,255,255,0.02)", borderColor: SB.border }}
    >
      <button
        onClick={() => { signOut(); if (showMobile) onClose(); onRequestCloseOverlay(); }}
        className={`flex items-center ${compact ? "justify-center px-2" : "gap-3 px-4"} w-full py-3 rounded-xl transition-all duration-200 font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/30`}
      >
        <FaSignOutAlt size={18} />
        {!compact && <span className="text-sm">Cerrar Sesión</span>}
      </button>
    </div>
  );

  return (
    <>
      <AnimatePresence>
        {showMobile && isOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDesktopOverlay && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            onMouseDown={onRequestCloseOverlay}
            onClick={onRequestCloseOverlay}
            className="hidden lg:block fixed inset-0 z-[60] bg-black/20 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <aside
        className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-20 flex-col h-[100dvh] max-h-[100dvh] border-r"
        style={{ backgroundColor: SB.bg, borderColor: SB.border }}
      >
        <div
          className="h-20 flex items-center justify-center shrink-0 border-b"
          style={{
            background: `linear-gradient(to right, ${SB.bg}, color-mix(in srgb, ${SB.bg} 80%, #2a2825))`,
            borderColor: SB.border,
          }}
        >
          <img src="/logo.jpg.png" alt="Rincón Bedoya" className="h-10 w-auto object-contain max-w-[64px]" draggable={false} />
        </div>
        <UserCard mini />
        <NavItems showLabel={false} />
        <SignOutBtn compact />
      </aside>

      <AnimatePresence>
        {showDesktopOverlay && (
          <motion.aside
            initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}
            transition={{ type: "tween", duration: 0.18, ease: "easeOut" }}
            onMouseLeave={onRequestCloseOverlay}
            className="hidden lg:flex fixed inset-y-0 left-0 z-[70] w-64 flex-col h-[100dvh] max-h-[100dvh] shadow-2xl border-r pb-[env(safe-area-inset-bottom)]"
            style={{ backgroundColor: SB.bg, borderColor: SB.border }}
          >
            <SidebarHeader showClose />
            <UserCard />
            <NavItems />
            <SignOutBtn />
          </motion.aside>
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ x: isOpen ? 0 : -320 }}
        transition={{ type: "tween", duration: 0.22, ease: "easeOut" }}
        className="lg:hidden fixed inset-y-0 left-0 z-50 w-64 flex flex-col h-[100dvh] max-h-[100dvh] shadow-2xl border-r pb-[env(safe-area-inset-bottom)]"
        style={{ backgroundColor: SB.bg, borderColor: SB.border }}
      >
        <SidebarHeader showClose />
        <UserCard />
        <NavItems />
        <SignOutBtn />
      </motion.aside>
    </>
  );
};

export default Sidebar;
