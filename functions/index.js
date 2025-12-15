const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true }); // ← NUEVO: Habilitar CORS

admin.initializeApp();

exports.deleteUserComplete = functions.https.onRequest((req, res) => {
  // Habilitar CORS
  return cors(req, res, async () => {
    try {
      // Verificar método HTTP
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
      }

      // Verificar autenticación
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No autenticado' });
      }

      const token = authHeader.split('Bearer ')[1];
      const decodedToken = await admin.auth().verifyIdToken(token);
      const callerEmail = decodedToken.email;

      // Verificar que es admin
      const callerDoc = await admin.firestore().collection('users').doc(callerEmail).get();
      
      if (!callerDoc.exists || callerDoc.data().role !== 'admin') {
        return res.status(403).json({ error: 'Solo administradores pueden eliminar usuarios' });
      }

      const { userId } = req.body.data;

      if (!userId) {
        return res.status(400).json({ error: 'userId es requerido' });
      }

      console.log(`🗑️ Eliminando usuario: ${userId}`);

      // Obtener UID del usuario
      const userDoc = await admin.firestore().collection('users').doc(userId).get();
      if (!userDoc.exists) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const userUid = userDoc.data().uid;

      // 1. Eliminar de Authentication
      await admin.auth().deleteUser(userUid);
      console.log(`✅ Eliminado de Authentication: ${userUid}`);

      // 2. Eliminar de Firestore
      await admin.firestore().collection('users').doc(userId).delete();
      console.log(`✅ Eliminado de Firestore: ${userId}`);

      // 3. Eliminar de Realtime Database
      await admin.database().ref(`status/${userUid}`).remove();
      await admin.database().ref(`presence/${userUid}`).remove();
      console.log(`✅ Eliminado de Realtime Database: ${userUid}`);

      return res.status(200).json({ 
        result: {
          success: true, 
          message: `Usuario ${userId} eliminado completamente`,
          deletedFrom: ['Authentication', 'Firestore', 'Realtime Database']
        }
      });
    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({ error: error.message });
    }
  });
});