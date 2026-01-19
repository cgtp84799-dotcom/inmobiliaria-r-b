// src/core/services/notificationService.js
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import {
  doc,
  updateDoc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  orderBy,
  limit
} from 'firebase/firestore';

import { db } from '../config/firebase.config';
import app from '../config/firebase.config';

// ✅ TU CLAVE VAPID
const VAPID_KEY =
  'BEjKiJLZDYvPsTIrx1zOiTpmjpczmmcQA9kpA1Ziyf3G2GzmCo2BdfTmBzCuryDGe1mnEeOC5pXn25qVItbqeoo';

let messaging = null;

// Inicializar messaging
export const initializeMessaging = async () => {
  try {
    const supported = await isSupported();
    if (!supported) {
      console.warn('⚠️ Firebase Messaging no soportado en este navegador');
      return null;
    }

    messaging = getMessaging(app);
    console.log('✅ Firebase Messaging inicializado');
    return messaging;
  } catch (error) {
    console.error('❌ Error inicializando messaging:', error);
    return null;
  }
};

// Solicitar permiso de notificaciones (usa EMAIL como ID de users/{email})
export const requestNotificationPermission = async (userEmail) => {
  try {
    // Validaciones básicas
    if (!userEmail) {
      console.warn('⚠️ requestNotificationPermission: userEmail vacío');
      return null;
    }

    // Verificar soporte del navegador
    if (!('Notification' in window)) {
      console.warn('⚠️ Este navegador no soporta notificaciones');
      return null;
    }

    const permission = await Notification.requestPermission();

    if (permission !== 'granted') {
      if (permission === 'denied') console.log('❌ Permiso denegado');
      else console.log('⚠️ Permiso por defecto');
      return null;
    }

    // Inicializar messaging si no está inicializado
    if (!messaging) messaging = await initializeMessaging();
    if (!messaging) return null;

    // Obtener token FCM
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (!token) {
      console.warn('⚠️ No se pudo obtener token FCM');
      return null;
    }

    // Guardar token en Firestore SIN crear usuarios fantasma
    await saveTokenToDatabase(userEmail, token);

    return token;
  } catch (error) {
    console.error('❌ Error solicitando permiso:', error);
    return null;
  }
};

// Guardar token en Firestore (NO crea docs nuevos en users)
const saveTokenToDatabase = async (userEmail, token) => {
  try {
    const userRef = doc(db, 'users', userEmail);

    // Verificar si el usuario existe
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // ⚠️ CLAVE: NO crear documento mínimo (eso genera "usuarios fantasma")
      console.warn(
        '⚠️ Usuario no encontrado en Firestore. No se creará documento de notificaciones:',
        userEmail
      );
      return;
    }

    // Usuario existe -> actualizar
    await updateDoc(userRef, {
      fcmToken: token,
      lastTokenUpdate: serverTimestamp(),
      notificationsEnabled: true
    });

    console.log('✅ Token actualizado en usuario existente:', userEmail);
  } catch (error) {
    console.error('❌ Error guardando token:', error);
  }
};

// Escuchar mensajes en foreground
export const onMessageListener = async () => {
  if (!messaging) messaging = await initializeMessaging();
  if (!messaging) return null;

  return new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      console.log('📨 Mensaje recibido en foreground:', payload);
      resolve(payload);
    });
  });
};

// Crear notificación en Firestore
export const createNotification = async (notification) => {
  try {
    const notificationsRef = collection(db, 'notifications');

    const notificationData = {
      ...notification,
      read: false,
      createdAt: serverTimestamp(),
      expiresAt: notification.expiresAt || null
    };

    const docRef = await addDoc(notificationsRef, notificationData);
    console.log('✅ Notificación creada:', docRef.id);

    return docRef.id;
  } catch (error) {
    console.error('❌ Error creando notificación:', error);
    throw error;
  }
};

// Obtener notificaciones de un usuario
export const getUserNotifications = async (userId, limitCount = 50) => {
  try {
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate()
    }));
  } catch (error) {
    console.error('❌ Error obteniendo notificaciones:', error);
    return [];
  }
};

// Marcar notificación como leída
export const markNotificationAsRead = async (notificationId) => {
  try {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      read: true,
      readAt: serverTimestamp()
    });
  } catch (error) {
    console.error('❌ Error marcando como leída:', error);
  }
};

// Marcar todas como leídas
export const markAllAsRead = async (userId) => {
  try {
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      where('read', '==', false)
    );

    const snapshot = await getDocs(q);

    const updates = snapshot.docs.map((d) =>
      updateDoc(d.ref, { read: true, readAt: serverTimestamp() })
    );

    await Promise.all(updates);
    console.log('✅ Todas las notificaciones marcadas como leídas');
  } catch (error) {
    console.error('❌ Error marcando todas como leídas:', error);
  }
};

// Deshabilitar notificaciones (usa EMAIL como ID de users/{email})
export const disableNotifications = async (userEmail) => {
  try {
    if (!userEmail) return;

    const userRef = doc(db, 'users', userEmail);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      console.warn('⚠️ disableNotifications: usuario no existe:', userEmail);
      return;
    }

    await updateDoc(userRef, {
      notificationsEnabled: false,
      fcmToken: null
    });

    console.log('🔕 Notificaciones deshabilitadas:', userEmail);
  } catch (error) {
    console.error('❌ Error deshabilitando notificaciones:', error);
  }
};

// Tipos de notificaciones
export const NOTIFICATION_TYPES = {
  CHAT_MESSAGE: 'chat_message',
  PROPERTY_CREATED: 'property_created',
  PROPERTY_UPDATED: 'property_updated',
  PROPERTY_DELETED: 'property_deleted',
  VIDEO_CALL: 'video_call',
  TASK_ASSIGNED: 'task_assigned',
  COMMENT_REPLY: 'comment_reply',
  SYSTEM: 'system'
};

// Plantillas de notificaciones
export const createChatNotification = (userId, senderId, senderName, message) =>
  createNotification({
    userId,
    type: NOTIFICATION_TYPES.CHAT_MESSAGE,
    title: `💬 Nuevo mensaje de ${senderName}`,
    body: message.substring(0, 100),
    icon: '/chat-icon.png',
    data: {
      url: '/dashboard/chat',
      senderId
    }
  });

export const createPropertyNotification = (userId, propertyId, propertyTitle, action) =>
  createNotification({
    userId,
    type: NOTIFICATION_TYPES.PROPERTY_CREATED,
    title: `🏠 Propiedad ${action}`,
    body: propertyTitle,
    icon: '/property-icon.png',
    data: {
      url: '/dashboard/properties',
      propertyId
    }
  });

export const createVideoCallNotification = (userId, callerId, callerName) =>
  createNotification({
    userId,
    type: NOTIFICATION_TYPES.VIDEO_CALL,
    title: `📞 Llamada entrante`,
    body: `${callerName} te está llamando`,
    icon: '/video-icon.png',
    requireInteraction: true,
    data: {
      url: '/dashboard/chat',
      callerId
    }
  });