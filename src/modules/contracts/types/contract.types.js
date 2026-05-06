/**
 * contract.types.js
 * Modelo central del módulo de contratos.
 *
 * Documento principal Firestore: /contracts/{contractId}
 * Subcolecciones:
 *  - /contracts/{contractId}/milestones     (hitos del proceso)
 *  - /contracts/{contractId}/payments       (cuotas, cánones, arras)
 *  - /contracts/{contractId}/documents      (PDFs / archivos asociados)
 *  - /contracts/{contractId}/history        (auditoría)
 *  - /contracts/{contractId}/alerts_sent    (deduplicación de alertas)
 */

// ─── Estados / Tipos / Modos ────────────────────────────────────────────────

export const CONTRACT_STATUS = Object.freeze({
  DRAFT: "borrador",
  ACTIVE: "vigente",
  PAUSED: "pausado",
  EXPIRED: "vencido",
  COMPLETED: "finalizado",
  CANCELLED: "cancelado",
});

export const CONTRACT_TYPE = Object.freeze({
  SALE: "venta",
  RENT: "arriendo",
  PROMISE: "promesa",
});

export const CONTRACT_OPERATION_MODE = Object.freeze({
  DIRECT_SALE: "venta_directa",
  PROMISE_SALE: "venta_con_promesa",
  MORTGAGE_SALE: "venta_con_credito",
  LEASING_SALE: "venta_con_leasing",
  STANDARD_RENT: "arriendo_estandar",
  ADMIN_RENT: "arriendo_administrado",
  PROMISE_ONLY: "promesa_simple",
});

export const CONTRACT_BUSINESS_STAGE = Object.freeze({
  // Genéricos
  DRAFT: "borrador",
  REVIEW: "revision",
  SIGNED: "firmado",
  ACTIVE: "en_ejecucion",
  COMPLETED: "completado",
  CANCELLED: "cancelado",

  // Venta / promesa / compraventa
  SALE_LEAD: "negociacion",
  SALE_RESERVE: "reserva",
  SALE_PROMISE_SIGNED: "promesa_firmada",
  SALE_INITIAL_PAYMENT: "cuota_inicial",
  SALE_FINANCING: "financiacion",
  SALE_MORTGAGE_APPROVAL: "credito_aprobado",
  SALE_LEASING_APPROVAL: "leasing_aprobado",
  SALE_DEED_DRAFT: "minuta_preparacion",
  SALE_DEED_SIGNED: "escritura_firmada",
  SALE_REGISTERED: "registrado",
  SALE_DELIVERED: "entregado",

  // Arriendo
  RENT_DRAFT: "borrador_arriendo",
  RENT_SIGNED: "arriendo_firmado",
  RENT_ACTIVE: "arriendo_activo",
  RENT_PAYMENT_DUE: "canon_por_vencer",
  RENT_LATE: "canon_en_mora",
  RENT_RENEWAL_WINDOW: "ventana_renovacion",
  RENT_FINISHED: "arriendo_finalizado",
});

// ─── Subcolecciones / pagos / documentos ────────────────────────────────────

export const PAYMENT_STATUS = Object.freeze({
  PENDING: "pendiente",
  PAID: "pagado",
  LATE: "vencido",
  WAIVED: "condonado",
  CANCELLED: "cancelado",
});

export const PAYMENT_KIND = Object.freeze({
  RENT_CANON: "canon",
  ADMIN_FEE: "administracion",
  DEPOSIT: "deposito",
  RESERVATION: "reserva",
  ARRAS: "arras",
  INITIAL_PAYMENT: "cuota_inicial",
  INSTALLMENT: "cuota",
  FINAL_PAYMENT: "saldo_final",
});

export const DOCUMENT_KIND = Object.freeze({
  CONTRACT_PDF: "contrato",
  PROMISE: "promesa",
  DEED: "escritura",
  REGISTRATION_CERT: "certificado_libertad",
  INVENTORY: "inventario",
  HANDOVER_ACT: "acta_entrega",
  PAYMENT_RECEIPT: "comprobante_pago",
  IDENTITY: "documento_identidad",
  OTHER: "otro",
});

