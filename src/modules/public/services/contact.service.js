import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../core/config/firebase.config';

class ContactService {
  constructor() {
    this.collectionName = 'contacts';
  }

  /**
   * Crear una nueva consulta de contacto
   */
  async createContact(contactData) {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...contactData,
        status: 'pending', // pending, contacted, closed
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return {
        id: docRef.id,
        ...contactData
      };
    } catch (error) {
      console.error('Error creando contacto:', error);
      throw new Error('No se pudo enviar la consulta. Intenta nuevamente.');
    }
  }

  /**
   * Obtener todas las consultas (para el panel interno)
   */
  async getAllContacts() {
    try {
      const querySnapshot = await getDocs(
        query(
          collection(db, this.collectionName),
          orderBy('createdAt', 'desc')
        )
      );

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      }));
    } catch (error) {
      console.error('Error obteniendo contactos:', error);
      throw error;
    }
  }

  /**
   * Actualizar estado de una consulta
   */
  async updateContactStatus(contactId, status) {
    try {
      const docRef = doc(db, this.collectionName, contactId);
      await updateDoc(docRef, {
        status,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error actualizando estado:', error);
      throw error;
    }
  }
}

export default new ContactService();