// FIX [CALIDAD]: elimina logs informativos de sincronización en cliente.
import { db } from '../../../core/config/firebase.config';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';

/**
 * Función para sincronizar usuario de Auth a Firestore
 * Llámala cuando un usuario inicie sesión y no exista en Firestore
 */
export async function syncUserToFirestore(authUser, defaultRole = 'viewer') {
  try {
    const userRef = doc(db, 'users', authUser.email);
    const userDoc = await getDoc(userRef);

    // Si NO existe en Firestore, créalo
    if (!userDoc.exists()) {
      await setDoc(userRef, {
        uid: authUser.uid,
        email: authUser.email,
        displayName: authUser.displayName || '',
        phone: authUser.phoneNumber || '',
        role: defaultRole,
        status: 'pending', // Pendiente hasta que admin apruebe
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      return true;
    }

    return false;
  } catch (error) {
    console.error('Error sincronizando usuario:', error);
    return false;
  }
}