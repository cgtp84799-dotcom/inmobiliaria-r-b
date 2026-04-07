/**
 * Centralized route definitions.
 * Import from here — never hardcode paths in components.
 */

export const PUBLIC_ROUTES = {
  HOME:                '/',
  CATALOG:             '/catalogo',
  CITY_PROPERTIES:     '/propiedades/zona/:city',
  TYPE_CITY_PROPERTIES:'/propiedades/zona/:typeCity',
  PROPERTY_DETAIL:     '/propiedades/:slugId',
  CONTACT:             '/contacto',
  SCHEDULE_VISIT:      '/agendar-visita',
};

export const AUTH_ROUTES = {
  LOGIN:           '/login',
  ACCESS_REQUEST:  '/solicitar-acceso',
};

export const PRIVATE_ROUTES = {
  DASHBOARD:        '/dashboard',
  AGENT_DASHBOARD:  '/mi-panel',      // ✅ Ruta exclusiva para rol agent
  PROPERTIES:       '/propiedades-admin',
  CLIENTS:          '/clientes',
  CONTRACTS:        '/contratos',
  QUERIES:          '/consultas',
  CHAT:             '/chat',
  DOCUMENTS:        '/documentos',
  CALENDAR:         '/calendario',
  USERS:            '/usuarios',
  REQUESTS:         '/solicitudes',
  PROFILE:          '/perfil',
  VISITS:           '/visitas',
  AGENTS:           '/agentes',
  AGENT_DETAIL:     '/agentes/:agentId',
};
