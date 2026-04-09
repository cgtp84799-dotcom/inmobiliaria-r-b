import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import {
  FaPlus, FaTimes, FaSpinner, FaWhatsapp,
  FaTrash, FaCheckCircle, FaSave, FaUserPlus, FaFilter,
  FaCalendarAlt, FaHome, FaPhone, FaUsers,
} from 'react-icons/fa';
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, orderBy, where,
} from 'firebase/firestore';
import { db } from '../../../core/config/firebase.config';
import { useAuth } from '../../../core/contexts/AuthContext';
import toast from 'react-hot-toast';

// ─── Paleta de colores por agente ────────────────────────────────────────────
const AGENT_COLORS = [
  '#3b82f6', '#a855f7', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#14b8a6', '#f97316',
  '#06b6d4', '#ec4899', '#84cc16', '#6366f1',
];

// Color por tipo de evento (visitas del formulario web vs eventos internos)
const TYPE_ICONS = {
  visita:      '🏠',
  reunion:     '🤝',
  llamada:     '📞',
  seguimiento: '👥',
  otro:        '📌',
  // tipos que vienen del formulario web de visitas
  web_visit:   '🌐',
};

const STATUS_COLORS = {
  pendiente:   '',          // usa el color del agente
  approved:    '',          // usa el color del agente
  confirmada:  '',          // usa el color del agente
  completada:  'opacity-60', // se desvanece
  completed:   'opacity-60',
  cancelada:   '#6b7280',   // gris
  rejected:    '#6b7280',
  rescheduled: '#f59e0b',   // amarillo reagendado
  reagendada:  '#f59e0b',
};

const STATUS_LABELS = {
  pendiente:   '⏳ Pendiente',
  approved:    '✅ Aprobada',
  confirmada:  '✅ Confirmada',
  completada:  '✔ Completada',
  completed:   '✔ Completada',
  cancelada:   '✗ Cancelada',
  rejected:    '✗ Rechazada',
  rescheduled: '🔄 Reagendada',
  reagendada:  '🔄 Reagendada',
};

