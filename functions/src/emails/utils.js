// src/emails/utils.js
// ─── Helpers de formato y fecha compartidos por todos los builders ────────────

// ── Parseo de fecha (acepta Firestore Timestamp, Date nativo o string) ────────
function parseDate(v) {
  if (!v) return null;
  if (v?.toDate) return v.toDate();
  if (v instanceof Date) return v;
  const d = new Date(v);
  return isNaN(d) ? null : d;
}

// ── Formateo de valores ───────────────────────────────────────────────────────

/**
 * Formatea un valor como moneda COP.
 * @param {*} value  - Número o string numérico
 * @param {string} [fallback="No definido"] - Texto si el valor es 0 / inválido
 */
function fmtCOP(value, fallback = "No definido") {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(n);
}

/**
 * Formatea una fecha como "15 de abril de 2025" (es-CO).
 * @param {*} value  - Timestamp / Date / string
 * @param {string} [fallback="No definida"]
 */
function fmtDate(value, fallback = "No definida") {
  const d = parseDate(value);
  if (!d) return fallback;
  return d.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * Formatea una fecha+hora como "15 de abril de 2025, 10:30 a. m." (es-CO).
 * @param {*} value
 * @param {string} [fallback="No definida"]
 */
function fmtDateTime(value, fallback = "No definida") {
  const d = parseDate(value);
  if (!d) return fallback;
  return d.toLocaleString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Formatea una fecha como "YYYY-MM-DD" para usar como clave de deduplication.
 */
function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Diferencia en días entre dos fechas (a - b, redondeado).
 */
function diffDays(a, b) {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

// ── Labels semánticos ─────────────────────────────────────────────────────────

const CONTRACT_TYPE_LABELS = {
  venta:   "Venta",
  arriendo:"Arriendo",
  promesa: "Promesa de compraventa",
};

const STATUS_LABELS = {
  borrador:   "Borrador",
  vigente:    "Vigente",
  activo:     "Activo",
  active:     "Activo",
  completado: "Completado",
  finalizado: "Finalizado",
  cancelado:  "Cancelado",
  vencido:    "Vencido",
  pausado:    "Pausado",
  paused:     "Pausado",
};

const STAGE_LABELS = {
  negociacion:         "Negociación",
  reserva:             "Reserva",
  promesa_firmada:     "Promesa firmada",
  cuota_inicial:       "Cuota inicial",
  financiacion:        "Financiación",
  credito_aprobado:    "Crédito aprobado",
  leasing_aprobado:    "Leasing aprobado",
  minuta_preparacion:  "Preparación de minuta",
  escritura_firmada:   "Escritura firmada",
  registrado:          "Registrado",
  entregado:           "Entregado",
  borrador_arriendo:   "Borrador",
  arriendo_firmado:    "Arriendo firmado",
  arriendo_activo:     "Arriendo activo",
  canon_por_vencer:    "Canon por vencer",
  canon_en_mora:       "Canon en mora",
  ventana_renovacion:  "Renovación próxima",
  arriendo_finalizado: "Arriendo finalizado",
  // aliases snake → camel (legacy)
  promesafirmada:      "Promesa firmada",
  minutapreparacion:   "Minuta en preparación",
  creditoaprobado:     "Crédito aprobado",
  leasingaprobado:     "Leasing aprobado",
  salereserve:         "Reserva",
  salepromisesigned:   "Promesa firmada",
  saleinitialpayment:  "Pago inicial",
  salefinancing:       "Financiación",
  saledeeddraft:       "Minuta de escritura",
  saledeedsigned:      "Escritura firmada",
  saleregistered:      "Registro completado",
  saledelivered:       "Entrega",
  rentsigned:          "Arriendo firmado",
  rentactive:          "Arriendo activo",
  rentrenewalwindow:   "Ventana de renovación",
  rentfinished:        "Arriendo finalizado",
  signed:              "Firmado",
  active:              "Activo",
  completed:           "Completado",
};

const PAYMENT_STATUS_LABELS = {
  pendiente: "Pendiente",
  paid:      "Pagado",
  pagado:    "Pagado",
  vencido:   "Vencido",
  mora:      "En mora",
};

const STATUS_COLORS = {
  vigente:   "#166534",
  finalizado:"#1e40af",
  cancelado: "#991b1b",
  pausado:   "#92400e",
  vencido:   "#d97706",
  borrador:  "#6b7280",
};

function contractTypeLabel(type) {
  return CONTRACT_TYPE_LABELS[String(type || "").toLowerCase()] || safe(type, "Contrato");
}
function statusLabel(status) {
  return STATUS_LABELS[String(status || "").toLowerCase()] || safe(status, "Actualizado");
}
function stageLabel(stage) {
  return STAGE_LABELS[String(stage || "").toLowerCase()] || safe(stage, "Actualizada");
}
function paymentStatusLabel(status) {
  return PAYMENT_STATUS_LABELS[String(status || "").toLowerCase()] || safe(status, "Actualizado");
}
function paymentLabel(payment) {
  return safe(payment?.label || (payment?.order ? `Cuota ${payment.order}` : "Cuota"), "Cuota");
}
function statusColor(status) {
  return STATUS_COLORS[String(status || "").toLowerCase()] || "#1f2937";
}

// ── Sanitización ──────────────────────────────────────────────────────────────

/** Escapa caracteres HTML para evitar XSS / HTML malformado en emails. */
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Devuelve el valor como string trimado, o `fallback` si está vacío.
 * NO escapa HTML — usar escapeHtml() explícitamente cuando el valor va
 * directo a un atributo o texto HTML.
 */
function safe(value, fallback = "No disponible") {
  const s = String(value ?? "").trim();
  return s || fallback;
}

module.exports = {
  parseDate,
  fmtCOP,
  fmtDate,
  fmtDateTime,
  ymd,
  diffDays,
  contractTypeLabel,
  statusLabel,
  stageLabel,
  paymentStatusLabel,
  paymentLabel,
  statusColor,
  escapeHtml,
  safe,
  // Mapas crudos (por si algún módulo necesita hacer lookup directo)
  STATUS_LABELS,
  STAGE_LABELS,
  STATUS_COLORS,
};
