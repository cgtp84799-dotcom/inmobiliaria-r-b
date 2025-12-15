// src/App.jsx

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useEffect } from 'react';
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
  FaUserTie
} from 'react-icons/fa';

import PublicLayout from './shared/components/Layout/PublicLayout';
import AdminLayout from './shared/components/Layout/AdminLayout';
import { AuthProvider, useAuth } from './core/contexts/AuthContext';
import { PUBLIC_ROUTES, PRIVATE_ROUTES } from './core/config/routes.config';

// ✅ IMPORTACIONES DE NOTIFICACIONES
import { 
  requestNotificationPermission, 
  initializeMessaging 
} from './core/services/notificationService';

// Páginas
import PropertyManagement from './modules/properties/pages/PropertyManagement';
import ClientManagement from './modules/clients/pages/ClientManagement';
import ChatPage from './modules/chat/pages/ChatPage';
import AuthPage from './modules/auth/pages/AuthPage';
import DashboardPage from './modules/dashboard/pages/DashboardPage';
import CatalogPage from './modules/public/pages/CatalogPage';
import PropertyDetailPage from './modules/public/pages/PropertyDetailPage';
import ProtectedRoute from './shared/components/ProtectedRoute';
import SettingsFab from './shared/components/UI/SettingsFab';
import DocumentsPage from './modules/documents/pages/DocumentsPage';
import ContactsPage from './modules/contacts/pages/ContactsPage';
import CalendarPage from './modules/calendar/pages/CalendarPage';
import AccessRequestPage from './modules/users/pages/AccessRequestPage';
import UsersPage from './modules/users/pages/UsersPage';
import RequestsPage from './modules/users/pages/RequestsPage';

// ============================================
// COMPONENTE PARA INICIALIZAR NOTIFICACIONES
// ============================================
const NotificationInitializer = () => {
  const { currentUser } = useAuth();

  useEffect(() => {
    // Inicializar Firebase Messaging
    initializeMessaging();

    // Registrar Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/firebase-messaging-sw.js')
        .then((registration) => {
          console.log('✅ Service Worker registrado:', registration.scope);
        })
        .catch((error) => {
          console.error('❌ Error registrando Service Worker:', error);
        });
    }

    // Solicitar permiso de notificaciones si hay usuario autenticado
    if (currentUser) {
      // Esperar 3 segundos después del login para no ser invasivo
      const timeout = setTimeout(() => {
        requestNotificationPermission(currentUser.uid);
      }, 3000);

      return () => clearTimeout(timeout);
    }
  }, [currentUser]);

  return null;
};

