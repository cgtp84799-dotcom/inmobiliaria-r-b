import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaCalendarAlt, FaClock, FaUser, FaPhone,
  FaEnvelope, FaStickyNote, FaCheckCircle, FaArrowLeft,
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import { visitService } from '../services/visit.service';
import { createVisitPayload } from '../types/visit.types';
import propertyService from '../../properties/services/property.service';

/**
 * ScheduleVisitPage — formulario público para agendar una visita.
 *
 * Ruta pública: /agendar-visita?propertyId={id}
 * Ruta privada: /agendar-visita?propertyId={id}  (misma página, sin auth)
 *
 * Escribe en /visits con status: 'pending' y notifica a los admins.
 */
export default function ScheduleVisitPage() {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();
  const propertyId = params.get('propertyId');

  const [property,  setProperty]  = useState(null);
  const [loading,   setLoading]   = useState(!!propertyId);
  const [submitting, setSubmitting] = useState(false);
  const [success,   setSuccess]   = useState(false);

  const [form, setForm] = useState({
    clientName:     '',
    clientEmail:    '',
    clientPhone:    '',
    requestedDate:  '',
    requestedTime:  '',
    notes:          '',
  });

  // Hora mínima: mañana
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  // Cargar datos de la propiedad para mostrar el contexto
  useEffect(() => {
    if (!propertyId) { setLoading(false); return; }
    propertyService
      .getPublicPropertyById(propertyId)
      .then((data) => setProperty(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [propertyId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.clientName || !form.clientEmail || !form.requestedDate || !form.requestedTime) {
      toast.error('Completa los campos obligatorios');
      return;
    }
    setSubmitting(true);
    try {
      const payload = createVisitPayload({
        propertyId:      propertyId ?? null,
        propertyName:    property?.title ?? 'Propiedad no especificada',
        propertyAddress: property?.address ?? property?.city ?? '',
        ...form,
      });
      await visitService.requestVisit(payload);
      setSuccess(true);
    } catch (error) {
      console.error(error);
      toast.error('Error al enviar la solicitud. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  // Pantalla de éxito
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center
        px-4" style={{ backgroundColor: 'var(--color-bg)' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center p-8 rounded-2xl
            border border-slate-700 bg-slate-900"
        >
          <FaCheckCircle className="text-green-400 text-5xl mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">¡Solicitud enviada!</h2>
          <p className="text-slate-400 mb-6">
            Tu solicitud de visita para <strong className="text-white">
              {property?.title ?? 'la propiedad'}
            </strong> fue recibida. Nos pondremos en contacto contigo pronto.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/catalogo"
              className="px-6 py-3 rounded-xl bg-primary text-slate-950
                font-semibold hover:bg-primary/90 transition-colors text-sm"
            >
              Ver más propiedades
            </Link>
            {propertyId && (
              <button
                onClick={() => { setSuccess(false); setForm({ clientName:'',clientEmail:'',clientPhone:'',requestedDate:'',requestedTime:'',notes:'' }); }}
                className="px-6 py-3 rounded-xl bg-slate-800 text-slate-200
                  hover:bg-slate-700 transition-colors text-sm"
              >
                Nueva solicitud
              </button>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="max-w-lg mx-auto">

        {/* Back */}
        <Link
          to={propertyId ? `/propiedades/${propertyId}` : '/catalogo'}
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white
            text-sm mb-6 transition-colors"
        >
          <FaArrowLeft size={12} />
          {property ? `Volver a ${property.title}` : 'Volver al catálogo'}
        </Link>

        {/* Card del formulario */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8"
        >
          {/* Header */}
          <div className="mb-6">
            <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center
              justify-center mb-4">
              <FaCalendarAlt className="text-primary text-xl" />
            </div>
            <h1 className="text-2xl font-extrabold text-white">
              Agendar visita
            </h1>
            {property && (
              <p className="text-slate-400 text-sm mt-1">
                {property.title} — {property.city}
              </p>
            )}
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Nombre */}
            <div>
              <label className="block text-slate-300 text-sm font-semibold mb-1.5">
                <FaUser className="inline mr-1.5 text-slate-500" size={12} />
                Nombre completo *
              </label>
              <input
                type="text" name="clientName"
                value={form.clientName} onChange={handleChange}
                placeholder="Tu nombre"
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl
                  px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500
                  focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              />
            </div>

            {/* Email + Teléfono */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 text-sm font-semibold mb-1.5">
                  <FaEnvelope className="inline mr-1.5 text-slate-500" size={12} />
                  Email *
                </label>
                <input
                  type="email" name="clientEmail"
                  value={form.clientEmail} onChange={handleChange}
                  placeholder="tu@email.com"
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl
                    px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500
                    focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-slate-300 text-sm font-semibold mb-1.5">
                  <FaPhone className="inline mr-1.5 text-slate-500" size={12} />
                  Teléfono
                </label>
                <input
                  type="tel" name="clientPhone"
                  value={form.clientPhone} onChange={handleChange}
                  placeholder="310 000 0000"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl
                    px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500
                    focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                />
              </div>
            </div>

            {/* Fecha + Hora */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 text-sm font-semibold mb-1.5">
                  <FaCalendarAlt className="inline mr-1.5 text-slate-500" size={12} />
                  Fecha deseada *
                </label>
                <input
                  type="date" name="requestedDate"
                  value={form.requestedDate} onChange={handleChange}
                  min={minDate}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl
                    px-4 py-2.5 text-sm text-slate-200
                    focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-slate-300 text-sm font-semibold mb-1.5">
                  <FaClock className="inline mr-1.5 text-slate-500" size={12} />
                  Hora preferida *
                </label>
                <input
                  type="time" name="requestedTime"
                  value={form.requestedTime} onChange={handleChange}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl
                    px-4 py-2.5 text-sm text-slate-200
                    focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                />
              </div>
            </div>

            {/* Notas */}
            <div>
              <label className="block text-slate-300 text-sm font-semibold mb-1.5">
                <FaStickyNote className="inline mr-1.5 text-slate-500" size={12} />
                Mensaje (opcional)
              </label>
              <textarea
                name="notes"
                value={form.notes} onChange={handleChange}
                placeholder="Cuéntanos algo sobre tu interés o dudas que tengas..."
                rows={3}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl
                  px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500
                  focus:border-primary focus:ring-1 focus:ring-primary outline-none
                  transition-colors resize-none"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl font-bold text-slate-950
                bg-primary hover:bg-primary/90 transition-colors
                disabled:opacity-60 disabled:cursor-not-allowed
                flex items-center justify-center gap-2"
            >
              {submitting ? (
                <><span className="w-4 h-4 border-2 border-slate-950 border-t-transparent
                  rounded-full animate-spin" /> Enviando...</>
              ) : (
                <><FaCalendarAlt size={14} /> Solicitar visita</>
              )}
            </button>

            <p className="text-slate-600 text-xs text-center">
              Nuestro equipo confirmará la visita en las próximas horas.
            </p>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
