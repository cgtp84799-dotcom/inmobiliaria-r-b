// src/emails/users.js
// ─── Templates de email para el módulo de Usuarios ───────────────────────────

const { BASE_URL, WHATSAPP_URL, GRADIENTS, SUPPORT_EMAIL } = require("./config");
const { escapeHtml, safe, fmtCOP }                         = require("./utils");
const { htmlWrapper, infoRow, sectionCard, ctaButtons, noteBox } = require("./layout");

/**
 * Email de bienvenida al CLIENTE cuando se crea su cuenta (role: "viewer").
 * @param {object} data - Datos del usuario (displayName, email, phone)
 */
function welcomeEmail(data) {
  const firstName = safe(String(data.displayName || "Cliente").split(" ")[0], "Cliente");
  return {
    subject: `¡Bienvenido a Inmobiliaria RyB, ${firstName}!`,
    html: htmlWrapper(
      GRADIENTS.dark,
      `
      <div style="text-align:center;font-size:56px;margin-bottom:20px;">🏠</div>
      <h1 class="title" style="text-align:center;color:#b8952a;">¡Bienvenido, ${escapeHtml(firstName)}!</h1>
      <p class="subtitle" style="text-align:center;">
        Tu cuenta en <strong style="color:#1f2937;">Inmobiliaria Rincón Bedoya y Asociados</strong> ya está activa.
        Desde tu portal podrás seguir visitas, contratos, pagos, documentos y notificaciones en un solo lugar.
      </p>
      ${sectionCard("Datos de tu cuenta", [
        infoRow("Nombre",   safe(data.displayName, "Cliente"), "#1f2937"),
        infoRow("Correo",   safe(data.email, "No disponible"), "#1e40af"),
        infoRow("Teléfono", safe(data.phone, "No registrado"), "#166534"),
        infoRow("Estado",   "Cuenta activa",                   "#166534"),
      ], { bg: "#f8fbff", border: "#dbeafe" })}
      ${sectionCard("Servicios disponibles", [
        infoRow("Visitas",    "Solicitar, confirmar y consultar el estado de tus visitas"),
        infoRow("Contratos",  "Revisar fechas, estados, etapas y documentos asociados"),
        infoRow("Pagos",      "Recibir recordatorios y confirmar pagos registrados"),
        infoRow("Favoritos",  "Guardar propiedades y retomarlas cuando quieras"),
      ])}
      ${noteBox({
        bg: "#fffbeb", borderColor: "#f59e0b",
        title: "Sugerencia inicial",
        body: "Ingresa al portal y verifica que tu correo, teléfono y datos personales estén correctos para asegurar la entrega de futuras notificaciones.",
      })}
      ${ctaButtons(
        "Ir a mi portal",    `${BASE_URL}/portal`,
        "Ver propiedades",   `${BASE_URL}/catalogo`,
        { primaryBg: "linear-gradient(135deg,#b8952a,#d4a836)", secondaryColor: "#b8952a" }
      )}
      <div class="divider"></div>
      <p class="tip" style="text-align:center;">
        Si necesitas ayuda, escríbenos a
        <a href="mailto:${SUPPORT_EMAIL}" style="color:#b8952a;font-weight:600;">${SUPPORT_EMAIL}</a>
        o por WhatsApp al
        <a href="${WHATSAPP_URL}" style="color:#b8952a;font-weight:600;">310 596 8202</a>.
      </p>`
    ),
  };
}

module.exports = { welcomeEmail };
