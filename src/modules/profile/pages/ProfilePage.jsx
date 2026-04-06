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
import {
  USER_ROLE_LABELS,
  USER_ROLES,
} from '../../users/types/user.types';

// ─────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────
const BREADCRUMBS = [
  { href: PRIVATE_ROUTES.DASHBOARD, label: 'Dashboard' },
  { label: 'Mi perfil' },
];

/** Calcula qué tan completo está el perfil (0-100) */
function useProfileCompletion(currentUser, userData) {
  return useMemo(() => {
    const checks = [
      { label: 'Nombre completo',   done: !!(userData?.displayName || currentUser?.displayName) },
      { label: 'Foto de perfil',    done: !!(userData?.photoURL || currentUser?.photoURL) },
      { label: 'Teléfono',         done: !!userData?.phone },
      { label: 'Rol asignado',     done: !!userData?.role },
      { label: 'Cuenta activa',    done: userData?.status === 'active' },
    ];
    const done = checks.filter((c) => c.done).length;
    return { checks, percent: Math.round((done / checks.length) * 100) };
  }, [currentUser, userData]);
}

/** Color del rol para el banner */
const ROLE_BANNER = {
  [USER_ROLES.ADMIN]:  { from: 'from-red-900/40',     to: 'to-slate-950', accent: 'border-red-500/30' },
  [USER_ROLES.MEMBER]: { from: 'from-primary/20',     to: 'to-slate-950', accent: 'border-primary/30' },
  [USER_ROLES.VIEWER]: { from: 'from-slate-700/30',   to: 'to-slate-950', accent: 'border-slate-600/30' },
};

// ─────────────────────────────────────────────────────────────────
// Animación reutilizable con stagger
// ─────────────────────────────────────────────────────────────────
const CONTAINER = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const ITEM = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
};

// ─────────────────────────────────────────────────────────────────
// Barra de completitud sticky
// ─────────────────────────────────────────────────────────────────
function CompletionBar({ percent, checks }) {
  const color =
    percent === 100 ? 'bg-green-500' :
    percent >= 60   ? 'bg-primary'   :
    percent >= 40   ? 'bg-yellow-500' : 'bg-red-500';

  if (percent === 100) return null; // ya no necesita mostrarse

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="card-soft border border-slate-800 p-4 sm:p-5"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <FaStar className="text-primary text-xs" />
          Completa tu perfil
        </span>
        <span className={`text-sm font-bold ${
          percent === 100 ? 'text-green-400' : 'text-slate-300'
        }`}>{percent}%</span>
      </div>

      {/* Barra */}
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-3">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
        />
      </div>

      {/* Checks */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {checks.map((c) => (
          <span
            key={c.label}
            className={`inline-flex items-center gap-1 text-xs ${
              c.done ? 'text-green-400' : 'text-slate-500'
            }`}
          >
            {c.done
              ? <FaCheckCircle className="flex-shrink-0" />
              : <span className="w-3 h-3 rounded-full border border-slate-600 flex-shrink-0" />}
            {c.label}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Stat pill (mini tarjeta de resumen en el banner)
// ─────────────────────────────────────────────────────────────────
function StatPill({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-900/60 backdrop-blur-sm rounded-xl border border-slate-700/50">
      <Icon className="text-primary text-base flex-shrink-0" />
      <div>
        <p className="text-[11px] text-slate-500 leading-none">{label}</p>
        <p className="text-sm font-semibold text-slate-200 mt-0.5 leading-none">{value}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Divisor de sección con icono
// ─────────────────────────────────────────────────────────────────
function SectionDivider({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon className="text-primary text-xs" />
      </div>
      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{label}</span>
      <div className="flex-1 h-px bg-slate-800" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// ProfilePage
// ─────────────────────────────────────────────────────────────────
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
  const role = userData?.role || currentUser?.role || USER_ROLES.VIEWER;
  const banner = ROLE_BANNER[role] || ROLE_BANNER[USER_ROLES.VIEWER];
  const roleName = USER_ROLE_LABELS[role] || role;
  const isOnline = userData?.online ?? false;

  return (
    <>
      <Helmet>
        <title>Mi perfil | Rincón Bedoya & Asociados</title>
      </Helmet>

      {/* ── Hero banner con gradiente según rol ── */}
      <div className={`relative bg-gradient-to-b ${banner.from} ${banner.to} overflow-hidden`}>
        {/* Orbes decorativos de fondo */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -top-16 -left-16 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -top-8 right-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-3xl mx-auto px-4 pt-6 pb-8">
          <Breadcrumbs items={BREADCRUMBS} />

          {/* Título + stat pills */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mt-4 mb-5"
          >
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-none">
              Mi perfil
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Gestiona tu información personal, seguridad y preferencias.
            </p>
          </motion.div>

          {/* Stat pills */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.45 }}
            className="flex flex-wrap gap-2"
          >
            <StatPill icon={FaUser}       label="Rol"     value={roleName} />
            <StatPill icon={FaCheckCircle} label="Perfil" value={`${percent}% completo`} />
            <StatPill
              icon={FaClock}
              label="Estado"
              value={isOnline ? 'En línea' : 'Desconectado'}
            />
          </motion.div>
        </div>
      </div>

      {/* ── Contenido principal ── */}
      <motion.div
        variants={CONTAINER}
        initial="hidden"
        animate="show"
        className="max-w-3xl mx-auto px-4 pb-12 space-y-4"
      >
        {/* Barra de completitud (solo si < 100%) */}
        <motion.div variants={ITEM}>
          <CompletionBar percent={percent} checks={checks} />
        </motion.div>

        {/* ──── Identidad ──── */}
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

        {/* ──── Seguridad ──── */}
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

        {/* ──── Preferencias ──── */}
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

        {/* ──── Sesión ──── */}
        <motion.div variants={ITEM}>
          <SectionDivider icon={FaClock} label="Sesión" />
        </motion.div>

        <motion.div variants={ITEM}>
          <SessionSection userData={userData} onSignOut={handleSignOut} />
        </motion.div>

        {/* ──── Zona de peligro ──── */}
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
