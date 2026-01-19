import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  FaHome,
  FaUsers,
  FaEnvelope,
  FaChartLine,
  FaUserClock,
  FaClock,
  FaArrowUp,
} from "react-icons/fa";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useAuth } from "../../../core/contexts/AuthContext";
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "../../../core/config/firebase.config";

const DashboardPage = () => {
  const { currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    properties: 0,
    clients: 0,
    users: 0,
    requests: 0,
    propertiesForSale: 0,
    propertiesForRent: 0,
    availableProperties: 0,
    soldProperties: 0,
  });

  const [recentProperties, setRecentProperties] = useState([]);
  const [recentClients, setRecentClients] = useState([]);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateMonthlyData = (properties) => {
    const months = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    const currentMonth = new Date().getMonth();
    const last6Months = [];

    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      const monthName = months[monthIndex];

      const monthProperties = properties.filter((p) => {
        if (!p.createdAt) return false;
        const propDate =
          typeof p.createdAt?.toDate === "function" ? p.createdAt.toDate() : new Date(p.createdAt);
        return propDate.getMonth() === monthIndex;
      });

      last6Months.push({
        month: monthName,
        venta: monthProperties.filter((p) => p.transactionType === "venta").length,
        arriendo: monthProperties.filter((p) => p.transactionType === "arriendo").length,
      });
    }

    return last6Months;
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const propertiesSnap = await getDocs(collection(db, "properties"));
      const properties = propertiesSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const clientsSnap = await getDocs(collection(db, "clients"));
      const usersSnap = await getDocs(collection(db, "users"));

      const requestsQuery = query(
        collection(db, "accessRequests"),
        where("status", "==", "pending")
      );
      const requestsSnap = await getDocs(requestsQuery);

      const recentPropsQuery = query(
        collection(db, "properties"),
        orderBy("createdAt", "desc"),
        limit(5)
      );
      const recentPropsSnap = await getDocs(recentPropsQuery);
      const recentProps = recentPropsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() ?? null,
      }));

      const recentClientsQuery = query(
        collection(db, "clients"),
        orderBy("createdAt", "desc"),
        limit(5)
      );
      const recentClientsSnap = await getDocs(recentClientsQuery);
      const recentClts = recentClientsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() ?? null,
      }));

      const propertiesForSale = properties.filter((p) => p.transactionType === "venta").length;
      const propertiesForRent = properties.filter((p) => p.transactionType === "arriendo").length;
      const availableProperties = properties.filter((p) => p.status === "disponible").length;
      const soldProperties = properties.filter(
        (p) => p.status === "vendida" || p.status === "arrendada"
      ).length;

      setStats({
        properties: properties.length,
        clients: clientsSnap.size,
        users: usersSnap.size,
        requests: requestsSnap.size,
        propertiesForSale,
        propertiesForRent,
        availableProperties,
        soldProperties,
      });

      setRecentProperties(recentProps);
      setRecentClients(recentClts);
      setChartData(generateMonthlyData(properties));
    } catch (error) {
      console.error("Error cargando dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const pieData = useMemo(
    () => [
      { name: "Venta", value: stats.propertiesForSale },
      { name: "Arriendo", value: stats.propertiesForRent },
    ],
    [stats.propertiesForSale, stats.propertiesForRent]
  );

  const COLORS = ["#F4CA64", "#3B82F6", "#10B981", "#EF4444"];

  const cardAnim = (d) => ({
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: d },
  });

  if (loading) {
    return (
      <div className="min-h-[55vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Cargando dashboard...</p>
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
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white mb-1">
              Dashboard
            </h1>
            <p className="text-slate-400 text-sm sm:text-base">
              Bienvenido,{" "}
              <span className="text-slate-200 font-semibold">
                {currentUser?.displayName || currentUser?.email}
              </span>
            </p>
          </div>

          <div className="text-xs sm:text-sm text-slate-500">
            Panel interno
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-5">
        <motion.div {...cardAnim(0.05)} className="card-soft p-4 sm:p-5 border border-slate-800">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-slate-400 text-sm mb-1">Propiedades</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                {stats.properties}
              </p>
              <p className="text-xs text-green-400 flex items-center gap-1 mt-2">
                <FaArrowUp /> {stats.availableProperties} disponibles
              </p>
            </div>
            <div className="w-11 h-11 sm:w-12 sm:h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <FaHome className="text-primary text-lg sm:text-xl" />
            </div>
          </div>
        </motion.div>

        <motion.div {...cardAnim(0.1)} className="card-soft p-4 sm:p-5 border border-slate-800">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-slate-400 text-sm mb-1">Clientes</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                {stats.clients}
              </p>
              <p className="text-xs text-slate-400 mt-2">Registrados</p>
            </div>
            <div className="w-11 h-11 sm:w-12 sm:h-12 bg-blue-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <FaUsers className="text-blue-400 text-lg sm:text-xl" />
            </div>
          </div>
        </motion.div>

        <motion.div {...cardAnim(0.15)} className="card-soft p-4 sm:p-5 border border-slate-800">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-slate-400 text-sm mb-1">Usuarios</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                {stats.users}
              </p>
              <p className="text-xs text-slate-400 mt-2">Del sistema</p>
            </div>
            <div className="w-11 h-11 sm:w-12 sm:h-12 bg-green-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <FaUserClock className="text-green-400 text-lg sm:text-xl" />
            </div>
          </div>
        </motion.div>

        <motion.div {...cardAnim(0.2)} className="card-soft p-4 sm:p-5 border border-slate-800">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-slate-400 text-sm mb-1">Solicitudes</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                {stats.requests}
              </p>
              <p className="text-xs text-yellow-400 flex items-center gap-1 mt-2">
                <FaClock /> Pendientes
              </p>
            </div>
            <div className="w-11 h-11 sm:w-12 sm:h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <FaEnvelope className="text-yellow-400 text-lg sm:text-xl" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        <motion.div {...cardAnim(0.25)} className="card-soft p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
              <FaChartLine className="text-primary" />
              Propiedades por mes
            </h2>
            <span className="text-xs text-slate-500">Últimos 6 meses</span>
          </div>

          <div className="h-[240px] sm:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#94A3B8" />
                <YAxis stroke="#94A3B8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0F172A",
                    border: "1px solid #334155",
                    borderRadius: "10px",
                  }}
                />
                <Legend />
                <Bar dataKey="venta" fill="#F4CA64" name="Venta" radius={[6, 6, 0, 0]} />
                <Bar dataKey="arriendo" fill="#3B82F6" name="Arriendo" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div {...cardAnim(0.3)} className="card-soft p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-lg sm:text-xl font-extrabold text-white">
              Propiedades por tipo
            </h2>
            <span className="text-xs text-slate-500">Distribución</span>
          </div>

          <div className="h-[240px] sm:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={110} dataKey="value">
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0F172A",
                    border: "1px solid #334155",
                    borderRadius: "10px",
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ background: COLORS[0] }} />
              <span className="text-slate-300">Venta</span>
              <span className="ml-auto font-bold text-white">{stats.propertiesForSale}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ background: COLORS[1] }} />
              <span className="text-slate-300">Arriendo</span>
              <span className="ml-auto font-bold text-white">{stats.propertiesForRent}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recientes */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        <motion.div {...cardAnim(0.35)} className="card-soft p-5 sm:p-6">
          <h2 className="text-lg sm:text-xl font-extrabold text-white mb-4 flex items-center gap-2">
            <FaHome className="text-primary" />
            Últimas propiedades
          </h2>

          <div className="space-y-3">
            {recentProperties.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">
                No hay propiedades registradas
              </p>
            ) : (
              recentProperties.map((prop) => (
                <div
                  key={prop.id}
                  className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-xl border border-slate-800"
                >
                  <div className="w-11 h-11 bg-primary/15 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FaHome className="text-primary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate">
                      {prop.title || "Sin título"}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {prop.createdAt?.toLocaleDateString?.() || ""} • {prop.transactionType || ""}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-primary font-extrabold text-sm">
                      {typeof prop.price === "number"
                        ? `$${prop.price.toLocaleString()}`
                        : prop.price
                        ? `$${prop.price}`
                        : ""}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        <motion.div {...cardAnim(0.4)} className="card-soft p-5 sm:p-6">
          <h2 className="text-lg sm:text-xl font-extrabold text-white mb-4 flex items-center gap-2">
            <FaUsers className="text-blue-400" />
            Últimos clientes
          </h2>

          <div className="space-y-3">
            {recentClients.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">
                No hay clientes registrados
              </p>
            ) : (
              recentClients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-xl border border-slate-800"
                >
                  <div className="w-10 h-10 bg-blue-500/15 rounded-full flex items-center justify-center flex-shrink-0 font-extrabold text-blue-300">
                    {(client.name?.[0] || "C").toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate">
                      {client.name || "Sin nombre"}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{client.email || ""}</p>
                  </div>

                  <div className="text-xs text-slate-500 flex-shrink-0">
                    {client.createdAt?.toLocaleDateString?.() || ""}
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default DashboardPage;
