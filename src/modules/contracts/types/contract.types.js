/**
 * contract.types.js — constantes, helpers y schema del módulo de contratos.
 *
 * Schema Firestore  /contracts/{contractId}:
 * {
 *   type:             'venta' | 'arriendo' | 'promesa',
 *   propertyId,  propertyName,  propertyAddress,
 *   clientId,    clientName,    clientEmail,
 *   agentId,     agentName,     agentEmail,
 *   startDate,   endDate,
 *   value,       currency: 'COP',
 *   status:       'vigente' | 'vencido' | 'cancelado' | 'borrador',
 *   documentUrl,
 *   notes,
 *   createdAt,   updatedAt,   createdBy
 * }
 */

export const CONTRACT_STATUS = {
  DRAFT:     'borrador',
  ACTIVE:    'vigente',
  EXPIRED:   'vencido',
  CANCELLED: 'cancelado',
};

export const CONTRACT_TYPE = {
  SALE:    'venta',
  RENT:    'arriendo',
  PROMISE: 'promesa',
};

export const CONTRACT_STATUS_LABELS = {
  [CONTRACT_STATUS.DRAFT]:     'Borrador',
  [CONTRACT_STATUS.ACTIVE]:    'Vigente',
  [CONTRACT_STATUS.EXPIRED]:   'Vencido',
  [CONTRACT_STATUS.CANCELLED]: 'Cancelado',
};

export const CONTRACT_TYPE_LABELS = {
  [CONTRACT_TYPE.SALE]:    'Venta',
  [CONTRACT_TYPE.RENT]:    'Arriendo',
  [CONTRACT_TYPE.PROMISE]: 'Promesa',
};

// Colores Tailwind por estado
export const CONTRACT_STATUS_COLORS = {
  [CONTRACT_STATUS.DRAFT]:     { text: 'text-slate-400',  bg: 'bg-slate-500/15',  border: 'border-slate-500/30'  },
  [CONTRACT_STATUS.ACTIVE]:    { text: 'text-green-400',  bg: 'bg-green-500/15',  border: 'border-green-500/30'  },
  [CONTRACT_STATUS.EXPIRED]:   { text: 'text-yellow-400', bg: 'bg-yellow-500/15', border: 'border-yellow-500/30' },
  [CONTRACT_STATUS.CANCELLED]: { text: 'text-red-400',    bg: 'bg-red-500/15',    border: 'border-red-500/30'    },
};

// Colores Tailwind por tipo
export const CONTRACT_TYPE_COLORS = {
  [CONTRACT_TYPE.SALE]:    { text: 'text-blue-400',   bg: 'bg-blue-500/15',   border: 'border-blue-500/30'   },
  [CONTRACT_TYPE.RENT]:    { text: 'text-primary',     bg: 'bg-primary/15',    border: 'border-primary/30'    },
  [CONTRACT_TYPE.PROMISE]: { text: 'text-purple-400', bg: 'bg-purple-500/15', border: 'border-purple-500/30' },
};

/**
 * Crea el payload base para un nuevo contrato.
 * Todos los campos opcionales se inicializan con valores seguros.
 */
export function createContractPayload({
  type          = CONTRACT_TYPE.RENT,
  propertyId    = null,
  propertyName  = '',
  propertyAddress = '',
  clientId      = null,
  clientName    = '',
  clientEmail   = '',
  agentId       = null,
  agentName     = '',
  agentEmail    = '',
  startDate     = '',
  endDate       = '',
  value         = 0,
  currency      = 'COP',
  status        = CONTRACT_STATUS.DRAFT,
  documentUrl   = null,
  notes         = '',
  createdBy     = '',
} = {}) {
  return {
    type,
    propertyId, propertyName, propertyAddress,
    clientId,   clientName,   clientEmail,
    agentId,    agentName,    agentEmail,
    startDate,  endDate,
    value:    Number(value) || 0,
    currency,
    status,
    documentUrl,
    notes,
    createdBy,
  };
}
