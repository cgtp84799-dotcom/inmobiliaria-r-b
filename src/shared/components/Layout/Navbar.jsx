import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaHome, FaBuilding, FaEnvelope, FaBars, FaTimes, FaUser } from 'react-icons/fa';
import { MdLightMode, MdDarkMode } from 'react-icons/md';
import { motion, AnimatePresence } from 'framer-motion';
import NotificationBell from '../../../modules/notifications/components/NotificationBell';
import { useAuth } from '../../../core/contexts/AuthContext';
import { useTheme } from '../../../core/contexts/ThemeContext';
import { PUBLIC_ROUTES, AUTH_ROUTES, PRIVATE_ROUTES } from '../../../core/config/routes.config';

const NAV_LINKS = [
  { to: PUBLIC_ROUTES.HOME,    icon: FaHome,     label: 'Inicio'      },
  { to: PUBLIC_ROUTES.CATALOG, icon: FaBuilding, label: 'Propiedades' },
  { to: PUBLIC_ROUTES.CONTACT, icon: FaEnvelope, label: 'Contacto'    },
];

// Determina qué botones mostrar según el estado del usuario
function useNavConfig(currentUser, userData) {
  // No autenticado → dos botones claros
  if (!currentUser) {
    return {
      primary: { to: '/acceso-clientes', label: '🏠 Mi portal', style: 'client' },
      secondary: { to: AUTH_ROUTES.LOGIN, label: 'Acceso agentes', style: 'ghost' },
    };
  }

  const role = userData?.role;

  // Cliente (viewer) → solo su portal
  if (role === 'viewer') {
    return {
      primary: { to: '/portal', label: 'Mi portal', style: 'client' },
      secondary: null,
    };
  }

  // Admin o member → dashboard
  return {
    primary: { to: PRIVATE_ROUTES.DASHBOARD, label: 'Panel admin', style: 'gold' },
    secondary: null,
  };
}

export default function Navbar() {
  const { currentUser, userData } = useAuth();
  const { theme, toggleTheme } = useTheme?.() ?? {};
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const { primary, secondary } = useNavConfig(currentUser, userData);

  const btnCls = {
    gold:   'button-gold text-sm px-4 py-2',
    client: 'inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-slate-950 font-bold text-sm hover:bg-primary/90 transition-colors shadow-md',
    ghost:  'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-600 text-slate-400 hover:border-primary/40 hover:text-primary transition-colors text-xs font-semibold',
  };

  return (
    <motion.nav
      initial={{ y: -100 }} animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      style={{ backgroundColor: 'var(--color-nav-bg)', borderColor: 'var(--color-nav-border)' }}
      className="sticky top-0 z-50 border-b backdrop-blur-sm"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 sm:h-20 items-center justify-between gap-3">

          {/* Logo */}
          <Link to={PUBLIC_ROUTES.HOME} className="flex items-center min-w-0">
            <img
              src="/logo.jpg.png"
              alt="Rincón Bedoya & Asociados"
              className="h-10 sm:h-12 md:h-14 w-auto object-contain max-w-[170px] sm:max-w-[260px] md:max-w-[360px]"
              draggable={false}
            />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <motion.div key={link.to} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  to={link.to}
                  className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary"
                  style={{ color: 'var(--color-nav-text)' }}
                >
                  <link.icon style={{ color: 'var(--color-nav-text-sub)' }} />
                  <span>{link.label}</span>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {toggleTheme && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={toggleTheme}
                className="theme-toggle"
                aria-label="Cambiar tema"
              >
                {theme === 'dark' ? <MdLightMode size={18} /> : <MdDarkMode size={18} />}
              </motion.button>
            )}

            {currentUser && <NotificationBell />}

            {/* Botón secundario (solo desktop, solo cuando hay dos) */}
            {secondary && (
              <div className="hidden sm:block">
                <Link to={secondary.to} className={btnCls[secondary.style]}>
                  {secondary.label}
                </Link>
              </div>
            )}

            {/* Botón primario */}
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link to={primary.to} className={btnCls[primary.style]}>
                {primary.label}
              </Link>
            </motion.div>

            {/* Hamburger */}
            <div className="md:hidden">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setMobileOpen((v) => !v)}
                className="theme-toggle"
                aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
              >
                {mobileOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="md:hidden overflow-hidden border-t"
            style={{ backgroundColor: 'var(--color-nav-bg)', borderColor: 'var(--color-nav-border)' }}
          >
            <div className="px-4 py-4 space-y-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition hover:text-primary"
                  style={{ color: 'var(--color-nav-text)' }}
                >
                  <link.icon className="text-primary" />
                  <span>{link.label}</span>
                </Link>
              ))}

              <div className="pt-3 space-y-2 border-t border-slate-800 mt-2">
                <Link to={primary.to} className={`${btnCls[primary.style]} w-full justify-center`}>
                  {primary.label}
                </Link>
                {secondary && (
                  <Link to={secondary.to} className={`${btnCls[secondary.style]} w-full justify-center`}>
                    {secondary.label}
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}