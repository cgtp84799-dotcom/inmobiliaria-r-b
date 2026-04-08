import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { visitService } from '../services/visit.service';
import { useAuth } from '../../../core/contexts/AuthContext';
import toast from 'react-hot-toast';

export function useVisits() {
  // AuthContext expone currentUser, userData, isAdmin, isMember
  const { currentUser, userData, isAdmin, isMember } = useAuth();

  // role derivado del userData para lógica interna
  const role = userData?.role ?? null;

  const [visits,  setVisits]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const isMounted = useRef(true);

  useEffect(() => {
    // Esperar a que el usuario esté cargado Y tenga rol válido
    if (!currentUser || !role) return;

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
      if (isAdmin) {
        unsub = visitService.subscribeAll(
          safeSet((data) => { setVisits(data); setLoading(false); setError(null); }),
          onError,
        );
      } else {
        // member: combina pendientes sin agente + visitas asignadas a él
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
          currentUser.email,
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
  }, [currentUser?.email, role, isAdmin]);

  const counts = useMemo(
    () => visits.reduce((acc, v) => ({ ...acc, [v.status]: (acc[v.status] ?? 0) + 1 }), {}),
    [visits],
  );

  const approve = useCallback(async (visit, adminNotes = '', agentData = {}) => {
    try {
      let finalAgentData = agentData;
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
