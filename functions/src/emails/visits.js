// src/emails/visits.js
// ─── Templates de email para el módulo de Visitas ────────────────────────────

const { BASE_URL, WHATSAPP_URL, GRADIENTS } = require("./config");
const { escapeHtml, safe }                  = require("./utils");
const { htmlWrapper, infoRow, sectionCard, noteBox, ctaButtons } = require("./layout");

/**
 * Email al CLIENTE cuando su solicitud de visita queda en estado "pending".
 * @param {object} d - Datos de la visita
 */
function pendingVisitEmail(d) {
  return {
    subject: `✅ Solicitud de visita recibida — ${d.propertyName}`,
    html: htmlWrapper(
      GRADIENTS.dark,
      `
      <span class="emoji-icon">⏳</span>
      <h1 class="title" style="color:#b8952a;text-align:center;">Solicitud recibida</h1>
      <p class="subtitle" style="text-align:center;">
        Hola <strong style="color:#1f2937;">${escapeHtml(d.clientName)}</strong>,<br/>
        recibimos tu solicitud de visita. Nuestro equipo la revisará y te confirmará
        <strong style="color:#b8952a;">en menos de 24 horas</strong>.
      </p>
      <div class="info-card">
        ${infoRow("🏠 Propiedad",        d.propertyName,    "#b8952a")}
        ${infoRow("📅 Fecha solicitada", d.requestedDate)}
        ${infoRow("🕐 Hora solicitada",  d.requestedTime)}
        ${d.notes ? infoRow("💬 Tu mensaje", d.notes) : ""}
      </div>
      ${noteBox({
        bg: "#fffbeb", borderColor: "#f59e0b",
        title: "¿Qué sigue?",
        body: "Un asesor revisará tu solicitud y te enviará un correo de confirmación con los detalles de la visita.",
      })}
      ${ctaButtons(
        "💬 Contactar por WhatsApp", WHATSAPP_URL,
        "Ver más propiedades",       `${BASE_URL}/propiedades`,
        { primaryBg: "linear-gradient(135deg,#b8952a,#d4a836)", secondaryColor: "#b8952a" }
      )}`
    ),
  };
}

/**
 * Email al CLIENTE cuando su visita es aprobada.
 */
function approvedVisitEmail(d) {
  return {
    subject: `🎉 ¡Tu visita está confirmada! — ${d.propertyName}`,
    html: htmlWrapper(
      GRADIENTS.green,
      `
      <span class="emoji-icon">🎉</span>
      <h1 class="title" style="color:#166534;text-align:center;">¡Tu visita está confirmada!</h1>
      <p class="subtitle" style="text-align:center;">
        Hola <strong style="color:#1f2937;">${escapeHtml(d.clientName)}</strong>,<br/>
        nos alegra informarte que tu solicitud de visita fue <strong style="color:#166534;">aprobada</strong>.
      </p>
      <div class="info-card">
        ${infoRow("🏠 Propiedad", d.propertyName, "#166534")}
        ${infoRow("📅 Fecha",     d.requestedDate)}
        ${infoRow("🕐 Hora",      d.requestedTime)}
        ${d.agentName  ? infoRow("👤 Agente", d.agentName,  "#b8952a") : ""}
        ${d.adminNotes ? infoRow("💬 Nota",   d.adminNotes)            : ""}
      </div>
      ${d.adminNotes ? noteBox({
        bg: "#f0fdf4", borderColor: "#22c55e",
        title: "Mensaje del agente",
        body: escapeHtml(d.adminNotes),
      }) : ""}
      <div class="divider"></div>
      <p style="font-size:14px;color:#374151;line-height:1.7;margin:0 0 8px;">
        📌 <strong>Recuerda llegar puntualmente</strong> a la hora indicada.
      </p>
      <p class="tip">Lleva contigo tu documento de identidad. El agente te recibirá en la propiedad.</p>
      ${ctaButtons(
        "💬 Confirmar por WhatsApp", WHATSAPP_URL,
        "Ver más propiedades",       `${BASE_URL}/propiedades`,
        { primaryBg: "linear-gradient(135deg,#166534,#15803d)", secondaryColor: "#166534" }
      )}`
    ),
  };
}

/**
 * Email al CLIENTE cuando su visita es rechazada.
 */
