import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FaHome, 
  FaUsers, 
  FaEnvelope, 
  FaClipboardList,
  FaChartLine,
  FaMoneyBillWave,
  FaUserClock,
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle,
  FaArrowUp,
  FaArrowDown
} from 'react-icons/fa';
import { 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { useAuth } from '../../../core/contexts/AuthContext';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../core/config/firebase.config';

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
    soldProperties: 0
  });
  const [recentProperties, setRecentProperties] = useState([]);
  const [recentClients, setRecentClients] = useState([]);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Cargar propiedades
      const propertiesSnap = await getDocs(collection(db, 'properties'));
      const properties = propertiesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Cargar clientes
      const clientsSnap = await getDocs(collection(db, 'clients'));
      
      // Cargar usuarios
      const usersSnap = await getDocs(collection(db, 'users'));
      
      // Cargar solicitudes pendientes
      const requestsQuery = query(
        collection(db, 'accessRequests'),
        where('status', '==', 'pending')
      );
      const requestsSnap = await getDocs(requestsQuery);
      
      // Últimas 5 propiedades
      const recentPropsQuery = query(
        collection(db, 'properties'),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const recentPropsSnap = await getDocs(recentPropsQuery);
      const recentProps = recentPropsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));

      // Últimos 5 clientes
      const recentClientsQuery = query(
        collection(db, 'clients'),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const recentClientsSnap = await getDocs(recentClientsQuery);
      const recentClts = recentClientsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));

      // Calcular estadísticas
      const propertiesForSale = properties.filter(p => p.transactionType === 'venta').length;
      const propertiesForRent = properties.filter(p => p.transactionType === 'arriendo').length;
      const availableProperties = properties.filter(p => p.status === 'disponible').length;
      const soldProperties = properties.filter(p => p.status === 'vendida' || p.status === 'arrendada').length;

      // Datos para gráfica de propiedades por mes (últimos 6 meses)
      const monthlyData = generateMonthlyData(properties);

      setStats({
        properties: properties.length,
        clients: clientsSnap.size,
        users: usersSnap.size,
        requests: requestsSnap.size,
        propertiesForSale,
        propertiesForRent,
        availableProperties,
        soldProperties
      });

      setRecentProperties(recentProps);
      setRecentClients(recentClts);
      setChartData(monthlyData);
    } catch (error) {
      console.error('Error cargando dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMonthlyData = (properties) => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const currentMonth = new Date().getMonth();
    const last6Months = [];

    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      const monthName = months[monthIndex];
      
      const monthProperties = properties.filter(p => {
        if (!p.createdAt) return false;
        const propDate = p.createdAt.toDate();
        return propDate.getMonth() === monthIndex;
      });

      last6Months.push({
        month: monthName,
        venta: monthProperties.filter(p => p.transactionType === 'venta').length,
        arriendo: monthProperties.filter(p => p.transactionType === 'arriendo').length
      });
    }

    return last6Months;
  };

  const pieData = [
    { name: 'Venta', value: stats.propertiesForSale },
    { name: 'Arriendo', value: stats.propertiesForRent }
  ];

  const statusData = [
    { name: 'Disponibles', value: stats.availableProperties },
    { name: 'Vendidas/Arrendadas', value: stats.soldProperties }
  ];

  const COLORS = ['#F4CA64', '#3B82F6', '#10B981', '#EF4444'];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-400">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl md:text-4xl font-bold text-primary mb-1">
          Dashboard
        </h1>
        <p className="text-muted text-sm">
          Bienvenido, {currentUser?.displayName || currentUser?.email}
        </p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card-soft p-6 border-l-4 border-primary"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Propiedades</p>
              <p className="text-3xl font-bold text-light">{stats.properties}</p>
              <p className="text-xs text-green-500 flex items-center gap-1 mt-2">
                <FaArrowUp /> {stats.availableProperties} disponibles
              </p>
            </div>
            <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center">
              <FaHome className="text-primary text-2xl" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card-soft p-6 border-l-4 border-blue-500"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Clientes</p>
              <p className="text-3xl font-bold text-light">{stats.clients}</p>
              <p className="text-xs text-slate-400 mt-2">Registrados</p>
            </div>
            <div className="w-14 h-14 bg-blue-500/10 rounded-xl flex items-center justify-center">
              <FaUsers className="text-blue-500 text-2xl" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card-soft p-6 border-l-4 border-green-500"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Usuarios</p>
              <p className="text-3xl font-bold text-light">{stats.users}</p>
              <p className="text-xs text-slate-400 mt-2">Del sistema</p>
            </div>
            <div className="w-14 h-14 bg-green-500/10 rounded-xl flex items-center justify-center">
              <FaUserClock className="text-green-500 text-2xl" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card-soft p-6 border-l-4 border-yellow-500"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Solicitudes</p>
              <p className="text-3xl font-bold text-light">{stats.requests}</p>
              <p className="text-xs text-yellow-500 flex items-center gap-1 mt-2">
                <FaClock /> Pendientes
              </p>
            </div>
            <div className="w-14 h-14 bg-yellow-500/10 rounded-xl flex items-center justify-center">
              <FaEnvelope className="text-yellow-500 text-2xl" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfica de barras - Propiedades por mes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="card-soft p-6"
        >
          <h2 className="text-xl font-bold text-light mb-4 flex items-center gap-2">
            <FaChartLine className="text-primary" />
            Propiedades por mes
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" stroke="#94A3B8" />
              <YAxis stroke="#94A3B8" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1E293B', 
                  border: '1px solid #334155',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar dataKey="venta" fill="#F4CA64" name="Venta" />
              <Bar dataKey="arriendo" fill="#3B82F6" name="Arriendo" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Gráfica de pastel - Tipo de transacción */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="card-soft p-6"
        >
          <h2 className="text-xl font-bold text-light mb-4">Propiedades por tipo</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1E293B', 
                  border: '1px solid #334155',
                  borderRadius: '8px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Actividad reciente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Últimas propiedades */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="card-soft p-6"
        >
          <h2 className="text-xl font-bold text-light mb-4 flex items-center gap-2">
            <FaHome className="text-primary" />
            Últimas propiedades
          </h2>
          <div className="space-y-3">
            {recentProperties.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">No hay propiedades registradas</p>
            ) : (
              recentProperties.map((prop) => (
                <div key={prop.id} className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg border border-slate-800">
                  <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FaHome className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-light font-semibold truncate">{prop.title || 'Sin título'}</p>
                    <p className="text-xs text-slate-400">
                      {prop.createdAt?.toLocaleDateString()} - {prop.transactionType}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-primary font-bold text-sm">
                      ${prop.price?.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Últimos clientes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="card-soft p-6"
        >
          <h2 className="text-xl font-bold text-light mb-4 flex items-center gap-2">
            <FaUsers className="text-blue-500" />
            Últimos clientes
          </h2>
          <div className="space-y-3">
            {recentClients.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">No hay clientes registrados</p>
            ) : (
              recentClients.map((client) => (
                <div key={client.id} className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg border border-slate-800">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-blue-500">
                    {client.name?.charAt(0).toUpperCase() || 'C'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-light font-semibold truncate">{client.name || 'Sin nombre'}</p>
                    <p className="text-xs text-slate-400 truncate">{client.email}</p>
                  </div>
                  <div className="text-xs text-slate-500">
                    {client.createdAt?.toLocaleDateString()}
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