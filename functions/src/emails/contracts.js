// functions/src/emails/contracts.js
// ─── Templates de email para el módulo de Contratos ──────────────────────────
//
// AUDITORÍA (ronda contratos):
// - Antes existía un único builder genérico `contractUpdatedEmail` que se
//   disparaba para CUALQUIER cambio de estado o etapa. El cliente recibía el
//   mismo email visual para "Cuota inicial pagada" que para "Canon en mora".
//   Mal UX, baja accionabilidad.
//
// - Ahora cada etapa relevante del ciclo de venta y arriendo tiene su propio
//   builder con copy, color, emoji y CTA contextual. El backend (functions/
//   index.js) decide cuál disparar según `after.businessStage`.
//
// - Diferenciación visual:
//     • VENTA  → gradient navy + emoji 🏠 / 📜 / 🔑
//     • ARRIENDO → gradient emerald + emoji 🏘️ / 💰 / ⏰
//
// - El builder genérico `contractUpdatedEmail` se conserva como fallback para
//   etapas no mapeadas (ej. cancelado, pausado, draft).

const { BASE_URL, WHATSAPP_URL, GRADIENTS } = require("./config");
const {
  escapeHtml, safe,
  fmtCOP, fmtDate,
  contractTypeLabel, statusLabel, stageLabel,
} = require("./utils");
const { htmlWrapper, infoRow, sectionCard, ctaButtons, noteBox } = require("./layout");

// ═══════════════════════════════════════════════════════════════════════════
//  PALETA POR TIPO DE OPERACIÓN
// ═══════════════════════════════════════════════════════════════════════════

const SALE_THEME = {
  gradient:     GRADIENTS.navy,
  primaryColor: "#1e40af",
  primaryGrad:  "linear-gradient(135deg,#1e40af,#2563eb)",
  cardBg:       "#f8fbff",
  cardBorder:   "#dbeafe",
};

const RENT_THEME = {
  gradient:     GRADIENTS.emerald,
  primaryColor: "#166534",
  primaryGrad:  "linear-gradient(135deg,#166534,#15803d)",
  cardBg:       "#f0fdf4",
  cardBorder:   "#bbf7d0",
};

const URGENT_THEME = {
  gradient:     GRADIENTS.crimson,
  primaryColor: "#991b1b",
  primaryGrad:  "linear-gradient(135deg,#991b1b,#b91c1c)",
  cardBg:       "#fef2f2",
  cardBorder:   "#fecaca",
};

const SUCCESS_THEME = {
  gradient:     GRADIENTS.gold,
  primaryColor: "#14532d",
  primaryGrad:  "linear-gradient(135deg,#14532d,#166534)",
  cardBg:       "#f0fdf4",
  cardBorder:   "#bbf7d0",
};

// ═══════════════════════════════════════════════════════════════════════════
//  HELPERS — bloques reutilizables
// ═══════════════════════════════════════════════════════════════════════════

function _portalCTA(theme) {
  return ctaButtons(
    "Ver en mi portal",       `${BASE_URL}/portal`,
    "Contactar por WhatsApp", WHATSAPP_URL,
    { primaryBg: theme.primaryGrad, secondaryColor: theme.primaryColor }
  );
}

function _financialBlock(data, theme) {
  const f = data.financial || {};
  const rows = [
    infoRow("Valor principal", fmtCOP(data.value || f.baseValue), theme.primaryColor),
    (f.adminFee || data.adminFee)         && infoRow("Administración", fmtCOP(f.adminFee || data.adminFee),         theme.primaryColor),
    (f.deposit  || data.deposit)          && infoRow("Depósito",       fmtCOP(f.deposit  || data.deposit),          theme.primaryColor),
    (f.initialPayment || data.initialPayment) && infoRow("Pago inicial", fmtCOP(f.initialPayment || data.initialPayment), theme.primaryColor),
    (f.balance  || data.balance)          && infoRow("Saldo",          fmtCOP(f.balance  || data.balance),          "#92400e"),
    (f.paymentDay || data.paymentDay)     && infoRow("Día de pago",    String(f.paymentDay || data.paymentDay),     theme.primaryColor),
  ].filter(Boolean);
  return sectionCard("Condiciones económicas", rows, { bg: theme.cardBg, border: theme.cardBorder });
}

