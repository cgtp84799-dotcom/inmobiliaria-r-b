/**
 * Tipos y constantes del módulo de visitas.
 * Una sola fuente de verdad — nunca hardcodear strings de estado en otros archivos.
 */

export const VISIT_STATUS = {
  PENDING:   'pending',
  APPROVED:  'approved',
  REJECTED:  'rejected',
  COMPLETED: 'completed',
};

export const VISIT_STATUS_LABELS = {
  [VISIT_STATUS.PENDING]:   'Pendiente',
  [VISIT_STATUS.APPROVED]:  'Aprobada',
  [VISIT_STATUS.REJECTED]:  'Rechazada',
  [VISIT_STATUS.COMPLETED]: 'Completada',
};

export const VISIT_STATUS_COLORS = {
  [VISIT_STATUS.PENDING]:   { text: 'text-yellow-400', bg: 'bg-yellow-500/15', border: 'border-yellow-500/30' },
  [VISIT_STATUS.APPROVED]:  { text: 'text-green-400',  bg: 'bg-green-500/15',  border: 'border-green-500/30'  },
  [VISIT_STATUS.REJECTED]:  { text: 'text-red-400',    bg: 'bg-red-500/15',    border: 'border-red-500/30'    },
  [VISIT_STATUS.COMPLETED]: { text: 'text-sky-400',    bg: 'bg-sky-500/15',    border: 'border-sky-500/30'    },
};

/**
 * Crea el objeto base para un nuevo documento de visita.
 * Se llama desde ScheduleVisitPage y desde el servicio.
 */
export function createVisitPayload({
  propertyId,
  propertyName,
  propertyAddress,
  clientName,
  clientEmail,
  clientPhone,
  requestedDate,
  requestedTime,
  notes = '',
  agentId    = null,
  agentName  = null,
  agentEmail = null,
}) {
  return {
    propertyId,
    propertyName,
    propertyAddress,
    clientName,
    clientEmail,
    clientPhone,
    agentId,
    agentName,
    agentEmail,
    requestedDate,
    requestedTime,
    notes,
    adminNotes: '',
    status: VISIT_STATUS.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
