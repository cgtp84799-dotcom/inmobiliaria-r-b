// public/firebase-messaging-sw.js
//
// ⚠️  NOTA DE SEGURIDAD: La Firebase API key aquí visible es un identificador
// público del proyecto — NO es una clave secreta. Firebase API keys para web
// son diseñadas para ser públicas (están incluidas en el bundle JS que cualquier
// visitante puede ver). La seguridad real viene de las Firestore Rules y las
// restricciones de dominio configuradas en la consola de Firebase.
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

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey:            "AIzaSyDvvpKdGNLJj-2dg8BdqBJQuGLAQOdZCk8",
  authDomain:        "inmobiliaria-ryb-y-asociados.firebaseapp.com",
  databaseURL:       "https://inmobiliaria-ryb-y-asociados-default-rtdb.firebaseio.com",
  projectId:         "inmobiliaria-ryb-y-asociados",
  storageBucket:     "inmobiliaria-ryb-y-asociados.firebasestorage.app",
  messagingSenderId: "943352451306",
  appId:             "1:943352451306:web:b6b570cf36c0d996d5c793",
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle   = payload.notification?.title || 'Nueva notificación';
  const notificationOptions = {
    body:              payload.notification?.body || 'Tienes una nueva actualización',
    icon:              payload.notification?.icon || '/logo.jpg.png',
    badge:             '/favicon.ico',
    tag:               payload.data?.tag || 'default',
    data:              payload.data,
    vibrate:           [200, 100, 200],
    requireInteraction: payload.data?.requireInteraction === 'true',
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
