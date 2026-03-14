import { useEffect, useState, useRef, useCallback } from 'react';
import { FaMapMarkerAlt, FaSearch, FaCrosshairs, FaSpinner, FaTimes, FaToggleOn, FaToggleOff, FaMousePointer } from 'react-icons/fa';
import toast from 'react-hot-toast';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyDDln6zVboxk5TG6lDBE-oZaNqgRzMeQDE";

/* ═══════════════════════════════════════
   GEOCODIFICADORES
   ═══════════════════════════════════════ */

/** Photon (komoot.io) — excelente para condominios/conjuntos colombianos */
const geocodePhoton = async (query, limit = 5) => {
  if (!query?.trim()) return [];
  try {
    const q = query.toLowerCase().includes('colombia') ? query : `${query} Colombia`;
    const resp = await fetch(`https://photon.komoot.io/api?q=${encodeURIComponent(q)}&limit=${limit}`);
    if (!resp.ok) return [];
    const data = await resp.json();
    return (data?.features || [])
      .filter(f => f.properties?.countrycode === 'CO')
      .map(f => {
        const p = f.properties;
        const [lng, lat] = f.geometry.coordinates;
        const parts = [p.name, p.city, p.state, p.country].filter(Boolean);
        return { lat, lng, name: parts.join(', '), display: p.name || parts.join(', ') };
      });
  } catch (err) {
    console.warn('Photon falló:', err.message);
    return [];
  }
};

