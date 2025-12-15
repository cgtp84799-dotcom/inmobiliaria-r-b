import { 
  collection, 
  addDoc, 
  updateDoc,
  deleteDoc, 
  doc, 
  getDocs, 
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../../../core/config/firebase.config';
import toast from 'react-hot-toast';

const COLLECTION_NAME = 'notifications';

export const notificationService = {
  // Crear notificación
  async createNotification(notificationData) {
    try {
      const newNotification = {
        ...notificationData,
        read: false,
        createdAt: Timestamp.now()
      };

      const docRef = await addDoc(collection(db, COLLECTION_NAME), newNotification);
      return { id: docRef.id, ...newNotification };
    } catch (error) {
      console.error('Error creando notificación:', error);
      throw error;
    }
  },

  // Obtener notificaciones del usuario
  async getUserNotifications(userId) {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error obteniendo notificaciones:', error);
      return [];
    }
  },

  // Escuchar notificaciones en tiempo real
  subscribeToNotifications(userId, callback) {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      callback(notifications);
    });
  },

  // Marcar como leída
  async markAsRead(notificationId) {
    try {
      const docRef = doc(db, COLLECTION_NAME, notificationId);
      await updateDoc(docRef, { read: true });
    } catch (error) {
      console.error('Error marcando notificación como leída:', error);
    }
  },

  // Marcar todas como leídas
  async markAllAsRead(userId) {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('userId', '==', userId),
        where('read', '==', false)
      );

      const snapshot = await getDocs(q);
      const updatePromises = snapshot.docs.map(docSnap => 
        updateDoc(doc(db, COLLECTION_NAME, docSnap.id), { read: true })
      );

      await Promise.all(updatePromises);
      toast.success('Todas las notificaciones marcadas como leídas');
    } catch (error) {
      console.error('Error marcando todas como leídas:', error);
    }
  },

  // Eliminar notificación
  async deleteNotification(notificationId) {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, notificationId));
    } catch (error) {
      console.error('Error eliminando notificación:', error);
    }
  },

  // Crear notificación automática de documento por vencer
  async notifyDocumentExpiring(userId, propertyTitle, documentName, daysRemaining) {
    return await this.createNotification({
      userId,
      type: 'document_expiring',
      title: 'Documento próximo a vencer',
      message: `El documento "${documentName}" de "${propertyTitle}" vence en ${daysRemaining} días`,
      data: { propertyTitle, documentName, daysRemaining },
      actionUrl: '/dashboard/documentos'
    });
  },

  // Crear notificación de nuevo mensaje
  async notifyNewMessage(userId, senderName, chatId) {
    return await this.createNotification({
      userId,
      type: 'new_message',
      title: 'Nuevo mensaje',
      message: `${senderName} te ha enviado un mensaje`,
      data: { senderName, chatId },
      actionUrl: '/dashboard/chat'
    });
  },

  // Crear notificación de nueva consulta
  async notifyNewInquiry(userId, clientName, propertyTitle) {
    return await this.createNotification({
      userId,
      type: 'new_inquiry',
      title: 'Nueva consulta',
      message: `${clientName} consultó sobre "${propertyTitle}"`,
      data: { clientName, propertyTitle },
      actionUrl: '/dashboard/clientes'
    });
  }
};