/**
 * PropertyMap — muestra la ubicación de una propiedad usando Google Maps Embed API.
 *
 * PRIORIDAD de búsqueda:
 *   1. latitude + longitude → coordenadas exactas (las más precisas)
 *   2. neighborhood + city → barrio + ciudad (Google reconoce barrios colombianos)
 *   3. address + city → dirección textual
 *   4. city + department → fallback a la ciudad
 */

const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
  "TU_API_KEY_DE_DESARROLLO_OPCIONAL"; // idealmente configura solo VITE_GOOGLE_MAPS_API_KEY

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

  const buildQuery = () => {
    if (hasCoords) {
      return `${lat},${lng}`;
    }
    if (neighborhood && city) {
      return `${neighborhood}, ${city}, ${department}, Colombia`;
    }
    if (address && city) {
      const barrioMatch = address.match(/barr(?:io)?\s+([^,]+)/i);
      if (barrioMatch) {
        return `${barrioMatch[1].trim()}, ${city}, ${department}, Colombia`;
      }
      return `${address}, ${city}, ${department}, Colombia`;
    }
    if (city) {
      return `${city}, ${department}, Colombia`;
    }
    return "Anserma, Caldas, Colombia";
  };

  const query = buildQuery();
  const encodedQuery = encodeURIComponent(query);

  if (!GOOGLE_MAPS_API_KEY) {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-900 rounded-lg">
        <div className="text-center p-4">
          <p className="text-slate-400 text-sm mb-3">Mapa no disponible</p>
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

  let src = `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=${encodedQuery}&language=es&region=CO`;
  if (hasCoords) {
    src += `&center=${lat},${lng}&zoom=17`;
  }

  const locationText = [address, neighborhood, city, department]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="w-full h-full relative">
      <iframe
        src={src}
        width="100%"
        height="100%"
        style={{ border: 0, borderRadius: "0.5rem", minHeight: "220px" }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title={`Ubicación: ${locationText || "Propiedad"}`}
      />

      {locationText && (
        <div className="mt-2 text-xs text-slate-400">{locationText}</div>
      )}
    </div>
  );
};

export default PropertyMap;
