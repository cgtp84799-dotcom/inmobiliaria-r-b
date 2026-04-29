// tests/functions/inputValidators.test.js
// ═════════════════════════════════════════════════════════════════════════════
// Tests para validadores de Cloud Functions
// ═════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import {
  createUserSchema,
  updateUserSchema,
  deleteUserSchema,
  propertyBaseSchema,
  createContractSchema,
  createVisitSchema,
  createClientSchema,
  accessRequestSchema,
  contactSchema,
  validateInput,
  validateRequestBody,
} from '../../functions/src/validators/inputValidators';

describe('createUserSchema', () => {
  it('✅ acepta usuario válido', () => {
    const valid = {
      email: 'test@example.com',
      password: 'password123',
      displayName: 'Test User',
      phone: '+573001234567',
      role: 'member',
      status: 'active',
    };
    expect(() => createUserSchema.parse(valid)).not.toThrow();
  });

  it('❌ rechaza email inválido', () => {
    const invalid = {
      email: 'not-an-email',
      password: 'password123',
    };
    expect(() => createUserSchema.parse(invalid)).toThrow();
  });

  it('❌ rechaza password corta', () => {
    const invalid = {
      email: 'test@example.com',
      password: '123',
    };
    expect(() => createUserSchema.parse(invalid)).toThrow();
  });

  it('❌ rechaza rol inválido', () => {
    const invalid = {
      email: 'test@example.com',
      password: 'password123',
      role: 'superadmin',
    };
    expect(() => createUserSchema.parse(invalid)).toThrow();
  });

  it('✅ acepta valores por defecto opcionales', () => {
    const minimal = {
      email: 'test@example.com',
      password: 'password123',
    };
    const result = createUserSchema.parse(minimal);
    expect(result.role).toBe('member');
    expect(result.status).toBe('active');
  });
});

describe('deleteUserSchema', () => {
  it('✅ acepta userId como email', () => {
    const valid = { userId: 'admin@example.com' };
    expect(() => deleteUserSchema.parse(valid)).not.toThrow();
  });

  it('❌ rechaza userId que no es email', () => {
    const invalid = { userId: 'not-an-email' };
    expect(() => deleteUserSchema.parse(invalid)).toThrow();
  });
});

describe('propertyBaseSchema', () => {
  it('✅ acepta propiedad válida', () => {
    const valid = {
      title: 'Casa moderna en Manizales',
      type: 'casa',
      transactionType: 'venta',
      price: 350000000,
      city: 'Manizales',
      department: 'Caldas',
    };
    expect(() => propertyBaseSchema.parse(valid)).not.toThrow();
  });

  it('❌ rechaza título muy corto', () => {
    const invalid = {
      title: 'Casa',
      type: 'casa',
      transactionType: 'venta',
      price: 350000000,
      city: 'Manizales',
    };
    expect(() => propertyBaseSchema.parse(invalid)).toThrow();
  });

  it('❌ rechaza precio negativo', () => {
    const invalid = {
      title: 'Casa moderna en Manizales',
      type: 'casa',
      transactionType: 'venta',
      price: -10000000,
      city: 'Manizales',
    };
    expect(() => propertyBaseSchema.parse(invalid)).toThrow();
  });

  it('✅ acepta campos opcionales', () => {
    const withOptionals = {
      title: 'Casa moderna en Manizales',
      type: 'casa',
      transactionType: 'venta',
      price: 350000000,
      city: 'Manizales',
      address: 'Carrera 10 #20-30',
      description: 'Hermosa casa con vista a la montaña',
      features: {
        rooms: 4,
        bathrooms: 3,
        area: 200,
        garage: true,
        pool: false,
      },
      images: ['https://example.com/img1.jpg'],
    };
    expect(() => propertyBaseSchema.parse(withOptionals)).not.toThrow();
  });
});

describe('createContractSchema', () => {
  it('✅ acepta contrato de compra válido', () => {
    const valid = {
      propertyId: 'prop123',
      clientEmail: 'client@example.com',
      agentEmail: 'agent@example.com',
      type: 'compra',
      startDate: '2024-01-15T00:00:00.000Z',
      endDate: '2024-12-31T23:59:59.000Z',
      monthlyValue: 2000000,
      deposit: 5000000,
    };
    expect(() => createContractSchema.parse(valid)).not.toThrow();
  });

  it('❌ rechaza propertyId vacío', () => {
    const invalid = {
      propertyId: '',
      clientEmail: 'client@example.com',
      type: 'compra',
      startDate: '2024-01-15T00:00:00.000Z',
    };
    expect(() => createContractSchema.parse(invalid)).toThrow();
  });

  it('❌ rechaza email de cliente inválido', () => {
    const invalid = {
      propertyId: 'prop123',
      clientEmail: 'not-email',
      type: 'compra',
      startDate: '2024-01-15T00:00:00.000Z',
    };
    expect(() => createContractSchema.parse(invalid)).toThrow();
  });
});