export const MILESTONE_STATUS = Object.freeze({
  PENDING: "pendiente",
  CURRENT: "actual",
  DONE: "completado",
  SKIPPED: "omitido",
});

// ─── Labels ─────────────────────────────────────────────────────────────────

export const CONTRACT_STATUS_LABELS = Object.freeze({
  [CONTRACT_STATUS.DRAFT]: "Borrador",
  [CONTRACT_STATUS.ACTIVE]: "Vigente",
  [CONTRACT_STATUS.PAUSED]: "Pausado",
  [CONTRACT_STATUS.EXPIRED]: "Vencido",
  [CONTRACT_STATUS.COMPLETED]: "Finalizado",
  [CONTRACT_STATUS.CANCELLED]: "Cancelado",
});

export const CONTRACT_TYPE_LABELS = Object.freeze({
  [CONTRACT_TYPE.SALE]: "Venta",
  [CONTRACT_TYPE.RENT]: "Arriendo",
  [CONTRACT_TYPE.PROMISE]: "Promesa",
});

export const CONTRACT_OPERATION_MODE_LABELS = Object.freeze({
  [CONTRACT_OPERATION_MODE.DIRECT_SALE]: "Venta directa",
  [CONTRACT_OPERATION_MODE.PROMISE_SALE]: "Venta con promesa",
  [CONTRACT_OPERATION_MODE.MORTGAGE_SALE]: "Venta con crédito",
  [CONTRACT_OPERATION_MODE.LEASING_SALE]: "Venta con leasing",
  [CONTRACT_OPERATION_MODE.STANDARD_RENT]: "Arriendo estándar",
  [CONTRACT_OPERATION_MODE.ADMIN_RENT]: "Arriendo administrado",
  [CONTRACT_OPERATION_MODE.PROMISE_ONLY]: "Promesa simple",
});

export const CONTRACT_BUSINESS_STAGE_LABELS = Object.freeze({
  [CONTRACT_BUSINESS_STAGE.DRAFT]: "Borrador",
  [CONTRACT_BUSINESS_STAGE.REVIEW]: "En revisión",
  [CONTRACT_BUSINESS_STAGE.SIGNED]: "Firmado",
  [CONTRACT_BUSINESS_STAGE.ACTIVE]: "En ejecución",
  [CONTRACT_BUSINESS_STAGE.COMPLETED]: "Completado",
  [CONTRACT_BUSINESS_STAGE.CANCELLED]: "Cancelado",

  [CONTRACT_BUSINESS_STAGE.SALE_LEAD]: "Negociación",
  [CONTRACT_BUSINESS_STAGE.SALE_RESERVE]: "Reserva",
  [CONTRACT_BUSINESS_STAGE.SALE_PROMISE_SIGNED]: "Promesa firmada",
  [CONTRACT_BUSINESS_STAGE.SALE_INITIAL_PAYMENT]: "Cuota inicial",
  [CONTRACT_BUSINESS_STAGE.SALE_FINANCING]: "Financiación",
  [CONTRACT_BUSINESS_STAGE.SALE_MORTGAGE_APPROVAL]: "Crédito aprobado",
  [CONTRACT_BUSINESS_STAGE.SALE_LEASING_APPROVAL]: "Leasing aprobado",
  [CONTRACT_BUSINESS_STAGE.SALE_DEED_DRAFT]: "Preparación de minuta",
  [CONTRACT_BUSINESS_STAGE.SALE_DEED_SIGNED]: "Escritura firmada",
  [CONTRACT_BUSINESS_STAGE.SALE_REGISTERED]: "Registrado",
  [CONTRACT_BUSINESS_STAGE.SALE_DELIVERED]: "Entregado",

  [CONTRACT_BUSINESS_STAGE.RENT_DRAFT]: "Borrador de arriendo",
  [CONTRACT_BUSINESS_STAGE.RENT_SIGNED]: "Arriendo firmado",
  [CONTRACT_BUSINESS_STAGE.RENT_ACTIVE]: "Arriendo activo",
  [CONTRACT_BUSINESS_STAGE.RENT_PAYMENT_DUE]: "Canon por vencer",
  [CONTRACT_BUSINESS_STAGE.RENT_LATE]: "Canon en mora",
  [CONTRACT_BUSINESS_STAGE.RENT_RENEWAL_WINDOW]: "Renovación próxima",
  [CONTRACT_BUSINESS_STAGE.RENT_FINISHED]: "Arriendo finalizado",
});

