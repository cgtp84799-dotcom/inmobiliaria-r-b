// src/modules/profile/pages/ProfilePage.jsx
//
// Mi Perfil — rediseño con tokens CSS y mejor responsive.
// • Layout en columnas en desktop (sidebar de progreso + contenido) y en
//   columna única en móvil/tablet.
// • Sin colores hardcodeados que rompan el tema dark/light.
// • Spacing consistente con el resto del panel admin.

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  FaUser, FaShieldAlt, FaBell, FaClock,
  FaExclamationTriangle, FaCheckCircle, FaStar,
} from 'react-icons/fa';
import { Helmet } from 'react-helmet-async';
import { useProfile } from '../hooks/useProfile';
import ProfileHeader from '../components/ProfileHeader';
import PersonalInfoSection from '../components/PersonalInfoSection';
import SecuritySection from '../components/SecuritySection';
import PreferencesSection from '../components/PreferencesSection';
import SessionSection from '../components/SessionSection';
import DangerZone from '../components/DangerZone';
import Breadcrumbs from '../../../shared/components/UI/Breadcrumbs';
import { PRIVATE_ROUTES } from '../../../core/config/routes.config';
import { USER_ROLE_LABELS, USER_ROLES } from '../../users/types/user.types';

const BREADCRUMBS = [
  { href: PRIVATE_ROUTES.DASHBOARD, label: 'Dashboard' },
  { label: 'Mi perfil' },
];

function useProfileCompletion(currentUser, userData) {
  return useMemo(() => {
    const checks = [
      { label: 'Nombre completo', done: !!(userData?.displayName || currentUser?.displayName) },
      { label: 'Foto de perfil',  done: !!(userData?.photoURL    || currentUser?.photoURL)    },
      { label: 'Teléfono',        done: !!userData?.phone                                      },
      { label: 'Rol asignado',    done: !!userData?.role                                       },
      { label: 'Cuenta activa',   done: userData?.status === 'active'                          },
    ];
    const done = checks.filter((c) => c.done).length;
    return { checks, percent: Math.round((done / checks.length) * 100) };
  }, [currentUser, userData]);
}

const CONTAINER = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};
const ITEM = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

