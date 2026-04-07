import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaCalendarCheck, FaUser, FaPhone, FaEnvelope,
  FaBuilding, FaCheckCircle, FaTimes,
  FaFlag, FaChevronDown, FaChevronUp, FaTrash,
  FaUserTie, FaClock,
} from 'react-icons/fa';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../core/config/firebase.config';
import { VISIT_STATUS, VISIT_STATUS_LABELS, VISIT_STATUS_COLORS } from '../types/visit.types';
import { formatShort } from '../../../shared/utils/formatDate';

/**
 * VisitCard
 *
 * Props:
 *   visit      — documento de Firestore normalizado
 *   onApprove  — (visit, notes, agentData) => void   ← 3B: ahora recibe agentData
 *   onReject   — (visit, notes) => void
 *   onComplete — (visitId, notes) => void
 *   onDelete   — (visitId) => void
 */
export default function VisitCard({ visit, onApprove, onReject, onComplete, onDelete }) {
  const [expanded,       setExpanded]       = useState(false);
  const [noteInput,      setNoteInput]      = useState('');
  const [action,         setAction]         = useState(null);  // 'approve'|'reject'|'complete'
  const [agents,         setAgents]         = useState([]);    // 3B: lista de agentes
  const [selectedAgent,  setSelectedAgent]  = useState('');    // 3B: agente seleccionado
  const [loadingAgents,  setLoadingAgents]  = useState(false);

  const colors = VISIT_STATUS_COLORS[visit.status] ?? VISIT_STATUS_COLORS[VISIT_STATUS.PENDING];
  const label  = VISIT_STATUS_LABELS[visit.status] ?? visit.status;

  // 3B — cargar agentes de Firestore solo cuando se abre el panel de aprobación
  useEffect(() => {
    if (action !== 'approve' || agents.length > 0) return;
    setLoadingAgents(true);
    getDocs(
      query(collection(db, 'users'), where('role', 'in', ['admin', 'member']))
    )
      .then((snap) => {
        setAgents(
          snap.docs.map((d) => ({
            id    : d.id,
            name  : d.data().displayName ?? d.data().name ?? d.data().email,
            email : d.data().email,
          }))
        );
      })
      .catch(() => {})
      .finally(() => setLoadingAgents(false));
  }, [action, agents.length]);

  const handleAction = async () => {
    if (action === 'approve') {
      // 3B: construir agentData si se seleccionó un agente
      let agentData = null;
      if (selectedAgent) {
        const found = agents.find((a) => a.id === selectedAgent);
        if (found) agentData = { agentId: found.id, agentName: found.name, agentEmail: found.email };
      }
      await onApprove(visit, noteInput, agentData);
    }
    if (action === 'reject')   await onReject(visit, noteInput);
    if (action === 'complete') await onComplete(visit.id, noteInput);
    setAction(null);
    setNoteInput('');
    setSelectedAgent('');
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
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
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
            <p className="text-slate-400 text-xs truncate mt-0.5">{visit.propertyAddress}</p>
          </div>

          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400
              hover:text-white transition-colors flex-shrink-0"
            aria-label={expanded ? 'Colapsar' : 'Expandir'}
          >
            {expanded ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
          </button>
        </div>

        {/* Datos del cliente */}
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

        {/* Agente asignado (resumen visible siempre si ya existe) */}
        {visit.agentName && visit.status !== VISIT_STATUS.PENDING && (
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <FaUserTie className="text-yellow-400" size={10} />
            <span className="text-slate-400">Agente:</span>
            <span className="text-yellow-400 font-semibold">{visit.agentName}</span>
          </div>
        )}

        {/* Botones de acción */}
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

        {/* Panel de acción — notas + selector de agente (solo al aprobar) */}
        <AnimatePresence>
          {action && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 overflow-hidden space-y-2"
            >
              {/* 3B: selector de agente solo al aprobar */}
              {action === 'approve' && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-semibold">
                    <FaUserTie className="inline mr-1" size={10} />
                    Asignar agente (opcional)
                  </label>
                  {loadingAgents ? (
                    <p className="text-slate-500 text-xs">Cargando agentes...</p>
                  ) : (
                    <select
                      value={selectedAgent}
                      onChange={(e) => setSelectedAgent(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl
                        px-3 py-2 text-sm text-slate-200
                        focus:border-primary focus:ring-1 focus:ring-primary outline-none
                        transition-colors"
                    >
                      <option value="">Sin asignar</option>
                      {agents.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

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
              <div className="flex gap-2">
                <button
                  onClick={handleAction}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold
                    bg-primary text-slate-950 hover:bg-primary/90 transition-colors"
                >
                  Confirmar
                </button>
                <button
                  onClick={() => { setAction(null); setNoteInput(''); setSelectedAgent(''); }}
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

      {/* Sección expandida */}
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

            {/* 3B: agente asignado detallado en panel expandido */}
            {visit.agentName && (
              <div className="flex items-center gap-3 pt-1 p-2 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
                <FaUserTie className="text-yellow-400 flex-shrink-0" size={13} />
                <div>
                  <p className="text-yellow-400 text-xs font-semibold">{visit.agentName}</p>
                  {visit.agentEmail && (
                    <p className="text-slate-500 text-xs">{visit.agentEmail}</p>
                  )}
                </div>
                {visit.approvedAt && (
                  <div className="ml-auto flex items-center gap-1 text-slate-500 text-xs">
                    <FaClock size={9} />
                    <span>{formatShort(visit.approvedAt)}</span>
                  </div>
                )}
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
