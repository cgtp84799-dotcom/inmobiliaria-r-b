import { CONTRACT_STATUS_LABELS, CONTRACT_STATUS_COLORS } from '../types/contract.types';

/**
 * Badge de estado de contrato — reutilizable en tabla y detalle.
 */
export default function ContractStatusBadge({ status }) {
  const colors = CONTRACT_STATUS_COLORS[status] ?? CONTRACT_STATUS_COLORS['borrador'];
  const label  = CONTRACT_STATUS_LABELS[status]  ?? status;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold
      px-2.5 py-1 rounded-full border ${colors.text} ${colors.bg} ${colors.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${colors.text.replace('text-', 'bg-')}`} />
      {label}
    </span>
  );
}