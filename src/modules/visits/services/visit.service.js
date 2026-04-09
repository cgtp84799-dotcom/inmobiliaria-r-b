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

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Escribe un documento en /mail — lo recoge la extensión
 * "Trigger Email from Firestore" de Firebase.
 */
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

/**
 * Cabecera y pie compartidos para todos los correos.
 * Logo: imagen real del logotipo R&B Inmobiliaria.
 * Fallback a texto dorado si la imagen no carga (Outlook, clientes sin imágenes).
 * Compatible con Gmail, Outlook, Apple Mail, Yahoo.
 */
function emailHeader(previewText = '') {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="x-apple-disable-message-reformatting" />
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <title></title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    body{margin:0;padding:0;background:#f4f4f0;font-family:'Inter',Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
    table{border-collapse:collapse;}
    img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;}
    .email-wrapper{background:#f4f4f0;padding:32px 16px;}
    .email-card{background:#ffffff;border-radius:16px;overflow:hidden;max-width:560px;margin:0 auto;box-shadow:0 4px 24px rgba(0,0,0,0.08);}
    .email-header{background:#0d0d0b;padding:28px 40px 24px;text-align:center;}
    .brand-logo-img{display:block;margin:0 auto;}
    .brand-sub{font-family:'Inter',Helvetica,Arial,sans-serif;font-size:9px;font-weight:500;letter-spacing:0.22em;text-transform:uppercase;color:#8a7a5a;margin-top:8px;display:block;text-align:center;}
    .email-body{padding:36px 40px 32px;}
    .email-footer{background:#f9f8f6;border-top:1px solid #e8e5e0;padding:20px 40px;text-align:center;}
    .footer-text{font-size:12px;color:#a09a8e;line-height:1.7;margin:0;}
    .footer-link{color:#c8a44a;text-decoration:none;}
    h1{font-size:22px;font-weight:700;color:#1a1a18;margin:0 0 8px;line-height:1.3;}
    .subtitle{font-size:14px;color:#7a7670;margin:0 0 24px;}
    p{font-size:15px;color:#3d3c38;line-height:1.7;margin:0 0 16px;}
    .highlight-box{background:#faf8f3;border:1px solid #e8e0cc;border-radius:12px;padding:20px 24px;margin:20px 0;}
    .detail-row{display:flex;padding:8px 0;border-bottom:1px solid #f0ede6;align-items:flex-start;}
    .detail-row:last-child{border-bottom:none;}
    .detail-label{font-size:12px;font-weight:600;color:#9a9288;text-transform:uppercase;letter-spacing:0.06em;min-width:100px;padding-right:12px;padding-top:2px;}
    .detail-value{font-size:14px;color:#2a2a27;font-weight:500;}
    .status-badge{display:inline-block;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;}
    .badge-approved{background:#e8f4ee;color:#1e6b3d;}
    .badge-rejected{background:#fce8ee;color:#8b1a2e;}
    .badge-rescheduled{background:#e8f0fc;color:#1a3d8b;}
    .badge-assigned{background:#fdf3e0;color:#7a4d00;}
    .cta-button{display:inline-block;background:#c8a44a;color:#0d0d0b;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;letter-spacing:0.04em;text-decoration:none;padding:14px 28px;border-radius:8px;margin-top:8px;}
    .divider{border:none;border-top:1px solid #ede9e2;margin:24px 0;}
    .greeting{font-size:16px;color:#3d3c38;margin:0 0 20px;}
    @media only screen and (max-width:600px){
      .email-body{padding:24px 20px 20px;}
      .email-header{padding:20px 20px 18px;}
      .email-footer{padding:16px 20px;}
      h1{font-size:20px;}
      .detail-label{min-width:80px;font-size:11px;}
      .brand-logo-img{max-width:140px !important;}
    }
  </style>
</head>
<body>
<div style="display:none;max-height:0;overflow:hidden;">${previewText}</div>
<div class="email-wrapper">
<div class="email-card">
  <!-- HEADER -->
  <div class="email-header">
    <!--[if mso]>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td style="padding:0;">
    <![endif]-->
    <img
      src="https://rybinmobiliaria.com/logo.png"
      alt="R&amp;B Inmobiliaria"
      width="160"
      height="auto"
      class="brand-logo-img"
      style="display:block;margin:0 auto;max-width:160px;height:auto;"
      onerror="this.style.display='none';this.nextElementSibling.style.display='block';"
    />
    <!-- Fallback texto si la imagen no carga (Outlook, clientes sin imágenes) -->
    <div style="display:none;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:26px;font-weight:700;letter-spacing:0.08em;color:#c8a44a;text-align:center;line-height:1;">R&amp;B</div>
    <!--[if mso]></td></tr></table><![endif]-->
    <span class="brand-sub">Inmobiliaria &middot; Real Estate</span>
  </div>`;
}

function emailFooter() {
  return `
  <!-- FOOTER -->
  <div class="email-footer">
    <p class="footer-text">
      &copy; ${new Date().getFullYear()} R&amp;B Inmobiliaria. Todos los derechos reservados.<br />
      Si tienes preguntas, <a class="footer-link" href="mailto:contacto@rybinmobiliaria.com">contáctanos</a>.
    </p>
  </div>
</div>
</div>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATES DE CORREO
// ─────────────────────────────────────────────────────────────────────────────

function tplApprovedClient({ clientName, propertyName, requestedDate, requestedTime, agentName, adminNotes }) {
  return emailHeader(`Tu visita a "${propertyName}" fue confirmada`) + `
  <!-- BODY -->
  <div class="email-body">
    <span class="status-badge badge-approved">✓ Visita confirmada</span>
    <h1 style="margin-top:16px;">¡Tu visita está aprobada!</h1>
    <p class="subtitle">Tenemos todo listo para recibirte.</p>
    <p class="greeting">Hola, <strong>${clientName}</strong>:</p>
    <p>Nos complace informarte que tu solicitud de visita ha sido <strong>revisada y aprobada</strong>. Te esperamos con gusto.</p>
    <div class="highlight-box">
      <table style="width:100%;border-collapse:collapse;">
        <tr class="detail-row">
          <td class="detail-label">Propiedad</td>
          <td class="detail-value">${propertyName}</td>
        </tr>
        <tr class="detail-row">
          <td class="detail-label">Fecha</td>
          <td class="detail-value">${requestedDate}</td>
        </tr>
        <tr class="detail-row">
          <td class="detail-label">Hora</td>
          <td class="detail-value">${requestedTime}</td>
        </tr>
        ${agentName ? `<tr class="detail-row"><td class="detail-label">Tu agente</td><td class="detail-value">${agentName}</td></tr>` : ''}
        ${adminNotes ? `<tr class="detail-row"><td class="detail-label">Notas</td><td class="detail-value" style="color:#5a5650;">${adminNotes}</td></tr>` : ''}
      </table>
    </div>
    <p style="font-size:14px;color:#7a7670;">Por favor llega con anticipación y trae un documento de identidad. Si necesitas cambiar o cancelar, contáctanos con al menos 24 horas de antelación.</p>
    <hr class="divider" />
    <p style="font-size:13px;color:#9a9288;margin:0;">Este correo fue generado automáticamente. No es necesario responderlo.</p>
  </div>
  ` + emailFooter();
}

function tplApprovedAgent({ agentName, agentEmail, clientName, clientEmail, clientPhone, propertyName, requestedDate, requestedTime, adminNotes, approvedByEmail }) {
  return emailHeader(`Nueva visita asignada: ${propertyName}`) + `
  <!-- BODY -->
  <div class="email-body">
    <span class="status-badge badge-assigned">📋 Visita asignada</span>
    <h1 style="margin-top:16px;">Tienes una nueva visita</h1>
    <p class="subtitle">Revisa los detalles y prepárate para recibirlos.</p>
    <p class="greeting">Hola, <strong>${agentName || agentEmail}</strong>:</p>
    <p>Se te ha asignado una visita aprobada. A continuación los detalles completos del cliente y la propiedad:</p>
    <div class="highlight-box">
      <table style="width:100%;border-collapse:collapse;">
        <tr class="detail-row">
          <td class="detail-label">Cliente</td>
          <td class="detail-value">${clientName}</td>
        </tr>
        <tr class="detail-row">
          <td class="detail-label">Correo</td>
          <td class="detail-value"><a href="mailto:${clientEmail}" style="color:#c8a44a;">${clientEmail}</a></td>
        </tr>
        ${clientPhone ? `<tr class="detail-row"><td class="detail-label">Teléfono</td><td class="detail-value"><a href="tel:${clientPhone}" style="color:#c8a44a;">${clientPhone}</a></td></tr>` : ''}
        <tr class="detail-row">
          <td class="detail-label">Propiedad</td>
          <td class="detail-value">${propertyName}</td>
        </tr>
        <tr class="detail-row">
          <td class="detail-label">Fecha</td>
          <td class="detail-value">${requestedDate}</td>
        </tr>
        <tr class="detail-row">
          <td class="detail-label">Hora</td>
          <td class="detail-value">${requestedTime}</td>
        </tr>
        ${adminNotes ? `<tr class="detail-row"><td class="detail-label">Notas</td><td class="detail-value" style="color:#5a5650;">${adminNotes}</td></tr>` : ''}
      </table>
    </div>
    ${approvedByEmail ? `<p style="font-size:13px;color:#9a9288;margin:0 0 16px;">Aprobada por: <strong>${approvedByEmail}</strong></p>` : ''}
    <p style="font-size:14px;color:#7a7670;">Recuerda confirmar con el cliente antes de la visita y llevar toda la documentación necesaria de la propiedad.</p>
  </div>
  ` + emailFooter();
}

function tplRejectedClient({ clientName, propertyName, adminNotes }) {
  return emailHeader(`Actualización sobre tu visita a "${propertyName}"`) + `
  <!-- BODY -->
  <div class="email-body">
    <span class="status-badge badge-rejected">✗ No disponible</span>
    <h1 style="margin-top:16px;">Solicitud no aprobada</h1>
    <p class="subtitle">Te ayudamos a encontrar otras opciones.</p>
    <p class="greeting">Hola, <strong>${clientName}</strong>:</p>
    <p>Hemos revisado tu solicitud de visita a <strong>${propertyName}</strong> y lamentablemente en este momento no podemos confirmarla.</p>
    ${adminNotes ? `<div class="highlight-box"><p style="margin:0;font-size:14px;color:#5a5650;"><strong>Motivo:</strong> ${adminNotes}</p></div>` : ''}
    <p>Si deseas explorar otras propiedades disponibles o reagendar tu visita, no dudes en contactarnos. Estaremos encantados de ayudarte.</p>
    <hr class="divider" />
    <p style="font-size:13px;color:#9a9288;margin:0;">Gracias por tu interés en R&amp;B Inmobiliaria.</p>
  </div>
  ` + emailFooter();
}

function tplRescheduledClient({ clientName, propertyName, proposedDate, proposedTime, originalDate, originalTime, adminNotes }) {
  return emailHeader(`Nueva propuesta de fecha para tu visita a "${propertyName}"`) + `
  <!-- BODY -->
  <div class="email-body">
    <span class="status-badge badge-rescheduled">📅 Nueva fecha propuesta</span>
    <h1 style="margin-top:16px;">Propuesta de reagendamiento</h1>
    <p class="subtitle">Queremos encontrar el mejor momento para ti.</p>
    <p class="greeting">Hola, <strong>${clientName}</strong>:</p>
    <p>Queremos proponerte una <strong>nueva fecha y hora</strong> para tu visita a <strong>${propertyName}</strong>. Hemos encontrado un horario que esperamos sea conveniente para ti:</p>
    <div class="highlight-box">
      <table style="width:100%;border-collapse:collapse;">
        <tr class="detail-row">
          <td class="detail-label">Propiedad</td>
          <td class="detail-value">${propertyName}</td>
        </tr>
        ${originalDate ? `<tr class="detail-row"><td class="detail-label">Fecha original</td><td class="detail-value" style="text-decoration:line-through;color:#aaa;">${originalDate}${originalTime ? ' · ' + originalTime : ''}</td></tr>` : ''}
        <tr class="detail-row">
          <td class="detail-label">Nueva fecha</td>
          <td class="detail-value" style="color:#1a3d8b;font-weight:600;">${proposedDate}</td>
        </tr>
        <tr class="detail-row">
          <td class="detail-label">Nueva hora</td>
          <td class="detail-value" style="color:#1a3d8b;font-weight:600;">${proposedTime}</td>
        </tr>
        ${adminNotes ? `<tr class="detail-row"><td class="detail-label">Comentario</td><td class="detail-value" style="color:#5a5650;">${adminNotes}</td></tr>` : ''}
      </table>
    </div>
    <p>Si este horario te queda bien, no es necesario que hagas nada más. Si necesitas otro horario, por favor responde este correo o llámanos.</p>
    <hr class="divider" />
    <p style="font-size:13px;color:#9a9288;margin:0;">Gracias por tu preferencia y paciencia.</p>
  </div>
  ` + emailFooter();
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: cliente + historial
// ─────────────────────────────────────────────────────────────────────────────

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

  // ── Member/Agente: ve las PENDIENTES ─────────────────────────────────
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

  // ── Solicitar visita (formulario público) ────────────────────────────
  async requestVisit(payload) {
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
        agentName:       payload.agentName       ?? null,
        agentEmail:      payload.agentEmail       ?? null,
        status:          VISIT_STATUS.PENDING,
        createdAt:  serverTimestamp(),
        updatedAt:  serverTimestamp(),
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
          title:   'Nueva solicitud de visita',
          message: `${payload.clientName} quiere visitar "${payload.propertyName}"`,
          actionUrl: '/usuarios/visitas',
        }),
      ));
    } catch (_) {}

    // Notificar members
    try {
      const members = await getDocs(
        query(collection(db, 'users'), where('role', '==', 'member'), limit(50)),
      );
      await Promise.allSettled(members.docs.map((d) =>
        notificationService.createNotification({
          userId: d.id, type: 'visit_request',
          title:   'Nueva visita disponible',
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

  // ── APROBAR visita ───────────────────────────────────────────────────
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
    const agentName  = agentData.agentName  || visit.agentName;

    // Notificación in-app al cliente
    if (visit.clientEmail) {
      notificationService.createNotification({
        userId: visit.clientEmail, type: 'visit_approved',
        title:   'Visita aprobada',
        message: `Tu visita a "${visit.propertyName}" fue aprobada para el ${visit.requestedDate} a las ${visit.requestedTime}.`,
        actionUrl: '/portal/visitas',
      }).catch(() => {});
    }

    // Notificación in-app al agente
    if (agentEmail) {
      notificationService.createNotification({
        userId: agentEmail, type: 'visit_assigned',
        title:   'Visita asignada',
        message: `Tienes una visita aprobada: "${visit.propertyName}" — ${visit.clientName} el ${visit.requestedDate}.`,
        actionUrl: '/usuarios/visitas',
      }).catch(() => {});
    }

    // Correo premium al cliente
    await sendMail(
      visit.clientEmail,
      `Visita confirmada — ${visit.propertyName} · R&B Inmobiliaria`,
      tplApprovedClient({
        clientName:    visit.clientName,
        propertyName:  visit.propertyName,
        requestedDate: visit.requestedDate,
        requestedTime: visit.requestedTime,
        agentName,
        adminNotes,
      }),
    );

    // Correo premium al agente
    if (agentEmail) {
      await sendMail(
        agentEmail,
        `Nueva visita asignada — ${visit.propertyName} · R&B Inmobiliaria`,
        tplApprovedAgent({
          agentName,
          agentEmail,
          clientName:    visit.clientName,
          clientEmail:   visit.clientEmail,
          clientPhone:   visit.clientPhone,
          propertyName:  visit.propertyName,
          requestedDate: visit.requestedDate,
          requestedTime: visit.requestedTime,
          adminNotes,
          approvedByEmail,
        }),
      );
    }
  },

  // ── RECHAZAR visita ──────────────────────────────────────────────────
  async rejectVisit(visit, adminNotes = '') {
    await this.updateStatus(visit.id, VISIT_STATUS.REJECTED, adminNotes);
    await this.syncAppointmentStatus(visit.id, VISIT_STATUS.REJECTED, adminNotes);

    if (visit.clientEmail) {
      notificationService.createNotification({
        userId: visit.clientEmail, type: 'visit_rejected',
        title:   'Solicitud de visita',
        message: `Tu solicitud a "${visit.propertyName}" no pudo aprobarse. ${adminNotes || ''}`.trim(),
        actionUrl: '/portal/visitas',
      }).catch(() => {});

      await sendMail(
        visit.clientEmail,
        `Actualización sobre tu visita a "${visit.propertyName}" · R&B Inmobiliaria`,
        tplRejectedClient({
          clientName:   visit.clientName,
          propertyName: visit.propertyName,
          adminNotes,
        }),
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
          propertyName: v.propertyName,
          date:      v.requestedDate,
          agentName: v.agentName || null,
          notes:     adminNotes,
          createdAt: serverTimestamp(),
        });
      }
    } catch (_) {}
  },

  // ── REAGENDAR visita ─────────────────────────────────────────────────
  async rescheduleVisit(visit, proposedDate, proposedTime, adminNotes = '') {
    const visitId = typeof visit === 'object' ? visit.id : visit;
    await updateDoc(ref(visitId), {
      status:       VISIT_STATUS.RESCHEDULED,
      proposedDate, proposedTime, adminNotes,
      updatedAt:    serverTimestamp(),
      rescheduledAt: serverTimestamp(),
    });
    await this.syncAppointmentStatus(visitId, VISIT_STATUS.RESCHEDULED, adminNotes);

    const clientEmail = typeof visit === 'object' ? visit.clientEmail  : null;
    const clientName  = typeof visit === 'object' ? visit.clientName   : null;
    const propName    = typeof visit === 'object' ? visit.propertyName : null;
    const origDate    = typeof visit === 'object' ? visit.requestedDate : null;
    const origTime    = typeof visit === 'object' ? visit.requestedTime : null;

    if (clientEmail) {
      notificationService.createNotification({
        userId:    clientEmail,
        type:      'visit_rescheduled',
        title:     'Nueva propuesta de fecha',
        message:   `Te proponemos reagendar tu visita a "${propName}" para el ${proposedDate} a las ${proposedTime}.`,
        actionUrl: '/portal/visitas',
      }).catch(() => {});

      await sendMail(
        clientEmail,
        `Nueva fecha propuesta para tu visita a "${propName}" · R&B Inmobiliaria`,
        tplRescheduledClient({
          clientName:   clientName,
          propertyName: propName,
          proposedDate,
          proposedTime,
          originalDate: origDate,
          originalTime: origTime,
          adminNotes,
        }),
      );
    }
  },

  // ── Calendario admin ─────────────────────────────────────────────────
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

  // ── Calendario agente ────────────────────────────────────────────────
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
      orderBy('date', 'asc'),
    );
    return onSnapshot(q, { includeMetadataChanges: false },
      (snap) => onData(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data(), source: 'appointments' }))
          .filter((d) => d.sourceCollection !== 'visits'),
      ),
      (err) => onError?.(err),
    );
  },
};
