import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { visitService } from '../services/visit.service';
import { useAuth } from '../../../core/contexts/AuthContext';
import toast from 'react-hot-toast';

/**
 * useVisits — hook para la página de administración de visitas.
 *
 * LÓGICA DE VISIBILIDAD POR ROL:
 *
 *  ┌──────────────────────────────────────────────────────────────────┐
 *  │ admin   → ve TODAS las visitas siempre.                          │
 *  │                                                                  │
 *  │ member  → ve DOS grupos:                                         │
 *  │   1. Visitas PENDIENTES (todos los members las ven para poder    │
 *  │      "tomarlas" aprobándolas).                                   │
 *  │   2. Visitas asignadas a ÉL (agentEmail == su email), sin        │
 *  │      importar el estado.                                         │
 *  │                                                                  │
 *  │   En cuanto un member aprueba una visita → se guarda su email    │
 *  │   como agentEmail → esa visita desaparece de la lista de         │
 *  │   PENDIENTES para todos los demás, y aparece solo en la lista    │
 *  │   del agente asignado.                                           │
 *  └──────────────────────────────────────────────────────────────────┘
 *
 * Cuando el member aprueba, el hook pasa su propio usuario como agentData
 * para que el servicio lo guarde en el documento.
 */
export function useVisits() {
  const { user, role } = useAuth();

  const [visits,  setVisits]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const isMounted = useRef(true);

  useEffect(() => {
    if (!user) return;
    isMounted.current = true;

    const safeSet = (fn) => (...args) => { if (isMounted.current) fn(...args); };

    const onError = safeSet((err) => {
      console.error('useVisits:', err);
      setError(err);
      setLoading(false);
      toast.error('Error al cargar las visitas');
    });

    let unsub = () => {};

    try {
      if (role === 'admin') {
        unsub = visitService.subscribeAll(
          safeSet((data) => { setVisits(data); setLoading(false); setError(null); }),
          onError,
        );
      } else {
        let pending  = [];
        let assigned = [];

        const merge = () => {
          const pendingWithoutAgent = pending.filter((v) => !v.agentEmail);
          const byId = new Map();
          [...pendingWithoutAgent, ...assigned].forEach((v) => byId.set(v.id, v));
          const merged = Array.from(byId.values()).sort(
            (a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0),
          );
          if (isMounted.current) {
            setVisits(merged);
            setLoading(false);
            setError(null);
          }
        };

        const unsubPending = visitService.subscribePending(
          (data) => { pending = data; merge(); },
          onError,
        );
        const unsubAssigned = visitService.subscribeByAgent(
          user.email,
          (data) => { assigned = data; merge(); },
          onError,
        );

        unsub = () => { unsubPending(); unsubAssigned(); };
      }
    } catch (err) {
      if (isMounted.current) { setError(err); setLoading(false); }
    }

    return () => {
      isMounted.current = false;
      try { unsub(); } catch (_) {}
    };
  }, [user?.email, role]);

  const counts = useMemo(
    () => visits.reduce((acc, v) => ({ ...acc, [v.status]: (acc[v.status] ?? 0) + 1 }), {}),
    [visits],
  );

  const approve = useCallback(async (visit, adminNotes = '', agentData = {}) => {
    try {
      let finalAgentData = agentData;
      if (role === 'member' && !agentData.agentId && user) {
        finalAgentData = {
          agentId:    user.uid,
          agentName:  user.displayName || user.email,
          agentEmail: user.email,
        };
      }
      await visitService.approveVisit(visit, adminNotes, finalAgentData);
      toast.success('Visita aprobada ✅');
    } catch (e) {
      console.error(e);
      toast.error('Error al aprobar la visita');
    }
  }, [user, role]);

  const reject = useCallback(async (visit, adminNotes = '') => {
    try {
      await visitService.rejectVisit(visit, adminNotes);
      toast.success('Visita rechazada');
    } catch { toast.error('Error al rechazar la visita'); }
  }, []);

  const complete = useCallback(async (visitId, adminNotes = '') => {
    try {
      await visitService.completeVisit(visitId, adminNotes);
      toast.success('Visita marcada como completada 🏁');
    } catch { toast.error('Error al completar la visita'); }
  }, []);

  const reschedule = useCallback(async (visit, proposedDate, proposedTime, adminNotes = '') => {
    try {
      await visitService.rescheduleVisit(visit, proposedDate, proposedTime, adminNotes);
      toast.success('Nueva fecha enviada al cliente 📅');
    } catch { toast.error('Error al proponer nueva fecha'); }
  }, []);

  const remove = useCallback(async (visitId) => {
    try {
      await visitService.deleteVisit(visitId);
      toast.success('Visita eliminada');
    } catch { toast.error('Error al eliminar la visita'); }
  }, []);

  return { visits, loading, error, counts, approve, reject, complete, reschedule, remove };
}
