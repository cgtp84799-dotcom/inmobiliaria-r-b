import { formatDistanceToNow, format, isValid, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Convierte un valor de fecha (Timestamp de Firestore, Date, string ISO, o número)
 * en un objeto Date de JS.
 */
function toDate(value) {
  if (!value) return null;
  // Firestore Timestamp ({ seconds, nanoseconds } con método .toDate())
  if (typeof value?.toDate === 'function') return value.toDate();
  const d = new Date(value);
  return isValid(d) ? d : null;
}

/**
 * Tiempo relativo en español:
 *   formatRelative(ts)  → "hace 3 minutos" / "hace 2 días" / etc.
 *   Retorna '—' si el valor no es parseable.
 */
export function formatRelative(value) {
  const d = toDate(value);
  if (!d) return '—';
  return formatDistanceToNow(d, { addSuffix: true, locale: es });
}

/**
 * Fecha corta: "15 abr. 2025"
 */
export function formatShort(value) {
  const d = toDate(value);
  if (!d) return '—';
  return format(d, "d MMM. yyyy", { locale: es });
}

/**
 * Fecha larga: "martes, 15 de abril de 2025"
 */
export function formatLong(value) {
  const d = toDate(value);
  if (!d) return '—';
  return format(d, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
}

/**
 * Fecha + hora: "15 abr. 2025, 14:30"
 */
export function formatDateTime(value) {
  const d = toDate(value);
  if (!d) return '—';
  return format(d, "d MMM. yyyy, HH:mm", { locale: es });
}

/**
 * Solo la hora: "14:30"
 */
export function formatTime(value) {
  const d = toDate(value);
  if (!d) return '—';
  return format(d, 'HH:mm');
}

/**
 * Días restantes hasta una fecha:
 *   formatDaysLeft(ts)  → "vence en 5 días" | "venció hace 2 días" | "vence hoy"
 */
export function formatDaysLeft(value) {
  const d = toDate(value);
  if (!d) return '—';
  const diff = differenceInDays(d, new Date());
  if (diff === 0)  return 'vence hoy';
  if (diff > 0)    return `vence en ${diff} día${diff === 1 ? '' : 's'}`;
  return `venció hace ${Math.abs(diff)} día${Math.abs(diff) === 1 ? '' : 's'}`;
}