function _propertyBlock(data, theme) {
  return sectionCard("Resumen", [
    infoRow("Propiedad", safe(data.propertyName, "Propiedad"), theme.primaryColor),
    data.propertyAddress ? infoRow("Dirección", data.propertyAddress) : "",
    infoRow("Tipo",      contractTypeLabel(data.type),         theme.primaryColor),
    data.agentName  ? infoRow("Agente",         data.agentName,         theme.primaryColor) : "",
    data.agentEmail ? infoRow("Correo agente",  data.agentEmail)                            : "",
  ], { bg: theme.cardBg, border: theme.cardBorder });
}

// ═══════════════════════════════════════════════════════════════════════════
//  CREACIÓN DE CONTRATO — al cliente
// ═══════════════════════════════════════════════════════════════════════════

function contractCreatedEmail(data, contractId) {
  const isRent = String(data.type || "").toLowerCase().includes("arriendo")
              || String(data.type || "").toLowerCase().includes("rent");
  const theme = isRent ? RENT_THEME : SALE_THEME;
  const emoji = isRent ? "🏘️" : "📄";
  const title = isRent ? "Tu contrato de arriendo está listo" : "Nuevo contrato registrado";

  return {
    subject: `${isRent ? "Arriendo" : "Contrato"} registrado · ${safe(data.propertyName, "Propiedad")}`,
    html: htmlWrapper(theme.gradient, `
      <div style="text-align:center;font-size:56px;margin-bottom:18px;">${emoji}</div>
      <h1 class="title" style="color:${theme.primaryColor};text-align:center;">${title}</h1>
      <p class="subtitle" style="text-align:center;">
        Hola <strong style="color:#1f2937;">${escapeHtml(safe(data.clientName, "Cliente"))}</strong>,
        registramos un nuevo contrato asociado a tu perfil.
      </p>
      ${sectionCard("Resumen del contrato", [
        infoRow("Código",    safe(contractId, "No disponible"),               "#1f2937"),
        infoRow("Tipo",      contractTypeLabel(data.type),                    theme.primaryColor),
        infoRow("Estado",    statusLabel(data.statusGeneral || data.status),  theme.primaryColor),
        infoRow("Propiedad", safe(data.propertyName, "Propiedad"),            theme.primaryColor),
        data.propertyAddress ? infoRow("Dirección",  data.propertyAddress) : "",
      ], { bg: theme.cardBg, border: theme.cardBorder })}
      ${_financialBlock(data, theme)}
      ${sectionCard("Fechas y responsable", [
        data.startDate  ? infoRow("Inicio", fmtDate(data.startDate),  theme.primaryColor) : "",
        data.endDate    ? infoRow("Fin",    fmtDate(data.endDate),    "#92400e")           : "",
        data.agentName  ? infoRow("Agente", data.agentName,           theme.primaryColor) : "",
      ])}
      ${noteBox({
        bg: "#eff6ff", borderColor: "#3b82f6",
        title: "Próximos pasos",
        body: isRent
          ? "En tu portal podrás revisar el contrato firmado, consultar pagos próximos y recibir alertas sobre el canon mensual."
          : "Desde tu portal podrás hacer seguimiento al avance del contrato (promesa, escritura, registro y entrega).",
      })}
      ${_portalCTA(theme)}
    `),
  };
}

