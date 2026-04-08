import { useEffect, useRef, useState } from 'react';
import { visitService } from '../services/visit.service';

/**
 * useCalendarEvents — 3C
 *
 * Combina en tiempo real:
 *   - visits (aprobadas/completadas) de Firestore /visits
 *   - appointments nativos del CRM (excluye espejos sourceCollection='visits')
 *
 * Devuelve un array plano de eventos normalizados:
 *   { id, title, date, time, clientName, propertyName, agentName,
 *     status, source, color }
 *
 * FIX: colorCache movido a useRef para evitar que se recree en cada render
 * y causar re-renders en bucle que disparan múltiples listeners.
 */

const AGENT_COLORS = [
  '#f59e0b', '#10b981', '#3b82f6', '#a855f7',
  '#ef4444', '#f97316', '#06b6d4', '#84cc16',
];

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
  const [appointmentEvents, setAppointmentEvents] = useState([]);
  const [loading,           setLoading]           = useState(true);

  // FIX: useRef en lugar de objeto literal para que no se recree en cada render
  const colorCacheRef = useRef({});

  useEffect(() => {
    let loadedA = false;
    let loadedB = false;
    const check = () => { if (loadedA && loadedB) setLoading(false); };

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
        })));
        loadedA = true;
        check();
      },
      () => { loadedA = true; check(); }
    );

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
        })));
        loadedB = true;
        check();
      },
      () => { loadedB = true; check(); }
    );

    return () => {
      unsubVisits();
      unsubAppts();
    };
  }, []);

  // Combinar y ordenar por fecha+hora
  const events = [...visitsEvents, ...appointmentEvents].sort((a, b) => {
    const da  = `${a.date} ${a.time  || '00:00'}`;
    const db_ = `${b.date} ${b.time || '00:00'}`;
    return da.localeCompare(db_);
  });

  return { events, loading };
}
