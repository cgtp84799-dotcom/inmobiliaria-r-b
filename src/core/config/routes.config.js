export const PUBLIC_ROUTES = {
  HOME: "/",

  CATALOG: "/propiedades",

  PROPERTY_DETAIL: "/propiedades/:slugId",

  CITY_PROPERTIES: "/propiedades/ciudad/:citySlug",

  TYPE_CITY_PROPERTIES: "/propiedades/zona/:typeCitySlug",

  ABOUT: "/nosotros",
  CONTACT: "/contacto",
};

export const PRIVATE_ROUTES = {
  DASHBOARD: "/dashboard",
  PROPERTIES: "/dashboard/properties",
  NEW_PROPERTY: "/dashboard/properties/new",
  EDIT_PROPERTY: "/dashboard/properties/edit/:id",
  CLIENTS: "/dashboard/clients",
  CLIENT_DETAIL: "/dashboard/clients/:id",
  CALENDAR: "/dashboard/calendar",
  QUERIES: "/dashboard/contacts",
  CONTRACTS: "/dashboard/legal/contracts",
  DOCUMENTS: "/dashboard/documents",
  CHAT: "/dashboard/chat",
  USERS: "/dashboard/users",
  PROFILE: "/dashboard/profile",
  REQUESTS: "/dashboard/requests",
};

export const AUTH_ROUTES = {
  LOGIN: "/acceso",
};