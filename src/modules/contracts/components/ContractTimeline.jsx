// src/modules/contracts/components/ContractTimeline.jsx
//
// Timeline genérico que respeta operationMode.
// Reemplaza el SALE_STEPS hardcoded del portal — ahora la secuencia se
// calcula con getStageSequenceByContract, así un contrato de venta directa
// no muestra etapas de financiación que no aplican.

import { FaCheckCircle, FaTimesCircle, FaClock } from 'react-icons/fa';
import {
  CONTRACT_STATUS,
  getStageSequenceByContract,
  getStageLabel,
  resolveContractBusinessStage,
  CONTRACT_BUSINESS_STAGE,
} from '../types/contract.types';

export default function ContractTimeline({ contract, compact = false, onStageClick = null }) {
  const statusGeneral = contract.statusGeneral || contract.status;
  const isCancelled = statusGeneral === CONTRACT_STATUS.CANCELLED;

  if (isCancelled) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
        <FaTimesCircle className="text-red-400 text-sm flex-shrink-0" />
        <p className="text-red-400 text-xs font-bold">Proceso cancelado</p>
      </div>
    );
  }

  const sequence = getStageSequenceByContract({
    type: contract.type,
    operationMode: contract.operationMode,
  });

  if (!sequence.length) {
    return (
      <div className="text-[var(--color-text-muted)] text-xs italic p-3">
        Sin secuencia de etapas definida para este contrato.
      </div>
    );
  }

  const currentStage = resolveContractBusinessStage(contract);
  const currentIdx = Math.max(0, sequence.indexOf(currentStage));

  if (compact) {
    // Vista horizontal compacta para tarjetas pequeñas
    return (
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {sequence.map((stage, i) => {
          const isDone = i < currentIdx;
          const isCurrent = i === currentIdx;
          return (
            <div key={stage} className="flex items-center flex-shrink-0">
              <div
                className={`w-2 h-2 rounded-full ${
                  isDone ? 'bg-emerald-500' :
                  isCurrent ? 'bg-primary ring-2 ring-primary/30' :
                  'bg-[var(--color-input-bg)]'
                }`}
                title={getStageLabel(stage)}
              />
              {i < sequence.length - 1 && (
                <div className={`w-3 h-px ${i < currentIdx ? 'bg-emerald-500' : 'bg-[var(--color-input-bg)]'}`} />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="relative pl-4">
      <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-[var(--color-surface)]" />
      <div className="space-y-3">
        {sequence.map((stage, i) => {
          const isDone = i < currentIdx;
          const isCurrent = i === currentIdx;
          const isClickable = !!onStageClick && !isDone;
          return (
            <div
              key={stage}
              className={`flex items-start gap-3 ${isClickable ? 'cursor-pointer hover:opacity-80' : ''}`}
              onClick={() => isClickable && onStageClick(stage)}
            >
              <div className={`relative z-10 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                isCurrent
                  ? 'bg-primary/20 border-primary ring-2 ring-offset-1 ring-offset-slate-950 ring-primary'
                  : isDone
                  ? 'bg-emerald-500/20 border-emerald-500/50'
                  : 'bg-[var(--color-surface)] border-[var(--color-border)]'
              }`}>
                {isDone ? (
                  <FaCheckCircle className="text-emerald-400 text-[8px]" />
                ) : isCurrent ? (
                  <FaClock className="text-primary text-[8px]" />
                ) : null}
              </div>
              <div className={`flex-1 pb-1 ${isCurrent ? '' : 'opacity-70'}`}>
                <p className={`text-xs font-semibold ${
                  isCurrent ? 'text-primary' :
                  isDone ? 'text-emerald-400' :
                  'text-[var(--color-text-muted)]'
                }`}>
                  {getStageLabel(stage)}
                  {isCurrent && (
                    <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
                      Actual
                    </span>
                  )}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}