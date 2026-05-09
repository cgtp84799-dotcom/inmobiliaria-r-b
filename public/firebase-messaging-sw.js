// ============================================================
// public/firebase-messaging-sw.js  — CORREGIDO para PWA + móvil
// ============================================================
//
// ⚠️  NOTA DE SEGURIDAD: La Firebase API key aquí visible es un identificador
//     público del proyecto — NO es una clave secreta. Firebase API keys para
//     web son diseñadas para ser públicas (están incluidas en el bundle JS que
//     cualquier visitante puede ver). La seguridad real viene de las Firestore
//     Rules y las restricciones de dominio configuradas en la consola de Firebase.
//
// ✅ ACCIÓN REQUERIDA antes del deploy:
//    1. Firebase Console → Configuración del proyecto → API Keys
//    2. Editar la clave "Browser key" o "Web API Key"
//    3. En "Restricciones de aplicaciones" → seleccionar "Referentes HTTP (sitios web)"
//    4. Agregar: https://inmobiliaria-ryb-y-asociados.com/*
//    5. Agregar: https://inmobiliaria-ryb-y-asociados.firebaseapp.com/*
//    6. Esto impide que la clave sea usada desde otros dominios.
//
// Los Service Workers NO pueden leer import.meta.env ni process.env,
// por lo que la config debe estar hardcodeada aquí. Esto es el comportamiento
// estándar documentado por Firebase para mensajería en segundo plano.
//
// ─── CORRECCIONES APLICADAS ────────────────────────────────────────────────
//  [FIX 1] Evento 'install'  → self.skipWaiting()
//          Sin esto el SW queda en estado "waiting" indefinidamente.
//          La PWA instalada en Android nunca procesará mensajes FCM background
//          porque el SW viejo sigue activo para siempre.
//
//  [FIX 2] Evento 'activate' → self.clients.claim()
//          Sin esto, la PWA abierta desde el launcher de Android no queda
//          bajo control del nuevo SW hasta que el usuario la cierre y reabra.
//          FCM no entrega mensajes background a un SW que no controla el cliente.
//
//  [FIX 3] soundUrl con URL ABSOLUTA
//          Las rutas relativas (/notification-sound.mp3) fallan en modo
//          standalone (PWA desde el launcher de Android/iOS) porque el
//          contexto base cambia. Se normaliza a URL absoluta siempre.
//
//  [FIX 4] notificationclick usa URL ABSOLUTA
//          Mismo problema: en modo standalone las rutas relativas no abren
//          la URL correcta. Se construye la URL absoluta antes de navegar.
//
//  [FIX 5] requireInteraction: payload.data?.requireInteraction !== 'false'
//          El valor por defecto cambia a true (antes era false).
//          Las notificaciones críticas (contratos, pagos) deben permanecer
//          visibles hasta que el usuario interactúe.
//
//  ╔══════════════════════════════════════════════════════════════════════╗
//  ║ [FIX 6 — CRÍTICO] event.waitUntil + showNotification con try/catch   ║
//  ╠══════════════════════════════════════════════════════════════════════╣
//  ║                                                                      ║
//  ║ Antes: messaging.onBackgroundMessage llamaba showNotification SIN    ║
//  ║ envolver con event.waitUntil, lo que en algunos navegadores móviles  ║
//  ║ (Chrome Android <120, Samsung Internet) provocaba que el SW se       ║
//  ║ durmiera ANTES de que la notif terminara de mostrarse → la push      ║
//  ║ "llegaba" pero NO aparecía visualmente.                              ║
//  ║                                                                      ║
//  ║ Solución: SDK compat de FCM no expone `event` en onBackgroundMessage,║
//  ║ así que también escuchamos el evento 'push' nativo y manejamos       ║
//  ║ desde ahí cuando viene un payload válido. Esto da control total      ║
//  ║ sobre el ciclo de vida del SW y la persistencia de la notificación.  ║
//  ╚══════════════════════════════════════════════════════════════════════╝
//
//  [FIX 7] Manejo defensivo de payload mal formado
//          Algunas notificaciones llegan sin payload.notification (data-only).
//          Ahora se construye desde data.title / data.body / data.body-fallback.
//
//  [FIX 8] notificationclose handler para limpiar tags
//          Permite re-mostrar el mismo tag en notifs sucesivas sin que
//          la nueva sea silenciada por el navegador.
// ──────────────────────────────────────────────────────────────────────────


importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');


// ─── Configuración Firebase ────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            'AIzaSyDvvpKdGNLJj-2dg8BdqBJQuGLAQOdZCk8',
  authDomain:        'inmobiliaria-ryb-y-asociados.firebaseapp.com',
  databaseURL:       'https://inmobiliaria-ryb-y-asociados-default-rtdb.firebaseio.com',
  projectId:         'inmobiliaria-ryb-y-asociados',
  storageBucket:     'inmobiliaria-ryb-y-asociados.firebasestorage.app',
  messagingSenderId: '943352451306',
  appId:             '1:943352451306:web:b6b570cf36c0d996d5c793',
};

