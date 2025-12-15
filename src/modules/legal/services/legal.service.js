import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  getDoc,
  query,
  where,
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../../core/config/firebase.config';
import toast from 'react-hot-toast';

const COLLECTION_NAME = 'contracts';

export const legalService = {
  // Crear contrato
  async createContract(contractData, documents = []) {
    try {
      // Subir documentos si existen
      const documentUrls = await this.uploadDocuments(documents);

      const newContract = {
        ...contractData,
        documents: {
          draft: documentUrls[0] || '',
          signed: '',
          registered: ''
        },
        status: 'draft',
        timeline: [
          {
            event: 'Contrato creado',
            date: Timestamp.now(),
            description: 'Borrador inicial generado'
          }
        ],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      const docRef = await addDoc(collection(db, COLLECTION_NAME), newContract);
      toast.success('Contrato creado exitosamente');
      return { id: docRef.id, ...newContract };
    } catch (error) {
      toast.error('Error al crear contrato: ' + error.message);
      throw error;
    }
  },

  // Obtener todos los contratos
  async getAllContracts(filters = {}) {
    try {
      let q = collection(db, COLLECTION_NAME);
      
      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      }
      if (filters.type) {
        q = query(q, where('type', '==', filters.type));
      }
      
      q = query(q, orderBy('createdAt', 'desc'));

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      toast.error('Error al obtener contratos');
      throw error;
    }
  },

  // Obtener contrato por ID
  async getContractById(id) {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        throw new Error('Contrato no encontrado');
      }
    } catch (error) {
      toast.error('Error al obtener contrato');
      throw error;
    }
  },

  // Actualizar contrato
  async updateContract(id, contractData) {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const updates = {
        ...contractData,
        updatedAt: Timestamp.now()
      };

      await updateDoc(docRef, updates);
      toast.success('Contrato actualizado exitosamente');
      return { id, ...updates };
    } catch (error) {
      toast.error('Error al actualizar contrato: ' + error.message);
      throw error;
    }
  },

  // Cambiar estado del contrato
  async updateStatus(id, newStatus, description) {
    try {
      const contractRef = doc(db, COLLECTION_NAME, id);
      const contractSnap = await getDoc(contractRef);
      
      if (contractSnap.exists()) {
        const currentTimeline = contractSnap.data().timeline || [];
        const newEvent = {
          event: `Estado cambiado a: ${newStatus}`,
          date: Timestamp.now(),
          description: description || ''
        };

        await updateDoc(contractRef, {
          status: newStatus,
          timeline: [...currentTimeline, newEvent],
          updatedAt: Timestamp.now()
        });

        toast.success('Estado actualizado');
      }
    } catch (error) {
      toast.error('Error al actualizar estado');
      throw error;
    }
  },

  // Eliminar contrato
  async deleteContract(id) {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
      toast.success('Contrato eliminado');
    } catch (error) {
      toast.error('Error al eliminar contrato');
      throw error;
    }
  },

  // Subir documentos a Storage
  async uploadDocuments(documents) {
    try {
      const uploadPromises = documents.map(async (document) => {
        const storageRef = ref(storage, `contracts/${Date.now()}_${document.name}`);
        await uploadBytes(storageRef, document);
        return await getDownloadURL(storageRef);
      });

      return await Promise.all(uploadPromises);
    } catch (error) {
      toast.error('Error al subir documentos');
      throw error;
    }
  },

  // Obtener contratos por propiedad
  async getContractsByProperty(propertyId) {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('propertyId', '==', propertyId)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      toast.error('Error al obtener contratos de la propiedad');
      throw error;
    }
  }
};