// Rutas públicas (catálogo)
export const PUBLIC_ROUTES = {
  HOME: '/',
  CATALOG: '/propiedades',
  PROPERTY_DETAIL: '/propiedad/:id',
  ABOUT: '/nosotros',
  CONTACT: '/contacto'
};

// Rutas privadas (panel interno)
export const PRIVATE_ROUTES = {
  DASHBOARD: '/dashboard',
  PROPERTIES: '/dashboard/propiedades',
  NEW_PROPERTY: '/dashboard/propiedades/nueva',
  EDIT_PROPERTY: '/dashboard/propiedades/editar/:id',
  CLIENTS: '/dashboard/clientes',
  CLIENT_DETAIL: '/dashboard/clientes/:id',
  // LEGAL: '/dashboard/legal',
  CONTRACTS: '/dashboard/legal/contratos',
  DOCUMENTS: '/dashboard/documentos',
  CHAT: '/dashboard/chat',
  USERS: '/dashboard/usuarios',
  PROFILE: '/dashboard/perfil'
};

// Rutas de autenticación
export const AUTH_ROUTES = {
  LOGIN: '/acceso',  // antes era '/auth/login'
};