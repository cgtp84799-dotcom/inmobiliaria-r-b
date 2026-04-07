import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaCalendarCheck, FaUser, FaPhone, FaEnvelope,
  FaBuilding, FaClock, FaCheckCircle, FaTimes,
  FaFlag, FaChevronDown, FaChevronUp, FaTrash,
} from 'react-icons/fa';
import { VISIT_STATUS, VISIT_STATUS_LABELS, VISIT_STATUS_COLORS } from '../types/visit.types';
import { formatShort } from '../../../shared/utils/formatDate';

/**
 * VisitCard
 *
 * Muestra una visita con todas sus acciones contextuales.
 * Las acciones dependen del estado actual de la visita.
 *
 * Props:
 *   visit      — documento de Firestore normalizado
 *   onApprove  — (visit, notes) => void
 *   onReject   — (visit, notes) => void
 *   onComplete — (visitId, notes) => void
 *   onDelete   — (visitId) => void  (solo admin)
 */
export default function VisitCard({ visit, onApprove, onReject, onComplete, onDelete }) {
  const [expanded,  setExpanded]  = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [action,    setAction]    = useState(null); // 'approve'|'reject'|'complete'

  const colors = VISIT_STATUS_COLORS[visit.status] ?? VISIT_STATUS_COLORS[VISIT_STATUS.PENDING];
  const label  = VISIT_STATUS_LABELS[visit.status] ?? visit.status;

  const handleAction = async () => {
    if (action === 'approve')  await onApprove(visit, noteInput);
    if (action === 'reject')   await onReject(visit, noteInput);
    if (action === 'complete') await onComplete(visit.id, noteInput);
    setAction(null);
    setNoteInput('');
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden
        hover:border-slate-700 transition-colors"
    >
      {/* Cabecera */}
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          {/* Info principal */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {/* Badge estado */}
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold
                px-2.5 py-1 rounded-full border ${colors.text} ${colors.bg} ${colors.border}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${colors.text.replace('text-', 'bg-')}`} />
                {label}
              </span>
              <span className="text-slate-500 text-xs">
                {visit.requestedDate} — {visit.requestedTime}
              </span>
            </div>

            <h3 className="text-white font-bold text-sm sm:text-base truncate">
              {visit.propertyName ?? 'Propiedad sin nombre'}
            </h3>
            <p className="text-slate-400 text-xs truncate mt-0.5">
              {visit.propertyAddress}
            </p>
          </div>

          {/* Botón expand */}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400
              hover:text-white transition-colors flex-shrink-0"
            aria-label={expanded ? 'Colapsar' : 'Expandir'}
          >
            {expanded ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
          </button>
        </div>

        {/* Datos del cliente — siempre visibles */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="flex items-center gap-2 text-slate-300 text-xs">
            <FaUser className="text-slate-500 flex-shrink-0" size={11} />
            <span className="truncate">{visit.clientName}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300 text-xs">
            <FaPhone className="text-slate-500 flex-shrink-0" size={11} />
            <span>{visit.clientPhone}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300 text-xs">
            <FaEnvelope className="text-slate-500 flex-shrink-0" size={11} />
            <span className="truncate">{visit.clientEmail}</span>
          </div>
        </div>

        {/* Botones de acción rápida — solo para estados accionables */}
        <div className="mt-4 flex flex-wrap gap-2">
          {visit.status === VISIT_STATUS.PENDING && (
            <>
              <button
                onClick={() => setAction(action === 'approve' ? null : 'approve')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
                  transition-colors border
                  ${ action === 'approve'
                    ? 'bg-green-500/25 border-green-500/50 text-green-300'
                    : 'bg-green-500/10 border-green-500/25 text-green-400 hover:bg-green-500/20'
                  }`}
              >
                <FaCheckCircle size={11} /> Aprobar
              </button>
              <button
                onClick={() => setAction(action === 'reject' ? null : 'reject')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
                  transition-colors border
                  ${ action === 'reject'
                    ? 'bg-red-500/25 border-red-500/50 text-red-300'
                    : 'bg-red-500/10 border-red-500/25 text-red-400 hover:bg-red-500/20'
                  }`}
              >
                <FaTimes size={11} /> Rechazar
              </button>
            </>
          )}

          {visit.status === VISIT_STATUS.APPROVED && (
            <button
              onClick={() => setAction(action === 'complete' ? null : 'complete')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
                transition-colors border
                ${ action === 'complete'
                  ? 'bg-sky-500/25 border-sky-500/50 text-sky-300'
                  : 'bg-sky-500/10 border-sky-500/25 text-sky-400 hover:bg-sky-500/20'
                }`}
            >
              <FaFlag size={11} /> Marcar completada
            </button>
          )}

          {onDelete && (
            <button
              onClick={() => onDelete(visit.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
                bg-red-500/10 border border-red-500/20 text-red-500
                hover:bg-red-500/20 transition-colors ml-auto"
            >
              <FaTrash size={10} /> Eliminar
            </button>
          )}
        </div>

        {/* Input de notas — aparece cuando se selecciona una acción */}
        <AnimatePresence>
          {action && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 overflow-hidden"
            >
              <textarea
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder={
                  action === 'approve'  ? 'Notas para el cliente (opcional)...' :
                  action === 'reject'   ? 'Motivo del rechazo (recomendado)...' :
                                         'Notas de cierre (opcional)...'
                }
                rows={2}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl
                  px-3 py-2 text-sm text-slate-200 placeholder-slate-500
                  focus:border-primary focus:ring-1 focus:ring-primary outline-none
                  transition-colors resize-none"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleAction}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold
                    bg-primary text-slate-950 hover:bg-primary/90 transition-colors"
                >
                  Confirmar
                </button>
                <button
                  onClick={() => { setAction(null); setNoteInput(''); }}
                  className="px-4 py-2 rounded-xl text-sm text-slate-400
                    hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sección expandida — notas del cliente, agente asignado */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-slate-800 px-4 sm:px-5 py-3 space-y-2 overflow-hidden"
          >
            {visit.notes && (
              <div>
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Notas del cliente</p>
                <p className="text-slate-300 text-xs leading-relaxed">{visit.notes}</p>
              </div>
            )}
            {visit.adminNotes && (
              <div>
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Notas internas</p>
                <p className="text-slate-300 text-xs leading-relaxed">{visit.adminNotes}</p>
              </div>
            )}
            {visit.agentName && (
              <div className="flex items-center gap-2 pt-1">
                <FaBuilding className="text-slate-500" size={11} />
                <span className="text-slate-400 text-xs">Agente: </span>
                <span className="text-slate-300 text-xs font-semibold">{visit.agentName}</span>
              </div>
            )}
            <p className="text-slate-600 text-xs pt-1">
              Creada {formatShort(visit.createdAt)}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
