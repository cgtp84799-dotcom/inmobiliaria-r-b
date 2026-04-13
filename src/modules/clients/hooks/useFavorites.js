import { useState, useEffect, useCallback } from 'react';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { db } from '../../../core/config/firebase.config';
import { useAuth } from '../../../core/contexts/AuthContext';
import toast from 'react-hot-toast';

/**
 * useFavorites
 *
 * Gestiona la lista de propiedades favoritas del usuario autenticado.
 * Persiste en /users/{email}.favorites como array de propertyIds.
 *
 * Uso:
 *   const { favorites, isFavorite, toggleFavorite, loading } = useFavorites();
 */
export function useFavorites() {
  const { currentUser } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading,   setLoading]   = useState(true);

  // Cargar favoritos al montar
  useEffect(() => {
    if (!currentUser?.email) { setFavorites([]); setLoading(false); return; }
    const ref = doc(db, 'users', currentUser.email);
    getDoc(ref)
      .then((snap) => {
        setFavorites(snap.exists() ? (snap.data().favorites ?? []) : []);
      })
      .catch(() => setFavorites([]))
      .finally(() => setLoading(false));
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
    const ref    = doc(db, 'users', currentUser.email);
    const isNowFav = favorites.includes(propertyId);
    // Optimistic update
    setFavorites((prev) =>
      isNowFav ? prev.filter((id) => id !== propertyId) : [...prev, propertyId]
    );
    try {
      await updateDoc(ref, {
        favorites: isNowFav
          ? arrayRemove(propertyId)
          : arrayUnion(propertyId),
      });
      toast(isNowFav ? 'Eliminado de favoritos' : '¡Guardado en favoritos!', {
        icon: isNowFav ? '🗑️' : '❤️',
      });
    } catch (e) {
      // Revertir en caso de error
      setFavorites((prev) =>
        isNowFav ? [...prev, propertyId] : prev.filter((id) => id !== propertyId)
      );
      toast.error('Error al actualizar favoritos');
    }
  }, [currentUser?.email, favorites]);

  return { favorites, isFavorite, toggleFavorite, loading };
}