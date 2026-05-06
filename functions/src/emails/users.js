// functions/src/emails/users.js
// Templates de email para el módulo de Usuarios.
//
// welcomeEmail diferencia por rol y muestra el mensaje + CTA correcto:
//   • viewer        → Bienvenida al portal cliente
//   • agent/member  → Bienvenida al panel de gestión
//   • admin         → Bienvenida al panel administrativo
//
// accessRequestNotificationEmail notifica a admins cuando alguien pide
// acceso al sistema desde /solicitar-acceso.

const { BASE_URL, WHATSAPP_URL, GRADIENTS, SUPPORT_EMAIL, FROM_NAME } = require("./config");
const { escapeHtml, safe, fmtCOP }                         = require("./utils");
const { htmlWrapper, infoRow, sectionCard, ctaButtons, noteBox } = require("./layout");

// ═══════════════════════════════════════════════════════════════════════════
//  Welcome — diferenciado por rol
// ═══════════════════════════════════════════════════════════════════════════

const ROLE_CONFIG = {
  viewer: {
    title:        "¡Bienvenido a tu portal!",
    intro:        "Tu cuenta en <strong style='color:#1f2937;'>Inmobiliaria Rincón Bedoya y Asociados</strong> ya está activa. Desde tu portal podrás seguir visitas, contratos, pagos, documentos y notificaciones en un solo lugar.",
    services: [
      ["Visitas",   "Solicitar, confirmar y consultar el estado de tus visitas"],
      ["Contratos", "Revisar fechas, estados, etapas y documentos asociados"],
      ["Pagos",     "Recibir recordatorios y confirmar pagos registrados"],
      ["Favoritos", "Guardar propiedades y retomarlas cuando quieras"],
    ],
    ctaPrimary:   { label: "Ir a mi portal",   path: "/portal" },
    ctaSecondary: { label: "Ver propiedades", path: "/catalogo" },
    suggestion:   "Ingresa al portal y verifica que tu correo, teléfono y datos personales estén correctos para asegurar la entrega de futuras notificaciones.",
    accent:       "#b8952a",
    gradient:     GRADIENTS.dark,
    emoji:        "🏠",
  },
  agent: {
    title:        "¡Bienvenido al equipo!",
    intro:        "Te damos la bienvenida al panel de gestión de <strong style='color:#1f2937;'>Inmobiliaria Rincón Bedoya y Asociados</strong>. Desde tu panel podrás gestionar propiedades, clientes, visitas y contratos.",
    services: [
      ["Propiedades", "Crear, editar y gestionar el catálogo asignado"],
      ["Clientes",    "Registrar leads, dar seguimiento y administrar tu cartera"],
      ["Visitas",     "Aprobar, agendar y dar seguimiento a las visitas"],
      ["Contratos",   "Crear contratos, registrar pagos y avanzar etapas"],
    ],
    ctaPrimary:   { label: "Ir al panel",       path: "/dashboard" },
    ctaSecondary: { label: "Ver propiedades",  path: "/propiedades" },
    suggestion:   "Configura tu perfil con foto, datos de contacto y firma para que aparezcan correctamente en los emails que reciban tus clientes.",
    accent:       "#1e40af",
    gradient:     GRADIENTS.navy,
    emoji:        "🏢",
  },
  admin: {
    title:        "¡Bienvenido, administrador!",
    intro:        "Tienes acceso completo al sistema de <strong style='color:#1f2937;'>Inmobiliaria Rincón Bedoya y Asociados</strong>. Desde aquí puedes gestionar usuarios, configurar la operación y supervisar todo el equipo.",
    services: [
      ["Dashboard",   "Métricas, KPIs, salud operativa y health score"],
      ["Usuarios",    "Crear agentes, administradores y gestionar accesos"],
      ["Solicitudes", "Aprobar nuevos accesos al portal cliente"],
      ["Reportes",    "Exportar datos de propiedades, contratos y pagos"],
    ],
    ctaPrimary:   { label: "Ir al dashboard",   path: "/dashboard" },
    ctaSecondary: { label: "Gestión de usuarios", path: "/usuarios" },
    suggestion:   "Revisa las solicitudes de acceso pendientes y configura los emails y datos del equipo desde el módulo de Configuración.",
    accent:       "#7c3aed",
    gradient:     GRADIENTS.purple,
    emoji:        "🛡️",
  },
};

