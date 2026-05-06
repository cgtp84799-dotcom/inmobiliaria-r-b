// src/modules/auth/services/emailVerification.service.js
//
// Cliente para las Cloud Functions de verificación de email custom.
// Reemplaza el flujo nativo de Firebase Auth (sendEmailVerification),
// cuya plantilla no se puede personalizar.
//
// Endpoints expuestos:
//   • requestEmailVerification()    — pide un nuevo correo con link único.
//                                     Requiere sesión activa (ID token).
//   • confirmEmailVerification(tk)  — valida el token al hacer click.
//                                     NO requiere sesión.

import { auth } from '../../../core/config/firebase.config';

const CF_BASE_URL =
  import.meta.env.VITE_FUNCTIONS_BASE_URL ||
  `https://us-central1-${import.meta.env.VITE_FIREBASE_PROJECT_ID}.cloudfunctions.net`;

// ── Helper interno ──────────────────────────────────────────────────────────
async function postJson(url, body, { withAuth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };

  if (withAuth) {
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      throw new Error('No hay sesión activa.');
    }
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body || {}),
  });

  let data = null;
  try {
    data = await res.json();
  } catch (_) {
    // respuesta sin JSON
  }

  if (!res.ok) {
    const err = new Error(data?.error || `HTTP ${res.status}`);
    err.code = data?.code || `http_${res.status}`;
    err.status = res.status;
    throw err;
  }

  return data;
}

/**
 * Solicita el envío de un nuevo correo de verificación.
 * Requiere que el usuario esté autenticado (sesión activa).
 *
 * @returns {Promise<{ alreadyVerified?: boolean, sent?: boolean }>}
 */
export async function requestEmailVerification() {
  const url = `${CF_BASE_URL}/requestEmailVerification`;
  const data = await postJson(url, { data: {} }, { withAuth: true });
  return data?.result ?? {};
}

/**
 * Confirma un token de verificación recibido por email.
 * No requiere sesión activa (el usuario puede aterrizar desde otro dispositivo).
 *
 * @param {string} token  El token plano que viene en la URL.
 * @returns {Promise<{ verified: boolean, email: string }>}
 */
export async function confirmEmailVerification(token) {
  if (!token || typeof token !== 'string') {
    throw new Error('Token inválido');
  }
  const url = `${CF_BASE_URL}/confirmEmailVerification`;
  const data = await postJson(url, { data: { token } }, { withAuth: false });
  return data?.result ?? {};
}
