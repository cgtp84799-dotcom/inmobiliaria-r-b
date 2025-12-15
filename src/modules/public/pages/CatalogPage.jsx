import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FaSearch,
  FaFilter,
  FaHome,
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaBed,
  FaBath,
  FaTimesCircle,
  FaPlusCircle,
  FaSpinner
} from 'react-icons/fa';
import propertyService from '../../properties/services/property.service';
import PropertyCard from '../components/PropertyCard';

const CatalogPage = () => {
  const [properties, setProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(true);

  // Estados de filtros
  const [filters, setFilters] = useState({
    searchTerm: '',
    type: '',
    transactionType: '',
    minPrice: '',
    maxPrice: '',
    bedrooms: '',
    bathrooms: '',
    city: ''
  });

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    setLoading(true);
    try {
      const data = await propertyService.getPublicProperties();
      setProperties(data);
      setFilteredProperties(data);
    } catch (error) {
      console.error('Error cargando propiedades', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const applyFilters = () => {
    let filtered = [...properties];

    // Búsqueda general
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.title?.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term) ||
        p.city?.toLowerCase().includes(term) ||
        p.address?.toLowerCase().includes(term) ||
        p.location?.city?.toLowerCase().includes(term) ||
        p.location?.address?.toLowerCase().includes(term)
      );
    }

    // Tipo de propiedad - CORREGIDO PARA ESPAÑOL
    if (filters.type) {
      filtered = filtered.filter(p => {
        const propType = String(p.type || '').toLowerCase();
        const filterType = filters.type.toLowerCase();
        return propType === filterType || propType === filterType + 'o' || propType === filterType.slice(0, -1);
      });
    }

    // Tipo de transacción - CORREGIDO PARA ESPAÑOL
    if (filters.transactionType) {
      filtered = filtered.filter(p => {
        const trans = String(p.transactionType || '').toLowerCase();
        const filterTrans = filters.transactionType.toLowerCase();
        
        // Detectar VENTA
        if (filterTrans === 'sale') {
          return trans === 'sale' || trans === 'venta' || trans === 'compra';
        }
        // Detectar ARRIENDO
        if (filterTrans === 'rent') {
          return trans === 'rent' || trans === 'arriendo' || trans === 'alquiler' || trans === 'renta';
        }
        
        return trans === filterTrans;
      });
    }

    // Precio mínimo
    if (filters.minPrice) {
      filtered = filtered.filter(p => Number(p.price || 0) >= Number(filters.minPrice));
    }

    // Precio máximo
    if (filters.maxPrice) {
      filtered = filtered.filter(p => Number(p.price || 0) <= Number(filters.maxPrice));
    }

    // Habitaciones - CORREGIDO
    if (filters.bedrooms) {
      filtered = filtered.filter(p => {
        const rooms = Number(p.rooms || p.features?.bedrooms || 0);
        return rooms >= Number(filters.bedrooms);
      });
    }

    // Baños - CORREGIDO
    if (filters.bathrooms) {
      filtered = filtered.filter(p => {
        const baths = Number(p.bathrooms || p.features?.bathrooms || 0);
        return baths >= Number(filters.bathrooms);
      });
    }

    // Ciudad - CORREGIDO
    if (filters.city) {
      filtered = filtered.filter(p => {
        const city = String(p.city || p.location?.city || '').toLowerCase();
        return city.includes(filters.city.toLowerCase());
      });
    }

    setFilteredProperties(filtered);
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      type: '',
      transactionType: '',
      minPrice: '',
      maxPrice: '',
      bedrooms: '',
      bathrooms: '',
      city: ''
    });
    setFilteredProperties(properties);
  };

  const handleFavorite = (propertyId) => {
    console.log('Favorito:', propertyId);
  };

  return (
    <div className="max-w-7xl mx-auto py-12 px-4">
      {/* HERO / HEADER */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-10"
      >
        <h1 className="text-4xl md:text-5xl font-bold text-primary mb-3">
          Propiedades disponibles
        </h1>
        <p className="text-muted text-lg max-w-2xl">
          Explora propiedades urbanas y rurales para compra, venta o arriendo. 
          Filtra según tu necesidad y encuentra el inmueble ideal.
        </p>
      </motion.div>

      {/* PANEL DE FILTROS */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.6 }}
        className="card-soft border border-slate-800/80 mb-10"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FaFilter className="text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-light">Filtros de búsqueda</h2>
              <p className="text-xs text-slate-400">
                Ajusta los filtros para encontrar la propiedad perfecta
              </p>
            </div>
          </div>

          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="text-xs text-primary hover:underline"
          >
            {filtersOpen ? 'Ocultar filtros' : 'Mostrar filtros'}
          </button>
        </div>

        {filtersOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Búsqueda general */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Búsqueda general
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-500 text-sm">
                  <FaSearch />
                </span>
                <input
                  type="text"
                  placeholder="Buscar por ubicación, descripción..."
                  value={filters.searchTerm}
                  onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 pl-9 pr-3 text-sm text-light focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Ciudad */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Ciudad
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500 text-sm">
                    <FaMapMarkerAlt />
                  </span>
                  <input
                    type="text"
                    placeholder="Dosquebradas, Pereira..."
                    value={filters.city}
                    onChange={(e) => handleFilterChange('city', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 pl-9 pr-3 text-sm text-light focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Tipo de propiedad
                </label>
                <select
                  value={filters.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3 text-sm text-light focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="">Todos</option>
                  <option value="apartamento">Apartamento</option>
                  <option value="casa">Casa</option>
                  <option value="lote">Lote</option>
                  <option value="finca">Finca</option>
                  <option value="commercial">Local Comercial</option>
                </select>
              </div>

              {/* Operación */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Operación
                </label>
                <select
                  value={filters.transactionType}
                  onChange={(e) => handleFilterChange('transactionType', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3 text-sm text-light focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="">Compra o Arriendo</option>
                  <option value="sale">Venta</option>
                  <option value="rent">Arriendo</option>
                </select>
              </div>

              {/* Dormitorios */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Dormitorios
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500 text-sm">
                    <FaBed />
                  </span>
                  <select
                    value={filters.bedrooms}
                    onChange={(e) => handleFilterChange('bedrooms', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 pl-9 pr-3 text-sm text-light focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Cualquiera</option>
                    <option value="1">1+</option>
                    <option value="2">2+</option>
                    <option value="3">3+</option>
                    <option value="4">4+</option>
                  </select>
                </div>
              </div>

              {/* Baños */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Baños
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500 text-sm">
                    <FaBath />
                  </span>
                  <select
                    value={filters.bathrooms}
                    onChange={(e) => handleFilterChange('bathrooms', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 pl-9 pr-3 text-sm text-light focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Cualquiera</option>
                    <option value="1">1+</option>
                    <option value="2">2+</option>
                    <option value="3">3+</option>
                  </select>
                </div>
              </div>

              {/* Precio mínimo */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Precio mínimo
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500 text-sm">
                    <FaMoneyBillWave />
                  </span>
                  <input
                    type="number"
                    placeholder="$ 0"
                    value={filters.minPrice}
                    onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 pl-9 pr-3 text-sm text-light focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Precio máximo */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Precio máximo
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500 text-sm">
                    <FaMoneyBillWave />
                  </span>
                  <input
                    type="number"
                    placeholder="$ Sin límite"
                    value={filters.maxPrice}
                    onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 pl-9 pr-3 text-sm text-light focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Botones */}
              <div className="flex items-end gap-3">
                <button
                  onClick={applyFilters}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-primary text-slate-950 font-semibold text-sm py-2.5 rounded-xl hover:bg-yellow-500 transition-all duration-200"
                >
                  <FaSearch />
                  Aplicar filtros
                </button>
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center justify-center gap-1 px-4 text-xs text-slate-400 hover:text-slate-200 border border-slate-700 rounded-xl py-2.5 hover:border-slate-600 transition-all"
                >
                  <FaTimesCircle />
                  Limpiar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Contador de resultados */}
      {!loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-6 flex items-center justify-between"
        >
          <p className="text-slate-400 text-sm">
            <span className="text-primary font-bold">{filteredProperties.length}</span>{' '}
            {filteredProperties.length === 1 ? 'propiedad encontrada' : 'propiedades encontradas'}
          </p>
        </motion.div>
      )}

      {/* LISTADO DE PROPIEDADES / ESTADO VACÍO / LOADING */}
      {loading ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card-soft py-16 px-6 text-center"
        >
          <FaSpinner className="animate-spin text-primary text-4xl mx-auto mb-4" />
          <p className="text-slate-400">Cargando propiedades...</p>
        </motion.div>
      ) : filteredProperties.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="card-soft py-16 px-6 text-center border border-dashed border-slate-700"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
            <FaHome className="text-primary text-3xl" />
          </div>
          <h2 className="text-2xl font-bold text-light mb-2">
            {properties.length === 0 
              ? 'Aún no hay propiedades publicadas'
              : 'No se encontraron propiedades'
            }
          </h2>
          <p className="text-slate-400 max-w-md mx-auto mb-6">
            {properties.length === 0
              ? 'Muy pronto encontrarás aquí casas, apartamentos, lotes y fincas disponibles para compra, venta y arriendo.'
              : 'Intenta ajustar los filtros de búsqueda para ver más resultados.'
            }
          </p>
          <a
            href="https://wa.me/573105968202?text=Hola,%20quiero%20información%20sobre%20propiedades"
            target="_blank"
            rel="noopener noreferrer"
            className="button-gold inline-flex items-center gap-2 px-8 py-3"
          >
            <FaPlusCircle />
            Quiero que me contacten
          </a>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredProperties.map((property, index) => (
            <motion.div
              key={property.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05, duration: 0.4 }}
            >
              <PropertyCard 
                property={property}
                onFavorite={handleFavorite}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default CatalogPage;