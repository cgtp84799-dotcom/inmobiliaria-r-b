// src/modules/users/types/user.types.js
//
// SISTEMA DE ROLES:
//
//   admin  → Control total: usuarios, configuración, operaciones
//   member → Agente inmobiliario: operaciones sin gestión de usuarios
//   viewer → Cliente portal: solo ve SU propia información
//
// SEPARACIÓN CLARA DE UNIVERSOS:
//   Panel interno  → roles: admin, member
//   Portal cliente → rol:   viewer  (= CLIENT, no es "solo lectura" del panel)
//
// JAMÁS mezclar lógica de portal con lógica de panel.

export const USER_ROLES = {
  ADMIN:  'admin',
  MEMBER: 'member',  // Agente inmobiliario — panel interno
  VIEWER: 'viewer',  // Cliente portal      — portal externo
};

// Alias semántico para mayor claridad en código del portal
export const CLIENT_ROLE = USER_ROLES.VIEWER;

export const USER_ROLE_LABELS = {
  [USER_ROLES.ADMIN]:  'Administrador',
  [USER_ROLES.MEMBER]: 'Agente Inmobiliario',
  [USER_ROLES.VIEWER]: 'Cliente',
};

export const USER_ROLE_DESCRIPTIONS = {
  [USER_ROLES.ADMIN]:  'Control total del sistema',
  [USER_ROLES.MEMBER]: 'Acceso operativo completo al panel',
  [USER_ROLES.VIEWER]: 'Acceso al portal de clientes',
};

export const USER_ROLE_COLORS = {
  [USER_ROLES.ADMIN]:  'red',
  [USER_ROLES.MEMBER]: 'green',
  [USER_ROLES.VIEWER]: 'amber',
};

export const USER_ROLE_BADGE_CLASSES = {
  [USER_ROLES.ADMIN]:  'bg-red-500/10 text-red-400 border-red-500/30',
  [USER_ROLES.MEMBER]: 'bg-green-500/10 text-green-400 border-green-500/30',
  [USER_ROLES.VIEWER]: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
};

// ─── Estados ──────────────────────────────────────────────────────────────────

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
    users:      ['read'],
    chat:       ['read', 'send'],
    settings:   [],
    dashboard:  ['read'],
  },
  // viewer = cliente portal: SOLO sus propios datos
  [USER_ROLES.VIEWER]: {
    properties:      ['read'],    // catálogo público
    ownFavorites:    ['read', 'update'],
    ownVisits:       ['read', 'create'],
    ownContracts:    ['read'],
    ownProfile:      ['read', 'update'],
    ownNotifications:['read', 'update', 'delete'],
    // Sin acceso a nada del panel interno
    clients:    [],
    documents:  [],
    contracts:  [],
    visits:     [],
    users:      [],
    chat:       [],
    settings:   [],
    dashboard:  [],
  },
};

export const hasPermission = (userRole, module, action) => {
  const permissions = ROLE_PERMISSIONS[userRole];
  if (!permissions || !permissions[module]) return false;
  return permissions[module].includes(action);
};

export const canOperate    = (role) => role === USER_ROLES.ADMIN || role === USER_ROLES.MEMBER;
export const canRead       = (role) => Object.values(USER_ROLES).includes(role);
export const isClientRole  = (role) => role === USER_ROLES.VIEWER;
export const isAgentRole   = (role) => role === USER_ROLES.ADMIN || role === USER_ROLES.MEMBER;

export const canManageUser = (currentUserRole, targetRole, currentUserEmail, targetUserEmail) => {
  if (currentUserRole !== USER_ROLES.ADMIN) return false;
  if (targetRole && !Object.values(USER_ROLES).includes(targetRole)) return false;
  if (currentUserEmail && targetUserEmail && currentUserEmail === targetUserEmail) return false;
  return true;
};