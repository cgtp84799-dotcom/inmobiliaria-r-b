// src/modules/clients/components/portal/SectionContratos.jsx
//
// Vista de contratos del portal del cliente.
// Cambios clave vs la versión anterior:
//  - Usa ContractTimeline (que respeta operationMode) en vez del SALE_STEPS hardcoded
//  - Bloque financiero de arriendo se basa en `financial` y `payments` reales
//  - Soporta promesa con etapas reales del modelo
//  - Suscribe a payments del contrato del cliente para mostrar próximo pago

import { useEffect, useState } from 'react';
import {
  FaFileContract, FaMapMarkerAlt, FaDownload, FaCheckCircle, FaClock,
  FaTimesCircle, FaInfoCircle, FaMoneyBillWave, FaCalendarAlt, FaCoins,
} from 'react-icons/fa';
import { format, parseISO, isValid, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import ContractStatusBadge from '../../../contracts/components/ContractStatusBadge';
import ContractTypeBadge from '../../../contracts/components/ContractTypeBadge';
import ContractTimeline from '../../../contracts/components/ContractTimeline';
import { paymentService, contractDocumentService } from '../../../contracts/services/contract.subcollections.service';
import {
  CONTRACT_TYPE, PAYMENT_STATUS, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS,
  resolveContractBusinessStage, getStageLabel,
} from '../../../contracts/types/contract.types';
import { formatCOP } from '../../../../shared/utils/formatCurrency';

function safeDate(val) {
  if (!val) return null;
  if (val?.toDate) return val.toDate();
  if (val instanceof Date) return val;
  if (typeof val === 'string') {
    const d = parseISO(val);
    return isValid(d) ? d : null;
  }
  return null;
}
function fmtDate(val) {
  const d = safeDate(val); if (!d) return '—';
  return format(d, "d 'de' MMMM, yyyy", { locale: es });
}
function fmtDateShort(val) {
  const d = safeDate(val); if (!d) return '—';
  return format(d, 'd MMM yyyy', { locale: es });
}

// ─── Bloque arriendo con datos reales de payments ──────────────────────────

function RentInfo({ contract }) {
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    if (!contract?.id) return;
    const unsub = paymentService.subscribe(contract.id, setPayments);
    return () => unsub && unsub();
  }, [contract?.id]);

  const startDate = safeDate(contract.startDate);
  const endDate = safeDate(contract.endDate);
  const today = new Date();

  const financial = contract.financial || {};
  const canon = financial.baseValue || contract.value || 0;

  const nextPayment = payments.find((p) => p.status === PAYMENT_STATUS.PENDING);
  const latePayments = payments.filter((p) => p.status === PAYMENT_STATUS.LATE);
  const paidCount = payments.filter((p) => p.status === PAYMENT_STATUS.PAID).length;
  const totalCount = payments.length;

  let totalMonths = null, elapsedPct = 0;
  if (startDate && endDate) {
    totalMonths = Math.round(differenceInDays(endDate, startDate) / 30);
    const elapsed = Math.max(0, differenceInDays(today, startDate));
    const total = differenceInDays(endDate, startDate);
    elapsedPct = total > 0 ? Math.min(100, Math.round((elapsed / total) * 100)) : 0;
  }

  const isExpired = endDate && today > endDate;
  const daysLeft = endDate ? differenceInDays(endDate, today) : null;
  const daysToNext = nextPayment?.dueDate ? differenceInDays(safeDate(nextPayment.dueDate), today) : null;

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
        <FaInfoCircle className="text-emerald-400 text-xs flex-shrink-0 mt-0.5" />
        <p className="text-emerald-300 text-[11px] leading-relaxed">
          Los contratos de arriendo en Colombia se rigen por la Ley 820 de 2003.
          El incremento anual del canon suele estar limitado al IPC del año anterior.
        </p>
      </div>

      {canon > 0 && (
        <div className="flex items-center justify-between p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
          <div className="flex items-center gap-2">
            <FaMoneyBillWave className="text-amber-400 text-xs" />
            <span className="text-slate-400 text-xs">Cánon mensual</span>
          </div>
          <span className="text-amber-400 font-bold text-sm">{formatCOP(canon)} / mes</span>
        </div>
      )}

      {totalCount > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2.5 text-center">
            <p className="text-emerald-400 text-lg font-bold">{paidCount}</p>
            <p className="text-emerald-300/70 text-[10px]">Pagados</p>
          </div>
          <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-2.5 text-center">
            <p className="text-slate-300 text-lg font-bold">{totalCount - paidCount - latePayments.length}</p>
            <p className="text-slate-500 text-[10px]">Pendientes</p>
          </div>
          <div className={`${latePayments.length > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-slate-800/60 border-slate-700/40'} border rounded-xl p-2.5 text-center`}>
            <p className={`text-lg font-bold ${latePayments.length > 0 ? 'text-red-400' : 'text-slate-300'}`}>
              {latePayments.length}
            </p>
            <p className="text-slate-500 text-[10px]">Vencidos</p>
          </div>
        </div>
      )}

      {nextPayment && (
        <div className="flex items-center justify-between p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
          <div className="flex items-center gap-2">
            <FaCoins className="text-blue-400 text-xs" />
            <div>
              <p className="text-blue-300 text-xs font-semibold">Próximo pago</p>
              <p className="text-slate-500 text-[11px]">{fmtDateShort(nextPayment.dueDate)} · {formatCOP(nextPayment.amount)}</p>
            </div>
          </div>
          {daysToNext !== null && (
            <span className="text-blue-400 text-xs font-semibold">
              {daysToNext < 0 ? `Hace ${Math.abs(daysToNext)}d` : daysToNext === 0 ? 'Hoy' : `En ${daysToNext}d`}
            </span>
          )}
        </div>
      )}

      {totalMonths && (
        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Período del contrato</span>
            <span className="text-slate-300 font-semibold">{totalMonths} meses</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${elapsedPct}%` }} />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>{fmtDateShort(contract.startDate)}</span>
            <span className="text-emerald-400">{elapsedPct}% transcurrido</span>
            <span>{fmtDateShort(contract.endDate)}</span>
          </div>
        </div>
      )}

      {isExpired && (
        <div className="flex items-center gap-2 p-3 bg-slate-700/30 border border-slate-700/40 rounded-xl">
          <FaClock className="text-slate-500 text-xs" />
          <p className="text-slate-400 text-xs">Período de arriendo concluido.</p>
        </div>
      )}
      {!isExpired && daysLeft !== null && daysLeft <= 60 && daysLeft >= 0 && (
        <div className={`flex items-center gap-2 p-3 rounded-xl ${daysLeft <= 30 ? 'bg-red-500/10 border border-red-500/20' : 'bg-amber-500/10 border border-amber-500/20'}`}>
          <FaClock className={`text-xs ${daysLeft <= 30 ? 'text-red-400' : 'text-amber-400'}`} />
          <div>
            <p className={`text-xs font-semibold ${daysLeft <= 30 ? 'text-red-400' : 'text-amber-400'}`}>
              {daysLeft === 0 ? 'Vence hoy' : `Vence en ${daysLeft} días`}
            </p>
            <p className="text-slate-500 text-[11px]">
              Considera renovar o coordinar la entrega del inmueble.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Bloque promesa ─────────────────────────────────────────────────────────

function PromiseInfo({ contract }) {
  const arras = contract.financial?.deposit || contract.financial?.initialPayment || 0;
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 p-3 rounded-xl bg-purple-500/5 border border-purple-500/15">
        <FaInfoCircle className="text-purple-400 text-xs flex-shrink-0 mt-0.5" />
        <p className="text-purple-300 text-[11px] leading-relaxed">
          La promesa de compraventa fija las condiciones del negocio antes de firmar la escritura.
          Las arras dadas como garantía se aplican al precio final o se pierden según incumplimiento.
        </p>
      </div>
      {arras > 0 && (
        <div className="flex items-center justify-between p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
          <div className="flex items-center gap-2">
            <FaMoneyBillWave className="text-amber-400 text-xs" />
            <span className="text-slate-400 text-xs">Arras / anticipo</span>
          </div>
          <span className="text-amber-400 font-bold text-sm">{formatCOP(arras)}</span>
        </div>
      )}
    </div>
  );
}

// ─── Principal ─────────────────────────────────────────────────────────────

export default function SectionContratos({ contracts }) {
  const total = contracts.reduce((s, c) => s + (parseFloat(c.value) || 0), 0);
  const vigentes = contracts.filter((c) => (c.statusGeneral || c.status) === 'vigente').length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Mis contratos</h2>
        {total > 0 && (
          <div className="text-right">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">Valor total</p>
            <p className="text-amber-400 font-bold text-sm">{formatCOP(total)}</p>
          </div>
        )}
      </div>

      {contracts.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Total',    value: contracts.length,                                      color: 'text-white' },
            { label: 'Vigentes', value: vigentes,                                              color: 'text-emerald-400' },
            { label: 'Valor',    value: total > 0 ? `${(total / 1_000_000).toFixed(1)}M` : '—', color: 'text-amber-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-slate-900/40 border border-slate-800/40 rounded-xl p-3 text-center">
              <p className={`text-lg font-bold ${color}`}>{value}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {contracts.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/40 flex items-center justify-center mx-auto mb-4">
            <FaFileContract className="text-slate-600 text-2xl" />
          </div>
          <h3 className="text-white font-semibold mb-1">Sin contratos aún</h3>
          <p className="text-slate-500 text-sm">Cuando firmes un contrato, aparecerá aquí con todos sus detalles.</p>
        </div>
      )}

      <div className="space-y-5">
        {contracts.map((c) => {
          const statusGeneral = c.statusGeneral || c.status;
          const stage = resolveContractBusinessStage(c);
          return (
            <div key={c.id} className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-white font-semibold truncate">{c.propertyName || 'Propiedad'}</p>
                  {c.propertyAddress && (
                    <p className="text-slate-500 text-xs mt-0.5 flex items-center gap-1">
                      <FaMapMarkerAlt className="text-[9px]" /> {c.propertyAddress}
                    </p>
                  )}
                  <p className="mt-1 text-[11px] text-emerald-400 flex items-center gap-1">
                    <FaClock className="text-[9px]" />
                    Etapa: <span className="font-semibold">{getStageLabel(stage)}</span>
                  </p>
                </div>
                <ContractStatusBadge status={statusGeneral} />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <ContractTypeBadge type={c.type} />
                {c.value > 0 && (
                  <span className="text-amber-400 font-bold text-sm">{formatCOP(c.value)}</span>
                )}
                {c.type === CONTRACT_TYPE.RENT && c.value > 0 && (
                  <span className="text-slate-500 text-xs">/mes</span>
                )}
              </div>

              {/* Timeline real respetando operationMode */}
              {(c.type === CONTRACT_TYPE.SALE || c.type === CONTRACT_TYPE.PROMISE) && (
                <div className="pt-2">
                  <ContractTimeline contract={c} />
                </div>
              )}

              {c.type === CONTRACT_TYPE.RENT     && <RentInfo contract={c} />}
              {c.type === CONTRACT_TYPE.PROMISE  && <PromiseInfo contract={c} />}

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                {c.startDate && (
                  <div className="bg-slate-800/40 rounded-lg p-2.5">
                    <p className="text-[10px] text-slate-600 mb-0.5">
                      {c.type === CONTRACT_TYPE.RENT ? 'Inicio del arriendo' : 'Fecha inicio'}
                    </p>
                    <p className="text-slate-300 font-medium">{fmtDate(c.startDate)}</p>
                  </div>
                )}
                {c.endDate && (
                  <div className="bg-slate-800/40 rounded-lg p-2.5">
                    <p className="text-[10px] text-slate-600 mb-0.5">
                      {c.type === CONTRACT_TYPE.RENT ? 'Fin del arriendo' : 'Fecha fin'}
                    </p>
                    <p className="text-slate-300 font-medium">{fmtDate(c.endDate)}</p>
                  </div>
                )}
              </div>

              {c.notes && (
                <div className="flex items-start gap-2 p-3 bg-slate-800/30 rounded-xl border border-slate-700/30">
                  <FaInfoCircle className="text-slate-500 text-xs mt-0.5 flex-shrink-0" />
                  <p className="text-slate-400 text-xs leading-relaxed">{c.notes}</p>
                </div>
              )}

              {c.documentUrl && (
                <a href={c.documentUrl} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 border border-blue-500/20 px-3 py-2 rounded-lg hover:bg-blue-500/10 transition">
                  <FaDownload /> Descargar contrato en PDF
                </a>
              )}

              {/* Documentos asociados al contrato */}
              <ContractDocuments contractId={c.id} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Documentos del contrato visibles en el portal ─────────────────────────

function ContractDocuments({ contractId }) {
  const [docs, setDocs] = useState([]);

  useEffect(() => {
    if (!contractId) return;
    const unsub = contractDocumentService.subscribe(contractId, setDocs);
    return () => unsub && unsub();
  }, [contractId]);

  if (!docs.length) return null;

  const DOCUMENT_LABELS = {
    contrato: 'Contrato', promesa: 'Promesa', escritura: 'Escritura',
    certificado_libertad: 'Cert. Libertad', inventario: 'Inventario',
    acta_entrega: 'Acta de entrega', comprobante_pago: 'Comprobante',
    documento_identidad: 'Identidad', otro: 'Documento',
  };

  return (
    <div className="mt-3 pt-3 border-t border-slate-700/30">
      <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold mb-2">
        Documentos ({docs.length})
      </p>
      <div className="space-y-1.5">
        {docs.map((d) => (
          <a key={d.id} href={d.url} target="_blank" rel="noreferrer"
            className="flex items-center gap-2 p-2 bg-slate-800/40 rounded-lg hover:bg-slate-800/60 transition group">
            <FaDownload className="text-blue-400 text-[10px] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-300 font-medium truncate">{d.label || d.filename}</p>
              <p className="text-[10px] text-slate-500">{DOCUMENT_LABELS[d.kind] || d.kind}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}