// src/modules/users/components/UserDetailPanel.jsx
// Drawer lateral con vista completa del usuario
// Tabs: Perfil — Métricas — Actividad — Contratos

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import { db } from '../../../core/config/firebase.config';
import {
  FaTimes,
  FaEnvelope,
  FaPhone,
  FaCalendarAlt,
  FaEdit,
  FaToggleOn,
  FaToggleOff,
  FaKey,
  FaHome,
  FaCalendarCheck,
  FaFileContract,
  FaChartBar,
  FaHistory,
  FaCheckCircle,
  FaClock,
  FaTimesCircle as FaX,
  FaCircle,
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaBuilding,
} from 'react-icons/fa';
import {
  USER_ROLES,
  USER_ROLE_LABELS,
  USER_ROLE_BADGE_CLASSES,
  USER_ROLE_DESCRIPTIONS,
} from '../types/user.types';
import {
  ROLE_ICONS,
  ROLE_ICON_CLASSES,
  STATUS_STYLES,
  STATUS_LABELS,
} from '../utils/user.utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (ts) => {
  if (!ts) return null;
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
};

const fmtShort = (ts) => {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
};

const fmtCOP = (value) => {
  if (!value) return null;
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
};

const CONTRACT_STATUS_STYLES = {
  vigente: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  borrador: 'bg-slate-500/15 text-slate-400 border-slate-500/25',
  vencido: 'bg-rose-500/15 text-rose-400 border-rose-500/25',
  cancelado: 'bg-rose-500/15 text-rose-400 border-rose-500/25',
};

const ACTIVITY_ICONS = {
  visit_approved: <FaCheckCircle className="text-emerald-400 text-xs" />,
  visit_rejected: <FaX className="text-rose-400 text-xs" />,
  visit_created: <FaCalendarCheck className="text-blue-400 text-xs" />,
  contract_signed: <FaFileContract className="text-primary text-xs" />,
  property_added: <FaHome className="text-amber-400 text-xs" />,
  default: <FaHistory className="text-slate-500 text-xs" />,
};

