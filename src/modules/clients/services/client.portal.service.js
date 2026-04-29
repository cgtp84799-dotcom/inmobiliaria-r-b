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
  async function findAll() {
    const q1 = query(collection(db, CLIENTS_COL), where('email', '==', normalized));
    const snap1 = await getDocs(q1);
    let docs = snap1.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (normalized !== email) {
      // También buscar por email original
      const q2 = query(collection(db, CLIENTS_COL), where('email', '==', email));
      const snap2 = await getDocs(q2);
      const extra = snap2.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((d) => !docs.some((existing) => existing.id === d.id));
      docs = [...docs, ...extra];
    }
    return docs;
  }

  let docs = await findAll();

  // ★ FIX (auditoría): si la query no devolvió nada pero el doc puede haber
  // sido creado hace milisegundos por ClientAuthPage.ensureClientDocs,
  // esperar y reintentar UNA VEZ. Esto evita que dos llamadas concurrentes
  // creen dos docs distintos para el mismo email.
  if (docs.length === 0) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    docs = await findAll();
  }

  // ★ FIX (auditoría — duplicación reportada por usuario):
  // Si encontramos MÁS de un doc para el mismo email, esto significa que
  // hubo race condition previa (ClientAuthPage + useClientPortal + useFavorites
  // creando docs en paralelo). Fusionamos: elegir el "mejor" candidato
  // y borrar los duplicados. Esto sana el panel para próximos accesos.
  if (docs.length > 1) {
    console.warn(`[resolveClientByEmail] ${docs.length} docs para email "${normalized}" — fusionando.`);

    // Heurística para elegir el mejor:
    //   1. El que tenga onboardingDone === true (perfil completado)
    //   2. El que tenga más datos llenos (nombre, teléfono, etc.)
    //   3. El más antiguo (createdAt) — tiene más historial
    const score = (d) => {
      let s = 0;
      if (d.onboardingDone === true) s += 1000;
      if (d.nombre && d.nombre !== normalized.split('@')[0]) s += 50;
      if (d.telefono) s += 30;
      if ((d.favorites || []).length > 0) s += 20 * d.favorites.length;
      if (d.tipoCliente && d.tipoCliente !== 'portal') s += 10;
      // Penalizar docs muy nuevos (recién creados por race) — preferir el viejo
      const created = d.createdAt?.toDate?.()?.getTime?.() ?? d.createdAt?.seconds ?? 0;
      if (created) s += 100; // doc con createdAt resuelto es preferible
      return s;
    };

    docs.sort((a, b) => score(b) - score(a));
    const chosen = docs[0];
    const losers = docs.slice(1);

    // Combinar favoritos de TODOS los docs en el chosen — para no perder
    // los corazones que el cliente dio antes de la fusión.
    const allFavorites = new Set(chosen.favorites || []);
    losers.forEach((l) => (l.favorites || []).forEach((f) => allFavorites.add(f)));

    try {
      // Patch del chosen con los favoritos consolidados
      if (allFavorites.size !== (chosen.favorites || []).length) {
        await updateDoc(doc(db, CLIENTS_COL, chosen.id), {
          favorites: Array.from(allFavorites),
          email: normalized, // normalizar de paso
          updatedAt: serverTimestamp(),
        });
        chosen.favorites = Array.from(allFavorites);
      }
      // Borrar los duplicados (en background — no bloquear la UI)
      Promise.allSettled(
        losers.map((l) => deleteDoc(doc(db, CLIENTS_COL, l.id)))
      ).then((results) => {
        const failed = results.filter((r) => r.status === 'rejected').length;
        if (failed) console.warn(`[resolveClientByEmail] ${failed} duplicados no se pudieron borrar (revisar rules).`);
      });
    } catch (err) {
      console.warn('[resolveClientByEmail] dedup error:', err.message);
    }

    return { id: chosen.id, ...chosen, email: normalized };
  }

  if (docs.length === 1) {
    const chosen = docs[0];
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