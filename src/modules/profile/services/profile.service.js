import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../../../core/config/firebase.config';
import { optimizeImage } from '../../../shared/utils/imageOptimization';

const USERS_COLLECTION = 'users';

class ProfileService {
  /**
   * Actualiza los datos personales del usuario en Firestore.
   * docId = email (convención del proyecto).
   */
  async updatePersonalInfo(email, { displayName, phone }) {
    if (!email) throw new Error('Email requerido');
    const userRef = doc(db, USERS_COLLECTION, email);
    await updateDoc(userRef, {
      displayName,
      phone,
      updatedAt: Timestamp.now(),
    });
  }

  /**
   * Sube el avatar a Firebase Storage en avatars/{uid},
   * comprime antes de subir, actualiza photoURL en Firestore.
   * Retorna la nueva URL pública.
   */
  async uploadAvatar(uid, email, file) {
    if (!uid || !email || !file) throw new Error('Parámetros incompletos');

    const optimized = await optimizeImage(file, 400, 0.85);
    const avatarRef = ref(storage, `avatars/${uid}`);
    await uploadBytes(avatarRef, optimized);
    const photoURL = await getDownloadURL(avatarRef);

    const userRef = doc(db, USERS_COLLECTION, email);
    await updateDoc(userRef, { photoURL, updatedAt: Timestamp.now() });

    return photoURL;
  }

  /**
   * Cambia la contraseña. Re-autentica primero con la contraseña actual.
   * Lanza un error descriptivo si la contraseña actual es incorrecta.
   */
  async changePassword(currentPassword, newPassword) {
    const user = auth.currentUser;
    if (!user?.email) throw new Error('No hay sesión activa');

    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    try {
      await reauthenticateWithCredential(user, credential);
    } catch {
      throw new Error('La contraseña actual no es correcta');
    }

    await updatePassword(user, newPassword);
  }

  /**
   * Envía email de restablecimiento al correo del usuario.
   */
  async sendPasswordReset(email) {
    await sendPasswordResetEmail(auth, email);
  }

  /**
   * Guarda preferencias de notificaciones en el doc del usuario.
   */
  async updateNotificationPreferences(email, preferences) {
    if (!email) throw new Error('Email requerido');
    const userRef = doc(db, USERS_COLLECTION, email);
    await updateDoc(userRef, {
      notificationPreferences: preferences,
      updatedAt: Timestamp.now(),
    });
  }

  /**
   * Crea una solicitud de eliminación de cuenta en la colección
   * accountDeletionRequests. El admin es quien la procesa.
   * NO elimina al usuario directamente.
   */
  async requestAccountDeletion(uid, email, reason) {
    const { addDoc, collection } = await import('firebase/firestore');
    await addDoc(collection(db, 'accountDeletionRequests'), {
      uid,
      email,
      reason: reason || '',
      status: 'pending',
      createdAt: Timestamp.now(),
    });
  }
}

export const profileService = new ProfileService();