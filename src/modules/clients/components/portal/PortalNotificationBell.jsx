// src/modules/clients/components/portal/PortalNotificationBell.jsx
//
// Campana de notificaciones del Portal de Clientes.
// COMPLETAMENTE SEPARADA del NotificationBell del panel interno.
// Soporta: marcar como leída (individual y todas), eliminar notificaciones.
// Solo muestra notificaciones cuyo userId === clientEmail.

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { FaBell, FaCheck, FaTrash, FaTimes } from 'react-icons/fa';
import { NOTIF_TYPES } from '../../../../core/services/notificationService';

// Iconos por tipo
const NOTIF_ICON = {
  [NOTIF_TYPES?.VISIT_CONFIRMED]:   '✅',
  [NOTIF_TYPES?.VISIT_REJECTED]:    '❌',
  [NOTIF_TYPES?.VISIT_RESCHEDULED]: '📅',
  [NOTIF_TYPES?.CONTRACT_CREATED]:  '📄',
  [NOTIF_TYPES?.NEW_PROPERTY]:      '🏠',
  [NOTIF_TYPES?.WELCOME]:           '👋',
  [NOTIF_TYPES?.MANUAL]:            '📢',
  default: '🔔',
};

function safeDate(val) {
  if (!val) return null;
  if (val?.toDate) return val.toDate();
  if (val instanceof Date) return val;
  return null;
}

export default function PortalNotificationBell({
  notifications = [],
  unreadCount   = 0,
  onRead,
  onReadAll,
  onDelete,
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ''}`}
        className="relative p-2 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-slate-800/60 transition"
      >
        <FaBell className="text-lg" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-amber-500 text-slate-950 text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />

            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              className="absolute right-0 top-full mt-2 w-80 bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl shadow-black/50 z-40 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                <span className="text-sm font-semibold text-white">
                  Notificaciones
                  {unreadCount > 0 && (
                    <span className="ml-1.5 bg-amber-500/20 text-amber-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={onReadAll}
                      title="Marcar todas como leídas"
                      className="text-xs text-amber-400 hover:underline flex items-center gap-1"
                    >
                      <FaCheck className="text-[10px]" /> Todas leídas
                    </button>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    className="text-slate-600 hover:text-slate-400 transition"
                  >
                    <FaTimes className="text-xs" />
                  </button>
                </div>
              </div>

              {/* Lista */}
              <div className="max-h-96 overflow-y-auto divide-y divide-slate-800/60">
                {notifications.length === 0 ? (
                  <div className="py-10 text-center">
                    <FaBell className="text-slate-700 text-2xl mx-auto mb-2" />
                    <p className="text-slate-500 text-sm">Sin notificaciones</p>
                  </div>
                ) : (
                  notifications.slice(0, 30).map((n) => {
                    const date = safeDate(n.createdAt);
                    return (
                      <div
                        key={n.id}
                        className={`group flex items-start gap-2.5 px-4 py-3 hover:bg-slate-800/40 transition ${
                          !n.read ? 'bg-amber-500/5' : ''
                        }`}
                      >
                        {/* Icono */}
                        <span className="text-base mt-0.5 flex-shrink-0 select-none">
                          {NOTIF_ICON[n.type] || NOTIF_ICON.default}
                        </span>

                        {/* Contenido */}
                        <button
                          className="flex-1 min-w-0 text-left"
                          onClick={() => !n.read && onRead(n.id)}
                        >
                          <p className={`text-xs font-semibold truncate ${!n.read ? 'text-white' : 'text-slate-300'}`}>
                            {n.title}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                            {n.message}
                          </p>
                          {date && (
                            <p className="text-[10px] text-slate-600 mt-1">
                              {format(date, "d MMM, HH:mm", { locale: es })}
                            </p>
                          )}
                        </button>

                        {/* Acciones */}
                        <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!n.read && (
                            <button
                              onClick={() => onRead(n.id)}
                              title="Marcar como leída"
                              className="p-1 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition"
                            >
                              <FaCheck className="text-[10px]" />
                            </button>
                          )}
                          <button
                            onClick={() => onDelete(n.id)}
                            title="Eliminar"
                            className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition"
                          >
                            <FaTrash className="text-[10px]" />
                          </button>
                        </div>

                        {/* Punto sin leer */}
                        {!n.read && (
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {notifications.length > 0 && (
                <div className="px-4 py-2.5 border-t border-slate-800 text-center">
                  <p className="text-[10px] text-slate-600">
                    {notifications.length} notificación{notifications.length !== 1 ? 'es' : ''} en total
                  </p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}