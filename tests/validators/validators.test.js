// tests/validators/validators.test.js
import { describe, it, expect } from 'vitest';
import {
  validContact,
  validVisit,
  validAccessRequest,
  isValidEmail,
  isSafeClientMail,
} from './validators.js';

const NOW = new Date();
const validContactPayload = () => ({
  name: 'Juan Perez',
  email: 'juan@example.com',
  message: 'Estoy interesado en una propiedad',
  status: 'pending',
  createdAt: NOW,
});

const validVisitPayload = () => ({
  clientName: 'Juan Perez',
  clientEmail: 'juan@example.com',
  status: 'pending',
  createdAt: NOW,
});

const validAccessReqPayload = () => ({
  name: 'Juan Perez',
  email: 'juan@example.com',
  status: 'pending',
});

// ═══════════════════════════════════════════════════════════════════════
// validContact()
// ═══════════════════════════════════════════════════════════════════════
describe('validContact()', () => {
  it('✅ acepta payload mínimo válido', () => {
    expect(validContact(validContactPayload())).toBe(true);
  });

  it('✅ acepta payload con campos opcionales en whitelist', () => {
    expect(validContact({
      ...validContactPayload(),
      phone: '+57 300 1234567',
      propertyId: 'prop123',
      propertyTitle: 'Casa Centro',
      interest: 'venta',
      source: 'web',
      updatedAt: NOW,
    })).toBe(true);
  });

  it('🚫 rechaza si falta name', () => {
    const p = validContactPayload();
    delete p.name;
    expect(validContact(p)).toBe(false);
  });

  it('🚫 rechaza email sin @', () => {
    expect(validContact({ ...validContactPayload(), email: 'sin-arroba.com' })).toBe(false);
  });

  it('🚫 rechaza email sin punto', () => {
    expect(validContact({ ...validContactPayload(), email: 'foo@bar' })).toBe(false);
  });

  it('🚫 rechaza message vacío', () => {
    expect(validContact({ ...validContactPayload(), message: '' })).toBe(false);
  });

  it('🚫 rechaza message > 3000 chars', () => {
    expect(validContact({ ...validContactPayload(), message: 'x'.repeat(3001) })).toBe(false);
  });

  it('🚫 rechaza name > 200 chars', () => {
    expect(validContact({ ...validContactPayload(), name: 'x'.repeat(201) })).toBe(false);
  });

  it('🚫 rechaza status != "pending"', () => {
    expect(validContact({ ...validContactPayload(), status: 'approved' })).toBe(false);
    expect(validContact({ ...validContactPayload(), status: 'completed' })).toBe(false);
    expect(validContact({ ...validContactPayload(), status: '' })).toBe(false);
  });

  it('🚫 rechaza campos extra no permitidos (escalación de privilegios)', () => {
    expect(validContact({
      ...validContactPayload(),
      isAdmin: true, // intento de injection
    })).toBe(false);
  });

  it('🚫 rechaza payloads null/undefined', () => {
    expect(validContact(null)).toBe(false);
    expect(validContact(undefined)).toBe(false);
    expect(validContact('not an object')).toBe(false);
  });

  it('🚫 rechaza createdAt ausente', () => {
    const p = validContactPayload();
    delete p.createdAt;
    expect(validContact(p)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// validVisit()
// ═══════════════════════════════════════════════════════════════════════
describe('validVisit()', () => {
  it('✅ acepta payload mínimo válido', () => {
    expect(validVisit(validVisitPayload())).toBe(true);
  });

  it('✅ acepta todos los campos opcionales de la whitelist', () => {
    expect(validVisit({
      ...validVisitPayload(),
      clientPhone: '+57 300',
      clientId: 'cli1',
      propertyId: 'p1',
      propertyName: 'Casa',
      propertyAddress: 'Cra 1',
      requestedDate: '2026-05-01',
      requestedTime: '10:00',
      notes: 'urgente',
      adminNotes: '',
      updatedAt: NOW,
      source: 'public',
      sourceCollection: 'visits',
      agentId: 'a1',
      agentName: 'Agente',
      agentEmail: 'agente@ryb.com',
      privacyAccepted: true,
      privacyAcceptedAt: NOW,
    })).toBe(true);
  });

  it('🚫 rechaza campos no en whitelist', () => {
    expect(validVisit({
      ...validVisitPayload(),
      hackerField: 'pwned',
    })).toBe(false);
  });

  it('🚫 rechaza status != "pending"', () => {
    expect(validVisit({ ...validVisitPayload(), status: 'approved' })).toBe(false);
    expect(validVisit({ ...validVisitPayload(), status: 'completed' })).toBe(false);
  });

  it('🚫 rechaza clientEmail sin @', () => {
    expect(validVisit({ ...validVisitPayload(), clientEmail: 'noemail' })).toBe(false);
  });

  it('🚫 rechaza clientName vacío o > 200 chars', () => {
    expect(validVisit({ ...validVisitPayload(), clientName: '' })).toBe(false);
    expect(validVisit({ ...validVisitPayload(), clientName: 'x'.repeat(201) })).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// validAccessRequest()
// ═══════════════════════════════════════════════════════════════════════
describe('validAccessRequest()', () => {
  it('✅ acepta payload mínimo válido', () => {
    expect(validAccessRequest(validAccessReqPayload())).toBe(true);
  });

  it('🚫 rechaza email malformado', () => {
    expect(validAccessRequest({ ...validAccessReqPayload(), email: 'invalid' })).toBe(false);
  });

  it('🚫 rechaza status != pending', () => {
    expect(validAccessRequest({ ...validAccessReqPayload(), status: 'approved' })).toBe(false);
  });

  it('🚫 rechaza campos extra (escalación a role admin)', () => {
    expect(validAccessRequest({
      ...validAccessReqPayload(),
      injectedField: 'x',
    })).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// isValidEmail() — replica functions/index.js
// ═══════════════════════════════════════════════════════════════════════
describe('isValidEmail()', () => {
  it('✅ acepta correos válidos típicos', () => {
    expect(isValidEmail('admin@ryb.com')).toBe(true);
    expect(isValidEmail('user.name+tag@example.co.uk')).toBe(true);
    expect(isValidEmail('a@b.cd')).toBe(true);
  });

  it('🚫 rechaza string vacío', () => {
    expect(isValidEmail('')).toBe(false);
  });

  it('🚫 rechaza sin @', () => {
    expect(isValidEmail('no-arroba.com')).toBe(false);
  });

  it('🚫 rechaza sin TLD', () => {
    expect(isValidEmail('foo@bar')).toBe(false);
  });

  it('🚫 rechaza con espacios', () => {
    expect(isValidEmail('foo bar@example.com')).toBe(false);
    expect(isValidEmail('foo@example .com')).toBe(false);
  });

  it('🚫 rechaza > 254 chars (límite RFC)', () => {
    const longLocal = 'x'.repeat(250);
    expect(isValidEmail(`${longLocal}@example.com`)).toBe(false);
  });

  it('🚫 rechaza < 5 chars', () => {
    expect(isValidEmail('a@b')).toBe(false); // 3 chars
  });

  it('🚫 rechaza no-strings', () => {
    expect(isValidEmail(null)).toBe(false);
    expect(isValidEmail(undefined)).toBe(false);
    expect(isValidEmail(123)).toBe(false);
    expect(isValidEmail({})).toBe(false);
  });

  it('🚫 rechaza múltiples @', () => {
    expect(isValidEmail('foo@@bar.com')).toBe(false);
    expect(isValidEmail('foo@bar@baz.com')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// isSafeClientMail() — replica firestore.rules
// ═══════════════════════════════════════════════════════════════════════
describe('isSafeClientMail()', () => {
  const auth = 'cliente@example.com';
  const validMail = () => ({
    to: auth,
    message: { subject: 'Test', html: '<p>hola</p>' },
    createdAt: NOW,
  });

  it('✅ cliente puede enviarse email a sí mismo (string)', () => {
    expect(isSafeClientMail(validMail(), auth)).toBe(true);
  });

  it('✅ cliente puede enviarse email a sí mismo (array de 1)', () => {
    expect(isSafeClientMail({ ...validMail(), to: [auth] }, auth)).toBe(true);
  });

  it('🚫 rechaza envío a tercero (string)', () => {
    expect(isSafeClientMail({ ...validMail(), to: 'otro@example.com' }, auth)).toBe(false);
  });

  it('🚫 rechaza envío a tercero (array)', () => {
    expect(isSafeClientMail({ ...validMail(), to: ['otro@example.com'] }, auth)).toBe(false);
  });

  it('🚫 rechaza array con múltiples destinatarios (incluso si yo estoy)', () => {
    expect(isSafeClientMail({ ...validMail(), to: [auth, 'otro@x.com'] }, auth)).toBe(false);
  });

  it('🚫 rechaza setear from', () => {
    expect(isSafeClientMail({ ...validMail(), from: 'admin@ryb.com' }, auth)).toBe(false);
  });

  it('🚫 rechaza setear replyTo', () => {
    expect(isSafeClientMail({ ...validMail(), replyTo: 'admin@ryb.com' }, auth)).toBe(false);
  });

  it('🚫 rechaza setear bcc/cc/headers', () => {
    expect(isSafeClientMail({ ...validMail(), bcc: 'spam@x.com' }, auth)).toBe(false);
    expect(isSafeClientMail({ ...validMail(), cc: 'spam@x.com' }, auth)).toBe(false);
    expect(isSafeClientMail({ ...validMail(), headers: { 'X-Spam': '1' } }, auth)).toBe(false);
  });

  it('🚫 rechaza subject demasiado largo (> 300 chars)', () => {
    expect(isSafeClientMail({
      ...validMail(),
      message: { subject: 'x'.repeat(301), html: '<p>ok</p>' },
    }, auth)).toBe(false);
  });

  it('🚫 rechaza html demasiado largo (> 200000 chars)', () => {
    expect(isSafeClientMail({
      ...validMail(),
      message: { subject: 'ok', html: 'x'.repeat(200001) },
    }, auth)).toBe(false);
  });
});
