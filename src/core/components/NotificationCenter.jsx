// src/core/components/NotificationCenter.jsx
//
// ─── CORRECCIONES APLICADAS ────────────────────────────────────────────────
//  [FIX 1] subscribeToNotifications reemplaza el polling con getUserNotifications
//          Este componente usaba getUserNotifications (query única) + re-fetch
//          manual en cada evento fcm:foreground-message. Ahora usa
//          subscribeToNotifications (onSnapshot en tiempo real) que actualiza
//          automáticamente el estado sin necesidad de re-fetch manual.
//          Beneficio clave en PWA/móvil: si llega una notificación background
//          y el usuario abre la app, las notificaciones ya aparecen sin que
//          el usuario tenga que hacer nada.
//
//  [FIX 2] loadNotifications eliminada — ya no es necesaria con onSnapshot.
//          El listener en tiempo real reemplaza todos los casos donde antes
//          se llamaba loadNotifications():
//            - Al montar / cambiar usuario          → onSnapshot lo cubre
//            - Tras marcar como leída               → onSnapshot lo cubre
//            - Tras marcar todas como leídas        → onSnapshot lo cubre
//            - Tras fcm:foreground-message          → onSnapshot lo cubre
//
//  [FIX 3] handleNotificationClick usa useNavigate en lugar de
//          window.location.href para navegar. En una SPA, window.location.href
//          hace un reload completo de la página — se pierde el estado de React,
//          se re-inicializa el SW y se pierde la sesión en memoria.
//          useNavigate mantiene el estado de la app.
//
//  [FIX 4] getNotificationIcon cubre todos los NOTIF_TYPES del sistema.
//          Antes solo cubría 3 tipos legacy (CHAT_MESSAGE, PROPERTY_CREATED,
//          VIDEO_CALL) que ni siquiera existen en NOTIF_TYPES. Ahora cubre
//          todos los tipos reales: visit_confirmed, contract_created,
//          new_property, welcome, system, etc.
//
//  [FIX 5] deleteNotification integrada — el componente ahora expone el
//          botón de borrar heredado de NotificationItem. Se importa
//          deleteNotification del servicio y se pasa al item.
// ──────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FaBell, FaTimes, FaCheckDouble,
  FaComments, FaHome, FaVideo,
  FaCalendarCheck, FaFileContract, FaUserPlus,
  FaExclamationCircle, FaHandshake,
} from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import {
  subscribeToNotifications,   // [FIX 1] reemplaza getUserNotifications
  markNotificationAsRead,
  markAllAsRead,
  deleteNotification,          // [FIX 5]
  NOTIF_TYPES,
} from '../services/notificationService';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';


// [FIX 4] Mapa completo de tipos → ícono. Cubre todos los NOTIF_TYPES reales.
const TYPE_ICON_MAP = {
  [NOTIF_TYPES.VISIT_CONFIRMED]:   <FaCalendarCheck  className="text-green-400"  />,
  [NOTIF_TYPES.VISIT_REJECTED]:    <FaCalendarCheck  className="text-red-400"    />,
  [NOTIF_TYPES.VISIT_RESCHEDULED]: <FaCalendarCheck  className="text-blue-400"   />,
  [NOTIF_TYPES.CONTRACT_CREATED]:  <FaFileContract   className="text-blue-400"   />,
  [NOTIF_TYPES.CONTRACT_ASSIGNED]: <FaFileContract   className="text-blue-400"   />,
  [NOTIF_TYPES.CONTRACT_SIGNED]:   <FaFileContract   className="text-teal-400"   />,
  [NOTIF_TYPES.NEW_PROPERTY]:      <FaHome           className="text-amber-400"  />,
  [NOTIF_TYPES.PROPERTY_CREATED]:  <FaHome           className="text-green-400"  />,
  [NOTIF_TYPES.PROPERTY_UPDATED]:  <FaHome           className="text-blue-400"   />,
  [NOTIF_TYPES.PROPERTY_DELETED]:  <FaHome           className="text-red-400"    />,
  [NOTIF_TYPES.WELCOME]:           <FaHandshake      className="text-emerald-400"/>,
  [NOTIF_TYPES.TASK_ASSIGNED]:     <FaCheckDouble    className="text-purple-400" />,
  [NOTIF_TYPES.COMMENT_REPLY]:     <FaComments       className="text-blue-400"   />,
  [NOTIF_TYPES.SYSTEM]:            <FaExclamationCircle className="text-[var(--color-text-muted)]" />,
  [NOTIF_TYPES.MANUAL]:            <FaBell           className="text-primary"    />,
  // tipos legacy (por si existen en Firestore de versiones anteriores)
  visit_request:   <FaCalendarCheck  className="text-yellow-400" />,
  chat_message:    <FaComments       className="text-blue-400"   />,
  video_call:      <FaVideo          className="text-yellow-400" />,
  access_request:  <FaUserPlus       className="text-purple-400" />,
};

const DEFAULT_ICON = <FaBell className="text-[var(--color-text-muted)]" />;


