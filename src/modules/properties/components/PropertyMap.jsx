const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

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

  // ✅ CORRECCIÓN 2: Fallback elegante si no hay API Key configurada (ej: servidor nuevo).
  if (!GOOGLE_MAPS_API_KEY) {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 rounded-lg min-h-[220px] border border-slate-800">
        <div className="text-center p-4">
          <p className="text-slate-400 text-sm mb-3">Mapa interactivo no disponible</p>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary/20 border border-primary/30 text-primary rounded-lg text-sm hover:bg-primary/30 transition-colors"
          >
            📍 Ver en Google Maps
          </a>
        </div>
      </div>
    );
  }

  // ✅ CORRECCIÓN 3: Uso estándar de parámetros en la Embed API ('place' usa 'q' y 'zoom').
  let src = `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=${encodedQuery}&language=es&region=CO`;
  if (hasCoords) {
    src += `&zoom=17`;
  }

  const locationText = [address, neighborhood, city, department]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="w-full h-full relative flex flex-col">
      <div className="flex-1 min-h-[220px]">
        <iframe
          src={src}
          width="100%"
          height="100%"
          style={{ border: 0, borderRadius: "0.5rem" }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={`Ubicación: ${locationText || "Propiedad"}`}
        />
      </div>

      {locationText && (
        <div className="mt-3 text-xs text-slate-400 flex items-start gap-1.5 px-1">
          <span className="text-primary/70 text-sm mt-0.5 leading-none">📍</span>
          <span className="leading-snug">{locationText}</span>
        </div>
      )}
    </div>
  );
};

export default PropertyMap;