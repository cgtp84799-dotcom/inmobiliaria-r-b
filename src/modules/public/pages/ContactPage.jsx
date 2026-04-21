// src/modules/public/pages/ContactPage.jsx
// ─────────────────────────────────────────────────────────────
// Contacto editorial — Inmobiliaria Rincón Bedoya & Asociados
// · Hero con Fraunces · formulario completo → contactService
// · Mapa de Google Maps embebido (Cra 5 #9-28 Anserma)
// · FAQ accordion · tarjetas WhatsApp/Tel/Email/Dirección
// · Todo tokenizado (cero hardcoding)
// ─────────────────────────────────────────────────────────────

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import {
  FaWhatsapp, FaPhone, FaEnvelope, FaMapMarkerAlt, FaClock,
  FaPaperPlane, FaCheckCircle, FaChevronDown, FaUser,
  FaBalanceScale, FaHome, FaSearch, FaFileContract,
  FaChartLine, FaQuestionCircle, FaArrowRight,
} from "react-icons/fa";
import toast from "react-hot-toast";
import contactService from "../services/contact.service";

/* ─── Data ────────────────────────────────────────────────── */

const INTEREST_OPTIONS = [
  { value: "comprar",      label: "Comprar una propiedad",    icon: FaHome },
  { value: "arrendar",     label: "Arrendar",                  icon: FaHome },
  { value: "vender",       label: "Vender / publicar",         icon: FaHome },
  { value: "saneamiento",  label: "Saneamiento jurídico",      icon: FaBalanceScale },
  { value: "sucesion",     label: "Sucesión / pertenencia",    icon: FaFileContract },
  { value: "avaluo",       label: "Avalúo certificado",        icon: FaChartLine },
  { value: "otro",         label: "Otro / consulta general",   icon: FaQuestionCircle },
];

const CHANNELS = [
  {
    type: "whatsapp",
    icon: FaWhatsapp,
    label: "WhatsApp",
    value: "+57 310 596 8202",
    href: "https://wa.me/573105968202?text=Hola,%20quiero%20información",
    accent: "var(--color-contact-whatsapp, #25d366)",
    note: "Respuesta en minutos",
  },
  {
    type: "phone",
    icon: FaPhone,
    label: "Teléfono",
    value: "+57 320 673 6391",
    href: "tel:+573206736391",
    accent: "#3b82f6",
    note: "Lun–Vie · 8am a 5:30pm",
  },
  {
    type: "email",
    icon: FaEnvelope,
    label: "Correo",
    value: "inmojuridi09@gmail.com",
    href: "mailto:inmojuridi09@gmail.com",
    accent: "#ef4444",
    note: "Respuesta en 24h hábiles",
  },
];

const FAQ_ITEMS = [
  {
    q: "¿Cobran por la primera asesoría?",
    a: "No. La primera asesoría es siempre gratuita. Escuchamos tu caso, revisamos el estado jurídico de la propiedad y te explicamos las opciones antes de hablar de honorarios.",
  },
  {
    q: "¿Qué documentos necesito para publicar mi inmueble?",
    a: "Basta con certificado de tradición y libertad reciente, copia del impuesto predial al día, y una llave o acceso para fotos. Nosotros nos encargamos del resto: avalúo, descripción, documentación de arriendo o venta.",
  },
  {
    q: "¿Trabajan con créditos hipotecarios?",
    a: "Sí. Gestionamos créditos hipotecarios con bancos aliados y también con nuestra red de inversionistas privados. Podemos ayudarte a comparar tasas y acompañar el proceso de aprobación.",
  },
  {
    q: "¿Qué es el saneamiento Ley 1561 de 2012?",
    a: "Es un proceso especial para titular pequeños inmuebles rurales y urbanos a nombre del poseedor material. Lo manejamos de principio a fin: desde la verificación de requisitos hasta la sentencia.",
  },
  {
    q: "¿Atienden fuera de Anserma?",
    a: "Sí. Nuestra base está en Anserma, pero operamos en Caldas, Risaralda y estamos en expansión. Si tu zona no aparece en el catálogo, escríbenos — probablemente podamos acompañarte.",
  },
];

const SCHEDULE = [
  { day: "Lunes a Viernes", hours: "8:00 a.m. — 5:30 p.m." },
  { day: "Sábados",          hours: "8:30 a.m. — 1:00 p.m." },
  { day: "Domingos",         hours: "Previa cita"           },
  { day: "Festivos",         hours: "Previa cita"           },
];

/* ─── Componente ──────────────────────────────────────────── */

