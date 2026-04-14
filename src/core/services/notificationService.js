// src/core/services/notificationService.js
import { getToken, onMessage } from 'firebase/messaging';
import {
  doc, updateDoc, getDoc, collection, addDoc,
  serverTimestamp, query, where, getDocs, orderBy, limit,
} from 'firebase/firestore';
import { db, messagingReady } from '../config/firebase.config';

// ── VAPID ─────────────────────────────────────────────────────────────────────
const VAPID_KEY =
  'BEjKiJLZDYvPsTIrx1zOiTpmjpczmmcQA9kpA1Ziyf3G2GzmCo2BdfTmBzCuryDGe1mnEeOC5pXn25qVItbqeoo';

// ── Tipos de notificación exportados ─────────────────────────────────────────
export const NOTIF_TYPES = {
  // cliente portal
  VISIT_CONFIRMED:    'visit_confirmed',
  VISIT_REJECTED:     'visit_rejected',
  VISIT_RESCHEDULED:  'visit_rescheduled',
  CONTRACT_CREATED:   'contract_created',
  NEW_PROPERTY:       'new_property',
  WELCOME:            'welcome',
  MANUAL:             'manual',
  // sistema interno (agentes/admin)
  CHAT_MESSAGE:       'chat_message',
  PROPERTY_CREATED:   'property_created',
  PROPERTY_UPDATED:   'property_updated',
  PROPERTY_DELETED:   'property_deleted',
  CONTRACT_ASSIGNED:  'contract_assigned',
  CONTRACT_SIGNED:    'contract_signed',
  VIDEO_CALL:         'video_call',
  TASK_ASSIGNED:      'task_assigned',
  COMMENT_REPLY:      'comment_reply',
  SYSTEM:             'system',
};

// ── Legacy alias (mantiene compatibilidad con código que use NOTIFICATION_TYPES)
export const NOTIFICATION_TYPES = NOTIF_TYPES;

// ── Messaging ─────────────────────────────────────────────────────────────────
export const initializeMessaging = () => messagingReady;

export const requestNotificationPermission = async (userEmail) => {
  try {
    if (!userEmail) return null;
    if (!('Notification' in window)) return null;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const messaging = await messagingReady;
    if (!messaging) return null;

    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (!token) return null;

    await saveTokenToDatabase(userEmail, token);
    return token;
  } catch (error) {
    console.error('❌ requestNotificationPermission:', error);
    return null;
  }
};

const saveTokenToDatabase = async (userEmail, token) => {
  try {
    const userRef  = doc(db, 'users', userEmail);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;
    await updateDoc(userRef, {
      fcmToken:             token,
      lastTokenUpdate:      serverTimestamp(),
      notificationsEnabled: true,
    });
  } catch (error) {
    console.error('❌ saveTokenToDatabase:', error);
  }
};

export const onMessageListener = async () => {
  const messaging = await messagingReady;
  if (!messaging) return null;
  return new Promise((resolve) => {
    onMessage(messaging, (payload) => resolve(payload));
  });
};

// ── Core: crear notificación en Firestore ─────────────────────────────────────
export const createNotification = async (notification) => {
  try {
    const docRef = await addDoc(collection(db, 'notifications'), {
      ...notification,
      read:      false,
      readAt:    null,
      createdAt: serverTimestamp(),
      expiresAt: notification.expiresAt || null,
    });
    return docRef.id;
  } catch (error) {
    console.error('❌ createNotification:', error);
    throw error;
  }
};

// ── NUEVO: sendClientNotification ─────────────────────────────────────────────
/**
 * Envía una notificación a un cliente identificado por su email.
 *
 * @param {string} clientEmail  - Email del cliente (userId en la colección notifications)
 * @param {object} payload
 * @param {string} payload.title     - Título de la notificación
 * @param {string} payload.message   - Cuerpo del mensaje
 * @param {string} payload.type      - Uno de los valores en NOTIF_TYPES
 * @param {string} [payload.relatedId] - ID del recurso relacionado (visita, contrato, propiedad)
 *
 * @returns {Promise<string>} ID del documento creado
 */
export const sendClientNotification = async (clientEmail, { title, message, type, relatedId = null }) => {
  if (!clientEmail) throw new Error('sendClientNotification: clientEmail es requerido');
  return createNotification({
    userId:    clientEmail,
    title,
    message,
    type:      type || NOTIF_TYPES.MANUAL,
    relatedId,
  });
};

// ── Queries de notificaciones ──────────────────────────────────────────────────
export const getUserNotifications = async (userId, limitCount = 50) => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate?.() ?? null,
    }));
  } catch (error) {
    console.error('❌ getUserNotifications:', error);
    return [];
  }
};

export const markNotificationAsRead = async (notificationId) => {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), {
      read: true, readAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('❌ markNotificationAsRead:', error);
  }
};

export const markAllAsRead = async (userId) => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false)
    );
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map((d) =>
      updateDoc(d.ref, { read: true, readAt: serverTimestamp() })
    ));
  } catch (error) {
    console.error('❌ markAllAsRead:', error);
  }
};

export const disableNotifications = async (userEmail) => {
  try {
    if (!userEmail) return;
    const userRef  = doc(db, 'users', userEmail);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;
    await updateDoc(userRef, { notificationsEnabled: false, fcmToken: null });
  } catch (error) {
    console.error('❌ disableNotifications:', error);
  }
};

// ── Helpers de plantillas (usados internamente y desde servicios) ──────────────
export const createChatNotification       = (userId, senderId, senderName, message) =>
  createNotification({ userId, type: NOTIF_TYPES.CHAT_MESSAGE, title: `💬 Nuevo mensaje de ${senderName}`, body: message.substring(0, 100), data: { url: '/dashboard/chat', senderId } });

export const createPropertyNotification  = (userId, propertyId, propertyTitle, action) =>
  createNotification({ userId, type: NOTIF_TYPES.PROPERTY_CREATED, title: `🏠 Propiedad ${action}`, body: propertyTitle, data: { url: '/dashboard/properties', propertyId } });

export const createVideoCallNotification = (userId, callerId, callerName) =>
  createNotification({ userId, type: NOTIF_TYPES.VIDEO_CALL, title: '📞 Llamada entrante', body: `${callerName} te está llamando`, requireInteraction: true, data: { url: '/dashboard/chat', callerId } });