import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaPlus, 
  FaSearch, 
  FaUser,
  FaEdit,
  FaTrash,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaDollarSign,
  FaHome,
  FaExclamationTriangle,
  FaSpinner,
  FaEye,
  FaWhatsapp,
  FaStickyNote,
  FaTimes,
  FaClock,
  FaCheckCircle,
  FaCalendarAlt,
  FaUsers,
  FaClipboardList,
  FaBan,
  FaUserTie
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, getDoc } from 'firebase/firestore';
import { db } from '../../../core/config/firebase.config';
import moment from 'moment';
import 'moment/locale/es';

moment.locale('es');

const ClientManagement = () => {
  const [clients, setClients] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [clientDetail, setClientDetail] = useState(null);
  const [clientEvents, setClientEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  
  const [filtroTipo, setFiltroTipo] = useState('Todos');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [busqueda, setBusqueda] = useState('');

  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    email: '',
    tipoCliente: 'Lead',
    estado: 'Activo',
    presupuesto: '',
    tipoPropiedad: '',
    ubicacionInteres: '',
    notas: '',
    propiedadVinculada: '',
  });

  // CARGAR CLIENTES
  useEffect(() => {
    console.log('🔄 Iniciando carga de clientes...');
    setLoading(true);

    try {
      const q = query(collection(db, 'clients'));
      
      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          console.log('📦 Clientes recibidos desde Firebase:', snapshot.size);
          
          const data = snapshot.docs.map(docSnap => {
            const docData = docSnap.data();
            return {
              id: docSnap.id,
              nombre: docData.nombre || docData.name || '',
              telefono: docData.telefono || docData.phone || '',
              email: docData.email || '',
              tipoCliente: docData.tipoCliente || docData.type || 'Lead',
              estado: docData.estado || docData.status || 'Activo',
              presupuesto: docData.presupuesto || docData.budget || '',
              tipoPropiedad: docData.tipoPropiedad || docData.propertyType || '',
              ubicacionInteres: docData.ubicacionInteres || docData.location || '',
              notas: docData.notas || docData.notes || '',
              propiedadVinculada: docData.propiedadVinculada || docData.linkedProperty || '',
              fechaRegistro: docData.fechaRegistro || docData.createdAt || new Date().toISOString(),
              ...docData
            };
          });
          
          data.sort((a, b) => {
            const dateA = new Date(a.fechaRegistro || a.createdAt || 0);
            const dateB = new Date(b.fechaRegistro || b.createdAt || 0);
            return dateB - dateA;
          });
          
          setClients(data);
          setLoading(false);
        },
        (error) => {
          console.error('❌ Error cargando clientes:', error);
          toast.error(`Error: ${error.message}`);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('❌ Error configurando listener:', error);
      toast.error('Error al configurar la conexión');
      setLoading(false);
    }
  }, []);

  // CARGAR PROPIEDADES
  useEffect(() => {
    const q = query(collection(db, 'properties'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setProperties(data);
    });
    return () => unsubscribe();
  }, []);

  // CARGAR EVENTOS CON ASESOR
  useEffect(() => {
    if (!clientDetail?.id) {
      setClientEvents([]);
      return;
    }

    setLoadingEvents(true);
    
    const q = query(
      collection(db, 'appointments'),
      where('clientId', '==', clientDetail.id)
    );

    const unsubscribe = onSnapshot(
      q, 
      async (snapshot) => {
        const eventsData = await Promise.all(
          snapshot.docs.map(async (docSnap) => {
            const data = docSnap.data();
            const dateStr = data.date || moment().format('YYYY-MM-DD');
            const timeStr = data.time || '09:00';
            const start = moment(`${dateStr}T${timeStr}`).toDate();
            
            let agentName = data.agentName || '';
            
            // Si NO tiene agentName, buscar en users
            if (!agentName) {
              const userId = data.assignedAgentId || data.createdBy || data.agentId;
              if (userId) {
                try {
                  const userDoc = await getDoc(doc(db, 'users', userId));
                  if (userDoc.exists()) {
                    const userData = userDoc.data();
                    agentName = userData.displayName || userData.name || userData.email || 'Agente';
                  }
                } catch (err) {
                  console.warn('No se pudo obtener usuario:', err);
                  agentName = data.createdBy ? data.createdBy.substring(0, 8) + '...' : 'Sin asignar';
                }
              }
            }
            
            return {
              id: docSnap.id,
              ...data,
              start,
              agentName
            };
          })
        );
        
        eventsData.sort((a, b) => b.start - a.start);
        
        setClientEvents(eventsData);
        setLoadingEvents(false);
      },
      (error) => {
        console.error('❌ Error cargando eventos:', error);
        setClientEvents([]);
        setLoadingEvents(false);
      }
    );

    return () => unsubscribe();
  }, [clientDetail?.id]);

  // FILTRO
  const clientesFiltrados = clients.filter(cliente => {
    const cumpleTipo = filtroTipo === 'Todos' || cliente.tipoCliente === filtroTipo;
    const cumpleEstado = filtroEstado === 'Todos' || cliente.estado === filtroEstado;
    const cumpleBusqueda = !busqueda ||
      cliente.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      cliente.email?.toLowerCase().includes(busqueda.toLowerCase()) ||
      cliente.telefono?.includes(busqueda);
    
    return cumpleTipo && cumpleEstado && cumpleBusqueda;
  });

  // GUARDAR
  const handleSaveClient = async (e) => {
    e.preventDefault();
    
    if (!formData.nombre.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    if (!formData.telefono.trim()) {
      toast.error('El teléfono es obligatorio');
      return;
    }

    setSubmitting(true);

    try {
      if (selectedClient) {
        const clientRef = doc(db, 'clients', selectedClient.id);
        await updateDoc(clientRef, {
          ...formData,
          updatedAt: new Date().toISOString()
        });
        toast.success('Cliente actualizado correctamente');
      } else {
        await addDoc(collection(db, 'clients'), {
          ...formData,
          fechaRegistro: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        toast.success('Cliente creado correctamente');
      }
      
      handleCloseForm();
    } catch (error) {
      console.error('❌ Error guardando cliente:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // ELIMINAR
  const handleDeleteClient = async (clientId) => {
    if (!confirm('¿Estás seguro de eliminar este cliente?')) return;
    
    try {
      await deleteDoc(doc(db, 'clients', clientId));
      toast.success('Cliente eliminado');
    } catch (error) {
      console.error('❌ Error eliminando cliente:', error);
      toast.error(`Error: ${error.message}`);
    }
  };

  // EDITAR
  const handleEditClient = (client) => {
    setSelectedClient(client);
    setFormData({
      nombre: client.nombre || '',
      telefono: client.telefono || '',
      email: client.email || '',
      tipoCliente: client.tipoCliente || 'Lead',
      estado: client.estado || 'Activo',
      presupuesto: client.presupuesto || '',
      tipoPropiedad: client.tipoPropiedad || '',
      ubicacionInteres: client.ubicacionInteres || '',
      notas: client.notas || '',
      propiedadVinculada: client.propiedadVinculada || '',
    });
    setShowForm(true);
  };

  // VER DETALLE
  const handleViewDetail = (client) => {
    setClientDetail(client);
    setShowDetailModal(true);
  };

  // CERRAR FORM
  const handleCloseForm = () => {
    setShowForm(false);
    setSelectedClient(null);
    setFormData({
      nombre: '',
      telefono: '',
      email: '',
      tipoCliente: 'Lead',
      estado: 'Activo',
      presupuesto: '',
      tipoPropiedad: '',
      ubicacionInteres: '',
      notas: '',
      propiedadVinculada: '',
    });
  };

  // ICONOS
  const getTypeIcon = (type) => {
    const icons = {
      visita: FaEye,
      reunion: FaUsers,
      llamada: FaPhone,
      seguimiento: FaClipboardList,
      otro: FaCalendarAlt
    };
    return icons[type] || FaCalendarAlt;
  };

  const getTypeColor = (type) => {
    const colors = {
      visita: 'text-blue-400',
      reunion: 'text-purple-400',
      llamada: 'text-green-400',
      seguimiento: 'text-orange-400',
      otro: 'text-slate-400'
    };
    return colors[type] || 'text-slate-400';
  };

  const getStatusIcon = (status) => {
    const icons = {
      pendiente: FaClock,
      confirmada: FaCheckCircle,
      completada: FaCheckCircle,
      cancelada: FaBan
    };
    return icons[status] || FaClock;
  };

  const getStatusColor = (status) => {
    const colors = {
      pendiente: 'text-yellow-400',
      confirmada: 'text-blue-400',
      completada: 'text-green-400',
      cancelada: 'text-red-400'
    };
    return colors[status] || 'text-yellow-400';
  };

  // BADGES
  const TipoBadge = ({ tipo }) => {
    const styles = {
      Lead: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      lead: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      Comprador: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      Arrendatario: 'bg-green-500/20 text-green-400 border-green-500/30',
      Propietario: 'bg-purple-500/20 text-purple-400 border-purple-500/30'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[tipo] || styles.Lead}`}>
        {tipo}
      </span>
    );
  };

  const EstadoBadge = ({ estado }) => {
    const styles = {
      Activo: 'bg-green-500/20 text-green-400 border-green-500/30',
      active: 'bg-green-500/20 text-green-400 border-green-500/30',
      Inactivo: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      Convertido: 'bg-primary/20 text-primary border-primary/30'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[estado] || styles.Activo}`}>
        {estado}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">CRM de Clientes</h1>
          <p className="text-slate-400">
            Total: <span className="text-primary font-bold">{clients.length}</span> clientes registrados
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="button-gold inline-flex items-center gap-2 px-6 py-3"
        >
          <FaPlus />
          Nuevo Cliente
        </button>
      </div>

      {/* FILTROS */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <FaSearch className="text-primary" />
          <h3 className="text-lg font-semibold text-light">Filtrar Clientes</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select 
            className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-light focus:border-primary outline-none"
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
          >
            <option value="Todos">Todos los tipos</option>
            <option value="Lead">Leads</option>
            <option value="Comprador">Compradores</option>
            <option value="Arrendatario">Arrendatarios</option>
            <option value="Propietario">Propietarios</option>
          </select>

          <select 
            className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-light focus:border-primary outline-none"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
          >
            <option value="Todos">Todos los estados</option>
            <option value="Activo">Activos</option>
            <option value="Inactivo">Inactivos</option>
            <option value="Convertido">Convertidos</option>
          </select>

          <input
            type="text"
            placeholder="Buscar..."
            className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-light focus:border-primary outline-none"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />

          <button
            onClick={() => {
              setFiltroTipo('Todos');
              setFiltroEstado('Todos');
              setBusqueda('');
            }}
            className="bg-slate-800 hover:bg-slate-700 text-light font-semibold rounded-lg px-4 py-3 transition-colors"
          >
            Limpiar Filtros
          </button>
        </div>

        <div className="mt-4 text-slate-400 text-sm">
          Mostrando <span className="text-primary font-semibold">{clientesFiltrados.length}</span> de {clients.length} clientes
        </div>
      </div>

      {/* LISTA */}
      {loading ? (
        <div className="text-center text-slate-400 py-12">
          <FaSpinner className="animate-spin text-6xl text-primary mx-auto mb-4" />
          <p>Cargando clientes...</p>
        </div>
      ) : clients.length === 0 ? (
        <div className="text-center text-slate-400 py-12 bg-slate-900/50 border border-slate-800 rounded-xl">
          <FaUser className="text-6xl text-slate-700 mx-auto mb-4" />
          <p className="text-lg mb-2">No hay clientes registrados</p>
          <p className="text-sm">Haz clic en "Nuevo Cliente" para empezar</p>
        </div>
      ) : clientesFiltrados.length === 0 ? (
        <div className="text-center text-slate-400 py-12 bg-slate-900/50 border border-slate-800 rounded-xl">
          <FaExclamationTriangle className="text-6xl text-yellow-500 mx-auto mb-4" />
          <p>No hay clientes que coincidan con los filtros</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clientesFiltrados.map((client) => (
            <motion.div
              key={client.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-primary/50 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-light mb-2">{client.nombre}</h3>
                  <div className="flex flex-wrap gap-2">
                    <TipoBadge tipo={client.tipoCliente} />
                    <EstadoBadge estado={client.estado} />
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {client.telefono && (
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <FaPhone className="text-primary" />
                    <span>{client.telefono}</span>
                  </div>
                )}
                {client.email && (
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <FaEnvelope className="text-primary" />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
                {client.ubicacionInteres && (
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <FaMapMarkerAlt className="text-primary" />
                    <span>{client.ubicacionInteres}</span>
                  </div>
                )}
                {client.presupuesto && (
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <FaDollarSign className="text-primary" />
                    <span>
                      {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(client.presupuesto)}
                    </span>
                  </div>
                )}
                {client.tipoPropiedad && (
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <FaHome className="text-primary" />
                    <span>{client.tipoPropiedad}</span>
                  </div>
                )}
              </div>

              {client.notas && (
                <div className="bg-slate-950/50 rounded-lg p-3 mb-4">
                  <p className="text-slate-400 text-sm line-clamp-2">{client.notas}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-4 border-t border-slate-800">
                <button
                  onClick={() => handleViewDetail(client)}
                  className="px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-semibold"
                >
                  <FaEye /> Ver
                </button>
                <a
                  href={`https://wa.me/57${client.telefono.replace(/\D/g, '')}?text=Hola ${client.nombre}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-semibold"
                >
                  <FaWhatsapp /> WhatsApp
                </a>
                <button
                  onClick={() => handleEditClient(client)}
                  className="px-3 py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-semibold"
                >
                  <FaEdit /> Editar
                </button>
                <button
                  onClick={() => handleDeleteClient(client.id)}
                  className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-semibold"
                >
                  <FaTrash /> Eliminar
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* MODAL FORM */}
      <AnimatePresence mode="wait">
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={handleCloseForm}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 rounded-2xl border border-slate-800 max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            >
              <form onSubmit={handleSaveClient} className="p-8">
                <h2 className="text-2xl font-bold text-primary mb-6">
                  {selectedClient ? 'Editar Cliente' : 'Nuevo Cliente'}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-slate-400 text-sm mb-2">
                      Nombre completo <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-light focus:border-primary outline-none"
                      placeholder="Ej: Juan Pérez"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-sm mb-2">
                      Teléfono <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-light focus:border-primary outline-none"
                      placeholder="3001234567"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-sm mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-light focus:border-primary outline-none"
                      placeholder="correo@ejemplo.com"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-sm mb-2">
                      Tipo de cliente <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.tipoCliente}
                      onChange={(e) => setFormData({ ...formData, tipoCliente: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-light focus:border-primary outline-none"
                    >
                      <option value="Lead">Lead</option>
                      <option value="Comprador">Comprador</option>
                      <option value="Arrendatario">Arrendatario</option>
                      <option value="Propietario">Propietario</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 text-sm mb-2">
                      Estado
                    </label>
                    <select
                      value={formData.estado}
                      onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-light focus:border-primary outline-none"
                    >
                      <option value="Activo">Activo</option>
                      <option value="Inactivo">Inactivo</option>
                      <option value="Convertido">Convertido</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 text-sm mb-2">
                      Presupuesto (COP)
                    </label>
                    <input
                      type="number"
                      value={formData.presupuesto}
                      onChange={(e) => setFormData({ ...formData, presupuesto: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-light focus:border-primary outline-none"
                      placeholder="50000000"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-sm mb-2">
                      Tipo de propiedad de interés
                    </label>
                    <select
                      value={formData.tipoPropiedad}
                      onChange={(e) => setFormData({ ...formData, tipoPropiedad: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-light focus:border-primary outline-none"
                    >
                      <option value="">Seleccionar...</option>
                      <option value="Casa">Casa</option>
                      <option value="Apartamento">Apartamento</option>
                      <option value="Local">Local</option>
                      <option value="Lote">Lote</option>
                      <option value="Finca">Finca</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-slate-400 text-sm mb-2">
                      Ubicación de interés
                    </label>
                    <input
                      type="text"
                      value={formData.ubicacionInteres}
                      onChange={(e) => setFormData({ ...formData, ubicacionInteres: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-light focus:border-primary outline-none"
                      placeholder="Ej: Anserma, Centro"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-slate-400 text-sm mb-2">
                      Propiedad vinculada
                    </label>
                    <select
                      value={formData.propiedadVinculada}
                      onChange={(e) => setFormData({ ...formData, propiedadVinculada: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-light focus:border-primary outline-none"
                    >
                      <option value="">Sin vincular</option>
                      {properties.map((prop) => (
                        <option key={prop.id} value={prop.id}>
                          {prop.title} - {prop.city}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-slate-400 text-sm mb-2">
                      Notas adicionales
                    </label>
                    <textarea
                      rows={4}
                      value={formData.notas}
                      onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-light focus:border-primary outline-none resize-none"
                      placeholder="Información adicional relevante..."
                    />
                  </div>
                </div>

                <div className="flex gap-4 mt-8">
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    disabled={submitting}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-light font-semibold rounded-xl px-6 py-3 transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 button-gold disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <FaSpinner className="animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      selectedClient ? 'Actualizar' : 'Crear Cliente'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL DETALLE */}
      <AnimatePresence mode="wait">
        {showDetailModal && clientDetail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowDetailModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 rounded-2xl border border-slate-800 max-w-5xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-8 space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-3xl font-bold text-light mb-2">
                      {clientDetail.nombre}
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      <TipoBadge tipo={clientDetail.tipoCliente} />
                      <EstadoBadge estado={clientDetail.estado} />
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center transition-colors"
                  >
                    <FaTimes className="text-light" />
                  </button>
                </div>

                {/* Info contacto */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {clientDetail.telefono && (
                    <div className="bg-slate-800/50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FaPhone className="text-primary" />
                        <span className="text-slate-400 text-sm">Teléfono</span>
                      </div>
                      <a
                        href={`tel:${clientDetail.telefono}`}
                        className="text-light font-semibold hover:text-primary transition-colors"
                      >
                        {clientDetail.telefono}
                      </a>
                    </div>
                  )}

                  {clientDetail.email && (
                    <div className="bg-slate-800/50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FaEnvelope className="text-primary" />
                        <span className="text-slate-400 text-sm">Email</span>
                      </div>
                      <a
                        href={`mailto:${clientDetail.email}`}
                        className="text-light font-semibold hover:text-primary transition-colors break-all"
                      >
                        {clientDetail.email}
                      </a>
                    </div>
                  )}

                  {clientDetail.ubicacionInteres && (
                    <div className="bg-slate-800/50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FaMapMarkerAlt className="text-primary" />
                        <span className="text-slate-400 text-sm">Ubicación de interés</span>
                      </div>
                      <p className="text-light font-semibold">
                        {clientDetail.ubicacionInteres}
                      </p>
                    </div>
                  )}

                  {clientDetail.presupuesto && (
                    <div className="bg-slate-800/50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FaDollarSign className="text-primary" />
                        <span className="text-slate-400 text-sm">Presupuesto</span>
                      </div>
                      <p className="text-light font-semibold">
                        {new Intl.NumberFormat('es-CO', {
                          style: 'currency',
                          currency: 'COP',
                          minimumFractionDigits: 0
                        }).format(clientDetail.presupuesto)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Notas */}
                {clientDetail.notas && (
                  <div className="bg-slate-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <FaStickyNote className="text-primary" />
                      <span className="text-light font-semibold">Notas</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      {clientDetail.notas}
                    </p>
                  </div>
                )}

                {/* HISTORIAL */}
                <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                        <FaCalendarAlt className="text-primary" />
                        Historial de actividad
                      </h3>
                      <p className="text-slate-400 text-sm mt-1">
                        {clientEvents.length
                          ? `${clientEvents.length} ${clientEvents.length === 1 ? 'evento registrado' : 'eventos registrados'}`
                          : 'Sin eventos aún'}
                      </p>
                    </div>
                  </div>

                  {loadingEvents ? (
                    <div className="flex items-center justify-center py-8">
                      <FaSpinner className="animate-spin text-primary text-3xl" />
                    </div>
                  ) : clientEvents.length === 0 ? (
                    <div className="text-center py-12">
                      <FaCalendarAlt className="text-slate-600 text-5xl mx-auto mb-4" />
                      <p className="text-slate-400 mb-2">
                        No hay eventos registrados para este cliente
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {clientEvents.map((event, index) => {
                        const TypeIcon = getTypeIcon(event.type);
                        const StatusIcon = getStatusIcon(event.status);
                        const typeColor = getTypeColor(event.type);
                        const statusColor = getStatusColor(event.status);

                        return (
                          <motion.div
                            key={event.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="relative pl-8 pb-6 border-l-2 border-slate-600 last:border-l-0 last:pb-0"
                          >
                            <div className="absolute left-0 top-0 -translate-x-[9px]">
                              <div className={`w-4 h-4 rounded-full bg-slate-900 border-2 ${typeColor.replace('text-', 'border-')} flex items-center justify-center`}>
                                <div className={`w-2 h-2 rounded-full ${typeColor.replace('text-', 'bg-')}`} />
                              </div>
                            </div>

                            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-primary/50 transition-colors">
                              <div className="flex items-start justify-between gap-4 mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <TypeIcon className={`${typeColor} text-lg`} />
                                    <h4 className="text-slate-100 font-semibold">{event.title}</h4>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mb-2">
                                    <span className="flex items-center gap-1">
                                      <FaCalendarAlt size={10} />
                                      {moment(event.start).format('DD MMM YYYY, HH:mm')}
                                    </span>
                                    <span className="capitalize">{event.type}</span>

                                    {event.agentName && (
                                      <span className="flex items-center gap-1 text-primary font-bold bg-primary/10 px-2 py-1 rounded">
                                        <FaUserTie size={12} />
                                        ASESOR: {event.agentName}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <StatusIcon className={`${statusColor} text-sm`} />
                                  <span className={`text-xs font-semibold ${statusColor} capitalize`}>
                                    {event.status}
                                  </span>
                                </div>
                              </div>

                              {event.notes && (
                                <p className="text-slate-300 text-sm mb-3 bg-slate-900/50 p-3 rounded border border-slate-700">
                                  {event.notes}
                                </p>
                              )}

                              {event.location && (
                                <p className="text-slate-400 text-xs">
                                  📍 {event.location}
                                </p>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* BOTONES FINALES - SIEMPRE VISIBLES */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t-2 border-slate-700">
                  <a
                    href={`https://wa.me/57${clientDetail.telefono.replace(/\D/g, '')}?text=Hola ${clientDetail.nombre}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl px-6 py-4 transition-all flex items-center justify-center gap-3 text-base shadow-lg hover:shadow-xl"
                  >
                    <FaWhatsapp className="text-2xl" />
                    <span>Abrir WhatsApp</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      setShowDetailModal(false);
                      setTimeout(() => handleEditClient(clientDetail), 100);
                    }}
                    className="w-full bg-primary hover:bg-yellow-400 text-slate-900 font-bold rounded-xl px-6 py-4 transition-all flex items-center justify-center gap-3 text-base shadow-lg hover:shadow-xl"
                  >
                    <FaEdit className="text-2xl" />
                    <span>Editar cliente</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ClientManagement;