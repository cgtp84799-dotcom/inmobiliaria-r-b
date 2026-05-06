// src/modules/clients/components/portal/SectionActividad.jsx
//
// MÓDULO C — Historial de actividad del cliente
// Lee clients/{clientId}/history (sub-colección ya poblada por visit.service)
// y notificaciones recientes, construyendo una línea de tiempo unificada.

import { useEffect, useState } from 'react';
import {
  collection, query, orderBy, limit, onSnapshot,
} from 'firebase/firestore';
import { db } from '../../../../core/config/firebase.config';
import {
  FaCalendarCheck, FaCheckCircle, FaTimesCircle,
  FaCalendarAlt, FaFileContract, FaHome, FaBell,
  FaSpinner, FaHistory, FaBan,
} from 'react-icons/fa';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

// ─── Config visual por tipo de evento ────────────────────────────────────────
const EVENT_CFG = {
  visit_approved:      { icon: FaCheckCircle,   color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Visita confirmada'  },
  visit_completed:     { icon: FaCheckCircle,   color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/10',    label: 'Visita completada'  },
  visit_rescheduled:   { icon: FaCalendarAlt,   color: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20',  label: 'Visita reagendada'  },
  visit_rejected:      { icon: FaTimesCircle,   color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20',     label: 'Visita rechazada'   },
  visit_created:       { icon: FaCalendarCheck, color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   label: 'Visita solicitada'  },
  visit_cancelled:     { icon: FaBan,           color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20',     label: 'Visita cancelada'   },
  contract_created:    { icon: FaFileContract,  color: 'text-purple-400',  bg: 'bg-purple-500/10',  border: 'border-purple-500/20',  label: 'Contrato creado'    },
  contract_signed:     { icon: FaFileContract,  color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Contrato firmado'   },
  property_favorited:  { icon: FaHome,          color: 'text-rose-400',    bg: 'bg-rose-500/10',    border: 'border-rose-500/20',    label: 'Propiedad guardada' },
  notification:        { icon: FaBell,          color: 'text-[var(--color-text-muted)]',   bg: 'bg-slate-500/10',   border: 'border-[var(--color-border)]/40',   label: 'Notificación'       },
  default:             { icon: FaHistory,       color: 'text-[var(--color-text-muted)]',   bg: 'bg-[var(--color-surface)]/60',   border: 'border-[var(--color-border)]/40',   label: 'Actividad'          },
};

function getEventCfg(type) {
  return EVENT_CFG[type] ?? EVENT_CFG.default;
}

function safeDate(val) {
  if (!val) return null;
  if (val?.toDate) return val.toDate();
  if (val instanceof Date) return val;
  if (typeof val === 'string') { const d = parseISO(val); return isValid(d) ? d : null; }
  return null;
}

function fmtFull(val) {
  const d = safeDate(val);
  if (!d) return '—';
  return format(d, "d 'de' MMMM, yyyy · HH:mm", { locale: es });
}

function fmtRelative(val) {
  const d = safeDate(val);
  if (!d) return '';
  const diff  = Date.now() - d.getTime();
  const mins  = Math.floor(diff / 60000);
  if (mins < 1)   return 'ahora';
  if (mins < 60)  return `hace ${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7)   return `hace ${days}d`;
  return fmtFull(val);
}

// ─── Componente ───────────────────────────────────────────────────────────────
export default function SectionActividad({ clientId, notifications = [] }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Leer sub-colección clients/{clientId}/history
  useEffect(() => {
    if (!clientId) { setLoading(false); return; }

    const q = query(
      collection(db, 'clients', clientId, 'history'),
      orderBy('createdAt', 'desc'),
      limit(30)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setHistory(snap.docs.map((d) => ({ id: d.id, source: 'history', ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error('SectionActividad: history', err);
        setLoading(false);
      }
    );

    return unsub;
  }, [clientId]);

  // Mezclar historial + notificaciones, ordenar por fecha
  const notifEvents = notifications.slice(0, 20).map((n) => ({
    id:        `notif-${n.id}`,
    source:    'notification',
    type:      'notification',
    title:     n.title,
    message:   n.message,
    createdAt: n.createdAt,
  }));

  const allEvents = [...history, ...notifEvents].sort((a, b) => {
    const da = safeDate(a.createdAt)?.getTime() ?? 0;
    const db_ = safeDate(b.createdAt)?.getTime() ?? 0;
    return db_ - da;
  });

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <FaSpinner className="text-amber-500 text-2xl animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center">
          <FaHistory className="text-amber-400 text-sm" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[var(--color-text)]">Mi actividad</h2>
          <p className="text-[var(--color-text-muted)] text-xs">Historial de visitas, contratos y notificaciones</p>
        </div>
      </div>

      {/* Estado vacío */}
      {allEvents.length === 0 && (
        <div className="text-center py-14">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-surface)]/60 border border-[var(--color-border)]/40 flex items-center justify-center mx-auto mb-4">
            <FaHistory className="text-[var(--color-text-faint)] text-2xl" />
          </div>
          <h3 className="text-[var(--color-text)] font-semibold mb-1">Sin actividad aún</h3>
          <p className="text-[var(--color-text-muted)] text-sm">
            Tu historial de visitas y contratos aparecerá aquí.
          </p>
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        {/* Línea vertical */}
        {allEvents.length > 0 && (
          <div className="absolute left-4 top-4 bottom-4 w-px bg-[var(--color-surface)]/80" />
        )}

        <div className="space-y-3">
          {allEvents.map((event) => {
            const cfg = getEventCfg(event.type);
            const Icon = cfg.icon;
            const date = safeDate(event.createdAt);

            return (
              <div key={event.id} className="flex items-start gap-4 relative">
                {/* Ícono en la línea */}
                <div className={`w-8 h-8 rounded-full ${cfg.bg} border ${cfg.border} flex items-center justify-center flex-shrink-0 z-10`}>
                  <Icon className={`${cfg.color} text-xs`} />
                </div>

                {/* Contenido */}
                <div className="flex-1 min-w-0 bg-[var(--color-surface)]/40 border border-[var(--color-border)]/40 rounded-xl p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[var(--color-text)] text-xs font-semibold">
                        {event.title ||
                         (event.propertyName ? `${cfg.label}: ${event.propertyName}` : cfg.label)}
                      </p>
                      {event.message && (
                        <p className="text-[var(--color-text-muted)] text-xs mt-0.5 leading-relaxed line-clamp-2">
                          {event.message}
                        </p>
                      )}
                      {/* Detalles adicionales de historial */}
                      {event.source === 'history' && (
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                          {event.date && (
                            <span className="text-[10px] text-[var(--color-text-muted)]">
                              📅 {event.date}
                              {event.time ? ` · ${event.time}` : ''}
                            </span>
                          )}
                          {event.agentName && (
                            <span className="text-[10px] text-[var(--color-text-muted)]">
                              👤 {event.agentName}
                            </span>
                          )}
                          {event.notes && (
                            <span className="text-[10px] text-[var(--color-text-muted)] italic">
                              "{event.notes}"
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {date && (
                      <span
                        className="text-[10px] text-[var(--color-text-faint)] flex-shrink-0 whitespace-nowrap"
                        title={fmtFull(event.createdAt)}
                      >
                        {fmtRelative(event.createdAt)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {allEvents.length >= 30 && (
        <p className="text-center text-xs text-[var(--color-text-faint)]">
          Mostrando los 30 eventos más recientes
        </p>
      )}
    </div>
  );
}