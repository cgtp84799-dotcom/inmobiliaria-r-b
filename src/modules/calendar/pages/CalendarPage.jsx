import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import {
  FaPlus,
  FaTimes,
  FaSpinner,
  FaWhatsapp,
  FaTrash,
  FaCheckCircle,
  FaSave,
  FaUserPlus,
  FaFilter,
} from 'react-icons/fa';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  where,
} from 'firebase/firestore';
import { db } from '../../../core/config/firebase.config';
import { useAuth } from '../../../core/contexts/AuthContext';
import toast from 'react-hot-toast';

// Paleta de colores para agentes
const AGENT_COLORS = [
  '#3b82f6', '#a855f7', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#14b8a6', '#f97316', '#06b6d4', '#ec4899',
  '#84cc16', '#6366f1', '#f43f5e', '#22c55e', '#eab308', '#64748b',
];

// Etiquetas de estado para tooltips
const STATUS_LABELS = {
  pendiente:  'Pendiente',
  confirmada: 'Confirmada',
  completada: 'Completada',
  cancelada:  'Cancelada',
  approved:   'Aprobada',
  completed:  'Completada',
  rejected:   'Rechazada',
  rescheduled:'Reagendada',
};

const CalendarPage = () => {
  const { currentUser } = useAuth();
  const calendarRef = useRef(null);

  const [rawEvents, setRawEvents]     = useState([]);
  const [clients, setClients]         = useState([]);
  const [properties, setProperties]   = useState([]);
  const [agents, setAgents]           = useState([]);

  const [loading, setLoading]         = useState(true);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [selectedEvent, setSelectedEvent]     = useState(null);
  const [submitting, setSubmitting]           = useState(false);

  const [view, setView]               = useState('dayGridMonth');
  const [currentDate, setCurrentDate] = useState(new Date());

  const [filterAgentId, setFilterAgentId] = useState('');
  const [filterType, setFilterType]       = useState('');
  const [filterStatus, setFilterStatus]   = useState('');

  const [eventForm, setEventForm] = useState({
    title: '',
    clientId: '',
    propertyId: '',
    start: new Date(),
    location: '',
    notes: '',
    status: 'pendiente',
    type: 'visita',
    clientPhone: '',
    assignedAgentId: '',
  });

  const [clientForm, setClientForm] = useState({ nombre: '', telefono: '', email: '' });

  // ─ Cargar datos Firestore ──────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);

    const unsubAppts = onSnapshot(
      query(collection(db, 'appointments'), orderBy('date', 'asc')),
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setRawEvents(data);
        setLoading(false);
      },
      (err) => {
        console.error('Error cargando agenda:', err);
        toast.error('Error al cargar agenda');
        setLoading(false);
      },
    );

    const unsubClients = onSnapshot(query(collection(db, 'clients')), (s) => {
      setClients(s.docs.map((d) => ({
        id: d.id,
        nombre: d.data().nombre || d.data().name || '',
        telefono: d.data().telefono || d.data().phone || '',
        email: d.data().email || '',
      })));
    });

    const unsubProps = onSnapshot(query(collection(db, 'properties')), (s) => {
      setProperties(s.docs.map((d) => ({
        id: d.id,
        title: d.data().title || '',
        city: d.data().city || '',
      })));
    });

    const unsubAgents = onSnapshot(
      query(collection(db, 'users'), where('role', '==', 'agent')),
      (s) => {
        setAgents(s.docs.map((d) => ({
          id: d.id,
          name: d.data().name || d.data().email || '',
          email: d.data().email || '',
        })));
      },
    );

    return () => { unsubAppts(); unsubClients(); unsubProps(); unsubAgents(); };
  }, []);

  // ─ Helpers ───────────────────────────────────────────────────────────────────
  const getAgentColor = useCallback((agentId) => {
    if (!agentId) return '#6b7280';
    const idx = agents.findIndex((a) => a.id === agentId);
    return AGENT_COLORS[idx % AGENT_COLORS.length];
  }, [agents]);

  const getClientName   = (id) => clients.find((c) => c.id === id)?.nombre || 'Sin cliente';
  const getPropertyTitle = (id) => properties.find((p) => p.id === id)?.title || 'Sin propiedad';
  const getAgentName    = (id) => agents.find((a) => a.id === id)?.name || 'Sin agente';

  // ─ Convertir rawEvents a formato FullCalendar ──────────────────────────
  const fcEvents = rawEvents
    .filter((raw) => {
      if (filterAgentId && raw.assignedAgentId !== filterAgentId) return false;
      if (filterType   && raw.type             !== filterType)    return false;
      if (filterStatus && raw.status           !== filterStatus)  return false;
      return true;
    })
    .map((raw) => {
      const dateStr    = raw.date || new Date().toISOString().split('T')[0];
      const timeStr    = raw.time || '09:00';
      const start      = `${dateStr}T${timeStr}`;
      const durationMs = (Number(raw.duration || 60)) * 60 * 1000;
      const endDate    = new Date(new Date(start).getTime() + durationMs);

      let bg = getAgentColor(raw.assignedAgentId || '');
      if (raw.status === 'completada' || raw.status === 'completed') bg += 'BB';
      if (raw.status === 'cancelada')  bg = '#6b7280';

      const statusLabel = STATUS_LABELS[raw.status] || raw.status || '';
      const titleStr = `${raw.title || 'Sin título'}${statusLabel ? ' · ' + statusLabel : ''}`;

      return {
        id:               raw.id,
        title:            titleStr,
        start,
        end:              endDate.toISOString(),
        backgroundColor:  bg,
        borderColor:      bg,
        textColor:        '#ffffff',
        extendedProps:    raw,
      };
    });

  // ─ Handlers FullCalendar ──────────────────────────────────────────────────
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
    setSelectedEvent({ id: info.event.id, resource: raw });
    const dateStr = raw.date || info.event.startStr.split('T')[0];
    const timeStr = raw.time || (info.event.startStr.split('T')[1] || '09:00').slice(0, 5);
    setEventForm({
      title:           raw.title || '',
      clientId:        raw.clientId || '',
      propertyId:      raw.propertyId || '',
      start:           new Date(`${dateStr}T${timeStr}`),
      location:        raw.location || '',
      notes:           raw.notes || '',
      status:          raw.status || 'pendiente',
      type:            raw.type || 'visita',
      clientPhone:     raw.clientPhone || '',
      assignedAgentId: raw.assignedAgentId || '',
    });
    setShowEventModal(true);
  }, []);

  // Drag & drop (solo admins)
  const handleEventDrop = useCallback(async (info) => {
    const newStart = info.event.start;
    const date = newStart.toISOString().split('T')[0];
    const time = newStart.toTimeString().slice(0, 5);
    try {
      await updateDoc(doc(db, 'appointments', info.event.id), {
        date, time, updatedAt: new Date().toISOString(),
      });
      toast.success('Visita reagendada');
    } catch (e) {
      toast.error('Error al reagendar');
      info.revert();
    }
  }, []);

  // ─ Guardar evento ────────────────────────────────────────────────────────────
  const handleSaveEvent = async (e) => {
    e.preventDefault();
    if (!eventForm.title.trim()) { toast.error('El título es obligatorio'); return; }
    setSubmitting(true);
    try {
      const dt   = new Date(eventForm.start);
      const date = dt.toISOString().split('T')[0];
      const time = dt.toTimeString().slice(0, 5);
      const payload = {
        title:           eventForm.title,
        clientId:        eventForm.clientId || '',
        propertyId:      eventForm.propertyId || '',
        date, time,
        duration:        60,
        location:        eventForm.location,
        notes:           eventForm.notes,
        status:          eventForm.status,
        type:            eventForm.type,
        clientPhone:     eventForm.clientPhone,
        assignedAgentId: eventForm.assignedAgentId || '',
        createdBy:       currentUser?.email || 'unknown',
        updatedAt:       new Date().toISOString(),
      };
      if (selectedEvent) {
        await updateDoc(doc(db, 'appointments', selectedEvent.id), payload);
        toast.success('Evento actualizado');
      } else {
        await addDoc(collection(db, 'appointments'), { ...payload, createdAt: new Date().toISOString() });
        toast.success('Evento creado');
      }
      handleCloseModals();
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar el evento');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent || !confirm('¿Eliminar este evento?')) return;
    try {
      await deleteDoc(doc(db, 'appointments', selectedEvent.id));
      toast.success('Evento eliminado');
      handleCloseModals();
    } catch { toast.error('Error al eliminar'); }
  };

  const handleMarkComplete = async () => {
    if (!selectedEvent) return;
    try {
      await updateDoc(doc(db, 'appointments', selectedEvent.id), { status: 'completada', updatedAt: new Date().toISOString() });
      toast.success('Evento marcado como completado');
      handleCloseModals();
    } catch { toast.error('Error al actualizar estado'); }
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
      toast.success('Cliente creado y vinculado al evento');
    } catch { toast.error('Error al crear cliente'); }
    finally { setSubmitting(false); }
  };

  const handleCloseModals = () => {
    setShowEventModal(false);
    setShowClientModal(false);
    setSelectedEvent(null);
  };

  // Navegación del calendario
  const goToday  = () => { setCurrentDate(new Date()); calendarRef.current?.getApi().today(); };
  const goPrev   = () => { calendarRef.current?.getApi().prev(); setCurrentDate(calendarRef.current?.getApi().getDate()); };
  const goNext   = () => { calendarRef.current?.getApi().next(); setCurrentDate(calendarRef.current?.getApi().getDate()); };
  const changeView = (v) => { setView(v); calendarRef.current?.getApi().changeView(v); };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <FaSpinner className="animate-spin text-5xl text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-1">Agenda inmobiliaria</h1>
          <p className="text-slate-400 text-sm">Programa visitas, reuniones, llamadas y seguimientos</p>
        </div>
        <button
          onClick={() => {
            setSelectedEvent(null);
            setEventForm({ title: '', clientId: '', propertyId: '', start: new Date(), location: '', notes: '', status: 'pendiente', type: 'visita', clientPhone: '', assignedAgentId: '' });
            setShowEventModal(true);
          }}
          className="button-gold inline-flex items-center gap-2 px-6 py-3"
        >
          <FaPlus /> Nuevo evento
        </button>
      </div>

      {/* Controles de navegación */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={goPrev} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-200 transition-colors">‹</button>
          <span className="text-base font-semibold text-slate-100 capitalize min-w-[170px] text-center">
            {new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' }).format(currentDate)}
          </span>
          <button onClick={goNext} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-200 transition-colors">›</button>
          <button onClick={goToday} className="px-3 py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg text-xs font-semibold transition-colors">Hoy</button>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {[['dayGridMonth','Mes'],['timeGridWeek','Semana'],['timeGridDay','Día'],['listWeek','Agenda']].map(([v, label]) => (
            <button
              key={v}
              onClick={() => changeView(v)}
              className={`px-3 py-1.5 rounded-full font-semibold transition-colors ${
                view === v ? 'bg-primary text-slate-900' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <FaFilter className="text-primary" />
          <h3 className="text-sm font-semibold text-slate-100">Filtros</h3>
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
            <label className="block text-xs text-slate-400 mb-1">Tipo de evento</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-primary outline-none">
              <option value="">Todos los tipos</option>
              <option value="visita">Visitas</option>
              <option value="reunion">Reuniones</option>
              <option value="llamada">Llamadas</option>
              <option value="seguimiento">Seguimientos</option>
              <option value="otro">Otros</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Estado</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-primary outline-none">
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="confirmada">Confirmada</option>
              <option value="completada">Completada</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
        </div>
      </div>

      {/* Leyenda de agentes */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
        <h3 className="text-xs font-semibold text-slate-400 mb-3">Agentes (por color)</h3>
        <div className="flex flex-wrap gap-3 text-xs">
          {agents.map((agent) => (
            <div key={agent.id} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: getAgentColor(agent.id) }} />
              <span className="text-slate-300">{agent.name}</span>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-slate-500" />
            <span className="text-slate-300">Sin asignar</span>
          </div>
        </div>
      </div>

      {/* FullCalendar */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 fc-dark">
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
          height={640}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          datesSet={(info) => setCurrentDate(info.view.currentStart)}
          eventContent={(arg) => (
            <div style={{ padding: '2px 5px', fontWeight: 600, fontSize: '12px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              {arg.timeText && <span style={{ opacity: 0.8, marginRight: 4 }}>{arg.timeText}</span>}
              {arg.event.title}
            </div>
          )}
          noEventsText="No hay eventos en este rango"
          buttonText={{ today: 'Hoy', month: 'Mes', week: 'Semana', day: 'Día', list: 'Agenda' }}
        />
      </div>

      {/* MODAL EVENTO */}
      <AnimatePresence>
        {showEventModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={handleCloseModals}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 rounded-2xl border border-slate-800 max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-primary">{selectedEvent ? 'Editar evento' : 'Nuevo evento'}</h2>
                  <button onClick={handleCloseModals} className="w-9 h-9 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center">
                    <FaTimes className="text-slate-200" />
                  </button>
                </div>

                <form onSubmit={handleSaveEvent} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-slate-400 text-xs mb-1">Título del evento *</label>
                      <input type="text" required value={eventForm.title}
                        onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:border-primary outline-none"
                        placeholder="Ej: Visita apartamento Laureles con Juan" />
                    </div>

                    <div>
                      <label className="block text-slate-400 text-xs mb-1">Tipo de evento</label>
                      <select value={eventForm.type} onChange={(e) => setEventForm({ ...eventForm, type: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:border-primary outline-none">
                        <option value="visita">Visita a propiedad</option>
                        <option value="reunion">Reunión</option>
                        <option value="llamada">Llamada</option>
                        <option value="seguimiento">Seguimiento</option>
                        <option value="otro">Otro</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 text-xs mb-1">Estado</label>
                      <select value={eventForm.status} onChange={(e) => setEventForm({ ...eventForm, status: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:border-primary outline-none">
                        <option value="pendiente">Pendiente</option>
                        <option value="confirmada">Confirmada</option>
                        <option value="completada">Completada</option>
                        <option value="cancelada">Cancelada</option>
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
                      <select value={eventForm.assignedAgentId} onChange={(e) => setEventForm({ ...eventForm, assignedAgentId: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:border-primary outline-none">
                        <option value="">Sin asignar</option>
                        {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-slate-400 text-xs mb-1">Cliente</label>
                      <div className="flex gap-2">
                        <select value={eventForm.clientId} onChange={(e) => handleClientChange(e.target.value)}
                          className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:border-primary outline-none">
                          <option value="">Seleccionar cliente...</option>
                          {clients.map((c) => <option key={c.id} value={c.id}>{c.nombre}{c.telefono ? ` - ${c.telefono}` : ''}</option>)}
                        </select>
                        <button type="button" onClick={() => setShowClientModal(true)}
                          className="px-4 py-2.5 bg-primary hover:bg-primary/80 text-slate-900 rounded-lg text-xs md:text-sm font-semibold flex items-center gap-2">
                          <FaUserPlus /> Nuevo
                        </button>
                      </div>
                    </div>

                    {['visita', 'seguimiento'].includes(eventForm.type) && (
                      <div className="md:col-span-2">
                        <label className="block text-slate-400 text-xs mb-1">Propiedad</label>
                        <select value={eventForm.propertyId} onChange={(e) => setEventForm({ ...eventForm, propertyId: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:border-primary outline-none">
                          <option value="">Seleccionar propiedad...</option>
                          {properties.map((p) => <option key={p.id} value={p.id}>{p.title}{p.city ? ` - ${p.city}` : ''}</option>)}
                        </select>
                      </div>
                    )}

                    <div className="md:col-span-2">
                      <label className="block text-slate-400 text-xs mb-1">Ubicación / dirección</label>
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
                        placeholder="Detalles importantes..." />
                    </div>
                  </div>

                  <div className="space-y-3 mt-4">
                    <div className="flex gap-3">
                      <button type="button" onClick={handleCloseModals} disabled={submitting}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
                        Cancelar
                      </button>
                      <button type="submit" disabled={submitting}
                        className="flex-1 button-gold inline-flex items-center justify-center gap-2 text-sm disabled:opacity-50">
                        {submitting ? <><FaSpinner className="animate-spin" /> Guardando...</> : <><FaSave /> {selectedEvent ? 'Actualizar' : 'Crear'} evento</>}
                      </button>
                    </div>

                    {selectedEvent && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                        {eventForm.clientPhone && (
                          <a href={`https://wa.me/57${eventForm.clientPhone.replace(/\D/g,'')}?text=Hola, te contacto sobre la cita: ${eventForm.title}`}
                            target="_blank" rel="noopener noreferrer"
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2">
                            <FaWhatsapp /> WhatsApp cliente
                          </a>
                        )}
                        {selectedEvent.resource?.status === 'pendiente' && (
                          <button type="button" onClick={handleMarkComplete}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2">
                            <FaCheckCircle /> Marcar completado
                          </button>
                        )}
                        <button type="button" onClick={handleDeleteEvent}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2">
                          <FaTrash /> Eliminar evento
                        </button>
                      </div>
                    )}
                  </div>

                  {(eventForm.clientId || eventForm.propertyId || eventForm.assignedAgentId) && (
                    <div className="mt-4 border-t border-slate-800 pt-3 text-xs text-slate-400 space-y-1">
                      {eventForm.clientId        && <div>Cliente: <span className="text-slate-100">{getClientName(eventForm.clientId)}</span></div>}
                      {eventForm.propertyId      && <div>Propiedad: <span className="text-slate-100">{getPropertyTitle(eventForm.propertyId)}</span></div>}
                      {eventForm.assignedAgentId && (
                        <div className="flex items-center gap-2">
                          Agente: <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: getAgentColor(eventForm.assignedAgentId) }} />
                          <span className="text-slate-100">{getAgentName(eventForm.assignedAgentId)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL CLIENTE RÁPIDO */}
      <AnimatePresence>
        {showClientModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            onClick={() => setShowClientModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 rounded-2xl border border-slate-800 max-w-md w-full"
            >
              <div className="p-6 md:p-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-primary">Nuevo cliente rápido</h2>
                  <button onClick={() => setShowClientModal(false)} className="w-8 h-8 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center">
                    <FaTimes className="text-slate-200" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-slate-400 text-xs mb-1">Nombre completo *</label>
                    <input type="text" value={clientForm.nombre} onChange={(e) => setClientForm({ ...clientForm, nombre: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:border-primary outline-none"
                      placeholder="Nombre del cliente" />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs mb-1">Teléfono *</label>
                    <input type="tel" value={clientForm.telefono} onChange={(e) => setClientForm({ ...clientForm, telefono: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:border-primary outline-none"
                      placeholder="3001234567" />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs mb-1">Email</label>
                    <input type="email" value={clientForm.email} onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:border-primary outline-none"
                      placeholder="correo@ejemplo.com" />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button type="button" onClick={() => setShowClientModal(false)} disabled={submitting}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl px-4 py-2.5 text-sm font-semibold">Cancelar</button>
                  <button type="button" onClick={handleCreateClient} disabled={submitting}
                    className="flex-1 button-gold inline-flex items-center justify-center gap-2 text-sm disabled:opacity-50">
                    {submitting ? <><FaSpinner className="animate-spin" /> Creando...</> : <><FaUserPlus /> Crear y vincular</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Estilos para FullCalendar en modo oscuro */}
      <style>{`
        .fc-dark .fc-theme-standard td,
        .fc-dark .fc-theme-standard th,
        .fc-dark .fc-theme-standard .fc-scrollgrid {
          border-color: #1e293b !important;
        }
        .fc-dark .fc-col-header-cell { background: #020617; color: #cbd5e1; font-weight:600; text-transform:capitalize; }
        .fc-dark .fc-daygrid-day { background: #020617; }
        .fc-dark .fc-daygrid-day:hover { background: #0f172a; }
        .fc-dark .fc-day-today { background: rgba(212,175,55,0.10) !important; }
        .fc-dark .fc-day-other .fc-daygrid-day-number { color: #475569; }
        .fc-dark .fc-daygrid-day-number { color: #e2e8f0; }
        .fc-dark .fc-timegrid-slot { background: #020617; border-color: #1e293b !important; }
        .fc-dark .fc-timegrid-axis { background: #020617; color:#94a3b8; }
        .fc-dark .fc-list-day-cushion { background: #0f172a !important; color:#e2e8f0 !important; }
        .fc-dark .fc-list-event:hover td { background: #1e293b !important; }
        .fc-dark .fc-list-event td { border-color:#1e293b !important; color:#e2e8f0; }
        .fc-dark .fc-list-empty { background:#020617; color:#94a3b8; }
        .fc-dark .fc-scroller { background: #020617; }
        .fc-dark .fc-event { border-radius:6px; border:0 !important; font-size:12px; }
        .fc-dark .fc-event:hover { filter:brightness(1.15); }
        .fc-dark .fc-more-link { color:#d4af37; font-weight:700; font-size:11px; }
        .fc-dark .fc-highlight { background: rgba(212,175,55,0.15) !important; }
      `}</style>
    </div>
  );
};

export default CalendarPage;
