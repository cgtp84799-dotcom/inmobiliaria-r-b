import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaHome, FaHeart, FaCalendarAlt, FaFileContract,
  FaUser, FaSignOutAlt, FaSpinner, FaBuilding,
  FaCheckCircle, FaClock, FaTimesCircle, FaDownload,
  FaWhatsapp, FaSearch, FaArrowRight, FaMapMarkerAlt,
  FaBan, FaCalendarCheck, FaBell, FaPhone,
  FaEnvelope, FaChevronRight, FaStar, FaBed,
  FaBath, FaRulerCombined,
} from 'react-icons/fa';
import {
  collection, query, where, orderBy, onSnapshot,
  doc, getDoc, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../../../core/config/firebase.config';
import { signOut } from 'firebase/auth';
import { useAuth } from '../../../core/contexts/AuthContext';
import { formatCOP }   from '../../../shared/utils/formatCurrency';
import { formatShort } from '../../../shared/utils/formatDate';
import ContractStatusBadge from '../../contracts/components/ContractStatusBadge';
import ContractTypeBadge   from '../../contracts/components/ContractTypeBadge';
import { differenceInDays, differenceInHours, parseISO, isValid } from 'date-fns';
import toast from 'react-hot-toast';

// ── Status config ─────────────────────────────────────────────────────────────
const VS = {
  pending:     { label: 'En revisión',  color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: FaClock,       dot: 'bg-yellow-400' },
  approved:    { label: '¡Confirmada!', color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20',  icon: FaCheckCircle, dot: 'bg-green-400' },
  completed:   { label: 'Completada',   color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   icon: FaCheckCircle, dot: 'bg-blue-400' },
  rejected:    { label: 'No aprobada',  color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20',    icon: FaTimesCircle, dot: 'bg-red-400' },
  rescheduled: { label: 'Nueva fecha',  color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: FaCalendarAlt, dot: 'bg-orange-400' },
  cancelada:   { label: 'Cancelada',    color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20',    icon: FaBan,         dot: 'bg-red-400' },
};

function Countdown({ dateStr, timeStr }) {
  const [label, setLabel] = useState('');
  useEffect(() => {
    function update() {
      if (!dateStr) { setLabel(''); return; }
      const dt = parseISO(`${dateStr}T${timeStr || '10:00'}`);
      if (!isValid(dt)) { setLabel(''); return; }
      const now = new Date();
      const diffH = differenceInHours(dt, now);
      const diffD = differenceInDays(dt, now);
      if (diffH < 0)   setLabel('Visita pasada');
      else if (diffH < 24) setLabel(`Hoy en ${diffH}h`);
      else if (diffD === 1) setLabel('Mañana');
      else setLabel(`En ${diffD} días`);
    }
    update();
    const t = setInterval(update, 60_000);
    return () => clearInterval(t);
  }, [dateStr, timeStr]);
  return label ? (
    <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{label}</span>
  ) : null;
}

// ── Notificaciones in-app ─────────────────────────────────────────────────────
function NotifBell({ email }) {
  const [notifs, setNotifs] = useState([]);
  const [open,   setOpen]   = useState(false);

  useEffect(() => {
    if (!email) return;
    const unsub = onSnapshot(
      query(collection(db, 'notifications'), where('userId', '==', email),
        where('read', '==', false), orderBy('createdAt', 'desc')),
      (s) => setNotifs(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => {}
    );
    return () => unsub();
  }, [email]);

  const markAllRead = async () => {
    await Promise.allSettled(notifs.map((n) =>
      updateDoc(doc(db, 'notifications', n.id), { read: true, readAt: serverTimestamp() })
    ));
    setOpen(false);
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="relative p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors">
        <FaBell className="text-slate-400" size={14} />
        {notifs.length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full text-[9px] font-bold text-slate-950 flex items-center justify-center">
            {notifs.length > 9 ? '9+' : notifs.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 top-12 z-50 w-80 bg-slate-900 border border-slate-800
                rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                <p className="text-white text-sm font-bold">Notificaciones</p>
                {notifs.length > 0 && (
                  <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                    Marcar todas leídas
                  </button>
                )}
              </div>
              {notifs.length === 0 ? (
                <div className="py-8 text-center text-slate-500">
                  <FaBell size={20} className="mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Sin notificaciones nuevas</p>
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto">
                  {notifs.map((n) => (
                    <div key={n.id} className="px-4 py-3 border-b border-slate-800/60 last:border-0
                      hover:bg-slate-800/40 transition-colors">
                      <p className="text-white text-xs font-semibold">{n.title}</p>
                      <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{n.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Visitas ───────────────────────────────────────────────────────────────────
function MyVisits({ email }) {
  const [visits, setVisits] = useState([]);
  const [loading, setL] = useState(true);

  useEffect(() => {
    if (!email) return;
    const u = onSnapshot(
      query(collection(db, 'visits'), where('clientEmail', '==', email), orderBy('createdAt', 'desc')),
      (s) => { setVisits(s.docs.map((d) => ({ id: d.id, ...d.data() }))); setL(false); },
      () => setL(false)
    );
    return () => u();
  }, [email]);

  // Próxima visita activa
  const next = useMemo(() =>
    visits.find((v) => v.status === 'approved' && v.requestedDate >= new Date().toISOString().split('T')[0]),
  [visits]);

  if (loading) return <div className="py-8 flex justify-center"><FaSpinner className="animate-spin text-primary" /></div>;

  if (!visits.length) return (
    <div className="py-10 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
        <FaCalendarCheck className="text-primary" size={22} />
      </div>
      <p className="text-white font-bold mb-1">Agenda tu primera visita</p>
      <p className="text-slate-400 text-sm mb-6">Elige la propiedad de tus sueños y agenda una visita gratis</p>
      <Link to="/agendar-visita"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
          bg-primary text-slate-950 font-bold text-sm hover:bg-primary/90 transition-colors">
        <FaCalendarCheck size={12} /> Agendar visita gratis
      </Link>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Próxima visita destacada */}
      {next && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-gradient-to-r from-green-500/15 to-green-500/5
            border border-green-500/25 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full blur-2xl" />
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <p className="text-green-400 text-xs font-bold uppercase tracking-wide">Próxima visita</p>
            </div>
            <Countdown dateStr={next.requestedDate} timeStr={next.requestedTime} />
          </div>
          <p className="text-white font-bold text-base">{next.propertyName}</p>
          {next.propertyAddress && (
            <p className="text-slate-400 text-xs flex items-center gap-1 mt-1">
              <FaMapMarkerAlt size={9} /> {next.propertyAddress}
            </p>
          )}
          <div className="flex items-center justify-between mt-3">
            <p className="text-slate-300 text-sm">
              📅 {next.requestedDate} · {next.requestedTime || 'Por confirmar'}
            </p>
            {next.agentName && (
              <p className="text-slate-400 text-xs">👤 {next.agentName}</p>
            )}
          </div>
          {next.adminNotes && (
            <p className="mt-2 text-green-300/80 text-xs italic">"{next.adminNotes}"</p>
          )}
        </motion.div>
      )}

      {/* Resto de visitas */}
      {visits.filter((v) => !next || v.id !== next.id).map((v) => {
        const st = VS[v.status] || VS.pending;
        const SI = st.icon;
        return (
          <div key={v.id} className={`p-4 rounded-xl border ${st.bg} ${st.border}`}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate">{v.propertyName || 'Propiedad'}</p>
                {v.propertyAddress && (
                  <p className="text-slate-400 text-xs flex items-center gap-1 mt-0.5 truncate">
                    <FaMapMarkerAlt size={8} /> {v.propertyAddress}
                  </p>
                )}
              </div>
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${st.bg} border ${st.border} flex-shrink-0`}>
                <SI className={st.color} size={9} />
                <span className={`${st.color} text-[10px] font-bold`}>{st.label}</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>📅 {v.requestedDate || '—'}{v.requestedTime ? ` · ${v.requestedTime}` : ''}</span>
              {v.agentName && <span>👤 {v.agentName}</span>}
            </div>
            {v.adminNotes && (
              <p className="mt-2 text-slate-300 text-xs italic bg-slate-950/30 px-3 py-2 rounded-lg">
                "{v.adminNotes}"
              </p>
            )}
            {v.status === 'rescheduled' && v.proposedDate && (
              <div className="mt-2 p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <p className="text-orange-300 text-xs font-semibold">
                  📅 Nueva propuesta: {v.proposedDate}{v.proposedTime ? ` a las ${v.proposedTime}` : ''}
                </p>
              </div>
            )}
            {v.status === 'approved' && (
              <div className="mt-3 flex gap-2">
                <a href={`https://wa.me/573105968202?text=Hola, confirmo mi visita del ${v.requestedDate} a ${v.propertyName}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg
                    bg-green-500/10 border border-green-500/20 text-green-400
                    hover:bg-green-500/15 transition-colors text-xs font-semibold">
                  <FaWhatsapp size={11} /> Confirmar por WA
                </a>
                <Link to="/agendar-visita"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg
                    bg-slate-800 border border-slate-700 text-slate-400
                    hover:text-white transition-colors text-xs font-semibold">
                  <FaCalendarCheck size={10} /> Ver catálogo
                </Link>
              </div>
            )}
          </div>
        );
      })}

      <Link to="/agendar-visita"
        className="flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed
          border-slate-700 text-slate-500 hover:border-primary/40 hover:text-primary
          transition-colors text-sm font-semibold">
        <FaCalendarCheck size={12} /> Agendar nueva visita
      </Link>
    </div>
  );
}

// ── Contratos ─────────────────────────────────────────────────────────────────
function MyContracts({ email }) {
  const [contracts, setContracts] = useState([]);
  const [loading, setL] = useState(true);

  useEffect(() => {
    if (!email) return;
    const u = onSnapshot(
      query(collection(db, 'contracts'), where('clientEmail', '==', email), orderBy('createdAt', 'desc')),
      (s) => { setContracts(s.docs.map((d) => ({ id: d.id, ...d.data() }))); setL(false); },
      () => setL(false)
    );
    return () => u();
  }, [email]);

  if (loading) return <div className="py-8 flex justify-center"><FaSpinner className="animate-spin text-primary" /></div>;

  if (!contracts.length) return (
    <div className="py-10 text-center">
      <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
        <FaFileContract className="text-blue-400" size={22} />
      </div>
      <p className="text-white font-bold mb-1">Sin contratos activos</p>
      <p className="text-slate-400 text-sm mb-6">Cuando firmes un contrato aparecerá aquí con todos los detalles</p>
      <Link to="/catalogo"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
          bg-slate-800 border border-slate-700 text-slate-300
          hover:border-slate-600 hover:text-white transition-colors text-sm font-semibold">
        <FaSearch size={11} /> Ver propiedades disponibles
      </Link>
    </div>
  );

  const total = contracts.reduce((s, c) => s + (Number(c.value) || 0), 0);

  return (
    <div className="space-y-3">
      {total > 0 && (
        <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/15 rounded-xl">
          <span className="text-slate-400 text-xs">Valor total gestionado</span>
          <span className="text-primary font-bold">{formatCOP(total)}</span>
        </div>
      )}
      {contracts.map((c) => (
        <div key={c.id} className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <ContractTypeBadge type={c.type} />
            <ContractStatusBadge status={c.status} />
          </div>
          <p className="text-white text-sm font-semibold">{c.propertyName || '—'}</p>
          {c.propertyAddress && <p className="text-slate-500 text-xs mt-0.5 truncate">{c.propertyAddress}</p>}
          <div className="flex items-center justify-between mt-3">
            <div>
              <p className="text-primary font-bold text-sm">{formatCOP(c.value)}</p>
              <p className="text-slate-500 text-xs mt-0.5">
                {formatShort(c.startDate)}{c.endDate ? ` → ${formatShort(c.endDate)}` : ''}
              </p>
            </div>
            {c.documentUrl && (
              <a href={c.documentUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg
                  bg-blue-500/10 border border-blue-500/20 text-blue-400
                  hover:bg-blue-500/15 transition-colors text-xs font-bold">
                <FaDownload size={10} /> Descargar PDF
              </a>
            )}
          </div>
          {c.agentName && (
            <p className="mt-2 text-slate-500 text-xs flex items-center gap-1">
              👤 Agente: {c.agentName}
              {c.agentEmail && (
                <a href={`mailto:${c.agentEmail}`} className="text-primary hover:underline ml-1">
                  <FaEnvelope size={9} />
                </a>
              )}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Favoritos ─────────────────────────────────────────────────────────────────
function MyFavorites({ favoriteIds }) {
  const [props, setProps] = useState([]);
  const [loading, setL] = useState(false);

  useEffect(() => {
    if (!favoriteIds?.length) { setProps([]); return; }
    setL(true);
    import('firebase/firestore').then(({ getDocs, query: q2, collection: c2, where: w2 }) => {
      const batches = [];
      for (let i = 0; i < favoriteIds.length; i += 10) batches.push(favoriteIds.slice(i, i + 10));
      Promise.all(batches.map((b) => getDocs(q2(c2(db, 'properties'), w2('__name__', 'in', b)))))
        .then((ss) => { setProps(ss.flatMap((s) => s.docs.map((d) => ({ id: d.id, ...d.data() })))); setL(false); })
        .catch(() => setL(false));
    });
  }, [JSON.stringify(favoriteIds)]);

  if (!favoriteIds?.length) return (
    <div className="py-10 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
        <FaHeart className="text-red-400" size={22} />
      </div>
      <p className="text-white font-bold mb-1">Guarda tus favoritas</p>
      <p className="text-slate-400 text-sm mb-6">Cuando marques una propiedad con ❤️ aparecerá aquí</p>
      <Link to="/catalogo"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
          bg-primary text-slate-950 font-bold text-sm hover:bg-primary/90 transition-colors">
        <FaSearch size={11} /> Explorar catálogo
      </Link>
    </div>
  );

  if (loading) return <div className="py-8 flex justify-center"><FaSpinner className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-3">
      {props.map((p) => {
        const price = p.price?.sale || p.price?.rent || p.price;
        const rooms = p.features?.rooms || p.features?.bedrooms || p.rooms;
        const baths = p.features?.bathrooms || p.bathrooms;
        return (
          <div key={p.id} className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden
            hover:border-slate-700 transition-colors">
            <div className="flex gap-3 p-3">
              <div className="w-20 h-20 rounded-lg bg-slate-800 overflow-hidden flex-shrink-0">
                {p.images?.[0]
                  ? <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><FaHome className="text-slate-600" size={20} /></div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-bold truncate">{p.title || '—'}</p>
                {(p.city || p.location?.city) && (
                  <p className="text-slate-400 text-xs flex items-center gap-1 mt-0.5">
                    <FaMapMarkerAlt size={8} /> {p.city || p.location?.city}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-1.5 text-slate-500 text-[10px]">
                  {rooms && <span className="flex items-center gap-1"><FaBed size={8} /> {rooms}</span>}
                  {baths && <span className="flex items-center gap-1"><FaBath size={8} /> {baths}</span>}
                </div>
                {price && <p className="text-primary font-bold text-sm mt-1.5">{formatCOP(price)}</p>}
              </div>
            </div>
            <div className="flex border-t border-slate-800">
              <Link to={`/propiedades/${p.id}`}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold
                  text-slate-400 hover:text-primary hover:bg-primary/5 transition-colors">
                Ver propiedad <FaArrowRight size={9} />
              </Link>
              <Link to={`/agendar-visita?propertyId=${p.id}`}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold
                  text-primary hover:bg-primary/5 border-l border-slate-800 transition-colors">
                <FaCalendarCheck size={9} /> Agendar visita
              </Link>
            </div>
          </div>
        );
      })}

      <Link to="/catalogo"
        className="flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed
          border-slate-700 text-slate-500 hover:border-primary/40 hover:text-primary
          transition-colors text-sm font-semibold">
        <FaSearch size={11} /> Explorar más propiedades
      </Link>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function ClientPortal() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [tab,     setTab]    = useState('visitas');
  const [profile, setProfile]= useState(null);
  const [loading, setL]      = useState(true);

  useEffect(() => {
    if (!currentUser?.email) return;
    const u = onSnapshot(doc(db, 'users', currentUser.email),
      (s) => { setProfile(s.exists() ? s.data() : {}); setL(false); },
      () => setL(false)
    );
    return () => u();
  }, [currentUser?.email]);

  const handleLogout = async () => {
    try { await signOut(auth); navigate('/'); }
    catch { toast.error('Error al cerrar sesión'); }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <FaSpinner className="animate-spin text-primary text-3xl mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Cargando tu portal...</p>
        </div>
      </div>
    );
  }

  const name     = profile?.displayName || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Cliente';
  const initials = name.trim().split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  const favs     = profile?.favorites || [];

  const TABS = [
    { id: 'visitas',   label: 'Visitas',   icon: FaCalendarAlt },
    { id: 'contratos', label: 'Contratos', icon: FaFileContract },
    { id: 'favoritos', label: 'Favoritos', icon: FaHeart, badge: favs.length },
  ];

  return (
    <div className="min-h-screen bg-slate-950">

      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/60">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2">
            <img src="https://inmobiliaria-ryb-y-asociados.com/logo.jpg.png" alt="R&B"
              className="h-7 w-auto" onError={(e) => e.target.style.display='none'} />
            <span className="text-primary font-extrabold text-sm hidden sm:block">R&B</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link to="/catalogo"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                text-slate-400 hover:text-white text-xs font-semibold transition-colors">
              <FaSearch size={11} /> Catálogo
            </Link>
            <NotifBell email={currentUser?.email} />
            <button onClick={handleLogout}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800
                hover:border-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Cerrar sesión">
              <FaSignOutAlt size={13} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* ── Bienvenida ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-primary/15
            bg-gradient-to-r from-primary/8 via-transparent to-transparent p-5"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-yellow-500
              flex items-center justify-center text-slate-950 font-extrabold text-lg flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-400 text-xs mb-0.5">Bienvenido de vuelta</p>
              <h1 className="text-white font-extrabold text-lg leading-tight truncate">{name}</h1>
              <p className="text-slate-500 text-xs truncate">{currentUser?.email}</p>
            </div>
          </div>
        </motion.div>

        {/* ── CTA catálogo ────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Link to="/catalogo"
            className="flex items-center justify-between p-4 bg-slate-900/60 border border-slate-800
              rounded-2xl hover:border-primary/30 transition-colors group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <FaBuilding className="text-primary" size={15} />
              </div>
              <div>
                <p className="text-white text-sm font-semibold">Ver catálogo completo</p>
                <p className="text-slate-500 text-xs">Explora todas nuestras propiedades</p>
              </div>
            </div>
            <FaChevronRight className="text-slate-600 group-hover:text-primary transition-colors" size={12} />
          </Link>
        </motion.div>

        {/* ── Tabs ────────────────────────────────────────────────────── */}
        <div className="flex gap-1 bg-slate-900/80 rounded-2xl p-1 border border-slate-800/60">
          {TABS.map(({ id, label, icon: Icon, badge }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl
                text-xs font-bold transition-all duration-200
                ${tab === id
                  ? 'bg-gradient-to-r from-primary to-yellow-400 text-slate-950 shadow-md shadow-primary/20'
                  : 'text-slate-500 hover:text-slate-300'}`}>
              <Icon size={11} />
              <span className="hidden sm:inline">{label}</span>
              {badge > 0 && (
                <span className={`w-4 h-4 rounded-full text-[9px] font-extrabold flex items-center justify-center
                  ${tab === id ? 'bg-slate-950/20 text-slate-950' : 'bg-primary text-slate-950'}`}>
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Contenido ───────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          <motion.div key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}>
            {tab === 'visitas'   && <MyVisits   email={currentUser?.email} />}
            {tab === 'contratos' && <MyContracts email={currentUser?.email} />}
            {tab === 'favoritos' && <MyFavorites favoriteIds={favs} />}
          </motion.div>
        </AnimatePresence>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <div className="pt-4 pb-8 border-t border-slate-800/60 text-center space-y-3">
          <a href="https://wa.me/573105968202?text=Hola, soy cliente de R%26B y necesito ayuda"
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
              bg-green-500/10 border border-green-500/20 text-green-400
              hover:bg-green-500/15 transition-colors text-sm font-semibold">
            <FaWhatsapp size={13} /> ¿Necesitas ayuda? WhatsApp
          </a>
          <p className="text-slate-700 text-xs">
            R&B Inmobiliaria · Cra 5 No. 9-28, Anserma, Caldas
          </p>
        </div>
      </main>
    </div>
  );
}