// ═══════════════════════════════════════════════════════════════════════════
//  Google Analytics 4 — Consent Mode v2
//
//  EXTRAÍDO DE INLINE SCRIPT para permitir CSP script-src sin 'unsafe-inline'.
//  Se carga antes que gtag.js (también vía <script src>) para que la
//  configuración de consent esté lista cuando gtag comience a enviar eventos.
// ═══════════════════════════════════════════════════════════════════════════

window.dataLayer = window.dataLayer || [];
function gtag() { window.dataLayer.push(arguments); }
window.gtag = gtag;

// Consent Mode v2 — por defecto denegamos ads, permitimos analytics anónimos.
// Cuando el usuario acepta cookies en el banner, se llama a gtag('consent','update',...)
gtag('consent', 'default', {
  'ad_storage':            'denied',
  'ad_user_data':          'denied',
  'ad_personalization':    'denied',
  'analytics_storage':     'granted',
  'functionality_storage': 'granted',
  'security_storage':      'granted',
  'wait_for_update':       500,
});

gtag('js', new Date());
gtag('config', 'G-DM5BQSSP4C', {
  send_page_view: false,
  anonymize_ip:   true,
  cookie_flags:   'SameSite=None;Secure',
});
