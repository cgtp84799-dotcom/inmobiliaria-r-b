// src/modules/dashboard/pages/DashboardPage.jsx
// ══════════════════════════════════════════════════════════════════════════════
//  DASHBOARD DE PRODUCCIÓN — Inmobiliaria Rincón Bedoya y Asociados
//  Datos 100% reales desde Firebase Firestore
//  Autor actualización: producción lista
// ══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, RadialBarChart, RadialBar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  FaHome, FaUsers, FaFileContract, FaCalendarCheck,
  FaMoneyBillWave, FaBuilding, FaBell, FaArrowUp, FaArrowDown,
  FaEye, FaClock, FaMapMarkerAlt, FaCheckCircle,
  FaHourglassHalf, FaFire, FaSearch, FaTimes, FaCity,
  FaKey, FaHandshake, FaPercent, FaSync, FaChartBar,
  FaUserTie, FaExclamationTriangle, FaRegCalendarAlt,
  FaDoorOpen, FaLayerGroup, FaFilter,
} from 'react-icons/fa';
import { useAuth } from '../../../core/contexts/AuthContext';

// ── Firebase ─────────────────────────────────────────────────────────────────
import {
  collection, getDocs, query, orderBy, limit, where,
  onSnapshot, Timestamp,
} from 'firebase/firestore';
import { db } from '../../../core/config/firebase.config';

// ══════════════════════════════════════════════════════════════════════════════
//  HELPERS DE FORMATO
// ══════════════════════════════════════════════════════════════════════════════

const fmtCOP = (n) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0,
  }).format(n ?? 0);

const fmtMillones = (n) => {
  const v = n ?? 0;
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000)     return `$${(v / 1_000_000).toFixed(0)}M`;
  return fmtCOP(v);
};

const timeAgo = (ts) => {
  if (!ts) return '–';
  const date = ts?.toDate ? ts.toDate() : new Date(ts);
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60)   return 'ahora';
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
};

const monthLabel = (date) =>
  date.toLocaleDateString('es-CO', { month: 'short' });

// Meses últimos N meses como etiquetas
const lastNMonths = (n) => {
  const months = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push({ label: monthLabel(d), year: d.getFullYear(), month: d.getMonth() });
  }
  return months;
};

// ══════════════════════════════════════════════════════════════════════════════
//  HOOK PRINCIPAL — carga datos reales de Firestore
// ══════════════════════════════════════════════════════════════════════════════

