// src/modules/dashboard/pages/DashboardPage.jsx
//
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  DASHBOARD PREMIUM — Inmobiliaria Rincón Bedoya y Asociados              ║
// ║                                                                          ║
// ║  Inspiración: Compass Live Market Insights, Realto, Vaulto, Nova.house  ║
// ║                                                                          ║
// ║  Características:                                                        ║
// ║    • Hero cinematográfico con gradient mesh + stats clave                ║
// ║    • 4 tabs: Resumen · Pipeline · Mercado · Equipo                       ║
// ║    • Glass morphism en cards de insights                                 ║
// ║    • Gráficas: Area gradient · Pie con donut · Bar stacked · Radial      ║
// ║    • Cards de insights con micro-animaciones                             ║
// ║    • Mobile-first: 360px → 4K                                            ║
// ║                                                                          ║
// ║  Bugfixes preservados:                                                   ║
// ║    • Schema correcto: estado/tipoCliente en español                      ║
// ║    • Equipo filtrado por rol (admin/member) en query                     ║
// ║    • Top properties: solo si hay views reales                            ║
// ║    • limit() en todas las queries (Ronda B)                              ║
// ╚══════════════════════════════════════════════════════════════════════════╝

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  RadialBarChart, RadialBar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  FaHome, FaUsers, FaFileContract, FaCalendarCheck, FaMoneyBillWave,
  FaBuilding, FaUserTie, FaSync, FaArrowUp, FaArrowDown,
  FaCheckCircle, FaHourglassHalf, FaExclamationTriangle, FaCity, FaKey,
  FaHandshake, FaChartBar, FaEye, FaBolt, FaStar, FaFire, FaTrophy,
  FaChartLine, FaBullseye, FaChartPie, FaCompass, FaLayerGroup,
  FaArrowRight, FaCrown, FaShieldAlt, FaRocket, FaGlobe, FaPercent,
} from 'react-icons/fa';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../../../core/config/firebase.config';
import { useAuth } from '../../../core/contexts/AuthContext';

// ═══════════════════════════════════════════════════════════════════════════
//  HELPERS DE FORMATEO
// ═══════════════════════════════════════════════════════════════════════════

const fmtCOP = (n) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(Number(n) || 0);