export const PAYMENT_STATUS_LABELS = Object.freeze({
  [PAYMENT_STATUS.PENDING]: "Pendiente",
  [PAYMENT_STATUS.PAID]: "Pagado",
  [PAYMENT_STATUS.LATE]: "Vencido",
  [PAYMENT_STATUS.WAIVED]: "Condonado",
  [PAYMENT_STATUS.CANCELLED]: "Cancelado",
});

export const PAYMENT_KIND_LABELS = Object.freeze({
  [PAYMENT_KIND.RENT_CANON]: "Canon mensual",
  [PAYMENT_KIND.ADMIN_FEE]: "Administración",
  [PAYMENT_KIND.DEPOSIT]: "Depósito",
  [PAYMENT_KIND.RESERVATION]: "Reserva",
  [PAYMENT_KIND.ARRAS]: "Arras",
  [PAYMENT_KIND.INITIAL_PAYMENT]: "Cuota inicial",
  [PAYMENT_KIND.INSTALLMENT]: "Cuota",
  [PAYMENT_KIND.FINAL_PAYMENT]: "Saldo final",
});

export const DOCUMENT_KIND_LABELS = Object.freeze({
  [DOCUMENT_KIND.CONTRACT_PDF]: "Contrato",
  [DOCUMENT_KIND.PROMISE]: "Promesa de compraventa",
  [DOCUMENT_KIND.DEED]: "Escritura pública",
  [DOCUMENT_KIND.REGISTRATION_CERT]: "Certificado de libertad",
  [DOCUMENT_KIND.INVENTORY]: "Inventario",
  [DOCUMENT_KIND.HANDOVER_ACT]: "Acta de entrega",
  [DOCUMENT_KIND.PAYMENT_RECEIPT]: "Comprobante de pago",
  [DOCUMENT_KIND.IDENTITY]: "Documento de identidad",
  [DOCUMENT_KIND.OTHER]: "Otro",
});

// ─── Colores ────────────────────────────────────────────────────────────────

