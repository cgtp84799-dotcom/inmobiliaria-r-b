import { useState, useEffect } from 'react';
import { FaBell } from 'react-icons/fa';
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../../../core/config/firebase.config';
import { useAuth } from '../../../core/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const NotificationBell = () => {
  const { currentUser } = useAuth();

  // Unificar: notificaciones por EMAIL (mismo criterio que users/{email})
  const userId = currentUser?.email || null;

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);

  // Escuchar notificaciones en tiempo real
  useEffect(() => {
    if (!userId) return;

    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data()
      }));

      setNotifications(notifs);
      setUnreadCount(notifs.filter((n) => !n.read).length);
    });

    return () => unsubscribe();
  }, [userId]);

  // Marcar notificación como leída
  const markAsRead = async (notificationId) => {
    try {
      const notifRef = doc(db, 'notifications', notificationId);
      await updateDoc(notifRef, { read: true });
    } catch (error) {
      console.error('Error al marcar como leída:', error);
    }
  };

  // Marcar todas como leídas
  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter((n) => !n.read);
      await Promise.all(
        unreadNotifications.map((n) => updateDoc(doc(db, 'notifications', n.id), { read: true }))
      );
    } catch (error) {
      console.error('Error al marcar todas como leídas:', error);
    }
  };

  if (!userId) return null;

  return (
    <div className="relative">
      {/* Botón de campana */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 rounded-lg hover:bg-slate-800 transition-colors"
      >
        <FaBell className="text-xl text-slate-300" />

        {/* Badge de contador */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown de notificaciones */}
      <AnimatePresence>
        {showDropdown && (
          <>
            {/* Overlay para cerrar al hacer clic afuera */}
            <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />

            {/* Panel de notificaciones */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 mt-2 w-80 md:w-96 bg-slate-900 rounded-xl shadow-2xl border border-slate-700 z-50 max-h-[500px] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                <h3 className="text-white font-bold">Notificaciones</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-primary hover:text-yellow-400 transition-colors"
                  >
                    Marcar todas como leídas
                  </button>
                )}
              </div>

              {/* Lista de notificaciones */}
              <div className="overflow-y-auto flex-1">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <FaBell className="text-4xl mx-auto mb-2 opacity-50" />
                    <p>No tienes notificaciones</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800">
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => {
                          markAsRead(notif.id);
                          if (notif.link) window.location.href = notif.link;
                        }}
                        className={`p-4 cursor-pointer transition-colors ${
                          notif.read ? 'bg-slate-900 hover:bg-slate-800' : 'bg-slate-800 hover:bg-slate-700'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Indicador de no leída */}
                          {!notif.read && (
                            <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                          )}

                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${notif.read ? 'text-slate-300' : 'text-white font-semibold'}`}>
                              {notif.title}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">{notif.body}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              {notif.createdAt &&
                                formatDistanceToNow(notif.createdAt.toDate(), {
                                  addSuffix: true,
                                  locale: es
                                })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;