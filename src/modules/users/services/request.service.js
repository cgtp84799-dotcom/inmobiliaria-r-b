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

const COLLECTION = 'accessRequests';

class RequestService {
  // Crear solicitud de acceso (público)
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
  async approveRequest(requestId, assignedRole, approvedByEmail) {
    try {
      const docRef = doc(db, COLLECTION, requestId);
      await updateDoc(docRef, {
        status: 'approved',
        assignedRole,
        approvedBy: approvedByEmail,
        approvedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error aprobando solicitud:', error);
      throw error;
    }
  }

  // Rechazar solicitud
  async rejectRequest(requestId, rejectedByEmail) {
    try {
      const docRef = doc(db, COLLECTION, requestId);
      await updateDoc(docRef, {
        status: 'rejected',
        approvedBy: rejectedByEmail,
        approvedAt: Timestamp.now()
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
