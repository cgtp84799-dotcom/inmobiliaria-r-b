// src/modules/profile/services/profile.service.js
//
// ═══════════════════════════════════════════════════════════════════
// NOTA: Este servicio usa auth.currentUser (el objeto Auth nativo de Firebase)
// directamente, NO el currentUser del contexto (que ahora es un objeto plano).
// Esto es correcto porque las operaciones de Auth (reauthenticate, updatePassword)
// necesitan el Auth User puro de Firebase.
// ═══════════════════════════════════════════════════════════════════

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
    // de payloads anormales en el doc del usuario.
    const safeName  = String(displayName ?? '').trim().slice(0, 200);
    const safePhone = String(phone ?? '').trim().slice(0, 30);
    if (!safeName) throw new Error('El nombre es obligatorio');
    const userRef = doc(db, USERS_COLLECTION, email);
    await updateDoc(userRef, {
      displayName: safeName,
      phone: safePhone,
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
    if (file.size === 0) throw new Error('El archivo está vacío');
    if (file.size > 5 * 1024 * 1024) throw new Error('La imagen excede 5 MB');
    if (file.type && !/^image\//i.test(file.type)) {
      throw new Error('El archivo debe ser una imagen');
    }

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
   * ★ Usa auth.currentUser (Auth User nativo de Firebase), NO el del contexto.
   */
  async changePassword(currentPassword, newPassword) {
    const user = auth.currentUser;
    if (!user?.email) throw new Error('No hay sesión activa');
    if (!newPassword || newPassword.length < 8) {
      throw new Error('La nueva contraseña debe tener al menos 8 caracteres');
    }
    if (newPassword === currentPassword) {
      throw new Error('La nueva contraseña debe ser diferente a la actual');
    }

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
    const { addDoc, collection, query, where, getDocs, limit } = await import('firebase/firestore');
    // pending para el mismo email, no crear otra (rules ya restringen
    // por authEmail pero igualmente protegemos del lado cliente).
    try {
      const existingSnap = await getDocs(
        query(
          collection(db, 'accountDeletionRequests'),
          where('email', '==', email),
          where('status', '==', 'pending'),
          limit(1)
        )
      );
      if (!existingSnap.empty) {
        throw new Error('Ya tienes una solicitud de eliminación en proceso. Espera a que un administrador la revise.');
      }
    } catch (e) {
      if (e?.message?.includes('Ya tienes')) throw e;
      // Si la query falla por permisos, continuamos — el create
      // todavía puede tener éxito o ser rechazado por rules.
    }
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