describe('createVisitSchema', () => {
  it('✅ acepta visita válida', () => {
    const valid = {
      propertyId: 'prop123',
      clientName: 'Juan Pérez',
      clientEmail: 'juan@example.com',
      clientPhone: '+573001234567',
      requestedDate: '2024-02-15',
      requestedTime: '10:00',
      notes: 'Quiero ver la propiedad',
    };
    expect(() => createVisitSchema.parse(valid)).not.toThrow();
  });

  it('❌ rechaza nombre muy corto', () => {
    const invalid = {
      propertyId: 'prop123',
      clientName: 'J',
      clientEmail: 'juan@example.com',
      clientPhone: '+573001234567',
      requestedDate: '2024-02-15',
      requestedTime: '10:00',
    };
    expect(() => createVisitSchema.parse(invalid)).toThrow();
  });

  it('❌ rechaza teléfono muy corto', () => {
    const invalid = {
      propertyId: 'prop123',
      clientName: 'Juan Pérez',
      clientEmail: 'juan@example.com',
      clientPhone: '123',
      requestedDate: '2024-02-15',
      requestedTime: '10:00',
    };
    expect(() => createVisitSchema.parse(invalid)).toThrow();
  });
});

describe('createClientSchema', () => {
  it('✅ acepta cliente válido', () => {
    const valid = {
      name: 'Empresa XYZ',
      email: 'contacto@empresa.com',
      phone: '+573001234567',
      tipoCliente: 'portal',
      estado: 'activo',
    };
    expect(() => createClientSchema.parse(valid)).not.toThrow();
  });

  it('✅ acepta cliente tipo lead', () => {
    const valid = {
      name: 'Juan Pérez',
      email: 'juan@example.com',
      phone: '+573001234567',
      tipoCliente: 'lead',
      tipoPropiedad: 'casa',
      presupuesto: 500000000,
      ubicacionInteres: 'Manizales',
    };
    expect(() => createClientSchema.parse(valid)).not.toThrow();
  });

  it('❌ rechaza tipoCliente inválido', () => {
    const invalid = {
      name: 'Juan Pérez',
      email: 'juan@example.com',
      phone: '+573001234567',
      tipoCliente: 'invalid',
    };
    expect(() => createClientSchema.parse(invalid)).toThrow();
  });
});

describe('accessRequestSchema', () => {
  it('✅ acepta solicitud de acceso válida', () => {
    const valid = {
      name: 'Carlos López',
      email: 'carlos@example.com',
      phone: '+573001234567',
      company: 'Inmobiliaria ABC',
      message: 'Quiero acceder al portal',
    };
    expect(() => accessRequestSchema.parse(valid)).not.toThrow();
  });

  it('❌ rechaza email inválido', () => {
    const invalid = {
      name: 'Carlos López',
      email: 'invalid-email',
      phone: '+573001234567',
    };
    expect(() => accessRequestSchema.parse(invalid)).toThrow();
  });
});

describe('contactSchema', () => {
  it('✅ acepta contacto válido', () => {
    const valid = {
      name: 'María García',
      email: 'maria@example.com',
      phone: '+573001234567',
      message: 'Estoy interesada en la casa en Manizales',
      propertyId: 'prop123',
      interest: 'venta',
    };
    expect(() => contactSchema.parse(valid)).not.toThrow();
  });

  it('❌ rechaza mensaje muy corto', () => {
    const invalid = {
      name: 'María García',
      email: 'maria@example.com',
      message: 'Hola',
    };
    expect(() => contactSchema.parse(invalid)).toThrow();
  });
});

describe('validateInput', () => {
  it('✅ retorna datos validados', () => {
    const data = { email: 'test@example.com', password: 'password123' };
    const result = validateInput(createUserSchema, data);
    expect(result.email).toBe('test@example.com');
    expect(result.password).toBe('password123');
  });

  it('❌ lanza error con detalles', () => {
    const data = { email: 'invalid', password: '123' };
    expect(() => validateInput(createUserSchema, data)).toThrow();
  });
});

describe('validateRequestBody', () => {
  it('✅ extrae datos del body.data', () => {
    const req = {
      body: {
        data: { email: 'test@example.com', password: 'password123' }
      }
    };
    const result = validateRequestBody(req, createUserSchema);
    expect(result.email).toBe('test@example.com');
  });

  it('✅ acepta body directo sin data', () => {
    const req = {
      body: { email: 'test@example.com', password: 'password123' }
    };
    const result = validateRequestBody(req, createUserSchema);
    expect(result.email).toBe('test@example.com');
  });
});