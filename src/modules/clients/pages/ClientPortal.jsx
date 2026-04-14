// src/modules/clients/pages/ClientPortal.jsx
// PARTE 1/2 — Hooks internos, subcomponentes y shell del portal
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaHome, FaHeart, FaCalendarAlt, FaFileContract,
  FaUser, FaSignOutAlt, FaSpinner, FaBell,
  FaCheckCircle, FaClock, FaTimesCircle, FaDownload,
  FaWhatsapp, FaSearch, FaArrowRight, FaMapMarkerAlt,
  FaBan, FaCalendarCheck, FaPhone, FaEnvelope,
  FaBed, FaBath, FaRulerCombined, FaChevronDown,
  FaEdit, FaSave, FaTimes, FaTrash,
} from 'react-icons/fa';
import {
  collection, query, where, orderBy, onSnapshot,
  doc, getDoc, getDocs, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import { signOut, sendPasswordResetEmail } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../../../core/config/firebase.config';
import { useAuth } from '../../../core/contexts/AuthContext';
import { formatCOP }   from '../../../shared/utils/formatCurrency';
import { formatShort } from '../../../shared/utils/formatDate';
import ContractStatusBadge from '../../contracts/components/ContractStatusBadge';
import ContractTypeBadge   from '../../contracts/components/ContractTypeBadge';
import { differenceInDays, differenceInHours, parseISO, isValid, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { markAllAsRead, markNotificationAsRead, NOTIF_TYPES } from '../../../core/services/notificationService';
import toast from 'react-hot-toast';

// ── Helpers ────────────────────────────────────────────────────────────────────
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
  return format(d, "d 'de' MMMM, yyyy", { locale: es });
}
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return '¡Buenos días';
  if (h < 18) return '¡Buenas tardes';
  return '¡Buenas noches';
}
function getInitials(name = '') {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
}

// ── Visit status config ────────────────────────────────────────────────────────
const VS = {
  pending:     { label: 'En revisión',  color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: FaClock },
  approved:    { label: '¡Confirmada!', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: FaCheckCircle },
  completed:   { label: 'Completada',   color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: FaCheckCircle },
  rejected:    { label: 'No aprobada',  color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: FaTimesCircle },
  rescheduled: { label: 'Nueva fecha',  color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: FaCalendarAlt },
  cancelada:   { label: 'Cancelada',    color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: FaBan },
};

// Notif icon map
const NOTIF_ICONS = {
  [NOTIF_TYPES?.VISIT_CONFIRMED]:   '✅',
  [NOTIF_TYPES?.VISIT_REJECTED]:    '❌',
  [NOTIF_TYPES?.VISIT_RESCHEDULED]: '📅',
  [NOTIF_TYPES?.CONTRACT_CREATED]:  '📄',
  [NOTIF_TYPES?.NEW_PROPERTY]:      '🏠',
  [NOTIF_TYPES?.WELCOME]:           '👋',
  [NOTIF_TYPES?.MANUAL]:            '📢',
  default: '🔔',
};

// ── Countdown component ────────────────────────────────────────────────────────
function Countdown({ dateStr, timeStr }) {
  const [label, setLabel] = useState('');
  useEffect(() => {
    function update() {
      if (!dateStr) { setLabel(''); return; }
      const dt = parseISO(`${dateStr}T${timeStr || '10:00'}`);
      if (!isValid(dt)) { setLabel(''); return; }
      const diffH = differenceInHours(dt, new Date());
      const diffD = differenceInDays(dt, new Date());
      if (diffH < 0)    setLabel('Visita pasada');
      else if (diffH < 24) setLabel(`Hoy en ${diffH}h`);
      else if (diffD === 1) setLabel('Mañana');
      else setLabel(`En ${diffD} días`);
    }
    update();
    const t = setInterval(update, 60_000);
    return () => clearInterval(t);
  }, [dateStr, timeStr]);
  return label ? (
    <span className="inline-flex items-center gap-1 bg-amber-500/15 text-amber-400 text-xs px-2.5 py-1 rounded-full font-semibold border border-amber-500/20">
      <FaClock className="text-[10px]" /> {label}
    </span>
  ) : null;
}

