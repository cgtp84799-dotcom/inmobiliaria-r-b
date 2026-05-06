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
      // El backend ya escapa HTML al renderizar el email (escapeHtml en
      // utils.js), pero recortar valores y forzar tipos protege contra
      // inputs hostiles (formularios automatizados, bots).
      const trim = (v, max) => String(v ?? '').trim().slice(0, max);
      const safeData = {
        name:    trim(contactData.name, 200),
        email:   trim(contactData.email, 200).toLowerCase(),
        phone:   trim(contactData.phone, 30),
        message: trim(contactData.message, 3000),
      };
      // Campos opcionales — solo si vienen
      if (contactData.propertyId)    safeData.propertyId    = trim(contactData.propertyId, 100);
      if (contactData.propertyTitle) safeData.propertyTitle = trim(contactData.propertyTitle, 300);
      if (contactData.interest)      safeData.interest      = trim(contactData.interest, 100);
      if (contactData.source)        safeData.source        = trim(contactData.source, 100);

      // Validaciones básicas
      if (!safeData.name)    throw new Error('El nombre es obligatorio');
      if (!safeData.email || !safeData.email.includes('@')) throw new Error('Correo inválido');
      if (!safeData.message) throw new Error('El mensaje es obligatorio');

      const docRef = await addDoc(collection(db, this.collectionName), {
        ...safeData,
        status: 'pending', // pending, contacted, closed
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return {
        id: docRef.id,
        ...safeData,
      };
    } catch (error) {
      console.error('Error creando contacto:', error);
      // Si el error ya tiene mensaje específico (validación), propagarlo
      if (error?.message && error.message.length < 200 && !error.code) {
        throw error;
      }
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