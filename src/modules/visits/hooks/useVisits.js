import { useCallback, useEffect, useMemo, useState } from 'react';
import { visitService } from '../services/visit.service';
import { VISIT_STATUS } from '../types/visit.types';
import toast from 'react-hot-toast';

/**
 * useVisits — hook para la página de administración de visitas.
 *
 * API pública:
 * { visits, loading, error, counts, approve, reject, complete, reschedule, remove, reload }
 */
export function useVisits() {
  const [visits,  setVisits]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    const unsub = visitService.subscribeAll(
      (data) => { setVisits(data); setLoading(false); },
      (err)  => { setError(err);   setLoading(false); toast.error('Error al cargar las visitas'); },
    );
    return () => unsub();
  }, []);

  // Contadores por estado (incluye rescheduled)
  const counts = useMemo(
    () => visits.reduce((acc, v) => ({ ...acc, [v.status]: (acc[v.status] ?? 0) + 1 }), {}),
    [visits],
  );

  // ── Acciones ───────────────────────────────────────────────────────────────
  const approve = useCallback(async (visit, adminNotes = '', agentData = {}) => {
    try {
      await visitService.approveVisit(visit, adminNotes, agentData);
      toast.success('Visita aprobada ✅');
    } catch {
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

  // reload mantenido por compatibilidad — con onSnapshot es no-op
  const reload = useCallback(() => {}, []);

  return { visits, loading, error, counts, approve, reject, complete, reschedule, remove, reload };
}
