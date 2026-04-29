// tests/firestore/mail.test.js
//
// /mail es la cola de la extensión Trigger Email de Firebase.
// Hardening crítico: cliente solo puede encolar emails A SÍ MISMO.
// Prevenir uso como motor de spam.

import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  setupEnv, teardownEnv,
  asAdmin, asMember, asViewer, asAnon, asUser,
  seedUser,
  assertFails, assertSucceeds,
  doc, addDoc, collection, serverTimestamp,
} from './setup.js';

let env;

beforeAll(async () => { env = await setupEnv(); }, 30000);
afterAll(async () => { await teardownEnv(env); });

beforeEach(async () => {
  await env.clearFirestore();
  await seedUser(env, 'admin@ryb.com', { role: 'admin' });
  await seedUser(env, 'member@ryb.com', { role: 'member' });
  await seedUser(env, 'cliente@ryb.com', { role: 'viewer' });
});

const buildClientMailToSelf = () => ({
  to: 'cliente@ryb.com',
  message: { subject: 'Confirmación', html: '<p>tu visita</p>' },
  createdAt: serverTimestamp(),
});

describe('/mail — staff', () => {
  it('✅ Admin puede encolar email a cualquier destinatario', async () => {
    await assertSucceeds(addDoc(collection(asAdmin(env).firestore(), 'mail'), {
      to: 'random@ext.com',
      message: { subject: 'X', html: '<p>x</p>' },
      createdAt: serverTimestamp(),
    }));
  });

  it('✅ Member puede encolar email a cualquier destinatario', async () => {
    await assertSucceeds(addDoc(collection(asMember(env).firestore(), 'mail'), {
      to: 'cliente@x.com',
      message: { subject: 'Visita aprobada', html: '<p>ok</p>' },
      createdAt: serverTimestamp(),
    }));
  });
});

describe('/mail — cliente', () => {
  it('✅ Cliente puede encolar email A SÍ MISMO (to == authEmail)', async () => {
    const clientCtx = asUser(env, 'cliente@ryb.com', 'uid-cliente');
    await assertSucceeds(addDoc(collection(clientCtx.firestore(), 'mail'), buildClientMailToSelf()));
  });

  it('🚫 Cliente NO puede encolar email a tercero (vector de spam)', async () => {
    const clientCtx = asUser(env, 'cliente@ryb.com', 'uid-cliente');
    await assertFails(addDoc(collection(clientCtx.firestore(), 'mail'), {
      to: 'victima@x.com',
      message: { subject: 'spam', html: '<p>spam</p>' },
      createdAt: serverTimestamp(),
    }));
  });

  it('🚫 Cliente NO puede setear "from" (suplantación)', async () => {
    const clientCtx = asUser(env, 'cliente@ryb.com', 'uid-cliente');
    await assertFails(addDoc(collection(clientCtx.firestore(), 'mail'), {
      ...buildClientMailToSelf(),
      from: 'admin@ryb.com',
    }));
  });

  it('🚫 Cliente NO puede setear "replyTo" (suplantación)', async () => {
    const clientCtx = asUser(env, 'cliente@ryb.com', 'uid-cliente');
    await assertFails(addDoc(collection(clientCtx.firestore(), 'mail'), {
      ...buildClientMailToSelf(),
      replyTo: 'admin@ryb.com',
    }));
  });

  it('🚫 Cliente NO puede setear "bcc" (vector de spam masivo oculto)', async () => {
    const clientCtx = asUser(env, 'cliente@ryb.com', 'uid-cliente');
    await assertFails(addDoc(collection(clientCtx.firestore(), 'mail'), {
      ...buildClientMailToSelf(),
      bcc: ['victima1@x.com', 'victima2@x.com'],
    }));
  });

  it('🚫 Cliente NO puede setear "cc"', async () => {
    const clientCtx = asUser(env, 'cliente@ryb.com', 'uid-cliente');
    await assertFails(addDoc(collection(clientCtx.firestore(), 'mail'), {
      ...buildClientMailToSelf(),
      cc: 'otro@x.com',
    }));
  });
});

describe('/mail — anónimo', () => {
  it('🚫 Anónimo no puede crear nada en /mail', async () => {
    await assertFails(addDoc(collection(asAnon(env).firestore(), 'mail'),
      buildClientMailToSelf()));
  });
});