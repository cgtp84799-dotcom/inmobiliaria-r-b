// tests/firestore/visits.test.js
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  setupEnv, teardownEnv,
  asAdmin, asMember, asViewer, asOtherViewer, asPortalClient, asOtherPortalClient, asAnon, asUser,
  seedUser, seedVisit, buildValidVisitPayload,
  assertFails, assertSucceeds,
  doc, getDoc, setDoc, addDoc, collection, updateDoc,
  serverTimestamp,
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
});

describe('/visits — creación pública (sin auth)', () => {
  it('✅ Anónimo puede crear visita con campos válidos (validVisit)', async () => {
    const db = asAnon(env).firestore();
    await assertSucceeds(addDoc(collection(db, 'visits'), buildValidVisitPayload()));
  });

  it('🚫 Anónimo no puede crear visita con status != "pending"', async () => {
    const db = asAnon(env).firestore();
    await assertFails(addDoc(collection(db, 'visits'),
      buildValidVisitPayload({ status: 'approved' })));
    await assertFails(addDoc(collection(db, 'visits'),
      buildValidVisitPayload({ status: 'completed' })));
  });

  it('🚫 Anónimo no puede crear visita con campos extra no permitidos', async () => {
    const db = asAnon(env).firestore();
    await assertFails(addDoc(collection(db, 'visits'),
      buildValidVisitPayload({ injectedField: 'pwn' })));
  });

  it('🚫 Anónimo no puede crear visita sin email válido', async () => {
    const db = asAnon(env).firestore();
    await assertFails(addDoc(collection(db, 'visits'),
      buildValidVisitPayload({ clientEmail: 'no-email' })));
  });
});

describe('/visits — lectura', () => {
  it('✅ Cliente puede leer SU propia visita', async () => {
    await seedVisit(env, 'v1', { clientEmail: 'portal@ryb.com' });
    await assertSucceeds(getDoc(doc(asPortalClient(env).firestore(), 'visits', 'v1')));
  });

  it('🚫 Cliente no puede leer visita de otro cliente', async () => {
    await seedVisit(env, 'v2', { clientEmail: 'otro.portal@ryb.com' });
    await assertFails(getDoc(doc(asPortalClient(env).firestore(), 'visits', 'v2')));
  });
});

describe('/visits — cancelación por cliente', () => {
  it('✅ Cliente puede cancelar su visita pending', async () => {
    await seedVisit(env, 'v1', { clientEmail: 'portal@ryb.com', status: 'pending' });
    await assertSucceeds(updateDoc(doc(asPortalClient(env).firestore(), 'visits', 'v1'), {
      status: 'cancelada',
      cancelledByClient: true,
      cancelReason: 'cambio de planes',
      updatedAt: serverTimestamp(),
    }));
  });

  it('✅ Cliente puede cancelar su visita approved', async () => {
    await seedVisit(env, 'v1', { clientEmail: 'portal@ryb.com', status: 'approved' });
    await assertSucceeds(updateDoc(doc(asPortalClient(env).firestore(), 'visits', 'v1'), {
      status: 'cancelada',
      updatedAt: serverTimestamp(),
    }));
  });

  it('🚫 Cliente NO puede cambiar status a "approved" (escalación)', async () => {
    await seedVisit(env, 'v1', { clientEmail: 'portal@ryb.com', status: 'pending' });
    await assertFails(updateDoc(doc(asPortalClient(env).firestore(), 'visits', 'v1'), {
      status: 'approved',
    }));
  });

  it('🚫 Cliente NO puede cambiar status a "completed"', async () => {
    await seedVisit(env, 'v1', { clientEmail: 'portal@ryb.com', status: 'approved' });
    await assertFails(updateDoc(doc(asPortalClient(env).firestore(), 'visits', 'v1'), {
      status: 'completed',
    }));
  });

  it('🚫 Cliente no puede cancelar visita de otro cliente', async () => {
    await seedVisit(env, 'v2', { clientEmail: 'otro.portal@ryb.com', status: 'pending' });
    await assertFails(updateDoc(doc(asPortalClient(env).firestore(), 'visits', 'v2'), {
      status: 'cancelada',
    }));
  });
});