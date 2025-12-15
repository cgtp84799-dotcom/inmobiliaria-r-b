import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix para los iconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Componente para actualizar el centro del mapa
const MapUpdater = ({ position }) => {
  const map = useMap();
  
  useEffect(() => {
    if (position) {
      map.setView(position, 16);
    }
  }, [position, map]);
  
  return null;
};

const PropertyMap = ({ address, city, department = 'Caldas' }) => {
  const [position, setPosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Coordenadas por defecto (Anserma centro)
  const defaultPosition = [5.2383, -75.7850];

  useEffect(() => {
    const geocodeAddress = async () => {
      if (!address || !city) {
        setPosition(defaultPosition);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(false);

      try {
        // Construir query de búsqueda
        const searchQuery = `${address}, ${city}, ${department}, Colombia`;
        
        // Llamar a Nominatim (API gratuita de OpenStreetMap)
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?` +
          `q=${encodeURIComponent(searchQuery)}&` +
          `format=json&` +
          `limit=1&` +
          `countrycodes=co`
        );

        const data = await response.json();

        if (data && data.length > 0) {
          const { lat, lon } = data[0];
          setPosition([parseFloat(lat), parseFloat(lon)]);
        } else {
          // Si no encuentra la dirección exacta, intenta solo con la ciudad
          const cityResponse = await fetch(
            `https://nominatim.openstreetmap.org/search?` +
            `q=${encodeURIComponent(`${city}, ${department}, Colombia`)}&` +
            `format=json&` +
            `limit=1&` +
            `countrycodes=co`
          );

          const cityData = await cityResponse.json();

          if (cityData && cityData.length > 0) {
            const { lat, lon } = cityData[0];
            setPosition([parseFloat(lat), parseFloat(lon)]);
          } else {
            // Fallback a coordenadas por defecto
            setPosition(defaultPosition);
            setError(true);
          }
        }
      } catch (err) {
        console.error('Error en geocoding:', err);
        setPosition(defaultPosition);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    geocodeAddress();
  }, [address, city, department]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
          <p className="text-slate-400 text-sm">Buscando ubicación...</p>
        </div>
      </div>
    );
  }

  if (!position) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-900">
        <p className="text-slate-500 text-sm">No se pudo cargar el mapa</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={position}
        zoom={16}
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
              <strong>{address}</strong>
              <br />
              {city}, {department}
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
    </div>
  );
};

export default PropertyMap;