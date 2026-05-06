import { useState, useEffect, useRef } from 'react';
import { notificationService } from '../services/notification.service';
import { useAuth } from '../../../core/contexts/AuthContext';

/**
 * Hook centralizado para el sistema de notificaciones.
 *
 * Fix: isMounted ref evita actualizaciones de estado tras desmontaje,
 * que causaban el crash de Firestore SDK (ca9 / b815 INTERNAL ASSERTION).
 *
 * Retorna:
 *   notifications   — array completo, ordenado desc por createdAt
 *   unreadCount     — número de no leídas
 *   loading         — true mientras se establece la primera conexión
 *   markAsRead(id)  — marca una notificación como leída
 *   markAllRead()   — marca todas como leídas
 *   deleteOne(id)   — elimina una notificación
 */
export function useNotifications() {
  const { currentUser } = useAuth();
  const userId   = currentUser?.email ?? null;
  const isMounted = useRef(true);

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    isMounted.current = true;

    if (!userId) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    let unsub = () => {};

    try {
      unsub = notificationService.subscribeToNotifications(
        userId,
        (data) => {
          if (!isMounted.current) return;
          setNotifications(data);
          setLoading(false);
        },
      );
    } catch (err) {
      console.error('useNotifications error:', err);
      if (isMounted.current) setLoading(false);
    }

    return () => {
      isMounted.current = false;
      try { unsub(); } catch (_) {}
    };
  }, [userId]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead  = (id) => notificationService.markAsRead(id);
  const markAllRead = ()   => userId && notificationService.markAllAsRead(userId);
  const deleteOne   = (id) => notificationService.deleteNotification(id);

  return { notifications, unreadCount, loading, markAsRead, markAllRead, deleteOne };
}