function rejectedVisitEmail(d) {
  return {
    subject: `Actualización sobre tu solicitud de visita — ${d.propertyName}`,
    html: htmlWrapper(
      GRADIENTS.red,
      `
      <span class="emoji-icon">😔</span>
      <h1 class="title" style="color:#991b1b;text-align:center;">Solicitud no disponible</h1>
      <p class="subtitle" style="text-align:center;">
        Hola <strong style="color:#1f2937;">${escapeHtml(d.clientName)}</strong>,<br/>
        lamentamos informarte que tu solicitud de visita para
        <strong style="color:#1f2937;">${escapeHtml(d.propertyName)}</strong> no pudo ser aprobada en este momento.
      </p>
      ${d.adminNotes ? noteBox({
        bg: "#fef2f2", borderColor: "#ef4444",
        title: "Motivo",
        body: escapeHtml(d.adminNotes),
      }) : ""}
      <div class="info-card">
        ${infoRow("🏠 Propiedad",        d.propertyName)}
        ${infoRow("📅 Fecha solicitada", d.requestedDate)}
        ${infoRow("🕐 Hora solicitada",  d.requestedTime)}
      </div>
      ${noteBox({
        bg: "#fffbeb", borderColor: "#f59e0b",
        title: "¿Qué puedes hacer?",
        body: "• Escríbenos por WhatsApp para intentar otra fecha.<br/>• Explora nuestras otras propiedades disponibles.",
      })}
      ${ctaButtons(
        "💬 Contactar por WhatsApp", WHATSAPP_URL,
        "Ver catálogo",              `${BASE_URL}/propiedades`,
        { primaryBg: "linear-gradient(135deg,#b45309,#d97706)", secondaryColor: "#b45309" }
      )}
      <div class="divider"></div>
      <p class="tip" style="text-align:center;">Gracias por confiar en nosotros. Seguimos a tu disposición.</p>`
    ),
  };
}

/**
 * Email al CLIENTE cuando la visita es reprogramada.
 */
function rescheduledVisitEmail(d) {
  const newDate = d.proposedDate || d.requestedDate;
  const newTime = d.proposedTime || d.requestedTime;
  return {
    subject: `📅 Nueva propuesta de fecha para tu visita — ${d.propertyName}`,
    html: htmlWrapper(
      GRADIENTS.blue,
      `
      <span class="emoji-icon">📅</span>
      <h1 class="title" style="color:#1e40af;text-align:center;">Propuesta de nueva fecha</h1>
      <p class="subtitle" style="text-align:center;">
        Hola <strong style="color:#1f2937;">${escapeHtml(d.clientName)}</strong>,<br/>
        hemos reservado una nueva hora para tu visita a
        <strong style="color:#1f2937;">${escapeHtml(d.propertyName)}</strong>.
        Por favor <strong style="color:#1e40af;">confirma si la nueva fecha te queda bien</strong>.
      </p>
      <div class="info-card">
        <p style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;">Nueva propuesta</p>
        ${infoRow("🏠 Propiedad",  d.propertyName, "#1e40af")}
        ${infoRow("📅 Nueva fecha", newDate,        "#1e40af")}
        ${infoRow("🕐 Nueva hora",  newTime,        "#1e40af")}
        ${d.agentName ? infoRow("👤 Agente", d.agentName) : ""}
      </div>
      ${d.adminNotes ? noteBox({
        bg: "#eff6ff", borderColor: "#3b82f6",
        title: "Nota del agente",
        body: escapeHtml(d.adminNotes),
      }) : ""}
      <p style="font-size:14px;color:#374151;line-height:1.7;margin:0 0 24px;text-align:center;">
        Si esta nueva fecha <strong>no te conviene</strong>, contáctanos y buscaremos otra alternativa.
      </p>
      ${ctaButtons(
        "✅ Confirmar nueva fecha", WHATSAPP_URL,
        "Proponer otra fecha",     WHATSAPP_URL,
        { primaryBg: "linear-gradient(135deg,#1e40af,#2563eb)", secondaryColor: "#1e40af" }
      )}`
    ),
  };
}

/**
 * Email al AGENTE cuando se le asigna una visita confirmada.
 */
