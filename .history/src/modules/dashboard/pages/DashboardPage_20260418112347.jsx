import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  FaHome,
  FaUsers,
  FaFileContract,
  FaCalendarCheck,
  FaMoneyBillWave,
  FaBuilding,
  FaBell,
  FaArrowUp,
  FaArrowDown,
  FaEye,
  FaClock,
  FaMapMarkerAlt,
  FaCheckCircle,
  FaHourglassHalf,
  FaFire,
  FaSearch,
  FaTimes,
  FaCity,
  FaKey,
  FaHandshake,
  FaPercent,
  FaSync,
  FaChartBar,
  FaUserTie,
  FaExclamationTriangle,
  FaDoorOpen,
  FaFilter,
  FaLayerGroup,
} from 'react-icons/fa'
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore'
import { db } from '../../../core/config/firebase.config'
import { useAuth } from '../../../core/contexts/AuthContext'

const fmtCOP = (n) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(n) || 0)

const fmtCompactCOP = (n) => {
  const v = Number(n) || 0
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`
  return fmtCOP(v)
}

const toDateSafe = (value) => {
  if (!value) return null
  if (typeof value?.toDate === 'function') return value.toDate()
  if (value instanceof Date) return value
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

const getTimeSafe = (value) => {
  const d = toDateSafe(value)
  return d ? d.getTime() : 0
}

const timeAgo = (ts) => {
  const date = toDateSafe(ts)
  if (!date) return '–'
  const diff = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diff < 60) return 'ahora'
  if (diff < 3600) return `${Math.floor(diff / 60)} min`
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`
  if (diff < 604800) return `${Math.floor(diff / 86400)} d`
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}

const monthLabel = (date) =>
  date.toLocaleDateString('es-CO', { month: 'short' })

const lastNMonths = (n) => {
  const months = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - i)
    months.push({
      label: monthLabel(d),
      year: d.getFullYear(),
      month: d.getMonth(),
    })
  }
  return months
}

const normalizePropertyStatus = (status) => {
  const s = String(status || '').toLowerCase()
  if (['disponible', 'available', 'activa', 'active'].includes(s)) return 'disponible'
  if (['vendida', 'sold'].includes(s)) return 'vendida'
  if (['arrendada', 'rented'].includes(s)) return 'arrendada'
  if (['reservada', 'reserved'].includes(s)) return 'reservada'
  return 'disponible'
}

const normalizeVisitStatus = (status) => {
  const s = String(status || '').toLowerCase()
  if (['approved', 'aprobada', 'completed', 'completada'].includes(s)) return 'approved'
  if (['rejected', 'rechazada', 'cancelled', 'cancelada'].includes(s)) return 'rejected'
  return 'pending'
}

const normalizeContractStatus = (contract) => {
  const raw = String(contract?.statusGeneral || contract?.status || '').toLowerCase()
  if (['active', 'vigente', 'activo'].includes(raw)) return 'active'
  if (['pendingsignature', 'pending_signature', 'por_firmar'].includes(raw)) return 'pendingsignature'
  if (['draft', 'borrador', 'paused', 'pausado'].includes(raw)) return 'draft'
  if (['completed', 'finalizado', 'finished'].includes(raw)) return 'completed'
  if (['cancelled', 'cancelado'].includes(raw)) return 'cancelled'
  return 'draft'
}

const getClientName = (client) =>
  client?.personalInfo?.name || client?.nombre || client?.name || 'Sin nombre'

const getPropertyTitle = (property) =>
  property?.title || property?.name || property?.address || 'Sin título'

const getPropertyPrice = (property) => {
  const sale = Number(property?.price?.sale)
  const rent = Number(property?.price?.rent)
  const direct = Number(property?.price)
  if (!Number.isNaN(sale) && sale > 0) return sale
  if (!Number.isNaN(rent) && rent > 0) return rent
  if (!Number.isNaN(direct) && direct > 0) return direct
  return 0
}

const getPropertyTypeLabel = (type) => {
  const map = {
    casa: 'Casas',
    apartamento: 'Aptos',
    lote: 'Lotes',
    finca: 'Fincas',
    local: 'Locales',
    oficina: 'Oficinas',
    bodega: 'Bodegas',
  }
  return map[type] || type || 'Otros'
}

const CHART_COLORS = ['#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#06b6d4', '#ec4899']

const STATUS_STYLES = {
  disponible: 'badge-green',
  vendida: 'badge-red',
  arrendada: 'badge-blue',
  reservada: 'badge-amber',
}

const ACTIVITY_CFG = {
  visit: { icon: FaCalendarCheck, tone: '#22c55e' },
  contract: { icon: FaFileContract, tone: '#3b82f6' },
  client: { icon: FaUsers, tone: '#f59e0b' },
  property: { icon: FaBuilding, tone: '#a855f7' },
}

function toneBg(color, alpha = 0.14) {
  if (color.startsWith('#')) {
    const hex = color.replace('#', '')
    if (hex.length === 6) {
      const a = Math.round(alpha * 255)
        .toString(16)
        .padStart(2, '0')
      return `#${hex}${a}`
    }
  }
  return color
}

