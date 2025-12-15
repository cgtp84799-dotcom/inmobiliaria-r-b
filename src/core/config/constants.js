// Roles de usuario
export const USER_ROLES = {
  ADMIN: 'admin',
  AGENT: 'agent',
  LAWYER: 'lawyer',
  CLIENT: 'client'
};

// Estados de propiedades
export const PROPERTY_STATUS = {
  AVAILABLE: 'disponible',
  SOLD: 'vendida',
  RENTED: 'arrendada',
  RESERVED: 'reservada'
};

// Tipos de propiedad
export const PROPERTY_TYPES = {
  HOUSE: 'casa',
  APARTMENT: 'apartamento',
  COMMERCIAL: 'local',
  OFFICE: 'oficina',
  LOT: 'lote'
};

// Tipos de transacción
export const TRANSACTION_TYPES = {
  SALE: 'venta',
  RENT: 'arriendo',
  BOTH: 'venta-arriendo'
};

// Documentos obligatorios
export const REQUIRED_DOCUMENTS = [
  { id: 'escritura', name: 'Escritura pública', required: true },
  { id: 'certificadoLibertad', name: 'Certificado de libertad y tradición', required: true },
  { id: 'impuestoPredial', name: 'Paz y salvo de impuesto predial', required: true },
  { id: 'serviciosPublicos', name: 'Paz y salvo de servicios públicos', required: true },
  { id: 'cedulaCatastral', name: 'Cédula catastral', required: true }
];

// Estados de contratos
export const CONTRACT_STATUS = {
  DRAFT: 'draft',
  REVIEW: 'review',
  PENDING_SIGNATURE: 'pending_signature',
  SIGNED: 'signed',
  REGISTERED: 'registered',
  COMPLETED: 'completed'
};

// Tipos de notificaciones
export const NOTIFICATION_TYPES = {
  PROPERTY_UPDATE: 'property_update',
  NEW_MESSAGE: 'new_message',
  TASK_REMINDER: 'task_reminder',
  DOCUMENT_EXPIRING: 'document_expiring',
  NEW_INQUIRY: 'new_inquiry'
};