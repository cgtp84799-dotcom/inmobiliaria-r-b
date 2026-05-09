// src/core/services/notificationService.js
//
// ─── CORRECCIONES APLICADAS ────────────────────────────────────────────────
//  [FIX 1] getOrRegisterSW() — nueva función
//          Registra el SW explícitamente y espera a que esté en estado
//          "activated" ANTES de llamar getToken(). Sin esto, getToken()
//          devuelve null silenciosamente en Android/PWA porque el SW
//          todavía está en "installing" o "waiting" al momento de la llamada
//          (race condition crítica en móvil).
//
//  [FIX 2] requestNotificationPermission usa swReg en getToken()
//          Se pasa serviceWorkerRegistration a getToken() para que Firebase
//          use exactamente el SW que acabamos de registrar/esperar, en vez
//          de buscar uno propio (que puede no existir aún en móvil).
//
//  [FIX 3] NOTIFICATION_SOUND_URL con URL ABSOLUTA
//          Las rutas relativas ('/notification-sound.mp3') fallan en modo
//          standalone (PWA desde el launcher de Android/iOS) porque el
//          contexto base cambia. Siempre se usa la URL absoluta del sitio.
//
//  [FIX 4] playNotificationSound normaliza la URL recibida a absoluta
//          Si alguien pasa una ruta relativa (legado), se convierte antes
//          de crear el objeto Audio. Evita errores silenciosos en PWA.
//
//  [FIX 5] sendClientNotification agregado al objeto notificationService
//          Faltaba en el objeto agrupador, rompiendo código que hace
//          notificationService.sendClientNotification(...).
//
//  ╔══════════════════════════════════════════════════════════════════════╗
//  ║ [FIX 6 — CRÍTICO] SINCRONIZACIÓN DE NOTIF_TYPES CON BACKEND          ║
//  ╠══════════════════════════════════════════════════════════════════════╣
//  ║                                                                      ║
//  ║ CAUSA RAÍZ DE QUE LAS PUSH NO LLEGABAN AL CELULAR:                   ║
//  ║                                                                      ║
//  ║ El backend (functions/index.js → PUSH_WORTHY_TYPES) sólo dispara    ║
//  ║ el push si notif.type está en una whitelist. Los tipos del cliente   ║
//  ║ NO coincidían:                                                       ║
//  ║                                                                      ║
//  ║   Frontend emitía          | Backend esperaba                        ║
//  ║   ──────────────────────── | ──────────────────────                  ║
//  ║   visit_confirmed          | visit_approved        ❌                ║
//  ║   contract_created         | new_contract          ❌                ║
//  ║   new_property             | property_created      ❌                ║
//  ║   welcome / manual         | (no existían)         ❌                ║
//  ║                                                                      ║
//  ║ Por eso "sólo a veces llegaba el push" → casualmente cuando algún    ║
//  ║ servicio usaba el string directo (`'visit_approved'`).               ║
//  ║                                                                      ║
//  ║ Solución:                                                            ║
//  ║   1. Renombrar las constantes a los valores que SÍ acepta el backend ║
//  ║   2. Mantener aliases legacy con los nombres viejos para no romper   ║
//  ║      código existente — los aliases apuntan al MISMO string nuevo.   ║
//  ║   3. Agregar todos los tipos que el backend ya soporta y no estaban  ║
//  ║      expuestos en NOTIF_TYPES.                                       ║
//  ║   4. Las nuevas notificaciones de documents/contacts/requests/etc.   ║
//  ║      también se añaden al backend (functions/index.js).              ║
//  ║                                                                      ║
//  ║ Resultado: TODOS los tipos disparan push automáticamente vía el      ║
//  ║ trigger onNotificationCreated → sendPushToUser().                    ║
//  ╚══════════════════════════════════════════════════════════════════════╝
//
//  [FIX 7] actionUrl en sendClientNotification y createPropertyNotification
//          El SW usa data.url para abrir la app al hacer click; sin actionUrl
//          el click siempre llevaba a `/`.
// ──────────────────────────────────────────────────────────────────────────


