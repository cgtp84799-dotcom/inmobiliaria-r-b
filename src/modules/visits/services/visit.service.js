import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, getDocs, getDoc, query, where, orderBy, limit,
  serverTimestamp, onSnapshot,
} from 'firebase/firestore';
import { db, auth } from '../../../core/config/firebase.config';
import { VISIT_STATUS } from '../types/visit.types';
import { notificationService } from '../../notifications/services/notification.service';

const COLLECTION = 'visits';
const col = () => collection(db, COLLECTION);
const ref = (id) => doc(db, COLLECTION, id);

// ── Helper: email al cliente y/o agente vía colección /mail ──────────────
// Requiere la extensión "Trigger Email from Firestore" instalada en Firebase.
async function sendMail(to, subject, html) {
  if (!to) return;
  try {
    await addDoc(collection(db, 'mail'), {
      to,
      message: { subject, html },
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn('sendMail:', e.message);
  }
}

// ── Helper: crear/actualizar cliente + historial ──────────────────────────
async function upsertClientAndHistory(visit, agentData, approvedByEmail) {
  try {
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
        agentId: agentData.agentId || null,
        agentName: agentData.agentName || null,
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
      propertyId: visit.propertyId || null,
      propertyName: visit.propertyName,
      date: visit.requestedDate, time: visit.requestedTime,
      agentId: agentData.agentId || null,
      agentName: agentData.agentName || null,
      agentEmail: agentData.agentEmail || null,
      approvedBy: approvedByEmail || null,
      notes: visit.adminNotes || '',
      createdAt: serverTimestamp(),
    });
    await updateDoc(ref(visit.id), { clientId });
    return clientId;
  } catch (e) {
    console.warn('upsertClientAndHistory:', e.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────
export const visitService = {

  // ── Admin: ve TODAS las visitas ──────────────────────────────────────
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

  // ── Member/Agente: ve solo sus visitas ASIGNADAS ─────────────────────
  // La visita le aparece al member SOLO si ya tiene su email en agentEmail,
  // es decir, DESPUÉS de que alguien la aprobó y le fue asignada.
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

  // ── Member/Agente: ve las PENDIENTES (para poder tomar una) ──────────
  // Cuando están pendientes, todos los agentes las ven para poder aceptar.
  // En cuanto alguien la acepta, agentEmail queda asignado y desaparece
  // de esta lista para los demás (porque ya no es PENDING).
  subscribePending(onData, onError) {
    const q = query(
      col(),
      where('status', '==', VISIT_STATUS.PENDING),
      orderBy('createdAt', 'desc'),
    );
    return onSnapshot(
      q,
      { includeMetadataChanges: false },
      (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => onError?.(err),
    );
  },

  // ── Solicitar visita (formulario público — usuario NO autenticado) ────
  async requestVisit(payload) {
    const visitRef = await addDoc(col(), {
      ...payload,
      sourceCollection: 'visits',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    try {
      await addDoc(collection(db, 'appointments'), {
        visitId: visitRef.id, sourceCollection: 'visits',
        clientName: payload.clientName, clientEmail: payload.clientEmail,
        clientPhone: payload.clientPhone ?? '',
        propertyId: payload.propertyId ?? null,
        propertyName: payload.propertyName, propertyAddress: payload.propertyAddress ?? '',
        date: payload.requestedDate, time: payload.requestedTime,
        notes: payload.notes ?? '',
        agentId: payload.agentId ?? null,
        agentName: payload.agentName ?? null,
        agentEmail: payload.agentEmail ?? null,
        status: VISIT_STATUS.PENDING,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
    } catch (e) { console.warn('espejo /appointments:', e.code); }

    // Notificar admins
    try {
      const admins = await getDocs(
        query(collection(db, 'users'), where('role', '==', 'admin'), limit(20)),
      );
      await Promise.allSettled(admins.docs.map((d) =>
        notificationService.createNotification({
          userId: d.id, type: 'visit_request',
          title: 'Nueva solicitud de visita',
          message: `${payload.clientName} quiere visitar "${payload.propertyName}"`,
          actionUrl: '/usuarios/visitas',
        }),
      ));
    } catch (_) {}

    // Notificar members (para que sepan que hay una pendiente)
    try {
      const members = await getDocs(
        query(collection(db, 'users'), where('role', '==', 'member'), limit(50)),
      );
      await Promise.allSettled(members.docs.map((d) =>
        notificationService.createNotification({
          userId: d.id, type: 'visit_request',
          title: 'Nueva visita disponible',
          message: `Hay una nueva solicitud para "${payload.propertyName}" esperando ser tomada.`,
          actionUrl: '/usuarios/visitas',
        }),
      ));
    } catch (_) {}

    return visitRef.id;
  },

  // ── Lecturas puntuales ───────────────────────────────────────────────
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

  // ── Actualización genérica ───────────────────────────────────────────
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
          updateDoc(d.ref, { agentId: data.agentId ?? null, agentName: data.agentName ?? null, agentEmail: data.agentEmail ?? null, updatedAt: serverTimestamp() }),
        ));
      } catch (_) {}
    }
  },
  async deleteVisit(visitId) {
    await deleteDoc(ref(visitId));
  },

  // ── APROBAR visita ───────────────────────────────────────────────────
  // Lógica de "el primero que la aprueba se la queda":
  //
  //   Admin aprueba → puede elegir un agente en el selector;
  //                   si no elige nadie, queda sin agente asignado.
  //
  //   Member aprueba → automáticamente se asigna a SÍ MISMO como agente.
  //                    agentData que le pasa el hook = su propio usuario.
  //
  // En ambos casos, el agentEmail queda guardado en el documento.
  // A partir de ese momento subscribeByAgent solo muestra esa visita
  // al agente asignado → desaparece de la lista de los demás members.
  //
  async approveVisit(visit, adminNotes = '', agentData = {}) {
    const currentUser = auth.currentUser;
    const approvedByEmail = currentUser?.email || null;

    const updatePayload = {
      status: VISIT_STATUS.APPROVED,
      adminNotes,
      approvedBy: approvedByEmail,
      updatedAt: serverTimestamp(),
      approvedAt: serverTimestamp(),
      ...(agentData.agentId    ? { agentId:    agentData.agentId }    : {}),
      ...(agentData.agentName  ? { agentName:  agentData.agentName }  : {}),
      ...(agentData.agentEmail ? { agentEmail: agentData.agentEmail } : {}),
    };
    await updateDoc(ref(visit.id), updatePayload);
    await this.syncAppointmentStatus(visit.id, VISIT_STATUS.APPROVED, adminNotes);

    await upsertClientAndHistory({ ...visit, adminNotes }, agentData, approvedByEmail);

    const agentEmail = agentData.agentEmail || visit.agentEmail;
    const agentName  = agentData.agentName  || visit.agentName;

    // Notificación interna al cliente
    if (visit.clientEmail) {
      await notificationService.createNotification({
        userId: visit.clientEmail, type: 'visit_approved',
        title: 'Visita aprobada',
        message: `Tu visita a "${visit.propertyName}" fue aprobada para el ${visit.requestedDate} a las ${visit.requestedTime}.`,
        actionUrl: '/portal/visitas',
      }).catch(() => {});
    }

    // Notificación interna al agente asignado
    if (agentEmail) {
      await notificationService.createNotification({
        userId: agentEmail, type: 'visit_assigned',
        title: 'Visita asignada',
        message: `Tienes una visita aprobada: "${visit.propertyName}" — ${visit.clientName} el ${visit.requestedDate}.`,
        actionUrl: '/usuarios/visitas',
      }).catch(() => {});
    }

    // Email al cliente
    await sendMail(
      visit.clientEmail,
      `✅ Tu visita a "${visit.propertyName}" fue aprobada`,
      `<div style="font-family:sans-serif;max-width:520px;margin:0 auto">
        <h2 style="color:#01696f">¡Tu visita fue aprobada! 🎉</h2>
        <p>Hola <strong>${visit.clientName}</strong>,</p>
        <p>Tu solicitud de visita ha sido confirmada:</p>
        <table style="border-collapse:collapse;width:100%">
          <tr><td style="padding:6px 0;color:#666">📍 Propiedad</td><td><strong>${visit.propertyName}</strong></td></tr>
          <tr><td style="padding:6px 0;color:#666">📅 Fecha</td><td><strong>${visit.requestedDate}</strong></td></tr>
          <tr><td style="padding:6px 0;color:#666">🕐 Hora</td><td><strong>${visit.requestedTime}</strong></td></tr>
          ${agentName ? `<tr><td style="padding:6px 0;color:#666">👤 Agente</td><td><strong>${agentName}</strong></td></tr>` : ''}
          ${adminNotes ? `<tr><td style="padding:6px 0;color:#666">📝 Notas</td><td>${adminNotes}</td></tr>` : ''}
        </table>
      </div>`,
    );

    // Email al agente
    if (agentEmail) {
      await sendMail(
        agentEmail,
        `📋 Nueva visita asignada — ${visit.propertyName}`,
        `<div style="font-family:sans-serif;max-width:520px;margin:0 auto">
          <h2 style="color:#01696f">Tienes una visita asignada 📅</h2>
          <p>Hola <strong>${agentName || agentEmail}</strong>,</p>
          <table style="border-collapse:collapse;width:100%">
            <tr><td style="padding:6px 0;color:#666">👤 Cliente</td><td><strong>${visit.clientName}</strong> (${visit.clientEmail})</td></tr>
            <tr><td style="padding:6px 0;color:#666">📞 Teléfono</td><td>${visit.clientPhone || 'No indicado'}</td></tr>
            <tr><td style="padding:6px 0;color:#666">📍 Propiedad</td><td><strong>${visit.propertyName}</strong></td></tr>
            <tr><td style="padding:6px 0;color:#666">📅 Fecha</td><td><strong>${visit.requestedDate} a las ${visit.requestedTime}</strong></td></tr>
            ${adminNotes ? `<tr><td style="padding:6px 0;color:#666">📝 Notas</td><td>${adminNotes}</td></tr>` : ''}
          </table>
          <p style="margin-top:16px;color:#888;font-size:13px">Aprobado por: ${approvedByEmail || 'administrador'}</p>
        </div>`,
      );
    }
  },

  // ── RECHAZAR visita ──────────────────────────────────────────────────
  async rejectVisit(visit, adminNotes = '') {
    await this.updateStatus(visit.id, VISIT_STATUS.REJECTED, adminNotes);
    await this.syncAppointmentStatus(visit.id, VISIT_STATUS.REJECTED, adminNotes);
    if (visit.clientEmail) {
      await notificationService.createNotification({
        userId: visit.clientEmail, type: 'visit_rejected',
        title: 'Visita no aprobada',
        message: `Tu solicitud de visita a "${visit.propertyName}" no pudo ser aprobada. ${adminNotes || ''}`.trim(),
        actionUrl: '/portal/visitas',
      }).catch(() => {});
      await sendMail(
        visit.clientEmail,
        `Tu solicitud de visita a "${visit.propertyName}"`,
        `<div style="font-family:sans-serif;max-width:520px;margin:0 auto">
          <h2 style="color:#a12c7b">Solicitud de visita</h2>
          <p>Hola <strong>${visit.clientName}</strong>,</p>
          <p>Lamentablemente tu solicitud a <strong>${visit.propertyName}</strong> no pudo ser aprobada.</p>
          ${adminNotes ? `<p><strong>Motivo:</strong> ${adminNotes}</p>` : ''}
          <p>Contáctanos si deseas más información.</p>
        </div>`,
      );
    }
  },

  // ── COMPLETAR visita ─────────────────────────────────────────────────
  async completeVisit(visitId, adminNotes = '') {
    await this.updateStatus(visitId, VISIT_STATUS.COMPLETED, adminNotes);
    await this.syncAppointmentStatus(visitId, VISIT_STATUS.COMPLETED, adminNotes);
    try {
      const visitSnap = await getDoc(ref(visitId));
      const v = { id: visitId, ...visitSnap.data() };
      if (v.clientId) {
        await addDoc(collection(db, 'clients', v.clientId, 'history'), {
          type: 'visit_completed', visitId,
          propertyName: v.propertyName, date: v.requestedDate,
          agentName: v.agentName || null, notes: adminNotes,
          createdAt: serverTimestamp(),
        });
      }
    } catch (_) {}
  },

  // ── REAGENDAR visita ─────────────────────────────────────────────────
  async rescheduleVisit(visit, proposedDate, proposedTime, adminNotes = '') {
    await updateDoc(ref(visit.id ?? visit), {
      status: VISIT_STATUS.RESCHEDULED,
      proposedDate, proposedTime, adminNotes,
      updatedAt: serverTimestamp(), rescheduledAt: serverTimestamp(),
    });
    await this.syncAppointmentStatus(visit.id ?? visit, VISIT_STATUS.RESCHEDULED, adminNotes);
    const clientEmail = typeof visit === 'object' ? visit.clientEmail : null;
    const clientName  = typeof visit === 'object' ? visit.clientName  : null;
    const propName    = typeof visit === 'object' ? visit.propertyName : null;
    if (clientEmail) {
      await notificationService.createNotification({
        userId: clientEmail, type: 'visit_rescheduled',
        title: 'Nueva propuesta de fecha',
        message: `Te proponemos reagendar tu visita a "${propName}" para el ${proposedDate} a las ${proposedTime}.`,
        actionUrl: '/portal/visitas',
      }).catch(() => {});
      await sendMail(
        clientEmail,
        `📅 Nueva fecha propuesta para tu visita a "${propName}"`,
        `<div style="font-family:sans-serif;max-width:520px;margin:0 auto">
          <h2 style="color:#006494">Propuesta de nueva fecha</h2>
          <p>Hola <strong>${clientName}</strong>,</p>
          <p>Te proponemos reagendar tu visita a <strong>${propName}</strong>:</p>
          <table style="border-collapse:collapse;width:100%">
            <tr><td style="padding:6px 0;color:#666">📅 Nueva fecha</td><td><strong>${proposedDate}</strong></td></tr>
            <tr><td style="padding:6px 0;color:#666">🕐 Nueva hora</td><td><strong>${proposedTime}</strong></td></tr>
            ${adminNotes ? `<tr><td style="padding:6px 0;color:#666">📝 Comentario</td><td>${adminNotes}</td></tr>` : ''}
          </table>
          <p style="margin-top:16px">Responde este correo para confirmar o solicitar otro horario.</p>
        </div>`,
      );
    }
  },

  // ── Calendario admin (tiempo real) ───────────────────────────────────
  subscribeCalendar(onData, onError) {
    const q = query(
      col(),
      where('status', 'in', [VISIT_STATUS.APPROVED, VISIT_STATUS.COMPLETED, VISIT_STATUS.RESCHEDULED]),
      orderBy('requestedDate', 'asc'),
    );
    return onSnapshot(q, { includeMetadataChanges: false },
      (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data(), source: 'visits' }))),
      (err) => onError?.(err),
    );
  },

  // ── Calendario agente (solo sus visitas) ─────────────────────────────
  subscribeCalendarByAgent(agentEmail, onData, onError) {
    const q = query(
      col(),
      where('agentEmail', '==', agentEmail),
      where('status', 'in', [VISIT_STATUS.APPROVED, VISIT_STATUS.RESCHEDULED]),
      orderBy('requestedDate', 'asc'),
    );
    return onSnapshot(q, { includeMetadataChanges: false },
      (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data(), source: 'visits' }))),
      (err) => onError?.(err),
    );
  },

  // ── Calendario appointments (sin espejo de visits) ───────────────────
  subscribeCalendarAppointments(onData, onError) {
    const q = query(
      collection(db, 'appointments'),
      where('sourceCollection', '!=', 'visits'),
      orderBy('sourceCollection'), orderBy('date', 'asc'),
    );
    return onSnapshot(q, { includeMetadataChanges: false },
      (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data(), source: 'appointments' }))),
      (err) => onError?.(err),
    );
  },
};
