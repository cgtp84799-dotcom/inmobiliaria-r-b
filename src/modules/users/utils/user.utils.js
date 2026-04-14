// src/modules/users/utils/user.utils.js
// Constantes visuales compartidas entre UserCard y UserDetailPanel

import { FaUserShield, FaUsers, FaEye } from 'react-icons/fa';
import { USER_ROLES } from '../types/user.types';

// En utils guardamos referencias a componentes, no JSX ya instanciado
export const ROLE_ICONS = {
  [USER_ROLES.ADMIN]: FaUserShield,
  [USER_ROLES.MEMBER]: FaUsers,
  [USER_ROLES.VIEWER]: FaEye,
};

export const ROLE_ICON_CLASSES = {
  [USER_ROLES.ADMIN]: 'text-rose-400',
  [USER_ROLES.MEMBER]: 'text-emerald-400',
  [USER_ROLES.VIEWER]: 'text-slate-400',
};

export const STATUS_STYLES = {
  active:   'bg-green-500/10  text-green-400  border-green-500/30',
  inactive: 'bg-slate-500/10  text-slate-400 border-slate-500/30',
  pending:  'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  blocked:  'bg-red-500/10    text-red-400   border-red-500/30',
};

export const STATUS_LABELS = {
  active:   'Activo',
  inactive: 'Inactivo',
  pending:  'Pendiente',
  blocked:  'Bloqueado',
};