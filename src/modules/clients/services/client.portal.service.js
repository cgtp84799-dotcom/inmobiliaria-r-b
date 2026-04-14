// src/modules/clients/services/client.portal.service.js
//
// Servicio exclusivo del PORTAL DE CLIENTES.
// Versión 2: agrega cancelVisit() con notificación al agente.

import {
  doc, getDoc, getDocs, updateDoc, addDoc, deleteDoc,
  collection, query, where, orderBy, onSnapshot,
  serverTimestamp, arrayUnion, arrayRemove,
} from 'firebase/firestore';
import { db } from '../../../core/config/firebase.config';
import { sendClientNotification, NOTIF_TYPES } from '../../../core/services/notificationService';
import { notificationService } from '../../notifications/services/notification.service';

const CLIENTS_COL    = 'clients';
const VISITS_COL     = 'visits';
const CONTRACTS_COL  = 'contracts';
const NOTIFS_COL     = 'notifications';
const PROPERTIES_COL = 'properties';

// ─── CLIENT PROFILE ───────────────────────────────────────────────────────────

export async function resolveClientByEmail(email) {
  if (!email) throw new Error('resolveClientByEmail: email requerido');
  const q    = query(collection(db, CLIENTS_COL), where('email', '==', email));
  const snap = await getDocs(q);
  if (!snap.empty) {
    const d = snap.docs[0];
    return { id: d.id, ...d.data() };
  }
  const ref = await addDoc(collection(db, CLIENTS_COL), {
    email,
    nombre:           email.split('@')[0],
    telefono:         '',
    tipoCliente:      'portal',
    estado:           'activo',
    notas:            '',
    favorites:        [],
    ubicacionInteres: '',
    presupuesto:      '',
    tipoPropiedad:    '',
    agentId:          null,
    createdViaPortal: true,
    onboardingDone:   false,
    createdAt:        serverTimestamp(),
  });
  return { id: ref.id, email, nombre: email.split('@')[0], favorites: [], onboardingDone: false };
}

export function subscribeToClientProfile(clientId, onData, onError) {
  return onSnapshot(
    doc(db, CLIENTS_COL, clientId),
    (snap) => snap.exists() && onData({ id: snap.id, ...snap.data() }),
    (err) => { console.error('subscribeToClientProfile:', err); onError?.(err); }
  );
}

export async function updateClientProfile(clientId, updates) {
  await updateDoc(doc(db, CLIENTS_COL, clientId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function completeOnboarding(clientId) {
  await updateDoc(doc(db, CLIENTS_COL, clientId), {
    onboardingDone: true,
    updatedAt:      serverTimestamp(),
  });
}

// ─── FAVORITES ────────────────────────────────────────────────────────────────

export async function addToFavorites(clientId, propertyId) {
  await updateDoc(doc(db, CLIENTS_COL, clientId), {
    favorites: arrayUnion(propertyId),
    updatedAt: serverTimestamp(),
  });
}

export async function removeFromFavorites(clientId, propertyId) {
  await updateDoc(doc(db, CLIENTS_COL, clientId), {
    favorites: arrayRemove(propertyId),
    updatedAt: serverTimestamp(),
  });
}

export async function getFavoriteProperties(favoriteIds) {
  if (!favoriteIds?.length) return [];
  const results   = [];
  const batchSize = 10;
  for (let i = 0; i < favoriteIds.length; i += batchSize) {
    const batch = favoriteIds.slice(i, i + batchSize);
    const q     = query(collection(db, PROPERTIES_COL), where('__name__', 'in', batch));
    const snap  = await getDocs(q);
    snap.docs.forEach((d) => results.push({ id: d.id, ...d.data() }));
  }
  return results;
}

// ─── VISITS ───────────────────────────────────────────────────────────────────

export function subscribeToClientVisits(clientEmail, onData, onError) {
  const q = query(
    collection(db, VISITS_COL),
    where('clientEmail', '==', clientEmail),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => { console.error('subscribeToClientVisits:', err); onError?.(err); }
  );
}

/**
 * El cliente puede cancelar su propia visita si está en estado
 * 'pending' o 'approved'. Incluye:
 *   - Actualizar el documento de visita
 *   - Notificar in-app al agente asignado (si existe)
 *   - Notificar in-app a los admins
 *
 * Las reglas de Firestore refuerzan esto server-side:
 * el cliente SOLO puede escribir { status, updatedAt, cancelledByClient, cancelReason }
 * y solo cuando status == 'cancelada'.
 */
export async function cancelVisit(visitId, visitData, cancelReason = '') {
  // Validar que la visita es cancelable
  const cancelableStatuses = ['pending', 'approved'];
  if (!cancelableStatuses.includes(visitData.status)) {
    throw new Error(`No se puede cancelar una visita con estado "${visitData.status}"`);
  }

  // 1. Actualizar el documento de visita (campos que permiten las rules)
  await updateDoc(doc(db, VISITS_COL, visitId), {
    status:            'cancelada',
    cancelledByClient: true,
    cancelReason:      cancelReason.trim() || 'Cancelada por el cliente',
    updatedAt:         serverTimestamp(),
  });

  // 2. Notificar al agente asignado (si existe)
  if (visitData.agentEmail) {
    try {
      await notificationService.createNotification({
        userId:    visitData.agentEmail,
        type:      'visit_cancelled_by_client',
        title:     '❌ Visita cancelada por el cliente',
        message:   `${visitData.clientName} canceló la visita a "${visitData.propertyName}"${cancelReason ? `: ${cancelReason}` : '.'}`,
        actionUrl: '/visitas',
      });
    } catch { /* silencioso */ }
  }

  // 3. Notificar a los admins
  try {
    const adminSnap = await getDocs(
      query(collection(db, 'users'), where('role', '==', 'admin'))
    );
    await Promise.allSettled(adminSnap.docs.map((d) =>
      notificationService.createNotification({
        userId:    d.id,
        type:      'visit_cancelled_by_client',
        title:     '❌ Visita cancelada por el cliente',
        message:   `${visitData.clientName} canceló su visita a "${visitData.propertyName}".`,
        actionUrl: '/visitas',
      })
    ));
  } catch { /* silencioso */ }
}

// ─── CONTRACTS ────────────────────────────────────────────────────────────────

export function subscribeToClientContracts(clientEmail, onData, onError) {
  const q = query(
    collection(db, CONTRACTS_COL),
    where('clientEmail', '==', clientEmail),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => { console.error('subscribeToClientContracts:', err); onError?.(err); }
  );
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

export function subscribeToClientNotifications(clientEmail, onData, onError) {
  const q = query(
    collection(db, NOTIFS_COL),
    where('userId', '==', clientEmail),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => { console.error('subscribeToClientNotifications:', err); onError?.(err); }
  );
}

export async function markNotificationRead(notifId) {
  await updateDoc(doc(db, NOTIFS_COL, notifId), {
    read:   true,
    readAt: serverTimestamp(),
  });
}

export async function markAllNotificationsRead(clientEmail) {
  const q    = query(
    collection(db, NOTIFS_COL),
    where('userId', '==', clientEmail),
    where('read', '==', false)
  );
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) =>
    updateDoc(d.ref, { read: true, readAt: serverTimestamp() })
  ));
}

export async function deleteNotification(notifId) {
  await deleteDoc(doc(db, NOTIFS_COL, notifId));
}