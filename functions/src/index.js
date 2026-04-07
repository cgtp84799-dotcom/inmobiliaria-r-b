/**
 * functions/src/index.js — Entry point de Cloud Functions
 *
 * Exporta todas las funciones para Firebase.
 * Para deployar: firebase deploy --only functions
 */

const visitEmails = require('./visitEmails');

exports.onVisitStatusChanged = visitEmails.onVisitStatusChanged;
