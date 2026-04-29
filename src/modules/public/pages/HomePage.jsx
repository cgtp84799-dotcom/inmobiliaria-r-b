// FIX [SEO]: incluye WebSite+SearchAction explícito en Home para rich results de búsqueda.
// src/modules/public/pages/HomePage.jsx
// ─────────────────────────────────────────────────────────────
// Home editorial — Inmobiliaria Rincón Bedoya & Asociados
// · Sistema de tokens CSS (sin hardcoding de colores)
// · Dark + Light mode ambos cuidados
// · Preparado para expansión regional
// · Refleja la esencia: gestión integral + respaldo jurídico
// ─────────────────────────────────────────────────────────────

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  SeoHead,
  SeoTextBlock,
  buildFaqSchema,
  buildLocalBusinessSchema,
  HOMEPAGE_FAQS,
} from "../../../shared/components/SEO";
import {
  FaSearch, FaMapMarkerAlt, FaArrowRight, FaWhatsapp,
  FaBalanceScale, FaBuilding, FaKey, FaGavel,
  FaFileContract, FaHandshake, FaHome, FaChartLine,
  FaShieldAlt, FaCheckCircle, FaRegCompass,
  FaRegLightbulb, FaUsers, FaQuoteLeft,
} from "react-icons/fa";
import { PUBLIC_ROUTES } from "../../../core/config/routes.config";

/* ─────────────────────────────────────────────────────────── */
/*  DATA                                                       */
/* ─────────────────────────────────────────────────────────── */

const PILLARS = [
  {
    num: "01",
    icon: FaBalanceScale,
    title: "Respaldo jurídico",
    desc: "Cada negocio pasa por nuestro equipo legal: verificación de tradición, saneamientos y acompañamiento en notaría. No vendemos promesas, entregamos títulos al día.",
  },
  {
    num: "02",
    icon: FaRegCompass,
    title: "Gestión integral",
    desc: "Arriendo, compra, venta, sucesiones, remates y avalúos bajo un solo techo. Un solo equipo acompaña al cliente de principio a fin, sin intermediarios.",
  },
  {
    num: "03",
    icon: FaUsers,
    title: "Red de confianza",
    desc: "Propietarios, compradores, inversionistas y aliados judiciales en una misma red. Cada cliente entra a una base donde todos son potenciales socios.",
  },
];

const SERVICES = [
  {
    icon: FaBuilding,
    title: "Compra y venta",
    desc: "Propiedades urbanas y rurales con verificación jurídica y de usos del suelo.",
  },
  {
    icon: FaKey,
    title: "Arriendo y administración",
    desc: "Vivienda urbana, locales comerciales, fincas, aparcerías y turismo con contratos blindados.",
  },
  {
    icon: FaGavel,
    title: "Saneamiento jurídico",
    desc: "Procesos de pertenencia, falsa tradición y Ley 1561 de 2012 para pequeña vivienda rural y urbana.",
  },
  {
    icon: FaFileContract,
    title: "Sucesiones y remates",
    desc: "Levantamiento de sucesiones notariales y judiciales, representación en remates de juzgados.",
  },
  {
    icon: FaHandshake,
    title: "Créditos e inversión",
    desc: "Gestión de créditos hipotecarios con bancos y red de inversionistas privados aliados.",
  },
  {
    icon: FaChartLine,
    title: "Avalúos y proyectos",
    desc: "Avalúos certificados, subdivisiones urbanísticas y reglamentos de propiedad horizontal.",
  },
];

const PROCESS = [
  {
    title: "Escucha y diagnóstico",
    desc: "Conversamos sobre tu objetivo — comprar, vender, arrendar o sanear — y revisamos el estado jurídico del inmueble.",
  },
  {
    title: "Plan y estrategia",
    desc: "Diseñamos la ruta: documentación necesaria, valor de mercado, canales de difusión o proceso legal requerido.",
  },
  {
    title: "Ejecución transparente",
    desc: "Tú ves cada paso. Nuestro equipo legal avanza en paralelo al inmobiliario, sin letras pequeñas.",
  },
  {
    title: "Cierre y acompañamiento",
    desc: "Firma en notaría, entrega física y seguimiento posterior. Seguimos siendo tu inmobiliaria después del cierre.",
  },
];

