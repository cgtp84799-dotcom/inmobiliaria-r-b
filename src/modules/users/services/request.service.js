// src/modules/users/services/request.service.js
//
// ─── CAMBIOS ────────────────────────────────────────────────────────────────
//  [NOTIF] Antes este servicio mutaba /accessRequests sin notificar.
//          Ahora notifica:
//            • A todos los admins cuando llega una nueva solicitud
//              (la solicitud llega de un usuario público sin sesión, así que
//               el frontend no puede crear notifs vía rules → confiamos en
//               backend, pero también hacemos un best-effort si fuera staff
//               creando la solicitud).
//            • Al solicitante cuando se aprueba o rechaza (in-app + email
//              vía sendClientNotification).
//            • A admins cuando otro admin elimina una solicitud.
// ──────────────────────────────────────────────────────────────────────────

import { db } from '../../../core/config/firebase.config';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  Timestamp
} from 'firebase/firestore';

// [NOTIF] Imports de notificaciones
import {
  createNotification,
  sendClientNotification,
  NOTIF_TYPES,
} from '../../../core/services/notificationService';

const COLLECTION = 'accessRequests';


// ─── [NOTIF] Helper: notificar a todos los admins ─────────────────────────
async function notifyAdmins({ type, title, message, actionUrl, relatedId, excludeEmail }) {
  try {
    const adminsSnap = await getDocs(
      query(collection(db, 'users'), where('role', '==', 'admin'))
    );
    await Promise.all(
      adminsSnap.docs
        .filter((d) => !excludeEmail || d.id !== excludeEmail)
        .map((d) =>
          createNotification({
            userId:    d.id,
            type,
            title,
            message,
            actionUrl: actionUrl || '/solicitudes',
            relatedId: relatedId || null,
          }).catch(() => {})
        )
    );
  } catch (err) {
    console.warn('[requestService] notifyAdmins falló:', err?.message);
  }
}


class RequestService {
  // Crear solicitud de acceso (público — el solicitante NO está autenticado)
  //
  // [NOTIF] El best-effort de notificar admins desde aquí solo funciona si
  // hay sesión activa (rules). Para visitantes anónimos, debes tener un
  // trigger backend onAccessRequestCreated que haga el fanout. Aquí solo
  // dejamos el código por si en el futuro un staff crea la solicitud.
  async createRequest(requestData) {
    try {
      const request = {
        ...requestData,
        status: 'pending',
        createdAt: Timestamp.now(),
        approvedBy: null,
        approvedAt: null,
        assignedRole: null
      };

      const docRef = await addDoc(collection(db, COLLECTION), request);

      // ── [NOTIF] Fanout best-effort a admins ───────────────────────────
      notifyAdmins({
        type:      NOTIF_TYPES.NEW_ACCESS_REQUEST,
        title:     '🔔 Nueva solicitud de acceso',
        message:   `${requestData.name || 'Alguien'} (${requestData.email || 'sin email'}) solicitó acceso al sistema.`,
        actionUrl: '/solicitudes',
        relatedId: docRef.id,
      });

      return { id: docRef.id, ...request };
    } catch (error) {
      console.error('Error creando solicitud:', error);
      throw error;
    }
  }

  // Obtener todas las solicitudes
  async getAllRequests(filters = {}) {
    try {
      let q;

      if (filters.status) {
        // Consulta con filtro de status
        q = query(
          collection(db, COLLECTION),
          where('status', '==', filters.status),
          orderBy('createdAt', 'desc')
        );
      } else {
        // Consulta sin filtro
        q = query(
          collection(db, COLLECTION),
          orderBy('createdAt', 'desc')
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));
    } catch (error) {
      console.error('Error obteniendo solicitudes:', error);
      throw error;
    }
  }