function useDashboardData() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const [stats, setStats] = useState(null)
  const [visitsByMonth, setVisitsByMonth] = useState([])
  const [clientsTrend, setClientsTrend] = useState([])
  const [propsByType, setPropsByType] = useState([])
  const [contractStatus, setContractStatus] = useState([])
  const [topProperties, setTopProperties] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [agents, setAgents] = useState([])
  const [conversion, setConversion] = useState([])

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [propsSnap, clientsSnap, contractsSnap, visitsSnap, usersSnap] = await Promise.all([
        getDocs(collection(db, 'properties')),
        getDocs(collection(db, 'clients')),
        getDocs(collection(db, 'contracts')),
        getDocs(query(collection(db, 'visits'), orderBy('createdAt', 'desc'), limit(250))),
        getDocs(query(collection(db, 'users'), where('role', 'in', ['agent', 'member', 'admin']))),
      ])

      const properties = propsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
      const clients = clientsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
      const contracts = contractsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
      const visits = visitsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
      const users = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

      const normalizedProperties = properties.map((p) => ({
        ...p,
        _status: normalizePropertyStatus(p.status),
        _price: getPropertyPrice(p),
      }))

      const normalizedClients = clients.map((c) => ({
        ...c,
        _name: getClientName(c),
      }))

      const normalizedContracts = contracts.map((c) => ({
        ...c,
        _status: normalizeContractStatus(c),
      }))

      const normalizedVisits = visits.map((v) => ({
        ...v,
        _status: normalizeVisitStatus(v.status),
        _createdAt: toDateSafe(v.createdAt),
      }))

      const now = new Date()
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      const disponibles = normalizedProperties.filter((p) => p._status === 'disponible')
      const vendidas = normalizedProperties.filter((p) => p._status === 'vendida')
      const arrendadas = normalizedProperties.filter((p) => p._status === 'arrendada')
      const reservadas = normalizedProperties.filter((p) => p._status === 'reservada')

      const activeClients = normalizedClients.filter((c) => c.status === 'active')
      const leads = normalizedClients.filter((c) => c.status === 'lead')

      const activeContracts = normalizedContracts.filter((c) =>
        ['active', 'pendingsignature'].includes(c._status)
      )
      const pendingContracts = normalizedContracts.filter((c) => c._status === 'pendingsignature')

      const totalValue = normalizedProperties.reduce((sum, p) => sum + p._price, 0)

      const visitsThisMonth = normalizedVisits.filter((v) => {
        const d = v._createdAt
        return d && d >= firstOfMonth
      })

      const pendingVisits = normalizedVisits.filter((v) => v._status === 'pending')

      setStats({
        totalProperties: normalizedProperties.length,
        availableProperties: disponibles.length,
        soldProperties: vendidas.length,
        rentedProperties: arrendadas.length,
        reservedProperties: reservadas.length,
        totalClients: normalizedClients.length,
        activeClients: activeClients.length,
        leads: leads.length,
        totalContracts: normalizedContracts.length,
        activeContracts: activeContracts.length,
        pendingContracts: pendingContracts.length,
        totalValue,
        visitsThisMonth: visitsThisMonth.length,
        pendingVisits: pendingVisits.length,
      })

      const months = lastNMonths(7)

      setVisitsByMonth(
        months.map(({ label, year, month }) => {
          const monthVisits = normalizedVisits.filter((v) => {
            const d = v._createdAt
            return d && d.getFullYear() === year && d.getMonth() === month
          })

          return {
            mes: label,
            visitas: monthVisits.length,
            aprobadas: monthVisits.filter((v) => v._status === 'approved').length,
            rechazadas: monthVisits.filter((v) => v._status === 'rejected').length,
            pendientes: monthVisits.filter((v) => v._status === 'pending').length,
          }
        })
      )

      setClientsTrend(
        months.map(({ label, year, month }) => {
          const monthClients = normalizedClients.filter((c) => {
            const d = toDateSafe(c.createdAt)
            return d && d.getFullYear() === year && d.getMonth() === month
          })

          return {
            mes: label,
            nuevos: monthClients.filter((c) => c.status === 'active').length,
            leads: monthClients.filter((c) => c.status === 'lead').length,
          }
        })
      )

      const typeMap = {}
      normalizedProperties.forEach((p) => {
        const key = p.type || 'otros'
        if (!typeMap[key]) typeMap[key] = { cantidad: 0, valor: 0 }
        typeMap[key].cantidad += 1
        typeMap[key].valor += p._price
      })

      setPropsByType(
        Object.entries(typeMap)
          .map(([tipo, data]) => ({
            tipo: getPropertyTypeLabel(tipo),
            ...data,
          }))
          .sort((a, b) => b.cantidad - a.cantidad)
          .slice(0, 7)
      )

      const contractGroups = {
        active: { name: 'Activos', color: '#22c55e', value: 0 },
        pendingsignature: { name: 'Por firmar', color: '#f59e0b', value: 0 },
        draft: { name: 'Borrador', color: '#64748b', value: 0 },
        completed: { name: 'Completados', color: '#3b82f6', value: 0 },
        cancelled: { name: 'Cancelados', color: '#ef4444', value: 0 },
      }

      normalizedContracts.forEach((c) => {
        if (contractGroups[c._status]) contractGroups[c._status].value += 1
      })

      setContractStatus(Object.values(contractGroups).filter((g) => g.value > 0))

      const propertiesSortedByViews = [...normalizedProperties].sort(
        (a, b) => Number(b.views || b.viewCount || 0) - Number(a.views || a.viewCount || 0)
      )

      const topProps = propertiesSortedByViews.slice(0, 5).map((p) => ({
        id: p.id,
        title: getPropertyTitle(p),
        type: p.type || '–',
        city: p.location?.city || p.city || 'Anserma',
        price: p._price,
        views: Number(p.views || p.viewCount || 0),
        status: p._status,
      }))

      setTopProperties(
        topProps.some((p) => p.views > 0)
          ? topProps
          : [...normalizedProperties]
              .sort((a, b) => getTimeSafe(b.createdAt) - getTimeSafe(a.createdAt))
              .slice(0, 5)
              .map((p) => ({
                id: p.id,
                title: getPropertyTitle(p),
                type: p.type || '–',
                city: p.location?.city || p.city || 'Anserma',
                price: p._price,
                views: Number(p.views || p.viewCount || 0),
                status: p._status,
              }))
      )

      const activityItems = []

      normalizedVisits.slice(0, 6).forEach((v) => {
        activityItems.push({
          type: 'visit',
          action:
            v._status === 'approved'
              ? 'Visita aprobada'
              : v._status === 'rejected'
              ? 'Visita rechazada'
              : 'Visita solicitada',
          subject: v.propertyName || 'Propiedad',
          user: v.clientName || v.agentName || '–',
          ts: v.createdAt,
        })
      })

      normalizedContracts
        .sort((a, b) => getTimeSafe(b.createdAt) - getTimeSafe(a.createdAt))
        .slice(0, 5)
        .forEach((c) => {
          activityItems.push({
            type: 'contract',
            action:
              c._status === 'active'
                ? 'Contrato activo'
                : c._status === 'pendingsignature'
                ? 'Contrato pendiente firma'
                : c._status === 'completed'
                ? 'Contrato completado'
                : c._status === 'cancelled'
                ? 'Contrato cancelado'
                : 'Contrato creado',
            subject: c.parties?.buyer?.name || c.propertyName || 'Contrato',
            user: c.agentName || c.agentEmail || '–',
            ts: c.createdAt,
          })
        })

      normalizedClients
        .sort((a, b) => getTimeSafe(b.createdAt) - getTimeSafe(a.createdAt))
        .slice(0, 4)
        .forEach((c) => {
          activityItems.push({
            type: 'client',
            action: c.status === 'lead' ? 'Nuevo lead registrado' : 'Cliente registrado',
            subject: c._name,
            user: c.assignedAgent || 'Admin',
            ts: c.createdAt,
          })
        })

      normalizedProperties
        .sort((a, b) => getTimeSafe(b.createdAt) - getTimeSafe(a.createdAt))
        .slice(0, 4)
        .forEach((p) => {
          activityItems.push({
            type: 'property',
            action: 'Propiedad publicada',
            subject: getPropertyTitle(p),
            user: p.agentName || 'Admin',
            ts: p.createdAt,
          })
        })

      activityItems.sort((a, b) => getTimeSafe(b.ts) - getTimeSafe(a.ts))
      setRecentActivity(activityItems.slice(0, 10))

      const AGENT_COLORS = ['#f59e0b', '#3b82f6', '#22c55e', '#a855f7', '#06b6d4', '#ec4899']
      const teamUsers = users.slice(0, 8).map((user, i) => {
        const email = user.email
        const agentVisits = visitsThisMonth.filter((v) => v.agentEmail === email).length
        const agentContracts = normalizedContracts.filter(
          (c) => c.agentEmail === email && ['active', 'completed'].includes(c._status)
        ).length

        const displayName = user.displayName || user.name || user.email || 'Usuario'
        const parts = displayName.split(' ').filter(Boolean)
        const initials =
          parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : displayName.slice(0, 2)

        return {
          name: displayName,
          initials: initials.toUpperCase(),
          visitas: agentVisits,
          contratos: agentContracts,
          color: AGENT_COLORS[i % AGENT_COLORS.length],
        }
      })

      setAgents(teamUsers)

      const totalProperties = normalizedProperties.length || 1
      const totalClients = normalizedClients.length || 1

      setConversion([
        {
          name: 'Ventas',
          value: Math.round((vendidas.length / totalProperties) * 100),
          fill: '#22c55e',
        },
        {
          name: 'Arriendos',
          value: Math.round((arrendadas.length / totalProperties) * 100),
          fill: '#3b82f6',
        },
        {
          name: 'Leads→Cli',
          value: Math.round((activeClients.length / totalClients) * 100),
          fill: '#f59e0b',
        },
      ])

      setLastUpdated(new Date())
    } catch (err) {
      console.error('Dashboard error:', err)
      setError(err?.message || 'Error cargando datos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return {
    loading,
    error,
    lastUpdated,
    load,
    stats,
    visitsByMonth,
    clientsTrend,
    propsByType,
    contractStatus,
    topProperties,
    recentActivity,
    agents,
    conversion,
  }
}

