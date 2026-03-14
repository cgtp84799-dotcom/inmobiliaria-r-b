/**
 * PropertyMap — muestra la ubicación de una propiedad usando Google Maps Embed API.
 *
 * Google Maps Embed API es GRATIS e ILIMITADO.
 * Reconoce condominios, conjuntos, barrios, direcciones, etc.
 *
 * PRIORIDAD:
 *   1. latitude + longitude de Firestore → mapa centrado en coordenadas exactas
 *   2. address + city → búsqueda por nombre (Google lo resuelve)
 *   3. Solo city → búsqueda por ciudad
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
  // Construir la query para Google Maps
  const buildQuery = () => {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    // PRIORIDAD 1: coordenadas exactas
    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
      return `${lat},${lng}`;
    }

    // PRIORIDAD 2: dirección + ciudad (Google reconoce condominios, conjuntos, etc.)
    const parts = [];
    if (address) parts.push(address);
    if (neighborhood) parts.push(neighborhood);
    if (city) parts.push(city);
    if (department) parts.push(department);
    parts.push("Colombia");

    if (parts.length > 1) {
      return parts.join(", ");
    }

    // PRIORIDAD 3: fallback genérico
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
            Mapa no disponible (falta API key)
          </p>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary/20 border border-primary/30 text-primary rounded-lg text-sm hover:bg-primary/30 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Ver en Google Maps
          </a>
        </div>
      </div>
    );
  }

  // Construir URL de iframe — mode "place" con query
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  const hasCoords = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;

  let src = `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=${encodedQuery}&language=es&region=CO`;

  // Si hay coordenadas, agregar center y zoom alto para precisión
  if (hasCoords) {
    src += `&center=${lat},${lng}&zoom=17`;
  }

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
        title={`Ubicación: ${address || city || "Propiedad"}`}
      />
    </div>
  );
};

export default PropertyMap;
