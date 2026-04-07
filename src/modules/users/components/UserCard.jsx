// src/modules/users/components/UserCard.jsx
import { motion } from 'framer-motion';
import {
  FaEdit, FaTrash, FaEnvelope, FaPhone,
  FaUserShield, FaUsers, FaEye, FaToggleOn, FaToggleOff,
  FaKey, FaExpand, FaUserTie, FaCalendarCheck,
  FaFileContract, FaHome,
} from 'react-icons/fa';
import {
  USER_ROLES, USER_ROLE_LABELS, USER_ROLE_BADGE_CLASSES,
} from '../types/user.types';

const ROLE_ICONS = {
  [USER_ROLES.ADMIN]:  <FaUserShield className="text-red-400" />,
  [USER_ROLES.MEMBER]: <FaUsers      className="text-blue-400" />,
  [USER_ROLES.AGENT]:  <FaUserTie   className="text-green-400" />,
  [USER_ROLES.VIEWER]: <FaEye       className="text-slate-400" />,
};

const STATUS_STYLES = {
  active:   'bg-green-500/10  text-green-400  border-green-500/30',
  inactive: 'bg-slate-500/10  text-slate-400  border-slate-500/30',
  pending:  'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  blocked:  'bg-red-500/10   text-red-400    border-red-500/30',
};
const STATUS_LABELS = {
  active: 'Activo', inactive: 'Inactivo', pending: 'Pendiente', blocked: 'Bloqueado',
};

const UserCard = ({
  user,
  onEdit,
  onDelete,
  onChangeStatus,
  onResetPassword,
  onViewDetail,        // ✅ nuevo: abre UserDetailPanel
  currentUserRole,
}) => {
  if (!user) return null;

  const isAdmin      = currentUserRole === USER_ROLES.ADMIN;
  const isAgent      = user.role === USER_ROLES.AGENT;
  const displayName  = user.displayName || user.email || 'Usuario';
  const initial      = displayName.charAt(0).toUpperCase();
  const roleBadge    = USER_ROLE_BADGE_CLASSES[user.role] || USER_ROLE_BADGE_CLASSES[USER_ROLES.VIEWER];
  const statusBadge  = STATUS_STYLES[user.status]  || STATUS_STYLES.inactive;
  const canToggle    = isAdmin && onChangeStatus;
  const canEdit      = isAdmin && onEdit;
  const canDel       = isAdmin && onDelete && user.role !== USER_ROLES.ADMIN;

  // Formatear última conexión
  const lastSeen = user.lastSeen?.toDate
    ? user.lastSeen.toDate().toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
    : null;

  // Mini KPIs solo para agentes (si existen en el doc)
  const agentStats = isAgent ? [
    { icon: FaHome,           value: user.totalProperties ?? '–', label: 'Propiedades' },
    { icon: FaCalendarCheck,  value: user.totalVisits      ?? '–', label: 'Visitas' },
    { icon: FaFileContract,   value: user.totalContracts   ?? '–', label: 'Contratos' },
  ] : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, transition: { duration: 0.18 } }}
      className="card-soft border border-slate-800 hover:border-primary/40 transition-colors duration-300 flex flex-col"
    >
      {/* ─ Header ─ */}
      <div className="p-5 flex items-start gap-4">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={displayName}
              className="w-14 h-14 rounded-full object-cover border-2 border-primary/30"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center text-2xl font-bold text-primary border-2 border-primary/30">
              {initial}
            </div>
          )}
          {/* Indicador online */}
          {user.online && (
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-slate-900" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-light font-bold text-base truncate">{displayName}</h3>
          {/* Badges en línea */}
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold border ${roleBadge}`}>
              {ROLE_ICONS[user.role]}
              {USER_ROLE_LABELS[user.role] || 'Sin rol'}
            </span>
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold border ${statusBadge}`}>
              {user.status === 'active' ? <FaToggleOn /> : <FaToggleOff />}
              {STATUS_LABELS[user.status] || 'Desconocido'}
            </span>
          </div>
        </div>
      </div>

      {/* ─ Contacto ─ */}
      <div className="px-5 pb-3 space-y-1.5">
        <div className="flex items-center gap-2 text-sm">
          <FaEnvelope className="text-slate-500 flex-shrink-0" />
          <span className="text-slate-300 truncate text-xs">{user.email || 'Sin email'}</span>
        </div>
        {user.phone && (
          <div className="flex items-center gap-2 text-sm">
            <FaPhone className="text-slate-500 flex-shrink-0" />
            <span className="text-slate-300 text-xs">{user.phone}</span>
          </div>
        )}
        {lastSeen && (
          <p className="text-xs text-slate-500 mt-1">Última vez: {lastSeen}</p>
        )}
      </div>

      {/* ─ Mini KPIs agente ─ */}
      {isAgent && (
        <div className="mx-5 mb-3 grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          {agentStats.map(({ icon: Icon, value, label }) => (
            <div key={label} className="text-center">
              <Icon className="text-primary mx-auto mb-0.5 text-xs" />
              <p className="text-light font-bold text-sm tabular-nums">{value}</p>
              <p className="text-slate-500 text-xs">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ─ Acciones ─ */}
      {isAdmin && (
        <div className="px-5 pb-5 pt-3 border-t border-slate-800 flex flex-wrap gap-2 mt-auto">
          {/* Ver detalle completo */}
          {onViewDetail && (
            <button
              onClick={() => onViewDetail(user)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-semibold transition-all"
            >
              <FaExpand className="text-xs" /> Ver detalle
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => onEdit(user)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-xs font-semibold transition-all"
              title="Editar"
            >
              <FaEdit />
            </button>
          )}
          {canToggle && (
            <button
              onClick={() => onChangeStatus(user)}
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                user.status === 'active'
                  ? 'bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400'
                  : 'bg-green-500/10 hover:bg-green-500/20 text-green-400'
              }`}
              title={user.status === 'active' ? 'Desactivar' : 'Activar'}
            >
              {user.status === 'active' ? <FaToggleOff /> : <FaToggleOn />}
            </button>
          )}
          {onResetPassword && (
            <button
              onClick={() => onResetPassword(user)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-all"
              title="Resetear contraseña"
            >
              <FaKey />
            </button>
          )}
          {canDel && (
            <button
              onClick={() => onDelete(user)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-semibold transition-all"
              title="Eliminar"
            >
              <FaTrash />
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default UserCard;
