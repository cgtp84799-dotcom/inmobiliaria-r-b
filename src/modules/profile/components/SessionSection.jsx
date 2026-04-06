import { useState } from 'react';
import { FaSignOutAlt, FaCalendarAlt, FaClock } from 'react-icons/fa';
import ConfirmModal from '../../../shared/components/UI/ConfirmModal';

function formatDate(value) {
  if (!value) return '—';
  const d = typeof value?.toDate === 'function' ? value.toDate() : new Date(value);
  return d.toLocaleString('es-CO', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function SessionSection({ userData, onSignOut }) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <section aria-labelledby="session-heading" className="card-soft p-6 border border-slate-800">
        <h2 id="session-heading" className="text-lg font-bold text-white mb-5 flex items-center gap-2">
          <FaClock className="text-primary" />
          Sesión y actividad
        </h2>

        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-xl">
            <FaCalendarAlt className="text-primary flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Cuenta creada</p>
              <p className="text-sm text-slate-200 font-medium">{formatDate(userData?.createdAt)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-xl">
            <FaClock className="text-primary flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Último acceso</p>
              <p className="text-sm text-slate-200 font-medium">{formatDate(userData?.lastSeen)}</p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl font-semibold border border-slate-700 transition-all"
        >
          <FaSignOutAlt />
          Cerrar sesión
        </button>
      </section>

      <ConfirmModal
        isOpen={confirmOpen}
        title="¿Cerrar sesión?"
        message="Se cerrará tu sesión en este dispositivo. Podrás volver a ingresar cuando quieras."
        confirmText="Cerrar sesión"
        confirmColor="yellow"
        onConfirm={() => { setConfirmOpen(false); onSignOut(); }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}