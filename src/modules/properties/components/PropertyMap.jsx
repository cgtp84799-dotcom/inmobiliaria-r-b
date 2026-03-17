/**
 * PropertyMap — muestra la ubicación de una propiedad usando Google Maps Embed API.
 *
 * Google Maps Embed API es GRATIS e ILIMITADO.
 *
 * PRIORIDAD de búsqueda:
 *   1. latitude + longitude → coordenadas exactas (las más precisas)
 *   2. neighborhood + city → barrio + ciudad (Google reconoce barrios colombianos)
 *   3. address + city → dirección textual
 *   4. city + department → fallback a la ciudad
 */

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyDDln6zVboxk5TG6lDBE-oZaNqgRzMeQDE";

<<<<<<< Updated upstream
const PropertyMap = ({
  address,
  city,
  department = "Caldas",
  neighborhood,
  latitude,
  longitude,
}) => {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  const hasCoords = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;

  // Construir la query para Google Maps
  const buildQuery = () => {
    // PRIORIDAD 1: coordenadas exactas
    if (hasCoords) {
      return `${lat},${lng}`;
    }

    // PRIORIDAD 2: barrio + ciudad (Google conoce barrios colombianos mejor que direcciones)
    if (neighborhood && city) {
      return `${neighborhood}, ${city}, ${department}, Colombia`;
    }

    // PRIORIDAD 3: dirección + ciudad
    if (address && city) {
      // Limpiar la dirección: quitar partes tipo "barrio X" que ya están en neighborhood
      let cleanAddr = address;
      // Si la dirección contiene "barri" extraemos eso como búsqueda principal
      const barrioMatch = address.match(/barr(?:io)?\s+([^,]+)/i);
      if (barrioMatch) {
        return `${barrioMatch[1].trim()}, ${city}, ${department}, Colombia`;
      }
      return `${cleanAddr}, ${city}, ${department}, Colombia`;
    }

    // PRIORIDAD 4: solo ciudad
    if (city) {
      return `${city}, ${department}, Colombia`;
    }

    return "Anserma, Caldas, Colombia";
  };

  const query = buildQuery();
  const encodedQuery = encodeURIComponent(query);

  // Si no hay API key, mostrar link a Google Maps
  if (!GOOGLE_MAPS_API_KEY) {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-900 rounded-lg">
        <div className="text-center p-4">
          <p className="text-slate-400 text-sm mb-3">
            Mapa no disponible
          </p>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary/20 border border-primary/30 text-primary rounded-lg text-sm hover:bg-primary/30 transition-colors"
          >
            Ver en Google Maps
          </a>
=======
const MapUpdater = ({ position }) => {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.setView(position, 16);
    }
  }, [position, map]);

  return null;
};

// Ciudades conocidas de la región (evita depender de Nominatim para el fallback)
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

/**
 * PropertyMap — muestra la ubicación de una propiedad.
 *
 * PRIORIDAD:
 *   1. latitude / longitude de Firestore → directo
 *   2. Ciudad conocida del diccionario → sin red
 *   3. Anserma, Caldas como último fallback
 */
const PropertyMap = ({ address, city, department = 'Caldas', latitude, longitude }) => {
  const [position, setPosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const defaultPosition = [5.2383, -75.7850]; // Anserma

  useEffect(() => {
    // PRIORIDAD 1: coordenadas guardadas
    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
        setPosition([lat, lng]);
        setError(false);
        setLoading(false);
        return;
      }
    }

    // PRIORIDAD 2: ciudad conocida
    if (city) {
      const cityKey = city.toLowerCase().trim();
      if (KNOWN_CITIES[cityKey]) {
        setPosition(KNOWN_CITIES[cityKey]);
        setError(true); // aproximada
        setLoading(false);
        return;
      }
    }

    // PRIORIDAD 3: default Anserma
    setPosition(defaultPosition);
    setError(true);
    setLoading(false);
  }, [latitude, longitude, city, department]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
          <p className="text-slate-400 text-sm">Cargando mapa...</p>
>>>>>>> Stashed changes
        </div>
      </div>
    );
  }

  // Construir URL del iframe
  let src = `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=${encodedQuery}&language=es&region=CO`;

  // Si hay coordenadas, centrar ahí con zoom alto
  if (hasCoords) {
    src += `&center=${lat},${lng}&zoom=17`;
  }

  // Texto de dirección para mostrar debajo del mapa
  const locationText = [address, neighborhood ? `${neighborhood}` : null, city, department]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="w-full h-full relative">
<<<<<<< Updated upstream
      <iframe
        src={src}
        width="100%"
        height="100%"
        style={{ border: 0, borderRadius: "0.5rem", minHeight: "200px" }}
        allowFullScreen=""
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title={`Ubicación: ${address || neighborhood || city || "Propiedad"}`}
      />
=======
      <MapContainer
        center={position}
        zoom={error ? 14 : 16}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position}>
          <Popup>
            <div className="text-sm">
              <strong>{address || 'Propiedad'}</strong>
              <br />
              {city}{department ? `, ${department}` : ''}
            </div>
          </Popup>
        </Marker>
        <MapUpdater position={position} />
      </MapContainer>

      {error && (
        <div className="absolute top-2 left-2 bg-yellow-500/90 text-slate-900 text-xs px-2 py-1 rounded z-[1000]">
          Ubicación aproximada
        </div>
      )}
>>>>>>> Stashed changes
    </div>
  );
};

export default PropertyMap;
