// src/shared/components/Layout/AdminLayout.jsx
import { useEffect, useRef, useState } from 'react';
import { Outlet }    from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaBars, FaShieldAlt, FaUsers,
  FaEye, FaUser, FaUserTie,
} from 'react-icons/fa';
import Sidebar            from './Sidebar';
import NotificationBell   from '../../../modules/notifications/components/NotificationBell';
import { useAuth }        from '../../../core/contexts/AuthContext';
import { USER_ROLES }     from '../../../modules/users/types/user.types';
import { useBreakpoint }  from '../../hooks/useMediaQuery';

/* ─── Metadatos de rol — clases estáticas, sin interpolación ── */
// Mismo objeto que Sidebar para consistencia visual
const ROLE_META = {
  [USER_ROLES.ADMIN]: {
    label: 'Admin',
    color: '#f87171',
    bg:    'rgba(239,68,68,0.12)',
    Icon:  FaShieldAlt,
  },
  [USER_ROLES.MEMBER]: {
    label: 'Asesor',
    color: '#fbbf24',
    bg:    'rgba(245,158,11,0.12)',
    Icon:  FaUsers,
  },
  [USER_ROLES.AGENT]: {
    label: 'Agente',
    color: '#4ade80',
    bg:    'rgba(74,222,128,0.10)',
    Icon:  FaUserTie,
  },
  [USER_ROLES.VIEWER]: {
    label: 'Solo lectura',
    color: '#94a3b8',
    bg:    'rgba(148,163,184,0.12)',
    Icon:  FaEye,
  },
};
const DEFAULT_ROLE = {
  label: 'Usuario',
  color: '#94a3b8',
  bg:    'rgba(148,163,184,0.12)',
  Icon:  FaUser,
};

