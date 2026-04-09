import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FaCalendarAlt,
  FaPhone,
  FaEye,
  FaUsers,
  FaClipboardList,
  FaPlus,
  FaClock,
  FaCheckCircle,
  FaBan,
  FaHistory,
  FaTimesCircle,
} from 'react-icons/fa';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../../../core/config/firebase.config';
import { parseISO, format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de estilo
// ─────────────────────────────────────────────────────────────────────────────

const TYPE_ICONS = {
  visita: FaEye,
  visit_approved: FaCheckCircle,
  visit_completed: FaCheckCircle,
  visit_rescheduled: FaCalendarAlt,
  visit_rejected: FaTimesCircle,
  reunion: FaUsers,
  llamada: FaPhone,
  seguimiento: FaClipboardList,
  otro: FaCalendarAlt,
};

const TYPE_COLORS = {
  visita: 'text-blue-400 border-blue-400 bg-blue-400',
  visit_approved: 'text-emerald-400 border-emerald-400 bg-emerald-400',
  visit_completed: 'text-green-400 border-green-400 bg-green-400',
  visit_rescheduled: 'text-blue-300 border-blue-300 bg-blue-300',
  visit_rejected: 'text-red-400 border-red-400 bg-red-400',
  reunion: 'text-purple-400 border-purple-400 bg-purple-400',
  llamada: 'text-green-400 border-green-400 bg-green-400',
  seguimiento: 'text-orange-400 border-orange-400 bg-orange-400',
  otro: 'text-slate-400 border-slate-400 bg-slate-400',
};

const TYPE_LABELS = {
  visita: 'Visita',
  visit_approved: 'Visita aprobada',
  visit_completed: 'Visita completada',
  visit_rescheduled: 'Reagendada',
  visit_rejected: 'Visita rechazada',
  reunion: 'Reunión',
  llamada: 'Llamada',
  seguimiento: 'Seguimiento',
  otro: 'Otro',
};

const STATUS_ICONS = {
  pendiente: FaClock,
  confirmada: FaCheckCircle,
  completada: FaCheckCircle,
  cancelada: FaBan,
  approved: FaCheckCircle,
  completed: FaCheckCircle,
  rejected: FaTimesCircle,
  rescheduled: FaCalendarAlt,
};

const STATUS_COLORS = {
  pendiente: 'text-yellow-400',
  confirmada: 'text-blue-400',
  completada: 'text-green-400',
  cancelada: 'text-red-400',
  approved: 'text-emerald-400',
  completed: 'text-green-400',
  rejected: 'text-red-400',
  rescheduled: 'text-blue-300',
};

const STATUS_LABELS = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  completada: 'Completada',
  cancelada: 'Cancelada',
  approved: 'Aprobada',
  completed: 'Completada',
  rejected: 'Rechazada',
  rescheduled: 'Reagendada',
};

// Convierte cualquier fecha a objeto Date válido o null
function toDate(val) {
  if (!val) return null;
  if (val?.toDate) return val.toDate(); // Firestore Timestamp
  if (val instanceof Date) return val;
  if (typeof val === 'string') {
    const d = parseISO(val);
    return isValid(d) ? d : null;
  }
  return null;
}

