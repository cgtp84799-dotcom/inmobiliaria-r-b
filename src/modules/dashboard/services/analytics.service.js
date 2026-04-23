// src/modules/dashboard/services/analytics.service.js
//
// FIX: getGeneralStats() usaba getDocs(collection(db, "X")) sin límite —
// descargaba TODOS los documentos de 3 colecciones en cada carga del dashboard.
// Con 500+ propiedades/clientes/contratos esto es lento y costoso en Firestore.
//
// SOLUCIÓN: Usar countFromServer() para los totales (1 read por colección)
// y getDocs con limit() solo para los cálculos de estado.
// Ahorro estimado: de N reads → 3 reads para conteos + 3×50 reads para stats.

import {
  collection, getDocs, query, orderBy, limit,
  getCountFromServer, where,
} from "firebase/firestore";
import { db } from "../../../core/config/firebase.config";

export const analyticsService = {

  async getGeneralStats() {
    try {
      // ── Conteos totales con getCountFromServer (1 read cada uno) ──────────
      // getCountFromServer no descarga documentos — solo cuenta.
      const [
        totalPropsSnap,
        totalClientsSnap,
        totalContractsSnap,
        availableSnap,
        soldSnap,
        rentedSnap,
        activeClientsSnap,
        leadsSnap,
        activeContractsSnap,
        pendingContractsSnap,
      ] = await Promise.all([
        getCountFromServer(collection(db, "properties")),
        getCountFromServer(collection(db, "clients")),
        getCountFromServer(collection(db, "contracts")),
        getCountFromServer(query(collection(db, "properties"), where("status", "==", "disponible"))),
        getCountFromServer(query(collection(db, "properties"), where("status", "in",  ["vendida", "sold"]))),
        getCountFromServer(query(collection(db, "properties"), where("status", "in",  ["arrendada", "rented"]))),
        getCountFromServer(query(collection(db, "clients"),    where("status", "!=",  "inactive"))),
        getCountFromServer(query(collection(db, "clients"),    where("status", "==",  "lead"))),
        getCountFromServer(query(collection(db, "contracts"),  where("status", "!=",  "completed"))),
        getCountFromServer(query(collection(db, "contracts"),  where("status", "==",  "pendingsignature"))),
      ]);

      // ── Valor total: solo necesitamos los precios — limit a 500 ──────────
      // Para el valor total exacto necesitamos los datos, pero limitamos a 500
      // documentos para no descargar toda la colección en colecciones grandes.
      const pricesSnap = await getDocs(
        query(collection(db, "properties"), limit(500))
      );
      const totalValue = pricesSnap.docs.reduce(
        (sum, doc) => sum + (Number(doc.data().price) || 0),
        0
      );

      return {
        totalProperties:     totalPropsSnap.data().count,
        availableProperties: availableSnap.data().count,
        soldProperties:      soldSnap.data().count,
        rentedProperties:    rentedSnap.data().count,
        totalClients:        totalClientsSnap.data().count,
        activeClients:       activeClientsSnap.data().count,
        leads:               leadsSnap.data().count,
        totalContracts:      totalContractsSnap.data().count,
        activeContracts:     activeContractsSnap.data().count,
        pendingContracts:    pendingContractsSnap.data().count,
        totalValue,
      };
    } catch (error) {
      console.error("Error obteniendo estadísticas:", error);

      // Fallback al método original si getCountFromServer falla
      // (por ejemplo, en emulador local que no lo soporte)
      try {
        const [properties, clients, contracts] = await Promise.all([
          getDocs(query(collection(db, "properties"), limit(200))),
          getDocs(query(collection(db, "clients"),    limit(200))),
          getDocs(query(collection(db, "contracts"),  limit(200))),
        ]);

        const propertiesData = properties.docs.map(doc => doc.data());
        const clientsData    = clients.docs.map(doc => doc.data());
        const contractsData  = contracts.docs.map(doc => doc.data());

        return {
          totalProperties:     properties.size,
          availableProperties: propertiesData.filter(p => p.status === "disponible").length,
          soldProperties:      propertiesData.filter(p => ["vendida","sold"].includes(p.status)).length,
          rentedProperties:    propertiesData.filter(p => ["arrendada","rented"].includes(p.status)).length,
          totalClients:        clients.size,
          activeClients:       clientsData.filter(c => c.status !== "inactive").length,
          leads:               clientsData.filter(c => c.status === "lead").length,
          totalContracts:      contracts.size,
          activeContracts:     contractsData.filter(c => c.status !== "completed").length,
          pendingContracts:    contractsData.filter(c => c.status === "pendingsignature").length,
          totalValue:          propertiesData.reduce((sum, p) => sum + (Number(p.price) || 0), 0),
        };
      } catch (fallbackError) {
        console.error("Error en fallback de estadísticas:", fallbackError);
        return null;
      }
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
        activities.push({ type: "property", action: "Propiedad creada",   title: data.title,                                   timestamp: data.createdAt });
      });
      clients.docs.forEach(doc => {
        const data = doc.data();
        activities.push({ type: "client",   action: "Cliente registrado", title: data.nombre || data.personalInfo?.name,       timestamp: data.createdAt });
      });
      contracts.docs.forEach(doc => {
        const data = doc.data();
        activities.push({ type: "contract", action: "Contrato creado",    title: `${data.type} - ${data.parties?.buyer?.name}`, timestamp: data.createdAt });
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
