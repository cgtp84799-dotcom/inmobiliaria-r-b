// src/modules/users/services/user.service.js
//
// ═══════════════════════════════════════════════════════════════════
// AUDITORÍA - FIXES APLICADOS:
//
//   1. ★ FIX CRÍTICO (previo): createUser() ya NO usa
//      createUserWithEmailAndPassword como fallback.
//
//   2. ★ FIX CRÍTICO (previo): deleteUser() tiene protección contra
//      auto-eliminación.
//
//   3. ★ FIX NUEVO: CF_BASE_URL ahora se construye correctamente.
//      Con Firebase Functions v2, la URL puede ser:
//        - En algunos proyectos: https://us-central1-PROJECT.cloudfunctions.net/FUNCTION
//        - En otros (gen2 run): https://FUNCTION-HASH-uc.a.run.app
//      Para máxima compatibilidad, usamos la variable de entorno
//      VITE_FUNCTIONS_BASE_URL si está definida.
//      Si no, construimos la URL estándar de v2 con el projectId.
//
//   4. ★ FIX: Mejor manejo de errores HTTP con mensajes claros.
// ═══════════════════════════════════════════════════════════════════

import { auth, db } from '../../../core/config/firebase.config';
import {
  sendPasswordResetEmail,
} from 'firebase/auth';
import {
  collection, doc, setDoc, getDoc, getDocs,
  updateDoc, deleteDoc, Timestamp, query, where, limit,
} from 'firebase/firestore';

const USERS_COLLECTION   = 'users';
const CLIENTS_COLLECTION = 'clients';

// ── URL de Cloud Functions ────────────────────────────────────────────────────
// Firebase Functions v2 usa URLs diferentes según la configuración.
// VITE_FUNCTIONS_BASE_URL permite especificar la URL manualmente.
// Fallback: formato estándar de Firebase Functions v1/v2.
const CF_BASE_URL = import.meta.env.VITE_FUNCTIONS_BASE_URL
  || `https://us-central1-${import.meta.env.VITE_FIREBASE_PROJECT_ID}.cloudfunctions.net`;

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
      const q    = query(collection(db, USERS_COLLECTION), where('uid', '==', uid), limit(1));
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

  // ── Helper para llamar Cloud Functions ──────────────────────────────────

  async _callCloudFunction(functionName, data) {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) {
      throw new Error('No hay sesión activa. Inicia sesión como admin primero.');
    }

    const url = `${CF_BASE_URL}/${functionName}`;
    console.log(`[userService] Calling CF: ${url}`);

    const res = await fetch(url, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({ data }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      const errMsg = errBody.error || `Error del servidor (${res.status})`;

      // Si es 404, posiblemente la URL de la CF es incorrecta
      if (res.status === 404) {
        console.error(
          `[userService] Cloud Function "${functionName}" no encontrada en ${url}.`,
          'Si usas Firebase Functions v2, verifica la URL en la consola de Firebase.',
          'Puedes setear VITE_FUNCTIONS_BASE_URL en tu .env'
        );
        throw new Error(
          `Función "${functionName}" no encontrada. Verifica que las Cloud Functions estén desplegadas ` +
          `y que VITE_FUNCTIONS_BASE_URL esté configurada correctamente en tu .env`
        );
      }

      throw new Error(errMsg);
    }

    return res.json();
  }

  // ── CREAR ─────────────────────────────────────────────────────────────────

  async createUser(userData, password) {
    const { displayName, email, phone, role, status } = userData;

    if (!email)    throw new Error('Email requerido');
    if (!password) throw new Error('Contraseña requerida');
    if (!role)     throw new Error('Rol requerido');

    try {
      const result = await this._callCloudFunction('createUserByAdmin', {
        email,
        password,
        displayName,
        phone,
        role,
        status: status || 'active',
      });

      return {
        id: email,
        email,
        displayName,
        phone,
        role,
        status: status || 'active',
        uid: result.result?.uid,
      };

    } catch (error) {
      console.error('Error creando usuario:', error);

      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error(
          'No se pudo conectar con el servidor de Cloud Functions. ' +
          'Verifica que las funciones estén desplegadas y que la URL sea correcta. ' +
          'URL actual: ' + CF_BASE_URL
        );
      }

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

  async deleteUser(email, userRole = null) {
    if (!email) throw new Error('Email requerido');

    // ★ PROTECCIÓN: No eliminar al usuario actualmente logueado
    const currentEmail = auth.currentUser?.email;
    if (currentEmail && currentEmail.toLowerCase() === email.toLowerCase()) {
      throw new Error('No puedes eliminar tu propia cuenta desde aquí.');
    }

    // ★ FIX (auditoría): si el usuario es agente (admin/member), verificar
    // que no tenga contratos activos. Antes podías borrar a un agente con
    // contratos vigentes → los emails de cobranza iban a buzón inexistente.
    const normalizedEmail = email.toLowerCase().trim();
    const isAgent = userRole === 'admin' || userRole === 'member';
    if (isAgent) {
      try {
        const activeContractsSnap = await getDocs(
          query(
            collection(db, 'contracts'),
            where('agentEmail', '==', normalizedEmail),
            where('statusGeneral', 'in', ['vigente', 'activo', 'borrador', 'pausado']),
            limit(1),
          )
        );
        if (!activeContractsSnap.empty) {
          throw new Error(
            `No se puede eliminar: este agente tiene contratos activos asignados. ` +
            `Reasigna los contratos a otro agente antes de eliminar al usuario.`
          );
        }
      } catch (e) {
        if (e?.message?.includes('No se puede eliminar')) throw e;
        // Si la query falla por permisos o índice, no bloqueamos — log
        console.warn('[deleteUser] no se pudo verificar contratos:', e?.message);
      }
    }

    // Paso 1: Intentar Cloud Function
    let cfSuccess = false;
    try {
      await this._callCloudFunction('deleteUserComplete', { userId: email });
      cfSuccess = true;
      console.log(`[userService] deleteUserComplete OK para ${email}`);
    } catch (cfErr) {
      console.warn('[userService] Cloud Function deleteUserComplete falló:', cfErr.message);
    }

    // Paso 2: Si la CF falló, eliminar /users/{email} manualmente
    if (!cfSuccess) {
      try {
        await deleteDoc(doc(db, USERS_COLLECTION, email));
      } catch (err) {
        console.error('Error eliminando /users:', err);
        throw err;
      }
    }

    // Paso 3: Eliminar doc en /clients si el usuario es viewer
    const roleIsViewer = userRole === 'viewer' || !userRole;
    if (roleIsViewer) {
      try {
        const q    = query(collection(db, CLIENTS_COLLECTION), where('email', '==', email));
        const snap = await getDocs(q);
        if (!snap.empty) {
          await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
          console.log(`[userService] Eliminado doc /clients para ${email}`);
        }
      } catch (clientErr) {
        console.warn('[userService] Error eliminando /clients:', clientErr.message);
      }
    }

    return { success: true };
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