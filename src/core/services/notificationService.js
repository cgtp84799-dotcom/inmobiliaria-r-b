// src/core/services/notificationService.js

import { getToken, onMessage } from 'firebase/messaging';
import {
  doc, updateDoc, deleteDoc, getDoc, collection, addDoc,
  serverTimestamp, query, where, getDocs, orderBy, limit, onSnapshot,
} from 'firebase/firestore';
import { db, messagingReady } from '../config/firebase.config';


import { SITE_URL as BASE_URL } from '../config/site.config';

// ── VAPID ─────────────────────────────────────────────────────────────────────
// código la leía como VITE_VAPID_KEY → push notifications rotas en prod.
// Ahora aceptamos ambos nombres (primero el canónico, luego el legacy) para
// evitar romper despliegues durante la transición.
const VAPID_KEY =
  import.meta.env.VITE_VAPID_KEY ||
  import.meta.env.VITE_FIREBASE_VAPID_KEY ||
  '';

if (!VAPID_KEY && typeof window !== 'undefined' && import.meta.env.PROD) {
  // No lanzar error — solo logueo. Notificaciones push es feature opcional.
  console.warn(
    '[notificationService] VITE_VAPID_KEY no está configurada. Las notificaciones push no funcionarán.'
  );
}
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
  PROPERTY_CREATED:   'property_created',
  PROPERTY_UPDATED:   'property_updated',
  PROPERTY_DELETED:   'property_deleted',
  CONTRACT_ASSIGNED:  'contract_assigned',
  CONTRACT_SIGNED:    'contract_signed',
  TASK_ASSIGNED:      'task_assigned',
  COMMENT_REPLY:      'comment_reply',
  SYSTEM:             'system',
};

// ── Legacy alias ──────────────────────────────────────────────────────────────
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


