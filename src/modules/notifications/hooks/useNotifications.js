import { useState, useEffect } from 'react';
import { notificationService } from '../services/notification.service';
import { useAuth } from '../../../core/contexts/AuthContext';

/**
 * Hook centralizado para el sistema de notificaciones.
 * Usa el servicio (onSnapshot) — la lógica NO vive en el componente.
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
  const userId = currentUser?.email ?? null;

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    // subscribeToNotifications devuelve el unsubscribe de onSnapshot
    const unsubscribe = notificationService.subscribeToNotifications(
      userId,
      (data) => {
        setNotifications(data);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead  = (id)  => notificationService.markAsRead(id);
  const markAllRead = ()    => userId && notificationService.markAllAsRead(userId);
  const deleteOne   = (id)  => notificationService.deleteNotification(id);

  return { notifications, unreadCount, loading, markAsRead, markAllRead, deleteOne };
}
