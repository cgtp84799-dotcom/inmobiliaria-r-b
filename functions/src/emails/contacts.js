// functions/src/emails/contacts.js
// ─── Templates de email para el módulo de Contactos / Leads web ──────────────
//
// AUDITORÍA: el formulario público (/contactos y "Pregunta sobre esta propiedad"
// en PropertyDetail) escribe en /contacts pero NO existía trigger de email.
// Los admins quedaban ciegos a leads de la web — gran pérdida de conversión.
//
// Ahora cada lead dispara:
//   • Email a admins + agente asignado (si la consulta menciona propertyId)
//     con tono operativo y CTA al panel.
//   • Email de auto-respuesta al cliente confirmando que recibimos su consulta.

const { BASE_URL, WHATSAPP_URL, GRADIENTS, SUPPORT_EMAIL, FROM_NAME } = require("./config");
const { escapeHtml, safe, fmtDateTime } = require("./utils");
const { htmlWrapper, infoRow, sectionCard, ctaButtons, noteBox } = require("./layout");

// ═══════════════════════════════════════════════════════════════════════════
//  Auto-respuesta al CLIENTE — "recibimos tu consulta"
// ═══════════════════════════════════════════════════════════════════════════

function contactReceivedEmail(data) {
  const firstName = safe(String(data.name || "").split(" ")[0], "");
  return {
    subject: `Recibimos tu consulta — ${FROM_NAME}`,
    html: htmlWrapper(GRADIENTS.dark, `
      <span class="emoji-icon">📨</span>
      <h1 class="title" style="color:#b8952a;text-align:center;">Recibimos tu consulta</h1>
      <p class="subtitle" style="text-align:center;">
        ${firstName ? `Hola <strong style="color:#1f2937;">${escapeHtml(firstName)}</strong>, ` : "Hola, "}
        gracias por contactar a <strong>${FROM_NAME}</strong>.
        Un asesor revisará tu mensaje y te responderá <strong style="color:#b8952a;">en menos de 24 horas hábiles</strong>.
      </p>
      ${sectionCard("Resumen de tu consulta", [
        infoRow("Nombre",   safe(data.name, "—"),  "#1f2937"),
        infoRow("Correo",   safe(data.email, "—"), "#1e40af"),
        data.phone ? infoRow("Teléfono", data.phone, "#166534") : "",
        data.propertyTitle ? infoRow("Propiedad", data.propertyTitle, "#b8952a") : "",
      ], { bg: "#f8fbff", border: "#dbeafe" })}
      ${data.message ? sectionCard("Tu mensaje", [
        `<div style="font-size:14px;color:#3d3c38;line-height:1.7;padding:8px 0;">${escapeHtml(data.message)}</div>`,
      ]) : ""}
      ${noteBox({
        bg: "#fffbeb", borderColor: "#f59e0b",
        title: "¿Necesitas algo urgente?",
        body: "Si tu consulta es urgente o quieres avanzar más rápido, escríbenos directamente por WhatsApp y un asesor te atenderá de inmediato.",
      })}
      ${ctaButtons(
        "💬 WhatsApp directo", WHATSAPP_URL,
        "Ver más propiedades", `${BASE_URL}/propiedades`,
        { primaryBg: "linear-gradient(135deg,#b8952a,#d4a836)", secondaryColor: "#b8952a" }
      )}
    `),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  Notificación al AGENTE asignado (si la propiedad lo tiene)
// ═══════════════════════════════════════════════════════════════════════════

function contactReceivedAgentEmail(data, contactId) {
  return {
    subject: `🆕 Nuevo lead web · ${safe(data.propertyTitle || data.name, "Consulta")}`,
    html: htmlWrapper(GRADIENTS.agent, `
      <span class="emoji-icon">🎯</span>
      <h1 class="title" style="color:#b8952a;text-align:center;">Nuevo lead asignado a ti</h1>
      <p class="subtitle" style="text-align:center;">
        Una persona dejó datos de contacto en la web preguntando por una propiedad que tienes asignada.
        Atender este lead en las próximas horas suele triplicar la conversión.
      </p>
      ${sectionCard("Datos del lead", [
        infoRow("Nombre",   safe(data.name, "—"),  "#1f2937"),
        infoRow("Correo",   safe(data.email, "—"), "#1e40af"),
        data.phone ? infoRow("Teléfono", data.phone, "#166534") : "",
        data.propertyTitle ? infoRow("Propiedad", data.propertyTitle, "#b8952a") : "",
        data.propertyId    ? infoRow("ID propiedad", data.propertyId, "#6b7280") : "",
        contactId ? infoRow("ID consulta", contactId, "#6b7280") : "",
        infoRow("Recibido",  fmtDateTime(data.createdAt || new Date()), "#1e40af"),
      ], { bg: "#fffbeb", border: "#fde68a" })}
      ${data.message ? sectionCard("Mensaje del cliente", [
        `<div style="font-size:14px;color:#3d3c38;line-height:1.7;padding:8px 0;">${escapeHtml(data.message)}</div>`,
      ]) : ""}
      ${noteBox({
        bg: "#fef3c7", borderColor: "#d97706",
        title: "Acción recomendada",
        body: "1) Llamar o escribir por WhatsApp en la próxima hora.<br/>2) Marcar el lead como contactado en el panel.<br/>3) Si se concreta visita, agéndala desde el módulo de Visitas.",
      })}
      ${ctaButtons(
        "Ver consultas en panel", `${BASE_URL}/contactos`,
        data.phone ? "💬 WhatsApp al cliente" : "",
        data.phone ? `https://wa.me/${String(data.phone).replace(/[^\d]/g, "")}` : "",
        { primaryBg: "linear-gradient(135deg,#b8952a,#d4a836)", secondaryColor: "#b8952a" }
      )}
    `),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  Notificación al ADMIN — visibilidad operativa
// ═══════════════════════════════════════════════════════════════════════════

function contactReceivedAdminEmail(data, contactId) {
  return {
    subject: `[Admin] Lead web · ${safe(data.name, "Cliente")} · ${safe(data.propertyTitle, "Sin propiedad")}`,
    html: htmlWrapper(GRADIENTS.purple, `
      <div style="text-align:center;font-size:48px;margin-bottom:14px;">🛡️</div>
      <h1 class="title" style="color:#7c3aed;text-align:center;">Nuevo lead recibido</h1>
      <p class="subtitle" style="text-align:center;">
        Registro automático de lead capturado desde el sitio web. Disponible en el panel de consultas.
      </p>
      ${sectionCard("Datos del lead", [
        infoRow("Nombre",        safe(data.name, "—"),  "#1f2937"),
        infoRow("Correo",        safe(data.email, "—"), "#1e40af"),
        data.phone ? infoRow("Teléfono",    data.phone, "#166534") : "",
        data.propertyTitle ? infoRow("Propiedad",   data.propertyTitle, "#b8952a") : "",
        data.propertyId    ? infoRow("ID propiedad", data.propertyId, "#6b7280")  : "",
        contactId ? infoRow("ID consulta", contactId, "#6b7280") : "",
        data.source        ? infoRow("Origen",       data.source) : "",
        infoRow("Recibido", fmtDateTime(data.createdAt || new Date()), "#7c3aed"),
      ], { bg: "#faf5ff", border: "#e9d5ff" })}
      ${data.message ? sectionCard("Mensaje", [
        `<div style="font-size:14px;color:#3d3c38;line-height:1.7;padding:8px 0;">${escapeHtml(data.message)}</div>`,
      ]) : ""}
      ${noteBox({
        bg: "#f5f3ff", borderColor: "#7c3aed",
        title: "Asignación",
        body: data.propertyId
          ? "Este lead está vinculado a una propiedad — ya notificamos a su agente asignado. Solo interviene si en 24h no hay seguimiento registrado."
          : "Este lead llegó <strong>sin propiedad asociada</strong>. Asigna un agente desde el panel de consultas para que lo atienda.",
      })}
      ${ctaButtons(
        "Ver consultas",  `${BASE_URL}/contactos`,
        "Dashboard",      `${BASE_URL}/dashboard`,
        { primaryBg: "linear-gradient(135deg,#7c3aed,#6d28d9)", secondaryColor: "#7c3aed" }
      )}
    `),
  };
}

module.exports = {
  contactReceivedEmail,
  contactReceivedAgentEmail,
  contactReceivedAdminEmail,
};