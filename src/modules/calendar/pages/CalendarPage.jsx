import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/es';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import {
  FaPlus,
  FaTimes,
  FaSpinner,
  FaWhatsapp,
  FaTrash,
  FaCheckCircle,
  FaSave,
  FaUserPlus,
  FaFilter
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
  where
} from 'firebase/firestore';
import { db } from '../../../core/config/firebase.config';
import { useAuth } from '../../../core/contexts/AuthContext';
import toast from 'react-hot-toast';

// Configurar moment en español
moment.locale('es');
const localizer = momentLocalizer(moment);

// Paleta de colores para agentes (16 colores distintos para evitar repetición)
const AGENT_COLORS = [
  '#3b82f6', // azul
  '#a855f7', // morado
  '#10b981', // verde
  '#f59e0b', // naranja
  '#ef4444', // rojo
  '#8b5cf6', // violeta
  '#14b8a6', // teal
  '#f97316', // naranja oscuro
  '#06b6d4', // cyan
  '#ec4899', // rosa
  '#84cc16', // lima
  '#6366f1', // indigo
  '#f43f5e', // rosa-rojo
  '#22c55e', // verde claro
  '#eab308', // amarillo
  '#64748b'  // slate
];

const CalendarPage = () => {
  const { currentUser } = useAuth();

  const [events, setEvents] = useState([]);
  const [clients, setClients] = useState([]);
  const [properties, setProperties] = useState([]);
  const [agents, setAgents] = useState([]);

  const [loading, setLoading] = useState(true);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // control explícito de vista y fecha del calendario
  const [view, setView] = useState('month'); // 'month' | 'agenda'
  const [currentDate, setCurrentDate] = useState(new Date());

  // filtros
  const [filterAgentId, setFilterAgentId] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

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
    assignedAgentId: ''
  });

  const [clientForm, setClientForm] = useState({
    nombre: '',
    telefono: '',
    email: ''
  });

  // Cargar datos de Firestore
  useEffect(() => {
    setLoading(true);

    // Citas / eventos
    const unsubAppointments = onSnapshot(
      query(collection(db, 'appointments'), orderBy('date', 'asc')),
      (snapshot) => {
        const data = snapshot.docs.map((d) => {
          const raw = d.data();
          const dateStr = raw.date || moment().format('YYYY-MM-DD');
          const timeStr = raw.time || '09:00';
          const start = moment(`${dateStr}T${timeStr}`).toDate();
          const durationMinutes = Number(raw.duration || 60);
          const end = moment(start).add(durationMinutes, 'minutes').toDate();

          return {
            id: d.id,
            title: raw.title || 'Sin título',
            start,
            end,
            resource: {
              ...raw,
              id: d.id
            }
          };
        });
        setEvents(data);
        setLoading(false);
      },
      (err) => {
        console.error('Error cargando agenda:', err);
        toast.error('Error al cargar agenda');
        setLoading(false);
      }
    );

    // Clientes
    const unsubClients = onSnapshot(query(collection(db, 'clients')), (snapshot) => {
      const data = snapshot.docs.map((d) => ({
        id: d.id,
        nombre: d.data().nombre || d.data().name || '',
        telefono: d.data().telefono || d.data().phone || '',
        email: d.data().email || ''
      }));
      setClients(data);
    });

    // Propiedades
    const unsubProps = onSnapshot(query(collection(db, 'properties')), (snapshot) => {
      const data = snapshot.docs.map((d) => ({
        id: d.id,
        title: d.data().title || '',
        city: d.data().city || ''
      }));
      setProperties(data);
    });

    // Agentes (users con rol "agent")
    const unsubAgents = onSnapshot(
      query(collection(db, 'users'), where('role', '==', 'agent')),
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({
          id: d.id,
          name: d.data().name || d.data().email || '',
          email: d.data().email || ''
        }));
        setAgents(data);
      }
    );

    return () => {
      unsubAppointments();
      unsubClients();
      unsubProps();
      unsubAgents();
    };
  }, []);

  // Asignar color a cada agente
  const getAgentColor = (agentId) => {
    if (!agentId) return '#6b7280'; // gris para sin asignar
    const index = agents.findIndex((a) => a.id === agentId);
    return AGENT_COLORS[index % AGENT_COLORS.length];
  };

  // Filtrado de eventos
  const filteredEvents = events.filter((ev) => {
    const r = ev.resource || {};
    if (filterAgentId && r.assignedAgentId !== filterAgentId) return false;
    if (filterType && r.type !== filterType) return false;
    if (filterStatus && r.status !== filterStatus) return false;
    return true;
  });

  // Clic en un slot del calendario (crear evento)
  const handleSelectSlot = useCallback((slotInfo) => {
    const start = slotInfo.start || new Date();
    setSelectedEvent(null);
    setEventForm({
      title: '',
      clientId: '',
      propertyId: '',
      start,
      location: '',
      notes: '',
      status: 'pendiente',
      type: 'visita',
      clientPhone: '',
      assignedAgentId: ''
    });
    setShowEventModal(true);
  }, []);

  // Clic en un evento existente
  const handleSelectEvent = useCallback((event) => {
    const r = event.resource;
    setSelectedEvent(event);
    const dateStr = r.date || moment(event.start).format('YYYY-MM-DD');
    const timeStr = r.time || moment(event.start).format('HH:mm');
    const start = moment(`${dateStr}T${timeStr}`).toDate();

    setEventForm({
      title: r.title || event.title || '',
      clientId: r.clientId || '',
      propertyId: r.propertyId || '',
      start,
      location: r.location || '',
      notes: r.notes || '',
      status: r.status || 'pendiente',
      type: r.type || 'visita',
      clientPhone: r.clientPhone || '',
      assignedAgentId: r.assignedAgentId || ''
    });
    setShowEventModal(true);
  }, []);

  // Guardar evento (nuevo o editado)
  const handleSaveEvent = async (e) => {
    e.preventDefault();
    if (!eventForm.title.trim()) {
      toast.error('El título es obligatorio');
      return;
    }

    setSubmitting(true);
    try {
      const startMoment = moment(eventForm.start);
      const date = startMoment.format('YYYY-MM-DD');
      const time = startMoment.format('HH:mm');
      const duration = 60;

      const payload = {
        title: eventForm.title,
        clientId: eventForm.clientId || '',
        propertyId: eventForm.propertyId || '',
        date,
        time,
        duration,
        location: eventForm.location,
        notes: eventForm.notes,
        status: eventForm.status,
        type: eventForm.type,
        clientPhone: eventForm.clientPhone,
        assignedAgentId: eventForm.assignedAgentId || '',
        createdBy: currentUser?.email || 'unknown',
        updatedAt: new Date().toISOString()
      };

      if (selectedEvent) {
        await updateDoc(doc(db, 'appointments', selectedEvent.id), payload);
        toast.success('Evento actualizado');
      } else {
        await addDoc(collection(db, 'appointments'), {
          ...payload,
          createdAt: new Date().toISOString()
        });
        toast.success('Evento creado');
      }

      handleCloseModals();
    } catch (err) {
      console.error('Error guardando evento:', err);
      toast.error('Error al guardar el evento');
    } finally {
      setSubmitting(false);
    }
  };

  // Eliminar evento
  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    if (!confirm('¿Eliminar este evento?')) return;
    try {
      await deleteDoc(doc(db, 'appointments', selectedEvent.id));
      toast.success('Evento eliminado');
      handleCloseModals();
    } catch (err) {
      console.error('Error al eliminar evento:', err);
      toast.error('Error al eliminar');
    }
  };

  // Marcar evento como completado
  const handleMarkComplete = async () => {
    if (!selectedEvent) return;

    try {
      await updateDoc(doc(db, 'appointments', selectedEvent.id), {
        status: 'completada',
        updatedAt: new Date().toISOString()
      });
      toast.success('Evento marcado como completado');
      handleCloseModals();
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      toast.error('Error al actualizar estado');
    }
  };

  // Cambio de cliente desde select
  const handleClientChange = (clientId) => {
    const client = clients.find((c) => c.id === clientId);
    setEventForm((prev) => ({
      ...prev,
      clientId,
      clientPhone: client?.telefono || ''
    }));
  };

  // Crear cliente rápido
  const handleCreateClient = async () => {
    if (!clientForm.nombre.trim() || !clientForm.telefono.trim()) {
      toast.error('Nombre y teléfono son obligatorios');
      return;
    }
    setSubmitting(true);
    try {
      const newClient = {
        nombre: clientForm.nombre,
        telefono: clientForm.telefono,
        email: clientForm.email || '',
        tipoCliente: 'Lead',
        estado: 'Activo',
        createdAt: new Date().toISOString()
      };
      const ref = await addDoc(collection(db, 'clients'), newClient);

      setClients((prev) => [...prev, { id: ref.id, ...newClient }]);
      setEventForm((prev) => ({
        ...prev,
        clientId: ref.id,
        clientPhone: clientForm.telefono
      }));

      setClientForm({ nombre: '', telefono: '', email: '' });
      setShowClientModal(false);
      toast.success('Cliente creado y vinculado al evento');
    } catch (err) {
      console.error('Error creando cliente:', err);
      toast.error('Error al crear cliente');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseModals = () => {
    setShowEventModal(false);
    setShowClientModal(false);
    setSelectedEvent(null);
  };

  const getClientName = (id) =>
    clients.find((c) => c.id === id)?.nombre || 'Sin cliente';

  const getPropertyTitle = (id) =>
    properties.find((p) => p.id === id)?.title || 'Sin propiedad';

  const getAgentName = (id) =>
    agents.find((a) => a.id === id)?.name || 'Sin agente';

  // Colores por agente, no por tipo
  const eventStyleGetter = (event) => {
    const r = event.resource;
    const agentId = r.assignedAgentId || '';
    let bg = getAgentColor(agentId);

    // Atenuar si está completada
    if (r.status === 'completada') bg += 'BB';
    // Gris si cancelada
    if (r.status === 'cancelada') bg = '#6b7280';

    return {
      style: {
        backgroundColor: bg,
        color: '#ffffff',
        borderRadius: '6px',
        border: '0',
        fontSize: '13px',
        fontWeight: 600,
        padding: '2px 6px'
      }
    };
  };

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
          <p className="text-slate-400 text-sm">
            Programa visitas, reuniones, llamadas y seguimientos para clientes y agentes
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedEvent(null);
            setEventForm({
              title: '',
              clientId: '',
              propertyId: '',
              start: new Date(),
              location: '',
              notes: '',
              status: 'pendiente',
              type: 'visita',
              clientPhone: '',
              assignedAgentId: ''
            });
            setShowEventModal(true);
          }}
          className="button-gold inline-flex items-center gap-2 px-6 py-3"
        >
          <FaPlus />
          Nuevo evento
        </button>
      </div>

      {/* Controles de navegación */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentDate(moment(currentDate).subtract(1, 'month').toDate())}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-200 transition-colors"
          >
            ‹
          </button>
          <div className="text-lg font-semibold text-slate-100 capitalize min-w-[160px] text-center">
            {moment(currentDate).format('MMMM YYYY')}
          </div>
          <button
            onClick={() => setCurrentDate(moment(currentDate).add(1, 'month').toDate())}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-200 transition-colors"
          >
            ›
          </button>
          <button
            onClick={() => {
              setCurrentDate(new Date());
              setView('month');
            }}
            className="px-3 py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg text-xs font-semibold transition-colors"
          >
            Hoy
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setView('month')}
            className={`px-3 py-1.5 rounded-full font-semibold transition-colors ${
              view === 'month'
                ? 'bg-primary text-slate-900'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            Mes
          </button>
          <button
            onClick={() => setView('agenda')}
            className={`px-3 py-1.5 rounded-full font-semibold transition-colors ${
              view === 'agenda'
                ? 'bg-primary text-slate-900'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            Agenda
          </button>
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
            <select
              value={filterAgentId}
              onChange={(e) => setFilterAgentId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-primary outline-none"
            >
              <option value="">Todos los agentes</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Tipo de evento</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-primary outline-none"
            >
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
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-primary outline-none"
            >
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="confirmada">Confirmada</option>
              <option value="completada">Completada</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
        </div>
      </div>

      {/* Leyenda de agentes (colores) */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
        <h3 className="text-xs font-semibold text-slate-400 mb-3">Agentes (por color)</h3>
        <div className="flex flex-wrap gap-3 text-xs">
          {agents.map((agent) => (
            <div key={agent.id} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded"
                style={{ backgroundColor: getAgentColor(agent.id) }}
              />
              <span className="text-slate-300">{agent.name}</span>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-slate-500" />
            <span className="text-slate-300">Sin asignar</span>
          </div>
        </div>
      </div>

      {/* Calendario */}
      <div
        className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"
        style={{ height: '650px' }}
      >
        <Calendar
          localizer={localizer}
          events={filteredEvents}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          selectable
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          eventPropGetter={eventStyleGetter}
          views={['month', 'agenda']}
          view={view}
          onView={(newView) => setView(newView)}
          date={currentDate}
          onNavigate={(newDate) => setCurrentDate(newDate)}
          messages={{
            next: 'Siguiente',
            previous: 'Anterior',
            today: 'Hoy',
            month: 'Mes',
            agenda: 'Agenda',
            date: 'Fecha',
            time: 'Hora',
            event: 'Evento',
            noEventsInRange: 'No hay eventos en este rango',
            showMore: (total) => `+${total} más`
          }}
        />
      </div>

      {/* MODAL EVENTO */}
      <AnimatePresence>
        {showEventModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={handleCloseModals}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 rounded-2xl border border-slate-800 max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-primary">
                    {selectedEvent ? 'Editar evento' : 'Nuevo evento'}
                  </h2>
                  <button
                    onClick={handleCloseModals}
                    className="w-9 h-9 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center"
                  >
                    <FaTimes className="text-slate-200" />
                  </button>
                </div>

                <form onSubmit={handleSaveEvent} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Título */}
                    <div className="md:col-span-2">
                      <label className="block text-slate-400 text-xs mb-1">
                        Título del evento *
                      </label>
                      <input
                        type="text"
                        required
                        value={eventForm.title}
                        onChange={(e) =>
                          setEventForm({ ...eventForm, title: e.target.value })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:border-primary outline-none"
                        placeholder="Ej: Visita apartamento Laureles con Juan"
                      />
                    </div>

                    {/* Tipo */}
                    <div>
                      <label className="block text-slate-400 text-xs mb-1">
                        Tipo de evento
                      </label>
                      <select
                        value={eventForm.type}
                        onChange={(e) =>
                          setEventForm({ ...eventForm, type: e.target.value })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:border-primary outline-none"
                      >
                        <option value="visita">Visita a propiedad</option>
                        <option value="reunion">Reunión</option>
                        <option value="llamada">Llamada</option>
                        <option value="seguimiento">Seguimiento</option>
                        <option value="otro">Otro</option>
                      </select>
                    </div>

                    {/* Estado */}
                    <div>
                      <label className="block text-slate-400 text-xs mb-1">
                        Estado
                      </label>
                      <select
                        value={eventForm.status}
                        onChange={(e) =>
                          setEventForm({ ...eventForm, status: e.target.value })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:border-primary outline-none"
                      >
                        <option value="pendiente">Pendiente</option>
                        <option value="confirmada">Confirmada</option>
                        <option value="completada">Completada</option>
                        <option value="cancelada">Cancelada</option>
                      </select>
                    </div>

                    {/* Fecha/hora inicio */}
                    <div>
                      <label className="block text-slate-400 text-xs mb-1">
                        Fecha y hora *
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={moment(eventForm.start).format('YYYY-MM-DDTHH:mm')}
                        onChange={(e) =>
                          setEventForm({
                            ...eventForm,
                            start: new Date(e.target.value)
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:border-primary outline-none"
                      />
                    </div>

                    {/* Agente */}
                    <div>
                      <label className="block text-slate-400 text-xs mb-1">
                        Agente asignado
                      </label>
                      <select
                        value={eventForm.assignedAgentId}
                        onChange={(e) =>
                          setEventForm({
                            ...eventForm,
                            assignedAgentId: e.target.value
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:border-primary outline-none"
                      >
                        <option value="">Sin asignar</option>
                        {agents.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Cliente */}
                    <div className="md:col-span-2">
                      <label className="block text-slate-400 text-xs mb-1">
                        Cliente
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={eventForm.clientId}
                          onChange={(e) => handleClientChange(e.target.value)}
                          className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:border-primary outline-none"
                        >
                          <option value="">Seleccionar cliente...</option>
                          {clients.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nombre} {c.telefono && `- ${c.telefono}`}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setShowClientModal(true)}
                          className="px-4 py-2.5 bg-primary hover:bg-primary/80 text-slate-900 rounded-lg text-xs md:text-sm font-semibold flex items-center gap-2"
                        >
                          <FaUserPlus />
                          Nuevo
                        </button>
                      </div>
                    </div>

                    {/* Propiedad: solo si aplica */}
                    {['visita', 'seguimiento'].includes(eventForm.type) && (
                      <div className="md:col-span-2">
                        <label className="block text-slate-400 text-xs mb-1">
                          Propiedad
                        </label>
                        <select
                          value={eventForm.propertyId}
                          onChange={(e) =>
                            setEventForm({
                              ...eventForm,
                              propertyId: e.target.value
                            })
                          }
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:border-primary outline-none"
                        >
                          <option value="">Seleccionar propiedad...</option>
                          {properties.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.title} {p.city && `- ${p.city}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Ubicación */}
                    <div className="md:col-span-2">
                      <label className="block text-slate-400 text-xs mb-1">
                        Ubicación / dirección
                      </label>
                      <input
                        type="text"
                        value={eventForm.location}
                        onChange={(e) =>
                          setEventForm({
                            ...eventForm,
                            location: e.target.value
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:border-primary outline-none"
                        placeholder="Dirección o lugar de encuentro"
                      />
                    </div>

                    {/* Notas */}
                    <div className="md:col-span-2">
                      <label className="block text-slate-400 text-xs mb-1">
                        Notas
                      </label>
                      <textarea
                        rows={3}
                        value={eventForm.notes}
                        onChange={(e) =>
                          setEventForm({
                            ...eventForm,
                            notes: e.target.value
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:border-primary outline-none resize-none"
                        placeholder="Detalles importantes de la visita, reunión o llamada..."
                      />
                    </div>
                  </div>

                  {/* Botones principales */}
                  <div className="space-y-3 mt-4">
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={handleCloseModals}
                        disabled={submitting}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 button-gold inline-flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                      >
                        {submitting ? (
                          <>
                            <FaSpinner className="animate-spin" /> Guardando...
                          </>
                        ) : (
                          <>
                            <FaSave /> {selectedEvent ? 'Actualizar' : 'Crear'} evento
                          </>
                        )}
                      </button>
                    </div>

                    {/* Acciones rápidas si es evento existente */}
                    {selectedEvent && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                        {eventForm.clientPhone && (
                          <a
                            href={`https://wa.me/57${eventForm.clientPhone.replace(
                              /\D/g,
                              ''
                            )}?text=Hola, te contacto sobre la cita: ${eventForm.title}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2"
                          >
                            <FaWhatsapp />
                            WhatsApp cliente
                          </a>
                        )}
                        {selectedEvent.resource.status === 'pendiente' && (
                          <button
                            type="button"
                            onClick={handleMarkComplete}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2"
                          >
                            <FaCheckCircle />
                            Marcar completado
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleDeleteEvent}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2"
                        >
                          <FaTrash />
                          Eliminar evento
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Info rápida */}
                  {(eventForm.clientId ||
                    eventForm.propertyId ||
                    eventForm.assignedAgentId) && (
                    <div className="mt-4 border-t border-slate-800 pt-3 text-xs text-slate-400 space-y-1">
                      {eventForm.clientId && (
                        <div>
                          Cliente:{' '}
                          <span className="text-slate-100">
                            {getClientName(eventForm.clientId)}
                          </span>
                        </div>
                      )}
                      {eventForm.propertyId && (
                        <div>
                          Propiedad:{' '}
                          <span className="text-slate-100">
                            {getPropertyTitle(eventForm.propertyId)}
                          </span>
                        </div>
                      )}
                      {eventForm.assignedAgentId && (
                        <div className="flex items-center gap-2">
                          Agente:{' '}
                          <span
                            className="w-2 h-2 rounded-full inline-block"
                            style={{
                              backgroundColor: getAgentColor(eventForm.assignedAgentId)
                            }}
                          />
                          <span className="text-slate-100">
                            {getAgentName(eventForm.assignedAgentId)}
                          </span>
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            onClick={() => setShowClientModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 rounded-2xl border border-slate-800 max-w-md w-full"
            >
              <div className="p-6 md:p-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-primary">
                    Nuevo cliente rápido
                  </h2>
                  <button
                    onClick={() => setShowClientModal(false)}
                    className="w-8 h-8 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center"
                  >
                    <FaTimes className="text-slate-200" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-slate-400 text-xs mb-1">
                      Nombre completo *
                    </label>
                    <input
                      type="text"
                      value={clientForm.nombre}
                      onChange={(e) =>
                        setClientForm({ ...clientForm, nombre: e.target.value })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:border-primary outline-none"
                      placeholder="Nombre del cliente"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-xs mb-1">
                      Teléfono *
                    </label>
                    <input
                      type="tel"
                      value={clientForm.telefono}
                      onChange={(e) =>
                        setClientForm({
                          ...clientForm,
                          telefono: e.target.value
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:border-primary outline-none"
                      placeholder="3001234567"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-xs mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={clientForm.email}
                      onChange={(e) =>
                        setClientForm({ ...clientForm, email: e.target.value })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:border-primary outline-none"
                      placeholder="correo@ejemplo.com"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowClientModal(false)}
                    disabled={submitting}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl px-4 py-2.5 text-sm font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateClient}
                    disabled={submitting}
                    className="flex-1 button-gold inline-flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <FaSpinner className="animate-spin" /> Creando...
                      </>
                    ) : (
                      <>
                        <FaUserPlus /> Crear y vincular
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Estilos oscuros para react-big-calendar */}
      <style>{`
        .rbc-calendar {
          color: #e2e8f0;
          font-family: inherit;
        }
        .rbc-toolbar-label {
          display: none;
        }
        .rbc-header {
          background: #020617;
          border-color: #1e293b !important;
          padding: 10px 4px;
          font-weight: 600;
          color: #cbd5e1;
          text-transform: capitalize;
        }
        .rbc-month-view,
        .rbc-agenda-view {
          background: #020617;
          border-color: #1e293b;
        }
        .rbc-day-bg {
          background: #020617;
          border-color: #1e293b !important;
        }
        .rbc-off-range-bg {
          background: #020617;
          opacity: 0.4;
        }
        .rbc-today {
          background-color: rgba(212, 175, 55, 0.12) !important;
        }
        .rbc-date-cell {
          padding: 6px;
          color: #e2e8f0;
        }
        .rbc-button-link {
          color: #cbd5e1;
        }
        .rbc-toolbar {
          margin-bottom: 12px;
        }
        .rbc-toolbar button {
          background: #0f172a;
          border: 1px solid #1e293b;
          color: #e2e8f0;
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
          text-transform: none;
          box-shadow: none;
        }
        .rbc-toolbar button:hover {
          background: #1e293b;
        }
        .rbc-toolbar button.rbc-active {
          background: #d4af37;
          color: #020617;
          border-color: #d4af37;
        }
        .rbc-event {
          transition: all 0.2s ease;
        }
        .rbc-event:hover {
          transform: scale(1.02);
          box-shadow: 0 10px 25px rgba(0,0,0,0.4);
        }
        .rbc-agenda-table {
          border-color: #1e293b;
        }
        .rbc-agenda-date-cell,
        .rbc-agenda-time-cell,
        .rbc-agenda-event-cell {
          border-color: #1e293b;
          color: #e2e8f0;
        }
        .rbc-agenda-time-cell {
          text-transform: lowercase;
        }
      `}</style>
    </div>
  );
};

export default CalendarPage;