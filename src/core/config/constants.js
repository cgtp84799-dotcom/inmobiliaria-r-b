// src/core/config/constants.js
//
// y estados de contratos que NO coincidían con el sistema real:
//   - USER_ROLES.AGENT/LAWYER/CLIENT  → real es ADMIN/MEMBER/VIEWER
//   - CONTRACT_STATUS.PENDING_SIGNATURE → real es 'borrador' / 'vigente' / etc.
//
// Estaban en dead code (nadie los importaba), pero su mera existencia confunde
// a futuros desarrolladores. Ahora este archivo solo re-exporta de las
// fuentes-de-verdad para mantener un único lugar canónico.
//
// Si necesitas USER_ROLES, importa desde:
//   src/modules/users/types/user.types.js
//
// Si necesitas CONTRACT_STATUS / CONTRACT_TYPE / CONTRACT_BUSINESS_STAGE:
//   src/modules/contracts/types/contract.types.js

export {
  USER_ROLES,
  USER_STATUS,
  USER_ROLE_LABELS,
  ROLE_PERMISSIONS,
  hasPermission,
} from '../../modules/users/types/user.types';

export {
  CONTRACT_STATUS,
  CONTRACT_TYPE,
  CONTRACT_BUSINESS_STAGE,
  CONTRACT_OPERATION_MODE,
} from '../../modules/contracts/types/contract.types';

// ─── Constantes propias del proyecto que SÍ están bien tipadas ──────────────

// Estados de propiedades (espejo de los valores que el frontend escribe en
// /properties.status — coincide con storage.rules y firestore.rules).
export const PROPERTY_STATUS = Object.freeze({
  AVAILABLE: 'disponible',
  SOLD:      'vendida',
  RENTED:    'arrendada',
  RESERVED:  'reservada',
});

export const PROPERTY_TYPES = Object.freeze({
  HOUSE:      'casa',
  APARTMENT:  'apartamento',
  COMMERCIAL: 'local',
  OFFICE:     'oficina',
  LOT:        'lote',
});

export const TRANSACTION_TYPES = Object.freeze({
  SALE: 'venta',
  RENT: 'arriendo',
  BOTH: 'venta-arriendo',
});

// Documentos obligatorios para una propiedad en el flujo legal colombiano.
export const REQUIRED_DOCUMENTS = Object.freeze([
  { id: 'escritura',           name: 'Escritura pública',                   required: true },
  { id: 'certificadoLibertad', name: 'Certificado de libertad y tradición', required: true },
  { id: 'impuestoPredial',     name: 'Paz y salvo de impuesto predial',     required: true },
  { id: 'serviciosPublicos',   name: 'Paz y salvo de servicios públicos',   required: true },
  { id: 'cedulaCatastral',     name: 'Cédula catastral',                    required: true },
]);