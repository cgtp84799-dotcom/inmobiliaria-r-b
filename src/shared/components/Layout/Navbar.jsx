// src/shared/components/Layout/Navbar.jsx
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FaHome, FaBuilding, FaEnvelope,
  FaBars, FaTimes,
} from 'react-icons/fa';
import { MdLightMode, MdDarkMode } from 'react-icons/md';
import { motion, AnimatePresence } from 'framer-motion';
import NotificationBell from '../../../modules/notifications/components/NotificationBell';
import { useAuth }  from '../../../core/contexts/AuthContext';
import { useTheme } from '../../../core/contexts/ThemeContext';
import { PUBLIC_ROUTES, AUTH_ROUTES, PRIVATE_ROUTES } from '../../../core/config/routes.config';

/* ─── Links de navegación ──────────────────────────────────── */
const NAV_LINKS = [
  { to: PUBLIC_ROUTES.HOME,    icon: FaHome,     label: 'Inicio'      },
  { to: PUBLIC_ROUTES.CATALOG, icon: FaBuilding, label: 'Propiedades' },
  { to: PUBLIC_ROUTES.CONTACT, icon: FaEnvelope, label: 'Contacto'    },
];

/* ─── Configuración de botones según rol ───────────────────── */
function useNavConfig(currentUser, userData) {
  if (!currentUser) {
    return {
      primary:   { to: '/acceso-clientes', label: '🏠 Mi portal',      style: 'client' },
      secondary: { to: AUTH_ROUTES.LOGIN,  label: 'Acceso agentes',     style: 'ghost'  },
    };
  }
  if (userData?.role === 'viewer') {
    return {
      primary:   { to: '/portal', label: 'Mi portal', style: 'client' },
      secondary: null,
    };
  }
  return {
    primary:   { to: PRIVATE_ROUTES.DASHBOARD, label: 'Panel admin', style: 'gold' },
    secondary: null,
  };
}

/* ─── Estilos de botones — sin hardcodear slate ─────────────── */
const BTN_CLS = {
  gold: 'button-gold text-sm px-4 py-2',

  client: [
    'inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm',
    'bg-primary-500 text-dark',                         // usa token Tailwind del config
    'hover:bg-primary-400 transition-colors shadow-md',
  ].join(' '),

  ghost: [
    'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold',
    'border border-themed text-t-muted',                // tokens semánticos
    'hover:border-primary-500/40 hover:text-primary-400 transition-colors',
  ].join(' '),
};

/* ─── Componente NavLink con indicador de activo ───────────── */
function NavItem({ link, mobile = false }) {
  const { pathname } = useLocation();
  const isActive = pathname === link.to ||
    (link.to !== PUBLIC_ROUTES.HOME && pathname.startsWith(link.to));

  const base = mobile
    ? 'flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-colors'
    : 'flex items-center gap-2 text-sm font-medium transition-colors relative group';

  return (
    <Link
      to={link.to}
      className={[
        base,
        isActive
          ? 'text-primary-400'
          : 'text-[var(--color-nav-text)] hover:text-primary-400',
      ].join(' ')}
    >
      <link.icon
        className={isActive ? 'text-primary-500' : 'text-[var(--color-nav-text-sub)]'}
        size={mobile ? 16 : 14}
      />
      <span>{link.label}</span>

      {/* Indicador subrayado — solo desktop */}
      {!mobile && (
        <span
          className={[
            'absolute -bottom-[21px] left-0 right-0 h-[2px] rounded-full',
            'bg-primary-500 transition-all duration-200',
            isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-40',
          ].join(' ')}
        />
      )}
    </Link>
  );
}

