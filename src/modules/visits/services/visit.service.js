// src/modules/visits/services/visit.service.js
//
// Servicio de visitas. Toda la lógica de envío de emails (pending /
// approved / rejected / rescheduled / cancelada) la realiza el trigger
// backend `onVisitStatusChanged` en functions/index.js usando nodemailer.
// El frontend solo escribe el documento, dispara notificaciones in-app
// y crea el espejo en /appointments.

import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, getDocs, getDoc, query, where, orderBy, limit,
  serverTimestamp, onSnapshot,
} from 'firebase/firestore';
import { db, auth } from '../../../core/config/firebase.config';
import { VISIT_STATUS } from '../types/visit.types';
import { sendClientNotification, createNotification, NOTIF_TYPES } from '../../../core/services/notificationService';

const COLLECTION = 'visits';
const col = () => collection(db, COLLECTION);
const ref = (id) => doc(db, COLLECTION, id);

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: cliente + historial
// ─────────────────────────────────────────────────────────────────────────────

async function upsertClientAndHistory(visit, agentData, approvedByEmail) {
  try {
    // Si el clientEmail corresponde a un staff (admin/member) no creamos
    // doc en /clients, para evitar clientes fantasma con email de agente.
    if (visit.clientEmail) {
      try {
        const userSnap = await getDoc(doc(db, 'users', visit.clientEmail));
        if (userSnap.exists()) {
          const role = userSnap.data().role;
          if (role === 'admin' || role === 'member') {
            console.warn('[upsertClientAndHistory] clientEmail pertenece a staff — no se crea /clients');
            return;
          }
        }
      } catch (_) { /* si falla la lectura, seguimos con el flujo normal */ }
    }

    const snap = await getDocs(
      query(collection(db, 'clients'), where('email', '==', visit.clientEmail)),
    );
    const base = {
      name: visit.clientName, email: visit.clientEmail,
      phone: visit.clientPhone || '', updatedAt: serverTimestamp(),
    };
    let clientId;
    if (snap.empty) {
      const r = await addDoc(collection(db, 'clients'), {
        ...base, source: 'visit_request',
        agentId:    agentData.agentId    || null,
        agentName:  agentData.agentName  || null,
        agentEmail: agentData.agentEmail || null,
        createdAt: serverTimestamp(),
      });
      clientId = r.id;
    } else {
      clientId = snap.docs[0].id;
      await updateDoc(snap.docs[0].ref, base);
    }
    await addDoc(collection(db, 'clients', clientId, 'history'), {
      type: 'visit_approved', visitId: visit.id,
      propertyId:   visit.propertyId   || null,
      propertyName: visit.propertyName,
      date:  visit.requestedDate,
      time:  visit.requestedTime,
      agentId:    agentData.agentId    || null,
      agentName:  agentData.agentName  || null,
      agentEmail: agentData.agentEmail || null,
      approvedBy: approvedByEmail      || null,
      notes:      visit.adminNotes     || '',
      createdAt:  serverTimestamp(),
    });
    await updateDoc(ref(visit.id), { clientId });
    return clientId;
  } catch (e) {
    console.warn('upsertClientAndHistory:', e.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICIO
// ─────────────────────────────────────────────────────────────────────────────

export const visitService = {

  subscribeAll(onData, onError) {
    const q = query(col(), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      { includeMetadataChanges: false },
      (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => {
        if (err?.code === 'failed-precondition' || err?.message?.includes('index')) {
          console.warn('⚠️ Falta índice compuesto en Firestore — cargando sin ordenar.');
          getDocs(col())
            .then((s) => onData(s.docs.map((d) => ({ id: d.id, ...d.data() }))))
            .catch((e) => onError?.(e));
        } else {
          onError?.(err);
        }
      },
    );
  },

  subscribeByAgent(agentEmail, onData, onError) {
    const q = query(col(), where('agentEmail', '==', agentEmail), orderBy('createdAt', 'desc'));
    return onSnapshot(q, { includeMetadataChanges: false },
      (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => onError?.(err),
    );
  },

  subscribePending(onData, onError) {
    const q = query(col(), where('status', '==', VISIT_STATUS.PENDING), orderBy('createdAt', 'desc'));
    return onSnapshot(q, { includeMetadataChanges: false },
      (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => onError?.(err),
    );
  },

  async requestVisit(payload) {
    // El email de "solicitud recibida" lo envía el CF onVisitStatusChanged
    // cuando detecta null → pending. NO lo enviamos aquí.
    const visitRef = await addDoc(col(), {
      ...payload,
      sourceCollection: 'visits',
      createdAt:  serverTimestamp(),
      updatedAt:  serverTimestamp(),
    });
    try {
      await addDoc(collection(db, 'appointments'), {
        visitId: visitRef.id, sourceCollection: 'visits',
        clientName:      payload.clientName,
        clientEmail:     payload.clientEmail,
        clientPhone:     payload.clientPhone     ?? '',
        propertyId:      payload.propertyId      ?? null,
        propertyName:    payload.propertyName,
        propertyAddress: payload.propertyAddress ?? '',
        date:            payload.requestedDate,
        time:            payload.requestedTime,
        notes:           payload.notes           ?? '',
        agentId:         payload.agentId         ?? null,
        agentName:       payload.agentName        ?? null,
        agentEmail:      payload.agentEmail       ?? null,
        status:          VISIT_STATUS.PENDING,
        createdAt:  serverTimestamp(),
        updatedAt:  serverTimestamp(),
      });
    } catch (e) { console.warn('espejo /appointments:', e.code); }

    // Notificar admins y members internamente
    try {
      const admins = await getDocs(query(collection(db, 'users'), where('role', '==', 'admin'), limit(20)));
      await Promise.allSettled(admins.docs.map((d) =>
        createNotification({
          userId: d.id, type: 'visit_request',
          title:   'Nueva solicitud de visita',
          message: `${payload.clientName} quiere visitar "${payload.propertyName}"`,
          actionUrl: '/usuarios/visitas',
        }),
      ));
    } catch (_) {}
    try {
      const members = await getDocs(query(collection(db, 'users'), where('role', '==', 'member'), limit(50)));
      await Promise.allSettled(members.docs.map((d) =>
        createNotification({
          userId: d.id, type: 'visit_request',
          title:   'Nueva visita disponible',
          message: `Hay una nueva solicitud para "${payload.propertyName}" esperando ser tomada.`,
          actionUrl: '/usuarios/visitas',
        }),
      ));
    } catch (_) {}

    return visitRef.id;
  },

  async getAllVisits() {
    const snap = await getDocs(query(col(), orderBy('createdAt', 'desc')));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },
  async getVisitsByProperty(propertyId) {
    const snap = await getDocs(query(col(), where('propertyId', '==', propertyId), orderBy('createdAt', 'desc')));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },
  async getVisitsByClient(clientEmail) {
    const snap = await getDocs(query(col(), where('clientEmail', '==', clientEmail), orderBy('createdAt', 'desc')));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async updateStatus(visitId, newStatus, adminNotes = '') {
    await updateDoc(ref(visitId), { status: newStatus, adminNotes, updatedAt: serverTimestamp() });
  },
  async syncAppointmentStatus(visitId, newStatus, adminNotes = '') {
    try {
      const snap = await getDocs(query(collection(db, 'appointments'), where('visitId', '==', visitId)));
      await Promise.all(snap.docs.map((d) =>
        updateDoc(d.ref, { status: newStatus, adminNotes, updatedAt: serverTimestamp() }),
      ));
    } catch (_) {}
  },
  async updateVisit(visitId, data) {
    await updateDoc(ref(visitId), { ...data, updatedAt: serverTimestamp() });
    if (data.agentId || data.agentName || data.agentEmail) {
      try {
        const snap = await getDocs(query(collection(db, 'appointments'), where('visitId', '==', visitId)));
        await Promise.all(snap.docs.map((d) =>
          updateDoc(d.ref, {
            agentId:    data.agentId    ?? null,
            agentName:  data.agentName  ?? null,
            agentEmail: data.agentEmail ?? null,
            updatedAt:  serverTimestamp(),
          }),
        ));
      } catch (_) {}
    }
  },
  async deleteVisit(visitId) {
    await deleteDoc(ref(visitId));
  },

  // ── APROBAR visita ────────────────────────────────────────────────────────
  async approveVisit(visit, adminNotes = '', agentData = {}) {
    const currentUser     = auth.currentUser;
    const approvedByEmail = currentUser?.email || null;

    const updatePayload = {
      status:     VISIT_STATUS.APPROVED,
      adminNotes,
      approvedBy: approvedByEmail,
      updatedAt:  serverTimestamp(),
      approvedAt: serverTimestamp(),
      ...(agentData.agentId    ? { agentId:    agentData.agentId }    : {}),
      ...(agentData.agentName  ? { agentName:  agentData.agentName }  : {}),
      ...(agentData.agentEmail ? { agentEmail: agentData.agentEmail } : {}),
    };
    await updateDoc(ref(visit.id), updatePayload);
    await this.syncAppointmentStatus(visit.id, VISIT_STATUS.APPROVED, adminNotes);
    await upsertClientAndHistory({ ...visit, adminNotes }, agentData, approvedByEmail);

    const agentEmail = agentData.agentEmail || visit.agentEmail;

    // ── Notificación in-app portal (cliente viewer) ──────────────────────────
    if (visit.clientEmail) {
      sendClientNotification(visit.clientEmail, {
        title:    '¡Visita confirmada! 🗓️',
        message:  `Tu visita a "${visit.propertyName}" fue aprobada para el ${visit.requestedDate} a las ${visit.requestedTime}.`,
        type:     NOTIF_TYPES.VISIT_CONFIRMED,
        relatedId: visit.id,
      }).catch(() => {});
    }

    // Notificación in-app al agente
    if (agentEmail) {
      createNotification({
        userId: agentEmail, type: 'visit_assigned',
        title:   'Visita asignada',
        message: `Tienes una visita aprobada: "${visit.propertyName}" — ${visit.clientName} el ${visit.requestedDate}.`,
        actionUrl: '/usuarios/visitas',
      }).catch(() => {});
    }

    // El email lo envía el trigger backend `onVisitStatusChanged` al detectar
    // el cambio de status. Aquí solo se crean notificaciones in-app.
  },

  // ── RECHAZAR visita ───────────────────────────────────────────────────────
  async rejectVisit(visit, adminNotes = '') {
    await this.updateStatus(visit.id, VISIT_STATUS.REJECTED, adminNotes);
    await this.syncAppointmentStatus(visit.id, VISIT_STATUS.REJECTED, adminNotes);

    if (visit.clientEmail) {
      sendClientNotification(visit.clientEmail, {
        title:    'Solicitud de visita no aprobada',
        message:  `Tu solicitud para "${visit.propertyName}" no pudo confirmarse.${adminNotes ? ' ' + adminNotes : ''}`,
        type:     NOTIF_TYPES.VISIT_REJECTED,
        relatedId: visit.id,
      }).catch(() => {});
      // El email lo envía el trigger backend onVisitStatusChanged.
    }
  },

  // ── COMPLETAR visita ──────────────────────────────────────────────────────
  async completeVisit(visitId, adminNotes = '') {
    await this.updateStatus(visitId, VISIT_STATUS.COMPLETED, adminNotes);
    await this.syncAppointmentStatus(visitId, VISIT_STATUS.COMPLETED, adminNotes);
    try {
      const visitSnap = await getDoc(ref(visitId));
      const v = { id: visitId, ...visitSnap.data() };
      if (v.clientId) {
        await addDoc(collection(db, 'clients', v.clientId, 'history'), {
          type: 'visit_completed', visitId,
          propertyName: v.propertyName,
          date:      v.requestedDate,
          agentName: v.agentName || null,
          notes:     adminNotes,
          createdAt: serverTimestamp(),
        });
      }
    } catch (_) {}
  },

  // ── REAGENDAR visita ──────────────────────────────────────────────────────
  async rescheduleVisit(visit, proposedDate, proposedTime, adminNotes = '') {
    const visitId     = typeof visit === 'object' ? visit.id          : visit;
    const clientEmail = typeof visit === 'object' ? visit.clientEmail  : null;
    const propName    = typeof visit === 'object' ? visit.propertyName : null;

    await updateDoc(ref(visitId), {
      status:        VISIT_STATUS.RESCHEDULED,
      proposedDate,
      proposedTime,
      adminNotes,
      newDate:       proposedDate,
      newTime:       proposedTime,
      updatedAt:     serverTimestamp(),
      rescheduledAt: serverTimestamp(),
    });
    await this.syncAppointmentStatus(visitId, VISIT_STATUS.RESCHEDULED, adminNotes);

    if (clientEmail) {
      sendClientNotification(clientEmail, {
        title:    '📅 Nueva propuesta de fecha para tu visita',
        message:  `Te proponemos reagendar tu visita a "${propName}" para el ${proposedDate} a las ${proposedTime}.`,
        type:     NOTIF_TYPES.VISIT_RESCHEDULED,
        relatedId: visitId,
      }).catch(() => {});
      // El email lo envía el trigger backend onVisitStatusChanged.
    }
  },

  // ── Calendario ────────────────────────────────────────────────────────────
  subscribeCalendar(onData, onError) {
    const q = query(col(), where('status', 'in', [VISIT_STATUS.APPROVED, VISIT_STATUS.COMPLETED, VISIT_STATUS.RESCHEDULED]), orderBy('requestedDate', 'asc'));
    return onSnapshot(q, { includeMetadataChanges: false },
      (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data(), source: 'visits' }))),
      (err) => onError?.(err),
    );
  },

  subscribeCalendarByAgent(agentEmail, onData, onError) {
    const q = query(col(), where('agentEmail', '==', agentEmail), where('status', 'in', [VISIT_STATUS.APPROVED, VISIT_STATUS.RESCHEDULED]), orderBy('requestedDate', 'asc'));
    return onSnapshot(q, { includeMetadataChanges: false },
      (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data(), source: 'visits' }))),
      (err) => onError?.(err),
    );
  },

  subscribeCalendarAppointments(onData, onError) {
    const q = query(collection(db, 'appointments'), orderBy('date', 'asc'));
    return onSnapshot(q, { includeMetadataChanges: false },
      (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data(), source: 'appointments' })).filter((d) => d.sourceCollection !== 'visits')),
      (err) => onError?.(err),
    );
  },
};