import { getToken, onMessage } from 'firebase/messaging';
import {
  doc, updateDoc, deleteDoc, getDoc, collection, addDoc,
  serverTimestamp, query, where, getDocs, orderBy, limit, onSnapshot,
} from 'firebase/firestore';
import { db, messagingReady } from '../config/firebase.config';
import { SITE_URL as BASE_URL } from '../config/site.config';


// ── VAPID ─────────────────────────────────────────────────────────────────────
// Aceptamos ambos nombres (canónico + legacy) para no romper despliegues en
// transición. VITE_VAPID_KEY es el nombre correcto; VITE_FIREBASE_VAPID_KEY
// es el alias heredado.
const VAPID_KEY =
  import.meta.env.VITE_VAPID_KEY ||
  import.meta.env.VITE_FIREBASE_VAPID_KEY ||
  '';


if (!VAPID_KEY && typeof window !== 'undefined' && import.meta.env.PROD) {
  console.warn(
    '[notificationService] VITE_VAPID_KEY no está configurada. Las notificaciones push no funcionarán.',
  );
}


// ═════════════════════════════════════════════════════════════════════════════
//  [FIX 6] NOTIF_TYPES — SINCRONIZADOS CON backend PUSH_WORTHY_TYPES
// ═════════════════════════════════════════════════════════════════════════════
//
// Cada string de la columna derecha DEBE existir en
// functions/index.js → PUSH_WORTHY_TYPES, o el push no se enviará.
//
// Si agregas un tipo aquí, AGRÉGALO TAMBIÉN en functions/index.js.
//
export const NOTIF_TYPES = {
  // ── Visitas ─────────────────────────────────────────────────────────────
  VISIT_REQUEST:            'visit_request',
  VISIT_CONFIRMED:          'visit_approved',          // ★ alineado con backend
  VISIT_REJECTED:           'visit_rejected',
  VISIT_RESCHEDULED:        'visit_rescheduled',
  VISIT_CANCELLED_BY_CLIENT:'visit_cancelled_by_client',
  VISIT_COMPLETED:          'visit_completed',
  VISIT_ASSIGNED:           'visit_assigned',

  // ── Contratos ───────────────────────────────────────────────────────────
  CONTRACT_CREATED:         'new_contract',            // ★ alineado con backend
  CONTRACT_ASSIGNED:        'contract_assigned',
  CONTRACT_SIGNED:          'contract_status_changed', // ★ usa el genérico
  CONTRACT_STATUS_CHANGED:  'contract_status_changed',
  CONTRACT_STAGE_CHANGED:   'contract_stage_changed',
  CONTRACT_DELETED:         'contract_deleted',
  MILESTONE_COMPLETED:      'milestone_completed',
  PAYMENT_CONFIRMED:        'payment_confirmed',
  PAYMENT_LATE:             'payment_late',
  CONTRACT_DOCUMENT_UPLOADED:'contract_document_uploaded',

  // ── Propiedades ─────────────────────────────────────────────────────────
  NEW_PROPERTY:             'property_created',         // ★ alineado con backend
  PROPERTY_CREATED:         'property_created',
  PROPERTY_UPDATED:         'property_status_changed',  // ★ usa el genérico
  PROPERTY_STATUS_CHANGED:  'property_status_changed',
  PROPERTY_DELETED:         'property_deleted',

  // ── Clientes / Usuarios ─────────────────────────────────────────────────
  NEW_CLIENT:               'new_client',
  CLIENT_DELETED:           'client_deleted',
  NEW_USER:                 'new_user',
  USER_DELETED:             'user_deleted',
  NEW_ACCESS_REQUEST:       'new_access_request',
  ACCOUNT_DELETION_REQUESTED:'account_deletion_requested',

  // ── Documentos ──────────────────────────────────────────────────────────
  DOCUMENT_UPLOADED:        'document_uploaded',
  DOCUMENT_EXPIRING:        'document_expiring',
  DOCUMENT_DELETED:         'document_deleted',

  // ── Consultas / Contactos ───────────────────────────────────────────────
  NEW_CONTACT:              'new_contact',
  CONTACT_REPLY:            'contact_reply',

  // ── Perfil ──────────────────────────────────────────────────────────────
  PROFILE_UPDATED:          'profile_updated',
  PASSWORD_CHANGED:         'password_changed',

  // ── Generales (legados conservados) ─────────────────────────────────────
  WELCOME:                  'welcome',
  MANUAL:                   'manual',
  TASK_ASSIGNED:            'task_assigned',
  COMMENT_REPLY:            'comment_reply',
  SYSTEM:                   'system',
};


