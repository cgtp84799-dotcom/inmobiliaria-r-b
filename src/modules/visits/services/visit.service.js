import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, getDocs, query, where, orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../../core/config/firebase.config';
import { VISIT_STATUS } from '../types/visit.types';
import { notificationService } from '../../notifications/services/notification.service';

const COLLECTION = 'visits';
const col = () => collection(db, COLLECTION);
const ref = (id) => doc(db, COLLECTION, id);

/**
 * visitService — todas las operaciones Firestore del módulo de visitas.
 */
export const visitService = {

  /** Crea una solicitud de visita y notifica a los admins. */
  async requestVisit(payload) {
    const docRef = await addDoc(col(), {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Notificar a los admins buscando users con role=='admin'
    try {
      const adminsSnap = await getDocs(
        query(collection(db, 'users'), where('role', '==', 'admin'))
      );
      const notifPromises = adminsSnap.docs.map((d) =>
        notificationService.createNotification({
          userId:  d.id,           // docId es el email
          type:    'visit_request',
          title:   'Nueva solicitud de visita',
          message: `${payload.clientName} quiere visitar "${payload.propertyName}"`,
          actionUrl: '/usuarios/visitas',
        })
      );
      await Promise.allSettled(notifPromises);
    } catch (_) {
      // Las notificaciones son best-effort; no bloquear la solicitud
    }

    return docRef.id;
  },

  /** Todas las visitas (admin). Ordenadas por fecha de solicitud. */
  async getAllVisits() {
    const snap = await getDocs(query(col(), orderBy('createdAt', 'desc')));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  /** Visitas de una propiedad específica. */
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

  /**
   * Cambia el estado de una visita.
   * Después de aprobar/rechazar notifica al cliente.
   */
  async updateStatus(visitId, newStatus, adminNotes = '') {
    const visitRef = ref(visitId);
    await updateDoc(visitRef, {
      status: newStatus,
      adminNotes,
      updatedAt: serverTimestamp(),
    });
  },

  /** Actualiza campos libres de una visita. */
  async updateVisit(visitId, data) {
    await updateDoc(ref(visitId), { ...data, updatedAt: serverTimestamp() });
  },

  /** Elimina una visita (solo admin). */
  async deleteVisit(visitId) {
    await deleteDoc(ref(visitId));
  },

  /**
   * Aprueba una visita y notifica al cliente.
   */
  async approveVisit(visit, adminNotes = '') {
    await this.updateStatus(visit.id, VISIT_STATUS.APPROVED, adminNotes);
    if (visit.clientEmail) {
      await notificationService.createNotification({
        userId:  visit.clientEmail,
        type:    'visit_approved',
        title:   'Visita aprobada',
        message: `Tu visita a "${visit.propertyName}" fue aprobada para el ${visit.requestedDate} a las ${visit.requestedTime}.`,
        actionUrl: '/portal/visitas',
      });
    }
    // También notifica al agente asignado si hay uno
    if (visit.agentEmail) {
      await notificationService.createNotification({
        userId:  visit.agentEmail,
        type:    'visit_approved',
        title:   'Visita asignada',
        message: `Tienes una visita aprobada: "${visit.propertyName}" — ${visit.clientName} el ${visit.requestedDate}.`,
        actionUrl: '/usuarios/visitas',
      });
    }
  },

  /**
   * Rechaza una visita y notifica al cliente.
   */
  async rejectVisit(visit, adminNotes = '') {
    await this.updateStatus(visit.id, VISIT_STATUS.REJECTED, adminNotes);
    if (visit.clientEmail) {
      await notificationService.createNotification({
        userId:  visit.clientEmail,
        type:    'visit_rejected',
        title:   'Visita no aprobada',
        message: `Tu solicitud de visita a "${visit.propertyName}" no pudo ser aprobada. ${adminNotes ? adminNotes : ''}`,
        actionUrl: '/portal/visitas',
      });
    }
  },

  /**
   * Marca una visita como completada.
   */
  async completeVisit(visitId, adminNotes = '') {
    await this.updateStatus(visitId, VISIT_STATUS.COMPLETED, adminNotes);
  },
};