/** Nominatim (OSM) — fallback */
const geocodeNominatim = async (query, limit = 5) => {
  if (!query?.trim()) return [];
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=${limit}&countrycodes=co`,
      { headers: { Accept: 'application/json', 'Accept-Language': 'es' } }
    );
    if (!resp.ok) return [];
    const data = await resp.json();
    return (data || []).map(d => ({
      lat: parseFloat(d.lat),
      lng: parseFloat(d.lon),
      name: d.display_name,
      display: d.display_name?.split(',').slice(0, 3).join(', ') || d.display_name,
    }));
  } catch (err) {
    console.warn('Nominatim falló:', err.message);
    return [];
  }
};

/** Buscar en ambos servicios */
const geocodeMulti = async (query, limit = 5) => {
  const r = await geocodePhoton(query, limit);
  if (r.length > 0) return r;
  return geocodeNominatim(query, limit);
};

/* ═══════════════════════════════════════
   BÚSQUEDA INTELIGENTE
   ═══════════════════════════════════════ */
const smartSearchAddress = async ({ address, neighborhood, city, department }) => {
  const barrioFromAddr = address?.match(/barr(?:io)?\s+([^,]+)/i)?.[1]?.trim();

  const searches = [];

  if (neighborhood && city) {
    searches.push({ q: `${neighborhood}, ${city}, ${department}, Colombia`, exact: true });
  }
  if (barrioFromAddr && city && barrioFromAddr !== neighborhood) {
    searches.push({ q: `${barrioFromAddr}, ${city}, ${department}, Colombia`, exact: true });
  }
  if (address && city) {
    searches.push({ q: `${address}, ${city}, ${department}, Colombia`, exact: true });
  }
  if (city) {
    searches.push({ q: `${city}, ${department}, Colombia`, exact: false });
  }

  for (const { q, exact } of searches) {
    const results = await geocodeMulti(q, 1);
    if (results.length > 0) {
      return { result: results[0], isExact: exact };
    }
  }

  return { result: null, isExact: false };
};

/* ═══════════════════════════════════════
   GOOGLE MAPS EMBED — mapa interactivo con iframe
   ═══════════════════════════════════════ */
const GoogleMapEmbed = ({ lat, lng, query, zoom = 17 }) => {
  // Si hay coordenadas, mostrar coordenadas. Si no, mostrar query de búsqueda.
  const q = (lat && lng) ? `${lat},${lng}` : (query || 'Anserma, Caldas, Colombia');
  const z = (lat && lng) ? zoom : 14;

  const src = `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(q)}&zoom=${z}&language=es&region=CO`;

  return (
    <iframe
      title="Mapa de ubicación"
      width="100%"
      height="100%"
      style={{ border: 0 }}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      src={src}
    />
  );
};

/* ═══════════════════════════════════════
   LOCATION PICKER — Componente principal
   ═══════════════════════════════════════ */
const LocationPicker = ({
  latitude, longitude, address, neighborhood, city, department = 'Caldas', onChange,
}) => {
  const [position, setPosition] = useState(null);
  const [mapQuery, setMapQuery] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mapEnabled, setMapEnabled] = useState(true);
  const [manualCoords, setManualCoords] = useState(false);
  const suggestionsRef = useRef(null);
  const debounceRef = useRef(null);

  // Init — si ya hay coordenadas, usarlas
  useEffect(() => {
    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
        setPosition({ lat, lng });
        return;
      }
    }
    // Construir query inicial basado en dirección
    const parts = [neighborhood, city, department, 'Colombia'].filter(Boolean);
    if (parts.length > 1) {
      setMapQuery(parts.join(', '));
    } else {
      setMapQuery('Anserma, Caldas, Colombia');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Click fuera cierra sugerencias
  useEffect(() => {
    const handler = (e) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ─── Autocompletar (debounce 500ms) ───
  const handleInput = useCallback((val) => {
    setSearchQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length < 3) { setSuggestions([]); setShowSuggestions(false); return; }

    debounceRef.current = setTimeout(async () => {
      const results = await geocodeMulti(val, 5);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    }, 500);
  }, []);

  // ─── Seleccionar sugerencia ───
  const selectSuggestion = (s) => {
    setPosition({ lat: s.lat, lng: s.lng });
    setMapQuery(null);
    onChange?.({ latitude: s.lat, longitude: s.lng });
    setSearchQuery(s.display || s.name);
    setShowSuggestions(false);
    setSuggestions([]);
    toast.success(`Ubicación: ${s.name}`);
  };

  // ─── Buscar con dirección del formulario ───
  const handleFormSearch = async () => {
    if (!address && !city && !neighborhood) {
      toast.error('Ingresa primero la dirección y ciudad');
      return;
    }
    setSearching(true);

    const { result, isExact } = await smartSearchAddress({ address, neighborhood, city, department });

    if (result) {
      if (isExact) {
        setPosition({ lat: result.lat, lng: result.lng });
        setMapQuery(null);
        onChange?.({ latitude: result.lat, longitude: result.lng });
        toast.success(`Ubicación encontrada: ${result.name}`);
      } else {
        // Solo encontró la ciudad — centrar mapa ahí
        setMapQuery(`${city}, ${department}, Colombia`);
        setPosition(null);
        toast('📍 Zona encontrada. Usa las coordenadas manuales o busca por nombre para ubicar el punto exacto.', { duration: 5000 });
      }
    } else {
      toast.error('No se encontró. Intenta buscar por nombre o ingresa coordenadas.');
    }
    setSearching(false);
  };

  // ─── Buscar texto libre (Enter) ───
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
      selectSuggestion(results[0]);
    } else {
      toast.error('No se encontró. Intenta con otro nombre.');
    }
    setSearching(false);
  };

  // ─── Coordenadas manuales ───
  const handleManualCoords = (field, value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    const newPos = { ...position, [field]: num };
    if (newPos.lat && newPos.lng) {
      setPosition(newPos);
      setMapQuery(null);
      onChange?.({ latitude: newPos.lat, longitude: newPos.lng });
    }
  };

  return (
    <div className="space-y-3">
      {/* Toggle mapa */}
      <div className="flex items-center justify-between">
        <span className="text-slate-400 text-sm font-medium">Mapa de ubicación</span>
        <button
          type="button"
          onClick={() => setMapEnabled(!mapEnabled)}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-light transition-colors"
        >
          {mapEnabled ? (
            <><FaToggleOn className="text-primary text-xl" /><span>Activado</span></>
          ) : (
            <><FaToggleOff className="text-slate-600 text-xl" /><span>Desactivado</span></>
          )}
        </button>
      </div>

      {mapEnabled && (
        <>
          {/* Barra de búsqueda */}
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={handleFormSearch}
              disabled={searching}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 border border-primary/30 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-semibold disabled:opacity-50 whitespace-nowrap"
            >
              {searching ? <FaSpinner className="animate-spin" /> : <FaCrosshairs />}
              Buscar con dirección
            </button>

            <div className="flex-1 relative" ref={suggestionsRef}>
              <form onSubmit={handleFreeSearch} className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleInput(e.target.value)}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    placeholder="Buscar condominio, barrio, dirección..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-light text-sm placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => { setSearchQuery(''); setSuggestions([]); setShowSuggestions(false); }}
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

              {/* Dropdown sugerencias */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  {suggestions.map((s, i) => (
                    <button
                      key={`${s.lat}-${s.lng}-${i}`}
                      type="button"
                      onClick={() => selectSuggestion(s)}
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

          {/* Google Maps Embed — mapa real */}
          <div className="w-full h-72 sm:h-80 rounded-xl overflow-hidden border border-slate-700">
            <GoogleMapEmbed
              lat={position?.lat}
              lng={position?.lng}
              query={mapQuery}
            />
          </div>

          {/* Coordenadas manuales (toggle) */}
          <div>
            <button
              type="button"
              onClick={() => setManualCoords(!manualCoords)}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1"
            >
              <FaMousePointer />
              {manualCoords ? 'Ocultar coordenadas manuales' : 'Ingresar coordenadas manualmente'}
            </button>
            {manualCoords && (
              <div className="flex gap-3 mt-2">
                <div className="flex-1">
                  <label className="text-xs text-slate-500 block mb-1">Latitud</label>
                  <input
                    type="number"
                    step="any"
                    value={position?.lat || ''}
                    onChange={(e) => handleManualCoords('lat', e.target.value)}
                    placeholder="ej: 4.8511"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-light text-sm focus:border-primary outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-slate-500 block mb-1">Longitud</label>
                  <input
                    type="number"
                    step="any"
                    value={position?.lng || ''}
                    onChange={(e) => handleManualCoords('lng', e.target.value)}
                    placeholder="ej: -75.6514"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-light text-sm focus:border-primary outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Estado de coordenadas — siempre visible */}
      {position ? (
        <div className="flex items-center gap-3 px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-lg">
          <FaMapMarkerAlt className="text-green-400 flex-shrink-0" />
          <div className="text-sm">
            <span className="text-green-400 font-semibold">Ubicación guardada: </span>
            <span className="text-slate-300">{position.lat.toFixed(6)}, {position.lng.toFixed(6)}</span>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 px-3 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <FaMapMarkerAlt className="text-yellow-400 flex-shrink-0" />
          <span className="text-yellow-400 text-sm">
            {mapEnabled
              ? 'Sin ubicación — busca la dirección o ingresa coordenadas'
              : 'Mapa desactivado — la propiedad se mostrará sin mapa a los clientes'}
          </span>
        </div>
      )}
    </div>
  );
};

export default LocationPicker;
