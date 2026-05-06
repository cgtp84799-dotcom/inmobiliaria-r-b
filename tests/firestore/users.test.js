// tests/firestore/users.test.js
import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import {
  setupEnv, teardownEnv,
  asAdmin, asMember, asViewer, asOtherViewer, asAnon, asUser,
  seedUser,
  assertFails, assertSucceeds,
  doc, getDoc, setDoc, updateDoc,
} from './setup.js';

let env;

beforeAll(async () => { env = await setupEnv(); }, 30000);
afterAll(async () => { await teardownEnv(env); });

beforeEach(async () => {
  await env.clearFirestore();
  await seedUser(env, 'admin@ryb.com',  { role: 'admin' });
  await seedUser(env, 'member@ryb.com', { role: 'member' });
  await seedUser(env, 'cliente@ryb.com', { role: 'viewer' });
  await seedUser(env, 'otro@ryb.com',    { role: 'viewer' });
});

describe('/users — lectura', () => {
  it('✅ Admin puede leer cualquier usuario', async () => {
    const db = asAdmin(env).firestore();
    await assertSucceeds(getDoc(doc(db, 'users', 'cliente@ryb.com')));
  });

  it('✅ Usuario puede leer su propio doc', async () => {
    const db = asUser(env, 'cliente@ryb.com', 'uid-cliente').firestore();
    await assertSucceeds(getDoc(doc(db, 'users', 'cliente@ryb.com')));
  });

  it('🚫 Viewer no puede leer doc de otro usuario', async () => {
    const db = asUser(env, 'cliente@ryb.com', 'uid-cliente').firestore();
    await assertFails(getDoc(doc(db, 'users', 'otro@ryb.com')));
  });

  it('🚫 Anónimo no puede leer /users', async () => {
    const db = asAnon(env).firestore();
    await assertFails(getDoc(doc(db, 'users', 'cliente@ryb.com')));
  });
});

describe('/users — creación', () => {
  it('✅ Usuario autenticado puede crear su propio doc', async () => {
    const email = 'nuevo@ryb.com';
    const ctx = asUser(env, email, 'uid-nuevo');
    await assertSucceeds(setDoc(doc(ctx.firestore(), 'users', email), {
      email, role: 'viewer', uid: 'uid-nuevo',
    }));
  });

  it('🚫 Usuario no puede crear doc con email de otro', async () => {
    const ctx = asUser(env, 'attacker@x.com', 'uid-attacker');
    await assertFails(setDoc(doc(ctx.firestore(), 'users', 'victim@x.com'), {
      email: 'victim@x.com', role: 'viewer',
    }));
  });

  it('🚫 Anónimo no puede crear ningún doc en /users', async () => {
    const db = asAnon(env).firestore();
    await assertFails(setDoc(doc(db, 'users', 'anon@x.com'), {
      email: 'anon@x.com', role: 'viewer',
    }));
  });
});

describe('/users — actualización', () => {
  it('✅ Admin puede actualizar cualquier campo', async () => {
    const db = asAdmin(env).firestore();
    await assertSucceeds(updateDoc(doc(db, 'users', 'cliente@ryb.com'), {
      role: 'member',
    }));
  });

  it('✅ Usuario puede actualizar campos permitidos (displayName, phone, photoURL)', async () => {
    const db = asUser(env, 'cliente@ryb.com', 'uid-cliente').firestore();
    await assertSucceeds(updateDoc(doc(db, 'users', 'cliente@ryb.com'), {
      displayName: 'Nuevo Nombre',
      phone: '+57 300 0000000',
      photoURL: 'https://example.com/foo.jpg',
    }));
  });

  it('🚫 Usuario NO puede cambiar su propio role (escalación de privilegios)', async () => {
    const db = asUser(env, 'cliente@ryb.com', 'uid-cliente').firestore();
    await assertFails(updateDoc(doc(db, 'users', 'cliente@ryb.com'), {
      role: 'admin',
    }));
  });

  it('🚫 Usuario NO puede cambiar su propio status', async () => {
    const db = asUser(env, 'cliente@ryb.com', 'uid-cliente').firestore();
    await assertFails(updateDoc(doc(db, 'users', 'cliente@ryb.com'), {
      status: 'admin',
    }));
  });

  it('🚫 Usuario no puede modificar doc de otro', async () => {
    const db = asUser(env, 'cliente@ryb.com', 'uid-cliente').firestore();
    await assertFails(updateDoc(doc(db, 'users', 'otro@ryb.com'), {
      displayName: 'hack',
    }));
  });
});

