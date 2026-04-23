// src/emails/payments.js
// ─── Templates de email para el módulo de Pagos y Alertas de contrato ────────

const { BASE_URL, WHATSAPP_URL, GRADIENTS } = require("./config");
const {
  escapeHtml, safe,
  fmtCOP, fmtDate, fmtDateTime,
  paymentStatusLabel, paymentLabel,
  contractTypeLabel,
} = require("./utils");
const { htmlWrapper, infoRow, sectionCard, ctaButtons, noteBox } = require("./layout");

// ─── Pago confirmado ──────────────────────────────────────────────────────────

/**
 * Email al CLIENTE cuando se registra un pago en su contrato.
 * @param {object} contract - Datos del contrato
 * @param {object} payment  - Datos del pago registrado
 */
function paymentConfirmedEmail(contract, payment) {
  const receiptUrl = String(payment.receiptUrl || "").trim();
  return {
    subject: `Pago registrado · ${paymentLabel(payment)} · ${safe(contract.propertyName, "Propiedad")}`,
    html: htmlWrapper(
      GRADIENTS.gold,
      `
      <div style="text-align:center;font-size:56px;margin-bottom:18px;">✅</div>
      <h1 class="title" style="color:#166534;text-align:center;">Pago registrado correctamente</h1>
      <p class="subtitle" style="text-align:center;">
        Hola <strong style="color:#1f2937;">${escapeHtml(safe(contract.clientName, "Cliente"))}</strong>,
        confirmamos que tu pago ya fue registrado en nuestro sistema.
        Este correo deja trazabilidad del movimiento aplicado a tu contrato.
      </p>
      ${sectionCard("Detalle del pago", [
        infoRow("Concepto",          paymentLabel(payment),                                                  "#1f2937"),
        infoRow("Estado",            paymentStatusLabel(payment.status || "pagado"),                         "#166534"),
        infoRow("Valor registrado",  fmtCOP(payment.paidAmount || payment.amount),                          "#166534"),
        payment.dueDate ? infoRow("Fecha límite",    fmtDate(payment.dueDate),                              "#92400e") : "",
        infoRow("Fecha de registro", fmtDateTime(payment.paidAt || payment.updatedAt || new Date()),         "#1e40af"),
      ], { bg: "#f0fdf4", border: "#bbf7d0" })}
      ${sectionCard("Contrato asociado", [
        infoRow("Propiedad",          safe(contract.propertyName, "Propiedad"),    "#b8952a"),
        contract.propertyAddress ? infoRow("Dirección", contract.propertyAddress) : "",
        infoRow("Tipo de contrato",   contractTypeLabel(contract.type),            "#1e40af"),
        contract.agentName  ? infoRow("Agente responsable", contract.agentName)  : "",
        contract.agentEmail ? infoRow("Correo del agente",  contract.agentEmail)  : "",
      ], { bg: "#f8fbff", border: "#dbeafe" })}
      ${sectionCard("Trazabilidad", [
        payment.reference   ? infoRow("Referencia",     payment.reference,                                          "#1f2937") : "",
        (payment.paidBy || payment.actorEmail || payment.updatedBy)
          ? infoRow("Registrado por", payment.paidBy || payment.actorEmail || payment.updatedBy, "#1f2937") : "",
        payment.notes       ? infoRow("Observaciones",  payment.notes) : "",
      ])}
      ${noteBox({
        bg: "#ecfeff", borderColor: "#06b6d4",
        title: "Importante",
        body: "Si notas alguna inconsistencia en este registro o deseas validar el comprobante aplicado, comunícate con nosotros para revisarlo de inmediato.",
      })}
      ${ctaButtons(
        "Ver en mi portal", `${BASE_URL}/portal`,
        "Contactar soporte",  WHATSAPP_URL,
        { primaryBg: "linear-gradient(135deg,#166534,#15803d)", secondaryColor: "#166534" }
      )}
      ${receiptUrl
        ? `<p class="tip" style="text-align:center;margin-top:16px;">También puedes revisar el comprobante aquí: <a href="${receiptUrl}" style="color:#166534;font-weight:600;">abrir comprobante</a>.</p>`
        : ""}`
    ),
  };
}

// ─── Recordatorio de pago próximo ─────────────────────────────────────────────

/**
 * Email al CLIENTE X días antes del vencimiento de un canon.
 */
function paymentReminderEmail({ clientName, propertyName, amount, dueDate, daysAhead }) {
  return {
    subject: `💰 Recordatorio de pago — ${propertyName} (${daysAhead}d)`,
    html: htmlWrapper(
      GRADIENTS.navy,
      `
      <span class="emoji-icon">💰</span>
      <h1 class="title" style="color:#1e40af;text-align:center;">Recordatorio de pago</h1>
      <p class="subtitle" style="text-align:center;">
        Hola <strong style="color:#1f2937;">${escapeHtml(clientName)}</strong>,<br/>
        tu próximo pago de arriendo vence en
        <strong style="color:#1e40af;">${daysAhead} día${daysAhead === 1 ? "" : "s"}</strong>.
      </p>
      <div class="info-card">
        ${infoRow("🏠 Propiedad",    propertyName,       "#b8952a")}
        ${infoRow("📅 Fecha límite", fmtDate(dueDate),   "#1e40af")}
        ${infoRow("💰 Valor",        fmtCOP(amount),     "#166534")}
      </div>
      ${ctaButtons(
        "Ver en mi portal →", `${BASE_URL}/portal`,
        "", "",
        { primaryBg: "linear-gradient(135deg,#1e40af,#2563eb)" }
      )}`
    ),
  };
}

// ─── Pago vence hoy ───────────────────────────────────────────────────────────

