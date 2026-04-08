import { useCallback, useEffect, useMemo, useState } from 'react';
import { visitService } from '../services/visit.service';
import { VISIT_STATUS } from '../types/visit.types';
import toast from 'react-hot-toast';

/**
 * useVisits — hook para la página de administración de visitas.
 *
 * Fix StrictMode: usamos un flag `mounted` para evitar que el cleanup
 * llame unsub() sobre un listener que Firestore aún no terminó de
 * inicializar (causa del INTERNAL ASSERTION FAILED ca9/b815).
 */
export function useVisits() {
  const [visits,  setVisits]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    let mounted = true;
    let unsub = null;

    // Pequeño delay para evitar el race condition de StrictMode:
    // React desmonta+remonta sincrónicamente en dev, pero Firestore
    // registra el listener de forma asíncrona. Al esperar un tick,
    // el segundo mount (el real) ya tiene unsub definido correctamente.
    const timer = setTimeout(() => {
      if (!mounted) return;

      unsub = visitService.subscribeAll(
        (data) => { if (mounted) { setVisits(data); setLoading(false); } },
        (err)  => { if (mounted) { setError(err); setLoading(false); toast.error('Error al cargar las visitas'); } }
      );
    }, 0);

    return () => {
      mounted = false;
      clearTimeout(timer);
      if (unsub) unsub();
    };
  }, []);

  const counts = useMemo(
    () => visits.reduce((acc, v) => ({ ...acc, [v.status]: (acc[v.status] ?? 0) + 1 }), {}),
    [visits]
  );

  const approve = useCallback(async (visit, adminNotes = '') => {
    try {
      await visitService.approveVisit(visit, adminNotes);
      toast.success('Visita aprobada');
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
      toast.success('Visita marcada como completada');
    } catch {
      toast.error('Error al completar la visita');
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

  return { visits, loading, error, counts, approve, reject, complete, remove, reload };
}
