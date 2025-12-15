import { useState } from 'react';
import { FaSearch, FaTimes } from 'react-icons/fa';

const PropertyFilters = ({ onFilter }) => {
  const [filters, setFilters] = useState({
    searchTerm: '',
    type: '',
    transactionType: '',
    minPrice: '',
    maxPrice: '',
    bedrooms: '',
    city: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    // Aplicar filtros en tiempo real
    onFilter(newFilters);
  };

  const handleReset = () => {
    const emptyFilters = {
      searchTerm: '',
      type: '',
      transactionType: '',
      minPrice: '',
      maxPrice: '',
      bedrooms: '',
      city: ''
    };
    setFilters(emptyFilters);
    onFilter(emptyFilters);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-primary">Filtrar Propiedades</h3>
        <button
          onClick={handleReset}
          className="text-sm text-slate-400 hover:text-primary transition-colors flex items-center gap-2"
        >
          <FaTimes size={12} />
          Limpiar filtros
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Búsqueda general */}
        <div className="lg:col-span-2">
          <label className="block text-slate-400 text-sm mb-2 font-semibold">Búsqueda</label>
          <div className="relative">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              name="searchTerm"
              value={filters.searchTerm}
              onChange={handleChange}
              placeholder="Buscar por título, ciudad, dirección..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-12 pr-4 py-3 text-light focus:border-primary focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Tipo de propiedad */}
        <div>
          <label className="block text-slate-400 text-sm mb-2 font-semibold">Tipo</label>
          <select
            name="type"
            value={filters.type}
            onChange={handleChange}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-light focus:border-primary focus:outline-none transition-colors"
          >
            <option value="">Todos</option>
            <option value="apartamento">Apartamento</option>
            <option value="casa">Casa</option>
            <option value="lote">Lote</option>
            <option value="finca">Finca</option>
            <option value="commercial">Local Comercial</option>
            <option value="office">Oficina</option>
            <option value="warehouse">Bodega</option>
          </select>
        </div>

        {/* Tipo de transacción */}
        <div>
          <label className="block text-slate-400 text-sm mb-2 font-semibold">Operación</label>
          <select
            name="transactionType"
            value={filters.transactionType}
            onChange={handleChange}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-light focus:border-primary focus:outline-none transition-colors"
          >
            <option value="">Todas</option>
            <option value="venta">Venta</option>
            <option value="arriendo">Arriendo</option>
          </select>
        </div>

        {/* Precio mínimo */}
        <div>
          <label className="block text-slate-400 text-sm mb-2 font-semibold">Precio mínimo</label>
          <input
            type="number"
            name="minPrice"
            value={filters.minPrice}
            onChange={handleChange}
            placeholder="Ej: 100000000"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-light focus:border-primary focus:outline-none transition-colors"
          />
        </div>

        {/* Precio máximo */}
        <div>
          <label className="block text-slate-400 text-sm mb-2 font-semibold">Precio máximo</label>
          <input
            type="number"
            name="maxPrice"
            value={filters.maxPrice}
            onChange={handleChange}
            placeholder="Ej: 500000000"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-light focus:border-primary focus:outline-none transition-colors"
          />
        </div>

        {/* Habitaciones */}
        <div>
          <label className="block text-slate-400 text-sm mb-2 font-semibold">Habitaciones</label>
          <select
            name="bedrooms"
            value={filters.bedrooms}
            onChange={handleChange}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-light focus:border-primary focus:outline-none transition-colors"
          >
            <option value="">Todas</option>
            <option value="1">1+</option>
            <option value="2">2+</option>
            <option value="3">3+</option>
            <option value="4">4+</option>
            <option value="5">5+</option>
          </select>
        </div>

        {/* Ciudad */}
        <div>
          <label className="block text-slate-400 text-sm mb-2 font-semibold">Ciudad</label>
          <input
            type="text"
            name="city"
            value={filters.city}
            onChange={handleChange}
            placeholder="Ej: Pereira"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-light focus:border-primary focus:outline-none transition-colors"
          />
        </div>
      </div>
    </div>
  );
};

export default PropertyFilters;