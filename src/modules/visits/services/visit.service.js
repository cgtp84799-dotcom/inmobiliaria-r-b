import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, getDocs, query, where, orderBy,
  serverTimestamp, onSnapshot,
} from 'firebase/firestore';
import { db } from '../../../core/config/firebase.config';
import { VISIT_STATUS } from '../types/visit.types';
import { notificationService } from '../../notifications/services/notification.service';

const COLLECTION = 'visits';
const col = () => collection(db, COLLECTION);
const ref = (id) => doc(db, COLLECTION, id);

// ─────────────────────────────────────────────────────────────
// visitService
// ─────────────────────────────────────────────────────────────
export const visitService = {

  // ── Tiempo real ───────────────────────────────────────────
  subscribeAll(onData, onError) {
    const q = query(col(), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err)  => onError?.(err)
    );
  },

  // ── 3A: requestVisit también escribe en appointments ──────
  // Así el historial de cliente (que lee appointments) ve las
  // visitas llegadas del formulario público sin migrar datos.
  async requestVisit(payload) {
    // 1. Escribir en /visits (fuente principal)
    const visitRef = await addDoc(col(), {
      ...payload,
      sourceCollection: 'visits',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // 2. Espejo en /appointments para historial de cliente
    try {
      await addDoc(collection(db, 'appointments'), {
        visitId:         visitRef.id,
        sourceCollection:'visits',
        clientName:      payload.clientName,
        clientEmail:     payload.clientEmail,
        clientPhone:     payload.clientPhone ?? '',
        propertyId:      payload.propertyId  ?? null,
        propertyName:    payload.propertyName,
        propertyAddress: payload.propertyAddress ?? '',
        date:            payload.requestedDate,
        time:            payload.requestedTime,
        notes:           payload.notes ?? '',
        agentId:         payload.agentId    ?? null,
        agentName:       payload.agentName  ?? null,
        agentEmail:      payload.agentEmail ?? null,
        status:          VISIT_STATUS.PENDING,
        createdAt:       serverTimestamp(),
        updatedAt:       serverTimestamp(),
      });
    } catch (_) {
      // El espejo es best-effort: no debe bloquear la solicitud
      console.warn('visitService: no se pudo crear espejo en appointments');
    }

    // 3. Notificar admins
    try {
      const adminsSnap = await getDocs(
        query(collection(db, 'users'), where('role', '==', 'admin'))
      );
      await Promise.allSettled(
        adminsSnap.docs.map((d) =>
          notificationService.createNotification({
            userId:    d.id,
            type:      'visit_request',
            title:     'Nueva solicitud de visita',
            message:   `${payload.clientName} quiere visitar "${payload.propertyName}"`,
            actionUrl: '/usuarios/visitas',
          })
        )
      );
    } catch (_) {}

    return visitRef.id;
  },

  async getAllVisits() {
    const snap = await getDocs(query(col(), orderBy('createdAt', 'desc')));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async getVisitsByProperty(propertyId) {
    const snap = await getDocs(
      query(col(), where('propertyId', '==', propertyId), orderBy('createdAt', 'desc'))
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async getVisitsByClient(clientEmail) {
    const snap = await getDocs(
      query(col(), where('clientEmail', '==', clientEmail), orderBy('createdAt', 'desc'))
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async updateStatus(visitId, newStatus, adminNotes = '') {
    await updateDoc(ref(visitId), {
      status: newStatus,
      adminNotes,
      updatedAt: serverTimestamp(),
    });
  },

  // ── 3A: updateStatus también sincroniza el espejo ─────────
  async syncAppointmentStatus(visitId, newStatus, adminNotes = '') {
    try {
      const snap = await getDocs(
        query(collection(db, 'appointments'), where('visitId', '==', visitId))
      );
      await Promise.all(
        snap.docs.map((d) =>
          updateDoc(d.ref, { status: newStatus, adminNotes, updatedAt: serverTimestamp() })
        )
      );
    } catch (_) {}
  },

  async updateVisit(visitId, data) {
    await updateDoc(ref(visitId), { ...data, updatedAt: serverTimestamp() });
    // Si se asigna agente, sincronizar espejo
    if (data.agentId || data.agentName || data.agentEmail) {
      try {
        const snap = await getDocs(
          query(collection(db, 'appointments'), where('visitId', '==', visitId))
        );
        await Promise.all(
          snap.docs.map((d) =>
            updateDoc(d.ref, {
              agentId:    data.agentId    ?? null,
              agentName:  data.agentName  ?? null,
              agentEmail: data.agentEmail ?? null,
              updatedAt:  serverTimestamp(),
            })
          )
        );
      } catch (_) {}
    }
  },

  async deleteVisit(visitId) {
    await deleteDoc(ref(visitId));
  },

  // ── 3B: approveVisit acepta agentId/agentName/agentEmail ──
  async approveVisit(visit, adminNotes = '', agentData = {}) {
    const updatePayload = {
      status:     VISIT_STATUS.APPROVED,
      adminNotes,
      updatedAt:  serverTimestamp(),
      approvedAt: serverTimestamp(),
      ...(agentData.agentId    && { agentId:    agentData.agentId }),
      ...(agentData.agentName  && { agentName:  agentData.agentName }),
      ...(agentData.agentEmail && { agentEmail: agentData.agentEmail }),
    };
    await updateDoc(ref(visit.id), updatePayload);
    await this.syncAppointmentStatus(visit.id, VISIT_STATUS.APPROVED, adminNotes);

    if (visit.clientEmail) {
      await notificationService.createNotification({
        userId:    visit.clientEmail,
        type:      'visit_approved',
        title:     'Visita aprobada',
        message:   `Tu visita a "${visit.propertyName}" fue aprobada para el ${visit.requestedDate} a las ${visit.requestedTime}.`,
        actionUrl: '/portal/visitas',
      });
    }
    const effectiveAgentEmail = agentData.agentEmail || visit.agentEmail;
    if (effectiveAgentEmail) {
      await notificationService.createNotification({
        userId:    effectiveAgentEmail,
        type:      'visit_approved',
        title:     'Visita asignada',
        message:   `Tienes una visita aprobada: "${visit.propertyName}" — ${visit.clientName} el ${visit.requestedDate}.`,
        actionUrl: '/usuarios/visitas',
      });
    }
  },

  async rejectVisit(visit, adminNotes = '') {
    await this.updateStatus(visit.id, VISIT_STATUS.REJECTED, adminNotes);
    await this.syncAppointmentStatus(visit.id, VISIT_STATUS.REJECTED, adminNotes);
    if (visit.clientEmail) {
      await notificationService.createNotification({
        userId:    visit.clientEmail,
        type:      'visit_rejected',
        title:     'Visita no aprobada',
        message:   `Tu solicitud de visita a "${visit.propertyName}" no pudo ser aprobada. ${adminNotes || ''}`,
        actionUrl: '/portal/visitas',
      });
    }
  },

  async completeVisit(visitId, adminNotes = '') {
    await this.updateStatus(visitId, VISIT_STATUS.COMPLETED, adminNotes);
    await this.syncAppointmentStatus(visitId, VISIT_STATUS.COMPLETED, adminNotes);
  },

  // ── 3C: suscripción para el calendario (visits aprobadas/completadas) ──
  subscribeCalendar(onData, onError) {
    const q = query(
      col(),
      where('status', 'in', [VISIT_STATUS.APPROVED, VISIT_STATUS.COMPLETED]),
      orderBy('requestedDate', 'asc')
    );
    return onSnapshot(
      q,
      (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data(), source: 'visits' }))),
      (err)  => onError?.(err)
    );
  },

  // ── 3C: suscripción appointments aprobados/completados ────
  subscribeCalendarAppointments(onData, onError) {
    const q = query(
      collection(db, 'appointments'),
      where('sourceCollection', '!=', 'visits'), // evitar duplicados del espejo
      orderBy('sourceCollection'),
      orderBy('date', 'asc')
    );
    return onSnapshot(
      q,
      (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data(), source: 'appointments' }))),
      (err)  => onError?.(err)
    );
  },
};
