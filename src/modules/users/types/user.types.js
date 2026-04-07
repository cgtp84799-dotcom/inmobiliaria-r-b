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

// ✅ Strings completos de color — Tailwind no puede purgar clases generadas con template literals
export const USER_ROLE_COLORS = {
  [USER_ROLES.ADMIN]:  'red',
  [USER_ROLES.MEMBER]: 'blue',
  [USER_ROLES.AGENT]:  'green',
  [USER_ROLES.VIEWER]: 'slate',
};

// Clases Tailwind completas para badges — nunca construir con interpolación
export const USER_ROLE_BADGE_CLASSES = {
  [USER_ROLES.ADMIN]:  'bg-red-500/10 text-red-400 border-red-500/30',
  [USER_ROLES.MEMBER]: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  [USER_ROLES.AGENT]:  'bg-green-500/10 text-green-400 border-green-500/30',
  [USER_ROLES.VIEWER]: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
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

// ─── Permisos por rol ─────────────────────────────────────────────────────────

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
  // ✅ CRÍTICO: AGENT tenía permisos undefined → todo hasPermission retornaba false → parecía viewer
  [USER_ROLES.AGENT]: {
    properties: ['create', 'read', 'update'],
    clients:    ['create', 'read', 'update'],
    documents:  ['read', 'create'],
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
 * @param {string} userRole  - Rol del usuario (de userData en Firestore)
 * @param {string} module    - Módulo: 'properties' | 'clients' | 'contracts' | 'visits' | 'users' ...
 * @param {string} action    - Acción: 'create' | 'read' | 'update' | 'delete'
 * @returns {boolean}
 */
export const hasPermission = (userRole, module, action) => {
  const permissions = ROLE_PERMISSIONS[userRole];
  if (!permissions || !permissions[module]) return false;
  return permissions[module].includes(action);
};

/**
 * Determina si el usuario autenticado puede gestionar (editar/eliminar) a otro usuario.
 * Solo admins pueden gestionar usuarios. Un admin no puede eliminarse a sí mismo.
 * @param {string} currentUserRole  - Rol del usuario logueado
 * @param {string} targetRole       - Rol del usuario objetivo
 * @param {string} currentUserEmail - Email del usuario logueado
 * @param {string} targetUserEmail  - Email del usuario objetivo
 * @returns {boolean}
 */
export const canManageUser = (currentUserRole, targetRole, currentUserEmail, targetUserEmail) => {
  if (currentUserRole !== USER_ROLES.ADMIN) return false;
  if (!Object.values(USER_ROLES).includes(targetRole)) return false;
  // Un admin no puede gestionar destructivamente su propia cuenta
  if (currentUserEmail && targetUserEmail && currentUserEmail === targetUserEmail) return false;
  return true;
};
