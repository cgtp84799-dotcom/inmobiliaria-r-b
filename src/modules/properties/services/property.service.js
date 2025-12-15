import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import { db } from '../../../core/config/firebase.config';

const COLLECTION = 'properties';

class PropertyService {
  
  // Obtener propiedades PÚBLICAS (sin autenticación)
  async getPublicProperties(filters = {}) {
    try {
      // ✅ Solo orderBy, sin where (evita necesidad de índice)
      let q = query(
        collection(db, COLLECTION),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      let properties = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // ✅ Filtrar por status en JavaScript
      properties = properties.filter(p => 
        !p.status || p.status === 'disponible' || p.status === 'reservada'
      );

      // Aplicar filtros adicionales
      if (filters.transactionType) {
        properties = properties.filter(p => p.transactionType === filters.transactionType);
      }

      if (filters.type) {
        properties = properties.filter(p => p.type === filters.type);
      }

      if (filters.city) {
        properties = properties.filter(p => 
          p.city?.toLowerCase().includes(filters.city.toLowerCase())
        );
      }

      if (filters.minPrice) {
        properties = properties.filter(p => p.price >= filters.minPrice);
      }

      if (filters.maxPrice) {
        properties = properties.filter(p => p.price <= filters.maxPrice);
      }

      if (filters.rooms) {
        properties = properties.filter(p => p.rooms >= filters.rooms);
      }

      if (filters.bathrooms) {
        properties = properties.filter(p => p.bathrooms >= filters.bathrooms);
      }

      return properties;
    } catch (error) {
      console.error('Error obteniendo propiedades públicas:', error);
      throw error;
    }
  }

  // Obtener UNA propiedad pública por ID
  async getPublicPropertyById(id) {
    try {
      const docRef = doc(db, COLLECTION, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        throw new Error('Propiedad no encontrada');
      }
    } catch (error) {
      console.error('Error obteniendo propiedad:', error);
      throw error;
    }
  }

  // Subir imágenes
  async uploadImages(files, propertyId) {
    try {
      const storage = getStorage();
      const uploadPromises = files.map(async (file) => {
        const timestamp = Date.now();
        const fileName = `${propertyId}_${timestamp}_${file.name}`;
        const storageRef = ref(storage, `properties/${fileName}`);
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        return downloadURL;
      });

      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Error subiendo imágenes:', error);
      throw error;
    }
  }

  // Subir documentos
  async uploadDocuments(files, propertyId) {
    try {
      const storage = getStorage();
      const uploadPromises = files.map(async (file) => {
        const timestamp = Date.now();
        const fileName = `${propertyId}_${timestamp}_${file.name}`;
        const storageRef = ref(storage, `documents/${fileName}`);
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        return {
          name: file.name,
          url: downloadURL,
          uploadedAt: new Date()
        };
      });

      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Error subiendo documentos:', error);
      throw error;
    }
  }

  // Crear propiedad
  async createProperty(propertyData, imageFiles = [], documentFiles = []) {
    try {
      const tempId = `temp_${Date.now()}`;
      
      let imageUrls = [];
      if (imageFiles.length > 0) {
        imageUrls = await this.uploadImages(imageFiles, tempId);
      }

      let documents = [];
      if (documentFiles.length > 0) {
        documents = await this.uploadDocuments(documentFiles, tempId);
      }

      const propertyToSave = {
        ...propertyData,
        images: imageUrls,
        documents: documents,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      const docRef = await addDoc(collection(db, COLLECTION), propertyToSave);
      return { id: docRef.id, ...propertyToSave };
    } catch (error) {
      console.error('Error creando propiedad:', error);
      throw error;
    }
  }

  // Obtener todas (admin)
  async getAllProperties() {
    try {
      const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error obteniendo propiedades:', error);
      throw error;
    }
  }

  // Actualizar
  async updateProperty(id, propertyData, newImageFiles = [], newDocumentFiles = []) {
    try {
      let updates = { ...propertyData, updatedAt: Timestamp.now() };

      if (newImageFiles.length > 0) {
        const newImageUrls = await this.uploadImages(newImageFiles, id);
        updates.images = [...(propertyData.images || []), ...newImageUrls];
      }

      if (newDocumentFiles.length > 0) {
        const newDocuments = await this.uploadDocuments(newDocumentFiles, id);
        updates.documents = [...(propertyData.documents || []), ...newDocuments];
      }

      const docRef = doc(db, COLLECTION, id);
      await updateDoc(docRef, updates);
      return { id, ...updates };
    } catch (error) {
      console.error('Error actualizando propiedad:', error);
      throw error;
    }
  }

  // Eliminar
  async deleteProperty(id) {
    try {
      const docRef = doc(db, COLLECTION, id);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error('Error eliminando propiedad:', error);
      throw error;
    }
  }
}

// ✅ EXPORTACIÓN CORRECTA
export default new PropertyService();