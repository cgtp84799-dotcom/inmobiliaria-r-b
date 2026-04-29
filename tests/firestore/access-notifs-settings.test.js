// tests/firestore/access-notifs-settings.test.js
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  setupEnv, teardownEnv,
  asAdmin, asMember, asViewer, asAnon, asUser,
  seedUser, seedNotification, buildValidAccessRequestPayload,
  assertFails, assertSucceeds,
  doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, collection,
} from './setup.js';

let env;

beforeAll(async () => { env = await setupEnv(); }, 30000);
afterAll(async () => { await teardownEnv(env); });

beforeEach(async () => {
  await env.clearFirestore();
  await seedUser(env, 'admin@ryb.com', { role: 'admin' });
  await seedUser(env, 'member@ryb.com', { role: 'member' });
  await seedUser(env, 'cliente@ryb.com', { role: 'viewer' });
  await seedUser(env, 'otro@ryb.com', { role: 'viewer' });
});

describe('/accessRequests', () => {
  it('✅ Anónimo puede crear solicitud válida', async () => {
    await assertSucceeds(addDoc(collection(asAnon(env).firestore(), 'accessRequests'),
      buildValidAccessRequestPayload()));
  });

  it('🚫 Anónimo no puede leer solicitudes', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'accessRequests', 'r-1'), {
        name: 'A', email: 'a@x.com', status: 'pending',
      });
    });
    await assertFails(getDoc(doc(asAnon(env).firestore(), 'accessRequests', 'r-1')));
  });

  it('✅ Admin puede leer y actualizar solicitudes', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'accessRequests', 'r-1'), {
        name: 'A', email: 'a@x.com', status: 'pending',
      });
    });
    await assertSucceeds(getDoc(doc(asAdmin(env).firestore(), 'accessRequests', 'r-1')));
    await assertSucceeds(updateDoc(doc(asAdmin(env).firestore(), 'accessRequests', 'r-1'), {
      status: 'approved', approvedBy: 'admin@ryb.com',
    }));
  });

  it('🚫 Member no puede leer solicitudes (solo admin)', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'accessRequests', 'r-1'), {
        name: 'A', email: 'a@x.com', status: 'pending',
      });
    });
    await assertFails(getDoc(doc(asMember(env).firestore(), 'accessRequests', 'r-1')));
  });
});

describe('/notifications', () => {
  beforeEach(async () => {
    await seedNotification(env, 'n-1', { userId: 'cliente@ryb.com' });
    await seedNotification(env, 'n-2', { userId: 'otro@ryb.com' });
  });

  it('✅ Owner puede leer su notificación', async () => {
    await assertSucceeds(getDoc(doc(asViewer(env).firestore(), 'notifications', 'n-1')));
  });

  it('🚫 No-owner no puede leer notificación ajena', async () => {
    await assertFails(getDoc(doc(asViewer(env).firestore(), 'notifications', 'n-2')));
  });

  it('✅ Owner puede marcar como leída (campos read, readAt)', async () => {
    await assertSucceeds(updateDoc(doc(asViewer(env).firestore(), 'notifications', 'n-1'), {
      read: true,
      readAt: new Date(),
    }));
  });

  it('🚫 Owner no puede cambiar campos no permitidos (e.g. userId, title)', async () => {
    await assertFails(updateDoc(doc(asViewer(env).firestore(), 'notifications', 'n-1'), {
      userId: 'admin@ryb.com',
    }));
    await assertFails(updateDoc(doc(asViewer(env).firestore(), 'notifications', 'n-1'), {
      title: 'hackeado',
    }));
  });
});

describe('/settings', () => {
  it('✅ Admin puede leer settings', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'settings', 'global'), { key: 'value' });
    });
    await assertSucceeds(getDoc(doc(asAdmin(env).firestore(), 'settings', 'global')));
  });

  it('✅ Admin puede escribir settings', async () => {
    await assertSucceeds(setDoc(doc(asAdmin(env).firestore(), 'settings', 'global'), {
      key: 'newvalue',
    }));
  });

  it('🚫 Member NO puede escribir settings', async () => {
    await assertFails(setDoc(doc(asMember(env).firestore(), 'settings', 'global'), {
      key: 'attempt',
    }));
  });

  it('🚫 Member NO puede leer settings', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'settings', 'global'), { key: 'value' });
    });
    await assertFails(getDoc(doc(asMember(env).firestore(), 'settings', 'global')));
  });

  it('🚫 Anónimo NO puede leer settings', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'settings', 'global'), { key: 'value' });
    });
    await assertFails(getDoc(doc(asAnon(env).firestore(), 'settings', 'global')));
  });
});