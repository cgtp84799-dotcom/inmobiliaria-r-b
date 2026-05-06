// src/shared/components/UI/ConfirmModal.jsx
//
// Modal de confirmación reutilizable. Usa tokens CSS para los colores
// estructurales (fondo, borde, texto) y colores semánticos hex para las
// variantes (rojo / ámbar / dorado / azul) que tienen significado fijo.

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaExclamationTriangle, FaTrash,
  FaExclamationCircle, FaInfoCircle,
} from 'react-icons/fa';

// ─── Variantes ────────────────────────────────────────────────────────────────
// Cada variante define el color semántico del icono y del botón confirmar.
// Los colores estructurales (fondo del modal, texto, borde) vienen de tokens.
const VARIANTS = {
  danger: {
    Icon:      FaTrash,
    iconColor: '#ef4444',          // red-500
    iconBg:    'rgba(239, 68, 68, 0.12)',
    btnBg:     '#dc2626',          // red-600
    btnHover:  '#b91c1c',          // red-700
    btnText:   '#ffffff',
  },
  warning: {
    Icon:      FaExclamationTriangle,
    iconColor: '#f59e0b',          // amber-500
    iconBg:    'rgba(245, 158, 11, 0.12)',
    btnBg:     '#f59e0b',
    btnHover:  '#d97706',
    btnText:   '#ffffff',
  },
  primary: {
    Icon:      FaExclamationCircle,
    iconColor: 'var(--color-gold)',
    iconBg:    'rgba(180, 83, 9, 0.12)',
    btnBg:     'var(--color-gold)',
    btnHover:  'var(--color-gold-soft)',
    btnText:   'var(--color-bg)',
  },
  info: {
    Icon:      FaInfoCircle,
    iconColor: '#3b82f6',          // blue-500
    iconBg:    'rgba(59, 130, 246, 0.12)',
    btnBg:     '#3b82f6',
    btnHover:  '#2563eb',
    btnText:   '#ffffff',
  },
};

// ─── Hook focus trap ──────────────────────────────────────────────────────────
function useFocusTrap(ref, isActive) {
  useEffect(() => {
    if (!isActive || !ref.current) return;

    const focusable = ref.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];

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

// ─── ConfirmModal ─────────────────────────────────────────────────────────────
//
// Props:
//   isOpen         boolean    obligatorio
//   title          string     obligatorio
//   message        string     opcional (puede ser ReactNode)
//   onConfirm      function   obligatorio
//   onCancel       function   obligatorio
//   confirmText    string     default 'Eliminar'
//   cancelText     string     default 'Cancelar'
//   variant        string     'danger' | 'warning' | 'primary' | 'info'
//   confirmColor   string     [legacy] alias para variant. Acepta:
//                              'red' | 'yellow' | 'amber' | 'blue' | 'gold'.
//                              Se mantiene para compat con código existente
//                              que lo invoca así (p.ej. SessionSection).
//   loading        boolean    muestra spinner en el botón confirmar
//
// Si confirmColor está definido, prevalece sobre variant para compat.
const COLOR_TO_VARIANT = {
  red:    'danger',
  rojo:   'danger',
  yellow: 'warning',
  amarillo: 'warning',
  amber:  'warning',
  ambar:  'warning',
  blue:   'info',
  azul:   'info',
  gold:   'primary',
  oro:    'primary',
  primary:'primary',
  dorado: 'primary',
};

export default function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText  = 'Eliminar',
  cancelText   = 'Cancelar',
  variant      = 'danger',
  confirmColor,
  loading      = false,
}) {
  const dialogRef = useRef(null);

  const resolvedVariant = confirmColor
    ? (COLOR_TO_VARIANT[String(confirmColor).toLowerCase()] || variant)
    : variant;

  const meta     = VARIANTS[resolvedVariant] || VARIANTS.danger;
  const Icon     = meta.Icon;

  useFocusTrap(dialogRef, isOpen);

  // Escape para cerrar
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onCancel?.(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onCancel]);

  // Bloquea scroll del body mientras está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
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
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
            }}
          >
            {/* Icono + textos */}
            <div className="flex items-start gap-4 mb-5">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: meta.iconBg,
                  color: meta.iconColor,
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
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--color-inner-card)',
                  color: 'var(--color-text-muted)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-row-hover)';
                  e.currentTarget.style.color = 'var(--color-text)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-inner-card)';
                  e.currentTarget.style.color = 'var(--color-text-muted)';
                }}
              >
                {cancelText}
              </button>

              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: meta.btnBg,
                  color: meta.btnText,
                }}
                onMouseEnter={(e) => {
                  if (!loading) e.currentTarget.style.backgroundColor = meta.btnHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = meta.btnBg;
                }}
              >
                {loading && (
                  <svg
                    className="animate-spin"
                    width={14}
                    height={14}
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