// ─── Barra de completitud ──────────────────────────────────────────────
function CompletionBar({ percent, checks }) {
  if (percent === 100) return null;

  // Color del progreso vía tokens — ámbar discreto siempre.
  const barColor = 'var(--color-gold)';

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl p-4 sm:p-5 border"
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-sm font-semibold flex items-center gap-2"
          style={{ color: 'var(--color-text)' }}
        >
          <FaStar className="text-xs" style={{ color: 'var(--color-gold)' }} />
          Completa tu perfil
        </span>
        <span
          className="text-sm font-bold"
          style={{ color: 'var(--color-text)' }}
        >
          {percent}%
        </span>
      </div>
      <div
        className="h-2 rounded-full overflow-hidden mb-3"
        style={{ background: 'var(--color-inner-card)' }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ background: barColor }}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.15 }}
        />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {checks.map((c) => (
          <span
            key={c.label}
            className="inline-flex items-center gap-1.5 text-xs"
            style={{
              color: c.done
                ? '#10b981'
                : 'var(--color-text-faint)',
            }}
          >
            {c.done ? (
              <FaCheckCircle className="flex-shrink-0" />
            ) : (
              <span
                className="w-3 h-3 rounded-full border flex-shrink-0"
                style={{ borderColor: 'var(--color-text-faint)' }}
              />
            )}
            {c.label}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Stat pill ─────────────────────────────────────────────────────────
function StatPill({ icon: Icon, label, value }) {
  return (
    <div
      className="inline-flex items-center gap-2.5 px-3 py-2 rounded-xl border"
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      <Icon
        className="text-base flex-shrink-0"
        style={{ color: 'var(--color-gold)' }}
      />
      <div>
        <p
          className="text-[11px] leading-none"
          style={{ color: 'var(--color-text-faint)' }}
        >
          {label}
        </p>
        <p
          className="text-sm font-semibold mt-0.5 leading-none"
          style={{ color: 'var(--color-text)' }}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

// ─── Divisor de sección ────────────────────────────────────────────────
function SectionDivider({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{
          background: 'var(--color-inner-card)',
          color: 'var(--color-gold)',
        }}
      >
        <Icon className="text-xs" />
      </div>
      <span
        className="text-xs font-bold uppercase tracking-widest"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {label}
      </span>
      <div
        className="flex-1 h-px"
        style={{ background: 'var(--color-divider)' }}
      />
    </div>
  );
}

// ─── Página ────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const {
    currentUser, userData, theme, avatarPreview,
    savingPersonal, savingPassword, savingPreferences,
    uploadingAvatar, requestingDeletion,
    savePersonalInfo, uploadAvatar, changePassword,
    sendPasswordReset, toggleTheme, saveNotificationPreferences,
    handleSignOut, requestAccountDeletion,
  } = useProfile();

  const { checks, percent } = useProfileCompletion(currentUser, userData);
  const role = userData?.role || USER_ROLES.VIEWER;
  const roleName = USER_ROLE_LABELS[role] || role;
  const isOnline = userData?.online ?? false;

  return (
    <>
      <Helmet>
        <title>Mi perfil | Rincón Bedoya &amp; Asociados</title>
      </Helmet>

      {/* ── Banner ── */}
      <div
        className="relative overflow-hidden border-b"
        style={{
          background:
            'linear-gradient(180deg, var(--color-banner-from) 0%, var(--color-banner-mid) 60%, var(--color-banner-to) 100%)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div
            className="absolute -top-20 -left-20 w-72 h-72 rounded-full blur-3xl"
            style={{ background: 'rgba(251,191,36,0.06)' }}
          />
          <div
            className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl"
            style={{ background: 'rgba(180,83,9,0.04)' }}
          />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-8">
          <Breadcrumbs items={BREADCRUMBS} />

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="mt-4 mb-5"
          >
            <h1
              className="font-serif text-3xl sm:text-4xl tracking-tight leading-[1.05] font-semibold"
              style={{ color: 'var(--color-text)' }}
            >
              Mi perfil
            </h1>
            <p
              className="text-sm sm:text-base mt-2 max-w-xl"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Gestiona tu información personal, seguridad y preferencias.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.4 }}
            className="flex flex-wrap gap-2"
          >
            <StatPill icon={FaUser}        label="Rol"    value={roleName} />
            <StatPill icon={FaCheckCircle} label="Perfil" value={`${percent}% completo`} />
            <StatPill icon={FaClock}       label="Estado" value={isOnline ? 'En línea' : 'Desconectado'} />
          </motion.div>
        </div>
      </div>

      {/* ── Contenido ── */}
      <motion.div
        variants={CONTAINER}
        initial="hidden"
        animate="show"
        className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5"
      >
        <motion.div variants={ITEM}>
          <CompletionBar percent={percent} checks={checks} />
        </motion.div>

        <motion.div variants={ITEM}>
          <SectionDivider icon={FaUser} label="Identidad" />
        </motion.div>
        <motion.div variants={ITEM}>
          <ProfileHeader
            currentUser={currentUser}
            userData={userData}
            avatarPreview={avatarPreview}
            uploadingAvatar={uploadingAvatar}
            onAvatarChange={uploadAvatar}
          />
        </motion.div>
        <motion.div variants={ITEM}>
          <PersonalInfoSection
            userData={userData}
            saving={savingPersonal}
            onSave={savePersonalInfo}
          />
        </motion.div>

        <motion.div variants={ITEM}>
          <SectionDivider icon={FaShieldAlt} label="Seguridad" />
        </motion.div>
        <motion.div variants={ITEM}>
          <SecuritySection
            saving={savingPassword}
            onChangePassword={changePassword}
            onSendReset={sendPasswordReset}
          />
        </motion.div>

        <motion.div variants={ITEM}>
          <SectionDivider icon={FaBell} label="Preferencias" />
        </motion.div>
        <motion.div variants={ITEM}>
          <PreferencesSection
            userData={userData}
            theme={theme}
            saving={savingPreferences}
            onToggleTheme={toggleTheme}
            onSaveNotifications={saveNotificationPreferences}
          />
        </motion.div>

        <motion.div variants={ITEM}>
          <SectionDivider icon={FaClock} label="Sesión" />
        </motion.div>
        <motion.div variants={ITEM}>
          <SessionSection userData={userData} onSignOut={handleSignOut} />
        </motion.div>

        <motion.div variants={ITEM}>
          <SectionDivider icon={FaExclamationTriangle} label="Zona de peligro" />
        </motion.div>
        <motion.div variants={ITEM}>
          <DangerZone
            requesting={requestingDeletion}
            onRequestDeletion={requestAccountDeletion}
          />
        </motion.div>
      </motion.div>
    </>
  );
}
