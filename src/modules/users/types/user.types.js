// src/modules/users/types/user.types.js

// ─── Roles ───────────────────────────────────────────────────────────────────
// SISTEMA DE ROLES DEFINITIVO:
//   admin  → Control total: usuarios, configuración, todo lo operativo
//   member → Agente inmobiliario: acceso operativo completo (sin gestión de usuarios/config)
//   viewer → Solo lectura sobre contenido operativo (sin editar, sin chat)
//
// ⚠️ El rol 'agent' fue ELIMINADO. Todo lo que era 'agent' ahora es 'member'.

export const USER_ROLES = {
  ADMIN:  'admin',
  MEMBER: 'member',   // Agente inmobiliario — acceso operativo completo
  VIEWER: 'viewer',   // Solo lectura
};

export const USER_ROLE_LABELS = {
  [USER_ROLES.ADMIN]:  'Administrador',
  [USER_ROLES.MEMBER]: 'Agente Inmobiliario',
  [USER_ROLES.VIEWER]: 'Solo lectura',
};

export const USER_ROLE_DESCRIPTIONS = {
  [USER_ROLES.ADMIN]:  'Control total del sistema: gestión de usuarios, configuración y todas las operaciones',
  [USER_ROLES.MEMBER]: 'Acceso operativo completo: propiedades, clientes, contratos, visitas, documentos y chat. Sin gestión de usuarios ni configuración del sistema',
  [USER_ROLES.VIEWER]: 'Solo puede consultar información. Sin crear, editar ni acceder al chat',
};

export const USER_ROLE_COLORS = {
  [USER_ROLES.ADMIN]:  'red',
  [USER_ROLES.MEMBER]: 'green',
  [USER_ROLES.VIEWER]: 'slate',
};

export const USER_ROLE_BADGE_CLASSES = {
  [USER_ROLES.ADMIN]:  'bg-red-500/10 text-red-400 border-red-500/30',
  [USER_ROLES.MEMBER]: 'bg-green-500/10 text-green-400 border-green-500/30',
  [USER_ROLES.VIEWER]: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
};

// ─── Estados ─────────────────────────────────────────────────────────────────
// Los estados se mantienen igual — son del usuario, no del rol.

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
    users:      ['create', 'read', 'update', 'delete'],
    chat:       ['read', 'send'],
    settings:   ['manage'],
    dashboard:  ['read'],
  },
  [USER_ROLES.MEMBER]: {
    properties: ['create', 'read', 'update'],
    clients:    ['create', 'read', 'update'],
    documents:  ['create', 'read', 'update'],
    contracts:  ['create', 'read', 'update'],
    visits:     ['create', 'read', 'update'],
    users:      ['read'],              // puede ver lista de agentes, no gestionar
    chat:       ['read', 'send'],
    settings:   [],                    // sin acceso a configuración del sistema
    dashboard:  ['read'],
  },
  [USER_ROLES.VIEWER]: {
    properties: ['read'],
    clients:    ['read'],
    documents:  ['read'],
    contracts:  ['read'],
    visits:     ['read'],
    users:      [],
    chat:       [],                    // sin acceso al chat
    settings:   [],
    dashboard:  ['read'],
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
 * Determina si el usuario puede operar (crear/editar): admin o member.
 */
export const canOperate = (userRole) =>
  userRole === USER_ROLES.ADMIN || userRole === USER_ROLES.MEMBER;

/**
 * Determina si el usuario puede leer contenido operativo: todos los roles autenticados.
 */
export const canRead = (userRole) =>
  Object.values(USER_ROLES).includes(userRole);

/**
 * Determina si el usuario puede gestionar (editar/eliminar) a otro usuario.
 * Solo admins. Un admin no puede eliminarse a sí mismo.
 */
export const canManageUser = (currentUserRole, targetRole, currentUserEmail, targetUserEmail) => {
  if (currentUserRole !== USER_ROLES.ADMIN) return false;
  if (targetRole && !Object.values(USER_ROLES).includes(targetRole)) return false;
  if (currentUserEmail && targetUserEmail && currentUserEmail === targetUserEmail) return false;
  return true;
};