const fmtCompactCOP = (n) => {
  const v = Number(n) || 0;
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000)     return `$${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000)         return `$${(v / 1_000).toFixed(0)}K`;
  return fmtCOP(v);
};

const fmtNumber = (n) => new Intl.NumberFormat('es-CO').format(Number(n) || 0);

const toDateSafe = (value) => {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (value instanceof Date) return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const getTimeSafe = (v) => { const d = toDateSafe(v); return d ? d.getTime() : 0; };

const monthLabel = (date) =>
  date.toLocaleDateString('es-CO', { month: 'short' }).replace('.', '');

const lastNMonths = (n) => {
  const months = []; const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ label: monthLabel(d), year: d.getFullYear(), month: d.getMonth() });
  }
  return months;
};

const timeAgo = (ts) => {
  const date = toDateSafe(ts);
  if (!date) return '—';
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60)     return 'ahora';
  if (diff < 3600)   return `${Math.floor(diff / 60)}m`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
};

// ═══════════════════════════════════════════════════════════════════════════
//  NORMALIZADORES — schema en español (estado, tipoCliente)
// ═══════════════════════════════════════════════════════════════════════════

const normalizePropertyStatus = (status) => {
  const s = String(status || '').toLowerCase();
  if (['vendida', 'sold', 'vendido'].includes(s))                 return 'vendida';
  if (['arrendada', 'rented', 'alquilada'].includes(s))           return 'arrendada';
  if (['reservada', 'reserved'].includes(s))                      return 'reservada';
  if (['inactiva', 'inactive', 'pausada'].includes(s))            return 'inactiva';
  return 'disponible';
};

const normalizeVisitStatus = (status) => {
  const s = String(status || '').toLowerCase();
  if (['approved', 'aprobada', 'completed', 'completada'].includes(s)) return 'approved';
  if (['rejected', 'rechazada', 'cancelled', 'cancelada'].includes(s)) return 'rejected';
  return 'pending';
};

const normalizeContractStatus = (contract) => {
  const raw = String(contract?.statusGeneral || contract?.status || '').toLowerCase();
  if (['active', 'vigente', 'activo'].includes(raw))                       return 'active';
  if (['pendingsignature', 'pending_signature', 'por_firmar'].includes(raw)) return 'pendingsignature';
  if (['draft', 'borrador', 'paused', 'pausado'].includes(raw))            return 'draft';
  if (['completed', 'finalizado', 'finished', 'finalizada'].includes(raw)) return 'completed';
  if (['cancelled', 'cancelado', 'cancelada'].includes(raw))               return 'cancelled';
  return 'draft';
};

const normalizeClientStatus = (client) => {
  const estado = String(client?.estado || '').toLowerCase();
  if (['activo', 'active'].includes(estado))     return 'activo';
  if (['inactivo', 'inactive'].includes(estado)) return 'inactivo';
  return 'activo';
};

const normalizeClientType = (client) => {
  const tipo = String(client?.tipoCliente || '').toLowerCase();
  if (tipo === 'lead')                                          return 'lead';
  if (['portal', 'cliente', 'client'].includes(tipo))           return 'portal';
  if (client?.createdViaPortal)                                 return 'portal';
  if (['comprador', 'buyer'].includes(tipo))                    return 'comprador';
  if (['arrendatario', 'tenant', 'inquilino'].includes(tipo))   return 'arrendatario';
  if (['vendedor', 'seller', 'propietario'].includes(tipo))     return 'vendedor';
  return 'lead';
};

const getClientName = (c) =>
  c?.personalInfo?.name || c?.nombre || c?.name || c?.email || 'Sin nombre';

const getPropertyTitle = (p) => p?.title || p?.name || p?.address || 'Sin título';

const getPropertyPrice = (p) => {
  const sale = Number(p?.price?.sale);
  const rent = Number(p?.price?.rent);
  const direct = Number(p?.price);
  if (sale > 0)   return sale;
  if (rent > 0)   return rent;
  if (direct > 0) return direct;
  return 0;
};

const getPropertyTypeLabel = (t) => ({
  casa: 'Casas', apartamento: 'Apartamentos', lote: 'Lotes',
  finca: 'Fincas', local: 'Locales', oficina: 'Oficinas', bodega: 'Bodegas',
}[String(t || '').toLowerCase()] || t || 'Otros');

// ═══════════════════════════════════════════════════════════════════════════
//  PALETA — alineada con tailwind.config.js
// ═══════════════════════════════════════════════════════════════════════════

const PALETTE = {
  primary:   '#f59e0b', primaryDark: '#d97706', gold: '#fbbf24',
  green:     '#22c55e', greenDark:   '#16a34a',
  red:       '#ef4444', redDark:     '#dc2626',
  blue:      '#3b82f6', blueDark:    '#2563eb',
  purple:    '#a855f7', purpleDark:  '#9333ea',
  cyan:      '#06b6d4', pink:        '#ec4899',
  slate:     '#64748b', amber:       '#f59e0b',
};

const CHART_COLORS = [
  PALETTE.primary, PALETTE.blue, PALETTE.green,
  PALETTE.purple, PALETTE.cyan, PALETTE.pink, PALETTE.slate,
];

// ═══════════════════════════════════════════════════════════════════════════
//  HOOK — carga y procesamiento
// ═══════════════════════════════════════════════════════════════════════════

function useDashboardData() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true); setError(null);

      const [propsSnap, clientsSnap, contractsSnap, visitsSnap, usersSnap] =
        await Promise.all([
          getDocs(query(collection(db, 'properties'), orderBy('createdAt', 'desc'), limit(500))),
          getDocs(query(collection(db, 'clients'),    orderBy('createdAt', 'desc'), limit(500))),
          getDocs(query(collection(db, 'contracts'),  orderBy('createdAt', 'desc'), limit(500))),
          getDocs(query(collection(db, 'visits'),     orderBy('createdAt', 'desc'), limit(250))),
          getDocs(query(collection(db, 'users'),      where('role', 'in', ['admin', 'member']))),
        ]);

      const properties = propsSnap.docs.map((d) => ({
        id: d.id, ...d.data(),
        _status: normalizePropertyStatus(d.data().status),
        _price:  getPropertyPrice(d.data()),
      }));
      const clients = clientsSnap.docs.map((d) => ({
        id: d.id, ...d.data(),
        _name:   getClientName(d.data()),
        _status: normalizeClientStatus(d.data()),
        _tipo:   normalizeClientType(d.data()),
      }));
      const contracts = contractsSnap.docs.map((d) => ({
        id: d.id, ...d.data(),
        _status: normalizeContractStatus(d.data()),
      }));
      const visits = visitsSnap.docs.map((d) => ({
        id: d.id, ...d.data(),
        _status:    normalizeVisitStatus(d.data().status),
        _createdAt: toDateSafe(d.data().createdAt),
      }));
      const users = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      const now = new Date();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const firstOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const disponibles = properties.filter((p) => p._status === 'disponible');
      const vendidas    = properties.filter((p) => p._status === 'vendida');
      const arrendadas  = properties.filter((p) => p._status === 'arrendada');
      const reservadas  = properties.filter((p) => p._status === 'reservada');

      const propsThisMonth = properties.filter((p) => {
        const d = toDateSafe(p.createdAt);
        return d && d >= firstOfMonth;
      });
      const propsPrevMonth = properties.filter((p) => {
        const d = toDateSafe(p.createdAt);
        return d && d >= firstOfPrevMonth && d < firstOfMonth;
      });

      const activeClients = clients.filter((c) => c._status === 'activo');
      const leads = clients.filter((c) => c._tipo === 'lead');
      const portalClients = clients.filter((c) => c._tipo === 'portal');

      const clientsThisMonth = clients.filter((c) => {
        const d = toDateSafe(c.createdAt);
        return d && d >= firstOfMonth;
      });
      const clientsPrevMonth = clients.filter((c) => {
        const d = toDateSafe(c.createdAt);
        return d && d >= firstOfPrevMonth && d < firstOfMonth;
      });

      const activeContracts = contracts.filter((c) => c._status === 'active');
      const pendingContracts = contracts.filter((c) => c._status === 'pendingsignature');
      const completedContracts = contracts.filter((c) => c._status === 'completed');

      const visitsThisMonth = visits.filter((v) => v._createdAt && v._createdAt >= firstOfMonth);
      const visitsPrevMonth = visits.filter((v) =>
        v._createdAt && v._createdAt >= firstOfPrevMonth && v._createdAt < firstOfMonth);
      const pendingVisits = visits.filter((v) => v._status === 'pending');
      const approvedVisits = visits.filter((v) => v._status === 'approved');

      const totalPortfolio = disponibles.reduce((s, p) => s + p._price, 0);
      const totalSold = vendidas.reduce((s, p) => s + p._price, 0);
      const totalRented = arrendadas.reduce((s, p) => s + p._price, 0);

      const trend = (cur, prev) => {
        if (prev === 0) return cur > 0 ? 100 : 0;
        return Math.round(((cur - prev) / prev) * 100);
      };

      // ── Health score (0-100) ─────────────────────────────────────────────
      const conversionRate = properties.length > 0
        ? (vendidas.length + arrendadas.length) / properties.length
        : 0;
      const visitApprovalRate = visits.length > 0
        ? approvedVisits.length / visits.length
        : 0;
      const contractCompletionRate = contracts.length > 0
        ? (activeContracts.length + completedContracts.length) / contracts.length
        : 0;

      const healthScore = Math.round(
        (conversionRate * 30) + (visitApprovalRate * 30) +
        (contractCompletionRate * 25) +
        (Math.min(activeClients.length / 50, 1) * 15)
      );

      const stats = {
        totalProperties: properties.length,
        availableProperties: disponibles.length,
        soldProperties: vendidas.length,
        rentedProperties: arrendadas.length,
        reservedProperties: reservadas.length,
        propsTrend: trend(propsThisMonth.length, propsPrevMonth.length),

        totalClients: clients.length,
        activeClients: activeClients.length,
        leads: leads.length,
        portalClients: portalClients.length,
        clientsTrend: trend(clientsThisMonth.length, clientsPrevMonth.length),

        totalContracts: contracts.length,
        activeContracts: activeContracts.length,
        pendingContracts: pendingContracts.length,
        completedContracts: completedContracts.length,

        visitsThisMonth: visitsThisMonth.length,
        pendingVisits: pendingVisits.length,
        approvedVisits: approvedVisits.length,
        visitsTrend: trend(visitsThisMonth.length, visitsPrevMonth.length),

        totalPortfolio,
        totalSold,
        totalRented,

        conversionRate: Math.round(conversionRate * 100),
        visitApprovalRate: Math.round(visitApprovalRate * 100),
        healthScore,
      };

      // ── Series temporales ────────────────────────────────────────────────
      const months = lastNMonths(7);
      const visitsByMonth = months.map(({ label, year, month }) => {
        const m = visits.filter((v) =>
          v._createdAt && v._createdAt.getFullYear() === year && v._createdAt.getMonth() === month);
        return {
          mes: label,
          total: m.length,
          aprobadas: m.filter((v) => v._status === 'approved').length,
          rechazadas: m.filter((v) => v._status === 'rejected').length,
          pendientes: m.filter((v) => v._status === 'pending').length,
        };
      });

      const clientsTrendData = months.map(({ label, year, month }) => {
        const m = clients.filter((c) => {
          const d = toDateSafe(c.createdAt);
          return d && d.getFullYear() === year && d.getMonth() === month;
        });
        return {
          mes: label,
          nuevos: m.length,
          leads: m.filter((c) => c._tipo === 'lead').length,
          portal: m.filter((c) => c._tipo === 'portal').length,
        };
      });

      // ── Pipeline financiero (últimos 7 meses) ────────────────────────────
      const revenueByMonth = months.map(({ label, year, month }) => {
        const m = contracts.filter((c) => {
          const d = toDateSafe(c.createdAt);
          return d && d.getFullYear() === year && d.getMonth() === month;
        });
        const monthRevenue = m
          .filter((c) => ['active', 'completed'].includes(c._status))
          .reduce((s, c) => s + (Number(c.totalAmount) || Number(c.amount) || 0), 0);
        return {
          mes: label,
          ingresos: monthRevenue,
          contratos: m.length,
        };
      });

      // ── Por tipo ─────────────────────────────────────────────────────────
      const typeMap = {};
      properties.forEach((p) => {
        const key = p.type || 'otros';
        if (!typeMap[key]) typeMap[key] = { cantidad: 0, valor: 0, vendidas: 0, arrendadas: 0 };
        typeMap[key].cantidad += 1;
        typeMap[key].valor += p._price;
        if (p._status === 'vendida')   typeMap[key].vendidas += 1;
        if (p._status === 'arrendada') typeMap[key].arrendadas += 1;
      });
      const propsByType = Object.entries(typeMap)
        .map(([tipo, d]) => ({ tipo: getPropertyTypeLabel(tipo), ...d }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 6);

      // ── Por ciudad ───────────────────────────────────────────────────────
      const cityMap = {};
      properties.forEach((p) => {
        const city = p.location?.city || p.city || 'Otros';
        if (!cityMap[city]) cityMap[city] = { cantidad: 0, valor: 0 };
        cityMap[city].cantidad += 1;
        cityMap[city].valor += p._price;
      });
      const propsByCity = Object.entries(cityMap)
        .map(([city, d]) => ({ city, ...d }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 5);

      // ── Estado de contratos ──────────────────────────────────────────────
      const contractGroups = {
        active:           { name: 'Activos',     color: PALETTE.green,   value: 0 },
        pendingsignature: { name: 'Por firmar',  color: PALETTE.primary, value: 0 },
        draft:            { name: 'Borrador',    color: PALETTE.slate,   value: 0 },
        completed:        { name: 'Completados', color: PALETTE.blue,    value: 0 },
        cancelled:        { name: 'Cancelados',  color: PALETTE.red,     value: 0 },
      };
      contracts.forEach((c) => { if (contractGroups[c._status]) contractGroups[c._status].value += 1; });
      const contractStatus = Object.values(contractGroups).filter((g) => g.value > 0);

      // ── Top properties ───────────────────────────────────────────────────
      const topProperties = [...properties]
        .sort((a, b) => Number(b.views || 0) - Number(a.views || 0))
        .slice(0, 5)
        .map((p) => ({
          id: p.id, title: getPropertyTitle(p),
          type: getPropertyTypeLabel(p.type),
          city: p.location?.city || p.city || '–',
          price: p._price, views: Number(p.views || 0),
          status: p._status,
        }));

      // ── Equipo ───────────────────────────────────────────────────────────
      const teamUsers = users.map((user, i) => {
        const email = user.email;
        const agentVisits = visitsThisMonth.filter((v) => v.agentEmail === email).length;
        const agentVisitsAll = visits.filter((v) => v.agentEmail === email).length;
        const agentContracts = contracts.filter((c) =>
          c.agentEmail === email && ['active', 'completed'].includes(c._status)).length;
        const agentRevenue = contracts
          .filter((c) => c.agentEmail === email && ['active', 'completed'].includes(c._status))
          .reduce((s, c) => s + (Number(c.totalAmount) || Number(c.amount) || 0), 0);
        const display = user.displayName || user.name || user.email || 'Usuario';
        const parts = display.split(' ').filter(Boolean);
        const initials = parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : display.slice(0, 2);
        return {
          id: user.id, name: display, email, role: user.role,
          initials: initials.toUpperCase(),
          visitas: agentVisits, visitasTotales: agentVisitsAll,
          contratos: agentContracts, revenue: agentRevenue,
          color: CHART_COLORS[i % CHART_COLORS.length],
        };
      })
      .sort((a, b) => b.revenue - a.revenue || b.contratos - a.contratos)
      .slice(0, 8);

      // ── Funnel (Pipeline) ────────────────────────────────────────────────
      const funnelData = [
        { name: 'Leads',        value: leads.length,                     fill: PALETTE.cyan },
        { name: 'Activos',      value: activeClients.length,             fill: PALETTE.blue },
        { name: 'Visitas',      value: visitsThisMonth.length,           fill: PALETTE.primary },
        { name: 'Contratos',    value: activeContracts.length + pendingContracts.length, fill: PALETTE.green },
      ];

      // ── Conversión (radial bars) ─────────────────────────────────────────
      const conversion = [
        { name: 'Cierre', value: stats.conversionRate, fill: PALETTE.green, target: 30 },
        { name: 'Visitas', value: stats.visitApprovalRate, fill: PALETTE.primary, target: 70 },
        { name: 'Activos', value: clients.length > 0 ? Math.round((activeClients.length / clients.length) * 100) : 0, fill: PALETTE.blue, target: 50 },
      ];

      // ── Actividad reciente ───────────────────────────────────────────────
      const activityItems = [];
      visits.slice(0, 5).forEach((v) => activityItems.push({
        type: 'visit',
        action: v._status === 'approved' ? 'Visita aprobada' : v._status === 'rejected' ? 'Visita rechazada' : 'Nueva solicitud',
        subject: v.propertyName || 'Propiedad',
        user: v.clientName || v.agentName || '–', ts: v.createdAt,
      }));
      contracts.slice(0, 4).forEach((c) => activityItems.push({
        type: 'contract',
        action: c._status === 'active' ? 'Contrato activado' : c._status === 'pendingsignature' ? 'Pendiente firma' : c._status === 'completed' ? 'Completado' : c._status === 'cancelled' ? 'Cancelado' : 'Nuevo contrato',
        subject: c.parties?.buyer?.name || c.propertyName || 'Contrato',
        user: c.agentName || c.agentEmail || '–', ts: c.createdAt,
      }));
      clients.slice(0, 4).forEach((c) => activityItems.push({
        type: 'client',
        action: c._tipo === 'lead' ? 'Nuevo lead captado' : 'Cliente registrado',
        subject: c._name, user: c.assignedAgent || 'Admin', ts: c.createdAt,
      }));
      properties.slice(0, 3).forEach((p) => activityItems.push({
        type: 'property', action: 'Propiedad publicada',
        subject: getPropertyTitle(p), user: p.agentName || 'Admin', ts: p.createdAt,
      }));
      activityItems.sort((a, b) => getTimeSafe(b.ts) - getTimeSafe(a.ts));

      // ── AI Insights ──────────────────────────────────────────────────────
      const insights = [];
      if (stats.conversionRate > 20) {
        insights.push({
          type: 'success', icon: FaRocket,
          title: 'Tasa de cierre destacada',
          desc: `${stats.conversionRate}% de propiedades cerraron — por encima del promedio del sector.`,
        });
      } else if (properties.length > 10 && stats.conversionRate < 10) {
        insights.push({
          type: 'warning', icon: FaExclamationTriangle,
          title: 'Conversión por debajo del objetivo',
          desc: `Solo ${stats.conversionRate}% de propiedades han cerrado. Considera revisar pricing o exposición.`,
        });
      }
      if (stats.pendingVisits > 5) {
        insights.push({
          type: 'info', icon: FaHourglassHalf,
          title: `${stats.pendingVisits} visitas pendientes de respuesta`,
          desc: 'Atender solicitudes en menos de 24h aumenta la conversión un 35%.',
        });
      }
      if (stats.leads > stats.activeClients) {
        insights.push({
          type: 'info', icon: FaBullseye,
          title: 'Oportunidad: leads sin convertir',
          desc: `Tienes ${stats.leads} leads activos. Una llamada de seguimiento puede activar el 20%.`,
        });
      }
      if (stats.visitsTrend > 30) {
        insights.push({
          type: 'success', icon: FaFire,
          title: 'Tráfico en aumento',
          desc: `Las visitas crecieron un ${stats.visitsTrend}% este mes.`,
        });
      }
      if (insights.length === 0) {
        insights.push({
          type: 'info', icon: FaCompass,
          title: 'Todo en orden',
          desc: 'Las métricas se ven balanceadas. Sigue así.',
        });
      }

      setData({
        stats, visitsByMonth, clientsTrendData, revenueByMonth,
        propsByType, propsByCity, contractStatus, topProperties,
        team: teamUsers, conversion, funnelData,
        recentActivity: activityItems.slice(0, 10), insights,
      });
      setLastUpdated(new Date());
    } catch (err) {
      console.error('[Dashboard]', err);
      setError(err?.message || 'Error cargando datos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  return { loading, error, lastUpdated, data, reload: load };
}

// ═══════════════════════════════════════════════════════════════════════════
//  COMPONENTES UI
// ═══════════════════════════════════════════════════════════════════════════

const Card = ({ children, className = '', glass = false, ...rest }) => (
  <div
    className={`${glass
      ? 'bg-surface/60 backdrop-blur-md border-themed/60'
      : 'bg-surface border-themed'} border rounded-2xl shadow-card ${className}`}
    {...rest}
  >
    {children}
  </div>
);

const SectionTitle = ({ icon: Icon, children, hint, action }) => (
  <div className="flex items-center justify-between mb-4 px-1 gap-3">
    <h2 className="text-base sm:text-lg font-semibold text-t-base flex items-center gap-2 truncate">
      {Icon && <Icon className="text-primary shrink-0" />}
      <span className="truncate">{children}</span>
    </h2>
    {hint && <span className="text-xs text-t-muted shrink-0">{hint}</span>}
    {action}
  </div>
);

function ChartTooltip({ active, payload, label, formatter, suffix = '' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface/95 backdrop-blur-sm border border-themed rounded-xl shadow-lg p-3 text-xs">
      {label && <p className="font-semibold text-t-base mb-1.5 capitalize">{label}</p>}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span className="w-2 h-2 rounded-full" style={{ background: entry.color || entry.fill }} />
          <span className="text-t-muted">{entry.name}:</span>
          <span className="font-semibold text-t-base tabular-nums">
            {formatter ? formatter(entry.value) : entry.value}{suffix}
          </span>
        </div>
      ))}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, trend, accent = PALETTE.primary, sub, idx = 0 }) {
  const isPositive = typeof trend === 'number' && trend > 0;
  const isNegative = typeof trend === 'number' && trend < 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: idx * 0.06, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="p-4 sm:p-5 hover:shadow-lg hover:border-primary/30 transition-all group cursor-default relative overflow-hidden">
        {/* Gradient mesh */}
        <div
          className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-10 group-hover:opacity-20 transition-opacity blur-2xl"
          style={{ background: accent }}
        />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-2xs sm:text-xs text-t-muted uppercase tracking-wider font-semibold mb-1">
              {label}
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-t-base font-display tabular-nums leading-none">
              {value}
            </p>
            {sub && <p className="text-2xs sm:text-xs text-t-muted mt-1.5 truncate">{sub}</p>}
          </div>
          <div
            className="shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center"
            style={{ background: `${accent}1f`, color: accent }}
          >
            <Icon className="text-base sm:text-lg" />
          </div>
        </div>
        {typeof trend === 'number' && (
          <div className="relative mt-3 flex items-center gap-1.5 text-xs">
            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md ${
              isPositive ? 'bg-green-500/10 text-green-600 dark:text-green-400'
              : isNegative ? 'bg-red-500/10 text-red-600 dark:text-red-400'
              : 'bg-surface-2 text-t-muted'
            }`}>
              {isPositive && <FaArrowUp className="text-2xs" />}
              {isNegative && <FaArrowDown className="text-2xs" />}
              <span className="font-bold tabular-nums">{Math.abs(trend)}%</span>
            </div>
            <span className="text-t-muted text-2xs">vs mes anterior</span>
          </div>
        )}
      </Card>
    </motion.div>
  );
}

