import { useCallback, useEffect, useState } from 'react';
import { visitService } from '../services/visit.service';
import { VISIT_STATUS } from '../types/visit.types';
import toast from 'react-hot-toast';

/**
 * useVisits — hook para la página de administración de visitas.
 *
 * Carga todas las visitas una vez y expone helpers para
 * aprobar, rechazar y completar sin recargar la página.
 */
export function useVisits() {
  const [visits,  setVisits]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await visitService.getAllVisits();
      setVisits(data);
    } catch (e) {
      setError(e);
      toast.error('Error al cargar las visitas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Helpers — actualizan el estado local sin recargar Firestore
  const optimisticUpdate = (visitId, patch) =>
    setVisits((prev) =>
      prev.map((v) => (v.id === visitId ? { ...v, ...patch } : v))
    );

  const approve = async (visit, adminNotes = '') => {
    try {
      await visitService.approveVisit(visit, adminNotes);
      optimisticUpdate(visit.id, { status: VISIT_STATUS.APPROVED, adminNotes });
      toast.success('Visita aprobada');
    } catch {
      toast.error('Error al aprobar la visita');
    }
  };

  const reject = async (visit, adminNotes = '') => {
    try {
      await visitService.rejectVisit(visit, adminNotes);
      optimisticUpdate(visit.id, { status: VISIT_STATUS.REJECTED, adminNotes });
      toast.success('Visita rechazada');
    } catch {
      toast.error('Error al rechazar la visita');
    }
  };

  const complete = async (visitId, adminNotes = '') => {
    try {
      await visitService.completeVisit(visitId, adminNotes);
      optimisticUpdate(visitId, { status: VISIT_STATUS.COMPLETED, adminNotes });
      toast.success('Visita marcada como completada');
    } catch {
      toast.error('Error al completar la visita');
    }
  };

  const remove = async (visitId) => {
    try {
      await visitService.deleteVisit(visitId);
      setVisits((prev) => prev.filter((v) => v.id !== visitId));
      toast.success('Visita eliminada');
    } catch {
      toast.error('Error al eliminar la visita');
    }
  };

  // Contadores por estado para los badges de los tabs
  const counts = visits.reduce(
    (acc, v) => ({ ...acc, [v.status]: (acc[v.status] ?? 0) + 1 }),
    {}
  );

  return { visits, loading, error, counts, approve, reject, complete, remove, reload: load };
}
