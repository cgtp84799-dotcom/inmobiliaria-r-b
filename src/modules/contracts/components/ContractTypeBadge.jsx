import { CONTRACT_TYPE_LABELS, CONTRACT_TYPE_COLORS } from '../types/contract.types';

/**
 * Badge de tipo de contrato — reutilizable.
 */
export default function ContractTypeBadge({ type }) {
  const colors = CONTRACT_TYPE_COLORS[type] ?? CONTRACT_TYPE_COLORS['arriendo'];
  const label  = CONTRACT_TYPE_LABELS[type]  ?? type;
  return (
    <span className={`inline-flex items-center text-xs font-semibold
      px-2 py-0.5 rounded-lg border ${colors.text} ${colors.bg} ${colors.border}`}>
      {label}
    </span>
  );
}