/** @deprecated Usa NOTIF_TYPES directamente */
export const NOTIFICATION_TYPES = NOTIF_TYPES;


// ═════════════════════════════════════════════════════════════════════════════
//  Mapa de tipo → módulo del sidebar
//  Usado por useModuleAlerts() para distribuir el conteo de no leídas
//  entre los items del Sidebar.
// ═════════════════════════════════════════════════════════════════════════════
export const NOTIF_MODULE_MAP = {
  // Visitas
  [NOTIF_TYPES.VISIT_REQUEST]:             'visits',
  [NOTIF_TYPES.VISIT_CONFIRMED]:           'visits',
  [NOTIF_TYPES.VISIT_REJECTED]:            'visits',
  [NOTIF_TYPES.VISIT_RESCHEDULED]:         'visits',
  [NOTIF_TYPES.VISIT_CANCELLED_BY_CLIENT]: 'visits',
  [NOTIF_TYPES.VISIT_COMPLETED]:           'visits',
  [NOTIF_TYPES.VISIT_ASSIGNED]:            'visits',

  // Contratos
  [NOTIF_TYPES.CONTRACT_CREATED]:          'contracts',
  [NOTIF_TYPES.CONTRACT_ASSIGNED]:         'contracts',
  [NOTIF_TYPES.CONTRACT_STATUS_CHANGED]:   'contracts',
  [NOTIF_TYPES.CONTRACT_STAGE_CHANGED]:    'contracts',
  [NOTIF_TYPES.CONTRACT_DELETED]:          'contracts',
  [NOTIF_TYPES.MILESTONE_COMPLETED]:       'contracts',
  [NOTIF_TYPES.PAYMENT_CONFIRMED]:         'contracts',
  [NOTIF_TYPES.PAYMENT_LATE]:              'contracts',
  [NOTIF_TYPES.CONTRACT_DOCUMENT_UPLOADED]:'contracts',

  // Propiedades
  [NOTIF_TYPES.PROPERTY_CREATED]:          'properties',
  [NOTIF_TYPES.PROPERTY_STATUS_CHANGED]:   'properties',
  [NOTIF_TYPES.PROPERTY_DELETED]:          'properties',

  // Clientes
  [NOTIF_TYPES.NEW_CLIENT]:                'clients',
  [NOTIF_TYPES.CLIENT_DELETED]:            'clients',

  // Usuarios y solicitudes de acceso
  [NOTIF_TYPES.NEW_USER]:                  'users',
  [NOTIF_TYPES.USER_DELETED]:              'users',
  [NOTIF_TYPES.NEW_ACCESS_REQUEST]:        'requests',
  [NOTIF_TYPES.ACCOUNT_DELETION_REQUESTED]:'requests',

  // Documentos
  [NOTIF_TYPES.DOCUMENT_UPLOADED]:         'documents',
  [NOTIF_TYPES.DOCUMENT_EXPIRING]:         'documents',
  [NOTIF_TYPES.DOCUMENT_DELETED]:          'documents',

  // Consultas
  [NOTIF_TYPES.NEW_CONTACT]:               'queries',
  [NOTIF_TYPES.CONTACT_REPLY]:             'queries',

  // Perfil
  [NOTIF_TYPES.PROFILE_UPDATED]:           'profile',
  [NOTIF_TYPES.PASSWORD_CHANGED]:          'profile',
};


