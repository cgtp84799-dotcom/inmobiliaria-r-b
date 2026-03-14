import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
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
  FaCalendarAlt,
} from "react-icons/fa";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import toast from "react-hot-toast";
import propertyService from "../../properties/services/property.service";
import ImageGallery from "../components/ImageGallery";
import PropertyContactForm from "../components/PropertyContactForm";

import L from "leaflet";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Ciudades conocidas de la región (evita CORS con Nominatim)
const KNOWN_CITIES = {
  'anserma':       [5.2383, -75.7850],
  'dosquebradas':  [4.8379, -75.6742],
  'pereira':       [4.8087, -75.6906],
  'riosucio':      [5.4219, -75.7025],
  'supia':         [5.4594, -75.6489],
  'belalcazar':    [5.0167, -75.8167],
  'filadelfia':    [5.2969, -75.5631],
  'la merced':     [5.3667, -75.6167],
  'marmato':       [5.4775, -75.5983],
  'quinchia':      [5.3372, -75.7283],
  'manizales':     [5.0689, -75.5174],
  'chinchina':     [4.9833, -75.6000],
  'villamaria':    [5.0500, -75.5167],
  'neira':         [5.1667, -75.5167],
  'salamina':      [5.4094, -75.4903],
  'aranzazu':      [5.2667, -75.4833],
  'pacora':        [5.5167, -75.4667],
  'aguadas':       [5.6106, -75.4578],
  'pensilvania':   [5.3833, -75.1667],
  'la dorada':     [5.4500, -74.6667],
  'santa rosa de cabal': [4.8717, -75.6217],
  'marsella':      [4.9383, -75.7383],
  'armenia':       [4.5339, -75.6811],
};

const MapUpdater = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView(position, 16);
    }
  }, [position, map]);
  return null;
};

