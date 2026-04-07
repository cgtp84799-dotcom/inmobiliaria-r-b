// src/modules/agents/hooks/useAgentDashboard.js
// Hook central del AgentDashboard — une Firestore en tiempo real con datos calculados

import { useEffect, useState, useCallback } from 'react';
import {
  collection, query, where, onSnapshot,
  orderBy, limit, Timestamp,
} from 'firebase/firestore';
import { db } from '../../../core/services/firebase';

const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return Timestamp.fromDate(d);
};

const tomorrow = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return Timestamp.fromDate(d);
};

const startOfMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return Timestamp.fromDate(d);
};

export const useAgentDashboard = (agentEmail) => {
  const [state, setState] = useState({
    loading: true,
    // KPIs
    visitsToday:        0,
    visitsPending:      0,
    visitsCompleted:    0,
    visitsCancelled:    0,
    propertiesActive:   0,
    propertiesTotal:    0,
    contractsActive:    0,
    contractsValue:     0,
    // Listas
    visitsHoy:          [],
    propertiesRecent:   [],
    contractsRecent:    [],
    activity:           [],
    // Metas del mes
    monthVisits:        0,
    monthContracts:     0,
    monthProperties:    0,
  });

  const updateState = useCallback((patch) =>
    setState(prev => ({ ...prev, ...patch })),
  []);

  useEffect(() => {
    if (!agentEmail) return;

    const unsubs = [];

    // ── Visitas de hoy ──────────────────────────────────────────────────────
    const qVisitsHoy = query(
      collection(db, 'visits'),
      where('agentEmail', '==', agentEmail),
      where('scheduledAt', '>=', today()),
      where('scheduledAt', '<=', tomorrow()),
      orderBy('scheduledAt', 'asc'),
    );
    unsubs.push(onSnapshot(qVisitsHoy, snap => {
      const visitsHoy = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      updateState({ visitsHoy, visitsToday: visitsHoy.length });
    }));

    // ── Todas mis visitas (para KPIs de estado) ─────────────────────────────
    const qVisitsAll = query(
      collection(db, 'visits'),
      where('agentEmail', '==', agentEmail),
    );
    unsubs.push(onSnapshot(qVisitsAll, snap => {
      const all = snap.docs.map(d => d.data());
      updateState({
        visitsPending:   all.filter(v => v.status === 'pending').length,
        visitsCompleted: all.filter(v => v.status === 'completed').length,
        visitsCancelled: all.filter(v => v.status === 'cancelled').length,
      });
    }));

    // ── Visitas del mes ─────────────────────────────────────────────────────
    const qVisitsMes = query(
      collection(db, 'visits'),
      where('agentEmail', '==', agentEmail),
      where('scheduledAt', '>=', startOfMonth()),
    );
    unsubs.push(onSnapshot(qVisitsMes, snap =>
      updateState({ monthVisits: snap.size }),
    ));

    // ── Propiedades recientes ───────────────────────────────────────────────
    const qProps = query(
      collection(db, 'properties'),
      where('agentEmail', '==', agentEmail),
      orderBy('createdAt', 'desc'),
      limit(6),
    );
    unsubs.push(onSnapshot(qProps, snap => {
      const propertiesRecent = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      updateState({
        propertiesRecent,
        propertiesActive: propertiesRecent.filter(p => p.status === 'active').length,
        propertiesTotal:  snap.size,
      });
    }));

    // ── Propiedades del mes ─────────────────────────────────────────────────
    const qPropsMes = query(
      collection(db, 'properties'),
      where('agentEmail', '==', agentEmail),
      where('createdAt', '>=', startOfMonth()),
    );
    unsubs.push(onSnapshot(qPropsMes, snap =>
      updateState({ monthProperties: snap.size }),
    ));

    // ── Contratos ───────────────────────────────────────────────────────────
    const qContracts = query(
      collection(db, 'contracts'),
      where('agentEmail', '==', agentEmail),
      orderBy('createdAt', 'desc'),
      limit(5),
    );
    unsubs.push(onSnapshot(qContracts, snap => {
      const contractsRecent = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const activeContracts = contractsRecent.filter(c => c.status === 'active');
      updateState({
        contractsRecent,
        contractsActive: activeContracts.length,
        contractsValue:  activeContracts.reduce((sum, c) => sum + (c.value || 0), 0),
      });
    }));

    // ── Contratos del mes ───────────────────────────────────────────────────
    const qContractsMes = query(
      collection(db, 'contracts'),
      where('agentEmail', '==', agentEmail),
      where('createdAt', '>=', startOfMonth()),
    );
    unsubs.push(onSnapshot(qContractsMes, snap =>
      updateState({ monthContracts: snap.size }),
    ));

    // ── Actividad reciente (notifications) ─────────────────────────────────
    const qActivity = query(
      collection(db, 'notifications'),
      where('userId', '==', agentEmail),
      orderBy('createdAt', 'desc'),
      limit(10),
    );
    unsubs.push(onSnapshot(qActivity, snap => {
      const activity = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      updateState({ activity, loading: false });
    }, () => updateState({ loading: false })));

    return () => unsubs.forEach(u => u());
  }, [agentEmail, updateState]);

  return state;
};
