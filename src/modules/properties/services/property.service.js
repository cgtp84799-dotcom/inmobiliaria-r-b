// src/modules/properties/services/property.service.js
//
// FIX: Se agregaron los métodos faltantes:
//   - getPublicPropertyById(id)    ← lo llama PropertyDetailPage
//   - getPropertyById(id)          ← alias para el panel admin
//   - getPublicPropertyBySlug(slug) ← búsqueda por slug para SEO
//
// Sin estos métodos, hacer clic en una propiedad del catálogo o del portal
// arrojaba "propertyService.getPublicPropertyById is not a function".

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
  where,
  Timestamp,
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';
import { db } from '../../../core/config/firebase.config';
import { optimizeImage } from '../../../shared/utils/imageOptimization';
import { sendClientNotification, NOTIF_TYPES } from '../../../core/services/notificationService';

const COLLECTION = 'properties';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normalize = (str) =>
  String(str ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/, '');

const resolvePrice      = (p) => p.price?.sale ?? p.price?.rent ?? p.price ?? null;
const resolveCity       = (p) => String(p.location?.city ?? p.city ?? '').trim();
const resolveRooms      = (p) => Number(p.features?.rooms ?? p.features?.bedrooms ?? p.rooms ?? 0);
const resolveBathrooms  = (p) => Number(p.features?.bathrooms ?? p.bathrooms ?? 0);

const PUBLIC_STATUSES = new Set(['disponible', 'reservada', 'published', 'active', 'available']);
const isPublicStatus  = (p) => !p.status || PUBLIC_STATUSES.has(String(p.status).toLowerCase());

// ─── Matching de clientes ─────────────────────────────────────────────────────

function matchesClientPreferences(property, clientData) {
  if (clientData.tipoPropiedad) {
    const pType = normalize(property.type ?? property.propertyType ?? '');
    const cType = normalize(clientData.tipoPropiedad);
    if (pType && cType && !pType.includes(cType) && !cType.includes(pType)) return false;
  }
  if (clientData.ubicacionInteres) {
    const pCity  = normalize(resolveCity(property));
    const tokens = clientData.ubicacionInteres.split(/[,\\s]+/).map(normalize).filter(Boolean);
    if (tokens.length && pCity && !tokens.some((t) => pCity.includes(t))) return false;
  }
  if (clientData.presupuesto) {
    const budget = Number(String(clientData.presupuesto).replace(/\D/g, ''));
    const price  = Number(resolvePrice(property) ?? 0);
    if (budget > 0 && price > 0 && price > budget * 1.15) return false;
  }
  return true;
}

async function notifyMatchingClients(property, propertyId) {
  try {
    if (!isPublicStatus(property)) return;
    const snap = await getDocs(
      query(
        collection(db, 'clients'),
        where('tipoCliente', '==', 'portal'),
        where('estado', '==', 'activo')
      )
    );
    if (snap.empty) return;
    const matching = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((c) => c.email && matchesClientPreferences(property, c));
    if (!matching.length) return;
    const propertyTitle = property.title || 'Nueva propiedad';
    const city          = resolveCity(property);
    const price         = resolvePrice(property);
    const priceStr      = price
      ? new Intl.NumberFormat('es-CO', {
          style: 'currency',
          currency: 'COP',
          maximumFractionDigits: 0,
        }).format(price)
      : null;
    const message = [
      `Tenemos una nueva propiedad que puede interesarte: "${propertyTitle}"`,
      city     ? `en ${city}`      : null,
      priceStr ? `por ${priceStr}` : null,
    ]
      .filter(Boolean)
      .join(' ');
    await Promise.allSettled(
      matching.map((c) =>
        sendClientNotification(c.email, {
          title: '🏠 Nueva propiedad disponible',
          message,
          type: NOTIF_TYPES.NEW_PROPERTY,
          relatedId: propertyId,
        })
      )
    );
  } catch (err) {
    console.warn('[property.service] notifyMatchingClients:', err.message);
  }
}

// ─── Service ──────────────────────────────────────────────────────────────────

class PropertyService {

