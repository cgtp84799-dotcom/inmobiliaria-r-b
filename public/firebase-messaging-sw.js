// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// ✅ TU CONFIGURACIÓN DE FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyDvvpKdGNLJj-2dg8BdqBJQuGLAQOdZCk8",
  authDomain: "inmobiliaria-ryb-y-asociados.firebaseapp.com",
  databaseURL: "https://inmobiliaria-ryb-y-asociados-default-rtdb.firebaseio.com",
  projectId: "inmobiliaria-ryb-y-asociados",
  storageBucket: "inmobiliaria-ryb-y-asociados.firebasestorage.app",
  messagingSenderId: "943352451306",
  appId: "1:943352451306:web:b6b570cf36c0d996d5c793"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Manejar notificaciones en background
messaging.onBackgroundMessage((payload) => {
  console.log('📩 Mensaje recibido en background:', payload);

  const notificationTitle = payload.notification?.title || 'Nueva notificación';
  const notificationOptions = {
    body: payload.notification?.body || 'Tienes una nueva actualización',
    icon: payload.notification?.icon || '/logo192.png',
    badge: '/favicon.ico',
    tag: payload.data?.tag || 'default',
    data: payload.data,
    vibrate: [200, 100, 200],
    requireInteraction: payload.data?.requireInteraction === 'true'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Manejar click en la notificación
self.addEventListener('notificationclick', (event) => {
  console.log('👆 Click en notificación:', event);
  
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/dashboard/chat';

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