function formatDate(val) {
  const d = toDate(val);
  if (!d) return 'Sin fecha';
  return format(d, "dd MMM yyyy, HH:mm", { locale: es });
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────

const ClientActivityHistory = ({ clientId, clientEmail, clientName, onCreateEvent }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) return;

    let unsubHistory = () => {};
    let unsubAppointments = () => {};
    let historyItems = [];
    let appointmentItems = [];
    let resolved = [false, false];

    function merge() {
      if (!resolved[0] || !resolved[1]) return;
      // Combinar y ordenar por fecha descendente
      const combined = [
        ...historyItems,
        ...appointmentItems,
      ].sort((a, b) => {
        const da = toDate(a._sortDate) || new Date(0);
        const db2 = toDate(b._sortDate) || new Date(0);
        return db2 - da;
      });
      setItems(combined);
      setLoading(false);
    }

    // 1) Sub-colección clients/{id}/history (escrita por visitService)
    const historyQ = query(
      collection(db, 'clients', clientId, 'history'),
      orderBy('createdAt', 'desc'),
    );
    unsubHistory = onSnapshot(historyQ, (snap) => {
      historyItems = snap.docs.map((d) => {
        const data = d.data();
        return {
          _id: d.id,
          _source: 'history',
          _sortDate: data.createdAt,
          type: data.type || 'visita',
          title: data.propertyName
            ? `${TYPE_LABELS[data.type] || 'Visita'} — ${data.propertyName}`
            : (TYPE_LABELS[data.type] || 'Evento'),
          date: data.date || null,
          time: data.time || null,
          status: data.type?.replace('visit_', '') || 'approved',
          agentName: data.agentName || null,
          notes: data.notes || '',
          propertyName: data.propertyName || null,
          approvedBy: data.approvedBy || null,
          createdAt: data.createdAt,
        };
      });
      resolved[0] = true;
      merge();
    });

    // 2) appointments donde clientId coincide
    const apptQ = query(
      collection(db, 'appointments'),
      where('clientId', '==', clientId),
      orderBy('date', 'desc'),
    );
    unsubAppointments = onSnapshot(apptQ,
      (snap) => {
        appointmentItems = snap.docs.map((d) => {
          const data = d.data();
          const dateStr = data.date || '';
          const timeStr = data.time || '09:00';
          let startDate = dateStr ? parseISO(`${dateStr}T${timeStr}`) : null;
          if (startDate && !isValid(startDate)) startDate = null;
          return {
            _id: d.id,
            _source: 'appointment',
            _sortDate: startDate || data.createdAt,
            type: data.type || 'visita',
            title: data.title || (data.propertyName ? `Visita — ${data.propertyName}` : 'Evento'),
            date: data.date || null,
            time: data.time || null,
            status: data.status || 'pendiente',
            agentName: data.agentName || null,
            notes: data.notes || '',
            propertyName: data.propertyName || null,
            location: data.location || null,
            createdAt: data.createdAt,
          };
        });
        resolved[1] = true;
        merge();
      },
      (err) => {
        // Si falla el query de appointments (p.ej. índice), igual mostrar history
        console.warn('appointments history query:', err.message);
        resolved[1] = true;
        merge();
      },
    );

    return () => {
      unsubHistory();
      unsubAppointments();
    };
  }, [clientId]);

  if (loading) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <FaHistory className="text-primary" />
            Historial de actividad
          </h3>
          <p className="text-slate-400 text-sm mt-1">
            {items.length} {items.length === 1 ? 'evento registrado' : 'eventos registrados'}
          </p>
        </div>
        <button
          onClick={() => onCreateEvent && onCreateEvent(clientId, clientName)}
          className="button-gold inline-flex items-center gap-2 px-4 py-2 text-sm"
        >
          <FaPlus />
          Nuevo evento
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12">
          <FaCalendarAlt className="text-slate-600 text-5xl mx-auto mb-4" />
          <p className="text-slate-400 mb-4">No hay eventos registrados para este cliente</p>
          <button
            onClick={() => onCreateEvent && onCreateEvent(clientId, clientName)}
            className="button-gold inline-flex items-center gap-2 px-4 py-2 text-sm"
          >
            <FaPlus />
            Crear primer evento
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item, index) => {
            const TypeIcon = TYPE_ICONS[item.type] || FaCalendarAlt;
            const colorClasses = TYPE_COLORS[item.type] || TYPE_COLORS.otro;
            const textColor = colorClasses.split(' ')[0];
            const borderColor = colorClasses.split(' ')[1];
            const bgColor = colorClasses.split(' ')[2];
            const StatusIcon = STATUS_ICONS[item.status] || FaClock;
            const statusColor = STATUS_COLORS[item.status] || 'text-yellow-400';
            const statusLabel = STATUS_LABELS[item.status] || item.status;

            return (
              <motion.div
                key={`${item._source}-${item._id}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.04 }}
                className="relative pl-8 pb-6 border-l-2 border-slate-700 last:border-l-0 last:pb-0"
              >
                {/* Punto en línea de tiempo */}
                <div className="absolute left-0 top-0 -translate-x-[9px]">
                  <div className={`w-4 h-4 rounded-full bg-slate-900 border-2 ${borderColor} flex items-center justify-center`}>
                    <div className={`w-2 h-2 rounded-full ${bgColor}`} />
                  </div>
                </div>

                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-primary/50 transition-colors">
                  {/* Cabecera */}
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <TypeIcon className={`${textColor} text-base`} />
                        <h4 className="text-slate-100 font-semibold text-sm">{item.title}</h4>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                        {(item.date || item.createdAt) && (
                          <span className="flex items-center gap-1">
                            <FaCalendarAlt size={10} />
                            {item.date
                              ? format(parseISO(`${item.date}T${item.time || '00:00'}`), "dd MMM yyyy, HH:mm", { locale: es })
                              : formatDate(item.createdAt)}
                          </span>
                        )}
                        {item._source === 'history' && (
                          <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                            CRM
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <StatusIcon className={`${statusColor} text-xs`} />
                      <span className={`text-xs font-semibold ${statusColor}`}>{statusLabel}</span>
                    </div>
                  </div>

                  {/* Detalle */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-slate-400 mt-2">
                    {item.propertyName && (
                      <span>🏠 {item.propertyName}</span>
                    )}
                    {item.agentName && (
                      <span>👤 Agente: {item.agentName}</span>
                    )}
                    {item.location && (
                      <span>📍 {item.location}</span>
                    )}
                    {item.approvedBy && (
                      <span>✅ Aprobada por: {item.approvedBy}</span>
                    )}
                  </div>

                  {item.notes && (
                    <p className="text-slate-300 text-xs mt-2 bg-slate-900/50 p-2 rounded border border-slate-700">
                      {item.notes}
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ClientActivityHistory;
