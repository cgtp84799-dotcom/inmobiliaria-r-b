/**
 * visitEmails.js — Cloud Function para emails automáticos de visitas
 *
 * 3D: Escucha cambios en /visits/{visitId} y envía emails cuando
 *     el estado cambia de pending → approved / pending → rejected.
 *
 * SETUP:
 *   1. firebase functions:config:set gmail.user="tu@gmail.com" gmail.pass="app-password"
 *   2. Habilitar "Acceso de aplicaciones menos seguras" o usar App Password en Gmail
 *   3. firebase deploy --only functions:onVisitStatusChanged
 *
 * ALTERNATIVA más robusta: Firebase Extension "Trigger Email"
 *   https://extensions.dev/extensions/firebase/firestore-send-email
 */

const functions  = require('firebase-functions');
const nodemailer = require('nodemailer');

// ---------------------------------------------------------------------------
// Transporter — se configura en tiempo de ejecución con variables de entorno
// ---------------------------------------------------------------------------
const getTransporter = () => {
  const config = functions.config();
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: config.gmail?.user ?? process.env.GMAIL_USER,
      pass: config.gmail?.pass ?? process.env.GMAIL_PASS,
    },
  });
};

const FROM_NAME    = 'Inmobiliaria Rincón Bedoya y Asociados';
const FROM_EMAIL   = () => `"${FROM_NAME}" <${functions.config().gmail?.user ?? process.env.GMAIL_USER}>`;
const SITE_URL     = 'https://inmobiliaria-ryb-y-asociados.com';
const LOGO_URL     = `${SITE_URL}/logo.jpg.png`;
const WHATSAPP_URL = 'https://wa.me/573105968202';

