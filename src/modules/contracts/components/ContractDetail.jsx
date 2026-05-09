// src/modules/contracts/components/ContractDetail.jsx
//
// Detalle del contrato con pestañas conectadas a subcolecciones reales:
//   Información | Etapas | Pagos | Documentos | Historial
//
// Mantiene flujos previos (renovar, cambiar estado, eliminar con UI propia).
// Añade:
//  - Avanzar businessStage manualmente
//  - Marcar pagos como pagados
//  - Subir/eliminar documentos
//  - Marcar milestones como completados

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaFileContract, FaUser, FaBuilding, FaCalendarAlt, FaMoneyBillWave,
  FaDownload, FaEdit, FaTimes, FaExternalLinkAlt, FaSpinner, FaHistory,
  FaRedo, FaWhatsapp, FaEnvelope, FaUserTie, FaExclamationTriangle,
  FaTrash, FaCheck, FaCheckCircle, FaUpload, FaArrowRight, FaListUl,
  FaFolderOpen, FaCoins,
} from 'react-icons/fa';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../core/config/firebase.config';
import { useAuth } from '../../../core/contexts/AuthContext';
import toast from 'react-hot-toast';

import { contractService } from '../services/contract.service';
import {
  paymentService, contractDocumentService, milestoneService,
} from '../services/contract.subcollections.service';
import { useContractSubcollections } from '../hooks/useContractSubcollections';
import { notificationService } from '../../../core/services/notificationService';

import ContractStatusBadge from './ContractStatusBadge';
import ContractTypeBadge from './ContractTypeBadge';
import ContractTimeline from './ContractTimeline';

import {
  CONTRACT_STATUS, CONTRACT_STATUS_LABELS,
  PAYMENT_STATUS, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS,
  MILESTONE_STATUS, DOCUMENT_KIND, DOCUMENT_KIND_LABELS,
  getStageLabel, getOperationModeLabel, getStageSequenceByContract,
  resolveContractBusinessStage,
} from '../types/contract.types';
import { formatCOP } from '../../../shared/utils/formatCurrency';
import { formatShort } from '../../../shared/utils/formatDate';

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
}
function cleanPhone(p = '') {
  const d = String(p).replace(/\D/g, '');
  return d.startsWith('57') ? d : `57${d}`;
}

const TABS = [
  { key: 'info',       label: 'Info',       icon: FaFileContract },
  { key: 'stages',     label: 'Etapas',     icon: FaListUl },
  { key: 'payments',   label: 'Pagos',      icon: FaCoins },
  { key: 'documents',  label: 'Docs',       icon: FaFolderOpen },
  { key: 'history',    label: 'Historial',  icon: FaHistory },
];

