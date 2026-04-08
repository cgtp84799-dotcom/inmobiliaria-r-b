import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaUser, FaPhone, FaEnvelope,
  FaCheckCircle, FaTimes,
  FaFlag, FaChevronDown, FaChevronUp, FaTrash,
  FaUserTie, FaCalendarAlt, FaRedoAlt,
  FaClock, FaShieldAlt,
} from 'react-icons/fa';
import { VISIT_STATUS, VISIT_STATUS_LABELS, VISIT_STATUS_COLORS } from '../types/visit.types';
import { formatShort } from '../../../shared/utils/formatDate';
import { useAuth } from '../../../core/contexts/AuthContext';

/**
 * VisitCard
 *
 * Props:
 *   visit        — documento Firestore normalizado
 *   agents       — array de { uid, displayName, email }  (solo admin lo pasa)
 *   onApprove    — (visit, notes, agentData) => void     (solo admin)
 *   onReject     — (visit, notes) => void
 *   onComplete   — (visitId, notes) => void
 *   onReschedule — (visitId, proposedDate, proposedTime, notes) => void
 *   onDelete     — (visitId) => void                     (solo admin)
 */
export default function VisitCard({
  visit,
  agents = [],
  onApprove,
  onReject,
  onComplete,
  onReschedule,
  onDelete,
}) {
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  const [expanded,      setExpanded]      = useState(false);
  const [noteInput,     setNoteInput]     = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');
  const [action,        setAction]        = useState(null);
  const [proposedDate,  setProposedDate]  = useState('');
  const [proposedTime,  setProposedTime]  = useState('');

  const colors = VISIT_STATUS_COLORS[visit.status] ?? VISIT_STATUS_COLORS[VISIT_STATUS.PENDING];
  const label  = VISIT_STATUS_LABELS[visit.status] ?? visit.status;

  const closeAction = () => {
    setAction(null);
    setNoteInput('');
    setSelectedAgent('');
    setProposedDate('');
    setProposedTime('');
  };

  const handleAction = async () => {
    if (action === 'approve') {
      const agentObj  = agents.find((a) => a.uid === selectedAgent) ?? {};
      const agentData = selectedAgent ? {
        agentId:    agentObj.uid,
        agentName:  agentObj.displayName || agentObj.email,
        agentEmail: agentObj.email,
      } : {};
      await onApprove?.(visit, noteInput, agentData);
    }
    if (action === 'reject')     await onReject?.(visit, noteInput);
    if (action === 'complete')   await onComplete?.(visit.id, noteInput);
    if (action === 'reschedule') await onReschedule?.(visit.id, proposedDate, proposedTime, noteInput);
    closeAction();
  };

  const canConfirm =
    action === 'reschedule'
      ? proposedDate.trim() !== '' && proposedTime.trim() !== ''
      : true;

  const canApprove    = isAdmin && visit.status === VISIT_STATUS.PENDING;
  const canReject     = isAdmin && (visit.status === VISIT_STATUS.PENDING || visit.status === VISIT_STATUS.RESCHEDULED);
  const canReschedule = visit.status === VISIT_STATUS.PENDING || visit.status === VISIT_STATUS.APPROVED;
  const canComplete   = visit.status === VISIT_STATUS.APPROVED || visit.status === VISIT_STATUS.RESCHEDULED;
  const canDelete     = isAdmin;

  const confirmBtnClass = [
    'flex-1 py-2 rounded-xl text-sm font-semibold transition-colors',
    'disabled:opacity-40 disabled:cursor-not-allowed',
    action === 'reschedule' ? 'bg-blue-600 text-white hover:bg-blue-500' :
    action === 'reject'     ? 'bg-red-600  text-white hover:bg-red-500'  :
                              'bg-primary text-slate-950 hover:bg-primary/90',
  ].join(' ');

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-colors"
    >
      {/* ─── Cabecera ─────────────────────────────────────────────────────── */}
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${colors.text} ${colors.bg} ${colors.border}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${colors.text.replace('text-', 'bg-')}`} />
                {label}
              </span>
              <span className="text-slate-500 text-xs">
                {visit.requestedDate} — {visit.requestedTime}
              </span>
              {visit.status === VISIT_STATUS.RESCHEDULED && visit.proposedDate && (
                <span className="text-blue-400 text-xs font-semibold bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                  📅 Propuesta: {visit.proposedDate} {visit.proposedTime}
                </span>
              )}
            </div>
            <h3 className="text-white font-bold text-sm sm:text-base truncate">
              {visit.propertyName ?? 'Propiedad sin nombre'}
            </h3>
            <p className="text-slate-400 text-xs truncate mt-0.5">{visit.propertyAddress}</p>
          </div>

          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors flex-shrink-0"
            aria-label={expanded ? 'Colapsar' : 'Expandir'}
          >
            {expanded ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
          </button>
        </div>

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

        {visit.agentName && (
          <div className="mt-2 flex items-center gap-1.5">
            <FaUserTie className="text-yellow-500" size={10} />
            <span className="text-yellow-400 text-xs font-semibold">{visit.agentName}</span>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {canApprove && (
            <button
              onClick={() => setAction(action === 'approve' ? null : 'approve')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors border ${
                action === 'approve'
                  ? 'bg-green-500/25 border-green-500/50 text-green-300'
                  : 'bg-green-500/10 border-green-500/25 text-green-400 hover:bg-green-500/20'
              }`}
            >
              <FaCheckCircle size={11} /> Aprobar
            </button>
          )}

          {canReschedule && onReschedule && (
            <button
              onClick={() => setAction(action === 'reschedule' ? null : 'reschedule')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors border ${
                action === 'reschedule'
                  ? 'bg-blue-500/25 border-blue-500/50 text-blue-300'
                  : 'bg-blue-500/10 border-blue-500/25 text-blue-400 hover:bg-blue-500/20'
              }`}
            >
              <FaRedoAlt size={10} /> Proponer nueva hora
            </button>
          )}

          {canComplete && (
            <button
              onClick={() => setAction(action === 'complete' ? null : 'complete')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors border ${
                action === 'complete'
                  ? 'bg-sky-500/25 border-sky-500/50 text-sky-300'
                  : 'bg-sky-500/10 border-sky-500/25 text-sky-400 hover:bg-sky-500/20'
              }`}
            >
              <FaFlag size={11} /> Marcar completada
            </button>
          )}

          {canReject && (
            <button
              onClick={() => setAction(action === 'reject' ? null : 'reject')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors border ${
                action === 'reject'
                  ? 'bg-red-500/25 border-red-500/50 text-red-300'
                  : 'bg-red-500/10 border-red-500/25 text-red-400 hover:bg-red-500/20'
              }`}
            >
              <FaTimes size={11} /> Rechazar
            </button>
          )}

          {canDelete && onDelete && (
            <button
              onClick={() => onDelete(visit.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-colors ml-auto"
            >
              <FaTrash size={10} /> Eliminar
            </button>
          )}
        </div>

        <AnimatePresence>
          {action && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 overflow-hidden space-y-2"
            >
              {action === 'approve' && isAdmin && agents.length > 0 && (
                <div>
                  <label className="block text-slate-400 text-xs font-semibold mb-1">
                    <FaUserTie className="inline mr-1" size={10} />
                    Asignar agente (opcional)
                  </label>
                  <select
                    value={selectedAgent}
                    onChange={(e) => setSelectedAgent(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                  >
                    <option value="">Sin agente asignado</option>
                    {agents.map((a) => (
                      <option key={a.uid} value={a.uid}>
                        {a.displayName || a.email}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {action === 'reschedule' && (
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3 space-y-2">
                  <p className="text-blue-400 text-xs font-semibold flex items-center gap-1.5">
                    <FaCalendarAlt size={10} /> Nueva fecha y hora propuesta
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 text-xs mb-1">Fecha</label>
                      <input
                        type="date"
                        value={proposedDate}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setProposedDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-sm text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-xs mb-1">Hora</label>
                      <input
                        type="time"
                        value={proposedTime}
                        onChange={(e) => setProposedTime(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-sm text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>
              )}

              <textarea
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder={
                  action === 'approve'    ? 'Notas para el cliente (opcional)...' :
                  action === 'reject'     ? 'Motivo del rechazo (recomendado)...' :
                  action === 'reschedule' ? 'Motivo del cambio o indicaciones (opcional)...' :
                                           'Notas de cierre (opcional)...'
                }
                rows={2}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors resize-none"
              />

              <div className="flex gap-2">
                <button
                  onClick={handleAction}
                  disabled={!canConfirm}
                  className={confirmBtnClass}
                >
                  {
                    action === 'approve'    ? '✓ Confirmar aprobación' :
                    action === 'reject'     ? '✗ Confirmar rechazo'    :
                    action === 'reschedule' ? '📅 Enviar propuesta'     :
                                             '✓ Confirmar'
                  }
                </button>
                <button
                  onClick={closeAction}
                  className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-slate-800 px-4 sm:px-5 py-3 space-y-2 overflow-hidden"
          >
            {visit.status === VISIT_STATUS.RESCHEDULED && visit.proposedDate && (
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
                <p className="text-blue-400 text-xs font-semibold uppercase tracking-wider mb-1">Nueva hora propuesta</p>
                <p className="text-blue-300 text-sm font-bold">{visit.proposedDate} — {visit.proposedTime}</p>
              </div>
            )}

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
                <FaUserTie className="text-yellow-500" size={11} />
                <span className="text-slate-400 text-xs">Agente asignado:</span>
                <span className="text-yellow-400 text-xs font-semibold">{visit.agentName}</span>
              </div>
            )}

            {isAdmin && visit.approvedBy && (
              <div className="flex items-center gap-2">
                <FaShieldAlt className="text-slate-500" size={11} />
                <span className="text-slate-400 text-xs">Aprobado por:</span>
                <span className="text-slate-300 text-xs font-semibold">{visit.approvedBy}</span>
              </div>
            )}

            {visit.approvedAt && (
              <div className="flex items-center gap-2">
                <FaClock className="text-slate-500" size={11} />
                <span className="text-slate-400 text-xs">Autorizado:</span>
                <span className="text-slate-300 text-xs">{formatShort(visit.approvedAt)}</span>
              </div>
            )}

            <p className="text-slate-600 text-xs pt-1">Creada {formatShort(visit.createdAt)}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