/* ═══════════════════════════════════════════════════════════════
   ADMIN LAYOUT
═══════════════════════════════════════════════════════════════ */
export default function AdminLayout() {
  const { currentUser, userData } = useAuth();
  const role = userData?.role ?? USER_ROLES.VIEWER;
  const roleMeta = ROLE_META[role] ?? DEFAULT_ROLE;
  const RoleIcon = roleMeta.Icon;

  const isDesktop = useBreakpoint('lg');

  const [sidebarOpen,      setSidebarOpen]      = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [sidebarHover,     setSidebarHover]     = useState(false);

  const enterTimer = useRef(null);
  const leaveTimer = useRef(null);

  /* ── Cierra sidebar móvil al pasar a desktop ───────────────── */
  useEffect(() => {
    if (isDesktop) {
      setSidebarOpen(false);
    } else {
      setSidebarHover(false);
    }
  }, [isDesktop]);

  /* ── Limpia timers al desmontar ────────────────────────────── */
  useEffect(() => {
    return () => {
      clearTimeout(enterTimer.current);
      clearTimeout(leaveTimer.current);
    };
  }, []);

  /* ── Hover con debounce (evita parpadeo) ───────────────────── */
  const openHover = () => {
    clearTimeout(leaveTimer.current);
    clearTimeout(enterTimer.current);
    enterTimer.current = setTimeout(() => setSidebarHover(true), 120);
  };
  const closeHover = () => {
    clearTimeout(enterTimer.current);
    clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => setSidebarHover(false), 80);
  };

  /* ── Nombre de display ─────────────────────────────────────── */
  const displayName =
    currentUser?.displayName ||
    currentUser?.email?.split('@')[0] ||
    'Usuario';

  const avatarInitial = (
    currentUser?.displayName?.[0] ??
    currentUser?.email?.[0] ??
    'U'
  ).toUpperCase();

  /* ─────────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────────── */
  return (
    /*
      ⚠️  SIN will-change, filter ni transform en este div raíz.
      Cualquiera de esos crea un nuevo stacking context que rompe
      position:fixed del sidebar cuando hay backdrop-filter activo.
    */
    <div
      className="min-h-[100dvh] w-full overflow-x-hidden relative"
      style={{
        backgroundColor: 'var(--color-bg)',
        color:           'var(--color-text)',
      }}
    >

      {/* ── SIDEBAR DESKTOP — fixed, fuera del flujo ─────────── */}
      {isDesktop && (
        <div
          className="hidden lg:block fixed inset-y-0 left-0 z-40"
          style={{ width: sidebarHover ? '16rem' : '4rem', transition: 'width 0.2s ease' }}
          onMouseEnter={openHover}
          onMouseLeave={closeHover}
        >
          <Sidebar
            isOpen={true}
            onClose={() => {}}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
            isHoverExpanded={sidebarHover}
            onRequestCloseOverlay={() => setSidebarHover(false)}
          />
        </div>
      )}

      {/* ── SIDEBAR MÓVIL ─────────────────────────────────────── */}
      {!isDesktop && (
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          collapsed={false}
          onToggleCollapse={() => {}}
        />
      )}

      {/* ── CONTENIDO PRINCIPAL ───────────────────────────────── */}
      <div
        className="min-h-[100dvh] flex flex-col min-w-0 transition-[padding] duration-200"
        style={{ paddingLeft: isDesktop ? '4rem' : '0' }}
      >

        {/* ── TOPBAR ────────────────────────────────────────────
            ⚠️  Sin backdrop-blur — crearía un filter context que
                destruiría el z-index del sidebar fixed.
        ──────────────────────────────────────────────────────── */}
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="h-16 flex items-center px-4 sm:px-6 shrink-0 border-b gap-3 sticky top-0 z-30"
          style={{
            backgroundColor: 'var(--color-topbar-bg)',
            borderColor:     'var(--color-topbar-border)',
          }}
          role="banner"
        >
          {/* Hamburguesa móvil */}
          <button
            className="lg:hidden p-2 rounded-lg transition-colors hover:bg-[var(--color-surface)]/5"
            style={{ color: 'var(--color-text-muted)' }}
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Abrir menú lateral"
            aria-expanded={sidebarOpen}
            aria-controls="mobile-sidebar"
          >
            <FaBars size={20} aria-hidden="true" />
          </button>

          {/* Logo — solo móvil */}
          <div className="lg:hidden flex-shrink-0">
            <img
              src="/logo-dark.png"
              alt="Rincón Bedoya & Asociados"
              className="h-9 w-auto object-contain max-w-[160px]"
              width={160}
              height={36}
              loading="eager"
              draggable={false}
            />
          </div>

          {/* Spacer */}
          <div className="flex-1" aria-hidden="true" />

          {/* Acciones derecha */}
          <div className="flex items-center gap-3">

            {/* Notificaciones */}
            {currentUser && <NotificationBell />}

            {/* Divisor */}
            <div
              className="hidden sm:block w-px h-5 self-center opacity-40"
              style={{ backgroundColor: 'var(--color-topbar-border)' }}
              aria-hidden="true"
            />

            {/* Usuario + badge de rol */}
            <div className="hidden sm:flex items-center gap-2.5">

              {/* Avatar */}
              <div
                className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden
                           bg-gradient-to-br from-yellow-500/30 to-yellow-700/20
                           border-2 border-yellow-500/30
                           flex items-center justify-center
                           text-yellow-400 font-bold text-sm"
                aria-hidden="true"
              >
                {currentUser?.photoURL
                  ? <img
                      src={currentUser.photoURL}
                      alt=""
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  : avatarInitial
                }
              </div>

              {/* Nombre y rol */}
              <div className="flex flex-col leading-none gap-0.5">
                <span
                  className="text-sm font-semibold truncate max-w-[140px]"
                  style={{ color: 'var(--color-text)' }}
                >
                  {displayName}
                </span>

                <span
                  className="inline-flex items-center gap-1 text-[10px] font-bold
                             px-1.5 py-0.5 rounded-full"
                  style={{
                    color:           roleMeta.color,
                    backgroundColor: roleMeta.bg,
                  }}
                  aria-label={`Rol: ${roleMeta.label}`}
                >
                  <RoleIcon size={8} aria-hidden="true" />
                  {roleMeta.label}
                </span>
              </div>
            </div>
          </div>
        </motion.header>

        {/* ── ÁREA DE CONTENIDO scrollable ─────────────────────── */}
        <main
          className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 min-h-0"
          id="main-content"
          tabIndex={-1}
        >
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
            <Outlet
              context={{
                openSidebar:       () => setSidebarOpen(true),
                sidebarCollapsed,
                setSidebarCollapsed,
              }}
            />
          </div>
        </main>
      </div>
    </div>
  );
}