export const CONTRACT_STATUS_COLORS = Object.freeze({
  [CONTRACT_STATUS.DRAFT]:     { text: "text-[var(--color-text-muted)]",   bg: "bg-slate-500/15",   border: "border-slate-500/30" },
  [CONTRACT_STATUS.ACTIVE]:    { text: "text-green-400",   bg: "bg-green-500/15",   border: "border-green-500/30" },
  [CONTRACT_STATUS.PAUSED]:    { text: "text-blue-400",    bg: "bg-blue-500/15",    border: "border-blue-500/30"  },
  [CONTRACT_STATUS.EXPIRED]:   { text: "text-yellow-400",  bg: "bg-yellow-500/15",  border: "border-yellow-500/30" },
  [CONTRACT_STATUS.COMPLETED]: { text: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/30" },
  [CONTRACT_STATUS.CANCELLED]: { text: "text-red-400",     bg: "bg-red-500/15",     border: "border-red-500/30" },
});

export const CONTRACT_TYPE_COLORS = Object.freeze({
  [CONTRACT_TYPE.SALE]:    { text: "text-blue-400",   bg: "bg-blue-500/15",   border: "border-blue-500/30" },
  [CONTRACT_TYPE.RENT]:    { text: "text-primary",    bg: "bg-primary/15",    border: "border-primary/30"  },
  [CONTRACT_TYPE.PROMISE]: { text: "text-purple-400", bg: "bg-purple-500/15", border: "border-purple-500/30" },
});

export const PAYMENT_STATUS_COLORS = Object.freeze({
  [PAYMENT_STATUS.PENDING]:   { text: "text-[var(--color-text)]",   bg: "bg-slate-500/10",   border: "border-slate-500/30" },
  [PAYMENT_STATUS.PAID]:      { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
  [PAYMENT_STATUS.LATE]:      { text: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/30" },
  [PAYMENT_STATUS.WAIVED]:    { text: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/30" },
  [PAYMENT_STATUS.CANCELLED]: { text: "text-[var(--color-text-muted)]",   bg: "bg-[var(--color-input-bg)]/30",   border: "border-[var(--color-border)]/40" },
});

// ─── Secuencias de etapas por flujo ─────────────────────────────────────────

export const SALE_STAGE_SEQUENCE = Object.freeze([
  CONTRACT_BUSINESS_STAGE.SALE_LEAD,
  CONTRACT_BUSINESS_STAGE.SALE_RESERVE,
  CONTRACT_BUSINESS_STAGE.SALE_PROMISE_SIGNED,
  CONTRACT_BUSINESS_STAGE.SALE_INITIAL_PAYMENT,
  CONTRACT_BUSINESS_STAGE.SALE_FINANCING,
  CONTRACT_BUSINESS_STAGE.SALE_DEED_DRAFT,
  CONTRACT_BUSINESS_STAGE.SALE_DEED_SIGNED,
  CONTRACT_BUSINESS_STAGE.SALE_REGISTERED,
  CONTRACT_BUSINESS_STAGE.SALE_DELIVERED,
]);

export const DIRECT_SALE_STAGE_SEQUENCE = Object.freeze([
  CONTRACT_BUSINESS_STAGE.SALE_LEAD,
  CONTRACT_BUSINESS_STAGE.SALE_RESERVE,
  CONTRACT_BUSINESS_STAGE.SALE_DEED_DRAFT,
  CONTRACT_BUSINESS_STAGE.SALE_DEED_SIGNED,
  CONTRACT_BUSINESS_STAGE.SALE_REGISTERED,
  CONTRACT_BUSINESS_STAGE.SALE_DELIVERED,
]);

export const MORTGAGE_SALE_STAGE_SEQUENCE = Object.freeze([
  CONTRACT_BUSINESS_STAGE.SALE_LEAD,
  CONTRACT_BUSINESS_STAGE.SALE_RESERVE,
  CONTRACT_BUSINESS_STAGE.SALE_PROMISE_SIGNED,
  CONTRACT_BUSINESS_STAGE.SALE_INITIAL_PAYMENT,
  CONTRACT_BUSINESS_STAGE.SALE_FINANCING,
  CONTRACT_BUSINESS_STAGE.SALE_MORTGAGE_APPROVAL,
  CONTRACT_BUSINESS_STAGE.SALE_DEED_DRAFT,
  CONTRACT_BUSINESS_STAGE.SALE_DEED_SIGNED,
  CONTRACT_BUSINESS_STAGE.SALE_REGISTERED,
  CONTRACT_BUSINESS_STAGE.SALE_DELIVERED,
]);

export const LEASING_SALE_STAGE_SEQUENCE = Object.freeze([
  CONTRACT_BUSINESS_STAGE.SALE_LEAD,
  CONTRACT_BUSINESS_STAGE.SALE_RESERVE,
  CONTRACT_BUSINESS_STAGE.SALE_PROMISE_SIGNED,
  CONTRACT_BUSINESS_STAGE.SALE_INITIAL_PAYMENT,
  CONTRACT_BUSINESS_STAGE.SALE_FINANCING,
  CONTRACT_BUSINESS_STAGE.SALE_LEASING_APPROVAL,
  CONTRACT_BUSINESS_STAGE.SALE_DEED_DRAFT,
  CONTRACT_BUSINESS_STAGE.SALE_DEED_SIGNED,
  CONTRACT_BUSINESS_STAGE.SALE_REGISTERED,
  CONTRACT_BUSINESS_STAGE.SALE_DELIVERED,
]);

export const RENT_STAGE_SEQUENCE = Object.freeze([
  CONTRACT_BUSINESS_STAGE.RENT_DRAFT,
  CONTRACT_BUSINESS_STAGE.RENT_SIGNED,
  CONTRACT_BUSINESS_STAGE.RENT_ACTIVE,
  CONTRACT_BUSINESS_STAGE.RENT_RENEWAL_WINDOW,
  CONTRACT_BUSINESS_STAGE.RENT_FINISHED,
]);

export const PROMISE_STAGE_SEQUENCE = Object.freeze([
  CONTRACT_BUSINESS_STAGE.DRAFT,
  CONTRACT_BUSINESS_STAGE.SIGNED,
  CONTRACT_BUSINESS_STAGE.ACTIVE,
  CONTRACT_BUSINESS_STAGE.COMPLETED,
]);

// ─── Alertas ────────────────────────────────────────────────────────────────

export const CONTRACT_ALERT_TYPE = Object.freeze({
  PAYMENT_REMINDER: "recordatorio_pago",
  PAYMENT_DUE: "pago_hoy",
  PAYMENT_LATE: "mora",
  CONTRACT_EXPIRING: "contrato_por_vencer",
  STAGE_CHANGED: "etapa_actualizada",
  DOCUMENT_PENDING: "documento_pendiente",
  RENEWAL_REMINDER: "recordatorio_renovacion",
  PROMISE_DUE: "promesa_por_vencer",
  DEED_DUE: "escritura_por_firmar",
  DELIVERY_DUE: "entrega_proxima",
});

export const CONTRACT_DEFAULT_ALERT_RULES = Object.freeze({
  rent: {
    beforeDueDays: [5, 1],
    onDueDay: true,
    lateDays: [1, 3, 8],
    contractExpiryDays: [60, 30, 15],
    renewalWindowDays: [60, 30],
  },
  sale: {
    promiseDueDays: [5, 1],
    deedSigningDays: [7, 1],
    deliveryDays: [3, 1],
  },
});

// ─── Helpers ────────────────────────────────────────────────────────────────

export function getDefaultOperationModeByType(type) {
  switch (type) {
    case CONTRACT_TYPE.SALE:    return CONTRACT_OPERATION_MODE.PROMISE_SALE;
    case CONTRACT_TYPE.RENT:    return CONTRACT_OPERATION_MODE.STANDARD_RENT;
    case CONTRACT_TYPE.PROMISE: return CONTRACT_OPERATION_MODE.PROMISE_ONLY;
    default:                    return CONTRACT_OPERATION_MODE.STANDARD_RENT;
  }
}

export function getDefaultBusinessStage({ type, operationMode, status } = {}) {
  if (status === CONTRACT_STATUS.CANCELLED) return CONTRACT_BUSINESS_STAGE.CANCELLED;
  if (status === CONTRACT_STATUS.COMPLETED) return CONTRACT_BUSINESS_STAGE.COMPLETED;
  if (status === CONTRACT_STATUS.EXPIRED && type === CONTRACT_TYPE.RENT) {
    return CONTRACT_BUSINESS_STAGE.RENT_FINISHED;
  }

  if (type === CONTRACT_TYPE.RENT) {
    if (status === CONTRACT_STATUS.ACTIVE) return CONTRACT_BUSINESS_STAGE.RENT_ACTIVE;
    return CONTRACT_BUSINESS_STAGE.RENT_DRAFT;
  }

  if (type === CONTRACT_TYPE.PROMISE) {
    if (status === CONTRACT_STATUS.ACTIVE) return CONTRACT_BUSINESS_STAGE.ACTIVE;
    return CONTRACT_BUSINESS_STAGE.DRAFT;
  }

  if (type === CONTRACT_TYPE.SALE) {
    if (operationMode === CONTRACT_OPERATION_MODE.DIRECT_SALE) {
      return status === CONTRACT_STATUS.ACTIVE
        ? CONTRACT_BUSINESS_STAGE.SALE_DEED_DRAFT
        : CONTRACT_BUSINESS_STAGE.SALE_LEAD;
    }
    if (operationMode === CONTRACT_OPERATION_MODE.MORTGAGE_SALE ||
        operationMode === CONTRACT_OPERATION_MODE.LEASING_SALE) {
      return status === CONTRACT_STATUS.ACTIVE
        ? CONTRACT_BUSINESS_STAGE.SALE_FINANCING
        : CONTRACT_BUSINESS_STAGE.SALE_LEAD;
    }
    return status === CONTRACT_STATUS.ACTIVE
      ? CONTRACT_BUSINESS_STAGE.SALE_PROMISE_SIGNED
      : CONTRACT_BUSINESS_STAGE.SALE_LEAD;
  }

  return CONTRACT_BUSINESS_STAGE.DRAFT;
}

export function getStageSequenceByContract({ type, operationMode } = {}) {
  if (type === CONTRACT_TYPE.RENT)    return RENT_STAGE_SEQUENCE;
  if (type === CONTRACT_TYPE.PROMISE) return PROMISE_STAGE_SEQUENCE;
  if (type === CONTRACT_TYPE.SALE) {
    if (operationMode === CONTRACT_OPERATION_MODE.DIRECT_SALE)   return DIRECT_SALE_STAGE_SEQUENCE;
    if (operationMode === CONTRACT_OPERATION_MODE.MORTGAGE_SALE) return MORTGAGE_SALE_STAGE_SEQUENCE;
    if (operationMode === CONTRACT_OPERATION_MODE.LEASING_SALE)  return LEASING_SALE_STAGE_SEQUENCE;
    return SALE_STAGE_SEQUENCE;
  }
  return [];
}

export function getStageProgress(contract) {
  const sequence = getStageSequenceByContract({
    type: contract?.type,
    operationMode: contract?.operationMode,
  });
  if (!sequence.length) return { idx: -1, total: 0, percent: 0 };
  const stage = resolveContractBusinessStage(contract);
  const idx = sequence.indexOf(stage);
  if (idx < 0) return { idx: 0, total: sequence.length, percent: 0 };
  return {
    idx,
    total: sequence.length,
    percent: Math.round(((idx + 1) / sequence.length) * 100),
  };
}

export function getStageLabel(stage) {
  return CONTRACT_BUSINESS_STAGE_LABELS[stage] ?? stage ?? "Sin etapa";
}
export function getStatusLabel(status) {
  return CONTRACT_STATUS_LABELS[status] ?? status ?? "Sin estado";
}
export function getTypeLabel(type) {
  return CONTRACT_TYPE_LABELS[type] ?? type ?? "Sin tipo";
}
export function getOperationModeLabel(operationMode) {
  return CONTRACT_OPERATION_MODE_LABELS[operationMode] ?? operationMode ?? "Sin modalidad";
}
export function getPaymentStatusLabel(status) {
  return PAYMENT_STATUS_LABELS[status] ?? status ?? "—";
}
export function getDocumentKindLabel(kind) {
  return DOCUMENT_KIND_LABELS[kind] ?? kind ?? "Otro";
}

export function isSaleContract(contract = {})    { return contract.type === CONTRACT_TYPE.SALE; }
export function isRentContract(contract = {})    { return contract.type === CONTRACT_TYPE.RENT; }
export function isPromiseContract(contract = {}) { return contract.type === CONTRACT_TYPE.PROMISE; }
export function isContractFinished(contract = {}) {
  return [
    CONTRACT_STATUS.EXPIRED,
    CONTRACT_STATUS.COMPLETED,
    CONTRACT_STATUS.CANCELLED,
  ].includes(contract.statusGeneral || contract.status);
}

export function getLegacyStageFromStatus(status, type) {
  if (status === CONTRACT_STATUS.CANCELLED) return CONTRACT_BUSINESS_STAGE.CANCELLED;

  if (type === CONTRACT_TYPE.RENT) {
    if (status === CONTRACT_STATUS.ACTIVE)  return CONTRACT_BUSINESS_STAGE.RENT_ACTIVE;
    if (status === CONTRACT_STATUS.EXPIRED) return CONTRACT_BUSINESS_STAGE.RENT_FINISHED;
    return CONTRACT_BUSINESS_STAGE.RENT_DRAFT;
  }

  if (type === CONTRACT_TYPE.PROMISE) {
    if (status === CONTRACT_STATUS.ACTIVE) return CONTRACT_BUSINESS_STAGE.ACTIVE;
    if (status === CONTRACT_STATUS.EXPIRED || status === CONTRACT_STATUS.COMPLETED) {
      return CONTRACT_BUSINESS_STAGE.COMPLETED;
    }
    return CONTRACT_BUSINESS_STAGE.DRAFT;
  }

  if (type === CONTRACT_TYPE.SALE) {
    if (status === CONTRACT_STATUS.ACTIVE) return CONTRACT_BUSINESS_STAGE.SALE_REGISTERED;
    if (status === CONTRACT_STATUS.EXPIRED || status === CONTRACT_STATUS.COMPLETED) {
      return CONTRACT_BUSINESS_STAGE.SALE_DELIVERED;
    }
    return CONTRACT_BUSINESS_STAGE.SALE_LEAD;
  }

  return CONTRACT_BUSINESS_STAGE.DRAFT;
}

export function resolveContractBusinessStage(contract = {}) {
  if (contract.businessStage) return contract.businessStage;
  return getLegacyStageFromStatus(contract.statusGeneral || contract.status, contract.type);
}

// ─── Mapeo etapa → estado de propiedad ──────────────────────────────────────
//
// Un único lugar donde se define cómo una etapa de contrato afecta el
// `status` de la propiedad asociada. Lo consume contract.service._syncPropertyStatus.
//
// IMPORTANTE: estos valores deben coincidir con los del enum canónico
// `PROPERTY_STATUS` en src/modules/properties/types/property.types.js.
// Los valores legacy (disponible/reservada/arrendada/vendida) se aceptan
// en lectura pero NO se escriben — todo escribe el enum en inglés.

export const PROPERTY_STATUS = Object.freeze({
  AVAILABLE: "published",
  RESERVED: "reserved",
  RENTED: "rented",
  SOLD: "sold",
});

export function getPropertyStatusFromContract(contract = {}) {
  const stage = resolveContractBusinessStage(contract);
  const statusGeneral = contract.statusGeneral || contract.status;

  // Contratos finalizados/cancelados liberan la propiedad
  if (statusGeneral === CONTRACT_STATUS.CANCELLED) return PROPERTY_STATUS.AVAILABLE;

  if (isRentContract(contract)) {
    if (statusGeneral === CONTRACT_STATUS.EXPIRED ||
        statusGeneral === CONTRACT_STATUS.COMPLETED ||
        stage === CONTRACT_BUSINESS_STAGE.RENT_FINISHED) {
      return PROPERTY_STATUS.AVAILABLE;
    }
    if (statusGeneral === CONTRACT_STATUS.ACTIVE ||
        stage === CONTRACT_BUSINESS_STAGE.RENT_SIGNED ||
        stage === CONTRACT_BUSINESS_STAGE.RENT_ACTIVE) {
      return PROPERTY_STATUS.RENTED;
    }
    return null;
  }

  if (isSaleContract(contract)) {
    if (stage === CONTRACT_BUSINESS_STAGE.SALE_REGISTERED ||
        stage === CONTRACT_BUSINESS_STAGE.SALE_DELIVERED ||
        statusGeneral === CONTRACT_STATUS.COMPLETED) {
      return PROPERTY_STATUS.SOLD;
    }
    if (stage === CONTRACT_BUSINESS_STAGE.SALE_RESERVE ||
        stage === CONTRACT_BUSINESS_STAGE.SALE_PROMISE_SIGNED ||
        stage === CONTRACT_BUSINESS_STAGE.SALE_INITIAL_PAYMENT ||
        stage === CONTRACT_BUSINESS_STAGE.SALE_FINANCING ||
        stage === CONTRACT_BUSINESS_STAGE.SALE_MORTGAGE_APPROVAL ||
        stage === CONTRACT_BUSINESS_STAGE.SALE_LEASING_APPROVAL ||
        stage === CONTRACT_BUSINESS_STAGE.SALE_DEED_DRAFT ||
        stage === CONTRACT_BUSINESS_STAGE.SALE_DEED_SIGNED) {
      return PROPERTY_STATUS.RESERVED;
    }
    return null;
  }

  if (isPromiseContract(contract)) {
    if (statusGeneral === CONTRACT_STATUS.ACTIVE ||
        stage === CONTRACT_BUSINESS_STAGE.SIGNED ||
        stage === CONTRACT_BUSINESS_STAGE.ACTIVE) {
      return PROPERTY_STATUS.RESERVED;
    }
    if (statusGeneral === CONTRACT_STATUS.COMPLETED) {
      return PROPERTY_STATUS.SOLD;
    }
    return null;
  }

  return null;
}

// ─── Snapshots / payloads ───────────────────────────────────────────────────

export function buildContractSnapshot(property = {}, extras = {}) {
  return {
    propertyTitle: property.title ?? property.name ?? "",
    propertyAddress:
      property.address ??
      property.location?.addressPublic ??
      property.location?.address ??
      "",
    propertyType: property.type ?? "",
    transactionType: property.transactionType ?? "",
    city: property.city ?? property.location?.city ?? "",
    department: property.department ?? property.location?.department ?? "",
    neighborhood: property.neighborhood ?? property.location?.neighborhood ?? "",
    salePrice: property.price?.sale ?? null,
    rentPrice: property.price?.rent ?? null,
    canonicalValue:
      property.price?.sale ?? property.price?.rent ?? property.price ?? 0,
    ...extras,
  };
}

export function buildInitialFinancialState({
  type = CONTRACT_TYPE.RENT,
  value = 0,
  currency = "COP",
  paymentDay = null,
  adminFee = 0,
  deposit = 0,
  initialPayment = 0,
  balance = 0,
} = {}) {
  return {
    currency,
    baseValue: Number(value) || 0,
    paymentDay: paymentDay ? Number(paymentDay) : null,
    adminFee: Number(adminFee) || 0,
    deposit: Number(deposit) || 0,
    initialPayment: Number(initialPayment) || 0,
    balance: Number(balance) || 0,
    lastIncrementDate: null,
    nextIncrementDate: null,
    ipcRateApplied: null,
    billingFrequency: type === CONTRACT_TYPE.RENT ? "mensual" : null,
  };
}

export function createContractPayload({
  type = CONTRACT_TYPE.RENT,
  operationMode,
  propertyId = null,
  propertyName = "",
  propertyAddress = "",
  propertySnapshot = null,
  clientId = null,
  clientName = "",
  clientEmail = "",
  clientPhone = "",
  agentId = null,
  agentName = "",
  agentEmail = "",
  startDate = "",
  endDate = "",
  value = 0,
  currency = "COP",
  status = CONTRACT_STATUS.DRAFT,
  businessStage,
  documentUrl = null,
  notes = "",
  tags = [],
  alerts = null,
  financial = null,
  milestonesSummary = [],
  createdBy = "",
} = {}) {
  const resolvedOperationMode = operationMode || getDefaultOperationModeByType(type);
  const resolvedBusinessStage =
    businessStage ||
    getDefaultBusinessStage({ type, operationMode: resolvedOperationMode, status });

  // Normalizar emails a lowercase para que las queries funcionen siempre
  const normEmail = (e) => String(e || "").trim().toLowerCase();

  return {
    type,
    operationMode: resolvedOperationMode,
    status,
    statusGeneral: status,
    businessStage: resolvedBusinessStage,

    propertyId,
    propertyName,
    propertyAddress,
    propertySnapshot: propertySnapshot || null,

    clientId,
    clientName,
    clientEmail: normEmail(clientEmail),
    clientPhone,

    agentId,
    agentName,
    agentEmail: normEmail(agentEmail),

    startDate,
    endDate,

    value: Number(value) || 0,
    currency,

    financial:
      financial ||
      buildInitialFinancialState({ type, value, currency }),

    alerts:
      alerts ||
      (type === CONTRACT_TYPE.RENT
        ? CONTRACT_DEFAULT_ALERT_RULES.rent
        : CONTRACT_DEFAULT_ALERT_RULES.sale),

    milestonesSummary: Array.isArray(milestonesSummary) ? milestonesSummary : [],
    tags: Array.isArray(tags) ? tags.filter(Boolean) : [],

    documentUrl,
    notes,
    createdBy: normEmail(createdBy),
  };
}