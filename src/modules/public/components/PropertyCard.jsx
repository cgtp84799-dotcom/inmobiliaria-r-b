import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaBed,
  FaBath,
  FaRulerCombined,
  FaMapMarkerAlt,
  FaHeart,
  FaRegHeart,
  FaHome,
  FaCar,
  FaArrowRight
} from 'react-icons/fa';

const PropertyCard = ({ property, onFavorite }) => {
  const navigate = useNavigate();
  const [isFavorite, setIsFavorite] = useState(false);

  // Obtener la primera imagen o placeholder
  const mainImage = property.images?.[0] || 'https://via.placeholder.com/400x300?text=Sin+Imagen';

  // Formatear precio
  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(price || 0);
  };

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    setIsFavorite(!isFavorite);
    if (onFavorite) {
      onFavorite(property.id);
    }
  };

  const handleCardClick = () => {
    navigate(`/propiedades/${property.id}`);
  };

  // Obtener tipo de propiedad legible
  const getPropertyType = (type) => {
    const types = {
      house: 'Casa',
      casa: 'Casa',
      apartment: 'Apartamento',
      apartamento: 'Apartamento',
      lot: 'Lote',
      lote: 'Lote',
      farm: 'Finca',
      finca: 'Finca',
      commercial: 'Local Comercial',
      office: 'Oficina',
      warehouse: 'Bodega'
    };
    const lower = String(type || '').toLowerCase();
    return types[lower] || type || 'Propiedad';
  };

  // Obtener tipo de transacción
  const getTransactionType = () => {
    const type = property.transactionType;
    if (!type) return { text: 'N/A', isVenta: false };
    
    const lower = String(type).toLowerCase();
    
    if (lower === 'sale' || lower === 'venta' || lower === 'compra') {
      return { text: 'VENTA', isVenta: true };
    }
    if (lower === 'rent' || lower === 'arriendo' || lower === 'alquiler' || lower === 'renta') {
      return { text: 'ARRIENDO', isVenta: false };
    }
    
    return { text: type.toUpperCase(), isVenta: false };
  };

  const transactionInfo = getTransactionType();

  return (
    <motion.div
      whileHover={{ y: -8, transition: { duration: 0.3 } }}
      className="bg-slate-900 rounded-2xl overflow-hidden cursor-pointer group border-2 border-slate-800 hover:border-primary/60 transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-primary/20"
      onClick={handleCardClick}
    >
      {/* Imagen principal */}
      <div className="relative h-64 overflow-hidden">
        <img
          src={mainImage}
          alt={property.title || 'Propiedad'}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          onError={(e) => {
            e.target.src = 'https://via.placeholder.com/400x300?text=Sin+Imagen';
          }}
        />

        {/* Overlay gradient mejorado */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

        {/* Badges superiores */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
          {/* Badge DISPONIBLE */}
          {property.status === 'disponible' && (
            <motion.span 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-black rounded-lg shadow-xl backdrop-blur-sm flex items-center gap-1.5 border border-emerald-400"
            >
              <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              DISPONIBLE
            </motion.span>
          )}
          
          {/* Badge VENTA/ARRIENDO */}
          <motion.span 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className={`px-4 py-2 text-sm font-black rounded-lg shadow-xl backdrop-blur-sm border-2 ${
              transactionInfo.isVenta
                ? 'bg-blue-600 text-white border-blue-400'
                : 'bg-orange-600 text-white border-orange-400'
            }`}
          >
            {transactionInfo.text}
          </motion.span>
        </div>

        {/* Botón de favorito */}
        <motion.button
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleFavoriteClick}
          className="absolute top-4 right-4 w-11 h-11 bg-black/80 hover:bg-black/90 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all duration-200 shadow-xl border-2 border-white/30 z-10"
        >
          {isFavorite ? (
            <FaHeart className="text-red-500" size={20} />
          ) : (
            <FaRegHeart size={20} />
          )}
        </motion.button>

        {/* Precio - MEJORADO CON FONDO OSCURO SÓLIDO */}
        <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-slate-950/95 backdrop-blur-xl px-5 py-3 rounded-xl shadow-2xl border-2 border-primary/60"
          >
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Precio</span>
                <span className="text-primary font-black text-2xl mt-0.5 drop-shadow-lg">
                  {formatPrice(property.price)}
                </span>
              </div>
              <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-primary/30">
                <FaArrowRight className="text-primary" size={16} />
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Contenido */}
      <div className="p-6">
        {/* Tipo de propiedad */}
        <div className="flex items-center gap-2 text-primary text-sm font-bold mb-3">
          <FaHome className="text-lg" />
          <span className="uppercase tracking-wide">{getPropertyType(property.type)}</span>
        </div>

        {/* Título */}
        <h3 className="text-xl font-bold text-white mb-3 line-clamp-2 group-hover:text-primary transition-colors leading-tight">
          {property.title || 'Propiedad sin título'}
        </h3>

        {/* Ubicación */}
        <div className="flex items-start gap-2 text-slate-300 text-sm mb-4 pb-4 border-b border-slate-800">
          <FaMapMarkerAlt className="mt-1 flex-shrink-0 text-primary" size={16} />
          <span className="line-clamp-2 font-medium">
            {property.address || 'Dirección no disponible'}
            {property.city && `, ${property.city}`}
          </span>
        </div>

        {/* Características */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {property.area && (
            <div className="flex flex-col items-center p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors group/item">
              <FaRulerCombined className="text-primary mb-2 group-hover/item:scale-110 transition-transform" size={20} />
              <span className="text-white font-bold text-base">{property.area}</span>
              <span className="text-slate-400 text-xs mt-0.5">m²</span>
            </div>
          )}
          {property.rooms && (
            <div className="flex flex-col items-center p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors group/item">
              <FaBed className="text-primary mb-2 group-hover/item:scale-110 transition-transform" size={20} />
              <span className="text-white font-bold text-base">{property.rooms}</span>
              <span className="text-slate-400 text-xs mt-0.5">Hab.</span>
            </div>
          )}
          {property.bathrooms && (
            <div className="flex flex-col items-center p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors group/item">
              <FaBath className="text-primary mb-2 group-hover/item:scale-110 transition-transform" size={20} />
              <span className="text-white font-bold text-base">{property.bathrooms}</span>
              <span className="text-slate-400 text-xs mt-0.5">Baños</span>
            </div>
          )}
        </div>

        {/* Botón "Ver detalles" */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="w-full py-3.5 bg-gradient-to-r from-primary via-yellow-500 to-primary text-slate-900 font-black text-center rounded-xl group-hover:shadow-lg group-hover:shadow-primary/50 transition-all duration-300 flex items-center justify-center gap-2">
            Ver detalles
            <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
          </div>
        </motion.div>
      </div>

      {/* Barra de hover */}
      <div className="h-2 bg-gradient-to-r from-transparent via-primary to-transparent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
    </motion.div>
  );
};

export default PropertyCard;