const StatusBadge = ({ status }) => {
  const styles = {
    disponible: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
    vendida:    'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    arrendada:  'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    reservada:  'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    inactiva:   'bg-slate-500/10 text-slate-500 border-slate-500/20',
  };
  const labels = {
    disponible: 'Disponible', vendida: 'Vendida', arrendada: 'Arrendada',
    reservada: 'Reservada', inactiva: 'Inactiva',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 text-2xs font-semibold rounded-full border ${styles[status] || styles.disponible}`}>
      {labels[status] || status}
    </span>
  );
};

const ActivityIcon = ({ type }) => {
  const cfg = {
    visit:    { Icon: FaCalendarCheck, color: PALETTE.green },
    contract: { Icon: FaFileContract,  color: PALETTE.blue  },
    client:   { Icon: FaUsers,         color: PALETTE.primary },
    property: { Icon: FaBuilding,      color: PALETTE.purple },
  };
  const { Icon, color } = cfg[type] || cfg.property;
  return (
    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
         style={{ background: `${color}1f`, color }}>
      <Icon className="text-sm" />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
//  HERO — bienvenida cinematográfica
// ═══════════════════════════════════════════════════════════════════════════

function Hero({ userName, lastUpdated, onReload, loading, stats }) {
  const [date, setDate] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setDate(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const greeting = useMemo(() => {
    const h = date.getHours();
    if (h < 6)  return 'Buenas noches';
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }, [date]);

  const dateStr = date.toLocaleDateString('es-CO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const score = stats?.healthScore ?? 0;
  const scoreColor = score >= 75 ? PALETTE.green
                   : score >= 50 ? PALETTE.primary
                   : score >= 25 ? PALETTE.amber
                   : PALETTE.red;
  const scoreLabel = score >= 75 ? 'Excelente'
                   : score >= 50 ? 'Saludable'
                   : score >= 25 ? 'En desarrollo'
                   : 'Necesita atención';

  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-3xl border border-themed bg-gradient-to-br from-surface via-surface-2 to-surface"
    >
      {/* Mesh gradient background */}
      <div className="absolute inset-0 opacity-60 pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary/20 blur-[100px]" />
        <div className="absolute -bottom-32 -right-24 w-96 h-96 rounded-full bg-blue-500/10 blur-[120px]" />
        <div className="absolute top-1/2 left-1/3 w-72 h-72 rounded-full bg-purple-500/10 blur-[100px]" />
      </div>

      {/* Animated grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(var(--color-text) 1px, transparent 1px), linear-gradient(90deg, var(--color-text) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          maskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, black, transparent)',
        }}
      />

      <div className="relative p-5 sm:p-7 lg:p-9">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* ── Saludo + fecha ── */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-2xs font-semibold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-gold" />
                En vivo
              </span>
              <span className="text-2xs text-t-muted capitalize hidden sm:inline">
                {dateStr}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-display text-t-base leading-tight">
              {greeting}
              {userName && (
                <>, <span className="bg-gradient-to-r from-primary via-amber-400 to-primary-600 bg-clip-text text-transparent">
                  {userName}
                </span></>
              )}
            </h1>
            <p className="text-sm sm:text-base text-t-muted mt-2 max-w-xl">
              Aquí está el resumen ejecutivo de Inmobiliaria Rincón Bedoya y Asociados.
              {lastUpdated && (
                <span className="block sm:inline sm:ml-1 text-2xs sm:text-xs">
                  Actualizado hace {timeAgo(lastUpdated)}.
                </span>
              )}
            </p>

            {/* Quick stats row */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-5 sm:mt-6 max-w-lg">
              <QuickStat icon={FaHome} value={stats?.availableProperties ?? 0} label="Disponibles" color={PALETTE.purple} />
              <QuickStat icon={FaUsers} value={stats?.activeClients ?? 0} label="Clientes activos" color={PALETTE.primary} />
              <QuickStat icon={FaFileContract} value={stats?.activeContracts ?? 0} label="Contratos vigentes" color={PALETTE.green} />
            </div>
          </div>

          {/* ── Health score + acciones ── */}
          <div className="flex flex-col items-stretch sm:items-end gap-3 shrink-0">
            <button
              onClick={onReload}
              disabled={loading}
              className="self-start sm:self-auto inline-flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-semibold bg-surface-2 hover:bg-surface-off text-t-base border border-themed rounded-lg transition-colors disabled:opacity-50"
            >
              <FaSync className={loading ? 'animate-spin text-primary' : 'text-primary'} />
              Actualizar
            </button>

            {/* Health score ring */}
            <div className="bg-surface/70 backdrop-blur-md border border-themed rounded-2xl p-4 sm:p-5 min-w-[220px]">
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none"
                      stroke="var(--color-divider)" strokeWidth="8" />
                    <motion.circle
                      cx="50" cy="50" r="42" fill="none"
                      stroke={scoreColor} strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 42}`}
                      initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                      animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - score / 100) }}
                      transition={{ duration: 1.4, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg sm:text-xl font-bold text-t-base tabular-nums">{score}</span>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-2xs uppercase tracking-wider text-t-muted font-semibold mb-0.5">
                    Health Score
                  </p>
                  <p className="text-base sm:text-lg font-bold text-t-base">{scoreLabel}</p>
                  <div className="flex items-center gap-1 text-2xs text-t-muted mt-0.5">
                    <FaShieldAlt className="text-primary" />
                    <span>Métricas operativas</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function QuickStat({ icon: Icon, value, label, color }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0"
           style={{ background: `${color}1f`, color }}>
        <Icon className="text-xs sm:text-sm" />
      </div>
      <div className="min-w-0">
        <p className="text-base sm:text-lg font-bold text-t-base tabular-nums leading-none">
          {fmtNumber(value)}
        </p>
        <p className="text-2xs text-t-muted truncate">{label}</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  TABS
// ═══════════════════════════════════════════════════════════════════════════

const TABS = [
  { id: 'overview',  label: 'Resumen',  icon: FaChartBar },
  { id: 'pipeline',  label: 'Pipeline', icon: FaChartLine },
  { id: 'market',    label: 'Mercado',  icon: FaGlobe },
  { id: 'team',      label: 'Equipo',   icon: FaUserTie },
];

function TabBar({ active, onChange }) {
  return (
    <div
      className="flex gap-1 p-1 bg-surface border border-themed rounded-xl overflow-x-auto"
      style={{ scrollbarWidth: 'none' }}
    >
      {TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`relative flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
            active === t.id ? 'text-white' : 'text-t-muted hover:text-t-base'
          }`}
        >
          {active === t.id && (
            <motion.div
              layoutId="tab-bg"
              className="absolute inset-0 bg-gradient-to-br from-primary to-primary-600 rounded-lg shadow-md"
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            />
          )}
          <t.icon className="relative z-10 text-xs sm:text-sm" />
          <span className="relative z-10">{t.label}</span>
        </button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  TAB CONTENT — Resumen
// ═══════════════════════════════════════════════════════════════════════════

function OverviewTab({ data }) {
  const { stats, visitsByMonth, contractStatus, propsByType, recentActivity, insights, conversion } = data;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }} className="space-y-5 sm:space-y-6"
    >
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard idx={0} icon={FaHome} label="Propiedades" value={fmtNumber(stats.totalProperties)}
          sub={`${stats.availableProperties} disponibles · ${stats.soldProperties + stats.rentedProperties} cerradas`}
          trend={stats.propsTrend} accent={PALETTE.purple} />
        <StatCard idx={1} icon={FaUsers} label="Clientes" value={fmtNumber(stats.totalClients)}
          sub={`${stats.activeClients} activos · ${stats.leads} leads`}
          trend={stats.clientsTrend} accent={PALETTE.primary} />
        <StatCard idx={2} icon={FaFileContract} label="Contratos" value={fmtNumber(stats.totalContracts)}
          sub={`${stats.activeContracts} activos · ${stats.pendingContracts} por firmar`}
          accent={PALETTE.blue} />
        <StatCard idx={3} icon={FaCalendarCheck} label="Visitas (mes)" value={fmtNumber(stats.visitsThisMonth)}
          sub={`${stats.pendingVisits} pendientes · ${stats.approvedVisits} aprobadas`}
          trend={stats.visitsTrend} accent={PALETTE.green} />
      </div>

      {/* Insights cards */}
      {insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {insights.slice(0, 3).map((ins, i) => {
            const accent = ins.type === 'success' ? PALETTE.green
                         : ins.type === 'warning' ? PALETTE.amber
                         : PALETTE.blue;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.15 + i * 0.08 }}
              >
                <Card glass className="p-4 hover:border-primary/40 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                         style={{ background: `${accent}1f`, color: accent }}>
                      <ins.icon className="text-sm" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-2xs uppercase tracking-wider font-semibold mb-1"
                         style={{ color: accent }}>
                        Insight inteligente
                      </p>
                      <p className="text-sm font-bold text-t-base mb-1 leading-tight">
                        {ins.title}
                      </p>
                      <p className="text-xs text-t-muted leading-relaxed">{ins.desc}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Valor del portafolio */}
      <Card className="p-5 sm:p-7 bg-gradient-to-br from-primary/15 via-surface to-blue-500/5 border-primary/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-700 text-white flex items-center justify-center shrink-0 shadow-glow-gold">
              <FaMoneyBillWave className="text-xl sm:text-2xl" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-t-muted uppercase tracking-wider font-bold mb-1">
                Valor total del portafolio (disponibles)
              </p>
              <p className="text-3xl sm:text-5xl font-bold text-t-base font-display tabular-nums leading-tight break-words">
                {fmtCompactCOP(stats.totalPortfolio)}
              </p>
              <p className="text-2xs sm:text-xs text-t-muted mt-1">{fmtCOP(stats.totalPortfolio)}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <PortfolioStat label="Vendidas" value={stats.soldProperties} subLabel={fmtCompactCOP(stats.totalSold)} color={PALETTE.green} />
            <PortfolioStat label="Arrendadas" value={stats.rentedProperties} subLabel={fmtCompactCOP(stats.totalRented)} color={PALETTE.blue} />
            <PortfolioStat label="Reservadas" value={stats.reservedProperties} subLabel="" color={PALETTE.primary} />
          </div>
        </div>
      </Card>

      {/* Gráficas principales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        <Card className="p-4 sm:p-5 lg:col-span-2">
          <SectionTitle icon={FaChartBar} hint="Últimos 7 meses">Visitas por mes</SectionTitle>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={visitsByMonth} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gAprob" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={PALETTE.green} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={PALETTE.green} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gPend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={PALETTE.primary} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={PALETTE.primary} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gRej" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={PALETTE.red} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={PALETTE.red} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-divider)" vertical={false} />
              <XAxis dataKey="mes" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" />
              <Area type="monotone" dataKey="aprobadas"  name="Aprobadas"  stroke={PALETTE.green}   fill="url(#gAprob)" strokeWidth={2.5} />
              <Area type="monotone" dataKey="pendientes" name="Pendientes" stroke={PALETTE.primary} fill="url(#gPend)"  strokeWidth={2.5} />
              <Area type="monotone" dataKey="rechazadas" name="Rechazadas" stroke={PALETTE.red}     fill="url(#gRej)"   strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4 sm:p-5">
          <SectionTitle icon={FaChartPie}>Estado de contratos</SectionTitle>
          {contractStatus.length === 0 ? (
            <EmptyState icon={FaFileContract} message="Sin contratos registrados" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={contractStatus} dataKey="value" nameKey="name"
                       cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                    {contractStatus.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="var(--color-surface)" strokeWidth={3} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-1.5 mt-2">
                {contractStatus.map((g, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: g.color }} />
                    <span className="text-t-muted truncate">{g.name}</span>
                    <span className="ml-auto font-bold text-t-base tabular-nums">{g.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Conversión + Por tipo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        <Card className="p-4 sm:p-5">
          <SectionTitle icon={FaBullseye}>Conversión</SectionTitle>
          <div className="space-y-4">
            {conversion.map((item, i) => {
              const pct = Math.min(item.value, 100);
              const targetMet = item.value >= item.target;
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-t-base font-semibold">{item.name}</span>
                      {targetMet && <FaCheckCircle className="text-green-500 text-xs" />}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xs text-t-faint">/ {item.target}%</span>
                      <span className="text-base font-bold tabular-nums" style={{ color: item.fill }}>
                        {item.value}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-surface-2 rounded-full overflow-hidden relative">
                    <motion.div className="h-full rounded-full" style={{ background: item.fill }}
                      initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                      transition={{ duration: 1, delay: 0.1 + i * 0.1, ease: [0.16, 1, 0.3, 1] }} />
                    <div className="absolute h-full w-0.5 bg-t-muted/40 top-0"
                         style={{ left: `${item.target}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-4 sm:p-5 lg:col-span-2">
          <SectionTitle icon={FaBuilding}>Propiedades por tipo</SectionTitle>
          {propsByType.length === 0 ? (
            <EmptyState icon={FaBuilding} message="Sin datos" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={propsByType} margin={{ top: 10, right: 10, left: -10, bottom: 0 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-divider)" horizontal={false} />
                <XAxis type="number" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="tipo" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} width={80} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--color-row-hover)' }} />
                <Bar dataKey="cantidad" name="Cantidad" radius={[0, 8, 8, 0]}>
                  {propsByType.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Actividad reciente */}
      <Card className="p-4 sm:p-5">
        <SectionTitle icon={FaBolt} hint="Últimas 10 acciones">Actividad reciente</SectionTitle>
        {recentActivity.length === 0 ? (
          <EmptyState icon={FaBolt} message="Sin actividad reciente" />
        ) : (
          <div className="space-y-2.5">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-surface-2 transition-colors">
                <ActivityIcon type={item.type} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-t-base font-semibold leading-tight">{item.action}</p>
                  <p className="text-xs text-t-muted truncate mt-0.5">{item.subject}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-2xs text-t-muted">{item.user}</p>
                  <p className="text-2xs text-t-faint mt-0.5">{timeAgo(item.ts)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </motion.div>
  );
}

function PortfolioStat({ label, value, subLabel, color }) {
  return (
    <div className="text-center px-2 sm:px-3 py-2 sm:py-3 bg-surface-2 rounded-xl border border-themed">
      <p className="text-xl sm:text-2xl font-bold tabular-nums" style={{ color }}>{value}</p>
      <p className="text-2xs text-t-muted uppercase font-semibold tracking-wider">{label}</p>
      {subLabel && <p className="text-2xs text-t-faint mt-0.5 tabular-nums">{subLabel}</p>}
    </div>
  );
}

function EmptyState({ icon: Icon, message }) {
  return (
    <div className="h-[260px] flex flex-col items-center justify-center text-center px-4">
      <Icon className="text-3xl text-t-faint mb-2" />
      <p className="text-sm text-t-muted">{message}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  TAB CONTENT — Pipeline
// ═══════════════════════════════════════════════════════════════════════════

function PipelineTab({ data }) {
  const { stats, funnelData, revenueByMonth, clientsTrendData } = data;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }} className="space-y-5 sm:space-y-6"
    >
      {/* KPIs Pipeline */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard idx={0} icon={FaBullseye} label="Tasa de cierre" value={`${stats.conversionRate}%`}
          accent={PALETTE.green} sub="Vendidas + arrendadas" />
        <StatCard idx={1} icon={FaPercent} label="Aprobación visitas" value={`${stats.visitApprovalRate}%`}
          accent={PALETTE.blue} sub={`${stats.approvedVisits} de ${stats.approvedVisits + stats.pendingVisits} visitas`} />
        <StatCard idx={2} icon={FaCalendarCheck} label="Pendientes" value={fmtNumber(stats.pendingVisits)}
          accent={PALETTE.amber} sub="Visitas por aprobar" />
        <StatCard idx={3} icon={FaFileContract} label="Por firmar" value={fmtNumber(stats.pendingContracts)}
          accent={PALETTE.purple} sub="Contratos en proceso" />
      </div>

      {/* Funnel + Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <Card className="p-4 sm:p-5">
          <SectionTitle icon={FaChartLine} hint="Ingresos potenciales y reales">Ingresos por mes</SectionTitle>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={revenueByMonth} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gIng" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={PALETTE.green} stopOpacity={0.6} />
                  <stop offset="100%" stopColor={PALETTE.green} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-divider)" vertical={false} />
              <XAxis dataKey="mes" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false}
                     tickFormatter={(v) => fmtCompactCOP(v)} />
              <Tooltip content={<ChartTooltip formatter={(v) => fmtCompactCOP(v)} />} />
              <Area type="monotone" dataKey="ingresos" name="Ingresos" stroke={PALETTE.green}
                    fill="url(#gIng)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4 sm:p-5">
          <SectionTitle icon={FaLayerGroup}>Embudo de conversión</SectionTitle>
          <div className="space-y-2 mt-2">
            {funnelData.map((stage, i) => {
              const pct = funnelData[0].value > 0 ? (stage.value / funnelData[0].value) * 100 : 0;
              return (
                <div key={i} className="relative">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md flex items-center justify-center text-2xs font-bold text-white"
                            style={{ background: stage.fill }}>{i + 1}</span>
                      <span className="text-sm font-semibold text-t-base">{stage.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xs text-t-muted">{pct.toFixed(0)}%</span>
                      <span className="text-base font-bold tabular-nums text-t-base">{stage.value}</span>
                    </div>
                  </div>
                  <div className="h-8 bg-surface-2 rounded-lg overflow-hidden relative">
                    <motion.div className="h-full rounded-lg flex items-center justify-end pr-3 text-xs font-semibold text-white"
                      style={{ background: `linear-gradient(90deg, ${stage.fill}cc, ${stage.fill})` }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(pct, 5)}%` }}
                      transition={{ duration: 0.8, delay: 0.1 + i * 0.1, ease: [0.16, 1, 0.3, 1] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Crecimiento clientes */}
      <Card className="p-4 sm:p-5">
        <SectionTitle icon={FaUsers}>Captación de clientes</SectionTitle>
        {clientsTrendData.every((d) => d.nuevos === 0) ? (
          <EmptyState icon={FaUsers} message="Sin clientes registrados aún" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={clientsTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-divider)" vertical={false} />
              <XAxis dataKey="mes" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--color-row-hover)' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
              <Bar dataKey="leads"  name="Leads"  stackId="a" fill={PALETTE.primary} />
              <Bar dataKey="portal" name="Portal" stackId="a" fill={PALETTE.green} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  TAB CONTENT — Mercado
// ═══════════════════════════════════════════════════════════════════════════

function MarketTab({ data }) {
  const { propsByType, propsByCity, topProperties } = data;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }} className="space-y-5 sm:space-y-6"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* Por ciudad */}
        <Card className="p-4 sm:p-5">
          <SectionTitle icon={FaCity}>Por ciudad</SectionTitle>
          {propsByCity.length === 0 ? (
            <EmptyState icon={FaCity} message="Sin datos por ciudad" />
          ) : (
            <div className="space-y-2.5 mt-2">
              {propsByCity.map((c, i) => {
                const max = propsByCity[0].cantidad || 1;
                const pct = (c.cantidad / max) * 100;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-t-base">{c.city}</span>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-t-muted tabular-nums">{fmtCompactCOP(c.valor)}</span>
                        <span className="font-bold text-t-base tabular-nums">{c.cantidad}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                      <motion.div className="h-full rounded-full bg-gradient-to-r from-primary to-primary-600"
                        initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Por tipo + valor */}
        <Card className="p-4 sm:p-5">
          <SectionTitle icon={FaLayerGroup}>Por tipo de propiedad</SectionTitle>
          {propsByType.length === 0 ? (
            <EmptyState icon={FaLayerGroup} message="Sin datos por tipo" />
          ) : (
            <div className="space-y-2 mt-2">
              {propsByType.map((t, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-2 hover:bg-surface-off transition-colors">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shrink-0"
                       style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}>
                    {t.tipo.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-t-base">{t.tipo}</p>
                    <p className="text-2xs text-t-muted">
                      {t.vendidas} vendidas · {t.arrendadas} arrendadas
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-bold text-t-base tabular-nums">{t.cantidad}</p>
                    <p className="text-2xs text-t-muted tabular-nums">{fmtCompactCOP(t.valor)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Top properties */}
      <Card className="p-4 sm:p-5">
        <SectionTitle icon={FaTrophy} hint={topProperties[0]?.views > 0 ? 'Por visualizaciones' : 'Sin views aún'}>
          Top propiedades del mes
        </SectionTitle>
        {topProperties.length === 0 || topProperties.every((p) => p.views === 0) ? (
          <EmptyState icon={FaEye} message="Las propiedades con más vistas aparecerán aquí" />
        ) : (
          <div className="space-y-2">
            {topProperties.map((p, i) => (
              <motion.div key={p.id}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.06 }}
                className="flex items-center gap-3 p-3 bg-surface-2 hover:bg-surface-off rounded-xl transition-colors"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                  i === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-md'
                  : 'bg-primary/10 text-primary'
                }`}>
                  {i === 0 ? <FaCrown /> : i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-t-base truncate">{p.title}</p>
                  <div className="flex items-center gap-2 text-2xs text-t-muted mt-0.5">
                    <span>{p.type}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><FaCity className="text-2xs" />{p.city}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-t-base tabular-nums">{fmtCompactCOP(p.price)}</p>
                  {p.views > 0 && (
                    <p className="text-2xs text-t-muted flex items-center gap-1 justify-end">
                      <FaEye />{p.views} vistas
                    </p>
                  )}
                </div>
                <StatusBadge status={p.status} />
              </motion.div>
            ))}
          </div>
        )}
      </Card>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  TAB CONTENT — Equipo
// ═══════════════════════════════════════════════════════════════════════════

function TeamTab({ data }) {
  const { team, stats } = data;
  const totalRevenue = team.reduce((s, a) => s + a.revenue, 0);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }} className="space-y-5 sm:space-y-6"
    >
      {/* Resumen del equipo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard idx={0} icon={FaUserTie} label="Miembros" value={fmtNumber(team.length)}
          accent={PALETTE.purple} sub="Admin + agentes" />
        <StatCard idx={1} icon={FaCalendarCheck} label="Visitas (mes)" value={fmtNumber(stats.visitsThisMonth)}
          accent={PALETTE.green} sub={`Promedio ${team.length > 0 ? Math.round(stats.visitsThisMonth / team.length) : 0} por agente`} />
        <StatCard idx={2} icon={FaFileContract} label="Cerrados" value={fmtNumber(stats.activeContracts + stats.completedContracts)}
          accent={PALETTE.blue} sub="Contratos del equipo" />
        <StatCard idx={3} icon={FaMoneyBillWave} label="Revenue" value={fmtCompactCOP(totalRevenue)}
          accent={PALETTE.primary} sub="Total generado" />
      </div>

      {/* Leaderboard */}
      <Card className="p-4 sm:p-5">
        <SectionTitle icon={FaTrophy} hint="Ordenado por revenue">
          Ranking del equipo
        </SectionTitle>
        {team.length === 0 ? (
          <EmptyState icon={FaUserTie} message="Sin miembros del equipo" />
        ) : (
          <div className="space-y-2">
            {team.map((agent, i) => {
              const maxRev = team[0].revenue || 1;
              const pct = (agent.revenue / maxRev) * 100;
              return (
                <motion.div key={agent.id}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.06 }}
                  className="flex items-center gap-3 p-3 sm:p-4 bg-surface-2 hover:bg-surface-off rounded-xl transition-colors"
                >
                  <div className={`w-7 sm:w-8 h-7 sm:h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                    i === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white'
                    : i === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white'
                    : i === 2 ? 'bg-gradient-to-br from-amber-700 to-amber-800 text-white'
                    : 'bg-surface text-t-muted'
                  }`}>
                    {i === 0 ? <FaCrown className="text-2xs" /> : `#${i + 1}`}
                  </div>
                  <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm shrink-0"
                       style={{ background: agent.color }}>
                    {agent.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-t-base truncate">{agent.name}</p>
                      <span className="text-2xs px-1.5 py-0.5 rounded-md bg-surface text-t-muted capitalize hidden sm:inline">
                        {agent.role}
                      </span>
                    </div>
                    <div className="h-1.5 bg-surface rounded-full overflow-hidden mt-1.5 max-w-[200px]">
                      <motion.div className="h-full rounded-full"
                        style={{ background: agent.color }}
                        initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: 0.2 + i * 0.05 }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 sm:gap-4 text-center shrink-0">
                    <div>
                      <p className="text-sm sm:text-base font-bold text-t-base tabular-nums">{agent.visitas}</p>
                      <p className="text-2xs text-t-muted">visitas</p>
                    </div>
                    <div>
                      <p className="text-sm sm:text-base font-bold text-t-base tabular-nums">{agent.contratos}</p>
                      <p className="text-2xs text-t-muted">contratos</p>
                    </div>
                    <div>
                      <p className="text-sm sm:text-base font-bold tabular-nums" style={{ color: agent.color }}>
                        {fmtCompactCOP(agent.revenue)}
                      </p>
                      <p className="text-2xs text-t-muted">revenue</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </Card>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  PAGE
// ═══════════════════════════════════════════════════════════════════════════

export default function DashboardPage() {
  const { userData } = useAuth();
  const { loading, error, lastUpdated, data, reload } = useDashboardData();
  const [tab, setTab] = useState('overview');

  const userName = useMemo(() => {
    const n = userData?.displayName?.split(' ')?.[0];
    return n || userData?.email?.split('@')?.[0] || '';
  }, [userData]);

  if (loading && !data) {
    return (
      <div className="p-4 sm:p-6 space-y-4 max-w-[1600px] mx-auto animate-pulse">
        <div className="h-44 bg-surface-2 rounded-3xl" />
        <div className="h-12 bg-surface-2 rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-surface-2 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
          <div className="h-72 bg-surface-2 rounded-2xl lg:col-span-2" />
          <div className="h-72 bg-surface-2 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="p-6 text-center">
          <FaExclamationTriangle className="text-red-500 text-3xl mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-t-base mb-1">No pudimos cargar el dashboard</h3>
          <p className="text-sm text-t-muted mb-4">{error}</p>
          <button onClick={reload}
            className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-600 transition-colors">
            Reintentar
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-5 lg:p-6 space-y-5 sm:space-y-6 max-w-[1600px] mx-auto">
      <Hero
        userName={userName}
        lastUpdated={lastUpdated}
        onReload={reload}
        loading={loading}
        stats={data.stats}
      />

      <TabBar active={tab} onChange={setTab} />

      <AnimatePresence mode="wait">
        <motion.div key={tab}>
          {tab === 'overview' && <OverviewTab data={data} />}
          {tab === 'pipeline' && <PipelineTab data={data} />}
          {tab === 'market'   && <MarketTab data={data} />}
          {tab === 'team'     && <TeamTab data={data} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}