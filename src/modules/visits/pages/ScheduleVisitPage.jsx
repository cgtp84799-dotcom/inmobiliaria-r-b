import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaCalendarAlt, FaClock, FaUser, FaPhone,
  FaEnvelope, FaStickyNote, FaCheckCircle, FaArrowLeft,
  FaArrowRight, FaHome, FaShieldAlt,
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import { visitService } from '../services/visit.service';
import { createVisitPayload } from '../types/visit.types';
import propertyService from '../../properties/services/property.service';

// ──────────────────────────────────────────────────────────────
// Helpers de animación
// ──────────────────────────────────────────────────────────────
const slideVariants = {
  enter:  (dir) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:   (dir) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

// Etiquetas de cada paso
const STEPS = [
  { id: 1, label: 'Tus datos',    icon: FaUser        },
  { id: 2, label: 'Fecha y hora', icon: FaCalendarAlt },
  { id: 3, label: 'Confirmar',    icon: FaCheckCircle },
];

// Franjas horarias disponibles
const TIME_SLOTS = [
  '08:00','08:30','09:00','09:30','10:00','10:30',
  '11:00','11:30','14:00','14:30','15:00','15:30',
  '16:00','16:30','17:00',
];

// ──────────────────────────────────────────────────────────────
// Sub-componentes
// ──────────────────────────────────────────────────────────────
function StepIndicator({ current }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((step, i) => {
        const done    = current > step.id;
        const active  = current === step.id;
        const Icon    = step.icon;
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center
                  font-bold text-sm transition-all duration-300 border-2
                  ${ done
                    ? 'bg-primary border-primary text-slate-950'
                    : active
                      ? 'bg-primary/20 border-primary text-primary'
                      : 'bg-slate-900 border-slate-700 text-slate-500'
                  }`}
              >
                {done ? <FaCheckCircle size={14} /> : <Icon size={13} />}
              </div>
              <span
                className={`text-xs mt-1.5 font-medium transition-colors duration-300
                  ${active ? 'text-primary' : done ? 'text-slate-400' : 'text-slate-600'}`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-0.5 w-12 sm:w-20 mx-2 mb-4 rounded transition-colors duration-500
                  ${current > step.id ? 'bg-primary' : 'bg-slate-700'}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function InputField({ label, icon: Icon, error, children }) {
  return (
    <div>
      <label className="block text-slate-300 text-sm font-semibold mb-1.5">
        {Icon && <Icon className="inline mr-1.5 text-slate-500" size={12} />}
        {label}
      </label>
      {children}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}

function PropertyBadge({ property }) {
  if (!property) return null;
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/60
      border border-slate-700 mb-6">
      <FaHome className="text-primary flex-shrink-0" size={14} />
      <div className="min-w-0">
        <p className="text-white text-sm font-semibold truncate">{property.title}</p>
        <p className="text-slate-400 text-xs">{property.city}</p>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Página principal
// ──────────────────────────────────────────────────────────────
export default function ScheduleVisitPage() {
  const [params]    = useSearchParams();
  const propertyId  = params.get('propertyId');

  const [property,   setProperty]   = useState(null);
  const [loading,    setLoading]    = useState(!!propertyId);
  const [submitting, setSubmitting] = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [step,       setStep]       = useState(1);
  const [direction,  setDirection]  = useState(1);
  const [errors,     setErrors]     = useState({});
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  const [form, setForm] = useState({
    clientName:    '',
    clientEmail:   '',
    clientPhone:   '',
    requestedDate: '',
    requestedTime: '',
    notes:         '',
  });

  // Fecha mínima: mañana
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  // Cargar propiedad
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
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  // Seleccionar hora con click
  const selectTime = (time) => {
    setForm((prev) => ({ ...prev, requestedTime: time }));
    if (errors.requestedTime) setErrors((prev) => ({ ...prev, requestedTime: '' }));
  };

  // Validaciones por paso
  const validateStep = (s) => {
    const errs = {};
    if (s === 1) {
      if (!form.clientName.trim())  errs.clientName  = 'Tu nombre es obligatorio';
      if (!form.clientEmail.trim()) errs.clientEmail = 'El email es obligatorio';
      else if (!/\S+@\S+\.\S+/.test(form.clientEmail))
        errs.clientEmail = 'Ingresa un email válido';
    }
    if (s === 2) {
      if (!form.requestedDate) errs.requestedDate = 'Elige una fecha';
      if (!form.requestedTime) errs.requestedTime = 'Elige una hora';
    }
    if (s === 3) {
      if (!acceptedPrivacy) errs.privacy = 'Debes aceptar la política de privacidad para continuar';
    }
    return errs;
  };

  const goNext = () => {
    const errs = validateStep(step);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setDirection(1);
    setStep((s) => Math.min(s + 1, 3));
  };

  const goBack = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 1));
  };

  const handleSubmit = async () => {
    const errs = validateStep(3);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitting(true);
    try {
      const payload = createVisitPayload({
        propertyId:      propertyId ?? null,
        propertyName:    property?.title   ?? 'Propiedad no especificada',
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

  // Formatear fecha para mostrar
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    return `${parseInt(d)} de ${months[parseInt(m) - 1]} de ${y}`;
  };

  // ── Pantalla de éxito ──────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: 'var(--color-bg)' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-md w-full text-center p-8 rounded-2xl border border-slate-700 bg-slate-900"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 260, damping: 20 }}
            className="w-20 h-20 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-5"
          >
            <FaCheckCircle className="text-green-400 text-4xl" />
          </motion.div>
          <h2 className="text-2xl font-bold text-white mb-2">¡Solicitud enviada!</h2>
          <p className="text-slate-400 mb-2">
            Tu solicitud de visita para{' '}
            <strong className="text-white">{property?.title ?? 'la propiedad'}</strong>
            {' '}fue recibida correctamente.
          </p>
          <p className="text-slate-500 text-sm mb-6">
            Un asesor se pondrá en contacto contigo al correo{' '}
            <span className="text-primary">{form.clientEmail}</span>{' '}
            en las próximas horas.
          </p>
          {/* Resumen rápido */}
          <div className="bg-slate-800/60 rounded-xl p-4 text-sm text-left mb-6 space-y-2 border border-slate-700">
            <div className="flex items-center gap-2 text-slate-300">
              <FaCalendarAlt className="text-primary flex-shrink-0" size={12} />
              <span>{formatDate(form.requestedDate)}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <FaClock className="text-primary flex-shrink-0" size={12} />
              <span>{form.requestedTime} horas</span>
            </div>
          </div>
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
                onClick={() => {
                  setSuccess(false);
                  setStep(1);
                  setForm({ clientName:'',clientEmail:'',clientPhone:'',requestedDate:'',requestedTime:'',notes:'' });
                  setAcceptedPrivacy(false);
                }}
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

  // ── Layout principal ───────────────────────────────────────
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

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">

          {/* Header */}
          <div className="mb-6">
            <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center
              justify-center mb-3">
              <FaCalendarAlt className="text-primary text-xl" />
            </div>
            <h1 className="text-2xl font-extrabold text-white">Agendar visita</h1>
            <p className="text-slate-400 text-sm mt-1">Completa el formulario en 3 pasos sencillos</p>
          </div>

          {/* Badge propiedad */}
          {!loading && <PropertyBadge property={property} />}

          {/* Indicador de pasos */}
          <StepIndicator current={step} />

          {/* Contenido animado */}
          <div className="overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              {/* ── PASO 1: Tus datos ──────────────────────── */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-5"
                >
                  <div className="text-center mb-5">
                    <FaUser className="text-primary text-3xl mx-auto mb-2" />
                    <h2 className="text-lg font-bold text-white">¿Quién eres?</h2>
                    <p className="text-slate-400 text-sm">Necesitamos tus datos para confirmar la cita</p>
                  </div>

                  <InputField label="Nombre completo *" icon={FaUser} error={errors.clientName}>
                    <input
                      type="text" name="clientName"
                      value={form.clientName} onChange={handleChange}
                      placeholder="Ej: María González"
                      autoComplete="name"
                      className={`w-full bg-slate-950 border rounded-xl px-4 py-3
                        text-sm text-slate-200 placeholder-slate-500 outline-none
                        transition-all duration-200
                        focus:ring-2 focus:ring-primary/40 focus:border-primary
                        ${ errors.clientName ? 'border-red-500' : 'border-slate-700' }`}
                    />
                  </InputField>

                  <InputField label="Correo electrónico *" icon={FaEnvelope} error={errors.clientEmail}>
                    <input
                      type="email" name="clientEmail"
                      value={form.clientEmail} onChange={handleChange}
                      placeholder="tu@correo.com"
                      autoComplete="email"
                      className={`w-full bg-slate-950 border rounded-xl px-4 py-3
                        text-sm text-slate-200 placeholder-slate-500 outline-none
                        transition-all duration-200
                        focus:ring-2 focus:ring-primary/40 focus:border-primary
                        ${ errors.clientEmail ? 'border-red-500' : 'border-slate-700' }`}
                    />
                  </InputField>

                  <InputField label="Teléfono (opcional)" icon={FaPhone}>
                    <input
                      type="tel" name="clientPhone"
                      value={form.clientPhone} onChange={handleChange}
                      placeholder="310 000 0000"
                      autoComplete="tel"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl
                        px-4 py-3 text-sm text-slate-200 placeholder-slate-500 outline-none
                        transition-all duration-200
                        focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    />
                  </InputField>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={goNext}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl
                        bg-primary text-slate-950 font-bold text-sm
                        hover:bg-primary/90 active:scale-95 transition-all duration-200"
                    >
                      Continuar <FaArrowRight size={12} />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── PASO 2: Fecha y hora ───────────────────── */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-5"
                >
                  <div className="text-center mb-5">
                    <FaCalendarAlt className="text-primary text-3xl mx-auto mb-2" />
                    <h2 className="text-lg font-bold text-white">¿Cuándo quieres ir?</h2>
                    <p className="text-slate-400 text-sm">Elige la fecha y la franja horaria que prefieras</p>
                  </div>

                  <InputField label="Fecha deseada *" icon={FaCalendarAlt} error={errors.requestedDate}>
                    <input
                      type="date" name="requestedDate"
                      value={form.requestedDate} onChange={handleChange}
                      min={minDate}
                      className={`w-full bg-slate-950 border rounded-xl px-4 py-3
                        text-sm text-slate-200 outline-none transition-all duration-200
                        focus:ring-2 focus:ring-primary/40 focus:border-primary
                        ${ errors.requestedDate ? 'border-red-500' : 'border-slate-700' }`}
                    />
                  </InputField>

                  {/* Selector visual de hora */}
                  <div>
                    <label className="block text-slate-300 text-sm font-semibold mb-2">
                      <FaClock className="inline mr-1.5 text-slate-500" size={12} />
                      Hora preferida *
                    </label>
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                      {TIME_SLOTS.map((time) => (
                        <button
                          key={time}
                          type="button"
                          onClick={() => selectTime(time)}
                          className={`py-2 rounded-xl text-xs font-semibold transition-all
                            duration-150 border active:scale-95
                            ${ form.requestedTime === time
                              ? 'bg-primary text-slate-950 border-primary shadow-lg shadow-primary/20'
                              : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-primary/50 hover:text-white'
                            }`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                    {errors.requestedTime && (
                      <p className="text-red-400 text-xs mt-1.5">{errors.requestedTime}</p>
                    )}
                    <p className="text-slate-600 text-xs mt-2">
                      Horario de atención: lunes a sábado · Sujeto a disponibilidad
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-3">
                    <button
                      onClick={goBack}
                      className="flex items-center gap-2 px-5 py-3 rounded-xl
                        bg-slate-800 text-slate-200 font-semibold text-sm
                        hover:bg-slate-700 active:scale-95 transition-all duration-200"
                    >
                      <FaArrowLeft size={12} /> Atrás
                    </button>
                    <button
                      onClick={goNext}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl
                        bg-primary text-slate-950 font-bold text-sm
                        hover:bg-primary/90 active:scale-95 transition-all duration-200"
                    >
                      Continuar <FaArrowRight size={12} />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── PASO 3: Confirmar ──────────────────────── */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-5"
                >
                  <div className="text-center mb-5">
                    <FaCheckCircle className="text-primary text-3xl mx-auto mb-2" />
                    <h2 className="text-lg font-bold text-white">Confirma tu solicitud</h2>
                    <p className="text-slate-400 text-sm">Revisa los datos antes de enviar</p>
                  </div>

                  {/* Resumen */}
                  <div className="bg-slate-800/60 border border-slate-700 rounded-xl
                    p-4 space-y-3">
                    <h3 className="text-white font-semibold text-sm mb-1">Resumen de tu visita</h3>
                    {property && (
                      <div className="flex items-start gap-2.5 text-sm">
                        <FaHome className="text-primary mt-0.5 flex-shrink-0" size={12} />
                        <div>
                          <p className="text-white font-medium">{property.title}</p>
                          <p className="text-slate-400 text-xs">{property.city}</p>
                        </div>
                      </div>
                    )}
                    <div className="border-t border-slate-700 pt-3 space-y-2.5">
                      <div className="flex items-center gap-2.5 text-sm">
                        <FaUser className="text-primary flex-shrink-0" size={11} />
                        <span className="text-slate-300">{form.clientName}</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-sm">
                        <FaEnvelope className="text-primary flex-shrink-0" size={11} />
                        <span className="text-slate-300">{form.clientEmail}</span>
                      </div>
                      {form.clientPhone && (
                        <div className="flex items-center gap-2.5 text-sm">
                          <FaPhone className="text-primary flex-shrink-0" size={11} />
                          <span className="text-slate-300">{form.clientPhone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2.5 text-sm">
                        <FaCalendarAlt className="text-primary flex-shrink-0" size={11} />
                        <span className="text-slate-300">{formatDate(form.requestedDate)}</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-sm">
                        <FaClock className="text-primary flex-shrink-0" size={11} />
                        <span className="text-slate-300">{form.requestedTime} horas</span>
                      </div>
                    </div>
                  </div>

                  {/* Notas opcionales */}
                  <InputField label="Mensaje o comentario (opcional)" icon={FaStickyNote}>
                    <textarea
                      name="notes"
                      value={form.notes} onChange={handleChange}
                      placeholder="Cuéntanos algo sobre tu interés o preguntas que tengas..."
                      rows={3}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl
                        px-4 py-3 text-sm text-slate-200 placeholder-slate-500
                        outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
                        transition-all duration-200 resize-none"
                    />
                  </InputField>

                  {/* Política de privacidad */}
                  <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acceptedPrivacy}
                        onChange={(e) => {
                          setAcceptedPrivacy(e.target.checked);
                          if (e.target.checked)
                            setErrors((prev) => ({ ...prev, privacy: '' }));
                        }}
                        className="mt-0.5 w-4 h-4 accent-primary flex-shrink-0"
                      />
                      <span className="text-slate-300 text-sm leading-relaxed">
                        He leído y acepto la{' '}
                        <Link
                          to="/politica-privacidad"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline font-semibold"
                        >
                          Política de Privacidad y Uso de Datos
                        </Link>
                        {' '}de Inmobiliaria Rincón Bedoya y Asociados.
                        Entiendo que mis datos serán usados para gestionar mi solicitud de visita.
                      </span>
                    </label>
                    {errors.privacy && (
                      <p className="text-red-400 text-xs mt-2 flex items-center gap-1.5">
                        <FaShieldAlt size={10} /> {errors.privacy}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-3">
                    <button
                      onClick={goBack}
                      className="flex items-center gap-2 px-5 py-3 rounded-xl
                        bg-slate-800 text-slate-200 font-semibold text-sm
                        hover:bg-slate-700 active:scale-95 transition-all duration-200"
                    >
                      <FaArrowLeft size={12} /> Atrás
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl
                        bg-primary text-slate-950 font-bold text-sm
                        hover:bg-primary/90 active:scale-95 transition-all duration-200
                        disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
                        <><span className="w-4 h-4 border-2 border-slate-950
                          border-t-transparent rounded-full animate-spin" />
                          Enviando...</>
                      ) : (
                        <><FaCalendarAlt size={13} /> Enviar solicitud</>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Pie de página */}
        <p className="text-slate-600 text-xs text-center mt-4">
          ¿Tienes dudas? Escríbenos al{' '}
          <a
            href="https://wa.me/573105968202"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            310 596 8202
          </a>
        </p>
      </div>
    </div>
  );
}
