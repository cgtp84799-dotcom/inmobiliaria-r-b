import { motion } from 'framer-motion';
import {
  FaEdit,
  FaTrash,
  FaEnvelope,
  FaPhone,
  FaUserShield,
  FaUsers,
  FaEye,
  FaToggleOn,
  FaToggleOff,
  FaKey,
  FaUser
} from 'react-icons/fa';
import { USER_ROLES, USER_ROLE_LABELS } from '../types/user.types';

const UserCard = ({ user, onEdit, onDelete, onChangeStatus, onResetPassword, currentUserRole }) => {
  // ✅ VALIDACIÓN: Prevenir error si user es undefined
  if (!user) {
    console.warn('UserCard: user es undefined');
    return null;
  }

  const isAdmin = currentUserRole === USER_ROLES.ADMIN;

  // ✅ OBTENER NOMBRE DE FORMA SEGURA
  const displayName = user.displayName || user.email || 'Usuario';
  const email = user.email || 'Sin email';
  const initial = displayName.charAt(0).toUpperCase();

  const getRoleIcon = (role) => {
    switch (role) {
      case USER_ROLES.ADMIN: return <FaUserShield className="text-red-500" />;
      case USER_ROLES.MEMBER: return <FaUsers className="text-primary" />;
      case USER_ROLES.VIEWER: return <FaEye className="text-slate-400" />;
      default: return <FaUsers className="text-slate-500" />;
    }
  };

  const getRoleBadge = (role) => {
    const styles = {
      admin: 'bg-red-500/10 text-red-500 border-red-500/30',
      member: 'bg-primary/10 text-primary border-primary/30',
      viewer: 'bg-slate-500/10 text-slate-400 border-slate-500/30'
    };

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border ${styles[role] || styles.viewer}`}>
        {getRoleIcon(role)}
        {USER_ROLE_LABELS[role] || 'Sin rol'}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-500/10 text-green-500 border-green-500/30',
      inactive: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
      pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
      blocked: 'bg-red-500/10 text-red-500 border-red-500/30'
    };

    const labels = {
      active: 'Activo',
      inactive: 'Inactivo',
      pending: 'Pendiente',
      blocked: 'Bloqueado'
    };

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border ${styles[status] || styles.inactive}`}>
        {status === 'active' ? <FaToggleOn /> : <FaToggleOff />}
        {labels[status] || 'Desconocido'}
      </span>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      className="card-soft p-5 border border-slate-800 hover:border-primary/50 transition-all duration-300"
    >
      <div className="flex items-start gap-4 mb-4">
        {user.photoURL ? (
          <img 
            src={user.photoURL} 
            alt={displayName}
            className="w-14 h-14 rounded-full object-cover border-2 border-primary/30"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center flex-shrink-0 text-2xl font-bold text-primary border-2 border-primary/30">
            {initial}
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <h3 className="text-light font-bold text-lg truncate mb-1">
            {displayName}
          </h3>
          <div className="flex flex-wrap gap-2">
            {getRoleBadge(user.role)}
            {getStatusBadge(user.status)}
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <FaEnvelope className="text-slate-500 flex-shrink-0" />
          <span className="text-slate-300 truncate">{email}</span>
        </div>
        
        {user.phone && (
          <div className="flex items-center gap-2 text-sm">
            <FaPhone className="text-slate-500 flex-shrink-0" />
            <span className="text-slate-300">{user.phone}</span>
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-800">
          <button
            onClick={() => onEdit(user)}
            className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-semibold transition-all"
          >
            <FaEdit /> Editar
          </button>

          <button
            onClick={() => onChangeStatus(user)}
            className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
              user.status === 'active'
                ? 'bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500'
                : 'bg-green-500/10 hover:bg-green-500/20 text-green-500'
            }`}
          >
            {user.status === 'active' ? <FaToggleOff /> : <FaToggleOn />}
            {user.status === 'active' ? 'Desactivar' : 'Activar'}
          </button>

          <button
            onClick={() => onResetPassword(user)}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 rounded-lg text-sm font-semibold transition-all"
            title="Resetear contraseña"
          >
            <FaKey />
          </button>

          {user.role !== USER_ROLES.ADMIN && (
            <button
              onClick={() => onDelete(user)}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-sm font-semibold transition-all"
              title="Eliminar usuario"
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
