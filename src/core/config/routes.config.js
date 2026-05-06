import { SITE_URL as BASE_URL } from './site.config';
/**
 * src/core/config/routes.config.js
 * ─────────────────────────────────────────────────────────────
 * Definición centralizada de rutas. Nunca hardcodear paths en
 * componentes — importar desde aquí.
 *
 * Arquitectura URL (SEO-first, expansión nacional):
 *
 *   /                                        → Home
 *   /catalogo                                → Catálogo con filtros por query
 *   /propiedades/:slugId                     → Detalle de propiedad individual
 *
 *   /propiedades/zona/:city                  → Landing por ciudad
 *   /propiedades/zona/:typeCity              → Landing tipo × (transacción) × ciudad
 *                                              p.ej. /propiedades/zona/casas-en-venta-manizales
 *                                              también sirve landings nacionales:
 *                                              /propiedades/zona/casas-en-venta-colombia
 *                                              (LocationPage detecta el sufijo
 *                                              "-colombia" vía isNationalSlug()).
 *
 *   /propiedades/departamento/:department    → Hub por departamento
 *                                              p.ej. /propiedades/departamento/caldas
 *
 *   /contacto                                → Contacto
 *   /politica-privacidad                     → Privacidad
 *   /agendar-visita                          → Agendar visita (noindex)
 *   /acceso-clientes                         → Auth cliente (noindex)
 *
 * Internas (todas noindex vía firebase.json X-Robots-Tag):
 *   /login, /dashboard, /mi-panel, /portal, /propiedades-admin, /clientes,
 *   /contratos, /consultas, /documentos, /calendario, /visitas, /usuarios,
 *   /solicitudes, /perfil, /agentes, /agentes/:agentId, /solicitar-acceso
 * ─────────────────────────────────────────────────────────────
 */

export const PUBLIC_ROUTES = {
  HOME:                  '/',
  CATALOG:               '/catalogo',

  // Detalle de propiedad individual
  PROPERTY_DETAIL:       '/propiedades/:slugId',

  // Landing pages de zona (ciudad, tipo+ciudad, tipo+transacción+ciudad)
  // Se sirven todas por LocationPage — el parser interno decide qué mostrar.
  CITY_PROPERTIES:       '/propiedades/zona/:city',
  TYPE_CITY_PROPERTIES:  '/propiedades/zona/:typeCity',

  // Hub por departamento (/propiedades/departamento/caldas, /antioquia, etc.)
  DEPARTMENT_HUB:        '/propiedades/departamento/:department',

  // Legales / contacto
  CONTACT:               '/contacto',
  SCHEDULE_VISIT:        '/agendar-visita',
  PRIVACY_POLICY:        '/politica-privacidad',

  // Auth público clientes
  CLIENT_AUTH:           '/acceso-clientes',
  EMAIL_VERIFICATION:    '/verificar-email',
  EMAIL_VERIFY_TOKEN:    '/verificar-email/:token',
};

export const AUTH_ROUTES = {
  LOGIN:          '/login',
  ACCESS_REQUEST: '/solicitar-acceso',
};

export const PRIVATE_ROUTES = {
  DASHBOARD:       '/dashboard',
  AGENT_DASHBOARD: '/mi-panel',
  PROPERTIES:      '/propiedades-admin',
  CLIENTS:         '/clientes',
  CONTRACTS:       '/contratos',
  QUERIES:         '/consultas',
  DOCUMENTS:       '/documentos',
  CALENDAR:        '/calendario',
  USERS:           '/usuarios',
  REQUESTS:        '/solicitudes',
  PROFILE:         '/perfil',
  VISITS:          '/visitas',
  AGENTS:          '/agentes',
  AGENT_DETAIL:    '/agentes/:agentId',
  CLIENT_PORTAL:   '/portal',
};

/* ═══════════════════════════════════════════════════════════════════════════
 *  URL BUILDERS — usar estos en lugar de construir strings a mano
 * ═══════════════════════════════════════════════════════════════════════════ */
const slugify = (str = '') =>
  String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