// ── Sonido de notificación ────────────────────────────────────────────────────
//
// ⚠️  Por qué NO reproducimos Audio en firebase-messaging-sw.js:
//     Los Service Workers corren en un worker thread aislado — la API Web Audio
//     (Audio, HTMLAudioElement, AudioContext) NO existe ahí.
//     Llamarla lanza: ReferenceError: Audio is not defined
//
//     Solución:
//     • Foreground (app abierta): reproducimos aquí directamente con new Audio().
//     • Background (SW activo, ≥1 pestaña abierta): el SW nos envía un postMessage
//       y nosotros reproducimos el audio en la página (ver registerSwSoundListener).
//     • App cerrada: el SO emite su propio sonido de sistema — no hay nada que hacer.

// [FIX 3] URL ABSOLUTA: las rutas relativas fallan en modo standalone (PWA launcher)
// porque el contexto base del documento cambia al abrir desde el ícono de Android/iOS.
const NOTIFICATION_SOUND_URL = `${BASE_URL}/notification-sound.mp3`;


/**
 * [FIX 4] Normaliza la URL del sonido a absoluta y la reproduce de forma segura.
 * Silencia el error de autoplay bloqueado (comportamiento normal del navegador
 * antes de cualquier interacción del usuario).
 * @param {string} [soundUrl]
 */
function playNotificationSound(soundUrl = NOTIFICATION_SOUND_URL) {
  // Normalizar a URL absoluta por si llega una ruta relativa (legado)
  const resolvedUrl =
    soundUrl && soundUrl.startsWith('http')
      ? soundUrl
      : `${BASE_URL}/${(soundUrl || 'notification-sound.mp3').replace(/^\//, '')}`;

  try {
    const audio = new Audio(resolvedUrl);
    audio.volume = 0.7;
    audio.play().catch((err) => {
      // El navegador bloquea autoplay hasta que el usuario interactúa.
      // No es un error crítico — se puede ignorar en silencio.
      console.warn('[NotificationSound] Autoplay bloqueado:', err.message);
    });
  } catch (err) {
    console.warn('[NotificationSound] Error al crear Audio:', err.message);
  }
}


/**
 * Registra el listener de mensajes del Service Worker para reproducir
 * el sonido cuando la app está en segundo plano pero con al menos una
 * pestaña abierta.
 *
 * El SW (firebase-messaging-sw.js) envía:
 *   { type: 'PLAY_NOTIFICATION_SOUND', soundUrl: 'https://...notification-sound.mp3' }
 *
 * Llama esta función UNA sola vez al inicializar la app.
 * Es seguro llamarla en SSR — verifica `navigator` antes de ejecutar.
 */
export function registerSwSoundListener() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type !== 'PLAY_NOTIFICATION_SOUND') return;
    playNotificationSound(event.data.soundUrl || NOTIFICATION_SOUND_URL);
  });
}


// ── [FIX 1] Registro explícito del SW con espera de activación ───────────────
//
// ¿Por qué es necesario?
// En móvil / PWA instalada, cuando el usuario abre la app y se llama
// requestNotificationPermission(), el SW puede estar en estado "installing"
// o "waiting". getToken() de Firebase requiere que el SW ya esté "activated"
// para poder obtener el token FCM. Si se llama antes, devuelve null
// silenciosamente sin lanzar ningún error (race condition crítica en Android).
//
// Esta función:
//   1. Reutiliza el registro existente si ya hay un SW en '/'
//   2. Registra firebase-messaging-sw.js con scope '/' si no existe
//   3. Espera a que el SW pase a estado "activated" antes de resolver
//
// @returns {Promise<ServiceWorkerRegistration|null>}
async function getOrRegisterSW() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration('/');
    const reg = existing ?? await navigator.serviceWorker.register(
      '/firebase-messaging-sw.js',
      { scope: '/' },
    );

    // Si ya está activo, no hay nada que esperar
    if (reg.active) return reg;

    // Esperar a que el SW en curso (installing o waiting) llegue a "activated"
    await new Promise((resolve) => {
      const sw = reg.installing ?? reg.waiting;
      if (!sw) { resolve(); return; }
      sw.addEventListener('statechange', function onStateChange() {
        if (this.state === 'activated') {
          sw.removeEventListener('statechange', onStateChange);
          resolve();
        }
      });
    });

    return reg;
  } catch (err) {
    console.warn('[notificationService] getOrRegisterSW falló:', err.message);
    return null;
  }
}


