import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay, addHours, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  FaPlus, FaTimes, FaSpinner, FaWhatsapp,
  FaTrash, FaCheckCircle, FaSave, FaUserPlus,
  FaCalendarAlt, FaHome, FaPhone, FaUsers,
  FaFileContract, FaChevronLeft, FaChevronRight,
  FaEllipsisV, FaCheck, FaClock, FaBan, FaRedo,
  FaMapMarkerAlt, FaStickyNote, FaUser, FaBuilding,
} from 'react-icons/fa';
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, orderBy, where,
} from 'firebase/firestore';
import { db } from '../../../core/config/firebase.config';
import { useAuth } from '../../../core/contexts/AuthContext';
import toast from 'react-hot-toast';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

// ─── Localizer español ────────────────────────────────────────────────────────
const locales = { es };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date) => startOfWeek(date, { locale: es }),
  getDay,
  locales,
});

const DnDCalendar = withDragAndDrop(Calendar);

// ─── Paleta de colores por agente ─────────────────────────────────────────────
const AGENT_COLORS = [
  '#3b82f6', '#a855f7', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#14b8a6', '#f97316',
  '#06b6d4', '#ec4899', '#84cc16', '#6366f1',
];

const TYPE_ICONS = {
  visita:          '🏠',
  reunion:         '🤝',
  llamada:         '📞',
  seguimiento:     '👥',
  otro:            '📌',
  web_visit:       '🌐',
  contract_sign:   '📋',
  contract_expiry: '⚠️',
};

const STATUS_META = {
  pending:     { label: 'Pendiente',   color: '#f59e0b', dot: '🟡' },
  pendiente:   { label: 'Pendiente',   color: '#f59e0b', dot: '🟡' },
  approved:    { label: 'Aprobada',    color: '#10b981', dot: '🟢' },
  confirmada:  { label: 'Confirmada',  color: '#10b981', dot: '🟢' },
  completada:  { label: 'Completada',  color: '#6b7280', dot: '⚫' },
  completed:   { label: 'Completada',  color: '#6b7280', dot: '⚫' },
  cancelada:   { label: 'Cancelada',   color: '#ef4444', dot: '🔴' },
  rejected:    { label: 'Rechazada',   color: '#ef4444', dot: '🔴' },
  rescheduled: { label: 'Reagendada',  color: '#d97706', dot: '🟠' },
  reagendada:  { label: 'Reagendada',  color: '#d97706', dot: '🟠' },
  active:      { label: 'Vigente',     color: '#10b981', dot: '🟢' },
  expired:     { label: 'Vencido',     color: '#ef4444', dot: '🔴' },
  draft:       { label: 'Borrador',    color: '#6b7280', dot: '⚫' },
  cancelled:   { label: 'Cancelado',   color: '#ef4444', dot: '🔴' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function buildDateFromFields(dateStr, timeStr) {
  if (!dateStr) return new Date();
  try {
    const t = (timeStr || '09:00').slice(0, 5);
    return new Date(`${dateStr}T${t}:00`);
  } catch { return new Date(); }
}

function normalizeDoc(raw, source) {
  return {
    ...raw,
    _source: source,
    _clientName:   raw.clientName   || raw.visitorName || raw.nombre || '',
    _propertyName: raw.propertyName || raw.propertyTitle || '',
    _date: raw.date || raw.requestedDate || '',
    _time: raw.time || raw.visitTime || raw.requestedTime || '09:00',
    _agentId:   raw.assignedAgentId || raw.agentId || '',
    _agentName: raw.agentName || '',
  };
}

// ─── Componente de evento personalizado ──────────────────────────────────────
const CustomEvent = ({ event, agents, getAgentColor, getAgentName, onContextMenu }) => {
  const r = event.resource || {};
  const status = r.status || 'pendiente';
  const meta = STATUS_META[status] || STATUS_META.pendiente;
  const agentName = r._agentId ? getAgentName(r._agentId) : null;
  const isCompleted = ['completada', 'completed'].includes(status);
  const isCancelled = ['cancelada', 'rejected', 'cancelled'].includes(status);

  return (
    <div
      className="cal-event-chip"
      onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, event); }}
      style={{ opacity: isCompleted ? 0.65 : 1 }}
    >
      <span className="cal-event-chip-icon">{TYPE_ICONS[r._type] || '📌'}</span>
      <span className="cal-event-chip-title" style={{ textDecoration: isCancelled ? 'line-through' : 'none' }}>
        {event.title.replace(/^[^\s]+\s/, '')}
      </span>
      <span className="cal-event-chip-dot" style={{ backgroundColor: meta.color }} />
    </div>
  );
};

// ─── Tooltip flotante ─────────────────────────────────────────────────────────
const EventTooltip = ({ event, position, agents, getAgentColor, getAgentName, getClientName, getPropertyTitle, onClose, onEdit, onComplete, onWhatsApp }) => {
  const r = event?.resource || {};
  if (!event || !position) return null;
  const status = r.status || 'pendiente';
  const meta = STATUS_META[status] || STATUS_META.pendiente;
  const agentName = r._agentId ? getAgentName(r._agentId) : 'Sin asignar';
  const clientName = r._clientName || (r.clientId ? getClientName(r.clientId) : '');
  const propName = r._propertyName || (r.propertyId ? getPropertyTitle(r.propertyId) : '');
  const timeStr = r._time || format(event.start, 'HH:mm');
  const dateStr = r._date || format(event.start, 'dd MMM yyyy');
  const isCompleted = ['completada', 'completed'].includes(status);
  const phone = r.clientPhone || '';

  // Posición: evitar que salga fuera de pantalla
  const left = Math.min(position.x + 12, window.innerWidth - 320);
  const top  = Math.min(position.y - 8,  window.innerHeight - 360);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 4 }}
      transition={{ duration: 0.12 }}
      className="cal-tooltip"
      style={{ left, top, position: 'fixed' }}
      onMouseLeave={onClose}
    >
      {/* Header */}
      <div className="cal-tooltip-header" style={{ borderLeft: `3px solid ${event.color || '#f59e0b'}` }}>
        <span className="cal-tooltip-icon">{TYPE_ICONS[r._type] || '📌'}</span>
        <div className="cal-tooltip-title-block">
          <p className="cal-tooltip-title">{event.title.replace(/^[^\s]+\s/, '')}</p>
          <span className="cal-tooltip-badge" style={{ background: meta.color + '22', color: meta.color }}>
            {meta.label}
          </span>
        </div>
      </div>

      {/* Info rows */}
      <div className="cal-tooltip-body">
        <div className="cal-tooltip-row">
          <FaClock className="cal-tooltip-row-icon" />
          <span>{dateStr} · {timeStr}</span>
        </div>
        {clientName && (
          <div className="cal-tooltip-row">
            <FaUser className="cal-tooltip-row-icon" />
            <span>{clientName}</span>
          </div>
        )}
        {propName && (
          <div className="cal-tooltip-row">
            <FaBuilding className="cal-tooltip-row-icon" />
            <span>{propName}</span>
          </div>
        )}
        {r.location && (
          <div className="cal-tooltip-row">
            <FaMapMarkerAlt className="cal-tooltip-row-icon" />
            <span>{r.location}</span>
          </div>
        )}
        <div className="cal-tooltip-row">
          <FaUser className="cal-tooltip-row-icon" style={{ color: event.color }} />
          <span style={{ color: event.color, fontWeight: 600 }}>{agentName}</span>
        </div>
        {r.notes && (
          <div className="cal-tooltip-row cal-tooltip-notes">
            <FaStickyNote className="cal-tooltip-row-icon" />
            <span>{r.notes}</span>
          </div>
        )}
      </div>

      {/* Acciones rápidas */}
      <div className="cal-tooltip-actions">
        <button className="cal-tip-btn cal-tip-btn--primary" onClick={onEdit}>
          ✏️ Editar
        </button>
        {!isCompleted && (
          <button className="cal-tip-btn cal-tip-btn--success" onClick={onComplete}>
            <FaCheck size={10} /> Completar
          </button>
        )}
        {phone && (
          <a
            href={`https://wa.me/57${phone.replace(/\D/g, '')}?text=Hola, te contacto sobre tu visita del ${dateStr}`}
            target="_blank" rel="noopener noreferrer"
            className="cal-tip-btn cal-tip-btn--wa"
          >
            <FaWhatsapp size={10} /> WhatsApp
          </a>
        )}
      </div>
    </motion.div>
  );
};

