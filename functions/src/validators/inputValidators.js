// functions/src/validators/inputValidators.js
// ═════════════════════════════════════════════════════════════════════════════
// Validadores de entrada para Cloud Functions — Zod schemas
// ═════════════════════════════════════════════════════════════════════════════

const { z } = require("zod");

// ═════════════════════════════════════════════════════════════════════════════
// USER VALIDATORS
// ═════════════════════════════════════════════════════════════════════════════

const createUserSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Password debe tener al menos 8 caracteres"),
  displayName: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  role: z.enum(["admin", "member", "viewer"]).default("member"),
  status: z.enum(["active", "inactive", "pending", "blocked"]).default("active"),
});

const updateUserSchema = z.object({
  displayName: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  role: z.enum(["admin", "member", "viewer"]).optional(),
  status: z.enum(["active", "inactive", "pending", "blocked"]).optional(),
  disabled: z.boolean().optional(),
});

const deleteUserSchema = z.object({
  userId: z.string().email("userId debe ser un email válido"),
});

// ═════════════════════════════════════════════════════════════════════════════
// PROPERTY VALIDATORS
// ═════════════════════════════════════════════════════════════════════════════

const propertyBaseSchema = z.object({
  title: z.string().min(5, "Título debe tener al menos 5 caracteres").max(200),
  type: z.string().min(2).max(50),
  transactionType: z.enum(["venta", "sale", "arriendo", "rent"]),
  price: z.number().positive("Precio debe ser positivo").max(999999999),
  status: z.enum(["disponible", "reservada", "vendida", "arrendada", "published", "active"]).optional(),
  city: z.string().min(2).max(100),
  department: z.string().min(2).max(100).optional(),
  address: z.string().max(300).optional(),
  description: z.string().max(5000).optional(),
  features: z.object({
    rooms: z.number().int().min(0).max(50).optional(),
    bathrooms: z.number().int().min(0).max(20).optional(),
    area: z.number().positive().optional(),
    garage: z.boolean().optional(),
    pool: z.boolean().optional(),
  }).optional(),
  images: z.array(z.string().url()).max(20).optional(),
});

// ═════════════════════════════════════════════════════════════════════════════
// CONTRACT VALIDATORS
// ═════════════════════════════════════════════════════════════════════════════

const createContractSchema = z.object({
  propertyId: z.string().min(1, "propertyId es requerido"),
  clientEmail: z.string().email("Email de cliente inválido"),
  agentEmail: z.string().email("Email de agente inválido").optional(),
  type: z.enum(["compra", "arriendo", "administracion"]),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  monthlyValue: z.number().positive().optional(),
  deposit: z.number().int().min(0).optional(),
});

const updateContractSchema = z.object({
  statusGeneral: z.enum(["borrador", "vigente", "terminado", "cancelado"]).optional(),
  stage: z.string().max(50).optional(),
  notes: z.string().max(2000).optional(),
  monthlyValue: z.number().positive().optional(),
});

// ═════════════════════════════════════════════════════════════════════════════
// VISIT VALIDATORS
// ═════════════════════════════════════════════════════════════════════════════

const createVisitSchema = z.object({
  propertyId: z.string().min(1, "propertyId es requerido"),
  clientName: z.string().min(2, "Nombre de cliente requerido").max(100),
  clientEmail: z.string().email("Email de cliente inválido"),
  clientPhone: z.string().min(7).max(20),
  requestedDate: z.string().min(1, "Fecha requerida"),
  requestedTime: z.string().min(1, "Hora requerida"),
  notes: z.string().max(1000).optional(),
});

const updateVisitSchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "rescheduled", "cancelada", "completed"]).optional(),
  proposedDate: z.string().optional(),
  proposedTime: z.string().optional(),
  agentId: z.string().optional(),
  adminNotes: z.string().max(1000).optional(),
});

// ═════════════════════════════════════════════════════════════════════════════
// CLIENT VALIDATORS
// ═════════════════════════════════════════════════════════════════════════════

const createClientSchema = z.object({
  name: z.string().min(2, "Nombre requerido").max(100),
  email: z.string().email("Email inválido"),
  phone: z.string().min(7).max(20),
  tipoCliente: z.enum(["portal", "lead", "prospecto"]).default("lead"),
  estado: z.enum(["activo", "inactivo"]).default("activo"),
  tipoPropiedad: z.string().max(50).optional(),
  presupuesto: z.number().positive().optional(),
  ubicacionInteres: z.string().max(100).optional(),
});

// ═════════════════════════════════════════════════════════════════════════════
// ACCESS REQUEST VALIDATORS
// ═════════════════════════════════════════════════════════════════════════════

const accessRequestSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(7).max(20),
  company: z.string().max(100).optional(),
  message: z.string().max(1000).optional(),
});

// ═════════════════════════════════════════════════════════════════════════════
// CONTACT VALIDATORS
// ═════════════════════════════════════════════════════════════════════════════

const contactSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(7).max(20).optional(),
  message: z.string().min(10).max(2000),
  propertyId: z.string().optional(),
  interest: z.enum(["venta", "arriendo", "informacion"]).optional(),
});

// ═════════════════════════════════════════════════════════════════════════════
// VALIDATION HELPER
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Valida un schema y retorna el resultado o lanza error
 * @param {object} schema - Schema Zod
 * @param {object} data - Datos a validar
 * @returns {object} Datos validados
 */
function validateInput(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`);
    const err = new Error(`Validación fallida: ${errors.join(", ")}`);
    err.status = 400;
    err.validationErrors = errors;
    throw err;
  }
  return result.data;
}

/**
 * Valida el cuerpo de una request de Cloud Function
 * @param {object} req - Request de Firebase
 * @param {object} schema - Schema Zod
 * @returns {object} Datos validados
 */
function validateRequestBody(req, schema) {
  const body = req.body?.data || req.body || {};
  return validateInput(schema, body);
}

module.exports = {
  // Schemas
  createUserSchema,
  updateUserSchema,
  deleteUserSchema,
  propertyBaseSchema,
  createContractSchema,
  updateContractSchema,
  createVisitSchema,
  updateVisitSchema,
  createClientSchema,
  accessRequestSchema,
  contactSchema,
  // Helpers
  validateInput,
  validateRequestBody,
};