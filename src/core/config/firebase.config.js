/**
 * Copyright (c) 2025 Mateo Carvajal Tamayo
 * Todos los derechos reservados.
 * 
 * Este código es propiedad de Mateo Carvajal Tamayo.
 * Uso no autorizado está prohibido.
 */

// src/core/config/firebase.config.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";
import { getFunctions } from "firebase/functions";
import { getMessaging, isSupported } from "firebase/messaging";

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const rtdb = getDatabase(app);
export const functions = getFunctions(app); // ✅ AGREGADO

// ✅ Initialize messaging (con verificación de soporte)
export const messaging = (async () => {
  try {
    const isSupportedBrowser = await isSupported();
    if (isSupportedBrowser) {
      return getMessaging(app);
    }
    console.warn('Firebase Messaging no está soportado en este navegador');
    return null;
  } catch (err) {
    console.error('Error al inicializar messaging:', err);
    return null;
  }
})();

export default app;
