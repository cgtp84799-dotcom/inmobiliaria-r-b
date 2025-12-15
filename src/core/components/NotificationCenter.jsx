import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaBell,
  FaTimes,
  FaCheckDouble,
  FaComments,
  FaHome,
  FaVideo
} from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllAsRead,
  onMessageListener,
  NOTIFICATION_TYPES
} from '../services/notificationService';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';

const NotificationCenter = () => {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Cargar notificaciones al montar
  useEffect(() => {
    if (currentUser) {
      loadNotifications();
    }
  }, [currentUser]);

  // Escuchar mensajes en foreground
  useEffect(() => {
    onMessageListener()
      .then((payload) => {
        console.log('📬 Nueva notificación:', payload);
        
        // Mostrar toast
        toast.success(payload.notification?.title || 'Nueva notificación', {
          duration: 5000
        });

        // Recargar notificaciones
        loadNotifications();

        // Reproducir sonido
        playNotificationSound();
      })
      .catch((err) => console.log('Error escuchando mensajes:', err));
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await getUserNotifications(currentUser.uid);
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error cargando notificaciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    await markNotificationAsRead(notificationId);
    loadNotifications();
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead(currentUser.uid);
    loadNotifications();
    toast.success('Todas leídas');
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
    
    if (notification.data?.url) {
      window.location.href = notification.data.url;
    }
    
    setIsOpen(false);
  };

  const playNotificationSound = () => {
    try {
      const audio = new Audio('/notification-sound.mp3');
      audio.volume = 0.5;
      audio.play().catch(e => console.log('No se pudo reproducir sonido'));
    } catch (e) {
      console.log('Error reproduciendo sonido:', e);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case NOTIFICATION_TYPES.CHAT_MESSAGE:
        return <FaComments className="text-blue-400" />;
      case NOTIFICATION_TYPES.PROPERTY_CREATED:
      case NOTIFICATION_TYPES.PROPERTY_UPDATED:
        return <FaHome className="text-green-400" />;
      case NOTIFICATION_TYPES.VIDEO_CALL:
        return <FaVideo className="text-yellow-400" />;
      default:
        return <FaBell className="text-slate-400" />;
    }
  };

  return (
    <div className="relative">
      {/* Botón de campana */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative w-10 h-10 md:w-12 md:h-12 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center transition-all border-2 border-slate-700 hover:border-yellow-400"
      >
        <FaBell className="text-yellow-400 text-lg" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-slate-900"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </motion.button>

      {/* Panel de notificaciones */}
      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute right-0 mt-2 w-80 md:w-96 bg-slate-800 border-2 border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-[80vh] flex flex-col"
            >
              {/* Header */}
              <div className="p-4 border-b-2 border-slate-700 bg-slate-900">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <FaBell className="text-yellow-400" />
                    Notificaciones
                  </h3>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <FaTimes className="text-slate-400" />
                  </button>
                </div>
                
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="w-full px-3 py-2 bg-yellow-400/10 hover:bg-yellow-400/20 border border-yellow-400/30 rounded-lg text-yellow-400 text-sm font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <FaCheckDouble />
                    Marcar todas como leídas
                  </button>
                )}
              </div>

              {/* Lista de notificaciones */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center">
                    <p className="text-slate-400">Cargando...</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <FaBell className="text-slate-600 text-5xl mx-auto mb-3" />
                    <p className="text-slate-400">No tienes notificaciones</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-700">
                    {notifications.map((notification) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={() => handleNotificationClick(notification)}
                        className={`p-4 cursor-pointer transition-all hover:bg-slate-700/50 ${
                          !notification.read ? 'bg-yellow-400/5 border-l-4 border-yellow-400' : ''
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-bold text-sm mb-1">
                              {notification.title}
                            </p>
                            <p className="text-slate-300 text-xs mb-2 line-clamp-2">
                              {notification.body}
                            </p>
                            <p className="text-slate-500 text-xs">
                              {notification.createdAt
                                ? formatDistanceToNow(notification.createdAt, {
                                    addSuffix: true,
                                    locale: es
                                  })
                                : 'Ahora'}
                            </p>
                          </div>
                          {!notification.read && (
                            <div className="flex-shrink-0">
                              <span className="w-2 h-2 bg-yellow-400 rounded-full inline-block"></span>
                            </div>
                          )}
                        </div>
                      </motion.div>
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

export default NotificationCenter;