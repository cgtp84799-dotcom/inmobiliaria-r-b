// src/modules/contracts/services/contract.service.js
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, getDocs, getDoc, query, where, orderBy,
  onSnapshot, serverTimestamp,
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../../core/config/firebase.config';
import { CONTRACT_STATUS, createContractPayload } from '../types/contract.types';
import { notificationService } from '../../notifications/services/notification.service';
import { sendClientNotification, NOTIF_TYPES } from '../../../core/services/notificationService';

const COL  = 'contracts';
const col  = () => collection(db, COL);
const ref_ = (id) => doc(db, COL, id);

export const contractService = {

  /**
   * Crea un contrato, escribe historial inicial y envía notificaciones.
   * Ahora también envía notificación in-app al portal del cliente (viewer).
   */
  async createContract(data, createdByEmail) {
    const payload = {
      ...createContractPayload({ ...data, createdBy: createdByEmail }),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(col(), payload);

    // Historial inicial
    await addDoc(collection(db, COL, docRef.id, 'history'), {
      action:    'created',
      status:    payload.status,
      by:        createdByEmail || 'sistema',
      createdAt: serverTimestamp(),
    }).catch(() => {});

    // Notificación in-app portal al cliente viewer (NUEVO)
    if (data.status !== CONTRACT_STATUS.DRAFT && data.clientEmail) {
      sendClientNotification(data.clientEmail, {
        title:    '📄 Nuevo contrato registrado',
        message:  `Se registró un contrato de ${data.type || 'inmueble'} para "${data.propertyName}". Puedes consultarlo en tu portal.`,
        type:     NOTIF_TYPES.CONTRACT_CREATED,
        relatedId: docRef.id,
      }).catch(() => {});
    }

    // Notificación in-app sistema al agente (ya existía)
    if (data.agentEmail && data.agentEmail !== createdByEmail) {
      notificationService.createNotification({
        userId:    data.agentEmail,
        type:      'contract_assigned',
        title:     'Nuevo contrato asignado',
        message:   `Se te asignó el contrato de "${data.propertyName}" con ${data.clientName}.`,
        actionUrl: '/contratos',
      }).catch(() => {});
    }

    return docRef.id;
  },

  /** Actualiza campos de un contrato. */
  async updateContract(id, data) {
    await updateDoc(ref_(id), { ...data, updatedAt: serverTimestamp() });
  },

  /** Cambia solo el estado. */
  async updateStatus(id, newStatus, notes = '') {
    const update = { status: newStatus, updatedAt: serverTimestamp() };
    if (notes) update.notes = notes;
    await updateDoc(ref_(id), update);
  },

  /** Elimina un contrato. */
  async deleteContract(id) {
    await deleteDoc(ref_(id));
  },

  /** Lectura única por ID. */
  async getContractById(id) {
    const snap = await getDoc(ref_(id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  },

  /** Lectura única de todos (sin tiempo real). */
  async getAllContracts() {
    const snap = await getDocs(query(col(), orderBy('createdAt', 'desc')));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async getContractsByProperty(propertyId) {
    const snap = await getDocs(query(col(), where('propertyId', '==', propertyId), orderBy('createdAt', 'desc')));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async getContractsByClient(clientEmail) {
    const snap = await getDocs(query(col(), where('clientEmail', '==', clientEmail), orderBy('createdAt', 'desc')));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async getContractsByAgent(agentEmail) {
    const snap = await getDocs(query(col(), where('agentEmail', '==', agentEmail), orderBy('createdAt', 'desc')));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  /** Suscripción en tiempo real — todos los contratos. */
  subscribeAll(callback) {
    return onSnapshot(
      query(col(), orderBy('createdAt', 'desc')),
      (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.error('[contractService.subscribeAll]', err)
    );
  },

  /** Suscripción en tiempo real — contratos de un cliente. */
  subscribeByClient(clientEmail, callback) {
    return onSnapshot(
      query(col(), where('clientEmail', '==', clientEmail), orderBy('createdAt', 'desc')),
      (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.error('[contractService.subscribeByClient]', err)
    );
  },

  /** Contratos activos de un agente. */
  subscribeByAgent(agentEmail, callback) {
    return onSnapshot(
      query(col(), where('agentEmail', '==', agentEmail), orderBy('createdAt', 'desc')),
      (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.error('[contractService.subscribeByAgent]', err)
    );
  },

  /** Sube un PDF al Storage y actualiza el documento. */
  async uploadDocument(contractId, file) {
    if (!file) return null;
    const ext  = file.name.split('.').pop();
    const path = `contracts/${contractId}/${Date.now()}.${ext}`;
    const sRef = storageRef(storage, path);
    const snap = await uploadBytes(sRef, file);
    const url  = await getDownloadURL(snap.ref);
    await updateDoc(ref_(contractId), { documentUrl: url, updatedAt: serverTimestamp() });
    return url;
  },
};