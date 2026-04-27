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

// ═══════════════════════════════════════════════════════════════════════════
//  PAGOS — emails para AGENTE (tono operativo, datos de cobranza)
// ═══════════════════════════════════════════════════════════════════════════
//
// Auditoría: antes el agente recibía el MISMO template que el cliente
// ("Tu pago vence hoy"). Ahora cada caso tiene su propio builder con datos
// de gestión: nombre del cliente, teléfono, dirección, monto, ID de contrato.

/**
 * Email al AGENTE cuando uno de SUS clientes paga.
 * No es para felicitarlo — es para que tenga trazabilidad de cobranza.
 */
function paymentConfirmedAgentEmail(contract, payment) {
  return {
    subject: `✅ Pago registrado · ${paymentLabel(payment)} · ${safe(contract.clientName, "Cliente")}`,
    html: htmlWrapper(
      GRADIENTS.agent,
      `
      <div style="text-align:center;font-size:48px;margin-bottom:14px;">💰</div>
      <h1 class="title" style="color:#166534;text-align:center;">Pago registrado</h1>
      <p class="subtitle" style="text-align:center;">
        Hola <strong style="color:#1f2937;">${escapeHtml(safe(contract.agentName, "Agente"))}</strong>,
        uno de tus contratos registró un pago. Aquí los detalles para tu seguimiento de cobranza.
      </p>
      ${sectionCard("Pago recibido", [
        infoRow("Concepto",       paymentLabel(payment),                                    "#1f2937"),
        infoRow("Valor",          fmtCOP(payment.paidAmount || payment.amount),             "#166534"),
        payment.dueDate ? infoRow("Fecha límite", fmtDate(payment.dueDate),                "#92400e") : "",
        infoRow("Registrado",     fmtDateTime(payment.paidAt || payment.updatedAt || new Date()), "#1e40af"),
        payment.reference ? infoRow("Referencia", payment.reference, "#1f2937") : "",
        (payment.paidBy || payment.actorEmail) ? infoRow("Registrado por", payment.paidBy || payment.actorEmail) : "",
      ], { bg: "#f0fdf4", border: "#bbf7d0" })}
      ${sectionCard("Cliente y contrato", [
        infoRow("Cliente",     safe(contract.clientName, "Cliente"),     "#1f2937"),
        contract.clientEmail ? infoRow("Email cliente", contract.clientEmail) : "",
        contract.clientPhone ? infoRow("Teléfono",     contract.clientPhone, "#166534") : "",
        infoRow("Propiedad",   safe(contract.propertyName, "Propiedad"), "#b8952a"),
        contract.propertyAddress ? infoRow("Dirección", contract.propertyAddress) : "",
        infoRow("Tipo",        contractTypeLabel(contract.type),         "#1e40af"),
      ])}
      ${ctaButtons(
        "Ver contrato en panel", `${BASE_URL}/contratos`, "", "",
        { primaryBg: "linear-gradient(135deg,#166534,#15803d)" }
      )}`
    ),
  };
}

/**
 * Email al ADMIN cuando se registra un pago crítico (ej. cuota inicial,
 * monto > umbral). Disparado solo en casos relevantes desde el trigger.
 */
function paymentConfirmedAdminEmail(contract, payment) {
  return {
    subject: `[Admin] Pago registrado · ${fmtCOP(payment.paidAmount || payment.amount)} · ${safe(contract.propertyName, "Propiedad")}`,
    html: htmlWrapper(
      GRADIENTS.purple,
      `
      <div style="text-align:center;font-size:48px;margin-bottom:14px;">🛡️</div>
      <h1 class="title" style="color:#7c3aed;text-align:center;">Pago registrado en sistema</h1>
      <p class="subtitle" style="text-align:center;">
        Registro automático de pago para visibilidad de tesorería.
      </p>
      ${sectionCard("Movimiento", [
        infoRow("Concepto",       paymentLabel(payment),                              "#1f2937"),
        infoRow("Valor",          fmtCOP(payment.paidAmount || payment.amount),       "#166534"),
        infoRow("Estado",         paymentStatusLabel(payment.status || "pagado"),     "#166534"),
        payment.dueDate ? infoRow("Fecha límite", fmtDate(payment.dueDate))   : "",
        infoRow("Registrado",     fmtDateTime(payment.paidAt || new Date()),  "#7c3aed"),
        (payment.paidBy || payment.actorEmail) ? infoRow("Registrado por", payment.paidBy || payment.actorEmail) : "",
      ], { bg: "#faf5ff", border: "#e9d5ff" })}
      ${sectionCard("Contexto", [
        infoRow("Cliente",        safe(contract.clientName, "—"),     "#1f2937"),
        infoRow("Propiedad",      safe(contract.propertyName, "—"),   "#b8952a"),
        contract.agentName  ? infoRow("Agente", contract.agentName, "#7c3aed") : "",
        contract.agentEmail ? infoRow("Email agente", contract.agentEmail) : "",
        infoRow("Tipo contrato",  contractTypeLabel(contract.type),   "#1e40af"),
      ])}
      ${ctaButtons(
        "Ver contratos",  `${BASE_URL}/contratos`,
        "Dashboard",      `${BASE_URL}/dashboard`,
        { primaryBg: "linear-gradient(135deg,#7c3aed,#6d28d9)", secondaryColor: "#7c3aed" }
      )}`
    ),
  };
}