function contractCreatedAgentEmail(data) {
  return {
    subject: `Contrato registrado · ${safe(data.propertyName, "Propiedad")} · ${safe(data.clientName, "Cliente")}`,
    html: htmlWrapper(GRADIENTS.agent, `
      <div style="text-align:center;font-size:56px;margin-bottom:18px;">📌</div>
      <h1 class="title" style="color:#b8952a;text-align:center;">Contrato bajo tu gestión</h1>
      <p class="subtitle" style="text-align:center;">
        Hola <strong style="color:#1f2937;">${escapeHtml(safe(data.agentName, "Agente"))}</strong>,
        se registró un nuevo contrato asignado a ti.
      </p>
      ${sectionCard("Resumen de gestión", [
        infoRow("Cliente",   safe(data.clientName, "Cliente"),                       "#1f2937"),
        infoRow("Propiedad", safe(data.propertyName, "Propiedad"),                   "#b8952a"),
        infoRow("Tipo",      contractTypeLabel(data.type),                           "#1e40af"),
        infoRow("Valor",     fmtCOP(data.value || data.financial?.baseValue),        "#166534"),
        infoRow("Estado",    statusLabel(data.statusGeneral || data.status),         "#166534"),
      ], { bg: "#f8fbff", border: "#dbeafe" })}
      ${ctaButtons(
        "Ver en el panel", `${BASE_URL}/contratos`, "", "",
        { primaryBg: "linear-gradient(135deg,#b8952a,#d4a836)" }
      )}
    `),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  ETAPAS DE VENTA — emails específicos
// ═══════════════════════════════════════════════════════════════════════════

function saleReserveEmail(data) {
  return {
    subject: `Reserva confirmada · ${safe(data.propertyName, "Propiedad")}`,
    html: htmlWrapper(SALE_THEME.gradient, `
      <div style="text-align:center;font-size:56px;margin-bottom:18px;">🔒</div>
      <h1 class="title" style="color:${SALE_THEME.primaryColor};text-align:center;">Reserva confirmada</h1>
      <p class="subtitle" style="text-align:center;">
        Hola <strong style="color:#1f2937;">${escapeHtml(safe(data.clientName, "Cliente"))}</strong>,
        hemos formalizado la reserva de <strong>${escapeHtml(safe(data.propertyName, "la propiedad"))}</strong>.
        A partir de este momento, la propiedad se retira temporalmente del mercado.
      </p>
      ${_propertyBlock(data, SALE_THEME)}
      ${noteBox({
        bg: "#fef3c7", borderColor: "#d97706",
        title: "Próximos pasos",
        body: "El siguiente paso es la firma de la promesa de compraventa. Tu agente te contactará para coordinar fecha y revisar la documentación necesaria (cédula, certificados de ingresos si aplica financiación).",
      })}
      ${_portalCTA(SALE_THEME)}
    `),
  };
}

function salePromiseSignedEmail(data) {
  return {
    subject: `Promesa firmada · ${safe(data.propertyName, "Propiedad")}`,
    html: htmlWrapper(SALE_THEME.gradient, `
      <div style="text-align:center;font-size:56px;margin-bottom:18px;">📜</div>
      <h1 class="title" style="color:${SALE_THEME.primaryColor};text-align:center;">Promesa de compraventa firmada</h1>
      <p class="subtitle" style="text-align:center;">
        ¡Felicitaciones <strong style="color:#1f2937;">${escapeHtml(safe(data.clientName, "Cliente"))}</strong>!
        La promesa de compraventa de <strong>${escapeHtml(safe(data.propertyName, "tu propiedad"))}</strong> ya está firmada.
      </p>
      ${_propertyBlock(data, SALE_THEME)}
      ${_financialBlock(data, SALE_THEME)}
      ${noteBox({
        bg: "#dbeafe", borderColor: "#2563eb",
        title: "¿Qué sigue?",
        body: "Si tu compra requiere financiación, ahora es el momento de gestionar el crédito o leasing con tu entidad financiera. Si es de contado, coordinaremos la cuota inicial y luego la escrituración.",
      })}
      ${_portalCTA(SALE_THEME)}
    `),
  };
}

function saleInitialPaymentEmail(data) {
  return {
    subject: `Cuota inicial procesada · ${safe(data.propertyName, "Propiedad")}`,
    html: htmlWrapper(SALE_THEME.gradient, `
      <div style="text-align:center;font-size:56px;margin-bottom:18px;">💵</div>
      <h1 class="title" style="color:${SALE_THEME.primaryColor};text-align:center;">Cuota inicial recibida</h1>
      <p class="subtitle" style="text-align:center;">
        Hola <strong style="color:#1f2937;">${escapeHtml(safe(data.clientName, "Cliente"))}</strong>,
        confirmamos la recepción de tu cuota inicial. Te acercas más a tu nuevo hogar.
      </p>
      ${_financialBlock(data, SALE_THEME)}
      ${noteBox({
        bg: "#dbeafe", borderColor: "#2563eb",
        title: "Próximos pasos",
        body: "Procederemos con la preparación de la minuta de escrituración. Tu agente coordinará la fecha de firma en notaría.",
      })}
      ${_portalCTA(SALE_THEME)}
    `),
  };
}

function saleMortgageApprovedEmail(data) {
  return {
    subject: `Crédito aprobado · ${safe(data.propertyName, "Propiedad")}`,
    html: htmlWrapper(SUCCESS_THEME.gradient, `
      <div style="text-align:center;font-size:56px;margin-bottom:18px;">✅</div>
      <h1 class="title" style="color:${SUCCESS_THEME.primaryColor};text-align:center;">¡Tu crédito fue aprobado!</h1>
      <p class="subtitle" style="text-align:center;">
        Excelente noticia <strong style="color:#1f2937;">${escapeHtml(safe(data.clientName, "Cliente"))}</strong>.
        El crédito hipotecario para <strong>${escapeHtml(safe(data.propertyName, "tu propiedad"))}</strong> ha sido aprobado.
      </p>
      ${_propertyBlock(data, SUCCESS_THEME)}
      ${noteBox({
        bg: "#d1fae5", borderColor: "#059669",
        title: "Próximos pasos",
        body: "Ahora coordinaremos la escrituración. La entidad financiera y nuestro equipo legal trabajarán en conjunto para agendar la firma en notaría.",
      })}
      ${_portalCTA(SUCCESS_THEME)}
    `),
  };
}

function saleDeedSignedEmail(data) {
  return {
    subject: `Escritura firmada · ${safe(data.propertyName, "Propiedad")}`,
    html: htmlWrapper(SUCCESS_THEME.gradient, `
      <div style="text-align:center;font-size:56px;margin-bottom:18px;">📜</div>
      <h1 class="title" style="color:${SUCCESS_THEME.primaryColor};text-align:center;">Escritura firmada</h1>
      <p class="subtitle" style="text-align:center;">
        ¡Felicitaciones <strong style="color:#1f2937;">${escapeHtml(safe(data.clientName, "Cliente"))}</strong>!
        Hoy firmaste la escritura de <strong>${escapeHtml(safe(data.propertyName, "tu propiedad"))}</strong>.
        Es un paso enorme.
      </p>
      ${_propertyBlock(data, SUCCESS_THEME)}
      ${noteBox({
        bg: "#d1fae5", borderColor: "#059669",
        title: "¿Qué sigue?",
        body: "Ahora gestionaremos el registro de la escritura ante la Oficina de Registro de Instrumentos Públicos. Una vez registrada, te haremos entrega oficial de la propiedad.",
      })}
      ${_portalCTA(SUCCESS_THEME)}
    `),
  };
}

function saleRegisteredEmail(data) {
  return {
    subject: `Propiedad registrada · ${safe(data.propertyName, "Propiedad")}`,
    html: htmlWrapper(SUCCESS_THEME.gradient, `
      <div style="text-align:center;font-size:56px;margin-bottom:18px;">🏛️</div>
      <h1 class="title" style="color:${SUCCESS_THEME.primaryColor};text-align:center;">Tu propiedad está registrada</h1>
      <p class="subtitle" style="text-align:center;">
        Hola <strong style="color:#1f2937;">${escapeHtml(safe(data.clientName, "Cliente"))}</strong>,
        la escritura de <strong>${escapeHtml(safe(data.propertyName, "tu propiedad"))}</strong> ha sido registrada
        oficialmente. Eres dueño legal con todos los efectos.
      </p>
      ${_propertyBlock(data, SUCCESS_THEME)}
      ${noteBox({
        bg: "#d1fae5", borderColor: "#059669",
        title: "Próximo paso",
        body: "Coordinaremos la entrega física de la propiedad: llaves, inventario, lectura de servicios públicos.",
      })}
      ${_portalCTA(SUCCESS_THEME)}
    `),
  };
}

function saleDeliveredEmail(data) {
  return {
    subject: `🎉 Entrega realizada · ${safe(data.propertyName, "Propiedad")}`,
    html: htmlWrapper(SUCCESS_THEME.gradient, `
      <div style="text-align:center;font-size:56px;margin-bottom:18px;">🔑</div>
      <h1 class="title" style="color:${SUCCESS_THEME.primaryColor};text-align:center;">¡Bienvenido a tu nuevo hogar!</h1>
      <p class="subtitle" style="text-align:center;">
        Hola <strong style="color:#1f2937;">${escapeHtml(safe(data.clientName, "Cliente"))}</strong>,
        hoy te hicimos entrega oficial de <strong>${escapeHtml(safe(data.propertyName, "tu propiedad"))}</strong>.
        Gracias por confiar en nosotros para este momento tan importante.
      </p>
      ${_propertyBlock(data, SUCCESS_THEME)}
      ${noteBox({
        bg: "#fef3c7", borderColor: "#d97706",
        title: "Recordatorios",
        body: "• Cambia los servicios públicos a tu nombre.<br>• Conserva la copia de la escritura registrada.<br>• Si necesitas referidos para mantenimiento o seguros, escríbenos.",
      })}
      ${_portalCTA(SUCCESS_THEME)}
    `),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  ETAPAS DE ARRIENDO — emails específicos
// ═══════════════════════════════════════════════════════════════════════════

function rentSignedEmail(data) {
  return {
    subject: `Contrato de arriendo firmado · ${safe(data.propertyName, "Propiedad")}`,
    html: htmlWrapper(RENT_THEME.gradient, `
      <div style="text-align:center;font-size:56px;margin-bottom:18px;">✍️</div>
      <h1 class="title" style="color:${RENT_THEME.primaryColor};text-align:center;">Contrato de arriendo firmado</h1>
      <p class="subtitle" style="text-align:center;">
        Hola <strong style="color:#1f2937;">${escapeHtml(safe(data.clientName, "Cliente"))}</strong>,
        ya firmaste tu contrato de arriendo de <strong>${escapeHtml(safe(data.propertyName, "la propiedad"))}</strong>.
      </p>
      ${_propertyBlock(data, RENT_THEME)}
      ${_financialBlock(data, RENT_THEME)}
      ${noteBox({
        bg: "#d1fae5", borderColor: "#059669",
        title: "Próximos pasos",
        body: "Coordinaremos la entrega de llaves y el inventario inicial. Recibirás recordatorios automáticos antes de cada fecha de pago del canon.",
      })}
      ${_portalCTA(RENT_THEME)}
    `),
  };
}

function rentActiveEmail(data) {
  return {
    subject: `Arriendo activo · ${safe(data.propertyName, "Propiedad")}`,
    html: htmlWrapper(RENT_THEME.gradient, `
      <div style="text-align:center;font-size:56px;margin-bottom:18px;">🏘️</div>
      <h1 class="title" style="color:${RENT_THEME.primaryColor};text-align:center;">Bienvenido a tu nuevo arriendo</h1>
      <p class="subtitle" style="text-align:center;">
        Hola <strong style="color:#1f2937;">${escapeHtml(safe(data.clientName, "Cliente"))}</strong>,
        tu arriendo de <strong>${escapeHtml(safe(data.propertyName, "la propiedad"))}</strong> ya está activo.
        Ya puedes ocuparla.
      </p>
      ${_propertyBlock(data, RENT_THEME)}
      ${noteBox({
        bg: "#d1fae5", borderColor: "#059669",
        title: "Recordatorio importante",
        body: `El día <strong>${escapeHtml(String(data.financial?.paymentDay || data.paymentDay || "—"))}</strong> de cada mes vence tu canon. Te enviaremos recordatorios antes y después de la fecha.`,
      })}
      ${_portalCTA(RENT_THEME)}
    `),
  };
}

function rentRenewalWindowEmail(data) {
  return {
    subject: `Tu arriendo se renueva pronto · ${safe(data.propertyName, "Propiedad")}`,
    html: htmlWrapper(GRADIENTS.amber, `
      <div style="text-align:center;font-size:56px;margin-bottom:18px;">🔁</div>
      <h1 class="title" style="color:#92400e;text-align:center;">Ventana de renovación abierta</h1>
      <p class="subtitle" style="text-align:center;">
        Hola <strong style="color:#1f2937;">${escapeHtml(safe(data.clientName, "Cliente"))}</strong>,
        tu contrato de arriendo de <strong>${escapeHtml(safe(data.propertyName, "la propiedad"))}</strong>
        está próximo a su fecha de finalización
        ${data.endDate ? `(<strong>${escapeHtml(fmtDate(data.endDate))}</strong>)` : ""}.
      </p>
      ${_propertyBlock(data, RENT_THEME)}
      ${noteBox({
        bg: "#fef3c7", borderColor: "#d97706",
        title: "Tienes dos opciones",
        body: "<strong>1.</strong> Renovar el contrato (te contactaremos con las condiciones de renovación, incluido el ajuste anual del canon según IPC).<br><strong>2.</strong> No renovar y entregar la propiedad. Avisanos con antelación para coordinar la entrega.",
      })}
      ${_portalCTA(RENT_THEME)}
    `),
  };
}

function rentFinishedEmail(data) {
  return {
    subject: `Arriendo finalizado · ${safe(data.propertyName, "Propiedad")}`,
    html: htmlWrapper(GRADIENTS.finalizado, `
      <div style="text-align:center;font-size:56px;margin-bottom:18px;">🏁</div>
      <h1 class="title" style="color:#1e40af;text-align:center;">Arriendo finalizado</h1>
      <p class="subtitle" style="text-align:center;">
        Hola <strong style="color:#1f2937;">${escapeHtml(safe(data.clientName, "Cliente"))}</strong>,
        tu contrato de arriendo de <strong>${escapeHtml(safe(data.propertyName, "la propiedad"))}</strong>
        ha finalizado. Gracias por haber sido nuestro inquilino.
      </p>
      ${_propertyBlock(data, RENT_THEME)}
      ${noteBox({
        bg: "#dbeafe", borderColor: "#2563eb",
        title: "Próximos pasos",
        body: "Coordinaremos la entrega de la propiedad: revisión de inventario, devolución del depósito (si aplica) y firma de paz y salvo.",
      })}
      ${_portalCTA({ ...RENT_THEME, primaryGrad: "linear-gradient(135deg,#1e40af,#2563eb)", primaryColor: "#1e40af" })}
    `),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  CANCELACIÓN
// ═══════════════════════════════════════════════════════════════════════════

function contractCancelledEmail(data) {
  return {
    subject: `Contrato cancelado · ${safe(data.propertyName, "Propiedad")}`,
    html: htmlWrapper(GRADIENTS.cancelado, `
      <div style="text-align:center;font-size:56px;margin-bottom:18px;">❌</div>
      <h1 class="title" style="color:#991b1b;text-align:center;">Contrato cancelado</h1>
      <p class="subtitle" style="text-align:center;">
        Hola <strong style="color:#1f2937;">${escapeHtml(safe(data.clientName, "Cliente"))}</strong>,
        el contrato asociado a <strong>${escapeHtml(safe(data.propertyName, "la propiedad"))}</strong>
        ha sido cancelado.
      </p>
      ${_propertyBlock(data, URGENT_THEME)}
      ${noteBox({
        bg: "#fef2f2", borderColor: "#b91c1c",
        title: "¿Tienes dudas?",
        body: "Si esta cancelación no era esperada o necesitas más información sobre devoluciones, multas o trámites pendientes, contáctanos por WhatsApp o tu agente.",
      })}
      ${_portalCTA(URGENT_THEME)}
    `),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  GENÉRICO — fallback para etapas no mapeadas
// ═══════════════════════════════════════════════════════════════════════════

const STATE_THEME = {
  vigente:    { gradient: GRADIENTS.vigente,    titleColor: "#166534", emoji: "✅" },
  finalizado: { gradient: GRADIENTS.finalizado, titleColor: "#1e40af", emoji: "🏁" },
  cancelado:  { gradient: GRADIENTS.cancelado,  titleColor: "#991b1b", emoji: "❌" },
  pausado:    { gradient: GRADIENTS.pausado,    titleColor: "#92400e", emoji: "⏸️" },
  vencido:    { gradient: GRADIENTS.vencido,    titleColor: "#d97706", emoji: "⚠️" },
  borrador:   { gradient: GRADIENTS.agent,      titleColor: "#6b7280", emoji: "📝" },
};

function _stateTheme(status) {
  return STATE_THEME[String(status || "").toLowerCase()] || {
    gradient: GRADIENTS.navy, titleColor: "#1e40af", emoji: "📋",
  };
}

function contractUpdatedEmail(after, prevStatus, prevStage) {
  const nextStatus = after.statusGeneral || after.status || "";
  const nextStage  = after.businessStage || "";
  const theme      = _stateTheme(nextStatus);

  const statusChanged = prevStatus && prevStatus !== nextStatus;
  const stageChanged  = prevStage  && prevStage  !== nextStage;

  const clientName   = escapeHtml(safe(after.clientName, "Cliente"));
  const propertyName = escapeHtml(safe(after.propertyName, "la propiedad"));

  return {
    subject: statusChanged
      ? `Actualización · ${statusLabel(nextStatus)} · ${safe(after.propertyName, "Propiedad")}`
      : `Nueva etapa · ${stageLabel(nextStage)} · ${safe(after.propertyName, "Propiedad")}`,
    html: htmlWrapper(theme.gradient, `
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
      ${ctaButtons(
        "Ver en mi portal",       `${BASE_URL}/portal`,
        "Contactar por WhatsApp", WHATSAPP_URL,
        { primaryBg: `linear-gradient(135deg,${theme.titleColor},${theme.titleColor}cc)`, secondaryColor: theme.titleColor }
      )}
    `),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  DISPATCHER — selecciona el email correcto según businessStage
// ═══════════════════════════════════════════════════════════════════════════

const STAGE_TO_BUILDER = {
  // Venta
  reserva:                saleReserveEmail,
  promesa_firmada:        salePromiseSignedEmail,
  cuota_inicial:          saleInitialPaymentEmail,
  credito_aprobado:       saleMortgageApprovedEmail,
  leasing_aprobado:       saleMortgageApprovedEmail,
  escritura_firmada:      saleDeedSignedEmail,
  registrado:             saleRegisteredEmail,
  entregado:              saleDeliveredEmail,
  // Arriendo
  arriendo_firmado:       rentSignedEmail,
  arriendo_activo:        rentActiveEmail,
  ventana_renovacion:     rentRenewalWindowEmail,
  arriendo_finalizado:    rentFinishedEmail,
};

/**
 * Despacha el email correcto según el cambio detectado.
 * - Si el contrato pasa a `cancelled` → contractCancelledEmail
 * - Si businessStage tiene un builder específico → ese builder
 * - Si no → contractUpdatedEmail (fallback)
 */
function getContractStageEmail(after, prevStatus, prevStage) {
  const nextStatus = String(after.statusGeneral || after.status || "").toLowerCase();
  const nextStage  = String(after.businessStage || "").toLowerCase();

  if (nextStatus === "cancelado" && prevStatus !== "cancelado") {
    return contractCancelledEmail(after);
  }

  const stageChanged = prevStage && prevStage !== nextStage;
  if (stageChanged && STAGE_TO_BUILDER[nextStage]) {
    return STAGE_TO_BUILDER[nextStage](after);
  }

  return contractUpdatedEmail(after, prevStatus, prevStage);
}

// ═══════════════════════════════════════════════════════════════════════════
//  EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
//  CAMBIO DE ETAPA / ESTADO — al AGENTE (tono operativo)
// ═══════════════════════════════════════════════════════════════════════════
//
// Auditoría: antes el agente recibía `contractUpdatedEmail` genérico — el
// mismo template del cliente, sin datos de gestión ni IDs ni CTAs al panel.
// Ahora tiene su propio builder con resumen ejecutivo y CTA al panel.

function contractStageAgentEmail(after, prevStatus, prevStage, contractId) {
  const isRent = String(after.type || "").toLowerCase().includes("arriendo")
              || String(after.type || "").toLowerCase().includes("rent");
  const theme = isRent ? RENT_THEME : SALE_THEME;
  const nextStatus = after.statusGeneral || after.status || "";
  const nextStage  = after.businessStage || "";
  const statusChanged = prevStatus && prevStatus !== String(nextStatus).toLowerCase();
  const stageChanged  = prevStage  && prevStage  !== String(nextStage).toLowerCase();

  return {
    subject: stageChanged
      ? `📌 Etapa avanzada · ${stageLabel(nextStage)} · ${safe(after.propertyName, "Propiedad")}`
      : `📌 Estado actualizado · ${statusLabel(nextStatus)} · ${safe(after.propertyName, "Propiedad")}`,
    html: htmlWrapper(GRADIENTS.agent, `
      <div style="text-align:center;font-size:48px;margin-bottom:14px;">📌</div>
      <h1 class="title" style="color:#b8952a;text-align:center;">Contrato actualizado</h1>
      <p class="subtitle" style="text-align:center;">
        Hola <strong style="color:#1f2937;">${escapeHtml(safe(after.agentName, "Agente"))}</strong>,
        un contrato bajo tu gestión cambió de ${stageChanged ? "etapa" : "estado"}.
        Revisa los próximos pasos requeridos.
      </p>
      ${sectionCard("Resumen ejecutivo", [
        infoRow("Cliente",     safe(after.clientName, "Cliente"),                "#1f2937"),
        after.clientEmail ? infoRow("Email cliente", after.clientEmail) : "",
        after.clientPhone ? infoRow("Teléfono",     after.clientPhone, "#166534") : "",
        infoRow("Propiedad",   safe(after.propertyName, "Propiedad"),            "#b8952a"),
        infoRow("Tipo",        contractTypeLabel(after.type),                    "#1e40af"),
        statusChanged ? infoRow("Estado anterior", statusLabel(prevStatus), "#6b7280") : "",
        statusChanged ? infoRow("Nuevo estado",    statusLabel(nextStatus), theme.primaryColor) : "",
        stageChanged  ? infoRow("Etapa anterior",  stageLabel(prevStage),   "#6b7280") : "",
        stageChanged  ? infoRow("Nueva etapa",     stageLabel(nextStage),   theme.primaryColor) : "",
        contractId ? infoRow("ID contrato", contractId, "#6b7280") : "",
      ], { bg: theme.cardBg, border: theme.cardBorder })}
      ${noteBox({
        bg: "#fffbeb", borderColor: "#f59e0b",
        title: "Recordatorio operativo",
        body: "Verifica que la documentación de la nueva etapa esté completa y que el cliente tenga visibilidad en su portal. Si esta etapa requiere documentos firmados, súbelos al contrato.",
      })}
      ${ctaButtons(
        "Ver contrato en panel", `${BASE_URL}/contratos`,
        "Dashboard",             `${BASE_URL}/dashboard`,
        { primaryBg: "linear-gradient(135deg,#b8952a,#d4a836)", secondaryColor: "#b8952a" }
      )}
    `),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  CAMBIO CRÍTICO — al ADMIN (tono directivo, datos de gestión)
// ═══════════════════════════════════════════════════════════════════════════
//
// Disparado solo en eventos críticos: cancelación, finalización, entrega,
// registro. No se envía por cada micro-etapa para no saturar el inbox admin.

function contractStageAdminEmail(after, prevStatus, prevStage, contractId) {
  const nextStatus = after.statusGeneral || after.status || "";
  const nextStage  = after.businessStage || "";
  const statusChanged = prevStatus && prevStatus !== String(nextStatus).toLowerCase();
  const stageChanged  = prevStage  && prevStage  !== String(nextStage).toLowerCase();

  // Color y emoji según criticidad del cambio
  let emoji = "🛡️";
  let titleColor = "#7c3aed";
  let gradient = GRADIENTS.purple;
  const ns = String(nextStatus).toLowerCase();
  if (ns === "cancelado") { emoji = "❌"; titleColor = "#991b1b"; gradient = GRADIENTS.crimson; }
  else if (ns === "finalizado" || nextStage === "entregado" || nextStage === "registrado" || nextStage === "arriendo_finalizado") {
    emoji = "🏁"; titleColor = "#1e40af"; gradient = GRADIENTS.navy;
  }

  return {
    subject: `[Admin] Contrato ${statusLabel(nextStatus)} · ${safe(after.propertyName, "Propiedad")}`,
    html: htmlWrapper(gradient, `
      <div style="text-align:center;font-size:48px;margin-bottom:14px;">${emoji}</div>
      <h1 class="title" style="color:${titleColor};text-align:center;">Cambio crítico de contrato</h1>
      <p class="subtitle" style="text-align:center;">
        Registro automático para visibilidad de gestión. Revisa si requiere intervención.
      </p>
      ${sectionCard("Resumen del contrato", [
        contractId ? infoRow("ID contrato",        contractId, "#6b7280") : "",
        infoRow("Cliente",          safe(after.clientName, "—"),     "#1f2937"),
        after.clientEmail ? infoRow("Email cliente", after.clientEmail) : "",
        infoRow("Propiedad",        safe(after.propertyName, "—"),   "#b8952a"),
        after.propertyAddress ? infoRow("Dirección", after.propertyAddress) : "",
        infoRow("Tipo",             contractTypeLabel(after.type),   "#1e40af"),
        statusChanged ? infoRow("Estado anterior", statusLabel(prevStatus), "#6b7280") : "",
        statusChanged ? infoRow("Nuevo estado",    statusLabel(nextStatus), titleColor) : "",
        stageChanged  ? infoRow("Etapa anterior",  stageLabel(prevStage),   "#6b7280") : "",
        stageChanged  ? infoRow("Nueva etapa",     stageLabel(nextStage),   titleColor) : "",
        after.agentName  ? infoRow("Agente responsable", after.agentName, titleColor) : "",
        after.agentEmail ? infoRow("Email agente",       after.agentEmail) : "",
      ], { bg: "#f8fbff", border: "#dbeafe" })}
      ${ns === "cancelado" ? noteBox({
        bg: "#fef2f2", borderColor: "#dc2626",
        title: "Cancelación detectada",
        body: "Verifica con el agente la causa de la cancelación. Si hubo pagos, revisa devoluciones pendientes y libera la propiedad si aún no se hizo.",
      }) : noteBox({
        bg: "#f5f3ff", borderColor: "#7c3aed",
        title: "Hito alcanzado",
        body: "Confirma que la documentación esté completa y archivada. Si aplica, registra el cierre en métricas operativas del mes.",
      })}
      ${ctaButtons(
        "Ver contrato",   `${BASE_URL}/contratos`,
        "Dashboard",      `${BASE_URL}/dashboard`,
        { primaryBg: `linear-gradient(135deg,${titleColor},${titleColor}cc)`, secondaryColor: titleColor }
      )}
    `),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  // Creación
  contractCreatedEmail,
  contractCreatedAgentEmail,
  // Etapas de venta
  saleReserveEmail,
  salePromiseSignedEmail,
  saleInitialPaymentEmail,
  saleMortgageApprovedEmail,
  saleDeedSignedEmail,
  saleRegisteredEmail,
  saleDeliveredEmail,
  // Etapas de arriendo
  rentSignedEmail,
  rentActiveEmail,
  rentRenewalWindowEmail,
  rentFinishedEmail,
  // Genéricos / agente / admin
  contractUpdatedEmail,
  contractCancelledEmail,
  contractStageAgentEmail,
  contractStageAdminEmail,
  // Dispatcher
  getContractStageEmail,
};