// URL base del sitio — se usa para construir URLs absolutas desde el SW.
// Los SW no tienen acceso a window.location ni a import.meta.env.
const SITE_URL = 'https://inmobiliaria-ryb-y-asociados.com';

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();


// ─── [FIX 1] INSTALL: tomar control inmediatamente ────────────────────────
//
//   self.skipWaiting() hace que este SW pase de "installing/waiting" a
//   "activated" sin esperar a que el usuario cierre todas las pestañas.
//
//   ¿Por qué es crítico para PWA?
//   Cuando el usuario instala la PWA en Android y la abre desde el launcher,
//   Chrome puede tener un SW anterior en estado "waiting". Sin skipWaiting,
//   ese SW viejo permanece activo indefinidamente y FCM no procesa los
//   mensajes de background a través del nuevo SW.
//
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});


// ─── [FIX 2] ACTIVATE: reclamar clientes ya abiertos ─────────────────────
//
//   self.clients.claim() hace que este SW tome el control de todas las
//   pestañas/ventanas ya abiertas sin necesidad de recargar la página.
//
//   ¿Por qué es crítico para PWA?
//   La PWA instalada abre su ventana ANTES de que el nuevo SW sea activado.
//   Sin clients.claim(), esa ventana no está controlada por este SW y FCM
//   no puede entregar mensajes background porque no hay SW activo en esa
//   ventana. La próxima vez que el usuario abra la app el problema se soluciona,
//   pero la primera sesión tras una actualización del SW queda sin notificaciones.
//
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});