const DIFFERENTIATORS = [
  "Equipo propio de abogados especializados en finca raíz",
  "Base de datos curada de propietarios e inversionistas",
  "Cobertura regional con presencia local en cada municipio",
  "Tarifas preferenciales para clientes afiliados a múltiples servicios",
  "Portal privado para seguimiento de tu proceso en tiempo real",
  "Mediación en conflictos antes de llegar a instancias judiciales",
];

const TICKER_ITEMS = [
  "Gestión inmobiliaria integral",
  "Saneamiento Ley 1561 / 2012",
  "Procesos de pertenencia",
  "Sucesiones notariales y judiciales",
  "Representación en remates",
  "Avalúos certificados",
  "Propiedad horizontal",
  "Créditos hipotecarios",
  "Subdivisiones urbanísticas",
];

const COVERAGE_REGIONS = [
  {
    region: "Caldas",
    cities: ["Anserma", "Riosucio", "Supía", "Belalcázar", "La Merced", "Filadelfia", "Marmato", "Manizales"],
  },
  {
    region: "Risaralda",
    cities: ["Pereira", "Dosquebradas", "La Virginia", "Santa Rosa de Cabal", "Quinchía", "Viterbo"],
  },
];

const slugifyCity = (city = "") =>
  city
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ñ/g, "n")
    .replace(/\s+/g, "-");

/* ─────────────────────────────────────────────────────────── */
/*  COMPONENT                                                  */
/* ─────────────────────────────────────────────────────────── */

