import { useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaBars, FaShieldAlt, FaUsers, FaEye, FaUser } from 'react-icons/fa';
import Sidebar from './Sidebar';
import NotificationBell from '../../../modules/notifications/components/NotificationBell';
import { useAuth } from '../../../core/contexts/AuthContext';
import { USER_ROLES } from '../../../modules/users/types/user.types';

// Metadatos de rol — misma paleta que Sidebar para coherencia visual
const ROLE_META = {
  [USER_ROLES.ADMIN]:  { label: 'Admin',       color: '#f87171', bg: 'rgba(239,68,68,0.12)',   Icon: FaShieldAlt },
  [USER_ROLES.MEMBER]: { label: 'Asesor',       color: '#fbbf24', bg: 'rgba(245,158,11,0.12)',  Icon: FaUsers     },
  [USER_ROLES.VIEWER]: { label: 'Solo lectura', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', Icon: FaEye       },
};
const DEFAULT_ROLE_META = { label: 'Usuario', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', Icon: FaUser };

const AdminLayout = () => {
  const { currentUser } = useAuth();
  const role = currentUser?.role;
  const roleMeta = ROLE_META[role] ?? DEFAULT_ROLE_META;
  const RoleIcon = roleMeta.Icon;

  const [isDesktop, setIsDesktop]           = useState(window.innerWidth >= 1024);
  const [sidebarOpen, setSidebarOpen]       = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [sidebarHover, setSidebarHover]     = useState(false);

  const enterTimerRef = useRef(null);
  const leaveTimerRef = useRef(null);

  useEffect(() => {
    const onResize = () => {
      const large = window.innerWidth >= 1024;
      setIsDesktop(large);
      if (large)  setSidebarOpen(false);
      if (!large) setSidebarHover(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const openHover  = () => {
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
    enterTimerRef.current = setTimeout(() => setSidebarHover(true), 120);
  };
  const closeHover = () => {
    if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    leaveTimerRef.current = setTimeout(() => setSidebarHover(false), 80);
  };

  // Nombre de display: primero displayName de Auth, luego parte local del email
  const displayName =
    currentUser?.displayName ||
    currentUser?.email?.split('@')[0] ||
    'Usuario';

  return (
    <div
      className="min-h-[100dvh] w-full overflow-x-hidden relative"
      style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
      {/* DESKTOP hover zone */}
      {isDesktop && (
        <div
          className="hidden lg:block fixed inset-y-0 left-0 z-40 w-20"
          onMouseEnter={openHover}
          onMouseLeave={closeHover}
        >
          <Sidebar
            isOpen={true}
            onClose={() => {}}
            collapsed={true}
            onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
            isHoverExpanded={sidebarHover}
            onRequestCloseOverlay={() => setSidebarHover(false)}
          />
        </div>
      )}

      {/* MÓVIL */}
      {!isDesktop && (
        <div className="lg:hidden">
          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            collapsed={false}
            onToggleCollapse={() => {}}
          />
        </div>
      )}

      {/* CONTENIDO PRINCIPAL */}
      <div className="min-h-[100dvh] flex flex-col min-w-0 lg:pl-20">

        {/* ── Topbar (visible en todos los tamaños) ──────────────────── */}
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="h-16 backdrop-blur-sm flex items-center px-4 sm:px-6 shrink-0 border-b gap-3"
          style={{
            backgroundColor: 'var(--color-topbar-bg)',
            borderColor:     'var(--color-topbar-border)',
          }}
        >
          {/* Hamburger móvil */}
          <button
            className="lg:hidden p-2 rounded-lg transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Abrir menú"
          >
            <FaBars size={20} />
          </button>

          {/* Logo (solo móvil — en desktop el sidebar lo tiene) */}
          <div className="lg:hidden flex-shrink-0">
            <img
              src="/logo.jpg.png"
              alt="Rincón Bedoya & Asociados"
              className="h-9 w-auto object-contain max-w-[160px]"
              draggable={false}
            />
          </div>

          {/* Espaciador */}
          <div className="flex-1" />

          {/* ── Zona derecha del topbar ── */}
          <div className="flex items-center gap-3">

            {/* Campana de notificaciones */}
            {currentUser && <NotificationBell />}

            {/* Separador visual */}
            <div
              className="hidden sm:block w-px h-6 self-center"
              style={{ backgroundColor: 'var(--color-topbar-border)' }}
            />

            {/* Avatar + nombre + rol */}
            <div className="hidden sm:flex items-center gap-2.5">
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden
                bg-gradient-to-br from-yellow-500/30 to-yellow-700/20
                border-2 border-yellow-500/30 flex items-center justify-center
                text-yellow-400 font-bold text-sm">
                {currentUser?.photoURL
                  ? <img src={currentUser.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                  : displayName[0]?.toUpperCase()}
              </div>

              {/* Nombre + badge de rol */}
              <div className="flex flex-col leading-none">
                <span
                  className="text-sm font-semibold truncate max-w-[120px]"
                  style={{ color: 'var(--color-text)' }}
                >
                  {displayName}
                </span>
                <span
                  className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ color: roleMeta.color, backgroundColor: roleMeta.bg }}
                >
                  <RoleIcon size={8} />
                  {roleMeta.label}
                </span>
              </div>
            </div>

          </div>
        </motion.header>
        {/* ────────────────────────────────────────────────────────────── */}

        {/* Área scrollable */}
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden min-w-0">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
            <Outlet
              context={{
                openSidebar: () => setSidebarOpen(true),
                sidebarCollapsed,
                setSidebarCollapsed,
              }}
            />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
