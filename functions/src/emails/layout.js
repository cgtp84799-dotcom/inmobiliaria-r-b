// src/emails/layout.js
// ─── Layout base, componentes reutilizables y CSS para todos los emails ───────
//
// NOTA SOBRE FUENTES:
// @import url('https://fonts.googleapis.com/...') está BLOQUEADO por Gmail
// y la mayoría de clientes de email modernos. Se usa font-family con stack
// de sistema que garantiza consistencia real en todos los clientes de email.
//
// NOTA SOBRE RESPONSIVE (auditoría notificaciones):
// - Los emails ahora son completamente responsive vía media queries.
// - Breakpoints: 600px (tablet/mobile genérico) y 480px (mobile pequeño).
// - infoRow pasa de flex horizontal a stack vertical en mobile pequeño.
// - Botones suben a 44px de alto mínimo (touch target Apple/Google) y se
//   convierten en bloque ancho 100% en mobile.
// - Padding lateral baja a 16-20px en mobile pequeño.
// - Las clases existentes mantienen su semántica → 0 cambios en templates.

const { BASE_URL, LOGO_URL, FROM_NAME, WHATSAPP_URL } = require("./config");
const { escapeHtml } = require("./utils");

// ── CSS inline compatible con todos los clientes de email ─────────────────────
const CSS_BASE = `
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; background-color: #f0f4f8; font-family: -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table { border-collapse: collapse; }
  img { max-width: 100%; height: auto; border: 0; outline: none; text-decoration: none; }
  .wrapper { background: #f0f4f8; padding: 40px 16px; }
  .container { max-width: 600px; margin: 0 auto; width: 100%; }
  .card { background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
  .header { padding: 32px 40px 28px; text-align: center; }
  .logo { height: 52px; object-fit: contain; max-width: 80%; }
  .body { padding: 36px 40px; }
  .footer { background: #f8f9fb; border-top: 1px solid #e8ecf0; padding: 20px 40px; text-align: center; }
  .footer p { color: #9ca3af; font-size: 12px; line-height: 1.6; margin: 0; }
  .footer a { color: #b8952a; text-decoration: none; }
  .emoji-icon { font-size: 40px; display: block; margin: 0 auto 16px; text-align: center; line-height: 1; }
  .title { font-size: 24px; font-weight: 700; margin: 0 0 8px; line-height: 1.3; }
  .subtitle { font-size: 15px; color: #6b7280; margin: 0 0 28px; line-height: 1.6; }
  .info-card { background: #f8f9fb; border: 1px solid #e8ecf0; border-radius: 14px; padding: 20px 24px; margin: 0 0 24px; }
  .info-row { display: flex; align-items: flex-start; padding: 8px 0; border-bottom: 1px solid #f0f2f5; }
  .info-row:last-child { border-bottom: none; padding-bottom: 0; }
  .info-label { font-size: 12px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; width: 120px; flex-shrink: 0; padding-top: 2px; }
  .info-value { font-size: 14px; color: #1f2937; font-weight: 500; flex: 1; word-break: break-word; }
  .note-box { border-radius: 12px; padding: 14px 18px; margin: 0 0 24px; }
  .btn-primary { display: inline-block; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 32px; border-radius: 50px; min-height: 24px; line-height: 1.3; }
  .btn-secondary { display: inline-block; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 24px; border-radius: 50px; border: 2px solid; margin-left: 10px; min-height: 22px; line-height: 1.3; }
  .btn-center { text-align: center; margin-top: 28px; }
  .divider { height: 1px; background: #f0f2f5; margin: 24px 0; }
  .tip { font-size: 13px; color: #9ca3af; line-height: 1.6; margin: 0; }

  /* ── Mobile genérico ────────────────────────────────────────────── */
  @media only screen and (max-width: 600px) {
    .wrapper { padding: 20px 8px !important; }
    .container { width: 100% !important; }
    .card { border-radius: 14px !important; }
    .header { padding: 24px 20px 20px !important; }
    .logo { height: 44px !important; }
    .body { padding: 26px 20px !important; }
    .footer { padding: 18px 20px !important; }
    .title { font-size: 22px !important; line-height: 1.25 !important; }
    .subtitle { font-size: 14px !important; margin: 0 0 22px !important; }
    .info-card { padding: 16px 18px !important; border-radius: 12px !important; margin: 0 0 18px !important; }
    .emoji-icon { font-size: 36px !important; }
    .btn-primary, .btn-secondary { display: block !important; width: 100% !important; max-width: 320px !important; margin: 8px auto !important; padding: 14px 20px !important; font-size: 15px !important; box-sizing: border-box !important; }
    .btn-secondary { margin-left: auto !important; }
    .note-box { padding: 14px 16px !important; }
  }

  /* ── Mobile pequeño: apilar info-row vertical ───────────────────── */
  @media only screen and (max-width: 480px) {
    .wrapper { padding: 12px 0 !important; }
    .card { border-radius: 0 !important; box-shadow: none !important; }
    .body { padding: 22px 16px !important; }
    .header { padding: 22px 16px 18px !important; }
    .footer { padding: 16px 16px !important; }
    .title { font-size: 20px !important; }
    .info-row { display: block !important; padding: 10px 0 !important; }
    .info-label { display: block !important; width: auto !important; margin: 0 0 4px !important; padding-top: 0 !important; font-size: 11px !important; }
    .info-value { display: block !important; font-size: 14px !important; }
    .btn-primary, .btn-secondary { font-size: 14px !important; padding: 13px 18px !important; }
  }
`;

