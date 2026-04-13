import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import {
  FaWhatsapp, FaPhone, FaEnvelope,
  FaMapMarkerAlt, FaClock
} from "react-icons/fa";

const ContactPage = () => {
  return (
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
          <motion.a href="https://wa.me/573105968202?text=Hola,%20quiero%20informaci%C3%B3n%20sobre%20propiedades" target="_blank" rel="noopener noreferrer" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-gradient-to-br from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 p-4 sm:p-7 rounded-2xl text-center shadow-xl hover:shadow-2xl transition-all duration-300 text-white group transform hover:-translate-y-1 hover:scale-[1.02]">
            <FaWhatsapp className="text-3xl sm:text-5xl mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="text-base sm:text-xl font-extrabold mb-1">WhatsApp</h3>
            <p className="text-xs sm:text-sm opacity-90">310 596 8202</p>
          </motion.a>
          <motion.a href="tel:+573206736391" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 p-4 sm:p-7 rounded-2xl text-center shadow-xl hover:shadow-2xl transition-all duration-300 text-white group transform hover:-translate-y-1 hover:scale-[1.02]">
            <FaPhone className="text-3xl sm:text-5xl mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="text-base sm:text-xl font-extrabold mb-1">Teléfono</h3>
            <p className="text-xs sm:text-sm opacity-90">320 673 6391</p>
          </motion.a>
          <motion.a href="mailto:inmojuridi09@gmail.com" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 p-4 sm:p-7 rounded-2xl text-center shadow-xl hover:shadow-2xl transition-all duration-300 text-white group transform hover:-translate-y-1 hover:scale-[1.02]">
            <FaEnvelope className="text-3xl sm:text-5xl mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="text-base sm:text-xl font-extrabold mb-1">Email</h3>
            <p className="text-xs sm:text-sm opacity-90">inmojuridi09@gmail.com</p>
          </motion.a>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-gradient-to-br from-slate-700 to-slate-800 p-4 sm:p-7 rounded-2xl text-center shadow-xl">
            <FaMapMarkerAlt className="text-3xl sm:text-5xl mx-auto mb-3 text-primary" />
            <h3 className="text-base sm:text-xl font-extrabold mb-1 text-white">Dirección</h3>
            <p className="text-xs sm:text-sm text-slate-300">Cra 5 No. 9-28, Anserma, Caldas</p>
          </motion.div>
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="card-soft p-5 sm:p-7 mb-6 sm:mb-10">
          <div className="flex items-center gap-3 mb-4">
            <FaClock className="text-primary text-xl" />
            <h3 className="text-white font-bold text-lg">Horario de Atención</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[["Lunes a Viernes","8:00 AM - 6:00 PM"],["Sábados","8:00 AM - 12:00 PM"],["Domingos","Previa cita"],["Festivos","Previa cita"]].map(([day, hours]) => (
              <div key={day} className="flex justify-between items-center py-2 border-b border-slate-800">
                <span className="text-slate-300 text-sm font-medium">{day}</span>
                <span className="text-primary text-sm font-bold">{hours}</span>
              </div>
            ))}
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="card-soft overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-800">
            <h3 className="text-white font-bold text-lg">Nuestra Ubicación</h3>
            <p className="text-slate-400 text-sm mt-1">Carrera 5 No. 9-28, Anserma, Caldas, Colombia</p>
          </div>
          <div className="w-full h-64 sm:h-80 bg-slate-800 flex items-center justify-center">
            <div className="text-center">
              <FaMapMarkerAlt className="text-primary text-4xl sm:text-6xl mx-auto mb-3" />
              <p className="text-slate-300 font-semibold">Anserma, Caldas</p>
              <a href="https://maps.google.com/?q=Anserma,Caldas,Colombia" target="_blank" rel="noopener noreferrer" className="mt-3 inline-block button-gold text-sm px-5 py-2">Ver en Google Maps</a>
            </div>
          </div>
        </motion.div>
      </div>
    );
};

export default ContactPage;