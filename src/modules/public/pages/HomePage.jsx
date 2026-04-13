import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import {
  FaSearch, FaHome, FaCheckCircle, FaBalanceScale,
  FaBuilding, FaKey, FaGavel, FaFileContract,
  FaHandshake, FaShieldAlt, FaPhone, FaUserTie,
  FaWhatsapp
} from "react-icons/fa";
import { PUBLIC_ROUTES } from "../../../core/config/routes.config";

const serviceColorMap = {
  primary: {
    border: "border-primary/30 hover:border-primary/60",
    bg: "bg-primary/20",
    text: "text-primary"
  },
  "blue-500": {
    border: "border-blue-500/30 hover:border-blue-500/60",
    bg: "bg-blue-500/20",
    text: "text-blue-500"
  },
  "green-500": {
    border: "border-green-500/30 hover:border-green-500/60",
    bg: "bg-green-500/20",
    text: "text-green-500"
  },
  "purple-500": {
    border: "border-purple-500/30 hover:border-purple-500/60",
    bg: "bg-purple-500/20",
    text: "text-purple-500"
  },
  "orange-500": {
    border: "border-orange-500/30 hover:border-orange-500/60",
    bg: "bg-orange-500/20",
    text: "text-orange-500"
  },
  "red-500": {
    border: "border-red-500/30 hover:border-red-500/60",
    bg: "bg-red-500/20",
    text: "text-red-500"
  }
};