function useCountUp(target, duration = 1200) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    const finalValue = Number(target) || 0
    let frame
    let start = null

    const tick = (timestamp) => {
      if (!start) start = timestamp
      const progress = Math.min((timestamp - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(finalValue * eased))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, duration])

  return value
}

const SurfaceGlow = ({ color = '#f59e0b' }) => (
  <div
    className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full blur-3xl opacity-60"
    style={{ background: `radial-gradient(circle, ${toneBg(color, 0.28)} 0%, transparent 70%)` }}
  />
)

const KpiCard = ({
  icon: Icon,
  label,
  value,
  sub,
  accent = '#f59e0b',
  delay = 0,
  isCurrency = false,
  change,
}) => {
  const animated = useCountUp(typeof value === 'number' ? value : 0, 1000 + delay * 120)
  const display = isCurrency ? fmtCompactCOP(animated) : animated.toLocaleString('es-CO')

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.06, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2, scale: 1.01 }}
      className="card-soft p-4 sm:p-5 relative overflow-hidden"
      style={{
        boxShadow: `0 0 0 1px ${toneBg(accent, 0.12)}, var(--shadow-card)`,
      }}
    >
      <SurfaceGlow color={accent} />

      <div
        className="absolute top-0 left-0 h-[2px] w-full"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="t-muted text-xs sm:text-sm mb-1">{label}</p>
          <p className="t-heading text-2xl sm:text-3xl leading-tight tabular-nums">{display}</p>

          {sub ? (
            <p className="text-[11px] sm:text-xs mt-2 flex items-center gap-1.5">
              {typeof change === 'number' ? (
                change >= 0 ? (
                  <FaArrowUp className="text-emerald-500" />
                ) : (
                  <FaArrowDown className="text-red-500" />
                )
              ) : null}
              <span
                className={
                  typeof change === 'number'
                    ? change >= 0
                      ? 'text-emerald-500'
                      : 'text-red-500'
                    : 't-faint'
                }
              >
                {sub}
              </span>
            </p>
          ) : null}
        </div>

        <div
          className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 border"
          style={{
            background: toneBg(accent, 0.12),
            borderColor: toneBg(accent, 0.22),
            color: accent,
          }}
        >
          <Icon className="text-lg sm:text-xl" />
        </div>
      </div>
    </motion.div>
  )
}

