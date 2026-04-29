// src/emails/config.js
// ─── Constantes compartidas por todos los módulos de email ───────────────────
// Si cambias BASE_URL, WHATSAPP_URL o SUPPORT_EMAIL aquí, se propaga a todos
// los templates automáticamente. No hay que buscar en ningún otro archivo.

const BASE_URL      = "https://inmobiliaria-ryb-y-asociados.com";
const WHATSAPP_URL  = "https://wa.me/573105968202";
const LOGO_URL      = `${BASE_URL}/logo.jpg.png`;          // ← fix: eliminado .jpg.png
const FROM_NAME     = "Inmobiliaria Rincón Bedoya y Asociados";
const SUPPORT_EMAIL = "inmojuridi09@gmail.com";        // ← centralizado aquí

// Gradientes de header nombrados por semántica, no por color
const GRADIENTS = {
  dark:      "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
  green:     "linear-gradient(135deg, #1a2a1a 0%, #2d4a2d 100%)",
  red:       "linear-gradient(135deg, #1a1010 0%, #3d1515 100%)",
  blue:      "linear-gradient(135deg, #0f2040 0%, #1e3a6e 100%)",
  navy:      "linear-gradient(135deg, #0c2340 0%, #1a3a6e 100%)",
  agent:     "linear-gradient(135deg, #1a1f2e 0%, #2d3548 100%)",
  gold:      "linear-gradient(135deg, #14532d 0%, #166534 100%)",
  orange:    "linear-gradient(135deg, #c2410c 0%, #ea580c 100%)",
  crimson:   "linear-gradient(135deg, #991b1b 0%, #b91c1c 100%)",
  amber:     "linear-gradient(135deg, #92400e 0%, #b45309 100%)",
  emerald:   "linear-gradient(135deg, #166534 0%, #15803d 100%)",
  purple:    "linear-gradient(135deg, #1e1a2e 0%, #4c1d95 100%)",
  // Contratos por estado
  vigente:   "linear-gradient(135deg, #1a2a1a 0%, #2d4a2d 100%)",
  finalizado:"linear-gradient(135deg, #0f2040 0%, #1e3a6e 100%)",
  cancelado: "linear-gradient(135deg, #1a1010 0%, #3d1515 100%)",
  pausado:   "linear-gradient(135deg, #1a1a0f 0%, #3d3515 100%)",
  vencido:   "linear-gradient(135deg, #1a1a0f 0%, #3d3515 100%)",
};

module.exports = { BASE_URL, WHATSAPP_URL, LOGO_URL, FROM_NAME, SUPPORT_EMAIL, GRADIENTS };