// src/modules/notifications/services/notification.service.js
//
// CAMBIOS EN ESTA VERSIÓN:
//
// + createIfNotExists(alertKey, data)
//     Para deduplicación. Solo crea la notificación si no existe ya una
//     con el mismo `alertKey`. Lo usan las alertas programadas de
//     contratos (ver functions/index.js processContractAlerts) para no
//     enviar la misma alerta dos veces si la Cloud Function corre más
//     de una vez en la misma ventana.
//
//     El alertKey es una cadena estable como:
//       'payment_reminder_5d_<contractId>_<paymentId>'
//       'contract_expiry_30d_<contractId>'
//
//     Si necesitas resetear y permitir re-envío, borra los docs de la
//     colección que tengan ese alertKey.
//
// El resto del servicio queda intacto: createNotification, getUserNotifications,
// subscribeToNotifications, markAsRead, markAllAsRead, deleteNotification,
// y los helpers notifyDocumentExpiring/notifyNewMessage/notifyNewInquiry.

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
  limit,
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
        read:      false,
        createdAt: Timestamp.now(),
      };
      const docRef = await addDoc(collection(db, COLLECTION_NAME), newNotification);
      return { id: docRef.id, ...newNotification };
    } catch (error) {
      console.error('Error creando notificación:', error);
      throw error;
    }
  },

  // Crear notificación SOLO si no existe ya una con el mismo alertKey.
  //
  // Devuelve:
  //   { created: true, id }    si se creó la notificación
  //   { created: false }       si ya existía y no se hizo nada
  //
  // alertKey debe ser una cadena estable y única para la combinación
  // (tipo de alerta + entidad + ventana temporal). Ejemplos:
  //   'payment_reminder_5d_contract123_payment7'
  //   'contract_expiry_30d_contract123'
  //   'rent_late_3d_contract123_payment4'
  async createIfNotExists(alertKey, notificationData) {
    if (!alertKey) {
      throw new Error('createIfNotExists: alertKey requerido');
    }
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('alertKey', '==', alertKey),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        return { created: false };
      }
      const newNotification = {
        ...notificationData,
        alertKey,
        read:      false,
        createdAt: Timestamp.now(),
      };
      const docRef = await addDoc(collection(db, COLLECTION_NAME), newNotification);
      return { created: true, id: docRef.id };
    } catch (error) {
      console.error('Error en createIfNotExists:', error);
      // No relanzamos: una alerta duplicada es preferible a una caída.
      return { created: false, error };
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
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (error) {
      console.error('Error obteniendo notificaciones:', error);
      return [];
    }
  },

  // Escuchar notificaciones en tiempo real
  // Devuelve el unsubscribe — SIEMPRE llamarlo en el cleanup del useEffect.
  subscribeToNotifications(userId, onData, onError) {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const notifications = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        onData(notifications);
      },
      (error) => {
        console.error('Error en listener de notificaciones:', error);
        if (typeof onError === 'function') onError(error);
      }
    );
  },

  // Marcar como leída
  async markAsRead(notificationId) {
    try {
      await updateDoc(doc(db, COLLECTION_NAME, notificationId), { read: true });
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
      await Promise.all(
        snapshot.docs.map((docSnap) =>
          updateDoc(doc(db, COLLECTION_NAME, docSnap.id), { read: true })
        )
      );
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
    return this.createNotification({
      userId,
      type:      'document_expiring',
      title:     'Documento próximo a vencer',
      message:   `El documento "${documentName}" de "${propertyTitle}" vence en ${daysRemaining} días`,
      data:      { propertyTitle, documentName, daysRemaining },
      actionUrl: '/dashboard/documentos',
    });
  },

  // Crear notificación de nuevo mensaje
  async notifyNewMessage(userId, senderName, chatId) {
    return this.createNotification({
      userId,
      type:      'new_message',
      title:     'Nuevo mensaje',
      message:   `${senderName} te ha enviado un mensaje`,
      data:      { senderName, chatId },
      actionUrl: '/dashboard/chat',
    });
  },

  // Crear notificación de nueva consulta
  async notifyNewInquiry(userId, clientName, propertyTitle) {
    return this.createNotification({
      userId,
      type:      'new_inquiry',
      title:     'Nueva consulta',
      message:   `${clientName} consultó sobre "${propertyTitle}"`,
      data:      { clientName, propertyTitle },
      actionUrl: '/dashboard/clientes',
    });
  },
};