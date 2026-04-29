// tests/firestore/contracts.test.js
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  setupEnv, teardownEnv,
  asAdmin, asMember, asViewer, asOtherViewer, asPortalClient, asOtherPortalClient, asAnon, asUser,
  seedUser, seedContract,
  assertFails, assertSucceeds,
  doc, getDoc, setDoc, addDoc, collection, updateDoc,
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
  await seedContract(env, 'contract-1', { clientEmail: 'portal@ryb.com' });
  // Subcollection seed: payment del contract-1
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'contracts/contract-1/payments/pay-1'), {
      amount: 1000, status: 'paid',
    });
    await setDoc(doc(ctx.firestore(), 'contracts/contract-1/alerts_sent/alert-1'), {
      type: 'payment_due',
    });
  });
});

describe('/contracts — operaciones top-level', () => {
  it('✅ Admin puede crear y editar contratos', async () => {
    const db = asAdmin(env).firestore();
    await assertSucceeds(setDoc(doc(db, 'contracts', 'new-contract'), {
      clientEmail: 'portal@ryb.com', status: 'active',
    }));
    await assertSucceeds(updateDoc(doc(db, 'contracts', 'contract-1'), {
      status: 'completed',
    }));
  });

  it('✅ Member puede crear y editar contratos', async () => {
    const db = asMember(env).firestore();
    await assertSucceeds(setDoc(doc(db, 'contracts', 'new-contract-2'), {
      clientEmail: 'portal@ryb.com', status: 'active',
    }));
  });

  it('✅ Cliente puede leer su propio contrato (clientEmail == authEmail)', async () => {
    await assertSucceeds(getDoc(doc(asPortalClient(env).firestore(), 'contracts', 'contract-1')));
  });

  it('🚫 Cliente no puede leer contrato de otro cliente', async () => {
    await seedContract(env, 'contract-2', { clientEmail: 'otro.portal@ryb.com' });
    await assertFails(getDoc(doc(asPortalClient(env).firestore(), 'contracts', 'contract-2')));
  });

  it('🚫 Cliente no puede crear contratos', async () => {
    await assertFails(setDoc(doc(asPortalClient(env).firestore(), 'contracts', 'attempt'), {
      clientEmail: 'portal@ryb.com', status: 'active',
    }));
  });
});

describe('/contracts/{id}/payments — subcollection', () => {
  it('✅ Cliente puede leer pagos de su propio contrato', async () => {
    await assertSucceeds(getDoc(doc(asPortalClient(env).firestore(), 'contracts/contract-1/payments/pay-1')));
  });

  it('🚫 Cliente no puede leer pagos de contrato ajeno', async () => {
    await seedContract(env, 'contract-2', { clientEmail: 'otro.portal@ryb.com' });
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'contracts/contract-2/payments/pay-2'), {
        amount: 500,
      });
    });
    await assertFails(getDoc(doc(asPortalClient(env).firestore(), 'contracts/contract-2/payments/pay-2')));
  });

  it('🚫 Cliente no puede crear pagos', async () => {
    await assertFails(setDoc(doc(asPortalClient(env).firestore(), 'contracts/contract-1/payments/pay-attack'), {
      amount: 0, status: 'paid',
    }));
  });
});

describe('/contracts/{id}/alerts_sent — solo Admin SDK', () => {
  it('🚫 Admin (cliente) no puede escribir en alerts_sent', async () => {
    await assertFails(setDoc(doc(asAdmin(env).firestore(), 'contracts/contract-1/alerts_sent/x'), {
      type: 'payment_due',
    }));
  });

  it('🚫 Member no puede escribir en alerts_sent', async () => {
    await assertFails(setDoc(doc(asMember(env).firestore(), 'contracts/contract-1/alerts_sent/x'), {
      type: 'payment_due',
    }));
  });

  it('✅ Member puede leer alerts_sent (para auditoría)', async () => {
    await assertSucceeds(getDoc(doc(asMember(env).firestore(), 'contracts/contract-1/alerts_sent/alert-1')));
  });
});