import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { visitService } from '../services/visit.service';
import { useAuth } from '../../auth/hooks/useAuth';
import toast from 'react-hot-toast';

/**
 * useVisits — hook para la página de administración de visitas.
 *
 * Comportamiento por rol:
 *   admin  → ve TODAS las visitas (subscribeAll)
 *   member → ve SOLO las visitas donde agentEmail == su email (subscribeByAgent)
 *
 * API pública:
 * { visits, loading, error, counts, approve, reject, complete, reschedule, remove, reload }
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

    let unsub = () => {};

    const onData = (data) => {
      if (!isMounted.current) return;
      setVisits(data);
      setLoading(false);
      setError(null);
    };

    const onError = (err) => {
      if (!isMounted.current) return;
      console.error('useVisits error:', err);
      setError(err);
      setLoading(false);
      toast.error('Error al cargar las visitas');
    };

    try {
      // Admin ve todo — member ve solo sus visitas asignadas
      if (role === 'admin') {
        unsub = visitService.subscribeAll(onData, onError);
      } else {
        // member: filtra por su propio email
        unsub = visitService.subscribeByAgent(user.email, onData, onError);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err);
        setLoading(false);
      }
    }

    return () => {
      isMounted.current = false;
      try { unsub(); } catch (_) {}
    };
  }, [user?.email, role]);

  // Contadores por estado
  const counts = useMemo(
    () => visits.reduce((acc, v) => ({ ...acc, [v.status]: (acc[v.status] ?? 0) + 1 }), {}),
    [visits],
  );

  const approve = useCallback(async (visit, adminNotes = '', agentData = {}) => {
    try {
      await visitService.approveVisit(visit, adminNotes, agentData);
      toast.success('Visita aprobada ✅');
    } catch (e) {
      console.error(e);
      toast.error('Error al aprobar la visita');
    }
  }, []);

  const reject = useCallback(async (visit, adminNotes = '') => {
    try {
      await visitService.rejectVisit(visit, adminNotes);
      toast.success('Visita rechazada');
    } catch {
      toast.error('Error al rechazar la visita');
    }
  }, []);

  const complete = useCallback(async (visitId, adminNotes = '') => {
    try {
      await visitService.completeVisit(visitId, adminNotes);
      toast.success('Visita marcada como completada 🏁');
    } catch {
      toast.error('Error al completar la visita');
    }
  }, []);

  const reschedule = useCallback(async (visit, proposedDate, proposedTime, adminNotes = '') => {
    try {
      await visitService.rescheduleVisit(visit, proposedDate, proposedTime, adminNotes);
      toast.success('Nueva fecha enviada al cliente 📅');
    } catch {
      toast.error('Error al proponer nueva fecha');
    }
  }, []);

  const remove = useCallback(async (visitId) => {
    try {
      await visitService.deleteVisit(visitId);
      toast.success('Visita eliminada');
    } catch {
      toast.error('Error al eliminar la visita');
    }
  }, []);

  const reload = useCallback(() => {}, []);

  return { visits, loading, error, counts, approve, reject, complete, reschedule, remove, reload };
}
