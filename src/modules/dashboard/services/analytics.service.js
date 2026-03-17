import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../../../core/config/firebase.config";

export const analyticsService = {

  async getGeneralStats() {
    try {
      const [properties, clients, contracts] = await Promise.all([
        getDocs(collection(db, "properties")),
        getDocs(collection(db, "clients")),
        getDocs(collection(db, "contracts")),
      ]);

      const propertiesData = properties.docs.map(doc => doc.data());
      const clientsData    = clients.docs.map(doc => doc.data());
      const contractsData  = contracts.docs.map(doc => doc.data());

      return {
        totalProperties:     properties.size,
        availableProperties: propertiesData.filter(p => p.status === "disponible").length,
        soldProperties:      propertiesData.filter(p => p.status === "vendida").length,
        rentedProperties:    propertiesData.filter(p => p.status === "arrendada").length,
        totalClients:        clients.size,
        activeClients:       clientsData.filter(c => c.status !== "inactive").length,
        leads:               clientsData.filter(c => c.status === "lead").length,
        totalContracts:      contracts.size,
        activeContracts:     contractsData.filter(c => c.status !== "completed").length,
        pendingContracts:    contractsData.filter(c => c.status === "pendingsignature").length,
        totalValue:          propertiesData.reduce((sum, p) => sum + (p.price || 0), 0),
      };
    } catch (error) {
      console.error("Error obteniendo estadísticas:", error);
      return null;
    }
  },

  async getRecentProperties(limitCount = 5) {
    try {
      const q = query(
        collection(db, "properties"),
        orderBy("createdAt", "desc"),
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error obteniendo propiedades recientes:", error);
      return [];
    }
  },

  async getRecentActivity(limitCount = 10) {
    try {
      const perCollection = Math.ceil(limitCount / 3);
      const [properties, clients, contracts] = await Promise.all([
        getDocs(query(collection(db, "properties"), orderBy("createdAt", "desc"), limit(perCollection))),
        getDocs(query(collection(db, "clients"),    orderBy("createdAt", "desc"), limit(perCollection))),
        getDocs(query(collection(db, "contracts"),  orderBy("createdAt", "desc"), limit(perCollection))),
      ]);

      const activities = [];

      properties.docs.forEach(doc => {
        const data = doc.data();
        activities.push({ type: "property", action: "Propiedad creada",    title: data.title,                                         timestamp: data.createdAt });
      });
      clients.docs.forEach(doc => {
        const data = doc.data();
        activities.push({ type: "client",   action: "Cliente registrado",  title: data.nombre || data.personalInfo?.name,             timestamp: data.createdAt });
      });
      contracts.docs.forEach(doc => {
        const data = doc.data();
        activities.push({ type: "contract", action: "Contrato creado",     title: `${data.type} - ${data.parties?.buyer?.name}`,      timestamp: data.createdAt });
      });

      return activities
        .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0))
        .slice(0, limitCount);
    } catch (error) {
      console.error("Error obteniendo actividad:", error);
      return [];
    }
  },
};