// ── Email vía extensión "Trigger Email from Firestore" ────────────────────────
// Escribe en /mail → la extensión ext-firestore-send-email lo procesa y envía.
const sendMailDoc = async (to, subject, html) => {
  if (!to) return;
  try {
    await addDoc(collection(db, 'mail'), {
      to,
      message: { subject, html },
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn('⚠️ sendMailDoc:', e.message);
  }
};

// ── Template de email genérico para notificaciones al cliente ─────────────────
//
// AUDITORÍA (notificaciones): este template antes cargaba `@import url('https://
// fonts.googleapis.com/...')` que Gmail BLOQUEA — terminaba con fonts default.
// También faltaban media queries → no era responsive en mobile. Ahora:
//   • Stack de fuentes de sistema (idéntico a functions/src/emails/layout.js)
//   • Media queries para 600px y 480px
//   • Botones full-width en mobile (touch target 44px)
//   • Logo escalable
function buildEmailHtml(title, message, type) {
  const accentMap = {
    [NOTIF_TYPES.VISIT_CONFIRMED]:   '#22c55e',
    [NOTIF_TYPES.VISIT_REJECTED]:    '#ef4444',
    [NOTIF_TYPES.VISIT_RESCHEDULED]: '#3b82f6',
    [NOTIF_TYPES.CONTRACT_CREATED]:  '#3b82f6',
    [NOTIF_TYPES.CONTRACT_ASSIGNED]: '#3b82f6',
    [NOTIF_TYPES.CONTRACT_SIGNED]:   '#22c55e',
    [NOTIF_TYPES.NEW_PROPERTY]:      '#f59e0b',
    [NOTIF_TYPES.WELCOME]:           '#10b981',
    [NOTIF_TYPES.MANUAL]:            '#a78bfa',
  };
  const accent = accentMap[type] || '#f59e0b';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="format-detection" content="telephone=no">
  <title>${title}</title>
  <style>
    *{box-sizing:border-box;}
    body{margin:0;padding:0;background:#f0f4f8;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%;}
    img{max-width:100%;height:auto;border:0;}
    .wrapper{background:#f0f4f8;padding:40px 16px;}
    .card{background:#fff;border-radius:20px;overflow:hidden;max-width:600px;margin:0 auto;width:100%;box-shadow:0 4px 24px rgba(0,0,0,.08);}
    .header{background:#0d0d0b;padding:32px 40px 28px;text-align:center;}
    .header img{display:block;margin:0 auto;max-width:180px;height:auto;}
    .header span{font-size:9px;font-weight:500;letter-spacing:.22em;text-transform:uppercase;color:#8a7a5a;margin-top:8px;display:block;}
    .body{padding:36px 40px;}
    h1{font-size:24px;font-weight:700;color:#1a1a18;margin:0 0 12px;line-height:1.3;}
    p{font-size:15px;color:#3d3c38;line-height:1.7;margin:0 0 16px;}
    .msg-box{background:#faf8f3;border-left:4px solid ${accent};border-radius:0 10px 10px 0;padding:16px 20px;margin:20px 0;font-size:14px;color:#3d3c38;line-height:1.7;}
    .btn{display:inline-block;background:${accent};color:#fff;font-weight:700;padding:14px 32px;border-radius:50px;text-decoration:none;font-size:15px;min-height:24px;line-height:1.3;}
    .btn-center{text-align:center;margin-top:24px;}
    .footer{background:#f9f8f6;border-top:1px solid #e8e5e0;padding:20px 40px;text-align:center;}
    .footer p{font-size:12px;color:#a09a8e;line-height:1.7;margin:0;}
    .footer a{color:#c8a44a;text-decoration:none;}
    @media only screen and (max-width:600px){
      .wrapper{padding:20px 8px!important;}
      .card{border-radius:14px!important;}
      .header{padding:24px 20px 20px!important;}
      .header img{max-width:140px!important;}
      .body{padding:26px 20px!important;}
      .footer{padding:18px 20px!important;}
      h1{font-size:22px!important;}
      .btn{display:block!important;width:100%!important;max-width:320px!important;margin:0 auto!important;padding:14px 20px!important;box-sizing:border-box!important;}
    }
    @media only screen and (max-width:480px){
      .wrapper{padding:12px 0!important;}
      .card{border-radius:0!important;box-shadow:none!important;}
      .body{padding:22px 16px!important;}
      h1{font-size:20px!important;}
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <img src="${BASE_URL}/logo-dark.png" alt="R&B Inmobiliaria">
        <span>Inmobiliaria &middot; Real Estate</span>
      </div>
      <div class="body">
        <h1>${title}</h1>
        <div class="msg-box">${message}</div>
        <div class="btn-center">
          <a class="btn" href="${BASE_URL}/acceso-clientes">Ver en mi portal →</a>
        </div>
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} R&B Inmobiliaria &mdash; Anserma, Caldas<br>
        <a href="mailto:inmojuridi09@gmail.com">inmojuridi09@gmail.com</a> &nbsp;&middot;&nbsp; 310 596 8202</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}


// ── Core: crear notificación in-app en Firestore ──────────────────────────────
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


// ── sendClientNotification ────────────────────────────────────────────────────
/**
 * Envía una notificación a un cliente:
 *   1. Notificación in-app (colección /notifications, visible en la campana del portal)
 *   2. Email vía extensión Trigger Email (/mail → ext-firestore-send-email)
 *
 * Acepta DOS formas de llamada para compatibilidad con todo el código existente:
 *
 *   Forma A — parámetros separados (visit.service.js, property.service.js):
 *     sendClientNotification(email, title, message, type, relatedId)
 *
 *   Forma B — payload como objeto (otros servicios):
 *     sendClientNotification(email, { title, message, type, relatedId })
 *
 * @returns {Promise<string>} ID del documento de notificación creado
 */
export const sendClientNotification = async (
  clientEmail,
  titleOrPayload,
  msgArg,
  typeArg,
  relatedIdArg = null,
) => {
  if (!clientEmail) throw new Error('sendClientNotification: clientEmail es requerido');

  // Normalizar ambas formas de llamada
  const isObject = typeof titleOrPayload === 'object' && titleOrPayload !== null;
  const title     = isObject ? titleOrPayload.title     : titleOrPayload;
  const message   = isObject ? titleOrPayload.message   : msgArg;
  const type      = isObject ? titleOrPayload.type      : typeArg;
  const relatedId = isObject ? (titleOrPayload.relatedId ?? null) : relatedIdArg;

  // 1. Notificación in-app
  const notifId = await createNotification({
    userId: clientEmail,
    title,
    message,
    type:      type || NOTIF_TYPES.MANUAL,
    relatedId,
  });

  // 2. Email (no bloquea el flujo si falla)
  sendMailDoc(clientEmail, title, buildEmailHtml(title, message, type)).catch(() => {});

  return notifId;
};


// ── Queries de notificaciones ─────────────────────────────────────────────────
export const getUserNotifications = async (userId, limitCount = 50) => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount),
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
      where('read', '==', false),
    );
    const snap = await getDocs(q);
    await Promise.all(
      snap.docs.map((d) => updateDoc(d.ref, { read: true, readAt: serverTimestamp() })),
    );
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


// ── Helpers de notificaciones internas (agentes/admin) ───────────────────────
export const createPropertyNotification = (userId, propertyId, propertyTitle, action) =>
  createNotification({
    userId,
    type:    NOTIF_TYPES.PROPERTY_CREATED,
    title:   `🏠 Propiedad ${action}`,
    message: propertyTitle,
    data:    { url: '/dashboard/properties', propertyId },
  });


// ─────────────────────────────────────────────────────────────────────────────
//  Suscripción en tiempo real (real-time listener)
// ─────────────────────────────────────────────────────────────────────────────
//
// Usado por useNotifications hook para mantener la campana del topbar
// sincronizada en vivo. Devuelve la función de unsubscribe.
//
export const subscribeToNotifications = (userId, callback) => {
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
};


// ─────────────────────────────────────────────────────────────────────────────
//  Eliminar notificación
// ─────────────────────────────────────────────────────────────────────────────
export const deleteNotification = async (notificationId) => {
  if (!notificationId) return;
  try {
    await deleteDoc(doc(db, 'notifications', notificationId));
  } catch (error) {
    console.error('❌ deleteNotification:', error);
  }
};


// ═════════════════════════════════════════════════════════════════════════════
//  Objeto agrupador `notificationService`
// ═════════════════════════════════════════════════════════════════════════════
//
// Mismo nombre y forma que el antiguo wrapper de modules/notifications/, pero
// SIN duplicar lógica — solo referencia las funciones de arriba.
//
// Este export existe por compatibilidad con código que hace:
//
//   import { notificationService } from '...';
//   notificationService.createNotification({...});
//
// Si estás escribiendo código nuevo, prefiere los named exports:
//
//   import { createNotification } from '.../notificationService';
//
export const notificationService = {
  subscribeToNotifications,
  markAsRead:        markNotificationAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
};