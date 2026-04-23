// src/modules/notifications/services/notification.service.js
// Puente de compatibilidad — NO duplica lógica, solo re-exporta y agrupa métodos.

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../../core/config/firebase.config';

// ── Named exports del core (para imports tipo { sendClientNotification, NOTIF_TYPES }) ──
export * from '../../../core/services/notificationService';

// ── Objeto con métodos (para imports tipo { notificationService } o default) ──
export const notificationService = {

  subscribeToNotifications(userId, callback) {
    if (!userId) {
      callback([]);
      return () => {};
    }
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
    );
    return onSnapshot(
      q,
      (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.error('subscribeToNotifications:', err),
    );
  },

  async markAsRead(notificationId) {
    if (!notificationId) return;
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true,
        readAt: serverTimestamp(),
      });
    } catch (e) {
      console.error('notificationService.markAsRead:', e);
    }
  },

  async markAllAsRead(userId) {
    if (!userId) return;
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false),
    );
    const snap = await getDocs(q);
    await Promise.all(
      snap.docs.map((d) =>
        updateDoc(d.ref, { read: true, readAt: serverTimestamp() }),
      ),
    );
  },

  async deleteNotification(notificationId) {
    if (!notificationId) return;
    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
    } catch (e) {
      console.error('notificationService.deleteNotification:', e);
    }
  },

  async createNotification(notification) {
    try {
      const docRef = await addDoc(collection(db, 'notifications'), {
        ...notification,
        read: false,
        readAt: null,
        createdAt: serverTimestamp(),
        expiresAt: notification.expiresAt || null,
      });
      return docRef.id;
    } catch (e) {
      console.error('notificationService.createNotification:', e);
      throw e;
    }
  },
};

export default notificationService;