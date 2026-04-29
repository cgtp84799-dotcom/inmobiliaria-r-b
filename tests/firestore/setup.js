// tests/firestore/setup.js
//
// Helpers compartidos para tests de reglas de Firestore.
// Requiere el emulador corriendo: firebase emulators:start --only firestore
//
// Uso típico en cada archivo de test:
//
//   import { beforeAll, afterAll, beforeEach, describe, it } from 'vitest';
//   import { setupEnv, teardownEnv, seedUser, asAdmin, asViewer, asAnon } from './setup.js';
//
//   let env;
//   beforeAll(async () => { env = await setupEnv(); });
//   afterAll(async () => { await teardownEnv(env); });
//   beforeEach(async () => {
//     await env.clearFirestore();
//     await seedUser(env, 'admin@ryb.com', { role: 'admin' });
//   });

import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  doc, setDoc, getDoc, updateDoc, deleteDoc, addDoc, collection,
  serverTimestamp, Timestamp,
} from 'firebase/firestore';

const RULES_PATH = resolve(process.cwd(), 'firestore.rules');
const PROJECT_ID = 'demo-ryb-test';

export async function setupEnv() {
  const rulesText = readFileSync(RULES_PATH, 'utf8');
  return await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: rulesText,
      host: '127.0.0.1',
      port: 8080,
    },
  });
}

export async function teardownEnv(env) {
  if (env) await env.cleanup();
}

// ─── Contextos de auth (la convención del proyecto: ID = email) ──────────

/**
 * Devuelve un contexto autenticado donde el token tiene `email` claim.
 * IMPORTANTE: en Firestore Rules, request.auth.token.email se setea con
 * la opción email del segundo argumento; el primer argumento es el sub/uid.
 */
export function asUser(env, email, uid) {
  return env.authenticatedContext(uid || `uid-${email}`, { email });
}

export const asAdmin  = (env) => asUser(env, 'admin@ryb.com',  'uid-admin');
export const asMember = (env) => asUser(env, 'member@ryb.com', 'uid-member');
export const asViewer = (env) => asUser(env, 'viewer@ryb.com', 'uid-viewer-staff');
export const asOtherViewer = (env) => asUser(env, 'otro.viewer@ryb.com', 'uid-other-viewer-staff');

// Portal clients are intentionally NOT seeded in /users. If a client is seeded
// with role 'viewer', rules treat them as internal read-only staff via canRead().
export const asPortalClient = (env) => asUser(env, 'portal@ryb.com', 'uid-portal-client');
export const asOtherPortalClient = (env) => asUser(env, 'otro.portal@ryb.com', 'uid-other-portal-client');
export const asAnon   = (env) => env.unauthenticatedContext();

// ─── Seeders (usan withSecurityRulesDisabled — bypass para preparar data) ─

export async function seedUser(env, email, data = {}) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users', email), {
      email,
      role: data.role || 'viewer',
      status: data.status || 'active',
      uid: data.uid || `uid-${email}`,
      ...data,
    });
  });
}

export async function seedClient(env, clientId, data = {}) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'clients', clientId), {
      email: data.email || clientId,
      nombre: data.nombre || 'Cliente',
      ...data,
    });
  });
}

export async function seedContract(env, contractId, data = {}) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'contracts', contractId), {
      clientEmail: data.clientEmail || 'cliente@ryb.com',
      status: 'active',
      ...data,
    });
  });
}

export async function seedVisit(env, visitId, data = {}) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'visits', visitId), {
      clientName: 'Cliente',
      clientEmail: data.clientEmail || 'cliente@ryb.com',
      status: data.status || 'pending',
      createdAt: Timestamp.now(),
      ...data,
    });
  });
}

export async function seedNotification(env, notifId, data = {}) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'notifications', notifId), {
      userId: data.userId || 'cliente@ryb.com',
      title: 'Test',
      message: 'Test',
      read: false,
      ...data,
    });
  });
}

export async function seedConversation(env, convId, data = {}) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'conversations', convId), {
      participants: data.participants || ['admin@ryb.com', 'member@ryb.com'],
      ...data,
    });
  });
}

// Helper para construir un payload válido de visita (público)
export function buildValidVisitPayload(overrides = {}) {
  return {
    clientName: 'Juan Perez',
    clientEmail: 'juan@example.com',
    status: 'pending',
    createdAt: serverTimestamp(),
    ...overrides,
  };
}

export function buildValidContactPayload(overrides = {}) {
  return {
    name: 'Juan Perez',
    email: 'juan@example.com',
    message: 'Estoy interesado',
    status: 'pending',
    createdAt: serverTimestamp(),
    ...overrides,
  };
}

export function buildValidAccessRequestPayload(overrides = {}) {
  return {
    name: 'Juan Perez',
    email: 'juan@example.com',
    status: 'pending',
    createdAt: Timestamp.now(),
    ...overrides,
  };
}

// Re-exports para que cada archivo de test pueda importar todo desde aquí
export { assertFails, assertSucceeds };
export {
  doc, setDoc, getDoc, updateDoc, deleteDoc, addDoc, collection,
  serverTimestamp, Timestamp,
};