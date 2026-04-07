import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FaFileContract, FaUser, FaBuilding, FaCalendarAlt,
  FaMoneyBillWave, FaDownload, FaEdit, FaTimes,
  FaExternalLinkAlt, FaSpinner,
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import { contractService } from '../services/contract.service';
import ContractStatusBadge from './ContractStatusBadge';
import ContractTypeBadge from './ContractTypeBadge';
import { CONTRACT_STATUS, CONTRACT_STATUS_LABELS } from '../types/contract.types';
import { formatCOP } from '../../../shared/utils/formatCurrency';
import { formatShort } from '../../../shared/utils/formatDate';

/**
 * ContractDetail — vista completa de un contrato.
 *
 * Props:
 *   contract   — documento Firestore normalizado
 *   onClose()  — callback para cerrar el panel/modal
 *   onUpdated  — callback opcional al cambiar estado
 */
export default function ContractDetail({ contract, onClose, onUpdated }) {
  const [changingStatus, setChangingStatus] = useState(false);
  const [newStatus,      setNewStatus]      = useState('');
  const [statusNotes,    setStatusNotes]    = useState('');
  const [saving,         setSaving]         = useState(false);

  if (!contract) return null;

  const handleStatusChange = async () => {
    if (!newStatus) return;
    setSaving(true);
    try {
      await contractService.updateStatus(contract.id, newStatus, statusNotes);
      toast.success(`Estado actualizado: ${CONTRACT_STATUS_LABELS[newStatus] ?? newStatus}`);
      setChangingStatus(false);
      setNewStatus('');
      setStatusNotes('');
      onUpdated?.();
    } catch {
      toast.error('Error al actualizar el estado');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-primary/15 rounded-xl flex items-center justify-center flex-shrink-0">
            <FaFileContract className="text-primary" size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <ContractTypeBadge   type={contract.type} />
              <ContractStatusBadge status={contract.status} />
            </div>
            <p className="text-slate-400 text-xs mt-1">
              Creado {formatShort(contract.createdAt)}
              {contract.createdBy && ` · por ${contract.createdBy}`}
            </p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400
              hover:text-white transition-colors flex-shrink-0">
            <FaTimes size={14} />
          </button>
        )}
      </div>

      {/* Propiedad */}
      <section className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">Propiedad</p>
        <div className="flex items-center gap-2">
          <FaBuilding className="text-slate-500" size={12} />
          <span className="text-slate-200 text-sm font-semibold">{contract.propertyName}</span>
        </div>
        {contract.propertyAddress && (
          <p className="text-slate-400 text-xs pl-5">{contract.propertyAddress}</p>
        )}
      </section>

      {/* Cliente */}
      <section className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">Cliente</p>
        <div className="flex items-center gap-2">
          <FaUser className="text-slate-500" size={12} />
          <span className="text-slate-200 text-sm font-semibold">{contract.clientName}</span>
        </div>
        <p className="text-slate-400 text-xs pl-5">{contract.clientEmail}</p>
      </section>

      {/* Agente */}
      {contract.agentName && (
        <section className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">Agente</p>
          <div className="flex items-center gap-2">
            <FaUser className="text-slate-500" size={12} />
            <span className="text-slate-200 text-sm font-semibold">{contract.agentName}</span>
          </div>
          {contract.agentEmail && (
            <p className="text-slate-400 text-xs pl-5">{contract.agentEmail}</p>
          )}
        </section>
      )}

      {/* Fechas y valor */}
      <section className="grid grid-cols-2 gap-3">
        <div className="p-4 bg-slate-900 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2 mb-1">
            <FaCalendarAlt className="text-slate-500" size={11} />
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Vigencia</p>
          </div>
          <p className="text-slate-200 text-sm">{formatShort(contract.startDate) ?? '—'}</p>
          {contract.endDate && (
            <p className="text-slate-400 text-xs">hasta {formatShort(contract.endDate)}</p>
          )}
        </div>
        <div className="p-4 bg-slate-900 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2 mb-1">
            <FaMoneyBillWave className="text-slate-500" size={11} />
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Valor</p>
          </div>
          <p className="text-slate-200 text-sm font-bold">{formatCOP(contract.value)}</p>
          <p className="text-slate-500 text-xs">{contract.currency ?? 'COP'}</p>
        </div>
      </section>

      {/* Notas */}
      {contract.notes && (
        <section className="p-4 bg-slate-900 rounded-xl border border-slate-800">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">Notas</p>
          <p className="text-slate-300 text-sm leading-relaxed">{contract.notes}</p>
        </section>
      )}

      {/* PDF */}
      {contract.documentUrl && (
        <a
          href={contract.documentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/30
            rounded-xl hover:bg-blue-500/15 transition-colors group"
        >
          <FaDownload className="text-blue-400" size={14} />
          <span className="text-blue-300 text-sm font-semibold flex-1">Descargar contrato PDF</span>
          <FaExternalLinkAlt className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" size={12} />
        </a>
      )}

      {/* Cambiar estado */}
      <section className="border border-slate-800 rounded-xl overflow-hidden">
        <button
          onClick={() => setChangingStatus((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3
            bg-slate-900 hover:bg-slate-800 transition-colors"
        >
          <span className="text-slate-300 text-sm font-semibold flex items-center gap-2">
            <FaEdit size={12} /> Cambiar estado
          </span>
          <span className="text-slate-500 text-xs">
            {changingStatus ? 'Cerrar' : 'Expandir'}
          </span>
        </button>

        {changingStatus && (
          <div className="p-4 bg-slate-950 space-y-3">
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5
                text-sm text-slate-200 focus:border-primary outline-none transition-colors"
            >
              <option value="">Seleccionar nuevo estado...</option>
              {Object.entries(CONTRACT_STATUS_LABELS)
                .filter(([val]) => val !== contract.status)
                .map(([val, lbl]) => (
                  <option key={val} value={val}>{lbl}</option>
                ))}
            </select>
            <textarea
              value={statusNotes}
              onChange={(e) => setStatusNotes(e.target.value)}
              placeholder="Motivo del cambio (opcional)..."
              rows={2}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2
                text-sm text-slate-200 placeholder-slate-500
                focus:border-primary outline-none transition-colors resize-none"
            />
            <button
              onClick={handleStatusChange}
              disabled={!newStatus || saving}
              className="w-full py-2 rounded-xl font-semibold text-sm
                bg-primary text-slate-950 hover:bg-primary/90
                disabled:opacity-40 disabled:cursor-not-allowed transition-colors
                flex items-center justify-center gap-2"
            >
              {saving ? <><FaSpinner className="animate-spin" size={12} /> Guardando...</> : 'Confirmar cambio'}
            </button>
          </div>
        )}
      </section>
    </motion.div>
  );
}
