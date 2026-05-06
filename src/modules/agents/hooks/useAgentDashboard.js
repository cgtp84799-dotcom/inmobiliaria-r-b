// src/modules/agents/hooks/useAgentDashboard.js
// Hook central del AgentDashboard — une Firestore en tiempo real con datos calculados
//
//   - `scheduledAt` (no existe — el campo real es `requestedDate` string YYYY-MM-DD
//     + `requestedTime`).
//   - `status === 'active'` para propiedades (real: 'disponible' / 'reservada' / 'arrendada' / 'vendida').
//   - `status === 'active'` para contratos (real: 'vigente').
//   - `status === 'cancelled'` para visitas (real: 'cancelada' o 'cancelled' según origen).
//
// Resultado: TODOS los KPIs del agent dashboard quedaban en 0.
// Ahora se calcula en cliente sobre el conjunto de visitas/propiedades/
// contratos del agente — costo bajo (un agente típico tiene <100 docs)
// y elimina la necesidad de índices compuestos sobre Timestamp.

import { useEffect, useState, useCallback } from 'react';
import {
  collection, query, where, onSnapshot,
  orderBy, limit,
} from 'firebase/firestore';
import { db } from '../../../core/config/firebase.config';

// ── Helpers para fechas ─────────────────────────────────────────────────────
const ymdToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const isThisMonth = (timestampOrDate) => {
  if (!timestampOrDate) return false;
  const d = timestampOrDate?.toDate?.() ?? new Date(timestampOrDate);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
};

// Estados públicos (visibles) de propiedad. Acepta canónicos + aliases legacy.
const ACTIVE_PROPERTY_STATUSES = new Set([
  'published', 'reserved',
  'disponible', 'reservada', 'available', 'active',
]);
// Estados activos de contrato (corresponde a CONTRACT_STATUS)
const ACTIVE_CONTRACT_STATUSES = new Set(['vigente', 'active']);
// Visitas canceladas (admite ambos formatos: cliente cancela usa 'cancelada')
const CANCELLED_VISIT_STATUSES = new Set(['cancelled', 'cancelada', 'cancelado']);

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
    const normalizedEmail = String(agentEmail).toLowerCase().trim();

    const unsubs = [];

    // ── Todas mis visitas (KPIs + lista de hoy + mes) ──────────────────────
    // Una sola query, calculamos derivados en cliente.
    const qVisitsAll = query(
      collection(db, 'visits'),
      where('agentEmail', '==', normalizedEmail),
    );
    unsubs.push(onSnapshot(qVisitsAll, snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const today = ymdToday();

      const visitsHoy = all
        .filter(v => v.requestedDate === today)
        .sort((a, b) => String(a.requestedTime || '').localeCompare(String(b.requestedTime || '')));

      const monthVisits = all.filter(v => isThisMonth(v.createdAt)).length;

      updateState({
        visitsHoy,
        visitsToday:     visitsHoy.length,
        visitsPending:   all.filter(v => v.status === 'pending').length,
        visitsCompleted: all.filter(v => v.status === 'completed' || v.status === 'completada').length,
        visitsCancelled: all.filter(v => CANCELLED_VISIT_STATUSES.has(v.status)).length,
        monthVisits,
      });
    }, (e) => console.warn('[useAgentDashboard] visits:', e?.code)));

    // ── Propiedades del agente ──────────────────────────────────────────────
    const qProps = query(
      collection(db, 'properties'),
      where('agentEmail', '==', normalizedEmail),
      orderBy('createdAt', 'desc'),
      limit(20),
    );
    unsubs.push(onSnapshot(qProps, snap => {
      const propertiesAll = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const propertiesRecent = propertiesAll.slice(0, 6);
      const propertiesActive = propertiesAll.filter(p =>
        ACTIVE_PROPERTY_STATUSES.has(String(p.status || '').toLowerCase())
      ).length;
      const monthProperties = propertiesAll.filter(p => isThisMonth(p.createdAt)).length;

      updateState({
        propertiesRecent,
        propertiesActive,
        propertiesTotal: snap.size,
        monthProperties,
      });
    }, (e) => console.warn('[useAgentDashboard] properties:', e?.code)));

    // ── Contratos del agente ────────────────────────────────────────────────
    const qContracts = query(
      collection(db, 'contracts'),
      where('agentEmail', '==', normalizedEmail),
      orderBy('createdAt', 'desc'),
      limit(20),
    );
    unsubs.push(onSnapshot(qContracts, snap => {
      const contractsAll = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const contractsRecent = contractsAll.slice(0, 5);
      const activeContracts = contractsAll.filter(c =>
        ACTIVE_CONTRACT_STATUSES.has(String(c.statusGeneral || c.status || '').toLowerCase())
      );
      const monthContracts = contractsAll.filter(c => isThisMonth(c.createdAt)).length;

      updateState({
        contractsRecent,
        contractsActive: activeContracts.length,
        contractsValue:  activeContracts.reduce((sum, c) => sum + (Number(c.value) || 0), 0),
        monthContracts,
      });
    }, (e) => console.warn('[useAgentDashboard] contracts:', e?.code)));

    // ── Actividad reciente (notifications) ─────────────────────────────────
    const qActivity = query(
      collection(db, 'notifications'),
      where('userId', '==', normalizedEmail),
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