function useDashboardData() {
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Estado principal
  const [stats, setStats]           = useState(null);
  const [visitsByMonth, setVisitsByMonth] = useState([]);
  const [clientsTrend, setClientsTrend]   = useState([]);
  const [propsByType, setPropsByType]     = useState([]);
  const [contractStatus, setContractStatus] = useState([]);
  const [topProperties, setTopProperties]   = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [agents, setAgents]         = useState([]);
  const [conversion, setConversion] = useState([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // ── 1. Cargar colecciones base en paralelo ────────────────────────────
      const [
        propsSnap, clientsSnap, contractsSnap, visitsSnap, usersSnap,
      ] = await Promise.all([
        getDocs(collection(db, 'properties')),
        getDocs(collection(db, 'clients')),
        getDocs(collection(db, 'contracts')),
        getDocs(query(collection(db, 'visits'), orderBy('createdAt', 'desc'), limit(200))),
        getDocs(query(collection(db, 'users'), where('role', '==', 'agent'))),
      ]);

      const properties = propsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const clients    = clientsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const contracts  = contractsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const visits     = visitsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const agentsList = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // ── 2. KPI Stats ──────────────────────────────────────────────────────
      const disponibles = properties.filter(p => p.status === 'disponible');
      const vendidas    = properties.filter(p => p.status === 'vendida');
      const arrendadas  = properties.filter(p => p.status === 'arrendada');
      const reservadas  = properties.filter(p => p.status === 'reservada');

      // Valor portafolio: suma de price.sale o price (campo directo)
      const totalValue = properties.reduce((sum, p) => {
        const precio = p.price?.sale || p.price?.rent || p.price || 0;
        return sum + (typeof precio === 'number' ? precio : 0);
      }, 0);

      const activeClients  = clients.filter(c => c.status === 'active');
      const leads          = clients.filter(c => c.status === 'lead');
      const activeContracts  = contracts.filter(c => ['active', 'pendingsignature'].includes(c.status));
      const pendingContracts = contracts.filter(c => c.status === 'pendingsignature');

      // Visitas este mes
      const now = new Date();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const visitsThisMonth = visits.filter(v => {
        const d = v.createdAt?.toDate?.() || new Date(v.createdAt || 0);
        return d >= firstOfMonth;
      });
      const pendingVisits = visits.filter(v => v.status === 'pending');

      setStats({
        totalProperties:     properties.length,
        availableProperties: disponibles.length,
        soldProperties:      vendidas.length,
        rentedProperties:    arrendadas.length,
        reservedProperties:  reservadas.length,
        totalClients:        clients.length,
        activeClients:       activeClients.length,
        leads:               leads.length,
        totalContracts:      contracts.length,
        activeContracts:     activeContracts.length,
        pendingContracts:    pendingContracts.length,
        totalValue,
        visitsThisMonth:     visitsThisMonth.length,
        pendingVisits:       pendingVisits.length,
      });

      // ── 3. Visitas por mes (últimos 7 meses) ─────────────────────────────
      const months = lastNMonths(7);
      const visitsByMonthData = months.map(({ label, year, month }) => {
        const monthVisits = visits.filter(v => {
          const d = v.createdAt?.toDate?.() || new Date(v.createdAt || 0);
          return d.getFullYear() === year && d.getMonth() === month;
        });
        return {
          mes:        label,
          visitas:    monthVisits.length,
          aprobadas:  monthVisits.filter(v => v.status === 'approved').length,
          rechazadas: monthVisits.filter(v => v.status === 'rejected').length,
          pendientes: monthVisits.filter(v => v.status === 'pending').length,
        };
      });
      setVisitsByMonth(visitsByMonthData);

      // ── 4. Clientes nuevos vs leads por mes ──────────────────────────────
      const clientsTrendData = months.map(({ label, year, month }) => {
        const monthClients = clients.filter(c => {
          const d = c.createdAt?.toDate?.() || new Date(c.createdAt || 0);
          return d.getFullYear() === year && d.getMonth() === month;
        });
        return {
          mes:    label,
          nuevos: monthClients.filter(c => c.status === 'active').length,
          leads:  monthClients.filter(c => c.status === 'lead').length,
        };
      });
      setClientsTrend(clientsTrendData);

      // ── 5. Propiedades por tipo ───────────────────────────────────────────
      const typeMap = {};
      properties.forEach(p => {
        const tipo = p.type || 'Otro';
        if (!typeMap[tipo]) typeMap[tipo] = { cantidad: 0, valor: 0 };
        typeMap[tipo].cantidad++;
        const precio = p.price?.sale || p.price?.rent || p.price || 0;
        typeMap[tipo].valor += typeof precio === 'number' ? precio : 0;
      });

      const TYPE_LABELS = {
        casa: 'Casas', apartamento: 'Aptos', lote: 'Lotes',
        finca: 'Fincas', local: 'Locales', oficina: 'Oficinas',
        bodega: 'Bodegas',
      };
      const propsByTypeData = Object.entries(typeMap)
        .map(([tipo, data]) => ({
          tipo: TYPE_LABELS[tipo] || tipo,
          ...data,
        }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 6);
      setPropsByType(propsByTypeData);

      // ── 6. Estado de contratos ────────────────────────────────────────────
      const contractGroups = {
        active:           { name: 'Activos',     color: '#22c55e', value: 0 },
        pendingsignature: { name: 'Por firmar',  color: '#f59e0b', value: 0 },
        draft:            { name: 'Borrador',    color: '#64748b', value: 0 },
        completed:        { name: 'Completados', color: '#3b82f6', value: 0 },
        cancelled:        { name: 'Cancelados',  color: '#ef4444', value: 0 },
      };
      contracts.forEach(c => {
        if (contractGroups[c.status]) contractGroups[c.status].value++;
        else contractGroups.draft.value++;
      });
      setContractStatus(
        Object.values(contractGroups).filter(g => g.value > 0)
      );

      // ── 7. Top propiedades por "views" o recientes ───────────────────────
      // Usamos views si existe, si no orderBy createdAt desc
      const topProps = [...properties]
        .sort((a, b) => (b.views || b.viewCount || 0) - (a.views || a.viewCount || 0))
        .slice(0, 5)
        .map(p => ({
          id:     p.id,
          title:  p.title || 'Sin título',
          type:   p.type || '–',
          city:   p.location?.city || p.city || 'Anserma',
          price:  p.price?.sale || p.price?.rent || p.price || 0,
          views:  p.views || p.viewCount || 0,
          status: p.status || 'disponible',
        }));
      // Si no hay views registrados, mostrar los más recientes
      const topPropsToShow = topProps.some(p => p.views > 0)
        ? topProps
        : [...properties]
            .sort((a, b) => ((b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)))
            .slice(0, 5)
            .map(p => ({
              id:    p.id,
              title: p.title || 'Sin título',
              type:  p.type || '–',
              city:  p.location?.city || p.city || 'Anserma',
              price: p.price?.sale || p.price?.rent || p.price || 0,
              views: p.views || p.viewCount || 0,
              status: p.status || 'disponible',
            }));
      setTopProperties(topPropsToShow);

      // ── 8. Actividad reciente (mix de colecciones) ────────────────────────
      const activityItems = [];

      // Últimas visitas
      visits.slice(0, 5).forEach(v => {
        activityItems.push({
          type:    'visit',
          action:  v.status === 'approved' ? 'Visita aprobada' :
                   v.status === 'rejected' ? 'Visita rechazada' : 'Visita solicitada',
          subject: v.propertyName || 'Propiedad',
          user:    v.clientName || v.agentName || '–',
          ts:      v.createdAt,
        });
      });

      // Últimos contratos
      const recentContracts = [...contracts]
        .sort((a, b) => ((b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)))
        .slice(0, 4);
      recentContracts.forEach(c => {
        activityItems.push({
          type:    'contract',
          action:  c.status === 'active' ? 'Contrato activo' :
                   c.status === 'pendingsignature' ? 'Contrato pendiente firma' :
                   c.status === 'completed' ? 'Contrato completado' : 'Contrato creado',
          subject: c.parties?.buyer?.name || c.propertyName || '–',
          user:    c.agentName || '–',
          ts:      c.createdAt,
        });
      });

      // Últimos clientes
      const recentClients = [...clients]
        .sort((a, b) => ((b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)))
        .slice(0, 3);
      recentClients.forEach(c => {
        activityItems.push({
          type:    'client',
          action:  c.status === 'lead' ? 'Nuevo lead registrado' : 'Cliente registrado',
          subject: c.personalInfo?.name || c.nombre || c.name || '–',
          user:    'Admin',
          ts:      c.createdAt,
        });
      });

      // Últimas propiedades
      const recentProps = [...properties]
        .sort((a, b) => ((b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)))
        .slice(0, 3);
      recentProps.forEach(p => {
        activityItems.push({
          type:    'property',
          action:  'Propiedad publicada',
          subject: p.title || '–',
          user:    'Admin',
          ts:      p.createdAt,
        });
      });

      // Ordenar por timestamp y tomar 10
      activityItems.sort((a, b) => ((b.ts?.seconds || 0) - (a.ts?.seconds || 0)));
      setRecentActivity(activityItems.slice(0, 10));

      // ── 9. Agentes con stats del mes ─────────────────────────────────────
      const AGENT_COLORS = ['#f59e0b', '#3b82f6', '#22c55e', '#a855f7', '#06b6d4', '#ec4899'];
      const agentsWithStats = agentsList.slice(0, 6).map((agent, i) => {
        const email = agent.email;
        const agentVisits    = visitsThisMonth.filter(v => v.agentEmail === email).length;
        const agentContracts = contracts.filter(
          c => c.agentEmail === email && ['active', 'completed'].includes(c.status)
        ).length;
        const nameParts = (agent.displayName || agent.name || 'Agente').split(' ');
        const initials = nameParts.length >= 2
          ? `${nameParts[0][0]}${nameParts[1][0]}`
          : nameParts[0].substring(0, 2);
        return {
          name:       agent.displayName || agent.name || '–',
          initials:   initials.toUpperCase(),
          visitas:    agentVisits,
          contratos:  agentContracts,
          color:      AGENT_COLORS[i % AGENT_COLORS.length],
        };
      });
      setAgents(agentsWithStats);

      // ── 10. Tasas de conversión ───────────────────────────────────────────
      const totalLeads       = leads.length || 1;
      const totalActiveProps = properties.length || 1;
      const conversionVentas = properties.length > 0
        ? Math.round((vendidas.length / totalActiveProps) * 100)
        : 0;
      const conversionArriendos = properties.length > 0
        ? Math.round((arrendadas.length / totalActiveProps) * 100)
        : 0;
      const conversionLeads = clients.length > 0
        ? Math.round((activeClients.length / clients.length) * 100)
        : 0;

      setConversion([
        { name: 'Ventas',    value: conversionVentas,    fill: '#22c55e' },
        { name: 'Arriendos', value: conversionArriendos, fill: '#3b82f6' },
        { name: 'Leads→CLI', value: conversionLeads,     fill: '#f59e0b' },
      ]);

      setLastUpdated(new Date());
    } catch (err) {
      console.error('Dashboard error:', err);
      setError(err.message || 'Error cargando datos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return {
    loading, error, lastUpdated, load,
    stats, visitsByMonth, clientsTrend, propsByType,
    contractStatus, topProperties, recentActivity, agents, conversion,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
//  HOOK — count-up animado
// ══════════════════════════════════════════════════════════════════════════════

function useCountUp(target, duration = 1200) {
  const [value, setValue] = useState(0);
  const prevTarget = useRef(0);
  useEffect(() => {
    if (target === prevTarget.current) return;
    prevTarget.current = target;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setValue(target); clearInterval(timer); }
      else setValue(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return value;
}

// ══════════════════════════════════════════════════════════════════════════════
//  CONSTANTES DE ESTILO
// ══════════════════════════════════════════════════════════════════════════════

const STATUS_STYLES = {
  disponible: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  vendida:    'bg-red-500/15 text-red-400 border-red-500/30',
  arrendada:  'bg-blue-500/15 text-blue-400 border-blue-500/30',
  reservada:  'bg-amber-500/15 text-amber-400 border-amber-500/30',
};

const ACTIVITY_CFG = {
  visit:    { icon: FaCalendarCheck, bg: 'bg-green-500/15',  text: 'text-green-400'  },
  contract: { icon: FaFileContract,  bg: 'bg-blue-500/15',   text: 'text-blue-400'   },
  client:   { icon: FaUsers,         bg: 'bg-amber-500/15',  text: 'text-amber-400'  },
  property: { icon: FaBuilding,      bg: 'bg-purple-500/15', text: 'text-purple-400' },
};

const CHART_COLORS = ['#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#06b6d4', '#ec4899'];

// ══════════════════════════════════════════════════════════════════════════════
//  SUB-COMPONENTES
// ══════════════════════════════════════════════════════════════════════════════

// ── KPI Card ─────────────────────────────────────────────────────────────────
const KpiCard = ({ icon: Icon, label, value, sub, accent = '#f59e0b', delay = 0, isCurrency = false, change }) => {
  const animated = useCountUp(typeof value === 'number' ? value : 0, 1000 + delay * 150);
  const display  = isCurrency ? fmtMillones(animated) : animated.toLocaleString('es-CO');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.07, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3, transition: { duration: 0.18 } }}
      className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-5 cursor-default group"
      style={{ boxShadow: `0 0 0 1px ${accent}12` }}
    >
      {/* Glow fondo */}
      <div
        className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full opacity-10 blur-2xl group-hover:opacity-20 transition-opacity duration-500"
        style={{ background: accent }}
      />
      {/* Borde superior */}
      <div className="absolute top-0 left-0 h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${accent}00, ${accent}, ${accent}00)` }} />

      <div className="flex items-start justify-between mb-3">
        <div className="rounded-xl p-2.5" style={{ background: `${accent}18` }}>
          <Icon style={{ color: accent }} className="text-base" />
        </div>
        {typeof change === 'number' && (
          <span className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg ${change >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
            {change >= 0 ? <FaArrowUp className="text-[8px]" /> : <FaArrowDown className="text-[8px]" />}
            {Math.abs(change)}%
          </span>
        )}
      </div>
      <p className="text-xs font-medium text-slate-400 mb-1 leading-snug">{label}</p>
      <p className="text-2xl font-bold text-white tabular-nums leading-tight">{display}</p>
      {sub && <p className="text-[11px] text-slate-500 mt-1">{sub}</p>}
    </motion.div>
  );
};

// ── Section Header ────────────────────────────────────────────────────────────
const SectionHeader = ({ title, sub, children }) => (
  <div className="flex items-end justify-between mb-4">
    <div>
      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-0.5">{sub}</p>
      <h3 className="text-base font-bold text-white">{title}</h3>
    </div>
    {children}
  </div>
);

// ── Chart Card ────────────────────────────────────────────────────────────────
const ChartCard = ({ title, sub, children, className = '', action }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    className={`rounded-2xl border border-slate-800 bg-slate-900 p-5 ${className}`}
  >
    {(title || sub) && (
      <div className="flex items-center justify-between mb-4">
        <div>
          {sub && <p className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mb-0.5">{sub}</p>}
          {title && <p className="text-sm font-semibold text-white">{title}</p>}
        </div>
        {action}
      </div>
    )}
    {children}
  </motion.div>
);

// ── Custom Tooltip Recharts ───────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/95 backdrop-blur-sm px-3 py-2 text-xs shadow-2xl">
      {label && <p className="text-slate-400 mb-1.5 font-medium">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="font-semibold" style={{ color: p.color || p.fill }}>
          {p.name}:{' '}
          <span className="text-white">
            {typeof p.value === 'number' && p.value > 100_000
              ? fmtMillones(p.value)
              : p.value}
          </span>
        </p>
      ))}
    </div>
  );
};

// ── Skeleton loader ──────────────────────────────────────────────────────────
const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse rounded-lg bg-slate-800 ${className}`} />
);

const KpiSkeleton = () => (
  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-3">
    <Skeleton className="w-10 h-10 rounded-xl" />
    <Skeleton className="h-3 w-24" />
    <Skeleton className="h-7 w-16" />
  </div>
);

// ── Empty state ───────────────────────────────────────────────────────────────
const EmptyState = ({ icon: Icon = FaChartBar, message = 'Sin datos' }) => (
  <div className="flex flex-col items-center justify-center py-10 text-slate-600 gap-2">
    <Icon className="text-3xl opacity-40" />
    <p className="text-xs">{message}</p>
  </div>
);

// ── Metric row (agent performance) ───────────────────────────────────────────
const AgentRow = ({ agent, maxVisitas, delay }) => (
  <motion.div
    initial={{ opacity: 0, x: -12 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay, duration: 0.35 }}
    className="flex items-center gap-3 py-2"
  >
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-900 font-bold text-xs flex-shrink-0"
      style={{ background: agent.color }}
    >
      {agent.initials}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-medium text-white truncate leading-tight">{agent.name}</p>
      <div className="flex gap-1.5 mt-1.5 items-center">
        <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: maxVisitas > 0 ? `${(agent.visitas / maxVisitas) * 100}%` : '0%' }}
            transition={{ delay: delay + 0.2, duration: 0.7, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ background: agent.color }}
          />
        </div>
        <span className="text-[10px] text-slate-500 flex-shrink-0">{agent.visitas} vis.</span>
      </div>
    </div>
    <div className="text-right flex-shrink-0">
      <p className="text-sm font-bold" style={{ color: agent.color }}>{agent.contratos}</p>
      <p className="text-[10px] text-slate-500">ctr</p>
    </div>
  </motion.div>
);

// ── Mini agent card ────────────────────────────────────────────────────────────
const AgentCard = ({ agent, delay }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.92 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay, duration: 0.4, ease: [0.34, 1.4, 0.64, 1] }}
    whileHover={{ y: -3 }}
    className="rounded-2xl border border-slate-800 bg-slate-900 p-4 flex flex-col items-center gap-3 text-center"
  >
    <div
      className="w-11 h-11 rounded-xl flex items-center justify-center text-slate-900 font-bold text-xs shadow-lg"
      style={{ background: agent.color }}
    >
      {agent.initials}
    </div>
    <div>
      <p className="text-xs font-semibold text-white leading-tight">{agent.name}</p>
      <p className="text-[10px] text-slate-500 mt-0.5">Agente</p>
    </div>
    <div className="w-full border-t border-slate-800 pt-3 grid grid-cols-2 gap-2">
      <div>
        <p className="text-lg font-bold text-white tabular-nums">{agent.visitas}</p>
        <p className="text-[10px] text-slate-500">Visitas</p>
      </div>
      <div>
        <p className="text-lg font-bold tabular-nums" style={{ color: agent.color }}>{agent.contratos}</p>
        <p className="text-[10px] text-slate-500">Contratos</p>
      </div>
    </div>
  </motion.div>
);

// ── Activity item ─────────────────────────────────────────────────────────────
const ActivityItem = ({ item, delay }) => {
  const cfg = ACTIVITY_CFG[item.type] || ACTIVITY_CFG.property;
  const { icon: Icon, bg, text } = cfg;
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="flex items-start gap-3 py-2.5 border-b border-slate-800/70 last:border-0"
    >
      <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
        <Icon className={`${text} text-xs`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-white truncate">{item.action}</p>
        <p className="text-[11px] text-slate-400 truncate">{item.subject}</p>
        {item.user && item.user !== 'Admin' && (
          <p className="text-[10px] text-slate-600 truncate">{item.user}</p>
        )}
      </div>
      <span className="text-[10px] text-slate-600 flex-shrink-0 mt-0.5 flex items-center gap-1">
        <FaClock className="text-[8px]" />
        {timeAgo(item.ts)}
      </span>
    </motion.div>
  );
};

// ── Summary donut legend ────────────────────────────────────────────────────
const DonutLegend = ({ data }) => (
  <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3">
    {data.map(item => (
      <div key={item.name} className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color || item.fill }} />
        <span className="text-xs text-slate-400 truncate">{item.name}</span>
        <span className="text-xs font-semibold text-white ml-auto">{item.value}</span>
      </div>
    ))}
  </div>
);

// ──────────────────────────────────────────────────────────────────────────────
//  PANEL SUMARIO SUPERIOR (tarjeta portfolio overview)
// ──────────────────────────────────────────────────────────────────────────────
const PortfolioSummary = ({ stats }) => {
  if (!stats) return null;
  const total = stats.totalProperties || 1;
  const segments = [
    { label: 'Disponibles', value: stats.availableProperties, color: '#22c55e' },
    { label: 'Arrendadas',  value: stats.rentedProperties,    color: '#3b82f6' },
    { label: 'Vendidas',    value: stats.soldProperties,      color: '#ef4444' },
    { label: 'Reservadas',  value: stats.reservedProperties || 0, color: '#f59e0b' },
  ];
  return (
    <ChartCard className="mb-0">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <p className="text-[11px] text-slate-500 uppercase tracking-widest mb-1">Estado del inventario</p>
          <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-3">
            {segments.map(s => (
              <motion.div
                key={s.label}
                initial={{ width: 0 }}
                animate={{ width: `${(s.value / total) * 100}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                style={{ background: s.color }}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {segments.map(s => (
              <div key={s.label} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                <span className="text-[11px] text-slate-400">{s.label}</span>
                <span className="text-[11px] font-bold text-white">{s.value}</span>
                <span className="text-[10px] text-slate-600">({Math.round((s.value / total) * 100)}%)</span>
              </div>
            ))}
          </div>
        </div>
        <div className="sm:text-right flex-shrink-0">
          <p className="text-[11px] text-slate-500 mb-0.5">Valor total portafolio</p>
          <p className="text-2xl font-bold text-amber-400">{fmtMillones(stats.totalValue)}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">{stats.totalProperties} propiedades en total</p>
        </div>
      </div>
    </ChartCard>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
//  PÁGINA PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab]   = useState('general');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);

  const {
    loading, error, lastUpdated, load,
    stats, visitsByMonth, clientsTrend, propsByType,
    contractStatus, topProperties, recentActivity, agents, conversion,
  } = useDashboardData();

  const now      = new Date();
  const hour     = now.getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  const firstName = currentUser?.displayName?.split(' ')[0] ?? 'Admin';

  const TABS = [
    { id: 'general',     label: 'General',      icon: FaChartBar   },
    { id: 'propiedades', label: 'Propiedades',   icon: FaBuilding   },
    { id: 'clientes',    label: 'Clientes',      icon: FaUsers      },
  ];

  const maxAgentVisits = agents.length ? Math.max(...agents.map(a => a.visitas), 1) : 1;

  // ── Render de error ─────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 max-w-md text-center space-y-4">
          <FaExclamationTriangle className="text-red-400 text-3xl mx-auto" />
          <p className="text-white font-semibold">Error cargando el dashboard</p>
          <p className="text-slate-400 text-sm">{error}</p>
          <button
            onClick={load}
            className="mt-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm rounded-xl transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 md:px-8 space-y-7">

      {/* ── HEADER ───────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <p className="text-xs text-slate-500 mb-1 flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {now.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <h1 className="text-xl font-bold text-white">
            {greeting}, <span className="text-amber-400">{firstName}</span> 👋
          </h1>
          {stats && (
            <p className="text-sm text-slate-400 mt-0.5">
              Portafolio:{' '}
              <span className="text-white font-semibold">{fmtMillones(stats.totalValue)}</span>
              {' · '}
              <span className="text-emerald-400">{stats.availableProperties} disponibles</span>
              {stats.pendingVisits > 0 && (
                <span className="text-amber-400"> · {stats.pendingVisits} visitas pendientes</span>
              )}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {/* Búsqueda */}
          <AnimatePresence>
            {searchOpen ? (
              <motion.div key="s-open" initial={{ width: 36, opacity: 0 }} animate={{ width: 210, opacity: 1 }} exit={{ width: 36, opacity: 0 }} className="relative">
                <input
                  ref={searchRef}
                  autoFocus
                  placeholder="Buscar propiedad, cliente…"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-8 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
                />
                <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs" />
                <button onClick={() => setSearchOpen(false)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                  <FaTimes className="text-xs" />
                </button>
              </motion.div>
            ) : (
              <motion.button
                key="s-closed"
                whileTap={{ scale: 0.93 }}
                onClick={() => setSearchOpen(true)}
                className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-600 transition-colors"
              >
                <FaSearch className="text-xs" />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Actualizar */}
          <motion.button
            whileTap={{ scale: 0.9, rotate: 180 }}
            onClick={load}
            disabled={loading}
            title={lastUpdated ? `Actualizado: ${lastUpdated.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}` : 'Actualizar'}
            className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-amber-400 hover:border-amber-500/40 transition-colors disabled:opacity-50"
          >
            <FaSync className={`text-xs ${loading ? 'animate-spin' : ''}`} />
          </motion.button>

          {/* Notificaciones */}
          <div className="relative">
            <motion.button
              whileTap={{ scale: 0.93 }}
              className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-amber-400 hover:border-amber-500/40 transition-colors"
            >
              <FaBell className="text-xs" />
            </motion.button>
            {stats?.pendingVisits > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center border-2 border-slate-950">
                {stats.pendingVisits > 9 ? '9+' : stats.pendingVisits}
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── TABS ─────────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800 w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.id
                ? 'bg-amber-500 text-slate-900 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <t.icon className="text-xs" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
           TAB: GENERAL
      ══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence mode="wait">
        {activeTab === 'general' && (
          <motion.div
            key="general"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-7"
          >
            {/* Barra de inventario */}
            {loading
              ? <Skeleton className="h-20 w-full rounded-2xl" />
              : <PortfolioSummary stats={stats} />
            }

            {/* KPI Row 1 */}
            <section>
              <SectionHeader title="Resumen del portafolio" sub="KPIs principales" />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => <KpiSkeleton key={i} />)
                  : <>
                      <KpiCard icon={FaBuilding}      label="Total propiedades"  value={stats?.totalProperties}     accent="#f59e0b" delay={0} />
                      <KpiCard icon={FaKey}           label="Disponibles"        value={stats?.availableProperties} accent="#22c55e" delay={1} />
                      <KpiCard icon={FaUsers}         label="Clientes activos"   value={stats?.activeClients}       accent="#3b82f6" delay={2} />
                      <KpiCard icon={FaFileContract}  label="Contratos activos"  value={stats?.activeContracts}     accent="#a855f7" delay={3} />
                      <KpiCard icon={FaMoneyBillWave} label="Valor portafolio"   value={stats?.totalValue}          accent="#f59e0b" delay={4} isCurrency />
                    </>
                }
              </div>
            </section>

            {/* KPI Row 2 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
                : <>
                    <KpiCard icon={FaCalendarCheck}  label="Visitas este mes"    value={stats?.visitsThisMonth}    accent="#06b6d4" delay={0} />
                    <KpiCard icon={FaHourglassHalf}  label="Visitas pendientes"  value={stats?.pendingVisits}      accent="#f97316" delay={1} />
                    <KpiCard icon={FaHandshake}      label="Por firmar"          value={stats?.pendingContracts}   accent="#ec4899" delay={2} />
                    <KpiCard icon={FaFire}           label="Leads activos"       value={stats?.leads}              accent="#ef4444" delay={3} />
                  </>
              }
            </div>

            {/* Fila: Visitas area + Contratos donut */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <ChartCard title="Visitas por mes" sub="Actividad de campo" className="lg:col-span-3">
                {loading
                  ? <Skeleton className="h-52 w-full" />
                  : visitsByMonth.every(v => v.visitas === 0)
                    ? <EmptyState message="Sin visitas registradas aún" />
                    : (
                      <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={visitsByMonth} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                          <defs>
                            <linearGradient id="gVisitas" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}   />
                            </linearGradient>
                            <linearGradient id="gAprobadas" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.25} />
                              <stop offset="95%" stopColor="#22c55e" stopOpacity={0}    />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="mes" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                          <Area type="monotone" dataKey="visitas"   name="Total"     stroke="#f59e0b" strokeWidth={2} fill="url(#gVisitas)"   dot={false} />
                          <Area type="monotone" dataKey="aprobadas" name="Aprobadas" stroke="#22c55e" strokeWidth={2} fill="url(#gAprobadas)" dot={false} />
                          <Area type="monotone" dataKey="pendientes" name="Pendientes" stroke="#f97316" strokeWidth={1.5} fill="none" dot={false} strokeDasharray="4 2" />
                        </AreaChart>
                      </ResponsiveContainer>
                    )
                }
              </ChartCard>

              <ChartCard title="Estado de contratos" sub="Distribución" className="lg:col-span-2">
                {loading
                  ? <Skeleton className="h-52 w-full" />
                  : contractStatus.length === 0
                    ? <EmptyState message="Sin contratos aún" />
                    : (
                      <>
                        <ResponsiveContainer width="100%" height={180}>
                          <PieChart>
                            <Pie
                              data={contractStatus}
                              cx="50%" cy="50%"
                              innerRadius={52} outerRadius={78}
                              paddingAngle={3} dataKey="value"
                            >
                              {contractStatus.map((entry, i) => (
                                <Cell key={i} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                        <DonutLegend data={contractStatus} />
                      </>
                    )
                }
              </ChartCard>
            </div>

            {/* Fila: Agentes rendimiento + Actividad reciente */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <ChartCard title="Top propiedades" sub="Más recientes / vistas" className="lg:col-span-3">
                {loading
                  ? <Skeleton className="h-48 w-full" />
                  : topProperties.length === 0
                    ? <EmptyState message="Sin propiedades registradas" />
                    : (
                      <div className="space-y-2">
                        {topProperties.map((p, i) => (
                          <motion.div
                            key={p.id}
                            initial={{ opacity: 0, x: -14 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.07, duration: 0.35 }}
                            className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-800 hover:border-slate-700 transition-colors"
                          >
                            <span className="text-xs font-bold text-slate-600 w-4 text-center tabular-nums">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">{p.title}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                  <FaMapMarkerAlt className="text-[9px]" />{p.city}
                                </span>
                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md border capitalize ${STATUS_STYLES[p.status] || STATUS_STYLES.disponible}`}>
                                  {p.status}
                                </span>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-xs font-semibold text-amber-400">{fmtMillones(p.price)}</p>
                              {p.views > 0 && (
                                <p className="text-[10px] text-slate-500 flex items-center gap-1 justify-end">
                                  <FaEye className="text-[9px]" />{p.views}
                                </p>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )
                }
              </ChartCard>

              <ChartCard title="Actividad reciente" sub="Últimas acciones" className="lg:col-span-2">
                {loading
                  ? <Skeleton className="h-48 w-full" />
                  : recentActivity.length === 0
                    ? <EmptyState message="Sin actividad registrada" />
                    : recentActivity.map((item, i) => (
                        <ActivityItem key={i} item={item} delay={i * 0.05} />
                      ))
                }
              </ChartCard>
            </div>

            {/* Fila: agentes rendimiento */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard title="Rendimiento agentes" sub="Mes actual">
                {loading
                  ? <Skeleton className="h-40 w-full" />
                  : agents.length === 0
                    ? <EmptyState message="Sin agentes registrados" icon={FaUserTie} />
                    : (
                      <div className="divide-y divide-slate-800/60">
                        {agents.map((agent, i) => (
                          <AgentRow key={i} agent={agent} maxVisitas={maxAgentVisits} delay={i * 0.06} />
                        ))}
                      </div>
                    )
                }
              </ChartCard>

              <ChartCard title="Clientes: nuevos vs leads" sub="Tendencia 7 meses">
                {loading
                  ? <Skeleton className="h-40 w-full" />
                  : clientsTrend.every(c => c.nuevos === 0 && c.leads === 0)
                    ? <EmptyState message="Sin datos de clientes" />
                    : (
                      <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={clientsTrend} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="mes" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                          <Line type="monotone" dataKey="nuevos" name="Clientes nuevos" stroke="#22c55e" strokeWidth={2.5} dot={{ fill: '#22c55e', r: 3 }} activeDot={{ r: 5 }} />
                          <Line type="monotone" dataKey="leads"  name="Leads"           stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: '#f59e0b', r: 3 }} activeDot={{ r: 5 }} strokeDasharray="5 3" />
                        </LineChart>
                      </ResponsiveContainer>
                    )
                }
              </ChartCard>
            </div>

            {/* Mini cards agentes */}
            {!loading && agents.length > 0 && (
              <section>
                <SectionHeader title="Equipo de agentes" sub="Mes actual" />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {agents.map((a, i) => <AgentCard key={i} agent={a} delay={i * 0.06} />)}
                </div>
              </section>
            )}
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
             TAB: PROPIEDADES
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'propiedades' && (
          <motion.div
            key="propiedades"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
                : <>
                    <KpiCard icon={FaBuilding}  label="Total"       value={stats?.totalProperties}     accent="#f59e0b" />
                    <KpiCard icon={FaKey}       label="Disponibles" value={stats?.availableProperties} accent="#22c55e" />
                    <KpiCard icon={FaHandshake} label="Vendidas"    value={stats?.soldProperties}      accent="#3b82f6" />
                    <KpiCard icon={FaCity}      label="Arrendadas"  value={stats?.rentedProperties}    accent="#a855f7" />
                  </>
              }
            </div>

            {/* BarChart por tipo */}
            <ChartCard title="Propiedades por tipo" sub="Distribución del inventario">
              {loading
                ? <Skeleton className="h-64 w-full" />
                : propsByType.length === 0
                  ? <EmptyState message="Sin propiedades" />
                  : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={propsByType} margin={{ top: 5, right: 5, bottom: 0, left: -15 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="tipo" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="cantidad" name="Propiedades" radius={[6, 6, 0, 0]}>
                          {propsByType.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )
              }
            </ChartCard>

            {/* Horizontal bar — valor por tipo */}
            <ChartCard title="Valor estimado por tipo (COP)" sub="Distribución de valor">
              {loading
                ? <Skeleton className="h-52 w-full" />
                : propsByType.length === 0
                  ? <EmptyState message="Sin propiedades" />
                  : (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={propsByType} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 50 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                        <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={fmtMillones} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="tipo" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={55} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="valor" name="Valor" radius={[0, 6, 6, 0]} fill="#f59e0b" />
                      </BarChart>
                    </ResponsiveContainer>
                  )
              }
            </ChartCard>

            {/* Tabla top propiedades */}
            <ChartCard title="Listado de propiedades recientes" sub="Últimas publicadas">
              {loading
                ? <Skeleton className="h-48 w-full" />
                : topProperties.length === 0
                  ? <EmptyState message="Sin propiedades" />
                  : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-slate-500 uppercase tracking-wider border-b border-slate-800">
                            <th className="pb-3 text-left font-medium">#</th>
                            <th className="pb-3 text-left font-medium">Propiedad</th>
                            <th className="pb-3 text-left font-medium hidden sm:table-cell">Ciudad</th>
                            <th className="pb-3 text-left font-medium">Precio</th>
                            <th className="pb-3 text-left font-medium">Estado</th>
                            {topProperties.some(p => p.views > 0) && (
                              <th className="pb-3 text-right font-medium">Vistas</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {topProperties.map((p, i) => (
                            <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                              <td className="py-3 text-xs text-slate-600 font-bold">{i + 1}</td>
                              <td className="py-3">
                                <p className="text-white text-xs font-medium truncate max-w-[180px]">{p.title}</p>
                                <p className="text-slate-500 text-[10px] capitalize">{p.type}</p>
                              </td>
                              <td className="py-3 text-xs text-slate-400 hidden sm:table-cell">{p.city}</td>
                              <td className="py-3 text-xs font-semibold text-amber-400">{fmtMillones(p.price)}</td>
                              <td className="py-3">
                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-lg border capitalize ${STATUS_STYLES[p.status] || STATUS_STYLES.disponible}`}>
                                  {p.status}
                                </span>
                              </td>
                              {topProperties.some(pp => pp.views > 0) && (
                                <td className="py-3 text-right text-xs text-white font-semibold">{p.views || '–'}</td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
              }
            </ChartCard>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
             TAB: CLIENTES
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'clientes' && (
          <motion.div
            key="clientes"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
                : <>
                    <KpiCard icon={FaUsers}       label="Total clientes" value={stats?.totalClients}   accent="#f59e0b" />
                    <KpiCard icon={FaCheckCircle} label="Activos"        value={stats?.activeClients}  accent="#22c55e" />
                    <KpiCard icon={FaFire}        label="Leads"          value={stats?.leads}          accent="#ef4444" />
                    <KpiCard icon={FaPercent}     label="Conversión"     value={
                      stats?.totalClients > 0
                        ? Math.round((stats.activeClients / stats.totalClients) * 100)
                        : 0
                    } accent="#a855f7" />
                  </>
              }
            </div>

            {/* Clientes nuevos vs leads */}
            <ChartCard title="Clientes nuevos vs Leads" sub="Tendencia 7 meses">
              {loading
                ? <Skeleton className="h-64 w-full" />
                : clientsTrend.every(c => c.nuevos === 0 && c.leads === 0)
                  ? <EmptyState message="Sin datos de clientes" />
                  : (
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={clientsTrend} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="mes" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                        <Line type="monotone" dataKey="nuevos" name="Clientes nuevos" stroke="#22c55e" strokeWidth={2.5} dot={{ fill: '#22c55e', r: 3 }} activeDot={{ r: 5 }} />
                        <Line type="monotone" dataKey="leads"  name="Leads"           stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: '#f59e0b', r: 3 }} activeDot={{ r: 5 }} strokeDasharray="5 3" />
                      </LineChart>
                    </ResponsiveContainer>
                  )
              }
            </ChartCard>

            {/* Conversión radial */}
            <ChartCard title="Tasas de conversión" sub="Por canal">
              {loading
                ? <Skeleton className="h-52 w-full" />
                : (
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <ResponsiveContainer width={220} height={200}>
                      <RadialBarChart
                        cx="50%" cy="50%"
                        innerRadius="22%" outerRadius="88%"
                        barSize={14} data={conversion}
                      >
                        <RadialBar minAngle={10} background={{ fill: '#1e293b' }} dataKey="value" />
                        <Tooltip content={<CustomTooltip />} formatter={(v) => [`${v}%`, '']} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="space-y-4">
                      {conversion.map(c => (
                        <div key={c.name} className="flex items-center gap-3">
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: c.fill }} />
                          <div>
                            <p className="text-xs text-slate-400">{c.name}</p>
                            <p className="text-xl font-bold text-white tabular-nums">{c.value}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              }
            </ChartCard>

            {/* Visitas clientes */}
            <ChartCard title="Visitas por mes" sub="Solicitudes y gestión">
              {loading
                ? <Skeleton className="h-52 w-full" />
                : visitsByMonth.every(v => v.visitas === 0)
                  ? <EmptyState message="Sin visitas registradas" />
                  : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={visitsByMonth} margin={{ top: 5, right: 5, bottom: 0, left: -15 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="mes" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                        <Bar dataKey="aprobadas"  name="Aprobadas"  fill="#22c55e" radius={[4, 4, 0, 0]} stackId="a" />
                        <Bar dataKey="pendientes" name="Pendientes" fill="#f59e0b" radius={[4, 4, 0, 0]} stackId="a" />
                        <Bar dataKey="rechazadas" name="Rechazadas" fill="#ef4444" radius={[4, 4, 0, 0]} stackId="a" />
                      </BarChart>
                    </ResponsiveContainer>
                  )
              }
            </ChartCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className="pt-4 border-t border-slate-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
        <p className="text-xs text-slate-600">
          Inmobiliaria Rincón Bedoya y Asociados · Anserma, Caldas
        </p>
        <p className="text-xs text-slate-700 flex items-center gap-1.5">
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${loading ? 'bg-amber-400 animate-pulse' : 'bg-slate-600'}`} />
          {loading
            ? 'Actualizando datos…'
            : lastUpdated
              ? `Actualizado: ${lastUpdated.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`
              : 'Datos no disponibles'
          }
        </p>
      </div>
    </div>
  );
}