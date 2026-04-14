// src/modules/clients/components/portal/SectionContratos.jsx
//
// MÓDULO E — Contratos con timeline visual de estados.
// Muestra el progreso del contrato: Borrador → Firmado → Vigente → Vencido.
// Cada estado tiene una descripción clara de qué significa para el cliente.

import {
  FaFileContract, FaMapMarkerAlt, FaDownload,
  FaCheckCircle, FaClock, FaTimesCircle, FaEdit,
  FaArrowRight,
} from 'react-icons/fa';
import { format, parseISO, isValid, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import ContractStatusBadge from '../../../contracts/components/ContractStatusBadge';
import ContractTypeBadge   from '../../../contracts/components/ContractTypeBadge';
import { formatCOP } from '../../../../shared/utils/formatCurrency';

function safeDate(val) {
  if (!val) return null;
  if (val?.toDate) return val.toDate();
  if (val instanceof Date) return val;
  if (typeof val === 'string') { const d = parseISO(val); return isValid(d) ? d : null; }
  return null;
}
function fmtDate(val) {
  const d = safeDate(val);
  if (!d) return '—';
  return format(d, "d 'de' MMMM, yyyy", { locale: es });
}

// ─── Definición de pasos del contrato ─────────────────────────────────────────
const CONTRACT_STEPS = [
  {
    status:   'borrador',
    label:    'Borrador',
    desc:     'El contrato está siendo preparado.',
    icon:     FaEdit,
    color:    'text-slate-400',
    bg:       'bg-slate-500/10',
    border:   'border-slate-500/20',
    ring:     'ring-slate-500/30',
  },
  {
    status:   'firmado',
    label:    'Firmado',
    desc:     'Ambas partes firmaron el contrato.',
    icon:     FaCheckCircle,
    color:    'text-blue-400',
    bg:       'bg-blue-500/10',
    border:   'border-blue-500/20',
    ring:     'ring-blue-500/30',
  },
  {
    status:   'vigente',
    label:    'Vigente',
    desc:     'El contrato está activo y en vigor.',
    icon:     FaCheckCircle,
    color:    'text-emerald-400',
    bg:       'bg-emerald-500/10',
    border:   'border-emerald-500/20',
    ring:     'ring-emerald-500/30',
  },
  {
    status:   'vencido',
    label:    'Finalizado',
    desc:     'El período del contrato ha concluido.',
    icon:     FaClock,
    color:    'text-slate-500',
    bg:       'bg-slate-700/30',
    border:   'border-slate-700/40',
    ring:     'ring-slate-600/30',
  },
];

const CANCELLED_STEP = {
  status:   'cancelado',
  label:    'Cancelado',
  desc:     'El contrato fue cancelado.',
  icon:     FaTimesCircle,
  color:    'text-red-400',
  bg:       'bg-red-500/10',
  border:   'border-red-500/20',
  ring:     'ring-red-500/30',
};

function getStepIndex(status) {
  return CONTRACT_STEPS.findIndex((s) => s.status === status);
}

// ─── Componente: Timeline de estados ─────────────────────────────────────────
function ContractTimeline({ status }) {
  if (status === 'cancelado') {
    return (
      <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
        <CANCELLED_STEP.icon className="text-red-400 text-sm flex-shrink-0" />
        <div>
          <p className="text-red-400 text-xs font-bold">{CANCELLED_STEP.label}</p>
          <p className="text-slate-500 text-xs">{CANCELLED_STEP.desc}</p>
        </div>
      </div>
    );
  }

  const currentIndex = getStepIndex(status);

  return (
    <div className="relative">
      {/* Línea de progreso */}
      <div className="flex items-center gap-0">
        {CONTRACT_STEPS.map((step, i) => {
          const isDone    = i < currentIndex;
          const isCurrent = i === currentIndex;
          const Icon      = step.icon;

          return (
            <div key={step.status} className="flex items-center flex-1 last:flex-none">
              {/* Nodo */}
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <div
                  className={`
                    w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all
                    ${isCurrent
                      ? `${step.bg} ${step.border} ring-2 ${step.ring}`
                      : isDone
                        ? 'bg-emerald-500/20 border-emerald-500/40'
                        : 'bg-slate-800/60 border-slate-700/40'
                    }
                  `}
                >
                  {isDone ? (
                    <FaCheckCircle className="text-emerald-400 text-[10px]" />
                  ) : (
                    <Icon className={`${isCurrent ? step.color : 'text-slate-600'} text-[10px]`} />
                  )}
                </div>
                <p className={`text-[9px] font-semibold text-center leading-tight ${
                  isCurrent ? step.color : isDone ? 'text-emerald-500' : 'text-slate-600'
                }`}>
                  {step.label}
                </p>
              </div>

              {/* Conector */}
              {i < CONTRACT_STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 ${
                  i < currentIndex ? 'bg-emerald-500/40' : 'bg-slate-700/40'
                }`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Descripción del estado actual */}
      {currentIndex >= 0 && (
        <p className={`text-[11px] mt-2 text-center ${CONTRACT_STEPS[currentIndex]?.color ?? 'text-slate-400'}`}>
          {CONTRACT_STEPS[currentIndex]?.desc}
        </p>
      )}
    </div>
  );
}

// ─── Alerta de vencimiento próximo ────────────────────────────────────────────
function ExpiryAlert({ endDate }) {
  const d    = safeDate(endDate);
  if (!d) return null;
  const days = differenceInDays(d, new Date());
  if (days > 30 || days < 0) return null;

  return (
    <div className={`flex items-center gap-2 p-2.5 rounded-xl mt-3 ${
      days <= 7
        ? 'bg-red-500/10 border border-red-500/20'
        : 'bg-amber-500/10 border border-amber-500/20'
    }`}>
      <FaClock className={`text-xs flex-shrink-0 ${days <= 7 ? 'text-red-400' : 'text-amber-400'}`} />
      <p className={`text-xs font-semibold ${days <= 7 ? 'text-red-400' : 'text-amber-400'}`}>
        {days === 0
          ? 'Vence hoy'
          : days === 1
            ? 'Vence mañana'
            : `Vence en ${days} días — ${fmtDate(endDate)}`}
      </p>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function SectionContratos({ contracts }) {
  const total     = contracts.reduce((s, c) => s + (parseFloat(c.value) || 0), 0);
  const vigentes  = contracts.filter((c) => c.status === 'vigente').length;

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Mis contratos</h2>
        {total > 0 && (
          <div className="text-right">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">Valor total</p>
            <p className="text-amber-400 font-bold text-sm">
              {formatCOP ? formatCOP(total) : `$${total.toLocaleString()}`}
            </p>
          </div>
        )}
      </div>

      {/* KPIs rápidos */}
      {contracts.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Total',     value: contracts.length,   color: 'text-white'        },
            { label: 'Vigentes',  value: vigentes,           color: 'text-emerald-400'  },
            { label: 'Valor',     value: total > 0 ? `${(total/1_000_000).toFixed(1)}M` : '—', color: 'text-amber-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-slate-900/40 border border-slate-800/40 rounded-xl p-3 text-center">
              <p className={`text-lg font-bold ${color}`}>{value}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Estado vacío */}
      {contracts.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/40 flex items-center justify-center mx-auto mb-4">
            <FaFileContract className="text-slate-600 text-2xl" />
          </div>
          <h3 className="text-white font-semibold mb-1">Sin contratos aún</h3>
          <p className="text-slate-500 text-sm">
            Cuando firmes un contrato, aparecerá aquí con todos sus detalles.
          </p>
        </div>
      )}

      {/* Lista de contratos */}
      <div className="space-y-5">
        {contracts.map((c) => (
          <div
            key={c.id}
            className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-5 space-y-4"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-white font-semibold truncate">
                  {c.propertyName || 'Propiedad'}
                </p>
                {c.propertyAddress && (
                  <p className="text-slate-500 text-xs mt-0.5 flex items-center gap-1">
                    <FaMapMarkerAlt className="text-[9px]" /> {c.propertyAddress}
                  </p>
                )}
              </div>
              <ContractStatusBadge status={c.status} />
            </div>

            {/* Tipo + valor */}
            <div className="flex items-center gap-2 flex-wrap">
              <ContractTypeBadge type={c.type} />
              {c.value && (
                <span className="text-amber-400 font-bold text-sm">
                  {formatCOP ? formatCOP(c.value) : `$${Number(c.value).toLocaleString()}`}
                </span>
              )}
            </div>

            {/* Timeline de estado — MÓDULO E */}
            <ContractTimeline status={c.status} />

            {/* Alerta de vencimiento */}
            {c.status === 'vigente' && <ExpiryAlert endDate={c.endDate} />}

            {/* Fechas */}
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
              {c.startDate && (
                <div className="bg-slate-800/40 rounded-lg p-2.5">
                  <p className="text-[10px] text-slate-600 mb-0.5">Inicio</p>
                  <p className="text-slate-300 font-medium">{fmtDate(c.startDate)}</p>
                </div>
              )}
              {c.endDate && (
                <div className="bg-slate-800/40 rounded-lg p-2.5">
                  <p className="text-[10px] text-slate-600 mb-0.5">Fin</p>
                  <p className="text-slate-300 font-medium">{fmtDate(c.endDate)}</p>
                </div>
              )}
            </div>

            {/* Documento */}
            {c.documentUrl && (
              <a
                href={c.documentUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 border border-blue-500/20 px-3 py-2 rounded-lg hover:bg-blue-500/10 transition"
              >
                <FaDownload /> Descargar contrato en PDF
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}