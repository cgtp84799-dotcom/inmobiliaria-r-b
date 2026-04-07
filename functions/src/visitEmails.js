/**
 * visitEmails.js — Cloud Function para emails automáticos de visitas (3D)
 *
 * Dispara cuando un documento en /visits/{visitId} cambia de estado:
 *   pending → approved  → envía email de confirmación al cliente + agente
 *   pending → rejected  → envía email de cortesía al cliente
 *
 * Configuración requerida (Firebase CLI):
 *   firebase functions:config:set gmail.user="inmojuridi09@gmail.com" gmail.pass="<app-password>"
 *
 * O usando Firebase Extensions "Trigger Email" con la colección /mail
 * (más recomendado para producción — ver comentario al final del archivo).
 */

const functions = require('firebase-functions');
const admin     = require('firebase-admin');
const nodemailer = require('nodemailer');

// Inicializar solo si aún no hay app
if (!admin.apps.length) admin.initializeApp();

// ── Transporter de nodemailer con Gmail ──────────────────────────────────────
function createTransporter() {
  const cfg = functions.config().gmail || {};
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: cfg.user || process.env.GMAIL_USER,
      pass: cfg.pass || process.env.GMAIL_PASS,
    },
  });
}

// ── Plantillas HTML ──────────────────────────────────────────────────────────
function approvedTemplate({ clientName, propertyName, requestedDate, requestedTime, agentName }) {
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 0; }
  .container { max-width: 560px; margin: 32px auto; background: #1e293b; border-radius: 16px; overflow: hidden; }
  .header { background: linear-gradient(135deg, #d97706, #f59e0b); padding: 32px 28px; text-align: center; }
  .header h1 { margin: 0; color: #0f172a; font-size: 22px; font-weight: 800; }
  .body { padding: 28px; }
  .body h2 { font-size: 18px; margin: 0 0 8px; color: #fbbf24; }
  .body p  { margin: 6px 0; font-size: 14px; line-height: 1.6; color: #cbd5e1; }
  .detail { background: #0f172a; border-radius: 12px; padding: 16px 20px; margin: 20px 0; }
  .detail p { margin: 4px 0; }
  .detail .label { color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: .05em; }
  .detail .value { color: #f1f5f9; font-weight: 600; font-size: 14px; }
  .footer { padding: 20px 28px; text-align: center; border-top: 1px solid #334155; }
  .footer p { font-size: 12px; color: #64748b; margin: 4px 0; }
  .badge { display: inline-block; background: #16a34a; color: #fff; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 999px; margin-bottom: 16px; }
</style></head>
<body>
<div class="container">
  <div class="header"><h1>✅ Visita Confirmada</h1></div>
  <div class="body">
    <span class="badge">APROBADA</span>
    <h2>Hola ${clientName},</h2>
    <p>Tu solicitud de visita ha sido <strong style="color:#4ade80">aprobada</strong>. Te esperamos con gusto.</p>
    <div class="detail">
      <p><span class="label">Propiedad</span><br><span class="value">${propertyName}</span></p>
      <p><span class="label">Fecha</span><br><span class="value">${requestedDate}</span></p>
      <p><span class="label">Hora</span><br><span class="value">${requestedTime || 'Por confirmar'}</span></p>
      ${agentName ? `<p><span class="label">Tu agente</span><br><span class="value">${agentName}</span></p>` : ''}
    </div>
    <p>Si necesitas cambiar la cita o tienes alguna duda, contáctanos por WhatsApp: <strong>310 596 8202</strong>.</p>
  </div>
  <div class="footer">
    <p>Inmobiliaria Rincón Bedoya y Asociados</p>
    <p>Cra 5 No. 9-28 · Anserma, Caldas</p>
    <p><a href="mailto:inmojuridi09@gmail.com" style="color:#f59e0b">inmojuridi09@gmail.com</a></p>
  </div>
</div>
</body></html>`;
}

function rejectedTemplate({ clientName, propertyName, adminNotes }) {
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 0; }
  .container { max-width: 560px; margin: 32px auto; background: #1e293b; border-radius: 16px; overflow: hidden; }
  .header { background: linear-gradient(135deg, #dc2626, #ef4444); padding: 32px 28px; text-align: center; }
  .header h1 { margin: 0; color: #fff; font-size: 22px; font-weight: 800; }
  .body { padding: 28px; }
  .body h2 { font-size: 18px; margin: 0 0 8px; color: #f87171; }
  .body p  { margin: 6px 0; font-size: 14px; line-height: 1.6; color: #cbd5e1; }
  .note { background: #0f172a; border-left: 4px solid #ef4444; border-radius: 8px; padding: 14px 18px; margin: 20px 0; font-style: italic; color: #94a3b8; font-size: 13px; }
  .footer { padding: 20px 28px; text-align: center; border-top: 1px solid #334155; }
  .footer p { font-size: 12px; color: #64748b; margin: 4px 0; }
</style></head>
<body>
<div class="container">
  <div class="header"><h1>Visita no disponible</h1></div>
  <div class="body">
    <h2>Hola ${clientName},</h2>
    <p>Lamentamos informarte que tu solicitud de visita para <strong>${propertyName}</strong> no pudo ser programada en este momento.</p>
    ${adminNotes ? `<div class="note">${adminNotes}</div>` : ''}
    <p>Te invitamos a explorar nuestro catálogo completo de propiedades disponibles o a contactarnos para buscar una alternativa que se ajuste a tus necesidades.</p>
    <p>Comunícate con nosotros: <strong>310 596 8202</strong></p>
  </div>
  <div class="footer">
    <p>Inmobiliaria Rincón Bedoya y Asociados</p>
    <p>Cra 5 No. 9-28 · Anserma, Caldas</p>
    <p><a href="mailto:inmojuridi09@gmail.com" style="color:#f59e0b">inmojuridi09@gmail.com</a></p>
  </div>
</div>
</body></html>`;
}

// ── Cloud Function ───────────────────────────────────────────────────────────
exports.onVisitStatusChanged = functions
  .region('us-central1')
  .firestore
  .document('visits/{visitId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after  = change.after.data();

    // Solo actuar cuando status realmente cambió
    if (before.status === after.status) return null;
    if (!after.clientEmail)             return null;

    const transporter = createTransporter();
    const fromAddress = `"Inmobiliaria Rincón Bedoya" <${functions.config().gmail?.user || process.env.GMAIL_USER}>`;

    // ── approved ──────────────────────────────────────────────────────────
    if (after.status === 'approved') {
      const html = approvedTemplate({
        clientName:    after.clientName,
        propertyName:  after.propertyName,
        requestedDate: after.requestedDate,
        requestedTime: after.requestedTime,
        agentName:     after.agentName,
      });

      // Email al cliente
      await transporter.sendMail({
        from:    fromAddress,
        to:      after.clientEmail,
        subject: `✅ Visita confirmada: ${after.propertyName}`,
        html,
      });

      // Email al agente (si existe)
      if (after.agentEmail && after.agentEmail !== after.clientEmail) {
        await transporter.sendMail({
          from:    fromAddress,
          to:      after.agentEmail,
          subject: `📅 Visita asignada: ${after.propertyName} — ${after.clientName}`,
          html: approvedTemplate({
            clientName:    after.clientName,
            propertyName:  after.propertyName,
            requestedDate: after.requestedDate,
            requestedTime: after.requestedTime,
            agentName:     after.agentName,
          }),
        });
      }
      return null;
    }

    // ── rejected ──────────────────────────────────────────────────────────
    if (after.status === 'rejected') {
      const html = rejectedTemplate({
        clientName:   after.clientName,
        propertyName: after.propertyName,
        adminNotes:   after.adminNotes,
      });
      await transporter.sendMail({
        from:    fromAddress,
        to:      after.clientEmail,
        subject: `Respuesta a tu solicitud de visita — ${after.propertyName}`,
        html,
      });
      return null;
    }

    return null;
  });

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * ALTERNATIVA RECOMENDADA: Firebase Extension "Trigger Email"
 * ─────────────────────────────────────────────────────────────────────────────
 * Si prefieres no gestionar credenciales SMTP directamente, instala la
 * extensión "Trigger Email" desde Firebase Console > Extensions.
 * Configúrala con la colección /mail y reemplaza el sendMail por:
 *
 *   await admin.firestore().collection('mail').add({
 *     to:      after.clientEmail,
 *     message: { subject: '...', html: '...' },
 *   });
 *
 * La extensión se encarga del envío y el reintento automático.
 * ─────────────────────────────────────────────────────────────────────────────
 */
