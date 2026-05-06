// src/modules/clients/hooks/useFavorites.js
//
// FIX CRÍTICO — DOBLE DOC DE CLIENTE:
// El bug de favoritos vacíos se debía a que se creaban DOS documentos para el
// mismo cliente en la colección /clients:
//
//   Doc A: creado por resolveClientByEmail() en useClientPortal
//          → tiene onboardingDone: false, favorites: []
//          → el portal lee ESTE doc
//
//   Doc B: creado por useFavorites (este hook) cuando no encontraba al cliente
//          → tiene favorites: [propId1, propId2] ← ¡aquí se guardaban!
//          → el portal NUNCA leía este doc
//
// El motivo de la duplicación: resolveClientByEmail() usaba getDocs() de forma
// async. Si el usuario abría el catálogo ANTES de que el portal creara el doc,
// useFavorites también hacía getDocs() → no encontraba nada → creaba otro doc.
//
// SOLUCIÓN: useFavorites ahora crea el doc con los MISMOS campos que
// resolveClientByEmail, incluyendo onboardingDone: false, para que si se crea
// aquí primero, el portal lo reconozca como cliente nuevo (muestra WelcomeModal)
// y los favoritos queden en el mismo documento.
//
// Adicionalmente: si ya existe un doc con email coincidente, SIEMPRE usa ese,
// sin importar el orden de llegada.
//
// CAMBIO v2: toggleFavorite acepta onUnauthenticated como segundo argumento.
// Cuando no hay sesión activa, llama esa función en lugar del toast.error,
// permitiendo que PropertyCard muestre un modal de acceso.
//
// doc en /clients — el staff puede dar like a propiedades pero esos favoritos
// se almacenan en su propio doc /users/{email}, NO en /clients. Antes, cuando
// un admin daba corazón a una propiedad, aparecía como cliente en el panel.

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  doc, updateDoc, arrayUnion, arrayRemove,
  onSnapshot, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../../core/config/firebase.config';
import { useAuth } from '../../../core/contexts/AuthContext';
import { USER_ROLES } from '../../users/types/user.types';
import toast from 'react-hot-toast';

export function useFavorites() {
  const { currentUser } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [clientId,  setClientId]  = useState(null);
  const [loading,   setLoading]   = useState(true);
  const clientIdRef = useRef(null);
  // y se identifica con un flag distinto.
  const isStaff = currentUser?.role === USER_ROLES.ADMIN
               || currentUser?.role === USER_ROLES.MEMBER;
  const storageMode = isStaff ? 'user' : 'client';
  const storageModeRef = useRef(storageMode);
  storageModeRef.current = storageMode;

  useEffect(() => {
    if (!currentUser?.email) {
      setFavorites([]);
      setClientId(null);
      clientIdRef.current = null;
      setLoading(false);
      return;
    }

    setLoading(true);
    let unsubClient = null;
    let cancelled   = false;

    async function resolveAndSubscribe() {
      try {
        // No se crea doc en /clients para evitar que admins/agentes aparezcan
        // como clientes en el panel.
        if (isStaff) {
          const userRef = doc(db, 'users', currentUser.email);
          unsubClient = onSnapshot(
            userRef,
            (docSnap) => {
              if (cancelled) return;
              if (docSnap.exists()) {
                setFavorites(docSnap.data().favorites ?? []);
              }
              // Para staff, el "id" del store es el email mismo
              setClientId(currentUser.email);
              clientIdRef.current = currentUser.email;
              setLoading(false);
            },
            () => setLoading(false)
          );
          return;
        }

        // Flujo cliente (viewer):
        // query+addDoc paralela a resolveClientByEmail → race condition →
        // duplicados. Ahora delegamos al servicio canónico que ya tiene
        // dedup automático y delay anti-race.
        const { resolveClientByEmail } = await import('../services/client.portal.service');
        const data = await resolveClientByEmail(currentUser.email);
        const id = data.id;

        if (cancelled) return;

        setClientId(id);
        clientIdRef.current = id;

        unsubClient = onSnapshot(
          doc(db, 'clients', id),
          (docSnap) => {
            if (cancelled) return;
            if (docSnap.exists()) {
              setFavorites(docSnap.data().favorites ?? []);
            }
            setLoading(false);
          },
          (err) => {
            console.error('useFavorites: onSnapshot error', err);
            if (!cancelled) setLoading(false);
          }
        );
      } catch (err) {
        console.error('useFavorites: error resolviendo cliente', err);
        if (!cancelled) {
          setFavorites([]);
          setLoading(false);
        }
      }
    }

    resolveAndSubscribe();

    return () => {
      cancelled = true;
      if (unsubClient) unsubClient();
    };
  }, [currentUser?.email, isStaff]);

  const isFavorite = useCallback(
    (propertyId) => favorites.includes(propertyId),
    [favorites]
  );

  /**
   * toggleFavorite(propertyId, onUnauthenticated?)
   *
   * - Si no hay sesión: llama onUnauthenticated() si se proporcionó,
   *   de lo contrario muestra un toast genérico.
   * - Si hay sesión pero no clientId: muestra toast de error.
   * - Si todo está bien: hace el toggle optimista en Firestore.
   *
   * Para staff (admin/member) los favoritos se guardan en /users/{email}
   * en lugar de /clients, para evitar crear documentos /clients fantasma.
   */
  const toggleFavorite = useCallback(async (propertyId, onUnauthenticated) => {
    if (!currentUser?.email) {
      if (typeof onUnauthenticated === 'function') {
        onUnauthenticated();
      } else {
        toast.error('Inicia sesión para guardar favoritos');
      }
      return;
    }

    const id = clientIdRef.current;
    if (!id) {
      toast.error('Perfil no encontrado');
      return;
    }

    const isNowFav = favorites.includes(propertyId);

    // Optimistic update local inmediato
    setFavorites((prev) =>
      isNowFav ? prev.filter((i) => i !== propertyId) : [...prev, propertyId]
    );

    // Determinar la colección destino según el storageMode
    const targetCollection = storageModeRef.current === 'user' ? 'users' : 'clients';

    try {
      await updateDoc(doc(db, targetCollection, id), {
        favorites: isNowFav ? arrayRemove(propertyId) : arrayUnion(propertyId),
        updatedAt: serverTimestamp(),
      });
      toast(isNowFav ? 'Eliminado de favoritos' : '¡Guardado en favoritos!', {
        icon: isNowFav ? '🗑️' : '❤️',
      });
    } catch (err) {
      // Revertir optimistic update
      setFavorites((prev) =>
        isNowFav ? [...prev, propertyId] : prev.filter((i) => i !== propertyId)
      );
      toast.error('Error al actualizar favoritos');
    }
  }, [currentUser?.email, favorites]);

  return { favorites, isFavorite, toggleFavorite, loading, clientId };
}