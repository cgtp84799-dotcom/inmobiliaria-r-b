// src/emails/index.js
// ─── Barrel de exports del módulo de emails ───────────────────────────────────
// Importa desde aquí en functions/index.js:
//
//   const { welcomeEmail, contractCreatedEmail, ... } = require("./src/emails");
//
// Añadir aquí cualquier nuevo builder de email para exponerlo automáticamente.

const visits    = require("./visits");
const users     = require("./users");
const contracts = require("./contracts");
const payments  = require("./payments");
const contacts  = require("./contacts");
const documents = require("./documents");

// Re-exportar todo con nombres explícitos
module.exports = {
  // ── Visitas ──
  ...visits,
  // ── Usuarios ──
  ...users,
  // ── Contratos ──
  ...contracts,
  // ── Pagos y alertas ──
  ...payments,
  // ── Contactos / Leads web ──
  ...contacts,
  // ── Documentos ──
  ...documents,
};