import { useState } from 'react';
import { motion } from 'framer-motion';
import { FaUser, FaEnvelope, FaPhone, FaComment, FaPaperPlane, FaWhatsapp, FaCheckCircle } from 'react-icons/fa';
import toast from 'react-hot-toast';
import contactService from '../services/contact.service';

const PropertyContactForm = ({ propertyTitle, propertyId }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: `Hola, estoy interesado en la propiedad: ${propertyTitle || 'Sin título'}`
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validaciones
    if (!formData.name.trim()) {
      toast.error('Por favor ingresa tu nombre');
      return;
    }
    if (!formData.email.trim()) {
      toast.error('Por favor ingresa tu email');
      return;
    }
    if (!formData.phone.trim()) {
      toast.error('Por favor ingresa tu teléfono');
      return;
    }

    setLoading(true);

    try {
      await contactService.createContact({
        ...formData,
        propertyId: propertyId || null,
        propertyTitle: propertyTitle || 'Sin título',
        source: 'website'
      });

      toast.success('¡Consulta enviada con éxito! Te contactaremos pronto.');
      setSubmitted(true);

      setTimeout(() => {
        setFormData({
          name: '',
          email: '',
          phone: '',
          message: `Hola, estoy interesado en la propiedad: ${propertyTitle || 'Sin título'}`
        });
        setSubmitted(false);
      }, 3000);

    } catch (error) {
      console.error('Error enviando consulta:', error);
      toast.error('Hubo un error. Intenta por WhatsApp.');
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsApp = () => {
    const message = `Hola, estoy interesado en: ${propertyTitle}\n\nNombre: ${formData.name || 'No especificado'}\nTeléfono: ${formData.phone || 'No especificado'}\n\n${formData.message}`;
    const phone = '573105968202';
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-2 border-green-500/30 rounded-2xl p-8 text-center"
      >
        <FaCheckCircle className="text-green-500 text-6xl mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-[var(--color-text)] mb-2">¡Mensaje Enviado!</h3>
        <p className="text-[var(--color-text)]">Un asesor te contactará pronto.</p>
      </motion.div>
    );
  }

  return (
    <div className="bg-[var(--color-surface)] border-2 border-[var(--color-border)] rounded-2xl p-6 shadow-xl">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-primary mb-2">
          ¿Te interesa esta propiedad?
        </h3>
        <p className="text-[var(--color-text-muted)] text-sm">
          Completa el formulario y un asesor te contactará
        </p>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nombre */}
        <div>
          <label className="block text-[var(--color-text-muted)] text-sm font-semibold mb-2">
            Nombre completo *
          </label>
          <div className="relative">
            <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Ej: Juan Pérez"
              required
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl py-3 pl-12 pr-4 text-[var(--color-text)] placeholder-slate-500 focus:border-primary focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-[var(--color-text-muted)] text-sm font-semibold mb-2">
            Correo electrónico *
          </label>
          <div className="relative">
            <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="tu@email.com"
              required
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl py-3 pl-12 pr-4 text-[var(--color-text)] placeholder-slate-500 focus:border-primary focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Teléfono */}
        <div>
          <label className="block text-[var(--color-text-muted)] text-sm font-semibold mb-2">
            Teléfono / WhatsApp *
          </label>
          <div className="relative">
            <FaPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="300 123 4567"
              required
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl py-3 pl-12 pr-4 text-[var(--color-text)] placeholder-slate-500 focus:border-primary focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Mensaje */}
        <div>
          <label className="block text-[var(--color-text-muted)] text-sm font-semibold mb-2">
            Mensaje
          </label>
          <div className="relative">
            <FaComment className="absolute left-4 top-4 text-[var(--color-text-muted)]" />
            <textarea
              name="message"
              value={formData.message}
              onChange={handleChange}
              rows="3"
              placeholder="Cuéntanos más..."
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl py-3 pl-12 pr-4 text-[var(--color-text)] placeholder-slate-500 focus:border-primary focus:outline-none transition-all resize-none"
            />
          </div>
        </div>

        {/* BOTÓN ENVIAR - SIEMPRE VISIBLE */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 hover:from-yellow-500 hover:via-yellow-600 hover:to-yellow-700 text-slate-900 font-black py-4 px-6 rounded-xl shadow-xl hover:shadow-2xl hover:shadow-yellow-500/50 transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[var(--color-border)]"></div>
                <span className="text-lg">Enviando...</span>
              </>
            ) : (
              <>
                <FaPaperPlane className="text-xl" />
                <span className="text-lg">Enviar consulta</span>
              </>
            )}
          </button>
        </div>

        {/* Separador */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-[var(--color-input-bg)]"></div>
          <span className="text-[var(--color-text-muted)] text-sm font-medium">O</span>
          <div className="flex-1 h-px bg-[var(--color-input-bg)]"></div>
        </div>

        {/* BOTÓN WHATSAPP */}
        <div>
          <button
            type="button"
            onClick={handleWhatsApp}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-[var(--color-text)] font-bold py-4 px-6 rounded-xl shadow-xl hover:shadow-2xl hover:shadow-green-500/50 transition-all duration-300 flex items-center justify-center gap-3 transform hover:scale-105"
          >
            <FaWhatsapp className="text-2xl" />
            <span className="text-lg">Contáctanos por WhatsApp</span>
          </button>
        </div>
      </form>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-[var(--color-border)]">
        <p className="text-[var(--color-text-muted)] text-xs text-center leading-relaxed">
          Al enviar este formulario aceptas que te contactemos para brindarte información sobre esta propiedad.
        </p>
      </div>
    </div>
  );
};

export default PropertyContactForm;