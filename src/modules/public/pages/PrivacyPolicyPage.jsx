import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { SeoHead, buildBreadcrumbSchema } from "../../../shared/components/SEO";
import {
  FaShieldAlt, FaDatabase, FaUserShield, FaEnvelope,
  FaArrowLeft, FaLock, FaEye, FaTrash, FaPhone,
} from 'react-icons/fa';

const Section = ({ icon: Icon, title, children }) => (
  <motion.section
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    viewport={{ once: true }}
    className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6"
  >
    <div className="flex items-center gap-3 mb-4">
      <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
        <Icon className="text-primary" size={15} />
      </div>
      <h2 className="text-[var(--color-text)] font-bold text-base">{title}</h2>
    </div>
    <div className="text-[var(--color-text-muted)] text-sm leading-relaxed space-y-2">{children}</div>
  </motion.section>
);

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen py-8 px-4" style={{ backgroundColor: 'var(--color-bg)' }}>
      <SeoHead
        title="Política de privacidad y tratamiento de datos | Inmobiliaria Rincón Bedoya y Asociados"
        description="Política de tratamiento de datos personales conforme a la Ley 1581 de 2012 de Colombia. Conoce cómo recolectamos, usamos y protegemos tu información."
        path="/politica-privacidad"
        structuredData={[
          buildBreadcrumbSchema([
            { name: "Inicio", url: "/" },
            { name: "Política de privacidad" },
          ]),
        ]}
      />

      <div className="max-w-2xl mx-auto">
        {/* Back */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]
            text-sm mb-6 transition-colors"
        >
          <FaArrowLeft size={12} /> Volver al inicio
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center">
              <FaShieldAlt className="text-primary text-2xl" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-[var(--color-text)]">
                Política de Privacidad
              </h1>
              <p className="text-[var(--color-text-muted)] text-sm">Última actualización: abril de 2026</p>
            </div>
          </div>
          <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-3">
            <p className="text-[var(--color-text)] text-sm">
              Esta política describe cómo <strong className="text-[var(--color-text)]">Inmobiliaria Rincón Bedoya y Asociados</strong>{' '}
              recopila, usa y protege tus datos personales, de conformidad con la{' '}
              <strong className="text-[var(--color-text)]">Ley 1581 de 2012</strong> y el Decreto 1377 de 2013 de Colombia.
            </p>
          </div>
        </motion.div>

        {/* Secciones */}
        <div className="space-y-4">

          <Section icon={FaDatabase} title="1. Responsable del tratamiento">
            <p>
              <strong className="text-[var(--color-text)]">Razón social:</strong> Inmobiliaria Rincón Bedoya y Asociados
            </p>
            <p><strong className="text-[var(--color-text)]">Dirección:</strong> Cra 5 N.º 9-28, Anserma, Caldas, Colombia</p>
            <p>
              <strong className="text-[var(--color-text)]">Correo:</strong>{' '}
              <a href="mailto:inmojuridi09@gmail.com" className="text-primary hover:underline">
                inmojuridi09@gmail.com
              </a>
            </p>
            <p>
              <strong className="text-[var(--color-text)]">Teléfono:</strong> 310 596 8202 / 320 673 6391
            </p>
          </Section>

          <Section icon={FaEye} title="2. Datos que recopilamos">
            <p>Al agendar una visita o contactarnos, podemos recopilar:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Nombre completo</li>
              <li>Correo electrónico</li>
              <li>Número de teléfono (opcional)</li>
              <li>Fecha y hora de la visita solicitada</li>
              <li>Mensajes o comentarios que nos envíes voluntariamente</li>
              <li>Datos de navegación (dirección IP, navegador, páginas visitadas) de forma anónima</li>
            </ul>
            <p className="mt-2">
              No recopilamos datos de tarjetas de crédito ni información financiera sensible.
            </p>
          </Section>

          <Section icon={FaUserShield} title="3. Finalidad del tratamiento">
            <p>Usamos tus datos únicamente para:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Confirmar y gestionar la visita a la propiedad que solicitaste</li>
              <li>Ponernos en contacto contigo para coordinar la cita</li>
              <li>Enviarte información relevante sobre la propiedad de tu interés</li>
              <li>Mejorar nuestros servicios de atención al cliente</li>
              <li>Cumplir con obligaciones legales y contractuales</li>
            </ul>
            <p className="mt-2">
              <strong className="text-[var(--color-text)]">No vendemos ni compartimos</strong>{' '}
              tus datos personales con terceros con fines comerciales.
            </p>
          </Section>

          <Section icon={FaLock} title="4. Seguridad de los datos">
            <p>
              Tus datos se almacenan en servidores seguros de Google Cloud (Firebase),
              protegidos con cifrado en tránsito (HTTPS/TLS) y en reposo.
              Solo el personal autorizado de Inmobiliaria Rincón Bedoya tiene acceso a esta información.
            </p>
            <p className="mt-2">
              Conservamos tus datos mientras sean necesarios para la prestación del servicio.
              Pasada la visita y sin actividad posterior, eliminamos tu información en un plazo
              máximo de <strong className="text-[var(--color-text)]">24 meses</strong>.
            </p>
          </Section>

          <Section icon={FaTrash} title="5. Tus derechos">
            <p>Como titular de los datos tienes derecho a:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong className="text-[var(--color-text)]">Conocer</strong> qué datos tenemos sobre ti</li>
              <li><strong className="text-[var(--color-text)]">Actualizar</strong> o corregir información inexacta</li>
              <li><strong className="text-[var(--color-text)]">Suprimir</strong> tus datos cuando ya no sean necesarios</li>
              <li><strong className="text-[var(--color-text)]">Revocar</strong> el consentimiento otorgado</li>
              <li><strong className="text-[var(--color-text)]">Presentar quejas</strong> ante la Superintendencia de Industria y Comercio (SIC)</li>
            </ul>
            <p className="mt-2">
              Para ejercer estos derechos escríbenos a{' '}
              <a href="mailto:inmojuridi09@gmail.com" className="text-primary hover:underline">
                inmojuridi09@gmail.com
              </a>
              {' '}o comunícate al 310 596 8202. Responderemos en un plazo máximo de
              <strong className="text-[var(--color-text)]"> 15 días hábiles</strong>.
            </p>
          </Section>

          <Section icon={FaDatabase} title="6. Cookies y tecnologías similares">
            <p>
              Nuestro sitio web puede usar cookies de sesión para mantener la funcionalidad
              básica y cookies de analítica de Google Analytics para medir el tráfico de
              forma anónima. No usamos cookies de publicidad ni de seguimiento entre sitios.
            </p>
            <p className="mt-2">
              Puedes desactivar las cookies desde la configuración de tu navegador;
              sin embargo, algunas funcionalidades del sitio podrían verse afectadas.
            </p>
          </Section>

          <Section icon={FaShieldAlt} title="7. Cambios a esta política">
            <p>
              Podemos actualizar esta política periódicamente. La versión vigente estará
              siempre disponible en esta página con la fecha de última actualización.
              Al seguir usando nuestros servicios después de un cambio, aceptas la nueva versión.
            </p>
          </Section>

          {/* Contacto */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="bg-primary/10 border border-primary/25 rounded-2xl p-6 text-center"
          >
            <FaShieldAlt className="text-primary text-3xl mx-auto mb-3" />
            <h2 className="text-[var(--color-text)] font-bold mb-2">¿Tienes preguntas sobre tus datos?</h2>
            <p className="text-[var(--color-text-muted)] text-sm mb-4">
              Nuestro equipo está disponible para atender cualquier consulta sobre
              el tratamiento de tu información personal.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="mailto:inmojuridi09@gmail.com"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5
                  bg-primary text-slate-950 font-semibold text-sm rounded-xl
                  hover:bg-primary/90 transition-colors"
              >
                <FaEnvelope size={13} /> Enviar email
              </a>
              <a
                href="https://wa.me/573105968202"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5
                  bg-[var(--color-surface)] text-[var(--color-text)] font-semibold text-sm rounded-xl
                  hover:bg-[var(--color-input-bg)] transition-colors"
              >
                <FaPhone size={13} /> WhatsApp
              </a>
            </div>
          </motion.div>
        </div>

        <p className="text-[var(--color-text-faint)] text-xs text-center mt-8">
          © {new Date().getFullYear()} Inmobiliaria Rincón Bedoya y Asociados ·{' '}
          Anserma, Caldas, Colombia
        </p>
      </div>
    </div>
  );
}