export const DOCUMENT_CATEGORIES = {
  CONTRACT: 'contract',
  DEED: 'deed',
  CERTIFICATE: 'certificate',
  IDENTITY: 'identity',
  POWER_OF_ATTORNEY: 'power_of_attorney',
  APPRAISAL: 'appraisal',
  TITLE_STUDY: 'title_study',
  OTHER: 'other'
};

export const DOCUMENT_CATEGORY_LABELS = {
  [DOCUMENT_CATEGORIES.CONTRACT]: 'Contratos',
  [DOCUMENT_CATEGORIES.DEED]: 'Escrituras',
  [DOCUMENT_CATEGORIES.CERTIFICATE]: 'Certificados',
  [DOCUMENT_CATEGORIES.IDENTITY]: 'Documentos de identidad',
  [DOCUMENT_CATEGORIES.POWER_OF_ATTORNEY]: 'Poderes notariales',
  [DOCUMENT_CATEGORIES.APPRAISAL]: 'Avalúos',
  [DOCUMENT_CATEGORIES.TITLE_STUDY]: 'Estudios de títulos',
  [DOCUMENT_CATEGORIES.OTHER]: 'Otros'
};

export const CONTRACT_TYPES = {
  RENT: 'rent',
  SALE: 'sale',
  PROMISE: 'promise',
  ADMINISTRATION: 'administration',
  MANDATE: 'mandate'
};

export const CONTRACT_TYPE_LABELS = {
  [CONTRACT_TYPES.RENT]: 'Contrato de arriendo',
  [CONTRACT_TYPES.SALE]: 'Contrato de compraventa',
  [CONTRACT_TYPES.PROMISE]: 'Promesa de compraventa',
  [CONTRACT_TYPES.ADMINISTRATION]: 'Contrato de administración',
  [CONTRACT_TYPES.MANDATE]: 'Contrato de mandato'
};

export const REQUIRED_DOCUMENTS = [
  { id: 'escritura',           name: 'Escritura pública',                   required: true },
  { id: 'certificadoLibertad', name: 'Certificado de libertad y tradición', required: true },
  { id: 'impuestoPredial',     name: 'Paz y salvo de impuesto predial',      required: true },
  { id: 'serviciosPublicos',   name: 'Paz y salvo de servicios públicos',    required: true },
  { id: 'cedulaCatastral',     name: 'Cédula catastral',                     required: true },
];