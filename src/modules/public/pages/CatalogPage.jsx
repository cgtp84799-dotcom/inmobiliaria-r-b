import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import {
  FaSearch,
  FaFilter,
  FaHome,
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaBed,
  FaBath,
  FaTimesCircle,
  FaPlusCircle,
  FaSpinner,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import propertyService from "../../properties/services/property.service";
import PropertyCard from "../components/PropertyCard";


const CatalogPage = () => {
  const [properties, setProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ En móvil es mejor iniciar cerrado
  const [filtersOpen, setFiltersOpen] = useState(false);

  // ✅ Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);

  // ✅ Para subir al inicio del listado al paginar
  const listTopRef = useRef(null);

  const [filters, setFilters] = useState({
    searchTerm: "",
    type: "",
    transactionType: "",
    minPrice: "",
    maxPrice: "",
    bedrooms: "",
    bathrooms: "",
    city: "",
  });

  useEffect(() => {
    loadProperties();
  }, []);

  // ✅ Page size según dispositivo
  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      if (w < 640) return 6; // mobile
      if (w < 1024) return 8; // tablet
      return 9; // desktop
    };

    const apply = () => setItemsPerPage(compute());
    apply();

    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);

  const loadProperties = async () => {
    setLoading(true);
    try {
      const data = await propertyService.getPublicProperties();
      setProperties(data);
      setFilteredProperties(data);
      setCurrentPage(1);
    } catch (error) {
      console.error("Error cargando propiedades", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const applyFilters = () => {
    let filtered = [...properties];

    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title?.toLowerCase().includes(term) ||
          p.description?.toLowerCase().includes(term) ||
          p.city?.toLowerCase().includes(term) ||
          p.address?.toLowerCase().includes(term) ||
          p.location?.city?.toLowerCase().includes(term) ||
          p.location?.address?.toLowerCase().includes(term)
      );
    }

    if (filters.type) {
      filtered = filtered.filter((p) => {
        const propType = String(p.type || "").toLowerCase();
        const filterType = filters.type.toLowerCase();
        return (
          propType === filterType ||
          propType === filterType + "o" ||
          propType === filterType.slice(0, -1)
        );
      });
    }

    if (filters.transactionType) {
      filtered = filtered.filter((p) => {
        const trans = String(p.transactionType || "").toLowerCase();
        const filterTrans = filters.transactionType.toLowerCase();

        if (filterTrans === "sale") {
          return trans === "sale" || trans === "venta" || trans === "compra";
        }
        if (filterTrans === "rent") {
          return (
            trans === "rent" ||
            trans === "arriendo" ||
            trans === "alquiler" ||
            trans === "renta"
          );
        }

        return trans === filterTrans;
      });
    }

    if (filters.minPrice) {
      filtered = filtered.filter(
        (p) => Number(p.price || 0) >= Number(filters.minPrice)
      );
    }

    if (filters.maxPrice) {
      filtered = filtered.filter(
        (p) => Number(p.price || 0) <= Number(filters.maxPrice)
      );
    }

    if (filters.bedrooms) {
      filtered = filtered.filter((p) => {
        const rooms = Number(p.rooms || p.features?.bedrooms || 0);
        return rooms >= Number(filters.bedrooms);
      });
    }

    if (filters.bathrooms) {
      filtered = filtered.filter((p) => {
        const baths = Number(p.bathrooms || p.features?.bathrooms || 0);
        return baths >= Number(filters.bathrooms);
      });
    }

    if (filters.city) {
      filtered = filtered.filter((p) => {
        const city = String(p.city || p.location?.city || "").toLowerCase();
        return city.includes(filters.city.toLowerCase());
      });
    }

    setFilteredProperties(filtered);
    setFiltersOpen(false);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    const cleared = {
      searchTerm: "",
      type: "",
      transactionType: "",
      minPrice: "",
      maxPrice: "",
      bedrooms: "",
      bathrooms: "",
      city: "",
    };
    setFilters(cleared);
    setFilteredProperties(properties);
    setCurrentPage(1);
  };

  const handleFavorite = (propertyId) => {
    console.log("Favorito:", propertyId);
  };

  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some((v) => String(v).trim() !== "");
  }, [filters]);

  // ✅ Datos paginados
  const totalItems = filteredProperties.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProperties = filteredProperties.slice(startIndex, endIndex);

  useEffect(() => {
    if (safePage !== currentPage) setCurrentPage(safePage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPages, itemsPerPage]);

  const goToPage = (page) => {
    const next = Math.min(Math.max(page, 1), totalPages);
    setCurrentPage(next);

    setTimeout(() => {
      listTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const goPrev = () => goToPage(safePage - 1);
  const goNext = () => goToPage(safePage + 1);

  const PaginationNumbers = ({ className = "" }) => {
    if (totalPages <= 1) return null;

    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

    return (
      <div
        className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${className}`}
      >
        <p className="text-xs text-slate-500">
          Página <span className="text-slate-200 font-semibold">{safePage}</span>{" "}
          de <span className="text-slate-200 font-semibold">{totalPages}</span>
        </p>

        <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end">
          <button
            onClick={goPrev}
            disabled={safePage === 1}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-700 text-slate-200 text-sm hover:border-slate-500 hover:bg-slate-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Página anterior"
          >
            <FaChevronLeft />
            <span className="hidden sm:inline">Anterior</span>
          </button>

          {pages.map((p) => (
            <button
              key={p}
              onClick={() => goToPage(p)}
              className={`min-w-10 px-3 py-2 rounded-xl border text-sm transition ${
                p === safePage
                  ? "bg-primary/20 border-primary/40 text-primary font-black"
                  : "border-slate-700 text-slate-200 hover:border-slate-500 hover:bg-slate-900"
              }`}
              aria-current={p === safePage ? "page" : undefined}
            >
              {p}
            </button>
          ))}

          <button
            onClick={goNext}
            disabled={safePage === totalPages}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-700 text-slate-200 text-sm hover:border-slate-500 hover:bg-slate-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Página siguiente"
          >
            <span className="hidden sm:inline">Siguiente</span>
            <FaChevronRight />
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* ✅ SEO CATÁLOGO */}
      <Helmet>
        <title>Propiedades en Venta y Arriendo en Anserma, Caldas | Inmobiliaria Rincón Bedoya</title>
        <meta name="description" content="Explora casas, apartamentos, lotes y fincas disponibles para compra, venta y arriendo en Anserma, Riosucio, Supía, Belalcázar, Dosquebradas y Caldas. Inmobiliaria Rincón Bedoya y Asociados." />
        <link rel="canonical" href="https://inmobiliaria-ryb-y-asociados.com/propiedades" />
        <meta property="og:title" content="Propiedades en Venta y Arriendo | Inmobiliaria Rincón Bedoya" />
        <meta property="og:description" content="Casas, apartamentos, lotes y fincas en Anserma, Caldas y municipios aledaños. Encuentra tu propiedad ideal." />
        <meta property="og:url" content="https://inmobiliaria-ryb-y-asociados.com/propiedades" />
        <meta property="og:image" content="https://inmobiliaria-ryb-y-asociados.com/logo.jpg.png" />
      </Helmet>

      <div className="max-w-7xl mx-auto py-6 sm:py-10 lg:py-12 px-4 sm:px-6">
        {/* HERO / HEADER (MEJORADO) */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="mb-5 sm:mb-10"
        >
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
            Propiedades{" "}
            <span className="bg-gradient-to-r from-yellow-300 via-primary to-yellow-500 bg-clip-text text-transparent">
              disponibles
            </span>
          </h1>

          <p className="mt-3 text-sm sm:text-base lg:text-lg leading-relaxed text-slate-300 max-w-2xl">
            Explora propiedades urbanas y rurales para compra, venta o arriendo.
            Filtra según tu necesidad y encuentra el inmueble ideal.
          </p>

          <div className="mt-4 h-px w-full max-w-2xl bg-gradient-to-r from-transparent via-slate-700/70 to-transparent" />
        </motion.div>

        {/* PANEL DE FILTROS */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.55 }}
          className="card-soft border border-slate-800/80 mb-6 sm:mb-10 p-4 sm:p-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <FaFilter className="text-primary" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-light">
                  Filtros de búsqueda
                </h2>
                <p className="text-xs text-slate-400">
                  Ajusta los filtros para encontrar la propiedad perfecta
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:justify-end">
              {hasActiveFilters && (
                <span className="text-xs text-slate-400">
                  Filtros activos:{" "}
                  <span className="text-primary font-bold">Sí</span>
                </span>
              )}

              <button
                onClick={() => setFiltersOpen((v) => !v)}
                className="text-xs sm:text-sm text-primary hover:underline"
                aria-expanded={filtersOpen}
              >
                {filtersOpen ? "Ocultar filtros" : "Mostrar filtros"}
              </button>
            </div>
          </div>

          {filtersOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Búsqueda general */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Búsqueda general
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500 text-sm">
                    <FaSearch />
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar por ubicación, descripción..."
                    value={filters.searchTerm}
                    onChange={(e) =>
                      handleFilterChange("searchTerm", e.target.value)
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-9 pr-3 text-sm text-light focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Grid de filtros */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Ciudad */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Ciudad
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-500 text-sm">
                      <FaMapMarkerAlt />
                    </span>
                    <input
                      type="text"
                      placeholder="Dosquebradas, Pereira..."
                      value={filters.city}
                      onChange={(e) => handleFilterChange("city", e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-9 pr-3 text-sm text-light focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Tipo */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Tipo de propiedad
                  </label>
                  <select
                    value={filters.type}
                    onChange={(e) => handleFilterChange("type", e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-light focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Todos</option>
                    <option value="apartamento">Apartamento</option>
                    <option value="casa">Casa</option>
                    <option value="lote">Lote</option>
                    <option value="finca">Finca</option>
                    <option value="commercial">Local Comercial</option>
                  </select>
                </div>

                {/* Operación */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Operación
                  </label>
                  <select
                    value={filters.transactionType}
                    onChange={(e) =>
                      handleFilterChange("transactionType", e.target.value)
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-light focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Compra o Arriendo</option>
                    <option value="sale">Venta</option>
                    <option value="rent">Arriendo</option>
                  </select>
                </div>

                {/* Dormitorios */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Dormitorios
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-500 text-sm">
                      <FaBed />
                    </span>
                    <select
                      value={filters.bedrooms}
                      onChange={(e) =>
                        handleFilterChange("bedrooms", e.target.value)
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-9 pr-3 text-sm text-light focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    >
                      <option value="">Cualquiera</option>
                      <option value="1">1+</option>
                      <option value="2">2+</option>
                      <option value="3">3+</option>
                      <option value="4">4+</option>
                    </select>
                  </div>
                </div>

                {/* Baños */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Baños</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-500 text-sm">
                      <FaBath />
                    </span>
                    <select
                      value={filters.bathrooms}
                      onChange={(e) =>
                        handleFilterChange("bathrooms", e.target.value)
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-9 pr-3 text-sm text-light focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    >
                      <option value="">Cualquiera</option>
                      <option value="1">1+</option>
                      <option value="2">2+</option>
                      <option value="3">3+</option>
                    </select>
                  </div>
                </div>

                {/* Precio mínimo */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Precio mínimo
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-500 text-sm">
                      <FaMoneyBillWave />
                    </span>
                    <input
                      type="number"
                      placeholder="$ 0"
                      value={filters.minPrice}
                      onChange={(e) =>
                        handleFilterChange("minPrice", e.target.value)
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-9 pr-3 text-sm text-light focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Precio máximo */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Precio máximo
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-500 text-sm">
                      <FaMoneyBillWave />
                    </span>
                    <input
                      type="number"
                      placeholder="$ Sin límite"
                      value={filters.maxPrice}
                      onChange={(e) =>
                        handleFilterChange("maxPrice", e.target.value)
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-9 pr-3 text-sm text-light focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Botones */}
                <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:col-span-2 lg:col-span-1">
                  <button
                    onClick={applyFilters}
                    className="w-full flex-1 inline-flex items-center justify-center gap-2 bg-primary text-slate-950 font-semibold text-sm py-2.5 rounded-xl hover:bg-yellow-500 transition-all duration-200"
                  >
                    <FaSearch />
                    Aplicar filtros
                  </button>
                  <button
                    onClick={clearFilters}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1 px-4 text-xs text-slate-400 hover:text-slate-200 border border-slate-700 rounded-xl py-2.5 hover:border-slate-600 transition-all"
                  >
                    <FaTimesCircle />
                    Limpiar
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Contador */}
        {!loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="mb-5 sm:mb-6 flex items-center justify-between gap-3"
          >
            <div>
              <p className="text-slate-400 text-sm">
                <span className="text-primary font-bold">{totalItems}</span>{" "}
                {totalItems === 1
                  ? "propiedad encontrada"
                  : "propiedades encontradas"}
              </p>

              {totalItems > 0 && (
                <p className="text-slate-500 text-xs mt-1">
                  Mostrando{" "}
                  <span className="text-slate-300 font-semibold">
                    {startIndex + 1}-{Math.min(endIndex, totalItems)}
                  </span>{" "}
                  de{" "}
                  <span className="text-slate-300 font-semibold">{totalItems}</span>
                </p>
              )}
            </div>

            <button
              onClick={() => setFiltersOpen((v) => !v)}
              className="sm:hidden text-xs text-primary hover:underline"
            >
              {filtersOpen ? "Ocultar filtros" : "Ajustar filtros"}
            </button>
          </motion.div>
        )}

        {/* LISTADO / VACÍO / LOADING */}
        {loading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="card-soft py-12 sm:py-16 px-6 text-center"
          >
            <FaSpinner className="animate-spin text-primary text-4xl mx-auto mb-4" />
            <p className="text-slate-400">Cargando propiedades...</p>
          </motion.div>
        ) : filteredProperties.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="card-soft py-12 sm:py-16 px-6 text-center border border-dashed border-slate-700"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
              <FaHome className="text-primary text-2xl sm:text-3xl" />
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-light mb-2">
              {properties.length === 0
                ? "Aún no hay propiedades publicadas"
                : "No se encontraron propiedades"}
            </h2>

            <p className="text-slate-400 text-sm sm:text-base max-w-md mx-auto mb-6">
              {properties.length === 0
                ? "Muy pronto encontrarás aquí casas, apartamentos, lotes y fincas disponibles para compra, venta y arriendo."
                : "Intenta ajustar los filtros de búsqueda para ver más resultados."}
            </p>

            <a
              href="https://wa.me/573105968202?text=Hola,%20quiero%20información%20sobre%20propiedades"
              target="_blank"
              rel="noopener noreferrer"
              className="button-gold inline-flex items-center gap-2 px-6 sm:px-8 py-3"
            >
              <FaPlusCircle />
              Quiero que me contacten
            </a>
          </motion.div>
        ) : (
          <>
            <div ref={listTopRef} />

            <PaginationNumbers className="mb-4" />

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 sm:gap-6"
            >
              {paginatedProperties.map((property, index) => (
                <motion.div
                  key={property.id}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.03, duration: 0.32 }}
                >
                  <PropertyCard property={property} onFavorite={handleFavorite} />
                </motion.div>
              ))}
            </motion.div>

            <PaginationNumbers className="mt-8" />
          </>
        )}
      </div>
    </>
  );
};

export default CatalogPage;