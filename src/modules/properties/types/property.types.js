export const PROPERTY_TYPES = {
  HOUSE: 'house',
  APARTMENT: 'apartment',
  LOT: 'lot',
  FARM: 'farm',
  LOCAL: 'local',
  WAREHOUSE: 'warehouse',
};

export const TRANSACTION_TYPES = {
  RENT: 'rent',
  SALE: 'sale',
  BOTH: 'both',
};

export const PROPERTY_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  RESERVED: 'reserved',
  SOLD: 'sold',
  RENTED: 'rented',
  INACTIVE: 'inactive',
};

// Status que aparecen en el catálogo público (Firestore Rules permiten leer
// solo `status == 'published'`, las demás se filtran solo internamente).
export const PUBLIC_STATUSES = Object.freeze([
  PROPERTY_STATUS.PUBLISHED,
]);

// Mapa de aliases legacy → status canónico. La data antigua puede tener
// 'disponible' / 'active' / 'available'; todos se tratan como 'published'.
const LEGACY_STATUS_MAP = {
  disponible: PROPERTY_STATUS.PUBLISHED,
  available: PROPERTY_STATUS.PUBLISHED,
  active: PROPERTY_STATUS.PUBLISHED,
  reservada: PROPERTY_STATUS.RESERVED,
  vendida: PROPERTY_STATUS.SOLD,
  arrendada: PROPERTY_STATUS.RENTED,
  inactiva: PROPERTY_STATUS.INACTIVE,
  borrador: PROPERTY_STATUS.DRAFT,
};

/**
 * Normaliza un status arbitrario al enum canónico.
 * Acepta aliases legacy en español/inglés.
 * Si el valor es vacío o desconocido, devuelve PUBLISHED (default permisivo
 * para datos viejos sin status).
 */
export function normalizePropertyStatus(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return PROPERTY_STATUS.PUBLISHED;
  if (LEGACY_STATUS_MAP[raw]) return LEGACY_STATUS_MAP[raw];
  // Si ya es un status canónico, devolverlo tal cual.
  if (Object.values(PROPERTY_STATUS).includes(raw)) return raw;
  return PROPERTY_STATUS.PUBLISHED;
}

/**
 * Indica si la propiedad debe aparecer en el catálogo público.
 * Usar siempre este helper en queries de cliente y en triggers de backend.
 */
export function isPublicStatus(value) {
  return PUBLIC_STATUSES.includes(normalizePropertyStatus(value));
}