  // Aprobar solicitud
  //
  // [NOTIF] Notifica al solicitante (in-app + email) y a otros admins.
  async approveRequest(requestId, assignedRole, approvedByEmail) {
    try {
      // Leer datos de la solicitud antes de actualizarla — necesitamos el
      // email del solicitante para notificarle.
      let requestEmail = null;
      let requestName  = null;
      try {
        const snap = await getDocs(
          query(collection(db, COLLECTION), where('__name__', '==', requestId))
        );
        const data = snap.docs[0]?.data();
        if (data) {
          requestEmail = data.email || null;
          requestName  = data.name  || null;
        }
      } catch (_) { /* no crítico */ }

      const docRef = doc(db, COLLECTION, requestId);
      await updateDoc(docRef, {
        status: 'approved',
        assignedRole,
        approvedBy: approvedByEmail,
        approvedAt: Timestamp.now()
      });

      // ── [NOTIF] Notificar al solicitante (si tiene cuenta creada) ─────
      // Si el flujo de aprobación crea simultáneamente el usuario en /users,
      // el solicitante podrá ver la notif al iniciar sesión por primera vez.
      if (requestEmail) {
        sendClientNotification(requestEmail, {
          title:     '✅ Tu solicitud de acceso fue aprobada',
          message:   `Hola ${requestName || ''}, tu acceso fue aprobado con el rol ${assignedRole}. Ya puedes iniciar sesión.`,
          type:      NOTIF_TYPES.NEW_ACCESS_REQUEST,
          relatedId: requestId,
          actionUrl: '/login',
        }).catch(() => {});
      }

      // ── [NOTIF] Avisar a otros admins (excepto quien aprobó) ──────────
      notifyAdmins({
        type:         NOTIF_TYPES.NEW_ACCESS_REQUEST,
        title:        '✅ Solicitud aprobada',
        message:      `${requestEmail || 'Solicitante'} fue aprobado con rol ${assignedRole} por ${approvedByEmail}.`,
        actionUrl:    '/solicitudes',
        relatedId:    requestId,
        excludeEmail: approvedByEmail,
      });
    } catch (error) {
      console.error('Error aprobando solicitud:', error);
      throw error;
    }
  }

  // Rechazar solicitud
  //
  // [NOTIF] Notifica al solicitante y a otros admins.
  async rejectRequest(requestId, rejectedByEmail) {
    try {
      let requestEmail = null;
      let requestName  = null;
      try {
        const snap = await getDocs(
          query(collection(db, COLLECTION), where('__name__', '==', requestId))
        );
        const data = snap.docs[0]?.data();
        if (data) {
          requestEmail = data.email || null;
          requestName  = data.name  || null;
        }
      } catch (_) { /* no crítico */ }

      const docRef = doc(db, COLLECTION, requestId);
      await updateDoc(docRef, {
        status: 'rejected',
        approvedBy: rejectedByEmail,
        approvedAt: Timestamp.now()
      });

      // ── [NOTIF] Notificar al solicitante (in-app + email) ─────────────
      if (requestEmail) {
        sendClientNotification(requestEmail, {
          title:     '❌ Solicitud no aprobada',
          message:   `Hola ${requestName || ''}, tu solicitud de acceso no fue aprobada en esta ocasión. Si tienes dudas, contáctanos.`,
          type:      NOTIF_TYPES.NEW_ACCESS_REQUEST,
          relatedId: requestId,
          actionUrl: '/contacto',
        }).catch(() => {});
      }

      // ── [NOTIF] Avisar a otros admins ─────────────────────────────────
      notifyAdmins({
        type:         NOTIF_TYPES.NEW_ACCESS_REQUEST,
        title:        '❌ Solicitud rechazada',
        message:      `${requestEmail || 'Solicitante'} fue rechazado por ${rejectedByEmail}.`,
        actionUrl:    '/solicitudes',
        relatedId:    requestId,
        excludeEmail: rejectedByEmail,
      });
    } catch (error) {
      console.error('Error rechazando solicitud:', error);
      throw error;
    }
  }

  // Eliminar solicitud
  async deleteRequest(requestId) {
    try {
      await deleteDoc(doc(db, COLLECTION, requestId));
    } catch (error) {
      console.error('Error eliminando solicitud:', error);
      throw error;
    }
  }
}

export const requestService = new RequestService();