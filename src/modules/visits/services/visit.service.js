import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, getDocs, getDoc, query, where, orderBy, limit,
  serverTimestamp, onSnapshot,
} from 'firebase/firestore';
import { db } from '../../../core/config/firebase.config';
import { VISIT_STATUS } from '../types/visit.types';
import { notificationService } from '../../notifications/services/notification.service';
import { auth } from '../../../core/config/firebase.config';

const COLLECTION = 'visits';
const col = () => collection(db, COLLECTION);
const ref = (id) => doc(db, COLLECTION, id);

// ─── Helper: email al cliente y/o agente vía colección /mail ─────────────────
// Requiere la extensión "Trigger Email from Firestore" instalada en Firebase.
// Si no está instalada, el addDoc simplemente se guarda y no pasa nada más.
async function sendMail(to, subject, html) {
  if (!to) return;
  try {
    await addDoc(collection(db, 'mail'), {
      to,
      message: { subject, html },
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn('sendMail: no se pudo encolar el email:', e.message);
  }
}

// ─── Helper: crear o actualizar cliente y registrar en historial ──────────────
async function upsertClientAndHistory(visit, agentData, approvedByEmail) {
  try {
    const clientsSnap = await getDocs(
      query(collection(db, 'clients'), where('email', '==', visit.clientEmail)),
    );

    const basePayload = {
      name:      visit.clientName,
      email:     visit.clientEmail,
      phone:     visit.clientPhone || '',
      updatedAt: serverTimestamp(),
    };

    let clientId;

    if (clientsSnap.empty) {
      const newRef = await addDoc(collection(db, 'clients'), {
        ...basePayload,
        source:    'visit_request',
        agentId:   agentData.agentId   || visit.agentId   || null,
        agentName: agentData.agentName || visit.agentName || null,
        agentEmail:agentData.agentEmail|| visit.agentEmail|| null,
        createdAt: serverTimestamp(),
      });
      clientId = newRef.id;
    } else {
      clientId = clientsSnap.docs[0].id;
      await updateDoc(clientsSnap.docs[0].ref, basePayload);
    }

    // Historial de la visita aprobada
    await addDoc(collection(db, 'clients', clientId, 'history'), {
      type:         'visit_approved',
      visitId:      visit.id,
      propertyId:   visit.propertyId  || null,
      propertyName: visit.propertyName,
      date:         visit.requestedDate,
      time:         visit.requestedTime,
      agentId:      agentData.agentId   || visit.agentId   || null,
      agentName:    agentData.agentName || visit.agentName || null,
      agentEmail:   agentData.agentEmail|| visit.agentEmail|| null,
      approvedBy:   approvedByEmail     || null,
      notes:        visit.adminNotes    || '',
      createdAt:    serverTimestamp(),
    });

    // Vincular clientId a la visita
    await updateDoc(ref(visit.id), { clientId });

    return clientId;
  } catch (e) {
    console.warn('upsertClientAndHistory error:', e.message);
    return null;
  }
}

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

  // ── Suscripción filtrada por agente (rol member) ──────────
  // Muestra solo las visitas asignadas al agente autenticado.
  subscribeByAgent(agentEmail, onData, onError) {
    const q = query(
      col(),
      where('agentEmail', '==', agentEmail),
      orderBy('createdAt', 'desc'),
    );
    return onSnapshot(
      q,
      { includeMetadataChanges: false },
      (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => onError?.(err),
    );
  },

  // ── Solicitar visita (formulario público — usuario NO autenticado) ──────
  async requestVisit(payload) {
    const visitRef = await addDoc(col(), {
      ...payload,
      sourceCollection: 'visits',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Espejo en /appointments (best-effort)
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
      console.warn('visitService: espejo en /appointments omitido:', e.code);
    }

    // Notificar admins (best-effort)
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
      console.warn('visitService: notificaciones a admins omitidas:', e.code);
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
  // agentData = { agentId, agentName, agentEmail }
  // El email del admin que aprueba se toma de auth.currentUser.
  async approveVisit(visit, adminNotes = '', agentData = {}) {
    const approvedByEmail = auth.currentUser?.email || null;

    const updatePayload = {
      status:          VISIT_STATUS.APPROVED,
      adminNotes,
      approvedBy:      approvedByEmail,
      updatedAt:       serverTimestamp(),
      approvedAt:      serverTimestamp(),
      ...(agentData.agentId    && { agentId:    agentData.agentId }),
      ...(agentData.agentName  && { agentName:  agentData.agentName }),
      ...(agentData.agentEmail && { agentEmail: agentData.agentEmail }),
    };
    await updateDoc(ref(visit.id), updatePayload);
    await this.syncAppointmentStatus(visit.id, VISIT_STATUS.APPROVED, adminNotes);

    // 1. Crear/actualizar cliente y registrar en historial
    await upsertClientAndHistory(
      { ...visit, adminNotes },
      agentData,
      approvedByEmail,
    );

    // 2. Notificación interna al cliente
    if (visit.clientEmail) {
      await notificationService.createNotification({
        userId:    visit.clientEmail,
        type:      'visit_approved',
        title:     'Visita aprobada',
        message:   `Tu visita a "${visit.propertyName}" fue aprobada para el ${visit.requestedDate} a las ${visit.requestedTime}.`,
        actionUrl: '/portal/visitas',
      }).catch(() => {});
    }

    // 3. Notificación interna al agente asignado
    const effectiveAgentEmail = agentData.agentEmail || visit.agentEmail;
    const effectiveAgentName  = agentData.agentName  || visit.agentName;
    if (effectiveAgentEmail) {
      await notificationService.createNotification({
        userId:    effectiveAgentEmail,
        type:      'visit_assigned',
        title:     'Visita asignada',
        message:   `Tienes una visita aprobada: "${visit.propertyName}" — ${visit.clientName} el ${visit.requestedDate}.`,
        actionUrl: '/usuarios/visitas',
      }).catch(() => {});
    }

    // 4. Email al cliente
    await sendMail(
      visit.clientEmail,
      `✅ Tu visita a "${visit.propertyName}" fue aprobada`,
      `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
          <h2 style="color:#01696f;">¡Tu visita fue aprobada! 🎉</h2>
          <p>Hola <strong>${visit.clientName}</strong>,</p>
          <p>Tu solicitud de visita ha sido confirmada con los siguientes datos:</p>
          <table style="border-collapse:collapse;width:100%;">
            <tr><td style="padding:6px 0;color:#666;">📍 Propiedad</td><td style="padding:6px 0;"><strong>${visit.propertyName}</strong></td></tr>
            <tr><td style="padding:6px 0;color:#666;">📅 Fecha</td><td style="padding:6px 0;"><strong>${visit.requestedDate}</strong></td></tr>
            <tr><td style="padding:6px 0;color:#666;">🕐 Hora</td><td style="padding:6px 0;"><strong>${visit.requestedTime}</strong></td></tr>
            ${effectiveAgentName ? `<tr><td style="padding:6px 0;color:#666;">👤 Agente</td><td style="padding:6px 0;"><strong>${effectiveAgentName}</strong></td></tr>` : ''}
            ${adminNotes ? `<tr><td style="padding:6px 0;color:#666;">📝 Notas</td><td style="padding:6px 0;">${adminNotes}</td></tr>` : ''}
          </table>
          <p style="margin-top:24px;color:#888;font-size:13px;">Si tienes alguna pregunta, responde este correo.</p>
        </div>
      `,
    );

    // 5. Email al agente asignado
    if (effectiveAgentEmail) {
      await sendMail(
        effectiveAgentEmail,
        `📋 Nueva visita asignada — ${visit.propertyName}`,
        `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
            <h2 style="color:#01696f;">Tienes una visita asignada 📅</h2>
            <p>Hola <strong>${effectiveAgentName || effectiveAgentEmail}</strong>,</p>
            <table style="border-collapse:collapse;width:100%;">
              <tr><td style="padding:6px 0;color:#666;">👤 Cliente</td><td style="padding:6px 0;"><strong>${visit.clientName}</strong> (${visit.clientEmail})</td></tr>
              <tr><td style="padding:6px 0;color:#666;">📞 Teléfono</td><td style="padding:6px 0;">${visit.clientPhone || 'No indicado'}</td></tr>
              <tr><td style="padding:6px 0;color:#666;">📍 Propiedad</td><td style="padding:6px 0;"><strong>${visit.propertyName}</strong></td></tr>
              <tr><td style="padding:6px 0;color:#666;">📅 Fecha</td><td style="padding:6px 0;"><strong>${visit.requestedDate} a las ${visit.requestedTime}</strong></td></tr>
              ${adminNotes ? `<tr><td style="padding:6px 0;color:#666;">📝 Notas</td><td style="padding:6px 0;">${adminNotes}</td></tr>` : ''}
            </table>
            <p style="margin-top:24px;color:#888;font-size:13px;">Aprobado por: ${approvedByEmail || 'administrador'}</p>
          </div>
        `,
      );
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
      }).catch(() => {});

      await sendMail(
        visit.clientEmail,
        `Tu solicitud de visita a "${visit.propertyName}"`,
        `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
            <h2 style="color:#a12c7b;">Solicitud de visita</h2>
            <p>Hola <strong>${visit.clientName}</strong>,</p>
            <p>Lamentablemente tu solicitud de visita a <strong>${visit.propertyName}</strong> no pudo ser aprobada en este momento.</p>
            ${adminNotes ? `<p><strong>Motivo:</strong> ${adminNotes}</p>` : ''}
            <p>Si deseas más información, contáctanos respondiendo este correo.</p>
          </div>
        `,
      );
    }
  },

  // ── Completar visita ──────────────────────────────────────────────────
  async completeVisit(visitId, adminNotes = '') {
    await this.updateStatus(visitId, VISIT_STATUS.COMPLETED, adminNotes);
    await this.syncAppointmentStatus(visitId, VISIT_STATUS.COMPLETED, adminNotes);

    // Registrar en historial del cliente si existe clientId
    try {
      const visitSnap = await getDoc(ref(visitId));
      const visit = { id: visitId, ...visitSnap.data() };
      if (visit.clientId) {
        await addDoc(collection(db, 'clients', visit.clientId, 'history'), {
          type:         'visit_completed',
          visitId,
          propertyName: visit.propertyName,
          date:         visit.requestedDate,
          agentName:    visit.agentName || null,
          notes:        adminNotes,
          createdAt:    serverTimestamp(),
        });
      }
    } catch (_) {}
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
    const clientName  = typeof visit === 'object' ? visit.clientName  : null;
    const propName    = typeof visit === 'object' ? visit.propertyName : null;

    if (clientEmail) {
      await notificationService.createNotification({
        userId:    clientEmail,
        type:      'visit_rescheduled',
        title:     'Nueva propuesta de fecha',
        message:   `Te proponemos reagendar tu visita a "${propName}" para el ${proposedDate} a las ${proposedTime}.`,
        actionUrl: '/portal/visitas',
      }).catch(() => {});

      await sendMail(
        clientEmail,
        `📅 Nueva fecha propuesta para tu visita a "${propName}"`,
        `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
            <h2 style="color:#006494;">Propuesta de nueva fecha</h2>
            <p>Hola <strong>${clientName}</strong>,</p>
            <p>Te proponemos reagendar tu visita a <strong>${propName}</strong>:</p>
            <table style="border-collapse:collapse;width:100%;">
              <tr><td style="padding:6px 0;color:#666;">📅 Nueva fecha</td><td style="padding:6px 0;"><strong>${proposedDate}</strong></td></tr>
              <tr><td style="padding:6px 0;color:#666;">🕐 Nueva hora</td><td style="padding:6px 0;"><strong>${proposedTime}</strong></td></tr>
              ${adminNotes ? `<tr><td style="padding:6px 0;color:#666;">📝 Comentario</td><td style="padding:6px 0;">${adminNotes}</td></tr>` : ''}
            </table>
            <p style="margin-top:16px;">Responde este correo para confirmar o solicitar otro horario.</p>
          </div>
        `,
      );
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

  // ── Calendario filtrado por agente ────────────────────────────────────
  subscribeCalendarByAgent(agentEmail, onData, onError) {
    const q = query(
      col(),
      where('agentEmail', '==', agentEmail),
      where('status', 'in', [
        VISIT_STATUS.APPROVED,
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
