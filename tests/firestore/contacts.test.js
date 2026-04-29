// tests/firestore/contacts.test.js
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  setupEnv, teardownEnv,
  asAdmin, asMember, asViewer, asAnon,
  seedUser, buildValidContactPayload,
  assertFails, assertSucceeds,
  doc, getDoc, setDoc, addDoc, collection,
} from './setup.js';

let env;

beforeAll(async () => { env = await setupEnv(); }, 30000);
afterAll(async () => { await teardownEnv(env); });

beforeEach(async () => {
  await env.clearFirestore();
  await seedUser(env, 'admin@ryb.com', { role: 'admin' });
  await seedUser(env, 'member@ryb.com', { role: 'member' });
  await seedUser(env, 'cliente@ryb.com', { role: 'viewer' });

  // Seedear un contacto para tests de lectura
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'contacts', 'c-1'), {
      name: 'Lead', email: 'lead@x.com', message: 'hola', status: 'pending',
    });
  });
});

describe('/contacts', () => {
  it('✅ Anónimo puede crear contacto válido', async () => {
    const db = asAnon(env).firestore();
    await assertSucceeds(addDoc(collection(db, 'contacts'), buildValidContactPayload()));
  });

  it('🚫 Anónimo no puede crear contacto con status != "pending"', async () => {
    const db = asAnon(env).firestore();
    await assertFails(addDoc(collection(db, 'contacts'),
      buildValidContactPayload({ status: 'replied' })));
  });

  it('🚫 Anónimo no puede crear contacto con campos extra', async () => {
    const db = asAnon(env).firestore();
    await assertFails(addDoc(collection(db, 'contacts'),
      buildValidContactPayload({ adminFlag: true })));
  });

  it('✅ Admin puede leer contactos', async () => {
    await assertSucceeds(getDoc(doc(asAdmin(env).firestore(), 'contacts', 'c-1')));
  });

  it('✅ Member puede leer contactos', async () => {
    await assertSucceeds(getDoc(doc(asMember(env).firestore(), 'contacts', 'c-1')));
  });

  // El brief pide explícitamente: "Viewer no puede leer contactos (canOperate, no canRead)"
  it('🚫 Viewer NO puede leer contactos (canOperate, no canRead)', async () => {
    await assertFails(getDoc(doc(asViewer(env).firestore(), 'contacts', 'c-1')));
  });
});