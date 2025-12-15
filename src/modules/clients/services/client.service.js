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
import { db } from '../../../core/config/firebase.config';
import toast from 'react-hot-toast';

const COLLECTION_NAME = 'clients';

export const clientService = {
  // Crear cliente
  async createClient(clientData) {
    try {
      const newClient = {
        ...clientData,
        interactions: {
          propertiesViewed: [],
          propertiesFavorited: [],
          inquiries: [],
          appointments: []
        },
        notes: [],
        documents: [],
        createdAt: Timestamp.now(),
        lastContact: Timestamp.now()
      };

      const docRef = await addDoc(collection(db, COLLECTION_NAME), newClient);
      toast.success('Cliente creado exitosamente');
      return { id: docRef.id, ...newClient };
    } catch (error) {
      toast.error('Error al crear cliente: ' + error.message);
      throw error;
    }
  },

  // Obtener todos los clientes
  async getAllClients(filters = {}) {
    try {
      let q = collection(db, COLLECTION_NAME);
      
      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      }
      if (filters.assignedAgent) {
        q = query(q, where('assignedAgent', '==', filters.assignedAgent));
      }
      
      q = query(q, orderBy('createdAt', 'desc'));

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      toast.error('Error al obtener clientes');
      throw error;
    }
  },

  // Obtener cliente por ID
  async getClientById(id) {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        throw new Error('Cliente no encontrado');
      }
    } catch (error) {
      toast.error('Error al obtener cliente');
      throw error;
    }
  },

  // Actualizar cliente
  async updateClient(id, clientData) {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const updates = {
        ...clientData,
        updatedAt: Timestamp.now()
      };

      await updateDoc(docRef, updates);
      toast.success('Cliente actualizado exitosamente');
      return { id, ...updates };
    } catch (error) {
      toast.error('Error al actualizar cliente: ' + error.message);
      throw error;
    }
  },

  // Eliminar cliente
  async deleteClient(id) {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
      toast.success('Cliente eliminado');
    } catch (error) {
      toast.error('Error al eliminar cliente');
      throw error;
    }
  },

  // Agregar nota a cliente
  async addNote(clientId, noteText, author) {
    try {
      const clientRef = doc(db, COLLECTION_NAME, clientId);
      const clientSnap = await getDoc(clientRef);
      
      if (clientSnap.exists()) {
        const currentNotes = clientSnap.data().notes || [];
        const newNote = {
          id: Date.now().toString(),
          text: noteText,
          author,
          createdAt: Timestamp.now()
        };

        await updateDoc(clientRef, {
          notes: [...currentNotes, newNote],
          lastContact: Timestamp.now()
        });

        toast.success('Nota agregada');
        return newNote;
      }
    } catch (error) {
      toast.error('Error al agregar nota');
      throw error;
    }
  },

  // Buscar clientes
  async searchClients(searchTerm) {
    try {
      const allClients = await this.getAllClients();
      
      return allClients.filter(client => {
        const searchLower = searchTerm.toLowerCase();
        return (
          client.personalInfo?.name?.toLowerCase().includes(searchLower) ||
          client.personalInfo?.email?.toLowerCase().includes(searchLower) ||
          client.personalInfo?.phone?.includes(searchTerm) ||
          client.personalInfo?.idNumber?.includes(searchTerm)
        );
      });
    } catch (error) {
      toast.error('Error en la búsqueda');
      throw error;
    }
  }
};