/**
 * Formatea un número como moneda colombiana (COP).
 *
 * formatCOP(1500000)      → "$ 1.500.000"
 * formatCOP(1500000, true) → "$ 1.5M"
 * formatCOP(null)         → "—"
 */
export function formatCOP(value, compact = false) {
  const num = Number(value);
  if (!value && value !== 0) return '—';
  if (isNaN(num)) return '—';

  if (compact) {
    if (num >= 1_000_000_000) return `$ ${(num / 1_000_000_000).toFixed(1).replace('.', ',')}B`;
    if (num >= 1_000_000)     return `$ ${(num / 1_000_000).toFixed(1).replace('.', ',')}M`;
    if (num >= 1_000)         return `$ ${(num / 1_000).toFixed(0)}K`;
  }

  return new Intl.NumberFormat('es-CO', {
    style:    'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(num)
    // Intl en es-CO devuelve "COP 1.500.000" — lo convertimos a "$ 1.500.000"
    .replace('COP', '$')
    .replace('\u00a0', ' ')
    .trim();
}

/**
 * Formatea un rango de precio.
 * formatCOPRange(500000, 800000) → "$ 500.000 – $ 800.000"
 */
export function formatCOPRange(min, max) {
  if (!min && !max) return '—';
  if (!max) return `Desde ${formatCOP(min)}`;
  if (!min) return `Hasta ${formatCOP(max)}`;
  return `${formatCOP(min)} – ${formatCOP(max)}`;
}
