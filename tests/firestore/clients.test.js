// tests/firestore/clients.test.js
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  setupEnv, teardownEnv,
  asAdmin, asMember, asViewer, asOtherViewer, asPortalClient, asOtherPortalClient, asAnon, asUser,
  seedUser, seedClient,
  assertFails, assertSucceeds,
  doc, getDoc, setDoc, updateDoc, deleteDoc,
} from './setup.js';

let env;

beforeAll(async () => { env = await setupEnv(); }, 30000);
afterAll(async () => { await teardownEnv(env); });

beforeEach(async () => {
  await env.clearFirestore();
  await seedUser(env, 'admin@ryb.com', { role: 'admin' });
  await seedUser(env, 'member@ryb.com', { role: 'member' });
  await seedUser(env, 'viewer@ryb.com', { role: 'viewer' });
  await seedUser(env, 'otro.viewer@ryb.com', { role: 'viewer' });
  await seedClient(env, 'client-1', { email: 'portal@ryb.com', nombre: 'Juan' });
  await seedClient(env, 'client-2', { email: 'otro.portal@ryb.com', nombre: 'Pedro' });
});

describe('/clients — lectura', () => {
  it('✅ Admin puede leer cualquier cliente', async () => {
    await assertSucceeds(getDoc(doc(asAdmin(env).firestore(), 'clients', 'client-1')));
  });

  it('✅ Member puede leer cualquier cliente', async () => {
    await assertSucceeds(getDoc(doc(asMember(env).firestore(), 'clients', 'client-1')));
  });

  it('✅ Cliente puede leer su propio doc (matchea por email del resource)', async () => {
    await assertSucceeds(getDoc(doc(asPortalClient(env).firestore(), 'clients', 'client-1')));
  });

  it('🚫 Cliente no puede leer doc de otro cliente', async () => {
    await assertFails(getDoc(doc(asPortalClient(env).firestore(), 'clients', 'client-2')));
  });

  it('🚫 Anónimo no puede leer /clients', async () => {
    await assertFails(getDoc(doc(asAnon(env).firestore(), 'clients', 'client-1')));
  });
});

describe('/clients — actualización (whitelist de campos)', () => {
  it('✅ Cliente puede actualizar campos permitidos (nombre, telefono, favorites)', async () => {
    await assertSucceeds(updateDoc(doc(asPortalClient(env).firestore(), 'clients', 'client-1'), {
      nombre: 'Juan Actualizado',
      telefono: '+57 300',
      favorites: ['prop-1', 'prop-2'],
    }));
  });

  it('🚫 Cliente NO puede modificar campos no permitidos (email, role)', async () => {
    await assertFails(updateDoc(doc(asPortalClient(env).firestore(), 'clients', 'client-1'), {
      email: 'hacker@x.com',
    }));
    await assertFails(updateDoc(doc(asPortalClient(env).firestore(), 'clients', 'client-1'), {
      role: 'admin',
    }));
  });

  it('🚫 Cliente no puede actualizar doc de otro cliente', async () => {
    await assertFails(updateDoc(doc(asPortalClient(env).firestore(), 'clients', 'client-2'), {
      nombre: 'hacked',
    }));
  });
});