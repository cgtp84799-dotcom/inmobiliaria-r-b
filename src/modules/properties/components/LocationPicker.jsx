import { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FaMapMarkerAlt, FaSearch, FaCrosshairs, FaSpinner } from 'react-icons/fa';
import toast from 'react-hot-toast';

// Fix para los iconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

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
 * Geocodificar usando Nominatim con headers correctos para evitar CORS.
 * Nominatim requiere un User-Agent válido y NO bloquea CORS si se usa correctamente.
 */
const geocode = async (query) => {
  if (!query?.trim()) return null;
  try {
    const url =
      `https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=co`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'es',
      },
    });

    if (!response.ok) return null;
    const data = await response.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch (err) {
    console.warn('Geocoding falló:', err.message);
  }
  return null;
};

/**
 * LocationPicker — Selector interactivo de ubicación para el formulario de propiedades.
 */
const LocationPicker = ({ latitude, longitude, address, city, department = 'Caldas', onChange }) => {
  const [position, setPosition] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Coordenadas de Anserma, Caldas como centro inicial
  const defaultCenter = [5.2383, -75.7850];

  // Inicializar con coordenadas existentes o default
  useEffect(() => {
    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
        setPosition([lat, lng]);
        setMapCenter([lat, lng]);
        return;
      }
    }
    setMapCenter(defaultCenter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Buscar con la dirección del formulario
  const handleSearchFromForm = async () => {
    const parts = [address, city, department, 'Colombia'].filter(Boolean);
    const query = parts.join(', ');
    if (!address && !city) {
      toast.error('Ingresa primero la dirección y ciudad');
      return;
    }

    setSearching(true);

    // Intento 1: dirección completa
    let result = await geocode(query);

    // Intento 2: solo ciudad
    if (!result && city) {
      result = await geocode(`${city}, ${department}, Colombia`);
      if (result) {
        setMapCenter([result.lat, result.lng]);
        toast('Ciudad encontrada — haz clic en el mapa para ubicar el pin exacto', { icon: '📍' });
        setSearching(false);
        return;
      }
    }

    if (result) {
      const newPos = [result.lat, result.lng];
      setPosition(newPos);
      setMapCenter(newPos);
      onChange?.({ latitude: result.lat, longitude: result.lng });
      toast.success('Ubicación encontrada — ajusta el pin si es necesario');
    } else {
      toast.error('No se encontró la ubicación. Haz clic en el mapa manualmente.');
    }
    setSearching(false);
  };

  // Buscar con texto libre
  const handleFreeSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    const result = await geocode(`${searchQuery}, Colombia`);

    if (result) {
      const newPos = [result.lat, result.lng];
      setPosition(newPos);
      setMapCenter(newPos);
      onChange?.({ latitude: result.lat, longitude: result.lng });
      toast.success('Ubicación encontrada');
    } else {
      toast.error('No se encontró esa ubicación');
    }
    setSearching(false);
  };

  // Click en el mapa
  const handleMapClick = (latlng) => {
    const newPos = [latlng.lat, latlng.lng];
    setPosition(newPos);
    onChange?.({ latitude: latlng.lat, longitude: latlng.lng });
  };

  return (
    <div className="space-y-3">
      {/* Barra de búsqueda */}
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={handleSearchFromForm}
          disabled={searching}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 border border-primary/30 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-semibold disabled:opacity-50"
        >
          {searching ? (
            <FaSpinner className="animate-spin" />
          ) : (
            <FaCrosshairs />
          )}
          Buscar con dirección del formulario
        </button>

        <form onSubmit={handleFreeSearch} className="flex-1 flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="O buscar otra dirección..."
            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-light text-sm placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={searching || !searchQuery.trim()}
            className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-light rounded-lg transition-colors disabled:opacity-50"
          >
            <FaSearch />
          </button>
        </form>
      </div>

      {/* Instrucción */}
      <p className="text-slate-500 text-xs flex items-center gap-1.5">
        <FaMapMarkerAlt className="text-primary" />
        Haz clic en el mapa para colocar o mover el pin de ubicación exacta
      </p>

      {/* Mapa interactivo */}
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