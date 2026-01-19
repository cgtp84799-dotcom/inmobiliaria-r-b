import { auth, db } from '../../../core/config/firebase.config';
import {
  sendPasswordResetEmail
} from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  Timestamp,
  query,
  where,
  limit
} from 'firebase/firestore';

const USERS_COLLECTION = 'users';

class UserService {
  // ========================================
  // OBTENER USUARIOS
  // ========================================

  async getAllUsers() {
    try {
      const usersRef = collection(db, USERS_COLLECTION);
      const snapshot = await getDocs(usersRef);

      return snapshot.docs.map((d) => ({
        id: d.id, // id = email
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.(),
        updatedAt: d.data().updatedAt?.toDate?.()
      }));
    } catch (error) {
      console.error('Error obteniendo usuarios:', error);
      throw error;
    }
  }

  // ✅ En este proyecto el docId de users ES el email
  async getUserByEmail(email) {
    try {
      if (!email) throw new Error('Email requerido');

      const userDoc = await getDoc(doc(db, USERS_COLLECTION, email));

      if (!userDoc.exists()) {
        throw new Error('Usuario no encontrado');
      }

      return {
        id: userDoc.id, // id=email
        ...userDoc.data(),
        createdAt: userDoc.data().createdAt?.toDate?.(),
        updatedAt: userDoc.data().updatedAt?.toDate?.()
      };
    } catch (error) {
      console.error('Error obteniendo usuario:', error);
      throw error;
    }
  }

  // ✅ Fallback si alguna vez necesitas buscar por uid
  async getUserByUid(uid) {
    try {
      if (!uid) throw new Error('uid requerido');

      const q = query(
        collection(db, USERS_COLLECTION),
        where('uid', '==', uid),
        limit(1)
      );

      const snap = await getDocs(q);
      if (snap.empty) throw new Error('Usuario no encontrado');

      const d = snap.docs[0];
      return {
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.(),
        updatedAt: d.data().updatedAt?.toDate?.()
      };
    } catch (error) {
      console.error('Error obteniendo usuario por uid:', error);
      throw error;
    }
  }

  // ========================================
  // CREAR/ACTUALIZAR PERFIL EN FIRESTORE (solo Firestore)
  // ========================================

  // Útil si ya existe en Auth (por cloud function) y quieres asegurar datos/merge
  async upsertUserProfileByEmail(email, userData) {
    try {
      if (!email) throw new Error('Email requerido');

      await setDoc(
        doc(db, USERS_COLLECTION, email),
        {
          ...userData,
          email,
          updatedAt: Timestamp.now()
        },
        { merge: true }
      );

      return { id: email, ...userData };
    } catch (error) {
      console.error('Error upsert user profile:', error);
      throw error;
    }
  }

  // ========================================
  // ACTUALIZAR USUARIO (Firestore)
  // ========================================

  // ✅ userId aquí realmente es email
  async updateUser(email, userData) {
    try {
      if (!email) throw new Error('Email requerido');

      const userRef = doc(db, USERS_COLLECTION, email);

      await updateDoc(userRef, {
        ...userData,
        updatedAt: Timestamp.now()
      });

      return { id: email, ...userData };
    } catch (error) {
      console.error('Error actualizando usuario:', error);
      throw error;
    }
  }

  async changeUserStatus(email, newStatus) {
    try {
      if (!email) throw new Error('Email requerido');

      const userRef = doc(db, USERS_COLLECTION, email);

      await updateDoc(userRef, {
        status: newStatus,
        updatedAt: Timestamp.now()
      });

      return { success: true };
    } catch (error) {
      console.error('Error cambiando estado:', error);
      throw error;
    }
  }

  // ========================================
  // RESETEAR CONTRASEÑA
  // ========================================

  async sendPasswordReset(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      console.error('Error enviando reset de contraseña:', error);
      throw error;
    }
  }
}

export const userService = new UserService();
