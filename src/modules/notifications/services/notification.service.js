// src/modules/notifications/services/notification.service.js
//
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  BARREL DE COMPATIBILIDAD                                                ║
// ║                                                                          ║
// ║  Antes este archivo duplicaba la lógica del core (createNotification,    ║
// ║  markAsRead, markAllAsRead, etc.). Ahora solo re-exporta del core para   ║
// ║  evitar divergencia entre las dos copias.                                ║
// ║                                                                          ║
// ║  En código nuevo, importa directamente desde el core:                    ║
// ║                                                                          ║
// ║    import {                                                              ║
// ║      createNotification,                                                 ║
// ║      sendClientNotification,                                             ║
// ║      NOTIF_TYPES,                                                        ║
// ║    } from '@/core/services/notificationService';                         ║
// ║                                                                          ║
// ║  Este barrel se mantiene SOLO para no romper los imports existentes.     ║
// ║                                                                          ║
// ║  [FIX] Se construye el objeto notificationService como named export      ║
// ║  para que useNotifications pueda llamar:                                 ║
// ║    notificationService.subscribeToNotifications(userId, cb)              ║
// ║    notificationService.markAsRead(id)                                    ║
// ║    notificationService.markAllAsRead(userId)                             ║
// ║    notificationService.deleteNotification(id)                            ║
// ╚══════════════════════════════════════════════════════════════════════════╝

export * from '../../../core/services/notificationService';

// ── [FIX] Objeto agrupado que consume useNotifications ────────────────────
// useNotifications hace:  notificationService.subscribeToNotifications(...)
//                         notificationService.markAsRead(id)
//                         notificationService.markAllAsRead(userId)
//                         notificationService.deleteNotification(id)
//
// El export * de arriba expone las funciones sueltas pero NO construye el
// objeto — por eso se arma aquí explícitamente con los alias correctos.
import {
  subscribeToNotifications,
  markNotificationAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
  sendClientNotification,
  getUserNotifications,
  disableNotifications,
  onMessageListener,
  initializeMessaging,
  requestNotificationPermission,
  registerSwSoundListener,
  NOTIF_TYPES,
  NOTIFICATION_TYPES,
} from '../../../core/services/notificationService';

export const notificationService = {
  // Método principal que usa useNotifications
  subscribeToNotifications,

  // markAsRead es el alias que usa useNotifications.
  // El core lo exporta como markNotificationAsRead — se normaliza aquí.
  markAsRead: markNotificationAsRead,
  markAllAsRead,
  deleteNotification,

  // Helpers adicionales por si algún componente los necesita del objeto
  createNotification,
  sendClientNotification,
  getUserNotifications,
  disableNotifications,
  onMessageListener,
  initializeMessaging,
  requestNotificationPermission,
  registerSwSoundListener,
  NOTIF_TYPES,
  NOTIFICATION_TYPES,
};

export default notificationService;