describe('/users — @known-issue: deuda técnica del email-as-id', () => {
  it('@known-issue documenta: si el email cambia en Auth, el doc /users/{old-email} queda huérfano', async () => {
    // Creamos un user con email original
    await seedUser(env, 'original@x.com', { role: 'viewer', uid: 'uid-X' });

    // Simulamos que el usuario cambió de email en Auth (mismo uid pero nuevo email claim)
    const newEmailCtx = asUser(env, 'nuevo@x.com', 'uid-X');

    // El usuario YA NO puede leer su propio doc histórico (porque se busca por email)
    await assertFails(getDoc(doc(newEmailCtx.firestore(), 'users', 'original@x.com')));

    // Y el doc original sigue existiendo en Firestore con el email viejo.
    // Lo verificamos con reglas deshabilitadas porque este test documenta deuda
    // de modelo de datos, no permisos de admin.
    await env.withSecurityRulesDisabled(async (ctx) => {
      const oldDoc = await getDoc(doc(ctx.firestore(), 'users', 'original@x.com'));
      expect(oldDoc.exists()).toBe(true);
    });

    // ESTO ES EL @known-issue: el usuario tendría que crear un doc nuevo
    // bajo nuevo@x.com y abandonar el original. Mitigación: ejecutar un job
    // de migración o forzar al usuario a contactar admin.
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Activación de staff en primer login (sistema de verificación custom)
// ════════════════════════════════════════════════════════════════════════════

describe('/users — activación de staff (pending → active)', () => {
  it('✅ Staff member con status=pending puede auto-activarse al primer login', async () => {
    const email = 'newmember@ryb.com';
    await seedUser(env, email, { role: 'member', status: 'pending' });
    const db = asUser(env, email, 'uid-newmember').firestore();
    await assertSucceeds(updateDoc(doc(db, 'users', email), {
      status: 'active',
      firstLoginAt: new Date(),
      updatedAt: new Date(),
    }));
  });

  it('✅ Staff admin con status=pending puede auto-activarse al primer login', async () => {
    const email = 'newadmin@ryb.com';
    await seedUser(env, email, { role: 'admin', status: 'pending' });
    const db = asUser(env, email, 'uid-newadmin').firestore();
    await assertSucceeds(updateDoc(doc(db, 'users', email), {
      status: 'active',
      firstLoginAt: new Date(),
      updatedAt: new Date(),
    }));
  });

  it('🚫 Viewer con status=pending NO puede auto-activarse (debe usar emailVerified)', async () => {
    const email = 'pendingviewer@ryb.com';
    await seedUser(env, email, { role: 'viewer', status: 'pending' });
    const db = asUser(env, email, 'uid-pv').firestore();
    await assertFails(updateDoc(doc(db, 'users', email), {
      status: 'active',
      firstLoginAt: new Date(),
      updatedAt: new Date(),
    }));
  });

  it('🚫 Staff NO puede saltar pending → inactive (solo active)', async () => {
    const email = 'pendingmember@ryb.com';
    await seedUser(env, email, { role: 'member', status: 'pending' });
    const db = asUser(env, email, 'uid-pm').firestore();
    await assertFails(updateDoc(doc(db, 'users', email), {
      status: 'inactive',
    }));
  });

  it('🚫 Staff active NO puede volver a pending (regla solo cubre pending → active)', async () => {
    const email = 'activemember@ryb.com';
    await seedUser(env, email, { role: 'member', status: 'active' });
    const db = asUser(env, email, 'uid-am').firestore();
    await assertFails(updateDoc(doc(db, 'users', email), {
      status: 'pending',
    }));
  });

  it('🚫 Staff activación NO puede tocar campos fuera de status/firstLoginAt/updatedAt', async () => {
    const email = 'pendingmember2@ryb.com';
    await seedUser(env, email, { role: 'member', status: 'pending' });
    const db = asUser(env, email, 'uid-pm2').firestore();
    // Intenta colar role: 'admin' junto con la activación → debe fallar
    await assertFails(updateDoc(doc(db, 'users', email), {
      status: 'active',
      role: 'admin',
      firstLoginAt: new Date(),
      updatedAt: new Date(),
    }));
  });

  it('🚫 Otro usuario NO puede activar el doc de un staff pending', async () => {
    const targetEmail = 'pendingmember3@ryb.com';
    await seedUser(env, targetEmail, { role: 'member', status: 'pending' });
    // Otro usuario diferente intenta activar
    const db = asUser(env, 'attacker@ryb.com', 'uid-attacker').firestore();
    await assertFails(updateDoc(doc(db, 'users', targetEmail), {
      status: 'active',
      firstLoginAt: new Date(),
      updatedAt: new Date(),
    }));
  });
});

// ════════════════════════════════════════════════════════════════════════════
// emailVerifications — colección cerrada (solo Admin SDK desde CFs)
// ════════════════════════════════════════════════════════════════════════════

describe('/emailVerifications — solo Admin SDK', () => {
  it('🚫 Admin NO puede leer la colección desde el cliente', async () => {
    // Sembramos un doc directamente bypaseando rules
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'emailVerifications', 'test-id'), {
        email: 'foo@bar.com',
        tokenHash: 'abc',
      });
    });
    const db = asAdmin(env).firestore();
    await assertFails(getDoc(doc(db, 'emailVerifications', 'test-id')));
  });

  it('🚫 Admin NO puede crear docs', async () => {
    const db = asAdmin(env).firestore();
    await assertFails(setDoc(doc(db, 'emailVerifications', 'mal-id'), {
      email: 'foo@bar.com',
      tokenHash: 'abc',
    }));
  });

  it('🚫 Viewer NO puede leer', async () => {
    const db = asUser(env, 'cliente@ryb.com', 'uid-cliente').firestore();
    await assertFails(getDoc(doc(db, 'emailVerifications', 'test-id')));
  });

  it('🚫 Anónimo NO puede leer ni crear', async () => {
    const db = asAnon(env).firestore();
    await assertFails(getDoc(doc(db, 'emailVerifications', 'test-id')));
    await assertFails(setDoc(doc(db, 'emailVerifications', 'mal'), { email: 'a@b.com' }));
  });
});