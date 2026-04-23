// src/emails/contracts.js
// ─── Templates de email para el módulo de Contratos ──────────────────────────

const { BASE_URL, WHATSAPP_URL, GRADIENTS } = require("./config");
const {
  escapeHtml, safe,
  fmtCOP, fmtDate, fmtDateTime,
  contractTypeLabel, statusLabel, stageLabel, statusColor,
  STATUS_COLORS,
} = require("./utils");
const { htmlWrapper, infoRow, sectionCard, ctaButtons, noteBox } = require("./layout");

// ─── Paleta de estado para el email de actualización ──────────────────────────
const STATE_THEME = {
  vigente:    { gradient: GRADIENTS.vigente,    titleColor: "#166534",  emoji: "✅" },
  finalizado: { gradient: GRADIENTS.finalizado, titleColor: "#1e40af",  emoji: "🏁" },
  cancelado:  { gradient: GRADIENTS.cancelado,  titleColor: "#991b1b",  emoji: "❌" },
  pausado:    { gradient: GRADIENTS.pausado,    titleColor: "#92400e",  emoji: "⏸️" },
  vencido:    { gradient: GRADIENTS.vencido,    titleColor: "#d97706",  emoji: "⚠️" },
  borrador:   { gradient: GRADIENTS.agent,      titleColor: "#6b7280",  emoji: "📝" },
};

