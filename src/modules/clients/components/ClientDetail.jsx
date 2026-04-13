import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  FaUser, FaPhone, FaEnvelope, FaMapMarkerAlt,
  FaDollarSign, FaHome, FaStickyNote, FaHistory,
  FaFileContract, FaHeart, FaCalendarAlt, FaTimes,
  FaSpinner, FaWhatsapp, FaCheckCircle, FaBan,
  FaClock, FaTimesCircle, FaPlus, FaCalendarCheck,
  FaEye, FaUsers, FaClipboardList, FaBuilding,
  FaExternalLinkAlt, FaEdit,
} from 'react-icons/fa';
import {
  collection, query, where, orderBy, onSnapshot, addDoc,
} from 'firebase/firestore';
import { db } from '../../../core/config/firebase.config';
import { parseISO, format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../../../core/contexts/AuthContext';
import { hasPermission } from '../../users/types/user.types';
import ContractStatusBadge from '../../contracts/components/ContractStatusBadge';
import ContractTypeBadge   from '../../contracts/components/ContractTypeBadge';
import { formatCOP }   from '../../../shared/utils/formatCurrency';
import { formatShort } from '../../../shared/utils/formatDate';
import toast from 'react-hot-toast';

// ── Helpers ───────────────────────────────────────────────────────────────────
function toDate(val) {
  if (!val) return null;
  if (val?.toDate) return val.toDate();
  if (val instanceof Date) return val;
  if (typeof val === 'string') { const d = parseISO(val); return isValid(d) ? d : null; }
  return null;
}

function fmtDate(val) {
  const d = toDate(val);
  if (!d) return '—';
  return format(d, 'd MMM yyyy, HH:mm', { locale: es });
}

function cleanPhone(p = '') {
  const d = String(p).replace(/\D/g, '');
  return d.startsWith('57') ? d : `57${d}`;
}

// ── Config de actividad ───────────────────────────────────────────────────────
const ACT_CFG = {
  visita:            { icon: FaEye,          color: 'text-blue-400',    label: 'Visita' },
  visit_approved:    { icon: FaCheckCircle,  color: 'text-emerald-400', label: 'Visita aprobada' },
  visit_completed:   { icon: FaCheckCircle,  color: 'text-green-400',   label: 'Visita completada' },
  visit_rescheduled: { icon: FaCalendarAlt,  color: 'text-blue-300',    label: 'Reagendada' },
  visit_rejected:    { icon: FaTimesCircle,  color: 'text-red-400',     label: 'Visita rechazada' },
  reunion:           { icon: FaUsers,        color: 'text-purple-400',  label: 'Reunión' },
  llamada:           { icon: FaPhone,        color: 'text-green-400',   label: 'Llamada' },
  seguimiento:       { icon: FaClipboardList,color: 'text-orange-400',  label: 'Seguimiento' },
  otro:              { icon: FaCalendarAlt,  color: 'text-slate-400',   label: 'Otro' },
};

const STATUS_CFG = {
  pendiente:   { icon: FaClock,        color: 'text-yellow-400', label: 'Pendiente' },
  confirmada:  { icon: FaCheckCircle,  color: 'text-blue-400',   label: 'Confirmada' },
  completada:  { icon: FaCheckCircle,  color: 'text-green-400',  label: 'Completada' },
  cancelada:   { icon: FaBan,          color: 'text-red-400',    label: 'Cancelada' },
  approved:    { icon: FaCheckCircle,  color: 'text-emerald-400',label: 'Aprobada' },
  completed:   { icon: FaCheckCircle,  color: 'text-green-400',  label: 'Completada' },
  rejected:    { icon: FaTimesCircle,  color: 'text-red-400',    label: 'Rechazada' },
  rescheduled: { icon: FaCalendarAlt,  color: 'text-blue-300',   label: 'Reagendada' },
};

// ── Sub-componentes ───────────────────────────────────────────────────────────

const TipoBadge = ({ tipo }) => {
  const s = {
    Lead: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    Comprador: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    Arrendatario: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    Propietario: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  };
  return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${s[tipo] || s.Lead}`}>{tipo}</span>;
};

const EstadoBadge = ({ estado }) => {
  const s = {
    Activo: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    Inactivo: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    Convertido: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  };
  return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${s[estado] || s.Activo}`}>{estado}</span>;
};

