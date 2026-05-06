import { useState } from 'react';
import { FaExclamationTriangle, FaSpinner } from 'react-icons/fa';
import ConfirmModal from '../../../shared/components/UI/ConfirmModal';

export default function DangerZone({ requesting, onRequestDeletion }) {
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState('');

  const handleConfirm = async () => {
    await onRequestDeletion(reason);
    setShowModal(false);
    setReason('');
  };

  return (
    <>
      <section
        aria-labelledby="danger-heading"
        className="card-soft p-6 border border-red-500/20 bg-red-500/5"
      >
        <h2
          id="danger-heading"
          className="text-lg font-bold text-red-400 mb-2 flex items-center gap-2"
        >
          <FaExclamationTriangle />
          Zona de peligro
        </h2>
        <p className="text-[var(--color-text-muted)] text-sm mb-5">
          Las acciones de esta sección no se pueden deshacer fácilmente. Procede con cuidado.
        </p>

        <div className="flex items-start gap-4 p-4 bg-[var(--color-surface)]/60 rounded-xl border border-red-500/20">
          <div className="flex-1">
            <p className="text-sm font-semibold text-[var(--color-text)]">Solicitar eliminación de cuenta</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Genera una petición al administrador. Tu cuenta{' '}
              <strong className="text-[var(--color-text)]">no se eliminará inmediatamente</strong>. Un admin
              la revisará y te contactará.
            </p>
          </div>
          <button
            type="button"
            disabled={requesting}
            onClick={() => setShowModal(true)}
            className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-sm font-semibold border border-red-500/30 transition-all disabled:opacity-50"
          >
            {requesting ? <FaSpinner className="animate-spin" /> : <FaExclamationTriangle />}
            Solicitar
          </button>
        </div>
      </section>

      {/* Modal con textarea de motivo — no usamos ConfirmModal porque necesitamos un input extra */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-[var(--color-surface)] border border-red-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
          >
            <div className="w-12 h-12 bg-red-500/10 border-2 border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaExclamationTriangle className="text-red-500 text-xl" />
            </div>
            <h3 id="delete-dialog-title" className="text-xl font-bold text-[var(--color-text)] text-center mb-2">
              ¿Solicitar eliminación?
            </h3>
            <p className="text-[var(--color-text-muted)] text-sm text-center mb-4">
              Esta acción notificará al administrador. Tu cuenta permanecerá activa hasta que se
              procese la solicitud.
            </p>

            <label htmlFor="deletion-reason" className="block text-sm font-medium text-[var(--color-text)] mb-2">
              Motivo (opcional)
            </label>
            <textarea
              id="deletion-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Cuéntanos por qué deseas eliminar tu cuenta..."
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-light focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none text-sm mb-4"
            />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 bg-[var(--color-surface)] hover:bg-[var(--color-input-bg)] text-[var(--color-text)] rounded-xl font-semibold transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={requesting}
                onClick={handleConfirm}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-[var(--color-text)] rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {requesting ? <FaSpinner className="animate-spin" /> : null}
                Enviar solicitud
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}