const SectionHeader = ({ title, sub, children }) => (
  <div className="flex items-end justify-between gap-3 mb-4">
    <div>
      <p className="t-faint text-[11px] font-bold uppercase tracking-widest mb-0.5">{sub}</p>
      <h3 className="t-heading text-base sm:text-lg">{title}</h3>
    </div>
    {children}
  </div>
)

const ChartCard = ({ title, sub, children, className = '', action }) => (
  <motion.div
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    className={`card-soft p-5 sm:p-6 relative overflow-hidden ${className}`}
  >
    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-primary)]/40 to-transparent opacity-70" />
    {(title || sub) && (
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          {sub ? <p className="t-faint text-[11px] font-bold uppercase tracking-widest mb-0.5">{sub}</p> : null}
          {title ? <p className="t-heading text-sm sm:text-base">{title}</p> : null}
        </div>
        {action}
      </div>
    )}
    {children}
  </motion.div>
)

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div
      className="px-3 py-2 text-xs shadow-2xl rounded-xl border"
      style={{
        background: 'var(--color-surface-2)',
        borderColor: 'var(--color-border)',
        color: 'var(--color-text)',
      }}
    >
      {label ? <p className="t-muted mb-1.5 font-medium">{label}</p> : null}
      {payload.map((p, i) => (
        <p key={i} className="font-semibold" style={{ color: p.color || p.fill }}>
          {p.name}:{' '}
          <span style={{ color: 'var(--color-text)' }}>
            {typeof p.value === 'number' && p.value > 100000 ? fmtCompactCOP(p.value) : p.value}
          </span>
        </p>
      ))}
    </div>
  )
}

const Skeleton = ({ className = '' }) => (
  <div
    className={`animate-pulse rounded-lg ${className}`}
    style={{ background: 'var(--color-surface-offset)' }}
  />
)

const KpiSkeleton = () => (
  <div className="card-soft p-5 space-y-3">
    <Skeleton className="w-10 h-10 rounded-xl" />
    <Skeleton className="h-3 w-24" />
    <Skeleton className="h-7 w-16" />
  </div>
)

const EmptyState = ({ icon: Icon = FaChartBar, message = 'Sin datos' }) => (
  <div className="empty-state py-10">
    <Icon className="empty-state-icon" />
    <p className="t-muted text-sm">{message}</p>
  </div>
)

const ActivityItem = ({ item, delay }) => {
  const cfg = ACTIVITY_CFG[item.type] || ACTIVITY_CFG.property
  const { icon: Icon, tone } = cfg

  return (
    <motion.div
      initial={{ opacity: 0, x: 14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="card-inner flex items-start gap-3 p-3.5"
      style={{ minHeight: 78 }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 border"
        style={{
          background: toneBg(tone, 0.12),
          borderColor: toneBg(tone, 0.24),
          color: tone,
        }}
      >
        <Icon className="text-xs" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="t-body text-sm font-semibold truncate leading-tight">{item.action}</p>
        <p className="t-muted text-[12px] truncate mt-0.5">{item.subject}</p>
        {item.user && item.user !== 'Admin' ? (
          <p className="text-[10px] t-faint truncate mt-1">{item.user}</p>
        ) : null}
      </div>

      <span className="text-[10px] t-faint flex-shrink-0 mt-0.5">{timeAgo(item.ts)}</span>
    </motion.div>
  )
}

const DonutLegend = ({ data }) => (
  <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3">
    {data.map((item) => (
      <div key={item.name} className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color || item.fill }} />
        <span className="t-muted text-xs truncate">{item.name}</span>
        <span className="ml-auto t-heading text-xs font-bold">{item.value}</span>
      </div>
    ))}
  </div>
)

const AgentRow = ({ agent, maxVisitas, delay }) => (
  <motion.div
    initial={{ opacity: 0, x: -12 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay, duration: 0.35 }}
    className="py-2.5"
  >
    <div className="flex items-center gap-3">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0"
        style={{ background: agent.color, color: '#0b1220' }}
      >
        {agent.initials}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate leading-tight" style={{ color: 'var(--color-text)' }}>
          {agent.name}
        </p>
        <div className="flex gap-1.5 mt-1.5 items-center">
          <div
            className="flex-1 h-1.5 rounded-full overflow-hidden"
            style={{ background: 'var(--color-surface-offset)' }}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: maxVisitas > 0 ? `${(agent.visitas / maxVisitas) * 100}%` : '0%' }}
              transition={{ delay: delay + 0.2, duration: 0.7, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ background: agent.color }}
            />
          </div>
          <span className="text-[10px] t-faint flex-shrink-0">{agent.visitas} vis.</span>
        </div>
      </div>

      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold" style={{ color: agent.color }}>{agent.contratos}</p>
        <p className="text-[10px] t-faint">ctr</p>
      </div>
    </div>
  </motion.div>
)

