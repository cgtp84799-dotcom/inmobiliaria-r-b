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
const STORAGE_ROOT = 'documents';

class DocumentService {
  /**
   * Subir archivo a Storage
   * Guarda fileName RELATIVO (sin "documents/") para mantener consistencia.
   */
  async uploadFile(file, category, entityId) {
    try {
      if (!file) throw new Error('Archivo requerido');
      if (file.size === 0) throw new Error('El archivo está vacío');
      if (file.size > 20 * 1024 * 1024) throw new Error('El archivo excede el tamaño máximo permitido (20 MB)');
      const allowedMime = /^(application\/pdf|image\/(jpeg|jpg|png|webp|heic)|application\/msword|application\/vnd\.openxmlformats-officedocument.*)$/i;
      if (file.type && !allowedMime.test(file.type)) {
        throw new Error(`Tipo de archivo no permitido: ${file.type}`);
      }
      if (!file.name || !file.name.trim()) {
        throw new Error('El archivo no tiene nombre válido');
      }

      const storage = getStorage();
      const timestamp = Date.now();

      const safeCategory = (category || 'other').toString().trim() || 'other';
      const safeEntityId = (entityId || 'general').toString().trim() || 'general';

      // Sanitizar nombre — evita caracteres conflictivos en Storage paths
      const originalName = (file?.name || 'archivo')
        .replace(/[/\\?%*:|"<>]/g, '_')
        .replace(/\s+/g, '_')
        .slice(0, 200);
      const fileName = `${safeCategory}/${safeEntityId}/${timestamp}_${originalName}`; // relativo

      const storageRef = ref(storage, `${STORAGE_ROOT}/${fileName}`);

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
        fileName: fileData?.fileName || null, // relativo (category/entityId/...)
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

      if (filters.category) q = query(q, where('category', '==', filters.category));
      if (filters.entityType) q = query(q, where('entityType', '==', filters.entityType));
      if (filters.entityId) q = query(q, where('entityId', '==', filters.entityId));

      const snapshot = await getDocs(q);

      return snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        uploadedAt: d.data().uploadedAt?.toDate?.() || null,
        updatedAt: d.data().updatedAt?.toDate?.() || null
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

      if (!docSnap.exists()) throw new Error('Documento no encontrado');

      return {
        id: docSnap.id,
        ...docSnap.data(),
        uploadedAt: docSnap.data().uploadedAt?.toDate?.() || null,
        updatedAt: docSnap.data().updatedAt?.toDate?.() || null
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
   * - Intenta borrar Storage si hay fileName
   * - Si el archivo no existe, igual borra Firestore
   * - Si hay permission-denied u otro error serio, lo lanza
   */
  async deleteDocument(id) {
    try {
      const document = await this.getDocumentById(id);

      // 1) Storage
      if (document?.fileName) {
        const storage = getStorage();

        // Normaliza por si algún documento guardó "documents/..." por error/legacy
        const relative = document.fileName.startsWith(`${STORAGE_ROOT}/`)
          ? document.fileName.slice(`${STORAGE_ROOT}/`.length)
          : document.fileName;

        const objectPath = `${STORAGE_ROOT}/${relative}`;
        const fileRef = ref(storage, objectPath);

        try {
          await deleteObject(fileRef);
        } catch (err) {
          // Si ya no existe el archivo, no bloqueamos la limpieza del doc
          if (err?.code !== 'storage/object-not-found') {
            throw err;
          }
        }
      }

      // 2) Firestore
      await deleteDoc(doc(db, COLLECTION, id));

      return true;
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

      return snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        uploadedAt: d.data().uploadedAt?.toDate?.() || null,
        updatedAt: d.data().updatedAt?.toDate?.() || null
      }));
    } catch (error) {
      console.error('Error obteniendo documentos por entidad:', error);
      throw error;
    }
  }
}

export const documentService = new DocumentService();