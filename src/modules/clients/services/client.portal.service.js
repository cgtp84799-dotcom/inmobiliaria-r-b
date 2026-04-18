// src/modules/clients/services/client.portal.service.js
//
// CAMBIOS CLAVE EN ESTA VERSIÓN:
//
// 1) NORMALIZACIÓN DE EMAIL A LOWERCASE en TODAS las queries.
//    contract.service ahora normaliza emails al crear/actualizar.
//    Si el portal no normaliza al consultar, las queries con
//    `where('clientEmail', '==', viewerEmail)` fallarían cuando el viewer
//    teclee su email con mayúsculas distintas a las del registro.
//
// 2) MIGRACIÓN COSMÉTICA en getFavoriteProperties: `where(__name__, ...)`
//    sigue funcionando, pero usar `documentId()` explícito es más legible
//    y deja claro a cualquiera que lee el código que estamos consultando
//    por el ID del documento, no por un campo llamado "name".
//
// 3) FIX DE DOCS DUPLICADOS preservado del rework anterior:
//    resolveClientByEmail siempre intenta reusar un doc existente antes
//    de crear uno nuevo. Si hay duplicados de versiones viejas, prefiere
//    el que tenga onboardingDone definido.

import {
  doc, getDoc, getDocs, updateDoc, addDoc, deleteDoc,
  collection, query, where, onSnapshot, documentId,
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

// Normalizador único — se usa en TODAS las queries por email.
const norm = (e) => String(e || '').trim().toLowerCase();

function sortByCreatedAtDesc(docs) {
  return docs.sort((a, b) => {
    const aTime = a.createdAt?.toDate?.()?.getTime?.() ?? a.createdAt?.seconds ?? 0;
    const bTime = b.createdAt?.toDate?.()?.getTime?.() ?? b.createdAt?.seconds ?? 0;
    return bTime - aTime;
  });
}

// ─── CLIENT PROFILE ───────────────────────────────────────────────────────────

export async function resolveClientByEmail(email) {
  if (!email) throw new Error('resolveClientByEmail: email requerido');
  const normalized = norm(email);

  // Buscar tanto por email normalizado como por el original (compatibilidad
  // con docs antiguos que se crearon antes de la normalización).
  const q1 = query(collection(db, CLIENTS_COL), where('email', '==', normalized));
  const snap1 = await getDocs(q1);

  let docs = snap1.docs.map((d) => ({ id: d.id, ...d.data() }));

  if (docs.length === 0 && normalized !== email) {
    // Fallback: buscar por el email original (con mayúsculas)
    const q2 = query(collection(db, CLIENTS_COL), where('email', '==', email));
    const snap2 = await getDocs(q2);
    docs = snap2.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  if (docs.length > 0) {
    // Preferir el que tenga onboardingDone definido (creado por este servicio)
    const withOnboarding = docs.find((d) => d.onboardingDone !== undefined);
    const chosen = withOnboarding ?? docs[0];

    // Si encontramos un doc con email no normalizado, lo normalizamos en background
    if (chosen.email !== normalized) {
      updateDoc(doc(db, CLIENTS_COL, chosen.id), { email: normalized })
        .catch(() => { /* silencioso */ });
    }

    return { id: chosen.id, ...chosen };
  }

  // Crear doc nuevo con email normalizado
  const ref = await addDoc(collection(db, CLIENTS_COL), {
    email:            normalized,
    nombre:           normalized.split('@')[0],
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
  return {
    id: ref.id,
    email: normalized,
    nombre: normalized.split('@')[0],
    favorites: [],
    onboardingDone: false,
  };
}

export function subscribeToClientProfile(clientId, onData, onError) {
  return onSnapshot(
    doc(db, CLIENTS_COL, clientId),
    (snap) => snap.exists() && onData({ id: snap.id, ...snap.data() }),
    (err)  => { console.error('subscribeToClientProfile:', err); onError?.(err); }
  );
}

export async function updateClientProfile(clientId, updates) {
  // Si actualizan el email, normalizarlo
  const patch = { ...updates, updatedAt: serverTimestamp() };
  if (patch.email !== undefined) patch.email = norm(patch.email);

  await updateDoc(doc(db, CLIENTS_COL, clientId), patch);
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
    // documentId() === '__name__' pero más legible y type-safe
    const q     = query(collection(db, PROPERTIES_COL), where(documentId(), 'in', batch));
    const snap  = await getDocs(q);
    snap.docs.forEach((d) => results.push({ id: d.id, ...d.data() }));
  }
  return results;
}

// ─── VISITS ───────────────────────────────────────────────────────────────────

export function subscribeToClientVisits(clientEmail, onData, onError) {
  const email = norm(clientEmail);
  const q = query(collection(db, VISITS_COL), where('clientEmail', '==', email));
  return onSnapshot(
    q,
    (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      onData(sortByCreatedAtDesc(docs));
    },
    (err) => { console.error('subscribeToClientVisits:', err); onError?.(err); }
  );
}

export async function cancelVisit(visitId, visitData, cancelReason = '') {
  const cancelableStatuses = ['pending', 'approved'];
  if (!cancelableStatuses.includes(visitData.status)) {
    throw new Error(`No se puede cancelar una visita con estado "${visitData.status}"`);
  }
  await updateDoc(doc(db, VISITS_COL, visitId), {
    status:            'cancelada',
    cancelledByClient: true,
    cancelReason:      cancelReason.trim() || 'Cancelada por el cliente',
    updatedAt:         serverTimestamp(),
  });
  if (visitData.agentEmail) {
    notificationService.createNotification({
      userId:    norm(visitData.agentEmail),
      type:      'visit_cancelled_by_client',
      title:     '❌ Visita cancelada por el cliente',
      message:   `${visitData.clientName} canceló la visita a "${visitData.propertyName}"${cancelReason ? `: ${cancelReason}` : '.'}`,
      actionUrl: '/visitas',
    }).catch(() => {});
  }
  try {
    const adminSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'admin')));
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
  const email = norm(clientEmail);
  const q = query(collection(db, CONTRACTS_COL), where('clientEmail', '==', email));
  return onSnapshot(
    q,
    (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      onData(sortByCreatedAtDesc(docs));
    },
    (err) => { console.error('subscribeToClientContracts:', err); onError?.(err); }
  );
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

export function subscribeToClientNotifications(clientEmail, onData, onError) {
  const email = norm(clientEmail);
  const q = query(collection(db, NOTIFS_COL), where('userId', '==', email));
  return onSnapshot(
    q,
    (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      onData(sortByCreatedAtDesc(docs));
    },
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
  const email = norm(clientEmail);
  const q     = query(
    collection(db, NOTIFS_COL),
    where('userId', '==', email),
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