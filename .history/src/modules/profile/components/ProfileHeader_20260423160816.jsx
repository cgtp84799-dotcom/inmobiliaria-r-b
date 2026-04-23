import { useRef } from 'react';
import { motion } from 'framer-motion';
import { FaCamera, FaSpinner, FaClock } from 'react-icons/fa';
import {
  USER_ROLE_LABELS,
  USER_ROLE_COLORS,
  USER_STATUS_LABELS,
  USER_STATUS,
} from '../../../modules/users/types/user.types';

/**
 * Muestra avatar (foto o iniciales), nombre, rol, estado online/offline.
 * El input de archivo está oculto — el clic lo dispara el botón de cámara.
 */
export default function ProfileHeader({ currentUser, userData, avatarPreview, uploadingAvatar, onAvatarChange }) {
  const fileInputRef = useRef(null);

  const displayName = userData?.displayName || currentUser?.displayName || currentUser?.email || 'Usuario';
  const initial = displayName.charAt(0).toUpperCase();
  const photoURL = avatarPreview || userData?.photoURL || currentUser?.photoURL;
  const role = userData?.role || 'viewer';
  const status = userData?.status || 'pending';
  const isOnline = userData?.online ?? false;
  const roleColor = USER_ROLE_COLORS[role] || 'slate';
  const isPending = status === USER_STATUS.PENDING;

  return (
    <div className="card-soft p-6 border border-slate-800">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary/30 bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center">
            {photoURL ? (
              <img src={photoURL} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl font-bold text-primary">{initial}</span>
            )}
          </div>

          {/* Indicador online */}
          <span
            className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-slate-900 ${
              isOnline ? 'bg-green-500' : 'bg-slate-500'
            }`}
            title={isOnline ? 'En línea' : 'Desconectado'}
          />

          {/* Botón cámara */}
          <button
            type="button"
            disabled={uploadingAvatar}
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-slate-900 hover:bg-yellow-400 transition-all disabled:opacity-50"
            aria-label="Cambiar foto de perfil"
          >
            {uploadingAvatar ? (
              <FaSpinner className="animate-spin text-xs" />
            ) : (
              <FaCamera className="text-xs" />
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            aria-hidden="true"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onAvatarChange(file);
              e.target.value = ''; // reset para permitir reseleccionar el mismo archivo
            }}
          />
        </div>

        {/* Info */}
        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-2xl font-bold text-white mb-1">{displayName}</h1>
          <p className="text-slate-400 text-sm mb-3">{currentUser?.email}</p>

          <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
            {/* Badge rol */}
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border bg-${roleColor}-500/10 text-${roleColor}-400 border-${roleColor}-500/30`}
            >
              {USER_ROLE_LABELS[role] || role}
            </span>

            {/* Badge estado */}
            {isPending && (
              <motion.span
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
              >
                <FaClock className="text-xs" />
                {USER_STATUS_LABELS[status]}
              </motion.span>
            )}

            {/* Online/Offline */}
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border ${
                isOnline
                  ? 'bg-green-500/10 text-green-400 border-green-500/30'
                  : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
              }`}
            >
              {isOnline ? 'En línea' : 'Desconectado'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}