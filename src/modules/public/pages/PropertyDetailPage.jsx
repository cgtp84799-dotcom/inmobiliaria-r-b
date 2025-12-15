import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaBed,
  FaBath,
  FaRuler,
  FaCar,
  FaMapMarkerAlt,
  FaArrowLeft,
  FaCheckCircle,
  FaWhatsapp,
  FaShare,
  FaHeart,
  FaRegHeart,
  FaSpinner,
  FaHome,
  FaLayerGroup,
  FaCalendarAlt
} from 'react-icons/fa';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import toast from 'react-hot-toast';
import propertyService from '../../properties/services/property.service';
import ImageGallery from '../components/ImageGallery';
import PropertyContactForm from '../components/PropertyContactForm';

// Fix para los iconos de Leaflet
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const PropertyDetailPage = () => {
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    loadProperty();
  }, [id]);

  const loadProperty = async () => {
    setLoading(true);
    try {
      const data = await propertyService.getPublicPropertyById(id);
      setProperty(data);
    } catch (error) {
      console.error('Error cargando propiedad:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(price || 0);
  };

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

  const getTransactionType = (type) => {
    if (!type) return 'No especificado';
    
    const lower = String(type).toLowerCase();
    
    // Detectar VENTA
    if (lower === 'sale' || lower === 'venta' || lower === 'sell' || lower === 'compra') {
      return 'Venta';
    }
    // Detectar ARRIENDO
    if (lower === 'rent' || lower === 'arriendo' || lower === 'alquiler' || lower === 'renta') {
      return 'Arriendo';
    }
    
    return type;
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: property.title,
        text: `Mira esta propiedad: ${property.title}`,
        url: url
      });
    } else {
      navigator.clipboard.writeText(url);
      toast.success('¡Link copiado al portapapeles!');
    }
  };

  const handleFavorite = () => {
    setIsFavorite(!isFavorite);
    toast.success(isFavorite ? 'Eliminado de favoritos' : '¡Agregado a favoritos!');
  };

  const handleWhatsApp = () => {
    const message = `Hola, estoy interesado en: ${property.title} - ${window.location.href}`;
    const phone = '573105968202';
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark">
        <div className="text-center">
          <FaSpinner className="animate-spin text-primary text-5xl mx-auto mb-4" />
          <p className="text-slate-400">Cargando propiedad...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark">
        <div className="text-center">
          <p className="text-slate-400 text-lg mb-4">Propiedad no encontrada</p>
          <Link to="/propiedades" className="button-gold inline-block">
            Ver todas las propiedades
          </Link>
        </div>
      </div>
    );
  }

  // Coordenadas por defecto (Dosquebradas, Colombia)
  const latitude = property.latitude || 4.8087;
  const longitude = property.longitude || -75.6906;

  // Determinar si es VENTA o ARRIENDO
  const transType = getTransactionType(property.transactionType);
  const isVenta = transType === 'Venta';

  return (
    <div className="min-h-screen bg-dark">
      <div className="max-w-7xl mx-auto py-8 px-4">
        {/* Header con botones */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <Link
            to="/propiedades"
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition font-semibold"
          >
            <FaArrowLeft />
            <span>Volver al catálogo</span>
          </Link>

          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleFavorite}
              className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-primary/50 rounded-lg transition"
            >
              {isFavorite ? (
                <FaHeart className="text-red-500" size={20} />
              ) : (
                <FaRegHeart className="text-slate-400" size={20} />
              )}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleShare}
              className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-primary/50 rounded-lg transition"
            >
              <FaShare className="text-slate-400" size={20} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleWhatsApp}
              className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-semibold flex items-center gap-2"
            >
              <FaWhatsapp size={20} />
              <span className="hidden sm:inline">WhatsApp</span>
            </motion.button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* COLUMNA PRINCIPAL */}
          <div className="lg:col-span-2 space-y-6">
            {/* Galería */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <ImageGallery images={property.images || []} />
            </motion.div>

            {/* Info principal */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-slate-900 border border-slate-800 rounded-xl p-6"
            >
              <div className="flex flex-col gap-4 mb-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1.5 bg-primary/10 text-primary text-sm font-bold rounded-lg border border-primary/30">
                    <FaHome className="inline mr-1" />
                    {getPropertyType(property.type)}
                  </span>
                  <span className={`px-3 py-1.5 text-sm font-bold rounded-lg border ${
                    isVenta
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                      : 'bg-green-500/10 text-green-400 border-green-500/30'
                  }`}>
                    {transType}
                  </span>
                  {property.status === 'disponible' && (
                    <span className="px-3 py-1.5 bg-green-500/10 text-green-400 text-sm font-bold rounded-lg border border-green-500/30">
                      ✓ DISPONIBLE
                    </span>
                  )}
                </div>

                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1">
                    <h1 className="text-3xl md:text-4xl font-bold text-light mb-3">
                      {property.title || 'Propiedad sin título'}
                    </h1>
                    <div className="flex items-start gap-2 text-slate-400">
                      <FaMapMarkerAlt className="mt-1 flex-shrink-0 text-primary" />
                      <span className="text-base">
                        {property.address || 'Dirección no disponible'}
                        {property.city && `, ${property.city}`}
                      </span>
                    </div>
                  </div>

                  <div className="text-left md:text-right">
                    <p className="text-primary font-bold text-4xl mb-1">
                      {formatPrice(property.price)}
                    </p>
                    <p className="text-slate-400 text-sm">
                      Precio de {transType.toLowerCase()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Características principales */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6 border-y border-slate-800">
                {property.area && (
                  <div className="text-center p-4 bg-slate-800/50 rounded-xl">
                    <FaRuler className="text-primary text-3xl mx-auto mb-2" />
                    <p className="text-light font-bold text-xl">{property.area} m²</p>
                    <p className="text-slate-400 text-sm mt-1">Área total</p>
                  </div>
                )}
                {property.rooms && (
                  <div className="text-center p-4 bg-slate-800/50 rounded-xl">
                    <FaBed className="text-primary text-3xl mx-auto mb-2" />
                    <p className="text-light font-bold text-xl">{property.rooms}</p>
                    <p className="text-slate-400 text-sm mt-1">Habitaciones</p>
                  </div>
                )}
                {property.bathrooms && (
                  <div className="text-center p-4 bg-slate-800/50 rounded-xl">
                    <FaBath className="text-primary text-3xl mx-auto mb-2" />
                    <p className="text-light font-bold text-xl">{property.bathrooms}</p>
                    <p className="text-slate-400 text-sm mt-1">Baños</p>
                  </div>
                )}
                {property.parkingSpots && (
                  <div className="text-center p-4 bg-slate-800/50 rounded-xl">
                    <FaCar className="text-primary text-3xl mx-auto mb-2" />
                    <p className="text-light font-bold text-xl">{property.parkingSpots}</p>
                    <p className="text-slate-400 text-sm mt-1">Parqueaderos</p>
                  </div>
                )}
              </div>

              {/* Descripción */}
              {property.description && (
                <div className="mt-6">
                  <h3 className="text-2xl font-bold text-primary mb-3 flex items-center gap-2">
                    <FaHome />
                    Descripción
                  </h3>
                  <p className="text-slate-300 text-base leading-relaxed whitespace-pre-line">
                    {property.description}
                  </p>
                </div>
              )}
            </motion.div>

            {/* Características adicionales */}
            {(property.stratum || property.floors || property.amenities) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-slate-900 border border-slate-800 rounded-xl p-6"
              >
                <h3 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
                  <FaCheckCircle />
                  Características
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {property.floors && (
                    <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                      <FaLayerGroup className="text-primary flex-shrink-0" size={20} />
                      <span className="text-slate-300">Piso {property.floors}</span>
                    </div>
                  )}
                  {property.stratum && (
                    <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                      <FaCheckCircle className="text-primary flex-shrink-0" size={20} />
                      <span className="text-slate-300">Estrato {property.stratum}</span>
                    </div>
                  )}
                  {property.yearBuilt && (
                    <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                      <FaCalendarAlt className="text-primary flex-shrink-0" size={20} />
                      <span className="text-slate-300">Año {property.yearBuilt}</span>
                    </div>
                  )}
                  {property.amenities?.map((amenity, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                      <FaCheckCircle className="text-primary flex-shrink-0" size={20} />
                      <span className="text-slate-300">{amenity}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* MAPA CON LEAFLET */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-slate-900 border border-slate-800 rounded-xl p-6"
            >
              <h3 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
                <FaMapMarkerAlt />
                Ubicación
              </h3>
              <div className="w-full h-80 rounded-xl overflow-hidden">
                <MapContainer
                  center={[latitude, longitude]}
                  zoom={15}
                  scrollWheelZoom={false}
                  className="w-full h-full"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[latitude, longitude]}>
                    <Popup>
                      <strong>{property.title}</strong>
                      <br />
                      {property.address}
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>
              <p className="text-slate-400 text-sm mt-3">
                <FaMapMarkerAlt className="inline mr-1 text-primary" />
                {property.address}{property.city && `, ${property.city}`}
              </p>
            </motion.div>
          </div>

          {/* COLUMNA LATERAL */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-1"
          >
            <div className="sticky top-6">
              <PropertyContactForm
                propertyTitle={property.title}
                propertyId={property.id}
              />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetailPage;