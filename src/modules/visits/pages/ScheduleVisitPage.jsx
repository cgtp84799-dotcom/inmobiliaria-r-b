import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaCalendarAlt, FaClock, FaUser, FaPhone,
  FaEnvelope, FaStickyNote, FaCheckCircle, FaArrowLeft,
  FaArrowRight, FaHome, FaShieldAlt, FaMapMarkerAlt,
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import { visitService } from '../services/visit.service';
import { createVisitPayload } from '../types/visit.types';
import propertyService from '../../properties/services/property.service';

// ─────────────────────────────────────────────────────
// Animación de deslizamiento entre pasos
// ─────────────────────────────────────────────────────
const slideVariants = {
  enter:  (dir) => ({ x: dir > 0 ? 56 : -56, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:   (dir) => ({ x: dir > 0 ? -56 : 56, opacity: 0 }),
};

const STEPS = [
  { id: 1, label: 'Tus datos',    icon: FaUser        },
  { id: 2, label: 'Fecha y hora', icon: FaCalendarAlt },
  { id: 3, label: 'Confirmar',    icon: FaCheckCircle },
];

const TIME_SLOTS = [
  '08:00','08:30','09:00','09:30','10:00','10:30',
  '11:00','11:30','14:00','14:30','15:00','15:30',
  '16:00','16:30','17:00',
];

// ─────────────────────────────────────────────────────
// Indicador de pasos (usa variables semánticas inline)
// ─────────────────────────────────────────────────────
function StepIndicator({ current }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((step, i) => {
        const done   = current > step.id;
        const active = current === step.id;
        const Icon   = step.icon;
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                style={{
                  width: 40, height: 40, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 13,
                  border: `2px solid ${ done || active ? 'var(--tw-primary)' : 'var(--color-border)' }`,
                  background: done
                    ? 'var(--tw-primary)'
                    : active
                      ? 'var(--tw-primary-15)'
                      : 'var(--color-surface)',
                  color: done
                    ? '#111827'
                    : active
                      ? 'var(--tw-primary)'
                      : 'var(--color-text-faint)',
                  transition: 'all 0.3s ease',
                }}
              >
                {done ? <FaCheckCircle size={14} /> : <Icon size={13} />}
              </div>
              <span
                style={{
                  fontSize: 11, marginTop: 6, fontWeight: 600,
                  color: active
                    ? 'var(--tw-primary)'
                    : done
                      ? 'var(--color-text-muted)'
                      : 'var(--color-text-faint)',
                  transition: 'color 0.3s ease',
                }}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                style={{
                  height: 2,
                  width: 56,
                  marginInline: 8,
                  marginBottom: 16,
                  borderRadius: 9999,
                  background: current > step.id ? 'var(--tw-primary)' : 'var(--color-border)',
                  transition: 'background 0.5s ease',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────
// Campo de formulario genérico
// ─────────────────────────────────────────────────────
function InputField({ label, icon: Icon, error, hint, children }) {
  return (
    <div>
      <label
        style={{
          display: 'block',
          fontSize: 13,
          fontWeight: 600,
          marginBottom: 6,
          color: 'var(--color-text)',
        }}
      >
        {Icon && <Icon style={{ display:'inline', marginRight:5, color:'var(--color-text-faint)', verticalAlign:'middle' }} size={12} />}
        {label}
      </label>
      {children}
      {hint && !error && (
        <p style={{ fontSize: 11, marginTop: 4, color: 'var(--color-text-faint)' }}>{hint}</p>
      )}
      {error && (
        <p style={{ fontSize: 11, marginTop: 4, color: '#f87171', display:'flex', alignItems:'center', gap:4 }}>
          ⚠ {error}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────
// Badge de propiedad
// ─────────────────────────────────────────────────────
function PropertyBadge({ property }) {
  if (!property) return null;
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', borderRadius: 12, marginBottom: 24,
        background: 'var(--tw-primary-10)',
        border: '1px solid var(--tw-primary-20)',
      }}
    >
      <FaHome style={{ color: 'var(--tw-primary)', flexShrink: 0 }} size={14} />
      <div style={{ minWidth: 0 }}>
        <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text)', marginBottom: 1 }}>
          {property.title}
        </p>
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', display:'flex', alignItems:'center', gap:4 }}>
          <FaMapMarkerAlt size={10} /> {property.city}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// Botón primario (dorado)
// ─────────────────────────────────────────────────────
function BtnPrimary({ onClick, disabled, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="button-gold"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '12px 24px', fontSize: 14, fontWeight: 700,
        borderRadius: 12, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────
// Botón secundario (neutro)
// ─────────────────────────────────────────────────────
function BtnSecondary({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '12px 20px', fontSize: 14, fontWeight: 600,
        borderRadius: 12, cursor: 'pointer',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        color: 'var(--color-text)',
        transition: 'background 0.2s, border-color 0.2s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--tw-primary)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────
// Fila del resumen (paso 3)
// ─────────────────────────────────────────────────────
function SummaryRow({ icon: Icon, value }) {
  if (!value) return null;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, fontSize:14 }}>
      <Icon style={{ color:'var(--tw-primary)', flexShrink:0 }} size={12} />
      <span style={{ color:'var(--color-text)' }}>{value}</span>
    </div>
  );
}

// ═════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ═════════════════════════════════════════════════════
export default function ScheduleVisitPage() {
  const [params]   = useSearchParams();
  const propertyId = params.get('propertyId');

  const [property,        setProperty]        = useState(null);
  const [loading,         setLoading]         = useState(!!propertyId);
  const [submitting,      setSubmitting]      = useState(false);
  const [success,         setSuccess]         = useState(false);
  const [step,            setStep]            = useState(1);
  const [direction,       setDirection]       = useState(1);
  const [errors,          setErrors]          = useState({});
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  const [form, setForm] = useState({
    clientName:    '',
    clientEmail:   '',
    clientPhone:   '',
    requestedDate: '',
    requestedTime: '',
    notes:         '',
  });

  // Fecha mínima = mañana
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  // Cargar datos de propiedad si viene desde una ficha
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

  const selectTime = (time) => {
    setForm((prev) => ({ ...prev, requestedTime: time }));
    if (errors.requestedTime) setErrors((prev) => ({ ...prev, requestedTime: '' }));
  };

  const validateStep = (s) => {
    const errs = {};
    if (s === 1) {
      if (!form.clientName.trim())
        errs.clientName = 'Tu nombre es obligatorio';
      if (!form.clientEmail.trim())
        errs.clientEmail = 'El correo es obligatorio';
      else if (!/\S+@\S+\.\S+/.test(form.clientEmail))
        errs.clientEmail = 'Ingresa un correo válido';
    }
    if (s === 2) {
      if (!form.requestedDate) errs.requestedDate = 'Elige una fecha';
      if (!form.requestedTime) errs.requestedTime = 'Elige una hora';
    }
    if (s === 3) {
      if (!acceptedPrivacy)
        errs.privacy = 'Debes aceptar la política de privacidad para continuar';
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
    } catch (err) {
      console.error(err);
      toast.error('Error al enviar la solicitud. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    const months = ['enero','febrero','marzo','abril','mayo','junio',
                    'julio','agosto','septiembre','octubre','noviembre','diciembre'];
    return `${parseInt(day)} de ${months[parseInt(m) - 1]} de ${y}`;
  };

  // ── Inputs compartidos ────────────────────────────────
  const inputStyle = (hasError) => ({
    width: '100%',
    background: 'var(--color-input-bg)',
    border: `1px solid ${hasError ? '#f87171' : 'var(--color-input-border)'}`,
    borderRadius: 12,
    padding: '12px 16px',
    fontSize: 14,
    color: 'var(--color-input-text)',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  });

  // ═══════════════════════════════════════════════════
  // PANTALLA DE ÉXITO
  // ═══════════════════════════════════════════════════
  if (success) {
    return (
      <div
        style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center',
          justifyContent: 'center', padding: '2rem 1rem',
          background: 'var(--color-bg)',
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="card-soft"
          style={{
            maxWidth: 440, width: '100%', textAlign: 'center',
            padding: '2.5rem 2rem',
          }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 260, damping: 20 }}
            style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'rgba(34,197,94,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.25rem',
            }}
          >
            <FaCheckCircle style={{ color: '#22c55e', fontSize: 36 }} />
          </motion.div>

          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text)', marginBottom: 8 }}>
            ¡Solicitud enviada!
          </h2>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 6 }}>
            Tu solicitud de visita para{' '}
            <strong style={{ color: 'var(--color-text)' }}>{property?.title ?? 'la propiedad'}</strong>{' '}
            fue recibida correctamente.
          </p>
          <p style={{ fontSize: 13, color: 'var(--color-text-faint)', marginBottom: 24 }}>
            Un asesor se pondrá en contacto contigo al correo{' '}
            <span style={{ color: 'var(--tw-primary)', fontWeight: 600 }}>{form.clientEmail}</span>{' '}
            en las próximas horas.
          </p>

          {/* Mini-resumen */}
          <div
            className="card-inner"
            style={{ padding: '12px 16px', marginBottom: 24, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            <SummaryRow icon={FaCalendarAlt} value={formatDate(form.requestedDate)} />
            <SummaryRow icon={FaClock}       value={`${form.requestedTime} horas`} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Link to="/catalogo" className="button-gold" style={{ justifyContent:'center', borderRadius:12 }}>
              Ver más propiedades
            </Link>
            {propertyId && (
              <BtnSecondary onClick={() => {
                setSuccess(false); setStep(1);
                setForm({ clientName:'',clientEmail:'',clientPhone:'',
                          requestedDate:'',requestedTime:'',notes:'' });
                setAcceptedPrivacy(false);
              }}>
                Nueva solicitud
              </BtnSecondary>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════
  // LAYOUT PRINCIPAL
  // ═══════════════════════════════════════════════════
  return (
    <div style={{ minHeight: '100vh', padding: '2rem 1rem', background: 'var(--color-bg)' }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>

        {/* Volver atrás */}
        <Link
          to={propertyId ? `/propiedades/${propertyId}` : '/catalogo'}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            fontSize: 13, fontWeight: 500,
            color: 'var(--color-text-muted)',
            marginBottom: 24, textDecoration: 'none',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--tw-primary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
        >
          <FaArrowLeft size={12} />
          {property ? `Volver a ${property.title}` : 'Volver al catálogo'}
        </Link>

        {/* Tarjeta principal */}
        <div
          className="card-soft"
          style={{ padding: '2rem 1.75rem' }}
        >
          {/* Header de la tarjeta */}
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                width: 48, height: 48, borderRadius: 14,
                background: 'var(--tw-primary-15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <FaCalendarAlt style={{ color: 'var(--tw-primary)', fontSize: 20 }} />
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text)', marginBottom: 4 }}>
              Agendar visita
            </h1>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
              Completa los 3 pasos para solicitar tu cita. Es muy rápido.
            </p>
          </div>

          {/* Badge propiedad */}
          {!loading && <PropertyBadge property={property} />}

          {/* Indicador de pasos */}
          <StepIndicator current={step} />

          {/* Contenido animado */}
          <div style={{ overflow: 'hidden' }}>
            <AnimatePresence mode="wait" custom={direction}>

              {/* ══ PASO 1: Tus datos ══════════════════════════════ */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter" animate="center" exit="exit"
                  transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
                >
                  {/* Encabezado del paso */}
                  <div style={{ textAlign: 'center', marginBottom: 4 }}>
                    <div
                      style={{
                        width: 56, height: 56, borderRadius: '50%',
                        background: 'var(--tw-primary-10)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 12px',
                      }}
                    >
                      <FaUser style={{ color: 'var(--tw-primary)', fontSize: 22 }} />
                    </div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>
                      ¿Quién eres?
                    </h2>
                    <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                      Necesitamos tus datos básicos para confirmar la visita.
                    </p>
                  </div>

                  <InputField label="Nombre completo *" icon={FaUser} error={errors.clientName}>
                    <input
                      type="text" name="clientName"
                      value={form.clientName} onChange={handleChange}
                      placeholder="Ej: María González"
                      autoComplete="name"
                      style={inputStyle(errors.clientName)}
                    />
                  </InputField>

                  <InputField
                    label="Correo electrónico *" icon={FaEnvelope}
                    error={errors.clientEmail}
                    hint="Te enviaremos la confirmación a este correo"
                  >
                    <input
                      type="email" name="clientEmail"
                      value={form.clientEmail} onChange={handleChange}
                      placeholder="tu@correo.com"
                      autoComplete="email"
                      style={inputStyle(errors.clientEmail)}
                    />
                  </InputField>

                  <InputField
                    label="Teléfono (opcional)" icon={FaPhone}
                    hint="Si lo tienes, podemos llamarte para confirmar"
                  >
                    <input
                      type="tel" name="clientPhone"
                      value={form.clientPhone} onChange={handleChange}
                      placeholder="310 000 0000"
                      autoComplete="tel"
                      style={inputStyle(false)}
                    />
                  </InputField>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
                    <BtnPrimary onClick={goNext}>
                      Continuar <FaArrowRight size={12} />
                    </BtnPrimary>
                  </div>
                </motion.div>
              )}

              {/* ══ PASO 2: Fecha y hora ═══════════════════════════ */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter" animate="center" exit="exit"
                  transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
                >
                  <div style={{ textAlign: 'center', marginBottom: 4 }}>
                    <div
                      style={{
                        width: 56, height: 56, borderRadius: '50%',
                        background: 'var(--tw-primary-10)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 12px',
                      }}
                    >
                      <FaCalendarAlt style={{ color: 'var(--tw-primary)', fontSize: 22 }} />
                    </div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>
                      ¿Cuándo quieres ir?
                    </h2>
                    <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                      Elige la fecha y la franja horaria que más te convenga.
                    </p>
                  </div>

                  <InputField label="Fecha deseada *" icon={FaCalendarAlt} error={errors.requestedDate}>
                    <input
                      type="date" name="requestedDate"
                      value={form.requestedDate} onChange={handleChange}
                      min={minDate}
                      style={inputStyle(errors.requestedDate)}
                    />
                  </InputField>

                  {/* Selector visual de hora */}
                  <div>
                    <label
                      style={{
                        display: 'block', fontSize: 13, fontWeight: 600,
                        marginBottom: 10, color: 'var(--color-text)',
                      }}
                    >
                      <FaClock style={{ display:'inline', marginRight:5, color:'var(--color-text-faint)', verticalAlign:'middle' }} size={12} />
                      Hora preferida *
                    </label>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: 8,
                      }}
                    >
                      {TIME_SLOTS.map((time) => {
                        const selected = form.requestedTime === time;
                        return (
                          <button
                            key={time}
                            type="button"
                            onClick={() => selectTime(time)}
                            style={{
                              padding: '9px 4px', borderRadius: 10,
                              fontSize: 12, fontWeight: 600, cursor: 'pointer',
                              border: `1.5px solid ${ selected ? 'var(--tw-primary)' : 'var(--color-border)' }`,
                              background: selected ? 'var(--tw-primary)' : 'var(--color-surface)',
                              color: selected ? '#111827' : 'var(--color-text)',
                              boxShadow: selected ? '0 2px 12px var(--tw-primary-30)' : 'none',
                              transition: 'all 0.15s ease',
                              transform: selected ? 'scale(1.04)' : 'scale(1)',
                            }}
                          >
                            {time}
                          </button>
                        );
                      })}
                    </div>

                    {errors.requestedTime && (
                      <p style={{ fontSize: 11, marginTop: 6, color: '#f87171' }}>
                        ⚠ {errors.requestedTime}
                      </p>
                    )}
                    <p style={{ fontSize: 11, marginTop: 8, color: 'var(--color-text-faint)' }}>
                      Lunes a sábado · Sujeto a disponibilidad del asesor
                    </p>
                  </div>

                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, paddingTop:4 }}>
                    <BtnSecondary onClick={goBack}>
                      <FaArrowLeft size={12} /> Atrás
                    </BtnSecondary>
                    <BtnPrimary onClick={goNext}>
                      Continuar <FaArrowRight size={12} />
                    </BtnPrimary>
                  </div>
                </motion.div>
              )}

              {/* ══ PASO 3: Confirmar ══════════════════════════════ */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter" animate="center" exit="exit"
                  transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
                >
                  <div style={{ textAlign: 'center', marginBottom: 4 }}>
                    <div
                      style={{
                        width: 56, height: 56, borderRadius: '50%',
                        background: 'var(--tw-primary-10)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 12px',
                      }}
                    >
                      <FaCheckCircle style={{ color: 'var(--tw-primary)', fontSize: 22 }} />
                    </div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>
                      Confirma tu solicitud
                    </h2>
                    <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                      Revisa que todo esté bien antes de enviar.
                    </p>
                  </div>

                  {/* Tarjeta resumen */}
                  <div
                    className="card-inner"
                    style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}
                  >
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>
                      Resumen de tu visita
                    </p>
                    {property && (
                      <div style={{ display:'flex', alignItems:'flex-start', gap:10, paddingBottom:10, borderBottom:'1px solid var(--color-divider)' }}>
                        <FaHome style={{ color:'var(--tw-primary)', marginTop:2, flexShrink:0 }} size={13} />
                        <div>
                          <p style={{ fontWeight:700, fontSize:14, color:'var(--color-text)' }}>{property.title}</p>
                          <p style={{ fontSize:12, color:'var(--color-text-muted)', marginTop:1 }}>{property.city}</p>
                        </div>
                      </div>
                    )}
                    <SummaryRow icon={FaUser}        value={form.clientName} />
                    <SummaryRow icon={FaEnvelope}    value={form.clientEmail} />
                    <SummaryRow icon={FaPhone}       value={form.clientPhone} />
                    <SummaryRow icon={FaCalendarAlt} value={formatDate(form.requestedDate)} />
                    <SummaryRow icon={FaClock}       value={form.requestedTime ? `${form.requestedTime} horas` : ''} />
                  </div>

                  {/* Notas opcionales */}
                  <InputField label="Mensaje o comentario (opcional)" icon={FaStickyNote}>
                    <textarea
                      name="notes"
                      value={form.notes} onChange={handleChange}
                      placeholder="¿Tienes alguna pregunta o comentario para el asesor?"
                      rows={3}
                      style={{ ...inputStyle(false), resize: 'none' }}
                    />
                  </InputField>

                  {/* Política de privacidad */}
                  <div
                    style={{
                      background: 'var(--tw-primary-10)',
                      border: `1px solid ${errors.privacy ? '#f87171' : 'var(--tw-primary-20)'}`,
                      borderRadius: 12, padding: '14px 16px',
                    }}
                  >
                    <label style={{ display:'flex', alignItems:'flex-start', gap:12, cursor:'pointer' }}>
                      <input
                        type="checkbox"
                        checked={acceptedPrivacy}
                        onChange={(e) => {
                          setAcceptedPrivacy(e.target.checked);
                          if (e.target.checked)
                            setErrors((prev) => ({ ...prev, privacy: '' }));
                        }}
                        style={{ marginTop: 2, width: 16, height: 16, accentColor: 'var(--tw-primary)', flexShrink: 0 }}
                      />
                      <span style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.6 }}>
                        He leído y acepto la{' '}
                        <Link
                          to="/politica-privacidad"
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--tw-primary)', fontWeight: 700 }}
                        >
                          Política de Privacidad y Uso de Datos
                        </Link>{' '}
                        de Inmobiliaria Rincón Bedoya y Asociados. Entiendo que mis datos serán
                        usados únicamente para gestionar mi solicitud de visita.
                      </span>
                    </label>
                    {errors.privacy && (
                      <p style={{ fontSize: 11, marginTop: 8, color: '#f87171', display:'flex', alignItems:'center', gap:4 }}>
                        <FaShieldAlt size={10} /> {errors.privacy}
                      </p>
                    )}
                  </div>

                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, paddingTop:4 }}>
                    <BtnSecondary onClick={goBack}>
                      <FaArrowLeft size={12} /> Atrás
                    </BtnSecondary>
                    <BtnPrimary onClick={handleSubmit} disabled={submitting}>
                      {submitting ? (
                        <>
                          <span
                            style={{
                              width:16, height:16, borderRadius:'50%',
                              border:'2px solid #111827',
                              borderTopColor:'transparent',
                              display:'inline-block',
                              animation:'spin 0.7s linear infinite',
                            }}
                          />
                          Enviando...
                        </>
                      ) : (
                        <><FaCalendarAlt size={13} /> Enviar solicitud</>
                      )}
                    </BtnPrimary>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>

        {/* Pie de página */}
        <p style={{ fontSize: 12, textAlign: 'center', marginTop: 16, color: 'var(--color-text-faint)' }}>
          ¿Tienes dudas?{' '}
          <a
            href="https://wa.me/573105968202"
            target="_blank" rel="noopener noreferrer"
            style={{ color: 'var(--tw-primary)', fontWeight: 600 }}
          >
            Escríbenos al 310 596 8202
          </a>
        </p>
      </div>
    </div>
  );
}