function getStateTheme(status) {
  return STATE_THEME[String(status || "").toLowerCase()] || {
    gradient: GRADIENTS.navy, titleColor: "#1e40af", emoji: "📋",
  };
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Email al CLIENTE cuando se registra un contrato nuevo.
 * @param {object} data        - Datos del contrato
 * @param {string} contractId  - ID del documento en Firestore
 */
function contractCreatedEmail(data, contractId) {
  const financial = data.financial || {};
  return {
    subject: `Contrato registrado · ${safe(data.propertyName, "Propiedad")}`,
    html: htmlWrapper(
      GRADIENTS.navy,
      `
      <div style="text-align:center;font-size:56px;margin-bottom:18px;">📄</div>
      <h1 class="title" style="color:#1e40af;text-align:center;">Nuevo contrato registrado</h1>
      <p class="subtitle" style="text-align:center;">
        Hola <strong style="color:#1f2937;">${escapeHtml(safe(data.clientName, "Cliente"))}</strong>,
        registramos un nuevo contrato asociado a tu perfil. A continuación encontrarás un resumen ejecutivo con sus datos principales.
      </p>
      ${sectionCard("Resumen del contrato", [
        infoRow("Código",    safe(contractId, "No disponible"),               "#1f2937"),
        infoRow("Tipo",      contractTypeLabel(data.type),                    "#1e40af"),
        infoRow("Estado",    statusLabel(data.statusGeneral || data.status),  "#166534"),
        infoRow("Propiedad", safe(data.propertyName, "Propiedad"),            "#b8952a"),
        data.propertyAddress ? infoRow("Dirección",  data.propertyAddress) : "",
        data.operationMode   ? infoRow("Modalidad",  data.operationMode)   : "",
      ], { bg: "#f8fbff", border: "#dbeafe" })}
      ${sectionCard("Condiciones económicas", [
        infoRow("Valor principal", fmtCOP(data.value || financial.baseValue),                          "#166534"),
        (financial.adminFee || data.adminFee)         ? infoRow("Administración", fmtCOP(financial.adminFee     || data.adminFee),     "#166534") : "",
        (financial.deposit  || data.deposit)          ? infoRow("Depósito",       fmtCOP(financial.deposit      || data.deposit),      "#166534") : "",
        (financial.initialPayment || data.initialPayment) ? infoRow("Pago inicial",fmtCOP(financial.initialPayment || data.initialPayment), "#166534") : "",
        (financial.balance  || data.balance)          ? infoRow("Saldo",          fmtCOP(financial.balance      || data.balance),      "#92400e") : "",
        (financial.paymentDay || data.paymentDay)     ? infoRow("Día de pago",    String(financial.paymentDay   || data.paymentDay),   "#1e40af") : "",
      ], { bg: "#f0fdf4", border: "#bbf7d0" })}
      ${sectionCard("Fechas y responsable", [
        data.startDate  ? infoRow("Inicio",           fmtDate(data.startDate),  "#1e40af") : "",
        data.endDate    ? infoRow("Fin",              fmtDate(data.endDate),    "#92400e") : "",
        data.agentName  ? infoRow("Agente",           data.agentName,           "#b8952a") : "",
        data.agentEmail ? infoRow("Correo del agente",data.agentEmail)                    : "",
      ])}
      ${noteBox({
        bg: "#eff6ff", borderColor: "#3b82f6",
        title: "Qué puedes hacer ahora",
        body: "Desde tu portal puedes revisar el contrato, consultar documentos relacionados y recibir alertas sobre fechas clave, pagos y cambios de estado.",
      })}
      ${ctaButtons(
        "Ver en mi portal",          `${BASE_URL}/portal`,
        "Contactar por WhatsApp",    WHATSAPP_URL,
        { primaryBg: "linear-gradient(135deg,#1e40af,#2563eb)", secondaryColor: "#1e40af" }
      )}`
    ),
  };
}

/**
 * Email al AGENTE cuando se crea un contrato bajo su gestión.
 */
function contractCreatedAgentEmail(data) {
  return {
    subject: `Contrato registrado · ${safe(data.propertyName, "Propiedad")} · ${safe(data.clientName, "Cliente")}`,
    html: htmlWrapper(
      GRADIENTS.agent,
      `
      <div style="text-align:center;font-size:56px;margin-bottom:18px;">📌</div>
      <h1 class="title" style="color:#b8952a;text-align:center;">Contrato creado</h1>
      <p class="subtitle" style="text-align:center;">
        Hola <strong style="color:#1f2937;">${escapeHtml(safe(data.agentName, "Agente"))}</strong>,
        se registró un nuevo contrato bajo tu gestión.
      </p>
      ${sectionCard("Resumen de gestión", [
        infoRow("Cliente",   safe(data.clientName, "Cliente"),                            "#1f2937"),
        infoRow("Propiedad", safe(data.propertyName, "Propiedad"),                        "#b8952a"),
        infoRow("Tipo",      contractTypeLabel(data.type),                                "#1e40af"),
        infoRow("Valor",     fmtCOP(data.value || data.financial?.baseValue),             "#166534"),
        infoRow("Estado",    statusLabel(data.statusGeneral || data.status),              "#166534"),
      ], { bg: "#f8fbff", border: "#dbeafe" })}
      ${ctaButtons(
        "Ver en el panel", `${BASE_URL}/contratos`,
        "", "",
        { primaryBg: "linear-gradient(135deg,#b8952a,#d4a836)" }
      )}`
    ),
  };
}

/**
 * Email al CLIENTE cuando cambia el estado o la etapa de su contrato.
 * @param {object} after       - Datos actualizados del contrato
 * @param {string} [prevStatus]
 * @param {string} [prevStage]
 */
function contractUpdatedEmail(after, prevStatus, prevStage) {
  const nextStatus = after.statusGeneral || after.status || "";
  const nextStage  = after.businessStage || "";
  const theme      = getStateTheme(nextStatus);

  const statusChanged = prevStatus && prevStatus !== nextStatus;
  const stageChanged  = prevStage  && prevStage  !== nextStage;

  const clientName   = escapeHtml(safe(after.clientName, "Cliente"));
  const propertyName = escapeHtml(safe(after.propertyName, "la propiedad"));

  return {
    subject: statusChanged
      ? `Actualización de contrato · ${statusLabel(nextStatus)} · ${safe(after.propertyName, "Propiedad")}`
      : `Nueva etapa en tu contrato · ${stageLabel(nextStage)} · ${safe(after.propertyName, "Propiedad")}`,
    html: htmlWrapper(
      theme.gradient,
      `
      <span class="emoji-icon">${theme.emoji}</span>
      <h1 class="title" style="color:${theme.titleColor};text-align:center;">
        ${statusChanged ? `Tu contrato está ${escapeHtml(statusLabel(nextStatus))}` : `Nueva etapa: ${escapeHtml(stageLabel(nextStage))}`}
      </h1>
      <p class="subtitle" style="text-align:center;">
        Hola <strong style="color:#1f2937;">${clientName}</strong>,<br/>
        tu contrato de <strong style="color:#1f2937;">${propertyName}</strong> ha sido actualizado.
      </p>
      ${sectionCard("Resumen actualizado", [
        infoRow("Propiedad", safe(after.propertyName, "Propiedad"), "#b8952a"),
        infoRow("Tipo",      contractTypeLabel(after.type),        "#1e40af"),
        statusChanged ? infoRow("Nuevo estado", statusLabel(nextStatus), theme.titleColor) : "",
        stageChanged  ? infoRow("Nueva etapa",  stageLabel(nextStage),   theme.titleColor) : "",
        after.agentName ? infoRow("Agente responsable", after.agentName, "#b8952a") : "",
      ], { bg: "#f8fbff", border: "#dbeafe" })}
      ${noteBox({
        bg: "#eff6ff", borderColor: "#3b82f6",
        title: "¿Necesitas más información?",
        body: "Ingresa a tu portal para revisar el estado completo del contrato, documentos y próximos pasos.",
      })}
      ${ctaButtons(
        "Ver en mi portal",       `${BASE_URL}/portal`,
        "Contactar por WhatsApp", WHATSAPP_URL,
        { primaryBg: `linear-gradient(135deg,${theme.titleColor},${theme.titleColor}cc)`, secondaryColor: theme.titleColor }
      )}`
    ),
  };
}

module.exports = { contractCreatedEmail, contractCreatedAgentEmail, contractUpdatedEmail };
