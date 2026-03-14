import { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FaMapMarkerAlt, FaSearch, FaCrosshairs, FaSpinner, FaTimes, FaGoogle, FaMousePointer } from 'react-icons/fa';
import toast from 'react-hot-toast';

// Fix para los iconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyDDln6zVboxk5TG6lDBE-oZaNqgRzMeQDE";

/**
 * Componente hijo para manejar clicks en el mapa
 */
const ClickHandler = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
};

/**
 * Componente hijo para centrar el mapa
 */
const MapCenter = ({ position, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView(position, zoom || 16, { animate: true });
    }
  }, [position, zoom, map]);
  return null;
};

/**
 * Geocodificar usando Photon (komoot) — excelente para condominios/conjuntos colombianos.
 * Gratis, sin API key, basado en OpenStreetMap con búsqueda potente.
 */
const geocodePhoton = async (query, limit = 5) => {
  if (!query?.trim()) return [];
  try {
    const q = query.toLowerCase().includes('colombia') ? query : `${query} Colombia`;
    const url = `https://photon.komoot.io/api?q=${encodeURIComponent(q)}&limit=${limit}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    if (data?.features?.length > 0) {
      return data.features
        .filter(f => f.properties?.countrycode === 'CO')
        .map(f => {
          const p = f.properties;
          const coords = f.geometry.coordinates;
          const parts = [p.name, p.city, p.state, p.country].filter(Boolean);
          return {
            lat: coords[1],
            lng: coords[0],
            name: parts.join(', '),
            display: p.name || parts.join(', '),
            city: p.city || '',
            state: p.state || '',
          };
        });
    }
  } catch (err) {
    console.warn('Photon Geocoding falló:', err.message);
  }
  return [];
};

/**
 * Fallback: Nominatim (OpenStreetMap) — gratis, sin key.
 */
const geocodeNominatim = async (query, limit = 5) => {
  if (!query?.trim()) return [];
  try {
    const url =
      `https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(query)}&format=json&limit=${limit}&countrycodes=co`;
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json', 'Accept-Language': 'es' },
    });
    if (!response.ok) return [];
    const data = await response.json();
    if (data?.length > 0) {
      return data.map(d => ({
        lat: parseFloat(d.lat),
        lng: parseFloat(d.lon),
        name: d.display_name,
        display: d.display_name?.split(',').slice(0, 3).join(', ') || d.display_name,
      }));
    }
  } catch (err) {
    console.warn('Nominatim Geocoding falló:', err.message);
  }
  return [];
};

/**
 * Geocodificar con múltiples intentos inteligentes.
 */
const geocodeMulti = async (query, limit = 5) => {
  const photonResults = await geocodePhoton(query, limit);
  if (photonResults.length > 0) return photonResults;
  const nominatimResults = await geocodeNominatim(query, limit);
  return nominatimResults;
};

/**
 * Buscar dirección de forma inteligente con múltiples variaciones.
 * Las direcciones colombianas (Calle X #Y-Z) rara vez están en geocodificadores gratuitos,
 * así que probamos varias combinaciones de menor a mayor especificidad.
 */
const smartSearchAddress = async ({ address, neighborhood, city, department }) => {
  const variations = [];

  // 1. Dirección completa + ciudad + departamento
  if (address && city) {
    variations.push(`${address}, ${city}, ${department || ''}, Colombia`);
  }

  // 2. Barrio + ciudad (si hay barrio)
  if (neighborhood && city) {
    variations.push(`${neighborhood}, ${city}, ${department || ''}, Colombia`);
    // También solo el barrio con la ciudad
    variations.push(`${neighborhood} ${city} Colombia`);
  }

  // 3. Extraer nombre de barrio/sector de la dirección si contiene "barr" o "sector"
  if (address) {
    const barrioMatch = address.match(/barr(?:io)?\s+([^,]+)/i);
    if (barrioMatch && city) {
      variations.push(`${barrioMatch[1].trim()}, ${city}, Colombia`);
      variations.push(`barrio ${barrioMatch[1].trim()} ${city} Colombia`);
    }
  }

  // 4. Solo ciudad + departamento (fallback seguro para centrar el mapa)
  if (city) {
    variations.push(`${city}, ${department || ''}, Colombia`);
  }

  // Intentar cada variación hasta encontrar resultado
  for (const query of variations) {
    const results = await geocodeMulti(query, 3);
    if (results.length > 0) {
      return { results, query, isExact: variations.indexOf(query) < 2 };
    }
  }

  return { results: [], query: '', isExact: false };
};

/**
 * Preview de Google Maps Embed — muestra la ubicación con el detalle de Google Maps.
 */
const GoogleMapsPreview = ({ lat, lng, address }) => {
  const query = address
    ? `${address}`
    : `${lat},${lng}`;

  return (
    <div className="w-full h-48 rounded-lg overflow-hidden border border-slate-700 mt-2">
      <iframe
        title="Vista previa Google Maps"
        width="100%"
        height="100%"
        style={{ border: 0 }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        src={`https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(query)}&zoom=17&language=es`}
      />
    </div>
  );
};

/**
 * LocationPicker — Selector interactivo de ubicación para el formulario de propiedades.
 *
 * Flujo:
 * 1. Buscar por nombre de condominio/barrio → Photon encuentra y pone el pin
 * 2. Buscar con dirección del formulario → intenta barrio → ciudad → pone pin o centra mapa
 * 3. Clic en el mapa → pone/mueve pin manualmente
 * 4. Preview de Google Maps → confirmar visualmente la ubicación
 */
const LocationPicker = ({ latitude, longitude, address, neighborhood, city, department = 'Caldas', onChange }) => {
  const [position, setPosition] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showGooglePreview, setShowGooglePreview] = useState(false);
  const suggestionsRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const defaultCenter = [5.2383, -75.7850]; // Anserma, Caldas

  // Inicializar con coordenadas existentes o default
  useEffect(() => {
    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
        setPosition([lat, lng]);
        setMapCenter([lat, lng]);
        setShowGooglePreview(true);
        return;
      }
    }
    setMapCenter(defaultCenter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cerrar sugerencias al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Autocompletar mientras escribe (debounce 400ms)
  const handleSearchInputChange = useCallback((value) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (value.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      const results = await geocodeMulti(value, 5);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    }, 400);
  }, []);

  // Seleccionar una sugerencia
  const handleSelectSuggestion = (suggestion) => {
    const newPos = [suggestion.lat, suggestion.lng];
    setPosition(newPos);
    setMapCenter(newPos);
    onChange?.({ latitude: suggestion.lat, longitude: suggestion.lng });
    setSearchQuery(suggestion.display || suggestion.name);
    setShowSuggestions(false);
    setSuggestions([]);
    setShowGooglePreview(true);
    toast.success(`Ubicación: ${suggestion.name}`);
  };

  // Buscar con la dirección del formulario — búsqueda inteligente
  const handleSearchFromForm = async () => {
    if (!address && !city && !neighborhood) {
      toast.error('Ingresa primero la dirección y ciudad');
      return;
    }

    setSearching(true);

    const { results, isExact } = await smartSearchAddress({
      address,
      neighborhood: neighborhood || '',
      city,
      department,
    });

    if (results.length > 1 && isExact) {
      // Múltiples resultados exactos — mostrar sugerencias
      setSuggestions(results);
      setShowSuggestions(true);
      toast('Selecciona la ubicación correcta de la lista', { icon: '📍' });
      setSearching(false);
      return;
    }

    if (results.length >= 1) {
      const result = results[0];
      const newPos = [result.lat, result.lng];

      if (isExact) {
        // Resultado exacto — poner pin
        setPosition(newPos);
        setMapCenter(newPos);
        onChange?.({ latitude: result.lat, longitude: result.lng });
        setShowGooglePreview(true);
        toast.success(`Ubicación encontrada: ${result.name}`);
      } else {
        // Solo encontró la ciudad/zona — centrar sin pin
        setMapCenter(newPos);
        setShowGooglePreview(false);
        toast(
          '📍 Zona encontrada. Haz clic en el mapa para colocar el pin en la ubicación exacta.',
          { duration: 5000 }
        );
      }

      setSearching(false);
      return;
    }

    toast.error('No se encontró la ubicación. Intenta buscar por nombre de barrio o condominio.');
    setSearching(false);
  };

  // Buscar con texto libre (Enter)
  const handleFreeSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    const results = await geocodeMulti(searchQuery, 5);

    if (results.length > 1) {
      setSuggestions(results);
      setShowSuggestions(true);
      toast('Selecciona la ubicación correcta', { icon: '📍' });
    } else if (results.length === 1) {
      handleSelectSuggestion(results[0]);
    } else {
      toast.error('No se encontró esa ubicación. Intenta con otro nombre o haz clic en el mapa.');
    }
    setSearching(false);
  };

  // Click en el mapa
  const handleMapClick = (latlng) => {
    const newPos = [latlng.lat, latlng.lng];
    setPosition(newPos);
    onChange?.({ latitude: latlng.lat, longitude: latlng.lng });
    setShowGooglePreview(true);
  };

  return (
    <div className="space-y-3">
      {/* Barra de búsqueda */}
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={handleSearchFromForm}
          disabled={searching}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 border border-primary/30 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-semibold disabled:opacity-50 whitespace-nowrap"
        >
          {searching ? (
            <FaSpinner className="animate-spin" />
          ) : (
            <FaCrosshairs />
          )}
          Buscar con dirección del formulario
        </button>

        <div className="flex-1 relative" ref={suggestionsRef}>
          <form onSubmit={handleFreeSearch} className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchInputChange(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="Buscar condominio, barrio, dirección..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-light text-sm placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSuggestions([]);
                    setShowSuggestions(false);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                >
                  <FaTimes size={12} />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={searching || !searchQuery.trim()}
              className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-light rounded-lg transition-colors disabled:opacity-50"
            >
              {searching ? <FaSpinner className="animate-spin" /> : <FaSearch />}
            </button>
          </form>

          {/* Dropdown de sugerencias */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-50 mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
              {suggestions.map((s, i) => (
                <button
                  key={`${s.lat}-${s.lng}-${i}`}
                  type="button"
                  onClick={() => handleSelectSuggestion(s)}
                  className="w-full text-left px-4 py-3 hover:bg-slate-800 transition-colors border-b border-slate-800 last:border-0 flex items-start gap-3"
                >
                  <FaMapMarkerAlt className="text-primary mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm text-light truncate">{s.display || s.name}</div>
                    {s.name !== s.display && (
                      <div className="text-xs text-slate-500 truncate mt-0.5">{s.name}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Instrucciones */}
      <div className="flex flex-col gap-1">
        <p className="text-slate-500 text-xs flex items-center gap-1.5">
          <FaSearch className="text-primary" />
          Busca por nombre de condominio, conjunto, o barrio para ubicación automática
        </p>
        <p className="text-slate-500 text-xs flex items-center gap-1.5">
          <FaMousePointer className="text-primary" />
          Haz clic en el mapa para colocar o ajustar el pin de ubicación exacta
        </p>
      </div>

      {/* Mapa interactivo Leaflet (para poner pin) */}
      <div className="w-full h-72 sm:h-80 rounded-xl overflow-hidden border border-slate-700">
        <MapContainer
          center={mapCenter || defaultCenter}
          zoom={position ? 16 : 13}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <ClickHandler onMapClick={handleMapClick} />

          {mapCenter && (
            <MapCenter position={mapCenter} zoom={position ? 16 : 13} />
          )}

          {position && (
            <Marker position={position}>
              <Popup>
                <div className="text-sm">
                  <strong>Ubicación seleccionada</strong>
                  <br />
                  <span className="text-gray-500 text-xs">
                    {position[0].toFixed(6)}, {position[1].toFixed(6)}
                  </span>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* Preview de Google Maps — confirmar ubicación visualmente */}
      {position && showGooglePreview && (
        <div>
          <p className="text-slate-400 text-xs flex items-center gap-1.5 mb-1">
            <FaGoogle className="text-blue-400" />
            Vista previa en Google Maps — confirma que la ubicación es correcta
          </p>
          <GoogleMapsPreview
            lat={position[0]}
            lng={position[1]}
            address={`${position[0]},${position[1]}`}
          />
        </div>
      )}

      {/* Coordenadas seleccionadas */}
      {position && (
        <div className="flex items-center gap-3 px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-lg">
          <FaMapMarkerAlt className="text-green-400 flex-shrink-0" />
          <div className="text-sm">
            <span className="text-green-400 font-semibold">Ubicación guardada: </span>
            <span className="text-slate-300">
              {position[0].toFixed(6)}, {position[1].toFixed(6)}
            </span>
          </div>
        </div>
      )}

      {!position && (
        <div className="flex items-center gap-3 px-3 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <FaMapMarkerAlt className="text-yellow-400 flex-shrink-0" />
          <span className="text-yellow-400 text-sm">
            Sin ubicación — busca la dirección o haz clic en el mapa
          </span>
        </div>
      )}
    </div>
  );
};

export default LocationPicker;
