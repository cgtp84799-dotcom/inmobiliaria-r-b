import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, getDocs, getDoc, query, where, orderBy,
  onSnapshot, serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../../core/config/firebase.config';
import { CONTRACT_STATUS, createContractPayload } from '../types/contract.types';
import { notificationService } from '../../notifications/services/notification.service';

const COL = 'contracts';
const col = () => collection(db, COL);
const ref_ = (id) => doc(db, COL, id);

export const contractService = {

  /** Crea un contrato y notifica al cliente si no es borrador. */
  async createContract(data, createdByEmail) {
    const payload = {
      ...createContractPayload({ ...data, createdBy: createdByEmail }),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(col(), payload);

    if (data.status !== CONTRACT_STATUS.DRAFT && data.clientEmail) {
      await notificationService.createNotification({
        userId:    data.clientEmail,
        type:      'contract_signed',
        title:     'Nuevo contrato registrado',
        message:   `Se registró un contrato de ${data.type} para "${data.propertyName}".`,
        actionUrl: '/clientes/portal/contratos',
      }).catch(() => {});
    }

    return docRef.id;
  },

  /** Actualiza campos de un contrato existente. */
  async updateContract(id, data) {
    await updateDoc(ref_(id), { ...data, updatedAt: serverTimestamp() });
  },

  /** Cambia solo el estado de un contrato. */
  async updateStatus(id, newStatus, notes = '') {
    await updateDoc(ref_(id), {
      status:    newStatus,
      notes:     notes || undefined,
      updatedAt: serverTimestamp(),
    });
  },

  /** Elimina un contrato (solo admin). */
  async deleteContract(id) {
    await deleteDoc(ref_(id));
  },

  /** Obtiene un contrato por ID (lectura única). */
  async getContractById(id) {
    const snap = await getDoc(ref_(id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  },

  /** Todos los contratos — admin (lectura única). */
  async getAllContracts() {
    const snap = await getDocs(query(col(), orderBy('createdAt', 'desc')));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  /** Contratos de una propiedad específica. */
  async getContractsByProperty(propertyId) {
    const snap = await getDocs(
      query(col(), where('propertyId', '==', propertyId), orderBy('createdAt', 'desc'))
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  /** Contratos de un cliente por email. */
  async getContractsByClient(clientEmail) {
    const snap = await getDocs(
      query(col(), where('clientEmail', '==', clientEmail), orderBy('createdAt', 'desc'))
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  /** Contratos de un agente por email. */
  async getContractsByAgent(agentEmail) {
    const snap = await getDocs(
      query(col(), where('agentEmail', '==', agentEmail), orderBy('createdAt', 'desc'))
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  /**
   * Suscripción en tiempo real a todos los contratos.
   * Devuelve el unsubscribe.
   */
  subscribeAll(callback) {
    return onSnapshot(
      query(col(), orderBy('createdAt', 'desc')),
      (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.error('[contractService.subscribeAll]', err)
    );
  },

  /**
   * Suscripción en tiempo real a contratos de un cliente.
   * Devuelve el unsubscribe.
   */
  subscribeByClient(clientEmail, callback) {
    return onSnapshot(
      query(col(), where('clientEmail', '==', clientEmail), orderBy('createdAt', 'desc')),
      (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.error('[contractService.subscribeByClient]', err)
    );
  },

  /**
   * Sube un PDF al Storage y devuelve la URL de descarga.
   * Ruta: contracts/{contractId}/{filename}
   */
  async uploadDocument(contractId, file) {
    if (!file) return null;
    const ext      = file.name.split('.').pop();
    const path     = `contracts/${contractId}/${Date.now()}.${ext}`;
    const storageRef = ref(storage, path);
    const snap     = await uploadBytes(storageRef, file);
    const url      = await getDownloadURL(snap.ref);
    await updateDoc(ref_(contractId), { documentUrl: url, updatedAt: serverTimestamp() });
    return url;
  },
};