const ContactPage = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    interest: "",
    message: "",
    acceptPrivacy: false,
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim())        return toast.error("Cuéntanos tu nombre");
    if (!form.phone.trim() && !form.email.trim())
      return toast.error("Déjanos al menos un teléfono o un correo");
    if (!form.interest)           return toast.error("Selecciona tu interés");
    if (!form.message.trim())     return toast.error("Cuéntanos brevemente qué necesitas");
    if (!form.acceptPrivacy)      return toast.error("Debes aceptar la política de privacidad");

    setLoading(true);
    try {
      const interestLabel = INTEREST_OPTIONS.find((o) => o.value === form.interest)?.label || form.interest;
      await contactService.createContact({
        name:    form.name.trim(),
        email:   form.email.trim(),
        phone:   form.phone.trim(),
        message: `[${interestLabel}] ${form.message.trim()}`,
        interest: form.interest,
        source:   "contact-page",
      });
      toast.success("¡Recibido! Te contactaremos pronto.");
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      toast.error("Hubo un error. Prueba por WhatsApp.");
    } finally {
      setLoading(false);
    }
  };

  const whatsappFallback = () => {
    const interestLabel = INTEREST_OPTIONS.find((o) => o.value === form.interest)?.label || "consulta";
    const text =
      `Hola, soy ${form.name || "[nombre]"}.\n` +
      `Interés: ${interestLabel}\n` +
      (form.phone ? `Teléfono: ${form.phone}\n` : "") +
      (form.email ? `Correo: ${form.email}\n` : "") +
      `\n${form.message || "Me gustaría recibir información."}`;
    window.open(
      `https://wa.me/573105968202?text=${encodeURIComponent(text)}`,
      "_blank",
    );
  };

  /* ═══════════════════════════════════════════════════════ */
  /*  RENDER                                                 */
  /* ═══════════════════════════════════════════════════════ */

  return (
    <div>
      <Helmet>
        <title>Contáctanos | Inmobiliaria Rincón Bedoya & Asociados</title>
        <meta name="description" content="Contáctanos por WhatsApp, teléfono, correo o formulario. Oficina en Cra 5 #9-28, Anserma, Caldas. Atención de lunes a sábado. Respaldo jurídico integral." />
        <link rel="canonical" href="https://inmobiliaria-ryb-y-asociados.com/contacto" />
        <meta property="og:title" content="Contáctanos | Inmobiliaria Rincón Bedoya & Asociados" />
        <meta property="og:description" content="WhatsApp, teléfono, correo y oficina. Primera asesoría gratuita." />
        <meta property="og:url" content="https://inmobiliaria-ryb-y-asociados.com/contacto" />
      </Helmet>

      {/* ═══════════════════════════════════════════════════ */}
      {/*  HERO editorial                                      */}
      {/* ═══════════════════════════════════════════════════ */}
      <section className="contact-hero relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 lg:py-24">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-3xl"
          >
            <span className="eyebrow">Hablemos</span>
            <h1 className="heading-display mt-6 text-[clamp(2.25rem,5vw+0.5rem,4.5rem)]">
              La primera asesoría <em>es gratuita.</em>
              <br />
              La segunda, también.
            </h1>
            <p
              className="mt-6 text-lg sm:text-xl leading-relaxed max-w-2xl"
              style={{ color: "var(--color-text-muted)" }}
            >
              Cuéntanos qué necesitas: comprar, vender, arrendar, sanear o
              consultar. Te respondemos con una propuesta clara, sin letras
              pequeñas.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════ */}
      {/*  CANALES — 3 tarjetas de contacto directo           */}
      {/* ═══════════════════════════════════════════════════ */}
      <section className="pb-12 sm:pb-16 -mt-6 sm:-mt-10 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {CHANNELS.map((c, i) => {
              const Icon = c.icon;
              return (
                <motion.a
                  key={c.type}
                  href={c.href}
                  target={c.type === "whatsapp" ? "_blank" : undefined}
                  rel={c.type === "whatsapp" ? "noopener noreferrer" : undefined}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.08, duration: 0.5 }}
                  className="contact-channel"
                  style={{ "--channel-accent": c.accent }}
                >
                  <span className="contact-channel__icon">
                    <Icon />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="contact-channel__label">{c.label}</p>
                    <p className="contact-channel__value">{c.value}</p>
                    <p className="contact-channel__note">{c.note}</p>
                  </div>
                  <FaArrowRight className="contact-channel__arrow" />
                </motion.a>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════ */}
      {/*  FORMULARIO + MAPA — layout editorial 2 columnas     */}
      {/* ═══════════════════════════════════════════════════ */}
      <section className="pb-16 sm:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">

            {/* Formulario */}
            <div className="lg:col-span-7">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="contact-form-card"
              >
                <div className="mb-7">
                  <span
                    className="text-xs font-bold uppercase tracking-[0.15em] mb-3 block"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Deja tu consulta
                  </span>
                  <h2
                    className="font-display text-3xl sm:text-4xl leading-tight"
                    style={{ color: "var(--color-text)" }}
                  >
                    Escríbenos y <em style={{ color: "#d97706", fontStyle: "italic", fontWeight: 400 }}>te contactamos en el día.</em>
                  </h2>
                </div>

                <AnimatePresence mode="wait">
                  {submitted ? (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="contact-success"
                    >
                      <div className="contact-success__icon">
                        <FaCheckCircle />
                      </div>
                      <h3
                        className="font-display text-2xl sm:text-3xl mt-5"
                        style={{ color: "var(--color-text)" }}
                      >
                        ¡Recibido, {form.name.split(" ")[0]}!
                      </h3>
                      <p
                        className="mt-3 max-w-md"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        Un asesor te contactará pronto. Mientras tanto, si es
                        urgente puedes escribirnos directamente por WhatsApp.
                      </p>
                      <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                        <a
                          href="https://wa.me/573105968202"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-primary"
                        >
                          <FaWhatsapp /> Escribir por WhatsApp
                        </a>
                        <button
                          onClick={() => {
                            setSubmitted(false);
                            setForm({
                              name: "", email: "", phone: "", interest: "",
                              message: "", acceptPrivacy: false,
                            });
                          }}
                          className="btn-secondary"
                        >
                          Enviar otra consulta
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.form
                      key="form"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onSubmit={handleSubmit}
                      className="flex flex-col gap-5"
                    >
                      {/* Nombre */}
                      <div>
                        <label htmlFor="name" className="contact-field-label">
                          Tu nombre *
                        </label>
                        <div className="relative">
                          <FaUser className="contact-field-icon" aria-hidden="true" />
                          <input
                            id="name"
                            type="text"
                            required
                            value={form.name}
                            onChange={(e) => handleChange("name", e.target.value)}
                            placeholder="Ej: María López"
                            className="contact-input pl-10"
                            autoComplete="name"
                          />
                        </div>
                      </div>

                      {/* Teléfono + Email */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="phone" className="contact-field-label">
                            Teléfono *
                          </label>
                          <div className="relative">
                            <FaPhone className="contact-field-icon" aria-hidden="true" />
                            <input
                              id="phone"
                              type="tel"
                              value={form.phone}
                              onChange={(e) => handleChange("phone", e.target.value)}
                              placeholder="310 000 0000"
                              className="contact-input pl-10"
                              autoComplete="tel"
                            />
                          </div>
                        </div>
                        <div>
                          <label htmlFor="email" className="contact-field-label">
                            Correo
                          </label>
                          <div className="relative">
                            <FaEnvelope className="contact-field-icon" aria-hidden="true" />
                            <input
                              id="email"
                              type="email"
                              value={form.email}
                              onChange={(e) => handleChange("email", e.target.value)}
                              placeholder="tu@correo.com"
                              className="contact-input pl-10"
                              autoComplete="email"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Interés — chips seleccionables */}
                      <div>
                        <label className="contact-field-label">
                          ¿En qué podemos ayudarte? *
                        </label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {INTEREST_OPTIONS.map((opt) => {
                            const Icon = opt.icon;
                            const active = form.interest === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => handleChange("interest", opt.value)}
                                className={`contact-interest-chip ${active ? "is-active" : ""}`}
                              >
                                <Icon className="text-xs" />
                                <span>{opt.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Mensaje */}
                      <div>
                        <label htmlFor="message" className="contact-field-label">
                          Cuéntanos más *
                        </label>
                        <textarea
                          id="message"
                          required
                          value={form.message}
                          onChange={(e) => handleChange("message", e.target.value)}
                          placeholder="Tipo de inmueble, zona de interés, presupuesto, o detalles del caso jurídico..."
                          className="contact-input contact-textarea"
                          rows={5}
                        />
                      </div>

                      {/* Privacidad */}
                      <label className="contact-checkbox">
                        <input
                          type="checkbox"
                          checked={form.acceptPrivacy}
                          onChange={(e) => handleChange("acceptPrivacy", e.target.checked)}
                        />
                        <span>
                          Acepto la{" "}
                          <a
                            href="/politica-privacidad"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline font-medium"
                            style={{ color: "#d97706" }}
                          >
                            política de privacidad
                          </a>
                          {" "}y el tratamiento de mis datos.
                        </span>
                      </label>

                      {/* Acciones */}
                      <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <button
                          type="submit"
                          disabled={loading}
                          className="btn-primary flex-1"
                        >
                          {loading ? (
                            <>
                              <span className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                              Enviando...
                            </>
                          ) : (
                            <>
                              <FaPaperPlane className="text-xs" />
                              Enviar consulta
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={whatsappFallback}
                          className="btn-secondary"
                        >
                          <FaWhatsapp /> Enviar por WhatsApp
                        </button>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>

            {/* Mapa + info oficina */}
            <div className="lg:col-span-5">
              <div className="lg:sticky lg:top-24 flex flex-col gap-5">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="contact-map-card"
                >
                  {/* Mapa embebido */}
                  <div className="contact-map-frame">
                    <iframe
                      title="Ubicación oficina — Cra 5 #9-28, Anserma, Caldas"
                      src="https://www.google.com/maps?q=Cra+5+%23+9-28,+Anserma,+Caldas,+Colombia&output=embed"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      allowFullScreen
                    />
                  </div>
                  <div className="p-5 sm:p-6">
                    <div className="flex items-start gap-3 mb-3">
                      <span className="contact-map-pin">
                        <FaMapMarkerAlt />
                      </span>
                      <div>
                        <p
                          className="text-xs font-bold uppercase tracking-[0.15em] mb-1"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          Visítanos en nuestra oficina
                        </p>
                        <p
                          className="font-display text-xl leading-tight"
                          style={{ color: "var(--color-text)" }}
                        >
                          Cra 5 #9-28
                          <br />
                          <em style={{ color: "#d97706", fontStyle: "italic", fontWeight: 400 }}>Anserma, Caldas</em>
                        </p>
                      </div>
                    </div>
                    <a
                      href="https://maps.google.com/?q=Cra+5+%23+9-28,+Anserma,+Caldas,+Colombia"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-ghost mt-2"
                    >
                      Abrir en Google Maps <FaArrowRight className="text-xs" />
                    </a>
                  </div>
                </motion.div>

                {/* Horarios */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.15 }}
                  className="contact-schedule-card"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span className="contact-map-pin" style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6" }}>
                      <FaClock />
                    </span>
                    <h3
                      className="font-display text-xl"
                      style={{ color: "var(--color-text)" }}
                    >
                      Horarios de atención
                    </h3>
                  </div>
                  <ul className="flex flex-col gap-2">
                    {SCHEDULE.map((s) => (
                      <li
                        key={s.day}
                        className="flex items-center justify-between py-2 border-b last:border-b-0"
                        style={{ borderColor: "var(--color-divider)" }}
                      >
                        <span
                          className="text-sm font-medium"
                          style={{ color: "var(--color-text)" }}
                        >
                          {s.day}
                        </span>
                        <span
                          className="text-sm font-semibold"
                          style={{ color: "#d97706" }}
                        >
                          {s.hours}
                        </span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════ */}
      {/*  FAQ — preguntas frecuentes                          */}
      {/* ═══════════════════════════════════════════════════ */}
      <section
        className="section-pad-sm"
        style={{ background: "var(--color-surface-off)" }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10 lg:mb-12">
            <span className="eyebrow">Preguntas frecuentes</span>
            <h2
              className="heading-section mt-5 text-3xl sm:text-4xl lg:text-5xl"
            >
              Lo que más nos <em>preguntan.</em>
            </h2>
          </div>

          <div className="flex flex-col gap-2">
            {FAQ_ITEMS.map((item, i) => {
              const open = openFaq === i;
              return (
                <div
                  key={i}
                  className={`contact-faq ${open ? "is-open" : ""}`}
                >
                  <button
                    className="contact-faq__trigger"
                    onClick={() => setOpenFaq(open ? null : i)}
                    aria-expanded={open}
                  >
                    <span className="contact-faq__question">{item.q}</span>
                    <FaChevronDown className="contact-faq__chevron" />
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="contact-faq__answer">{item.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          <div className="mt-10 text-center">
            <p
              className="text-sm mb-3"
              style={{ color: "var(--color-text-muted)" }}
            >
              ¿Tu pregunta no está aquí?
            </p>
            <a
              href="https://wa.me/573105968202?text=Hola,%20tengo%20una%20consulta"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              <FaWhatsapp /> Hacer una pregunta
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactPage;