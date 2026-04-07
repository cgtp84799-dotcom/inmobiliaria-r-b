// src/modules/users/components/UserDetailPanel.jsx
// Drawer lateral con vista completa del usuario (agente, miembro, admin)
// 4 tabs: Perfil — Rendimiento — Actividad — Contratos

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  collection, query, where, orderBy, limit,
  onSnapshot, getDocs,
} from 'firebase/firestore';
import { db } from '../../../core/config/firebase.config';
import {
  FaTimes, FaUserTie, FaUserShield, FaUsers, FaEye,
  FaEnvelope, FaPhone, FaCalendarAlt, FaEdit,
  FaToggleOn, FaToggleOff, FaKey, FaHome,
  FaCalendarCheck, FaFileContract, FaChartBar,
  FaHistory, FaCheckCircle, FaClock, FaTimesCircle,
  FaExclamationTriangle,
} from 'react-icons/fa';
import {
  USER_ROLES, USER_ROLE_LABELS, USER_ROLE_BADGE_CLASSES,
  USER_ROLE_DESCRIPTIONS,
} from '../types/user.types';

// ─── Helpers ───────────────────────────────────────────────────────────────────────────────
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
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days}d`;
};

const ROLE_ICONS = {
  [USER_ROLES.ADMIN]:  <FaUserShield className="text-red-400" />,
  [USER_ROLES.MEMBER]: <FaUsers      className="text-blue-400" />,
  [USER_ROLES.AGENT]:  <FaUserTie   className="text-green-400" />,
  [USER_ROLES.VIEWER]: <FaEye       className="text-slate-400" />,
};

const CONTRACT_STATUS_STYLES = {
  vigente:   'bg-green-500/10 text-green-400 border-green-500/30',
  borrador:  'bg-slate-500/10 text-slate-400 border-slate-500/30',
  vencido:   'bg-red-500/10   text-red-400   border-red-500/30',
  cancelado: 'bg-red-500/10   text-red-400   border-red-500/30',
};

const ACTIVITY_ICONS = {
  visit_approved: <FaCheckCircle className="text-green-400" />,
  visit_rejected: <FaTimesCircle className="text-red-400" />,
  visit_created:  <FaCalendarCheck className="text-blue-400" />,
  contract_signed:<FaFileContract className="text-primary" />,
  property_added: <FaHome className="text-yellow-400" />,
  default:        <FaHistory className="text-slate-400" />,
};

// ─── KPI Card ───────────────────────────────────────────────────────────────────────────────
const KpiCard = ({ icon: Icon, value, label, color = 'primary', sublabel }) => (
  <div className="bg-slate-900/70 rounded-2xl p-4 border border-slate-800 flex flex-col items-center text-center gap-1">
    <div className={`w-10 h-10 rounded-xl bg-${color}/10 flex items-center justify-center mb-1`}>
      <Icon className={`text-${color} text-lg`} />
    </div>
    <p className={`text-2xl font-bold text-${color} tabular-nums`}>{value ?? '–'}</p>
    <p className="text-xs text-slate-400 font-medium">{label}</p>
    {sublabel && <p className="text-xs text-slate-500">{sublabel}</p>}
  </div>
);

// ─── Componente principal ───────────────────────────────────────────────────────────────────
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

  // Reset al cambiar usuario
  useEffect(() => {
    if (!isOpen || !user) return;
    setActiveTab('profile');
    setStats({ properties: 0, visits: 0, contracts: 0, contractsActive: 0 });
    setVisits([]);
    setContracts([]);
    setActivity([]);
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email, isOpen]);

  const loadData = useCallback(async () => {
    if (!user?.email) return;
    setLoading(true);
    try {
      // ─ Propiedades del agente ─
      const propsSnap = await getDocs(
        query(collection(db, 'properties'), where('agentEmail', '==', user.email))
      );
      const totalProperties = propsSnap.size;

      // ─ Visitas ─ (tiempo real)
      const visitsQ = query(
        collection(db, 'visits'),
        where('agentEmail', '==', user.email),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      const unsubVisits = onSnapshot(visitsQ, snap => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setVisits(data);
        setStats(prev => ({ ...prev, visits: snap.size }));
      });

      // ─ Contratos ─ (tiempo real)
      const contractsQ = query(
        collection(db, 'contracts'),
        where('agentEmail', '==', user.email),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      const unsubContracts = onSnapshot(contractsQ, snap => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const active = data.filter(c => c.status === 'vigente').length;
        setContracts(data);
        setStats(prev => ({ ...prev, contracts: snap.size, contractsActive: active }));
      });

      // ─ Actividad reciente (notifications donde userId === email) ─
      const actQ = query(
        collection(db, 'notifications'),
        where('userId', '==', user.email),
        orderBy('createdAt', 'desc'),
        limit(15)
      );
      const unsubActivity = onSnapshot(actQ, snap => {
        setActivity(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      setStats(prev => ({ ...prev, properties: totalProperties }));
      setLoading(false);

      return () => { unsubVisits(); unsubContracts(); unsubActivity(); };
    } catch (err) {
      console.error('UserDetailPanel loadData:', err);
      setLoading(false);
    }
  }, [user?.email]);

  if (!user) return null;

  const roleBadge   = USER_ROLE_BADGE_CLASSES[user.role] || USER_ROLE_BADGE_CLASSES[USER_ROLES.VIEWER];
  const displayName = user.displayName || user.email || 'Usuario';
  const initial     = displayName.charAt(0).toUpperCase();
  const isAgent     = user.role === USER_ROLES.AGENT;

  const TABS = [
    { id: 'profile',     label: 'Perfil',       icon: ROLE_ICONS[user.role] || <FaUsers /> },
    { id: 'performance', label: 'Rendimiento',  icon: <FaChartBar className="text-yellow-400" /> },
    { id: 'activity',    label: 'Actividad',    icon: <FaHistory  className="text-blue-400" /> },
    { id: 'contracts',   label: 'Contratos',    icon: <FaFileContract className="text-primary" /> },
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

          {/* Drawer */}
          <motion.aside
            key="panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 h-full w-full max-w-xl bg-[#0f1117] border-l border-slate-800 z-50 flex flex-col shadow-2xl overflow-hidden"
          >
            {/* ─ Header del panel ─ */}
            <div className="relative px-6 pt-6 pb-4 border-b border-slate-800 flex-shrink-0">
              {/* Fondo decorativo */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-blue-500/5 pointer-events-none" />

              <div className="relative flex items-start gap-4">
                {/* Avatar grande */}
                <div className="relative flex-shrink-0">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={displayName}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-primary/40"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/30 to-blue-500/20 flex items-center justify-center text-3xl font-bold text-primary border-2 border-primary/30">
                      {initial}
                    </div>
                  )}
                  {user.online && (
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-slate-900" />
                  )}
                </div>

                {/* Info principal */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-white truncate">{displayName}</h2>
                  <p className="text-slate-400 text-sm truncate">{user.email}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold border ${roleBadge}`}>
                      {ROLE_ICONS[user.role]}
                      {USER_ROLE_LABELS[user.role]}
                    </span>
                    {user.online
                      ? <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/30">En línea</span>
                      : <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-700/50 text-slate-400 border border-slate-700">{fmtShort(user.lastSeen) || 'Offline'}</span>
                    }
                  </div>
                </div>

                {/* Cerrar */}
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors flex-shrink-0"
                >
                  <FaTimes />
                </button>
              </div>

              {/* Acciones rápidas admin */}
              <div className="relative flex gap-2 mt-4">
                {onEdit && (
                  <button
                    onClick={() => onEdit(user)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs font-semibold transition-all border border-primary/20"
                  >
                    <FaEdit /> Editar rol / datos
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
                    {user.status === 'active' ? <><FaToggleOff /> Desactivar</> : <><FaToggleOn /> Activar</>}
                  </button>
                )}
                {onResetPassword && (
                  <button
                    onClick={() => onResetPassword(user)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all border border-slate-700"
                    title="Restablecer contraseña"
                  >
                    <FaKey />
                  </button>
                )}
              </div>
            </div>

            {/* ─ Tabs ─ */}
            <div className="flex border-b border-slate-800 flex-shrink-0 bg-slate-900/50">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-medium transition-colors relative ${
                    activeTab === tab.id
                      ? 'text-primary'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <span className="text-sm">{tab.icon}</span>
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

            {/* ─ Contenido de tabs ─ */}
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">

                {/* TAB: PERFIL */}
                {activeTab === 'profile' && (
                  <motion.div
                    key="profile"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-6 space-y-5"
                  >
                    {/* Información de contacto */}
                    <section>
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Información de contacto</h3>
                      <div className="space-y-3">
                        {[
                          { icon: FaEnvelope,    label: 'Correo',   value: user.email   },
                          { icon: FaPhone,       label: 'Teléfono', value: user.phone   },
                          { icon: FaCalendarAlt, label: 'Miembro desde', value: fmt(user.createdAt) },
                          { icon: FaCalendarAlt, label: 'Última sesión', value: fmt(user.lastSeen) },
                        ].filter(item => item.value).map(({ icon: Icon, label, value }) => (
                          <div key={label} className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                            <Icon className="text-slate-400 flex-shrink-0" />
                            <div>
                              <p className="text-xs text-slate-500">{label}</p>
                              <p className="text-sm text-slate-200 font-medium">{value}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Rol y permisos */}
                    <section>
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Rol y permisos</h3>
                      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                        <div className="flex items-center gap-2 mb-2">
                          {ROLE_ICONS[user.role]}
                          <span className="text-white font-semibold">{USER_ROLE_LABELS[user.role]}</span>
                        </div>
                        <p className="text-slate-400 text-sm">{USER_ROLE_DESCRIPTIONS[user.role]}</p>
                      </div>
                    </section>

                    {/* Últimas visitas rápidas */}
                    {visits.length > 0 && (
                      <section>
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Visitas recientes</h3>
                        <div className="space-y-2">
                          {visits.slice(0, 4).map(v => (
                            <div key={v.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                              <div className="min-w-0">
                                <p className="text-sm text-slate-200 font-medium truncate">{v.propertyName || 'Propiedad'}</p>
                                <p className="text-xs text-slate-500">{v.clientName || v.clientEmail}</p>
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-md border font-medium flex-shrink-0 ${
                                v.status === 'approved'  ? 'bg-green-500/10 text-green-400 border-green-500/30' :
                                v.status === 'pending'   ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' :
                                v.status === 'rejected'  ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                                'bg-slate-500/10 text-slate-400 border-slate-700'
                              }`}>
                                {v.status === 'approved' ? 'Aprobada' :
                                 v.status === 'pending'  ? 'Pendiente' :
                                 v.status === 'rejected' ? 'Rechazada' : v.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                  </motion.div>
                )}

                {/* TAB: RENDIMIENTO */}
                {activeTab === 'performance' && (
                  <motion.div
                    key="performance"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-6 space-y-6"
                  >
                    {/* KPIs principales */}
                    <div className="grid grid-cols-2 gap-3">
                      <KpiCard icon={FaHome}          value={stats.properties}     label="Propiedades"         color="yellow-400" sublabel="asignadas" />
                      <KpiCard icon={FaCalendarCheck} value={stats.visits}         label="Visitas totales"     color="blue-400"   sublabel="registradas" />
                      <KpiCard icon={FaFileContract}  value={stats.contracts}      label="Contratos"          color="primary"   sublabel="creados" />
                      <KpiCard icon={FaCheckCircle}   value={stats.contractsActive} label="Contratos vigentes" color="green-400"  sublabel="activos hoy" />
                    </div>

                    {/* Breakdown visitas por estado */}
                    {visits.length > 0 && (
                      <section>
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Visitas por estado</h3>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: 'Aprobadas',  count: visits.filter(v => v.status === 'approved').length,  color: 'text-green-400',  bg: 'bg-green-500/10'  },
                            { label: 'Pendientes', count: visits.filter(v => v.status === 'pending').length,   color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
                            { label: 'Rechazadas', count: visits.filter(v => v.status === 'rejected').length,  color: 'text-red-400',    bg: 'bg-red-500/10'    },
                          ].map(({ label, count, color, bg }) => (
                            <div key={label} className={`${bg} rounded-xl p-3 text-center border border-slate-800`}>
                              <p className={`text-xl font-bold tabular-nums ${color}`}>{count}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{label}</p>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Nota agente */}
                    {isAgent && (
                      <section>
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Nota</h3>
                        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                          <p className="text-sm text-slate-400">
                            Los KPIs se calculan en tiempo real desde Firestore.
                            Las propiedades asignadas requieren que el campo <code className="text-primary bg-primary/10 px-1 rounded">agentEmail</code> esté guardado en cada propiedad.
                          </p>
                        </div>
                      </section>
                    )}

                    {loading && (
                      <div className="text-center py-8">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        <p className="text-slate-400 text-sm">Calculando estadísticas...</p>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* TAB: ACTIVIDAD */}
                {activeTab === 'activity' && (
                  <motion.div
                    key="activity"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-6"
                  >
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Timeline de actividad</h3>
                    {activity.length === 0 ? (
                      <div className="text-center py-12">
                        <FaHistory className="text-slate-700 text-4xl mx-auto mb-3" />
                        <p className="text-slate-500">Sin actividad registrada</p>
                      </div>
                    ) : (
                      <div className="relative">
                        {/* Línea vertical */}
                        <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-800" />
                        <div className="space-y-4">
                          {activity.map((item, i) => (
                            <motion.div
                              key={item.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.04 }}
                              className="flex gap-4 items-start pl-10 relative"
                            >
                              {/* Icono en la línea */}
                              <div className="absolute left-0 w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
                                {ACTIVITY_ICONS[item.type] || ACTIVITY_ICONS.default}
                              </div>
                              <div className="flex-1 bg-slate-900/60 rounded-xl border border-slate-800 p-3">
                                <p className="text-sm text-slate-200 font-medium">{item.title || 'Notificación'}</p>
                                {item.message && <p className="text-xs text-slate-500 mt-0.5">{item.message}</p>}
                                <p className="text-xs text-slate-600 mt-1">{fmtShort(item.createdAt)}</p>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* TAB: CONTRATOS */}
                {activeTab === 'contracts' && (
                  <motion.div
                    key="contracts"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-6 space-y-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contratos del agente</h3>
                      <span className="text-xs text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-md">
                        {stats.contracts} total · {stats.contractsActive} vigentes
                      </span>
                    </div>

                    {contracts.length === 0 ? (
                      <div className="text-center py-12">
                        <FaFileContract className="text-slate-700 text-4xl mx-auto mb-3" />
                        <p className="text-slate-500">Sin contratos registrados</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {contracts.map((c, i) => (
                          <motion.div
                            key={c.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-primary/30 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-200 truncate">
                                  {c.propertyName || 'Propiedad'}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  Cliente: {c.clientName || c.clientEmail || '–'}
                                </p>
                                {c.value && (
                                  <p className="text-xs text-primary font-bold mt-1">
                                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(c.value)}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                <span className={`text-xs px-2 py-0.5 rounded-md border font-medium ${
                                  CONTRACT_STATUS_STYLES[c.status] || CONTRACT_STATUS_STYLES.borrador
                                }`}>
                                  {c.status || 'Borrador'}
                                </span>
                                {c.type && (
                                  <span className="text-xs text-slate-500">{c.type}</span>
                                )}
                              </div>
                            </div>
                            {c.endDate && (
                              <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-800">
                                <FaClock className="text-slate-600 text-xs" />
                                <p className="text-xs text-slate-500">
                                  Vence: {fmt(c.endDate)}
                                </p>
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
