import { useEffect, useState, useMemo } from 'react';
import {
  collection, onSnapshot, query, where, orderBy,
} from 'firebase/firestore';
import { db } from '../../../core/services/firebase';

/**
 * useAgentStats — suscripción en tiempo real a visitas + contratos
 * filtrados por agentEmail. Calcula métricas derivadas en memoria.
 *
 * Si agentEmail es null/undefined carga TODOS los documentos
 * (usado en AgentsPage para calcular rankings globales).
 *
 * @param {string|null} agentEmail
 */
export function useAgentStats(agentEmail = null) {
  const [visits,    setVisits]    = useState([]);
  const [contracts, setContracts] = useState([]);
  const [users,     setUsers]     = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    let visitsUnsub    = () => {};
    let contractsUnsub = () => {};
    let usersUnsub     = () => {};
    let loadedCount    = 0;
    const total        = 3;

    const maybeReady = () => {
      loadedCount++;
      if (loadedCount >= total) setLoading(false);
    };

    // ── Visitas ──────────────────────────────────────────────────────────
    const visitsRef = collection(db, 'visits');
    const visitsQ   = agentEmail
      ? query(visitsRef, where('agentEmail', '==', agentEmail), orderBy('createdAt', 'desc'))
      : query(visitsRef, orderBy('createdAt', 'desc'));

    visitsUnsub = onSnapshot(visitsQ, (snap) => {
      setVisits(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      maybeReady();
    }, () => maybeReady());

    // ── Contratos ────────────────────────────────────────────────────────
    const contractsRef = collection(db, 'contracts');
    const contractsQ   = agentEmail
      ? query(contractsRef, where('agentEmail', '==', agentEmail), orderBy('createdAt', 'desc'))
      : query(contractsRef, orderBy('createdAt', 'desc'));

    contractsUnsub = onSnapshot(contractsQ, (snap) => {
      setContracts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      maybeReady();
    }, () => maybeReady());

    // ── Usuarios (agentes) ───────────────────────────────────────────────
    const usersRef = collection(db, 'users');
    const usersQ   = query(
      usersRef,
      where('role', 'in', ['admin', 'member', 'agent']),
    );
    usersUnsub = onSnapshot(usersQ, (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      maybeReady();
    }, () => maybeReady());

    return () => { visitsUnsub(); contractsUnsub(); usersUnsub(); };
  }, [agentEmail]);

  // ── Métricas calculadas ──────────────────────────────────────────────────
  const stats = useMemo(() => {
    const now      = new Date();
    const thisMonth = now.getMonth();
    const thisYear  = now.getFullYear();

    const toDate = (v) => v?.toDate ? v.toDate() : (v ? new Date(v) : null);

    // Visitas
    const totalVisits     = visits.length;
    const pendingVisits   = visits.filter((v) => v.status === 'pending').length;
    const completedVisits = visits.filter((v) => v.status === 'completed').length;
    const visitsThisMonth = visits.filter((v) => {
      const d = toDate(v.createdAt);
      return d && d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;

    // Contratos
    const totalContracts  = contracts.length;
    const activeContracts = contracts.filter((c) => c.status === 'active').length;
    const totalRevenue    = contracts
      .filter((c) => c.status === 'active')
      .reduce((sum, c) => sum + (Number(c.value) || 0), 0);
    const contractsThisMonth = contracts.filter((c) => {
      const d = toDate(c.createdAt);
      return d && d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;

    // Tasa de conversión: visitas completadas → contratos activos
    const conversionRate = completedVisits > 0
      ? Math.min(100, Math.round((activeContracts / completedVisits) * 100))
      : 0;

    // Últimas 6 semanas — datos para sparkline
    const weeklyVisits = Array.from({ length: 6 }, (_, i) => {
      const start = new Date(now);
      start.setDate(start.getDate() - (5 - i) * 7 - start.getDay());
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      return visits.filter((v) => {
        const d = toDate(v.createdAt);
        return d && d >= start && d < end;
      }).length;
    });

    // Últimos 6 meses — datos para gráfica mensual
    const monthlyData = Array.from({ length: 6 }, (_, i) => {
      const date  = new Date(thisYear, thisMonth - (5 - i), 1);
      const month = date.getMonth();
      const year  = date.getFullYear();
      const label = date.toLocaleDateString('es-CO', { month: 'short' });
      return {
        label,
        visits: visits.filter((v) => {
          const d = toDate(v.createdAt);
          return d && d.getMonth() === month && d.getFullYear() === year;
        }).length,
        contracts: contracts.filter((c) => {
          const d = toDate(c.createdAt);
          return d && d.getMonth() === month && d.getFullYear() === year;
        }).length,
      };
    });

    // Actividad reciente (mezcla visitas + contratos, ordenada por fecha)
    const recentActivity = [
      ...visits.slice(0, 20).map((v) => ({
        id:      v.id,
        type:    'visit',
        title:   v.propertyTitle || v.propertyAddress || 'Propiedad sin nombre',
        client:  v.clientName   || v.visitorName || v.email || '—',
        status:  v.status,
        date:    toDate(v.createdAt),
        agent:   v.agentName  || v.agentEmail || '—',
        agentEmail: v.agentEmail,
      })),
      ...contracts.slice(0, 20).map((c) => ({
        id:      c.id,
        type:    'contract',
        title:   c.propertyName || '—',
        client:  c.clientName  || '—',
        status:  c.status,
        date:    toDate(c.createdAt),
        agent:   c.agentName  || c.agentEmail || '—',
        agentEmail: c.agentEmail,
        value:   c.value,
      })),
    ]
      .filter((a) => a.date)
      .sort((a, b) => b.date - a.date)
      .slice(0, 30);

    return {
      totalVisits,
      pendingVisits,
      completedVisits,
      visitsThisMonth,
      totalContracts,
      activeContracts,
      totalRevenue,
      contractsThisMonth,
      conversionRate,
      weeklyVisits,
      monthlyData,
      recentActivity,
    };
  }, [visits, contracts]);

  return { stats, visits, contracts, users, loading };
}