// ── Timeline de actividad ─────────────────────────────────────────────────────
function ActivityTab({ client, onScheduleVisit, onAddActivity }) {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!client?.id) return;
    let histItems = [], apptItems = [], done = [false, false];
    function merge() {
      if (!done[0] || !done[1]) return;
      const combined = [...histItems, ...apptItems].sort((a, b) => {
        return (toDate(b._sort) || new Date(0)) - (toDate(a._sort) || new Date(0));
      });
      setItems(combined);
      setLoading(false);
    }
    const u1 = onSnapshot(
      query(collection(db, 'clients', client.id, 'history'), orderBy('createdAt', 'desc')),
      (s) => {
        histItems = s.docs.map((d) => ({ _id: d.id, _src: 'history', _sort: d.data().createdAt, ...d.data() }));
        done[0] = true; merge();
      }
    );
    const u2 = onSnapshot(
      query(collection(db, 'appointments'), where('clientId', '==', client.id), orderBy('date', 'desc')),
      (s) => {
        apptItems = s.docs.map((d) => {
          const data = d.data();
          const dt = data.date ? parseISO(`${data.date}T${data.time || '09:00'}`) : null;
          return { _id: d.id, _src: 'appointment', _sort: (dt && isValid(dt)) ? dt : data.createdAt, ...data };
        });
        done[1] = true; merge();
      },
      () => { done[1] = true; merge(); }
    );
    return () => { u1(); u2(); };
  }, [client?.id]);

  if (loading) return <div className="py-8 flex justify-center"><FaSpinner className="animate-spin text-primary text-xl" /></div>;

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={onScheduleVisit}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold
            text-yellow-300 border border-yellow-600/40 hover:bg-yellow-500/10 transition-colors">
          <FaCalendarCheck size={10} /> Agendar visita
        </button>
        <button onClick={onAddActivity}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold
            text-blue-300 border border-blue-600/40 hover:bg-blue-500/10 transition-colors">
          <FaPlus size={10} /> Registrar actividad
        </button>
      </div>

      {items.length === 0 ? (
        <div className="py-10 text-center text-slate-500">
          <FaHistory size={28} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Sin historial de actividad</p>
        </div>
      ) : (
        <div className="relative pl-5">
          {/* Línea de tiempo */}
          <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-slate-700" />
          <div className="space-y-4">
            {items.map((item) => {
              const cfg  = ACT_CFG[item.type] || ACT_CFG.otro;
              const Icon = cfg.icon;
              const sc   = STATUS_CFG[item.status] || STATUS_CFG.pendiente;
              const SI   = sc.icon;
              const dateDisplay = item.date
                ? format(parseISO(`${item.date}T${item.time || '00:00'}`), 'd MMM yyyy, HH:mm', { locale: es })
                : fmtDate(item.createdAt);

              return (
                <div key={`${item._src}-${item._id}`} className="relative">
                  {/* Punto */}
                  <div className={`absolute -left-6 w-3 h-3 rounded-full border-2 bg-slate-950 border-current ${cfg.color}`} />
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 hover:border-slate-700 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <Icon className={`${cfg.color} flex-shrink-0`} size={12} />
                        <span className="text-white text-xs font-semibold">{cfg.label}</span>
                        {item._src === 'history' && (
                          <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold uppercase">CRM</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <SI className={`${sc.color}`} size={10} />
                        <span className={`text-[10px] ${sc.color}`}>{sc.label}</span>
                      </div>
                    </div>
                    {item.propertyName && (
                      <p className="text-slate-400 text-xs mb-1 flex items-center gap-1">
                        <FaBuilding size={9} className="flex-shrink-0" /> {item.propertyName}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-slate-600 text-[10px]">
                      <span>{dateDisplay}</span>
                      {item.agentName && <span>· {item.agentName}</span>}
                    </div>
                    {item.notes && (
                      <p className="text-slate-500 text-[10px] mt-1.5 italic line-clamp-2">{item.notes}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Contratos del cliente ─────────────────────────────────────────────────────
function ContractsTab({ clientId }) {
  const [contracts, setContracts] = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    if (!clientId) return;
    const unsub = onSnapshot(
      query(collection(db, 'contracts'), where('clientId', '==', clientId), orderBy('createdAt', 'desc')),
      (s) => { setContracts(s.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false); },
      () => setLoading(false)
    );
    return () => unsub();
  }, [clientId]);

  if (loading) return <div className="py-8 flex justify-center"><FaSpinner className="animate-spin text-primary" /></div>;
  if (contracts.length === 0) return (
    <div className="py-10 text-center text-slate-500">
      <FaFileContract size={28} className="mx-auto mb-2 opacity-30" />
      <p className="text-sm">No hay contratos registrados</p>
    </div>
  );

  const totalValue = contracts.reduce((s, c) => s + (Number(c.value) || 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-xl">
        <span className="text-slate-400 text-xs">Valor total gestionado</span>
        <span className="text-primary font-bold text-sm">{formatCOP(totalValue)}</span>
      </div>
      {contracts.map((c) => (
        <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4
          hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <ContractTypeBadge type={c.type} />
              <ContractStatusBadge status={c.status} />
            </div>
            <p className="text-slate-500 text-xs whitespace-nowrap">{formatShort(c.startDate)}</p>
          </div>
          <p className="text-white text-sm font-semibold truncate mb-1">{c.propertyName || '—'}</p>
          {c.propertyAddress && <p className="text-slate-500 text-xs truncate mb-2">{c.propertyAddress}</p>}
          <div className="flex items-center justify-between">
            <span className="text-primary text-sm font-bold">{formatCOP(c.value)}</span>
            {c.documentUrl && (
              <a href={c.documentUrl} target="_blank" rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1 transition-colors">
                PDF <FaExternalLinkAlt size={9} />
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Favoritos del cliente ─────────────────────────────────────────────────────
function FavoritesTab({ favoriteIds }) {
  const [properties, setProperties] = useState([]);
  const [loading,    setLoading]    = useState(false);

  useEffect(() => {
    if (!favoriteIds?.length) { setProperties([]); return; }
    setLoading(true);
    // Fetch en lotes de 10 (límite de 'in' en Firestore)
    const batches = [];
    for (let i = 0; i < favoriteIds.length; i += 10) {
      batches.push(favoriteIds.slice(i, i + 10));
    }
    Promise.all(
      batches.map((batch) =>
        getDocs ? null : null // handled below
      )
    );
    // Usar getDocs directamente
    import('firebase/firestore').then(({ getDocs, query: q2, collection: col2, where: w2 }) => {
      Promise.all(
        batches.map((batch) =>
          getDocs(q2(col2(db, 'properties'), w2('__name__', 'in', batch)))
        )
      ).then((snaps) => {
        const all = snaps.flatMap((s) => s.docs.map((d) => ({ id: d.id, ...d.data() })));
        setProperties(all);
        setLoading(false);
      }).catch(() => setLoading(false));
    });
  }, [JSON.stringify(favoriteIds)]);

  if (!favoriteIds?.length) return (
    <div className="py-10 text-center text-slate-500">
      <FaHeart size={28} className="mx-auto mb-2 opacity-20" />
      <p className="text-sm">Sin propiedades guardadas</p>
    </div>
  );
  if (loading) return <div className="py-8 flex justify-center"><FaSpinner className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-3">
      {properties.map((p) => (
        <div key={p.id} className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl p-3">
          <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {p.images?.[0]
              ? <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
              : <FaHome className="text-slate-600" size={16} />
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate">{p.title || '—'}</p>
            <p className="text-slate-500 text-xs truncate">{p.city || p.address || ''}</p>
          </div>
          <Link to={`/propiedades/${p.id}`}
            className="text-primary hover:text-primary/80 text-xs flex items-center gap-1 flex-shrink-0 transition-colors">
            Ver <FaExternalLinkAlt size={9} />
          </Link>
        </div>
      ))}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function ClientDetail({
  client,
  onClose,
  onEdit,
  onScheduleVisit,
  onAddActivity,
}) {
  const { currentUser } = useAuth();
  const [tab, setTab] = useState('actividad');

  if (!client) return null;

  const canEdit = hasPermission(currentUser?.role, 'clients', 'update');
  const waLink  = client.telefono
    ? `https://wa.me/${cleanPhone(client.telefono)}?text=Hola%20${encodeURIComponent(client.nombre)}%2C%20te%20contactamos%20desde%20R%26B%20Inmobiliaria.`
    : null;

  const TABS = [
    { id: 'actividad', label: 'Actividad',  icon: FaHistory },
    { id: 'contratos', label: 'Contratos',  icon: FaFileContract },
    { id: 'favoritos', label: 'Favoritos',  icon: FaHeart },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4 h-full"
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center flex-shrink-0">
            <FaUser className="text-primary" size={18} />
          </div>
          <div>
            <h2 className="text-white font-extrabold text-base leading-tight">{client.nombre}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <TipoBadge  tipo={client.tipoCliente} />
              <EstadoBadge estado={client.estado} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {canEdit && (
            <button onClick={onEdit}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Editar cliente">
              <FaEdit size={13} />
            </button>
          )}
          {onClose && (
            <button onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
              <FaTimes size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── Info de contacto ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-2">
        {client.telefono && (
          <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2">
              <FaPhone className="text-slate-500" size={12} />
              <a href={`tel:${client.telefono}`} className="text-white text-sm hover:text-primary transition-colors">
                {client.telefono}
              </a>
            </div>
            {waLink && (
              <a href={waLink} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/10
                  text-green-400 hover:bg-green-500/20 transition-colors text-xs font-semibold">
                <FaWhatsapp size={11} /> WhatsApp
              </a>
            )}
          </div>
        )}
        {client.email && (
          <div className="flex items-center gap-2 p-3 bg-slate-900 rounded-xl border border-slate-800">
            <FaEnvelope className="text-slate-500" size={12} />
            <a href={`mailto:${client.email}`} className="text-white text-sm hover:text-primary transition-colors truncate">
              {client.email}
            </a>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          {client.ubicacionInteres && (
            <div className="flex items-center gap-2 p-3 bg-slate-900 rounded-xl border border-slate-800">
              <FaMapMarkerAlt className="text-slate-500 flex-shrink-0" size={11} />
              <span className="text-slate-300 text-xs truncate">{client.ubicacionInteres}</span>
            </div>
          )}
          {client.presupuesto && (
            <div className="flex items-center gap-2 p-3 bg-slate-900 rounded-xl border border-slate-800">
              <FaDollarSign className="text-slate-500 flex-shrink-0" size={11} />
              <span className="text-slate-300 text-xs font-semibold">{formatCOP(client.presupuesto)}</span>
            </div>
          )}
          {client.tipoPropiedad && (
            <div className="flex items-center gap-2 p-3 bg-slate-900 rounded-xl border border-slate-800">
              <FaHome className="text-slate-500 flex-shrink-0" size={11} />
              <span className="text-slate-300 text-xs">{client.tipoPropiedad}</span>
            </div>
          )}
        </div>
      </div>

      {/* Notas */}
      {client.notas && (
        <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2 mb-1">
            <FaStickyNote className="text-slate-500" size={11} />
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Notas</span>
          </div>
          <p className="text-slate-300 text-xs leading-relaxed">{client.notas}</p>
        </div>
      )}

      {/* ── Tabs ──────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-slate-900 rounded-xl p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors
              ${tab === id ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
            <Icon size={10} /> {label}
          </button>
        ))}
      </div>

      {/* ── Contenido tabs ────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="flex-1 overflow-y-auto">
          {tab === 'actividad' && (
            <ActivityTab
              client={client}
              onScheduleVisit={onScheduleVisit}
              onAddActivity={onAddActivity}
            />
          )}
          {tab === 'contratos' && <ContractsTab clientId={client.id} />}
          {tab === 'favoritos' && <FavoritesTab favoriteIds={client.favorites || []} />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}