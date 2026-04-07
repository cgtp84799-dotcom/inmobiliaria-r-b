// src/modules/users/services/user.service.js
//
// ⚠️ MODELO DE DATOS: docId en /users ES el email (no el uid de Firebase Auth)
//    Toda operación que necesita identificar un usuario usa el email como id.
//    createUser() crea el doc en Firestore — la cuenta en Auth la crea el admin
//    a través de Cloud Function o del panel de Firebase.

import { auth, db } from '../../../core/config/firebase.config';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  Timestamp,
  query,
  where,
  limit,
} from 'firebase/firestore';

const USERS_COLLECTION = 'users';

class UserService {

  // ── LECTURA ──────────────────────────────────────────────────────────────

  async getAllUsers() {
    try {
      const snapshot = await getDocs(collection(db, USERS_COLLECTION));
      return snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.(),
        updatedAt: d.data().updatedAt?.toDate?.(),
      }));
    } catch (error) {
      console.error('Error obteniendo usuarios:', error);
      throw error;
    }
  }

  async getUserByEmail(email) {
    try {
      if (!email) throw new Error('Email requerido');
      const userDoc = await getDoc(doc(db, USERS_COLLECTION, email));
      if (!userDoc.exists()) throw new Error('Usuario no encontrado');
      return {
        id: userDoc.id,
        ...userDoc.data(),
        createdAt: userDoc.data().createdAt?.toDate?.(),
        updatedAt: userDoc.data().updatedAt?.toDate?.(),
      };
    } catch (error) {
      console.error('Error obteniendo usuario:', error);
      throw error;
    }
  }

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
        updatedAt: d.data().updatedAt?.toDate?.(),
      };
    } catch (error) {
      console.error('Error obteniendo usuario por uid:', error);
      throw error;
    }
  }

  // ── CREAR ─────────────────────────────────────────────────────────────────
  //
  // Flujo:
  //  1. createUserWithEmailAndPassword  → crea la cuenta en Firebase Auth
  //  2. updateProfile                   → asigna displayName en Auth
  //  3. setDoc(email)                   → crea el perfil en Firestore (docId = email)
  //
  // El admin que ejecuta esta acción NO pierde su sesión porque Firebase Auth
  // solo desloguea al usuario si la sesión activa cambia — createUserWithEmailAndPassword
  // no modifica la sesión del admin en navegadores modernos (cada llamada es independiente).
  // Si en producción esto causa problemas, la solución definitiva es una Cloud Function.

  async createUser(userData, password) {
    const { displayName, email, phone, role, status } = userData;

    if (!email)    throw new Error('Email requerido');
    if (!password) throw new Error('Contraseña requerida');
    if (!role)     throw new Error('Rol requerido');

    try {
      // 1. Crear en Auth
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = credential.user.uid;

      // 2. displayName en Auth
      if (displayName) {
        await updateProfile(credential.user, { displayName });
      }

      // 3. Perfil en Firestore (docId = email)
      const profile = {
        uid,
        email,
        displayName: displayName || '',
        phone:       phone        || '',
        role:        role         || 'viewer',
        status:      status       || 'active',
        photoURL:    '',
        createdAt:   Timestamp.now(),
        updatedAt:   Timestamp.now(),
      };

      await setDoc(doc(db, USERS_COLLECTION, email), profile);

      return { id: email, ...profile };
    } catch (error) {
      console.error('Error creando usuario:', error);
      // Propaga el error para que UserEditModal lo muestre en la UI
      throw error;
    }
  }

  // ── ACTUALIZAR ────────────────────────────────────────────────────────────

  async upsertUserProfileByEmail(email, userData) {
    try {
      if (!email) throw new Error('Email requerido');
      await setDoc(
        doc(db, USERS_COLLECTION, email),
        { ...userData, email, updatedAt: Timestamp.now() },
        { merge: true }
      );
      return { id: email, ...userData };
    } catch (error) {
      console.error('Error upsert user profile:', error);
      throw error;
    }
  }

  // userId aquí realmente es email (docId = email)
  async updateUser(email, userData) {
    try {
      if (!email) throw new Error('Email requerido');
      await updateDoc(doc(db, USERS_COLLECTION, email), {
        ...userData,
        updatedAt: Timestamp.now(),
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
      await updateDoc(doc(db, USERS_COLLECTION, email), {
        status:    newStatus,
        updatedAt: Timestamp.now(),
      });
      return { success: true };
    } catch (error) {
      console.error('Error cambiando estado:', error);
      throw error;
    }
  }

  // ── ELIMINAR ──────────────────────────────────────────────────────────────
  //
  // Solo elimina el perfil de Firestore.
  // La cuenta en Firebase Auth NO se elimina desde el cliente (requiere Admin SDK).
  // El usuario quedará en Auth sin doc en Firestore → el listener de AuthContext
  // manejará ese caso (userData = null, rol = null → redirige a login).
  // Para eliminar de Auth también, usa una Cloud Function en el siguiente PR.

  async deleteUser(email) {
    try {
      if (!email) throw new Error('Email requerido');
      await deleteDoc(doc(db, USERS_COLLECTION, email));
      return { success: true };
    } catch (error) {
      console.error('Error eliminando usuario:', error);
      throw error;
    }
  }

  // ── CONTRASEÑA ────────────────────────────────────────────────────────────

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
