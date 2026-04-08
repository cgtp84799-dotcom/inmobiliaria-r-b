import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { visitService } from '../services/visit.service';
import { useAuth } from '../../../core/contexts/AuthContext';
import toast from 'react-hot-toast';

export function useVisits() {
  // ✅ Usar los booleans del AuthContext — no derivar role manualmente
  const { currentUser, userData, isAdmin, isMember, canOperate } = useAuth();

  const [visits,  setVisits]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const isMounted = useRef(true);

  useEffect(() => {
    // Esperar a que userData esté cargado (puede ser null durante el primer render)
    if (!currentUser || !userData) return;

    isMounted.current = true;
    const safeSet = (fn) => (...args) => { if (isMounted.current) fn(...args); };

    const onError = safeSet((err) => {
      console.error('useVisits:', err);
      setError(err);
      setLoading(false);
      // Solo mostrar toast si NO es un error de índice (ese se maneja silencioso en subscribeAll)
      if (err?.code !== 'failed-precondition') {
        toast.error('Error al cargar las visitas');
      }
    });

    let unsub = () => {};

    try {
      if (isAdmin) {
        // Admin: ve TODAS las visitas
        unsub = visitService.subscribeAll(
          safeSet((data) => { setVisits(data); setLoading(false); setError(null); }),
          onError,
        );
      } else if (isMember || canOperate) {
        // Member: combina pendientes sin agente + visitas asignadas a él
        let pending  = [];
        let assigned = [];
        let pendingReady  = false;
        let assignedReady = false;

        const merge = () => {
          // Solo emitir cuando ambas fuentes hayan respondido al menos una vez
          if (!pendingReady || !assignedReady) return;
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
          (data) => { pending = data; pendingReady = true; merge(); },
          onError,
        );
        const unsubAssigned = visitService.subscribeByAgent(
          currentUser.email,
          (data) => { assigned = data; assignedReady = true; merge(); },
          onError,
        );

        unsub = () => { unsubPending(); unsubAssigned(); };
      } else {
        // Viewer u otro rol: sin acceso a visitas
        setVisits([]);
        setLoading(false);
      }
    } catch (err) {
      if (isMounted.current) { setError(err); setLoading(false); }
    }

    return () => {
      isMounted.current = false;
      try { unsub(); } catch (_) {}
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.email, isAdmin, isMember, canOperate]);

  const counts = useMemo(
    () => visits.reduce((acc, v) => ({ ...acc, [v.status]: (acc[v.status] ?? 0) + 1 }), {}),
    [visits],
  );

  const approve = useCallback(async (visit, adminNotes = '', agentData = {}) => {
    try {
      let finalAgentData = agentData;
      // Si es member y no se seleccionó agente explícito, se auto-asigna
      if (isMember && !agentData.agentId && currentUser) {
        finalAgentData = {
          agentId:    currentUser.uid,
          agentName:  currentUser.displayName || currentUser.email,
          agentEmail: currentUser.email,
        };
      }
      await visitService.approveVisit(visit, adminNotes, finalAgentData);
      toast.success('Visita aprobada ✅');
    } catch (e) {
      console.error(e);
      toast.error('Error al aprobar la visita');
    }
  }, [currentUser, isMember]);

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

  return { visits, loading, error, counts, approve, reject, complete, reschedule, remove };
}
