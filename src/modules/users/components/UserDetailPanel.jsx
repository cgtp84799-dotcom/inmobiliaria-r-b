// src/modules/users/components/UserDetailPanel.jsx
// Drawer lateral con vista completa del usuario
// Tabs: Perfil — Rendimiento — Actividad — Contratos

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  collection, query, where, orderBy, limit,
  onSnapshot, getDocs,
} from 'firebase/firestore';
import { db } from '../../../core/config/firebase.config';
import {
  FaTimes, FaUserShield, FaUsers, FaEye,
  FaEnvelope, FaPhone, FaCalendarAlt, FaEdit,
  FaToggleOn, FaToggleOff, FaKey, FaHome,
  FaCalendarCheck, FaFileContract, FaChartBar,
  FaHistory, FaCheckCircle, FaClock, FaTimesCircle as FaX,
  FaWifi, FaCircle,
} from 'react-icons/fa';
import {
  USER_ROLES, USER_ROLE_LABELS, USER_ROLE_BADGE_CLASSES,
  USER_ROLE_DESCRIPTIONS,
} from '../types/user.types';

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
  if (mins < 1)  return 'ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
};

const ROLE_ICONS = {
  [USER_ROLES.ADMIN]:  <FaUserShield className="text-rose-400" />,
  [USER_ROLES.MEMBER]: <FaUsers      className="text-emerald-400" />,
  [USER_ROLES.VIEWER]: <FaEye        className="text-slate-400" />,
};

const CONTRACT_STATUS_STYLES = {
  vigente:   'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  borrador:  'bg-slate-500/15   text-slate-400   border-slate-500/25',
  vencido:   'bg-rose-500/15    text-rose-400    border-rose-500/25',
  cancelado: 'bg-rose-500/15    text-rose-400    border-rose-500/25',
};

const ACTIVITY_ICONS = {
  visit_approved:  <FaCheckCircle   className="text-emerald-400 text-xs" />,
  visit_rejected:  <FaX             className="text-rose-400 text-xs" />,
  visit_created:   <FaCalendarCheck className="text-blue-400 text-xs" />,
  contract_signed: <FaFileContract  className="text-primary text-xs" />,
  property_added:  <FaHome          className="text-amber-400 text-xs" />,
  default:         <FaHistory       className="text-slate-500 text-xs" />,
};

