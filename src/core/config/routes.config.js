/**
 * Centralized route definitions.
 * Import from here — never hardcode paths in components.
 */

export const PUBLIC_ROUTES = {
  HOME:            '/',
  CATALOG:         '/catalogo',
  CITY_PROPERTIES: '/propiedades/zona/:typeCity',
  PROPERTY_DETAIL: '/propiedades/:slugId',
  CONTACT:         '/contacto',
  SCHEDULE_VISIT:  '/agendar-visita',
};

export const AUTH_ROUTES = {
  LOGIN: '/login',
};

export const PRIVATE_ROUTES = {
  DASHBOARD:   '/dashboard',
  PROPERTIES:  '/propiedades-admin',
  CLIENTS:     '/clientes',
  QUERIES:     '/consultas',
  CHAT:        '/chat',
  DOCUMENTS:   '/documentos',
  CALENDAR:    '/calendario',
  USERS:       '/usuarios',
  REQUESTS:    '/solicitudes',
  PROFILE:     '/perfil',
  VISITS:      '/usuarios/visitas',
};
