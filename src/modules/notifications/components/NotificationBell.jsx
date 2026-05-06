import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaBell } from 'react-icons/fa';
import { useNotifications } from '../hooks/useNotifications';
import NotificationItem from './NotificationItem';

/**
 * NotificationBell — versión refactorizada.
 *
 * - Toda la lógica Firestore está en useNotifications()
 * - El renderizado item a item está en NotificationItem
 * - Este componente solo maneja el UI del dropdown
 */
export default function NotificationBell() {
  const { notifications, unreadCount, loading, markAsRead, markAllRead, deleteOne } =
    useNotifications();

  const [open, setOpen] = useState(false);

  if (loading) return null; // Sin campana hasta saber si hay notificaciones

  return (
    <div className="relative">

      {/* Botón campana */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg transition-colors"
        style={{
          color:           open ? 'var(--color-primary)' : 'var(--color-text-muted)',
          backgroundColor: open ? 'var(--color-primary-highlight)' : 'transparent',
        }}
        aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ''}`}
      >
        <FaBell size={18} />

        {/* Badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-0.5
                bg-red-500 text-[var(--color-text)] text-[10px] font-bold rounded-full
                flex items-center justify-center leading-none"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <>
            {/* Overlay cierre al clic fuera */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

            <motion.div
              key="panel"
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0,  scale: 1    }}
              exit={{   opacity: 0, y: -8, scale: 0.97  }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl shadow-2xl border z-50
                flex flex-col overflow-hidden"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor:     'var(--color-border)',
                maxHeight:       '480px',
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-4 py-3 border-b shrink-0"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
                    Notificaciones
                  </h3>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full
                      bg-red-500/15 text-red-400">
                      {unreadCount} sin leer
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs font-medium transition-colors"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    Marcar todo
                  </button>
                )}
              </div>

              {/* Lista */}
              <div className="overflow-y-auto flex-1">
                <AnimatePresence initial={false}>
                  {notifications.length === 0 ? (
                    <div className="py-12 flex flex-col items-center gap-3"
                      style={{ color: 'var(--color-text-faint)' }}>
                      <FaBell size={28} className="opacity-40" />
                      <p className="text-sm">No tienes notificaciones</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <NotificationItem
                        key={n.id}
                        notification={n}
                        onRead={markAsRead}
                        onDelete={deleteOne}
                        onClose={() => setOpen(false)}
                      />
                    ))
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div
                  className="px-4 py-2.5 border-t shrink-0 text-center"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <span className="text-xs" style={{ color: 'var(--color-text-faint)' }}>
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
}