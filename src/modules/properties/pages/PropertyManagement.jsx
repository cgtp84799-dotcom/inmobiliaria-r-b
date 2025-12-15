import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaPlus, 
  FaSearch, 
  FaFilter,
  FaEdit,
  FaTrash,
  FaEye,
  FaHome,
  FaMapMarkerAlt,
  FaDollarSign,
  FaFileDownload
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../../core/config/firebase.config';
import PropertyForm from '../components/PropertyForm';
import PropertyDetail from '../components/PropertyDetail'; // ✅ NUEVO


const PropertyManagement = () => {
  const [properties, setProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showDetail, setShowDetail] = useState(false); // ✅ NUEVO
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterTransaction, setFilterTransaction] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');


  // Cargar propiedades
  useEffect(() => {
    loadProperties();
  }, []);


  const loadProperties = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'properties'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProperties(data);
      setFilteredProperties(data);
    } catch (error) {
      console.error('Error cargando propiedades:', error);
      toast.error('Error al cargar propiedades');
    } finally {
      setLoading(false);
    }
  };


  // Filtrar propiedades
  useEffect(() => {
    let filtered = [...properties];


    // Búsqueda por texto
    if (searchTerm) {
      filtered = filtered.filter(prop =>
        prop.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prop.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prop.neighborhood?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }


    // Filtro por tipo
    if (filterType !== 'all') {
      filtered = filtered.filter(prop => prop.type === filterType);
    }


    // Filtro por transacción
    if (filterTransaction !== 'all') {
      filtered = filtered.filter(prop => prop.transactionType === filterTransaction);
    }


    // Filtro por estado
    if (filterStatus !== 'all') {
      filtered = filtered.filter(prop => prop.status === filterStatus);
    }


    setFilteredProperties(filtered);
  }, [searchTerm, filterType, filterTransaction, filterStatus, properties]);


  // Guardar propiedad (crear o actualizar)
  const handleSaveProperty = async (propertyData) => {
    try {
      if (selectedProperty) {
        // Actualizar
        const propertyRef = doc(db, 'properties', selectedProperty.id);
        await updateDoc(propertyRef, {
          ...propertyData,
          updatedAt: new Date()
        });
        toast.success('Propiedad actualizada correctamente');
      } else {
        // Crear nueva
        await addDoc(collection(db, 'properties'), {
          ...propertyData,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        toast.success('Propiedad creada correctamente');
      }
      
      await loadProperties();
      setShowForm(false);
      setSelectedProperty(null);
    } catch (error) {
      console.error('Error guardando propiedad:', error);
      throw error;
    }
  };


  // Eliminar propiedad
  const handleDeleteProperty = async (propertyId) => {
    try {
      await deleteDoc(doc(db, 'properties', propertyId));
      toast.success('Propiedad eliminada');
      await loadProperties();
    } catch (error) {
      console.error('Error eliminando propiedad:', error);
      toast.error('Error al eliminar');
    }
  };


  // Editar propiedad
  const handleEditProperty = (property) => {
    setSelectedProperty(property);
    setShowForm(true);
    setShowDetail(false); // ✅ Cierra el detalle al editar
  };

  // ✅ NUEVO - Ver detalle
  const handleViewDetail = (property) => {
    setSelectedProperty(property);
    setShowDetail(true);
  };


  // Cerrar formulario
  const handleCloseForm = () => {
    setShowForm(false);
    setSelectedProperty(null);
  };


  // Formatear precio
  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(price);
  };


  // Badge de estado
  const StatusBadge = ({ status }) => {
    const styles = {
      disponible: 'bg-green-500/20 text-green-400 border-green-500/30',
      reservada: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      arrendada: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      vendida: 'bg-red-500/20 text-red-400 border-red-500/30'
    };


    const labels = {
      disponible: 'Disponible',
      reservada: 'Reservada',
      arrendada: 'Arrendada',
      vendida: 'Vendida'
    };


    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };


  // Generar ficha técnica PDF
  const handleDownloadPDF = (property) => {
    toast.info('Generando ficha técnica... (función próximamente)');
    // Aquí integraremos jsPDF en el siguiente paso
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">Gestión de Propiedades</h1>
          <p className="text-slate-400">Administra tu portafolio inmobiliario completo</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="button-gold inline-flex items-center gap-2 px-6 py-3"
        >
          <FaPlus />
          Nueva Propiedad
        </button>
      </div>


      {/* Filtros y búsqueda */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Búsqueda */}
          <div className="lg:col-span-2">
            <div className="relative">
              <FaSearch className="absolute left-3 top-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por título, ciudad, barrio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-light focus:border-primary outline-none transition-colors"
              />
            </div>
          </div>


          {/* Filtro por tipo */}
          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-light focus:border-primary outline-none"
            >
              <option value="all">Todos los tipos</option>
              <option value="casa">Casa</option>
              <option value="apartamento">Apartamento</option>
              <option value="lote">Lote</option>
              <option value="local">Local</option>
              <option value="finca">Finca</option>
              <option value="oficina">Oficina</option>
            </select>
          </div>


          {/* Filtro por transacción */}
          <div>
            <select
              value={filterTransaction}
              onChange={(e) => setFilterTransaction(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-light focus:border-primary outline-none"
            >
              <option value="all">Venta y Arriendo</option>
              <option value="venta">Solo Venta</option>
              <option value="arriendo">Solo Arriendo</option>
            </select>
          </div>


          {/* Filtro por estado */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-light focus:border-primary outline-none"
            >
              <option value="all">Todos los estados</option>
              <option value="disponible">Disponible</option>
              <option value="reservada">Reservada</option>
              <option value="arrendada">Arrendada</option>
              <option value="vendida">Vendida</option>
            </select>
          </div>
        </div>


        {/* Contador de resultados */}
        <div className="mt-4 text-slate-400 text-sm">
          Mostrando <span className="text-primary font-semibold">{filteredProperties.length}</span> de {properties.length} propiedades
        </div>
      </div>


      {/* Lista de propiedades */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 mt-4">Cargando propiedades...</p>
        </div>
      ) : filteredProperties.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/50 border border-slate-800 rounded-xl">
          <FaHome className="text-6xl text-slate-700 mx-auto mb-4" />
          <p className="text-slate-400 text-lg">No se encontraron propiedades</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 button-gold inline-flex items-center gap-2"
          >
            <FaPlus />
            Crear primera propiedad
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property, index) => (
            <motion.div
              key={property.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleViewDetail(property)} // ✅ CLICK EN TODA LA TARJETA
              className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden hover:border-primary/50 transition-all duration-300 group cursor-pointer" // ✅ AGREGADO cursor-pointer
            >
              {/* Imagen (placeholder si no hay) */}
              <div className="relative h-48 bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden">
                {property.images && property.images.length > 0 ? (
                  <img
                    src={property.images[0]}
                    alt={property.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FaHome className="text-6xl text-slate-700" />
                  </div>
                )}


                {/* Badge de tipo */}
                <div className="absolute top-3 left-3 px-3 py-1 bg-slate-950/80 backdrop-blur-sm rounded-lg text-xs font-semibold text-primary border border-primary/30">
                  {property.type?.charAt(0).toUpperCase() + property.type?.slice(1)}
                </div>


                {/* Badge de transacción */}
                <div className="absolute top-3 right-3 px-3 py-1 bg-slate-950/80 backdrop-blur-sm rounded-lg text-xs font-semibold text-blue-400 border border-blue-500/30">
                  {property.transactionType === 'venta' ? 'Venta' : 'Arriendo'}
                </div>
              </div>


              {/* Contenido */}
              <div className="p-5">
                {/* Título */}
                <h3 className="text-light font-bold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                  {property.title}
                </h3>


                {/* Ubicación */}
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-3">
                  <FaMapMarkerAlt className="text-primary" />
                  <span>{property.city}{property.neighborhood ? `, ${property.neighborhood}` : ''}</span>
                </div>


                {/* Precio */}
                <div className="flex items-center gap-2 mb-4">
                  <FaDollarSign className="text-green-400" />
                  <span className="text-2xl font-bold text-primary">
                    {formatPrice(property.price)}
                  </span>
                  {property.transactionType === 'arriendo' && (
                    <span className="text-slate-400 text-sm">/mes</span>
                  )}
                </div>


                {/* Características rápidas */}
                {property.type !== 'lote' && (
                  <div className="flex items-center gap-4 text-slate-400 text-sm mb-4 pb-4 border-b border-slate-800">
                    {property.rooms && (
                      <div>
                        <span className="font-semibold text-light">{property.rooms}</span> hab.
                      </div>
                    )}
                    {property.bathrooms && (
                      <div>
                        <span className="font-semibold text-light">{property.bathrooms}</span> baños
                      </div>
                    )}
                    {property.area && (
                      <div>
                        <span className="font-semibold text-light">{property.area}</span> m²
                      </div>
                    )}
                  </div>
                )}


                {/* Estado */}
                <div className="mb-4">
                  <StatusBadge status={property.status} />
                </div>


                {/* Acciones */}
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}> {/* ✅ Evita que los botones abran el modal */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadPDF(property);
                    }}
                    className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-light rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                    title="Descargar ficha técnica"
                  >
                    <FaFileDownload />
                    PDF
                  </button>


                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditProperty(property);
                    }}
                    className="flex-1 px-3 py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg transition-colors flex items-center justify-center gap-2 text-sm border border-primary/30"
                  >
                    <FaEdit />
                    Editar
                  </button>


                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteProperty(property.id);
                    }}
                    className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors flex items-center justify-center border border-red-500/30"
                    title="Eliminar"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}


      {/* Modal de formulario */}
      <AnimatePresence>
        {showForm && (
          <PropertyForm
            property={selectedProperty}
            onClose={handleCloseForm}
            onSave={handleSaveProperty}
          />
        )}
      </AnimatePresence>

      {/* ✅ NUEVO - Modal de detalle */}
      <AnimatePresence>
        {showDetail && selectedProperty && (
          <PropertyDetail
            property={selectedProperty}
            onClose={() => {
              setShowDetail(false);
              setSelectedProperty(null);
            }}
            onEdit={(prop) => {
              setSelectedProperty(prop);
              setShowForm(true);
              setShowDetail(false);
            }}
            onDelete={handleDeleteProperty}
          />
        )}
      </AnimatePresence>
    </div>
  );
};


export default PropertyManagement;