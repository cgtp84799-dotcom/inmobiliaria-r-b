// src/modules/users/types/user.types.js

// ─── Roles ───────────────────────────────────────────────────────────────────

export const USER_ROLES = {
  ADMIN:  'admin',
  MEMBER: 'member',
  AGENT:  'agent',
  VIEWER: 'viewer',
};

export const USER_ROLE_LABELS = {
  [USER_ROLES.ADMIN]:  'Administrador',
  [USER_ROLES.MEMBER]: 'Miembro del equipo',
  [USER_ROLES.AGENT]:  'Agente inmobiliario',
  [USER_ROLES.VIEWER]: 'Solo lectura',
};

export const USER_ROLE_DESCRIPTIONS = {
  [USER_ROLES.ADMIN]:  'Control total del sistema + gestión de usuarios',
  [USER_ROLES.MEMBER]: 'Acceso completo para operar (propiedades, clientes, contratos, documentos)',
  [USER_ROLES.AGENT]:  'Gestiona sus propias visitas, propiedades y contratos. Ve su panel de rendimiento',
  [USER_ROLES.VIEWER]: 'Solo puede consultar información, sin editar ni crear',
};

// ✅ Clases completas de Tailwind — nunca strings parciales como 'primary'
export const USER_ROLE_COLORS = {
  [USER_ROLES.ADMIN]:  'red',
  [USER_ROLES.MEMBER]: 'blue',
  [USER_ROLES.AGENT]:  'green',
  [USER_ROLES.VIEWER]: 'slate',
};

// ─── Estados ─────────────────────────────────────────────────────────────────

export const USER_STATUS = {
  ACTIVE:   'active',
  INACTIVE: 'inactive',
  PENDING:  'pending',
  BLOCKED:  'blocked',
};

export const USER_STATUS_LABELS = {
  [USER_STATUS.ACTIVE]:   'Activo',
  [USER_STATUS.INACTIVE]: 'Inactivo',
  [USER_STATUS.PENDING]:  'Pendiente de aprobación',
  [USER_STATUS.BLOCKED]:  'Bloqueado',
};

// ─── Permisos ─────────────────────────────────────────────────────────────────

export const ROLE_PERMISSIONS = {
  [USER_ROLES.ADMIN]: {
    properties: ['create', 'read', 'update', 'delete'],
    clients:    ['create', 'read', 'update', 'delete'],
    documents:  ['create', 'read', 'update', 'delete'],
    contracts:  ['create', 'read', 'update', 'delete'],
    visits:     ['create', 'read', 'update', 'delete'],
    agents:     ['create', 'read', 'update', 'delete'],
    users:      ['create', 'read', 'update', 'delete'],
    chat:       ['read', 'send'],
    settings:   ['manage'],
  },
  [USER_ROLES.MEMBER]: {
    properties: ['create', 'read', 'update', 'delete'],
    clients:    ['create', 'read', 'update', 'delete'],
    documents:  ['create', 'read', 'update', 'delete'],
    contracts:  ['create', 'read', 'update', 'delete'],
    visits:     ['create', 'read', 'update', 'delete'],
    agents:     ['read'],
    users:      ['read'],
    chat:       ['read', 'send'],
    settings:   [],
  },
  [USER_ROLES.AGENT]: {
    properties: ['create', 'read', 'update'],
    clients:    ['create', 'read', 'update'],
    documents:  ['read'],
    contracts:  ['create', 'read', 'update'],
    visits:     ['create', 'read', 'update'],
    agents:     ['read'],
    users:      [],
    chat:       ['read', 'send'],
    settings:   [],
  },
  [USER_ROLES.VIEWER]: {
    properties: ['read'],
    clients:    ['read'],
    documents:  ['read'],
    contracts:  ['read'],
    visits:     ['read'],
    agents:     [],
    users:      [],
    chat:       ['read'],
    settings:   [],
  },
};

/**
 * Verifica si un usuario tiene permiso sobre una acción en un módulo.
 */
export const hasPermission = (userRole, module, action) => {
  const permissions = ROLE_PERMISSIONS[userRole];
  if (!permissions || !permissions[module]) return false;
  return permissions[module].includes(action);
};

/**
 * Determina si el usuario autenticado puede gestionar un rol dado.
 */
export const canManageUser = (currentUserRole, targetRole) => {
  if (currentUserRole !== USER_ROLES.ADMIN) return false;
  if (!Object.values(USER_ROLES).includes(targetRole)) return false;
  return true;
};