const CalendarPage = () => {
  const { currentUser } = useAuth();
  const calendarRef = useRef(null);

  // ─── State ───────────────────────────────────────────────────────────────
  const [appointments, setAppointments] = useState([]);  // colección appointments (CRM interno)
  const [webVisits, setWebVisits]       = useState([]);  // colección visits (formulario web)
  const [clients, setClients]           = useState([]);
  const [properties, setProperties]     = useState([]);
  const [agents, setAgents]             = useState([]);  // usuarios con role 'member' o 'admin'

  const [loading, setLoading]           = useState(true);
  const [showEventModal, setShowEventModal]   = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [selectedEvent, setSelectedEvent]     = useState(null);
  const [submitting, setSubmitting]           = useState(false);

  const [view, setView]               = useState('dayGridMonth');
  const [currentDate, setCurrentDate] = useState(new Date());

  const [filterAgentId, setFilterAgentId] = useState('');
  const [filterType, setFilterType]       = useState('');
  const [filterStatus, setFilterStatus]   = useState('');

  const [eventForm, setEventForm] = useState({
    title: '', clientId: '', propertyId: '',
    start: new Date(), location: '', notes: '',
    status: 'pendiente', type: 'visita',
    clientPhone: '', assignedAgentId: '',
  });
  const [clientForm, setClientForm] = useState({ nombre: '', telefono: '', email: '' });

  // ─── Stats de resumen ────────────────────────────────────────────────────
  const totalEvents  = appointments.length + webVisits.length;
  const pendingCount = [...appointments, ...webVisits].filter(
    (e) => ['pendiente', 'pending', 'approved'].includes(e.status)
  ).length;

  // ─── Firestore listeners ─────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    let loaded = 0;
    const checkLoaded = () => { loaded++; if (loaded >= 2) setLoading(false); };

    // 1. Appointments (eventos internos del CRM)
    const unsubAppts = onSnapshot(
      query(collection(db, 'appointments'), orderBy('date', 'asc')),
      (s) => { setAppointments(s.docs.map((d) => ({ id: d.id, _source: 'crm', ...d.data() }))); checkLoaded(); },
      (err) => { console.error('appointments:', err); checkLoaded(); },
    );

    // 2. Visits (solicitudes del formulario web público)
    const unsubVisits = onSnapshot(
      query(collection(db, 'visits'), orderBy('date', 'asc')),
      (s) => { setWebVisits(s.docs.map((d) => ({ id: d.id, _source: 'web', ...d.data() }))); checkLoaded(); },
      (err) => { console.error('visits:', err); checkLoaded(); },
    );

    // 3. Clientes
    const unsubClients = onSnapshot(query(collection(db, 'clients')), (s) => {
      setClients(s.docs.map((d) => ({
        id: d.id,
        nombre: d.data().nombre || d.data().name || '',
        telefono: d.data().telefono || d.data().phone || '',
        email: d.data().email || '',
      })));
    });

    // 4. Propiedades
    const unsubProps = onSnapshot(query(collection(db, 'properties')), (s) => {
      setProperties(s.docs.map((d) => ({
        id: d.id,
        title: d.data().title || '',
        city: d.data().city || '',
      })));
    });

    // 5. Usuarios con rol 'member' o 'admin' — CORREGIDO: era 'agent', ahora 'member'
    const unsubMembers = onSnapshot(
      query(collection(db, 'users'), where('role', 'in', ['member', 'admin'])),
      (s) => {
        setAgents(s.docs.map((d) => ({
          id: d.id,
          name: d.data().name || d.data().displayName || d.data().email || '',
          email: d.data().email || '',
          role: d.data().role,
        })));
      },
    );

    return () => { unsubAppts(); unsubVisits(); unsubClients(); unsubProps(); unsubMembers(); };
  }, []);

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const getAgentColor = useCallback((agentId) => {
    if (!agentId) return '#6b7280';
    const idx = agents.findIndex((a) => a.id === agentId);
    if (idx === -1) return '#6b7280';
    return AGENT_COLORS[idx % AGENT_COLORS.length];
  }, [agents]);

  const getClientName    = (id) => clients.find((c) => c.id === id)?.nombre || '';
  const getPropertyTitle = (id) => properties.find((p) => p.id === id)?.title || '';
  const getAgentName     = (id) => agents.find((a) => a.id === id)?.name || 'Sin asignar';

  // Construir título inteligente para eventos sin título
  const buildTitle = (raw) => {
    if (raw.title && raw.title.trim()) return raw.title.trim();
    // Visita del formulario web
    if (raw._source === 'web') {
      const name = raw.visitorName || raw.clientName || raw.nombre || '';
      const prop = raw.propertyTitle || getPropertyTitle(raw.propertyId) || '';
      if (name && prop) return `Visita: ${name} → ${prop}`;
      if (name) return `Visita web: ${name}`;
      if (prop) return `Visita: ${prop}`;
      return 'Solicitud de visita';
    }
    // Evento CRM sin título
    const clientName = getClientName(raw.clientId);
    const propTitle  = getPropertyTitle(raw.propertyId);
    if (clientName && propTitle) return `${raw.type === 'visita' ? '🏠' : ''} ${clientName} → ${propTitle}`;
    if (clientName) return clientName;
    return 'Evento sin título';
  };

  // ─── Convertir a formato FullCalendar ────────────────────────────────────
  const allRaw = [...appointments, ...webVisits];

  const fcEvents = allRaw
    .filter((raw) => {
      if (filterAgentId && raw.assignedAgentId !== filterAgentId) return false;
      if (filterType   && raw.type             !== filterType)    return false;
      if (filterStatus && raw.status           !== filterStatus)  return false;
      return true;
    })
    .map((raw) => {
      const dateStr = raw.date  || new Date().toISOString().split('T')[0];
      const timeStr = raw.time  || raw.visitTime || '09:00';
      const start   = `${dateStr}T${timeStr.slice(0, 5)}`;
      const durationMs = (Number(raw.duration || 60)) * 60 * 1000;
      const endDate    = new Date(new Date(start).getTime() + durationMs);

      // Color: gris si cancelado/rechazado, amarillo si reagendado, color agente si normal
      let bg = getAgentColor(raw.assignedAgentId || '');
      if (['cancelada', 'rejected'].includes(raw.status))   bg = '#6b7280';
      if (['rescheduled', 'reagendada'].includes(raw.status)) bg = '#d97706';
      // Visitas web sin agente asignado: color azul oscuro distinto
      if (raw._source === 'web' && !raw.assignedAgentId)    bg = '#1d4ed8';

      const icon        = TYPE_ICONS[raw.type] || (raw._source === 'web' ? '🌐' : '📌');
      const statusLabel = STATUS_LABELS[raw.status] || '';
      const titleText   = buildTitle(raw);

      return {
        id:              `${raw._source}_${raw.id}`,
        title:           `${icon} ${titleText}`,
        start,
        end:             endDate.toISOString(),
        backgroundColor: bg,
        borderColor:     bg,
        textColor:       '#ffffff',
        extendedProps:   { ...raw, _statusLabel: statusLabel, _displayTitle: titleText },
      };
    });

  // ─── Handlers FullCalendar ───────────────────────────────────────────────
  const handleDateClick = useCallback((info) => {
    setSelectedEvent(null);
    setEventForm({
      title: '', clientId: '', propertyId: '',
      start: info.date,
      location: '', notes: '', status: 'pendiente',
      type: 'visita', clientPhone: '', assignedAgentId: '',
    });
    setShowEventModal(true);
  }, []);

  const handleEventClick = useCallback((info) => {
    const raw = info.event.extendedProps;
    setSelectedEvent({ id: raw.id, source: raw._source, resource: raw });
    const dateStr = raw.date || info.event.startStr.split('T')[0];
    const timeStr = raw.time || raw.visitTime || (info.event.startStr.split('T')[1] || '09:00').slice(0, 5);
    setEventForm({
      title:           raw._displayTitle || raw.title || '',
      clientId:        raw.clientId        || '',
      propertyId:      raw.propertyId      || '',
      start:           new Date(`${dateStr}T${timeStr.slice(0,5)}`),
      location:        raw.location        || raw.address || '',
      notes:           raw.notes           || raw.message || '',
      status:          raw.status          || 'pendiente',
      type:            raw.type            || (raw._source === 'web' ? 'visita' : 'otro'),
      clientPhone:     raw.clientPhone     || raw.visitorPhone || raw.phone || '',
      assignedAgentId: raw.assignedAgentId || '',
    });
    setShowEventModal(true);
  }, []);

  const handleEventDrop = useCallback(async (info) => {
    const raw = info.event.extendedProps;
    const colName = raw._source === 'web' ? 'visits' : 'appointments';
    const newStart = info.event.start;
    const date = newStart.toISOString().split('T')[0];
    const time = newStart.toTimeString().slice(0, 5);
    try {
      await updateDoc(doc(db, colName, raw.id), { date, time, updatedAt: new Date().toISOString() });
      toast.success('Evento reagendado');
    } catch (e) {
      toast.error('Error al reagendar');
      info.revert();
    }
  }, []);

  // ─── Guardar evento ──────────────────────────────────────────────────────
  const handleSaveEvent = async (e) => {
    e.preventDefault();
    if (!eventForm.title.trim()) { toast.error('El título es obligatorio'); return; }
    setSubmitting(true);
    try {
      const dt   = new Date(eventForm.start);
      const date = dt.toISOString().split('T')[0];
      const time = dt.toTimeString().slice(0, 5);
      const payload = {
        title: eventForm.title, clientId: eventForm.clientId || '',
        propertyId: eventForm.propertyId || '',
        date, time, duration: 60,
        location: eventForm.location, notes: eventForm.notes,
        status: eventForm.status, type: eventForm.type,
        clientPhone: eventForm.clientPhone,
        assignedAgentId: eventForm.assignedAgentId || '',
        createdBy: currentUser?.email || 'unknown',
        updatedAt: new Date().toISOString(),
      };

      if (selectedEvent) {
        // Al editar una visita web, se actualiza en la colección correcta
        const colName = selectedEvent.source === 'web' ? 'visits' : 'appointments';
        await updateDoc(doc(db, colName, selectedEvent.id), payload);
        toast.success('Evento actualizado');
      } else {
        await addDoc(collection(db, 'appointments'), { ...payload, createdAt: new Date().toISOString() });
        toast.success('Evento creado');
      }
      handleCloseModals();
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent || !confirm('¿Eliminar este evento?')) return;
    try {
      const colName = selectedEvent.source === 'web' ? 'visits' : 'appointments';
      await deleteDoc(doc(db, colName, selectedEvent.id));
      toast.success('Evento eliminado');
      handleCloseModals();
    } catch { toast.error('Error al eliminar'); }
  };

  const handleMarkComplete = async () => {
    if (!selectedEvent) return;
    try {
      const colName = selectedEvent.source === 'web' ? 'visits' : 'appointments';
      await updateDoc(doc(db, colName, selectedEvent.id), {
        status: 'completada', updatedAt: new Date().toISOString(),
      });
      toast.success('Marcado como completado');
      handleCloseModals();
    } catch { toast.error('Error al actualizar'); }
  };

  const handleClientChange = (clientId) => {
    const client = clients.find((c) => c.id === clientId);
    setEventForm((prev) => ({ ...prev, clientId, clientPhone: client?.telefono || '' }));
  };

  const handleCreateClient = async () => {
    if (!clientForm.nombre.trim() || !clientForm.telefono.trim()) {
      toast.error('Nombre y teléfono son obligatorios'); return;
    }
    setSubmitting(true);
    try {
      const newClient = {
        nombre: clientForm.nombre, telefono: clientForm.telefono,
        email: clientForm.email || '', tipoCliente: 'Lead',
        estado: 'Activo', createdAt: new Date().toISOString(),
      };
      const r = await addDoc(collection(db, 'clients'), newClient);
      setClients((prev) => [...prev, { id: r.id, ...newClient }]);
      setEventForm((prev) => ({ ...prev, clientId: r.id, clientPhone: clientForm.telefono }));
      setClientForm({ nombre: '', telefono: '', email: '' });
      setShowClientModal(false);
      toast.success('Cliente creado y vinculado');
    } catch { toast.error('Error al crear cliente'); }
    finally { setSubmitting(false); }
  };

  const handleCloseModals = () => {
    setShowEventModal(false);
    setShowClientModal(false);
    setSelectedEvent(null);
  };

  const goToday   = () => { setCurrentDate(new Date()); calendarRef.current?.getApi().today(); };
  const goPrev    = () => { calendarRef.current?.getApi().prev();  setCurrentDate(calendarRef.current?.getApi().getDate()); };
  const goNext    = () => { calendarRef.current?.getApi().next();  setCurrentDate(calendarRef.current?.getApi().getDate()); };
  const changeView = (v) => { setView(v); calendarRef.current?.getApi().changeView(v); };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <FaSpinner className="animate-spin text-5xl text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ─── Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary mb-1 flex items-center gap-2">
            <FaCalendarAlt /> Agenda inmobiliaria
          </h1>
          <p className="text-slate-400 text-sm">Visitas, reuniones y seguimientos — todo en un solo lugar</p>
        </div>
        <button
          onClick={() => {
            setSelectedEvent(null);
            setEventForm({ title: '', clientId: '', propertyId: '', start: new Date(), location: '', notes: '', status: 'pendiente', type: 'visita', clientPhone: '', assignedAgentId: '' });
            setShowEventModal(true);
          }}
          className="button-gold inline-flex items-center gap-2 px-5 py-2.5 text-sm"
        >
          <FaPlus /> Nuevo evento
        </button>
      </div>

      {/* ─── Stats rápidas ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total eventos', value: totalEvents,             icon: FaCalendarAlt, color: 'text-primary' },
          { label: 'Pendientes',    value: pendingCount,            icon: FaSpinner,     color: 'text-yellow-400' },
          { label: 'Agentes activos', value: agents.length,          icon: FaUsers,       color: 'text-blue-400' },
          { label: 'Visitas web',   value: webVisits.length,        icon: FaHome,        color: 'text-emerald-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
            <Icon className={`text-2xl ${color} flex-shrink-0`} />
            <div>
              <p className="text-slate-400 text-xs">{label}</p>
              <p className="text-slate-100 font-bold text-lg">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Controles navegación ──────────────────────────────────────── */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={goPrev} className="w-8 h-8 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 flex items-center justify-center transition-colors">‹</button>
          <span className="text-sm font-semibold text-slate-100 capitalize min-w-[160px] text-center">
            {new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' }).format(currentDate)}
          </span>
          <button onClick={goNext} className="w-8 h-8 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 flex items-center justify-center transition-colors">›</button>
          <button onClick={goToday} className="px-3 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg text-xs font-semibold transition-colors">Hoy</button>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          {[['dayGridMonth','Mes'],['timeGridWeek','Semana'],['timeGridDay','Día'],['listWeek','Agenda']].map(([v, label]) => (
            <button key={v} onClick={() => changeView(v)}
              className={`px-3 py-1.5 rounded-full font-semibold transition-colors ${
                view === v
                  ? 'bg-primary text-slate-900'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Filtros ────────────────────────────────────────────────────── */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <FaFilter className="text-primary text-xs" />
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Filtros</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Agente</label>
            <select value={filterAgentId} onChange={(e) => setFilterAgentId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-primary outline-none">
              <option value="">Todos los agentes</option>
              {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Tipo</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-primary outline-none">
              <option value="">Todos los tipos</option>
              <option value="visita">🏠 Visitas (CRM)</option>
              <option value="reunion">🤝 Reuniones</option>
              <option value="llamada">📞 Llamadas</option>
              <option value="seguimiento">👥 Seguimientos</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Estado</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-primary outline-none">
              <option value="">Todos los estados</option>
              <option value="pendiente">⏳ Pendiente</option>
              <option value="approved">✅ Aprobada</option>
              <option value="confirmada">✅ Confirmada</option>
              <option value="completada">✔ Completada</option>
              <option value="cancelada">✗ Cancelada</option>
              <option value="rescheduled">🔄 Reagendada</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─── Leyenda de agentes ─────────────────────────────────────────── */}
      {agents.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Agentes por color</p>
          <div className="flex flex-wrap gap-3">
            {agents.map((agent) => (
              <div key={agent.id} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: getAgentColor(agent.id) }} />
                <span className="text-slate-300 text-xs">{agent.name}</span>
                <span className="text-slate-600 text-xs">({agent.role})</span>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#1d4ed8]" />
              <span className="text-slate-300 text-xs">🌐 Visita web sin asignar</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-slate-500" />
              <span className="text-slate-300 text-xs">Sin agente</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── FullCalendar ────────────────────────────────────────────────── */}
      <div className="fc-dark-wrap rounded-xl overflow-hidden border border-slate-800">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale={esLocale}
          firstDay={1}
          headerToolbar={false}
          events={fcEvents}
          editable={true}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={3}
          height={660}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          datesSet={(info) => setCurrentDate(info.view.currentStart)}
          eventContent={(arg) => {
            const status = arg.event.extendedProps.status || '';
            const isCompleted = ['completada', 'completed'].includes(status);
            const isCancelled = ['cancelada', 'rejected'].includes(status);
            return (
              <div style={{
                padding: '2px 6px',
                fontWeight: 600,
                fontSize: '11px',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                opacity: isCompleted ? 0.65 : 1,
                textDecoration: isCancelled ? 'line-through' : 'none',
                color: '#fff',
              }}>
                {arg.timeText && (
                  <span style={{ opacity: 0.8, marginRight: 4, fontSize: '10px' }}>
                    {arg.timeText}
                  </span>
                )}
                {arg.event.title}
              </div>
            );
          }}
          noEventsText="No hay eventos en este período"
        />
      </div>

      {/* ─── MODAL EVENTO ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showEventModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={handleCloseModals}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 rounded-2xl border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-bold text-primary">
                    {selectedEvent
                      ? (selectedEvent.source === 'web' ? '🌐 Visita web' : '✏️ Editar evento')
                      : '➕ Nuevo evento'}
                  </h2>
                  {selectedEvent?.source === 'web' && (
                    <span className="text-xs bg-blue-900/50 text-blue-300 border border-blue-700 px-2 py-1 rounded-full">
                      Desde formulario web
                    </span>
                  )}
                  <button onClick={handleCloseModals}
                    className="w-8 h-8 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center ml-2">
                    <FaTimes className="text-slate-300 text-sm" />
                  </button>
                </div>

                <form onSubmit={handleSaveEvent} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    <div className="md:col-span-2">
                      <label className="block text-slate-400 text-xs mb-1">Título *</label>
                      <input type="text" required value={eventForm.title}
                        onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:border-primary outline-none"
                        placeholder="Ej: Visita Casa Laureles con Juan García" />
                    </div>

                    <div>
                      <label className="block text-slate-400 text-xs mb-1">Tipo de evento</label>
                      <select value={eventForm.type}
                        onChange={(e) => setEventForm({ ...eventForm, type: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:border-primary outline-none">
                        <option value="visita">🏠 Visita a propiedad</option>
                        <option value="reunion">🤝 Reunión</option>
                        <option value="llamada">📞 Llamada</option>
                        <option value="seguimiento">👥 Seguimiento</option>
                        <option value="otro">📌 Otro</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 text-xs mb-1">Estado</label>
                      <select value={eventForm.status}
                        onChange={(e) => setEventForm({ ...eventForm, status: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:border-primary outline-none">
                        <option value="pendiente">⏳ Pendiente</option>
                        <option value="approved">✅ Aprobada</option>
                        <option value="confirmada">✅ Confirmada</option>
                        <option value="completada">✔ Completada</option>
                        <option value="cancelada">✗ Cancelada</option>
                        <option value="rescheduled">🔄 Reagendada</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 text-xs mb-1">Fecha y hora *</label>
                      <input type="datetime-local" required
                        value={new Date(eventForm.start).toISOString().slice(0, 16)}
                        onChange={(e) => setEventForm({ ...eventForm, start: new Date(e.target.value) })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:border-primary outline-none" />
                    </div>

                    <div>
                      <label className="block text-slate-400 text-xs mb-1">Agente asignado</label>
                      <select value={eventForm.assignedAgentId}
                        onChange={(e) => setEventForm({ ...eventForm, assignedAgentId: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:border-primary outline-none">
                        <option value="">Sin asignar</option>
                        {agents.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.role === 'admin' ? 'Admin' : 'Agente'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-slate-400 text-xs mb-1">Cliente</label>
                      <div className="flex gap-2">
                        <select value={eventForm.clientId}
                          onChange={(e) => handleClientChange(e.target.value)}
                          className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:border-primary outline-none">
                          <option value="">Seleccionar cliente...</option>
                          {clients.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nombre}{c.telefono ? ` — ${c.telefono}` : ''}
                            </option>
                          ))}
                        </select>
                        <button type="button" onClick={() => setShowClientModal(true)}
                          className="px-3 py-2 bg-primary hover:bg-primary/80 text-slate-900 rounded-lg text-xs font-semibold flex items-center gap-1">
                          <FaUserPlus /> Nuevo
                        </button>
                      </div>
                    </div>

                    {['visita', 'seguimiento'].includes(eventForm.type) && (
                      <div className="md:col-span-2">
                        <label className="block text-slate-400 text-xs mb-1">Propiedad</label>
                        <select value={eventForm.propertyId}
                          onChange={(e) => setEventForm({ ...eventForm, propertyId: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:border-primary outline-none">
                          <option value="">Seleccionar propiedad...</option>
                          {properties.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.title}{p.city ? ` — ${p.city}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="md:col-span-2">
                      <label className="block text-slate-400 text-xs mb-1">Dirección / lugar</label>
                      <input type="text" value={eventForm.location}
                        onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:border-primary outline-none"
                        placeholder="Dirección o lugar de encuentro" />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-slate-400 text-xs mb-1">Notas</label>
                      <textarea rows={3} value={eventForm.notes}
                        onChange={(e) => setEventForm({ ...eventForm, notes: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:border-primary outline-none resize-none"
                        placeholder="Detalles, instrucciones, observaciones..." />
                    </div>
                  </div>

                  {/* Resumen selección */}
                  {(eventForm.clientId || eventForm.propertyId || eventForm.assignedAgentId) && (
                    <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs space-y-1">
                      {eventForm.clientId        && <p className="text-slate-400">👤 Cliente: <span className="text-slate-200">{getClientName(eventForm.clientId)}</span></p>}
                      {eventForm.propertyId      && <p className="text-slate-400">🏠 Propiedad: <span className="text-slate-200">{getPropertyTitle(eventForm.propertyId)}</span></p>}
                      {eventForm.assignedAgentId && (
                        <p className="text-slate-400 flex items-center gap-2">
                          🧑‍💼 Agente:
                          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: getAgentColor(eventForm.assignedAgentId) }} />
                          <span className="text-slate-200">{getAgentName(eventForm.assignedAgentId)}</span>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Botones de acción */}
                  <div className="space-y-2 pt-2">
                    <div className="flex gap-2">
                      <button type="button" onClick={handleCloseModals} disabled={submitting}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50 transition-colors">
                        Cancelar
                      </button>
                      <button type="submit" disabled={submitting}
                        className="flex-1 button-gold inline-flex items-center justify-center gap-2 text-sm disabled:opacity-50">
                        {submitting
                          ? <><FaSpinner className="animate-spin" /> Guardando...</>
                          : <><FaSave /> {selectedEvent ? 'Guardar cambios' : 'Crear evento'}</>}
                      </button>
                    </div>

                    {selectedEvent && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {eventForm.clientPhone && (
                          <a href={`https://wa.me/57${eventForm.clientPhone.replace(/\D/g, '')}?text=Hola, te contacto sobre: ${eventForm.title}`}
                            target="_blank" rel="noopener noreferrer"
                            className="px-3 py-2 bg-green-700 hover:bg-green-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2">
                            <FaWhatsapp /> WhatsApp
                          </a>
                        )}
                        {!['completada', 'completed'].includes(selectedEvent.resource?.status) && (
                          <button type="button" onClick={handleMarkComplete}
                            className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2">
                            <FaCheckCircle /> Completar
                          </button>
                        )}
                        <button type="button" onClick={handleDeleteEvent}
                          className="px-3 py-2 bg-red-800 hover:bg-red-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2">
                          <FaTrash /> Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── MODAL CLIENTE RÁPIDO ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showClientModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            onClick={() => setShowClientModal(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 rounded-2xl border border-slate-700 max-w-sm w-full shadow-2xl"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-primary">Nuevo cliente rápido</h2>
                  <button onClick={() => setShowClientModal(false)}
                    className="w-8 h-8 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center">
                    <FaTimes className="text-slate-300 text-sm" />
                  </button>
                </div>
                <div className="space-y-3">
                  {[['nombre','Nombre completo *','text','Nombre del cliente'],['telefono','Teléfono *','tel','3001234567'],['email','Email','email','correo@ejemplo.com']].map(([field, label, type, ph]) => (
                    <div key={field}>
                      <label className="block text-slate-400 text-xs mb-1">{label}</label>
                      <input type={type} value={clientForm[field]}
                        onChange={(e) => setClientForm({ ...clientForm, [field]: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:border-primary outline-none"
                        placeholder={ph} />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-5">
                  <button type="button" onClick={() => setShowClientModal(false)} disabled={submitting}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold">
                    Cancelar
                  </button>
                  <button type="button" onClick={handleCreateClient} disabled={submitting}
                    className="flex-1 button-gold inline-flex items-center justify-center gap-2 text-sm disabled:opacity-50">
                    {submitting ? <><FaSpinner className="animate-spin" /> Creando...</> : <><FaUserPlus /> Crear</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── CSS FullCalendar modo oscuro ─────────────────────────────────── */}
      <style>{`
        /* Base */
        .fc-dark-wrap { background: #0f172a; }
        .fc-dark-wrap .fc { background: #0f172a; color: #e2e8f0; }

        /* Bordes */
        .fc-dark-wrap .fc-theme-standard td,
        .fc-dark-wrap .fc-theme-standard th,
        .fc-dark-wrap .fc-theme-standard .fc-scrollgrid { border-color: #1e293b !important; }

        /* Encabezado días */
        .fc-dark-wrap .fc-col-header-cell {
          background: #0d1526;
          color: #94a3b8;
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 8px 0;
        }
        .fc-dark-wrap .fc-col-header-cell a { color: #94a3b8 !important; text-decoration: none; }

        /* Celdas de días */
        .fc-dark-wrap .fc-daygrid-day { background: #0f172a; }
        .fc-dark-wrap .fc-daygrid-day:hover { background: #111827; cursor: pointer; }
        .fc-dark-wrap .fc-day-today { background: oklch(0.35 0.08 85 / 0.15) !important; }
        .fc-dark-wrap .fc-day-today .fc-daygrid-day-number {
          color: #d4af37 !important;
          font-weight: 700;
        }
        .fc-dark-wrap .fc-day-other .fc-daygrid-day-number { color: #334155 !important; }
        .fc-dark-wrap .fc-daygrid-day-number {
          color: #cbd5e1 !important;
          font-size: 13px;
          padding: 6px 8px;
        }
        .fc-dark-wrap .fc-daygrid-day-number:hover { color: #d4af37 !important; }

        /* Eventos */
        .fc-dark-wrap .fc-event {
          border: none !important;
          border-radius: 5px;
          font-size: 11px;
          cursor: pointer;
        }
        .fc-dark-wrap .fc-event:hover { filter: brightness(1.2); transform: translateY(-1px); }
        .fc-dark-wrap .fc-event .fc-event-title { color: #fff !important; font-weight: 600; }
        .fc-dark-wrap .fc-event .fc-event-time  { color: rgba(255,255,255,0.8) !important; font-size: 10px; }
        .fc-dark-wrap .fc-more-link { color: #d4af37 !important; font-weight: 700; font-size: 11px; }
        .fc-dark-wrap .fc-more-link:hover { color: #fbbf24 !important; }

        /* Vista semana/día */
        .fc-dark-wrap .fc-timegrid-slot { background: #0f172a; border-color: #1e293b !important; }
        .fc-dark-wrap .fc-timegrid-slot-minor { border-color: #161e2e !important; }
        .fc-dark-wrap .fc-timegrid-axis { background: #0d1526; color: #64748b; font-size: 11px; }
        .fc-dark-wrap .fc-timegrid-now-indicator-line { border-color: #d4af37 !important; }
        .fc-dark-wrap .fc-timegrid-now-indicator-arrow { border-top-color: #d4af37 !important; }

        /* Vista agenda/lista */
        .fc-dark-wrap .fc-list-day-cushion {
          background: #0d1526 !important;
          color: #94a3b8 !important;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
        }
        .fc-dark-wrap .fc-list-event:hover td { background: #1e293b !important; }
        .fc-dark-wrap .fc-list-event td { border-color: #1e293b !important; color: #e2e8f0 !important; }
        .fc-dark-wrap .fc-list-event-title a { color: #e2e8f0 !important; text-decoration: none; }
        .fc-dark-wrap .fc-list-empty { background: #0f172a !important; color: #64748b !important; padding: 40px; text-align: center; }

        /* Scroller */
        .fc-dark-wrap .fc-scroller { background: #0f172a; }
        .fc-dark-wrap ::-webkit-scrollbar { width: 5px; height: 5px; }
        .fc-dark-wrap ::-webkit-scrollbar-track { background: #0f172a; }
        .fc-dark-wrap ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }

        /* Selección de rango */
        .fc-dark-wrap .fc-highlight { background: oklch(0.6 0.12 85 / 0.2) !important; }

        /* Popover */
        .fc-dark-wrap .fc-popover {
          background: #1e293b !important;
          border-color: #334155 !important;
          border-radius: 10px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        }
        .fc-dark-wrap .fc-popover-header { background: #0d1526 !important; color: #e2e8f0 !important; border-radius: 10px 10px 0 0; padding: 8px 12px; }
        .fc-dark-wrap .fc-popover-close { color: #94a3b8 !important; }
        .fc-dark-wrap .fc-popover-body { padding: 8px; }
      `}</style>
    </div>
  );
};

export default CalendarPage;
