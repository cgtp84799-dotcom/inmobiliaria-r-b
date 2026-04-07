/**
 * formatDate — utilidades de fecha para toda la app.
 *
 * Usa Intl.DateTimeFormat en locale es-CO para que el formato
 * sea consistente con el mercado colombiano sin dependencias externas.
 */

const locale = 'es-CO';

/**
 * Acepta: Firestore Timestamp, Date, string ISO, número (epoch ms).
 * Devuelve un Date de JS o null si el valor no es convertible.
 */
function toDate(value) {
  if (!value) return null;
  // Firestore Timestamp tiene .toDate()
  if (typeof value?.toDate === 'function') return value.toDate();
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Formato corto: "6 abr. 2026"
 */
export function formatShort(value) {
  const d = toDate(value);
  if (!d) return '—';
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(d);
}

/**
 * Formato largo: "lunes, 6 de abril de 2026"
 */
export function formatLong(value) {
  const d = toDate(value);
  if (!d) return '—';
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(d);
}

/**
 * Formato con hora: "6 abr. 2026, 10:30 a. m."
 */
export function formatDateTime(value) {
  const d = toDate(value);
  if (!d) return '—';
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(d);
}

/**
 * Tiempo relativo: "hace 3 días", "en 2 horas"
 * Usa Intl.RelativeTimeFormat si está disponible, fallback a formatShort.
 */
export function formatRelative(value) {
  const d = toDate(value);
  if (!d) return '—';

  const diffMs   = d.getTime() - Date.now();
  const diffSecs = Math.round(diffMs / 1000);
  const diffMins = Math.round(diffMs / 60_000);
  const diffHrs  = Math.round(diffMs / 3_600_000);
  const diffDays = Math.round(diffMs / 86_400_000);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (Math.abs(diffSecs) < 60)  return rtf.format(diffSecs, 'second');
  if (Math.abs(diffMins) < 60)  return rtf.format(diffMins, 'minute');
  if (Math.abs(diffHrs)  < 24)  return rtf.format(diffHrs,  'hour');
  if (Math.abs(diffDays) < 30)  return rtf.format(diffDays, 'day');

  return formatShort(d);
}
