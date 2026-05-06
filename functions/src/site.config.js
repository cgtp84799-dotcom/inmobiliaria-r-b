// functions/src/site.config.js
//
// Configuración global del sitio para Cloud Functions. Versión CommonJS
// del mismo archivo en src/core/config/site.config.js.

const SITE_URL = 'https://inmobiliaria-ryb-y-asociados.com';
const SITE_NAME = 'Inmobiliaria Rincón Bedoya y Asociados';
const SITE_SHORT_NAME = 'Rincón Bedoya';

const CONTACT_EMAIL = 'inmojuridi09@gmail.com';
const CONTACT_ADDRESS = 'Cra 5 #9-28, Anserma, Caldas, Colombia';

const WA_NUMBER = '573105968202';
const WA_LINK = `https://wa.me/${WA_NUMBER}`;

const LOGO_DARK = '/logo-dark.png';
const LOGO_LIGHT = '/logo-light.png';
const LOGO_DEFAULT = LOGO_LIGHT;

const absoluteUrl = (path = '') => {
  const p = String(path);
  if (/^https?:\/\//i.test(p)) return p;
  return `${SITE_URL}${p.startsWith('/') ? '' : '/'}${p}`;
};

module.exports = {
  SITE_URL,
  SITE_NAME,
  SITE_SHORT_NAME,
  CONTACT_EMAIL,
  CONTACT_ADDRESS,
  WA_NUMBER,
  WA_LINK,
  LOGO_DARK,
  LOGO_LIGHT,
  LOGO_DEFAULT,
  absoluteUrl,
};
