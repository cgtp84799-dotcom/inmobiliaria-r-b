// src/shared/components/UI/SettingsFab.jsx
import { useEffect, useRef, useState } from 'react';
import { useNavigate }    from 'react-router-dom';
import { FaCog, FaHome, FaUser, FaSignOutAlt } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth }        from '../../../core/contexts/AuthContext';
import { PRIVATE_ROUTES } from '../../../core/config/routes.config';

/* ─── Estilos del panel — variables semánticas ──────────────── */
const PANEL = {
  bg:         'var(--color-surface)',
  border:     'var(--color-border)',
  text:       'var(--color-text)',
  muted:      'var(--color-text-muted)',
  faint:      'var(--color-text-faint)',
  itemBg:     'var(--color-surface-offset)',
  itemHover:  'var(--color-surface-dynamic)',
  itemBorder: 'var(--color-divider)',
};

export default function SettingsFab() {
  const [open, setOpen]         = useState(false);
  const { currentUser, userData, signOut } = useAuth();
  const navigate                = useNavigate();
  const wrapperRef              = useRef(null);

  const displayName =
    userData?.displayName ||
    currentUser?.displayName ||
    currentUser?.email ||
    'Usuario';

  /* ── Acciones ───────────────────────────────────────────────── */
  const handleGoPublic = () => { navigate('/propiedades'); setOpen(false); };
  const handleProfile  = () => { navigate(PRIVATE_ROUTES.PROFILE); setOpen(false); };
  const handleLogout   = async () => {
    setOpen(false);           // cierra antes del await
    await signOut();
    navigate('/');
  };

  /* ── Click fuera + Escape ───────────────────────────────────── */
  useEffect(() => {
    if (!open) return;
    const onPtr = (e) => { if (!wrapperRef.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onPtr);
    document.addEventListener('keydown',     onKey);
    return () => {
      document.removeEventListener('pointerdown', onPtr);
      document.removeEventListener('keydown',     onKey);
    };
  }, [open]);

  /* ── Early return — todos los hooks ya están arriba ────────── */
  if (!currentUser) return null;

  /* ── Helpers de hover inline ────────────────────────────────── */
  const itemEnter = (e) => (e.currentTarget.style.backgroundColor = PANEL.itemHover);
  const itemLeave = (e) => (e.currentTarget.style.backgroundColor = PANEL.itemBg);

  return (
    <div ref={wrapperRef} className="fixed bottom-4 right-4 z-30">

      {/* ── Botón FAB ─────────────────────────────────────────── */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileTap={{ scale: 0.92 }}
        aria-label="Configuración rápida"
        aria-expanded={open}
        aria-haspopup="true"
        className="w-12 h-12 rounded-full flex items-center justify-center
                   shadow-xl transition-all duration-150
                   focus-visible:outline-none focus-visible:ring-2
                   focus-visible:ring-offset-2"
        style={{
          backgroundColor: 'var(--color-surface)',
          border:          '1px solid var(--color-primary)',
          color:           'var(--color-primary)',
          '--tw-ring-color':        'var(--color-primary)',
          '--tw-ring-offset-color': 'var(--color-bg)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface-offset)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface)')}
      >
        <FaCog
          size={18}
          aria-hidden="true"
          className={open ? 'animate-spin' : ''}
          style={{ transition: 'transform 0.3s ease' }}
        />
      </motion.button>

      {/* ── Panel desplegable ─────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            aria-label="Menú de configuración"
            initial={{ opacity: 0, y: 10,  scale: 0.97 }}
            animate={{ opacity: 1, y: 0,   scale: 1    }}
            exit={{    opacity: 0, y: 10,  scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute bottom-full right-0 mb-3
                       w-[min(18rem,calc(100vw-2rem))]
                       rounded-2xl p-4 shadow-2xl origin-bottom-right"
            style={{
              backgroundColor: PANEL.bg,
              border:          `1px solid ${PANEL.border}`,
              color:           PANEL.text,
            }}
          >
            {/* Cabecera */}
            <div className="mb-3 pb-3" style={{ borderBottom: `1px solid ${PANEL.itemBorder}` }}>
              <p className="font-semibold text-sm" style={{ color: 'var(--color-primary)' }}>
                Configuración rápida
              </p>
              <p className="mt-0.5 text-xs truncate" style={{ color: PANEL.muted }}>
                {displayName}
              </p>
            </div>

            {/* Acciones */}
            <div className="space-y-1.5">

              {/* Ver catálogo */}
              <button
                role="menuitem"
                onClick={handleGoPublic}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl
                           text-xs font-medium transition-colors duration-150
                           focus-visible:outline-none focus-visible:ring-2
                           focus-visible:ring-primary/40"
                style={{
                  backgroundColor: PANEL.itemBg,
                  border:          `1px solid ${PANEL.itemBorder}`,
                  color:           PANEL.text,
                }}
                onMouseEnter={itemEnter}
                onMouseLeave={itemLeave}
              >
                <FaHome
                  size={12}
                  aria-hidden="true"
                  style={{ color: 'var(--color-primary)', flexShrink: 0 }}
                />
                <span className="flex-1 text-left">Ver como cliente (catálogo)</span>
              </button>

              {/* Mi perfil */}
              <button
                role="menuitem"
                onClick={handleProfile}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl
                           text-xs font-medium transition-colors duration-150
                           focus-visible:outline-none focus-visible:ring-2
                           focus-visible:ring-primary/40"
                style={{
                  backgroundColor: PANEL.itemBg,
                  border:          `1px solid ${PANEL.itemBorder}`,
                  color:           PANEL.text,
                }}
                onMouseEnter={itemEnter}
                onMouseLeave={itemLeave}
              >
                <FaUser
                  size={12}
                  aria-hidden="true"
                  style={{ color: 'var(--color-primary)', flexShrink: 0 }}
                />
                <span className="flex-1 text-left">Mi perfil</span>
              </button>

              {/* Cerrar sesión */}
              <button
                role="menuitem"
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl
                           text-xs font-medium transition-colors duration-150
                           focus-visible:outline-none focus-visible:ring-2
                           focus-visible:ring-red-400/40"
                style={{
                  backgroundColor: 'var(--color-error)',
                  border:          'none',
                  color:           '#fff',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-error-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-error)')}
              >
                <FaSignOutAlt size={12} aria-hidden="true" style={{ flexShrink: 0 }} />
                <span className="flex-1 text-left">Cerrar sesión</span>
              </button>
            </div>

            {/* Tip */}
            <p
              className="mt-3 text-[10px] leading-snug"
              style={{ color: PANEL.faint }}
            >
              Presiona <kbd
                className="px-1 py-0.5 rounded text-[9px] font-mono"
                style={{
                  backgroundColor: 'var(--color-surface-offset)',
                  border:          `1px solid ${PANEL.itemBorder}`,
                  color:           PANEL.muted,
                }}
              >Esc</kbd> para cerrar.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}