// ---------------------------------------------------------------------------
// Helpers HTML
// ---------------------------------------------------------------------------
function htmlWrapper(content) {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${FROM_NAME}</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;">
        <!-- Header -->
        <tr>
          <td style="background:#0d1117;padding:24px 32px;text-align:center;border-bottom:1px solid #334155;">
            <img src="${LOGO_URL}" alt="${FROM_NAME}" height="48" style="height:48px;object-fit:contain;" />
          </td>
        </tr>
        <!-- Body -->
        <tr><td style="padding:32px;">${content}</td></tr>
        <!-- Footer -->
        <tr>
          <td style="background:#0d1117;padding:16px 32px;border-top:1px solid #334155;text-align:center;">
            <p style="color:#64748b;font-size:12px;margin:0;">
              ${FROM_NAME} · Cra 5 No. 9-28, Anserma, Caldas<br/>
              <a href="${SITE_URL}" style="color:#c9a84c;text-decoration:none;">${SITE_URL}</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function approvedEmailHtml(data) {
  const { clientName, propertyName, requestedDate, requestedTime, agentName, adminNotes } = data;
  return htmlWrapper(`
    <h2 style="color:#c9a84c;font-size:22px;margin:0 0 8px;">✅ Tu visita fue aprobada</h2>
    <p style="color:#94a3b8;font-size:14px;margin:0 0 24px;">Hola <strong style="color:#e2e8f0;">${clientName}</strong>, tenemos buenas noticias.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:12px;border:1px solid #334155;margin-bottom:24px;">
      <tr><td style="padding:20px 24px;">
        <table width="100%" cellpadding="6" cellspacing="0">
          <tr>
            <td style="color:#64748b;font-size:13px;width:40%;">Propiedad</td>
            <td style="color:#e2e8f0;font-size:13px;font-weight:600;">${propertyName}</td>
          </tr>
          <tr>
            <td style="color:#64748b;font-size:13px;">Fecha</td>
            <td style="color:#e2e8f0;font-size:13px;font-weight:600;">${requestedDate}</td>
          </tr>
          <tr>
            <td style="color:#64748b;font-size:13px;">Hora</td>
            <td style="color:#e2e8f0;font-size:13px;font-weight:600;">${requestedTime}</td>
          </tr>
          ${agentName ? `<tr>
            <td style="color:#64748b;font-size:13px;">Agente</td>
            <td style="color:#c9a84c;font-size:13px;font-weight:600;">${agentName}</td>
          </tr>` : ''}
          ${adminNotes ? `<tr>
            <td style="color:#64748b;font-size:13px;">Nota</td>
            <td style="color:#94a3b8;font-size:13px;">${adminNotes}</td>
          </tr>` : ''}
        </table>
      </td></tr>
    </table>

    <p style="color:#94a3b8;font-size:14px;">Por favor llega puntual. Si tienes alguna pregunta, contáctanos por WhatsApp.</p>

    <div style="text-align:center;margin-top:24px;">
      <a href="${WHATSAPP_URL}" style="display:inline-block;background:#c9a84c;color:#0f172a;text-decoration:none;font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px;">Contactar por WhatsApp</a>
    </div>
  `);
}

function rejectedEmailHtml(data) {
  const { clientName, propertyName, adminNotes } = data;
  return htmlWrapper(`
    <h2 style="color:#f87171;font-size:22px;margin:0 0 8px;">Tu solicitud no pudo ser aprobada</h2>
    <p style="color:#94a3b8;font-size:14px;margin:0 0 24px;">Hola <strong style="color:#e2e8f0;">${clientName}</strong>, lamentamos informarte que tu solicitud de visita para <strong style="color:#e2e8f0;">${propertyName}</strong> no pudo ser confirmada en este momento.</p>

    ${adminNotes ? `
    <div style="background:#0f172a;border-left:3px solid #f87171;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:24px;">
      <p style="color:#94a3b8;font-size:13px;margin:0;"><strong style="color:#e2e8f0;">Motivo:</strong> ${adminNotes}</p>
    </div>` : ''}

    <p style="color:#94a3b8;font-size:14px;">Te invitamos a explorar nuestro catálogo o contactarnos para buscar una alternativa.</p>

    <div style="text-align:center;margin-top:24px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
      <a href="${SITE_URL}/catalogo" style="display:inline-block;background:#c9a84c;color:#0f172a;text-decoration:none;font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px;">Ver catálogo</a>
      <a href="${WHATSAPP_URL}" style="display:inline-block;background:#1e293b;color:#c9a84c;text-decoration:none;font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px;border:1px solid #c9a84c;">Contactar</a>
    </div>
  `);
}

function agentAssignedEmailHtml(data) {
  const { agentName, clientName, propertyName, requestedDate, requestedTime, clientEmail, clientPhone } = data;
  return htmlWrapper(`
    <h2 style="color:#c9a84c;font-size:22px;margin:0 0 8px;">🏠 Nueva visita asignada</h2>
    <p style="color:#94a3b8;font-size:14px;margin:0 0 24px;">Hola <strong style="color:#e2e8f0;">${agentName}</strong>, tienes una visita confirmada.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:12px;border:1px solid #334155;margin-bottom:24px;">
      <tr><td style="padding:20px 24px;">
        <table width="100%" cellpadding="6" cellspacing="0">
          <tr><td style="color:#64748b;font-size:13px;width:40%;">Cliente</td><td style="color:#e2e8f0;font-size:13px;font-weight:600;">${clientName}</td></tr>
          <tr><td style="color:#64748b;font-size:13px;">Email cliente</td><td style="color:#e2e8f0;font-size:13px;">${clientEmail ?? '—'}</td></tr>
          <tr><td style="color:#64748b;font-size:13px;">Teléfono</td><td style="color:#e2e8f0;font-size:13px;">${clientPhone ?? '—'}</td></tr>
          <tr><td style="color:#64748b;font-size:13px;">Propiedad</td><td style="color:#e2e8f0;font-size:13px;font-weight:600;">${propertyName}</td></tr>
          <tr><td style="color:#64748b;font-size:13px;">Fecha</td><td style="color:#e2e8f0;font-size:13px;font-weight:600;">${requestedDate}</td></tr>
          <tr><td style="color:#64748b;font-size:13px;">Hora</td><td style="color:#e2e8f0;font-size:13px;font-weight:600;">${requestedTime}</td></tr>
        </table>
      </td></tr>
    </table>

    <div style="text-align:center;margin-top:24px;">
      <a href="${SITE_URL}/usuarios/visitas" style="display:inline-block;background:#c9a84c;color:#0f172a;text-decoration:none;font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px;">Ver panel de visitas</a>
    </div>
  `);
}

// ---------------------------------------------------------------------------
// Cloud Function
// ---------------------------------------------------------------------------
exports.onVisitStatusChanged = functions
  .region('us-central1')
  .firestore
  .document('visits/{visitId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after  = change.after.data();

    // Solo actuar cuando el estado realmente cambia
    if (before.status === after.status) return null;

    const transporter = getTransporter();
    const promises    = [];

    // ── APROBADA ──────────────────────────────────────────────────────────
    if (before.status === 'pending' && after.status === 'approved') {

      // Email al cliente
      if (after.clientEmail) {
        promises.push(
          transporter.sendMail({
            from   : FROM_EMAIL(),
            to     : after.clientEmail,
            subject: `✅ Visita aprobada — ${after.propertyName}`,
            html   : approvedEmailHtml(after),
          })
        );
      }

      // Email al agente asignado
      if (after.agentEmail) {
        promises.push(
          transporter.sendMail({
            from   : FROM_EMAIL(),
            to     : after.agentEmail,
            subject: `🏠 Nueva visita asignada — ${after.propertyName}`,
            html   : agentAssignedEmailHtml(after),
          })
        );
      }
    }

    // ── RECHAZADA ─────────────────────────────────────────────────────────
    if (before.status === 'pending' && after.status === 'rejected') {
      if (after.clientEmail) {
        promises.push(
          transporter.sendMail({
            from   : FROM_EMAIL(),
            to     : after.clientEmail,
            subject: `Actualización sobre tu solicitud — ${after.propertyName}`,
            html   : rejectedEmailHtml(after),
          })
        );
      }
    }

    try {
      await Promise.allSettled(promises);
    } catch (e) {
      console.error('[visitEmails] Error enviando emails:', e);
    }

    return null;
  });
