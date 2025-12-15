// ROLES DEL SISTEMA
export const USER_ROLES = {
  ADMIN: 'admin',
  MEMBER: 'member',
  VIEWER: 'viewer'
};

export const USER_ROLE_LABELS = {
  [USER_ROLES.ADMIN]: 'Administrador',
  [USER_ROLES.MEMBER]: 'Miembro del equipo',
  [USER_ROLES.VIEWER]: 'Solo lectura'
};

export const USER_ROLE_DESCRIPTIONS = {
  [USER_ROLES.ADMIN]: 'Control total del sistema + gestión de usuarios',
  [USER_ROLES.MEMBER]: 'Acceso completo para operar (propiedades, clientes, contratos, documentos)',
  [USER_ROLES.VIEWER]: 'Solo puede consultar información, sin editar ni crear'
};

export const USER_ROLE_COLORS = {
  [USER_ROLES.ADMIN]: 'red',
  [USER_ROLES.MEMBER]: 'primary',
  [USER_ROLES.VIEWER]: 'slate'
};

// ESTADOS DEL USUARIO
export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  BLOCKED: 'blocked'
};

export const USER_STATUS_LABELS = {
  [USER_STATUS.ACTIVE]: 'Activo',
  [USER_STATUS.INACTIVE]: 'Inactivo',
  [USER_STATUS.PENDING]: 'Pendiente de aprobación',
  [USER_STATUS.BLOCKED]: 'Bloqueado'
};

// PERMISOS POR ROL
export const ROLE_PERMISSIONS = {
  [USER_ROLES.ADMIN]: {
    properties: ['create', 'read', 'update', 'delete'],
    clients: ['create', 'read', 'update', 'delete'],
    documents: ['create', 'read', 'update', 'delete'],
    users: ['create', 'read', 'update', 'delete'],
    chat: ['read', 'send'],
    settings: ['manage']
  },
  [USER_ROLES.MEMBER]: {
    properties: ['create', 'read', 'update', 'delete'],
    clients: ['create', 'read', 'update', 'delete'],
    documents: ['create', 'read', 'update', 'delete'],
    users: ['read'],
    chat: ['read', 'send'],
    settings: []
  },
  [USER_ROLES.VIEWER]: {
    properties: ['read'],
    clients: ['read'],
    documents: ['read'],
    users: [],
    chat: ['read'],
    settings: []
  }
};

// Helper para verificar permisos
export const hasPermission = (userRole, module, action) => {
  const permissions = ROLE_PERMISSIONS[userRole];
  if (!permissions || !permissions[module]) return false;
  return permissions[module].includes(action);
};