const AgentCard = ({ agent, delay }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.92 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay, duration: 0.4, ease: [0.34, 1.4, 0.64, 1] }}
    whileHover={{ y: -3 }}
    className="card-inner p-4 flex flex-col items-center gap-3 text-center min-h-[158px]"
  >
    <div
      className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-xs shadow-lg"
      style={{ background: agent.color, color: '#0b1220' }}
    >
      {agent.initials}
    </div>

    <div>
      <p className="text-xs font-semibold leading-tight" style={{ color: 'var(--color-text)' }}>
        {agent.name}
      </p>
      <p className="t-faint text-[10px] mt-0.5">Agente</p>
    </div>

    <div className="w-full border-t pt-3 grid grid-cols-2 gap-2" style={{ borderColor: 'var(--color-divider)' }}>
      <div>
        <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--color-text)' }}>{agent.visitas}</p>
        <p className="text-[10px] t-faint">Visitas</p>
      </div>
      <div>
        <p className="text-lg font-bold tabular-nums" style={{ color: agent.color }}>{agent.contratos}</p>
        <p className="text-[10px] t-faint">Contratos</p>
      </div>
    </div>
  </motion.div>
)

const PortfolioSummary = ({ stats }) => {
  if (!stats) return null

  const total = stats.totalProperties || 1
  const segments = [
    { label: 'Disponibles', value: stats.availableProperties, color: '#22c55e' },
    { label: 'Arrendadas', value: stats.rentedProperties, color: '#3b82f6' },
    { label: 'Vendidas', value: stats.soldProperties, color: '#ef4444' },
    { label: 'Reservadas', value: stats.reservedProperties || 0, color: '#f59e0b' },
  ]

  return (
    <ChartCard className="mb-0">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <p className="t-faint text-[11px] uppercase tracking-widest mb-1">Estado del inventario</p>
          <div
            className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-3"
            style={{ background: 'var(--color-surface-offset)' }}
          >
            {segments.map((s) => (
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
            {segments.map((s) => (
              <div key={s.label} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                <span className="t-muted text-[11px]">{s.label}</span>
                <span className="t-heading text-[11px] font-bold">{s.value}</span>
                <span className="text-[10px] t-faint">({Math.round((s.value / total) * 100)}%)</span>
              </div>
            ))}
          </div>
        </div>

        <div className="sm:text-right flex-shrink-0">
          <p className="t-faint text-[11px] mb-0.5">Valor total portafolio</p>
          <p className="text-2xl font-bold text-gradient-gold">{fmtCompactCOP(stats.totalValue)}</p>
          <p className="t-faint text-[11px] mt-0.5">{stats.totalProperties} propiedades en total</p>
        </div>
      </div>
    </ChartCard>
  )
}

export default function DashboardPage() {
  const { currentUser } = useAuth()

  const [activeTab, setActiveTab] = useState('general')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef(null)

  const {
    loading,
    error,
    lastUpdated,
    load,
    stats,
    visitsByMonth,
    clientsTrend,
    propsByType,
    contractStatus,
    topProperties,
    recentActivity,
    agents,
    conversion,
  } = useDashboardData()

  const greeting = (() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Buenos días'
    if (hour < 19) return 'Buenas tardes'
    return 'Buenas noches'
  })()

  const firstName =
    currentUser?.displayName?.split(' ')?.[0] ??
    currentUser?.email?.split('@')?.[0] ??
    'Admin'

  const TABS = [
    { id: 'general', label: 'General', icon: FaChartBar },
    { id: 'propiedades', label: 'Propiedades', icon: FaBuilding },
    { id: 'clientes', label: 'Clientes', icon: FaUsers },
  ]

  const maxAgentVisits = useMemo(
    () => (agents.length ? Math.max(...agents.map((a) => a.visitas), 1) : 1),
    [agents]
  )

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div
          className="card-soft p-8 max-w-md text-center space-y-4"
          style={{ border: '1px solid var(--color-error-highlight)' }}
        >
          <FaExclamationTriangle className="mx-auto text-3xl" style={{ color: 'var(--color-error)' }} />
          <p className="font-semibold" style={{ color: 'var(--color-text)' }}>Error cargando el dashboard</p>
          <p className="t-muted text-sm">{error}</p>
          <button onClick={load} className="button-gold mt-2">
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 py-6 md:px-8 space-y-7 bg-bg text-t-base">
      <motion.div
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="min-w-0">
          <p className="t-faint text-xs mb-1 flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {new Date().toLocaleDateString('es-CO', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>

          <h1 className="t-heading text-2xl sm:text-3xl lg:text-4xl tracking-tight mb-1">
            {greeting}, <span className="text-gradient-gold">{firstName}</span>
          </h1>

          {stats ? (
            <p className="t-muted text-sm sm:text-base">
              Portafolio: <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{fmtCompactCOP(stats.totalValue)}</span>
              {' · '}
              <span className="text-emerald-600 dark:text-emerald-400">{stats.availableProperties} disponibles</span>
              {stats.pendingVisits > 0 ? (
                <span className="text-amber-600 dark:text-amber-400"> · {stats.pendingVisits} visitas pendientes</span>
              ) : null}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-2.5">
          <AnimatePresence>
            {searchOpen ? (
              <motion.div
                key="search-open"
                initial={{ width: 36, opacity: 0 }}
                animate={{ width: 230, opacity: 1 }}
                exit={{ width: 36, opacity: 0 }}
                className="relative"
              >
                <input
                  ref={searchRef}
                  autoFocus
                  placeholder="Buscar propiedad, cliente…"
                  className="input-themed pl-8 pr-8 py-2 text-sm rounded-xl"
                />
                <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none" />
                <button
                  onClick={() => setSearchOpen(false)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[var(--color-text)]"
                >
                  <FaTimes className="text-xs" />
                </button>
              </motion.div>
            ) : (
              <motion.button
                key="search-closed"
                whileTap={{ scale: 0.93 }}
                onClick={() => setSearchOpen(true)}
                className="theme-toggle"
                title="Buscar"
              >
                <FaSearch className="text-xs" />
              </motion.button>
            )}
          </AnimatePresence>

          <motion.button
            whileTap={{ scale: 0.9, rotate: 180 }}
            onClick={load}
            disabled={loading}
            title={
              lastUpdated
                ? `Actualizado: ${lastUpdated.toLocaleTimeString('es-CO', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`
                : 'Actualizar'
            }
            className="theme-toggle disabled:opacity-50"
          >
            <FaSync className={`text-xs ${loading ? 'animate-spin' : ''}`} />
          </motion.button>

          <div className="relative">
            <motion.button whileTap={{ scale: 0.93 }} className="theme-toggle">
              <FaBell className="text-xs" />
            </motion.button>

            {stats?.pendingVisits > 0 ? (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center border-2 border-[var(--color-bg)]">
                {stats.pendingVisits > 9 ? '9+' : stats.pendingVisits}
              </span>
            ) : null}
          </div>
        </div>
      </motion.div>

      <div
        className="flex gap-1 p-1 rounded-xl border w-fit"
        style={{
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.id ? 'shadow-sm' : ''
            }`}
            style={
              activeTab === t.id
                ? {
                    background: 'var(--color-primary)',
                    color: 'var(--color-text-inverse)',
                  }
                : {
                    color: 'var(--color-text-muted)',
                  }
            }
          >
            <t.icon className="text-xs" />
            {t.label}
          </button>
        ))}
      </div>

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
            {loading ? <Skeleton className="h-20 w-full rounded-2xl" /> : <PortfolioSummary stats={stats} />}

            <section>
              <SectionHeader title="Resumen del portafolio" sub="KPIs principales" />
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => <KpiSkeleton key={i} />)
                ) : (
                  <>
                    <KpiCard icon={FaBuilding} label="Total propiedades" value={stats?.totalProperties} accent="#f59e0b" delay={0} />
                    <KpiCard icon={FaKey} label="Disponibles" value={stats?.availableProperties} accent="#22c55e" delay={1} />
                    <KpiCard icon={FaUsers} label="Clientes activos" value={stats?.activeClients} accent="#3b82f6" delay={2} />
                    <KpiCard icon={FaFileContract} label="Contratos activos" value={stats?.activeContracts} accent="#a855f7" delay={3} />
                    <KpiCard icon={FaMoneyBillWave} label="Valor portafolio" value={stats?.totalValue} accent="#f59e0b" delay={4} isCurrency />
                  </>
                )}
              </div>
            </section>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
              ) : (
                <>
                  <KpiCard icon={FaCalendarCheck} label="Visitas este mes" value={stats?.visitsThisMonth} accent="#06b6d4" delay={0} />
                  <KpiCard icon={FaHourglassHalf} label="Visitas pendientes" value={stats?.pendingVisits} accent="#f97316" delay={1} />
                  <KpiCard icon={FaHandshake} label="Por firmar" value={stats?.pendingContracts} accent="#ec4899" delay={2} />
                  <KpiCard icon={FaFire} label="Leads activos" value={stats?.leads} accent="#ef4444" delay={3} />
                </>
              )}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <ChartCard title="Distribución por tipo" sub="Inventario">
                {loading ? (
                  <Skeleton className="h-72 w-full" />
                ) : propsByType.length === 0 ? (
                  <EmptyState message="Sin propiedades registradas" />
                ) : (
                  <ResponsiveContainer width="100%" height={290}>
                    <BarChart data={propsByType} margin={{ top: 5, right: 5, bottom: 0, left: -15 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-divider)" vertical={false} />
                      <XAxis dataKey="tipo" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="cantidad" name="Propiedades" radius={[8, 8, 0, 0]}>
                        {propsByType.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Estado de contratos" sub="Pipeline legal">
                {loading ? (
                  <Skeleton className="h-72 w-full" />
                ) : contractStatus.length === 0 ? (
                  <EmptyState icon={FaFileContract} message="Sin contratos registrados" />
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={contractStatus}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={100}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {contractStatus.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <DonutLegend data={contractStatus} />
                  </>
                )}
              </ChartCard>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
              <ChartCard title="Visitas por mes" sub="Últimos 7 meses">
                {loading ? (
                  <Skeleton className="h-72 w-full" />
                ) : visitsByMonth.length === 0 ? (
                  <EmptyState icon={FaCalendarCheck} message="Sin visitas aún" />
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={visitsByMonth}>
                      <defs>
                        <linearGradient id="visitsAreaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.5} />
                          <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-divider)" vertical={false} />
                      <XAxis dataKey="mes" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="visitas" stroke="#f59e0b" strokeWidth={2.5} fill="url(#visitsAreaGradient)" name="Visitas" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Clientes nuevos vs leads" sub="Captación">
                {loading ? (
                  <Skeleton className="h-72 w-full" />
                ) : clientsTrend.length === 0 ? (
                  <EmptyState icon={FaUsers} message="Sin clientes" />
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={clientsTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-divider)" vertical={false} />
                      <XAxis dataKey="mes" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="nuevos" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 3 }} name="Clientes" />
                      <Line type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} name="Leads" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Conversión comercial" sub="Ventas · arriendos · leads">
                {loading ? (
                  <Skeleton className="h-72 w-full" />
                ) : conversion.length === 0 ? (
                  <EmptyState icon={FaHandshake} message="Sin datos de conversión" />
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={240}>
                      <RadialBarChart
                        innerRadius="25%"
                        outerRadius="95%"
                        data={conversion}
                        startAngle={180}
                        endAngle={0}
                        barSize={16}
                      >
                        <RadialBar background dataKey="value" cornerRadius={8} />
                        <Tooltip content={<CustomTooltip />} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {conversion.map((item) => (
                        <div key={item.name} className="card-inner p-3 text-center">
                          <p className="text-lg font-bold" style={{ color: item.fill }}>{item.value}%</p>
                          <p className="t-faint text-[10px]">{item.name}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </ChartCard>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.08fr_0.92fr] gap-5">
              <ChartCard title="Top propiedades" sub="Mayor interés" className="min-h-[420px]">
                {loading ? (
                  <Skeleton className="h-72 w-full" />
                ) : topProperties.length === 0 ? (
                  <EmptyState icon={FaHome} message="Sin propiedades" />
                ) : (
                  <div className="space-y-2">
                    {topProperties.map((p, i) => (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="card-inner flex items-center gap-3 px-3.5 py-3.5"
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border"
                          style={{
                            background: 'var(--color-surface-offset)',
                            borderColor: 'var(--color-border)',
                            color: 'var(--color-primary)',
                          }}
                        >
                          <FaDoorOpen className="text-xs" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p
                            className="text-sm sm:text-[15px] font-semibold leading-tight truncate"
                            style={{ color: 'var(--color-text)' }}
                            title={p.title}
                          >
                            {p.title}
                          </p>

                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-[12px] t-muted truncate">
                              {p.city} · {getPropertyTypeLabel(p.type)}
                            </span>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0 min-w-[86px]">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wide ${STATUS_STYLES[p.status] || 'badge-slate'}`}>
                            {p.status}
                          </span>
                          <p className="text-[11px] mt-1.5 flex items-center justify-end gap-1 t-muted">
                            {p.views > 0 ? (
                              <>
                                <FaEye className="text-[9px]" />
                                {p.views}
                              </>
                            ) : (
                              fmtCompactCOP(p.price)
                            )}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </ChartCard>

              <ChartCard title="Actividad reciente" sub="Movimiento del sistema" className="min-h-[420px]">
                {loading ? (
                  <Skeleton className="h-72 w-full" />
                ) : recentActivity.length === 0 ? (
                  <EmptyState message="Sin actividad reciente" />
                ) : (
                  <div className="space-y-2">
                    {recentActivity.slice(0, 8).map((item, i) => (
                      <ActivityItem key={`${item.type}-${i}-${item.subject}`} item={item} delay={i * 0.04} />
                    ))}
                  </div>
                )}
              </ChartCard>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[0.95fr_1.05fr] gap-5">
              <ChartCard title="Rendimiento del equipo" sub="Visitas y contratos" className="min-h-[330px]">
                {loading ? (
                  <Skeleton className="h-72 w-full" />
                ) : agents.length === 0 ? (
                  <EmptyState icon={FaUsers} message="Sin agentes" />
                ) : (
                  <div className="space-y-1">
                    {agents.map((agent, i) => (
                      <AgentRow key={agent.name} agent={agent} maxVisitas={maxAgentVisits} delay={i * 0.05} />
                    ))}
                  </div>
                )}
              </ChartCard>

              <ChartCard title="Equipo comercial" sub="Vista rápida" className="min-h-[330px]">
                {loading ? (
                  <Skeleton className="h-72 w-full" />
                ) : agents.length === 0 ? (
                  <EmptyState icon={FaUsers} message="Sin integrantes" />
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {agents.map((a, i) => (
                      <AgentCard key={a.name} agent={a} delay={i * 0.05} />
                    ))}
                  </div>
                )}
              </ChartCard>
            </div>
          </motion.div>
        )}

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
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
              ) : (
                <>
                  <KpiCard icon={FaBuilding} label="Total" value={stats?.totalProperties} accent="#f59e0b" />
                  <KpiCard icon={FaKey} label="Disponibles" value={stats?.availableProperties} accent="#22c55e" />
                  <KpiCard icon={FaHandshake} label="Vendidas" value={stats?.soldProperties} accent="#3b82f6" />
                  <KpiCard icon={FaCity} label="Arrendadas" value={stats?.rentedProperties} accent="#a855f7" />
                </>
              )}
            </div>

            <ChartCard title="Propiedades por tipo" sub="Distribución del inventario">
              {loading ? (
                <Skeleton className="h-64 w-full" />
              ) : propsByType.length === 0 ? (
                <EmptyState message="Sin propiedades" />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={propsByType} margin={{ top: 5, right: 5, bottom: 0, left: -15 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-divider)" vertical={false} />
                    <XAxis dataKey="tipo" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="cantidad" name="Propiedades" radius={[6, 6, 0, 0]}>
                      {propsByType.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Valor estimado por tipo" sub="Distribución COP">
              {loading ? (
                <Skeleton className="h-52 w-full" />
              ) : propsByType.length === 0 ? (
                <EmptyState message="Sin propiedades" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={propsByType} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-divider)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} tickFormatter={fmtCompactCOP} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="tipo" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={60} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="valor" name="Valor" radius={[0, 6, 6, 0]} fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Listado de propiedades recientes" sub="Últimas publicadas">
              {loading ? (
                <Skeleton className="h-48 w-full" />
              ) : topProperties.length === 0 ? (
                <EmptyState message="Sin propiedades" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr
                        className="text-xs uppercase tracking-wider border-b"
                        style={{ color: 'var(--color-text-faint)', borderColor: 'var(--color-divider)' }}
                      >
                        <th className="pb-3 text-left font-medium">#</th>
                        <th className="pb-3 text-left font-medium">Propiedad</th>
                        <th className="pb-3 text-left font-medium hidden sm:table-cell">Ciudad</th>
                        <th className="pb-3 text-left font-medium">Precio</th>
                        <th className="pb-3 text-left font-medium">Estado</th>
                        {topProperties.some((p) => p.views > 0) ? (
                          <th className="pb-3 text-right font-medium">Vistas</th>
                        ) : null}
                      </tr>
                    </thead>
                    <tbody>
                      {topProperties.map((p, i) => (
                        <tr
                          key={p.id}
                          className="transition-colors"
                          style={{ borderColor: 'var(--color-divider)' }}
                        >
                          <td className="py-3 text-xs t-faint font-bold">{i + 1}</td>
                          <td className="py-3">
                            <p className="text-xs font-semibold truncate max-w-[240px]" style={{ color: 'var(--color-text)' }}>
                              {p.title}
                            </p>
                            <p className="t-muted text-[10px] capitalize mt-0.5">{p.type}</p>
                          </td>
                          <td className="py-3 text-xs t-muted hidden sm:table-cell">{p.city}</td>
                          <td className="py-3 text-xs font-semibold text-amber-600 dark:text-amber-400">{fmtCompactCOP(p.price)}</td>
                          <td className="py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-lg border text-[10px] font-semibold capitalize ${STATUS_STYLES[p.status] || 'badge-slate'}`}>
                              {p.status}
                            </span>
                          </td>
                          {topProperties.some((x) => x.views > 0) ? (
                            <td className="py-3 text-right text-xs font-semibold" style={{ color: 'var(--color-text)' }}>
                              {p.views}
                            </td>
                          ) : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </ChartCard>
          </motion.div>
        )}

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
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
              ) : (
                <>
                  <KpiCard icon={FaUsers} label="Total clientes" value={stats?.totalClients} accent="#f59e0b" />
                  <KpiCard icon={FaCheckCircle} label="Activos" value={stats?.activeClients} accent="#22c55e" />
                  <KpiCard icon={FaFire} label="Leads" value={stats?.leads} accent="#ef4444" />
                  <KpiCard
                    icon={FaPercent}
                    label="Conversión"
                    value={stats?.totalClients > 0 ? Math.round((stats.activeClients / stats.totalClients) * 100) : 0}
                    accent="#a855f7"
                  />
                </>
              )}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <ChartCard title="Clientes nuevos vs leads" sub="Tendencia 7 meses">
                {loading ? (
                  <Skeleton className="h-64 w-full" />
                ) : clientsTrend.length === 0 ? (
                  <EmptyState message="Sin datos de clientes" />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={clientsTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-divider)" vertical={false} />
                      <XAxis dataKey="mes" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11, color: 'var(--color-text-muted)' }} />
                      <Line type="monotone" dataKey="nuevos" name="Clientes nuevos" stroke="#22c55e" strokeWidth={2.5} dot={{ fill: '#22c55e', r: 3 }} activeDot={{ r: 5 }} />
                      <Line type="monotone" dataKey="leads" name="Leads" stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: '#f59e0b', r: 3 }} activeDot={{ r: 5 }} strokeDasharray="5 3" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Tasas de conversión" sub="Por canal">
                {loading ? (
                  <Skeleton className="h-64 w-full" />
                ) : conversion.length === 0 ? (
                  <EmptyState message="Sin datos de conversión" />
                ) : (
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <ResponsiveContainer width="100%" height={220}>
                      <RadialBarChart cx="50%" cy="50%" innerRadius="22%" outerRadius="88%" barSize={14} data={conversion}>
                        <RadialBar minAngle={10} background fill="var(--color-surface-offset)" dataKey="value" />
                        <Tooltip content={<CustomTooltip />} />
                      </RadialBarChart>
                    </ResponsiveContainer>

                    <div className="space-y-4 w-full sm:w-auto">
                      {conversion.map((c) => (
                        <div key={c.name} className="flex items-center gap-3">
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: c.fill }} />
                          <div>
                            <p className="t-muted text-xs">{c.name}</p>
                            <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--color-text)' }}>{c.value}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </ChartCard>
            </div>

            <ChartCard title="Visitas por mes" sub="Solicitudes y gestión">
              {loading ? (
                <Skeleton className="h-52 w-full" />
              ) : visitsByMonth.length === 0 ? (
                <EmptyState message="Sin visitas registradas" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={visitsByMonth} margin={{ top: 5, right: 5, bottom: 0, left: -15 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-divider)" vertical={false} />
                    <XAxis dataKey="mes" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, color: 'var(--color-text-muted)' }} />
                    <Bar dataKey="aprobadas" name="Aprobadas" fill="#22c55e" radius={[4, 4, 0, 0]} stackId="a" />
                    <Bar dataKey="pendientes" name="Pendientes" fill="#f59e0b" radius={[4, 4, 0, 0]} stackId="a" />
                    <Bar dataKey="rechazadas" name="Rechazadas" fill="#ef4444" radius={[4, 4, 0, 0]} stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className="pt-4 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1"
        style={{ borderColor: 'var(--color-divider)' }}
      >
        <p className="text-xs t-faint">Inmobiliaria Rincón Bedoya y Asociados · Anserma, Caldas</p>
        <p className="text-xs t-faint flex items-center gap-1.5">
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${loading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
          {loading
            ? 'Actualizando datos'
            : lastUpdated
            ? `Actualizado ${lastUpdated.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`
            : 'Datos no disponibles'}
        </p>
      </div>
    </div>
  )
}