// ── Componentes atómicos ──────────────────────────────────────────────────────

/**
 * Fila de datos: etiqueta + valor. Si no hay valor, devuelve string vacío.
 * Bug original corregido: las comillas en el atributo style estaban desbalanceadas.
 *
 * @param {string} label
 * @param {string} value
 * @param {string} [accentColor] - Color hex para resaltar el valor
 */
function infoRow(label, value, accentColor) {
  if (!value) return "";
  const valueStyle = accentColor
    ? `class="info-value" style="font-weight:700;color:${accentColor};flex:1;font-size:14px;word-break:break-word;"`
    : `class="info-value"`;
  return `
    <div class="info-row">
      <span class="info-label">${escapeHtml(label)}</span>
      <span ${valueStyle}>${escapeHtml(String(value))}</span>
    </div>`;
}

/**
 * Tarjeta de sección con título y filas.
 * Si no hay filas con contenido, no renderiza nada.
 */
function sectionCard(title, rows, options = {}) {
  const content = (rows || []).filter(Boolean).join("");
  if (!content) return "";
  return `
    <div class="info-card" style="background:${options.bg || "#f8f9fb"};border:1px solid ${options.border || "#e8ecf0"};">
      <p style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;">${escapeHtml(title)}</p>
      ${content}
    </div>`;
}

/**
 * Botones CTA primario y/o secundario.
 * Pasar string vacío en label/href para omitir ese botón.
 */
function ctaButtons(primaryLabel, primaryHref, secondaryLabel, secondaryHref, colors = {}) {
  const primary = primaryLabel && primaryHref
    ? `<a href="${primaryHref}" class="btn-primary" style="background:${colors.primaryBg || "linear-gradient(135deg,#1e40af,#2563eb)"};color:#ffffff;">${escapeHtml(primaryLabel)}</a>`
    : "";
  const secondary = secondaryLabel && secondaryHref
    ? `<a href="${secondaryHref}" class="btn-secondary" style="color:${colors.secondaryColor || "#1e40af"};border-color:${colors.secondaryColor || "#1e40af"};">${escapeHtml(secondaryLabel)}</a>`
    : "";
  return `<div class="btn-center">${primary}${secondary}</div>`;
}

/**
 * Caja de nota / alerta con borde izquierdo de color.
 */
function noteBox({ bg, borderColor, title, body }) {
  return `
    <div class="note-box" style="background:${bg};border-left:4px solid ${borderColor};">
      ${title ? `<p style="margin:0;font-size:13px;color:${borderColor};font-weight:600;">${escapeHtml(title)}</p>` : ""}
      <p style="margin:${title ? "6px" : "0"} 0 0;font-size:14px;color:#374151;line-height:1.7;">${body}</p>
    </div>`;
}

// ── Layout completo del email ─────────────────────────────────────────────────

/**
 * Envuelve el contenido en el layout HTML completo del email.
 * @param {string} headerBg  - Gradiente CSS para el header
 * @param {string} content   - HTML del cuerpo del email
 */
function htmlWrapper(headerBg, content) {
  return `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <meta name="format-detection" content="telephone=no"/>
  <title>${FROM_NAME}</title>
  <style>${CSS_BASE}</style>
</head>
<body>
<div class="wrapper">
  <div class="container">
    <div class="card">
      <div class="header" style="background:${headerBg};">
        <img src="${LOGO_URL}" alt="${FROM_NAME}" class="logo" width="auto" height="52"/>
      </div>
      <div class="body">
        ${content}
      </div>
      <div class="footer">
        <p>
          <strong style="color:#374151;">${FROM_NAME}</strong><br/>
          Cra 5 No. 9-28, Anserma, Caldas, Colombia<br/>
          <a href="tel:+573105968202">+57 310 596 8202</a> &nbsp;·&nbsp;
          <a href="${BASE_URL}">${BASE_URL}</a>
        </p>
        <p style="margin-top:12px; font-size:11px;">
          Este correo fue generado automáticamente. Por favor no respondas a este mensaje.
        </p>
      </div>
    </div>
  </div>
</div>
</body>
</html>`;
}

module.exports = { htmlWrapper, infoRow, sectionCard, ctaButtons, noteBox };