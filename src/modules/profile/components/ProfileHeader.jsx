// src/modules/profile/components/ProfileHeader.jsx
//
// Cabecera de perfil — rediseño con tokens CSS y soporte para light/dark.
// Sin colores hardcodeados (slate-*, white, etc.) salvo los badges que ya
// existían como clases estáticas (USER_ROLE_BADGE_CLASSES) que sí compilan.

import { useRef } from 'react';
import { motion } from 'framer-motion';
import { FaCamera, FaSpinner, FaClock, FaCheckCircle } from 'react-icons/fa';
import {
  USER_ROLE_LABELS,
  USER_ROLE_BADGE_CLASSES,
  USER_STATUS_LABELS,
  USER_STATUS,
} from '../../../modules/users/types/user.types';

const FALLBACK_BADGE = 'bg-amber-500/10 text-amber-500 border-amber-500/30';

export default function ProfileHeader({
  currentUser,
  userData,
  avatarPreview,
  uploadingAvatar,
  onAvatarChange,
}) {
  const fileInputRef = useRef(null);

  const displayName =
    userData?.displayName ||
    currentUser?.displayName ||
    currentUser?.email ||
    'Usuario';
  const initial = displayName.charAt(0).toUpperCase();
  const photoURL = avatarPreview || userData?.photoURL || currentUser?.photoURL;
  const role = userData?.role || 'viewer';
  const status = userData?.status || 'pending';
  const isOnline = userData?.online ?? false;
  const isPending = status === USER_STATUS.PENDING;

  const roleBadgeCls = USER_ROLE_BADGE_CLASSES[role] || FALLBACK_BADGE;

  return (
    <div
      className="rounded-2xl p-5 sm:p-7 border"
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden flex items-center justify-center"
            style={{
              background:
                'linear-gradient(135deg, var(--color-gold-soft) 0%, var(--color-gold) 100%)',
              boxShadow:
                '0 0 0 4px var(--color-surface), 0 0 0 5px var(--color-border)',
            }}
          >
            {photoURL ? (
              <img
                src={photoURL}
                alt={displayName}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span
                className="text-3xl sm:text-4xl font-bold"
                style={{ color: 'var(--color-bg)' }}
              >
                {initial}
              </span>
            )}
          </div>

          {/* Indicador online */}
          <span
            className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full"
            style={{
              background: isOnline
                ? '#10b981'
                : 'var(--color-text-faint)',
              boxShadow: '0 0 0 2px var(--color-surface)',
            }}
            title={isOnline ? 'En línea' : 'Desconectado'}
            aria-hidden="true"
          />

          {/* Botón cámara */}
          <button
            type="button"
            disabled={uploadingAvatar}
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-50"
            style={{
              background: 'var(--color-gold)',
              color: 'var(--color-bg)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
            aria-label="Cambiar foto de perfil"
          >
            {uploadingAvatar ? (
              <FaSpinner className="animate-spin text-sm" />
            ) : (
              <FaCamera className="text-sm" />
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
              e.target.value = '';
            }}
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 text-center sm:text-left w-full">
          <h1
            className="text-xl sm:text-2xl font-bold mb-1 truncate"
            style={{ color: 'var(--color-text)' }}
          >
            {displayName}
          </h1>
          <p
            className="text-sm mb-4 truncate"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {currentUser?.email}
          </p>

          <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${roleBadgeCls}`}
            >
              {USER_ROLE_LABELS[role] || role}
            </span>

            {isPending && (
              <motion.span
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border bg-amber-500/10 text-amber-500 border-amber-500/30"
              >
                <FaClock className="text-[10px]" />
                {USER_STATUS_LABELS[status]}
              </motion.span>
            )}

            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border"
              style={{
                background: isOnline
                  ? 'rgba(16, 185, 129, 0.10)'
                  : 'var(--color-inner-card)',
                color: isOnline
                  ? '#10b981'
                  : 'var(--color-text-muted)',
                borderColor: isOnline
                  ? 'rgba(16, 185, 129, 0.30)'
                  : 'var(--color-border)',
              }}
            >
              {isOnline ? (
                <>
                  <FaCheckCircle className="text-[10px]" /> En línea
                </>
              ) : (
                'Desconectado'
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
