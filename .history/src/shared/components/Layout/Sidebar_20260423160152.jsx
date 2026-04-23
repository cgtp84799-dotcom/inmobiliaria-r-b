// src/shared/components/Layout/Sidebar.jsx
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation }     from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaChartLine, FaBuilding, FaUsers, FaFolder, FaUserCog,
  FaEnvelope, FaCalendar, FaSignOutAlt, FaTimes,
  FaChevronLeft, FaChevronRight, FaShieldAlt, FaEye, FaUser,
  FaFileContract, FaCalendarCheck, FaUserTie,
} from "react-icons/fa";
import { useAuth }       from "../../../core/contexts/AuthContext";
import { PRIVATE_ROUTES } from "../../../core/config/routes.config";
import { hasPermission, USER_ROLES } from "../../../modules/users/types/user.types";

/* ─── Variables CSS del sidebar (siempre oscuro) ───────────── */
const SB = {
  bg:       "var(--color-sidebar-bg)",
  border:   "var(--color-sidebar-border)",
  text:     "var(--color-sidebar-text)",
  muted:    "var(--color-sidebar-muted)",
  hoverBg:  "var(--color-sidebar-hover-bg)",
  activeBg: "var(--color-sidebar-active-bg)",
};

/* ─── Metadatos de rol — sin clases dinámicas no compiladas ─── */
// ⚠️  Tailwind no compila clases construidas con interpolación
//     (ej: `text-${color}-400`). Se usan valores estáticos completos.
const ROLE_META = {
  [USER_ROLES.ADMIN]: {
    label: "Administrador",
    textCls: "text-red-400",
    bgCls:   "bg-red-500/10",
    borderCls: "border-red-400/30",
    icon: FaShieldAlt,
  },
  [USER_ROLES.MEMBER]: {
    label: "Miembro del equipo",
    textCls: "text-blue-400",
    bgCls:   "bg-blue-500/10",
    borderCls: "border-blue-400/30",
    icon: FaUsers,
  },
  [USER_ROLES.AGENT]: {
    label: "Agente inmobiliario",
    textCls: "text-green-400",
    bgCls:   "bg-green-500/10",
    borderCls: "border-green-400/30",
    icon: FaUserTie,
  },
  [USER_ROLES.VIEWER]: {
    label: "Solo lectura",
    textCls: "text-[var(--color-sidebar-muted)]",
    bgCls:   "bg-white/5",
    borderCls: "border-white/10",
    icon: FaEye,
  },
};
const FALLBACK_ROLE = ROLE_META[USER_ROLES.VIEWER];

/* ─── Hook: detecta si es desktop con resize listener ────────── */
function useIsDesktop(breakpoint = 1024) {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= breakpoint
  );
  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= breakpoint);
    const mq = window.matchMedia(`(min-width: ${breakpoint}px)`);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);
  return isDesktop;
}

