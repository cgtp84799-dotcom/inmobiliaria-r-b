import { useEffect, useState } from 'react';
import { visitService } from '../services/visit.service';

/**
 * useCalendarEvents — 3C
 *
 * Fix StrictMode: flag `mounted` + setTimeout(0) evita el race condition
 * donde React desmonta el componente antes de que Firestore termine
 * de registrar el listener (INTERNAL ASSERTION FAILED ca9/b815).
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
  const colorCache = {};

  useEffect(() => {
    let mounted = true;
    let unsubVisits = null;
    let unsubAppts  = null;
    let loadedA = false;
    let loadedB = false;

    const check = () => { if (mounted && loadedA && loadedB) setLoading(false); };

    const timer = setTimeout(() => {
      if (!mounted) return;

      unsubVisits = visitService.subscribeCalendar(
        (data) => {
          if (!mounted) return;
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
            color:        agentColor(v.agentId, colorCache),
          })));
          loadedA = true;
          check();
        },
        () => { loadedA = true; check(); }
      );

      unsubAppts = visitService.subscribeCalendarAppointments(
        (data) => {
          if (!mounted) return;
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
            color:        agentColor(a.agentId, colorCache),
          })));
          loadedB = true;
          check();
        },
        () => { loadedB = true; check(); }
      );
    }, 0);

    return () => {
      mounted = false;
      clearTimeout(timer);
      if (unsubVisits) unsubVisits();
      if (unsubAppts)  unsubAppts();
    };
  }, []);

  const events = [...visitsEvents, ...appointmentEvents].sort((a, b) => {
    const da  = `${a.date} ${a.time  || '00:00'}`;
    const db_ = `${b.date} ${b.time || '00:00'}`;
    return da.localeCompare(db_);
  });

  return { events, loading };
}
