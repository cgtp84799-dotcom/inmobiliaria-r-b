// tests/validators/validators.js
//
// Reimplementación en JS puro de los validadores que viven en
// firestore.rules y functions/index.js. Permite testear las reglas de
// validación SIN levantar el emulador.
//
// Mantén estos validadores en sync con:
//   - firestore.rules → validContact(), validVisit(), validAccessRequest()
//   - functions/index.js → isValidEmail()

// ─── VALID CONTACT ─────────────────────────────────────────────────────
// Replica firestore.rules → function validContact()
const CONTACT_ALLOWED_KEYS = [
  'name', 'email', 'phone', 'message',
  'propertyId', 'propertyTitle',
  'createdAt', 'updatedAt', 'status',
  'interest', 'source',
];

export function validContact(data) {
  if (!data || typeof data !== 'object') return false;
  const keys = Object.keys(data);
  // hasOnly: cada key del data debe estar en allowed
  for (const k of keys) {
    if (!CONTACT_ALLOWED_KEYS.includes(k)) return false;
  }
  if (typeof data.name !== 'string' || data.name.length === 0 || data.name.length >= 200) return false;
  if (typeof data.email !== 'string' || !/.*@.*\..*/.test(data.email)) return false;
  if (typeof data.message !== 'string' || data.message.length === 0 || data.message.length >= 3000) return false;
  if (data.status !== 'pending') return false;
  // createdAt: en JS puro no podemos comparar contra request.time, así que
  // solo verificamos que esté presente y sea Date/timestamp-like.
  if (data.createdAt === undefined || data.createdAt === null) return false;
  return true;
}

// ─── VALID VISIT ───────────────────────────────────────────────────────
// Replica firestore.rules → function validVisit()
const VISIT_ALLOWED_KEYS = [
  'clientName', 'clientEmail', 'clientPhone',
  'clientId',
  'propertyId', 'propertyName', 'propertyAddress',
  'requestedDate', 'requestedTime', 'notes', 'adminNotes',
  'status', 'createdAt', 'updatedAt', 'source', 'sourceCollection',
  'agentId', 'agentName', 'agentEmail',
  'privacyAccepted', 'privacyAcceptedAt',
];

export function validVisit(data) {
  if (!data || typeof data !== 'object') return false;
  const keys = Object.keys(data);
  for (const k of keys) {
    if (!VISIT_ALLOWED_KEYS.includes(k)) return false;
  }
  if (typeof data.clientName !== 'string' || data.clientName.length === 0 || data.clientName.length >= 200) return false;
  if (typeof data.clientEmail !== 'string' || !/.*@.*\..*/.test(data.clientEmail)) return false;
  if (data.status !== 'pending') return false;
  if (data.createdAt === undefined || data.createdAt === null) return false;
  return true;
}

// ─── VALID ACCESS REQUEST ──────────────────────────────────────────────
const ACCESS_REQUEST_ALLOWED_KEYS = [
  'name', 'email', 'phone', 'message',
  'role', 'createdAt', 'status',
  'approvedBy', 'approvedAt', 'assignedRole',
];

export function validAccessRequest(data) {
  if (!data || typeof data !== 'object') return false;
  const keys = Object.keys(data);
  for (const k of keys) {
    if (!ACCESS_REQUEST_ALLOWED_KEYS.includes(k)) return false;
  }
  if (typeof data.email !== 'string' || !/.*@.*\..*/.test(data.email)) return false;
  if (typeof data.name !== 'string' || data.name.length === 0 || data.name.length >= 200) return false;
  if (data.status !== 'pending') return false;
  return true;
}

// ─── IS VALID EMAIL ────────────────────────────────────────────────────
// Replica functions/index.js → function isValidEmail()
export function isValidEmail(email) {
  return typeof email === 'string'
      && email.length >= 5
      && email.length <= 254
      && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── SAFE CLIENT MAIL ──────────────────────────────────────────────────
// Replica firestore.rules → function isSafeClientMail()
// (Usado para verificar que un cliente solo encole emails a sí mismo)
const MAIL_ALLOWED_KEYS = ['to', 'message', 'createdAt', 'userId', 'type'];
const MAIL_FORBIDDEN_KEYS = ['from', 'replyTo', 'headers', 'cc', 'bcc'];

export function isSafeClientMail(data, authEmail) {
  if (!data || typeof data !== 'object') return false;
  if (!authEmail) return false;
  const keys = Object.keys(data);
  for (const k of keys) {
    if (!MAIL_ALLOWED_KEYS.includes(k)) return false;
    if (MAIL_FORBIDDEN_KEYS.includes(k)) return false;
  }
  // Recipient OK
  let recipientOk = false;
  if (typeof data.to === 'string' && data.to === authEmail) recipientOk = true;
  if (Array.isArray(data.to) && data.to.length === 1 && data.to[0] === authEmail) recipientOk = true;
  if (!recipientOk) return false;
  // message
  if (!data.message || typeof data.message !== 'object') return false;
  if (typeof data.message.subject !== 'string' || data.message.subject.length >= 300) return false;
  if (typeof data.message.html !== 'string' || data.message.html.length >= 200000) return false;
  return true;
}