/* ═══════════════════════════════════════════════════════════════
   SIDEBAR
═══════════════════════════════════════════════════════════════ */
export default function Sidebar({
  isOpen,
  onClose,
  collapsed           = false,
  onToggleCollapse    = () => {},
  isHoverExpanded     = false,
  onRequestCloseOverlay = () => {},
}) {
  const location  = useLocation();
  const { signOut, currentUser, userData } = useAuth();

  // userData tiene el rol real; currentUser.role puede no estar hidratado aún
  const role = userData?.role ?? USERROLES.VIEWER;
  const roleMeta     = ROLE_META[role] ?? FALLBACK_ROLE;
  const RoleIcon     = roleMeta.icon;
  const isDesktop    = useIsDesktop();

  /* ── Menú según permisos — organizado por secciones ──── */
  const menuSections = [
    {
      label: null, // sin título = sección principal
      items: [
        { icon: FaChartLine,     label: "Dashboard",   path: PRIVATE_ROUTES.DASHBOARD,  visible: true },
      ],
    },
    {
      label: "Gestión",
      items: [
        { icon: FaBuilding,      label: "Propiedades", path: PRIVATE_ROUTES.PROPERTIES, visible: hasPermission(role, "properties", "read") },
        { icon: FaFileContract,  label: "Contratos",   path: PRIVATE_ROUTES.CONTRACTS,  visible: hasPermission(role, "contracts",  "read") },
        { icon: FaUsers,         label: "Clientes",    path: PRIVATE_ROUTES.CLIENTS,    visible: hasPermission(role, "clients",    "read") },
      ],
    },
    {
      label: "Agenda",
      items: [
        { icon: FaCalendarCheck, label: "Visitas",     path: PRIVATE_ROUTES.VISITS,     visible: hasPermission(role, "visits",     "read") },
        { icon: FaCalendar,      label: "Calendario",  path: PRIVATE_ROUTES.CALENDAR,   visible: true },
      ],
    },
    {
      label: "Sistema",
      items: [
        { icon: FaEnvelope,      label: "Consultas",   path: PRIVATE_ROUTES.QUERIES,    visible: true },
        { icon: FaFolder,        label: "Documentos",  path: PRIVATE_ROUTES.DOCUMENTS,  visible: hasPermission(role, "documents",  "read") },
        { icon: FaUserCog,       label: "Usuarios",    path: PRIVATE_ROUTES.USERS,      visible: hasPermission(role, "users",      "read") },
        { icon: FaUserCog,       label: "Solicitudes", path: PRIVATE_ROUTES.REQUESTS,   visible: hasPermission(role, "users",      "create") },
        { icon: FaUser,          label: "Mi Perfil",   path: PRIVATE_ROUTES.PROFILE,    visible: true },
      ],
    },
  ];

  // Flatten for collapsed view
  const menuItems = menuSections.flatMap(s => s.items).filter(i => i.visible);

  const handleNavigation = useCallback(() => {
    if (!isDesktop) onClose();
    onRequestCloseOverlay();
  }, [isDesktop, onClose, onRequestCloseOverlay]);

  const handleSignOut = useCallback(() => {
    signOut();
    if (!isDesktop) onClose();
    onRequestCloseOverlay();
  }, [signOut, isDesktop, onClose, onRequestCloseOverlay]);

  /* ─────────────────────────────────────────────────────────────
     SUB-COMPONENTES (definidos dentro para acceder a closures)
  ───────────────────────────────────────────────────────────── */

  /* Badge de rol */
  const RoleBadge = () => (
    <span
      className={[
        "inline-flex items-center gap-1 px-2 py-0.5 mt-1",
        "rounded-full text-[10px] font-bold border",
        roleMeta.textCls,
        roleMeta.bgCls,
        roleMeta.borderCls,
      ].join(" ")}
    >
      <RoleIcon size={8} aria-hidden="true" />
      {roleMeta.label}
    </span>
  );

  /* Header del sidebar */
  const SidebarHeader = ({ showClose = false }) => (
    <div
      className="px-4 sm:px-6 h-20 flex items-center justify-between shrink-0 border-b"
      style={{
        background:  `linear-gradient(to right, ${SB.bg}, color-mix(in srgb, ${SB.bg} 80%, #2a2825))`,
        borderColor: SB.border,
      }}
    >
      <img
        src="/logo.jpg.png"
        alt="Rincón Bedoya & Asociados"
        className="h-12 w-auto object-contain max-w-[210px]"
        width={210}
        height={48}
        loading="eager"
        draggable={false}
      />
      {showClose && (
        <button
          onClick={!isDesktop ? onClose : onToggleCollapse}
          className="p-2 rounded-lg transition-colors hover:bg-white/5"
          style={{ color: SB.muted }}
          aria-label={!isDesktop ? "Cerrar menú" : collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
        >
          {!isDesktop
            ? <FaTimes     size={18} aria-hidden="true" />
            : collapsed
              ? <FaChevronRight size={16} aria-hidden="true" />
              : <FaChevronLeft  size={16} aria-hidden="true" />
          }
        </button>
      )}
    </div>
  );

  /* Tarjeta del usuario */
  const UserCard = ({ mini = false }) => (
    <div
      className="p-4 shrink-0 border-b"
      style={{ background: "rgba(255,255,255,0.03)", borderColor: SB.border }}
    >
      <div className={`flex ${mini ? "justify-center" : "items-center gap-3"}`}>
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden
                        bg-gradient-to-br from-yellow-500/30 to-yellow-700/20
                        border-2 border-yellow-500/30 shadow-md
                        flex items-center justify-center
                        text-yellow-400 font-bold text-sm">
          {currentUser?.photoURL
            ? <img
                src={currentUser.photoURL}
                alt="Avatar"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            : (currentUser?.displayName?.[0] ?? currentUser?.email?.[0] ?? "U").toUpperCase()
          }
        </div>

        {/* Info — solo en modo expandido */}
        {!mini && (
          <div className="overflow-hidden flex-1 min-w-0">
            <p
              className="text-sm font-bold truncate"
              style={{ color: "var(--color-sidebar-text)" }}
            >
              {currentUser?.displayName || "Usuario"}
            </p>
            <p
              className="text-xs truncate"
              style={{ color: SB.muted }}
            >
              {currentUser?.email}
            </p>
            <RoleBadge />
          </div>
        )}
      </div>
    </div>
  );

  /* Ítems de navegación con secciones */
  const NavItems = ({ showLabel = true }) => (
    <nav
      className="flex-1 min-h-0 overflow-y-auto px-2 py-3"
      aria-label="Menú de navegación"
    >
      {menuSections.map((section, sIdx) => {
        const visibleItems = section.items.filter(i => i.visible);
        if (visibleItems.length === 0) return null;

        return (
          <div key={sIdx} className={sIdx > 0 ? "mt-3 pt-3 border-t" : ""}
            style={sIdx > 0 ? { borderColor: SB.border } : {}}>

            {/* Título de sección */}
            {section.label && showLabel && (
              <p className="text-[10px] font-bold uppercase tracking-widest px-4 mb-2"
                style={{ color: SB.muted }}>
                {section.label}
              </p>
            )}

            <div className="space-y-0.5">
              {visibleItems.map((item) => {
                const isActive = location.pathname === item.path ||
                  (item.path !== PRIVATE_ROUTES.DASHBOARD && location.pathname.startsWith(item.path));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={handleNavigation}
                    title={!showLabel ? item.label : undefined}
                    aria-current={isActive ? "page" : undefined}
                    className={[
                      "flex items-center py-2.5 rounded-xl",
                      "transition-all duration-150 relative group overflow-hidden",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/50",
                      showLabel ? "gap-3 px-4" : "justify-center px-2",
                    ].join(" ")}
                    style={{
                      backgroundColor: isActive ? SB.activeBg   : "transparent",
                      color:           isActive ? "#fbbf24"     : SB.text,
                      fontWeight:      isActive ? 600            : 400,
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = SB.hoverBg;
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    {isActive && (
                      <motion.span
                        layoutId={showLabel ? "active-pill-expanded" : "active-pill-mini"}
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-yellow-400 rounded-r-full"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <Icon
                      className="text-base flex-shrink-0"
                      style={{ color: isActive ? "#fbbf24" : SB.muted }}
                      aria-hidden="true"
                    />
                    {showLabel && (
                      <span className="text-sm truncate">{item.label}</span>
                    )}
                    {!showLabel && (
                      <span
                        className="absolute left-full ml-2 px-2 py-1 text-xs font-semibold
                                   rounded-lg shadow-lg pointer-events-none
                                   opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100
                                   transition-opacity duration-150 whitespace-nowrap z-50"
                        style={{
                          backgroundColor: "var(--color-sidebar-bg)",
                          color:           "var(--color-sidebar-text)",
                          border:          `1px solid ${SB.border}`,
                        }}
                      >
                        {item.label}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );

  /* Botón cerrar sesión */
  const SignOutBtn = ({ compact = false }) => (
    <div
      className="p-3 shrink-0 border-t"
      style={{ background: "rgba(255,255,255,0.02)", borderColor: SB.border }}
    >
      <button
        onClick={handleSignOut}
        className={[
          "flex items-center w-full py-2.5 rounded-xl",
          "transition-all duration-150",
          "text-red-400/60 hover:text-red-400 hover:bg-red-500/10",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40",
          compact ? "justify-center px-2" : "gap-3 px-4",
        ].join(" ")}
        aria-label="Cerrar sesión"
      >
        <FaSignOutAlt className="text-base flex-shrink-0" aria-hidden="true" />
        {!compact && <span className="text-sm font-medium">Cerrar Sesión</span>}
      </button>
    </div>
  );

  /* ─────────────────────────────────────────────────────────────
     RENDER: MÓVIL
  ───────────────────────────────────────────────────────────── */
  if (!isDesktop) {
    return (
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="sb-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              onClick={onClose}
              aria-hidden="true"
            />

            {/* Panel */}
            <motion.aside
              key="sb-panel"
              role="complementary"
              aria-label="Menú lateral"
              initial={{ x: -288 }}
              animate={{ x: 0 }}
              exit={{ x: -288 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed top-0 left-0 h-full w-72 z-50 flex flex-col shadow-2xl"
              style={{ background: SB.bg }}
            >
              <SidebarHeader showClose />
              <UserCard />
              <NavItems />
              <SignOutBtn />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    );
  }

  /* ─────────────────────────────────────────────────────────────
     RENDER: DESKTOP COLAPSADO (solo íconos)
  ───────────────────────────────────────────────────────────── */
  if (collapsed && !isHoverExpanded) {
    return (
      <aside
        className="hidden lg:flex flex-col h-full w-16 shrink-0 border-r overflow-hidden"
        style={{ background: SB.bg, borderColor: SB.border }}
        aria-label="Menú lateral colapsado"
      >
        {/* Botón expandir */}
        <div
          className="h-20 flex items-center justify-center shrink-0 border-b"
          style={{ borderColor: SB.border }}
        >
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-lg transition-colors hover:bg-white/5"
            style={{ color: SB.muted }}
            aria-label="Expandir sidebar"
          >
            <FaChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
        <UserCard mini />
        <NavItems showLabel={false} />
        <SignOutBtn compact />
      </aside>
    );
  }

  /* ─────────────────────────────────────────────────────────────
     RENDER: DESKTOP EXPANDIDO
  ───────────────────────────────────────────────────────────── */
  return (
    <aside
      className="hidden lg:flex flex-col h-full w-64 shrink-0 border-r overflow-hidden"
      style={{ background: SB.bg, borderColor: SB.border }}
      aria-label="Menú lateral"
    >
      <SidebarHeader showClose />
      <UserCard />
      <NavItems />
      <SignOutBtn />
    </aside>
  );
}