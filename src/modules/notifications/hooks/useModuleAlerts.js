// src/modules/notifications/hooks/useModuleAlerts.js
//
// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  HOOK: useModuleAlerts                                                    ║
// ║                                                                           ║
// ║  Toma las notificaciones del usuario (vía useNotifications) y devuelve    ║
// ║  un mapa { moduleKey: count } con la cantidad de NO LEÍDAS por módulo.    ║
// ║                                                                           ║
// ║  El Sidebar usa este hook para pintar el badge rojo pulsante en cada      ║
// ║  item del menú indicando que hay actividad pendiente en ese módulo.       ║
// ║                                                                           ║
// ║  Las claves del mapa coinciden con `moduleKey` que el Sidebar pone en     ║
// ║  cada item del menú (properties, contracts, clients, visits, calendar,    ║
// ║  queries, documents, users, requests, profile, dashboard, agents).        ║
// ║                                                                           ║
// ║  Ejemplo de retorno:                                                      ║
// ║    { properties: 2, visits: 5, contracts: 1, total: 8 }                   ║
// ║                                                                           ║
// ║  Performance: el cálculo se memoiza con useMemo y solo recorre el array   ║
// ║  cuando `notifications` cambia. Para 50 notifs en memoria es O(n) trivial.║
// ╚═══════════════════════════════════════════════════════════════════════════╝

import { useMemo } from 'react';
import { useNotifications } from './useNotifications';
import { NOTIF_MODULE_MAP } from '../../../core/services/notificationService';

/**
 * @returns {{
 *   counts: Record<string, number>,  // mapa moduleKey → cantidad no leída
 *   total: number,                   // total de no leídas (igual a unreadCount)
 *   loading: boolean,                // true mientras se establece la primera conexión
 * }}
 */
export function useModuleAlerts() {
  const { notifications, loading } = useNotifications();

  const { counts, total } = useMemo(() => {
    const acc = {};
    let totalUnread = 0;

    for (const n of notifications) {
      if (n.read) continue;            // solo contamos NO leídas
      totalUnread += 1;

      // 1) Si la notif trae moduleKey explícito, usarlo (override)
      // 2) Si no, derivarlo del type vía NOTIF_MODULE_MAP
      // 3) Si el type no está mapeado, lo metemos en 'misc' (no se muestra
      //    en el sidebar pero suma al total).
      const key = n.moduleKey || NOTIF_MODULE_MAP[n.type] || 'misc';
      acc[key] = (acc[key] || 0) + 1;
    }

    return { counts: acc, total: totalUnread };
  }, [notifications]);

  return { counts, total, loading };
}

export default useModuleAlerts;