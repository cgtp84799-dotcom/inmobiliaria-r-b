// src/shared/components/UI/SettingsFab.jsx
//
// Botón flotante de "Configuración rápida" — contextual al rol del usuario.
//
// Visibilidad:
//   • Anónimo  → solo cambiar tema (claro/oscuro).
//   • Cliente  → Mi portal · Mi perfil · Cambiar tema · Cerrar sesión.
//   • Staff    → Panel admin · Mi perfil · Ver catálogo público ·
//                Cambiar tema · Cerrar sesión.
//
// Las acciones se filtran por rol y por contexto (no se muestra "Mi portal"
// si el cliente ya está en el portal, ni "Ver catálogo" si el staff ya está
// en el catálogo público).

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FaCog, FaHome, FaUser, FaSignOutAlt, FaTachometerAlt,
  FaBuilding, FaSun, FaMoon, FaSignInAlt,
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../core/contexts/AuthContext';
import { useTheme } from '../../../core/contexts/ThemeContext';
import { PRIVATE_ROUTES } from '../../../core/config/routes.config';

export default function SettingsFab() {
  const [open, setOpen] = useState(false);
  const {
    currentUser, userData, signOut,
    isAdmin, isMember, isViewer,
  } = useAuth();
  const themeCtx = useTheme?.() ?? {};
  const theme = themeCtx.theme || 'dark';
  const toggleTheme = themeCtx.toggleTheme;
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const wrapperRef = useRef(null);

  const canOperate = isAdmin || isMember;
  const isAnon = !currentUser;

  const displayName = isAnon
    ? 'Visitante'
    : (userData?.displayName ||
       currentUser?.displayName ||
       currentUser?.email ||
       'Usuario');

  // ── Acciones ─────────────────────────────────────────────────
  const closeAndGo = (path) => () => { setOpen(false); navigate(path); };
  const handleLogout = async () => {
    setOpen(false);
    await signOut();
    navigate('/');
  };
  const handleToggleTheme = () => {
    toggleTheme?.();
    // No cierro el panel para que veas el cambio inmediato.
  };
  const handleLogin = () => { setOpen(false); navigate('/acceso-clientes'); };

  // ── Click fuera + Escape ────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const onPtr = (e) => { if (!wrapperRef.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onPtr);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPtr);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // ── Construcción dinámica del menú según rol/contexto ──────
  const inPortal  = pathname.startsWith('/portal');
  const inCatalog = pathname.startsWith('/catalogo') ||
                    pathname.startsWith('/propiedades');
  const inAdmin   = pathname.startsWith('/dashboard') ||
                    pathname.startsWith('/clientes')  ||
                    pathname.startsWith('/contratos') ||
                    pathname.startsWith('/usuarios')  ||
                    pathname.startsWith('/agentes');

  // Construye el array de acciones de navegación
  const navActions = [];

  if (canOperate) {
    if (!inAdmin) {
      navActions.push({
        key: 'admin', icon: FaTachometerAlt,
        label: 'Panel administrativo', onClick: closeAndGo(PRIVATE_ROUTES.DASHBOARD),
      });
    }
    if (!inCatalog) {
      navActions.push({
        key: 'catalog', icon: FaHome,
        label: 'Ver catálogo público', onClick: closeAndGo('/catalogo'),
      });
    }
    navActions.push({
      key: 'profile', icon: FaUser,
      label: 'Mi perfil', onClick: closeAndGo(PRIVATE_ROUTES.PROFILE),
    });
  } else if (isViewer) {
    if (!inPortal) {
      navActions.push({
        key: 'portal', icon: FaTachometerAlt,
        label: 'Mi portal', onClick: closeAndGo(PRIVATE_ROUTES.CLIENT_PORTAL),
      });
    }
    if (!inCatalog) {
      navActions.push({
        key: 'catalog', icon: FaBuilding,
        label: 'Ver propiedades', onClick: closeAndGo('/catalogo'),
      });
    }
    navActions.push({
      key: 'profile', icon: FaUser,
      label: 'Mi perfil', onClick: closeAndGo(`${PRIVATE_ROUTES.CLIENT_PORTAL}/perfil`),
    });
  }

  // ── Render ───────────────────────────────────────────────────
  return (
    <div ref={wrapperRef} className="fixed bottom-4 right-4 z-30">
      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileTap={{ scale: 0.92 }}
        aria-label="Configuración rápida"
        aria-expanded={open}
        aria-haspopup="true"
        className="w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-all duration-150"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-gold)',
          color: 'var(--color-gold)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--color-row-hover)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--color-surface)';
        }}
      >
        <FaCog
          size={18}
          aria-hidden="true"
          className={open ? 'animate-spin' : ''}
          style={{ transition: 'transform 0.3s ease' }}
        />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            aria-label="Menú de configuración"
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute bottom-full right-0 mb-3 w-[min(18rem,calc(100vw-2rem))] rounded-2xl p-4 shadow-2xl origin-bottom-right"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
            }}
          >
            {/* Cabecera */}
            <div
              className="mb-3 pb-3"
              style={{ borderBottom: '1px solid var(--color-divider)' }}
            >
              <p
                className="font-semibold text-sm"
                style={{ color: 'var(--color-gold)' }}
              >
                Configuración rápida
              </p>
              <p
                className="mt-0.5 text-xs truncate"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {displayName}
              </p>
            </div>

            {/* Acciones de navegación contextuales */}
            {navActions.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {navActions.map(({ key, icon: Icon, label, onClick }) => (
                  <button
                    key={key}
                    role="menuitem"
                    onClick={onClick}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors duration-150"
                    style={{
                      backgroundColor: 'var(--color-inner-card)',
                      border: '1px solid var(--color-divider)',
                      color: 'var(--color-text)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-row-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-inner-card)';
                    }}
                  >
                    <Icon
                      size={12}
                      aria-hidden="true"
                      style={{ color: 'var(--color-gold)', flexShrink: 0 }}
                    />
                    <span className="flex-1 text-left">{label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Toggle de tema — disponible para todos */}
            {toggleTheme && (
              <button
                role="menuitem"
                onClick={handleToggleTheme}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors duration-150 mb-2"
                style={{
                  backgroundColor: 'var(--color-inner-card)',
                  border: '1px solid var(--color-divider)',
                  color: 'var(--color-text)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-row-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-inner-card)';
                }}
              >
                {theme === 'dark' ? (
                  <FaSun
                    size={12}
                    aria-hidden="true"
                    style={{ color: '#f59e0b', flexShrink: 0 }}
                  />
                ) : (
                  <FaMoon
                    size={12}
                    aria-hidden="true"
                    style={{ color: 'var(--color-gold)', flexShrink: 0 }}
                  />
                )}
                <span className="flex-1 text-left">
                  {theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
                </span>
              </button>
            )}

            {/* Cerrar sesión / iniciar sesión */}
            {isAnon ? (
              <button
                role="menuitem"
                onClick={handleLogin}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors duration-150"
                style={{
                  backgroundColor: 'var(--color-gold)',
                  color: 'var(--color-bg)',
                  border: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-gold-soft)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-gold)';
                }}
              >
                <FaSignInAlt size={12} aria-hidden="true" style={{ flexShrink: 0 }} />
                <span className="flex-1 text-left">Iniciar sesión</span>
              </button>
            ) : (
              <button
                role="menuitem"
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors duration-150"
                style={{
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#b91c1c';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#dc2626';
                }}
              >
                <FaSignOutAlt size={12} aria-hidden="true" style={{ flexShrink: 0 }} />
                <span className="flex-1 text-left">Cerrar sesión</span>
              </button>
            )}

            {/* Tip */}
            <p
              className="mt-3 text-[10px] leading-snug"
              style={{ color: 'var(--color-text-faint)' }}
            >
              Presiona{' '}
              <kbd
                className="px-1 py-0.5 rounded text-[9px] font-mono"
                style={{
                  backgroundColor: 'var(--color-inner-card)',
                  border: '1px solid var(--color-divider)',
                  color: 'var(--color-text-muted)',
                }}
              >
                Esc
              </kbd>{' '}
              para cerrar.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