// ── Tab definition ─────────────────────────────────────────────────────────────
const TAB_DEFS = [
  { id: 'inicio',     label: 'Inicio',       icon: FaHome,          always: true },
  { id: 'favoritos',  label: 'Favoritos',    icon: FaHeart,         always: true },
  { id: 'visitas',    label: 'Mis visitas',  icon: FaCalendarAlt,   always: false },
  { id: 'contratos',  label: 'Contratos',    icon: FaFileContract,  always: false },
  { id: 'perfil',     label: 'Mi perfil',    icon: FaUser,          always: true },
];

// ── useClientData hook ─────────────────────────────────────────────────────────
function useClientData(email) {
  const [clientId, setClientId] = useState(null);
  const [clientData, setClientData] = useState(null);
  const [visits, setVisits] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Resolve clientId
  useEffect(() => {
    if (!email) return;
    const q = query(collection(db, 'clients'), where('email', '==', email));
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const d = snap.docs[0];
        setClientId(d.id);
        setClientData({ id: d.id, ...d.data() });
      }
      setLoading(false);
    });
    return unsub;
  }, [email]);

  // Visits
  useEffect(() => {
    if (!email) return;
    const q = query(
      collection(db, 'visits'),
      where('clientEmail', '==', email),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setVisits(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, () => {});
    return unsub;
  }, [email]);

  // Contracts
  useEffect(() => {
    if (!email) return;
    const q = query(
      collection(db, 'contracts'),
      where('clientEmail', '==', email),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setContracts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, () => {});
    return unsub;
  }, [email]);

  // Notifications (real-time)
  useEffect(() => {
    if (!email) return;
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', email),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, () => {});
    return unsub;
  }, [email]);

  return { clientId, clientData, visits, contracts, notifications, loading };
}

// ── useFavProperties hook (reads property docs from favorites array) ───────────
function useFavProperties(clientData) {
  const [props, setProps] = useState([]);
  const [loading, setLoading] = useState(false);
  const favIds = clientData?.favorites ?? [];

  useEffect(() => {
    if (!favIds.length) { setProps([]); return; }
    setLoading(true);
    // Fetch in batches of 10
    async function fetchProps() {
      const batches = [];
      for (let i = 0; i < favIds.length; i += 10) {
        batches.push(favIds.slice(i, i + 10));
      }
      const results = [];
      for (const batch of batches) {
        const q = query(collection(db, 'properties'), where('__name__', 'in', batch));
        const snap = await getDocs(q);
        snap.docs.forEach((d) => results.push({ id: d.id, ...d.data() }));
      }
      setProps(results);
      setLoading(false);
    }
    fetchProps().catch(() => setLoading(false));
  }, [JSON.stringify(favIds)]);

  return { props, loading };
}

