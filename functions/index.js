const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

admin.initializeApp();

/**
 * Siempre setea CORS (también para errores)
 */
function setCorsHeaders(req, res) {
  res.set('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.set('Vary', 'Origin');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

/**
 * Maneja preflight OPTIONS
 */
function handlePreflight(req, res) {
  if (req.method === 'OPTIONS') {
    setCorsHeaders(req, res);
    return res.status(204).send('');
  }
  return null;
}

// Helper: validar admin (en tu app el doc de users está por EMAIL)
async function assertAdminFromRequest(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const err = new Error('No autenticado');
    err.status = 401;
    throw err;
  }

  const token = authHeader.split('Bearer ')[1];
  const decodedToken = await admin.auth().verifyIdToken(token);

  const callerEmail = decodedToken.email;
  if (!callerEmail) {
    const err = new Error('Token sin email');
    err.status = 401;
    throw err;
  }

  const callerDoc = await admin.firestore().collection('users').doc(callerEmail).get();
  if (!callerDoc.exists || callerDoc.data().role !== 'admin') {
    const err = new Error('Solo administradores');
    err.status = 403;
    throw err;
  }

  return { callerEmail };
}

/**
 * ELIMINAR USUARIO COMPLETO (Auth + Firestore + RTDB)
 * Espera: body = { data: { userId: "<email>" } }
 */
exports.deleteUserComplete = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      if (handlePreflight(req, res)) return;
      setCorsHeaders(req, res);

      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
      }

      await assertAdminFromRequest(req);

      const userIdRaw = req.body?.data?.userId;
      const userId = String(userIdRaw || '').trim().toLowerCase();
      if (!userId) return res.status(400).json({ error: 'userId es requerido' });

      const userDoc = await admin.firestore().collection('users').doc(userId).get();
      if (!userDoc.exists) return res.status(404).json({ error: 'Usuario no encontrado' });

      const userUid = userDoc.data().uid;
      if (userUid) {
        await admin.auth().deleteUser(userUid);
      }

      await admin.firestore().collection('users').doc(userId).delete();
      if (userUid) {
        await admin.database().ref(`status/${userUid}`).remove();
        await admin.database().ref(`presence/${userUid}`).remove();
      }

      return res.status(200).json({
        result: {
          success: true,
          message: `Usuario ${userId} eliminado completamente`,
          deletedFrom: ['Authentication', 'Firestore', 'Realtime Database']
        }
      });
    } catch (error) {
      setCorsHeaders(req, res);
      console.error('deleteUserComplete Error:', error);
      return res.status(error.status || 500).json({ error: error.message });
    }
  });
});

/**
 * CREAR USUARIO DESDE ADMIN (NO CAMBIA SESIÓN DEL ADMIN)
 * Espera: body = { data: { email, password, displayName, phone, role, status } }
 */
exports.createUserByAdmin = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      if (handlePreflight(req, res)) return;
      setCorsHeaders(req, res);

      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
      }

      await assertAdminFromRequest(req);

      const data = req.body?.data || {};
      const email = String(data.email || '').trim().toLowerCase();
      const password = String(data.password || '');
      const displayName = String(data.displayName || '').trim();
      const phone = String(data.phone || '').trim();
      const role = String(data.role || 'member');
      const status = String(data.status || 'active');

      if (!email || !password) {
        return res.status(400).json({ error: 'email y password son requeridos' });
      }

      let userRecord;

      try {
        userRecord = await admin.auth().createUser({
          email,
          password,
          displayName,
          disabled: status === 'blocked'
        });
      } catch (e) {
        if (e?.code === 'auth/email-already-exists') {
          userRecord = await admin.auth().getUserByEmail(email);
        } else {
          throw e;
        }
      }

      await admin.firestore().collection('users').doc(email).set(
        {
          uid: userRecord.uid,
          email,
          displayName,
          phone,
          role,
          status,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        },
        { merge: true }
      );

      return res.status(200).json({
        result: { success: true, uid: userRecord.uid, email }
      });
    } catch (error) {
      setCorsHeaders(req, res);
      console.error('createUserByAdmin Error:', error);
      return res.status(error.status || 500).json({ error: error.message });
    }
  });
});

/**
 * ✅ REDIRECCIÓN 301: .web.app y .firebaseapp.com → .com
 * Esto le dice a Google que la URL oficial es el .com
 */
exports.redirectToCustomDomain = functions.https.onRequest((req, res) => {
  const host = req.headers.host || '';
  if (host.includes('web.app') || host.includes('firebaseapp.com')) {
    const newUrl = `https://inmobiliaria-ryb-y-asociados.com${req.url}`;
    return res.redirect(301, newUrl);
  }
  return res.status(200).send('OK');
});