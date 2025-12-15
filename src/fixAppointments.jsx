import { collection, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../core/config/firebase.config';

export const fixOldAppointments = async () => {
  console.log('🔧 Iniciando corrección de appointments...');
  
  try {
    const appointmentsSnap = await getDocs(collection(db, 'appointments'));
    let fixed = 0;
    let skipped = 0;

    for (const appointmentDoc of appointmentsSnap.docs) {
      const data = appointmentDoc.data();
      
      // Si ya tiene agentName, saltar
      if (data.agentName) {
        skipped++;
        continue;
      }

      // Si tiene createdBy o assignedAgentId, buscar el nombre
      const userId = data.assignedAgentId || data.createdBy;
      if (userId) {
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const agentName = userData.displayName || userData.name || userData.email || 'Agente';
            
            await updateDoc(doc(db, 'appointments', appointmentDoc.id), {
              agentName: agentName,
              agentId: userId
            });
            
            console.log(`✅ Actualizado: ${appointmentDoc.id} → ${agentName}`);
            fixed++;
          }
        } catch (err) {
          console.warn(`⚠️ No se pudo obtener user ${userId}:`, err.message);
        }
      }
    }

    console.log(`✅ Corrección completada: ${fixed} actualizados, ${skipped} ya tenían agentName`);
    return { fixed, skipped };
  } catch (error) {
    console.error('❌ Error corrigiendo appointments:', error);
    throw error;
  }
};