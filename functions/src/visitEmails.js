// src/visitEmails.js
// ─── ARCHIVO DE COMPATIBILIDAD ────────────────────────────────────────────────
// Este archivo existía antes de la refactorización y functions/index.js puede
// seguir importando desde aquí sin cambios inmediatos.
//
// MIGRACIÓN (cuando tengas tiempo):
//   Cambia en functions/index.js:
//     const { ... } = require("./src/visitEmails");
//   Por:
//     const { ... } = require("./src/emails");
//   Y borra este archivo.

module.exports = require("./emails");
