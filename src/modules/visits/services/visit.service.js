import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, getDocs, query, where, orderBy, limit,
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
    const unsub = onSnapshot(
      q,
      { includeMetadataChanges: false },
      (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => {
        if (err?.code === 'failed-precondition' || err?.message?.includes('index')) {
          console.warn(
            '⚠️  visitService: falta índice compuesto en Firestore.\n' +
            'Abre el link de arriba para crearlo en un clic.\n' +
            'Mientras tanto se carga sin ordenar.',
          );
          getDocs(col())
            .then((snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
            .catch((e) => onError?.(e));
        } else {
          onError?.(err);
        }
      },
    );
    return unsub;
  },

  // ── Solicitar visita (formulario público — usuario NO autenticado) ──────
  //
  // REGLAS de Firestore:
  //   /visits        → allow create: if true;               ✅ siempre funciona
  //   /appointments  → allow write: if isSignedIn();         ❌ usuario anónimo FALLA
  //   /users         → allow read: if isSignedIn();          ❌ usuario anónimo FALLA
  //   /notifications → allow create: if isSignedIn();        ❌ usuario anónimo FALLA
  //
  // Las tres operaciones posteriores son "best-effort": si fallan solo
  // emiten un console.warn y NO relanzar el error, de modo que el visitante
  // siempre ve la pantalla de "¡Solicitud enviada!" aunque no esté autenticado.
  async requestVisit(payload) {
    // 1. Escritura principal — la única que DEBE funcionar
    const visitRef = await addDoc(col(), {
      ...payload,
      sourceCollection: 'visits',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // 2. Espejo en /appointments (best-effort)
    try {
      await addDoc(collection(db, 'appointments'), {
        visitId:          visitRef.id,
        sourceCollection: 'visits',
        clientName:       payload.clientName,
        clientEmail:      payload.clientEmail,
        clientPhone:      payload.clientPhone      ?? '',
        propertyId:       payload.propertyId       ?? null,
        propertyName:     payload.propertyName,
        propertyAddress:  payload.propertyAddress  ?? '',
        date:             payload.requestedDate,
        time:             payload.requestedTime,
        notes:            payload.notes            ?? '',
        agentId:          payload.agentId          ?? null,
        agentName:        payload.agentName        ?? null,
        agentEmail:       payload.agentEmail       ?? null,
        status:           VISIT_STATUS.PENDING,
        createdAt:        serverTimestamp(),
        updatedAt:        serverTimestamp(),
      });
    } catch (e) {
      console.warn('visitService: espejo en /appointments omitido (usuario no autenticado):', e.code);
    }

    // 3. Notificar admins (best-effort — requiere isSignedIn para leer /users)
    try {
      const adminsSnap = await getDocs(
        query(collection(db, 'users'), where('role', '==', 'admin'), limit(20)),
      );
      await Promise.allSettled(
        adminsSnap.docs.map((d) =>
          notificationService.createNotification({
            userId:    d.id,
            type:      'visit_request',
            title:     'Nueva solicitud de visita',
            message:   `${payload.clientName} quiere visitar "${payload.propertyName}"`,
            actionUrl: '/usuarios/visitas',
          }),
        ),
      );
    } catch (e) {
      console.warn('visitService: notificaciones a admins omitidas (usuario no autenticado):', e.code);
    }

    return visitRef.id;
  },

  // ── Lecturas puntuales ────────────────────────────────────────────────
  async getAllVisits() {
    const snap = await getDocs(query(col(), orderBy('createdAt', 'desc')));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async getVisitsByProperty(propertyId) {
    const snap = await getDocs(
      query(col(), where('propertyId', '==', propertyId), orderBy('createdAt', 'desc')),
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async getVisitsByClient(clientEmail) {
    const snap = await getDocs(
      query(col(), where('clientEmail', '==', clientEmail), orderBy('createdAt', 'desc')),
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  // ── Actualización genérica de estado ─────────────────────────────────
  async updateStatus(visitId, newStatus, adminNotes = '') {
    await updateDoc(ref(visitId), {
      status:    newStatus,
      adminNotes,
      updatedAt: serverTimestamp(),
    });
  },

  // ── Sincronizar espejo en /appointments ───────────────────────────────
  async syncAppointmentStatus(visitId, newStatus, adminNotes = '') {
    try {
      const snap = await getDocs(
        query(collection(db, 'appointments'), where('visitId', '==', visitId)),
      );
      await Promise.all(
        snap.docs.map((d) =>
          updateDoc(d.ref, { status: newStatus, adminNotes, updatedAt: serverTimestamp() }),
        ),
      );
    } catch (_) {}
  },

  // ── Actualización genérica de campos ─────────────────────────────────
  async updateVisit(visitId, data) {
    await updateDoc(ref(visitId), { ...data, updatedAt: serverTimestamp() });
    if (data.agentId || data.agentName || data.agentEmail) {
      try {
        const snap = await getDocs(
          query(collection(db, 'appointments'), where('visitId', '==', visitId)),
        );
        await Promise.all(
          snap.docs.map((d) =>
            updateDoc(d.ref, {
              agentId:    data.agentId    ?? null,
              agentName:  data.agentName  ?? null,
              agentEmail: data.agentEmail ?? null,
              updatedAt:  serverTimestamp(),
            }),
          ),
        );
      } catch (_) {}
    }
  },

  async deleteVisit(visitId) {
    await deleteDoc(ref(visitId));
  },

  // ── Aprobar visita ────────────────────────────────────────────────────
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

  // ── Rechazar visita ───────────────────────────────────────────────────
  async rejectVisit(visit, adminNotes = '') {
    await this.updateStatus(visit.id, VISIT_STATUS.REJECTED, adminNotes);
    await this.syncAppointmentStatus(visit.id, VISIT_STATUS.REJECTED, adminNotes);
    if (visit.clientEmail) {
      await notificationService.createNotification({
        userId:    visit.clientEmail,
        type:      'visit_rejected',
        title:     'Visita no aprobada',
        message:   `Tu solicitud de visita a "${visit.propertyName}" no pudo ser aprobada. ${adminNotes || ''}`.trim(),
        actionUrl: '/portal/visitas',
      });
    }
  },

  // ── Completar visita ──────────────────────────────────────────────────
  async completeVisit(visitId, adminNotes = '') {
    await this.updateStatus(visitId, VISIT_STATUS.COMPLETED, adminNotes);
    await this.syncAppointmentStatus(visitId, VISIT_STATUS.COMPLETED, adminNotes);
  },

  // ── Proponer nueva hora / reagendar ───────────────────────────────────
  async rescheduleVisit(visit, proposedDate, proposedTime, adminNotes = '') {
    const updatePayload = {
      status:        VISIT_STATUS.RESCHEDULED,
      proposedDate,
      proposedTime,
      adminNotes,
      updatedAt:     serverTimestamp(),
      rescheduledAt: serverTimestamp(),
    };
    await updateDoc(ref(visit.id ?? visit), updatePayload);
    await this.syncAppointmentStatus(visit.id ?? visit, VISIT_STATUS.RESCHEDULED, adminNotes);
    const clientEmail = typeof visit === 'object' ? visit.clientEmail : null;
    if (clientEmail) {
      await notificationService.createNotification({
        userId:    clientEmail,
        type:      'visit_rescheduled',
        title:     'Nueva propuesta de fecha',
        message:   `Te proponemos reagendar tu visita a "${visit.propertyName}" para el ${proposedDate} a las ${proposedTime}.`,
        actionUrl: '/portal/visitas',
      }).catch(() => {});
    }
  },

  // ── Calendario (suscripción en tiempo real) ───────────────────────────
  subscribeCalendar(onData, onError) {
    const q = query(
      col(),
      where('status', 'in', [
        VISIT_STATUS.APPROVED,
        VISIT_STATUS.COMPLETED,
        VISIT_STATUS.RESCHEDULED,
      ]),
      orderBy('requestedDate', 'asc'),
    );
    return onSnapshot(
      q,
      { includeMetadataChanges: false },
      (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data(), source: 'visits' }))),
      (err)  => onError?.(err),
    );
  },

  // ── Calendario appointments (sin espejo de visits) ────────────────────
  subscribeCalendarAppointments(onData, onError) {
    const q = query(
      collection(db, 'appointments'),
      where('sourceCollection', '!=', 'visits'),
      orderBy('sourceCollection'),
      orderBy('date', 'asc'),
    );
    return onSnapshot(
      q,
      { includeMetadataChanges: false },
      (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data(), source: 'appointments' }))),
      (err)  => onError?.(err),
    );
  },
};
