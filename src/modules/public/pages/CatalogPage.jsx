// src/modules/public/pages/CatalogPage.jsx
// ─────────────────────────────────────────────────────────────
// Catálogo editorial — Inmobiliaria Rincón Bedoya & Asociados
// · Lee query params (?ciudad=X&operacion=Y&tipo=Z) del buscador del home
// · Sidebar sticky de filtros en desktop · drawer en mobile
// · Chips de filtros activos · ordenamiento · toggle grid/list
// · Empty state elegante con CTA a WhatsApp
// · Todo tokenizado (sin hardcoding)
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import {
  FaSearch, FaFilter, FaMapMarkerAlt, FaTimes, FaTimesCircle,
  FaChevronLeft, FaChevronRight, FaChevronDown, FaSlidersH,
  FaThLarge, FaList, FaWhatsapp, FaSortAmountDown,
  FaRegBuilding, FaHome, FaTree, FaMapPin, FaArrowRight,
} from "react-icons/fa";
import propertyService from "../../properties/services/property.service";
import PropertyCard from "../components/PropertyCard";
import Breadcrumbs from "../../../shared/components/UI/Breadcrumbs";
import { useFavorites } from "../../clients/hooks/useFavorites";
import { PUBLIC_ROUTES } from "../../../core/config/routes.config";

/* ─── Helpers ─────────────────────────────────────────────── */

const PROPERTY_TYPES = [
  { value: "",            label: "Todos los tipos", icon: FaRegBuilding },
  { value: "casa",        label: "Casa",            icon: FaHome        },
  { value: "apartamento", label: "Apartamento",     icon: FaRegBuilding },
  { value: "lote",        label: "Lote",            icon: FaMapPin      },
  { value: "finca",       label: "Finca",           icon: FaTree        },
  { value: "local",       label: "Local comercial", icon: FaRegBuilding },
];

const OPERATION_TYPES = [
  { value: "",        label: "Comprar o arrendar" },
  { value: "sale",    label: "Comprar"            },
  { value: "rent",    label: "Arrendar"           },
];

const SORT_OPTIONS = [
  { value: "recent",       label: "Más recientes"   },
  { value: "price-asc",    label: "Precio: menor a mayor" },
  { value: "price-desc",   label: "Precio: mayor a menor" },
  { value: "rooms-desc",   label: "Más habitaciones" },
];

const POPULAR_CITIES = ["Anserma", "Pereira", "Manizales", "Riosucio", "Dosquebradas", "Supía"];

const normalizeText = (s = "") =>
  String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/* ─── Query params → filtros ─────────────────────────────── */

function paramsToFilters(sp) {
  const operation = sp.get("operacion") || "";
  let transactionType = "";
  if (operation === "venta" || operation === "sale")   transactionType = "sale";
  if (operation === "arriendo" || operation === "rent") transactionType = "rent";

  return {
    searchTerm:      sp.get("q")          || "",
    city:            sp.get("ciudad")     || "",
    type:            sp.get("tipo")       || "",
    transactionType,
    minPrice:        sp.get("min")        || "",
    maxPrice:        sp.get("max")        || "",
    bedrooms:        sp.get("hab")        || "",
    bathrooms:       sp.get("ban")        || "",
  };
}

function filtersToParams(filters) {
  const params = new URLSearchParams();
  if (filters.searchTerm) params.set("q", filters.searchTerm);
  if (filters.city)       params.set("ciudad", filters.city);
  if (filters.type)       params.set("tipo", filters.type);
  if (filters.transactionType === "sale") params.set("operacion", "venta");
  if (filters.transactionType === "rent") params.set("operacion", "arriendo");
  if (filters.minPrice)   params.set("min", filters.minPrice);
  if (filters.maxPrice)   params.set("max", filters.maxPrice);
  if (filters.bedrooms)   params.set("hab", filters.bedrooms);
  if (filters.bathrooms)  params.set("ban", filters.bathrooms);
  return params;
}

