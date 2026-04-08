import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  FaHome, FaUsers, FaEnvelope, FaChartLine,
  FaUserClock, FaClock, FaArrowUp,
} from "react-icons/fa";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { useAuth } from "../../../core/contexts/AuthContext";
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "../../../core/config/firebase.config";

const tooltipStyle = () => ({
  backgroundColor: "var(--color-surface-2, #1e293b)",
  border: "1px solid var(--color-border)",
  borderRadius: "10px",
  color: "var(--color-text)",
});

const COLORS = ["#F4CA64", "#3B82F6", "#10B981", "#EF4444"];

const cardAnim = (d) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: d },
});

function StatCard({ delay, iconBg, icon: Icon, iconColor, label, value, sub, subColor }) {
  return (
    <motion.div {...cardAnim(delay)} className="card-soft p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="t-muted text-sm mb-1">{label}</p>
          <p className="t-heading text-2xl sm:text-3xl leading-tight">{value}</p>
          {sub && (
            <p className={`text-xs flex items-center gap-1 mt-2 ${subColor || "t-muted"}`}>
              {sub}
            </p>
          )}
        </div>
        <div className={`w-11 h-11 sm:w-12 sm:h-12 ${iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
          <Icon className={`${iconColor} text-lg sm:text-xl`} />
        </div>
      </div>
    </motion.div>
  );
}

function ChartCard({ delay, title, badge, children }) {
  return (
    <motion.div {...cardAnim(delay)} className="card-soft p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="t-heading text-base sm:text-lg flex items-center gap-2">{title}</h2>
        {badge && <span className="text-xs t-faint">{badge}</span>}
      </div>
      {children}
    </motion.div>
  );
}

function RecentItem({ iconBg, icon: Icon, iconColor, title, sub, right }) {
  return (
    <div className="card-inner flex items-center gap-3 p-3">
      <div className={`w-11 h-11 ${iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
        <Icon className={iconColor} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="t-body font-semibold truncate text-sm">{title}</p>
        <p className="t-faint text-xs truncate">{sub}</p>
      </div>
      {right && <div className="text-right flex-shrink-0">{right}</div>}
    </div>
  );
}

const Empty = ({ msg }) => (
  <p className="t-muted text-sm text-center py-8">{msg}</p>
);

const DashboardPage = () => {
  const { currentUser, userProfile } = useAuth();
  const isAdmin = userProfile?.role === 'admin';

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    properties: 0, clients: 0, users: 0, requests: 0,
    propertiesForSale: 0, propertiesForRent: 0,
    availableProperties: 0, soldProperties: 0,
  });
  const [recentProperties, setRecentProperties] = useState([]);
  const [recentClients,    setRecentClients]    = useState([]);
  const [chartData,        setChartData]        = useState([]);

  useEffect(() => { loadDashboardData(); }, []);

  const generateMonthlyData = (properties) => {
    const months = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    const currentMonth = new Date().getMonth();
    return Array.from({ length: 6 }, (_, i) => {
      const idx = (currentMonth - (5 - i) + 12) % 12;
      const mp  = properties.filter((p) => {
        if (!p.createdAt) return false;
        const d = typeof p.createdAt?.toDate === "function" ? p.createdAt.toDate() : new Date(p.createdAt);
        return d.getMonth() === idx;
      });
      return {
        month:    months[idx],
        venta:    mp.filter((p) => p.transactionType === "venta").length,
        arriendo: mp.filter((p) => p.transactionType === "arriendo").length,
      };
    });
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [propertiesSnap, clientsSnap, usersSnap] = await Promise.all([
        getDocs(collection(db, "properties")),
        getDocs(collection(db, "clients")),
        getDocs(collection(db, "users")),
      ]);

      const properties = propertiesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // ✅ accessRequests solo lo pide admin — member no tiene permiso
      let requestsCount = 0;
      if (isAdmin) {
        const requestsSnap = await getDocs(
          query(collection(db, "accessRequests"), where("status", "==", "pending"))
        );
        requestsCount = requestsSnap.size;
      }

      const [recentPropsSnap, recentClientsSnap] = await Promise.all([
        getDocs(query(collection(db, "properties"), orderBy("createdAt", "desc"), limit(5))),
        getDocs(query(collection(db, "clients"),    orderBy("createdAt", "desc"), limit(5))),
      ]);

      const mapDoc = (snap) => snap.docs.map((d) => ({
        id: d.id, ...d.data(),
        createdAt: d.data().createdAt?.toDate?.() ?? null,
      }));

      setStats({
        properties:          properties.length,
        clients:             clientsSnap.size,
        users:               usersSnap.size,
        requests:            requestsCount,
        propertiesForSale:   properties.filter((p) => p.transactionType === "venta").length,
        propertiesForRent:   properties.filter((p) => p.transactionType === "arriendo").length,
        availableProperties: properties.filter((p) => p.status === "disponible").length,
        soldProperties:      properties.filter((p) => ["vendida","arrendada"].includes(p.status)).length,
      });
      setRecentProperties(mapDoc(recentPropsSnap));
      setRecentClients(mapDoc(recentClientsSnap));
      setChartData(generateMonthlyData(properties));
    } catch (e) {
      console.error("Error cargando dashboard:", e);
    } finally {
      setLoading(false);
    }
  };

  const pieData = useMemo(() => [
    { name: "Venta",    value: stats.propertiesForSale },
    { name: "Arriendo", value: stats.propertiesForRent },
  ], [stats.propertiesForSale, stats.propertiesForRent]);

  if (loading) {
    return (
      <div className="min-h-[55vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-b-2 border-primary mx-auto mb-4" />
          <p className="t-muted text-sm">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h1 className="t-heading text-2xl sm:text-3xl lg:text-4xl tracking-tight mb-1">
              Dashboard
            </h1>
            <p className="t-muted text-sm sm:text-base">
              Bienvenido,{" "}
              <span className="t-body font-semibold">
                {currentUser?.displayName || currentUser?.email}
              </span>
            </p>
          </div>
          <span className="t-faint text-xs sm:text-sm">Panel interno</span>
        </div>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-5">
        <StatCard
          delay={0.05} label="Propiedades" value={stats.properties}
          icon={FaHome}     iconBg="bg-amber-500/10"  iconColor="text-amber-500"
          sub={<><FaArrowUp className="text-green-500" /> {stats.availableProperties} disponibles</>}
        />
        <StatCard
          delay={0.10} label="Clientes" value={stats.clients}
          icon={FaUsers}    iconBg="bg-blue-500/10"   iconColor="text-blue-400"
          sub="Registrados" subColor="t-muted"
        />
        <StatCard
          delay={0.15} label="Usuarios" value={stats.users}
          icon={FaUserClock} iconBg="bg-green-500/10" iconColor="text-green-400"
          sub="Del sistema" subColor="t-muted"
        />
        {/* Solicitudes solo visible para admin */}
        {isAdmin && (
          <StatCard
            delay={0.20} label="Solicitudes" value={stats.requests}
            icon={FaEnvelope}  iconBg="bg-yellow-500/10" iconColor="text-yellow-400"
            sub={<><FaClock className="text-yellow-400" /> Pendientes</>} subColor="text-yellow-500"
          />
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        <ChartCard
          delay={0.25}
          title={<><FaChartLine className="text-amber-500" /> Propiedades por mes</>}
          badge="Últimos 6 meses"
        >
          {/* ✅ position:relative + height explícito resuelve width(-1) de Recharts */}
          <div style={{ position: 'relative', width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-divider)" />
                <XAxis dataKey="month" stroke="var(--color-text-muted)" tick={{ fill: "var(--color-text-muted)", fontSize: 12 }} />
                <YAxis stroke="var(--color-text-muted)"          tick={{ fill: "var(--color-text-muted)", fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle()} />
                <Legend wrapperStyle={{ color: "var(--color-text-muted)" }} />
                <Bar dataKey="venta"    fill="#F4CA64" name="Venta"    radius={[6,6,0,0]} />
                <Bar dataKey="arriendo" fill="#3B82F6" name="Arriendo" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard delay={0.30} title="Propiedades por tipo" badge="Distribución">
          <div style={{ position: 'relative', width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle()} />
                <Legend wrapperStyle={{ color: "var(--color-text-muted)" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
            {[{ name: "Venta", val: stats.propertiesForSale, c: COLORS[0] },
              { name: "Arriendo", val: stats.propertiesForRent, c: COLORS[1] }].map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: item.c }} />
                <span className="t-muted">{item.name}</span>
                <span className="ml-auto t-heading font-bold">{item.val}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Recientes */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        <ChartCard delay={0.35} title={<><FaHome className="text-amber-500" /> Últimas propiedades</>}>
          <div className="space-y-2">
            {recentProperties.length === 0
              ? <Empty msg="No hay propiedades registradas" />
              : recentProperties.map((p) => (
                <RecentItem
                  key={p.id}
                  icon={FaHome} iconBg="bg-amber-500/10" iconColor="text-amber-500"
                  title={p.title || "Sin título"}
                  sub={`${p.createdAt?.toLocaleDateString?.() || ""} • ${p.transactionType || ""}`}
                  right={
                    <span className="text-amber-500 font-extrabold text-sm">
                      {typeof p.price === "number" ? `$${p.price.toLocaleString()}` : p.price ? `$${p.price}` : ""}
                    </span>
                  }
                />
              ))}
          </div>
        </ChartCard>

        <ChartCard delay={0.40} title={<><FaUsers className="text-blue-400" /> Últimos clientes</>}>
          <div className="space-y-2">
            {recentClients.length === 0
              ? <Empty msg="No hay clientes registrados" />
              : recentClients.map((c) => (
                <RecentItem
                  key={c.id}
                  icon={FaUsers} iconBg="bg-blue-500/10" iconColor="text-blue-400"
                  title={c.name || "Sin nombre"}
                  sub={c.email || ""}
                  right={
                    <span className="t-faint text-xs">{c.createdAt?.toLocaleDateString?.() || ""}</span>
                  }
                />
              ))}
          </div>
        </ChartCard>
      </div>

    </div>
  );
};

export default DashboardPage;
