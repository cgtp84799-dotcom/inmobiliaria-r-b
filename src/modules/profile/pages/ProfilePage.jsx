import { motion } from 'framer-motion';
import { useProfile } from '../hooks/useProfile';
import ProfileHeader from '../components/ProfileHeader';
import PersonalInfoSection from '../components/PersonalInfoSection';
import SecuritySection from '../components/SecuritySection';
import PreferencesSection from '../components/PreferencesSection';
import SessionSection from '../components/SessionSection';
import DangerZone from '../components/DangerZone';
import Breadcrumbs from '../../../shared/components/UI/Breadcrumbs';
import { PRIVATE_ROUTES } from '../../../core/config/routes.config';

const BREADCRUMBS = [
  { href: PRIVATE_ROUTES.DASHBOARD, label: 'Dashboard' },
  { label: 'Mi perfil' },
];

const sectionAnim = (delay) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.4 },
});

export default function ProfilePage() {
  const {
    currentUser,
    userData,
    theme,
    avatarPreview,
    savingPersonal,
    savingPassword,
    savingPreferences,
    uploadingAvatar,
    requestingDeletion,
    savePersonalInfo,
    uploadAvatar,
    changePassword,
    sendPasswordReset,
    toggleTheme,
    saveNotificationPreferences,
    handleSignOut,
    requestAccountDeletion,
  } = useProfile();

  return (
    <div className="px-4 py-6 space-y-6 max-w-3xl mx-auto">
      <Breadcrumbs items={BREADCRUMBS} />

      <motion.div {...sectionAnim(0)}>
        <h1 className="text-3xl font-extrabold text-white mb-1">Mi perfil</h1>
        <p className="text-slate-400 text-sm">
          Gestiona tu información personal, seguridad y preferencias.
        </p>
      </motion.div>

      <motion.div {...sectionAnim(0.05)}>
        <ProfileHeader
          currentUser={currentUser}
          userData={userData}
          avatarPreview={avatarPreview}
          uploadingAvatar={uploadingAvatar}
          onAvatarChange={uploadAvatar}
        />
      </motion.div>

      <motion.div {...sectionAnim(0.1)}>
        <PersonalInfoSection
          userData={userData}
          saving={savingPersonal}
          onSave={savePersonalInfo}
        />
      </motion.div>

      <motion.div {...sectionAnim(0.15)}>
        <SecuritySection
          saving={savingPassword}
          onChangePassword={changePassword}
          onSendReset={sendPasswordReset}
        />
      </motion.div>

      <motion.div {...sectionAnim(0.2)}>
        <PreferencesSection
          userData={userData}
          theme={theme}
          saving={savingPreferences}
          onToggleTheme={toggleTheme}
          onSaveNotifications={saveNotificationPreferences}
        />
      </motion.div>

      <motion.div {...sectionAnim(0.25)}>
        <SessionSection userData={userData} onSignOut={handleSignOut} />
      </motion.div>

      <motion.div {...sectionAnim(0.3)}>
        <DangerZone
          requesting={requestingDeletion}
          onRequestDeletion={requestAccountDeletion}
        />
      </motion.div>
    </div>
  );
}