// ── Messaging ─────────────────────────────────────────────────────────────────


/**
 * Inicializa Firebase Messaging, registra el listener de sonido del SW
 * y configura el handler de mensajes en foreground.
 *
 * Devuelve la instancia de messaging (o null si no está disponible).
 */
export const initializeMessaging = async () => {
  const messaging = await messagingReady;
  if (!messaging) return null;

  // Registrar listener de sonido desde SW (background con pestaña abierta)
  registerSwSoundListener();

  // Handler de mensajes en foreground (app visible y activa).
  // Firebase NO muestra notificación del sistema cuando la app está en primer plano,
  // así que aquí manejamos el sonido y la UI (toast / campana).
  onMessage(messaging, (payload) => {
    // Reproducir sonido — en foreground SÍ existe Audio
    playNotificationSound(payload.data?.soundUrl || NOTIFICATION_SOUND_URL);

    // Emitir evento global para que useNotifications / NotificationBell
    // actualicen su estado sin necesidad de polling.
    window.dispatchEvent(
      new CustomEvent('fcm:foreground-message', { detail: payload }),
    );
  });

  return messaging;
};


// [FIX 1 + FIX 2] requestNotificationPermission corregida
// Ahora espera a que el SW esté "activated" y pasa serviceWorkerRegistration
// a getToken() para evitar la race condition en Android/PWA.
export const requestNotificationPermission = async (userEmail) => {
  try {
    if (!userEmail) return null;
    if (!('Notification' in window)) return null;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const messaging = await messagingReady;
    if (!messaging) return null;

    // [FIX 1] Esperar SW activo ANTES de getToken
    const swReg = await getOrRegisterSW();

    // [FIX 2] Pasar swReg a getToken para que Firebase use exactamente
    //         este SW (evita que busque uno propio que puede no existir aún)
    const tokenOptions = { vapidKey: VAPID_KEY };
    if (swReg) tokenOptions.serviceWorkerRegistration = swReg;

    const token = await getToken(messaging, tokenOptions);
    if (!token) {
      console.warn(
        '[notificationService] getToken devolvió null. ' +
        'Verificar VITE_VAPID_KEY y que el SW esté activo.',
      );
      return null;
    }

    await saveTokenToDatabase(userEmail, token);
    return token;
  } catch (error) {
    console.error('[notificationService] requestNotificationPermission:', error);
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
    console.error('[notificationService] saveTokenToDatabase:', error);
  }
};


/**
 * Devuelve una Promise que resuelve con el primer payload de mensaje foreground.
 * Útil para pruebas o para escuchar un único mensaje puntual.
 *
 * Para escucha continua, usa el evento 'fcm:foreground-message' o
 * suscríbete con subscribeToNotifications().
 */
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
      message:   { subject, html },
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn('[notificationService] sendMailDoc:', e.message);
  }
};


// ── Template de email ─────────────────────────────────────────────────────────
// • Fuentes de sistema (Gmail bloquea @import de Google Fonts)
// • Responsive: media queries 600px y 480px
// • Botones full-width en mobile (touch target ≥44px)
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
    .btn{display:inline-block;background:${accent};color:#fff;font-weight:700;padding:14px 32px;border-radius:50px;text-decoration:none;font-size:15px;line-height:1.3;}
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
        <img src="${BASE_URL}/logo-dark.png" alt="R&amp;B Inmobiliaria">
        <span>Inmobiliaria &middot; Real Estate</span>
      </div>
      <div class="body">
        <h1>${title}</h1>
        <div class="msg-box">${message}</div>
        <div class="btn-center">
          <a class="btn" href="${BASE_URL}/acceso-clientes">Ver en mi portal &rarr;</a>
        </div>
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} R&amp;B Inmobiliaria &mdash; Anserma, Caldas<br>
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
    console.error('[notificationService] createNotification:', error);
    throw error;
  }
};


