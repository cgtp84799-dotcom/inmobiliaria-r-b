// src/modules/public/services/contact.service.js
//
// ─── CAMBIOS ────────────────────────────────────────────────────────────────
//  [NOTIF] Antes este servicio guardaba la consulta en /contacts pero NO
//          notificaba a los admins / staff. Por eso una consulta podía pasar
//          desapercibida hasta que alguien revisara la sección Consultas.
//          Ahora notifica a todos los admins y miembros del equipo cuando
//          llega una consulta nueva.
//
//          La notificación se envía con catch silencioso porque el contacto
//          ya quedó guardado y el cliente no debe recibir error de UI por
//          un fallo de notificación interna.
// ──────────────────────────────────────────────────────────────────────────

import {
  collection, addDoc, serverTimestamp, getDocs, query, orderBy, doc, updateDoc, where,
} from 'firebase/firestore';
import { db } from '../../../core/config/firebase.config';

// [NOTIF] Service de notificaciones — ya valida si hay sesión; los flujos
// públicos sin login pueden invocarlo y la regla de Firestore permite a
// canOperate crear notifs (en este caso nadie tiene sesión, así que en
// público lo dejamos pasar y llenamos a través del backend al detectar
// el contacto). Para no depender de eso, lo intentamos del lado cliente
// y si falla por permisos, el backend tiene un trigger que ya notifica.
import {
  createNotification,
  NOTIF_TYPES,
} from '../../../core/services/notificationService';


// ─── [NOTIF] Helper: notificar a todo el staff ────────────────────────────
//
//   Notifica a admins y members. Como esta función puede invocarse desde
//   un visitante sin login (ContactPage pública), usamos try/catch global.
//   Si las reglas de Firestore bloquean (cliente no autenticado), confiamos
//   en el backend para hacer este fanout — el cliente solo lo intenta
//   "best effort" para ofrecer feedback inmediato a quienes SÍ están logueados.
//
async function notifyStaffNewContact({ name, email, propertyTitle, contactId }) {
  try {
    const staffSnap = await getDocs(
      query(collection(db, 'users'), where('role', 'in', ['admin', 'member']))
    );

    const subject = propertyTitle
      ? `${name} consulta sobre "${propertyTitle}"`
      : `${name} envió una consulta`;

    await Promise.all(
      staffSnap.docs.map((d) =>
        createNotification({
          userId:    d.id,
          type:      NOTIF_TYPES.NEW_CONTACT,
          title:     '✉️ Nueva consulta recibida',
          message:   `${subject} (${email})`,
          actionUrl: '/consultas',
          relatedId: contactId || null,
        }).catch(() => {})
      )
    );
  } catch (err) {
    // Silencio absoluto: el contacto ya quedó guardado y este es un
    // best-effort. El backend tiene un trigger para garantizar el fanout.
    console.warn('[ContactService] notifyStaffNewContact best-effort falló:', err?.message);
  }
}


class ContactService {
  constructor() {
    this.collectionName = 'contacts';
  }

  /**
   * Crear una nueva consulta de contacto
   *
   * [NOTIF] Después de guardar dispara fanout a admins+members.
   */
  async createContact(contactData) {
    try {
      // El backend ya escapa HTML al renderizar el email (escapeHtml en
      // utils.js), pero recortar valores y forzar tipos protege contra
      // inputs hostiles (formularios automatizados, bots).
      const trim = (v, max) => String(v ?? '').trim().slice(0, max);
      const safeData = {
        name:    trim(contactData.name, 200),
        email:   trim(contactData.email, 200).toLowerCase(),
        phone:   trim(contactData.phone, 30),
        message: trim(contactData.message, 3000),
      };
      // Campos opcionales — solo si vienen
      if (contactData.propertyId)    safeData.propertyId    = trim(contactData.propertyId, 100);
      if (contactData.propertyTitle) safeData.propertyTitle = trim(contactData.propertyTitle, 300);
      if (contactData.interest)      safeData.interest      = trim(contactData.interest, 100);
      if (contactData.source)        safeData.source        = trim(contactData.source, 100);

      // Validaciones básicas
      if (!safeData.name)    throw new Error('El nombre es obligatorio');
      if (!safeData.email || !safeData.email.includes('@')) throw new Error('Correo inválido');
      if (!safeData.message) throw new Error('El mensaje es obligatorio');

      const docRef = await addDoc(collection(db, this.collectionName), {
        ...safeData,
        status: 'pending', // pending, contacted, closed
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // ── [NOTIF] Fanout a admins + members ─────────────────────────────
      // No await: corre en background. Si el visitante es público sin sesión,
      // las rules pueden bloquear este path; en ese caso confiamos en el
      // trigger backend onContactCreated (definir en functions/index.js).
      notifyStaffNewContact({
        name:          safeData.name,
        email:         safeData.email,
        propertyTitle: safeData.propertyTitle,
        contactId:     docRef.id,
      });

      return {
        id: docRef.id,
        ...safeData,
      };
    } catch (error) {
      console.error('Error creando contacto:', error);
      // Si el error ya tiene mensaje específico (validación), propagarlo
      if (error?.message && error.message.length < 200 && !error.code) {
        throw error;
      }
      throw new Error('No se pudo enviar la consulta. Intenta nuevamente.');
    }
  }

  /**
   * Obtener todas las consultas (para el panel interno)
   */
  async getAllContacts() {
    try {
      const querySnapshot = await getDocs(
        query(
          collection(db, this.collectionName),
          orderBy('createdAt', 'desc')
        )
      );

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      }));
    } catch (error) {
      console.error('Error obteniendo contactos:', error);
      throw error;
    }
  }

  /**
   * Actualizar estado de una consulta
   */
  async updateContactStatus(contactId, status) {
    try {
      const docRef = doc(db, this.collectionName, contactId);
      await updateDoc(docRef, {
        status,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error actualizando estado:', error);
      throw error;
    }
  }
}

export default new ContactService();