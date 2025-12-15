import { db } from '../../../core/config/firebase.config';
import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  doc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

const COLLECTION = 'documents';

class DocumentService {
  /**
   * Subir archivo a Storage
   */
  async uploadFile(file, category, entityId) {
    try {
      const storage = getStorage();
      const timestamp = Date.now();
      const fileName = `${category}/${entityId}/${timestamp}_${file.name}`;
      const storageRef = ref(storage, `documents/${fileName}`);
      
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      return { downloadURL, fileName };
    } catch (error) {
      console.error('Error subiendo archivo:', error);
      throw error;
    }
  }

  /**
   * Crear documento
   */
  async createDocument(documentData, file) {
    try {
      let fileData = null;
      
      if (file) {
        fileData = await this.uploadFile(
          file, 
          documentData.category, 
          documentData.entityId || 'general'
        );
      }

      const docToSave = {
        ...documentData,
        fileUrl: fileData?.downloadURL || null,
        fileName: fileData?.fileName || null,
        uploadedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      const docRef = await addDoc(collection(db, COLLECTION), docToSave);
      return { id: docRef.id, ...docToSave };
    } catch (error) {
      console.error('Error creando documento:', error);
      throw error;
    }
  }

  /**
   * Obtener todos los documentos
   */
  async getAllDocuments(filters = {}) {
    try {
      let q = query(collection(db, COLLECTION), orderBy('uploadedAt', 'desc'));

      if (filters.category) {
        q = query(q, where('category', '==', filters.category));
      }

      if (filters.entityType) {
        q = query(q, where('entityType', '==', filters.entityType));
      }

      if (filters.entityId) {
        q = query(q, where('entityId', '==', filters.entityId));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        uploadedAt: doc.data().uploadedAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      }));
    } catch (error) {
      console.error('Error obteniendo documentos:', error);
      throw error;
    }
  }

  /**
   * Obtener documento por ID
   */
  async getDocumentById(id) {
    try {
      const docRef = doc(db, COLLECTION, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Documento no encontrado');
      }

      return {
        id: docSnap.id,
        ...docSnap.data(),
        uploadedAt: docSnap.data().uploadedAt?.toDate(),
        updatedAt: docSnap.data().updatedAt?.toDate()
      };
    } catch (error) {
      console.error('Error obteniendo documento:', error);
      throw error;
    }
  }

  /**
   * Actualizar documento
   */
  async updateDocument(id, updates) {
    try {
      const docRef = doc(db, COLLECTION, id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now()
      });
      return this.getDocumentById(id);
    } catch (error) {
      console.error('Error actualizando documento:', error);
      throw error;
    }
  }

  /**
   * Eliminar documento
   */
  async deleteDocument(id) {
    try {
      const document = await this.getDocumentById(id);
      
      // Eliminar archivo de Storage si existe
      if (document.fileName) {
        const storage = getStorage();
        const fileRef = ref(storage, `documents/${document.fileName}`);
        await deleteObject(fileRef);
      }

      // Eliminar registro de Firestore
      await deleteDoc(doc(db, COLLECTION, id));
    } catch (error) {
      console.error('Error eliminando documento:', error);
      throw error;
    }
  }

  /**
   * Obtener documentos por entidad (propiedad, cliente, contrato)
   */
  async getDocumentsByEntity(entityType, entityId) {
    try {
      const q = query(
        collection(db, COLLECTION),
        where('entityType', '==', entityType),
        where('entityId', '==', entityId),
        orderBy('uploadedAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        uploadedAt: doc.data().uploadedAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      }));
    } catch (error) {
      console.error('Error obteniendo documentos por entidad:', error);
      throw error;
    }
  }
}

export const documentService = new DocumentService();