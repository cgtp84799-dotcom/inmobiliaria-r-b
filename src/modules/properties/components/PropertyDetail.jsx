import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PropertyMap from './PropertyMap';
import { generatePropertyPDF } from '../services/pdf.service';
import { 
  FaTimes, 
  FaEdit, 
  FaTrash, 
  FaMapMarkerAlt,
  FaBed,
  FaBath,
  FaCar,
  FaRulerCombined,
  FaCalendar,
  FaHome,
  FaChevronLeft,
  FaChevronRight,
  FaSearchPlus,
  FaFileDownload,
  FaFilePdf,
  FaUser,
  FaPhone,
  FaEnvelope,
  FaPercentage,
  FaDollarSign,
  FaCheckCircle,
  FaMapMarkedAlt
} from 'react-icons/fa';
import toast from 'react-hot-toast';

// Formatear precio
const formatPrice = (price) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(price || 0);
};

// Formatear fecha
const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('es-CO', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

const PropertyDetail = ({ property, onClose, onEdit, onDelete }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!property) return null;

  const images = property.images || [];
  const documents = property.documents || [];
  const amenities = [...(property.amenities || []), ...(property.customAmenities || [])];

  // Navegación de imágenes
  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  // Calcular comisión
  const calculateCommission = () => {
    const price = parseFloat(property.price) || 0;
    const percentage = parseFloat(property.commissionPercentage) || 0;
    return price * (percentage / 100);
  };

  // Generar Ficha Técnica PDF
  const handleGeneratePDF = async () => {
    try {
      toast.loading('Generando ficha técnica...', { id: 'pdf-generation' });
      await generatePropertyPDF(property);
      toast.success('Ficha técnica descargada', { id: 'pdf-generation' });
    } catch (error) {
      toast.error('Error al generar PDF', { id: 'pdf-generation' });
      console.error('Error generando PDF:', error);
    }
  };

  // Eliminar propiedad
  const handleDelete = async () => {
    const confirmed = window.confirm('¿Estás seguro de eliminar esta propiedad? Esta acción no se puede deshacer.');
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await onDelete(property.id);
      toast.success('Propiedad eliminada');
      onClose();
    } catch (error) {
      toast.error('Error al eliminar');
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Descargar documento
  const handleDownloadDocument = (doc) => {
    window.open(doc.url, '_blank');
    toast.success(`Descargando ${doc.name}`);
  };

  // Badge de estado
  const StatusBadge = ({ status }) => {
    const colors = {
      disponible: 'bg-green-500/20 text-green-400 border-green-500/30',
      reservada: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      arrendada: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      vendida: 'bg-red-500/20 text-red-400 border-red-500/30'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${colors[status] || colors.disponible}`}>
        {status?.charAt(0).toUpperCase() + status?.slice(1) || 'Disponible'}
      </span>
    );
  };

  return (
    <>
      {/* Modal Principal */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-7xl max-h-[95vh] overflow-y-auto shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-slate-950 border-b border-slate-800 px-6 py-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold text-primary">{property.title}</h2>
              <StatusBadge status={property.status} />
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center transition-colors"
            >
              <FaTimes className="text-light" />
            </button>
          </div>

          {/* Contenido */}
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Columna Izquierda - Galería */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Galería de Imágenes */}
                {images.length > 0 ? (
                  <div className="space-y-3">
                    <div className="relative bg-slate-900 rounded-xl overflow-hidden group">
                      <img
                        src={images[currentImageIndex]}
                        alt={`Imagen ${currentImageIndex + 1}`}
                        className="w-full h-96 object-cover cursor-pointer"
                        onClick={() => setShowImageModal(true)}
                      />
                      
                      {/* Botón de zoom */}
                      <button
                        onClick={() => setShowImageModal(true)}
                        className="absolute top-4 right-4 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-lg flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <FaSearchPlus className="text-white" />
                      </button>

                      {/* Navegación */}
                      {images.length > 1 && (
                        <>
                          <button
                            onClick={prevImage}
                            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-colors"
                          >
                            <FaChevronLeft className="text-white" />
                          </button>
                          <button
                            onClick={nextImage}
                            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-colors"
                          >
                            <FaChevronRight className="text-white" />
                          </button>
                        </>
                      )}

                      {/* Indicador */}
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 px-3 py-1 rounded-full text-white text-sm">
                        {currentImageIndex + 1} / {images.length}
                      </div>
                    </div>

                    {/* Miniaturas */}
                    {images.length > 1 && (
                      <div className="grid grid-cols-6 gap-2">
                        {images.map((img, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentImageIndex(index)}
                            className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                              currentImageIndex === index 
                                ? 'border-primary ring-2 ring-primary/50' 
                                : 'border-slate-700 hover:border-slate-600'
                            }`}
                          >
                            <img
                              src={img}
                              alt={`Miniatura ${index + 1}`}
                              className="w-full h-16 object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-slate-900 rounded-xl h-96 flex items-center justify-center">
                    <div className="text-center">
                      <FaHome className="text-6xl text-slate-700 mx-auto mb-3" />
                      <p className="text-slate-500">Sin imágenes</p>
                    </div>
                  </div>
                )}

                {/* Descripción */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-light mb-3">Descripción</h3>
                  <p className="text-slate-300 leading-relaxed whitespace-pre-line">
                    {property.description || 'Sin descripción disponible.'}
                  </p>
                </div>

                {/* Características Principales */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-light mb-4">Características</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    
                    {property.area && (
                      <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                        <FaRulerCombined className="text-2xl text-primary mx-auto mb-2" />
                        <p className="text-slate-400 text-sm">Área total</p>
                        <p className="text-light font-bold">{property.area} m²</p>
                      </div>
                    )}

                    {property.rooms && (
                      <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                        <FaBed className="text-2xl text-primary mx-auto mb-2" />
                        <p className="text-slate-400 text-sm">Habitaciones</p>
                        <p className="text-light font-bold">{property.rooms}</p>
                      </div>
                    )}

                    {property.bathrooms && (
                      <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                        <FaBath className="text-2xl text-primary mx-auto mb-2" />
                        <p className="text-slate-400 text-sm">Baños</p>
                        <p className="text-light font-bold">{property.bathrooms}</p>
                      </div>
                    )}

                    {property.parkingSpots && (
                      <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                        <FaCar className="text-2xl text-primary mx-auto mb-2" />
                        <p className="text-slate-400 text-sm">Parqueaderos</p>
                        <p className="text-light font-bold">{property.parkingSpots}</p>
                      </div>
                    )}

                    {property.builtArea && (
                      <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                        <FaHome className="text-2xl text-primary mx-auto mb-2" />
                        <p className="text-slate-400 text-sm">Área construida</p>
                        <p className="text-light font-bold">{property.builtArea} m²</p>
                      </div>
                    )}

                    {property.floors && (
                      <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                        <FaHome className="text-2xl text-primary mx-auto mb-2" />
                        <p className="text-slate-400 text-sm">Pisos</p>
                        <p className="text-light font-bold">{property.floors}</p>
                      </div>
                    )}

                    {property.yearBuilt && (
                      <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                        <FaCalendar className="text-2xl text-primary mx-auto mb-2" />
                        <p className="text-slate-400 text-sm">Año</p>
                        <p className="text-light font-bold">{property.yearBuilt}</p>
                      </div>
                    )}

                    {property.stratum && (
                      <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                        <FaCheckCircle className="text-2xl text-primary mx-auto mb-2" />
                        <p className="text-slate-400 text-sm">Estrato</p>
                        <p className="text-light font-bold">{property.stratum}</p>
                      </div>
                    )}

                  </div>
                </div>

                {/* Amenidades */}
                {amenities.length > 0 && (
                  <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-light mb-4">Amenidades</h3>
                    <div className="flex flex-wrap gap-2">
                      {amenities.map((amenity, index) => (
                        <span
                          key={index}
                          className="px-3 py-2 bg-primary/10 border border-primary/30 rounded-lg text-primary text-sm font-medium"
                        >
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ubicación */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-light mb-4 flex items-center gap-2">
                    <FaMapMarkerAlt className="text-primary" />
                    Ubicación
                  </h3>
                  <div className="space-y-2 text-slate-300">
                    <p><strong>Dirección:</strong> {property.address}</p>
                    <p><strong>Barrio:</strong> {property.neighborhood || 'N/A'}</p>
                    <p><strong>Ciudad:</strong> {property.city}</p>
                    <p><strong>Departamento:</strong> {property.department}</p>
                  </div>
                  
                  {/* Mapa */}
                  <div className="mt-4 bg-slate-800 rounded-lg h-64 overflow-hidden">
                    <PropertyMap 
                      address={property.address} 
                      city={property.city} 
                    />
                  </div>
                </div>

                {/* Documentos */}
                {documents.length > 0 && (
                  <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-light mb-4">Documentos Legales</h3>
                    <div className="space-y-2">
                      {documents.map((doc, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <FaFilePdf className="text-red-400 text-xl" />
                            <span className="text-light">{doc.name}</span>
                          </div>
                          <button
                            onClick={() => handleDownloadDocument(doc)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-2 transition-colors"
                          >
                            <FaFileDownload />
                            Descargar
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

              {/* Columna Derecha - Info Resumida */}
              <div className="space-y-4">
                
                {/* Precio */}
                <div className="bg-gradient-to-br from-primary/20 to-yellow-500/20 border border-primary/30 rounded-xl p-6">
                  <p className="text-slate-400 text-sm mb-1">
                    {property.transactionType === 'venta' ? 'Precio de venta' : 'Canon de arriendo'}
                  </p>
                  <p className="text-4xl font-bold text-primary">
                    {formatPrice(property.price)}
                  </p>
                  {property.transactionType === 'arriendo' && (
                    <p className="text-slate-400 text-sm mt-1">/mes</p>
                  )}
                </div>

                {/* Comisión */}
                {property.commissionPercentage && (
                  <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FaPercentage className="text-primary" />
                      <h4 className="text-light font-bold">Comisión</h4>
                    </div>
                    <p className="text-slate-400 text-sm">
                      {property.commissionPercentage}%
                    </p>
                    <p className="text-2xl font-bold text-primary mt-2">
                      {formatPrice(calculateCommission())}
                    </p>
                  </div>
                )}

                {/* Tipo */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                  <p className="text-slate-400 text-sm mb-1">Tipo de propiedad</p>
                  <p className="text-light font-bold capitalize">{property.type}</p>
                </div>

                {/* Propietario */}
                {property.ownerName && (
                  <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <FaUser className="text-primary" />
                      <h4 className="text-light font-bold">Propietario</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p className="text-slate-300">{property.ownerName}</p>
                      {property.ownerPhone && (
                        <p className="flex items-center gap-2 text-slate-400">
                          <FaPhone className="text-xs" />
                          {property.ownerPhone}
                        </p>
                      )}
                      {property.ownerEmail && (
                        <p className="flex items-center gap-2 text-slate-400">
                          <FaEnvelope className="text-xs" />
                          {property.ownerEmail}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Información Legal */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                  <h4 className="text-light font-bold mb-3">Información Legal</h4>
                  <div className="space-y-2 text-sm">
                    {property.cadastralReference && (
                      <div>
                        <p className="text-slate-500">Ficha catastral</p>
                        <p className="text-slate-300">{property.cadastralReference}</p>
                      </div>
                    )}
                    {property.registrationNumber && (
                      <div>
                        <p className="text-slate-500">Matrícula</p>
                        <p className="text-slate-300">{property.registrationNumber}</p>
                      </div>
                    )}
                    {property.legalStatus && (
                      <div>
                        <p className="text-slate-500">Estado jurídico</p>
                        <p className="text-slate-300 capitalize">{property.legalStatus.replace('_', ' ')}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Costos adicionales */}
                {(property.propertyTax || property.administrationFee) && (
                  <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <h4 className="text-light font-bold mb-3">Costos adicionales</h4>
                    <div className="space-y-2 text-sm">
                      {property.propertyTax && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Predial (anual)</span>
                          <span className="text-light font-semibold">{formatPrice(property.propertyTax)}</span>
                        </div>
                      )}
                      {property.administrationFee && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Administración</span>
                          <span className="text-light font-semibold">{formatPrice(property.administrationFee)}/mes</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Fecha de publicación */}
                {property.createdAt && (
                  <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <p className="text-slate-400 text-sm mb-1">Publicada el</p>
                    <p className="text-light">{formatDate(property.createdAt)}</p>
                  </div>
                )}

                {/* Botones de acción */}
                <div className="space-y-2">
                  <button
                    onClick={handleGeneratePDF}
                    className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <FaFilePdf />
                    Generar Ficha Técnica
                  </button>

                  <button
                    onClick={() => onEdit(property)}
                    className="w-full px-4 py-3 bg-primary hover:bg-yellow-500 text-slate-950 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <FaEdit />
                    Editar Propiedad
                  </button>

                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="w-full px-4 py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <FaTrash />
                    {isDeleting ? 'Eliminando...' : 'Eliminar Propiedad'}
                  </button>
                </div>

              </div>

            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Modal de Imagen Ampliada */}
      <AnimatePresence>
        {showImageModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-4"
            onClick={() => setShowImageModal(false)}
          >
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
            >
              <FaTimes className="text-white text-xl" />
            </button>

            <img
              src={images[currentImageIndex]}
              alt="Imagen ampliada"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    prevImage();
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
                >
                  <FaChevronLeft className="text-white text-xl" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    nextImage();
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
                >
                  <FaChevronRight className="text-white text-xl" />
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default PropertyDetail;