const PropertyDetailPage = () => {
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [featuresExpanded, setFeaturesExpanded] = useState(false);

  // ✅ NUEVO — estado para mapa con geocoding
  const [mapPosition, setMapPosition] = useState(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    loadProperty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadProperty = async () => {
    setLoading(true);
    try {
      const data = await propertyService.getPublicPropertyById(id);
      setProperty(data);
    } catch (error) {
      console.error("Error cargando propiedad:", error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ NUEVO — Resolver coordenadas del mapa cuando la propiedad carga
  useEffect(() => {
    if (!property) return;

    const controller = new AbortController();

    const resolveMapPosition = async () => {
      setMapLoading(true);
      setMapError(false);

      // PRIORIDAD 1: coordenadas guardadas en Firestore
      const lat = parseFloat(property.latitude);
      const lng = parseFloat(property.longitude);
      if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
        setMapPosition([lat, lng]);
        setMapError(false);
        setMapLoading(false);
        return;
      }

      // PRIORIDAD 2: ciudad conocida del diccionario
      const city = (property.city || "").toLowerCase().trim();
      if (city && KNOWN_CITIES[city]) {
        setMapPosition(KNOWN_CITIES[city]);
        setMapError(true); // aproximada
        setMapLoading(false);
        return;
      }

      // PRIORIDAD 3: default Anserma
      setMapPosition([5.2383, -75.7850]);
      setMapError(true);
      setMapLoading(false);
    };

    resolveMapPosition();
    return () => controller.abort();
  }, [property]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(price || 0);
  };

  const getPropertyType = (type) => {
    const types = {
      house: "Casa", casa: "Casa",
      apartment: "Apartamento", apartamento: "Apartamento",
      lot: "Lote", lote: "Lote",
      farm: "Finca", finca: "Finca",
      commercial: "Local Comercial",
      office: "Oficina",
      warehouse: "Bodega",
    };
    const lower = String(type || "").toLowerCase();
    return types[lower] || type || "Propiedad";
  };

  const getTransactionType = (type) => {
    if (!type) return "No especificado";
    const lower = String(type).toLowerCase();
    if (lower === "sale" || lower === "venta" || lower === "sell" || lower === "compra") return "Venta";
    if (lower === "rent" || lower === "arriendo" || lower === "alquiler" || lower === "renta") return "Arriendo";
    return type;
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: property?.title || "Propiedad", text: `Mira esta propiedad: ${property?.title || ""}`, url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success("¡Link copiado al portapapeles!");
    }
  };

  const handleFavorite = () => {
    setIsFavorite((v) => !v);
    toast.success(isFavorite ? "Eliminado de favoritos" : "¡Agregado a favoritos!");
  };

  const handleWhatsApp = () => {
    const message = `Hola, estoy interesado en: ${property?.title || "una propiedad"} - ${window.location.href}`;
    const phone = "573105968202";
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const transType = useMemo(() => getTransactionType(property?.transactionType), [property?.transactionType]);
  const isVenta = transType === "Venta";

  const amenities = useMemo(() => {
    return [...(property?.amenities || []), ...(property?.customAmenities || [])].filter(Boolean);
  }, [property?.amenities, property?.customAmenities]);

  const baseFeatures = useMemo(() => {
    const items = [];
    if (property?.floors) items.push({ type: "base", icon: FaLayerGroup, label: `Piso ${property.floors}` });
    if (property?.stratum) items.push({ type: "base", icon: FaCheckCircle, label: `Estrato ${property.stratum}` });
    if (property?.yearBuilt) items.push({ type: "base", icon: FaCalendarAlt, label: `Año ${property.yearBuilt}` });
    return items;
  }, [property?.floors, property?.stratum, property?.yearBuilt]);

  const allFeatures = useMemo(() => {
    return [...baseFeatures, ...amenities.map((a) => ({ type: "amenity", icon: FaCheckCircle, label: a }))];
  }, [baseFeatures, amenities]);

  const COLLAPSE_COUNT = 10;
  const visibleFeatures = featuresExpanded ? allFeatures : allFeatures.slice(0, COLLAPSE_COUNT);

  const seoTitle = property
    ? `${property.title} | Inmobiliaria Rincón Bedoya`
    : "Propiedad | Inmobiliaria Rincón Bedoya";

  const seoDescription = property
    ? `${transType === "Venta" ? "En venta" : "En arriendo"}: ${property.title} en ${property.neighborhood ? property.neighborhood + ", " : ""}${property.city}, ${property.department}. ${property.rooms ? property.rooms + " hab, " : ""}${property.bathrooms ? property.bathrooms + " baños, " : ""}${property.area ? property.area + "m². " : ""}Precio: ${formatPrice(property.price)} COP.`
    : "Encuentra propiedades en Anserma, Caldas y municipios aledaños.";

  const seoImage = property?.images?.[0] || "https://inmobiliaria-ryb-y-asociados.com/logo.jpg.png";
  const seoUrl = `https://inmobiliaria-ryb-y-asociados.com/propiedades/${id}`;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark px-4">
        <div className="text-center">
          <FaSpinner className="animate-spin text-primary text-5xl mx-auto mb-4" />
          <p className="text-slate-400">Cargando propiedad...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark px-4">
        <div className="text-center">
          <p className="text-slate-400 text-lg mb-4">Propiedad no encontrada</p>
          <Link to="/propiedades" className="button-gold inline-block">
            Ver todas las propiedades
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ✅ SEO DINÁMICO POR PROPIEDAD */}
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <link rel="canonical" href={seoUrl} />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:image" content={seoImage} />
        <meta property="og:url" content={seoUrl} />
        <meta property="og:type" content="website" />
        <meta name="twitter:title" content={seoTitle} />
        <meta name="twitter:description" content={seoDescription} />
        <meta name="twitter:image" content={seoImage} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "RealEstateListing",
          "name": property.title,
          "description": seoDescription,
          "url": seoUrl,
          "image": property.images || [],
          "offers": {
            "@type": "Offer",
            "price": property.price,
            "priceCurrency": "COP",
            "availability": "https://schema.org/InStock"
          },
          "address": {
            "@type": "PostalAddress",
            "streetAddress": property.address || "",
            "addressLocality": property.city || "Anserma",
            "addressRegion": property.department || "Caldas",
            "addressCountry": "CO"
          }
        })}</script>
      </Helmet>

      <div className="min-h-screen bg-dark">
        <div className="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6">
          {/* Header con botones */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
          >
            <Link
              to="/propiedades"
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition font-semibold"
            >
              <FaArrowLeft />
              <span className="hidden sm:inline">Volver al catálogo</span>
              <span className="sm:hidden">Volver</span>
            </Link>

            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleFavorite}
                className="p-2.5 sm:p-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-primary/50 rounded-lg transition"
                aria-label={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
              >
                {isFavorite ? <FaHeart className="text-red-500" size={20} /> : <FaRegHeart className="text-slate-400" size={20} />}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleShare}
                className="p-2.5 sm:p-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-primary/50 rounded-lg transition"
                aria-label="Compartir"
              >
                <FaShare className="text-slate-400" size={20} />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleWhatsApp}
                className="px-3.5 py-2.5 sm:px-4 sm:py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-semibold flex items-center gap-2"
                aria-label="Contactar por WhatsApp"
              >
                <FaWhatsapp size={20} />
                <span className="hidden sm:inline">WhatsApp</span>
              </motion.button>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* COLUMNA PRINCIPAL */}
            <div className="lg:col-span-2 space-y-5 sm:space-y-6">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <ImageGallery images={property.images || []} propertyTitle={property.title} />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6"
              >
                <div className="flex flex-col gap-4 mb-5 sm:mb-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1.5 bg-primary/10 text-primary text-xs sm:text-sm font-bold rounded-lg border border-primary/30">
                      <FaHome className="inline mr-1" />
                      {getPropertyType(property.type)}
                    </span>

                    <span className={`px-3 py-1.5 text-xs sm:text-sm font-bold rounded-lg border ${isVenta ? "bg-blue-500/10 text-blue-400 border-blue-500/30" : "bg-green-500/10 text-green-400 border-green-500/30"}`}>
                      {transType}
                    </span>

                    {property.status === "disponible" && (
                      <span className="px-3 py-1.5 bg-green-500/10 text-green-400 text-xs sm:text-sm font-bold rounded-lg border border-green-500/30">
                        ✓ DISPONIBLE
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-light mb-2 sm:mb-3">
                        {property.title || "Propiedad sin título"}
                      </h1>
                      <div className="flex items-start gap-2 text-slate-400">
                        <FaMapMarkerAlt className="mt-1 flex-shrink-0 text-primary" />
                        <span className="text-sm sm:text-base">
                          {property.address || "Dirección no disponible"}
                          {property.city && `, ${property.city}`}
                        </span>
                      </div>
                    </div>

                    <div className="text-left md:text-right">
                      <p className="text-primary font-bold text-2xl sm:text-3xl lg:text-4xl mb-1">
                        {formatPrice(property.price)}
                      </p>
                      <p className="text-slate-400 text-xs sm:text-sm">
                        Precio de {String(transType).toLowerCase()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Características principales */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 py-5 sm:py-6 border-y border-slate-800">
                  {property.area && (
                    <div className="text-center p-3 sm:p-4 bg-slate-800/50 rounded-xl">
                      <FaRuler className="text-primary text-2xl sm:text-3xl mx-auto mb-2" />
                      <p className="text-light font-bold text-lg sm:text-xl">{property.area} m²</p>
                      <p className="text-slate-400 text-xs sm:text-sm mt-1">Área total</p>
                    </div>
                  )}
                  {property.rooms && (
                    <div className="text-center p-3 sm:p-4 bg-slate-800/50 rounded-xl">
                      <FaBed className="text-primary text-2xl sm:text-3xl mx-auto mb-2" />
                      <p className="text-light font-bold text-lg sm:text-xl">{property.rooms}</p>
                      <p className="text-slate-400 text-xs sm:text-sm mt-1">Habitaciones</p>
                    </div>
                  )}
                  {property.bathrooms && (
                    <div className="text-center p-3 sm:p-4 bg-slate-800/50 rounded-xl">
                      <FaBath className="text-primary text-2xl sm:text-3xl mx-auto mb-2" />
                      <p className="text-light font-bold text-lg sm:text-xl">{property.bathrooms}</p>
                      <p className="text-slate-400 text-xs sm:text-sm mt-1">Baños</p>
                    </div>
                  )}
                  {property.parkingSpots && (
                    <div className="text-center p-3 sm:p-4 bg-slate-800/50 rounded-xl">
                      <FaCar className="text-primary text-2xl sm:text-3xl mx-auto mb-2" />
                      <p className="text-light font-bold text-lg sm:text-xl">{property.parkingSpots}</p>
                      <p className="text-slate-400 text-xs sm:text-sm mt-1">Parqueaderos</p>
                    </div>
                  )}
                </div>

                {/* Descripción */}
                {property.description && (
                  <div className="mt-5 sm:mt-6">
                    <h3 className="text-xl sm:text-2xl font-bold text-primary mb-3 flex items-center gap-2">
                      <FaHome />
                      Descripción
                    </h3>
                    <p className="text-slate-300 text-sm sm:text-base leading-relaxed whitespace-pre-line">
                      {property.description}
                    </p>
                  </div>
                )}
              </motion.div>

              {/* Características (amenidades) */}
              {(property.stratum || property.floors || property.yearBuilt || amenities.length > 0) && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6"
                >
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <h3 className="text-xl sm:text-2xl font-bold text-primary flex items-center gap-2">
                      <FaCheckCircle />
                      Características
                    </h3>
                    {allFeatures.length > COLLAPSE_COUNT && (
                      <button
                        type="button"
                        onClick={() => setFeaturesExpanded((v) => !v)}
                        className="text-xs sm:text-sm px-3 py-2 rounded-xl bg-primary/10 border border-primary/30 text-primary font-semibold hover:bg-primary/15 transition"
                      >
                        {featuresExpanded ? "Ver menos" : `Ver todas (${allFeatures.length})`}
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {visibleFeatures.map((item, index) => {
                      const Icon = item.icon || FaCheckCircle;
                      return (
                        <div
                          key={`${item.type}-${item.label}-${index}`}
                          className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg"
                        >
                          <Icon className="text-primary flex-shrink-0" size={20} />
                          <span className="text-slate-300">{item.label}</span>
                        </div>
                      );
                    })}
                  </div>

                  {!featuresExpanded && allFeatures.length > COLLAPSE_COUNT && (
                    <p className="text-slate-500 text-xs mt-3">
                      Mostrando {COLLAPSE_COUNT} de {allFeatures.length}.
                    </p>
                  )}
                </motion.div>
              )}

              {/* ✅ MAPA — ARREGLADO: ahora usa coordenadas reales */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6"
              >
                <h3 className="text-xl sm:text-2xl font-bold text-primary mb-4 flex items-center gap-2">
                  <FaMapMarkerAlt />
                  Ubicación
                </h3>

                <div className="w-full h-64 sm:h-72 lg:h-80 rounded-xl overflow-hidden relative">
                  {mapLoading ? (
                    <div className="w-full h-full flex items-center justify-center bg-slate-800">
                      <div className="text-center">
                        <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
                        <p className="text-slate-400 text-sm">Buscando ubicación...</p>
                      </div>
                    </div>
                  ) : mapPosition ? (
                    <>
                      <MapContainer
                        center={mapPosition}
                        zoom={16}
                        scrollWheelZoom={false}
                        className="w-full h-full"
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <Marker position={mapPosition}>
                          <Popup>
                            <strong>{property.title}</strong>
                            <br />
                            {property.address}
                          </Popup>
                        </Marker>
                        <MapUpdater position={mapPosition} />
                      </MapContainer>

                      {mapError && (
                        <div className="absolute top-2 left-2 bg-yellow-500/90 text-slate-900 text-xs px-2 py-1 rounded z-[1000]">
                          Ubicación aproximada
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-800">
                      <p className="text-slate-500 text-sm">No se pudo cargar el mapa</p>
                    </div>
                  )}
                </div>

                <p className="text-slate-400 text-xs sm:text-sm mt-3">
                  <FaMapMarkerAlt className="inline mr-1 text-primary" />
                  {property.address}
                  {property.city && `, ${property.city}`}
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
              <div className="lg:sticky lg:top-6">
                <PropertyContactForm propertyTitle={property.title} propertyId={property.id} />
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PropertyDetailPage;