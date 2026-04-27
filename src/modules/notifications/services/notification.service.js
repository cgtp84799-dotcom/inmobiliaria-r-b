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
// ║  Este barrel se mantiene SOLO para no romper los imports existentes.    ║
// ╚══════════════════════════════════════════════════════════════════════════╝

export * from '../../../core/services/notificationService';
export { notificationService as default } from '../../../core/services/notificationService';