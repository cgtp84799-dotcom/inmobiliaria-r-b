import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  FaBell, FaFileAlt, FaComments, FaUser, FaExclamationCircle,
  FaCalendarCheck, FaFileContract, FaUserPlus, FaTrash,
} from 'react-icons/fa';
import { MdMarkEmailRead } from 'react-icons/md';

/**
 * Mapa de tipos → { Icono, color de acento }
 * Cubre todos los tipos del plan maestro:
 *   document_expiring | new_message | new_inquiry ← legacy
 *   visit_request | visit_approved | visit_rejected | visit_completed
 *   access_request | contract_signed | system
 */
const TYPE_META = {
  document_expiring: { Icon: FaFileAlt,       color: 'text-amber-400',   ring: 'bg-amber-500/15'  },
  new_message:       { Icon: FaComments,       color: 'text-blue-400',    ring: 'bg-blue-500/15'   },
  new_inquiry:       { Icon: FaUser,           color: 'text-green-400',   ring: 'bg-green-500/15'  },
  visit_request:     { Icon: FaCalendarCheck,  color: 'text-yellow-400',  ring: 'bg-yellow-500/15' },
  visit_approved:    { Icon: FaCalendarCheck,  color: 'text-emerald-400', ring: 'bg-emerald-500/15'},
  visit_rejected:    { Icon: FaCalendarCheck,  color: 'text-red-400',     ring: 'bg-red-500/15'    },
  visit_completed:   { Icon: FaCalendarCheck,  color: 'text-sky-400',     ring: 'bg-sky-500/15'    },
  access_request:    { Icon: FaUserPlus,       color: 'text-purple-400',  ring: 'bg-purple-500/15' },
  contract_signed:   { Icon: FaFileContract,   color: 'text-teal-400',    ring: 'bg-teal-500/15'   },
  system:            { Icon: FaExclamationCircle, color: 'text-[var(--color-text-muted)]', ring: 'bg-slate-500/15'  },
};

const DEFAULT_META = { Icon: FaBell, color: 'text-primary', ring: 'bg-primary/15' };

/**
 * NotificationItem
 *
 * Props:
 *   notification  — doc de Firestore con { id, type, title, message, read, createdAt, actionUrl? }
 *   onRead(id)    — callback al marcar como leída (viene de useNotifications)
 *   onDelete(id)  — callback al borrar
 *   onClose()     — cierra el dropdown del Bell
 */
export default function NotificationItem({ notification, onRead, onDelete, onClose }) {
  const navigate   = useNavigate();
  const { Icon, color, ring } = TYPE_META[notification.type] ?? DEFAULT_META;

  const timeAgo = notification.createdAt
    ? formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true, locale: es })
    : null;

  const handleClick = async () => {
    if (!notification.read) onRead(notification.id);
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
      onClose?.();
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(notification.id);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
      transition={{ duration: 0.18 }}
      onClick={handleClick}
      className={`group relative flex items-start gap-3 px-4 py-3 cursor-pointer
        border-b border-[var(--color-border)] transition-colors select-none
        ${ notification.read
          ? 'hover:bg-[var(--color-surface)]/50'
          : 'bg-[var(--color-surface)]/70 hover:bg-[var(--color-input-bg)]/70'
        }`}
    >
      {/* Indicador de no leída */}
      {!notification.read && (
        <span className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
      )}

      {/* Ícono del tipo */}
      <div className={`mt-0.5 w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${ring}`}>
        <Icon className={`text-sm ${color}`} />
      </div>

      {/* Contenido */}
      <div className="flex-1 min-w-0 pr-6">
        <p className={`text-sm leading-snug ${
          notification.read ? 'text-[var(--color-text)] font-normal' : 'text-[var(--color-text)] font-semibold'
        }`}>
          {notification.title}
        </p>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5 leading-snug line-clamp-2">
          {notification.message}
        </p>
        {timeAgo && (
          <p className="text-[10px] text-[var(--color-text-muted)] mt-1">{timeAgo}</p>
        )}
      </div>

      {/* Acciones hover */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1
        opacity-0 group-hover:opacity-100 transition-opacity">
        {!notification.read && (
          <button
            onClick={(e) => { e.stopPropagation(); onRead(notification.id); }}
            title="Marcar como leída"
            className="p-1.5 rounded-md hover:bg-slate-600 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            <MdMarkEmailRead size={14} />
          </button>
        )}
        <button
          onClick={handleDelete}
          title="Eliminar"
          className="p-1.5 rounded-md hover:bg-red-500/20 text-[var(--color-text-muted)] hover:text-red-400 transition-colors"
        >
          <FaTrash size={11} />
        </button>
      </div>
    </motion.div>
  );
}