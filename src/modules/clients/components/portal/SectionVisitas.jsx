// src/modules/clients/components/portal/SectionVisitas.jsx
// v2: agrega botón "Cancelar visita" con modal de confirmación.
// Solo se muestra para visitas en estado pending o approved.
// Llama a cancelClientVisit() del hook.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaCalendarAlt, FaCalendarCheck, FaMapMarkerAlt,
  FaWhatsapp, FaClock, FaCheckCircle, FaTimesCircle,
  FaBan, FaTimes, FaExclamationTriangle, FaSpinner,
} from 'react-icons/fa';
import { format, differenceInDays, differenceInHours, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

// Config estados
const VS = {
  pending:     { label: 'En revisión',  color: 'text-yellow-400',  bg: 'bg-yellow-500/10',  border: 'border-yellow-500/20',  icon: FaClock         },
  approved:    { label: '¡Confirmada!', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: FaCheckCircle   },
  completed:   { label: 'Completada',   color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    icon: FaCheckCircle   },
  rejected:    { label: 'No aprobada',  color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20',     icon: FaTimesCircle   },
  rescheduled: { label: 'Nueva fecha',  color: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20',  icon: FaCalendarAlt   },
  cancelada:   { label: 'Cancelada',    color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20',     icon: FaBan           },
};

const CANCELABLE = ['pending', 'approved'];
const WA_NUMBER  = import.meta.env.VITE_WA_NUMBER || '573000000000';

function safeDate(val) {
  if (!val) return null;
  if (typeof val === 'string') { const d = parseISO(val); return isValid(d) ? d : null; }
  if (val?.toDate) return val.toDate();
  return null;
}

function fmtDate(val) {
  const d = safeDate(val);
  if (!d) return '—';
  return format(d, "d 'de' MMMM, yyyy", { locale: es });
}

function Countdown({ dateStr, timeStr }) {
  if (!dateStr) return null;
  const dt = parseISO(`${dateStr}T${timeStr || '10:00'}`);
  if (!isValid(dt)) return null;
  const diffH = differenceInHours(dt, new Date());
  const diffD = differenceInDays(dt, new Date());
  let label = '';
  if (diffH < 0)        label = 'Visita pasada';
  else if (diffH < 24)  label = `Hoy en ${diffH}h`;
  else if (diffD === 1) label = 'Mañana';
  else                  label = `En ${diffD} días`;
  return (
    <span className="inline-flex items-center gap-1 bg-amber-500/15 text-amber-400 text-xs px-2.5 py-1 rounded-full font-semibold border border-amber-500/20">
      <FaClock className="text-[10px]" /> {label}
    </span>
  );
}

// ── Modal de confirmación de cancelación ──────────────────────────────────────
function CancelModal({ visit, onConfirm, onClose }) {
  const [reason,    setReason]    = useState('');
  const [cancelling, setCancelling] = useState(false);

  async function handleConfirm() {
    setCancelling(true);
    try {
      await onConfirm(visit.id, visit, reason);
      onClose();
    } catch {
      setCancelling(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        className="absolute inset-0 bg-[var(--color-bg)]/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94 }}
        className="relative z-10 w-full max-w-sm bg-[var(--color-surface)] border border-[var(--color-border)]/60 rounded-2xl p-6 shadow-2xl"
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/20 flex items-center justify-center flex-shrink-0">
            <FaExclamationTriangle className="text-red-400 text-sm" />
          </div>
          <div>
            <h3 className="text-[var(--color-text)] font-bold">Cancelar visita</h3>
            <p className="text-[var(--color-text-muted)] text-xs mt-0.5">
              ¿Seguro que quieres cancelar tu visita a{' '}
              <span className="text-[var(--color-text)] font-semibold">{visit.propertyName}</span>?
            </p>
          </div>
          <button onClick={onClose} className="ml-auto text-[var(--color-text-faint)] hover:text-[var(--color-text-muted)] transition flex-shrink-0">
            <FaTimes />
          </button>
        </div>

        <div className="mb-5">
          <label className="block text-xs text-[var(--color-text-muted)] mb-1.5 font-medium">
            Motivo (opcional)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej: Ya no estoy disponible en esa fecha..."
            rows={3}
            className="w-full bg-[var(--color-surface)]/60 border border-[var(--color-border)]/60 rounded-xl px-4 py-2.5 text-sm text-[var(--color-text)] placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition resize-none"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={cancelling}
            className="flex-1 py-2.5 rounded-xl border border-[var(--color-border)]/60 text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-slate-600 text-sm transition"
          >
            Mantener visita
          </button>
          <button
            onClick={handleConfirm}
            disabled={cancelling}
            className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-[var(--color-text)] font-bold py-2.5 rounded-xl text-sm transition disabled:opacity-60"
          >
            {cancelling ? <FaSpinner className="animate-spin" /> : <FaBan className="text-xs" />}
            {cancelling ? 'Cancelando...' : 'Cancelar visita'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function SectionVisitas({ visits, onCancelVisit }) {
  const [cancelTarget, setCancelTarget] = useState(null);
  const next = visits.find((v) => ['approved', 'pending'].includes(v.status));
  const rest = visits.filter((v) => v !== next);

  return (
    <div className="space-y-5">

      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[var(--color-text)]">Mis visitas</h2>
        <Link
          to="/agendar-visita"
          className="inline-flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-xs font-semibold px-3 py-2 rounded-xl transition"
        >
          <FaCalendarCheck className="text-[10px]" /> Agendar visita
        </Link>
      </div>

      {/* Estado vacío */}
      {visits.length === 0 && (
        <div className="text-center py-12">
          <FaCalendarAlt className="text-[var(--color-text-faint)] text-3xl mx-auto mb-3" />
          <p className="text-[var(--color-text-muted)] text-sm">Aún no tienes visitas agendadas.</p>
          <Link to="/agendar-visita" className="inline-block mt-4 text-amber-400 hover:underline text-sm">
            Agendar una visita →
          </Link>
        </div>
      )}

      {/* Próxima visita — destacada */}
      {next && (
        <div className="relative overflow-hidden bg-gradient-to-br from-amber-500/8 to-amber-600/4 border border-amber-500/20 rounded-2xl p-5">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-amber-500/5 blur-3xl" />
          </div>
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-xs text-amber-400 font-semibold uppercase tracking-wider">
                  Próxima visita
                </span>
                <Countdown dateStr={next.requestedDate} timeStr={next.requestedTime} />
              </div>
              <p className="text-[var(--color-text)] font-bold truncate">{next.propertyName || 'Propiedad'}</p>
              {next.propertyAddress && (
                <p className="text-[var(--color-text-muted)] text-xs mt-0.5 flex items-center gap-1">
                  <FaMapMarkerAlt className="text-[9px]" /> {next.propertyAddress}
                </p>
              )}
              <p className="text-[var(--color-text-muted)] text-sm mt-1.5">
                {fmtDate(next.requestedDate)}
                {next.requestedTime && ` · ${next.requestedTime}`}
              </p>
              {next.agentName && (
                <p className="text-[var(--color-text-muted)] text-xs mt-1">Agente: {next.agentName}</p>
              )}
            </div>
            <div className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold border ${VS[next.status]?.bg || ''} ${VS[next.status]?.color || ''} ${VS[next.status]?.border || ''}`}>
              {VS[next.status]?.label || next.status}
            </div>
          </div>

          {/* Botón cancelar en visita destacada */}
          {CANCELABLE.includes(next.status) && (
            <button
              onClick={() => setCancelTarget(next)}
              className="mt-3 text-xs text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 hover:bg-red-500/10 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5"
            >
              <FaBan className="text-[10px]" /> Cancelar esta visita
            </button>
          )}
        </div>
      )}

      {/* Resto de visitas */}
      <div className="space-y-3">
        {rest.map((v) => {
          const cfg  = VS[v.status] || VS.pending;
          const Icon = cfg.icon;
          return (
            <div key={v.id} className="bg-[var(--color-surface)]/60 border border-[var(--color-border)]/60 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl ${cfg.bg} border ${cfg.border} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`${cfg.color} text-sm`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[var(--color-text)] text-sm font-semibold truncate">
                    {v.propertyName || 'Propiedad'}
                  </p>
                  <p className="text-[var(--color-text-muted)] text-xs mt-0.5">
                    {fmtDate(v.requestedDate)}
                    {v.requestedTime && ` · ${v.requestedTime}`}
                  </p>
                  {/* Visita reprogramada */}
                  {v.status === 'rescheduled' && v.newDate && (
                    <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-orange-300">
                        Nueva fecha: {fmtDate(v.newDate)}
                      </span>
                      <a
                        href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(`Confirmo mi visita reagendada para el ${fmtDate(v.newDate)} - Propiedad: ${v.propertyName || ''}`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-lg hover:bg-emerald-500/10 transition"
                      >
                        <FaWhatsapp /> Confirmar
                      </a>
                    </div>
                  )}
                  {/* Cancelada por el cliente */}
                  {v.cancelledByClient && v.cancelReason && (
                    <p className="text-xs text-[var(--color-text-muted)] mt-1 italic">
                      Motivo: {v.cancelReason}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <span className={`text-xs font-semibold ${cfg.color} whitespace-nowrap`}>
                    {cfg.label}
                  </span>
                  {/* Botón cancelar solo si es cancelable */}
                  {CANCELABLE.includes(v.status) && (
                    <button
                      onClick={() => setCancelTarget(v)}
                      className="text-[10px] text-red-400 hover:text-red-300 hover:underline transition"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de cancelación */}
      <AnimatePresence>
        {cancelTarget && (
          <CancelModal
            visit={cancelTarget}
            onConfirm={onCancelVisit}
            onClose={() => setCancelTarget(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}