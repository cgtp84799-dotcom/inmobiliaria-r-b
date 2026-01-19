import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaHome, FaBuilding, FaEnvelope, FaBars, FaTimes } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import NotificationBell from "../../../modules/notifications/components/NotificationBell";
import { useAuth } from "../../../core/contexts/AuthContext";

const Navbar = () => {
  const { currentUser } = useAuth();
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

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="sticky top-0 z-50 border-b border-primary/20 bg-dark/90 backdrop-blur-sm"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 sm:h-20 items-center justify-between gap-3">
          {/* Logo */}
          <Link to="/" className="flex items-center min-w-0">
            <img
              src="/logo.jpg.png"
              alt="Rincón Bedoya & Asociados"
              className="
                h-10 sm:h-12 md:h-14
                w-auto object-contain
                max-w-[170px] sm:max-w-[260px] md:max-w-[360px] lg:max-w-[520px]
              "
              draggable={false}
            />
          </Link>

          {/* Desktop */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <motion.div key={link.to} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  to={link.to}
                  className="text-light hover:text-primary transition flex items-center gap-2 text-sm font-medium"
                >
                  <link.icon />
                  <span>{link.label}</span>
                </Link>
              </motion.div>
            ))}

            {currentUser && <NotificationBell />}

            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link to={currentUser ? "/dashboard" : "/acceso"} className="button-gold">
                {currentUser ? "Dashboard" : "Acceso Agentes"}
              </Link>
            </motion.div>
          </div>

          {/* Mobile */}
          <div className="md:hidden flex items-center gap-2">
            {currentUser && <NotificationBell />}

            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="rounded-xl p-2.5 text-light hover:text-primary hover:bg-slate-800/60 transition"
              aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <FaTimes size={22} /> : <FaBars size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="md:hidden bg-slate-900 border-t border-primary/20 overflow-hidden"
          >
            <div className="px-4 py-4 space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-light hover:text-primary transition hover:bg-slate-800/50"
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