const VISIT_STATUS = {
  approved: { label: 'Aprobada',  cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' },
  pending:  { label: 'Pendiente', cls: 'bg-amber-500/15   text-amber-400   border-amber-500/25' },
  rejected: { label: 'Rechazada', cls: 'bg-rose-500/15    text-rose-400    border-rose-500/25' },
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
  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">{children}</p>
);

// ─── Componente principal ─────────────────────────────────────────────────────
const UserDetailPanel = ({
  user,
  isOpen,
  onClose,
  onEdit,
  onChangeStatus,
  onResetPassword,
}) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [stats,     setStats]     = useState({ properties: 0, visits: 0, contracts: 0, contractsActive: 0 });
  const [visits,    setVisits]    = useState([]);
  const [contracts, setContracts] = useState([]);
  const [activity,  setActivity]  = useState([]);
  const [loading,   setLoading]   = useState(false);

  useEffect(() => {
    if (!isOpen || !user) return;
    setActiveTab('profile');
    setStats({ properties: 0, visits: 0, contracts: 0, contractsActive: 0 });
    setVisits([]);
    setContracts([]);
    setActivity([]);
    let cleanup = () => {};
    loadData().then(fn => { if (fn) cleanup = fn; });
    return () => cleanup();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email, isOpen]);

  const loadData = useCallback(async () => {
    if (!user?.email) return;
    setLoading(true);
    try {
      const propsSnap = await getDocs(
        query(collection(db, 'properties'), where('agentEmail', '==', user.email))
      );
      setStats(prev => ({ ...prev, properties: propsSnap.size }));

      const unsubVisits = onSnapshot(
        query(collection(db, 'visits'), where('agentEmail', '==', user.email), orderBy('createdAt', 'desc'), limit(20)),
        snap => {
          setVisits(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          setStats(prev => ({ ...prev, visits: snap.size }));
        },
        (err) => console.warn('visits snapshot:', err.code)
      );

      const unsubContracts = onSnapshot(
        query(collection(db, 'contracts'), where('agentEmail', '==', user.email), orderBy('createdAt', 'desc'), limit(20)),
        snap => {
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setContracts(data);
          setStats(prev => ({ ...prev, contracts: snap.size, contractsActive: data.filter(c => c.status === 'vigente').length }));
        },
        (err) => console.warn('contracts snapshot:', err.code)
      );

      const unsubActivity = onSnapshot(
        query(collection(db, 'notifications'), where('userId', '==', user.email), orderBy('createdAt', 'desc'), limit(15)),
        snap => setActivity(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
        (err) => console.warn('activity snapshot:', err.code)
      );

      setLoading(false);
      return () => { unsubVisits(); unsubContracts(); unsubActivity(); };
    } catch (err) {
      console.error('UserDetailPanel loadData:', err);
      setLoading(false);
    }
  }, [user?.email]);

  if (!user) return null;

  const roleBadge   = USER_ROLE_BADGE_CLASSES[user.role] ?? USER_ROLE_BADGE_CLASSES[USER_ROLES.VIEWER];
  const displayName = user.displayName || user.email || 'Usuario';
  const initial     = displayName.charAt(0).toUpperCase();

  const TABS = [
    { id: 'profile',     label: 'Perfil',      icon: <FaUsers          className="text-xs" /> },
    { id: 'performance', label: 'Métricas',    icon: <FaChartBar        className="text-xs" /> },
    { id: 'activity',    label: 'Actividad',   icon: <FaHistory         className="text-xs" /> },
    { id: 'contracts',   label: 'Contratos',   icon: <FaFileContract    className="text-xs" /> },
  ];

  // Colores de rol para el gradiente del header
  const roleGradient = {
    [USER_ROLES.ADMIN]:  'from-rose-500/20 via-rose-500/5 to-transparent',
    [USER_ROLES.MEMBER]: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
    [USER_ROLES.VIEWER]: 'from-slate-500/15 via-slate-500/5 to-transparent',
  }[user.role] ?? 'from-slate-500/10 to-transparent';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.aside
            key="panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            className="fixed right-0 top-0 h-full w-full max-w-[420px] bg-[#0d1117] border-l border-white/[0.07] z-50 flex flex-col shadow-2xl"
          >

            {/* ─── Header ─── */}
            <div className="relative flex-shrink-0">
              {/* Gradiente según rol */}
              <div className={`absolute inset-0 bg-gradient-to-br ${roleGradient} pointer-events-none`} />
              {/* Línea inferior sutil */}
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

              {/* Fila principal: avatar + datos + cerrar */}
              <div className="relative flex items-start gap-4 px-5 pt-6 pb-5">
                {/* Avatar */}
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
                  {/* Indicador online */}
                  {user.online && (
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#0d1117] shadow-lg shadow-emerald-500/40" />
                  )}
                </div>

                {/* Nombre + email + badges */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <h2 className="text-base font-bold text-white truncate leading-tight tracking-tight">
                    {displayName}
                  </h2>
                  <p className="text-xs text-slate-400 truncate mt-0.5 mb-2.5">{user.email}</p>

                  <div className="flex flex-wrap gap-1.5">
                    {/* Badge rol */}
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${roleBadge}`}>
                      {ROLE_ICONS[user.role] ?? ROLE_ICONS[USER_ROLES.VIEWER]}
                      {USER_ROLE_LABELS[user.role] ?? 'Sin rol'}
                    </span>

                    {/* Badge presencia */}
                    {user.online ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                        <FaCircle className="text-[6px]" /> En línea
                      </span>
                    ) : user.lastSeen ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-slate-400 border border-white/[0.07] bg-white/[0.04]">
                        {fmtShort(user.lastSeen)}
                      </span>
                    ) : null}

                    {/* Badge estado activo/inactivo */}
                    {user.status && (
                      <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium border ${
                        user.status === 'active'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        {user.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Cerrar */}
                <button
                  onClick={onClose}
                  aria-label="Cerrar panel"
                  className="w-8 h-8 rounded-xl hover:bg-white/[0.08] text-slate-500 hover:text-white transition-colors flex items-center justify-center flex-shrink-0"
                >
                  <FaTimes className="text-sm" />
                </button>
              </div>

              {/* Acciones rápidas */}
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
                      {user.status === 'active'
                        ? <><FaToggleOff className="text-sm" /> Desactivar</>
                        : <><FaToggleOn  className="text-sm" /> Activar</>}
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

            {/* ─── Tabs ─── */}
            <div className="flex border-b border-white/[0.06] flex-shrink-0 bg-black/20">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex flex-col items-center gap-1 py-3 text-[11px] font-semibold transition-colors relative ${
                    activeTab === tab.id
                      ? 'text-white'
                      : 'text-slate-600 hover:text-slate-400'
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

            {/* ─── Contenido ─── */}
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              <AnimatePresence mode="wait">

                {/* ══ PERFIL ══ */}
                {activeTab === 'profile' && (
                  <motion.div
                    key="profile"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="p-5 space-y-6"
                  >
                    {/* Rol */}
                    <section>
                      <SectionLabel>Rol y acceso</SectionLabel>
                      <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                        <div className="flex items-center gap-2.5 mb-2">
                          {ROLE_ICONS[user.role] ?? ROLE_ICONS[USER_ROLES.VIEWER]}
                          <span className="text-white font-bold text-sm">{USER_ROLE_LABELS[user.role] ?? 'Sin rol'}</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {USER_ROLE_DESCRIPTIONS[user.role] ?? 'Sin descripción de rol'}
                        </p>
                      </div>
                    </section>

                    {/* Contacto */}
                    <section>
                      <SectionLabel>Información de contacto</SectionLabel>
                      <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] px-4 py-1">
                        <InfoRow icon={FaEnvelope}    label="Correo electrónico" value={user.email} />
                        <InfoRow icon={FaPhone}       label="Teléfono"           value={user.phone} />
                        <InfoRow icon={FaCalendarAlt} label="Miembro desde"      value={fmt(user.createdAt)} />
                        <InfoRow icon={FaCalendarAlt} label="Última sesión"      value={fmt(user.lastSeen)} />
                      </div>
                    </section>

                    {/* Visitas rápidas */}
                    {visits.length > 0 && (
                      <section>
                        <SectionLabel>Visitas recientes</SectionLabel>
                        <div className="space-y-2">
                          {visits.slice(0, 4).map(v => {
                            const st = VISIT_STATUS[v.status] ?? { label: v.status || '–', cls: 'bg-slate-700/40 text-slate-400 border-slate-700/50' };
                            return (
                              <div key={v.id} className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.06] transition-colors">
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-slate-200 truncate">{v.propertyName || 'Propiedad'}</p>
                                  <p className="text-xs text-slate-500 truncate mt-0.5">{v.clientName || v.clientEmail || '–'}</p>
                                </div>
                                <span className={`text-xs px-2.5 py-1 rounded-lg border font-semibold flex-shrink-0 ${st.cls}`}>
                                  {st.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    )}

                    {loading && (
                      <div className="text-center py-6">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ══ MÉTRICAS ══ */}
                {activeTab === 'performance' && (
                  <motion.div
                    key="performance"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="p-5 space-y-6"
                  >
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
                            { label: 'Aprobadas',  count: visits.filter(v => v.status === 'approved').length, cls: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-900/50' },
                            { label: 'Pendientes', count: visits.filter(v => v.status === 'pending').length,  cls: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-900/50' },
                            { label: 'Rechazadas', count: visits.filter(v => v.status === 'rejected').length, cls: 'text-rose-400',    bg: 'bg-rose-500/10 border-rose-900/50' },
                          ].map(({ label, count, cls, bg }) => (
                            <div key={label} className={`${bg} rounded-xl p-3.5 text-center border`}>
                              <p className={`text-xl font-bold tabular-nums ${cls}`}>{count}</p>
                              <p className="text-xs text-slate-400 mt-1">{label}</p>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {loading && (
                      <div className="text-center py-8">
                        <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        <p className="text-slate-500 text-xs">Calculando estadísticas...</p>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ══ ACTIVIDAD ══ */}
                {activeTab === 'activity' && (
                  <motion.div
                    key="activity"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="p-5"
                  >
                    {activity.length === 0 ? (
                      <div className="text-center py-20">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                          <FaHistory className="text-slate-600 text-2xl" />
                        </div>
                        <p className="text-slate-400 text-sm font-semibold">Sin actividad registrada</p>
                        <p className="text-slate-600 text-xs mt-1.5">Las notificaciones aparecerán aquí</p>
                      </div>
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
                              <p className="text-xs font-semibold text-slate-200">{item.title || 'Notificación'}</p>
                              {item.message && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.message}</p>}
                              <p className="text-[11px] text-slate-600 mt-1.5">{fmtShort(item.createdAt)}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ══ CONTRATOS ══ */}
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

                    {contracts.length === 0 ? (
                      <div className="text-center py-20">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                          <FaFileContract className="text-slate-600 text-2xl" />
                        </div>
                        <p className="text-slate-400 text-sm font-semibold">Sin contratos registrados</p>
                        <p className="text-slate-600 text-xs mt-1.5">Los contratos asignados aparecerán aquí</p>
                      </div>
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
                                <p className="text-sm font-semibold text-slate-100 truncate">{c.propertyName || 'Propiedad'}</p>
                                <p className="text-xs text-slate-500 mt-0.5">Cliente: {c.clientName || c.clientEmail || '–'}</p>
                                {c.value && (
                                  <p className="text-sm text-primary font-bold mt-1.5">
                                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(c.value)}
                                  </p>
                                )}
                              </div>
                              <span className={`text-xs px-2.5 py-1 rounded-lg border font-semibold flex-shrink-0 ${
                                CONTRACT_STATUS_STYLES[c.status] ?? CONTRACT_STATUS_STYLES.borrador
                              }`}>
                                {c.status ? c.status.charAt(0).toUpperCase() + c.status.slice(1) : 'Borrador'}
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
