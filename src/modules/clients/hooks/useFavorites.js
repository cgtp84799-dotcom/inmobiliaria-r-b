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

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  doc, updateDoc, arrayUnion, arrayRemove,
  collection, query, where, getDocs, onSnapshot,
  addDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../../core/config/firebase.config';
import { useAuth } from '../../../core/contexts/AuthContext';
import toast from 'react-hot-toast';

export function useFavorites() {
  const { currentUser } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [clientId,  setClientId]  = useState(null);
  const [loading,   setLoading]   = useState(true);
  const clientIdRef = useRef(null);

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
        const q    = query(collection(db, 'clients'), where('email', '==', currentUser.email));
        const snap = await getDocs(q);

        if (cancelled) return;

        let id;

        if (!snap.empty) {
          // Usar el primer doc que coincida (el mismo que usa resolveClientByEmail)
          id = snap.docs[0].id;
        } else {
          // Crear doc con los MISMOS campos que resolveClientByEmail
          // Esto garantiza que si useFavorites crea el doc, el portal lo trate
          // como cliente nuevo (muestra WelcomeModal) y los favoritos coincidan
          const newRef = await addDoc(collection(db, 'clients'), {
            email:            currentUser.email,
            nombre:           currentUser.displayName || currentUser.email.split('@')[0],
            telefono:         currentUser.phoneNumber || '',
            tipoCliente:      'portal',
            estado:           'activo',
            notas:            '',
            favorites:        [],
            ubicacionInteres: '',
            presupuesto:      '',
            tipoPropiedad:    '',
            agentId:          null,
            createdViaPortal: true,
            onboardingDone:   false,   // ← CRÍTICO: igual que resolveClientByEmail
            createdAt:        serverTimestamp(),
          });
          id = newRef.id;
        }

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
  }, [currentUser?.email]);

  const isFavorite = useCallback(
    (propertyId) => favorites.includes(propertyId),
    [favorites]
  );

  const toggleFavorite = useCallback(async (propertyId) => {
    if (!currentUser?.email) {
      toast.error('Debes iniciar sesión para guardar favoritos');
      return;
    }

    const id = clientIdRef.current;
    if (!id) {
      toast.error('Perfil de cliente no encontrado');
      return;
    }

    const isNowFav = favorites.includes(propertyId);

    // Optimistic update local inmediato
    setFavorites((prev) =>
      isNowFav ? prev.filter((i) => i !== propertyId) : [...prev, propertyId]
    );

    try {
      await updateDoc(doc(db, 'clients', id), {
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