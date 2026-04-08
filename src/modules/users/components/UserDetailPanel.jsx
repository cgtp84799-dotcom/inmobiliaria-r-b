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
  FaWifi,
} from 'react-icons/fa';
import {
  USER_ROLES, USER_ROLE_LABELS, USER_ROLE_BADGE_CLASSES,
  USER_ROLE_DESCRIPTIONS,
} from '../types/user.types';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (ts) => {
  if (!ts) return 'Nunca';
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
  [USER_ROLES.ADMIN]:  <FaUserShield className="text-red-400" />,
  [USER_ROLES.MEMBER]: <FaUsers      className="text-green-400" />,
  [USER_ROLES.VIEWER]: <FaEye        className="text-slate-400" />,
};

const CONTRACT_STATUS_STYLES = {
  vigente:   'bg-green-500/10 text-green-400 border-green-500/30',
  borrador:  'bg-slate-500/10 text-slate-400 border-slate-500/30',
  vencido:   'bg-red-500/10   text-red-400   border-red-500/30',
  cancelado: 'bg-red-500/10   text-red-400   border-red-500/30',
};

const ACTIVITY_ICONS = {
  visit_approved:  <FaCheckCircle   className="text-green-400 text-xs" />,
  visit_rejected:  <FaX             className="text-red-400 text-xs" />,
  visit_created:   <FaCalendarCheck className="text-blue-400 text-xs" />,
  contract_signed: <FaFileContract  className="text-primary text-xs" />,
  property_added:  <FaHome          className="text-yellow-400 text-xs" />,
  default:         <FaHistory       className="text-slate-400 text-xs" />,
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KpiCard = ({ icon: Icon, value, label, color = 'primary', sublabel }) => (
  <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/60 flex flex-col items-center text-center gap-1">
    <div className={`w-9 h-9 rounded-xl bg-${color}/10 flex items-center justify-center mb-1`}>
      <Icon className={`text-${color}`} />
    </div>
    <p className={`text-xl font-bold text-${color} tabular-nums`}>{value ?? '–'}</p>
    <p className="text-xs text-slate-400 font-medium leading-tight">{label}</p>
    {sublabel && <p className="text-xs text-slate-500">{sublabel}</p>}
  </div>
);

// ─── Info row ─────────────────────────────────────────────────────────────────
const InfoRow = ({ icon: Icon, label, value }) => {
  if (!value || value === 'Nunca') return null;
  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-800 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
        <Icon className="text-slate-400 text-xs" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm text-slate-200 font-medium truncate">{value}</p>
      </div>
    </div>
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
        }
      );

      const unsubContracts = onSnapshot(
        query(collection(db, 'contracts'), where('agentEmail', '==', user.email), orderBy('createdAt', 'desc'), limit(20)),
        snap => {
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setContracts(data);
          setStats(prev => ({ ...prev, contracts: snap.size, contractsActive: data.filter(c => c.status === 'vigente').length }));
        }
      );

      const unsubActivity = onSnapshot(
        query(collection(db, 'notifications'), where('userId', '==', user.email), orderBy('createdAt', 'desc'), limit(15)),
        snap => setActivity(snap.docs.map(d => ({ id: d.id, ...d.data() })))
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
    { id: 'performance', label: 'Rendimiento', icon: <FaChartBar        className="text-xs" /> },
    { id: 'activity',    label: 'Actividad',   icon: <FaHistory         className="text-xs" /> },
    { id: 'contracts',   label: 'Contratos',   icon: <FaFileContract    className="text-xs" /> },
  ];

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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.aside
            key="panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-slate-950 border-l border-slate-800 z-50 flex flex-col shadow-2xl"
          >

            {/* ─── Header ─── */}
            <div className="relative flex-shrink-0 border-b border-slate-800">
              {/* fondo degradado muy sutil */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/8 to-transparent pointer-events-none" />

              {/* Fila superior: avatar + nombre + cerrar */}
              <div className="relative flex items-center gap-4 px-5 pt-5 pb-4">
                <div className="relative flex-shrink-0">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={displayName}
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-primary/30"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/25 to-blue-500/15 flex items-center justify-center text-2xl font-bold text-primary border-2 border-primary/20">
                      {initial}
                    </div>
                  )}
                  {user.online && (
                    <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-slate-950" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-bold text-white truncate leading-tight">{displayName}</h2>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{user.email}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border ${roleBadge}`}>
                      {ROLE_ICONS[user.role] ?? ROLE_ICONS[USER_ROLES.VIEWER]}
                      {USER_ROLE_LABELS[user.role] ?? 'Sin rol'}
                    </span>
                    {user.online
                      ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/30">
                          <FaWifi className="text-xs" /> En línea
                        </span>
                      : user.lastSeen && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs text-slate-400 border border-slate-700">
                            {fmtShort(user.lastSeen)}
                          </span>
                        )
                    }
                  </div>
                </div>

                <button
                  onClick={onClose}
                  aria-label="Cerrar panel"
                  className="w-8 h-8 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors flex items-center justify-center flex-shrink-0 self-start"
                >
                  <FaTimes className="text-sm" />
                </button>
              </div>

              {/* Acciones rápidas */}
              {(onEdit || onChangeStatus || onResetPassword) && (
                <div className="relative flex gap-2 px-5 pb-4">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(user)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs font-semibold transition-all border border-primary/20"
                    >
                      <FaEdit className="text-xs" /> Editar
                    </button>
                  )}
                  {onChangeStatus && (
                    <button
                      onClick={() => onChangeStatus(user)}
                      className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
                        user.status === 'active'
                          ? 'bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border-yellow-500/20'
                          : 'bg-green-500/10 hover:bg-green-500/20 text-green-400 border-green-500/20'
                      }`}
                    >
                      {user.status === 'active'
                        ? <><FaToggleOff className="text-xs" /> Desactivar</>
                        : <><FaToggleOn  className="text-xs" /> Activar</>}
                    </button>
                  )}
                  {onResetPassword && (
                    <button
                      onClick={() => onResetPassword(user)}
                      title="Resetear contraseña"
                      className="w-9 inline-flex items-center justify-center py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition-all border border-slate-700"
                    >
                      <FaKey className="text-xs" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ─── Tabs ─── */}
            <div className="flex border-b border-slate-800 flex-shrink-0">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors relative ${
                    activeTab === tab.id ? 'text-primary' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* ─── Contenido ─── */}
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">

                {/* PERFIL */}
                {activeTab === 'profile' && (
                  <motion.div
                    key="profile"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="p-5 space-y-5"
                  >
                    {/* Rol */}
                    <section>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Rol y permisos</p>
                      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                        <div className="flex items-center gap-2 mb-1.5">
                          {ROLE_ICONS[user.role] ?? ROLE_ICONS[USER_ROLES.VIEWER]}
                          <span className="text-white font-semibold text-sm">{USER_ROLE_LABELS[user.role] ?? 'Sin rol'}</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">{USER_ROLE_DESCRIPTIONS[user.role]}</p>
                      </div>
                    </section>

                    {/* Contacto */}
                    <section>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Información de contacto</p>
                      <div className="bg-slate-900 rounded-xl border border-slate-800 px-4 py-1">
                        <InfoRow icon={FaEnvelope}    label="Correo"         value={user.email} />
                        <InfoRow icon={FaPhone}       label="Teléfono"       value={user.phone} />
                        <InfoRow icon={FaCalendarAlt} label="Miembro desde"  value={fmt(user.createdAt)} />
                        <InfoRow icon={FaCalendarAlt} label="Última sesión"  value={fmt(user.lastSeen)} />
                      </div>
                    </section>

                    {/* Visitas rápidas */}
                    {visits.length > 0 && (
                      <section>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Visitas recientes</p>
                        <div className="space-y-2">
                          {visits.slice(0, 4).map(v => (
                            <div key={v.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-200 truncate">{v.propertyName || 'Propiedad'}</p>
                                <p className="text-xs text-slate-500 truncate">{v.clientName || v.clientEmail || '–'}</p>
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-md border font-medium flex-shrink-0 ${
                                v.status === 'approved' ? 'bg-green-500/10 text-green-400 border-green-500/30'
                                : v.status === 'pending'  ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                                : v.status === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/30'
                                : 'bg-slate-700/50 text-slate-400 border-slate-700'
                              }`}>
                                {v.status === 'approved' ? 'Aprobada'
                                  : v.status === 'pending'  ? 'Pendiente'
                                  : v.status === 'rejected' ? 'Rechazada'
                                  : v.status || '–'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                  </motion.div>
                )}

                {/* RENDIMIENTO */}
                {activeTab === 'performance' && (
                  <motion.div
                    key="performance"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="p-5 space-y-5"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <KpiCard icon={FaHome}          value={stats.properties}      label="Propiedades"        color="yellow-400" sublabel="asignadas" />
                      <KpiCard icon={FaCalendarCheck} value={stats.visits}          label="Visitas totales"    color="blue-400"   sublabel="registradas" />
                      <KpiCard icon={FaFileContract}  value={stats.contracts}       label="Contratos"         color="primary"   sublabel="creados" />
                      <KpiCard icon={FaCheckCircle}   value={stats.contractsActive} label="Vigentes"          color="green-400"  sublabel="activos hoy" />
                    </div>

                    {visits.length > 0 && (
                      <section>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Visitas por estado</p>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: 'Aprobadas',  count: visits.filter(v => v.status === 'approved').length, color: 'text-green-400',  bg: 'bg-green-500/10 border-green-900'  },
                            { label: 'Pendientes', count: visits.filter(v => v.status === 'pending').length,  color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-900' },
                            { label: 'Rechazadas', count: visits.filter(v => v.status === 'rejected').length, color: 'text-red-400',    bg: 'bg-red-500/10 border-red-900'    },
                          ].map(({ label, count, color, bg }) => (
                            <div key={label} className={`${bg} rounded-xl p-3 text-center border`}>
                              <p className={`text-lg font-bold tabular-nums ${color}`}>{count}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{label}</p>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {loading && (
                      <div className="text-center py-8">
                        <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        <p className="text-slate-400 text-xs">Calculando estadísticas...</p>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ACTIVIDAD */}
                {activeTab === 'activity' && (
                  <motion.div
                    key="activity"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="p-5"
                  >
                    {activity.length === 0 ? (
                      <div className="text-center py-16">
                        <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-slate-900 flex items-center justify-center">
                          <FaHistory className="text-slate-600 text-xl" />
                        </div>
                        <p className="text-slate-500 text-sm font-medium">Sin actividad registrada</p>
                        <p className="text-slate-600 text-xs mt-1">Las notificaciones aparecerán aquí</p>
                      </div>
                    ) : (
                      <div className="relative space-y-3">
                        <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-800" />
                        {activity.map((item, i) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="flex gap-4 items-start pl-10 relative"
                          >
                            <div className="absolute left-0 w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
                              {ACTIVITY_ICONS[item.type] ?? ACTIVITY_ICONS.default}
                            </div>
                            <div className="flex-1 bg-slate-900 rounded-xl border border-slate-800 p-3">
                              <p className="text-xs font-semibold text-slate-200">{item.title || 'Notificación'}</p>
                              {item.message && <p className="text-xs text-slate-500 mt-0.5">{item.message}</p>}
                              <p className="text-xs text-slate-600 mt-1">{fmtShort(item.createdAt)}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* CONTRATOS */}
                {activeTab === 'contracts' && (
                  <motion.div
                    key="contracts"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="p-5 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contratos del agente</p>
                      <span className="text-xs text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                        {stats.contracts} total · {stats.contractsActive} vigentes
                      </span>
                    </div>

                    {contracts.length === 0 ? (
                      <div className="text-center py-16">
                        <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-slate-900 flex items-center justify-center">
                          <FaFileContract className="text-slate-600 text-xl" />
                        </div>
                        <p className="text-slate-500 text-sm font-medium">Sin contratos registrados</p>
                        <p className="text-slate-600 text-xs mt-1">Los contratos asignados a este agente aparecerán aquí</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {contracts.map((c, i) => (
                          <motion.div
                            key={c.id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-primary/30 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-200 truncate">{c.propertyName || 'Propiedad'}</p>
                                <p className="text-xs text-slate-500 mt-0.5">Cliente: {c.clientName || c.clientEmail || '–'}</p>
                                {c.value && (
                                  <p className="text-xs text-primary font-bold mt-1">
                                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(c.value)}
                                  </p>
                                )}
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-md border font-medium flex-shrink-0 ${
                                CONTRACT_STATUS_STYLES[c.status] ?? CONTRACT_STATUS_STYLES.borrador
                              }`}>
                                {c.status || 'Borrador'}
                              </span>
                            </div>
                            {c.endDate && (
                              <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-800">
                                <FaClock className="text-slate-600 text-xs" />
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
