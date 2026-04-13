// src/shared/components/UI/ConfirmModal.jsx
import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaExclamationTriangle, FaTrash,
  FaExclamationCircle, FaInfoCircle,
} from 'react-icons/fa';

/* ─── Variantes de intención ────────────────────────────────── */
const VARIANTS = {
  danger: {
    Icon:      FaTrash,
    iconColor: 'var(--color-error)',
    iconBg:    'var(--color-error-highlight)',
    btnBg:     'var(--color-error)',
    btnHover:  'var(--color-error-hover)',
    btnText:   '#fff',
  },
  warning: {
    Icon:      FaExclamationTriangle,
    iconColor: 'var(--color-warning)',
    iconBg:    'var(--color-warning-highlight)',
    btnBg:     'var(--color-warning)',
    btnHover:  'var(--color-warning-hover)',
    btnText:   '#fff',
  },
  primary: {
    Icon:      FaExclamationCircle,
    iconColor: 'var(--color-primary)',
    iconBg:    'var(--color-primary-highlight)',
    btnBg:     'var(--color-primary)',
    btnHover:  'var(--color-primary-hover)',
    btnText:   '#fff',
  },
  info: {
    Icon:      FaInfoCircle,
    iconColor: 'var(--color-blue)',
    iconBg:    'var(--color-blue-highlight)',
    btnBg:     'var(--color-blue)',
    btnHover:  'var(--color-blue-hover)',
    btnText:   '#fff',
  },
};

/* ─── Hook: focus trap ──────────────────────────────────────── */
function useFocusTrap(ref, isActive) {
  useEffect(() => {
    if (!isActive || !ref.current) return;

    const focusable = ref.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];

    // Foco inicial en el primer elemento
    first?.focus();

    const trap = (e) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first?.focus(); }
      }
    };

    document.addEventListener('keydown', trap);
    return () => document.removeEventListener('keydown', trap);
  }, [ref, isActive]);
}

/* ═══════════════════════════════════════════════════════════════
   CONFIRM MODAL
═══════════════════════════════════════════════════════════════ */
export default function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText  = 'Eliminar',
  cancelText   = 'Cancelar',
  variant      = 'danger',   // 'danger' | 'warning' | 'primary' | 'info'
  loading      = false,      // muestra spinner en botón confirmar
}) {
  const dialogRef = useRef(null);
  const meta      = VARIANTS[variant] ?? VARIANTS.danger;
  const { Icon }  = meta;

  /* ── Focus trap ─────────────────────────────────────────────── */
  useFocusTrap(dialogRef, isOpen);

  /* ── Escape para cerrar ─────────────────────────────────────── */
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onCancel?.(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onCancel]);

  /* ── Bloquea scroll del body mientras está abierto ─────────── */
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        /* Backdrop */
        <motion.div
          key="confirm-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
          onClick={onCancel}
          aria-hidden="true"
        >
          {/* Panel */}
          <motion.div
            key="confirm-panel"
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-message"
            initial={{ scale: 0.92, opacity: 0, y: 8 }}
            animate={{ scale: 1,    opacity: 1, y: 0 }}
            exit={{ scale: 0.92,    opacity: 0, y: 8 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
            style={{
              backgroundColor: 'var(--color-surface)',
              border:          '1px solid var(--color-border)',
              color:           'var(--color-text)',
            }}
          >
            {/* Ícono + textos */}
            <div className="flex items-start gap-4 mb-5">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: meta.iconBg,
                  color:           meta.iconColor,
                }}
                aria-hidden="true"
              >
                <Icon size={18} />
              </div>

              <div className="flex-1 min-w-0 pt-0.5">
                <h3
                  id="confirm-title"
                  className="font-bold text-base leading-snug"
                  style={{ color: 'var(--color-text)' }}
                >
                  {title}
                </h3>
                {message && (
                  <p
                    id="confirm-message"
                    className="text-sm leading-relaxed mt-1"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {message}
                  </p>
                )}
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-3">
              {/* Cancelar */}
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold
                           transition-all duration-150
                           focus-visible:outline-none focus-visible:ring-2
                           focus-visible:ring-offset-2 disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--color-surface-offset)',
                  color:           'var(--color-text-muted)',
                  // ring offset color
                  '--tw-ring-offset-color': 'var(--color-surface)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-surface-dynamic)';
                  e.currentTarget.style.color           = 'var(--color-text)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-surface-offset)';
                  e.currentTarget.style.color           = 'var(--color-text-muted)';
                }}
              >
                {cancelText}
              </button>

              {/* Confirmar */}
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold
                           transition-all duration-150
                           focus-visible:outline-none focus-visible:ring-2
                           focus-visible:ring-offset-2
                           flex items-center justify-center gap-2
                           disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: meta.btnBg,
                  color:           meta.btnText,
                  '--tw-ring-color':        meta.btnBg,
                  '--tw-ring-offset-color': 'var(--color-surface)',
                }}
                onMouseEnter={(e) => {
                  if (!loading) e.currentTarget.style.backgroundColor = meta.btnHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = meta.btnBg;
                }}
              >
                {loading && (
                  /* Spinner SVG — sin dependencia extra */
                  <svg
                    className="animate-spin"
                    width={14} height={14}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                )}
                {confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}