const NotificationCenter = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate(); // [FIX 3]
  const userId = currentUser?.email || null;

  const [isOpen, setIsOpen]             = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]   = useState(0);

  // [FIX 1+2] Suscripción en tiempo real con onSnapshot.
  // Reemplaza getUserNotifications + loadNotifications manual.
  // El unsubscribe se llama en el cleanup de useEffect.
  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const unsubscribe = subscribeToNotifications(userId, (data) => {
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.read).length);
    });

    return () => unsubscribe();
  }, [userId]);

  // Escuchar mensajes en foreground a través del evento global
  // emitido por initializeMessaging() en notificationService.js.
  // [FIX 2] Ya no llamamos loadNotifications() aquí — onSnapshot
  // actualiza las notificaciones automáticamente en tiempo real.
  useEffect(() => {
    if (!userId) return;

    const handler = (event) => {
      const payload = event.detail;
      toast.success(payload?.notification?.title || 'Nueva notificación', {
        duration: 5000,
        icon: '🔔',
      });
      // El sonido YA lo reproduce notificationService.js — no duplicar aquí.
      // Las notificaciones en pantalla se actualizan solas vía onSnapshot.
    };

    window.addEventListener('fcm:foreground-message', handler);
    return () => window.removeEventListener('fcm:foreground-message', handler);
  }, [userId]);


  const handleMarkAsRead = async (notificationId) => {
    // [FIX 2] Sin loadNotifications() — onSnapshot actualiza el estado
    await markNotificationAsRead(notificationId);
  };

  const handleMarkAllAsRead = async () => {
    if (!userId) return;
    await markAllAsRead(userId);
    // [FIX 2] Sin loadNotifications() — onSnapshot actualiza el estado
    toast.success('Todas leídas');
  };

  // [FIX 5] Borrar notificación individual
  const handleDelete = async (notificationId) => {
    await deleteNotification(notificationId);
    // onSnapshot actualiza el estado automáticamente
  };

  // [FIX 3] useNavigate en lugar de window.location.href
  // window.location.href recarga toda la SPA — se pierde el estado de React,
  // se re-inicializa el SW y puede perderse la sesión en memoria.
  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await handleMarkAsRead(notification.id);
    }
    if (notification.data?.url || notification.actionUrl) {
      const url = notification.data?.url || notification.actionUrl;
      // Si es URL absoluta externa, abrir en nueva pestaña
      if (url.startsWith('http') && !url.includes(window.location.hostname)) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        // URL interna → React Router (sin reload)
        const path = url.startsWith('http')
          ? new URL(url).pathname + new URL(url).search
          : url;
        navigate(path);
      }
    }
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* ── Botón campana ─────────────────────────────────────────────── */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative w-10 h-10 md:w-12 md:h-12 bg-[var(--color-surface)] hover:bg-[var(--color-input-bg)] rounded-xl flex items-center justify-center transition-all border-2 border-[var(--color-border)] hover:border-yellow-400"
        aria-label="Ver notificaciones"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <FaBell className="text-yellow-400 text-lg" />

        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-[var(--color-border)]"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* ── Dropdown ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay cierre al clic fuera */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.18 }}
              className="absolute right-0 mt-2 w-80 md:w-96 bg-[var(--color-surface)] border-2 border-[var(--color-border)] rounded-2xl shadow-2xl z-50 overflow-hidden max-h-[80vh] flex flex-col"
              role="dialog"
              aria-label="Panel de notificaciones"
            >
              {/* Header */}
              <div className="p-4 border-b-2 border-[var(--color-border)] bg-[var(--color-surface)] shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-black text-[var(--color-text)] flex items-center gap-2">
                    <FaBell className="text-yellow-400" />
                    Notificaciones
                  </h3>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-[var(--color-input-bg)] rounded-lg transition-colors"
                    aria-label="Cerrar notificaciones"
                  >
                    <FaTimes className="text-[var(--color-text-muted)]" />
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

              {/* Lista */}
              <div className="flex-1 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <FaBell className="text-[var(--color-text-faint)] text-5xl mx-auto mb-3" />
                    <p className="text-[var(--color-text-muted)]">No tienes notificaciones</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--color-divider)]">
                    <AnimatePresence initial={false}>
                      {notifications.map((notification) => (
                        <motion.div
                          key={notification.id}
                          layout
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: 20, height: 0 }}
                          transition={{ duration: 0.18 }}
                          onClick={() => handleNotificationClick(notification)}
                          className={`group relative p-4 cursor-pointer transition-all select-none ${
                            !notification.read
                              ? 'bg-yellow-400/5 border-l-4 border-yellow-400 hover:bg-yellow-400/10'
                              : 'hover:bg-[var(--color-input-bg)]/50'
                          }`}
                        >
                          {/* Indicador no leída */}
                          {!notification.read && (
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
                          )}

                          <div className="flex gap-3">
                            {/* [FIX 4] ícono según tipo real */}
                            <div className="flex-shrink-0 w-10 h-10 bg-[var(--color-surface-2)] rounded-full flex items-center justify-center">
                              {TYPE_ICON_MAP[notification.type] ?? DEFAULT_ICON}
                            </div>

                            <div className="flex-1 min-w-0 pr-6">
                              <p className={`text-sm mb-1 truncate ${!notification.read ? 'font-bold text-[var(--color-text)]' : 'font-normal text-[var(--color-text)]'}`}>
                                {notification.title}
                              </p>
                              <p className="text-[var(--color-text-muted)] text-xs mb-1 line-clamp-2 leading-snug">
                                {notification.message}
                              </p>
                              <p className="text-[var(--color-text-faint)] text-[10px]">
                                {notification.createdAt
                                  ? formatDistanceToNow(
                                      notification.createdAt?.toDate?.() ?? notification.createdAt,
                                      { addSuffix: true, locale: es }
                                    )
                                  : 'Ahora'}
                              </p>
                            </div>
                          </div>

                          {/* [FIX 5] Botón borrar — visible al hacer hover */}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(notification.id); }}
                            title="Eliminar"
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-[var(--color-text-muted)] hover:text-red-400 transition-all"
                          >
                            <FaTimes size={11} />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="px-4 py-2.5 border-t border-[var(--color-border)] shrink-0 text-center">
                  <span className="text-xs text-[var(--color-text-faint)]">
                    {notifications.length} notificación{notifications.length !== 1 ? 'es' : ''}
                  </span>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationCenter;
