/**
 * src/core/config/routes.config.js
 * Definición centralizada de rutas — importar desde aquí, nunca hardcodear paths.
 */

export const PUBLIC_ROUTES = {
  HOME:                '/',
  CATALOG:             '/catalogo',
  CITY_PROPERTIES:     '/propiedades/zona/:city',
  TYPE_CITY_PROPERTIES:'/propiedades/zona/:typeCity',
  PROPERTY_DETAIL:     '/propiedades/:slugId',
  CONTACT:             '/contacto',
  SCHEDULE_VISIT:      '/agendar-visita',
  PRIVACY_POLICY:      '/politica-privacidad',
  CLIENT_AUTH:         '/acceso-clientes',   // login / registro de clientes
};

export const AUTH_ROUTES = {
  LOGIN:          '/login',            // login exclusivo de agentes
  ACCESS_REQUEST: '/solicitar-acceso',
};

export const PRIVATE_ROUTES = {
  DASHBOARD:       '/dashboard',
  AGENT_DASHBOARD: '/mi-panel',
  PROPERTIES:      '/propiedades-admin',
  CLIENTS:         '/clientes',
  CONTRACTS:       '/contratos',
  QUERIES:         '/consultas',
  CHAT:            '/chat',
  DOCUMENTS:       '/documentos',
  CALENDAR:        '/calendario',
  USERS:           '/usuarios',
  REQUESTS:        '/solicitudes',
  PROFILE:         '/perfil',
  VISITS:          '/visitas',
  AGENTS:          '/agentes',
  AGENT_DETAIL:    '/agentes/:agentId',
  CLIENT_PORTAL:   '/portal',          // ← una sola vez, sin duplicado
};