/** `/propiedades/zona/manizales` */
export const buildCityUrl = (city) => {
  const s = slugify(city);
  return s ? `/propiedades/zona/${s}` : '/catalogo';
};

/** `/propiedades/zona/casas-en-venta-manizales` */
export const buildTypeCityUrl = ({ type, transaction, city }) => {
  const t = slugify(type);
  const tx = slugify(transaction);
  const c = slugify(city);
  if (!t || !c) return buildCityUrl(city);
  if (tx) return `/propiedades/zona/${t}-en-${tx}-${c}`;
  return `/propiedades/zona/${t}-en-${c}`;
};

/** `/propiedades/departamento/caldas` */
export const buildDepartmentUrl = (department) => {
  const s = slugify(department);
  return s ? `/propiedades/departamento/${s}` : '/catalogo';
};

/**
 * Landing nacional — usa la ruta `/propiedades/zona/*-colombia` para
 * evitar colisión con `/propiedades/:slugId` (detalle).
 * Ejemplo: `/propiedades/zona/casas-en-venta-colombia`
 */
export const buildNationalLandingUrl = ({ type, transaction }) => {
  const t = slugify(type);
  const tx = slugify(transaction);
  if (!t) return '/catalogo';
  if (tx) return `/propiedades/zona/${t}-en-${tx}-colombia`;
  return `/propiedades/zona/${t}-colombia`;
};

/** Detalle de propiedad con slug SEO-friendly */
export const buildPropertyDetailUrl = ({ type, transaction, city, rooms, id }) => {
  const tx = slugify(transaction);
  const t = slugify(type);
  const c = slugify(city);
  const parts = [];
  if (tx) parts.push(tx);
  if (t) parts.push(t);
  if (c) parts.push(c);
  if (rooms) parts.push(`${rooms}-habitaciones`);
  const slug = slugify(parts.join(' ')) || 'propiedad';
  return id ? `/propiedades/${slug}-${id}` : '/catalogo';
};

/** Cualquier path relativo → URL absoluta con BASE_URL */
export const toAbsoluteUrl = (path = '/') => {
  if (/^https?:\/\//i.test(path)) return path;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${BASE_URL}${p}`;
};

/* ═══════════════════════════════════════════════════════════════════════════
 *  HELPERS DE DETECCIÓN — para lógica condicional en LocationPage
 * ═══════════════════════════════════════════════════════════════════════════ */

const NATIONAL_KEYWORDS = ['colombia', 'nacional', 'eje-cafetero', 'region-cafetera'];

/** Detecta si un slug es una landing nacional (termina en -colombia, etc.) */
export const isNationalSlug = (slug = '') => {
  const s = slugify(slug);
  return NATIONAL_KEYWORDS.some((k) => s.endsWith(`-${k}`) || s === k);
};

/** Extrae { type, transaction } de un slug nacional como "casas-en-venta-colombia" */
export const parseNationalSlug = (slug = '') => {
  const s = slugify(slug);
  const withoutSuffix = NATIONAL_KEYWORDS.reduce(
    (acc, k) => acc.replace(new RegExp(`-?${k}$`), ''),
    s
  );
  const parts = withoutSuffix.split('-').filter(Boolean);
  let transaction = null;
  if (parts.includes('venta') || parts.includes('compra')) transaction = 'venta';
  else if (parts.includes('arriendo') || parts.includes('alquiler') || parts.includes('renta'))
    transaction = 'arriendo';

  let type = null;
  if (withoutSuffix.includes('casa'))   type = 'casa';
  else if (withoutSuffix.includes('apart')) type = 'apartamento';
  else if (withoutSuffix.includes('finca'))  type = 'finca';
  else if (withoutSuffix.includes('lote'))   type = 'lote';
  else if (withoutSuffix.includes('local'))  type = 'local';
  else if (withoutSuffix.includes('oficina')) type = 'oficina';
  else if (withoutSuffix.includes('bodega'))  type = 'bodega';

  return { type, transaction };
};

export { BASE_URL, slugify };