// ─── Menú contextual (click derecho) ─────────────────────────────────────────
const ContextMenu = ({ position, event, onClose, onEdit, onComplete, onDelete, onWhatsApp }) => {
  if (!position || !event) return null;
  const r = event.resource || {};
  const isCompleted = ['completada', 'completed'].includes(r.status);
  const phone = r.clientPhone || '';
  const left = Math.min(position.x, window.innerWidth - 200);
  const top  = Math.min(position.y, window.innerHeight - 220);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.1 }}
      className="cal-context-menu"
      style={{ left, top, position: 'fixed' }}
    >
      <button className="cal-ctx-item" onClick={onEdit}>✏️ Editar evento</button>
      {!isCompleted && (
        <button className="cal-ctx-item cal-ctx-item--success" onClick={onComplete}>
          <FaCheck size={10} /> Marcar completado
        </button>
      )}
      {phone && (
        <a
          href={`https://wa.me/57${phone.replace(/\D/g, '')}?text=Hola, te contacto sobre: ${event.title}`}
          target="_blank" rel="noopener noreferrer"
          className="cal-ctx-item cal-ctx-item--wa"
          onClick={onClose}
        >
          <FaWhatsapp size={10} /> Abrir WhatsApp
        </a>
      )}
      <div className="cal-ctx-divider" />
      <button className="cal-ctx-item cal-ctx-item--danger" onClick={onDelete}>
        <FaTrash size={10} /> Eliminar evento
      </button>
    </motion.div>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────