const HomePage = () => {
  const navigate = useNavigate();
  const [searchForm, setSearchForm] = useState({
    city: "",
    operation: "",
    type: "",
  });

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();

    if (searchForm.city) params.set("ciudad", searchForm.city);
    if (searchForm.operation) params.set("operacion", searchForm.operation);
    if (searchForm.type) params.set("tipo", searchForm.type);

    const qs = params.toString();
    navigate(qs ? `${PUBLIC_ROUTES.CATALOG}?${qs}` : PUBLIC_ROUTES.CATALOG);
  };

  return (
    <div className="overflow-hidden">
      <SeoHead
        title="Inmobiliaria en Colombia con respaldo jurídico | Rincón Bedoya y Asociados"
        description="Casas, apartamentos, fincas y locales en venta y arriendo en Colombia. Gestión inmobiliaria con verificación jurídica: saneamiento predial, pertenencia, sucesiones y avalúos certificados en Caldas, Risaralda, Quindío, Valle, Antioquia y Bogotá."
        path="/"
        keywords="inmobiliaria colombia, casas en venta colombia, apartamentos en arriendo, fincas en venta, inmobiliaria con abogados, saneamiento predial, avalúos certificados, inmobiliaria caldas, inmobiliaria región cafetera"
        structuredData={[
          buildLocalBusinessSchema(),
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            url: "https://inmobiliaria-ryb-y-asociados.com",
            potentialAction: {
              "@type": "SearchAction",
              target: "https://inmobiliaria-ryb-y-asociados.com/catalogo?q={search_term_string}",
              "query-input": "required name=search_term_string",
            },
          },
          buildFaqSchema(HOMEPAGE_FAQS),
        ]}
      />

      <section className="home-hero section-pad relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-7 relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                <span className="eyebrow">Gestión inmobiliaria integral</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="heading-display mt-6 text-[clamp(2.5rem,5vw+1rem,5rem)]"
              >
                Propiedades con <em>papeles al día</em>,
                <br className="hidden sm:block" />
                decisiones con <em>respaldo legal</em>.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.25 }}
                className="mt-6 text-lg sm:text-xl max-w-xl leading-relaxed"
                style={{ color: "var(--color-text-muted)" }}
              >
                Somos la inmobiliaria que antes de mostrarte una propiedad, la verifica
                jurídicamente. Compra, venta, arriendo, saneamiento y avalúos, con un
                equipo legal propio.
              </motion.p>

              <motion.form
                onSubmit={handleSearch}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.4 }}
                className="search-hero mt-8 max-w-3xl"
                role="search"
                aria-label="Buscar propiedades"
              >
                <div className="search-hero__inputs">
                  <div className="search-hero__field">
                    <label htmlFor="h-city" className="search-hero__field-label">
                      <FaMapMarkerAlt className="inline mr-1 opacity-60" aria-hidden="true" />
                      Ciudad o región
                    </label>
                    <input
                      id="h-city"
                      type="text"
                      placeholder="Anserma, Pereira, Manizales..."
                      value={searchForm.city}
                      onChange={(e) => setSearchForm({ ...searchForm, city: e.target.value })}
                      autoComplete="off"
                    />
                  </div>

                  <div className="search-hero__divider" aria-hidden="true" />

                  <div className="search-hero__field">
                    <label htmlFor="h-op" className="search-hero__field-label">
                      Operación
                    </label>
                    <select
                      id="h-op"
                      value={searchForm.operation}
                      onChange={(e) => setSearchForm({ ...searchForm, operation: e.target.value })}
                    >
                      <option value="">Cualquiera</option>
                      <option value="venta">Comprar</option>
                      <option value="arriendo">Arrendar</option>
                    </select>
                  </div>

                  <div className="search-hero__divider hidden md:block" aria-hidden="true" />

                  <div className="search-hero__field">
                    <label htmlFor="h-type" className="search-hero__field-label">
                      Tipo
                    </label>
                    <select
                      id="h-type"
                      value={searchForm.type}
                      onChange={(e) => setSearchForm({ ...searchForm, type: e.target.value })}
                    >
                      <option value="">Todos</option>
                      <option value="casa">Casa</option>
                      <option value="apartamento">Apartamento</option>
                      <option value="lote">Lote</option>
                      <option value="finca">Finca</option>
                      <option value="local">Local</option>
                      <option value="oficina">Oficina</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="search-hero__submit"
                  aria-label="Buscar propiedades"
                >
                  <FaSearch className="text-sm" />
                  <span>Buscar</span>
                </button>
              </motion.form>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.6 }}
                className="mt-12 grid grid-cols-3 gap-6 max-w-xl"
              >
                <div className="stat-editorial">
                  <span className="stat-editorial__num">
                    <em>11</em>
                  </span>
                  <span className="stat-editorial__label">Servicios integrales</span>
                </div>
                <div className="stat-editorial">
                  <span className="stat-editorial__num">
                    <em>14</em>+
                  </span>
                  <span className="stat-editorial__label">Municipios cubiertos</span>
                </div>
                <div className="stat-editorial">
                  <span className="stat-editorial__num">
                    <em>100</em>%
                  </span>
                  <span className="stat-editorial__label">Verificación jurídica</span>
                </div>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-5 relative hidden lg:block"
            >
              <div className="hero-visual">
                <svg
                  className="absolute inset-0 w-full h-full opacity-20"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <defs>
                    <pattern id="hero-grid" width="48" height="48" patternUnits="userSpaceOnUse">
                      <path
                        d="M 48 0 L 0 0 0 48"
                        fill="none"
                        stroke="rgba(245,158,11,0.35)"
                        strokeWidth="0.5"
                      />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#hero-grid)" />
                </svg>

                <svg
                  className="absolute inset-0 w-full h-full"
                  viewBox="0 0 400 500"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                  preserveAspectRatio="xMidYMid slice"
                >
                  <g fill="none" stroke="rgba(245,158,11,0.22)" strokeWidth="1.5">
                    <rect x="40" y="180" width="60" height="260" />
                    <rect x="110" y="140" width="70" height="300" />
                    <rect x="190" y="220" width="50" height="220" />
                    <rect x="250" y="100" width="80" height="340" />
                    <rect x="340" y="200" width="40" height="240" />
                    <line x1="50" y1="210" x2="90" y2="210" />
                    <line x1="50" y1="240" x2="90" y2="240" />
                    <line x1="50" y1="270" x2="90" y2="270" />
                    <line x1="50" y1="300" x2="90" y2="300" />
                    <line x1="50" y1="330" x2="90" y2="330" />
                    <line x1="120" y1="170" x2="170" y2="170" />
                    <line x1="120" y1="200" x2="170" y2="200" />
                    <line x1="120" y1="230" x2="170" y2="230" />
                    <line x1="120" y1="260" x2="170" y2="260" />
                    <line x1="120" y1="290" x2="170" y2="290" />
                    <line x1="120" y1="320" x2="170" y2="320" />
                    <line x1="260" y1="130" x2="320" y2="130" />
                    <line x1="260" y1="160" x2="320" y2="160" />
                    <line x1="260" y1="190" x2="320" y2="190" />
                    <line x1="260" y1="220" x2="320" y2="220" />
                    <line x1="260" y1="250" x2="320" y2="250" />
                    <line x1="260" y1="280" x2="320" y2="280" />
                    <line x1="260" y1="310" x2="320" y2="310" />
                  </g>

                  <g
                    transform="translate(330,140)"
                    stroke="rgba(251,191,36,0.7)"
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                  >
                    <line x1="0" y1="0" x2="0" y2="28" />
                    <line x1="-14" y1="6" x2="14" y2="6" />
                    <path d="M -14 6 L -18 16 L -10 16 Z" />
                    <path d="M 14 6 L 10 16 L 18 16 Z" />
                    <circle cx="0" cy="0" r="2" fill="rgba(251,191,36,0.7)" />
                  </g>
                </svg>

                <div
                  className="absolute inset-x-0 bottom-0 h-2/3 pointer-events-none"
                  style={{
                    background: "linear-gradient(to top, rgba(2,6,23,0.8) 0%, transparent 100%)",
                  }}
                />

                <div className="hero-visual__badge">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "var(--gradient-gold)" }}
                  >
                    <FaShieldAlt className="text-slate-900" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider opacity-70">
                      Con respaldo legal
                    </p>
                    <p className="font-display text-lg italic leading-tight">
                      100% papeles verificados
                    </p>
                  </div>
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1, duration: 0.7 }}
                className="absolute -left-8 top-10 hidden xl:block max-w-[220px]"
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "1rem",
                  padding: "1rem 1.25rem",
                  boxShadow: "var(--shadow-card)",
                }}
              >
                <FaQuoteLeft className="text-lg mb-2" style={{ color: "#d97706" }} />
                <p
                  className="font-display italic text-sm leading-snug"
                  style={{ color: "var(--color-text)" }}
                >
                  La gestión inmobiliaria sólo tiene amigos, socios y aliados.
                </p>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      <div className="ticker-wrap">
        <div className="ticker-track">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} className="ticker-item">
              <span className="ticker-item__dot" />
              {item}
            </span>
          ))}
        </div>
      </div>

      <section className="section-pad">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-14 lg:mb-20">
            <motion.span
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              className="eyebrow mb-6"
            >
              Por qué elegirnos
            </motion.span>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6 }}
              className="heading-section mt-5 text-4xl sm:text-5xl lg:text-6xl"
            >
              Una inmobiliaria que piensa
              <br className="hidden sm:block" />
              como <em>tu abogado de confianza.</em>
            </motion.h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
            {PILLARS.map((pillar, i) => {
              const Icon = pillar.icon;
              return (
                <motion.div
                  key={pillar.num}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  className="pillar-card"
                >
                  <div className="flex items-start justify-between mb-6">
                    <span className="pillar-card__number">{pillar.num}</span>
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center"
                      style={{
                        background: "rgba(245, 158, 11, 0.1)",
                        color: "var(--color-text)",
                      }}
                    >
                      <Icon style={{ color: "#d97706" }} />
                    </div>
                  </div>

                  <h3
                    className="font-display text-2xl mb-3"
                    style={{ color: "var(--color-text)" }}
                  >
                    {pillar.title}
                  </h3>
                  <p
                    style={{ color: "var(--color-text-muted)" }}
                    className="leading-relaxed"
                  >
                    {pillar.desc}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section
        className="section-pad"
        style={{ background: "var(--color-surface-off)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-end mb-12 lg:mb-16">
            <div className="lg:col-span-7">
              <span className="eyebrow mb-5">Portafolio completo</span>
              <h2 className="heading-section mt-5 text-4xl sm:text-5xl">
                Once servicios, <em>un solo equipo.</em>
              </h2>
            </div>
            <p
              className="lg:col-span-5 text-base lg:text-lg leading-relaxed"
              style={{ color: "var(--color-text-muted)" }}
            >
              Desde un contrato de arriendo simple hasta procesos de pertenencia o
              sucesiones complejas lo hacemos todo. Y lo hacemos con el respaldo de
              nuestra firma jurídica.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
            {SERVICES.map((service, i) => {
              const Icon = service.icon;
              return (
                <motion.div
                  key={service.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.5, delay: i * 0.06 }}
                  className="service-tile"
                >
                  <span className="service-tile__icon">
                    <Icon className="text-xl" />
                  </span>
                  <div>
                    <h3
                      className="font-display text-xl mb-2 leading-tight"
                      style={{ color: "var(--color-text)" }}
                    >
                      {service.title}
                    </h3>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {service.desc}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
            <p style={{ color: "var(--color-text-muted)" }} className="text-sm">
              Necesitas algo que no aparece aquí?{" "}
              <span style={{ color: "var(--color-text)" }} className="font-medium">
                Muy probablemente también lo hacemos.
              </span>
            </p>
            <Link to={PUBLIC_ROUTES.CONTACT} className="btn-ghost">
              Hablar con un asesor <FaArrowRight className="text-sm" />
            </Link>
          </div>
        </div>
      </section>

      <section className="section-pad">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
            <div className="lg:col-span-7">
              <span className="eyebrow mb-5">Cómo trabajamos</span>
              <h2 className="heading-section mt-5 text-4xl sm:text-5xl mb-12">
                Sin sorpresas. <em>Paso a paso.</em>
              </h2>

              <div className="space-y-5">
                {PROCESS.map((step, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    className="process-step"
                  >
                    <span className="process-step__dot">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3
                        className="font-display text-xl mb-2"
                        style={{ color: "var(--color-text)" }}
                      >
                        {step.title}
                      </h3>
                      <p
                        className="leading-relaxed max-w-xl"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        {step.desc}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="lg:sticky lg:top-28">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className="card-soft p-7 sm:p-8"
                >
                  <div className="flex items-center gap-3 mb-5">
                    <FaRegLightbulb style={{ color: "#d97706" }} className="text-lg" />
                    <span
                      className="text-xs font-bold uppercase tracking-[0.15em]"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      Lo que nos diferencia
                    </span>
                  </div>

                  <h3
                    className="font-display text-2xl lg:text-3xl mb-6 leading-tight"
                    style={{ color: "var(--color-text)" }}
                  >
                    Seis detalles que nuestros clientes notan desde la primera reunión.
                  </h3>

                  <div className="space-y-3">
                    {DIFFERENTIATORS.map((item) => (
                      <div key={item} className="differentiator">
                        <span className="differentiator__check">
                          <FaCheckCircle />
                        </span>
                        <span
                          className="text-sm leading-relaxed"
                          style={{ color: "var(--color-text)" }}
                        >
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-pad-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="coverage-panel">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
              <div className="lg:col-span-5">
                <span
                  className="eyebrow mb-5"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    borderColor: "rgba(255,255,255,0.1)",
                    color: "#cbd5e1",
                  }}
                >
                  Cobertura regional
                </span>

                <h2
                  className="heading-section mt-5 text-4xl sm:text-5xl"
                  style={{ color: "#ffffff" }}
                >
                  De Anserma al <em>Eje Cafetero</em>, y creciendo.
                </h2>

                <p
                  className="mt-5 text-base leading-relaxed"
                  style={{ color: "#94a3b8" }}
                >
                  Nuestra base está en Anserma, pero operamos en toda la región cafetera.
                  Si tu propiedad o tu búsqueda está en Caldas, Risaralda o más allá,
                  podemos acompañarte.
                </p>

                <Link
                  to={PUBLIC_ROUTES.CATALOG}
                  className="btn-ghost mt-6 inline-flex"
                  style={{ color: "#fbbf24" }}
                >
                  Explorar todas las propiedades <FaArrowRight className="text-sm" />
                </Link>
              </div>

              <div className="lg:col-span-7 space-y-6">
                {COVERAGE_REGIONS.map((region) => (
                  <div key={region.region}>
                    <div className="flex items-center gap-3 mb-4">
                      <span
                        className="font-display text-xl italic"
                        style={{ color: "#fbbf24" }}
                      >
                        {region.region}
                      </span>
                      <span
                        className="flex-1 h-px"
                        style={{
                          background: "linear-gradient(to right, rgba(251,191,36,0.3), transparent)",
                        }}
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {region.cities.map((city) => (
                        <Link
                          key={city}
                          to={`/propiedades/zona/${slugifyCity(city)}`}
                          className="city-tag"
                        >
                          <span className="city-tag__dot" />
                          {city}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}

                <div
                  className="mt-6 pt-6 border-t flex items-start gap-3"
                  style={{ borderColor: "rgba(255,255,255,0.08)" }}
                >
                  <FaMapMarkerAlt
                    className="text-lg flex-shrink-0 mt-0.5"
                    style={{ color: "#fbbf24" }}
                  />
                  <p className="text-sm leading-relaxed" style={{ color: "#94a3b8" }}>
                    <span
                      className="font-display italic text-base"
                      style={{ color: "#e2e8f0" }}
                    >
                      En expansión
                    </span>
                    <br />
                    Estamos abriendo operación en nuevos departamentos. Si tu zona no está
                    listada, <Link to={PUBLIC_ROUTES.CONTACT} className="underline" style={{ color: "#fbbf24" }}>escríbenos</Link>; probablemente podamos ayudarte.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-pad-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="eyebrow">Tu próximo paso</span>
            <h2 className="heading-section mt-5 text-4xl sm:text-5xl">
              Buscas o <em>tienes</em> una propiedad?
            </h2>
          </div>

          <div className="cta-split">
            <div className="cta-split__panel">
              <span
                className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em]"
                style={{ color: "var(--color-text-muted)" }}
              >
                <FaSearch style={{ color: "#d97706" }} />
                Para compradores
              </span>

              <h3 className="cta-split__title">
                Encuentra tu próxima propiedad
                <br />
                <em>con papeles al día.</em>
              </h3>

              <p className="cta-split__desc">
                Explora propiedades verificadas, con historial jurídico revisado y
                acompañamiento en cada paso del proceso de compra.
              </p>

              <div className="flex flex-wrap gap-3 mt-auto pt-2">
                <Link to={PUBLIC_ROUTES.CATALOG} className="btn-primary">
                  Ver propiedades <FaArrowRight className="text-xs" />
                </Link>
                <Link to={PUBLIC_ROUTES.CONTACT} className="btn-secondary">
                  Agendar asesoría
                </Link>
              </div>
            </div>

            <div className="cta-split__panel cta-split__panel--dark">
              <span
                className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em]"
                style={{ color: "#fbbf24" }}
              >
                <FaHome />
                Para propietarios
              </span>

              <h3 className="cta-split__title">
                Publica tu inmueble
                <br />
                <em>y déjanos el resto.</em>
              </h3>

              <p className="cta-split__desc">
                Desde la valoración hasta la firma en notaría gestionamos la difusión,
                los visitantes, la negociación y la documentación legal.
              </p>

              <div className="flex flex-wrap gap-3 mt-auto pt-2">
                <a
                  href="https://wa.me/573105968202?text=Hola,%20quiero%20publicar%20mi%20propiedad"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                >
                  <FaWhatsapp />
                  Publicar mi propiedad
                </a>

                <Link
                  to={PUBLIC_ROUTES.CONTACT}
                  className="btn-secondary"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    borderColor: "rgba(255,255,255,0.15)",
                    color: "#e2e8f0",
                  }}
                >
                  Solicitar avalúo
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-pad-sm pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="portal-teaser">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center relative">
              <div className="md:col-span-7">
                <span className="eyebrow">Portal del cliente</span>
                <h2 className="heading-section mt-5 text-3xl sm:text-4xl">
                  Tu proceso inmobiliario,
                  <br />
                  <em>siempre a un clic.</em>
                </h2>

                <p
                  className="mt-4 text-base leading-relaxed max-w-xl"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Agenda visitas, sigue el estado de tu contrato, consulta pagos de
                  arriendo y recibe notificaciones en tiempo real. Todo en un solo lugar.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link to="/acceso-clientes" className="btn-primary">
                    Crear mi portal <FaArrowRight className="text-xs" />
                  </Link>
                  <Link to="/acceso-clientes" className="btn-ghost">
                    Ya tengo cuenta
                  </Link>
                </div>
              </div>

              <div className="md:col-span-5 relative">
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{
                    background: "var(--color-surface-2)",
                    border: "1px solid var(--color-border)",
                    boxShadow: "0 20px 50px -20px rgba(60,40,10,0.25)",
                  }}
                >
                  <div
                    className="flex items-center gap-1.5 px-4 py-2.5"
                    style={{
                      borderBottom: "1px solid var(--color-divider)",
                      background: "var(--color-surface)",
                    }}
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#ef4444" }} />
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#f59e0b" }} />
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#22c55e" }} />
                    <span
                      className="ml-3 text-xs font-mono"
                      style={{ color: "var(--color-text-faint)" }}
                    >
                      mi-portal
                    </span>
                  </div>

                  <div className="p-5 space-y-4">
                    <div>
                      <p
                        className="text-[10px] font-bold uppercase tracking-[0.15em]"
                        style={{ color: "var(--color-text-faint)" }}
                      >
                        Tu proceso activo
                      </p>
                      <p
                        className="font-display text-lg mt-1"
                        style={{ color: "var(--color-text)" }}
                      >
                        Compra <em style={{ color: "#d97706" }}>Casa en Anserma</em>
                      </p>
                    </div>

                    <div className="space-y-2">
                      {[
                        { label: "Documentación", done: true },
                        { label: "Verificación jurídica", done: true },
                        { label: "Firma en notaría", done: false, active: true },
                        { label: "Entrega", done: false },
                      ].map((s) => (
                        <div key={s.label} className="flex items-center gap-2.5">
                          <span
                            className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] flex-shrink-0"
                            style={{
                              background: s.done
                                ? "#d97706"
                                : s.active
                                ? "rgba(245,158,11,0.15)"
                                : "var(--color-surface-off)",
                              color: s.done ? "#fff" : "#d97706",
                              border: s.active ? "1px solid #d97706" : "none",
                            }}
                          >
                            {s.done ? "✓" : s.active ? "•" : ""}
                          </span>
                          <span
                            className="text-xs"
                            style={{
                              color:
                                s.done || s.active
                                  ? "var(--color-text)"
                                  : "var(--color-text-faint)",
                              fontWeight: s.active ? 600 : 400,
                            }}
                          >
                            {s.label}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div
                      className="pt-3 mt-3 flex items-center justify-between text-xs"
                      style={{
                        borderTop: "1px solid var(--color-divider)",
                        color: "var(--color-text-muted)",
                      }}
                    >
                      <span>Próxima visita</span>
                      <span
                        className="font-semibold"
                        style={{ color: "var(--color-text)" }}
                      >
                        Vie 25 Abr · 10:00 a.m.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-pad-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="fine-divider mb-8">R-B</div>
          <motion.blockquote
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="heading-display text-3xl sm:text-4xl lg:text-5xl leading-tight"
          >
            La gestión inmobiliaria sólo tiene
            <br className="hidden sm:block" />
            <em>amigos, socios y aliados.</em>
            <br className="hidden sm:block" />
            La competencia no es un problema,
            <br className="hidden sm:block" />
            es <em>una oportunidad.</em>
          </motion.blockquote>
          <p
            className="mt-8 text-sm font-semibold uppercase tracking-[0.2em]"
            style={{ color: "var(--color-text-muted)" }}
          >
            Filosofía R-B &amp; Asociados
          </p>
        </div>
      </section>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  <SeoTextBlock
    title="Todo sobre bienes raíces en Colombia"
    paragraphs={[
      "En Inmobiliaria Rincón Bedoya y Asociados integramos la experiencia inmobiliaria con el respaldo jurídico que exige cada operación. Somos un equipo de asesores y abogados especializados en compraventa, arriendo, saneamiento predial, sucesiones y avalúos certificados en Colombia.",
      "Nuestra sede principal está en Anserma, Caldas, y atendemos activamente en Manizales, Pereira, Armenia, Dosquebradas, Riosucio, Supía, Belalcázar y toda la región cafetera. En expansión nacional cubrimos Bogotá, Medellín, Cali, Bucaramanga, Barranquilla, Cartagena, Santa Marta, Cúcuta, Ibagué y Villavicencio.",
      "Cada propiedad que publicamos pasa por una revisión jurídica inicial: certificado de tradición y libertad, paz y salvos de predial y valorización, estado de la matrícula inmobiliaria, servidumbres y afectaciones. Esto reduce el riesgo para compradores, arrendatarios y propietarios.",
    ]}
    faqs={HOMEPAGE_FAQS}
    relatedLinks={[
      { label: "Casas en venta en Colombia", url: "/propiedades/zona/casas-en-venta-colombia" },
      { label: "Apartamentos en arriendo", url: "/propiedades/zona/apartamentos-en-arriendo-colombia" },
      { label: "Fincas en venta", url: "/propiedades/zona/fincas-en-venta-colombia" },
      { label: "Propiedades en Manizales", url: "/propiedades/zona/manizales" },
      { label: "Propiedades en Pereira", url: "/propiedades/zona/pereira" },
      { label: "Propiedades en Anserma", url: "/propiedades/zona/anserma" },
      { label: "Propiedades en Armenia", url: "/propiedades/zona/armenia" },
      { label: "Propiedades en Dosquebradas", url: "/propiedades/zona/dosquebradas" },
      { label: "Hub Caldas", url: "/propiedades/departamento/caldas" },
      { label: "Hub Risaralda", url: "/propiedades/departamento/risaralda" },
      { label: "Hub Quindío", url: "/propiedades/departamento/quindio" },
      { label: "Hub Antioquia", url: "/propiedades/departamento/antioquia" },
    ]}
    relatedTitle="Explora por zona o tipo"
  />
</section>
    </div>
  );
};

export default HomePage;