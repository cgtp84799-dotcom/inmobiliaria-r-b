import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaHome, FaBuilding, FaEnvelope, FaBars, FaTimes } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import NotificationBell from "../../../modules/notifications/components/NotificationBell";
import { useAuth } from "../../../core/contexts/AuthContext";
import { useTheme } from "../../../core/contexts/ThemeContext";

// Icono Sol
const SunIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

// Icono Luna
const MoonIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const Navbar = () => {
  const { currentUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { to: "/", icon: FaHome, label: "Inicio" },
    { to: "/propiedades", icon: FaBuilding, label: "Propiedades" },
    { to: "/contacto", icon: FaEnvelope, label: "Contacto" },
  ];

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const isDark = theme === "dark";

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="sticky top-0 z-50 backdrop-blur-md border-b"
      style={{
        backgroundColor: "var(--color-nav-bg)",
        borderColor: "var(--color-nav-border)",
        transition: "background-color 0.3s ease, border-color 0.3s ease",
      }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 sm:h-20 items-center justify-between gap-3">

          {/* Logo */}
          <Link to="/" className="flex items-center min-w-0">
            <img
              src="/logo.jpg.png"
              alt="Rincón Bedoya & Asociados"
              className="h-10 sm:h-12 md:h-14 w-auto object-contain max-w-[170px] sm:max-w-[260px] md:max-w-[360px] lg:max-w-[520px]"
              draggable={false}
            />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-5">
            {navLinks.map((link) => (
              <motion.div key={link.to} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                <Link
                  to={link.to}
                  className="flex items-center gap-2 text-sm font-medium transition-colors duration-150 hover:text-amber-500"
                  style={{ color: "var(--color-nav-text)" }}
                >
                  <link.icon />
                  <span>{link.label}</span>
                </Link>
              </motion.div>
            ))}

            {currentUser && <NotificationBell />}

            {/* Toggle tema */}
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.93 }}
              onClick={toggleTheme}
              className="theme-toggle"
              aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
              title={isDark ? "Modo claro" : "Modo oscuro"}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={theme}
                  initial={{ opacity: 0, rotate: -30, scale: 0.7 }}
                  animate={{ opacity: 1, rotate: 0,   scale: 1   }}
                  exit={{    opacity: 0, rotate:  30, scale: 0.7 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  style={{ display: "flex" }}
                >
                  {isDark ? <SunIcon /> : <MoonIcon />}
                </motion.span>
              </AnimatePresence>
            </motion.button>

            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link to={currentUser ? "/dashboard" : "/acceso"} className="button-gold">
                {currentUser ? "Dashboard" : "Acceso Agentes"}
              </Link>
            </motion.div>
          </div>

          {/* Mobile actions */}
          <div className="md:hidden flex items-center gap-2">
            {currentUser && <NotificationBell />}

            {/* Toggle tema móvil */}
            <button
              onClick={toggleTheme}
              className="theme-toggle"
              aria-label={isDark ? "Modo claro" : "Modo oscuro"}
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>

            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="rounded-xl p-2.5 transition-colors duration-150"
              style={{ color: "var(--color-nav-text-sub)" }}
              aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <FaTimes size={22} /> : <FaBars size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{    height: 0,    opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="md:hidden border-t overflow-hidden"
            style={{
              backgroundColor: "var(--color-surface)",
              borderColor: "var(--color-nav-border)",
              transition: "background-color 0.3s ease",
            }}
          >
            <div className="px-4 py-4 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors duration-150 hover:text-amber-500"
                  style={{ color: "var(--color-nav-text)" }}
                >
                  <link.icon />
                  <span>{link.label}</span>
                </Link>
              ))}
              <Link
                to={currentUser ? "/dashboard" : "/acceso"}
                className="button-gold w-full text-center block mt-3"
              >
                {currentUser ? "Dashboard" : "Acceso Agentes"}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;