// ============================================
// HOME PAGE - ÉPICO Y PROFESIONAL
// ============================================
const HomePage = () => (
  <div className="overflow-hidden">
    {/* HERO PRINCIPAL - DUAL ACTION */}
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="relative min-h-[90vh] flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden"
    >
      {/* Efecto de fondo animado */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
        >
          <h1 className="text-6xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Tu próxima propiedad
            <span className="block text-primary mt-2">está aquí</span>
          </h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="text-slate-300 text-xl md:text-2xl max-w-3xl mx-auto mb-12"
        >
          Gestión inmobiliaria integral con respaldo jurídico especializado en Anserma y municipios aledaños
        </motion.p>

        {/* BOTONES DUALES */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <Link
            to="/propiedades"
            className="group relative px-8 py-4 bg-primary hover:bg-yellow-500 text-slate-950 font-bold text-lg rounded-xl 
                       shadow-2xl hover:shadow-primary/50 transition-all duration-300 transform hover:scale-105 flex items-center gap-3"
          >
            <FaSearch className="text-xl" />
            Buscar Propiedades
          </Link>

          <a
            href="https://wa.me/573105968202?text=Hola,%20quiero%20información%20para%20vender/arrendar%20mi%20propiedad"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold text-lg rounded-xl 
                       border-2 border-primary/50 hover:border-primary shadow-2xl transition-all duration-300 transform hover:scale-105 flex items-center gap-3"
          >
            <FaHome className="text-xl" />
            Vender / Arrendar
          </a>
        </motion.div>

        {/* Badge de respaldo jurídico */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="mt-12 inline-flex items-center gap-2 px-6 py-3 bg-slate-800/50 backdrop-blur-sm rounded-full border border-primary/30"
        >
          <FaBalanceScale className="text-primary text-xl" />
          <span className="text-slate-300 text-sm font-medium">Respaldo jurídico especializado</span>
        </motion.div>
      </div>

      {/* Indicador de scroll */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
      >
        <div className="w-6 h-10 border-2 border-primary rounded-full flex justify-center p-2">
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-1.5 h-1.5 bg-primary rounded-full"
          />
        </div>
      </motion.div>
    </motion.section>

    {/* SECCIÓN: ¿QUÉ OFRECEMOS? (COMPRADORES VS PROPIETARIOS) */}
    <section className="py-20 bg-gradient-to-b from-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            ¿Qué estás buscando?
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Soluciones personalizadas para compradores y propietarios
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* PARA COMPRADORES */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="card-soft p-8 border-2 border-primary/30 hover:border-primary/60 transition-all duration-300 group"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <FaSearch className="text-primary text-3xl" />
              </div>
              <h3 className="text-3xl font-bold text-primary">Para Compradores</h3>
            </div>

            <ul className="space-y-4">
              {[
                'Asesoría personalizada en tu búsqueda',
                'Verificación jurídica completa de propiedades',
                'Gestión de créditos hipotecarios y financiación',
                'Acompañamiento en trámites notariales',
                'Inspección y avalúo profesional',
                'Negociación directa con propietarios'
              ].map((item, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  viewport={{ once: true }}
                  className="flex items-start gap-3"
                >
                  <FaCheckCircle className="text-primary mt-1 flex-shrink-0" />
                  <span className="text-slate-300">{item}</span>
                </motion.li>
              ))}
            </ul>

            <Link
              to="/propiedades"
              className="mt-8 w-full button-gold inline-flex items-center justify-center gap-2"
            >
              Ver propiedades disponibles
              <FaSearch />
            </Link>
          </motion.div>

          {/* PARA PROPIETARIOS */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="card-soft p-8 border-2 border-blue-500/30 hover:border-blue-500/60 transition-all duration-300 group"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <FaHome className="text-blue-500 text-3xl" />
              </div>
              <h3 className="text-3xl font-bold text-blue-500">Para Propietarios</h3>
            </div>

            <ul className="space-y-4">
              {[
                'Avalúo profesional sin costo',
                'Publicidad en múltiples plataformas',
                'Fotografía y tours virtuales profesionales',
                'Gestión integral de contratos de arriendo',
                'Verificación de inquilinos/compradores',
                'Asesoría jurídica en todo el proceso'
              ].map((item, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  viewport={{ once: true }}
                  className="flex items-start gap-3"
                >
                  <FaCheckCircle className="text-blue-500 mt-1 flex-shrink-0" />
                  <span className="text-slate-300">{item}</span>
                </motion.li>
              ))}
            </ul>

            <a
              href="https://wa.me/573105968202?text=Hola,%20quiero%20vender/arrendar%20mi%20propiedad"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 
                         text-white font-bold rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300"
            >
              Publicar mi propiedad
              <FaWhatsapp />
            </a>
          </motion.div>
        </div>
      </div>
    </section>

    {/* SERVICIOS JURÍDICOS */}
    <section className="py-20 bg-slate-950">
      <div className="max-w-7xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Servicios Especializados
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Con respaldo de nuestro equipo jurídico profesional
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              icon: FaBuilding,
              title: 'Compra y Venta',
              description: 'Propiedades urbanas y rurales con verificación del estado jurídico completo.',
              color: 'primary',
              delay: 0.1
            },
            {
              icon: FaKey,
              title: 'Arriendo y Administración',
              description: 'Gestión de contratos: vivienda, locales comerciales, turismo y aparcerías.',
              color: 'blue-500',
              delay: 0.2
            },
            {
              icon: FaGavel,
              title: 'Saneamiento Jurídico',
              description: 'Pertenencia, falsas tradiciones, pequeña propiedad rural (Ley 1561/2012).',
              color: 'green-500',
              delay: 0.3
            },
            {
              icon: FaFileContract,
              title: 'Sucesiones y Remates',
              description: 'Levantamiento de sucesiones notariales y representación en remates judiciales.',
              color: 'purple-500',
              delay: 0.4
            },
            {
              icon: FaHandshake,
              title: 'Créditos Hipotecarios',
              description: 'Asesoría y gestión de financiación con bancos e inversionistas privados.',
              color: 'orange-500',
              delay: 0.5
            },
            {
              icon: FaShieldAlt,
              title: 'Avalúos y Proyectos',
              description: 'Avalúos certificados, subdivisión de lotes y reglamentos de propiedad horizontal.',
              color: 'red-500',
              delay: 0.6
            }
          ].map((service, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: service.delay, duration: 0.6 }}
              viewport={{ once: true }}
              whileHover={{ y: -10, scale: 1.02 }}
              className="card-soft p-6 text-center border border-slate-800 hover:border-primary/50 transition-all duration-300 group"
            >
              <div className={`w-20 h-20 mx-auto mb-4 bg-${service.color}/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <service.icon className={`text-${service.color} text-4xl`} />
              </div>
              <h3 className="text-light font-bold text-xl mb-3">{service.title}</h3>
              <p className="text-muted text-sm leading-relaxed">{service.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* PROCESO PASO A PASO */}
    <section className="py-20 bg-gradient-to-b from-slate-950 to-slate-900">
      <div className="max-w-7xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            ¿Cómo trabajamos?
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Un proceso simple, transparente y seguro
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { step: '01', title: 'Contacto Inicial', desc: 'Cuéntanos tus necesidades', icon: FaPhone },
            { step: '02', title: 'Asesoría Experta', desc: 'Te guiamos en todo el proceso', icon: FaUserTie },
            { step: '03', title: 'Verificación Legal', desc: 'Revisamos todo jurídicamente', icon: FaBalanceScale },
            { step: '04', title: 'Cierre Exitoso', desc: 'Tu negocio seguro y exitoso', icon: FaCheckCircle }
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2, duration: 0.6 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="card-soft p-6 text-center hover:border-primary/50 transition-all duration-300">
                <div className="text-primary text-6xl font-bold opacity-20 mb-2">{item.step}</div>
                <item.icon className="text-primary text-4xl mx-auto mb-4" />
                <h3 className="text-white font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-slate-400 text-sm">{item.desc}</p>
              </div>
              {i < 3 && (
                <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-0.5 bg-primary/30"></div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* CTA FINAL DUAL */}
    <section className="py-20 bg-slate-950">
      <div className="max-w-7xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="card-soft p-12 text-center border-2 border-primary/30"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            ¿Listo para dar el siguiente paso?
          </h2>
          <p className="text-slate-300 text-lg mb-8 max-w-2xl mx-auto">
            Nuestro equipo de profesionales está listo para asesorarte en tu próximo proyecto inmobiliario
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://wa.me/573105968202?text=Hola,%20quiero%20información%20sobre%20propiedades"
              target="_blank"
              rel="noopener noreferrer"
              className="button-gold inline-flex items-center justify-center gap-3 text-lg px-8 py-4"
            >
              <FaWhatsapp className="text-2xl" />
              Contactar por WhatsApp
            </a>

            <Link
              to="/propiedades"
              className="inline-flex items-center justify-center gap-3 text-lg px-8 py-4 bg-slate-800 hover:bg-slate-700 
                         text-white font-bold rounded-xl border-2 border-primary/50 hover:border-primary 
                         shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              Ver Catálogo Completo
              <FaSearch />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  </div>
);

// ============================================
// CONTACT PAGE - ✅ EMAIL CORREGIDO
// ============================================
const ContactPage = () => (
  <div className="max-w-7xl mx-auto py-16 px-4">
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="text-center mb-16"
    >
      <h1 className="text-5xl font-bold text-primary mb-4">Contáctanos</h1>
      <p className="text-muted text-xl max-w-2xl mx-auto">
        Estamos aquí para ayudarte. Comunícate con nosotros por tu canal preferido 
        y un asesor te atenderá de inmediato.
      </p>
    </motion.div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
      {/* WhatsApp */}
      <motion.a
        href="https://wa.me/573105968202?text=Hola,%20quiero%20información%20sobre%20propiedades"
        target="_blank"
        rel="noopener noreferrer"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.6 }}
        className="bg-gradient-to-br from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 p-8 rounded-2xl text-center shadow-xl hover:shadow-2xl transition-all duration-300 text-white group transform hover:-translate-y-2 hover:scale-105"
      >
        <FaWhatsapp className="text-5xl mx-auto mb-4 group-hover:scale-110 transition-transform" />
        <h3 className="text-xl font-bold mb-2">WhatsApp</h3>
        <p className="text-sm">Chatea con nosotros</p>
      </motion.a>

      {/* Instagram */}
      <motion.a
        href="https://instagram.com/inmobiliaria_ryb"
        target="_blank"
        rel="noopener noreferrer"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="bg-gradient-to-br from-pink-600 via-purple-600 to-indigo-600 hover:from-pink-500 hover:via-purple-500 hover:to-indigo-500 p-8 rounded-2xl text-center shadow-xl hover:shadow-2xl transition-all duration-300 text-white group transform hover:-translate-y-2 hover:scale-105"
      >
        <FaInstagram className="text-5xl mx-auto mb-4 group-hover:scale-110 transition-transform" />
        <h3 className="text-xl font-bold mb-2">Instagram</h3>
        <p className="text-sm">@inmobiliaria_ryb</p>
      </motion.a>

      {/* Facebook */}
      <motion.a
        href="https://www.facebook.com/share/17piE61vjU/"
        target="_blank"
        rel="noopener noreferrer"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 p-8 rounded-2xl text-center shadow-xl hover:shadow-2xl transition-all duration-300 text-white group transform hover:-translate-y-2 hover:scale-105"
      >
        <FaFacebook className="text-5xl mx-auto mb-4 group-hover:scale-110 transition-transform" />
        <h3 className="text-xl font-bold mb-2">Facebook</h3>
        <p className="text-sm">Síguenos</p>
      </motion.a>

      {/* Email - ✅ CORREGIDO */}
      <motion.a
        href="mailto:inmojuridi09@gmail.com"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="bg-gradient-to-br from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 p-8 rounded-2xl text-center shadow-xl hover:shadow-2xl transition-all duration-300 text-slate-950 group transform hover:-translate-y-2 hover:scale-105"
      >
        <FaEnvelope className="text-5xl mx-auto mb-4 group-hover:scale-110 transition-transform" />
        <h3 className="text-xl font-bold mb-2">Email</h3>
        <p className="text-sm font-semibold">Escríbenos</p>
      </motion.a>
    </div>

    {/* Información de contacto detallada */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
        className="card-soft p-8"
      >
        <h2 className="text-2xl font-bold text-primary mb-6">Información de contacto</h2>
        
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <FaPhone className="text-primary text-lg" />
            </div>
            <div>
              <h3 className="text-light font-semibold mb-1">Teléfonos</h3>
              <p className="text-muted text-sm">310 596 8202</p>
              <p className="text-muted text-sm">320 673 6391</p>
            </div>
          </div>

          {/* ✅ EMAIL CORREGIDO (sin markdown) */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <FaEnvelope className="text-primary text-lg" />
            </div>
            <div>
              <h3 className="text-light font-semibold mb-1">Correo electrónico</h3>
              <a 
                href="mailto:inmojuridi09@gmail.com" 
                className="text-primary text-sm hover:underline"
              >
                inmojuridi09@gmail.com
              </a>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <FaMapMarkerAlt className="text-primary text-lg" />
            </div>
            <div>
              <h3 className="text-light font-semibold mb-1">Dirección</h3>
              <p className="text-muted text-sm">Cra 5 No. 9 - 28</p>
              <p className="text-muted text-sm">Anserma, Caldas, Colombia</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <FaClock className="text-primary text-lg" />
            </div>
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

      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.6 }}
        className="card-soft p-2 h-full min-h-[400px]"
      >
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3972.6886447157144!2d-75.78463!3d5.23889!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e4737a74c4e5555%3A0x1234567890abcdef!2sCra.%205%20%239-28%2C%20Anserma%2C%20Caldas!5e0!3m2!1ses!2sco!4v1234567890123!5m2!1ses!2sco"
          width="100%"
          height="100%"
          style={{ border: 0, borderRadius: '12px', minHeight: '400px' }}
          allowFullScreen=""
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Ubicación Rincón Bedoya & Asociados"
        ></iframe>
      </motion.div>
    </div>

    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8 }}
      className="text-center mt-16 p-8 card-soft"
    >
      <h2 className="text-3xl font-bold text-primary mb-4">
        ¿Listo para dar el siguiente paso?
      </h2>
      <p className="text-muted mb-6 max-w-2xl mx-auto">
        Nuestro equipo de profesionales está listo para asesorarte en tu próximo proyecto inmobiliario.
      </p>
      <a
        href="https://wa.me/573105968202?text=Hola,%20quiero%20información%20sobre%20propiedades"
        target="_blank"
        rel="noopener noreferrer"
        className="button-gold inline-flex items-center gap-2 px-8 py-4"
      >
        <FaWhatsapp className="text-xl" />
        Contactar por WhatsApp
      </a>
    </motion.div>
  </div>
);

// ============================================
// APP COMPONENT - ✅ CON RUTA /catalogo
// ============================================
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <NotificationInitializer />
        
        <Toaster position="top-right" />
        <Routes>
          {/* PÚBLICO */}
          <Route element={<PublicLayout />}>
            <Route path={PUBLIC_ROUTES.HOME} element={<HomePage />} />
            {/* ✅ RUTA /catalogo AGREGADA */}
            <Route path="/catalogo" element={<CatalogPage />} />
            <Route path="/propiedades" element={<CatalogPage />} />
            <Route path={PUBLIC_ROUTES.CATALOG} element={<CatalogPage />} />
            <Route path="/propiedades/:id" element={<PropertyDetailPage />} />
            <Route path={PUBLIC_ROUTES.PROPERTY_DETAIL} element={<PropertyDetailPage />} />
            <Route path={PUBLIC_ROUTES.CONTACT} element={<ContactPage />} />
            <Route path="/solicitar-acceso" element={<AccessRequestPage />} />
          </Route>

          {/* LOGIN */}
          <Route path="/acceso" element={<AuthPage />} />

          {/* PANEL INTERNO - PROTEGIDO */}
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
            <Route path={PRIVATE_ROUTES.DASHBOARD} element={<DashboardPage />} />
            <Route path={PRIVATE_ROUTES.PROPERTIES} element={<PropertyManagement />} />
            <Route path={PRIVATE_ROUTES.CLIENTS} element={<ClientManagement />} />
            <Route path="/dashboard/consultas" element={<ContactsPage />} />
            <Route path={PRIVATE_ROUTES.CHAT} element={<ChatPage />} />
            <Route path={PRIVATE_ROUTES.DOCUMENTS} element={<DocumentsPage />} />
            <Route path="/dashboard/calendario" element={<CalendarPage />} />
            <Route path="/dashboard/usuarios" element={<UsersPage />} />
            <Route path="/dashboard/solicitudes" element={<RequestsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
