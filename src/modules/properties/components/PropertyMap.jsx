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
    </div>
  );
};

export default PropertyMap;