const HomePage = () => {
  return (
  <div className="overflow-hidden">
    <Helmet>
      <title>Inmobiliaria Rincón Bedoya y Asociados | Anserma, Caldas</title>
      <meta name="description" content="Compra, vende o arrienda casas, apartamentos, lotes y fincas en Anserma, Riosucio, Supía, Belalcázar y Caldas. Asesoría jurídica especializada en finca raíz. Inmobiliaria Rincón Bedoya y Asociados." />
      <link rel="canonical" href="https://inmobiliaria-ryb-y-asociados.com/" />
      <meta property="og:title" content="Inmobiliaria Rincón Bedoya y Asociados | Anserma, Caldas" />
      <meta property="og:description" content="Tu inmobiliaria de confianza en Anserma, Caldas. Casas, apartamentos, lotes y fincas para compra, venta y arriendo." />
      <meta property="og:url" content="https://inmobiliaria-ryb-y-asociados.com/" />
      <meta property="og:image" content="https://inmobiliaria-ryb-y-asociados.com/logo.jpg.png" />
      <meta property="og:type" content="website" />
    </Helmet>

    <motion.section
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}
      className="relative min-h-[78vh] sm:min-h-[85vh] lg:min-h-[90vh] flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden"
    >
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-10 w-56 h-56 sm:w-72 sm:h-72 bg-primary rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-72 h-72 sm:w-96 sm:h-96 bg-blue-500 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 text-center">
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.8 }}>
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white mb-5 sm:mb-6 leading-tight">
            Tu próxima propiedad
            <span className="block text-primary mt-2">está aquí</span>
          </h1>
        </motion.div>
        <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.8 }} className="text-slate-300 text-base sm:text-lg lg:text-2xl max-w-3xl mx-auto mb-8 sm:mb-12">
          Gestión inmobiliaria integral con respaldo jurídico especializado.
          Encuéntranos en Anserma y municipios aledaños
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.8 }} className="flex flex-col items-center gap-5">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center w-full">
            <Link to={PUBLIC_ROUTES.CATALOG} className="group relative w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-primary hover:bg-yellow-500 text-slate-950 font-bold text-base sm:text-lg rounded-xl shadow-2xl hover:shadow-primary/50 transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-3">
              <FaSearch className="text-lg sm:text-xl" /> Buscar Propiedades
            </Link>
            <a href="https://wa.me/573105968202?text=Hola,%20quiero%20informaci%C3%B3n%20para%20vender/arrendar%20mi%20propiedad" target="_blank" rel="noopener noreferrer" className="group relative w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold text-base sm:text-lg rounded-xl border-2 border-primary/50 hover:border-primary shadow-2xl transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-3">
              <FaHome className="text-lg sm:text-xl" /> Vender / Arrendar
            </a>
          </div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9, duration: 0.6 }} className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 w-full max-w-3xl">
            <div className="flex flex-col items-center sm:items-end text-center sm:text-right">
              <div className="flex items-center gap-2 mb-1">
                <FaSearch className="text-primary text-sm" />
                <span className="text-slate-300 text-sm font-semibold">Para Compradores</span>
              </div>
              <p className="text-slate-400 text-xs">Encuentra tu propiedad ideal</p>
            </div>
            <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
              <div className="flex items-center gap-2 mb-1">
                <FaHome className="text-primary text-sm" />
                <span className="text-slate-300 text-sm font-semibold">Para Propietarios</span>
              </div>
              <p className="text-slate-400 text-xs">Publica tu inmueble con nosotros</p>
            </div>
          </motion.div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1, duration: 0.8 }} className="mt-8 sm:mt-10 inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-slate-800/50 backdrop-blur-sm rounded-full border border-primary/30">
          <FaBalanceScale className="text-primary text-lg sm:text-xl" />
          <span className="text-slate-300 text-xs sm:text-sm font-medium">Respaldo jurídico especializado</span>
        </motion.div>
      </div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4, duration: 0.8 }} className="hidden sm:block absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="w-6 h-10 border-2 border-primary rounded-full flex justify-center p-2">
          <motion.div animate={{ y: [0, 12, 0] }} transition={{ duration: 1.5, repeat: Infinity }} className="w-1.5 h-1.5 bg-primary rounded-full" />
        </div>
      </motion.div>
    </motion.section>

    <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-b from-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }} className="text-center mb-10 sm:mb-14 lg:mb-16">
          <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-white mb-3 sm:mb-4">¿Qué estás buscando?</h2>
          <p className="text-slate-400 text-sm sm:text-base lg:text-lg max-w-2xl mx-auto">Soluciones personalizadas para compradores y propietarios</p>
        </motion.div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          <motion.div initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }} viewport={{ once: true }} className="card-soft p-6 sm:p-8 border-2 border-primary/30 hover:border-primary/60 transition-all duration-300 group">
            <div className="flex items-center gap-4 mb-5 sm:mb-6">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-primary/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <FaSearch className="text-primary text-2xl sm:text-3xl" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-primary">Para Compradores</h3>
            </div>
            <ul className="space-y-3 sm:space-y-4">
              {["Asesoría personalizada en tu búsqueda","Verificación jurídica completa de propiedades","Gestión de créditos hipotecarios y financiación","Acompañamiento en trámites notariales","Inspección y avaluó profesional","Negociación directa con propietarios"].map((item, i) => (
                <motion.li key={i} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1 }} viewport={{ once: true }} className="flex items-start gap-3">
                  <FaCheckCircle className="text-primary mt-1 flex-shrink-0" />
                  <span className="text-slate-300 text-sm sm:text-base">{item}</span>
                </motion.li>
              ))}
            </ul>
            <Link to={PUBLIC_ROUTES.CATALOG} className="mt-7 sm:mt-8 w-full button-gold inline-flex items-center justify-center gap-2">Ver propiedades disponibles <FaSearch /></Link>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }} viewport={{ once: true }} className="card-soft p-6 sm:p-8 border-2 border-blue-500/30 hover:border-blue-500/60 transition-all duration-300 group">
            <div className="flex items-center gap-4 mb-5 sm:mb-6">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <FaHome className="text-blue-500 text-2xl sm:text-3xl" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-blue-500">Para Propietarios</h3>
            </div>
            <ul className="space-y-3 sm:space-y-4">
              {["Publicidad en múltiples plataformas","Fotografía y videos profesionales","Gestión integral de contratos de arriendo","Verificación de inquilinos/compradores","Asesoría jurídica en todo el proceso","Avaluó profesional"].map((item, i) => (
                <motion.li key={i} initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1 }} viewport={{ once: true }} className="flex items-start gap-3">
                  <FaCheckCircle className="text-blue-500 mt-1 flex-shrink-0" />
                  <span className="text-slate-300 text-sm sm:text-base">{item}</span>
                </motion.li>
              ))}
            </ul>
            <a href="https://wa.me/573105968202?text=Hola,%20quiero%20vender/arrendar%20mi%20propiedad" target="_blank" rel="noopener noreferrer" className="mt-7 sm:mt-8 w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300">
              Publicar mi propiedad <FaWhatsapp />
            </a>
          </motion.div>
        </div>
      </div>
    </section>

    <section className="py-12 sm:py-16 lg:py-20 bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }} className="text-center mb-10 sm:mb-14 lg:mb-16">
          <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-white mb-3 sm:mb-4">Servicios Especializados</h2>
          <p className="text-slate-400 text-sm sm:text-base lg:text-lg max-w-2xl mx-auto">Con respaldo de nuestro equipo jurídico profesional</p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-8">
          {[
            { icon: FaBuilding,     title: "Compra y Venta",              description: "Propiedades urbanas y rurales con verificación del estado jurídico completo.",                     color: "primary",    delay: 0.1 },
            { icon: FaKey,          title: "Arriendo y Administración",   description: "Gestión de contratos: vivienda, locales comerciales, turismo y aparcerías.",              color: "blue-500",   delay: 0.2 },
            { icon: FaGavel,        title: "Saneamiento Jurídico",        description: "Pertenencia, falsas tradiciones, pequeña propiedad rural (Ley 1561/2012).",                color: "green-500",  delay: 0.3 },
            { icon: FaFileContract, title: "Sucesiones y Remates",        description: "Levantamiento de sucesiones notariales y representación en remates judiciales.",         color: "purple-500", delay: 0.4 },
            { icon: FaHandshake,    title: "Créditos Hipotecarios",       description: "Asesoría y gestión de financiación con bancos e inversionistas privados.",              color: "orange-500", delay: 0.5 },
            { icon: FaShieldAlt,    title: "Avalúos y Proyectos",        description: "Asesoría en Avaluüos certificados, subdivisión de lotes y reglamentos de PH.",    color: "red-500",    delay: 0.6 },
          ].map((service, index) => {
            const c = serviceColorMap[service.color] ?? serviceColorMap.primary;
            return (
              <motion.div key={index} initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: service.delay, duration: 0.6 }} viewport={{ once: true }} whileHover={{ y: -10, scale: 1.02 }} className={`card-soft p-5 sm:p-6 text-center border border-slate-800 ${c.border} transition-all duration-300 group`}>
                <div className={`w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 ${c.bg} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <service.icon className={`${c.text} text-3xl sm:text-4xl`} />
                </div>
                <h3 className="text-light font-bold text-lg sm:text-xl mb-2 sm:mb-3">{service.title}</h3>
                <p className="text-muted text-sm leading-relaxed">{service.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>

    <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-b from-slate-950 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }} className="text-center mb-10 sm:mb-14 lg:mb-16">
          <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-white mb-3 sm:mb-4">¿Cómo trabajamos?</h2>
          <p className="text-slate-400 text-sm sm:text-base lg:text-lg max-w-2xl mx-auto">Un proceso simple, transparente y seguro</p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {[
            { step: "01", title: "Contacto Inicial",   desc: "Cuéntanos tus necesidades",      icon: FaPhone        },
            { step: "02", title: "Asesoría Experta",   desc: "Te guiamos en todo el proceso",  icon: FaUserTie      },
            { step: "03", title: "Verificación Legal", desc: "Revisamos todo jurídicamente",   icon: FaBalanceScale },
            { step: "04", title: "Cierre Exitoso",     desc: "Tu negocio seguro y exitoso",    icon: FaCheckCircle  },
          ].map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15, duration: 0.6 }} viewport={{ once: true }} className="relative">
              <div className="card-soft p-5 sm:p-6 text-center hover:border-primary/50 transition-all duration-300">
                <div className="text-primary text-5xl sm:text-6xl font-bold opacity-20 mb-2">{item.step}</div>
                <item.icon className="text-primary text-3xl sm:text-4xl mx-auto mb-4" />
                <h3 className="text-white font-bold text-base sm:text-lg mb-2">{item.title}</h3>
                <p className="text-slate-400 text-sm">{item.desc}</p>
              </div>
              {i < 3 && <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-0.5 bg-primary/30" />}
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    <section className="py-12 sm:py-16 lg:py-20 bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }} className="card-soft p-6 sm:p-10 lg:p-12 text-center border-2 border-primary/30">
          <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-white mb-4 sm:mb-6">¿Listo para dar el siguiente paso?</h2>
          <p className="text-slate-300 text-sm sm:text-base lg:text-lg mb-6 sm:mb-8 max-w-2xl mx-auto">Nuestro equipo de profesionales está listo para asesorarte en tu próximo proyecto inmobiliario</p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <a href="https://wa.me/573105968202?text=Hola,%20quiero%20informaci%C3%B3n%20sobre%20propiedades" target="_blank" rel="noopener noreferrer" className="button-gold inline-flex items-center justify-center gap-3 text-base sm:text-lg px-6 sm:px-8 py-3.5 sm:py-4">
              <FaWhatsapp className="text-xl sm:text-2xl" /> Contactar por WhatsApp
            </a>
            <Link to={PUBLIC_ROUTES.CATALOG} className="inline-flex items-center justify-center gap-3 text-base sm:text-lg px-6 sm:px-8 py-3.5 sm:py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border-2 border-primary/50 hover:border-primary shadow-xl transition-all duration-300 transform hover:scale-[1.02]">
              Ver Catálogo Completo <FaSearch />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  </div>
);
};

export default HomePage;