// ── NotificationBell ──────────────────────────────────────────────────────────
function NotificationBell({ notifications, email }) {
  const [open, setOpen] = useState(false);
  const unread = notifications.filter((n) => !n.read).length;

  async function handleMarkAll() {
    await markAllAsRead(email);
  }
  async function handleRead(n) {
    if (!n.read) await markNotificationAsRead(n.id);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-slate-800/60 transition"
      >
        <FaBell className="text-lg" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-amber-500 text-slate-950 text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              className="absolute right-0 top-full mt-2 w-80 bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl z-40 overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                <span className="text-sm font-semibold text-white">Notificaciones</span>
                {unread > 0 && (
                  <button onClick={handleMarkAll} className="text-xs text-amber-400 hover:underline">
                    Marcar todas leídas
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-8">Sin notificaciones</p>
                ) : (
                  notifications.slice(0, 20).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleRead(n)}
                      className={`px-4 py-3 border-b border-slate-800/60 cursor-pointer hover:bg-slate-800/40 transition ${!n.read ? 'bg-amber-500/5' : ''}`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="text-base mt-0.5 flex-shrink-0">
                          {NOTIF_ICONS[n.type] || NOTIF_ICONS.default}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold truncate ${!n.read ? 'text-white' : 'text-slate-300'}`}>{n.title}</p>
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                          {n.createdAt && (
                            <p className="text-[10px] text-slate-600 mt-1">
                              {format(toDate(n.createdAt) || new Date(), "d MMM, HH:mm", { locale: es })}
                            </p>
                          )}
                        </div>
                        {!n.read && <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0 mt-1" />}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── UserMenu ──────────────────────────────────────────────────────────────────
function UserMenu({ user, userData, onProfile, onSignOut }) {
  const [open, setOpen] = useState(false);
  const name = userData?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Cliente';
  const photo = user?.photoURL || userData?.photoURL;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-slate-800/60 transition"
      >
        {photo ? (
          <img src={photo} alt={name} className="w-8 h-8 rounded-full object-cover border-2 border-amber-500/30" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-amber-500/20 border-2 border-amber-500/30 flex items-center justify-center text-amber-400 text-xs font-bold">
            {getInitials(name)}
          </div>
        )}
        <span className="hidden sm:block text-sm font-medium text-slate-300 max-w-[120px] truncate">{name.split(' ')[0]}</span>
        <FaChevronDown className={`text-slate-500 text-xs transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-48 bg-slate-900 border border-slate-700/60 rounded-xl shadow-xl z-40 overflow-hidden py-1"
            >
              <button
                onClick={() => { setOpen(false); onProfile(); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800/60 hover:text-white transition"
              >
                <FaUser className="text-xs text-slate-500" /> Mi perfil
              </button>
              <div className="mx-3 my-1 border-t border-slate-800" />
              <button
                onClick={() => { setOpen(false); onSignOut(); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition"
              >
                <FaSignOutAlt className="text-xs" /> Cerrar sesión
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Section: INICIO ───────────────────────────────────────────────────────────
function SectionInicio({ clientData, visits, contracts, favProps, setTab }) {
  const name = clientData?.nombre || 'Cliente';
  const nextVisit = visits.find((v) => v.status === 'approved' || v.status === 'pending');
  const kpis = [
    { label: 'Favoritos', value: (clientData?.favorites ?? []).length, icon: FaHeart, color: 'text-rose-400' },
    { label: 'Visitas', value: visits.length, icon: FaCalendarAlt, color: 'text-blue-400' },
    { label: 'Contratos', value: contracts.length, icon: FaFileContract, color: 'text-emerald-400' },
  ].filter((k) => k.value > 0);

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h2 className="text-2xl font-bold text-white">
          {getGreeting()}, <span className="text-amber-400">{name.split(' ')[0]}</span>! 👋
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          {format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es })}
        </p>
      </div>

      {/* KPIs */}
      {kpis.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {kpis.map((k) => (
            <div key={k.label} className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-4 text-center">
              <k.icon className={`${k.color} text-lg mx-auto mb-1`} />
              <p className="text-2xl font-bold text-white">{k.value}</p>
              <p className="text-xs text-slate-500">{k.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Next visit highlight */}
      {nextVisit && (
        <div className="relative overflow-hidden bg-gradient-to-r from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-2xl p-5">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-amber-500/5 blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-amber-400 font-semibold uppercase tracking-wider">Próxima visita</span>
              <Countdown dateStr={nextVisit.requestedDate} timeStr={nextVisit.requestedTime} />
            </div>
            <p className="text-white font-semibold">{nextVisit.propertyName || 'Propiedad'}</p>
            {nextVisit.propertyAddress && (
              <p className="text-slate-400 text-sm mt-0.5 flex items-center gap-1">
                <FaMapMarkerAlt className="text-[10px]" /> {nextVisit.propertyAddress}
              </p>
            )}
            {nextVisit.requestedDate && (
              <p className="text-slate-400 text-sm mt-1">
                {fmtDate(nextVisit.requestedDate)} {nextVisit.requestedTime && `· ${nextVisit.requestedTime}`}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Favorite properties preview */}
      {favProps.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-300">Tus favoritos</h3>
            <button onClick={() => setTab('favoritos')} className="text-xs text-amber-400 hover:underline flex items-center gap-1">
              Ver todos <FaArrowRight className="text-[10px]" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {favProps.slice(0, 3).map((p) => (
              <Link
                key={p.id}
                to={`/propiedades/${p.slug || p.id}`}
                className="group bg-slate-900/60 border border-slate-800/60 rounded-xl overflow-hidden hover:border-amber-500/30 transition"
              >
                <div className="h-24 bg-slate-800 overflow-hidden">
                  {p.images?.[0] && (
                    <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  )}
                </div>
                <div className="p-3">
                  <p className="text-white text-xs font-semibold truncate">{p.title}</p>
                  <p className="text-amber-400 text-xs font-bold mt-0.5">{formatCOP ? formatCOP(p.price) : `$${p.price?.toLocaleString()}`}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!nextVisit && favProps.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
            <FaHome className="text-amber-400 text-2xl" />
          </div>
          <h3 className="text-white font-semibold mb-2">Descubre tu próxima propiedad</h3>
          <p className="text-slate-400 text-sm mb-5 max-w-xs mx-auto">
            Explora nuestro catálogo y guarda las propiedades que más te interesen.
          </p>
          <Link
            to="/catalogo"
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-sm transition shadow-lg shadow-amber-500/20"
          >
            <FaSearch /> Explorar catálogo
          </Link>
        </div>
      )}
    </div>
  );
}

// ── Section: FAVORITOS ────────────────────────────────────────────────────────
function SectionFavoritos({ clientData, clientId, favProps, favLoading }) {
  async function removeFav(propertyId) {
    if (!clientId) return;
    const clientRef = doc(db, 'clients', clientId);
    const current = clientData?.favorites ?? [];
    await updateDoc(clientRef, { favorites: current.filter((id) => id !== propertyId) });
    toast('Eliminado de favoritos', { icon: '🗑️' });
  }

  if (favLoading) {
    return (
      <div className="flex justify-center py-16">
        <FaSpinner className="text-amber-500 text-2xl animate-spin" />
      </div>
    );
  }

  if (!favProps.length) {
    return (
      <div className="text-center py-14">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-4">
          <FaHeart className="text-rose-400 text-2xl" />
        </div>
        <h3 className="text-white font-semibold mb-2">Aún no tienes favoritos</h3>
        <p className="text-slate-400 text-sm mb-5">Explora el catálogo y guarda las propiedades que más te gusten.</p>
        <Link
          to="/catalogo"
          className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-sm transition"
        >
          <FaSearch /> Explorar catálogo
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-white">Mis favoritos <span className="text-slate-500 font-normal text-sm">({favProps.length})</span></h2>
        <Link to="/catalogo" className="text-xs text-amber-400 hover:underline flex items-center gap-1">
          <FaSearch className="text-[10px]" /> Explorar más
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {favProps.map((p) => (
          <motion.div
            key={p.id}
            layout
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900/60 border border-slate-800/60 rounded-2xl overflow-hidden hover:border-slate-700 transition group"
          >
            <div className="relative h-44 bg-slate-800 overflow-hidden">
              {p.images?.[0] ? (
                <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-700">
                  <FaHome className="text-3xl" />
                </div>
              )}
              <button
                onClick={() => removeFav(p.id)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-950/80 text-rose-400 hover:text-white hover:bg-rose-600 transition"
                title="Quitar de favoritos"
              >
                <FaHeart className="text-xs" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-white font-semibold text-sm truncate">{p.title}</p>
              {p.city && (
                <p className="text-slate-500 text-xs mt-0.5 flex items-center gap-1">
                  <FaMapMarkerAlt className="text-[9px]" /> {p.city}
                </p>
              )}
              <p className="text-amber-400 font-bold mt-1.5">{formatCOP ? formatCOP(p.price) : `$${p.price?.toLocaleString()}`}</p>
              <div className="flex items-center gap-3 mt-2 text-slate-500 text-xs">
                {p.bedrooms  && <span className="flex items-center gap-1"><FaBed />{p.bedrooms}</span>}
                {p.bathrooms && <span className="flex items-center gap-1"><FaBath />{p.bathrooms}</span>}
                {p.area      && <span className="flex items-center gap-1"><FaRulerCombined />{p.area}m²</span>}
              </div>
              <Link
                to={`/propiedades/${p.slug || p.id}`}
                className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 border border-amber-500/30 hover:border-amber-500/50 rounded-lg py-2 transition"
              >
                Ver propiedad <FaArrowRight className="text-[9px]" />
              </Link>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ── Section: VISITAS ──────────────────────────────────────────────────────────
function SectionVisitas({ visits }) {
  const next = visits.find((v) => ['approved', 'pending'].includes(v.status));
  const rest = visits.filter((v) => v !== next);
  const WA_NUMBER = '573000000000'; // reemplazar con número real

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Mis visitas</h2>
        <Link
          to="/agendar-visita"
          className="inline-flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-xs font-semibold px-3 py-2 rounded-xl transition"
        >
          <FaCalendarCheck className="text-[10px]" /> Agendar visita
        </Link>
      </div>

      {visits.length === 0 && (
        <div className="text-center py-12">
          <FaCalendarAlt className="text-slate-700 text-3xl mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Aún no tienes visitas agendadas.</p>
          <Link to="/agendar-visita" className="inline-block mt-4 text-amber-400 hover:underline text-sm">Agendar una visita →</Link>
        </div>
      )}

      {/* Next visit card */}
      {next && (
        <div className="relative overflow-hidden bg-gradient-to-br from-amber-500/8 to-amber-600/4 border border-amber-500/20 rounded-2xl p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-amber-400 font-semibold uppercase tracking-wider">Próxima visita</span>
                <Countdown dateStr={next.requestedDate} timeStr={next.requestedTime} />
              </div>
              <p className="text-white font-bold">{next.propertyName}</p>
              {next.propertyAddress && (
                <p className="text-slate-400 text-xs mt-0.5 flex items-center gap-1">
                  <FaMapMarkerAlt className="text-[9px]" /> {next.propertyAddress}
                </p>
              )}
              <p className="text-slate-400 text-sm mt-1.5">
                {fmtDate(next.requestedDate)}
                {next.requestedTime && ` · ${next.requestedTime}`}
              </p>
              {next.agentName && (
                <p className="text-slate-500 text-xs mt-1">Agente: {next.agentName}</p>
              )}
            </div>
            <div className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${VS[next.status]?.bg} ${VS[next.status]?.color} ${VS[next.status]?.border}`}>
              {VS[next.status]?.label || next.status}
            </div>
          </div>
        </div>
      )}

      {/* Visit list */}
      {rest.map((v) => {
        const cfg = VS[v.status] || VS.pending;
        const Icon = cfg.icon;
        return (
          <div key={v.id} className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-4 flex items-start gap-3">
            <div className={`w-9 h-9 rounded-xl ${cfg.bg} border ${cfg.border} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`${cfg.color} text-sm`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">{v.propertyName || 'Propiedad'}</p>
              <p className="text-slate-500 text-xs mt-0.5">
                {fmtDate(v.requestedDate)}{v.requestedTime && ` · ${v.requestedTime}`}
              </p>
              {v.status === 'rescheduled' && v.newDate && (
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-xs text-orange-300">Nueva fecha: {fmtDate(v.newDate)}</span>
                  <a
                    href={`https://wa.me/${WA_NUMBER}?text=Confirmo%20mi%20visita%20reprogramada%20para%20${v.newDate}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-lg hover:bg-emerald-500/10 transition"
                  >
                    <FaWhatsapp /> Confirmar
                  </a>
                </div>
              )}
            </div>
            <span className={`text-xs font-semibold ${cfg.color} flex-shrink-0`}>{cfg.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Section: CONTRATOS ────────────────────────────────────────────────────────
function SectionContratos({ contracts }) {
  const total = contracts.reduce((s, c) => s + (parseFloat(c.value) || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Mis contratos</h2>
        {total > 0 && (
          <div className="text-right">
            <p className="text-xs text-slate-500">Valor total</p>
            <p className="text-amber-400 font-bold text-sm">{formatCOP ? formatCOP(total) : `$${total.toLocaleString()}`}</p>
          </div>
        )}
      </div>

      {contracts.length === 0 && (
        <div className="text-center py-12">
          <FaFileContract className="text-slate-700 text-3xl mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Aún no tienes contratos registrados.</p>
        </div>
      )}

      {contracts.map((c) => (
        <div key={c.id} className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-white font-semibold">{c.propertyName || 'Propiedad'}</p>
              {c.propertyAddress && (
                <p className="text-slate-500 text-xs mt-0.5 flex items-center gap-1">
                  <FaMapMarkerAlt className="text-[9px]" /> {c.propertyAddress}
                </p>
              )}
            </div>
            <ContractStatusBadge status={c.status} />
          </div>
          <div className="flex items-center gap-2 mb-3">
            <ContractTypeBadge type={c.type} />
            {c.value && (
              <span className="text-amber-400 font-bold text-sm">{formatCOP ? formatCOP(c.value) : `$${Number(c.value).toLocaleString()}`}</span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
            {c.startDate && <div><span className="text-slate-600">Inicio: </span>{fmtDate(c.startDate)}</div>}
            {c.endDate && <div><span className="text-slate-600">Fin: </span>{fmtDate(c.endDate)}</div>}
          </div>
          {c.documentUrl && (
            <a
              href={c.documentUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 border border-blue-500/20 px-3 py-1.5 rounded-lg hover:bg-blue-500/10 transition"
            >
              <FaDownload /> Descargar documento
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Section: PERFIL ───────────────────────────────────────────────────────────
function SectionPerfil({ user, userData, clientData, clientId }) {
  const isGoogle = user?.providerData?.[0]?.providerId === 'google.com';
  const [form, setForm] = useState({
    nombre: clientData?.nombre || userData?.displayName || '',
    telefono: clientData?.telefono || userData?.phone || '',
    ubicacionInteres: clientData?.ubicacionInteres || '',
    presupuesto: clientData?.presupuesto || '',
    tipoPropiedad: clientData?.tipoPropiedad || '',
  });
  const [saving, setSaving] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Update form when clientData changes
  useEffect(() => {
    if (clientData) {
      setForm({
        nombre: clientData.nombre || '',
        telefono: clientData.telefono || '',
        ubicacionInteres: clientData.ubicacionInteres || '',
        presupuesto: clientData.presupuesto || '',
        tipoPropiedad: clientData.tipoPropiedad || '',
      });
    }
  }, [clientData?.id]);

  async function handleSave() {
    setSaving(true);
    try {
      const updates = {
        nombre: form.nombre,
        telefono: form.telefono,
        ubicacionInteres: form.ubicacionInteres,
        presupuesto: form.presupuesto,
        tipoPropiedad: form.tipoPropiedad,
        updatedAt: serverTimestamp(),
      };
      if (clientId) await updateDoc(doc(db, 'clients', clientId), updates);
      // Also update users/{email}
      await updateDoc(doc(db, 'users', user.email), {
        displayName: form.nombre,
        phone: form.telefono,
        updatedAt: serverTimestamp(),
      });
      toast.success('Perfil actualizado');
    } catch (err) {
      toast.error('Error al guardar cambios');
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordReset() {
    try {
      await sendPasswordResetEmail(auth, user.email);
      setResetSent(true);
      toast.success('Email de restablecimiento enviado');
    } catch {
      toast.error('Error al enviar el email');
    }
  }

  const photo = user?.photoURL;
  const name = form.nombre || user?.email?.split('@')[0] || '?';

  return (
    <div className="space-y-6 max-w-lg">
      <h2 className="text-lg font-bold text-white">Mi perfil</h2>

      {/* Avatar */}
      <div className="flex items-center gap-4">
        {photo ? (
          <img src={photo} alt={name} className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-500/30" />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border-2 border-amber-500/20 flex items-center justify-center text-amber-400 text-xl font-bold">
            {getInitials(name)}
          </div>
        )}
        <div>
          <p className="text-white font-semibold">{name}</p>
          <p className="text-slate-500 text-sm">{user?.email}</p>
          {isGoogle && <span className="text-xs text-blue-400 mt-0.5 block">Cuenta de Google</span>}
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-3.5">
        <div>
          <label className="block text-xs text-slate-400 mb-1.5 font-medium">Nombre completo</label>
          <input
            value={form.nombre}
            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
            className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1.5 font-medium">Teléfono</label>
          <input
            value={form.telefono}
            onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
            className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition"
            placeholder="Ej: 3001234567"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1.5 font-medium">Email</label>
          <input
            value={user?.email || ''}
            disabled
            className="w-full bg-slate-800/30 border border-slate-700/40 rounded-xl px-4 py-2.5 text-sm text-slate-500 cursor-not-allowed"
          />
        </div>
      </div>

      {/* Preferences */}
      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Preferencias de búsqueda</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Zona de interés</label>
            <input
              value={form.ubicacionInteres}
              onChange={(e) => setForm((f) => ({ ...f, ubicacionInteres: e.target.value }))}
              placeholder="Ej: Laureles, El Poblado"
              className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 transition"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Presupuesto máximo</label>
            <input
              value={form.presupuesto}
              onChange={(e) => setForm((f) => ({ ...f, presupuesto: e.target.value }))}
              placeholder="Ej: 500.000.000"
              className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 transition"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Tipo de propiedad</label>
            <select
              value={form.tipoPropiedad}
              onChange={(e) => setForm((f) => ({ ...f, tipoPropiedad: e.target.value }))}
              className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/60 transition"
            >
              <option value="">Sin preferencia</option>
              <option value="Apartamento">Apartamento</option>
              <option value="Casa">Casa</option>
              <option value="Local">Local comercial</option>
              <option value="Oficina">Oficina</option>
              <option value="Lote">Lote</option>
              <option value="Bodega">Bodega</option>
            </select>
          </div>
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-sm transition shadow-lg shadow-amber-500/20 disabled:opacity-60"
      >
        {saving ? <FaSpinner className="animate-spin" /> : <FaSave />}
        {saving ? 'Guardando...' : 'Guardar cambios'}
      </button>

      {/* Password reset */}
      {!isGoogle && (
        <div className="border-t border-slate-800 pt-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Seguridad</h3>
          {resetSent ? (
            <p className="text-emerald-400 text-sm flex items-center gap-1.5">
              <FaCheckCircle /> Email enviado. Revisa tu bandeja de entrada.
            </p>
          ) : (
            <button
              onClick={handlePasswordReset}
              className="text-sm text-amber-400 hover:underline"
            >
              Cambiar contraseña →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── MAIN: ClientPortal ─────────────────────────────────────────────────────────
export default function ClientPortal() {
  const { currentUser, userData, signOut: authSignOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('inicio');

  const email = currentUser?.email;
  const { clientId, clientData, visits, contracts, notifications, loading } = useClientData(email);
  const { props: favProps, loading: favLoading } = useFavProperties(clientData);

  // Determine which tabs to show
  const visibleTabs = useMemo(() => {
    return TAB_DEFS.filter((t) => {
      if (t.always) return true;
      if (t.id === 'visitas')   return visits.length > 0;
      if (t.id === 'contratos') return contracts.length > 0;
      return false;
    });
  }, [visits.length, contracts.length]);

  // If active tab becomes hidden, go to inicio
  useEffect(() => {
    if (!visibleTabs.find((t) => t.id === activeTab)) setActiveTab('inicio');
  }, [visibleTabs, activeTab]);

  async function handleSignOut() {
    try {
      await signOut(auth);
      navigate('/acceso-clientes');
    } catch {
      toast.error('Error al cerrar sesión');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <FaSpinner className="text-amber-500 text-3xl animate-spin" />
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-slate-950">
      {/* ── NAVBAR ─────────────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/60">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <img src="/logo-ryb.png" alt="R&B" className="h-7 object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
            <span className="text-amber-400 font-bold text-xs tracking-wide hidden sm:block">R&B INMOBILIARIA</span>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <NotificationBell notifications={notifications} email={email} />
            <UserMenu
              user={currentUser}
              userData={userData}
              onProfile={() => setActiveTab('perfil')}
              onSignOut={handleSignOut}
            />
          </div>
        </div>
      </header>

      {/* ── TABS ───────────────────────────────────────────────────────────── */}
      <div className="fixed top-14 left-0 right-0 z-40 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/40">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex overflow-x-auto scrollbar-hide">
            {visibleTabs.map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
                    isActive
                      ? 'border-amber-500 text-amber-400'
                      : 'border-transparent text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Icon className={`text-xs ${isActive ? 'text-amber-400' : 'text-slate-600'}`} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── CONTENT ────────────────────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-4 pt-32 pb-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'inicio' && (
              <SectionInicio
                clientData={clientData}
                visits={visits}
                contracts={contracts}
                favProps={favProps}
                setTab={setActiveTab}
              />
            )}
            {activeTab === 'favoritos' && (
              <SectionFavoritos
                clientData={clientData}
                clientId={clientId}
                favProps={favProps}
                favLoading={favLoading}
              />
            )}
            {activeTab === 'visitas' && (
              <SectionVisitas visits={visits} />
            )}
            {activeTab === 'contratos' && (
              <SectionContratos contracts={contracts} />
            )}
            {activeTab === 'perfil' && (
              <SectionPerfil
                user={currentUser}
                userData={userData}
                clientData={clientData}
                clientId={clientId}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}