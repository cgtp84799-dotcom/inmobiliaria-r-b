// src/modules/clients/hooks/useClientPortal.js
//
// FIXES:
//  1. getFavoriteProperties ahora re-dispara cuando el perfil cambia (sin comparar JSON)
//     usando un Set para detectar cambios reales en el array de favoritos.
//  2. resolveClientByEmail usaba getDocs pero si existe el doc ya, la suscripción
//     arranca antes de que el state tenga el id correcto.
//     Ahora el flujo es: resolver ID → suscribir perfil → extraer favorites del snapshot.
//  3. favProps se carga reactivamente desde el snapshot del perfil, no desde el state
//     clientData que puede estar desincronizado un tick.

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
import { USER_ROLES } from '../../users/types/user.types';

export function useClientPortal() {
  const { currentUser } = useAuth();
  const email = currentUser?.email ?? null;
  // ★ FIX (auditoría): si el usuario es staff (admin/member) no creamos doc
  // /clients para él. Esto resuelve el bug "admin entra al portal por
  // equivocación y aparece como cliente en el panel".
  const isStaff = currentUser?.role === USER_ROLES.ADMIN
               || currentUser?.role === USER_ROLES.MEMBER;

  const [clientId,        setClientId]        = useState(null);
  const [clientData,      setClientData]      = useState(null);
  const [visits,          setVisits]          = useState([]);
  const [contracts,       setContracts]       = useState([]);
  const [notifications,   setNotifications]   = useState([]);
  const [favProps,        setFavProps]        = useState([]);
  const [loadingProfile,  setLoadingProfile]  = useState(true);
  const [loadingFavProps, setLoadingFavProps] = useState(false);

  const isMounted      = useRef(true);
  const clientIdRef    = useRef(null);
  // Track the last set of favorite IDs we fetched, to avoid redundant fetches
  const lastFavIdsRef  = useRef('');

  // ── 1. Resolver clientId y suscribir perfil ────────────────────────────────
  useEffect(() => {
    isMounted.current = true;
    if (!email) { setLoadingProfile(false); return; }
    // ★ FIX (auditoría): si es staff, no resolvemos perfil de cliente.
    // El portal entero debería redirigir staff a /dashboard, pero si por algo
    // este hook se monta antes del redirect, no creamos el doc fantasma.
    if (isStaff) {
      setLoadingProfile(false);
      return;
    }

    let unsubProfile = null;

    resolveClientByEmail(email)
      .then((data) => {
        if (!isMounted.current) return;

        setClientId(data.id);
        clientIdRef.current = data.id;
        setClientData(data);
        setLoadingProfile(false);

        // Suscripción en tiempo real al perfil
        unsubProfile = subscribeToClientProfile(
          data.id,
          (updated) => {
            if (!isMounted.current) return;
            setClientData(updated);

            // ── FIX: cargar favProps directamente desde el snapshot ──────────
            // Así no dependemos de que clientData en el state esté actualizado
            const ids = updated?.favorites ?? [];
            const idsKey = JSON.stringify([...ids].sort());

            if (idsKey === lastFavIdsRef.current) return; // sin cambios reales
            lastFavIdsRef.current = idsKey;

            if (!ids.length) {
              setFavProps([]);
              return;
            }

            setLoadingFavProps(true);
            getFavoriteProperties(ids)
              .then((props) => {
                if (isMounted.current) setFavProps(props);
              })
              .catch((err) => {
                console.warn('useClientPortal: favProps fetch error', err.message);
              })
              .finally(() => {
                if (isMounted.current) setLoadingFavProps(false);
              });
          },
          (err) => { console.warn('useClientPortal: perfil', err.code); }
        );
      })
      .catch((err) => {
        console.error('useClientPortal: resolveClientByEmail', err);
        if (isMounted.current) setLoadingProfile(false);
      });

    return () => {
      isMounted.current = false;
      unsubProfile?.();
    };
  }, [email, isStaff]);

  // ── 2. Visitas ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!email) return;
    const unsub = subscribeToClientVisits(
      email,
      (data) => { if (isMounted.current) setVisits(data); },
      (err)  => { console.warn('useClientPortal: visitas', err.code); }
    );
    return unsub;
  }, [email]);

  // ── 3. Contratos ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!email) return;
    const unsub = subscribeToClientContracts(
      email,
      (data) => { if (isMounted.current) setContracts(data); },
      (err)  => { console.warn('useClientPortal: contratos', err.code); }
    );
    return unsub;
  }, [email]);

  // ── 4. Notificaciones ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!email) return;
    const unsub = subscribeToClientNotifications(
      email,
      (data) => { if (isMounted.current) setNotifications(data); },
      (err)  => { console.warn('useClientPortal: notificaciones', err.code); }
    );
    return unsub;
  }, [email]);

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
    try {
      await completeOnboarding(id);
    } catch (err) {
      console.warn('finishOnboarding:', err.message);
    }
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
  const readNotification     = useCallback((id) => markNotificationRead(id),               []);
  const readAllNotifications = useCallback(()    => email && markAllNotificationsRead(email), [email]);
  const removeNotification   = useCallback((id) => deleteNotification(id),                 []);

  // ── Valores derivados ──────────────────────────────────────────────────────
  const unreadCount  = notifications.filter((n) => !n.read).length;
  const hasVisits    = visits.length > 0;
  const hasContracts = contracts.length > 0;
  // onboardingDone: null/undefined = cliente viejo → true (no mostrar modal)
  // Solo mostramos el WelcomeModal si está explícitamente en false
  const onboardingDone = clientData === null
    ? true   // aún cargando → no mostrar modal todavía
    : (clientData?.onboardingDone ?? true);

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