// ── sendClientNotification ────────────────────────────────────────────────────
/**
 * Envía una notificación a un cliente:
 *   1. Notificación in-app (/notifications → visible en la campana del portal)
 *   2. Email vía extensión Trigger Email (/mail → ext-firestore-send-email)
 *
 * Acepta DOS formas de llamada para compatibilidad:
 *
 *   Forma A — parámetros separados (visit.service.js, property.service.js):
 *     sendClientNotification(email, title, message, type, relatedId)
 *
 *   Forma B — payload como objeto (otros servicios):
 *     sendClientNotification(email, { title, message, type, relatedId, actionUrl })
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

  const isObject  = typeof titleOrPayload === 'object' && titleOrPayload !== null;
  const title     = isObject ? titleOrPayload.title              : titleOrPayload;
  const message   = isObject ? titleOrPayload.message            : msgArg;
  const type      = isObject ? titleOrPayload.type               : typeArg;
  const relatedId = isObject ? (titleOrPayload.relatedId ?? null) : relatedIdArg;
  // [FIX 7] actionUrl explícito → el SW lo usa para abrir la URL correcta al click
  const actionUrl = isObject ? (titleOrPayload.actionUrl ?? null) : null;

  // 1. Notificación in-app
  const notifId = await createNotification({
    userId: clientEmail,
    title,
    message,
    type:      type || NOTIF_TYPES.MANUAL,
    relatedId,
    actionUrl: actionUrl || '/portal',
  });

  // 2. Email — no bloquea el flujo si falla
  sendMailDoc(clientEmail, title, buildEmailHtml(title, message, type)).catch(() => {});

  return notifId;
};


// ── Queries ───────────────────────────────────────────────────────────────────
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
    console.error('[notificationService] getUserNotifications:', error);
    return [];
  }
};


export const markNotificationAsRead = async (notificationId) => {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), {
      read: true, readAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('[notificationService] markNotificationAsRead:', error);
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
    console.error('[notificationService] markAllAsRead:', error);
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
    console.error('[notificationService] disableNotifications:', error);
  }
};


// ── Helpers internos (agentes / admin) ────────────────────────────────────────
export const createPropertyNotification = (userId, propertyId, propertyTitle, action) =>
  createNotification({
    userId,
    type:      NOTIF_TYPES.PROPERTY_CREATED,
    title:     `🏠 Propiedad ${action}`,
    message:   propertyTitle,
    actionUrl: '/propiedades-admin',  // [FIX 7] actionUrl explícito
    data:      { url: '/propiedades-admin', propertyId },
  });


// ── Suscripción en tiempo real ────────────────────────────────────────────────
// Usada por useNotifications para mantener la campana sincronizada en vivo.
// Devuelve la función de unsubscribe.
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
    (err)  => console.error('[notificationService] subscribeToNotifications:', err),
  );
};


// ── Eliminar notificación ─────────────────────────────────────────────────────
export const deleteNotification = async (notificationId) => {
  if (!notificationId) return;
  try {
    await deleteDoc(doc(db, 'notifications', notificationId));
  } catch (error) {
    console.error('[notificationService] deleteNotification:', error);
  }
};


// ═════════════════════════════════════════════════════════════════════════════
//  Objeto agrupador `notificationService`
// ═════════════════════════════════════════════════════════════════════════════
//
// Existe por compatibilidad con código que hace:
//   import { notificationService } from '...';
//   notificationService.createNotification({...});
//
// Para código nuevo, usa siempre los named exports.
//
export const notificationService = {
  subscribeToNotifications,
  markAsRead:               markNotificationAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
  // [FIX 5] sendClientNotification faltaba en el objeto — rompía código
  //         que lo llamaba como notificationService.sendClientNotification(...)
  sendClientNotification,
  // Exponer también las funciones de inicialización para uso centralizado
  initializeMessaging,
  requestNotificationPermission,
  registerSwSoundListener,
  // Tipos y mapas para consumidores
  NOTIF_TYPES,
  NOTIF_MODULE_MAP,
};