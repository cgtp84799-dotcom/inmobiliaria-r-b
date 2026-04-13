// src/shared/components/Layout/Footer.jsx
import { Link } from 'react-router-dom';
import {
  FaWhatsapp, FaFacebook, FaInstagram,
  FaMapMarkerAlt, FaPhone, FaEnvelope,
} from 'react-icons/fa';
import { PUBLIC_ROUTES } from '../../../core/config/routes.config';

/* ─── Datos centralizados ──────────────────────────────────── */
const COMPANY = {
  name:    'Rincón Bedoya & Asociados',
  tagline: 'Inmobiliaria con asesoría jurídica integral',
  address: 'Cra 5 #9-28, Anserma, Caldas',
  phones:  ['+57 310 596 8202', '+57 320 673 6391'],
  email:   'inmojuridi09@gmail.com',
  social: [
    {
      label: 'WhatsApp',
      href:  'https://wa.me/573105968202?text=Hola,%20quiero%20información%20sobre%20propiedades',
      Icon:  FaWhatsapp,
      color: '#25D366',
    },
    {
      label: 'Facebook',
      href:  'https://www.facebook.com/profile.php?id=61559014741338',
      Icon:  FaFacebook,
      color: '#1877F2',
    },
    {
      label: 'Instagram',
      href:  'https://instagram.com/inmobiliaria_ryb',
      Icon:  FaInstagram,
      color: '#E1306C',
    },
  ],
};

const NAV_COLS = [
  {
    title: 'Navegación',
    links: [
      { label: 'Inicio',       to: PUBLIC_ROUTES.HOME    },
      { label: 'Propiedades',  to: PUBLIC_ROUTES.CATALOG },
      { label: 'Contacto',     to: PUBLIC_ROUTES.CONTACT },
      { label: 'Mi portal',    to: '/acceso-clientes'    },
    ],
  },
  {
    title: 'Zonas',
    links: [
      { label: 'Anserma',     to: '/propiedades/zona/anserma'    },
      { label: 'Riosucio',    to: '/propiedades/zona/riosucio'   },
      { label: 'Supía',       to: '/propiedades/zona/supia'      },
      { label: 'Belalcázar',  to: '/propiedades/zona/belalcazar' },
      { label: 'Filadelfia',  to: '/propiedades/zona/filadelfia' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Política de privacidad', to: '/privacidad' },
    ],
  },
];

/* ─── Componente ───────────────────────────────────────────── */
export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      role="contentinfo"
      style={{
        backgroundColor: 'var(--color-footer-bg)',
        borderColor:     'var(--color-footer-border)',
        color:           'var(--color-footer-text)',
      }}
      className="border-t"
    >

      {/* ── Cuerpo principal ──────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Columna 1 — Marca */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link
              to={PUBLIC_ROUTES.HOME}
              aria-label="Ir al inicio"
              className="inline-block mb-4"
            >
              <img
                src="/logo.jpg.png"
                alt="Rincón Bedoya & Asociados"
                className="h-14 w-auto object-contain"
                width={200}
                height={56}
                loading="lazy"
                draggable={false}
              />
            </Link>

            <p
              className="text-sm leading-relaxed mb-5 max-w-[26ch]"
              style={{ color: 'var(--color-footer-muted)' }}
            >
              {COMPANY.tagline}. Compra, venta y arriendo en Anserma y municipios de Caldas.
            </p>

            {/* Redes sociales */}
            <div className="flex items-center gap-3" aria-label="Redes sociales">
              {COMPANY.social.map(({ label, href, Icon, color }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-9 h-9 rounded-xl flex items-center justify-center
                             transition-all duration-200
                             hover:scale-110 hover:shadow-lg"
                  style={{
                    backgroundColor: 'var(--color-footer-border)',
                    color:           'var(--color-footer-muted)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = color + '22';
                    e.currentTarget.style.color           = color;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-footer-border)';
                    e.currentTarget.style.color           = 'var(--color-footer-muted)';
                  }}
                >
                  <Icon size={16} aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          {/* Columnas 2-3 — Navegación */}
          {NAV_COLS.map((col) => (
            <div key={col.title}>
              <h3
                className="text-xs font-bold uppercase tracking-widest mb-4"
                style={{ color: 'var(--color-primary, #f59e0b)' }}
              >
                {col.title}
              </h3>
              <ul className="space-y-2.5">
                {col.links.map(({ label, to }) => (
                  <li key={to}>
                    <Link
                      to={to}
                      className="text-sm transition-colors duration-150
                                 hover:text-primary-400"
                      style={{ color: 'var(--color-footer-muted)' }}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Columna 4 — Contacto */}
          <div>
            <h3
              className="text-xs font-bold uppercase tracking-widest mb-4"
              style={{ color: 'var(--color-primary, #f59e0b)' }}
            >
              Contacto
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5">
                <FaMapMarkerAlt
                  className="mt-0.5 flex-shrink-0 text-primary-500"
                  size={13}
                  aria-hidden="true"
                />
                <span
                  className="text-sm leading-snug"
                  style={{ color: 'var(--color-footer-muted)' }}
                >
                  {COMPANY.address}
                </span>
              </li>

              {COMPANY.phones.map((phone) => (
                <li key={phone} className="flex items-center gap-2.5">
                  <FaPhone
                    className="flex-shrink-0 text-primary-500"
                    size={12}
                    aria-hidden="true"
                  />
                  <a
                    href={`tel:${phone.replace(/\s/g, '')}`}
                    className="text-sm transition-colors hover:text-primary-400"
                    style={{ color: 'var(--color-footer-muted)' }}
                  >
                    {phone}
                  </a>
                </li>
              ))}

              <li className="flex items-center gap-2.5">
                <FaEnvelope
                  className="flex-shrink-0 text-primary-500"
                  size={12}
                  aria-hidden="true"
                />
                <a
                  href={`mailto:${COMPANY.email}`}
                  className="text-sm transition-colors hover:text-primary-400 break-all"
                  style={{ color: 'var(--color-footer-muted)' }}
                >
                  {COMPANY.email}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── Barra inferior ────────────────────────────────────── */}
      <div
        className="border-t"
        style={{ borderColor: 'var(--color-footer-border)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4
                        flex flex-col sm:flex-row items-center
                        justify-between gap-2 text-xs"
          style={{ color: 'var(--color-footer-muted)' }}
        >
          <p>
            © {year} Inmobiliaria {COMPANY.name}. Todos los derechos reservados.
          </p>
          <p className="opacity-60">
            Diseñado y desarrollado por{' '}
            <span className="font-semibold" style={{ color: 'var(--color-primary, #f59e0b)' }}>
              Mateo Carvajal
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}