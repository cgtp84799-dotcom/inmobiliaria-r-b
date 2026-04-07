import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
} from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";

import {
  FaBuilding,
  FaKey,
  FaGavel,
  FaFileContract,
  FaHandshake,
  FaShieldAlt,
  FaWhatsapp,
  FaInstagram,
  FaFacebook,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaClock,
  FaHome,
  FaSearch,
  FaCheckCircle,
  FaBalanceScale,
  FaUserTie,
} from "react-icons/fa";

import PublicLayout from "./shared/components/Layout/PublicLayout";
import AdminLayout from "./shared/components/Layout/AdminLayout";
import ScrollToTop from "./shared/components/ScrollToTop";
import { AuthProvider, useAuth } from "./core/contexts/AuthContext";
import {
  PUBLIC_ROUTES,
  PRIVATE_ROUTES,
  AUTH_ROUTES,
} from "./core/config/routes.config";

import {
  requestNotificationPermission,
  initializeMessaging,
} from "./core/services/notificationService";

import AuthPage from "./modules/auth/pages/AuthPage";
import CatalogPage from "./modules/public/pages/CatalogPage";
import PropertyDetailPage from "./modules/public/pages/PropertyDetailPage";
import AccessRequestPage from "./modules/users/pages/AccessRequestPage";
import ProtectedRoute from "./shared/components/ProtectedRoute";
import SettingsFab from "./shared/components/UI/SettingsFab";
import LocationPage from "./modules/public/pages/LocationPage";
import ProfilePage from "./modules/profile/pages/ProfilePage";

const VisitsPage        = lazy(() => import("./modules/visits/pages/VisitsPage"));
const ScheduleVisitPage = lazy(() => import("./modules/visits/pages/ScheduleVisitPage"));

const DashboardPage      = lazy(() => import("./modules/dashboard/pages/DashboardPage"));
const PropertyManagement = lazy(() => import("./modules/properties/pages/PropertyManagement"));
const ClientManagement   = lazy(() => import("./modules/clients/pages/ClientManagement"));
const ContractsPage      = lazy(() => import("./modules/contracts/pages/ContractsPage"));
const DocumentsPage      = lazy(() => import("./modules/documents/pages/DocumentsPage"));
const ContactsPage       = lazy(() => import("./modules/contacts/pages/ContactsPage"));
const CalendarPage       = lazy(() => import("./modules/calendar/pages/CalendarPage"));
const UsersPage          = lazy(() => import("./modules/users/pages/UsersPage"));
const RequestsPage       = lazy(() => import("./modules/users/pages/RequestsPage"));

