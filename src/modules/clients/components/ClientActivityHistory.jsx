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
  FaBan
} from 'react-icons/fa';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../../core/config/firebase.config';
import { parseISO, format } from "date-fns";
import { es } from "date-fns/locale";

const ClientActivityHistory = ({ clientId, clientName, onCreateEvent }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) return;

    const q = query(
      collection(db, 'appointments'),
      where('clientId', '==', clientId),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsData = snapshot.docs.map(doc => {
        const data = doc.data();
        const dateStr = data.date || new Date().toISOString().split("T")[0];
        const timeStr = data.time || '09:00';
        const start = parseISO(`${dateStr}T${timeStr}`);
        
        return {
          id: doc.id,
          ...data,
          start
        };
      });
      
      setEvents(eventsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [clientId]);

  const getTypeIcon = (type) => {
    const icons = {
      visita: FaEye,
      reunion: FaUsers,
      llamada: FaPhone,
      seguimiento: FaClipboardList,
      otro: FaCalendarAlt
    };
    return icons[type] || FaCalendarAlt;
  };

  const getTypeColor = (type) => {
    const colors = {
      visita: 'text-blue-400',
      reunion: 'text-purple-400',
      llamada: 'text-green-400',
      seguimiento: 'text-orange-400',
      otro: 'text-slate-400'
    };
    return colors[type] || 'text-slate-400';
  };

  const getStatusIcon = (status) => {
    const icons = {
      pendiente: FaClock,
      confirmada: FaCheckCircle,
      completada: FaCheckCircle,
      cancelada: FaBan
    };
    return icons[status] || FaClock;
  };

  const getStatusColor = (status) => {
    const colors = {
      pendiente: 'text-yellow-400',
      confirmada: 'text-blue-400',
      completada: 'text-green-400',
      cancelada: 'text-red-400'
    };
    return colors[status] || 'text-yellow-400';
  };

  if (loading) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <FaCalendarAlt className="text-primary" />
            Historial de actividad
          </h3>
          <p className="text-slate-400 text-sm mt-1">
            {events.length} {events.length === 1 ? 'evento registrado' : 'eventos registrados'}
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

      {events.length === 0 ? (
        <div className="text-center py-12">
          <FaCalendarAlt className="text-slate-600 text-5xl mx-auto mb-4" />
          <p className="text-slate-400 mb-4">
            No hay eventos registrados para este cliente
          </p>
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
          {events.map((event, index) => {
            const TypeIcon = getTypeIcon(event.type);
            const StatusIcon = getStatusIcon(event.status);
            const typeColor = getTypeColor(event.type);
            const statusColor = getStatusColor(event.status);
            
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="relative pl-8 pb-6 border-l-2 border-slate-700 last:border-l-0 last:pb-0"
              >
                {/* Punto en la línea de tiempo */}
                <div className="absolute left-0 top-0 -translate-x-[9px]">
                  <div className={`w-4 h-4 rounded-full bg-slate-900 border-2 ${typeColor.replace('text-', 'border-')} flex items-center justify-center`}>
                    <div className={`w-2 h-2 rounded-full ${typeColor.replace('text-', 'bg-')}`}></div>
                  </div>
                </div>

                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-primary/50 transition-colors">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <TypeIcon className={`${typeColor} text-lg`} />
                        <h4 className="text-slate-100 font-semibold">{event.title}</h4>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <FaCalendarAlt size={10} />
                          {format(event.start, "dd MMM yyyy, HH:mm", { locale: es })}
                        </span>
                        <span className="capitalize">
                          {event.type}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusIcon className={`${statusColor} text-sm`} />
                      <span className={`text-xs font-semibold ${statusColor} capitalize`}>
                        {event.status}
                      </span>
                    </div>
                  </div>

                  {event.notes && (
                    <p className="text-slate-300 text-sm mb-3 bg-slate-900/50 p-3 rounded border border-slate-700">
                      {event.notes}
                    </p>
                  )}

                  {event.location && (
                    <p className="text-slate-400 text-xs">
                      📍 {event.location}
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