import { useEffect, useRef, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../../core/config/firebase.config';
import { visitService } from '../services/visit.service';

/**
 * useCalendarEvents
 *
 * Combina en tiempo real:
 *   - visits aprobadas/completadas/reprogramadas de /visits
 *   - visits PENDIENTES de /visits (con estilo diferenciado)
 *   - appointments nativos del CRM
 *
 * Cada evento tiene un campo `pending: boolean` para que el
 * CalendarPage pueda renderizarlo con estilo rayado/opaco.
 */

const AGENT_COLORS = [
  '#f59e0b', '#10b981', '#3b82f6', '#a855f7',
  '#ef4444', '#f97316', '#06b6d4', '#84cc16',
];

const PENDING_COLOR = '#94a3b8'; // slate-400

function agentColor(agentId, cache) {
  if (!agentId) return '#64748b';
  if (!cache[agentId]) {
    const idx = Object.keys(cache).length % AGENT_COLORS.length;
    cache[agentId] = AGENT_COLORS[idx];
  }
  return cache[agentId];
}

export function useCalendarEvents() {
  const [visitsEvents,      setVisitsEvents]      = useState([]);
  const [pendingEvents,     setPendingEvents]     = useState([]);
  const [appointmentEvents, setAppointmentEvents] = useState([]);
  const [loading,           setLoading]           = useState(true);

  const colorCacheRef = useRef({});

  useEffect(() => {
    let loadedA = false;
    let loadedB = false;
    let loadedC = false;
    const check = () => { if (loadedA && loadedB && loadedC) setLoading(false); };

    // 1. Visitas confirmadas (aprobadas/completadas/reprogramadas)
    const unsubVisits = visitService.subscribeCalendar(
      (data) => {
        setVisitsEvents(data.map((v) => ({
          id:           v.id,
          title:        v.propertyName ?? 'Visita',
          date:         v.requestedDate,
          time:         v.requestedTime,
          clientName:   v.clientName,
          propertyName: v.propertyName,
          agentName:    v.agentName ?? null,
          status:       v.status,
          source:       'visits',
          color:        agentColor(v.agentId, colorCacheRef.current),
          pending:      false,
        })));
        loadedA = true;
        check();
      },
      () => { loadedA = true; check(); }
    );

    // 2. Visitas PENDIENTES — estilo diferenciado en el calendario
    const pendingQuery = query(
      collection(db, 'visits'),
      where('status', '==', 'pending'),
      orderBy('requestedDate', 'asc')
    );
    const unsubPending = onSnapshot(pendingQuery,
      (snap) => {
        setPendingEvents(snap.docs.map((d) => {
          const v = d.data();
          return {
            id:           d.id,
            title:        v.propertyName ?? 'Visita pendiente',
            date:         v.requestedDate,
            time:         v.requestedTime,
            clientName:   v.clientName,
            propertyName: v.propertyName,
            agentName:    v.agentName ?? null,
            status:       'pending',
            source:       'visits',
            color:        PENDING_COLOR,
            pending:      true,
          };
        }));
        loadedB = true;
        check();
      },
      () => { loadedB = true; check(); }
    );

    // 3. Appointments nativos del CRM
    const unsubAppts = visitService.subscribeCalendarAppointments(
      (data) => {
        setAppointmentEvents(data.map((a) => ({
          id:           a.id,
          title:        a.propertyName ?? a.title ?? 'Cita',
          date:         a.date,
          time:         a.time,
          clientName:   a.clientName,
          propertyName: a.propertyName,
          agentName:    a.agentName ?? null,
          status:       a.status,
          source:       'appointments',
          color:        agentColor(a.agentId, colorCacheRef.current),
          pending:      false,
        })));
        loadedC = true;
        check();
      },
      () => { loadedC = true; check(); }
    );

    return () => {
      unsubVisits();
      unsubPending();
      unsubAppts();
    };
  }, []);

  const events = [...visitsEvents, ...pendingEvents, ...appointmentEvents].sort((a, b) => {
    const da  = `${a.date} ${a.time || '00:00'}`;
    const db_ = `${b.date} ${b.time || '00:00'}`;
    return da.localeCompare(db_);
  });

  return { events, loading };
}