const VISIT_STATUS = {
  approved: { label: 'Aprobada', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' },
  pending: { label: 'Pendiente', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
  rejected: { label: 'Rechazada', cls: 'bg-rose-500/15 text-rose-400 border-rose-500/25' },
  completed: { label: 'Completada', cls: 'bg-blue-500/15 text-blue-400 border-blue-500/25' },
  rescheduled: { label: 'Reagendada', cls: 'bg-orange-500/15 text-orange-400 border-orange-500/25' },
  cancelada: { label: 'Cancelada', cls: 'bg-rose-500/15 text-rose-400 border-rose-500/25' },
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KpiCard = ({ icon: Icon, iconBgClass, iconClass, value, label, sublabel }) => (
  <div className="rounded-2xl p-4 border border-white/[0.06] bg-white/[0.04] flex flex-col items-center text-center gap-1.5 hover:bg-white/[0.07] transition-colors">
    <div className={`w-10 h-10 rounded-xl ${iconBgClass} flex items-center justify-center mb-0.5`}>
      <Icon className={`${iconClass} text-base`} />
    </div>
    <p className={`text-2xl font-bold tabular-nums ${iconClass}`}>{value ?? '–'}</p>
    <p className="text-xs text-slate-300 font-semibold leading-tight">{label}</p>
    {sublabel && <p className="text-xs text-slate-500">{sublabel}</p>}
  </div>
);

// ─── Info row ─────────────────────────────────────────────────────────────────
const InfoRow = ({ icon: Icon, label, value }) => {
  if (!value) return null;

  return (
    <div className="flex items-center gap-3 py-3 border-b border-white/[0.05] last:border-0">
      <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center flex-shrink-0">
        <Icon className="text-slate-400 text-xs" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-slate-500 font-medium">{label}</p>
        <p className="text-sm text-slate-200 font-medium truncate">{value}</p>
      </div>
    </div>
  );
};

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionLabel = ({ children }) => (
  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">
    {children}
  </p>
);

// ─── Loading Spinner ──────────────────────────────────────────────────────────
const TabLoader = ({ message }) => (
  <div className="text-center py-16">
    <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
    {message && <p className="text-slate-500 text-xs">{message}</p>}
  </div>
);

// ─── Empty State ──────────────────────────────────────────────────────────────
const EmptyState = ({ icon: Icon, title, subtitle }) => (
  <div className="text-center py-20">
    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
      <Icon className="text-slate-600 text-2xl" />
    </div>
    <p className="text-slate-400 text-sm font-semibold">{title}</p>
    {subtitle && <p className="text-slate-600 text-xs mt-1.5">{subtitle}</p>}
  </div>
);

// ─── Panel especial para clientes del portal (role = viewer) ──────────────────
const ViewerDetailPanel = ({ user, isOpen, onClose, onChangeStatus }) => {
  const [clientData, setClientData] = useState(null);
  const [visits, setVisits] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !user?.email) return;

    setClientData(null);
    setVisits([]);
    setContracts([]);
    setLoading(true);

    let cancelled = false;
    const unsubs = [];

    unsubs.push(
      onSnapshot(
        query(collection(db, 'clients'), where('email', '==', user.email)),
        (snap) => {
          if (cancelled) return;
          if (!snap.empty) setClientData({ id: snap.docs[0].id, ...snap.docs[0].data() });
          setLoading(false);
        },
        () => {
          if (!cancelled) setLoading(false);
        }
      )
    );

    unsubs.push(
      onSnapshot(
        query(
          collection(db, 'visits'),
          where('clientEmail', '==', user.email),
          orderBy('createdAt', 'desc'),
          limit(10)
        ),
        (snap) => {
          if (cancelled) return;
          setVisits(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        },
        () => {}
      )
    );

    unsubs.push(
      onSnapshot(
        query(
          collection(db, 'contracts'),
          where('clientEmail', '==', user.email),
          orderBy('createdAt', 'desc'),
          limit(10)
        ),
        (snap) => {
          if (cancelled) return;
          setContracts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        },
        () => {}
      )
    );

    return () => {
      cancelled = true;
      unsubs.forEach((fn) => fn());
    };
  }, [user?.email, isOpen]);

  if (!user) return null;

  const displayName = user.displayName || user.email || 'Cliente';
  const initial = displayName.charAt(0).toUpperCase();
  const totalValue = contracts.reduce((s, c) => s + (parseFloat(c.value) || 0), 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="vbackdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          <motion.aside
            key="vpanel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            className="fixed right-0 top-0 h-full w-full max-w-[420px] bg-[#0d1117] border-l border-white/[0.07] z-50 flex flex-col shadow-2xl"
          >
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent pointer-events-none" />
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

              <div className="relative flex items-start gap-4 px-5 pt-6 pb-5">
                <div className="relative flex-shrink-0">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={displayName}
                      className="w-16 h-16 rounded-2xl object-cover ring-2 ring-white/10"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center text-2xl font-bold text-amber-400 ring-2 ring-white/10">
                      {initial}
                    </div>
                  )}

                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[9px] font-bold rounded-full whitespace-nowrap">
                    Portal cliente
                  </span>
                </div>

                <div className="flex-1 min-w-0 pt-0.5">
                  <h2 className="text-base font-bold text-white truncate leading-tight">
                    {displayName}
                  </h2>
                  <p className="text-xs text-slate-400 truncate mt-0.5 mb-2.5">{user.email}</p>

                  <div className="flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      👤 Cliente portal
                    </span>

                    {user.status && (
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium border ${
                          STATUS_STYLES[user.status] ?? STATUS_STYLES.inactive
                        }`}
                      >
                        {STATUS_LABELS[user.status] ?? user.status}
                      </span>
                    )}

                    {clientData?.createdViaPortal && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        🌐 Auto-registro
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={onClose}
                  aria-label="Cerrar panel"
                  className="w-8 h-8 rounded-xl hover:bg-white/[0.08] text-slate-500 hover:text-white transition-colors flex items-center justify-center flex-shrink-0"
                >
                  <FaTimes className="text-sm" />
                </button>
              </div>

              {onChangeStatus && (
                <div className="relative px-5 pb-5">
                  <button
                    onClick={() => onChangeStatus(user)}
                    className={`w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                      user.status === 'active'
                        ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/20 hover:border-amber-500/40'
                        : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20 hover:border-emerald-500/40'
                    }`}
                  >
                    {user.status === 'active' ? (
                      <>
                        <FaToggleOff className="text-sm" /> Desactivar acceso al portal
                      </>
                    ) : (
                      <>
                        <FaToggleOn className="text-sm" /> Activar acceso al portal
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {loading ? (
                <TabLoader message="Cargando datos del cliente..." />
              ) : (
                <div className="p-5 space-y-6">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      {
                        label: 'Favoritos',
                        value: (clientData?.favorites ?? []).length,
                        color: 'text-rose-400',
                        bg: 'bg-rose-500/10 border-rose-500/15',
                      },
                      {
                        label: 'Visitas',
                        value: visits.length,
                        color: 'text-blue-400',
                        bg: 'bg-blue-500/10 border-blue-500/15',
                      },
                      {
                        label: 'Contratos',
                        value: contracts.length,
                        color: 'text-emerald-400',
                        bg: 'bg-emerald-500/10 border-emerald-500/15',
                      },
                    ].map(({ label, value, color, bg }) => (
                      <div key={label} className={`${bg} rounded-2xl p-3.5 text-center border`}>
                        <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>

                  {totalValue > 0 && (
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-500/5 border border-amber-500/15">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
                          <FaMoneyBillWave className="text-amber-400 text-xs" />
                        </div>
                        <p className="text-xs text-slate-400 font-medium">
                          Valor total en contratos
                        </p>
                      </div>
                      <p className="text-amber-400 font-bold text-sm">{fmtCOP(totalValue)}</p>
                    </div>
                  )}

                  <div>
                    <SectionLabel>Información de contacto</SectionLabel>
                    <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] px-4 py-1">
                      <InfoRow icon={FaEnvelope} label="Correo electrónico" value={user.email} />
                      <InfoRow
                        icon={FaPhone}
                        label="Teléfono"
                        value={clientData?.telefono || user.phone}
                      />
                      <InfoRow icon={FaCalendarAlt} label="Registrado" value={fmt(user.createdAt)} />
                      <InfoRow icon={FaCalendarAlt} label="Última sesión" value={fmt(user.lastSeen)} />
                      <InfoRow
                        icon={FaMapMarkerAlt}
                        label="Zona de interés"
                        value={clientData?.ubicacionInteres}
                      />
                      <InfoRow
                        icon={FaMoneyBillWave}
                        label="Presupuesto"
                        value={clientData?.presupuesto}
                      />
                      <InfoRow
                        icon={FaBuilding}
                        label="Tipo de propiedad"
                        value={clientData?.tipoPropiedad}
                      />
                    </div>
                  </div>

                  {visits.length > 0 && (
                    <div>
                      <SectionLabel>Visitas recientes ({visits.length})</SectionLabel>
                      <div className="space-y-2">
                        {visits.slice(0, 6).map((v) => {
                          const cfg = VISIT_STATUS[v.status] ?? {
                            label: v.status || '–',
                            cls: 'bg-slate-700/40 text-slate-400 border-slate-700/50',
                          };

                          return (
                            <div
                              key={v.id}
                              className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.06] transition-colors"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-200 truncate">
                                  {v.propertyName || 'Propiedad'}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {v.requestedDate || '—'}
                                  {v.requestedTime ? ` · ${v.requestedTime}` : ''}
                                </p>
                                {v.agentName && (
                                  <p className="text-[10px] text-slate-600 mt-0.5">
                                    Agente: {v.agentName}
                                  </p>
                                )}
                              </div>

                              <span
                                className={`text-xs px-2.5 py-1 rounded-lg border font-semibold flex-shrink-0 ${cfg.cls}`}
                              >
                                {cfg.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {contracts.length > 0 && (
                    <div>
                      <SectionLabel>Contratos ({contracts.length})</SectionLabel>
                      <div className="space-y-2">
                        {contracts.slice(0, 5).map((c) => (
                          <div
                            key={c.id}
                            className="p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.07] transition-colors"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-slate-200 truncate">
                                  {c.propertyName || 'Propiedad'}
                                </p>
                                {c.type && <p className="text-xs text-slate-500 mt-0.5">{c.type}</p>}
                                {c.value && (
                                  <p className="text-xs text-amber-400 font-bold mt-1">
                                    {fmtCOP(c.value)}
                                  </p>
                                )}
                              </div>

                              <span
                                className={`text-xs px-2.5 py-1 rounded-lg border font-semibold flex-shrink-0 ${
                                  CONTRACT_STATUS_STYLES[c.status] ?? CONTRACT_STATUS_STYLES.borrador
                                }`}
                              >
                                {c.status
                                  ? c.status.charAt(0).toUpperCase() + c.status.slice(1)
                                  : 'Borrador'}
                              </span>
                            </div>

                            {c.endDate && (
                              <div className="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-white/[0.05]">
                                <FaClock className="text-slate-600 text-xs flex-shrink-0" />
                                <p className="text-xs text-slate-500">Vence: {fmt(c.endDate)}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {visits.length === 0 && contracts.length === 0 && (
                    <div className="text-center py-10">
                      <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                        <FaHome className="text-amber-400 text-xl" />
                      </div>
                      <p className="text-slate-400 text-sm font-semibold">Cliente nuevo</p>
                      <p className="text-slate-600 text-xs mt-1.5">
                        Aún no tiene visitas ni contratos registrados.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────
const UserDetailPanel = ({
  user,
  isOpen,
  onClose,
  onEdit,
  onChangeStatus,
  onResetPassword,
}) => {
  if (user?.role === USER_ROLES.VIEWER) {
    return (
      <ViewerDetailPanel
        user={user}
        isOpen={isOpen}
        onClose={onClose}
        onChangeStatus={onChangeStatus}
      />
    );
  }

  const [activeTab, setActiveTab] = useState('profile');
  const [stats, setStats] = useState({
    properties: 0,
    visits: 0,
    contracts: 0,
    contractsActive: 0,
  });
  const [visits, setVisits] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !user?.email) return;

    setActiveTab('profile');
    setStats({ properties: 0, visits: 0, contracts: 0, contractsActive: 0 });
    setVisits([]);
    setContracts([]);
    setActivity([]);
    setLoading(true);

    let cancelled = false;
    const unsubs = [];

    const loadData = async () => {
      try {
        const propsSnap = await getDocs(
          query(collection(db, 'properties'), where('agentEmail', '==', user.email))
        );

        if (!cancelled) {
          setStats((prev) => ({ ...prev, properties: propsSnap.size }));
        }

        unsubs.push(
          onSnapshot(
            query(
              collection(db, 'visits'),
              where('agentEmail', '==', user.email),
              orderBy('createdAt', 'desc'),
              limit(20)
            ),
            (snap) => {
              if (cancelled) return;
              const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
              setVisits(data);
              setStats((prev) => ({ ...prev, visits: snap.size }));
            },
            (err) => console.warn('visits snapshot:', err.code)
          )
        );

        unsubs.push(
          onSnapshot(
            query(
              collection(db, 'contracts'),
              where('agentEmail', '==', user.email),
              orderBy('createdAt', 'desc'),
              limit(20)
            ),
            (snap) => {
              if (cancelled) return;
              const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
              setContracts(data);
              setStats((prev) => ({
                ...prev,
                contracts: snap.size,
                contractsActive: data.filter((c) => c.status === 'vigente').length,
              }));
            },
            (err) => console.warn('contracts snapshot:', err.code)
          )
        );

        unsubs.push(
          onSnapshot(
            query(
              collection(db, 'notifications'),
              where('userId', '==', user.email),
              orderBy('createdAt', 'desc'),
              limit(15)
            ),
            (snap) => {
              if (cancelled) return;
              setActivity(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
            },
            (err) => console.warn('activity snapshot:', err.code)
          )
        );
      } catch (err) {
        console.error('UserDetailPanel loadData:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();

    return () => {
      cancelled = true;
      unsubs.forEach((fn) => fn());
    };
  }, [user?.email, isOpen]);

  if (!user) return null;

  const roleBadge =
    USER_ROLE_BADGE_CLASSES[user.role] ?? USER_ROLE_BADGE_CLASSES[USER_ROLES.VIEWER];

  const displayName = user.displayName || user.email || 'Usuario';
  const initial = displayName.charAt(0).toUpperCase();

  const RoleIcon = ROLE_ICONS[user.role] || ROLE_ICONS[USER_ROLES.VIEWER];
  const roleIconClass =
    ROLE_ICON_CLASSES[user.role] || ROLE_ICON_CLASSES[USER_ROLES.VIEWER];

  const TABS = [
    { id: 'profile', label: 'Perfil', icon: <FaEnvelope className="text-xs" /> },
    { id: 'performance', label: 'Métricas', icon: <FaChartBar className="text-xs" /> },
    { id: 'activity', label: 'Actividad', icon: <FaHistory className="text-xs" /> },
    { id: 'contracts', label: 'Contratos', icon: <FaFileContract className="text-xs" /> },
  ];

  const roleGradient =
    {
      [USER_ROLES.ADMIN]: 'from-rose-500/20 via-rose-500/5 to-transparent',
      [USER_ROLES.MEMBER]: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
      [USER_ROLES.VIEWER]: 'from-slate-500/15 via-slate-500/5 to-transparent',
    }[user.role] ?? 'from-slate-500/10 to-transparent';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          <motion.aside
            key="panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            className="fixed right-0 top-0 h-full w-full max-w-[420px] bg-[#0d1117] border-l border-white/[0.07] z-50 flex flex-col shadow-2xl"
          >
            <div className="relative flex-shrink-0">
              <div
                className={`absolute inset-0 bg-gradient-to-br ${roleGradient} pointer-events-none`}
              />
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

              <div className="relative flex items-start gap-4 px-5 pt-6 pb-5">
                <div className="relative flex-shrink-0">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={displayName}
                      className="w-16 h-16 rounded-2xl object-cover ring-2 ring-white/10"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/30 to-blue-600/20 flex items-center justify-center text-2xl font-bold text-white ring-2 ring-white/10">
                      {initial}
                    </div>
                  )}

                  {user.online && (
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#0d1117] shadow-lg shadow-emerald-500/40" />
                  )}
                </div>

                <div className="flex-1 min-w-0 pt-0.5">
                  <h2 className="text-base font-bold text-white truncate leading-tight tracking-tight">
                    {displayName}
                  </h2>
                  <p className="text-xs text-slate-400 truncate mt-0.5 mb-2.5">{user.email}</p>

                  <div className="flex flex-wrap gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${roleBadge}`}
                    >
                      {RoleIcon && <RoleIcon className={roleIconClass} />}
                      {USER_ROLE_LABELS[user.role] ?? 'Sin rol'}
                    </span>

                    {user.online ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                        <FaCircle className="text-[6px]" /> En línea
                      </span>
                    ) : user.lastSeen ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-slate-400 border border-white/[0.07] bg-white/[0.04]">
                        {fmtShort(user.lastSeen)}
                      </span>
                    ) : null}

                    {user.status && (
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium border ${
                          STATUS_STYLES[user.status] ?? STATUS_STYLES.inactive
                        }`}
                      >
                        {STATUS_LABELS[user.status] ?? user.status}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={onClose}
                  aria-label="Cerrar panel"
                  className="w-8 h-8 rounded-xl hover:bg-white/[0.08] text-slate-500 hover:text-white transition-colors flex items-center justify-center flex-shrink-0"
                >
                  <FaTimes className="text-sm" />
                </button>
              </div>

              {(onEdit || onChangeStatus || onResetPassword) && (
                <div className="relative flex gap-2 px-5 pb-5">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(user)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs font-semibold transition-all border border-primary/20 hover:border-primary/40"
                    >
                      <FaEdit className="text-xs" /> Editar perfil
                    </button>
                  )}

                  {onChangeStatus && (
                    <button
                      onClick={() => onChangeStatus(user)}
                      className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                        user.status === 'active'
                          ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/20 hover:border-amber-500/40'
                          : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20 hover:border-emerald-500/40'
                      }`}
                    >
                      {user.status === 'active' ? (
                        <>
                          <FaToggleOff className="text-sm" /> Desactivar
                        </>
                      ) : (
                        <>
                          <FaToggleOn className="text-sm" /> Activar
                        </>
                      )}
                    </button>
                  )}

                  {onResetPassword && (
                    <button
                      onClick={() => onResetPassword(user)}
                      title="Resetear contraseña"
                      className="w-10 inline-flex items-center justify-center py-2.5 bg-white/[0.05] hover:bg-white/[0.09] text-slate-400 hover:text-white rounded-xl text-xs transition-all border border-white/[0.07]"
                    >
                      <FaKey className="text-xs" />
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex border-b border-white/[0.06] flex-shrink-0 bg-black/20">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex flex-col items-center gap-1 py-3 text-[11px] font-semibold transition-colors relative ${
                    activeTab === tab.id ? 'text-white' : 'text-slate-600 hover:text-slate-400'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-t-full"
                    />
                  )}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              <AnimatePresence mode="wait">
                {activeTab === 'profile' && (
                  <motion.div
                    key="profile"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="p-5 space-y-6"
                  >
                    <section>
                      <SectionLabel>Rol y acceso</SectionLabel>
                      <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                        <div className="flex items-center gap-2.5 mb-2">
                          {RoleIcon && <RoleIcon className={roleIconClass} />}
                          <span className="text-white font-bold text-sm">
                            {USER_ROLE_LABELS[user.role] ?? 'Sin rol'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {USER_ROLE_DESCRIPTIONS[user.role] ?? 'Sin descripción de rol'}
                        </p>
                      </div>
                    </section>

                    <section>
                      <SectionLabel>Información de contacto</SectionLabel>
                      <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] px-4 py-1">
                        <InfoRow icon={FaEnvelope} label="Correo electrónico" value={user.email} />
                        <InfoRow icon={FaPhone} label="Teléfono" value={user.phone} />
                        <InfoRow icon={FaCalendarAlt} label="Miembro desde" value={fmt(user.createdAt)} />
                        <InfoRow icon={FaCalendarAlt} label="Última sesión" value={fmt(user.lastSeen)} />
                      </div>
                    </section>

                    {loading ? (
                      <TabLoader message="Cargando visitas..." />
                    ) : visits.length > 0 ? (
                      <section>
                        <SectionLabel>Visitas recientes</SectionLabel>
                        <div className="space-y-2">
                          {visits.slice(0, 4).map((v) => {
                            const st = VISIT_STATUS[v.status] ?? {
                              label: v.status || '–',
                              cls: 'bg-slate-700/40 text-slate-400 border-slate-700/50',
                            };

                            return (
                              <div
                                key={v.id}
                                className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.06] transition-colors"
                              >
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-slate-200 truncate">
                                    {v.propertyName || 'Propiedad'}
                                  </p>
                                  <p className="text-xs text-slate-500 truncate mt-0.5">
                                    {v.clientName || v.clientEmail || '–'}
                                  </p>
                                </div>
                                <span
                                  className={`text-xs px-2.5 py-1 rounded-lg border font-semibold flex-shrink-0 ${st.cls}`}
                                >
                                  {st.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    ) : null}
                  </motion.div>
                )}

                {activeTab === 'performance' && (
                  <motion.div
                    key="performance"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="p-5 space-y-6"
                  >
                    {loading ? (
                      <TabLoader message="Calculando estadísticas..." />
                    ) : (
                      <>
                        <section>
                          <SectionLabel>Resumen de actividad</SectionLabel>
                          <div className="grid grid-cols-2 gap-3">
                            <KpiCard
                              icon={FaHome}
                              iconBgClass="bg-amber-500/15"
                              iconClass="text-amber-400"
                              value={stats.properties}
                              label="Propiedades"
                              sublabel="asignadas"
                            />
                            <KpiCard
                              icon={FaCalendarCheck}
                              iconBgClass="bg-blue-500/15"
                              iconClass="text-blue-400"
                              value={stats.visits}
                              label="Visitas"
                              sublabel="registradas"
                            />
                            <KpiCard
                              icon={FaFileContract}
                              iconBgClass="bg-primary/15"
                              iconClass="text-primary"
                              value={stats.contracts}
                              label="Contratos"
                              sublabel="creados"
                            />
                            <KpiCard
                              icon={FaCheckCircle}
                              iconBgClass="bg-emerald-500/15"
                              iconClass="text-emerald-400"
                              value={stats.contractsActive}
                              label="Vigentes"
                              sublabel="activos hoy"
                            />
                          </div>
                        </section>

                        {visits.length > 0 && (
                          <section>
                            <SectionLabel>Visitas por estado</SectionLabel>
                            <div className="grid grid-cols-3 gap-2">
                              {[
                                {
                                  label: 'Aprobadas',
                                  count: visits.filter((v) => v.status === 'approved').length,
                                  cls: 'text-emerald-400',
                                  bg: 'bg-emerald-500/10 border-emerald-900/50',
                                },
                                {
                                  label: 'Pendientes',
                                  count: visits.filter((v) => v.status === 'pending').length,
                                  cls: 'text-amber-400',
                                  bg: 'bg-amber-500/10 border-amber-900/50',
                                },
                                {
                                  label: 'Rechazadas',
                                  count: visits.filter((v) => v.status === 'rejected').length,
                                  cls: 'text-rose-400',
                                  bg: 'bg-rose-500/10 border-rose-900/50',
                                },
                              ].map(({ label, count, cls, bg }) => (
                                <div key={label} className={`${bg} rounded-xl p-3.5 text-center border`}>
                                  <p className={`text-xl font-bold tabular-nums ${cls}`}>{count}</p>
                                  <p className="text-xs text-slate-400 mt-1">{label}</p>
                                </div>
                              ))}
                            </div>
                          </section>
                        )}
                      </>
                    )}
                  </motion.div>
                )}

                {activeTab === 'activity' && (
                  <motion.div
                    key="activity"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    className="p-5"
                  >
                    {loading ? (
                      <TabLoader message="Cargando actividad..." />
                    ) : activity.length === 0 ? (
                      <EmptyState
                        icon={FaHistory}
                        title="Sin actividad registrada"
                        subtitle="Las notificaciones aparecerán aquí"
                      />
                    ) : (
                      <div className="relative space-y-3">
                        <div className="absolute left-4 top-4 bottom-4 w-px bg-white/[0.06]" />
                        {activity.map((item, i) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="flex gap-4 items-start pl-10 relative"
                          >
                            <div className="absolute left-0 w-8 h-8 rounded-full bg-[#0d1117] border border-white/[0.08] flex items-center justify-center shadow-sm">
                              {ACTIVITY_ICONS[item.type] ?? ACTIVITY_ICONS.default}
                            </div>
                            <div className="flex-1 bg-white/[0.03] rounded-xl border border-white/[0.06] p-3.5 hover:bg-white/[0.05] transition-colors">
                              <p className="text-xs font-semibold text-slate-200">
                                {item.title || 'Notificación'}
                              </p>
                              {item.message && (
                                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                                  {item.message}
                                </p>
                              )}
                              <p className="text-[11px] text-slate-600 mt-1.5">
                                {fmtShort(item.createdAt)}
                              </p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'contracts' && (
                  <motion.div
                    key="contracts"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="p-5 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <SectionLabel>Contratos del agente</SectionLabel>
                      <span className="text-xs text-primary font-bold bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20">
                        {stats.contracts} total · {stats.contractsActive} vigentes
                      </span>
                    </div>

                    {loading ? (
                      <TabLoader message="Cargando contratos..." />
                    ) : contracts.length === 0 ? (
                      <EmptyState
                        icon={FaFileContract}
                        title="Sin contratos registrados"
                        subtitle="Los contratos asignados aparecerán aquí"
                      />
                    ) : (
                      <div className="space-y-2.5">
                        {contracts.map((c, i) => (
                          <motion.div
                            key={c.id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.07] hover:border-primary/20 transition-all"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-slate-100 truncate">
                                  {c.propertyName || 'Propiedad'}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  Cliente: {c.clientName || c.clientEmail || '–'}
                                </p>
                                {c.value && (
                                  <p className="text-sm text-primary font-bold mt-1.5">
                                    {new Intl.NumberFormat('es-CO', {
                                      style: 'currency',
                                      currency: 'COP',
                                      maximumFractionDigits: 0,
                                    }).format(c.value)}
                                  </p>
                                )}
                              </div>

                              <span
                                className={`text-xs px-2.5 py-1 rounded-lg border font-semibold flex-shrink-0 ${
                                  CONTRACT_STATUS_STYLES[c.status] ?? CONTRACT_STATUS_STYLES.borrador
                                }`}
                              >
                                {c.status
                                  ? c.status.charAt(0).toUpperCase() + c.status.slice(1)
                                  : 'Borrador'}
                              </span>
                            </div>

                            {c.endDate && (
                              <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-white/[0.05]">
                                <FaClock className="text-slate-600 text-xs flex-shrink-0" />
                                <p className="text-xs text-slate-500">Vence: {fmt(c.endDate)}</p>
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default UserDetailPanel;