/**
 * Email al AGENTE el día que vence un pago de SU cliente.
 * Tono: alerta operativa de cobranza (no es "su" pago, es del cliente).
 */
function paymentDueAgentEmail({ clientName, clientEmail, clientPhone, propertyName, propertyAddress, amount, dueDate, contractId }) {
  return {
    subject: `🔔 Cobranza hoy · ${clientName} · ${propertyName}`,
    html: htmlWrapper(
      GRADIENTS.orange,
      `
      <span class="emoji-icon">🔔</span>
      <h1 class="title" style="color:#c2410c;text-align:center;">Cobranza vence hoy</h1>
      <p class="subtitle" style="text-align:center;">
        Hoy vence el pago de uno de tus clientes. Considera contactarlo
        durante la mañana para asegurar el cumplimiento.
      </p>
      ${sectionCard("Datos del pago", [
        infoRow("Cliente",     safe(clientName, "Cliente"),     "#1f2937"),
        clientEmail ? infoRow("Email",    clientEmail) : "",
        clientPhone ? infoRow("Teléfono", clientPhone, "#166534") : "",
        infoRow("Propiedad",   safe(propertyName, "Propiedad"), "#b8952a"),
        propertyAddress ? infoRow("Dirección", propertyAddress) : "",
        infoRow("Valor",       fmtCOP(amount),     "#c2410c"),
        dueDate ? infoRow("Vence",       fmtDate(dueDate),  "#c2410c") : "",
        contractId ? infoRow("ID contrato", contractId, "#6b7280") : "",
      ], { bg: "#fff7ed", border: "#fed7aa" })}
      ${noteBox({
        bg: "#fffbeb", borderColor: "#f59e0b",
        title: "Acción recomendada",
        body: "Llamada o WhatsApp en la mañana suele ser más efectivo que email. Si el cliente confirma pago, recuérdale registrar el comprobante en el portal.",
      })}
      ${ctaButtons(
        "Ver contrato",                  `${BASE_URL}/contratos`,
        clientPhone ? "💬 WhatsApp al cliente" : "",
        clientPhone ? `https://wa.me/${String(clientPhone).replace(/[^\d]/g, "")}` : "",
        { primaryBg: "linear-gradient(135deg,#c2410c,#ea580c)", secondaryColor: "#c2410c" }
      )}`
    ),
  };
}

/**
 * Email al AGENTE cuando un pago de su cliente entra en mora.
 * Tono: alerta operativa, foco en gestión de cobranza.
 */
function latePaymentAgentEmail({ clientName, clientEmail, clientPhone, propertyName, propertyAddress, amount, dueDate, daysLate, contractId }) {
  const dayWord = daysLate === 1 ? "día" : "días";
  return {
    subject: `⚠️ Mora ${daysLate}d · ${clientName} · ${propertyName}`,
    html: htmlWrapper(
      GRADIENTS.crimson,
      `
      <span class="emoji-icon">⚠️</span>
      <h1 class="title" style="color:#991b1b;text-align:center;">Cliente en mora · ${daysLate} ${dayWord}</h1>
      <p class="subtitle" style="text-align:center;">
        Uno de tus clientes acumula <strong style="color:#991b1b;">${daysLate} ${dayWord} de mora</strong>.
        Es momento de gestionar la cobranza activamente.
      </p>
      ${sectionCard("Detalle de la deuda", [
        infoRow("Cliente",     safe(clientName, "Cliente"),     "#1f2937"),
        clientEmail ? infoRow("Email",    clientEmail) : "",
        clientPhone ? infoRow("Teléfono", clientPhone, "#166534") : "",
        infoRow("Propiedad",   safe(propertyName, "Propiedad"), "#b8952a"),
        propertyAddress ? infoRow("Dirección", propertyAddress) : "",
        infoRow("Monto",       fmtCOP(amount),     "#991b1b"),
        dueDate ? infoRow("Vencimiento", fmtDate(dueDate),  "#991b1b") : "",
        infoRow("Días de mora", String(daysLate), "#991b1b"),
        contractId ? infoRow("ID contrato", contractId, "#6b7280") : "",
      ], { bg: "#fef2f2", border: "#fecaca" })}
      ${noteBox({
        bg: "#fef2f2", borderColor: "#dc2626",
        title: "Plan sugerido",
        body: daysLate >= 15
          ? "<strong>Mora avanzada.</strong> Considera notificación formal por escrito y revisión de cláusulas del contrato. Notifica al admin si en 7 días no hay respuesta."
          : daysLate >= 7
          ? "<strong>Mora media.</strong> Llamada directa + WhatsApp documentando intentos. Si el cliente atraviesa una situación específica, evalúa acuerdo de pago."
          : "<strong>Mora reciente.</strong> Suele resolverse con un recordatorio amable. Llamada o WhatsApp en horario hábil.",
      })}
      ${ctaButtons(
        "Ver contrato",                  `${BASE_URL}/contratos`,
        clientPhone ? "💬 WhatsApp" : "",
        clientPhone ? `https://wa.me/${String(clientPhone).replace(/[^\d]/g, "")}` : "",
        { primaryBg: "linear-gradient(135deg,#991b1b,#b91c1c)", secondaryColor: "#991b1b" }
      )}`
    ),
  };
}

/**
 * Email al ADMIN para mora crítica (≥15 días).
 * Tono: directivo, foco en cartera y riesgo.
 */
function latePaymentAdminEmail({ clientName, propertyName, amount, dueDate, daysLate, agentName, agentEmail, contractId }) {
  return {
    subject: `[Admin] 🚨 Mora crítica ${daysLate}d · ${propertyName}`,
    html: htmlWrapper(
      GRADIENTS.crimson,
      `
      <div style="text-align:center;font-size:48px;margin-bottom:14px;">🚨</div>
      <h1 class="title" style="color:#991b1b;text-align:center;">Cartera en mora crítica</h1>
      <p class="subtitle" style="text-align:center;">
        Un contrato registra <strong style="color:#991b1b;">${daysLate} días de mora</strong>.
        Riesgo de cartera vencida — requiere intervención de gestión.
      </p>
      ${sectionCard("Resumen de cartera", [
        infoRow("Cliente",       safe(clientName, "Cliente"),     "#1f2937"),
        infoRow("Propiedad",     safe(propertyName, "Propiedad"), "#b8952a"),
        infoRow("Monto",         fmtCOP(amount),                  "#991b1b"),
        dueDate ? infoRow("Vencimiento", fmtDate(dueDate),  "#991b1b") : "",
        infoRow("Días de mora",  String(daysLate),                "#991b1b"),
        agentName  ? infoRow("Agente responsable", agentName, "#7c3aed") : "",
        agentEmail ? infoRow("Email agente",       agentEmail) : "",
        contractId ? infoRow("ID contrato",        contractId, "#6b7280") : "",
      ], { bg: "#fef2f2", border: "#fecaca" })}
      ${noteBox({
        bg: "#fef2f2", borderColor: "#dc2626",
        title: "Acción ejecutiva",
        body: "1) Verifica con el agente qué acciones de cobranza se han realizado.<br/>2) Considera contactar al cliente directamente.<br/>3) Si la mora supera 30 días, evaluar inicio de proceso jurídico según contrato.",
      })}
      ${ctaButtons(
        "Ver contrato",   `${BASE_URL}/contratos`,
        "Dashboard",      `${BASE_URL}/dashboard`,
        { primaryBg: "linear-gradient(135deg,#991b1b,#b91c1c)", secondaryColor: "#991b1b" }
      )}`
    ),
  };
}

/**
 * Email al AGENTE cuando el contrato de un cliente está por vencer.
 * Tono: planificación, foco en renovación o entrega.
 */
function contractExpiryAgentEmail({ clientName, clientEmail, clientPhone, propertyName, endDate, daysAhead, isRent, contractId }) {
  return {
    subject: `📆 Contrato vence en ${daysAhead}d · ${clientName} · ${propertyName}`,
    html: htmlWrapper(
      GRADIENTS.amber,
      `
      <span class="emoji-icon">📆</span>
      <h1 class="title" style="color:#92400e;text-align:center;">Contrato por vencer (${daysAhead}d)</h1>
      <p class="subtitle" style="text-align:center;">
        Uno de tus contratos vence en <strong style="color:#92400e;">${daysAhead} días</strong>.
        ${isRent ? "Es momento ideal para coordinar renovación o entrega del inmueble." : "Coordina los próximos pasos con el cliente."}
      </p>
      ${sectionCard("Datos del contrato", [
        infoRow("Cliente",     safe(clientName, "Cliente"),     "#1f2937"),
        clientEmail ? infoRow("Email",    clientEmail) : "",
        clientPhone ? infoRow("Teléfono", clientPhone, "#166534") : "",
        infoRow("Propiedad",   safe(propertyName, "Propiedad"), "#b8952a"),
        endDate ? infoRow("Fin de contrato", fmtDate(endDate),  "#92400e") : "",
        infoRow("Días restantes", String(daysAhead),            "#92400e"),
        contractId ? infoRow("ID contrato", contractId, "#6b7280") : "",
      ], { bg: "#fffbeb", border: "#fde68a" })}
      ${noteBox({
        bg: "#fef3c7", borderColor: "#d97706",
        title: "Acción sugerida",
        body: isRent
          ? "Llamada esta semana para confirmar si el cliente desea renovar. Si sí, prepara propuesta de renovación con ajuste IPC. Si no, agenda entrega de inmueble e inventario."
          : "Coordina los pasos finales del contrato (entrega, registros, paz y salvos pendientes).",
      })}
      ${ctaButtons(
        "Ver contrato",                  `${BASE_URL}/contratos`,
        clientPhone ? "💬 WhatsApp al cliente" : "",
        clientPhone ? `https://wa.me/${String(clientPhone).replace(/[^\d]/g, "")}` : "",
        { primaryBg: "linear-gradient(135deg,#b45309,#d97706)", secondaryColor: "#b45309" }
      )}`
    ),
  };
}

/**
 * Email al AGENTE cuando se abre la ventana de renovación de un arriendo.
 */
function renewalWindowAgentEmail({ clientName, clientEmail, clientPhone, propertyName, endDate, daysAhead, contractId }) {
  return {
    subject: `🔁 Renovación próxima · ${clientName} · ${propertyName}`,
    html: htmlWrapper(
      GRADIENTS.emerald,
      `
      <span class="emoji-icon">🔁</span>
      <h1 class="title" style="color:#166534;text-align:center;">Ventana de renovación abierta</h1>
      <p class="subtitle" style="text-align:center;">
        El arriendo de uno de tus clientes vence en
        <strong style="color:#166534;">${daysAhead} días</strong>.
        Tienes margen para conversar términos antes de la fecha límite.
      </p>
      ${sectionCard("Datos del contrato", [
        infoRow("Cliente",     safe(clientName, "Cliente"),     "#1f2937"),
        clientEmail ? infoRow("Email",    clientEmail) : "",
        clientPhone ? infoRow("Teléfono", clientPhone, "#166534") : "",
        infoRow("Propiedad",   safe(propertyName, "Propiedad"), "#b8952a"),
        endDate ? infoRow("Fin actual",     fmtDate(endDate), "#166534") : "",
        infoRow("Días restantes", String(daysAhead), "#166534"),
        contractId ? infoRow("ID contrato", contractId, "#6b7280") : "",
      ], { bg: "#f0fdf4", border: "#bbf7d0" })}
      ${noteBox({
        bg: "#d1fae5", borderColor: "#059669",
        title: "Plan sugerido",
        body: "1) Revisar si el cliente tiene historial limpio de pagos.<br/>2) Calcular ajuste IPC anual.<br/>3) Preparar propuesta de renovación y enviarla esta semana.<br/>4) Si el cliente no renueva, comenzar a remarketear la propiedad.",
      })}
      ${ctaButtons(
        "Ver contrato",                  `${BASE_URL}/contratos`,
        clientPhone ? "💬 WhatsApp al cliente" : "",
        clientPhone ? `https://wa.me/${String(clientPhone).replace(/[^\d]/g, "")}` : "",
        { primaryBg: "linear-gradient(135deg,#15803d,#16a34a)", secondaryColor: "#15803d" }
      )}`
    ),
  };
}

module.exports = {
  // Cliente
  paymentConfirmedEmail,
  paymentReminderEmail,
  paymentDueTodayEmail,
  latePaymentEmail,
  contractExpiryEmail,
  renewalWindowEmail,
  // Agente
  paymentConfirmedAgentEmail,
  paymentDueAgentEmail,
  latePaymentAgentEmail,
  contractExpiryAgentEmail,
  renewalWindowAgentEmail,
  // Admin
  paymentConfirmedAdminEmail,
  latePaymentAdminEmail,
};