import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../core/contexts/AuthContext';
import { useTheme } from '../../../core/contexts/ThemeContext';
import { profileService } from '../services/profile.service';

/**
 * Hook central del módulo de perfil.
 * Toda la lógica de estado y operaciones async vive aquí.
 * Los componentes solo consumen datos y llaman callbacks.
 */
export function useProfile() {
  const { currentUser, userData, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // --- Estado de carga por sección ---
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [requestingDeletion, setRequestingDeletion] = useState(false);

  // Avatar local para preview inmediato sin recargar
  const [avatarPreview, setAvatarPreview] = useState(null);

  // ── Información personal ──────────────────────────────────────────
  const savePersonalInfo = useCallback(
    async ({ displayName, phone }) => {
      if (!currentUser?.email) return;
      setSavingPersonal(true);
      try {
        await profileService.updatePersonalInfo(currentUser.email, { displayName, phone });
        toast.success('Información actualizada correctamente');
      } catch (err) {
        toast.error(err.message || 'Error al guardar la información');
        throw err; // permite que el componente maneje el estado del form
      } finally {
        setSavingPersonal(false);
      }
    },
    [currentUser?.email]
  );

  // ── Avatar ────────────────────────────────────────────────────────
  const uploadAvatar = useCallback(
    async (file) => {
      if (!currentUser?.uid || !currentUser?.email) return;
      if (!file.type.startsWith('image/')) {
        toast.error('Solo se permiten imágenes');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('La imagen no puede superar 5 MB');
        return;
      }

      // Preview inmediato
      const localUrl = URL.createObjectURL(file);
      setAvatarPreview(localUrl);
      setUploadingAvatar(true);

      try {
        const remoteUrl = await profileService.uploadAvatar(
          currentUser.uid,
          currentUser.email,
          file
        );
        setAvatarPreview(remoteUrl);
        toast.success('Foto de perfil actualizada');
      } catch (err) {
        setAvatarPreview(null); // revertir preview si falla
        toast.error(err.message || 'Error al subir la imagen');
      } finally {
        setUploadingAvatar(false);
      }
    },
    [currentUser?.uid, currentUser?.email]
  );

  // ── Contraseña ────────────────────────────────────────────────────
  const changePassword = useCallback(async ({ currentPassword, newPassword }) => {
    setSavingPassword(true);
    try {
      await profileService.changePassword(currentPassword, newPassword);
      toast.success('Contraseña actualizada correctamente');
    } catch (err) {
      toast.error(err.message || 'Error al cambiar la contraseña');
      throw err;
    } finally {
      setSavingPassword(false);
    }
  }, []);

  const sendPasswordReset = useCallback(async () => {
    if (!currentUser?.email) return;
    try {
      await profileService.sendPasswordReset(currentUser.email);
      toast.success(`Email de restablecimiento enviado a ${currentUser.email}`);
    } catch (err) {
      toast.error(err.message || 'Error al enviar el email');
    }
  }, [currentUser?.email]);

  // ── Preferencias ──────────────────────────────────────────────────
  const saveNotificationPreferences = useCallback(
    async (preferences) => {
      if (!currentUser?.email) return;
      setSavingPreferences(true);
      try {
        await profileService.updateNotificationPreferences(currentUser.email, preferences);
        toast.success('Preferencias guardadas');
      } catch (err) {
        toast.error(err.message || 'Error al guardar preferencias');
      } finally {
        setSavingPreferences(false);
      }
    },
    [currentUser?.email]
  );

  // ── Sesión ────────────────────────────────────────────────────────
  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
    } catch {
      toast.error('Error al cerrar sesión');
    }
  }, [signOut]);

  // ── Zona de peligro ───────────────────────────────────────────────
  const requestAccountDeletion = useCallback(
    async (reason) => {
      if (!currentUser?.uid || !currentUser?.email) return;
      setRequestingDeletion(true);
      try {
        await profileService.requestAccountDeletion(
          currentUser.uid,
          currentUser.email,
          reason
        );
        toast.success(
          'Solicitud enviada. Un administrador revisará tu petición en breve.'
        );
      } catch (err) {
        toast.error(err.message || 'Error al enviar la solicitud');
      } finally {
        setRequestingDeletion(false);
      }
    },
    [currentUser?.uid, currentUser?.email]
  );

  return {
    // datos
    currentUser,
    userData,
    theme,
    avatarPreview,
    // estados de carga
    savingPersonal,
    savingPassword,
    savingPreferences,
    uploadingAvatar,
    requestingDeletion,
    // acciones
    savePersonalInfo,
    uploadAvatar,
    changePassword,
    sendPasswordReset,
    toggleTheme,
    saveNotificationPreferences,
    handleSignOut,
    requestAccountDeletion,
  };
}