// ─────────────────────────────────────────────────────────────────────────────
const PageLoader = () => (
  <div className="flex items-center justify-center h-[60vh]">
    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
const NotificationInitializer = () => {
  const { currentUser } = useAuth();

  useEffect(() => {
    initializeMessaging();

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/firebase-messaging-sw.js")
        .then((r) => console.log("✅ SW registrado:", r.scope))
        .catch((e) => console.error("❌ SW error:", e));
    }

    if (currentUser?.email) {
      const t = setTimeout(() => requestNotificationPermission(currentUser.email), 3000);
      return () => clearTimeout(t);
    }
  }, [currentUser]);

  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
const serviceColorMap = {
  primary:    { bg: "bg-primary/10",    text: "text-primary",    border: "hover:border-primary/50"    },
  "blue-500": { bg: "bg-blue-500/10",   text: "text-blue-500",   border: "hover:border-blue-500/50"   },
  "green-500":{ bg: "bg-green-500/10",  text: "text-green-500",  border: "hover:border-green-500/50"  },
  "purple-500":{ bg: "bg-purple-500/10",text: "text-purple-500", border: "hover:border-purple-500/50" },
  "orange-500":{ bg: "bg-orange-500/10",text: "text-orange-500", border: "hover:border-orange-500/50" },
  "red-500":  { bg: "bg-red-500/10",    text: "text-red-500",    border: "hover:border-red-500/50"    },
};

// ─────────────────────────────────────────────────────────────────────────────
// Página de inicio pública
// ─────────────────────────────────────────────────────────────────────────────
const HomePage = () => (
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

    {/* ── Hero ── */}
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
              <FaSearch className="text-lg sm:text-xl" />
              Buscar Propiedades
            </Link>
            <a href="https://wa.me/573105968202?text=Hola,%20quiero%20información%20para%20vender/arrendar%20mi%20propiedad" target="_blank" rel="noopener noreferrer" className="group relative w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold text-base sm:text-lg rounded-xl border-2 border-primary/50 hover:border-primary shadow-2xl transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-3">
              <FaHome className="text-lg sm:text-xl" />
              Vender / Arrendar
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

    {/* ── Para compradores / propietarios ── */}
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
              {["Asesoría personalizada en tu búsqueda","Verificación jurídica completa de propiedades","Gestión de créditos hipotecarios y financiación","Acompañamiento en trámites notariales","Inspección y avalúo profesional","Negociación directa con propietarios"].map((item, i) => (
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
              {["Publicidad en múltiples plataformas","Fotografía y videos profesionales","Gestión integral de contratos de arriendo","Verificación de inquilinos/compradores","Asesoría jurídica en todo el proceso","Avalúo profesional"].map((item, i) => (
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

    {/* ── Servicios especializados ── */}
    <section className="py-12 sm:py-16 lg:py-20 bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }} className="text-center mb-10 sm:mb-14 lg:mb-16">
          <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-white mb-3 sm:mb-4">Servicios Especializados</h2>
          <p className="text-slate-400 text-sm sm:text-base lg:text-lg max-w-2xl mx-auto">Con respaldo de nuestro equipo jurídico profesional</p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-8">
          {[
            { icon: FaBuilding,     title: "Compra y Venta",              description: "Propiedades urbanas y rurales con verificación del estado jurídico completo.",                                       color: "primary",    delay: 0.1 },
            { icon: FaKey,          title: "Arriendo y Administración",   description: "Gestión de contratos: vivienda, locales comerciales, turismo y aparcerías.",                                color: "blue-500",   delay: 0.2 },
            { icon: FaGavel,        title: "Saneamiento Jurídico",        description: "Pertenencia, falsas tradiciones, pequeña propiedad rural (Ley 1561/2012).",                                  color: "green-500",  delay: 0.3 },
            { icon: FaFileContract, title: "Sucesiones y Remates",        description: "Levantamiento de sucesiones notariales y representación en remates judiciales.",                             color: "purple-500", delay: 0.4 },
            { icon: FaHandshake,    title: "Créditos Hipotecarios",       description: "Asesoría y gestión de financiación con bancos e inversionistas privados.",                                  color: "orange-500", delay: 0.5 },
            { icon: FaShieldAlt,    title: "Avalúos y Proyectos",         description: "Asesoría en Avalúos certificados, subdivisión de lotes y reglamentos de propiedad horizontal.",            color: "red-500",    delay: 0.6 },
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

    {/* ── Cómo trabajamos ── */}
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
            { step: "03", title: "Verificación Legal", desc: "Revisamos todo jurídicamente",    icon: FaBalanceScale },
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

    {/* ── CTA final ── */}
    <section className="py-12 sm:py-16 lg:py-20 bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }} className="card-soft p-6 sm:p-10 lg:p-12 text-center border-2 border-primary/30">
          <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-white mb-4 sm:mb-6">¿Listo para dar el siguiente paso?</h2>
          <p className="text-slate-300 text-sm sm:text-base lg:text-lg mb-6 sm:mb-8 max-w-2xl mx-auto">Nuestro equipo de profesionales está listo para asesorarte en tu próximo proyecto inmobiliario</p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <a href="https://wa.me/573105968202?text=Hola,%20quiero%20información%20sobre%20propiedades" target="_blank" rel="noopener noreferrer" className="button-gold inline-flex items-center justify-center gap-3 text-base sm:text-lg px-6 sm:px-8 py-3.5 sm:py-4">
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

// ─────────────────────────────────────────────────────────────────────────────
// Página de contacto pública
// ─────────────────────────────────────────────────────────────────────────────
const ContactPage = () => (
  <div className="max-w-5xl mx-auto py-7 sm:py-12 lg:py-14 px-4 sm:px-6">
    <Helmet>
      <title>Contáctanos | Inmobiliaria Rincón Bedoya y Asociados</title>
      <meta name="description" content="Comunícate con Inmobiliaria Rincón Bedoya y Asociados. WhatsApp: 310 596 8202. Oficina en Cra 5 No. 9-28, Anserma, Caldas. Atención de lunes a sábado." />
      <link rel="canonical" href="https://inmobiliaria-ryb-y-asociados.com/contacto" />
      <meta property="og:title" content="Contáctanos | Inmobiliaria Rincón Bedoya y Asociados" />
      <meta property="og:description" content="WhatsApp, teléfono, email y dirección física. Atención personalizada en Anserma, Caldas." />
      <meta property="og:url" content="https://inmobiliaria-ryb-y-asociados.com/contacto" />
      <meta property="og:image" content="https://inmobiliaria-ryb-y-asociados.com/logo.jpg.png" />
    </Helmet>

    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center mb-7 sm:mb-12 lg:mb-14">
      <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-2 sm:mb-4">Contáctanos</h1>
      <p className="text-slate-300 text-sm sm:text-base lg:text-lg max-w-2xl mx-auto leading-relaxed">Estamos aquí para ayudarte. Comunícate con nosotros por tu canal preferido y un asesor te atenderá de inmediato.</p>
    </motion.div>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8 sm:mb-12 lg:mb-14">
      <motion.a href="https://wa.me/573105968202?text=Hola,%20quiero%20información%20sobre%20propiedades" target="_blank" rel="noopener noreferrer" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-gradient-to-br from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 p-4 sm:p-7 rounded-2xl text-center shadow-xl hover:shadow-2xl transition-all duration-300 text-white group transform hover:-translate-y-1 hover:scale-[1.02]">
        <FaWhatsapp className="text-3xl sm:text-5xl mx-auto mb-3 group-hover:scale-110 transition-transform" />
        <h3 className="text-base sm:text-xl font-extrabold mb-1">WhatsApp</h3>
        <p className="text-xs sm:text-sm opacity-90">Chatea con nosotros</p>
      </motion.a>
      <motion.a href="https://instagram.com/inmobiliaria_ryb" target="_blank" rel="noopener noreferrer" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-gradient-to-br from-pink-600 via-purple-600 to-indigo-600 hover:from-pink-500 hover:via-purple-500 hover:to-indigo-500 p-4 sm:p-7 rounded-2xl text-center shadow-xl hover:shadow-2xl transition-all duration-300 text-white group transform hover:-translate-y-1 hover:scale-[1.02]">
        <FaInstagram className="text-3xl sm:text-5xl mx-auto mb-3 group-hover:scale-110 transition-transform" />
        <h3 className="text-base sm:text-xl font-extrabold mb-1">Instagram</h3>
        <p className="text-xs sm:text-sm opacity-90">@inmobiliaria_ryb</p>
      </motion.a>
      <motion.a href="https://www.facebook.com/share/17piE61vjU/" target="_blank" rel="noopener noreferrer" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 p-4 sm:p-7 rounded-2xl text-center shadow-xl hover:shadow-2xl transition-all duration-300 text-white group transform hover:-translate-y-1 hover:scale-[1.02]">
        <FaFacebook className="text-3xl sm:text-5xl mx-auto mb-3 group-hover:scale-110 transition-transform" />
        <h3 className="text-base sm:text-xl font-extrabold mb-1">Facebook</h3>
        <p className="text-xs sm:text-sm opacity-90">Síguenos</p>
      </motion.a>
      <motion.a href="mailto:inmojuridi09@gmail.com" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-gradient-to-br from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 p-4 sm:p-7 rounded-2xl text-center shadow-xl hover:shadow-2xl transition-all duration-300 text-slate-950 group transform hover:-translate-y-1 hover:scale-[1.02]">
        <FaEnvelope className="text-3xl sm:text-5xl mx-auto mb-3 group-hover:scale-110 transition-transform" />
        <h3 className="text-base sm:text-xl font-extrabold mb-1">Email</h3>
        <p className="text-xs sm:text-sm opacity-90 font-semibold">Escríbenos</p>
      </motion.a>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
      <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }} className="card-soft p-5 sm:p-8">
        <h2 className="text-lg sm:text-2xl font-bold text-primary mb-5">Información de contacto</h2>
        <div className="space-y-5">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0"><FaPhone className="text-primary text-base" /></div>
            <div><h3 className="text-light font-semibold mb-1">Teléfonos</h3><p className="text-muted text-sm">310 596 8202</p><p className="text-muted text-sm">320 673 6391</p></div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0"><FaEnvelope className="text-primary text-base" /></div>
            <div className="min-w-0"><h3 className="text-light font-semibold mb-1">Correo electrónico</h3><a href="mailto:inmojuridi09@gmail.com" className="text-primary text-sm hover:underline break-all">inmojuridi09@gmail.com</a></div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0"><FaMapMarkerAlt className="text-primary text-base" /></div>
            <div><h3 className="text-light font-semibold mb-1">Dirección</h3><p className="text-muted text-sm">Cra 5 No. 9 - 28</p><p className="text-muted text-sm">Anserma, Caldas, Colombia</p></div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0"><FaClock className="text-primary text-base" /></div>
            <div>
              <h3 className="text-light font-semibold mb-2">Horarios de atención</h3>
              <div className="text-muted text-sm space-y-1">
                <p><span className="text-light font-medium">Lunes a Viernes:</span> 8:00 AM - 12:30 PM / 2:00 PM - 5:30 PM</p>
                <p><span className="text-light font-medium">Sábados:</span> 8:30 AM - 1:00 PM</p>
                <p className="text-slate-400 italic">No se atiende domingos ni festivos</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }} className="card-soft p-2 h-full min-h-[260px] sm:min-h-[380px]">
        <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3972.6886447157144!2d-75.78463!3d5.23889!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e4737a74c4e5555%3A0x1234567890abcdef!2sCra.%205%20%239-28%2C%20Anserma%2C%20Caldas!5e0!3m2!1ses!2sco!4v1234567890123!5m2!1ses!2sco" width="100%" height="100%" style={{ border: 0, borderRadius: "12px", minHeight: "260px" }} allowFullScreen="" loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Ubicación Rincón Bedoya & Asociados" />
      </motion.div>
    </div>

    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="text-center mt-8 sm:mt-12 p-5 sm:p-8 card-soft">
      <h2 className="text-xl sm:text-3xl font-bold text-primary mb-2 sm:mb-4">¿Listo para dar el siguiente paso?</h2>
      <p className="text-slate-300 mb-5 max-w-2xl mx-auto text-sm sm:text-base">Nuestro equipo de profesionales está listo para asesorarte en tu próximo proyecto inmobiliario.</p>
      <a href="https://wa.me/573105968202?text=Hola,%20quiero%20información%20sobre%20propiedades" target="_blank" rel="noopener noreferrer" className="button-gold inline-flex items-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4">
        <FaWhatsapp className="text-lg sm:text-xl" /> Contactar por WhatsApp
      </a>
    </motion.div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────────────────────────────────────
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <NotificationInitializer />
        <Toaster position="top-right" />

        <Routes>
          {/* ── Rutas públicas ── */}
          <Route element={<PublicLayout />}>
            <Route path={PUBLIC_ROUTES.HOME}             element={<HomePage />} />
            <Route path={PUBLIC_ROUTES.CATALOG}          element={<CatalogPage />} />
            <Route path={PUBLIC_ROUTES.CITY_PROPERTIES}  element={<LocationPage />} />
            <Route path={PUBLIC_ROUTES.TYPE_CITY_PROPERTIES} element={<LocationPage />} />
            <Route path={PUBLIC_ROUTES.PROPERTY_DETAIL}  element={<PropertyDetailPage />} />
            <Route path={PUBLIC_ROUTES.CONTACT}          element={<ContactPage />} />
            <Route path={AUTH_ROUTES.ACCESS_REQUEST}     element={<AccessRequestPage />} />
            <Route
              path={PUBLIC_ROUTES.SCHEDULE_VISIT}
              element={<Suspense fallback={<PageLoader />}><ScheduleVisitPage /></Suspense>}
            />
          </Route>

          {/* ── Autenticación ── */}
          <Route path={AUTH_ROUTES.LOGIN} element={<AuthPage />} />

          {/* ── Rutas privadas ── */}
          <Route
            element={
              <ProtectedRoute>
                <div className="bg-main">
                  <AdminLayout />
                  <SettingsFab />
                </div>
              </ProtectedRoute>
            }
          >
            <Route path={PRIVATE_ROUTES.DASHBOARD}  element={<Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>} />
            <Route path={PRIVATE_ROUTES.PROPERTIES} element={<Suspense fallback={<PageLoader />}><PropertyManagement /></Suspense>} />
            <Route path={PRIVATE_ROUTES.CLIENTS}    element={<Suspense fallback={<PageLoader />}><ClientManagement /></Suspense>} />
            <Route path={PRIVATE_ROUTES.CONTRACTS}  element={<Suspense fallback={<PageLoader />}><ContractsPage /></Suspense>} />
            <Route path={PRIVATE_ROUTES.QUERIES}    element={<Suspense fallback={<PageLoader />}><ContactsPage /></Suspense>} />
            <Route path={PRIVATE_ROUTES.CHAT}       element={<Navigate to={PRIVATE_ROUTES.DASHBOARD} replace />} />
            <Route path={PRIVATE_ROUTES.DOCUMENTS}  element={<Suspense fallback={<PageLoader />}><DocumentsPage /></Suspense>} />
            <Route path={PRIVATE_ROUTES.CALENDAR}   element={<Suspense fallback={<PageLoader />}><CalendarPage /></Suspense>} />
            <Route path={PRIVATE_ROUTES.USERS}      element={<Suspense fallback={<PageLoader />}><UsersPage /></Suspense>} />
            <Route path={PRIVATE_ROUTES.REQUESTS}   element={<Suspense fallback={<PageLoader />}><RequestsPage /></Suspense>} />
            <Route path={PRIVATE_ROUTES.PROFILE}    element={<ProfilePage />} />
            <Route
              path={PRIVATE_ROUTES.VISITS}
              element={<Suspense fallback={<PageLoader />}><VisitsPage /></Suspense>}
            />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to={PUBLIC_ROUTES.HOME} replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
