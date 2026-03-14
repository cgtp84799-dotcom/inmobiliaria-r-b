import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../config/firebase";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  FaMapMarkerAlt,
  FaBed,
  FaBath,
  FaCar,
  FaRulerCombined,
  FaChevronLeft,
  FaChevronRight,
  FaHome,
  FaWhatsapp,
  FaPhone,
  FaCalendar,
  FaCheckCircle,
  FaArrowLeft,
} from "react-icons/fa";

// Fix iconos Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Ciudades conocidas de la región (mismo diccionario que PropertyMap)
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

const formatPrice = (price) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(price || 0);

export default function PropertyDetailPage() {
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const snap = await getDoc(doc(db, "properties", id));
        if (!snap.exists()) { setError("Propiedad no encontrada"); return; }
        setProperty({ id: snap.id, ...snap.data() });
      } catch (e) {
        setError("Error al cargar la propiedad");
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchProperty();
  }, [id]);

  /**
   * Resolver coordenadas del mapa:
   * 1. Coordenadas de Firestore (exactas)
   * 2. Diccionario de ciudades conocidas
   * 3. Fallback Anserma
   */
  const mapPosition = useMemo(() => {
    if (!property) return null;

    // PRIORIDAD 1: coordenadas guardadas en Firestore
    if (property.latitude && property.longitude) {
      const lat = parseFloat(property.latitude);
      const lng = parseFloat(property.longitude);
      if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
        return { coords: [lat, lng], approximate: false };
      }
    }

    // PRIORIDAD 2: ciudad del diccionario
    if (property.city) {
      const key = property.city.toLowerCase().trim();
      if (KNOWN_CITIES[key]) {
        return { coords: KNOWN_CITIES[key], approximate: true };
      }
    }

    // PRIORIDAD 3: fallback Anserma
    return { coords: [5.2383, -75.7850], approximate: true };
  }, [property]);

  // ── Loading ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Cargando propiedad...</p>
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────
  if (error || !property) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-center">
          <FaHome className="text-6xl text-slate-700 mx-auto mb-4" />
          <p className="text-slate-400 text-xl">{error || "Propiedad no encontrada"}</p>
          <Link to="/propiedades" className="mt-4 inline-block text-primary hover:underline">
            Ver todas las propiedades
          </Link>
        </div>
      </div>
    );
  }

  const images    = property.images    || [];
  const amenities = [...(property.amenities || []), ...(property.customAmenities || [])].filter(Boolean);

  return (
    <div className="min-h-screen bg-dark">
      {/* Hero con galería */}
      <div className="relative bg-slate-950">
        {images.length > 0 ? (
          <div className="relative h-[50vh] sm:h-[60vh] lg:h-[70vh]">
            <img
              src={images[currentImage]}
              alt={property.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-dark/90 via-dark/20 to-transparent" />

            {images.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentImage((p) => (p - 1 + images.length) % images.length)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center"
                >
                  <FaChevronLeft className="text-white" />
                </button>
                <button
                  onClick={() => setCurrentImage((p) => (p + 1) % images.length)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center"
                >
                  <FaChevronRight className="text-white" />
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentImage(i)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        i === currentImage ? "bg-white scale-125" : "bg-white/50"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center">
            <FaHome className="text-8xl text-slate-700" />
          </div>
        )}

        {/* Botón volver */}
        <Link
          to="/propiedades"
          className="absolute top-4 left-4 flex items-center gap-2 px-4 py-2 bg-black/60 hover:bg-black/80 text-white rounded-full text-sm transition-colors"
        >
          <FaArrowLeft /> Volver
        </Link>
      </div>

      {/* Contenido */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Columna principal */}
          <div className="lg:col-span-2 space-y-8">

            {/* Título y estado */}
            <div>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-light">{property.title}</h1>
                <span className={`px-4 py-1.5 rounded-full text-sm font-semibold ${
                  property.status === "disponible" ? "bg-green-500/20 text-green-400 border border-green-500/30" :
                  property.status === "reservada"  ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" :
                  "bg-slate-500/20 text-slate-400 border border-slate-500/30"
                }`}>
                  {property.status?.charAt(0).toUpperCase() + property.status?.slice(1)}
                </span>
              </div>
              <p className="text-slate-400 mt-2 flex items-center gap-2">
                <FaMapMarkerAlt className="text-primary" />
                {property.address}, {property.city}, {property.department}
              </p>
            </div>

            {/* Miniaturas */}
            {images.length > 1 && (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentImage(i)}
                    className={`rounded-lg overflow-hidden border-2 transition-all ${
                      i === currentImage ? "border-primary" : "border-transparent hover:border-slate-600"
                    }`}
                  >
                    <img src={img} alt={`img-${i}`} className="w-full h-16 object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Características rápidas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {property.rooms && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center">
                  <FaBed className="text-2xl text-primary mx-auto mb-2" />
                  <p className="text-light font-bold">{property.rooms}</p>
                  <p className="text-slate-400 text-sm">Habitaciones</p>
                </div>
              )}
              {property.bathrooms && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center">
                  <FaBath className="text-2xl text-primary mx-auto mb-2" />
                  <p className="text-light font-bold">{property.bathrooms}</p>
                  <p className="text-slate-400 text-sm">Baños</p>
                </div>
              )}
              {property.area && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center">
                  <FaRulerCombined className="text-2xl text-primary mx-auto mb-2" />
                  <p className="text-light font-bold">{property.area} m²</p>
                  <p className="text-slate-400 text-sm">Área total</p>
                </div>
              )}
              {property.parkingSpots && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center">
                  <FaCar className="text-2xl text-primary mx-auto mb-2" />
                  <p className="text-light font-bold">{property.parkingSpots}</p>
                  <p className="text-slate-400 text-sm">Parqueaderos</p>
                </div>
              )}
            </div>

            {/* Descripción */}
            {property.description && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h2 className="text-xl font-bold text-light mb-4">Descripción</h2>
                <p className="text-slate-300 leading-relaxed whitespace-pre-line">{property.description}</p>
              </div>
            )}

            {/* Amenidades */}
            {amenities.length > 0 && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h2 className="text-xl font-bold text-light mb-4">Amenidades</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {amenities.map((a, i) => (
                    <div key={i} className="flex items-center gap-2 text-slate-300 text-sm">
                      <FaCheckCircle className="text-primary flex-shrink-0" />
                      {a}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mapa */}
            {mapPosition && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h2 className="text-xl font-bold text-light mb-2 flex items-center gap-2">
                  <FaMapMarkerAlt className="text-primary" /> Ubicación
                </h2>

                {mapPosition.approximate && (
                  <p className="text-yellow-400 text-xs mb-3">
                    Ubicación aproximada — el propietario no ha fijado coordenadas exactas.
                  </p>
                )}

                <div className="h-72 rounded-xl overflow-hidden">
                  <MapContainer
                    center={mapPosition.coords}
                    zoom={mapPosition.approximate ? 14 : 16}
                    scrollWheelZoom={false}
                    style={{ height: "100%", width: "100%" }}
                    className="z-0"
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={mapPosition.coords}>
                      <Popup>
                        <strong>{property.title}</strong><br />
                        {property.address}, {property.city}
                      </Popup>
                    </Marker>
                  </MapContainer>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Precio */}
            <div className="bg-gradient-to-br from-primary/20 to-yellow-500/20 border border-primary/30 rounded-2xl p-6 sticky top-6">
              <p className="text-slate-400 text-sm mb-1">
                {property.transactionType === "venta" ? "Precio de venta" : "Canon de arriendo"}
              </p>
              <p className="text-4xl font-bold text-primary">{formatPrice(property.price)}</p>
              {property.transactionType === "arriendo" && (
                <p className="text-slate-400 text-sm mt-1">/mes</p>
              )}

              <div className="mt-6 space-y-3">
                <a
                  href={`https://wa.me/573185491352?text=${encodeURIComponent(
                    `Hola, estoy interesado/a en la propiedad: ${property.title} - ${window.location.href}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-xl transition-colors"
                >
                  <FaWhatsapp className="text-xl" /> Contactar por WhatsApp
                </a>
                <a
                  href="tel:+573185491352"
                  className="flex items-center justify-center gap-2 w-full py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-colors"
                >
                  <FaPhone /> Llamar ahora
                </a>
              </div>
            </div>

            {/* Detalles adicionales */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 space-y-3">
              <h3 className="text-light font-bold mb-4">Detalles</h3>
              {property.type && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Tipo</span>
                  <span className="text-light capitalize">{property.type}</span>
                </div>
              )}
              {property.stratum && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Estrato</span>
                  <span className="text-light">{property.stratum}</span>
                </div>
              )}
              {property.yearBuilt && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Año</span>
                  <span className="text-light">{property.yearBuilt}</span>
                </div>
              )}
              {property.builtArea && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Área construida</span>
                  <span className="text-light">{property.builtArea} m²</span>
                </div>
              )}
              {property.floors && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Pisos</span>
                  <span className="text-light">{property.floors}</span>
                </div>
              )}
              {property.createdAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400 flex items-center gap-1"><FaCalendar className="text-xs" /> Publicado</span>
                  <span className="text-light">
                    {property.createdAt.toDate
                      ? property.createdAt.toDate().toLocaleDateString("es-CO")
                      : new Date(property.createdAt).toLocaleDateString("es-CO")}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
