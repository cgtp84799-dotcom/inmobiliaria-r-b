// tests/firestore/conversations.test.js
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  setupEnv, teardownEnv,
  asAdmin, asMember, asViewer, asUser,
  seedUser, seedConversation,
  assertFails, assertSucceeds,
  doc, getDoc, setDoc, addDoc, collection, serverTimestamp,
} from './setup.js';

let env;

beforeAll(async () => { env = await setupEnv(); }, 30000);
afterAll(async () => { await teardownEnv(env); });

beforeEach(async () => {
  await env.clearFirestore();
  await seedUser(env, 'admin@ryb.com', { role: 'admin' });
  await seedUser(env, 'member1@ryb.com', { role: 'member' });
  await seedUser(env, 'member2@ryb.com', { role: 'member' });
  await seedUser(env, 'foreign@ryb.com', { role: 'admin' }); // admin pero NO en participants

  await seedConversation(env, 'conv-1', {
    participants: ['member1@ryb.com', 'member2@ryb.com'],
  });
  // Mensaje seedeado dentro de conv-1
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'conversations/conv-1/messages/m-1'), {
      text: 'Hola',
      senderEmail: 'member1@ryb.com',
      createdAt: new Date(),
    });
  });
});

describe('/conversations — lectura', () => {
  it('✅ Participante puede leer su conversación', async () => {
    const m1 = asUser(env, 'member1@ryb.com', 'uid-m1');
    await assertSucceeds(getDoc(doc(m1.firestore(), 'conversations', 'conv-1')));
  });

  it('🚫 NO-participante NO puede leer conversación (incluso si su rol es admin-role pero no está en participants)', async () => {
    const foreign = asUser(env, 'foreign@ryb.com', 'uid-foreign');
    await assertFails(getDoc(doc(foreign.firestore(), 'conversations', 'conv-1')));
  });

  it('🚫 Member NO-participante NO puede leer conversación ajena', async () => {
    await seedUser(env, 'member3@ryb.com', { role: 'member' });
    const m3 = asUser(env, 'member3@ryb.com', 'uid-m3');
    await assertFails(getDoc(doc(m3.firestore(), 'conversations', 'conv-1')));
  });
});

describe('/conversations/{id}/messages', () => {
  it('✅ Participante puede leer mensajes', async () => {
    const m2 = asUser(env, 'member2@ryb.com', 'uid-m2');
    await assertSucceeds(getDoc(doc(m2.firestore(), 'conversations/conv-1/messages/m-1')));
  });

  it('✅ Participante puede crear mensaje válido', async () => {
    const m1 = asUser(env, 'member1@ryb.com', 'uid-m1');
    await assertSucceeds(addDoc(collection(m1.firestore(), 'conversations/conv-1/messages'), {
      text: 'mensaje válido',
      senderEmail: 'member1@ryb.com',
      createdAt: serverTimestamp(),
    }));
  });

  it('🚫 Participante NO puede suplantar senderEmail de otro', async () => {
    const m1 = asUser(env, 'member1@ryb.com', 'uid-m1');
    await assertFails(addDoc(collection(m1.firestore(), 'conversations/conv-1/messages'), {
      text: 'suplantando',
      senderEmail: 'admin@ryb.com', // ← intento de suplantación
      createdAt: serverTimestamp(),
    }));
  });

  it('🚫 NO-participante NO puede leer mensajes', async () => {
    await seedUser(env, 'extranjero@ryb.com', { role: 'member' });
    const ext = asUser(env, 'extranjero@ryb.com', 'uid-ext');
    await assertFails(getDoc(doc(ext.firestore(), 'conversations/conv-1/messages/m-1')));
  });

  it('🚫 NO-participante NO puede crear mensaje', async () => {
    await seedUser(env, 'extranjero@ryb.com', { role: 'member' });
    const ext = asUser(env, 'extranjero@ryb.com', 'uid-ext');
    await assertFails(addDoc(collection(ext.firestore(), 'conversations/conv-1/messages'), {
      text: 'intento',
      senderEmail: 'extranjero@ryb.com',
      createdAt: serverTimestamp(),
    }));
  });

  it('🚫 Participante no puede crear mensaje con texto vacío', async () => {
    const m1 = asUser(env, 'member1@ryb.com', 'uid-m1');
    await assertFails(addDoc(collection(m1.firestore(), 'conversations/conv-1/messages'), {
      text: '',
      senderEmail: 'member1@ryb.com',
      createdAt: serverTimestamp(),
    }));
  });

  it('🚫 Participante no puede crear mensaje > 5000 chars', async () => {
    const m1 = asUser(env, 'member1@ryb.com', 'uid-m1');
    await assertFails(addDoc(collection(m1.firestore(), 'conversations/conv-1/messages'), {
      text: 'x'.repeat(5001),
      senderEmail: 'member1@ryb.com',
      createdAt: serverTimestamp(),
    }));
  });
});