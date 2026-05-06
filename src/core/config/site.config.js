// src/core/config/site.config.js
//
// Configuración global del sitio. Centralizar aquí evita strings duplicados
// que se desincronizan entre módulos (BASE_URL, números de contacto, etc.).

export const SITE_URL = 'https://inmobiliaria-ryb-y-asociados.com';

export const SITE_NAME = 'Inmobiliaria Rincón Bedoya y Asociados';
export const SITE_SHORT_NAME = 'Rincón Bedoya';

export const CONTACT_EMAIL = 'inmojuridi09@gmail.com';
export const CONTACT_ADDRESS = 'Cra 5 #9-28, Anserma, Caldas, Colombia';

// Número WhatsApp Business. Se sobreescribe con env si está disponible.
export const WA_NUMBER =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_WA_NUMBER) ||
  '573105968202';

export const WA_LINK = `https://wa.me/${WA_NUMBER}`;

// Logos
export const LOGO_DARK = '/logo-dark.png';   // Para fondos oscuros
export const LOGO_LIGHT = '/logo-light.png'; // Para fondos claros
export const LOGO_DEFAULT = LOGO_LIGHT;

// URL absoluta de un asset público
export const absoluteUrl = (path = '') => {
  const p = String(path);
  if (/^https?:\/\//i.test(p)) return p;
  return `${SITE_URL}${p.startsWith('/') ? '' : '/'}${p}`;
};

// Geo (coordenadas oficina principal)
export const GEO = Object.freeze({
  region: 'CO',
  placename: 'Anserma, Caldas, Colombia',
  lat: 5.2383,
  lng: -75.7850,
});

// Redes sociales (opcional, se referencia en schema-ld y footer)
export const SOCIAL = Object.freeze({
  facebook: 'https://www.facebook.com/profile.php?id=61559014741338',
});