function paymentDueTodayEmail({ clientName, propertyName, amount }) {
  return {
    subject: `📅 Tu pago vence HOY — ${propertyName}`,
    html: htmlWrapper(
      GRADIENTS.orange,
      `
      <span class="emoji-icon">📅</span>
      <h1 class="title" style="color:#c2410c;text-align:center;">Tu pago vence hoy</h1>
      <p class="subtitle" style="text-align:center;">
        Hola <strong style="color:#1f2937;">${escapeHtml(clientName)}</strong>,<br/>
        recuerda que el pago de tu arriendo de <strong>${escapeHtml(propertyName)}</strong> vence hoy.
      </p>
      <div class="info-card">
        ${infoRow("💰 Valor", fmtCOP(amount), "#c2410c")}
      </div>
      ${ctaButtons(
        "Ver en mi portal →", `${BASE_URL}/portal`,
        "", "",
        { primaryBg: "linear-gradient(135deg,#c2410c,#ea580c)" }
      )}`
    ),
  };
}

// ─── Pago en mora ─────────────────────────────────────────────────────────────

function latePaymentEmail({ clientName, propertyName, amount, dueDate, daysLate }) {
  return {
    subject: `⚠️ Pago vencido — ${propertyName} (${daysLate}d en mora)`,
    html: htmlWrapper(
      GRADIENTS.crimson,
      `
      <span class="emoji-icon">⚠️</span>
      <h1 class="title" style="color:#991b1b;text-align:center;">Pago en mora</h1>
      <p class="subtitle" style="text-align:center;">
        Hola <strong style="color:#1f2937;">${escapeHtml(clientName)}</strong>,<br/>
        tu pago de arriendo de <strong>${escapeHtml(propertyName)}</strong> está en mora desde hace
        <strong style="color:#991b1b;">${daysLate} día${daysLate === 1 ? "" : "s"}</strong>.
      </p>
      <div class="info-card">
        ${infoRow("📅 Fecha vencimiento", fmtDate(dueDate), "#991b1b")}
        ${infoRow("💰 Valor",             fmtCOP(amount),   "#991b1b")}
      </div>
      ${noteBox({
        bg: "#fef2f2", borderColor: "#dc2626",
        title: "Acción recomendada",
        body: "Por favor regulariza el pago lo antes posible o contacta a tu agente para coordinar.",
      })}
      ${ctaButtons(
        "Contactar inmediatamente", WHATSAPP_URL,
        "", "",
        { primaryBg: "linear-gradient(135deg,#dc2626,#ef4444)" }
      )}`
    ),
  };
}

// ─── Contrato por vencer ──────────────────────────────────────────────────────

function contractExpiryEmail({ clientName, propertyName, endDate, daysAhead, isRent }) {
  return {
    subject: `📆 Tu contrato vence en ${daysAhead} días — ${propertyName}`,
    html: htmlWrapper(
      GRADIENTS.amber,
      `
      <span class="emoji-icon">📆</span>
      <h1 class="title" style="color:#92400e;text-align:center;">Tu contrato está por vencer</h1>
      <p class="subtitle" style="text-align:center;">
        Hola <strong style="color:#1f2937;">${escapeHtml(clientName)}</strong>,<br/>
        tu contrato de <strong>${escapeHtml(propertyName)}</strong> vence en
        <strong style="color:#92400e;">${daysAhead} día${daysAhead === 1 ? "" : "s"}</strong>.
      </p>
      <div class="info-card">
        ${infoRow("📅 Fecha vencimiento", fmtDate(endDate), "#92400e")}
      </div>
      ${noteBox({
        bg: "#fffbeb", borderColor: "#f59e0b",
        title: "¿Qué sigue?",
        body: isRent
          ? "Contacta a tu agente para definir si deseas renovar el arriendo o coordinar la entrega del inmueble."
          : "Contacta a tu agente para revisar los próximos pasos.",
      })}
      ${ctaButtons(
        "Ver en mi portal →", `${BASE_URL}/portal`,
        "", "",
        { primaryBg: "linear-gradient(135deg,#b45309,#d97706)" }
      )}`
    ),
  };
}

// ─── Ventana de renovación ────────────────────────────────────────────────────

function renewalWindowEmail({ clientName, propertyName, endDate, daysAhead }) {
  return {
    subject: `🔁 Ventana de renovación abierta — ${propertyName}`,
    html: htmlWrapper(
      GRADIENTS.emerald,
      `
      <span class="emoji-icon">🔁</span>
      <h1 class="title" style="color:#166534;text-align:center;">Es momento de pensar en la renovación</h1>
      <p class="subtitle" style="text-align:center;">
        Hola <strong style="color:#1f2937;">${escapeHtml(clientName)}</strong>,<br/>
        tu arriendo de <strong>${escapeHtml(propertyName)}</strong> vence en
        <strong style="color:#166534;">${daysAhead} días</strong>.
      </p>
      <div class="info-card">
        ${infoRow("📅 Fin del contrato", fmtDate(endDate), "#166534")}
      </div>
      <p style="text-align:center;color:#374151;font-size:14px;margin:16px 0 0;">
        Si deseas renovar, este es un buen momento para conversarlo con tu agente.
      </p>
      ${ctaButtons(
        "Hablar con mi agente", WHATSAPP_URL,
        "", "",
        { primaryBg: "linear-gradient(135deg,#15803d,#16a34a)" }
      )}`
    ),
  };
}

module.exports = {
  paymentConfirmedEmail,
  paymentReminderEmail,
  paymentDueTodayEmail,
  latePaymentEmail,
  contractExpiryEmail,
  renewalWindowEmail,
};
