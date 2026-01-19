// ✅ RUTAS PÚBLICAS (CATÁLOGO)
export const PUBLIC_ROUTES = {
  HOME: '/',
  CATALOG: '/propiedades',
  PROPERTY_DETAIL: '/propiedad/:id',
  ABOUT: '/nosotros',
  CONTACT: '/contacto'
};


// ✅ RUTAS PRIVADAS (PANEL INTERNO) - AHORA EN INGLÉS
export const PRIVATE_ROUTES = {
  DASHBOARD: '/dashboard',
  PROPERTIES: '/dashboard/properties',          // ✅ CAMBIO: propiedades → properties
  NEW_PROPERTY: '/dashboard/properties/new',    // ✅ CAMBIO
  EDIT_PROPERTY: '/dashboard/properties/edit/:id', // ✅ CAMBIO
  CLIENTS: '/dashboard/clients',                // ✅ CAMBIO: clientes → clients
  CLIENT_DETAIL: '/dashboard/clients/:id',      // ✅ CAMBIO
  CALENDAR: '/dashboard/calendar',              // ✅ CAMBIO: calendario → calendar
  QUERIES: '/dashboard/contacts',               // ✅ CAMBIO: consultas → contacts
  CONTRACTS: '/dashboard/legal/contracts',      // ✅ CAMBIO: contratos → contracts
  DOCUMENTS: '/dashboard/documents',            // ✅ CAMBIO: documentos → documents
  CHAT: '/dashboard/chat',
  USERS: '/dashboard/users',                    // ✅ CAMBIO: usuarios → users
  PROFILE: '/dashboard/profile',                // ✅ CAMBIO: perfil → profile
  REQUESTS: '/dashboard/requests'               // ✅ CAMBIO: solicitudes → requests
};


// ✅ RUTAS DE AUTENTICACIÓN
export const AUTH_ROUTES = {
  LOGIN: '/acceso',
};