function agentVisitAssignedEmail(d) {
  return {
    subject: `🏡 Nueva visita asignada — ${d.propertyName}`,
    html: htmlWrapper(
      GRADIENTS.agent,
      `
      <span class="emoji-icon">🏡</span>
      <h1 class="title" style="color:#b8952a;text-align:center;">Nueva visita asignada</h1>
      <p class="subtitle" style="text-align:center;">
        Hola <strong style="color:#1f2937;">${escapeHtml(d.agentName)}</strong>,<br/>
        tienes una nueva visita confirmada. Revisa todos los detalles a continuación.
      </p>
      <div class="info-card" style="border:2px solid #fef3c7;">
        <p style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;">Datos del cliente</p>
        ${infoRow("👤 Nombre",   d.clientName,            "#1f2937")}
        ${infoRow("📧 Email",    d.clientEmail  || "—")}
        ${infoRow("📱 Teléfono", d.clientPhone  || "—")}
        ${d.clientMessage ? infoRow("💬 Mensaje", d.clientMessage) : ""}
      </div>
      <div class="info-card">
        <p style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;">Detalle de la visita</p>
        ${infoRow("🏠 Propiedad",  d.propertyName,    "#b8952a")}
        ${infoRow("📅 Fecha",      d.requestedDate,   "#1e40af")}
        ${infoRow("🕐 Hora",       d.requestedTime,   "#1e40af")}
        ${d.propertyAddress ? infoRow("📍 Dirección", d.propertyAddress) : ""}
      </div>
      ${noteBox({
        bg: "#fffbeb", borderColor: "#f59e0b",
        title: "⚠️ Recuerda",
        body: "Llega con al menos 10 minutos de anticipación.<br/>Confirma la visita con el cliente un día antes.",
      })}
      ${ctaButtons(
        "📋 Ver panel de visitas", `${BASE_URL}/usuarios/visitas`,
        "Contactar cliente",       WHATSAPP_URL,
        { primaryBg: "linear-gradient(135deg,#b8952a,#d4a836)", secondaryColor: "#b8952a" }
      )}`
    ),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  CANCELACIÓN DE VISITA POR EL CLIENTE
// ═══════════════════════════════════════════════════════════════════════════
//
// Auditoría: client.portal.service.js permite que un viewer cancele su propia
// visita pendiente o aprobada. Antes solo se creaban notifs in-app — el agente
// y admin se enteraban solo si abrían el panel. Ahora reciben email.
// El propio cliente también recibe un email de confirmación de cancelación.

/**
 * Email al CLIENTE confirmando su propia cancelación de visita.
 * Tono: humano, agradecido, abre puerta a reagendar.
 */
function visitCancelledByClientEmail(d) {
  return {
    subject: `Cancelación recibida — ${d.propertyName}`,
    html: htmlWrapper(
      GRADIENTS.dark,
      `
      <span class="emoji-icon">📭</span>
      <h1 class="title" style="color:#b8952a;text-align:center;">Tu cancelación fue procesada</h1>
      <p class="subtitle" style="text-align:center;">
        Hola <strong style="color:#1f2937;">${escapeHtml(d.clientName || "Cliente")}</strong>,<br/>
        confirmamos que cancelaste tu visita programada a
        <strong style="color:#1f2937;">${escapeHtml(d.propertyName || "la propiedad")}</strong>.
      </p>
      <div class="info-card">
        ${infoRow("🏠 Propiedad",        d.propertyName,    "#b8952a")}
        ${infoRow("📅 Fecha original",   d.requestedDate)}
        ${infoRow("🕐 Hora original",    d.requestedTime)}
        ${d.cancelReason ? infoRow("💬 Motivo", d.cancelReason) : ""}
      </div>
      ${noteBox({
        bg: "#fffbeb", borderColor: "#f59e0b",
        title: "¿Cambiaste de idea?",
        body: "Puedes solicitar una nueva visita en cualquier momento desde tu portal o escribirnos por WhatsApp para coordinar otra fecha.",
      })}
      ${ctaButtons(
        "Ver más propiedades", `${BASE_URL}/propiedades`,
        "💬 Hablar con un asesor", WHATSAPP_URL,
        { primaryBg: "linear-gradient(135deg,#b8952a,#d4a836)", secondaryColor: "#b8952a" }
      )}`
    ),
  };
}

/**
 * Email al AGENTE cuando el cliente cancela su visita.
 * Tono: operativo. Datos para reorganizar agenda y, si aplica, recontactar.
 */
function visitCancelledAgentEmail(d) {
  return {
    subject: `❌ Visita cancelada por el cliente · ${safe(d.propertyName, "Propiedad")}`,
    html: htmlWrapper(
      GRADIENTS.agent,
      `
      <span class="emoji-icon">⚠️</span>
      <h1 class="title" style="color:#b8952a;text-align:center;">Visita cancelada</h1>
      <p class="subtitle" style="text-align:center;">
        Hola <strong style="color:#1f2937;">${escapeHtml(d.agentName || "Agente")}</strong>,<br/>
        el cliente canceló la visita que tenías agendada. Libera la franja en tu agenda y, si lo crees pertinente, contacta para entender el motivo.
      </p>
      ${sectionCard("Visita cancelada", [
        infoRow("Cliente",       safe(d.clientName, "Cliente"),    "#1f2937"),
        infoRow("Email",         safe(d.clientEmail, "—")),
        d.clientPhone ? infoRow("Teléfono", d.clientPhone, "#166534") : "",
        infoRow("Propiedad",     safe(d.propertyName, "Propiedad"), "#b8952a"),
        infoRow("Fecha agendada", safe(d.requestedDate, "—"),       "#1e40af"),
        infoRow("Hora agendada",  safe(d.requestedTime, "—"),       "#1e40af"),
        d.visitId ? infoRow("ID visita", d.visitId, "#6b7280") : "",
      ], { bg: "#fef2f2", border: "#fecaca" })}
      ${d.cancelReason ? noteBox({
        bg: "#fffbeb", borderColor: "#f59e0b",
        title: "Motivo del cliente",
        body: escapeHtml(d.cancelReason),
      }) : noteBox({
        bg: "#f1f5f9", borderColor: "#64748b",
        title: "Sin motivo declarado",
        body: "El cliente no especificó razón al cancelar. Considera una llamada breve para entender si la propiedad sigue siendo de su interés.",
      })}
      ${ctaButtons(
        "📋 Ver panel de visitas", `${BASE_URL}/usuarios/visitas`,
        d.clientPhone ? "Contactar cliente" : "",
        d.clientPhone ? WHATSAPP_URL : "",
        { primaryBg: "linear-gradient(135deg,#b8952a,#d4a836)", secondaryColor: "#b8952a" }
      )}`
    ),
  };
}

/**
 * Email al ADMIN cuando un cliente cancela.
 * Tono: directivo, foco en métricas / patrones de cancelación.
 */
function visitCancelledAdminEmail(d) {
  return {
    subject: `[Admin] Visita cancelada · ${safe(d.propertyName, "Propiedad")} · ${safe(d.clientName, "Cliente")}`,
    html: htmlWrapper(
      GRADIENTS.purple,
      `
      <div style="text-align:center;font-size:48px;margin-bottom:14px;">🛡️</div>
      <h1 class="title" style="color:#7c3aed;text-align:center;">Cancelación de visita</h1>
      <p class="subtitle" style="text-align:center;">
        Un cliente canceló su visita. Registro automático para visibilidad operativa.
      </p>
      ${sectionCard("Resumen ejecutivo", [
        infoRow("Cliente",        safe(d.clientName, "Cliente"),     "#1f2937"),
        infoRow("Email",          safe(d.clientEmail, "—")),
        d.clientPhone ? infoRow("Teléfono", d.clientPhone)  : "",
        infoRow("Propiedad",      safe(d.propertyName, "Propiedad"), "#b8952a"),
        infoRow("Fecha agendada", safe(d.requestedDate, "—"),        "#1e40af"),
        infoRow("Hora agendada",  safe(d.requestedTime, "—")),
        d.agentName  ? infoRow("Agente responsable", d.agentName, "#7c3aed") : "",
        d.agentEmail ? infoRow("Email agente", d.agentEmail) : "",
        d.visitId ? infoRow("ID visita", d.visitId, "#6b7280") : "",
      ], { bg: "#faf5ff", border: "#e9d5ff" })}
      ${d.cancelReason ? sectionCard("Motivo declarado", [
        `<div style="font-size:14px;color:#3d3c38;line-height:1.7;padding:8px 0;">${escapeHtml(d.cancelReason)}</div>`,
      ]) : ""}
      ${noteBox({
        bg: "#f5f3ff", borderColor: "#7c3aed",
        title: "Acción sugerida",
        body: "Si las cancelaciones de este agente o de esta propiedad superan el promedio, considera revisar el flujo de confirmación previa. Las cancelaciones recurrentes suelen indicar fricción en el agendamiento.",
      })}
      ${ctaButtons(
        "Ver panel de visitas", `${BASE_URL}/usuarios/visitas`,
        "Dashboard",            `${BASE_URL}/dashboard`,
        { primaryBg: "linear-gradient(135deg,#7c3aed,#6d28d9)", secondaryColor: "#7c3aed" }
      )}`
    ),
  };
}

module.exports = {
  pendingVisitEmail,
  approvedVisitEmail,
  rejectedVisitEmail,
  rescheduledVisitEmail,
  agentVisitAssignedEmail,
  visitCancelledByClientEmail,
  visitCancelledAgentEmail,
  visitCancelledAdminEmail,
};  