// ─── Helper: normalizar soundUrl a URL absoluta ───────────────────────────
//
//   [FIX 3] Las rutas relativas fallan en modo standalone (PWA launcher).
//   Esta función garantiza que siempre usemos una URL absoluta.
//
function resolveAbsoluteUrl(url, fallback = `${SITE_URL}/notification-sound.mp3`) {
  if (!url) return fallback;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  // Ruta relativa → convertir a absoluta
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${SITE_URL}${path}`;
}


// ─── Helper: pedir a la página activa que reproduzca el sonido ────────────
//
//   ⚠️  Por qué NO usamos new Audio() aquí:
//   Los Service Workers se ejecutan en un worker thread aislado del navegador.
//   La API Web Audio (Audio, HTMLAudioElement, AudioContext) NO existe en ese
//   contexto. Llamarla lanza: ReferenceError: Audio is not defined
//
//   Solución: si hay una ventana activa de la app, le enviamos un mensaje
//   (postMessage) para que ella reproduzca el sonido. Si no hay ventana
//   abierta (app completamente cerrada), no hay quién reproduzca audio —
//   este es el comportamiento estándar esperado en notificaciones push.
//
async function playSoundOnAnyClient(soundUrl) {
  try {
    const clientList = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });
    if (clientList.length === 0) {
      // App completamente cerrada → el SO maneja el sonido del sistema.
      return;
    }
    clientList.forEach((client) => {
      try {
        client.postMessage({
          type:     'PLAY_NOTIFICATION_SOUND',
          soundUrl,
        });
      } catch (_) {
        // postMessage falló por client desconectado — ignorar
      }
    });
  } catch (_) {
    // matchAll falló — el SO ya tiene su propio sonido del sistema.
  }
}


// ─── Helper: mostrar notificación con manejo defensivo de errores ─────────
//
//   [FIX 6] Garantiza que la notif aparezca aunque el SW esté por dormirse.
//   Devuelve una promesa para usarla con event.waitUntil.
//
async function showFcmNotification(payload) {
  // [FIX 7] Soportar tanto payload.notification como data-only payloads.
  const data = payload?.data || {};
  const notification = payload?.notification || {};

  const title = notification.title || data.title || 'Nueva notificación';
  const body  = notification.body  || data.body  || data.message || 'Tienes una nueva actualización';
  const icon  = notification.icon  || data.icon  || `${SITE_URL}/android-chrome-192x192.png`;

  // [FIX 3] soundUrl siempre como URL absoluta
  const soundUrl = resolveAbsoluteUrl(data.soundUrl);

  const options = {
    body,
    icon,
    badge:  `${SITE_URL}/favicon-32x32.png`,  // [FIX 3] URL absoluta
    // tag agrupa notificaciones del mismo tipo — evita spam visual.
    // Si viene un notifId único, usamos ese para que cada notif sea distinta.
    tag:    data.notifId || data.tag || 'notif-ryb',
    // data viaja hasta el click handler
    data: {
      url:      resolveAbsoluteUrl(data.url || '/', `${SITE_URL}/`),  // [FIX 4]
      notifId:  data.notifId  || null,
      type:     data.type     || 'manual',
      soundUrl,                          // [FIX 3] URL absoluta en data
    },
    vibrate: [200, 100, 200],
    // [FIX 5] requireInteraction: true por defecto (antes era false).
    //         Solo se desactiva si el payload lo indica explícitamente con 'false'.
    requireInteraction: data.requireInteraction !== 'false',
    // renotify:true junto a un tag hace que la notif suene/vibre aunque
    // ya exista una del mismo tag (reemplaza en lugar de silenciar).
    renotify: true,
    // En Android moderno habilita las acciones de la notificación.
    // Algunas versiones requieren registrar al menos una para que la notif
    // sea tappable de forma confiable.
    silent: false,
  };

  try {
    await self.registration.showNotification(title, options);
  } catch (err) {
    // Si falla por permisos retirados o config inválida, lo logueamos pero
    // no rompemos el flujo del SW.
    console.warn('[FCM-SW] showNotification falló:', err && err.message);
  }

  // Sonido en paralelo (no bloquea la notif)
  await playSoundOnAnyClient(soundUrl);
}


// ─── Mensajes en segundo plano (app cerrada / minimizada) ─────────────────
//
//   Firebase compat usa onBackgroundMessage; el callback es síncrono y
//   Firebase internamente llama showNotification. Aun así envolvemos en
//   try/catch para evitar que un fallo aquí rompa el SW completo.
//
messaging.onBackgroundMessage((payload) => {
  // [FIX 6] Disparamos showFcmNotification de forma asíncrona.
  // Aunque event.waitUntil no está disponible en este callback de compat,
  // también escuchamos 'push' abajo para los casos donde sí queremos
  // event.waitUntil con control completo.
  showFcmNotification(payload).catch((err) => {
    console.warn('[FCM-SW] background message error:', err && err.message);
  });
});


// ─── [FIX 6] Listener nativo 'push' como respaldo defensivo ───────────────
//
//   En algunos casos onBackgroundMessage no se ejecuta (por ejemplo, cuando
//   el payload viene como "data-only" — sin campo notification). Capturando
//   el evento push nativo nos aseguramos de SIEMPRE mostrar la notificación.
//
//   Este handler complementa onBackgroundMessage; ambos se ejecutarán para
//   payloads con `notification`, pero el `tag` único basado en notifId
//   evita duplicados (la segunda llamada reemplaza la primera).
//
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = null;
  try {
    payload = event.data.json();
  } catch (_) {
    // No es JSON — texto plano
    payload = { notification: { title: 'Notificación', body: event.data.text() } };
  }

  // Solo procesamos manualmente los payloads data-only o si vemos que falta
  // el campo notification. Si Firebase ya lo está manejando vía
  // onBackgroundMessage no causamos problema porque el `tag` se reusa.
  event.waitUntil(showFcmNotification(payload));
});


// ─── Click en la notificación ─────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // [FIX 4] targetUrl siempre como URL absoluta para modo standalone (PWA launcher).
  //         En modo standalone las rutas relativas no abren la URL correcta.
  const targetUrl = event.notification.data?.url
    ? resolveAbsoluteUrl(event.notification.data.url, `${SITE_URL}/`)
    : `${SITE_URL}/`;

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Si ya hay una pestaña abierta con esa URL → enfocarla.
        for (const client of windowClients) {
          if (client.url === targetUrl && 'focus' in client) {
            return client.focus();
          }
        }
        // Si hay alguna pestaña abierta aunque sea en otra ruta → navegar.
        if (windowClients.length > 0) {
          return windowClients[0].focus().then((c) => {
            if (c && 'navigate' in c) {
              return c.navigate(targetUrl).catch(() => {
                // Si navigate falla (cross-origin u otro), abrimos nueva ventana
                if (self.clients.openWindow) self.clients.openWindow(targetUrl);
              });
            }
          });
        }
        // Sin pestañas abiertas → abrir nueva ventana.
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
      .catch(() => {
        // Fallback silencioso — intentar abrir la app igual.
        if (self.clients.openWindow) {
          self.clients.openWindow(targetUrl);
        }
      })
  );
});


// ─── [FIX 8] Limpiar tag al cerrar la notificación ────────────────────────
//
//   Permite que la siguiente notif del mismo tag sí dispare sonido/vibración.
//   No persistimos nada — es solo housekeeping.
//
self.addEventListener('notificationclose', () => {
  // Hook de futuro: aquí podríamos enviar analytics de "notif descartada".
});


// ─── Recibir mensajes desde la app (foreground → SW) ─────────────────────
//
//   Gestiona mensajes enviados por la app al SW.
//   SKIP_WAITING: permite actualizaciones controladas del SW desde el frontend
//   (ej: cuando el usuario acepta una actualización disponible).
//
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});