const CalendarPage = () => {
  const { currentUser } = useAuth();

  // ── State de datos ──────────────────────────────────────────────────────────
  const [appointments,  setAppointments]  = useState([]);
  const [orphanVisits,  setOrphanVisits]  = useState([]);
  const [contracts,     setContracts]     = useState([]);
  const [clients,       setClients]       = useState([]);
  const [properties,    setProperties]    = useState([]);
  const [agents,        setAgents]        = useState([]);
  const [loading,       setLoading]       = useState(true);

  // ── State de UI ─────────────────────────────────────────────────────────────
  const [view,          setView]          = useState('month');
  const [currentDate,   setCurrentDate]   = useState(new Date());
  const [filterAgentId, setFilterAgentId] = useState('');
  const [filterType,    setFilterType]    = useState('');
  const [filterStatus,  setFilterStatus]  = useState('');

  // ── Tooltip ──────────────────────────────────────────────────────────────────
  const [tooltip,        setTooltip]       = useState({ event: null, position: null });
  const tooltipTimer                       = useRef(null);

  // ── Menú contextual ──────────────────────────────────────────────────────────
  const [ctxMenu, setCtxMenu] = useState({ event: null, position: null });

  // ── Modal evento ─────────────────────────────────────────────────────────────
  const [showEventModal,  setShowEventModal]  = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [selectedEvent,   setSelectedEvent]   = useState(null);
  const [submitting,      setSubmitting]      = useState(false);
  const [eventForm,       setEventForm]       = useState({
    title: '', clientId: '', propertyId: '',
    start: new Date(), location: '', notes: '',
    status: 'pendiente', type: 'visita',
    clientPhone: '', assignedAgentId: '',
  });
  const [clientForm, setClientForm] = useState({ nombre: '', telefono: '', email: '' });

  // ─── Firestore listeners ────────────────────────────────────────────────────
  useEffect(() => {
    let loaded = 0;
    const checkLoaded = () => { loaded++; if (loaded >= 3) setLoading(false); };

    const unsubAppts = onSnapshot(
      query(collection(db, 'appointments'), orderBy('date', 'asc')),
      (s) => { setAppointments(s.docs.map((d) => ({ id: d.id, ...d.data() }))); checkLoaded(); },
      () => checkLoaded(),
    );

    const unsubVisits = onSnapshot(
      query(collection(db, 'visits'), where('status', '==', 'pending'), orderBy('createdAt', 'desc')),
      (s) => setOrphanVisits(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => {},
    );

    const unsubContracts = onSnapshot(
      query(collection(db, 'contracts')),
      (s) => { setContracts(s.docs.map((d) => ({ id: d.id, ...d.data() }))); checkLoaded(); },
      () => checkLoaded(),
    );

    const unsubClients = onSnapshot(query(collection(db, 'clients')), (s) => {
      setClients(s.docs.map((d) => ({
        id: d.id,
        nombre:   d.data().nombre   || d.data().name     || '',
        telefono: d.data().telefono || d.data().phone    || '',
        email:    d.data().email    || '',
      })));
    });

    const unsubProps = onSnapshot(query(collection(db, 'properties')), (s) => {
      setProperties(s.docs.map((d) => ({
        id: d.id, title: d.data().title || '', city: d.data().city || '',
      })));
    });

    const unsubMembers = onSnapshot(
      query(collection(db, 'users'), where('role', 'in', ['member', 'admin'])),
      (s) => {
        setAgents(s.docs.map((d) => ({
          id: d.id,
          name:  d.data().name || d.data().displayName || d.data().email || '',
          email: d.data().email || '',
          role:  d.data().role,
        })));
        checkLoaded();
      },
    );

    return () => { unsubAppts(); unsubVisits(); unsubContracts(); unsubClients(); unsubProps(); unsubMembers(); };
  }, []);

  // ─── Cerrar tooltip/ctx al hacer click fuera ────────────────────────────────
  useEffect(() => {
    const close = () => { setCtxMenu({ event: null, position: null }); };
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  // ─── Helpers de lookup ──────────────────────────────────────────────────────
  const getAgentColor = useCallback((agentId) => {
    if (!agentId) return '#6b7280';
    const idx = agents.findIndex((a) => a.id === agentId);
    return idx === -1 ? '#6b7280' : AGENT_COLORS[idx % AGENT_COLORS.length];
  }, [agents]);

  const getClientName    = useCallback((id) => clients.find((c) => c.id === id)?.nombre || '', [clients]);
  const getPropertyTitle = useCallback((id) => properties.find((p) => p.id === id)?.title || '', [properties]);
  const getAgentName     = useCallback((id) => agents.find((a) => a.id === id)?.name || 'Sin asignar', [agents]);

  const buildTitle = useCallback((norm) => {
    if (norm.title?.trim() && norm.title.trim() !== 'undefined') return norm.title.trim();
    const client = norm._clientName || getClientName(norm.clientId);
    const prop   = norm._propertyName || getPropertyTitle(norm.propertyId);
    if (norm._source === 'web' || norm.sourceCollection === 'visits') {
      if (client && prop) return `${client} → ${prop}`;
      return client || prop || 'Solicitud de visita';
    }
    if (client && prop) return `${client} → ${prop}`;
    return client || prop || 'Evento sin título';
  }, [clients, properties]);

  // ─── Eventos unificados ──────────────────────────────────────────────────────
  const allEvents = useMemo(() => {
    const events = [];

    appointments.forEach((raw) => {
      const norm = normalizeDoc(raw, 'crm');
      const start = buildDateFromFields(norm._date, norm._time);
      const end   = addHours(start, 1);
      const agentId = norm._agentId;
      const isWeb = norm.sourceCollection === 'visits';

      let color = getAgentColor(agentId);
      if (['cancelada', 'rejected'].includes(norm.status))     color = '#6b7280';
      if (['rescheduled', 'reagendada'].includes(norm.status)) color = '#d97706';
      if (isWeb && !agentId) color = '#1d4ed8';

      const icon = isWeb ? (agentId ? '🏠' : '🌐') : (TYPE_ICONS[norm.type] || '📌');

      events.push({
        id:       `crm_${raw.id}`,
        title:    `${icon} ${buildTitle(norm)}`,
        start, end, color,
        resource: { ...norm, _type: norm.type || (isWeb ? 'visita' : 'otro'), _collection: 'appointments' },
      });
    });

    orphanVisits.forEach((raw) => {
      const norm = normalizeDoc(raw, 'web');
      const start = buildDateFromFields(norm._date, norm._time);
      const end   = addHours(start, 1);
      events.push({
        id:       `web_${raw.id}`,
        title:    `🌐 ${buildTitle(norm)}`,
        start, end, color: '#1d4ed8',
        resource: { ...norm, _type: 'visita', _collection: 'visits' },
      });
    });

    contracts.forEach((c) => {
      if (c.startDate) {
        const start = buildDateFromFields(c.startDate, '10:00');
        events.push({
          id: `cs_${c.id}`,
          title: `📋 Firma: ${c.propertyName || c.clientName || 'Contrato'}`,
          start, end: addHours(start, 1), color: '#059669',
          resource: { ...c, _type: 'contract_sign', _collection: 'contracts' },
        });
      }
      if (c.endDate) {
        const now  = new Date();
        const end  = buildDateFromFields(c.endDate, '10:00');
        const diff = (end - now) / (1000 * 60 * 60 * 24);
        const color = diff < 0 ? '#dc2626' : diff < 30 ? '#d97706' : '#0ea5e9';
        events.push({
          id: `ce_${c.id}`,
          title: `⚠️ Vence: ${c.propertyName || c.clientName || 'Contrato'}`,
          start: end, end: addHours(end, 1), color,
          resource: { ...c, _type: 'contract_expiry', _collection: 'contracts' },
        });
      }
    });

    return events;
  }, [appointments, orphanVisits, contracts, agents, buildTitle, getAgentColor]);

  // ─── Filtrado ────────────────────────────────────────────────────────────────
  const filteredEvents = useMemo(() => allEvents.filter((ev) => {
    const r = ev.resource;
    if (filterAgentId) {
      const aid = r._agentId || r.assignedAgentId || r.agentId || '';
      if (aid !== filterAgentId) return false;
    }
    if (filterType   && r._type   !== filterType)   return false;
    if (filterStatus && r.status  !== filterStatus) return false;
    return true;
  }), [allEvents, filterAgentId, filterType, filterStatus]);

  // ─── Stats ───────────────────────────────────────────────────────────────────
  const totalEvents  = allEvents.length;
  const pendingCount = allEvents.filter((e) => ['pendiente','pending','approved'].includes(e.resource?.status)).length;
  const webCount     = allEvents.filter((e) => e.resource?.sourceCollection === 'visits' || e.resource?._source === 'web').length;

  // ─── Drilldown: click en número de día → vista día ───────────────────────────
  const handleDrillDown = useCallback((date) => {
    setCurrentDate(date);
    setView('day');
  }, []);

  // ─── Handlers tooltip ────────────────────────────────────────────────────────
  const handleMouseEnterEvent = useCallback((event, e) => {
    clearTimeout(tooltipTimer.current);
    tooltipTimer.current = setTimeout(() => {
      setTooltip({ event, position: { x: e.clientX, y: e.clientY } });
    }, 350);
  }, []);

  const handleMouseLeaveEvent = useCallback(() => {
    clearTimeout(tooltipTimer.current);
    tooltipTimer.current = setTimeout(() => setTooltip({ event: null, position: null }), 200);
  }, []);

  const handleTooltipClose = useCallback(() => {
    clearTimeout(tooltipTimer.current);
    setTooltip({ event: null, position: null });
  }, []);

  // ─── Handlers menú contextual ─────────────────────────────────────────────
  const handleContextMenu = useCallback((e, event) => {
    e.preventDefault();
    setCtxMenu({ event, position: { x: e.clientX, y: e.clientY } });
    setTooltip({ event: null, position: null });
  }, []);

  // ─── Handlers principales ────────────────────────────────────────────────────
  const openNewEvent = useCallback((slotInfo) => {
    setSelectedEvent(null);
    setEventForm({
      title: '', clientId: '', propertyId: '',
      start: slotInfo?.start || new Date(),
      location: '', notes: '', status: 'pendiente',
      type: 'visita', clientPhone: '', assignedAgentId: '',
    });
    setShowEventModal(true);
    setTooltip({ event: null, position: null });
    setCtxMenu({ event: null, position: null });
  }, []);

  const openEditEvent = useCallback((ev) => {
    const r = ev.resource;
    const dateStr = r._date || format(ev.start, 'yyyy-MM-dd');
    const timeStr = (r._time || format(ev.start, 'HH:mm')).slice(0, 5);
    setSelectedEvent({ id: r.id, source: r._source, collection: r._collection, resource: r });
    setEventForm({
      title:           r.title?.trim() || ev.title || '',
      clientId:        r.clientId        || '',
      propertyId:      r.propertyId      || '',
      start:           new Date(`${dateStr}T${timeStr}`),
      location:        r.location        || r.propertyAddress || '',
      notes:           r.notes           || r.adminNotes      || '',
      status:          r.status          || 'pendiente',
      type:            r._type           || 'visita',
      clientPhone:     r.clientPhone     || '',
      assignedAgentId: r._agentId        || '',
    });
    setShowEventModal(true);
    setTooltip({ event: null, position: null });
    setCtxMenu({ event: null, position: null });
  }, []);

  const handleSelectEvent = useCallback((ev) => {
    setTooltip({ event: null, position: null });
    openEditEvent(ev);
  }, [openEditEvent]);

  const handleEventDrop = useCallback(async ({ event, start }) => {
    const r = event.resource;
    const colName = r._collection || 'appointments';
    if (colName === 'contracts') return;
    const date = format(start, 'yyyy-MM-dd');
    const time = format(start, 'HH:mm');
    try {
      await updateDoc(doc(db, colName, r.id), {
        date, time,
        ...(colName === 'visits' ? { requestedDate: date, requestedTime: time } : {}),
        updatedAt: new Date().toISOString(),
      });
      toast.success('Evento reagendado');
    } catch { toast.error('Error al reagendar'); }
  }, []);

  const handleMarkComplete = useCallback(async (ev) => {
    const target = ev || ctxMenu.event || tooltip.event;
    if (!target) return;
    const r = target.resource;
    try {
      await updateDoc(doc(db, r._collection || 'appointments', r.id), {
        status: 'completada', updatedAt: new Date().toISOString(),
      });
      toast.success('Marcado como completado');
      setTooltip({ event: null, position: null });
      setCtxMenu({ event: null, position: null });
    } catch { toast.error('Error al actualizar'); }
  }, [ctxMenu.event, tooltip.event]);

  const handleDeleteEvent = useCallback(async (ev) => {
    const target = ev || ctxMenu.event;
    if (!target) return;
    const r = target.resource;
    if (!confirm('¿Eliminar este evento?')) return;
    try {
      await deleteDoc(doc(db, r._collection || 'appointments', r.id));
      toast.success('Evento eliminado');
      setCtxMenu({ event: null, position: null });
      handleCloseModals();
    } catch { toast.error('Error al eliminar'); }
  }, [ctxMenu.event]);

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    if (!eventForm.title.trim()) { toast.error('El título es obligatorio'); return; }
    setSubmitting(true);
    try {
      const dt   = new Date(eventForm.start);
      const date = format(dt, 'yyyy-MM-dd');
      const time = format(dt, 'HH:mm');
      const payload = {
        title:           eventForm.title,
        clientId:        eventForm.clientId        || '',
        propertyId:      eventForm.propertyId      || '',
        date, time, duration: 60,
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
        const colName = selectedEvent.collection || 'appointments';
        await updateDoc(doc(db, colName, selectedEvent.id), payload);
        toast.success('Evento actualizado');
      } else {
        await addDoc(collection(db, 'appointments'), { ...payload, createdAt: new Date().toISOString() });
        toast.success('Evento creado');
      }
      handleCloseModals();
    } catch (err) { console.error(err); toast.error('Error al guardar'); }
    finally { setSubmitting(false); }
  };

  const handleClientChange = (clientId) => {
    const client = clients.find((c) => c.id === clientId);
    setEventForm((p) => ({ ...p, clientId, clientPhone: client?.telefono || '' }));
  };

  const handleCreateClient = async () => {
    if (!clientForm.nombre.trim() || !clientForm.telefono.trim()) {
      toast.error('Nombre y teléfono son obligatorios'); return;
    }
    setSubmitting(true);
    try {
      const data = {
        nombre: clientForm.nombre, telefono: clientForm.telefono,
        email: clientForm.email || '', tipoCliente: 'Lead',
        estado: 'Activo', createdAt: new Date().toISOString(),
      };
      const r = await addDoc(collection(db, 'clients'), data);
      setClients((p) => [...p, { id: r.id, ...data }]);
      setEventForm((p) => ({ ...p, clientId: r.id, clientPhone: data.telefono }));
      setClientForm({ nombre: '', telefono: '', email: '' });
      setShowClientModal(false);
      toast.success('Cliente creado y vinculado');
    } catch { toast.error('Error al crear cliente'); }
    finally { setSubmitting(false); }
  };

  const handleCloseModals = () => {
    setShowEventModal(false); setShowClientModal(false); setSelectedEvent(null);
  };

  // ─── Estilo de eventos ───────────────────────────────────────────────────────
  const eventStyleGetter = useCallback((event) => ({
    style: {
      backgroundColor: event.color || '#6b7280',
      borderColor:     event.color || '#6b7280',
      color:           '#ffffff',
      border:          'none',
      borderRadius:    '6px',
      padding:         '0',
      cursor:          'pointer',
      boxShadow:       `0 1px 4px ${(event.color || '#6b7280')}55`,
    },
  }), []);

  // ─── Componente de evento custom ─────────────────────────────────────────────
  const components = useMemo(() => ({
    toolbar: ({ label, onNavigate, onView, view: currentView }) => (
      <div className="rbc-custom-toolbar">
        <div className="rbc-toolbar-left">
          <button className="rbc-nav-btn" onClick={() => onNavigate('PREV')} aria-label="Anterior">
            <FaChevronLeft size={12} />
          </button>
          <button className="rbc-nav-today" onClick={() => onNavigate('TODAY')}>Hoy</button>
          <button className="rbc-nav-btn" onClick={() => onNavigate('NEXT')} aria-label="Siguiente">
            <FaChevronRight size={12} />
          </button>
          <span className="rbc-current-label">{label}</span>
        </div>
        <div className="rbc-toolbar-views">
          {[['month','Mes'],['week','Semana'],['day','Día'],['agenda','Agenda']].map(([v, lbl]) => (
            <button key={v}
              className={`rbc-view-btn ${currentView === v ? 'active' : ''}`}
              onClick={() => { onView(v); setView(v); }}
            >{lbl}</button>
          ))}
        </div>
      </div>
    ),
    event: (props) => (
      <CustomEvent
        {...props}
        agents={agents}
        getAgentColor={getAgentColor}
        getAgentName={getAgentName}
        onContextMenu={handleContextMenu}
      />
    ),
  }), [agents, getAgentColor, getAgentName, handleContextMenu]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <FaSpinner className="animate-spin text-5xl text-primary" />
    </div>
  );

  return (
    <div className="cal-page space-y-5" onClick={() => setCtxMenu({ event: null, position: null })}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="cal-title">
            <FaCalendarAlt className="cal-title-icon" /> Agenda inmobiliaria
          </h1>
          <p className="cal-subtitle">Visitas, reuniones, contratos y seguimientos</p>
        </div>
        <button onClick={() => openNewEvent(null)} className="button-gold inline-flex items-center gap-2 px-5 py-2.5 text-sm">
          <FaPlus /> Nuevo evento
        </button>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total eventos',   value: totalEvents,   icon: FaCalendarAlt, cls: 'cal-stat-icon--primary' },
          { label: 'Pendientes',      value: pendingCount,  icon: FaSpinner,     cls: 'cal-stat-icon--warn' },
          { label: 'Agentes activos', value: agents.length, icon: FaUsers,       cls: 'cal-stat-icon--blue' },
          { label: 'Visitas web',     value: webCount,      icon: FaHome,        cls: 'cal-stat-icon--green' },
        ].map(({ label, value, icon: Icon, cls }) => (
          <div key={label} className="cal-stat-card">
            <Icon className={`cal-stat-icon ${cls}`} />
            <div>
              <p className="cal-stat-label">{label}</p>
              <p className="cal-stat-value">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filtros ────────────────────────────────────────────────────────── */}
      <div className="cal-filters-card">
        <p className="cal-section-title">Filtros</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="cal-label">Agente</label>
            <select value={filterAgentId} onChange={(e) => setFilterAgentId(e.target.value)} className="cal-select">
              <option value="">Todos los agentes</option>
              {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="cal-label">Tipo</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="cal-select">
              <option value="">Todos los tipos</option>
              <option value="visita">🏠 Visitas (CRM)</option>
              <option value="reunion">🤝 Reuniones</option>
              <option value="llamada">📞 Llamadas</option>
              <option value="seguimiento">👥 Seguimientos</option>
              <option value="contract_sign">📋 Firmas de contrato</option>
              <option value="contract_expiry">⚠️ Vencimientos</option>
            </select>
          </div>
          <div>
            <label className="cal-label">Estado</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="cal-select">
              <option value="">Todos los estados</option>
              <option value="pending">⏳ Pendiente</option>
              <option value="pendiente">⏳ Pendiente (CRM)</option>
              <option value="approved">✅ Aprobada</option>
              <option value="completada">✔ Completada</option>
              <option value="cancelada">✗ Cancelada</option>
              <option value="rescheduled">🔄 Reagendada</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Leyenda de agentes ─────────────────────────────────────────────── */}
      {agents.length > 0 && (
        <div className="cal-filters-card">
          <p className="cal-section-title">Agentes por color</p>
          <div className="flex flex-wrap gap-4">
            {agents.map((agent) => (
              <div key={agent.id} className="cal-agent-legend">
                <span className="cal-agent-dot" style={{ backgroundColor: getAgentColor(agent.id) }} />
                <span className="cal-agent-name">{agent.name}</span>
                <span className="cal-agent-role">({agent.role === 'admin' ? 'admin' : 'member'})</span>
              </div>
            ))}
            <div className="cal-agent-legend">
              <span className="cal-agent-dot" style={{ backgroundColor: '#1d4ed8' }} />
              <span className="cal-agent-name">🌐 Visita web sin asignar</span>
            </div>
            <div className="cal-agent-legend">
              <span className="cal-agent-dot" style={{ backgroundColor: '#059669' }} />
              <span className="cal-agent-name">📋 Firma contrato</span>
            </div>
            <div className="cal-agent-legend">
              <span className="cal-agent-dot" style={{ backgroundColor: '#d97706' }} />
              <span className="cal-agent-name">⚠️ Vencimiento próximo</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Calendario ─────────────────────────────────────────────────────── */}
      <div
        className="cal-wrapper"
        onMouseOver={(e) => {
          const el = e.target.closest('.rbc-event');
          if (!el) return;
        }}
      >
        <DnDCalendar
          localizer={localizer}
          culture="es"
          events={filteredEvents}
          view={view}
          date={currentDate}
          onView={setView}
          onNavigate={setCurrentDate}
          onSelectSlot={openNewEvent}
          onSelectEvent={handleSelectEvent}
          onEventDrop={handleEventDrop}
          onEventResize={handleEventDrop}
          onDrillDown={handleDrillDown}
          selectable
          resizable
          popup
          components={components}
          eventPropGetter={eventStyleGetter}
          onMouseOver={(event, e) => handleMouseEnterEvent(event, e)}
          messages={{
            noEventsInRange: 'No hay eventos en este período',
            showMore: (n) => `+${n} más`,
            allDay: 'Todo el día',
            previous: 'Anterior',
            next: 'Siguiente',
            today: 'Hoy',
            month: 'Mes',
            week: 'Semana',
            day: 'Día',
            agenda: 'Agenda',
            date: 'Fecha',
            time: 'Hora',
            event: 'Evento',
          }}
          style={{ height: 680 }}
        />
      </div>

      {/* ── Tooltip flotante ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {tooltip.event && tooltip.position && (
          <EventTooltip
            event={tooltip.event}
            position={tooltip.position}
            agents={agents}
            getAgentColor={getAgentColor}
            getAgentName={getAgentName}
            getClientName={getClientName}
            getPropertyTitle={getPropertyTitle}
            onClose={handleTooltipClose}
            onEdit={() => openEditEvent(tooltip.event)}
            onComplete={() => handleMarkComplete(tooltip.event)}
          />
        )}
      </AnimatePresence>

      {/* ── Menú contextual ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {ctxMenu.event && ctxMenu.position && (
          <ContextMenu
            position={ctxMenu.position}
            event={ctxMenu.event}
            onClose={() => setCtxMenu({ event: null, position: null })}
            onEdit={() => openEditEvent(ctxMenu.event)}
            onComplete={() => handleMarkComplete(ctxMenu.event)}
            onDelete={() => handleDeleteEvent(ctxMenu.event)}
          />
        )}
      </AnimatePresence>

      {/* ── Modal evento ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showEventModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={handleCloseModals}
          >
            <motion.div
              initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.93, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="cal-modal"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="cal-modal-title">
                    {selectedEvent
                      ? (selectedEvent.collection === 'visits' ? '🌐 Visita web' : selectedEvent.collection === 'contracts' ? '📋 Contrato' : '✏️ Editar evento')
                      : '➕ Nuevo evento'}
                  </h2>
                  {selectedEvent?.collection === 'visits' && (
                    <span className="cal-badge-web">Formulario web</span>
                  )}
                  <button onClick={handleCloseModals} className="cal-close-btn">
                    <FaTimes size={13} />
                  </button>
                </div>

                <form onSubmit={handleSaveEvent} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    <div className="md:col-span-2">
                      <label className="cal-label">Título *</label>
                      <input type="text" required value={eventForm.title}
                        onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                        className="cal-input" placeholder="Ej: Visita Apto 302 con Juan García" />
                    </div>

                    <div>
                      <label className="cal-label">Tipo</label>
                      <select value={eventForm.type}
                        onChange={(e) => setEventForm({ ...eventForm, type: e.target.value })}
                        className="cal-select">
                        <option value="visita">🏠 Visita</option>
                        <option value="reunion">🤝 Reunión</option>
                        <option value="llamada">📞 Llamada</option>
                        <option value="seguimiento">👥 Seguimiento</option>
                        <option value="otro">📌 Otro</option>
                      </select>
                    </div>

                    <div>
                      <label className="cal-label">Estado</label>
                      <select value={eventForm.status}
                        onChange={(e) => setEventForm({ ...eventForm, status: e.target.value })}
                        className="cal-select">
                        <option value="pendiente">⏳ Pendiente</option>
                        <option value="approved">✅ Aprobada</option>
                        <option value="confirmada">✅ Confirmada</option>
                        <option value="completada">✔ Completada</option>
                        <option value="cancelada">✗ Cancelada</option>
                        <option value="rescheduled">🔄 Reagendada</option>
                      </select>
                    </div>

                    <div>
                      <label className="cal-label">Fecha y hora *</label>
                      <input type="datetime-local" required
                        value={format(new Date(eventForm.start), "yyyy-MM-dd'T'HH:mm")}
                        onChange={(e) => setEventForm({ ...eventForm, start: new Date(e.target.value) })}
                        className="cal-input" />
                    </div>

                    <div>
                      <label className="cal-label">Agente asignado</label>
                      <select value={eventForm.assignedAgentId}
                        onChange={(e) => setEventForm({ ...eventForm, assignedAgentId: e.target.value })}
                        className="cal-select">
                        <option value="">Sin asignar</option>
                        {agents.map((a) => (
                          <option key={a.id} value={a.id}>{a.name} ({a.role === 'admin' ? 'Admin' : 'Agente'})</option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="cal-label">Cliente</label>
                      <div className="flex gap-2">
                        <select value={eventForm.clientId} onChange={(e) => handleClientChange(e.target.value)} className="cal-select flex-1">
                          <option value="">Seleccionar cliente...</option>
                          {clients.map((c) => (
                            <option key={c.id} value={c.id}>{c.nombre}{c.telefono ? ` — ${c.telefono}` : ''}</option>
                          ))}
                        </select>
                        <button type="button" onClick={() => setShowClientModal(true)}
                          className="px-3 py-2 bg-primary hover:opacity-90 text-slate-900 rounded-lg text-xs font-semibold flex items-center gap-1">
                          <FaUserPlus /> Nuevo
                        </button>
                      </div>
                    </div>

                    {['visita','seguimiento'].includes(eventForm.type) && (
                      <div className="md:col-span-2">
                        <label className="cal-label">Propiedad</label>
                        <select value={eventForm.propertyId}
                          onChange={(e) => setEventForm({ ...eventForm, propertyId: e.target.value })}
                          className="cal-select">
                          <option value="">Seleccionar propiedad...</option>
                          {properties.map((p) => (
                            <option key={p.id} value={p.id}>{p.title}{p.city ? ` — ${p.city}` : ''}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="md:col-span-2">
                      <label className="cal-label">Dirección / lugar</label>
                      <input type="text" value={eventForm.location}
                        onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                        className="cal-input" placeholder="Dirección o lugar de encuentro" />
                    </div>

                    <div className="md:col-span-2">
                      <label className="cal-label">Notas</label>
                      <textarea rows={3} value={eventForm.notes}
                        onChange={(e) => setEventForm({ ...eventForm, notes: e.target.value })}
                        className="cal-input resize-none" placeholder="Detalles, instrucciones..." />
                    </div>
                  </div>

                  {(eventForm.clientId || eventForm.propertyId || eventForm.assignedAgentId) && (
                    <div className="cal-summary">
                      {eventForm.clientId && <p>👤 Cliente: <strong>{getClientName(eventForm.clientId)}</strong></p>}
                      {eventForm.propertyId && <p>🏠 Propiedad: <strong>{getPropertyTitle(eventForm.propertyId)}</strong></p>}
                      {eventForm.assignedAgentId && (
                        <p className="flex items-center gap-2">
                          🧑‍💼 Agente:
                          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: getAgentColor(eventForm.assignedAgentId) }} />
                          <strong>{getAgentName(eventForm.assignedAgentId)}</strong>
                        </p>
                      )}
                    </div>
                  )}

                  <div className="space-y-2 pt-2">
                    <div className="flex gap-2">
                      <button type="button" onClick={handleCloseModals} disabled={submitting} className="cal-btn-cancel">
                        Cancelar
                      </button>
                      <button type="submit" disabled={submitting} className="button-gold flex-1 inline-flex items-center justify-center gap-2 text-sm disabled:opacity-50">
                        {submitting ? <><FaSpinner className="animate-spin" /> Guardando...</> : <><FaSave /> {selectedEvent ? 'Guardar cambios' : 'Crear evento'}</>}
                      </button>
                    </div>
                    {selectedEvent && selectedEvent.collection !== 'contracts' && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {eventForm.clientPhone && (
                          <a href={`https://wa.me/57${eventForm.clientPhone.replace(/\D/g,'')}?text=Hola, te contacto sobre: ${eventForm.title}`}
                            target="_blank" rel="noopener noreferrer" className="cal-btn-wa">
                            <FaWhatsapp /> WhatsApp
                          </a>
                        )}
                        {!['completada','completed'].includes(selectedEvent.resource?.status) && (
                          <button type="button" onClick={() => handleMarkComplete()} className="cal-btn-complete">
                            <FaCheckCircle /> Completar
                          </button>
                        )}
                        <button type="button" onClick={() => handleDeleteEvent()} className="cal-btn-delete">
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

      {/* ── Modal cliente rápido ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showClientModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            onClick={() => setShowClientModal(false)}
          >
            <motion.div
              initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.93, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="cal-modal max-w-sm"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="cal-modal-title text-base">Nuevo cliente rápido</h2>
                  <button onClick={() => setShowClientModal(false)} className="cal-close-btn">
                    <FaTimes size={13} />
                  </button>
                </div>
                <div className="space-y-3">
                  {[['nombre','Nombre completo *','text','Nombre del cliente'],['telefono','Teléfono *','tel','3001234567'],['email','Email','email','correo@ejemplo.com']].map(([field, label, type, ph]) => (
                    <div key={field}>
                      <label className="cal-label">{label}</label>
                      <input type={type} value={clientForm[field]}
                        onChange={(e) => setClientForm({ ...clientForm, [field]: e.target.value })}
                        className="cal-input" placeholder={ph} />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-5">
                  <button type="button" onClick={() => setShowClientModal(false)} disabled={submitting} className="cal-btn-cancel">
                    Cancelar
                  </button>
                  <button type="button" onClick={handleCreateClient} disabled={submitting}
                    className="button-gold flex-1 inline-flex items-center justify-center gap-2 text-sm disabled:opacity-50">
                    {submitting ? <><FaSpinner className="animate-spin" /> Creando...</> : <><FaUserPlus /> Crear</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Estilos del calendario ─────────────────────────────────────────── */}
      <style>{`
        /* ── Wrapper ─────────────────────────────────────────────────── */
        .cal-wrapper {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 0.875rem;
          overflow: hidden;
          box-shadow: var(--shadow-card);
        }
        .cal-wrapper .rbc-calendar { background: var(--color-surface); color: var(--color-text); font-family: inherit; }

        /* ── Toolbar ─────────────────────────────────────────────────── */
        .rbc-custom-toolbar {
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: var(--color-surface-2);
          border-bottom: 1px solid var(--color-border);
        }
        .rbc-toolbar-left { display: flex; align-items: center; gap: 0.375rem; }
        .rbc-nav-btn {
          display: flex; align-items: center; justify-content: center;
          width: 2rem; height: 2rem;
          background: var(--color-surface-off);
          border: 1px solid var(--color-border);
          color: var(--color-text-muted);
          border-radius: 0.5rem; cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .rbc-nav-btn:hover { background: var(--color-row-hover); color: var(--color-text); }
        .rbc-nav-today {
          padding: 0.25rem 0.75rem; height: 2rem;
          background: rgba(245,158,11,0.12);
          border: 1px solid rgba(245,158,11,0.35);
          color: #f59e0b; border-radius: 0.5rem;
          font-size: 12px; font-weight: 600; cursor: pointer;
          transition: background 0.15s ease;
        }
        .rbc-nav-today:hover { background: rgba(245,158,11,0.22); }
        .rbc-current-label {
          font-weight: 700; font-size: 14px; color: var(--color-text);
          text-transform: capitalize; min-width: 160px; padding-left: 0.375rem;
        }
        .rbc-toolbar-views { display: flex; gap: 0.25rem; flex-wrap: wrap; }
        .rbc-view-btn {
          padding: 0.25rem 0.75rem; height: 2rem;
          background: var(--color-surface-off);
          border: 1px solid var(--color-border);
          color: var(--color-text-muted);
          border-radius: 9999px; font-size: 12px; font-weight: 600;
          cursor: pointer; transition: background 0.15s ease, color 0.15s ease;
        }
        .rbc-view-btn:hover { color: var(--color-text); background: var(--color-row-hover); }
        .rbc-view-btn.active { background: #f59e0b; color: #111827; border-color: #f59e0b; }

        /* ── Grid mensual ─────────────────────────────────────────────── */
        .cal-wrapper .rbc-month-view { border: none; background: var(--color-surface); }
        .cal-wrapper .rbc-header {
          background: var(--color-surface-2);
          color: var(--color-text-muted);
          font-size: 11px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.06em;
          padding: 0.5rem 0;
          border-bottom: 1px solid var(--color-border);
        }
        .cal-wrapper .rbc-header + .rbc-header { border-left: 1px solid var(--color-border); }
        .cal-wrapper .rbc-month-row { border-top: 1px solid var(--color-border); }
        .cal-wrapper .rbc-day-bg { background: var(--color-surface); }
        .cal-wrapper .rbc-day-bg + .rbc-day-bg { border-left: 1px solid var(--color-border); }
        .cal-wrapper .rbc-off-range-bg { background: var(--color-surface-2); opacity: 0.6; }
        .cal-wrapper .rbc-today { background: rgba(245,158,11,0.07) !important; }
        .cal-wrapper .rbc-date-cell { padding: 4px 8px; }
        .cal-wrapper .rbc-date-cell > a {
          color: var(--color-text-muted); font-size: 12px; font-weight: 500;
          text-decoration: none; border-radius: 50%;
          padding: 2px 5px;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .cal-wrapper .rbc-date-cell > a:hover {
          background: rgba(245,158,11,0.18);
          color: #f59e0b;
        }
        .cal-wrapper .rbc-date-cell.rbc-now > a { color: #f59e0b !important; font-weight: 700; }
        .cal-wrapper .rbc-date-cell.rbc-off-range > a { color: var(--color-text-faint) !important; }
        .cal-wrapper .rbc-show-more {
          color: #f59e0b !important; font-weight: 700; font-size: 11px;
          background: rgba(245,158,11,0.10); border-radius: 4px;
          padding: 1px 6px; margin: 1px 4px;
        }

        /* ── TimeGrid ─────────────────────────────────────────────────── */
        .cal-wrapper .rbc-time-view { border: none; }
        .cal-wrapper .rbc-time-header { border-bottom: 1px solid var(--color-border); }
        .cal-wrapper .rbc-time-header-content { border-left: 1px solid var(--color-border); }
        .cal-wrapper .rbc-timeslot-group { border-bottom: 1px solid var(--color-border); min-height: 44px; }
        .cal-wrapper .rbc-time-slot { color: var(--color-text-faint); font-size: 11px; }
        .cal-wrapper .rbc-current-time-indicator { background: #f59e0b; height: 2px; }
        .cal-wrapper .rbc-current-time-indicator::before { background: #f59e0b; }
        .cal-wrapper .rbc-time-content { border-top: 1px solid var(--color-border); }
        .cal-wrapper .rbc-time-content > * + * > * { border-left: 1px solid var(--color-border); }
        .cal-wrapper .rbc-time-gutter .rbc-timeslot-group {
          background: var(--color-surface-2);
          border-right: 1px solid var(--color-border);
        }

        /* ── Agenda ───────────────────────────────────────────────────── */
        .cal-wrapper .rbc-agenda-view table { border: none; color: var(--color-text); }
        .cal-wrapper .rbc-agenda-date-cell,
        .cal-wrapper .rbc-agenda-time-cell {
          background: var(--color-surface-2); color: var(--color-text-muted);
          font-size: 12px; padding: 8px 12px;
          border-bottom: 1px solid var(--color-border);
        }
        .cal-wrapper .rbc-agenda-event-cell {
          background: var(--color-surface);
          border-bottom: 1px solid var(--color-border);
          padding: 8px 12px; color: var(--color-text);
        }
        .cal-wrapper .rbc-agenda-empty {
          color: var(--color-text-faint); padding: 2rem; text-align: center; font-size: 13px;
        }

        /* ── Eventos ─────────────────────────────────────────────────── */
        .cal-wrapper .rbc-event { border: none !important; border-radius: 6px !important; padding: 0 !important; overflow: visible !important; }
        .cal-wrapper .rbc-event:focus { outline: 2px solid #f59e0b; outline-offset: 1px; }
        .cal-wrapper .rbc-selected { box-shadow: 0 0 0 2px #f59e0b !important; }

        /* ── Chip de evento custom ────────────────────────────────────── */
        .cal-event-chip {
          display: flex; align-items: center; gap: 4px;
          padding: 2px 6px; width: 100%; height: 100%;
          overflow: hidden; border-radius: 6px;
        }
        .cal-event-chip-icon { font-size: 10px; flex-shrink: 0; line-height: 1; }
        .cal-event-chip-title {
          font-size: 11px; font-weight: 600; color: #fff;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          flex: 1; line-height: 1.3;
        }
        .cal-event-chip-dot {
          width: 6px; height: 6px; border-radius: 50%;
          flex-shrink: 0; border: 1px solid rgba(255,255,255,0.5);
        }

        /* ── Popover RBC ──────────────────────────────────────────────── */
        .cal-wrapper .rbc-overlay {
          background: var(--color-modal-bg) !important;
          border: 1px solid var(--color-border) !important;
          border-radius: 0.75rem !important;
          box-shadow: var(--shadow-lg) !important;
          padding: 0.75rem !important;
        }
        .cal-wrapper .rbc-overlay-header {
          color: var(--color-text) !important; font-weight: 700;
          border-bottom: 1px solid var(--color-border);
          padding-bottom: 0.5rem; margin-bottom: 0.5rem;
        }

        /* ── Drag & drop ──────────────────────────────────────────────── */
        .rbc-addons-dnd .rbc-addons-dnd-drag-preview { opacity: 0.75; }
        .rbc-addons-dnd-resizable { cursor: ns-resize; }

        /* ── Scrollbar ─────────────────────────────────────────────────── */
        .cal-wrapper ::-webkit-scrollbar { width: 5px; height: 5px; }
        .cal-wrapper ::-webkit-scrollbar-track { background: var(--color-surface); }
        .cal-wrapper ::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 4px; }

        /* ── Tooltip flotante ─────────────────────────────────────────── */
        .cal-tooltip {
          z-index: 9999;
          width: 300px;
          background: var(--color-modal-bg);
          border: 1px solid var(--color-border);
          border-radius: 0.875rem;
          box-shadow: var(--shadow-lg);
          overflow: hidden;
          pointer-events: auto;
        }
        .cal-tooltip-header {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 12px 14px 10px;
          background: var(--color-surface-2);
          border-bottom: 1px solid var(--color-border);
          padding-left: 14px;
        }
        .cal-tooltip-icon { font-size: 18px; line-height: 1; flex-shrink: 0; margin-top: 2px; }
        .cal-tooltip-title-block { flex: 1; min-width: 0; }
        .cal-tooltip-title {
          font-size: 13px; font-weight: 700;
          color: var(--color-text);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          margin-bottom: 4px;
        }
        .cal-tooltip-badge {
          display: inline-block;
          font-size: 10px; font-weight: 600;
          padding: 2px 7px; border-radius: 9999px;
          letter-spacing: 0.03em;
        }
        .cal-tooltip-body { padding: 10px 14px; display: flex; flex-direction: column; gap: 6px; }
        .cal-tooltip-row {
          display: flex; align-items: flex-start; gap: 7px;
          font-size: 12px; color: var(--color-text-muted);
        }
        .cal-tooltip-row-icon { color: var(--color-text-faint); flex-shrink: 0; margin-top: 2px; font-size: 10px; }
        .cal-tooltip-notes { opacity: 0.75; font-style: italic; }
        .cal-tooltip-actions {
          display: flex; gap: 6px; flex-wrap: wrap;
          padding: 8px 14px 12px;
          border-top: 1px solid var(--color-border);
        }
        .cal-tip-btn {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 4px 10px; border-radius: 6px;
          font-size: 11px; font-weight: 600; cursor: pointer;
          transition: opacity 0.15s ease, transform 0.1s ease;
          text-decoration: none;
          border: none;
        }
        .cal-tip-btn:hover { opacity: 0.85; transform: translateY(-1px); }
        .cal-tip-btn--primary { background: rgba(245,158,11,0.15); color: #f59e0b; }
        .cal-tip-btn--success { background: rgba(16,185,129,0.15); color: #10b981; }
        .cal-tip-btn--wa      { background: rgba(37,211,102,0.15); color: #25d366; }

        /* ── Menú contextual ──────────────────────────────────────────── */
        .cal-context-menu {
          z-index: 9999; min-width: 190px;
          background: var(--color-modal-bg);
          border: 1px solid var(--color-border);
          border-radius: 0.75rem;
          box-shadow: var(--shadow-lg);
          overflow: hidden;
          padding: 4px;
        }
        .cal-ctx-item {
          display: flex; align-items: center; gap: 8px;
          width: 100%; padding: 8px 12px;
          font-size: 12px; font-weight: 500;
          color: var(--color-text-muted);
          background: none; border: none; cursor: pointer;
          border-radius: 0.5rem;
          text-decoration: none;
          transition: background 0.12s ease, color 0.12s ease;
          text-align: left;
        }
        .cal-ctx-item:hover { background: var(--color-row-hover); color: var(--color-text); }
        .cal-ctx-item--success { color: #10b981; }
        .cal-ctx-item--success:hover { background: rgba(16,185,129,0.10); }
        .cal-ctx-item--wa { color: #25d366; }
        .cal-ctx-item--wa:hover { background: rgba(37,211,102,0.10); }
        .cal-ctx-item--danger { color: #ef4444; }
        .cal-ctx-item--danger:hover { background: rgba(239,68,68,0.10); }
        .cal-ctx-divider { height: 1px; background: var(--color-border); margin: 3px 0; }

        /* ── Clases utilitarias del componente ─────────────────────────── */
        .cal-page .cal-title {
          font-size: 1.5rem; font-weight: 800; color: #f59e0b;
          display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;
        }
        .cal-title-icon { font-size: 1.25rem; }
        .cal-subtitle { color: var(--color-text-muted); font-size: 0.875rem; }

        .cal-stat-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          box-shadow: var(--shadow-sm);
          border-radius: 0.875rem; padding: 1rem;
          display: flex; align-items: center; gap: 0.75rem;
          transition: background 0.25s ease;
        }
        .cal-stat-icon { font-size: 1.5rem; flex-shrink: 0; }
        .cal-stat-icon--primary { color: #f59e0b; }
        .cal-stat-icon--warn    { color: #facc15; }
        .cal-stat-icon--blue    { color: #60a5fa; }
        .cal-stat-icon--green   { color: #4ade80; }
        .cal-stat-label { font-size: 11px; color: var(--color-text-muted); font-weight: 500; }
        .cal-stat-value { font-size: 1.5rem; font-weight: 800; color: var(--color-text); line-height: 1.1; }

        .cal-filters-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          box-shadow: var(--shadow-sm);
          border-radius: 0.875rem; padding: 1rem 1.25rem;
        }
        .cal-section-title { font-size: 11px; font-weight: 700; color: var(--color-text-faint); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.625rem; }
        .cal-label { display: block; font-size: 11px; font-weight: 600; color: var(--color-text-muted); margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.05em; }
        .cal-select {
          width: 100%; padding: 0.45rem 0.75rem;
          background: var(--color-input-bg);
          border: 1px solid var(--color-input-border);
          color: var(--color-input-text);
          border-radius: 0.5rem; font-size: 13px;
          cursor: pointer;
        }
        .cal-select:focus { outline: none; border-color: #f59e0b; box-shadow: 0 0 0 3px rgba(245,158,11,0.15); }

        .cal-agent-legend { display: flex; align-items: center; gap: 6px; }
        .cal-agent-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .cal-agent-name { font-size: 12px; color: var(--color-text-muted); font-weight: 500; }
        .cal-agent-role { font-size: 11px; color: var(--color-text-faint); }

        .cal-modal {
          background: var(--color-modal-bg);
          border: 1px solid var(--color-modal-border);
          border-radius: 1rem;
          width: 100%; max-width: 640px; max-height: 90vh;
          overflow-y: auto;
          box-shadow: var(--shadow-lg);
        }
        .cal-modal-title { font-size: 1rem; font-weight: 700; color: var(--color-text); }
        .cal-badge-web { font-size: 10px; font-weight: 600; padding: 2px 8px; background: rgba(29,78,216,0.15); color: #60a5fa; border-radius: 9999px; }
        .cal-close-btn {
          display: flex; align-items: center; justify-content: center;
          width: 1.75rem; height: 1.75rem;
          background: var(--color-surface-off); color: var(--color-text-muted);
          border: none; border-radius: 0.5rem; cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .cal-close-btn:hover { background: rgba(239,68,68,0.12); color: #ef4444; }
        .cal-input {
          width: 100%; padding: 0.5rem 0.75rem;
          background: var(--color-input-bg);
          border: 1px solid var(--color-input-border);
          color: var(--color-input-text);
          border-radius: 0.5rem; font-size: 13px;
        }
        .cal-input:focus { outline: none; border-color: #f59e0b; box-shadow: 0 0 0 3px rgba(245,158,11,0.15); }
        .cal-input::placeholder { color: var(--color-text-faint); }

        .cal-summary {
          background: var(--color-inner-card);
          border: 1px solid var(--color-inner-border);
          border-radius: 0.625rem; padding: 0.75rem 1rem;
          font-size: 12px; color: var(--color-text-muted);
          display: flex; flex-direction: column; gap: 4px;
        }
        .cal-summary strong { color: var(--color-text); }

        .cal-btn-cancel {
          flex: 1; padding: 0.5rem; border-radius: 0.5rem; font-size: 13px; font-weight: 600;
          background: var(--color-surface-off);
          border: 1px solid var(--color-border);
          color: var(--color-text-muted); cursor: pointer;
          transition: background 0.15s ease;
        }
        .cal-btn-cancel:hover { background: var(--color-row-hover); }

        .cal-btn-wa {
          display: flex; align-items: center; justify-content: center; gap: 6px;
          padding: 0.5rem; border-radius: 0.5rem; font-size: 12px; font-weight: 600;
          background: rgba(37,211,102,0.12); color: #25d366;
          text-decoration: none; transition: background 0.15s ease;
        }
        .cal-btn-wa:hover { background: rgba(37,211,102,0.22); }

        .cal-btn-complete {
          display: flex; align-items: center; justify-content: center; gap: 6px;
          padding: 0.5rem; border-radius: 0.5rem; font-size: 12px; font-weight: 600;
          background: rgba(16,185,129,0.12); color: #10b981;
          border: none; cursor: pointer; transition: background 0.15s ease;
        }
        .cal-btn-complete:hover { background: rgba(16,185,129,0.22); }

        .cal-btn-delete {
          display: flex; align-items: center; justify-content: center; gap: 6px;
          padding: 0.5rem; border-radius: 0.5rem; font-size: 12px; font-weight: 600;
          background: rgba(239,68,68,0.10); color: #ef4444;
          border: none; cursor: pointer; transition: background 0.15s ease;
        }
        .cal-btn-delete:hover { background: rgba(239,68,68,0.20); }

        /* ── Responsive ──────────────────────────────────────────────── */
        @media (max-width: 640px) {
          .cal-tooltip { width: calc(100vw - 32px); }
          .rbc-custom-toolbar { flex-direction: column; align-items: flex-start; }
          .rbc-toolbar-views { width: 100%; }
          .rbc-view-btn { flex: 1; text-align: center; }
        }
      `}</style>
    </div>
  );
};

export default CalendarPage;