export default function ContractDetail({ contract, onClose, onUpdated }) {
  const { currentUser } = useAuth();
  const [tab, setTab] = useState('info');

  // Ref del header sticky para posicionar la barra de tabs justo debajo,
  // independientemente del tamaño real del header (que cambia según badges,
  // alertas de vencimiento, etc.).
  const headerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(96);

  useEffect(() => {
    if (!headerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const h = entry.contentRect.height;
        // +1 para evitar gap visible entre header y tabs
        setHeaderHeight(Math.ceil(h) + 1);
      }
    });
    ro.observe(headerRef.current);
    return () => ro.disconnect();
  }, []);

  // estados de acción
  const [changingStatus, setChangingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [advancingStage, setAdvancingStage] = useState(false);

  const { milestones, payments, documents, history, paymentsSummary } =
    useContractSubcollections(contract?.id);

  if (!contract) return null;

  // ── Cálculos derivados (memoizados) ──────────────────────────────────────
  const {
    statusGeneral, days, isExpiringSoon, isExpired,
    financial, baseValue, currency,
    sequence, currentStage, currentIdx, nextStage,
  } = useMemo(() => {
    const sg = contract.statusGeneral || contract.status;
    const d = daysUntil(contract.endDate);
    const fin = contract.financial || null;
    const seq = getStageSequenceByContract({
      type: contract.type, operationMode: contract.operationMode,
    });
    const cur = resolveContractBusinessStage(contract);
    const idx = seq.indexOf(cur);
    return {
      statusGeneral: sg,
      days: d,
      isExpiringSoon:
        sg === CONTRACT_STATUS.ACTIVE && d !== null && d >= 0 && d <= 30,
      isExpired: d !== null && d < 0,
      financial: fin,
      baseValue: fin?.baseValue ?? contract.value ?? 0,
      currency: contract.currency || fin?.currency || 'COP',
      sequence: seq,
      currentStage: cur,
      currentIdx: idx,
      nextStage: idx >= 0 && idx < seq.length - 1 ? seq[idx + 1] : null,
    };
  }, [contract]);

  // ── Acciones ─────────────────────────────────────────────────────────────

  const handleStatusChange = async () => {
    if (!newStatus) return;
    setSaving(true);
    try {
      await contractService.updateStatus(
        contract.id, newStatus, statusNotes, currentUser?.email
      );
      toast.success(`Estado: ${CONTRACT_STATUS_LABELS[newStatus] ?? newStatus}`);
      setChangingStatus(false);
      setNewStatus(''); setStatusNotes('');
      onUpdated?.({ status: newStatus, statusGeneral: newStatus });
    } catch (e) {
      console.error('[ContractDetail] handleStatusChange:', e);
      toast.error('Error al actualizar el estado');
    } finally { setSaving(false); }
  };

  const handleAdvanceStage = async () => {
    if (!nextStage) return;
    setAdvancingStage(true);
    try {
      await contractService.updateBusinessStage(contract.id, nextStage, {
        actorEmail: currentUser?.email,
      });
      toast.success(`Avanzaste a: ${getStageLabel(nextStage)}`);
      // Re-leer el contrato para obtener statusGeneral actualizado
      // (updateBusinessStage ahora auto-promueve de borrador a vigente)
      const fresh = await contractService.getContractById(contract.id);
      if (fresh) {
        onUpdated?.(fresh);
      } else {
        onUpdated?.({ businessStage: nextStage });
      }
    } catch (e) {
      console.error('[ContractDetail] handleAdvanceStage:', e);
      toast.error('No se pudo avanzar la etapa');
    } finally { setAdvancingStage(false); }
  };

  const handleRenew = async () => {
    if (!contract.endDate) {
      toast.error('El contrato no tiene fecha de fin definida');
      return;
    }
    setRenewing(true);
    try {
      const oldEnd = new Date(contract.endDate);
      const newStart = new Date(oldEnd); newStart.setDate(newStart.getDate() + 1);
      const oldStart = new Date(contract.startDate);
      const duration = oldEnd - oldStart;
      const newEnd = new Date(newStart.getTime() + duration);
      const fmt = (d) => d.toISOString().split('T')[0];
      const { id: _, createdAt: __, updatedAt: ___, ...rest } = contract;

      const newId = await contractService.createContract({
        ...rest,
        startDate: fmt(newStart), endDate: fmt(newEnd),
        status: CONTRACT_STATUS.ACTIVE,
        notes: `Renovación del contrato ${contract.id}. ${contract.notes || ''}`.trim(),
        documentUrl: null,
      }, currentUser?.email);

      await addDoc(collection(db, 'contracts', contract.id, 'history'), {
        action: 'renewed', newContractId: newId,
        by: currentUser?.email || 'sistema',
        createdAt: serverTimestamp(),
      });
      toast.success('Contrato renovado correctamente');
      onUpdated?.();
    } catch (e) {
      console.error('[ContractDetail] handleRenew:', e);
      toast.error('Error al renovar el contrato');
    } finally { setRenewing(false); }
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await contractService.deleteContract(contract.id);
      toast.success('Contrato eliminado');
      onClose?.();
    } catch (err) {
      console.error('[ContractDetail] handleDelete error:', err);
      toast.error(`Error al eliminar: ${err.message}`);
      setConfirmDelete(false);
    } finally { setDeleting(false); }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-full">

      {/* ─── HEADER STICKY ────────────────────────────────────────── */}
      <div
        ref={headerRef}
        className="sticky top-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-4 pb-3 border-b"
        style={{
          background: 'var(--color-bg)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'rgba(245, 158, 11, 0.12)',
                color: 'var(--color-gold)',
              }}
            >
              <FaFileContract size={16} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <ContractTypeBadge type={contract.type} />
                <ContractStatusBadge status={statusGeneral} />
              </div>
              <p
                className="text-xs mt-1 truncate"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Creado {formatShort(contract.createdAt)}
                {contract.createdBy && ` · ${contract.createdBy}`}
              </p>
              <div className="mt-0.5 space-y-0.5">
                <p
                  className="text-[11px]"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Etapa:{' '}
                  <span className="text-emerald-500 font-semibold">
                    {getStageLabel(currentStage)}
                  </span>
                </p>
                {contract.operationMode && (
                  <p
                    className="text-[11px]"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    Modalidad:{' '}
                    <span style={{ color: 'var(--color-text)' }}>
                      {getOperationModeLabel(contract.operationMode)}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors flex-shrink-0"
              style={{
                color: 'var(--color-text-muted)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-row-hover)';
                e.currentTarget.style.color = 'var(--color-text)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--color-text-muted)';
              }}
              aria-label="Cerrar"
            >
              <FaTimes size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ─── ALERTAS DE VENCIMIENTO (inline, no sticky) ──────────── */}
      {(isExpiringSoon || (isExpired && statusGeneral !== CONTRACT_STATUS.CANCELLED)) && (
        <div className="pt-3 space-y-2">
          {isExpiringSoon && (
            <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
              <FaExclamationTriangle className="text-yellow-500 flex-shrink-0" size={12} />
              <p className="text-yellow-600 dark:text-yellow-300 text-xs font-semibold">
                Vence en {days} día{days !== 1 ? 's' : ''} — {formatShort(contract.endDate)}
              </p>
            </div>
          )}
          {isExpired && statusGeneral !== CONTRACT_STATUS.CANCELLED && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-xl">
              <FaExclamationTriangle className="text-red-500 flex-shrink-0" size={12} />
              <p className="text-red-600 dark:text-red-300 text-xs font-semibold">
                Vencido hace {Math.abs(days)} día{Math.abs(days) !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ─── TABS STICKY ──────────────────────────────────────────── */}
      <div
        className="sticky z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-3 pb-3 border-b"
        style={{
          top: `${headerHeight}px`,
          background: 'var(--color-bg)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div
          className="flex gap-1 rounded-xl p-1 overflow-x-auto portal-tabs__scroll"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
          role="tablist"
        >
          {TABS.map(({ key, label, icon: Icon }) => {
            const isActive = tab === key;
            return (
              <button
                key={key}
                role="tab"
                aria-selected={isActive}
                onClick={() => setTab(key)}
                className="relative whitespace-nowrap py-2 px-3 sm:px-4 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
                style={{
                  color: isActive
                    ? 'var(--color-text)'
                    : 'var(--color-text-muted)',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.color = 'var(--color-text)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.color = 'var(--color-text-muted)';
                }}
              >
                {isActive && (
                  <motion.span
                    layoutId="contract-tab-pill"
                    className="absolute inset-0 rounded-lg"
                    style={{
                      background: 'var(--color-inner-card)',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                    }}
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative flex items-center gap-1.5">
                  <Icon size={12} /> {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── CONTENIDO TABS ─────────────────────────────────────── */}
      <div className="pt-4 flex-1">
      <AnimatePresence mode="wait">
        {/* INFO */}
        {tab === 'info' && (
          <motion.div key="info" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col gap-3 flex-1">

            <section className="p-4 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
              <p className="text-[var(--color-text-muted)] text-xs font-semibold uppercase tracking-wider mb-2">Propiedad</p>
              <div className="flex items-center gap-2">
                <FaBuilding className="text-[var(--color-text-muted)]" size={12} />
                <span className="text-[var(--color-text)] text-sm font-semibold">{contract.propertyName}</span>
              </div>
              {contract.propertyAddress && (
                <p className="text-[var(--color-text-muted)] text-xs pl-5 mt-0.5">{contract.propertyAddress}</p>
              )}
            </section>

            <section className="p-4 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
              <p className="text-[var(--color-text-muted)] text-xs font-semibold uppercase tracking-wider mb-2">Cliente</p>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <FaUser className="text-[var(--color-text-muted)]" size={12} />
                    <span className="text-[var(--color-text)] text-sm font-semibold">{contract.clientName}</span>
                  </div>
                  <p className="text-[var(--color-text-muted)] text-xs pl-5 mt-0.5">{contract.clientEmail}</p>
                </div>
                <div className="flex gap-2">
                  {contract.clientPhone && (
                    <a href={`https://wa.me/${cleanPhone(contract.clientPhone)}?text=Hola ${contract.clientName}, te contactamos sobre tu contrato de ${contract.propertyName}.`}
                      target="_blank" rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 transition-colors" title="WhatsApp">
                      <FaWhatsapp size={12} />
                    </a>
                  )}
                  {contract.clientEmail && (
                    <a href={`mailto:${contract.clientEmail}?subject=Contrato - ${contract.propertyName}`}
                      className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors" title="Email">
                      <FaEnvelope size={12} />
                    </a>
                  )}
                </div>
              </div>
            </section>

            {contract.agentName && (
              <section className="p-4 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
                <p className="text-[var(--color-text-muted)] text-xs font-semibold uppercase tracking-wider mb-2">Agente</p>
                <div className="flex items-center gap-2">
                  <FaUserTie className="text-[var(--color-text-muted)]" size={12} />
                  <span className="text-[var(--color-text)] text-sm font-semibold">{contract.agentName}</span>
                </div>
                {contract.agentEmail && (
                  <p className="text-[var(--color-text-muted)] text-xs pl-5 mt-0.5">{contract.agentEmail}</p>
                )}
              </section>
            )}

            <section className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
                <div className="flex items-center gap-2 mb-1">
                  <FaCalendarAlt className="text-[var(--color-text-muted)]" size={11} />
                  <p className="text-[var(--color-text-muted)] text-xs font-semibold uppercase tracking-wider">Vigencia</p>
                </div>
                <p className="text-[var(--color-text)] text-sm">{formatShort(contract.startDate) ?? '—'}</p>
                {contract.endDate && (
                  <p className={`text-xs mt-0.5 ${isExpiringSoon ? 'text-yellow-400 font-semibold' : 'text-[var(--color-text-muted)]'}`}>
                    hasta {formatShort(contract.endDate)}
                  </p>
                )}
              </div>
              <div className="p-4 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
                <div className="flex items-center gap-2 mb-1">
                  <FaMoneyBillWave className="text-[var(--color-text-muted)]" size={11} />
                  <p className="text-[var(--color-text-muted)] text-xs font-semibold uppercase tracking-wider">Valor</p>
                </div>
                <p className="text-[var(--color-text)] text-sm font-bold">{formatCOP(baseValue)}</p>
                <p className="text-[var(--color-text-muted)] text-xs">
                  {currency}{contract.type === 'arriendo' ? ' · mensual' : ''}
                </p>
              </div>
            </section>

            {/* Resumen de pagos (arriendo) */}
            {paymentsSummary && (
              <section className="p-4 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
                <p className="text-[var(--color-text-muted)] text-xs font-semibold uppercase tracking-wider mb-2">Pagos</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-emerald-400 text-lg font-bold">{paymentsSummary.paid}</p>
                    <p className="text-[var(--color-text-muted)] text-[10px]">Pagados</p>
                  </div>
                  <div>
                    <p className="text-[var(--color-text)] text-lg font-bold">{paymentsSummary.total - paymentsSummary.paid - paymentsSummary.late}</p>
                    <p className="text-[var(--color-text-muted)] text-[10px]">Pendientes</p>
                  </div>
                  <div>
                    <p className="text-red-400 text-lg font-bold">{paymentsSummary.late}</p>
                    <p className="text-[var(--color-text-muted)] text-[10px]">Vencidos</p>
                  </div>
                </div>
              </section>
            )}

            {contract.notes && (
              <section className="p-4 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
                <p className="text-[var(--color-text-muted)] text-xs font-semibold uppercase tracking-wider mb-2">Notas</p>
                <p className="text-[var(--color-text)] text-sm leading-relaxed">{contract.notes}</p>
              </section>
            )}

            {contract.documentUrl && (
              <a href={contract.documentUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl hover:bg-blue-500/15 transition-colors group">
                <FaDownload className="text-blue-400" size={14} />
                <span className="text-blue-300 text-sm font-semibold flex-1">Descargar contrato PDF</span>
                <FaExternalLinkAlt className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" size={12} />
              </a>
            )}

            {/* Acciones */}
            <div className="flex flex-col gap-2 mt-auto">
              {nextStage && (
                <button onClick={handleAdvanceStage} disabled={advancingStage}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                    bg-primary/15 border border-primary/30 text-primary
                    hover:bg-primary/25 transition-colors text-sm font-semibold
                    disabled:opacity-50 disabled:cursor-not-allowed">
                  {advancingStage ? <FaSpinner className="animate-spin" size={12} /> : <FaArrowRight size={12} />}
                  Avanzar a: {getStageLabel(nextStage)}
                </button>
              )}

              {contract.endDate && [CONTRACT_STATUS.ACTIVE, CONTRACT_STATUS.EXPIRED].includes(statusGeneral) && (
                <button onClick={handleRenew} disabled={renewing}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                    bg-green-500/15 border border-green-500/30 text-green-400
                    hover:bg-green-500/25 transition-colors text-sm font-semibold
                    disabled:opacity-50 disabled:cursor-not-allowed">
                  {renewing ? <FaSpinner className="animate-spin" size={12} /> : <FaRedo size={12} />}
                  Renovar contrato
                </button>
              )}

              <div className="border border-[var(--color-border)] rounded-xl overflow-hidden">
                <button onClick={() => setChangingStatus((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-[var(--color-surface)] hover:bg-[var(--color-surface)] transition-colors">
                  <span className="text-[var(--color-text)] text-sm font-semibold flex items-center gap-2">
                    <FaEdit size={12} /> Cambiar estado general
                  </span>
                  <span className="text-[var(--color-text-muted)] text-xs">{changingStatus ? '▲' : '▼'}</span>
                </button>
                {changingStatus && (
                  <div className="p-4 bg-[var(--color-bg)] space-y-3">
                    <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}
                      className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-text)] focus:border-primary outline-none transition-colors">
                      <option value="">Seleccionar nuevo estado...</option>
                      {Object.entries(CONTRACT_STATUS_LABELS)
                        .filter(([val]) => val !== statusGeneral)
                        .map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
                    </select>
                    <textarea value={statusNotes} onChange={(e) => setStatusNotes(e.target.value)}
                      placeholder="Motivo del cambio (opcional)..." rows={2}
                      className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-sm text-[var(--color-text)] placeholder-slate-500 focus:border-primary outline-none transition-colors resize-none" />
                    <button onClick={handleStatusChange} disabled={!newStatus || saving}
                      className="w-full py-2 rounded-xl font-semibold text-sm bg-primary text-slate-950 hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                      {saving ? <><FaSpinner className="animate-spin" size={12} /> Guardando...</> : 'Confirmar cambio'}
                    </button>
                  </div>
                )}
              </div>

              {!confirmDelete ? (
                <button onClick={() => setConfirmDelete(true)}
                  className="w-full py-2 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-500/10 transition-colors border border-transparent hover:border-red-500/20 flex items-center justify-center gap-1.5">
                  <FaTrash size={10} /> Eliminar contrato
                </button>
              ) : (
                <div className="border border-red-500/30 rounded-xl overflow-hidden bg-red-500/5">
                  <p className="text-red-300 text-xs text-center px-3 py-2.5 font-semibold">
                    ¿Confirmar eliminación permanente?
                  </p>
                  <div className="flex border-t border-red-500/20">
                    <button onClick={() => setConfirmDelete(false)} disabled={deleting}
                      className="flex-1 py-2.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors">
                      Cancelar
                    </button>
                    <button onClick={handleDeleteConfirm} disabled={deleting}
                      className="flex-1 py-2.5 text-xs font-bold text-[var(--color-text)] bg-red-600 hover:bg-red-500 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60">
                      {deleting ? <><FaSpinner className="animate-spin" size={10} /> Eliminando...</>
                                 : <><FaCheck size={10} /> Sí, eliminar</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ETAPAS */}
        {tab === 'stages' && (
          <StagesPane contract={contract} milestones={milestones}
            currentStage={currentStage} currentUser={currentUser} onUpdated={onUpdated} />
        )}

        {/* PAGOS */}
        {tab === 'payments' && (
          <motion.div key="payments" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col gap-3">
            {payments.length === 0 ? (
              <div className="py-8 text-center text-[var(--color-text-muted)]">
                <FaCoins size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sin pagos registrados</p>
                <p className="text-xs mt-1">Los pagos se generan automáticamente al firmar un arriendo.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {payments.map((p) => {
                  const colors = PAYMENT_STATUS_COLORS[p.status] || PAYMENT_STATUS_COLORS[PAYMENT_STATUS.PENDING];
                  return (
                    <div key={p.id} className={`p-3 rounded-xl border ${colors.border} ${colors.bg}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[var(--color-text)] text-sm font-semibold truncate">{p.label}</p>
                          <p className="text-[var(--color-text-muted)] text-[11px]">Vence {formatShort(p.dueDate)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[var(--color-text)] text-sm font-bold">{formatCOP(p.amount)}</p>
                          <span className={`text-[10px] font-semibold ${colors.text}`}>
                            {PAYMENT_STATUS_LABELS[p.status]}
                          </span>
                        </div>
                      </div>
                      {p.status === PAYMENT_STATUS.PENDING && (
                        <button onClick={() => paymentService.markPaid(contract.id, p.id, {
                          paidAmount: p.amount, actorEmail: currentUser?.email,
                        }).then(() => toast.success('Pago registrado')).catch(() => toast.error('Error'))}
                          className="mt-2 w-full py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors">
                          Marcar como pagado
                        </button>
                      )}
                      {p.receiptUrl && (
                        <a href={p.receiptUrl} target="_blank" rel="noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-[11px] text-blue-400 hover:underline">
                          <FaDownload size={9} /> Comprobante
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* DOCUMENTOS */}
        {tab === 'documents' && (
          <DocumentsPane contract={contract} documents={documents} actorEmail={currentUser?.email} />
        )}

        {/* HISTORIAL */}
        {tab === 'history' && (
          <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col gap-3 flex-1">
            {history.length === 0 ? (
              <div className="py-8 text-center text-[var(--color-text-muted)]">
                <FaHistory size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sin historial de cambios</p>
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((h) => (
                  <div key={h.id} className="flex gap-3 p-3 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
                    <div className="w-7 h-7 rounded-full bg-[var(--color-surface)] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FaHistory className="text-[var(--color-text-muted)]" size={10} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[var(--color-text)] text-xs font-semibold">
                        {h.action === 'status_change'
                          ? `Estado: ${CONTRACT_STATUS_LABELS[h.from] ?? h.from} → ${CONTRACT_STATUS_LABELS[h.to] ?? h.to}`
                          : h.action === 'stage_change'
                          ? `Etapa: ${getStageLabel(h.from)} → ${getStageLabel(h.to)}`
                          : h.action === 'renewed'
                          ? 'Contrato renovado'
                          : h.action === 'created'
                          ? 'Contrato creado'
                          : h.action}
                      </p>
                      {h.notes && <p className="text-[var(--color-text-muted)] text-xs mt-0.5 italic">"{h.notes}"</p>}
                      <p className="text-[var(--color-text-faint)] text-xs mt-1">{h.by} · {formatShort(h.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Pane de etapas con confirmación UI (sin confirm() nativo) ──────────────

function StagesPane({ contract, milestones, currentStage, currentUser, onUpdated }) {
  const [pendingStage, setPendingStage] = useState(null);
  const [changing, setChanging] = useState(false);

  const handleStageClick = async (stage) => {
    if (stage === currentStage) return;
    setPendingStage(stage);
  };

  const confirmStageChange = async () => {
    if (!pendingStage) return;
    setChanging(true);
    try {
      await contractService.updateBusinessStage(contract.id, pendingStage, { actorEmail: currentUser?.email });
      toast.success('Etapa actualizada');
      const fresh = await contractService.getContractById(contract.id);
      if (fresh) {
        onUpdated?.(fresh);
      } else {
        onUpdated?.({ businessStage: pendingStage });
      }
    } catch (e) {
      console.error(e); toast.error('Error al cambiar etapa');
    } finally {
      setChanging(false);
      setPendingStage(null);
    }
  };

  return (
    <motion.div key="stages" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="flex flex-col gap-3">

      {pendingStage && (
        <div className="p-3 bg-primary/10 border border-primary/30 rounded-xl space-y-2">
          <p className="text-primary text-xs font-semibold text-center">
            ¿Marcar este contrato como "{getStageLabel(pendingStage)}"?
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPendingStage(null)} disabled={changing}
              className="flex-1 py-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] rounded-lg transition-colors">
              Cancelar
            </button>
            <button onClick={confirmStageChange} disabled={changing}
              className="flex-1 py-2 text-xs font-bold text-[var(--color-text)] bg-primary hover:bg-primary/80 rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60">
              {changing ? <><FaSpinner className="animate-spin" size={10} /> Cambiando...</>
                        : <><FaCheck size={10} /> Confirmar</>}
            </button>
          </div>
        </div>
      )}

      <ContractTimeline contract={contract} onStageClick={handleStageClick} />

      {milestones.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
          <p className="text-[var(--color-text-muted)] text-xs font-semibold uppercase tracking-wider mb-3">Hitos</p>
          <div className="space-y-2">
            {milestones.map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-2.5 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
                <button
                  onClick={async () => {
                    try {
                      await milestoneService.markDone(contract.id, m.id, currentUser?.email);
                      toast.success('Hito completado');
                      // ── NUEVO: Notificar al cliente y al agente ──
                      try {
                        const milestoneLabel = m.label || getStageLabel(m.key);
                        if (contract.clientEmail) {
                          await notificationService.createNotification({
                            userId: contract.clientEmail,
                            type: 'milestone_completed',
                            title: '✅ Hito completado',
                            message: `El hito "${milestoneLabel}" del contrato de "${contract.propertyName}" ha sido completado.`,
                            relatedId: contract.id,
                            actionUrl: '/portal',
                          });
                        }
                        if (contract.agentEmail && contract.agentEmail !== contract.clientEmail) {
                          await notificationService.createNotification({
                            userId: contract.agentEmail,
                            type: 'milestone_completed',
                            title: '✅ Hito completado',
                            message: `El hito "${milestoneLabel}" del contrato de "${contract.propertyName}" fue completado.`,
                            relatedId: contract.id,
                            actionUrl: '/contratos',
                          });
                        }
                      } catch (notifErr) {
                        console.warn('Error notificando hito completado:', notifErr);
                      }
                    } catch {
                      toast.error('Error al completar el hito');
                    }
                  }}
                  disabled={m.status === MILESTONE_STATUS.DONE}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0
                    ${m.status === MILESTONE_STATUS.DONE
                      ? 'bg-emerald-500/20 border-emerald-500 cursor-default'
                      : m.status === MILESTONE_STATUS.CURRENT
                      ? 'border-primary hover:bg-primary/10'
                      : 'border-[var(--color-border)] hover:border-slate-500'}`}>
                  {m.status === MILESTONE_STATUS.DONE && <FaCheck className="text-emerald-400" size={9} />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold ${m.status === MILESTONE_STATUS.DONE ? 'text-emerald-400 line-through' : 'text-[var(--color-text)]'}`}>
                    {m.label || getStageLabel(m.key)}
                  </p>
                  {m.completedAt && (
                    <p className="text-[var(--color-text-faint)] text-[10px]">
                      Completado {formatShort(m.completedAt)} {m.doneBy && `· ${m.doneBy}`}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Pane de documentos con upload ──────────────────────────────────────────

function DocumentsPane({ contract, documents, actorEmail }) {
  const [uploading, setUploading] = useState(false);
  const [kind, setKind] = useState(DOCUMENT_KIND.OTHER);
  const [confirmDeleteDocId, setConfirmDeleteDocId] = useState(null);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await contractDocumentService.upload(contract.id, file, {
        kind, label: file.name, uploadedBy: actorEmail,
      });
      toast.success('Documento subido');
    } catch (err) {
      console.error(err); toast.error('Error al subir documento');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (id) => {
    try {
      await contractDocumentService.remove(contract.id, id);
      toast.success('Documento eliminado');
    } catch (err) {
      console.error(err); toast.error('Error al eliminar');
    } finally {
      setConfirmDeleteDocId(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="flex flex-col gap-3">
      <div className="p-3 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] space-y-2">
        <select value={kind} onChange={(e) => setKind(e.target.value)}
          className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs text-[var(--color-text)] focus:border-primary outline-none">
          {Object.entries(DOCUMENT_KIND_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <label className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg cursor-pointer text-xs font-semibold
          ${uploading ? 'bg-[var(--color-surface)] text-[var(--color-text-muted)]' : 'bg-primary/15 text-primary hover:bg-primary/25'}`}>
          {uploading ? <FaSpinner className="animate-spin" size={11} /> : <FaUpload size={11} />}
          {uploading ? 'Subiendo...' : 'Subir documento'}
          <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      {documents.length === 0 ? (
        <div className="py-8 text-center text-[var(--color-text-muted)]">
          <FaFolderOpen size={28} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Sin documentos cargados</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((d) => (
            <div key={d.id} className="flex items-center gap-3 p-3 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <FaFileContract className="text-blue-400" size={12} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[var(--color-text)] text-xs font-semibold truncate">{d.label || d.filename}</p>
                <p className="text-[var(--color-text-muted)] text-[10px]">
                  {DOCUMENT_KIND_LABELS[d.kind] || d.kind} · {formatShort(d.createdAt)}
                </p>
              </div>
              <a href={d.url} target="_blank" rel="noreferrer"
                className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400" title="Descargar">
                <FaDownload size={11} />
              </a>
              {confirmDeleteDocId === d.id ? (
                <div className="flex gap-1">
                  <button onClick={() => handleDelete(d.id)}
                    className="p-2 rounded-lg bg-red-600 hover:bg-red-500 text-[var(--color-text)]" title="Confirmar">
                    <FaCheck size={11} />
                  </button>
                  <button onClick={() => setConfirmDeleteDocId(null)}
                    className="p-2 rounded-lg bg-[var(--color-surface)] hover:bg-[var(--color-input-bg)] text-[var(--color-text-muted)]" title="Cancelar">
                    <FaTimes size={11} />
                  </button>
                </div>
              ) : (
                <button onClick={() => setConfirmDeleteDocId(d.id)}
                  className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400" title="Eliminar">
                  <FaTrash size={11} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}