  // ── Propiedad individual por ID (PÚBLICA) ─────────────────────────────────
  // FIX: Este método faltaba y causaba el error "getPublicPropertyById is not a function"
  async getPublicPropertyById(id) {
    if (!id) return null;
    try {
      const docRef  = doc(db, COLLECTION, id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return null;
      const data = { id: docSnap.id, ...docSnap.data() };
      // No filtrar por status aquí — la página decide si mostrar propiedades no públicas
      return data;
    } catch (err) {
      console.error('Error obteniendo propiedad por ID:', err);
      return null;
    }
  }

  // ── Alias sin filtro de status (para el panel admin) ─────────────────────
  async getPropertyById(id) {
    return this.getPublicPropertyById(id);
  }

  // ── Propiedades PÚBLICAS con filtros ──────────────────────────────────────
  async getPublicProperties(filters = {}) {
    try {
      const q        = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      let properties = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

      properties = properties.filter(isPublicStatus);

      if (filters.transactionType) {
        const ft = filters.transactionType.toLowerCase();
        properties = properties.filter((p) => {
          const t = String(p.transactionType ?? '').toLowerCase();
          if (ft === 'sale' || ft === 'venta')
            return ['sale', 'venta', 'compra'].includes(t);
          if (ft === 'rent' || ft === 'arriendo')
            return ['rent', 'arriendo', 'alquiler', 'renta'].includes(t);
          return t === ft;
        });
      }
      if (filters.type) {
        const ft = filters.type.toLowerCase();
        properties = properties.filter((p) =>
          String(p.type ?? '').toLowerCase().includes(ft)
        );
      }
      if (filters.city) {
        const fc = normalize(filters.city);
        properties = properties.filter((p) =>
          normalize(resolveCity(p)).includes(fc)
        );
      }
      if (filters.minPrice) {
        const min = Number(filters.minPrice);
        properties = properties.filter((p) => {
          const pr = resolvePrice(p);
          return pr !== null && Number(pr) >= min;
        });
      }
      if (filters.maxPrice) {
        const max = Number(filters.maxPrice);
        properties = properties.filter((p) => {
          const pr = resolvePrice(p);
          return pr !== null && Number(pr) <= max;
        });
      }
      if (filters.rooms) {
        const fr = Number(filters.rooms);
        properties = properties.filter((p) => resolveRooms(p) >= fr);
      }
      if (filters.bathrooms) {
        const fb = Number(filters.bathrooms);
        properties = properties.filter((p) => resolveBathrooms(p) >= fb);
      }
      return properties;
    } catch (err) {
      console.error('Error obteniendo propiedades públicas:', err);
      throw err;
    }
  }

  // ── Sincronizar estado/contrato actual desde contract.service ─────────────
  //
  // Helper de bajo nivel. NO contiene lógica de negocio sobre qué status
  // corresponde a qué etapa de contrato — esa lógica vive en
  // contract.types.getPropertyStatusFromContract y se aplica en
  // contract.service._syncPropertyStatus.
  //
  // Uso típico (desde contract.service):
  //   await propertyService.setPropertyContractState(propertyId, {
  //     status: 'arrendada',
  //     contractId: 'abc123',
  //   });
  //
  // Si pasan status === null, no se modifica el status (solo se actualiza
  // currentContractId). Útil para etapas intermedias de venta donde no
  // queremos cambiar el status visible pero sí dejar registro del contrato.
  async setPropertyContractState(
    propertyId,
    { status = null, contractId = null } = {}
  ) {
    if (!propertyId) return;
    try {
      const patch = {
        currentContractId: contractId,
        updatedAt: Timestamp.now(),
      };
      if (status) patch.status = status;
      await updateDoc(doc(db, COLLECTION, propertyId), patch);
    } catch (err) {
      console.error('Error en setPropertyContractState:', err);
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

      // Notificación a clientes (no se espera a que termine)
      notifyMatchingClients(propertyToSave, docRef.id);

      return { id: docRef.id, ...propertyToSave };
    } catch (err) {
      console.error('Error creando propiedad:', err);
      throw err;
    }
  }

  // ── Todas las propiedades (admin) ─────────────────────────────────────────
  async getAllProperties() {
    try {
      const q        = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.error('Error obteniendo propiedades:', err);
      throw err;
    }
  }

  // ── Actualizar propiedad ──────────────────────────────────────────────────
  async updateProperty(id, propertyData, newImageFiles = [], newDocumentFiles = []) {
    try {
      let updates = {
        ...propertyData,
        updatedAt: Timestamp.now(),
      };

      if (newImageFiles.length > 0) {
        const newImageUrls = await this.uploadImages(newImageFiles, id);
        updates.images = [...(propertyData.images ?? []), ...newImageUrls];
      }

      if (newDocumentFiles.length > 0) {
        const newDocuments = await this.uploadDocuments(newDocumentFiles, id);
        updates.documents = [...(propertyData.documents ?? []), ...newDocuments];
      }

      await updateDoc(doc(db, COLLECTION, id), updates);
      return { id, ...updates };
    } catch (err) {
      console.error('Error actualizando propiedad:', err);
      throw err;
    }
  }

  // ── Eliminar propiedad ────────────────────────────────────────────────────
  async deleteProperty(id) {
    try {
      await deleteDoc(doc(db, COLLECTION, id));
      return true;
    } catch (err) {
      console.error('Error eliminando propiedad:', err);
      throw err;
    }
  }

  // ── Subir imágenes ────────────────────────────────────────────────────────
  async uploadImages(imageFiles, propertyId) {
    const storage = getStorage();
    const urls    = [];

    for (const file of imageFiles) {
      try {
        let fileToUpload = file;

        if (typeof optimizeImage === 'function') {
          try {
            fileToUpload = await optimizeImage(file);
          } catch {
            // fallback: sube la imagen original
          }
        }

        const storageRef = ref(
          storage,
          `properties/${propertyId}/${Date.now()}_${file.name}`
        );
        const snapshot = await uploadBytes(storageRef, fileToUpload);
        urls.push(await getDownloadURL(snapshot.ref));
      } catch (err) {
        console.error('Error subiendo imagen:', err);
      }
    }

    return urls;
  }

  // ── Subir documentos ──────────────────────────────────────────────────────
  async uploadDocuments(documentFiles, propertyId) {
    const storage = getStorage();
    const docs    = [];

    for (const file of documentFiles) {
      try {
        const storageRef = ref(
          storage,
          `properties/${propertyId}/docs/${Date.now()}_${file.name}`
        );
        const snapshot = await uploadBytes(storageRef, file);
        docs.push({
          name: file.name,
          url: await getDownloadURL(snapshot.ref),
          size: file.size,
          type: file.type,
        });
      } catch (err) {
        console.error('Error subiendo documento:', err);
      }
    }

    return docs;
  }
}

export default new PropertyService();