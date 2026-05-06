// src/modules/profile/components/SessionSection.jsx
//
// Sección "Sesión y actividad" del perfil.
// Usa un modal interno simple (sin dependencias externas) en lugar del
// ConfirmModal compartido, para aislar este componente de fallos de
// minificación que afectaban al import de ConfirmModal.

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSignOutAlt, FaCalendarAlt, FaClock, FaExclamationTriangle } from 'react-icons/fa';

function formatDate(value) {
  if (!value) return '—';
  const d = typeof value?.toDate === 'function' ? value.toDate() : new Date(value);
  return d.toLocaleString('es-CO', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// Modal interno minimalista — sin dependencias del ConfirmModal compartido.
function SignOutConfirm({ open, onConfirm, onCancel }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onCancel?.(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
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
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="signout-title"
            initial={{ scale: 0.92, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 8 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
            }}
          >
            <div className="flex items-start gap-4 mb-5">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: 'rgba(245, 158, 11, 0.12)',
                  color: '#f59e0b',
                }}
                aria-hidden="true"
              >
                <FaExclamationTriangle size={18} />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <h3
                  id="signout-title"
                  className="font-bold text-base leading-snug"
                  style={{ color: 'var(--color-text)' }}
                >
                  ¿Cerrar sesión?
                </h3>
                <p
                  className="text-sm leading-relaxed mt-1"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Se cerrará tu sesión en este dispositivo. Podrás volver a ingresar cuando quieras.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
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
                Cancelar
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                style={{
                  backgroundColor: '#f59e0b',
                  color: '#ffffff',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#d97706';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f59e0b';
                }}
              >
                Cerrar sesión
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function SessionSection({ userData, onSignOut }) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleConfirm = () => {
    setConfirmOpen(false);
    onSignOut?.();
  };

  return (
    <>
      <section
        aria-labelledby="session-heading"
        className="rounded-2xl p-5 sm:p-6 border"
        style={{
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        <h2
          id="session-heading"
          className="text-lg font-bold mb-5 flex items-center gap-2"
          style={{ color: 'var(--color-text)' }}
        >
          <FaClock style={{ color: 'var(--color-gold)' }} />
          Sesión y actividad
        </h2>

        <div className="space-y-3 mb-6">
          <div
            className="flex items-center gap-3 p-4 rounded-xl"
            style={{ background: 'var(--color-inner-card)' }}
          >
            <FaCalendarAlt
              className="flex-shrink-0"
              style={{ color: 'var(--color-gold)' }}
            />
            <div>
              <p
                className="text-xs"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Cuenta creada
              </p>
              <p
                className="text-sm font-medium"
                style={{ color: 'var(--color-text)' }}
              >
                {formatDate(userData?.createdAt)}
              </p>
            </div>
          </div>

          <div
            className="flex items-center gap-3 p-4 rounded-xl"
            style={{ background: 'var(--color-inner-card)' }}
          >
            <FaClock
              className="flex-shrink-0"
              style={{ color: 'var(--color-gold)' }}
            />
            <div>
              <p
                className="text-xs"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Último acceso
              </p>
              <p
                className="text-sm font-medium"
                style={{ color: 'var(--color-text)' }}
              >
                {formatDate(userData?.lastSeen)}
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-semibold border transition-all"
          style={{
            background: 'var(--color-inner-card)',
            color: 'var(--color-text)',
            borderColor: 'var(--color-border)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-row-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--color-inner-card)';
          }}
        >
          <FaSignOutAlt />
          Cerrar sesión
        </button>
      </section>

      <SignOutConfirm
        open={confirmOpen}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
