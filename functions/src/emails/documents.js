// functions/src/emails/documents.js
// Templates de email para el módulo de Documentos.
//
// Cuando el agente sube un documento a la subcolección
// /contracts/{id}/documents, se notifica al cliente por email + in-app.

const { BASE_URL, WHATSAPP_URL, GRADIENTS } = require("./config");
const { escapeHtml, safe, fmtDateTime, contractTypeLabel } = require("./utils");
const { htmlWrapper, infoRow, sectionCard, ctaButtons, noteBox } = require("./layout");

// Etiquetas legibles por tipo de documento
const DOCUMENT_KIND_LABELS = {
  contract:           "Contrato",
  promise:            "Promesa de compraventa",
  deed:               "Escritura",
  invoice:            "Factura",
  receipt:            "Comprobante / recibo",
  id:                 "Documento de identidad",
  income_proof:       "Certificado de ingresos",
  bank_statement:     "Extracto bancario",
  inventory:          "Inventario",
  property_tax:       "Paz y salvo predial",
  utilities:          "Paz y salvo servicios",
  paz_y_salvo:        "Paz y salvo",
  insurance:          "Póliza / seguro",
  other:              "Documento",
};

function kindLabel(kind) {
  return DOCUMENT_KIND_LABELS[String(kind || "").toLowerCase()] || "Documento";
}

// ═══════════════════════════════════════════════════════════════════════════
//  Documento subido al contrato — al CLIENTE
// ═══════════════════════════════════════════════════════════════════════════

function contractDocumentUploadedClientEmail(contract, document) {
  const docLabel = safe(document.label, kindLabel(document.kind));
  return {
    subject: `📎 Nuevo documento disponible · ${safe(contract.propertyName, "tu contrato")}`,
    html: htmlWrapper(GRADIENTS.navy, `
      <span class="emoji-icon">📎</span>
      <h1 class="title" style="color:#1e40af;text-align:center;">Nuevo documento disponible</h1>
      <p class="subtitle" style="text-align:center;">
        Hola <strong style="color:#1f2937;">${escapeHtml(safe(contract.clientName, "Cliente"))}</strong>,
        tu agente acaba de cargar un nuevo documento en tu contrato de
        <strong style="color:#1f2937;">${escapeHtml(safe(contract.propertyName, "tu propiedad"))}</strong>.
        Puedes consultarlo en cualquier momento desde tu portal.
      </p>
      ${sectionCard("Detalle del documento", [
        infoRow("Documento",   docLabel,                                  "#1e40af"),
        infoRow("Tipo",        kindLabel(document.kind),                  "#1f2937"),
        document.filename ? infoRow("Archivo", document.filename) : "",
        infoRow("Cargado",     fmtDateTime(document.createdAt || new Date()), "#166534"),
      ], { bg: "#f8fbff", border: "#dbeafe" })}
      ${sectionCard("Contrato asociado", [
        infoRow("Propiedad",     safe(contract.propertyName, "Propiedad"), "#b8952a"),
        infoRow("Tipo contrato", contractTypeLabel(contract.type),         "#1e40af"),
        contract.agentName ? infoRow("Agente", contract.agentName) : "",
      ])}
      ${noteBox({
        bg: "#dbeafe", borderColor: "#2563eb",
        title: "Importante",
        body: "Conserva una copia del documento descargado. Si necesitas la versión firmada o tienes dudas sobre su contenido, escríbenos por WhatsApp o consulta a tu agente.",
      })}
      ${ctaButtons(
        "Ver en mi portal",       `${BASE_URL}/portal`,
        "💬 Contactar por WhatsApp", WHATSAPP_URL,
        { primaryBg: "linear-gradient(135deg,#1e40af,#2563eb)", secondaryColor: "#1e40af" }
      )}
    `),
  };
}

module.exports = {
  contractDocumentUploadedClientEmail,
};