// member es alias de agent
ROLE_CONFIG.member = ROLE_CONFIG.agent;

/**
 * Email de bienvenida personalizado por rol.
 * @param {object} data - Datos del usuario (displayName, email, phone, role)
 */
function welcomeEmail(data) {
  const firstName = safe(String(data.displayName || "Usuario").split(" ")[0], "Usuario");
  const role      = String(data.role || "viewer").toLowerCase();
  const cfg       = ROLE_CONFIG[role] || ROLE_CONFIG.viewer;

  const servicesList = cfg.services
    .map(([name, desc]) => infoRow(name, desc))
    .join("");

  return {
    subject: `${role === "viewer" ? "Bienvenido a Inmobiliaria RyB" : "Bienvenido al equipo"}, ${firstName}`,
    html: htmlWrapper(
      cfg.gradient,
      `
      <div style="text-align:center;font-size:56px;margin-bottom:20px;">${cfg.emoji}</div>
      <h1 class="title" style="text-align:center;color:${cfg.accent};">${cfg.title.replace("administrador", escapeHtml(firstName))}</h1>
      <p class="subtitle" style="text-align:center;">
        Hola <strong>${escapeHtml(firstName)}</strong>, ${cfg.intro}
      </p>
      ${sectionCard("Datos de tu cuenta", [
        infoRow("Nombre",   safe(data.displayName, "Usuario"),    "#1f2937"),
        infoRow("Correo",   safe(data.email, "No disponible"),   "#1e40af"),
        infoRow("Teléfono", safe(data.phone, "No registrado"),   "#166534"),
        infoRow("Rol",      role.toUpperCase(),                  cfg.accent),
        infoRow("Estado",   "Cuenta activa",                     "#166534"),
      ], { bg: "#f8fbff", border: "#dbeafe" })}
      ${sectionCard("Servicios disponibles", cfg.services.map(([name, desc]) => infoRow(name, desc)))}
      ${noteBox({
        bg: "#fffbeb", borderColor: "#f59e0b",
        title: "Sugerencia inicial",
        body: cfg.suggestion,
      })}
      ${ctaButtons(
        cfg.ctaPrimary.label,   `${BASE_URL}${cfg.ctaPrimary.path}`,
        cfg.ctaSecondary.label, `${BASE_URL}${cfg.ctaSecondary.path}`,
        { primaryBg: `linear-gradient(135deg,${cfg.accent},${cfg.accent}cc)`, secondaryColor: cfg.accent }
      )}
      <div class="divider"></div>
      <p class="tip" style="text-align:center;">
        Si necesitas ayuda, escríbenos a
        <a href="mailto:${SUPPORT_EMAIL}" style="color:${cfg.accent};font-weight:600;">${SUPPORT_EMAIL}</a>
        o por WhatsApp al
        <a href="${WHATSAPP_URL}" style="color:${cfg.accent};font-weight:600;">310 596 8202</a>.
      </p>`
    ),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  Nueva solicitud de acceso — al admin
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Email enviado a admins cuando alguien envía formulario en /solicitar-acceso.
 * @param {object} data - { name, email, phone, message }
 * @param {string} requestId - ID del documento en accessRequests
 */
function accessRequestNotificationEmail(data, requestId) {
  return {
    subject: `Nueva solicitud de acceso · ${safe(data.name, "Usuario")}`,
    html: htmlWrapper(GRADIENTS.amber, `
      <div style="text-align:center;font-size:56px;margin-bottom:18px;">📨</div>
      <h1 class="title" style="color:#92400e;text-align:center;">Nueva solicitud de acceso</h1>
      <p class="subtitle" style="text-align:center;">
        Una persona solicitó acceso al portal cliente.
        Revisa los datos y aprueba o rechaza desde el panel.
      </p>
      ${sectionCard("Datos del solicitante", [
        infoRow("Nombre",     safe(data.name, "No proporcionado"),   "#1f2937"),
        infoRow("Correo",     safe(data.email, "No disponible"),    "#1e40af"),
        infoRow("Teléfono",   safe(data.phone, "No registrado"),    "#166534"),
        requestId ? infoRow("ID solicitud", requestId, "#6b7280") : "",
      ], { bg: "#fffbeb", border: "#fde68a" })}
      ${data.message ? sectionCard("Mensaje del solicitante", [
        `<div style="font-size:14px;color:#3d3c38;line-height:1.7;padding:8px 0;">${escapeHtml(data.message)}</div>`,
      ]) : ""}
      ${noteBox({
        bg: "#fef3c7", borderColor: "#d97706",
        title: "Acción requerida",
        body: "Atender solicitudes en menos de 24h aumenta la conversión a clientes activos. Puedes responder por WhatsApp o aprobar el acceso desde el módulo de Solicitudes.",
      })}
      ${ctaButtons(
        "Ver solicitudes",        `${BASE_URL}/solicitudes`,
        "Contactar por WhatsApp", WHATSAPP_URL,
        { primaryBg: "linear-gradient(135deg,#92400e,#d97706)", secondaryColor: "#92400e" }
      )}
    `),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  Solicitud de acceso APROBADA — al solicitante
// ═══════════════════════════════════════════════════════════════════════════
//
// Auditoría: cuando el admin aprueba una solicitud en /solicitudes, antes
// el solicitante NO se enteraba por email. Solo veía el cambio si volvía
// al panel. Ahora recibe email con CTA al portal y, si aplica, sus credenciales.

/**
 * Email al solicitante cuando su solicitud de acceso es APROBADA.
 * @param {object} data - { name, email, assignedRole, approvedBy }
 */
function accessRequestApprovedEmail(data) {
  const role = String(data.assignedRole || "viewer").toLowerCase();
  const cfg  = ROLE_CONFIG[role] || ROLE_CONFIG.viewer;
  const firstName = safe(String(data.name || "").split(" ")[0], "");

  return {
    subject: `🎉 Tu acceso fue aprobado — ${FROM_NAME}`,
    html: htmlWrapper(GRADIENTS.emerald, `
      <div style="text-align:center;font-size:56px;margin-bottom:18px;">🎉</div>
      <h1 class="title" style="color:#166534;text-align:center;">¡Tu acceso fue aprobado!</h1>
      <p class="subtitle" style="text-align:center;">
        ${firstName ? `Hola <strong style="color:#1f2937;">${escapeHtml(firstName)}</strong>, ` : ""}buenas noticias:
        tu solicitud de acceso a <strong style="color:#1f2937;">${FROM_NAME}</strong> fue aprobada.
        Ya puedes ingresar al portal con el correo que registraste.
      </p>
      ${sectionCard("Datos de tu acceso", [
        infoRow("Correo",  safe(data.email, "No disponible"), "#1e40af"),
        infoRow("Rol",     role.toUpperCase(),                cfg.accent),
        infoRow("Estado",  "Activo",                          "#166534"),
      ], { bg: "#f0fdf4", border: "#bbf7d0" })}
      ${noteBox({
        bg: "#dbeafe", borderColor: "#2563eb",
        title: "Primer ingreso",
        body: "Inicia sesión con el correo que registraste. Si aún no tienes contraseña, usa la opción <strong>\"¿Olvidaste tu contraseña?\"</strong> para crear una. Si te creamos una cuenta directamente, recibirás otro correo aparte con esos datos.",
      })}
      ${ctaButtons(
        "Ingresar al portal", `${BASE_URL}/acceso-clientes`,
        "💬 WhatsApp",        WHATSAPP_URL,
        { primaryBg: "linear-gradient(135deg,#166534,#15803d)", secondaryColor: "#166534" }
      )}
      <div class="divider"></div>
      <p class="tip" style="text-align:center;">
        Si tienes dudas, escríbenos a
        <a href="mailto:${SUPPORT_EMAIL}" style="color:#166534;font-weight:600;">${SUPPORT_EMAIL}</a>.
      </p>
    `),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  Solicitud de acceso RECHAZADA — al solicitante
// ═══════════════════════════════════════════════════════════════════════════
//
// Auditoría: igual que arriba, antes el solicitante quedaba en silencio
// cuando la solicitud era rechazada. Ahora recibe un email cordial.

function accessRequestRejectedEmail(data) {
  const firstName = safe(String(data.name || "").split(" ")[0], "");
  return {
    subject: `Actualización sobre tu solicitud de acceso — ${FROM_NAME}`,
    html: htmlWrapper(GRADIENTS.dark, `
      <div style="text-align:center;font-size:56px;margin-bottom:18px;">📬</div>
      <h1 class="title" style="color:#b8952a;text-align:center;">Solicitud revisada</h1>
      <p class="subtitle" style="text-align:center;">
        ${firstName ? `Hola <strong style="color:#1f2937;">${escapeHtml(firstName)}</strong>, ` : ""}gracias por tu interés en
        <strong style="color:#1f2937;">${FROM_NAME}</strong>.
        Tras revisar tu solicitud, no podemos otorgarte acceso al portal en este momento.
      </p>
      ${noteBox({
        bg: "#fffbeb", borderColor: "#f59e0b",
        title: "¿Qué puedes hacer?",
        body: "• Si crees que se trata de un error, contáctanos por WhatsApp.<br/>• Puedes seguir explorando nuestras propiedades públicamente sin necesidad de cuenta.<br/>• Si quieres que te asignemos un asesor directo, escríbenos y con gusto te atendemos.",
      })}
      ${ctaButtons(
        "💬 Escribirnos por WhatsApp", WHATSAPP_URL,
        "Ver propiedades",             `${BASE_URL}/propiedades`,
        { primaryBg: "linear-gradient(135deg,#b8952a,#d4a836)", secondaryColor: "#b8952a" }
      )}
      <div class="divider"></div>
      <p class="tip" style="text-align:center;">
        Lamentamos no poder ayudarte en este momento. Seguimos a tu disposición.
      </p>
    `),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  Invitación manual al portal — al cliente (enviada por agente/admin)
// ═══════════════════════════════════════════════════════════════════════════
//
// Auditoría: ClientDetail.jsx tenía un template inline antiguo, dark-mode,
// sin layout corporativo, hardcodeado. Ahora se centraliza aquí y se invoca
// vía la extensión /mail desde el frontend (clientInviteEmail.html).

function clientInviteEmail({ clientName, fromAgentName }) {
  const firstName = safe(String(clientName || "").split(" ")[0], "Cliente");
  return {
    subject: `🏠 Tu portal personal está listo — ${FROM_NAME}`,
    html: htmlWrapper(GRADIENTS.dark, `
      <div style="text-align:center;font-size:56px;margin-bottom:18px;">🏠</div>
      <h1 class="title" style="color:#b8952a;text-align:center;">Tu portal personal está listo</h1>
      <p class="subtitle" style="text-align:center;">
        Hola <strong style="color:#1f2937;">${escapeHtml(firstName)}</strong>,
        ${fromAgentName ? `<strong>${escapeHtml(fromAgentName)}</strong> te ha habilitado` : "te hemos habilitado"}
        un portal exclusivo en <strong>${FROM_NAME}</strong> para que gestiones tus propiedades favoritas, visitas y contratos en un solo lugar.
      </p>
      ${sectionCard("¿Qué puedes hacer en tu portal?", [
        infoRow("Propiedades", "Guardar favoritos y comparar opciones"),
        infoRow("Visitas",     "Solicitar, revisar y gestionar tus visitas"),
        infoRow("Contratos",   "Consultar el estado, etapa y pagos"),
        infoRow("Documentos",  "Descargar comprobantes y documentos firmados"),
      ], { bg: "#f8fbff", border: "#dbeafe" })}
      ${noteBox({
        bg: "#fffbeb", borderColor: "#f59e0b",
        title: "Cómo entrar",
        body: "Ingresa con el correo en el que recibes este mensaje. Si es la primera vez, usa <strong>\"Crear contraseña\"</strong> en la pantalla de login. Cualquier duda, escríbenos por WhatsApp.",
      })}
      ${ctaButtons(
        "Acceder al portal",  `${BASE_URL}/acceso-clientes`,
        "💬 WhatsApp",        WHATSAPP_URL,
        { primaryBg: "linear-gradient(135deg,#b8952a,#d4a836)", secondaryColor: "#b8952a" }
      )}
    `),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  Solicitud de eliminación de cuenta — a admins
// ═══════════════════════════════════════════════════════════════════════════
//
// Auditoría: profile.service.js .requestAccountDeletion crea un doc en
// /accountDeletionRequests pero los admins NO recibían email. Quedaban
// ciegos hasta abrir el panel.

function accountDeletionRequestEmail(data, requestId) {
  return {
    subject: `[Admin] Solicitud de eliminación de cuenta · ${safe(data.email, "—")}`,
    html: htmlWrapper(GRADIENTS.crimson, `
      <div style="text-align:center;font-size:56px;margin-bottom:18px;">🗑️</div>
      <h1 class="title" style="color:#991b1b;text-align:center;">Solicitud de eliminación de cuenta</h1>
      <p class="subtitle" style="text-align:center;">
        Un usuario solicitó eliminar permanentemente su cuenta. Revisa el caso antes de procesar.
      </p>
      ${sectionCard("Datos del solicitante", [
        infoRow("Email", safe(data.email, "—"),  "#991b1b"),
        infoRow("UID",   safe(data.uid,   "—"),  "#6b7280"),
        requestId ? infoRow("ID solicitud", requestId, "#6b7280") : "",
      ], { bg: "#fef2f2", border: "#fecaca" })}
      ${data.reason ? sectionCard("Motivo declarado", [
        `<div style="font-size:14px;color:#3d3c38;line-height:1.7;padding:8px 0;">${escapeHtml(data.reason)}</div>`,
      ]) : noteBox({
        bg: "#fef2f2", borderColor: "#dc2626",
        title: "Sin motivo declarado",
        body: "El usuario no especificó razón. Considera contactarlo antes de eliminar — puede tratarse de una decisión emocional reversible.",
      })}
      ${noteBox({
        bg: "#fffbeb", borderColor: "#f59e0b",
        title: "Acción requerida",
        body: "Antes de eliminar verifica: contratos activos, visitas pendientes, pagos sin liquidar. Si todo está en orden, procede desde el módulo de Usuarios.",
      })}
      ${ctaButtons(
        "Ver módulo de usuarios", `${BASE_URL}/usuarios`,
        "Dashboard",              `${BASE_URL}/dashboard`,
        { primaryBg: "linear-gradient(135deg,#991b1b,#b91c1c)", secondaryColor: "#991b1b" }
      )}
    `),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  Verificación de email (link custom — reemplaza Firebase Auth template)
// ═══════════════════════════════════════════════════════════════════════════
//
// Email enviado al cliente justo después del registro. Reemplaza el correo
// de verificación de Firebase Auth (que NO se puede personalizar). Usa el
// layout corporativo y un CTA con link único.
//
// El welcome NO se envía aquí — solo después de que el cliente haga click
// en este link y la CF confirmEmailVerification dispare onUserUpdated.

function emailVerificationLinkEmail({ displayName, email, verifyUrl, ttlHours }) {
  const firstName = safe(String(displayName || "").split(" ")[0], "");
  return {
    subject: `Confirma tu correo · ${FROM_NAME}`,
    html: htmlWrapper(GRADIENTS.dark, `
      <div style="text-align:center;font-size:56px;margin-bottom:18px;">✉️</div>
      <h1 class="title" style="color:#b8952a;text-align:center;">Confirma tu correo</h1>
      <p class="subtitle" style="text-align:center;">
        ${firstName ? `Hola <strong style="color:#1f2937;">${escapeHtml(firstName)}</strong>, gracias` : "Gracias"} por registrarte en
        <strong style="color:#1f2937;">${FROM_NAME}</strong>.
        Para activar tu cuenta y entrar al portal, confirma este correo
        haciendo click en el botón.
      </p>
      ${ctaButtons(
        "✓ Confirmar mi correo", verifyUrl,
        "", "",
        { primaryBg: "linear-gradient(135deg,#b8952a,#d4a836)" }
      )}
      ${noteBox({
        bg: "#fffbeb", borderColor: "#f59e0b",
        title: "Importante",
        body: `Este enlace es válido por <strong>${ttlHours} horas</strong> y solo puede usarse una vez. Si no fuiste tú quien se registró, ignora este mensaje — la cuenta no se activará sin esta confirmación.`,
      })}
      <div class="divider"></div>
      <p class="tip" style="text-align:center;">
        ¿No te funciona el botón? Copia y pega este enlace en tu navegador:<br/>
        <a href="${verifyUrl}" style="color:#b8952a;word-break:break-all;font-size:12px;">${verifyUrl}</a>
      </p>
      <p class="tip" style="text-align:center;margin-top:18px;">
        Si tienes dudas, escríbenos a
        <a href="mailto:${SUPPORT_EMAIL}" style="color:#b8952a;font-weight:600;">${SUPPORT_EMAIL}</a>
        o por WhatsApp al
        <a href="${WHATSAPP_URL}" style="color:#b8952a;font-weight:600;">310 596 8202</a>.
      </p>
    `),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  Configuración de contraseña — staff recién creado por admin
// ═══════════════════════════════════════════════════════════════════════════
//
// Email enviado a un usuario interno (admin/member/agent) cuando un
// administrador acaba de crear su cuenta. NO es el welcome — es el paso
// previo: el usuario debe configurar su contraseña antes de poder entrar.
// El welcome del equipo se manda DESPUÉS, cuando el usuario inicia sesión
// por primera vez (status pasa de pending a active y onUserUpdated lo
// dispara).
//
// Usa generatePasswordResetLink de Admin SDK por debajo, no el email
// nativo de Firebase (cuya plantilla no puede personalizarse).

function staffPasswordSetupEmail({ displayName, email, role, setupLink }) {
  const firstName = safe(String(displayName || "").split(" ")[0], "");
  const roleKey = String(role || "member").toLowerCase();
  const cfg = ROLE_CONFIG[roleKey] || ROLE_CONFIG.agent;

  return {
    subject: `Configura tu acceso al panel · ${FROM_NAME}`,
    html: htmlWrapper(cfg.gradient, `
      <div style="text-align:center;font-size:56px;margin-bottom:18px;">🔐</div>
      <h1 class="title" style="color:${cfg.accent};text-align:center;">Configura tu contraseña</h1>
      <p class="subtitle" style="text-align:center;">
        ${firstName ? `Hola <strong style="color:#1f2937;">${escapeHtml(firstName)}</strong>, ` : ""}un administrador
        creó una cuenta para ti en <strong style="color:#1f2937;">${FROM_NAME}</strong>.
        Antes de poder entrar al panel, configura tu contraseña haciendo click en el botón.
      </p>
      ${sectionCard("Datos de tu cuenta", [
        infoRow("Correo", safe(email, "—"), "#1e40af"),
        infoRow("Rol",    roleKey.toUpperCase(), cfg.accent),
        infoRow("Estado", "Pendiente de activación", "#92400e"),
      ], { bg: "#f8fbff", border: "#dbeafe" })}
      ${ctaButtons(
        "Configurar mi contraseña", setupLink,
        "", "",
        { primaryBg: `linear-gradient(135deg,${cfg.accent},${cfg.accent}cc)` }
      )}
      ${noteBox({
        bg: "#fffbeb", borderColor: "#f59e0b",
        title: "Cómo funciona",
        body: "Al hacer click crearás tu contraseña personal. Tras configurarla, podrás iniciar sesión en el panel y recibirás un correo de bienvenida con la información del equipo. Si no fuiste tú quien debía recibir esto, contacta al administrador.",
      })}
      <div class="divider"></div>
      <p class="tip" style="text-align:center;">
        ¿No te funciona el botón? Copia y pega este enlace en tu navegador:<br/>
        <a href="${setupLink}" style="color:${cfg.accent};word-break:break-all;font-size:12px;">${setupLink}</a>
      </p>
      <p class="tip" style="text-align:center;margin-top:18px;">
        Si tienes dudas, escríbenos a
        <a href="mailto:${SUPPORT_EMAIL}" style="color:${cfg.accent};font-weight:600;">${SUPPORT_EMAIL}</a>.
      </p>
    `),
  };
}

module.exports = {
  welcomeEmail,
  accessRequestNotificationEmail,
  accessRequestApprovedEmail,
  accessRequestRejectedEmail,
  clientInviteEmail,
  accountDeletionRequestEmail,
  emailVerificationLinkEmail,
  staffPasswordSetupEmail,
};