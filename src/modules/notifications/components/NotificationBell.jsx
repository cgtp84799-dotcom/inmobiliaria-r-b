import { useEffect, useState } from 'react';
import { FaBell } from 'react-icons/fa';
import { useAuth } from '../../../core/contexts/AuthContext';
import { notificationService } from '../services/notification.service';

const NotificationBell = () => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Suscribirse a notificaciones en tiempo real
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    let unsubscribe;

    try {
      unsubscribe = notificationService.subscribeToNotifications(
        currentUser.uid,
        (notifs) => {
          const list = Array.isArray(notifs) ? notifs : [];
          setNotifications(list);
          setUnreadCount(list.filter((n) => !n.read).length);
          setError(null);
          setLoading(false);
        }
      );
    } catch (err) {
      console.error('Error suscribiendo notificaciones:', err);
      setError('No se pudieron cargar las notificaciones (revisa índices de Firestore).');
      setLoading(false);
    }

    return () => {
      try {
        unsubscribe && unsubscribe();
      } catch (err) {
        console.error('Error al cancelar suscripción de notificaciones:', err);
      }
    };
  }, [currentUser]);

  // Marcar todas como leídas cuando abre el panel (opcional)
  const handleToggle = async () => {
    const next = !open;
    setOpen(next);

    if (next && unreadCount > 0) {
      try {
        await notificationService.markAllAsRead(currentUser.uid);
      } catch (err) {
        console.error('Error marcando notificaciones como leídas:', err);
      }
    }
  };

  if (!currentUser) return null;

  return (
    <div className="relative">
      {/* Botón de campana */}
      <button
        onClick={handleToggle}
        className="relative flex items-center justify-center w-10 h-10 rounded-full
                   bg-slate-900 border border-slate-700 text-slate-100 hover:border-primary-400
                   transition-colors"
      >
        <FaBell className="text-primary-300" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs
                           rounded-full px-1.5 py-0.5 leading-none">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Panel flotante */}
      {open && (
        <div
          className="absolute right-0 mt-2 z-50
                     w-80 max-w-[calc(100vw-2rem)]
                     max-h-[70vh] overflow-y-auto
                     bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3
                     text-sm text-slate-100"
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-primary">Notificaciones</h4>
            {loading && (
              <span className="text-muted-soft text-[11px]">
                Cargando...
              </span>
            )}
          </div>

          {error && (
            <p className="text-xs text-red-400 mb-2">
              {error}
            </p>
          )}

          {!error && !loading && notifications.length === 0 && (
            <p className="text-muted-soft text-xs">
              No tienes notificaciones por ahora.
            </p>
          )}

          {notifications.length > 0 && (
            <ul className="space-y-2">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={`p-2 rounded-lg border text-xs break-words
                              ${n.read
                                ? 'border-slate-700 bg-slate-900'
                                : 'border-primary-500 bg-slate-800'}`}
                >
                  <p className="font-semibold">
                    {n.title || 'Notificación'}
                  </p>
                  {n.message && (
                    <p className="text-muted-soft">
                      {n.message}
                    </p>
                  )}
                  {n.createdAt && (
                    <p className="text-[10px] text-muted-soft mt-1">
                      {new Date(n.createdAt.toDate ? n.createdAt.toDate() : n.createdAt)
                        .toLocaleString('es-CO')}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;