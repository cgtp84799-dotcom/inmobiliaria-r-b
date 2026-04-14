// src/modules/clients/hooks/useClientPortal.js
// v2: expone cancelVisit()

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../core/contexts/AuthContext';
import {
  resolveClientByEmail,
  subscribeToClientProfile,
  subscribeToClientVisits,
  subscribeToClientContracts,
  subscribeToClientNotifications,
  getFavoriteProperties,
  addToFavorites,
  removeFromFavorites,
  updateClientProfile,
  completeOnboarding,
  cancelVisit,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '../services/client.portal.service';
import toast from 'react-hot-toast';

export function useClientPortal() {
  const { currentUser } = useAuth();
  const email = currentUser?.email ?? null;

  const [clientId,      setClientId]      = useState(null);
  const [clientData,    setClientData]    = useState(null);
  const [visits,        setVisits]        = useState([]);
  const [contracts,     setContracts]     = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [favProps,      setFavProps]      = useState([]);
  const [loadingProfile,  setLoadingProfile]  = useState(true);
  const [loadingFavProps, setLoadingFavProps] = useState(false);

  const isMounted   = useRef(true);
  const clientIdRef = useRef(null);

  // ── 1. Resolver clientId ───────────────────────────────────────────────────
  useEffect(() => {
    isMounted.current = true;
    if (!email) { setLoadingProfile(false); return; }

    let unsubProfile = null;

    resolveClientByEmail(email)
      .then((data) => {
        if (!isMounted.current) return;
        setClientId(data.id);
        clientIdRef.current = data.id;
        setClientData(data);
        setLoadingProfile(false);

        unsubProfile = subscribeToClientProfile(data.id, (updated) => {
          if (isMounted.current) setClientData(updated);
        });
      })
      .catch((err) => {
        console.error('useClientPortal: resolveClientByEmail', err);
        if (isMounted.current) setLoadingProfile(false);
      });

    return () => {
      isMounted.current = false;
      unsubProfile?.();
    };
  }, [email]);

  // ── 2. Visitas ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!email) return;
    const unsub = subscribeToClientVisits(email,
      (data) => { if (isMounted.current) setVisits(data); },
      (err)  => console.error('useClientPortal: visitas', err)
    );
    return unsub;
  }, [email]);

  // ── 3. Contratos ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!email) return;
    const unsub = subscribeToClientContracts(email,
      (data) => { if (isMounted.current) setContracts(data); },
      (err)  => console.error('useClientPortal: contratos', err)
    );
    return unsub;
  }, [email]);

  // ── 4. Notificaciones ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!email) return;
    const unsub = subscribeToClientNotifications(email,
      (data) => { if (isMounted.current) setNotifications(data); },
      (err)  => console.error('useClientPortal: notificaciones', err)
    );
    return unsub;
  }, [email]);

  // ── 5. Propiedades favoritas ───────────────────────────────────────────────
  useEffect(() => {
    const ids = clientData?.favorites ?? [];
    if (!ids.length) { setFavProps([]); return; }
    setLoadingFavProps(true);
    getFavoriteProperties(ids)
      .then((props) => { if (isMounted.current) setFavProps(props); })
      .catch((err) => console.error('useClientPortal: favProps', err))
      .finally(() => { if (isMounted.current) setLoadingFavProps(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(clientData?.favorites)]);

  // ── Acciones: favoritos ────────────────────────────────────────────────────
  const toggleFavorite = useCallback(async (propertyId) => {
    const id = clientIdRef.current;
    if (!id) { toast.error('Perfil no encontrado'); return; }
    const isFav = (clientData?.favorites ?? []).includes(propertyId);
    try {
      if (isFav) {
        await removeFromFavorites(id, propertyId);
        toast('Eliminado de favoritos', { icon: '🗑️' });
      } else {
        await addToFavorites(id, propertyId);
        toast.success('¡Guardado en favoritos!', { icon: '❤️' });
      }
    } catch {
      toast.error('Error al actualizar favoritos');
    }
  }, [clientData?.favorites]);

  const isFavorite = useCallback(
    (propertyId) => (clientData?.favorites ?? []).includes(propertyId),
    [clientData?.favorites]
  );

  // ── Acciones: perfil ───────────────────────────────────────────────────────
  const saveProfile = useCallback(async (updates) => {
    const id = clientIdRef.current;
    if (!id) throw new Error('No clientId');
    await updateClientProfile(id, updates);
    toast.success('Perfil actualizado');
  }, []);

  const finishOnboarding = useCallback(async () => {
    const id = clientIdRef.current;
    if (!id) return;
    await completeOnboarding(id);
  }, []);

  // ── Acciones: visitas ──────────────────────────────────────────────────────
  const cancelClientVisit = useCallback(async (visitId, visitData, reason = '') => {
    try {
      await cancelVisit(visitId, visitData, reason);
      toast.success('Visita cancelada');
    } catch (err) {
      toast.error(err.message || 'Error al cancelar la visita');
      throw err;
    }
  }, []);

  // ── Acciones: notificaciones ───────────────────────────────────────────────
  const readNotification     = useCallback((id) => markNotificationRead(id),   []);
  const readAllNotifications = useCallback(()    => email && markAllNotificationsRead(email), [email]);
  const removeNotification   = useCallback((id) => deleteNotification(id),     []);

  // ── Valores derivados ──────────────────────────────────────────────────────
  const unreadCount    = notifications.filter((n) => !n.read).length;
  const hasVisits      = visits.length > 0 || clientData?.hasVisits;
  const hasContracts   = contracts.length > 0;
  const onboardingDone = clientData?.onboardingDone ?? true;

  return {
    clientId, clientData, visits, contracts, notifications, favProps,
    unreadCount, hasVisits, hasContracts, onboardingDone,
    loading: loadingProfile, loadingFavProps,
    // acciones
    toggleFavorite, isFavorite,
    saveProfile, finishOnboarding,
    cancelClientVisit,
    readNotification, readAllNotifications, removeNotification,
  };
}