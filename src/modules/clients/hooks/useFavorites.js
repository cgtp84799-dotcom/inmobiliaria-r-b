// src/modules/clients/hooks/useFavorites.js
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  doc, updateDoc, arrayUnion, arrayRemove,
  collection, query, where, getDocs, addDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../../core/config/firebase.config';
import { useAuth } from '../../../core/contexts/AuthContext';
import toast from 'react-hot-toast';

/**
 * useFavorites
 *
 * Gestiona la lista de propiedades favoritas del cliente autenticado.
 * Lee y escribe en clients/{clientId}.favorites.
 * Busca el clientId por email en la colección "clients".
 * Si no existe el cliente, lo crea automáticamente.
 *
 * API pública: { favorites, isFavorite, toggleFavorite, loading }
 */
export function useFavorites() {
  const { currentUser } = useAuth();
  const [favorites, setFavorites]   = useState([]);
  const [clientId,  setClientId]    = useState(null);
  const [loading,   setLoading]     = useState(true);
  const resolvedRef = useRef(false);

  // ── Resolver clientId y cargar favoritos ──────────────────────────────────
  useEffect(() => {
    if (!currentUser?.email) {
      setFavorites([]);
      setClientId(null);
      setLoading(false);
      return;
    }

    resolvedRef.current = false;

    async function resolveClient() {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'clients'),
          where('email', '==', currentUser.email)
        );
        const snap = await getDocs(q);

        let id;
        if (!snap.empty) {
          const clientDoc = snap.docs[0];
          id = clientDoc.id;
          setFavorites(clientDoc.data().favorites ?? []);
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
          setFavorites([]);
        }

        setClientId(id);
        resolvedRef.current = true;
      } catch (err) {
        console.error('useFavorites: error resolviendo cliente', err);
        setFavorites([]);
      } finally {
        setLoading(false);
      }
    }

    resolveClient();
  }, [currentUser?.email]);

  // ── isFavorite ─────────────────────────────────────────────────────────────
  const isFavorite = useCallback(
    (propertyId) => favorites.includes(propertyId),
    [favorites]
  );

  // ── toggleFavorite ────────────────────────────────────────────────────────
  const toggleFavorite = useCallback(async (propertyId) => {
    if (!currentUser?.email) {
      toast.error('Debes iniciar sesión para guardar favoritos');
      return;
    }
    if (!clientId) {
      toast.error('Perfil de cliente no encontrado');
      return;
    }

    const isNowFav = favorites.includes(propertyId);

    // Optimistic update
    setFavorites((prev) =>
      isNowFav ? prev.filter((id) => id !== propertyId) : [...prev, propertyId]
    );

    try {
      const clientRef = doc(db, 'clients', clientId);
      await updateDoc(clientRef, {
        favorites: isNowFav ? arrayRemove(propertyId) : arrayUnion(propertyId),
      });
      toast(isNowFav ? 'Eliminado de favoritos' : '¡Guardado en favoritos!', {
        icon: isNowFav ? '🗑️' : '❤️',
      });
    } catch (err) {
      // Revertir en caso de error
      setFavorites((prev) =>
        isNowFav ? [...prev, propertyId] : prev.filter((id) => id !== propertyId)
      );
      toast.error('Error al actualizar favoritos');
    }
  }, [currentUser?.email, clientId, favorites]);

  return { favorites, isFavorite, toggleFavorite, loading, clientId };
}