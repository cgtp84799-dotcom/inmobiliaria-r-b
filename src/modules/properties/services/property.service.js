// src/modules/properties/services/property.service.js

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
  Timestamp,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { db } from "../../../core/config/firebase.config";
import { optimizeImage } from "../../../shared/utils/imageOptimization";

const COLLECTION = "properties";

// ─── Helpers internos ────────────────────────────────────────────────────────

/** Normaliza un string a slug (sin tildes, minúscula, sin caracteres raros) */
const normalize = (str) =>
  String(str ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

/** Lee el precio de una propiedad sea cual sea su estructura */
const resolvePrice = (p) =>
  p.price?.sale ?? p.price?.rent ?? p.price ?? null;

/** Lee la ciudad de una propiedad sea cual sea su estructura */
const resolveCity = (p) =>
  String(p.location?.city ?? p.city ?? "").trim();

/** Lee las habitaciones de una propiedad sea cual sea su estructura */
const resolveRooms = (p) =>
  Number(p.features?.rooms ?? p.features?.bedrooms ?? p.rooms ?? 0);

/** Lee los baños de una propiedad sea cual sea su estructura */
const resolveBathrooms = (p) =>
  Number(p.features?.bathrooms ?? p.bathrooms ?? 0);

/**
 * Statuses que se muestran públicamente.
 * Acepta tanto el sistema viejo ("disponible") como el nuevo ("published", "active").
 */
const PUBLIC_STATUSES = new Set([
  "disponible",
  "reservada",
  "published",
  "active",
  "available",
]);

const isPublicStatus = (p) =>
  !p.status || PUBLIC_STATUSES.has(String(p.status).toLowerCase());

// ─── Service ─────────────────────────────────────────────────────────────────

class PropertyService {
  // ── Obtener propiedades PÚBLICAS ──────────────────────────────────────────
  async getPublicProperties(filters = {}) {
    try {
      const q = query(
        collection(db, COLLECTION),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(q);
      let properties = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      // 1. Filtrar por status público
      properties = properties.filter(isPublicStatus);

      // 2. transactionType
      if (filters.transactionType) {
        const ft = filters.transactionType.toLowerCase();
        properties = properties.filter((p) => {
          const t = String(p.transactionType ?? "").toLowerCase();
          if (ft === "sale" || ft === "venta")
            return ["sale", "venta", "compra"].includes(t);
          if (ft === "rent" || ft === "arriendo")
            return ["rent", "arriendo", "alquiler", "renta"].includes(t);
          return t === ft;
        });
      }

      // 3. type
      if (filters.type) {
        const ft = filters.type.toLowerCase();
        properties = properties.filter((p) =>
          String(p.type ?? "").toLowerCase().includes(ft)
        );
      }

      // 4. Ciudad — normalizada, soporta campo raíz y location.city
      if (filters.city) {
        const fc = normalize(filters.city);
        properties = properties.filter((p) =>
          normalize(resolveCity(p)).includes(fc)
        );
      }

      // 5. Precio — soporta price plano y price.sale / price.rent
      if (filters.minPrice) {
        const min = Number(filters.minPrice);
        properties = properties.filter((p) => {
          const price = resolvePrice(p);
          return price !== null && Number(price) >= min;
        });
      }

      if (filters.maxPrice) {
        const max = Number(filters.maxPrice);
        properties = properties.filter((p) => {
          const price = resolvePrice(p);
          return price !== null && Number(price) <= max;
        });
      }

      // 6. Rooms — soporta campo raíz y features.rooms / features.bedrooms
      if (filters.rooms) {
        const fr = Number(filters.rooms);
        properties = properties.filter((p) => resolveRooms(p) >= fr);
      }

      // 7. Bathrooms — soporta campo raíz y features.bathrooms
      if (filters.bathrooms) {
        const fb = Number(filters.bathrooms);
        properties = properties.filter((p) => resolveBathrooms(p) >= fb);
      }

      return properties;
    } catch (error) {
      console.error("Error obteniendo propiedades públicas:", error);
      throw error;
    }
  }

  // ── Obtener UNA propiedad pública por ID ──────────────────────────────────
  async getPublicPropertyById(id) {
    try {
      if (!id) throw new Error("ID de propiedad no válido");

      const docRef = doc(db, COLLECTION, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error("Propiedad no encontrada");
      }

      const data = docSnap.data();

      // No mostrar propiedades eliminadas/inactivas aunque se acceda por URL directa
      const status = String(data.status ?? "").toLowerCase();
      if (status === "eliminada" || status === "inactiva" || status === "draft") {
        throw new Error("Propiedad no disponible");
      }

      return { id: docSnap.id, ...data };
    } catch (error) {
      console.error("Error obteniendo propiedad:", error);
      throw error;
    }
  }

  // ── Subir imágenes (OPTIMIZADAS) ──────────────────────────────────────────
  async uploadImages(files, propertyId) {
    try {
      const storage = getStorage();

      const uploadPromises = files.map(async (file) => {
        const optimized = await optimizeImage(file, 1600, 0.8);
        const timestamp = Date.now();
        const fileName = `${propertyId}_${timestamp}_${optimized.name}`;
        const storageRef = ref(storage, `properties/${fileName}`);
        await uploadBytes(storageRef, optimized);
        return getDownloadURL(storageRef);
      });

      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error("Error subiendo imágenes:", error);
      throw error;
    }
  }

  // ── Subir documentos ──────────────────────────────────────────────────────
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
          uploadedAt: new Date(),
        };
      });

      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error("Error subiendo documentos:", error);
      throw error;
    }
  }

  // ── Crear propiedad ───────────────────────────────────────────────────────
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
        documents,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, COLLECTION), propertyToSave);
      return { id: docRef.id, ...propertyToSave };
    } catch (error) {
      console.error("Error creando propiedad:", error);
      throw error;
    }
  }

  // ── Obtener todas las propiedades (admin) ─────────────────────────────────
  async getAllProperties() {
    try {
      const q = query(
        collection(db, COLLECTION),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
    } catch (error) {
      console.error("Error obteniendo propiedades:", error);
      throw error;
    }
  }

  // ── Actualizar propiedad ──────────────────────────────────────────────────
  async updateProperty(id, propertyData, newImageFiles = [], newDocumentFiles = []) {
    try {
      let updates = { ...propertyData, updatedAt: Timestamp.now() };

      if (newImageFiles.length > 0) {
        const newImageUrls = await this.uploadImages(newImageFiles, id);
        updates.images = [...(propertyData.images ?? []), ...newImageUrls];
      }

      if (newDocumentFiles.length > 0) {
        const newDocuments = await this.uploadDocuments(newDocumentFiles, id);
        updates.documents = [
          ...(propertyData.documents ?? []),
          ...newDocuments,
        ];
      }

      const docRef = doc(db, COLLECTION, id);
      await updateDoc(docRef, updates);
      return { id, ...updates };
    } catch (error) {
      console.error("Error actualizando propiedad:", error);
      throw error;
    }
  }

  // ── Eliminar propiedad ────────────────────────────────────────────────────
  async deleteProperty(id) {
    try {
      const docRef = doc(db, COLLECTION, id);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error("Error eliminando propiedad:", error);
      throw error;
    }
  }
}

export default new PropertyService();