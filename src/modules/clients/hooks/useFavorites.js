// src/modules/clients/hooks/useFavorites.js
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  doc, updateDoc, arrayUnion, arrayRemove,
  collection, query, where, getDocs, onSnapshot,
  addDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../../core/config/firebase.config';
import { useAuth } from '../../../core/contexts/AuthContext';
import toast from 'react-hot-toast';

/**
 * useFavorites
 *
 * Gestiona la lista de propiedades favoritas del cliente autenticado.
 * Lee y escribe en clients/{clientId}.favorites (realtime con onSnapshot).
 * Si no existe el cliente, lo crea automáticamente.
 *
 * API pública: { favorites, isFavorite, toggleFavorite, loading, clientId }
 */
export function useFavorites() {
  const { currentUser } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [clientId,  setClientId]  = useState(null);
  const [loading,   setLoading]   = useState(true);
  const clientIdRef = useRef(null); // ref para acceder en toggleFavorite sin re-crear callback

  // ── Resolver clientId y suscribirse en realtime ───────────────────────────
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

    async function resolveAndSubscribe() {
      try {
        const q = query(
          collection(db, 'clients'),
          where('email', '==', currentUser.email)
        );
        const snap = await getDocs(q);

        let id;

        if (!snap.empty) {
          id = snap.docs[0].id;
        } else {
          // Crear documento de cliente si no existe
          const newRef = await addDoc(collection(db, 'clients'), {
            nombre:           currentUser.displayName || currentUser.email.split('@')[0],
            email:            currentUser.email,
            telefono:         currentUser.phoneNumber || '',
            tipoCliente:      'portal',
            estado:           'activo',
            notas:            '',
            favorites:        [],
            ubicacionInteres: '',
            presupuesto:      '',
            tipoPropiedad:    '',
            agentId:          '',
            createdViaPortal: true,
            createdAt:        serverTimestamp(),
          });
          id = newRef.id;
        }

        setClientId(id);
        clientIdRef.current = id;

        // Suscripción realtime al documento del cliente
        // Así los favoritos se sincronizan entre pestañas y dispositivos
        unsubClient = onSnapshot(
          doc(db, 'clients', id),
          (docSnap) => {
            if (docSnap.exists()) {
              setFavorites(docSnap.data().favorites ?? []);
            }
            setLoading(false);
          },
          (err) => {
            console.error('useFavorites: onSnapshot error', err);
            setLoading(false);
          }
        );
      } catch (err) {
        console.error('useFavorites: error resolviendo cliente', err);
        setFavorites([]);
        setLoading(false);
      }
    }

    resolveAndSubscribe();

    return () => {
      if (unsubClient) unsubClient();
    };
  }, [currentUser?.email]);

  // ── isFavorite ─────────────────────────────────────────────────────────────
  const isFavorite = useCallback(
    (propertyId) => favorites.includes(propertyId),
    [favorites]
  );

  // ── toggleFavorite ─────────────────────────────────────────────────────────
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

    // Leer estado actual desde el array (no desde el cierre)
    // El optimistic update lo hace onSnapshot automáticamente
    const isNowFav = favorites.includes(propertyId);

    // Optimistic update local inmediato (onSnapshot confirma luego)
    setFavorites((prev) =>
      isNowFav ? prev.filter((i) => i !== propertyId) : [...prev, propertyId]
    );

    try {
      await updateDoc(doc(db, 'clients', id), {
        favorites: isNowFav ? arrayRemove(propertyId) : arrayUnion(propertyId),
      });
      toast(isNowFav ? 'Eliminado de favoritos' : '¡Guardado en favoritos!', {
        icon: isNowFav ? '🗑️' : '❤️',
      });
    } catch (err) {
      // Revertir optimistic update en caso de error
      setFavorites((prev) =>
        isNowFav ? [...prev, propertyId] : prev.filter((i) => i !== propertyId)
      );
      toast.error('Error al actualizar favoritos');
    }
  }, [currentUser?.email, favorites]);

  return { favorites, isFavorite, toggleFavorite, loading, clientId };
}