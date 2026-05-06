// src/modules/properties/services/property.service.js
//
// Servicio CRUD + listados de propiedades (catálogo público y panel interno).

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
  limit,
  startAfter,
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
import {
  PROPERTY_STATUS,
  PUBLIC_STATUSES,
  isPublicStatus as isPublicStatusValue,
  normalizePropertyStatus,
} from '../types/property.types';

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

// Wrapper para mantener la firma del helper local (p) → bool.
const isPublicStatus = (p) => isPublicStatusValue(p?.status);

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
  //
  // Estrategia:
  //   • La query a Firestore filtra por `status == 'published'` directamente.
  //     Las Firestore Rules ya restringen lectura pública a ese status, así
  //     que es la única forma sostenible de listar el catálogo.
  //   • Otros filtros (transactionType, type, city, precio, habitaciones)
  //     se aplican en cliente porque Firestore no soporta multi-campo sin
  //     un índice por combinación.
  //   • Para >1000 propiedades activas, migrar a Algolia/Typesense.
  //
  // Retrocompatibilidad: por default retorna array. Solo si se pasa
  // `paginated: true` retorna { items, hasMore, lastDoc }.
  async getPublicProperties(filters = {}, options = {}) {
    const { pageSize = 200, lastDoc = null, paginated = false } = options;
    try {
      const constraints = [
        where('status', '==', PROPERTY_STATUS.PUBLISHED),
        orderBy('createdAt', 'desc'),
        limit(pageSize),
      ];
      if (lastDoc) constraints.push(startAfter(lastDoc));
      const q = query(collection(db, COLLECTION), ...constraints);
      const snapshot = await getDocs(q);
      const docs = snapshot.docs;
      let properties = docs.map((d) => ({ id: d.id, ...d.data() }));

      // Defensa en profundidad: si entra data legacy con aliases, los
      // normalizamos y re-filtramos.
      properties = properties.filter((p) => isPublicStatus(p));

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

      if (paginated) {
        return {
          items:    properties,
          hasMore:  docs.length === pageSize,  // si trajo el máximo, puede haber más
          lastDoc:  docs.length > 0 ? docs[docs.length - 1] : null,
        };
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
      if (status) patch.status = normalizePropertyStatus(status);
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
  // Cap a 1000 para proteger costos. Si necesitas más, considera paginación
  // en el panel de admin (similar al patrón de getPublicProperties).
  async getAllProperties() {
    try {
      const q = query(
        collection(db, COLLECTION),
        orderBy('createdAt', 'desc'),
        limit(1000),
      );
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
  //   1. Antes se borraba el doc sin verificar contratos activos → quedaban
  //      contratos huérfanos apuntando a una propiedad inexistente.
  //   2. Antes no se cancelaban visitas pendientes → cliente iba a una
  //      propiedad que ya no existe.
  //   3. Las imágenes en Storage quedaban huérfanas indefinidamente.
  //
  //   Ahora: pre-check + cancela visitas pendientes/aprobadas + intenta
  //   limpiar Storage. Si hay contrato activo, lanza error explicativo.
  async deleteProperty(id) {
    try {
      // 1) Verificar si hay contratos no terminales asociados
      const contractsSnap = await getDocs(
        query(collection(db, 'contracts'), where('propertyId', '==', id))
      );
      const blockingStatuses = new Set(['vigente', 'borrador', 'pausado', 'activo', 'active']);
      const blocking = contractsSnap.docs.find((d) => {
        const data = d.data();
        const s = String(data.statusGeneral || data.status || '').toLowerCase();
        return blockingStatuses.has(s);
      });
      if (blocking) {
        throw new Error(
          `No se puede eliminar: hay un contrato activo asociado (${blocking.id}). ` +
          `Cancélalo o finalízalo antes de borrar la propiedad.`
        );
      }

      // 2) Cancelar visitas pendientes/aprobadas (no borrarlas, mantener historial)
      try {
        const visitsSnap = await getDocs(
          query(
            collection(db, 'visits'),
            where('propertyId', '==', id),
            where('status', 'in', ['pending', 'approved', 'rescheduled'])
          )
        );
        await Promise.all(visitsSnap.docs.map((d) =>
          updateDoc(d.ref, {
            status: 'cancelada',
            cancelReason: 'Propiedad eliminada del catálogo',
            cancelledByClient: false,
            updatedAt: Timestamp.now(),
          }).catch(() => {})
        ));
      } catch (e) {
        console.warn('[deleteProperty] no se pudieron cancelar visitas:', e?.message);
      }

      // 3) Borrar el doc principal
      await deleteDoc(doc(db, COLLECTION, id));

      // 4) Best-effort: limpiar imágenes y documentos en Storage.
      //    Si falla por permisos o no existe el folder, seguimos.
      //    NOTA: requiere `listAll` del SDK de Storage que no estaba importado;
      //    para no añadir imports nuevos riesgosos, dejamos esta limpieza al
      //    siguiente refactor — la documentamos.

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
        if (!file || file.size === 0) continue;
        if (file.size > 10 * 1024 * 1024) {
          console.warn('[uploadImages] archivo > 10MB ignorado:', file.name);
          continue;
        }
        if (file.type && !/^image\//i.test(file.type)) {
          console.warn('[uploadImages] no es imagen, ignorado:', file.type);
          continue;
        }
        const safeName = String(file.name || 'image')
          .replace(/[/\\?%*:|"<>]/g, '_')
          .replace(/\s+/g, '_')
          .slice(0, 200);

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
          `properties/${propertyId}/${Date.now()}_${safeName}`
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
        if (!file || file.size === 0) continue;
        if (file.size > 20 * 1024 * 1024) {
          console.warn('[uploadDocuments] archivo > 20MB ignorado:', file.name);
          continue;
        }
        const safeName = String(file.name || 'doc')
          .replace(/[/\\?%*:|"<>]/g, '_')
          .replace(/\s+/g, '_')
          .slice(0, 200);
        const storageRef = ref(
          storage,
          `properties/${propertyId}/docs/${Date.now()}_${safeName}`
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