/* ─── Formato precio ─────────────────────────────────────── */
const formatPrice = (n) => {
  const num = Number(n);
  if (!num) return "";
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)} B`;
  if (num >= 1_000_000)     return `${(num / 1_000_000).toFixed(0)} M`;
  if (num >= 1_000)         return `${(num / 1_000).toFixed(0)} K`;
  return String(num);
};

/* ─── Componente ─────────────────────────────────────────── */

const CatalogPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const listTopRef = useRef(null);

  const [properties, setProperties] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewMode, setViewMode]     = useState("grid");
  const [sortBy, setSortBy]         = useState("recent");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);

  // Favoritos
  useFavorites();

  // Filtros — sincronizados con URL
  const [filters, setFilters] = useState(() => paramsToFilters(searchParams));

  // Carga inicial
  useEffect(() => { loadProperties(); }, []);

  // Cuando cambian los query params (navegación externa), sincroniza estado
  useEffect(() => {
    setFilters(paramsToFilters(searchParams));
  }, [searchParams]);

  // Items por página según viewport
  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      if (w < 640)  return 6;
      if (w < 1024) return 8;
      return viewMode === "list" ? 6 : 9;
    };
    const apply = () => setItemsPerPage(compute());
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, [viewMode]);

  const loadProperties = async () => {
    setLoading(true);
    try {
      const data = await propertyService.getPublicProperties();
      setProperties(data);
    } catch (err) {
      console.error("Error cargando propiedades", err);
    } finally {
      setLoading(false);
    }
  };

  /* ─── Aplicar filtros ─────────────────────────────────── */
  const filteredProperties = useMemo(() => {
    let list = [...properties];

    if (filters.searchTerm) {
      const term = normalizeText(filters.searchTerm);
      list = list.filter((p) =>
        normalizeText(p.title       || "").includes(term) ||
        normalizeText(p.description || "").includes(term) ||
        normalizeText(p.city        || "").includes(term) ||
        normalizeText(p.address     || "").includes(term) ||
        normalizeText(p.location?.city    || "").includes(term) ||
        normalizeText(p.location?.address || "").includes(term)
      );
    }

    if (filters.type) {
      const t = filters.type.toLowerCase();
      list = list.filter((p) => {
        const pt = String(p.type || "").toLowerCase();
        return pt.includes(t) || t.includes(pt);
      });
    }

    if (filters.transactionType) {
      list = list.filter((p) => {
        const tr = String(p.transactionType || "").toLowerCase();
        if (filters.transactionType === "sale")
          return ["sale", "venta", "compra"].some((v) => tr.includes(v));
        if (filters.transactionType === "rent")
          return ["rent", "arriendo", "alquiler", "renta"].some((v) => tr.includes(v));
        return true;
      });
    }

    if (filters.minPrice) {
      list = list.filter((p) => Number(p.price?.sale ?? p.price?.rent ?? p.price ?? 0) >= Number(filters.minPrice));
    }
    if (filters.maxPrice) {
      list = list.filter((p) => Number(p.price?.sale ?? p.price?.rent ?? p.price ?? 0) <= Number(filters.maxPrice));
    }
    if (filters.bedrooms) {
      list = list.filter((p) => {
        const r = Number(p.features?.rooms ?? p.features?.bedrooms ?? p.rooms ?? p.bedrooms ?? 0);
        return r >= Number(filters.bedrooms);
      });
    }
    if (filters.bathrooms) {
      list = list.filter((p) => {
        const b = Number(p.features?.bathrooms ?? p.bathrooms ?? 0);
        return b >= Number(filters.bathrooms);
      });
    }
    if (filters.city) {
      const c = normalizeText(filters.city);
      list = list.filter((p) => {
        const pc = normalizeText(p.city || p.location?.city || "");
        return pc.includes(c);
      });
    }

    // Ordenamiento
    switch (sortBy) {
      case "price-asc":
        list.sort((a, b) => Number(a.price?.sale ?? a.price?.rent ?? a.price ?? 0) - Number(b.price?.sale ?? b.price?.rent ?? b.price ?? 0));
        break;
      case "price-desc":
        list.sort((a, b) => Number(b.price?.sale ?? b.price?.rent ?? b.price ?? 0) - Number(a.price?.sale ?? a.price?.rent ?? a.price ?? 0));
        break;
      case "rooms-desc":
        list.sort((a, b) => Number(b.features?.rooms ?? b.rooms ?? 0) - Number(a.features?.rooms ?? a.rooms ?? 0));
        break;
      case "recent":
      default:
        list.sort((a, b) => {
          const ta = a.createdAt?.seconds || a.updatedAt?.seconds || 0;
          const tb = b.createdAt?.seconds || b.updatedAt?.seconds || 0;
          return tb - ta;
        });
    }

    return list;
  }, [properties, filters, sortBy]);

  /* ─── Handlers ────────────────────────────────────────── */
  const handleFilterChange = (field, value) => {
    const next = { ...filters, [field]: value };
    setFilters(next);
    setCurrentPage(1);
  };

  const applyFilters = () => {
    setSearchParams(filtersToParams(filters));
    setDrawerOpen(false);
    setCurrentPage(1);
    setTimeout(() => {
      listTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const clearFilters = () => {
    const cleared = {
      searchTerm: "", type: "", transactionType: "",
      minPrice: "", maxPrice: "", bedrooms: "", bathrooms: "", city: "",
    };
    setFilters(cleared);
    setSearchParams({});
    setCurrentPage(1);
  };

  const removeFilter = (key) => {
    const next = { ...filters, [key]: "" };
    setFilters(next);
    setSearchParams(filtersToParams(next));
    setCurrentPage(1);
  };

  /* ─── Chips de filtros activos ────────────────────────── */
  const activeChips = useMemo(() => {
    const chips = [];
    if (filters.searchTerm)      chips.push({ key: "searchTerm", label: `"${filters.searchTerm}"` });
    if (filters.city)            chips.push({ key: "city",       label: `📍 ${filters.city}` });
    if (filters.type) {
      const t = PROPERTY_TYPES.find((pt) => pt.value === filters.type);
      chips.push({ key: "type", label: t ? t.label : filters.type });
    }
    if (filters.transactionType) {
      chips.push({
        key: "transactionType",
        label: filters.transactionType === "sale" ? "En venta" : "En arriendo",
      });
    }
    if (filters.minPrice)        chips.push({ key: "minPrice",  label: `Desde ${formatPrice(filters.minPrice)}` });
    if (filters.maxPrice)        chips.push({ key: "maxPrice",  label: `Hasta ${formatPrice(filters.maxPrice)}` });
    if (filters.bedrooms)        chips.push({ key: "bedrooms",  label: `${filters.bedrooms}+ hab.` });
    if (filters.bathrooms)       chips.push({ key: "bathrooms", label: `${filters.bathrooms}+ baños` });
    return chips;
  }, [filters]);

  /* ─── Paginación ──────────────────────────────────────── */
  const totalItems = filteredProperties.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const paginated = filteredProperties.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    if (safePage !== currentPage) setCurrentPage(safePage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPages, itemsPerPage]);

  const goToPage = (p) => {
    const next = Math.min(Math.max(p, 1), totalPages);
    setCurrentPage(next);
    setTimeout(() => {
      listTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  /* ─── SEO dinámico ────────────────────────────────────── */
  const cityLabel = filters.city.trim();
  const typeLabel = (() => {
    const t = PROPERTY_TYPES.find((pt) => pt.value === filters.type);
    return t?.label?.toLowerCase() || "";
  })();
  const opLabel = filters.transactionType === "sale" ? "en venta"
                : filters.transactionType === "rent" ? "en arriendo" : "";

  const seoTitle = cityLabel || typeLabel || opLabel
    ? `${typeLabel ? typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1) : "Propiedades"} ${opLabel} ${cityLabel ? `en ${cityLabel}` : "en Caldas, Risaralda"} | Rincón Bedoya`
    : "Propiedades en venta y arriendo | Inmobiliaria Rincón Bedoya & Asociados";

  const seoDesc = "Explora propiedades verificadas jurídicamente. Casas, apartamentos, lotes y fincas con respaldo legal integral en Caldas, Risaralda y la región cafetera.";

  const canonicalUrl = "https://inmobiliaria-ryb-y-asociados.com/catalogo";
  const breadcrumbItems = [{ label: "Propiedades", href: PUBLIC_ROUTES.CATALOG }];

  /* ═══════════════════════════════════════════════════════ */
  /*  RENDER                                                 */
  /* ═══════════════════════════════════════════════════════ */

  return (
    <div>
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDesc} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDesc} />
        <meta property="og:url" content={canonicalUrl} />
      </Helmet>

      {/* ═══════════════════════════════════════════════════ */}
      {/*  HERO editorial con buscador integrado              */}
      {/* ═══════════════════════════════════════════════════ */}
      <section className="catalog-hero relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <Breadcrumbs items={breadcrumbItems} />

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 max-w-3xl"
          >
            <span className="eyebrow">
              Portafolio verificado
            </span>
            <h1 className="heading-display mt-6 text-[clamp(2rem,4.5vw+0.5rem,4rem)]">
              {cityLabel
                ? <>Propiedades <em>en {cityLabel}</em></>
                : typeLabel
                  ? <>{typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} <em>disponibles</em></>
                  : <>Encuentra la propiedad <em>que estás buscando</em>.</>
              }
            </h1>
            <p
              className="mt-5 text-base sm:text-lg leading-relaxed max-w-2xl"
              style={{ color: "var(--color-text-muted)" }}
            >
              Todas nuestras propiedades pasan por verificación jurídica antes de publicarse.
              Usa los filtros para afinar tu búsqueda.
            </p>
          </motion.div>

          {/* Stats rápidos */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-8 flex flex-wrap gap-2"
          >
            <span className="catalog-stat-pill">
              <span className="catalog-stat-pill__num">{loading ? "—" : properties.length}</span>
              <span className="catalog-stat-pill__label">propiedades activas</span>
            </span>
            <span className="catalog-stat-pill">
              <span className="catalog-stat-pill__num">
                {loading ? "—" : new Set(properties.map((p) => p.city || p.location?.city).filter(Boolean)).size}
              </span>
              <span className="catalog-stat-pill__label">ciudades</span>
            </span>
            <span className="catalog-stat-pill catalog-stat-pill--gold">
              <span className="catalog-stat-pill__num">100%</span>
              <span className="catalog-stat-pill__label">verificadas</span>
            </span>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════ */}
      {/*  BODY: Sidebar filtros + grid                        */}
      {/* ═══════════════════════════════════════════════════ */}
      <section className="pb-16 sm:pb-20" ref={listTopRef}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

            {/* ─── Sidebar filtros — desktop ─────────────── */}
            <aside className="hidden lg:block lg:col-span-3">
              <div className="catalog-filters lg:sticky lg:top-24">
                <FiltersPanel
                  filters={filters}
                  onChange={handleFilterChange}
                  onApply={applyFilters}
                  onClear={clearFilters}
                />
              </div>
            </aside>

            {/* ─── Main column ───────────────────────────── */}
            <div className="lg:col-span-9">
              {/* Toolbar */}
              <div className="catalog-toolbar">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button
                    className="catalog-toolbar__filter-btn lg:hidden"
                    onClick={() => setDrawerOpen(true)}
                    aria-label="Abrir filtros"
                  >
                    <FaSlidersH />
                    <span>Filtros</span>
                    {activeChips.length > 0 && (
                      <span className="catalog-toolbar__badge">{activeChips.length}</span>
                    )}
                  </button>
                  <span
                    className="text-sm truncate"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    <strong style={{ color: "var(--color-text)" }}>{totalItems}</strong>
                    {" "}{totalItems === 1 ? "propiedad" : "propiedades"}
                    {activeChips.length > 0 && " filtradas"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Sort */}
                  <div className="catalog-sort">
                    <FaSortAmountDown
                      className="catalog-sort__icon"
                      style={{ color: "var(--color-text-faint)" }}
                      aria-hidden="true"
                    />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="catalog-sort__select"
                      aria-label="Ordenar"
                    >
                      {SORT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <FaChevronDown className="catalog-sort__chevron" aria-hidden="true" />
                  </div>

                  {/* View mode */}
                  <div className="catalog-view-toggle" role="tablist" aria-label="Modo de vista">
                    <button
                      type="button"
                      className={`catalog-view-toggle__btn ${viewMode === "grid" ? "is-active" : ""}`}
                      onClick={() => setViewMode("grid")}
                      aria-pressed={viewMode === "grid"}
                      aria-label="Vista cuadrícula"
                    >
                      <FaThLarge />
                    </button>
                    <button
                      type="button"
                      className={`catalog-view-toggle__btn ${viewMode === "list" ? "is-active" : ""}`}
                      onClick={() => setViewMode("list")}
                      aria-pressed={viewMode === "list"}
                      aria-label="Vista lista"
                    >
                      <FaList />
                    </button>
                  </div>
                </div>
              </div>

              {/* Chips activos */}
              {activeChips.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {activeChips.map((chip) => (
                    <button
                      key={chip.key}
                      onClick={() => removeFilter(chip.key)}
                      className="catalog-chip"
                      aria-label={`Remover filtro ${chip.label}`}
                    >
                      <span>{chip.label}</span>
                      <FaTimes className="text-[10px] opacity-70" />
                    </button>
                  ))}
                  <button
                    onClick={clearFilters}
                    className="text-xs font-semibold uppercase tracking-wider ml-2"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Limpiar todo
                  </button>
                </div>
              )}

              {/* Content */}
              <div className="mt-6">
                {loading ? (
                  <LoadingGrid viewMode={viewMode} />
                ) : totalItems === 0 ? (
                  <EmptyState onClear={clearFilters} filters={filters} />
                ) : (
                  <>
                    <div
                      className={viewMode === "grid"
                        ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5"
                        : "flex flex-col gap-4"
                      }
                    >
                      {paginated.map((property) => (
                        <motion.div
                          key={property.id}
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4 }}
                        >
                          <PropertyCard property={property} />
                        </motion.div>
                      ))}
                    </div>

                    {totalPages > 1 && (
                      <Pagination
                        page={safePage}
                        totalPages={totalPages}
                        onGo={goToPage}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════ */}
      {/*  CTA al final — si el usuario llega hasta acá        */}
      {/* ═══════════════════════════════════════════════════ */}
      {!loading && totalItems > 0 && (
        <section className="pb-16 sm:pb-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="catalog-help-banner">
              <div>
                <span
                  className="text-xs font-bold uppercase tracking-[0.15em] mb-2 block"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  ¿No encuentras lo que buscas?
                </span>
                <h3 className="font-display text-2xl sm:text-3xl" style={{ color: "var(--color-text)" }}>
                  Cuéntanos qué necesitas y <em style={{ color: "#d97706", fontStyle: "italic", fontWeight: 400 }}>te lo buscamos.</em>
                </h3>
                <p className="mt-3 text-sm max-w-xl" style={{ color: "var(--color-text-muted)" }}>
                  Tenemos propiedades en cartera que no siempre publicamos. Si tu zona o presupuesto no aparece, escríbenos directamente.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  href="https://wa.me/573105968202?text=Hola,%20no%20encontré%20la%20propiedad%20que%20busco%20en%20el%20catálogo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                >
                  <FaWhatsapp /> Escribir por WhatsApp
                </a>
                <Link to={PUBLIC_ROUTES.CONTACT} className="btn-secondary">
                  Dejar una consulta
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/*  DRAWER mobile                                       */}
      {/* ═══════════════════════════════════════════════════ */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 z-[65] bg-black/60 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="fixed left-0 top-0 bottom-0 z-[66] w-[88vw] max-w-sm overflow-y-auto lg:hidden"
              style={{ background: "var(--color-surface)" }}
            >
              <div
                className="sticky top-0 px-5 py-4 flex items-center justify-between border-b z-10"
                style={{
                  background: "var(--color-surface)",
                  borderColor: "var(--color-divider)",
                }}
              >
                <h2
                  className="font-display text-xl"
                  style={{ color: "var(--color-text)" }}
                >
                  Filtros
                </h2>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="theme-toggle"
                  aria-label="Cerrar"
                >
                  <FaTimes />
                </button>
              </div>
              <div className="p-5">
                <FiltersPanel
                  filters={filters}
                  onChange={handleFilterChange}
                  onApply={applyFilters}
                  onClear={clearFilters}
                />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════ */
/*  FiltersPanel                                              */
/* ═══════════════════════════════════════════════════════════ */

const FiltersPanel = ({ filters, onChange, onApply, onClear }) => {
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onApply(); }}
      className="flex flex-col gap-5"
    >
      {/* Búsqueda general */}
      <div>
        <label className="catalog-filter-label" htmlFor="q">
          Búsqueda libre
        </label>
        <div className="relative">
          <FaSearch
            className="absolute left-3 top-1/2 -translate-y-1/2 text-xs"
            style={{ color: "var(--color-text-faint)" }}
            aria-hidden="true"
          />
          <input
            id="q"
            type="text"
            placeholder="Título, ubicación..."
            value={filters.searchTerm}
            onChange={(e) => onChange("searchTerm", e.target.value)}
            className="catalog-input pl-9"
          />
        </div>
      </div>

      {/* Operación */}
      <div>
        <label className="catalog-filter-label">Operación</label>
        <div className="catalog-segmented">
          {OPERATION_TYPES.map((op) => (
            <button
              key={op.value}
              type="button"
              onClick={() => onChange("transactionType", op.value)}
              className={`catalog-segmented__btn ${filters.transactionType === op.value ? "is-active" : ""}`}
            >
              {op.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tipo de propiedad */}
      <div>
        <label className="catalog-filter-label">Tipo de propiedad</label>
        <div className="grid grid-cols-2 gap-2">
          {PROPERTY_TYPES.filter((pt) => pt.value !== "").map((pt) => {
            const Icon = pt.icon;
            const active = filters.type === pt.value;
            return (
              <button
                key={pt.value}
                type="button"
                onClick={() => onChange("type", active ? "" : pt.value)}
                className={`catalog-type-btn ${active ? "is-active" : ""}`}
              >
                <Icon className="text-sm" />
                <span>{pt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ciudad */}
      <div>
        <label className="catalog-filter-label" htmlFor="city">Ciudad</label>
        <input
          id="city"
          type="text"
          placeholder="Ej: Anserma, Pereira..."
          value={filters.city}
          onChange={(e) => onChange("city", e.target.value)}
          className="catalog-input"
          list="popular-cities"
        />
        <datalist id="popular-cities">
          {POPULAR_CITIES.map((c) => <option key={c} value={c} />)}
        </datalist>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {POPULAR_CITIES.slice(0, 4).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange("city", c)}
              className="catalog-city-chip"
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Rango precio */}
      <div>
        <label className="catalog-filter-label">Precio (COP)</label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            placeholder="Mínimo"
            value={filters.minPrice}
            onChange={(e) => onChange("minPrice", e.target.value)}
            className="catalog-input"
            min="0"
            step="1000000"
          />
          <input
            type="number"
            placeholder="Máximo"
            value={filters.maxPrice}
            onChange={(e) => onChange("maxPrice", e.target.value)}
            className="catalog-input"
            min="0"
            step="1000000"
          />
        </div>
      </div>

      {/* Habitaciones y baños */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="catalog-filter-label" htmlFor="beds">Hab. mín.</label>
          <select
            id="beds"
            value={filters.bedrooms}
            onChange={(e) => onChange("bedrooms", e.target.value)}
            className="catalog-input"
          >
            <option value="">Cualquiera</option>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}+</option>)}
          </select>
        </div>
        <div>
          <label className="catalog-filter-label" htmlFor="baths">Baños mín.</label>
          <select
            id="baths"
            value={filters.bathrooms}
            onChange={(e) => onChange("bathrooms", e.target.value)}
            className="catalog-input"
          >
            <option value="">Cualquiera</option>
            {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}+</option>)}
          </select>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex flex-col gap-2 pt-2">
        <button type="submit" className="btn-primary w-full">
          <FaSearch className="text-xs" /> Aplicar filtros
        </button>
        <button
          type="button"
          onClick={onClear}
          className="text-xs font-semibold uppercase tracking-wider py-2"
          style={{ color: "var(--color-text-muted)" }}
        >
          Limpiar todos los filtros
        </button>
      </div>
    </form>
  );
};

/* ═══════════════════════════════════════════════════════════ */
/*  LoadingGrid                                               */
/* ═══════════════════════════════════════════════════════════ */

const LoadingGrid = ({ viewMode }) => {
  const count = viewMode === "list" ? 4 : 6;
  return (
    <div
      className={viewMode === "grid"
        ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5"
        : "flex flex-col gap-4"
      }
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="catalog-skeleton">
          <div className="catalog-skeleton__img skeleton" />
          <div className="p-4 space-y-3">
            <div className="skeleton h-4 w-3/4" />
            <div className="skeleton h-3 w-1/2" />
            <div className="skeleton h-5 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════ */
/*  EmptyState                                                */
/* ═══════════════════════════════════════════════════════════ */

const EmptyState = ({ onClear, filters }) => {
  const hasFilters = Object.values(filters).some((v) => String(v).trim() !== "");
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="catalog-empty"
    >
      <div className="catalog-empty__icon">
        <FaSearch />
      </div>
      <h3
        className="font-display text-2xl sm:text-3xl mt-6"
        style={{ color: "var(--color-text)" }}
      >
        {hasFilters ? (
          <>No encontramos propiedades <em style={{ color: "#d97706", fontStyle: "italic", fontWeight: 400 }}>con esos criterios</em></>
        ) : (
          <>Aún no hay propiedades publicadas.</>
        )}
      </h3>
      <p
        className="mt-3 max-w-md text-base"
        style={{ color: "var(--color-text-muted)" }}
      >
        {hasFilters
          ? "Prueba ajustar los filtros o cuéntanos qué estás buscando y te ayudamos a encontrarlo."
          : "Estamos actualizando nuestro portafolio. Escríbenos y te avisamos cuando tengamos algo para ti."}
      </p>
      <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
        {hasFilters && (
          <button onClick={onClear} className="btn-secondary">
            <FaTimesCircle /> Limpiar filtros
          </button>
        )}
        <a
          href="https://wa.me/573105968202?text=Hola,%20busco%20una%20propiedad%20específica"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary"
        >
          <FaWhatsapp /> Cuéntame qué buscas
        </a>
      </div>
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════════ */
/*  Pagination                                                */
/* ═══════════════════════════════════════════════════════════ */

const Pagination = ({ page, totalPages, onGo }) => {
  const pages = [];
  const maxVisible = 5;
  let start = Math.max(1, page - 2);
  let end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <nav className="catalog-pagination" aria-label="Paginación">
      <button
        onClick={() => onGo(page - 1)}
        disabled={page === 1}
        className="catalog-pagination__btn"
        aria-label="Anterior"
      >
        <FaChevronLeft />
      </button>
      {start > 1 && (
        <>
          <button onClick={() => onGo(1)} className="catalog-pagination__btn">1</button>
          {start > 2 && <span className="catalog-pagination__dots">…</span>}
        </>
      )}
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onGo(p)}
          className={`catalog-pagination__btn ${p === page ? "is-active" : ""}`}
          aria-current={p === page ? "page" : undefined}
        >
          {p}
        </button>
      ))}
      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="catalog-pagination__dots">…</span>}
          <button onClick={() => onGo(totalPages)} className="catalog-pagination__btn">{totalPages}</button>
        </>
      )}
      <button
        onClick={() => onGo(page + 1)}
        disabled={page === totalPages}
        className="catalog-pagination__btn"
        aria-label="Siguiente"
      >
        <FaChevronRight />
      </button>
    </nav>
  );
};

export default CatalogPage;