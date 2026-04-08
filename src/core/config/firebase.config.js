// src/core/config/firebase.config.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { isSupported } from 'firebase/messaging';

// ✅ Configuración desde variables de entorno
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL:       import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

// ── Validar variables requeridas ───────────────────────────────────────────────
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
];

for (const envVar of requiredEnvVars) {
  if (!import.meta.env[envVar]) {
    throw new Error(`❌ Falta la variable de entorno: ${envVar}`);
  }
}

// ── Inicializar Firebase ───────────────────────────────────────────────────────
const app = initializeApp(firebaseConfig);

// ── Auth ───────────────────────────────────────────────────────────────────────
export const auth = getAuth(app);

// ── Firestore ──────────────────────────────────────────────────────────────────
// experimentalAutoDetectLongPolling: detecta si el entorno soporta WebSocket
// nativo. Si no, cae a long-polling. Esto estabiliza el error
// INTERNAL ASSERTION FAILED (ID: ca9 / b815) de Firestore SDK v12+ con
// múltiples listeners onSnapshot activos simultáneamente.
export const db = initializeFirestore(app, {
  cacheSizeBytes:                    CACHE_SIZE_UNLIMITED,
  experimentalAutoDetectLongPolling: true,
});

// ── Realtime Database ──────────────────────────────────────────────────────────
export const rtdb = getDatabase(app);

// ── Storage ────────────────────────────────────────────────────────────────────
export const storage = getStorage(app);

// ── Cloud Functions ────────────────────────────────────────────────────────────
export const functions = getFunctions(app, 'us-central1');

// ── Messaging (lazy, solo si el navegador lo soporta) ─────────────────────────
// Se usa import() dinámico para evitar que require() rompa el módulo ES.
// isSupported() devuelve false en Safari < 16.4, iframes sin permisos, etc.
export const messagingReady = isSupported()
  .then(async (supported) => {
    if (!supported) return null;
    const { getMessaging } = await import('firebase/messaging');
    return getMessaging(app);
  })
  .catch(() => null);

export default app;
