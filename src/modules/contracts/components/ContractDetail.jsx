import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaFileContract, FaUser, FaBuilding, FaCalendarAlt,
  FaMoneyBillWave, FaDownload, FaEdit, FaTimes,
  FaExternalLinkAlt, FaSpinner, FaHistory,
  FaRedo, FaWhatsapp, FaEnvelope, FaUserTie,
  FaExclamationTriangle,
} from 'react-icons/fa';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../core/config/firebase.config';
import { useAuth } from '../../../core/contexts/AuthContext';
import toast from 'react-hot-toast';
import { contractService } from '../services/contract.service';
import { notificationService } from '../../notifications/services/notification.service';
import ContractStatusBadge from './ContractStatusBadge';
import ContractTypeBadge from './ContractTypeBadge';
import { CONTRACT_STATUS, CONTRACT_STATUS_LABELS, CONTRACT_TYPE_LABELS } from '../types/contract.types';
import { formatCOP } from '../../../shared/utils/formatCurrency';
import { formatShort, formatRelative } from '../../../shared/utils/formatDate';

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
}

function cleanPhone(p = '') {
  const d = String(p).replace(/\D/g, '');
  return d.startsWith('57') ? d : `57${d}`;
}

export default function ContractDetail({ contract, onClose, onUpdated }) {
  const { currentUser } = useAuth();
  const [tab,            setTab]          = useState('info');    // 'info' | 'history'
  const [changingStatus, setChangingStatus] = useState(false);
  const [newStatus,      setNewStatus]    = useState('');
  const [statusNotes,    setStatusNotes]  = useState('');
  const [saving,         setSaving]       = useState(false);
  const [renewing,       setRenewing]     = useState(false);
  const [history,        setHistory]      = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  if (!contract) return null;

  const days = daysUntil(contract.endDate);
  const isExpiringSoon = contract.status === CONTRACT_STATUS.ACTIVE && days !== null && days >= 0 && days <= 30;
  const isExpired = days !== null && days < 0;

  // ── Cargar historial cuando se cambia a la pestaña ──────────────────────────
  useEffect(() => {
    if (tab !== 'history') return;
    setLoadingHistory(true);
    const unsub = onSnapshot(
      query(
        collection(db, 'contracts', contract.id, 'history'),
        orderBy('createdAt', 'desc')
      ),
      (snap) => {
        setHistory(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoadingHistory(false);
      },
      () => setLoadingHistory(false)
    );
    return () => unsub();
  }, [tab, contract.id]);

  // ── Cambiar estado ──────────────────────────────────────────────────────────
  const handleStatusChange = async () => {
    if (!newStatus) return;
    setSaving(true);
    try {
      await contractService.updateStatus(contract.id, newStatus, statusNotes);

      // Escribir entrada en historial
      await addDoc(collection(db, 'contracts', contract.id, 'history'), {
        action:    'status_change',
        from:      contract.status,
        to:        newStatus,
        notes:     statusNotes || '',
        by:        currentUser?.email || 'sistema',
        createdAt: serverTimestamp(),
      });

      // Notificar al cliente
      if (contract.clientEmail) {
        await notificationService.createNotification({
          userId:    contract.clientEmail,
          type:      'contract_updated',
          title:     'Tu contrato fue actualizado',
          message:   `El contrato de "${contract.propertyName}" cambió a estado: ${CONTRACT_STATUS_LABELS[newStatus] ?? newStatus}.`,
          actionUrl: '/contratos',
        }).catch(() => {});
      }

      // Notificar al agente
      if (contract.agentEmail && contract.agentEmail !== currentUser?.email) {
        await notificationService.createNotification({
          userId:    contract.agentEmail,
          type:      'contract_updated',
          title:     'Estado de contrato actualizado',
          message:   `El contrato de "${contract.propertyName}" cambió a: ${CONTRACT_STATUS_LABELS[newStatus] ?? newStatus}.`,
          actionUrl: '/contratos',
        }).catch(() => {});
      }

      toast.success(`Estado actualizado: ${CONTRACT_STATUS_LABELS[newStatus] ?? newStatus}`);
      setChangingStatus(false);
      setNewStatus('');
      setStatusNotes('');
      onUpdated?.({ status: newStatus });
    } catch {
      toast.error('Error al actualizar el estado');
    } finally {
      setSaving(false);
    }
  };

  // ── Renovar contrato ────────────────────────────────────────────────────────
  const handleRenew = async () => {
    if (!contract.endDate) { toast.error('El contrato no tiene fecha de fin definida'); return; }
    setRenewing(true);
    try {
      // Calcular nueva fecha inicio = día siguiente al fin actual
      const oldEnd   = new Date(contract.endDate);
      const newStart = new Date(oldEnd);
      newStart.setDate(newStart.getDate() + 1);

      // Calcular duración original para la nueva fecha fin
      const oldStart  = new Date(contract.startDate);
      const duration  = oldEnd - oldStart;
      const newEnd    = new Date(newStart.getTime() + duration);

      const fmt = (d) => d.toISOString().split('T')[0];

      const { id: _, createdAt: __, updatedAt: ___, ...rest } = contract;
      const newId = await contractService.createContract(
        {
          ...rest,
          startDate: fmt(newStart),
          endDate:   fmt(newEnd),
          status:    CONTRACT_STATUS.ACTIVE,
          notes:     `Renovación del contrato ${contract.id}. ${contract.notes || ''}`.trim(),
          documentUrl: null,
        },
        currentUser?.email
      );

      // Registrar en historial del original
      await addDoc(collection(db, 'contracts', contract.id, 'history'), {
        action:      'renewed',
        newContractId: newId,
        by:          currentUser?.email || 'sistema',
        createdAt:   serverTimestamp(),
      });

      toast.success('Contrato renovado correctamente');
      onUpdated?.();
    } catch (e) {
      console.error(e);
      toast.error('Error al renovar el contrato');
    } finally {
      setRenewing(false);
    }
  };

  // ── Eliminar ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!confirm('¿Eliminar este contrato permanentemente? Esta acción no se puede deshacer.')) return;
    try {
      await contractService.deleteContract(contract.id);
      toast.success('Contrato eliminado');
      onClose?.();
    } catch {
      toast.error('Error al eliminar');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 h-full">

      {/* ── Header ───────────────────────────────────────────────────────── */}
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
              {contract.createdBy && ` · ${contract.createdBy}`}
            </p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors flex-shrink-0">
            <FaTimes size={14} />
          </button>
        )}
      </div>

      {/* ── Alerta vencimiento ────────────────────────────────────────────── */}
      {isExpiringSoon && (
        <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
          <FaExclamationTriangle className="text-yellow-400 flex-shrink-0" size={12} />
          <p className="text-yellow-300 text-xs font-semibold">
            Vence en {days} día{days !== 1 ? 's' : ''} — {formatShort(contract.endDate)}
          </p>
        </div>
      )}
      {isExpired && contract.status !== CONTRACT_STATUS.CANCELLED && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-xl">
          <FaExclamationTriangle className="text-red-400 flex-shrink-0" size={12} />
          <p className="text-red-300 text-xs font-semibold">
            Vencido hace {Math.abs(days)} día{Math.abs(days) !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-slate-900 rounded-xl p-1">
        {[
          { key: 'info',    label: 'Información' },
          { key: 'history', label: 'Historial'   },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors
              ${tab === key ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab: Información ─────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {tab === 'info' && (
          <motion.div key="info" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col gap-3 flex-1">

            {/* Propiedad */}
            <section className="p-4 bg-slate-900 rounded-xl border border-slate-800">
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">Propiedad</p>
              <div className="flex items-center gap-2">
                <FaBuilding className="text-slate-500" size={12} />
                <span className="text-slate-200 text-sm font-semibold">{contract.propertyName}</span>
              </div>
              {contract.propertyAddress && (
                <p className="text-slate-400 text-xs pl-5 mt-0.5">{contract.propertyAddress}</p>
              )}
            </section>

            {/* Cliente */}
            <section className="p-4 bg-slate-900 rounded-xl border border-slate-800">
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">Cliente</p>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <FaUser className="text-slate-500" size={12} />
                    <span className="text-slate-200 text-sm font-semibold">{contract.clientName}</span>
                  </div>
                  <p className="text-slate-400 text-xs pl-5 mt-0.5">{contract.clientEmail}</p>
                </div>
                {/* Acciones rápidas cliente */}
                <div className="flex gap-2">
                  {contract.clientPhone && (
                    <a href={`https://wa.me/${cleanPhone(contract.clientPhone)}?text=Hola ${contract.clientName}, te contactamos sobre tu contrato de ${contract.propertyName}.`}
                      target="_blank" rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 transition-colors"
                      title="WhatsApp">
                      <FaWhatsapp size={12} />
                    </a>
                  )}
                  {contract.clientEmail && (
                    <a href={`mailto:${contract.clientEmail}?subject=Contrato - ${contract.propertyName}`}
                      className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors"
                      title="Email">
                      <FaEnvelope size={12} />
                    </a>
                  )}
                </div>
              </div>
            </section>

            {/* Agente */}
            {contract.agentName && (
              <section className="p-4 bg-slate-900 rounded-xl border border-slate-800">
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">Agente</p>
                <div className="flex items-center gap-2">
                  <FaUserTie className="text-slate-500" size={12} />
                  <span className="text-slate-200 text-sm font-semibold">{contract.agentName}</span>
                </div>
                {contract.agentEmail && (
                  <p className="text-slate-400 text-xs pl-5 mt-0.5">{contract.agentEmail}</p>
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
                  <p className={`text-xs mt-0.5 ${isExpiringSoon ? 'text-yellow-400 font-semibold' : 'text-slate-400'}`}>
                    hasta {formatShort(contract.endDate)}
                  </p>
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
              <a href={contract.documentUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/30
                  rounded-xl hover:bg-blue-500/15 transition-colors group">
                <FaDownload className="text-blue-400" size={14} />
                <span className="text-blue-300 text-sm font-semibold flex-1">Descargar contrato PDF</span>
                <FaExternalLinkAlt className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" size={12} />
              </a>
            )}

            {/* Acciones */}
            <div className="flex flex-col gap-2 mt-auto">

              {/* Renovar (solo si tiene endDate y está activo o vencido) */}
              {contract.endDate && [CONTRACT_STATUS.ACTIVE, CONTRACT_STATUS.EXPIRED].includes(contract.status) && (
                <button onClick={handleRenew} disabled={renewing}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                    bg-green-500/15 border border-green-500/30 text-green-400
                    hover:bg-green-500/25 transition-colors text-sm font-semibold
                    disabled:opacity-50 disabled:cursor-not-allowed">
                  {renewing ? <FaSpinner className="animate-spin" size={12} /> : <FaRedo size={12} />}
                  Renovar contrato
                </button>
              )}

              {/* Cambiar estado */}
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <button onClick={() => setChangingStatus((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3
                    bg-slate-900 hover:bg-slate-800 transition-colors">
                  <span className="text-slate-300 text-sm font-semibold flex items-center gap-2">
                    <FaEdit size={12} /> Cambiar estado
                  </span>
                  <span className="text-slate-500 text-xs">{changingStatus ? '▲' : '▼'}</span>
                </button>

                {changingStatus && (
                  <div className="p-4 bg-slate-950 space-y-3">
                    <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5
                        text-sm text-slate-200 focus:border-primary outline-none transition-colors">
                      <option value="">Seleccionar nuevo estado...</option>
                      {Object.entries(CONTRACT_STATUS_LABELS)
                        .filter(([val]) => val !== contract.status)
                        .map(([val, lbl]) => (
                          <option key={val} value={val}>{lbl}</option>
                        ))}
                    </select>
                    <textarea value={statusNotes} onChange={(e) => setStatusNotes(e.target.value)}
                      placeholder="Motivo del cambio (opcional)..."
                      rows={2}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2
                        text-sm text-slate-200 placeholder-slate-500
                        focus:border-primary outline-none transition-colors resize-none" />
                    <button onClick={handleStatusChange} disabled={!newStatus || saving}
                      className="w-full py-2 rounded-xl font-semibold text-sm
                        bg-primary text-slate-950 hover:bg-primary/90
                        disabled:opacity-40 disabled:cursor-not-allowed transition-colors
                        flex items-center justify-center gap-2">
                      {saving ? <><FaSpinner className="animate-spin" size={12} /> Guardando...</> : 'Confirmar cambio'}
                    </button>
                    <p className="text-slate-600 text-xs text-center">
                      Se notificará al cliente y al agente automáticamente
                    </p>
                  </div>
                )}
              </div>

              {/* Eliminar */}
              <button onClick={handleDelete}
                className="w-full py-2 rounded-xl text-xs font-semibold
                  text-red-500 hover:bg-red-500/10 transition-colors border border-transparent
                  hover:border-red-500/20">
                Eliminar contrato
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Tab: Historial ─────────────────────────────────────────────── */}
        {tab === 'history' && (
          <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col gap-3 flex-1">
            {loadingHistory ? (
              <div className="py-8 flex justify-center">
                <FaSpinner className="animate-spin text-primary text-xl" />
              </div>
            ) : history.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                <FaHistory size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sin historial de cambios</p>
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((h) => (
                  <div key={h.id} className="flex gap-3 p-3 bg-slate-900 rounded-xl border border-slate-800">
                    <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FaHistory className="text-slate-500" size={10} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-200 text-xs font-semibold">
                        {h.action === 'status_change'
                          ? `Estado: ${CONTRACT_STATUS_LABELS[h.from] ?? h.from} → ${CONTRACT_STATUS_LABELS[h.to] ?? h.to}`
                          : h.action === 'renewed'
                          ? 'Contrato renovado'
                          : h.action}
                      </p>
                      {h.notes && <p className="text-slate-400 text-xs mt-0.5 italic">"{h.notes}"</p>}
                      <p className="text-slate-600 text-xs mt-1">
                        {h.by} · {formatShort(h.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}