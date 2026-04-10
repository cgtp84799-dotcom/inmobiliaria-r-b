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

const STATUS_ALIASES = {
  pending: 'pending',
  pendiente: 'pending',
  approved: 'approved',
  confirmada: 'approved',
  completed: 'completed',
  completada: 'completed',
  rejected: 'rejected',
  cancelada: 'rejected',
  cancelled: 'rejected',
  rescheduled: 'rescheduled',
  reagendada: 'rescheduled',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function buildDateFromFields(dateStr, timeStr) {
  if (!dateStr) return new Date();
  try {
    const t = (timeStr || '09:00').slice(0, 5);
    return new Date(`${dateStr}T${t}:00`);
  } catch { return new Date(); }
}

function normalizeStatus(status) {
  const key = String(status || '').toLowerCase();
  return STATUS_ALIASES[key] || key || 'pending';
}

function toCollectionStatus(status, collectionName = 'appointments') {
  const normalized = normalizeStatus(status);
  if (collectionName === 'visits') return normalized || 'pending';
  return normalized === 'completed' ? 'completada' : normalized;
}

function normalizeDoc(raw, source) {
  return {
    ...raw,
    _source: source,
    _clientName:   raw.clientName   || raw.visitorName || raw.nombre || '',
    _propertyName: raw.propertyName || raw.propertyTitle || '',
    _date: raw.date || raw.requestedDate || '',
    _time: raw.time || raw.visitTime || raw.requestedTime || '09:00',
    _agentId:   raw.assignedAgentId || raw.agentId || raw.agentEmail || '',
    _agentName: raw.agentName || '',
  };
}

// ─── Helpers globales ────────────────────────────────────────────────────────
function cleanPhone(p = '') {
  const digits = String(p).replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('57') ? digits : `57${digits}`;
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
            href={`https://wa.me/${cleanPhone(phone)}?text=Hola, te contacto sobre tu visita del ${dateStr}`}
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
          href={`https://wa.me/${cleanPhone(phone)}?text=Hola, te contacto sobre: ${event.title}`}
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
      (err) => { console.error('[Calendar] Error cargando agentes:', err); checkLoaded(); },
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
  const findAgentByKey = useCallback((agentKey) => (
    agents.find((a) => a.id === agentKey || a.email === agentKey)
  ), [agents]);

  const getAgentColor = useCallback((agentId) => {
    if (!agentId) return '#6b7280';
    const agent = findAgentByKey(agentId);
    const idx = agent ? agents.findIndex((a) => a.id === agent.id) : -1;
    return idx === -1 ? '#6b7280' : AGENT_COLORS[idx % AGENT_COLORS.length];
  }, [agents, findAgentByKey]);

  const getClientName    = useCallback((id) => clients.find((c) => c.id === id)?.nombre || '', [clients]);
  const getPropertyTitle = useCallback((id) => properties.find((p) => p.id === id)?.title || '', [properties]);
  const getAgentName     = useCallback((id) => findAgentByKey(id)?.name || 'Sin asignar', [findAgentByKey]);

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
      const resolvedAgentId = findAgentByKey(aid)?.id || aid;
      if (resolvedAgentId !== filterAgentId) return false;
    }
    if (filterType   && r._type   !== filterType)   return false;
    if (filterStatus && normalizeStatus(r.status) !== normalizeStatus(filterStatus)) return false;
    return true;
  }), [allEvents, filterAgentId, filterType, filterStatus, findAgentByKey]);

  // ─── Stats ───────────────────────────────────────────────────────────────────
  const totalEvents  = allEvents.length;
  const pendingCount = allEvents.filter((e) => ['pending', 'approved'].includes(normalizeStatus(e.resource?.status))).length;
  const webCount     = allEvents.filter((e) => e.resource?.sourceCollection === 'visits' || e.resource?._source === 'web').length;

  // ─── Drilldown: click en número de día → vista día ───────────────────────────
  const handleDrillDown = useCallback((date) => {
    setCurrentDate(date);
    setView('day');
  }, []);

  // ─── Handlers tooltip ────────────────────────────────────────────────────────
  const handleMouseEnterEvent = useCallback((event, e) => {
    clearTimeout(tooltipTimer.current);
    const rect = e?.currentTarget?.getBoundingClientRect?.();
    const x = e?.clientX ?? (rect ? rect.left + rect.width / 2 : 0);
    const y = e?.clientY ?? (rect ? rect.top : 0);
    tooltipTimer.current = setTimeout(() => {
      setTooltip({ event, position: { x, y } });
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
        ...(colName === 'visits' ? { requestedDate: date, requestedTime: time, status: 'rescheduled' } : {}),
        updatedAt: new Date().toISOString(),
      });
      toast.success('Evento reagendado');
    } catch { toast.error('Error al reagendar'); }
  }, []);

  const handleMarkComplete = useCallback(async (ev) => {
    const target = ev || ctxMenu.event || tooltip.event || (selectedEvent ? { resource: selectedEvent.resource } : null);
    if (!target) return;
    const r = target.resource;
    if (r._collection === 'contracts') {
      toast.error('Los contratos se gestionan desde el módulo de contratos');
      return;
    }
    const status = toCollectionStatus('completed', r._collection);
    try {
      await updateDoc(doc(db, r._collection || 'appointments', r.id), {
        status, updatedAt: new Date().toISOString(),
      });
      toast.success('Marcado como completado');
      setTooltip({ event: null, position: null });
      setCtxMenu({ event: null, position: null });
    } catch { toast.error('Error al actualizar'); }
  }, [ctxMenu.event, selectedEvent, tooltip.event]);

  const handleDeleteEvent = useCallback(async (ev) => {
    const target = ev || ctxMenu.event || (selectedEvent ? { resource: selectedEvent.resource } : null);
    if (!target) return;
    const r = target.resource;
    if (r._collection === 'contracts') {
      toast.error('No puedes eliminar contratos desde el calendario');
      return;
    }
    if (!confirm('¿Eliminar este evento?')) return;
    try {
      await deleteDoc(doc(db, r._collection || 'appointments', r.id));
      toast.success('Evento eliminado');
      setCtxMenu({ event: null, position: null });
      handleCloseModals();
    } catch { toast.error('Error al eliminar'); }
  }, [ctxMenu.event, selectedEvent]);

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
        status:          toCollectionStatus(eventForm.status, selectedEvent?.collection || 'appointments'),
        type:            eventForm.type,
        clientPhone:     eventForm.clientPhone,
        assignedAgentId: eventForm.assignedAgentId || '',
        createdBy:       currentUser?.email || 'unknown',
        updatedAt:       new Date().toISOString(),
      };
      if (selectedEvent) {
        const colName = selectedEvent.collection || 'appointments';
        if (colName === 'contracts') {
          toast.error('Edita contratos desde el módulo de contratos');
          return;
        }
        const assignedAgent = findAgentByKey(eventForm.assignedAgentId);
        const specificPayload = colName === 'visits'
          ? {
              ...payload,
              requestedDate: date,
              requestedTime: time,
              agentId: assignedAgent?.id || eventForm.assignedAgentId || null,
              agentName: assignedAgent?.name || null,
              agentEmail: assignedAgent?.email || null,
            }
          : payload;
        await updateDoc(doc(db, colName, selectedEvent.id), specificPayload);
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
      backgroundColor: event.color || '#f59e0b',
      border: 'none',
      borderRadius: '6px',
      color: '#fff',
      fontSize: '12px',
      padding: '1px 4px',
    },
  }), []);

  // ─── Toolbar personalizada ───────────────────────────────────────────────────
  const CustomToolbar = useCallback(({ label, onNavigate, onView, view: currentView }) => (
    <div className="rbc-custom-toolbar">
      <div className="rbc-toolbar-left">
        <button className="rbc-nav-btn" onClick={() => onNavigate('PREV')}><FaChevronLeft size={10} /></button>
        <button className="rbc-nav-today" onClick={() => onNavigate('TODAY')}>Hoy</button>
        <button className="rbc-nav-btn" onClick={() => onNavigate('NEXT')}><FaChevronRight size={10} /></button>
        <span className="rbc-current-label">{label}</span>
      </div>
      <div className="rbc-toolbar-views">
        {['month', 'week', 'day', 'agenda'].map((v) => (
          <button key={v} className={`rbc-view-btn${currentView === v ? ' active' : ''}`} onClick={() => onView(v)}>
            {{ month: 'Mes', week: 'Semana', day: 'Día', agenda: 'Agenda' }[v]}
          </button>
        ))}
      </div>
    </div>
  ), []);

  // ─── Componentes del calendario ──────────────────────────────────────────────
  const components = useMemo(() => ({
    toolbar: CustomToolbar,
    event: (props) => (
      <CustomEvent
        {...props}
        agents={agents}
        getAgentColor={getAgentColor}
        getAgentName={getAgentName}
        onContextMenu={handleContextMenu}
      />
    ),
    eventWrapper: (props) => (
      <div
        onMouseEnter={(e) => handleMouseEnterEvent(props.event, e)}
        onMouseLeave={handleMouseLeaveEvent}
      >
        {props.children}
      </div>
    ),
  }), [CustomToolbar, agents, getAgentColor, getAgentName, handleContextMenu, handleMouseEnterEvent, handleMouseLeaveEvent]);

  // ─── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <FaSpinner className="animate-spin text-3xl text-amber-500" />
      </div>
    );
  }

  // ─── Render principal ────────────────────────────────────────────────────────
  return (
    <div className="cal-page">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="cal-header">
        <div>
          <h1 className="cal-title">
            <FaCalendarAlt className="cal-title-icon" />
            Calendario Operativo
          </h1>
          <p className="cal-subtitle">Centro de gestión de visitas, reuniones y contratos</p>
        </div>
        <button onClick={() => openNewEvent(null)} className="cal-btn-primary">
          <FaPlus size={12} /> Nuevo evento
        </button>
      </div>

      {/* ── KPIs ───────────────────────────────────────────────────────────── */}
      <div className="cal-kpi-row">
        <div className="cal-kpi">
          <span className="cal-kpi-icon">📅</span>
          <div><p className="cal-kpi-num">{totalEvents}</p><p className="cal-kpi-label">Total eventos</p></div>
        </div>
        <div className="cal-kpi">
          <span className="cal-kpi-icon">⏳</span>
          <div><p className="cal-kpi-num cal-kpi-num--amber">{pendingCount}</p><p className="cal-kpi-label">Pendientes</p></div>
        </div>
        <div className="cal-kpi">
          <span className="cal-kpi-icon">🌐</span>
          <div><p className="cal-kpi-num cal-kpi-num--blue">{webCount}</p><p className="cal-kpi-label">Solicitudes web</p></div>
        </div>
        <div className="cal-kpi">
          <span className="cal-kpi-icon">👥</span>
          <div><p className="cal-kpi-num">{agents.length}</p><p className="cal-kpi-label">Agentes activos</p></div>
        </div>
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
              <option value="approved">✅ Aprobada</option>
              <option value="completed">✔ Completada</option>
              <option value="rejected">✗ Cancelada</option>
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
      <div className="cal-wrapper">
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
                        {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="cal-label">
                        Cliente
                        <button type="button" onClick={() => setShowClientModal(true)}
                          className="cal-label-action">
                          <FaUserPlus size={10} /> Nuevo
                        </button>
                      </label>
                      <select value={eventForm.clientId}
                        onChange={(e) => handleClientChange(e.target.value)}
                        className="cal-select">
                        <option value="">Seleccionar cliente</option>
                        {clients.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="cal-label">Propiedad</label>
                      <select value={eventForm.propertyId}
                        onChange={(e) => setEventForm({ ...eventForm, propertyId: e.target.value })}
                        className="cal-select">
                        <option value="">Seleccionar propiedad</option>
                        {properties.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="cal-label">
                        <FaPhone size={10} className="inline mr-1" />
                        Teléfono cliente
                      </label>
                      <input type="tel" value={eventForm.clientPhone}
                        onChange={(e) => setEventForm({ ...eventForm, clientPhone: e.target.value })}
                        className="cal-input" placeholder="3001234567" />
                    </div>

                    <div>
                      <label className="cal-label">
                        <FaMapMarkerAlt size={10} className="inline mr-1" />
                        Ubicación
                      </label>
                      <input type="text" value={eventForm.location}
                        onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                        className="cal-input" placeholder="Dirección o lugar de reunión" />
                    </div>

                    <div className="md:col-span-2">
                      <label className="cal-label">
                        <FaStickyNote size={10} className="inline mr-1" />
                        Notas
                      </label>
                      <textarea value={eventForm.notes}
                        onChange={(e) => setEventForm({ ...eventForm, notes: e.target.value })}
                        className="cal-input cal-textarea" rows={3}
                        placeholder="Observaciones, instrucciones de acceso, etc." />
                    </div>

                  </div>

                  <div className="flex items-center justify-between gap-3 pt-2">
                    <button type="button" onClick={handleCloseModals} disabled={submitting} className="cal-btn-cancel">
                      Cancelar
                    </button>
                    <div className="flex gap-2 ml-auto">
                      {selectedEvent && selectedEvent.collection !== 'contracts' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          {eventForm.clientPhone && (
                            <a href={`https://wa.me/${cleanPhone(eventForm.clientPhone)}?text=Hola, te contacto sobre: ${eventForm.title}`}
                              target="_blank" rel="noopener noreferrer" className="cal-btn-wa">
                              <FaWhatsapp /> WhatsApp
                            </a>
                          )}
                          {!['completada','completed'].includes(selectedEvent.resource?.status) && (
                            <button type="button" onClick={() => handleMarkComplete({ resource: selectedEvent.resource })} className="cal-btn-complete">
                              <FaCheckCircle /> Completar
                            </button>
                          )}
                          <button type="button" onClick={() => handleDeleteEvent({ resource: selectedEvent.resource })} className="cal-btn-delete">
                            <FaTrash /> Eliminar
                          </button>
                        </div>
                      )}
                      <button type="submit" disabled={submitting}
                        className="button-gold inline-flex items-center gap-2 text-sm disabled:opacity-50">
                        {submitting ? <><FaSpinner className="animate-spin" /> Guardando...</> : <><FaSave /> Guardar</>}
                      </button>
                    </div>
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

        /* ── Event chip ───────────────────────────────────────────────── */
        .cal-event-chip {
          display: flex; align-items: center; gap: 3px;
          padding: 1px 5px; border-radius: 4px;
          font-size: 11px; font-weight: 600;
          overflow: hidden; white-space: nowrap;
          width: 100%; min-width: 0;
        }
        .cal-event-chip-icon { font-size: 10px; flex-shrink: 0; }
        .cal-event-chip-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
        .cal-event-chip-dot {
          width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
          box-shadow: 0 0 0 1px rgba(255,255,255,0.3);
        }

        /* ── Tooltip ──────────────────────────────────────────────────── */
        .cal-tooltip {
          z-index: 9999; width: 300px;
          background: var(--color-surface-2);
          border: 1px solid var(--color-border);
          border-radius: 0.75rem;
          box-shadow: var(--shadow-lg);
          overflow: hidden;
          pointer-events: auto;
        }
        .cal-tooltip-header {
          display: flex; align-items: flex-start; gap: 8px;
          padding: 10px 12px 8px;
          background: var(--color-surface);
          border-bottom: 1px solid var(--color-border);
        }
        .cal-tooltip-icon { font-size: 16px; line-height: 1; margin-top: 1px; }
        .cal-tooltip-title-block { flex: 1; min-width: 0; }
        .cal-tooltip-title {
          font-size: 13px; font-weight: 700; color: var(--color-text);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          margin-bottom: 2px;
        }
        .cal-tooltip-badge {
          display: inline-block; font-size: 10px; font-weight: 700;
          padding: 1px 6px; border-radius: 9999px;
        }
        .cal-tooltip-body { padding: 8px 12px; display: flex; flex-direction: column; gap: 4px; }
        .cal-tooltip-row {
          display: flex; align-items: center; gap: 6px;
          font-size: 12px; color: var(--color-text-muted);
        }
        .cal-tooltip-row-icon { width: 12px; flex-shrink: 0; color: var(--color-text-faint); }
        .cal-tooltip-notes { align-items: flex-start; }
        .cal-tooltip-notes span { font-style: italic; }
        .cal-tooltip-actions {
          display: flex; gap: 6px; padding: 8px 12px;
          border-top: 1px solid var(--color-border);
          background: var(--color-surface);
        }
        .cal-tip-btn {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 600;
          cursor: pointer; border: none; transition: opacity 0.15s ease;
          text-decoration: none;
        }
        .cal-tip-btn:hover { opacity: 0.82; }
        .cal-tip-btn--primary { background: rgba(245,158,11,0.15); color: #f59e0b; }
        .cal-tip-btn--success { background: rgba(16,185,129,0.15); color: #10b981; }
        .cal-tip-btn--wa     { background: rgba(37,211,102,0.15); color: #25D366; }

        /* ── Context menu ─────────────────────────────────────────────── */
        .cal-context-menu {
          z-index: 9999; min-width: 180px;
          background: var(--color-surface-2);
          border: 1px solid var(--color-border);
          border-radius: 0.625rem;
          box-shadow: var(--shadow-lg);
          padding: 4px;
          overflow: hidden;
        }
        .cal-ctx-item {
          display: flex; align-items: center; gap: 8px;
          width: 100%; padding: 7px 10px;
          font-size: 12px; font-weight: 500; color: var(--color-text);
          border-radius: 0.375rem; cursor: pointer; border: none;
          background: transparent; text-decoration: none;
          transition: background 0.12s ease, color 0.12s ease;
        }
        .cal-ctx-item:hover { background: var(--color-row-hover); }
        .cal-ctx-item--success { color: #10b981; }
        .cal-ctx-item--success:hover { background: rgba(16,185,129,0.1); }
        .cal-ctx-item--wa { color: #25D366; }
        .cal-ctx-item--wa:hover { background: rgba(37,211,102,0.1); }
        .cal-ctx-item--danger { color: #ef4444; }
        .cal-ctx-item--danger:hover { background: rgba(239,68,68,0.1); }
        .cal-ctx-divider { height: 1px; background: var(--color-border); margin: 3px 0; }

        /* ── Page layout ──────────────────────────────────────────────── */
        .cal-page { display: flex; flex-direction: column; gap: 1.25rem; padding: 1.5rem; }
        .cal-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
        .cal-title {
          display: flex; align-items: center; gap: 0.5rem;
          font-size: 1.375rem; font-weight: 800; color: var(--color-text); margin: 0;
        }
        .cal-title-icon { color: #f59e0b; }
        .cal-subtitle { font-size: 13px; color: var(--color-text-muted); margin-top: 2px; }
        .cal-btn-primary {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 0.5rem 1rem; border-radius: 0.5rem;
          background: #f59e0b; color: #111827;
          font-size: 13px; font-weight: 700; border: none; cursor: pointer;
          transition: background 0.15s ease, transform 0.1s ease;
          white-space: nowrap;
        }
        .cal-btn-primary:hover { background: #d97706; }
        .cal-btn-primary:active { transform: scale(0.97); }

        /* ── KPIs ─────────────────────────────────────────────────────── */
        .cal-kpi-row { display: flex; flex-wrap: wrap; gap: 0.75rem; }
        .cal-kpi {
          display: flex; align-items: center; gap: 0.75rem;
          flex: 1 1 160px; min-width: 0;
          padding: 0.875rem 1rem;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 0.75rem;
          box-shadow: var(--shadow-sm);
        }
        .cal-kpi-icon { font-size: 1.5rem; line-height: 1; flex-shrink: 0; }
        .cal-kpi-num {
          font-size: 1.5rem; font-weight: 800; color: var(--color-text); line-height: 1;
        }
        .cal-kpi-num--amber { color: #f59e0b; }
        .cal-kpi-num--blue  { color: #3b82f6; }
        .cal-kpi-label { font-size: 11px; color: var(--color-text-muted); margin-top: 2px; font-weight: 500; }

        /* ── Filters card ─────────────────────────────────────────────── */
        .cal-filters-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 0.75rem;
          padding: 1rem;
          box-shadow: var(--shadow-sm);
        }
        .cal-section-title {
          font-size: 11px; font-weight: 700; color: var(--color-text-muted);
          text-transform: uppercase; letter-spacing: 0.06em;
          margin-bottom: 0.625rem;
        }
        .cal-label {
          display: flex; align-items: center; gap: 4px;
          font-size: 12px; font-weight: 600; color: var(--color-text-muted);
          margin-bottom: 4px;
        }
        .cal-label-action {
          display: inline-flex; align-items: center; gap: 3px;
          margin-left: auto; font-size: 11px; font-weight: 600;
          color: #f59e0b; background: rgba(245,158,11,0.12);
          border: none; border-radius: 4px; padding: 1px 6px;
          cursor: pointer; transition: background 0.15s ease;
        }
        .cal-label-action:hover { background: rgba(245,158,11,0.22); }
        .cal-select, .cal-input {
          width: 100%; padding: 0.5rem 0.625rem;
          background: var(--color-surface-2);
          border: 1px solid var(--color-border);
          color: var(--color-text);
          border-radius: 0.5rem; font-size: 13px;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .cal-select:focus, .cal-input:focus {
          outline: none;
          border-color: #f59e0b;
          box-shadow: 0 0 0 2px rgba(245,158,11,0.2);
        }
        .cal-textarea { resize: vertical; min-height: 72px; }

        /* ── Agent legend ─────────────────────────────────────────────── */
        .cal-agent-legend { display: flex; align-items: center; gap: 6px; font-size: 12px; }
        .cal-agent-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .cal-agent-name { font-weight: 600; color: var(--color-text); }
        .cal-agent-role { color: var(--color-text-faint); font-size: 11px; }

        /* ── Modal ────────────────────────────────────────────────────── */
        .cal-modal {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 1rem;
          width: 100%; max-width: 680px;
          max-height: 90vh; overflow-y: auto;
          box-shadow: var(--shadow-lg);
        }
        .cal-modal-title {
          font-size: 1rem; font-weight: 800; color: var(--color-text);
        }
        .cal-badge-web {
          font-size: 10px; font-weight: 700;
          background: rgba(29,78,216,0.15); color: #3b82f6;
          padding: 2px 8px; border-radius: 9999px;
        }
        .cal-close-btn {
          display: flex; align-items: center; justify-content: center;
          width: 28px; height: 28px; border-radius: 50%;
          background: var(--color-surface-2);
          border: 1px solid var(--color-border);
          color: var(--color-text-muted); cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .cal-close-btn:hover { background: var(--color-row-hover); color: var(--color-text); }

        /* ── Modal action buttons ─────────────────────────────────────── */
        .cal-btn-cancel {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 0.5rem 1rem; border-radius: 0.5rem;
          background: var(--color-surface-2);
          border: 1px solid var(--color-border);
          color: var(--color-text-muted);
          font-size: 13px; font-weight: 600; cursor: pointer;
          transition: background 0.15s ease;
        }
        .cal-btn-cancel:hover { background: var(--color-row-hover); }
        .cal-btn-complete {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 0.5rem 0.875rem; border-radius: 0.5rem;
          background: rgba(16,185,129,0.12);
          border: 1px solid rgba(16,185,129,0.3);
          color: #10b981;
          font-size: 13px; font-weight: 600; cursor: pointer;
          transition: background 0.15s ease;
        }
        .cal-btn-complete:hover { background: rgba(16,185,129,0.2); }
        .cal-btn-delete {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 0.5rem 0.875rem; border-radius: 0.5rem;
          background: rgba(239,68,68,0.10);
          border: 1px solid rgba(239,68,68,0.25);
          color: #ef4444;
          font-size: 13px; font-weight: 600; cursor: pointer;
          transition: background 0.15s ease;
        }
        .cal-btn-delete:hover { background: rgba(239,68,68,0.18); }
        .cal-btn-wa {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 0.5rem 0.875rem; border-radius: 0.5rem;
          background: rgba(37,211,102,0.12);
          border: 1px solid rgba(37,211,102,0.3);
          color: #25D366;
          font-size: 13px; font-weight: 600; cursor: pointer;
          text-decoration: none;
          transition: background 0.15s ease;
        }
        .cal-btn-wa:hover { background: rgba(37,211,102,0.2); }
      `}</style>

    </div>
  );
};

export default CalendarPage;