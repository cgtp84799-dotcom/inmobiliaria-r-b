import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaHome, FaBuilding, FaEnvelope, FaBars, FaTimes } from 'react-icons/fa';
import { MdLightMode, MdDarkMode } from 'react-icons/md';
import { motion, AnimatePresence } from 'framer-motion';
import NotificationBell from '../../../modules/notifications/components/NotificationBell';
import { useAuth } from '../../../core/contexts/AuthContext';
import { useTheme } from '../../../core/contexts/ThemeContext';

const NAV_LINKS = [
  { to: '/',           icon: FaHome,     label: 'Inicio'      },
  { to: 'propiedades', icon: FaBuilding, label: 'Propiedades' },
  { to: 'contacto',   icon: FaEnvelope, label: 'Contacto'    },
];

export default function Navbar() {
  const { currentUser } = useAuth();
  const { theme, toggleTheme } = useTheme?.() ?? {};
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

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
          <Link to="/" className="flex items-center min-w-0">
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
            {/* Theme toggle */}
            {toggleTheme && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={toggleTheme}
                className="theme-toggle"
                aria-label="Cambiar tema"
              >
                {theme === 'dark'
                  ? <MdLightMode size={18} />
                  : <MdDarkMode  size={18} />}
              </motion.button>
            )}

            {currentUser && <NotificationBell />}

            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                to={currentUser ? '/dashboard' : '/acceso'}
                className="button-gold"
              >
                {currentUser ? 'Dashboard' : 'Acceso Agentes'}
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
              <Link
                to={currentUser ? '/dashboard' : '/acceso'}
                className="button-gold w-full text-center block mt-3"
              >
                {currentUser ? 'Dashboard' : 'Acceso Agentes'}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