/* ─── Navbar principal ─────────────────────────────────────── */
export default function Navbar() {
  const { currentUser, userData }   = useAuth();
  const { theme, toggleTheme }      = useTheme?.() ?? {};
  const [mobileOpen, setMobileOpen] = useState(false);
  const location                    = useLocation();

  // Cierra el menú al navegar
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // Bloquea scroll del body cuando menú móvil está abierto
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const { primary, secondary } = useNavConfig(currentUser, userData);

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="sticky top-0 z-nav border-b backdrop-blur-md"
        style={{
          backgroundColor: 'var(--color-nav-bg)',
          borderColor:     'var(--color-nav-border)',
        }}
        role="navigation"
        aria-label="Navegación principal"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 sm:h-20 items-center justify-between gap-3">

            {/* ── Logo ── */}
            <Link
              to={PUBLIC_ROUTES.HOME}
              className="flex items-center min-w-0 focus-ring rounded-lg"
              aria-label="Ir al inicio — Rincón Bedoya & Asociados"
            >
            <img
              src={theme === 'dark' ? '/logo.jpg.png' : '/logo-dark.png'}
              alt="Rincón Bedoya Asociados"
              className="h-10 sm:h-12 md:h-14 w-auto object-contain max-w-[170px] sm:max-w-[260px] md:max-w-[360px]"
              width={360} height={56} loading="eager" decoding="async" draggable="false"
            />
            </Link>

            {/* ── Links desktop ── */}
            <nav className="hidden md:flex items-center gap-6" aria-label="Menú principal">
              {NAV_LINKS.map((link) => (
                <motion.div key={link.to} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                  <NavItem link={link} />
                </motion.div>
              ))}
            </nav>

            {/* ── Acciones ── */}
            <div className="flex items-center gap-2">

              {/* Toggle de tema */}
              {toggleTheme && (
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  onClick={toggleTheme}
                  className="theme-toggle"
                  aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                >
                  {theme === 'dark'
                    ? <MdLightMode size={18} aria-hidden="true" />
                    : <MdDarkMode  size={18} aria-hidden="true" />
                  }
                </motion.button>
              )}

              {/* Notificaciones */}
              {currentUser && <NotificationBell />}

              {/* Botón secundario — solo desktop */}
              {secondary && (
                <div className="hidden sm:block">
                  <Link to={secondary.to} className={BTN_CLS[secondary.style]}>
                    {secondary.label}
                  </Link>
                </div>
              )}

              {/* Botón primario */}
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link to={primary.to} className={BTN_CLS[primary.style]}>
                  {primary.label}
                </Link>
              </motion.div>

              {/* Hamburguesa */}
              <div className="md:hidden">
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  onClick={() => setMobileOpen((v) => !v)}
                  className="theme-toggle"
                  aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
                  aria-expanded={mobileOpen}
                  aria-controls="mobile-menu"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={mobileOpen ? 'close' : 'open'}
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0,   opacity: 1 }}
                      exit={{   rotate:  90,  opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      {mobileOpen
                        ? <FaTimes size={20} aria-hidden="true" />
                        : <FaBars  size={20} aria-hidden="true" />
                      }
                    </motion.span>
                  </AnimatePresence>
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* ── Menú móvil — fuera del <nav> para no romper el sticky ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Overlay backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[39] bg-black/50 backdrop-blur-sm md:hidden"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />

            {/* Panel del menú */}
            <motion.div
              key="mobile-menu"
              id="mobile-menu"
              role="dialog"
              aria-label="Menú móvil"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="fixed top-16 sm:top-20 left-0 right-0 z-40 overflow-hidden
                         border-b md:hidden"
              style={{
                backgroundColor: 'var(--color-nav-bg)',
                borderColor:     'var(--color-nav-border)',
              }}
            >
              <div className="px-4 py-4 space-y-1">

                {/* Links */}
                {NAV_LINKS.map((link) => (
                  <NavItem key={link.to} link={link} mobile />
                ))}

                {/* Divisor */}
                <div
                  className="pt-3 mt-2 border-t space-y-2"
                  style={{ borderColor: 'var(--color-divider)' }}
                >
                  <Link
                    to={primary.to}
                    className={`${BTN_CLS[primary.style]} w-full justify-center`}
                  >
                    {primary.label}
                  </Link>

                  {secondary && (
                    <Link
                      to={secondary.to}
                      className={`${BTN_CLS[secondary.style]} w-full justify-center`}
                    >
                      {secondary.label}
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}