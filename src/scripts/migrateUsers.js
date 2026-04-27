import { auth, db } from '../core/config/firebase.config';
import { collection, doc, setDoc, getDoc } from 'firebase/firestore';

/**
 * Script para migrar usuarios de Firebase Auth a Firestore
 * Ejecuta esto UNA VEZ para crear documentos en Firestore
 * para todos los usuarios que ya existen en Auth
 *
 * ★ FIX (auditoría): añadido guard contra ejecución accidental en producción.
 * Si quieres correrlo en producción, exporta `VITE_ALLOW_USER_MIGRATION=true`
 * antes del build. Esto evita que un import accidental en otro componente
 * dispare la migración con los emails de ejemplo hardcodeados abajo.
 */
export async function migrateAuthUsersToFirestore() {
  if (
    !import.meta.env.DEV &&
    import.meta.env.VITE_ALLOW_USER_MIGRATION !== 'true'
  ) {
    console.error(
      '[migrateUsers] BLOQUEADO en producción. ' +
      'Para autorizar, define VITE_ALLOW_USER_MIGRATION=true en tu env.'
    );
    return;
  }

  try {
    // Obtener usuario actual (debes estar logueado como admin)
    const currentUser = auth.currentUser;

    if (!currentUser) {
      console.error('Debes estar logueado como administrador');
      return;
    }

    // Lista de emails de usuarios que quieres migrar
    // Reemplaza con los emails reales de tus usuarios
    const usersToMigrate = [
      { 
        email: 'usuario1@ejemplo.com', 
        displayName: 'Usuario 1',
        role: 'member',  // admin | member | viewer
        phone: '310 123 4567'
      },
      { 
        email: 'usuario2@ejemplo.com', 
        displayName: 'Usuario 2',
        role: 'viewer',
        phone: ''
      }
      // Agrega más usuarios aquí
    ];

    console.log('🚀 Iniciando migración de usuarios...');

    for (const userData of usersToMigrate) {
      try {
        // Verificar si ya existe en Firestore
        const userDoc = await getDoc(doc(db, 'users', userData.email));
        
        if (userDoc.exists()) {
          console.log(`⚠️ Usuario ${userData.email} ya existe en Firestore`);
          continue;
        }

        // Crear documento en Firestore
        await setDoc(doc(db, 'users', userData.email), {
          email: userData.email,
          displayName: userData.displayName,
          role: userData.role,
          phone: userData.phone || '',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        });

        console.log(`✅ Usuario ${userData.email} migrado exitosamente`);
      } catch (error) {
        console.error(`❌ Error migrando ${userData.email}:`, error);
      }
    }

    console.log('✅ Migración completada');
  } catch (error) {
    console.error('Error en migración:', error);
  }
}