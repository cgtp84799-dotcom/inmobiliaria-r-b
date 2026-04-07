import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, getDocs, query, where, orderBy,
  serverTimestamp, onSnapshot,
} from 'firebase/firestore';
import { db } from '../../../core/config/firebase.config';
import { VISIT_STATUS } from '../types/visit.types';
import { notificationService } from '../../notifications/services/notification.service';

const COLLECTION  = 'visits';
const APPTS_COL   = 'appointments';
const col         = () => collection(db, COLLECTION);
const ref         = (id) => doc(db, COLLECTION, id);
const apptsCol    = () => collection(db, APPTS_COL);

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

/** Escribe (o actualiza) el espejo de una visita en /appointments. */
async function syncAppointmentMirror(visitId, visitData) {
  try {
    // Buscamos si ya existe un espejo con este visitId
    const snap = await getDocs(
      query(apptsCol(), where('sourceVisitId', '==', visitId))
    );
    const mirror = {
      sourceCollection : 'visits',
      sourceVisitId    : visitId,
      clientName       : visitData.clientName  ?? '',
      clientEmail      : visitData.clientEmail ?? '',
      clientPhone      : visitData.clientPhone ?? '',
      propertyId       : visitData.propertyId  ?? '',
      propertyName     : visitData.propertyName ?? '',
      propertyAddress  : visitData.propertyAddress ?? '',
      requestedDate    : visitData.requestedDate ?? '',
      requestedTime    : visitData.requestedTime ?? '',
      status           : visitData.status ?? VISIT_STATUS.PENDING,
      agentId          : visitData.agentId   ?? null,
      agentName        : visitData.agentName ?? null,
      agentEmail       : visitData.agentEmail ?? null,
      notes            : visitData.notes ?? '',
      adminNotes       : visitData.adminNotes ?? '',
      updatedAt        : serverTimestamp(),
    };

    if (!snap.empty) {
      await updateDoc(snap.docs[0].ref, mirror);
    } else {
      await addDoc(apptsCol(), { ...mirror, createdAt: serverTimestamp() });
    }
  } catch (e) {
    // best-effort: el espejo no debe bloquear la operación principal
    console.warn('[visitService] syncAppointmentMirror error:', e);
  }
}

// ---------------------------------------------------------------------------
// visitService
// ---------------------------------------------------------------------------
export const visitService = {

  /**
   * Suscripción en tiempo real a todas las visitas.
   * Retorna la función unsub para limpiar en useEffect.
   */
  subscribeAll(onData, onError) {
    const q = query(col(), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err)  => onError?.(err)
    );
  },

  /**
   * Crea una solicitud de visita pública.
   * 3A: también escribe un espejo en /appointments para que el historial
   *     del cliente lo muestre sin importar el origen.
   */
  async requestVisit(payload) {
    const docRef = await addDoc(col(), {
      ...payload,
      status    : VISIT_STATUS.PENDING,
      createdAt : serverTimestamp(),
      updatedAt : serverTimestamp(),
    });

    // 3A — espejo en /appointments
    await syncAppointmentMirror(docRef.id, { ...payload, status: VISIT_STATUS.PENDING });

    // Notificar admins (best-effort)
    try {
      const adminsSnap = await getDocs(
        query(collection(db, 'users'), where('role', '==', 'admin'))
      );
      await Promise.allSettled(
        adminsSnap.docs.map((d) =>
          notificationService.createNotification({
            userId   : d.id,
            type     : 'visit_request',
            title    : 'Nueva solicitud de visita',
            message  : `${payload.clientName} quiere visitar "${payload.propertyName}"`,
            actionUrl: '/usuarios/visitas',
          })
        )
      );
    } catch (_) {}

    return docRef.id;
  },

  /** Todas las visitas (admin). */
  async getAllVisits() {
    const snap = await getDocs(query(col(), orderBy('createdAt', 'desc')));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  /** Visitas de una propiedad. */
  async getVisitsByProperty(propertyId) {
    const snap = await getDocs(
      query(col(), where('propertyId', '==', propertyId), orderBy('createdAt', 'desc'))
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  /** Visitas de un cliente por email. */
  async getVisitsByClient(clientEmail) {
    const snap = await getDocs(
      query(col(), where('clientEmail', '==', clientEmail), orderBy('createdAt', 'desc'))
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  /** Cambia el estado de una visita y sincroniza el espejo. */
  async updateStatus(visitId, newStatus, adminNotes = '') {
    await updateDoc(ref(visitId), {
      status    : newStatus,
      adminNotes,
      updatedAt : serverTimestamp(),
    });
    // sincronizar estado en el espejo
    await syncAppointmentMirror(visitId, { status: newStatus, adminNotes });
  },

  /** Actualiza campos libres de una visita. */
  async updateVisit(visitId, data) {
    await updateDoc(ref(visitId), { ...data, updatedAt: serverTimestamp() });
    await syncAppointmentMirror(visitId, data);
  },

  /** Elimina una visita (solo admin). */
  async deleteVisit(visitId) {
    await deleteDoc(ref(visitId));
    // no eliminamos el espejo: mantiene el historial del cliente
  },

  /**
   * Aprueba una visita.
   * 3B: acepta agentData { agentId, agentName, agentEmail } para asignar
   *     el agente responsable al momento de aprobar.
   */
  async approveVisit(visit, adminNotes = '', agentData = null) {
    const updatePayload = {
      status     : VISIT_STATUS.APPROVED,
      adminNotes ,
      approvedAt : serverTimestamp(),
      updatedAt  : serverTimestamp(),
      ...(agentData ? {
        agentId   : agentData.agentId   ?? null,
        agentName : agentData.agentName ?? null,
        agentEmail: agentData.agentEmail ?? null,
      } : {}),
    };

    await updateDoc(ref(visit.id), updatePayload);
    await syncAppointmentMirror(visit.id, { ...visit, ...updatePayload });

    // Notificaciones internas
    const effectiveAgent = agentData ?? {
      agentEmail: visit.agentEmail,
      agentName : visit.agentName,
    };

    if (visit.clientEmail) {
      await notificationService.createNotification({
        userId   : visit.clientEmail,
        type     : 'visit_approved',
        title    : 'Visita aprobada',
        message  : `Tu visita a "${visit.propertyName}" fue aprobada para el ${visit.requestedDate} a las ${visit.requestedTime}.`,
        actionUrl: '/portal/visitas',
      }).catch(() => {});
    }
    if (effectiveAgent?.agentEmail) {
      await notificationService.createNotification({
        userId   : effectiveAgent.agentEmail,
        type     : 'visit_approved',
        title    : 'Visita asignada',
        message  : `Tienes una visita aprobada: "${visit.propertyName}" — ${visit.clientName} el ${visit.requestedDate}.`,
        actionUrl: '/usuarios/visitas',
      }).catch(() => {});
    }
  },

  /** Rechaza una visita y notifica al cliente. */
  async rejectVisit(visit, adminNotes = '') {
    await this.updateStatus(visit.id, VISIT_STATUS.REJECTED, adminNotes);
    if (visit.clientEmail) {
      await notificationService.createNotification({
        userId   : visit.clientEmail,
        type     : 'visit_rejected',
        title    : 'Visita no aprobada',
        message  : `Tu solicitud de visita a "${visit.propertyName}" no pudo ser aprobada. ${adminNotes || ''}`,
        actionUrl: '/portal/visitas',
      }).catch(() => {});
    }
  },

  /** Marca una visita como completada. */
  async completeVisit(visitId, adminNotes = '') {
    await this.updateStatus(visitId, VISIT_STATUS.COMPLETED, adminNotes);
  },
};
