import { auth, db, rtdb, functions } from '../../../core/config/firebase.config';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification
} from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  Timestamp
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
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      }));
    } catch (error) {
      console.error('Error obteniendo usuarios:', error);
      throw error;
    }
  }

  async getUserById(userId) {
    try {
      const userDoc = await getDoc(doc(db, USERS_COLLECTION, userId));
      
      if (!userDoc.exists()) {
        throw new Error('Usuario no encontrado');
      }

      return {
        id: userDoc.id,
        ...userDoc.data(),
        createdAt: userDoc.data().createdAt?.toDate(),
        updatedAt: userDoc.data().updatedAt?.toDate()
      };
    } catch (error) {
      console.error('Error obteniendo usuario:', error);
      throw error;
    }
  }

  // ========================================
  // CREAR USUARIO (Auth + Firestore + EMAIL)
  // ========================================
  
  async createUser(userData, password) {
    let userCredential = null;
    
    try {
      // 1. Crear en Firebase Auth
      userCredential = await createUserWithEmailAndPassword(
        auth,
        userData.email,
        password
      );

      const { uid } = userCredential.user;

      // 2. Enviar email de verificación
      try {
        await sendEmailVerification(userCredential.user);
        console.log('✅ Email de verificación enviado a:', userData.email);
      } catch (emailError) {
        console.warn('⚠️ No se pudo enviar email de verificación:', emailError.message);
        // Continuar aunque falle el email
      }

      // 3. Crear documento en Firestore usando email como ID
      await setDoc(doc(db, USERS_COLLECTION, userData.email), {
        uid,
        email: userData.email,
        displayName: userData.displayName || '',
        phone: userData.phone || '',
        role: userData.role || 'member',
        status: userData.status || 'active',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      console.log('✅ Usuario creado exitosamente:', userData.email);
      return { uid, ...userData };
    } catch (error) {
      console.error('Error creando usuario:', error);
      
      // Si falla Firestore pero ya se creó en Auth, intentar limpiar
      if (error.code !== 'auth/email-already-in-use' && userCredential?.user) {
        try {
          await userCredential.user.delete();
          console.log('🧹 Usuario eliminado de Auth tras error');
        } catch (cleanupError) {
          console.error('Error limpiando usuario de Auth:', cleanupError);
        }
      }
      
      throw error;
    }
  }

  // ========================================
  // ACTUALIZAR USUARIO
  // ========================================
  
  async updateUser(userId, userData) {
    try {
      const userRef = doc(db, USERS_COLLECTION, userId);
      
      await updateDoc(userRef, {
        ...userData,
        updatedAt: Timestamp.now()
      });

      return { id: userId, ...userData };
    } catch (error) {
      console.error('Error actualizando usuario:', error);
      throw error;
    }
  }

  async changeUserStatus(userId, newStatus) {
    try {
      const userRef = doc(db, USERS_COLLECTION, userId);
      
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
  // ELIMINAR USUARIO (AUTOMÁTICO CON CLOUD FUNCTION)
  // ========================================
  
  async deleteUser(userId) {
    try {
      console.log(`🗑️ Eliminando usuario completamente: ${userId}`);
      
      // Obtener token de autenticación
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No estás autenticado');
      }

      const token = await user.getIdToken();
      
      // Llamar a la Cloud Function con el token
      const functionUrl = 'https://us-central1-inmobiliaria-ryb-y-asociados.cloudfunctions.net/deleteUserComplete';
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ data: { userId } })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error eliminando usuario');
      }

      const result = await response.json();
      console.log('✅ Usuario eliminado exitosamente:', result.result);
      
      return result.result;
    } catch (error) {
      console.error('❌ Error eliminando usuario:', error);
      throw new Error(error.message || 'Error al eliminar usuario');
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