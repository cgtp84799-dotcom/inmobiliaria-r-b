import { Outlet, Link } from "react-router-dom";
import Navbar from "./Navbar";
import { PUBLIC_ROUTES } from "../../../core/config/routes.config";

const caldasLinks = [
  { to: "/propiedades/zona/anserma",    label: "Propiedades en Anserma" },
  { to: "/propiedades/zona/riosucio",   label: "Propiedades en Riosucio" },
  { to: "/propiedades/zona/supia",      label: "Propiedades en Supía" },
  { to: "/propiedades/zona/belalcazar", label: "Propiedades en Belalcázar" },
  { to: "/propiedades/zona/la-merced",  label: "Propiedades en La Merced" },
  { to: "/propiedades/zona/filadelfia", label: "Propiedades en Filadelfia" },
  { to: "/propiedades/zona/marmato",    label: "Propiedades en Marmato" },
  { to: "/propiedades/zona/manizales",  label: "Propiedades en Manizales" },
];

const risaraldaLinks = [
  { to: "/propiedades/zona/pereira",              label: "Propiedades en Pereira" },
  { to: "/propiedades/zona/dosquebradas",          label: "Propiedades en Dosquebradas" },
  { to: "/propiedades/zona/la-virginia",           label: "Propiedades en La Virginia" },
  { to: "/propiedades/zona/santa-rosa-de-cabal",   label: "Propiedades en Santa Rosa de Cabal" },
  { to: "/propiedades/zona/quinchia",              label: "Propiedades en Quinchía" },
  { to: "/propiedades/zona/viterbo",               label: "Propiedades en Viterbo" },
];

const featuredSeoLinks = [
  { to: "/propiedades/zona/casas-en-venta-anserma",               label: "Casas en venta en Anserma" },
  { to: "/propiedades/zona/apartamentos-en-venta-anserma",        label: "Apartamentos en venta en Anserma" },
  { to: "/propiedades/zona/lotes-en-venta-anserma",               label: "Lotes en venta en Anserma" },
  { to: "/propiedades/zona/fincas-en-venta-anserma",              label: "Fincas en venta en Anserma" },
  { to: "/propiedades/zona/casas-en-venta-pereira",               label: "Casas en venta en Pereira" },
  { to: "/propiedades/zona/apartamentos-en-arriendo-dosquebradas", label: "Apts. en arriendo en Dosquebradas" },
];

const usefulLinks = [
  { to: PUBLIC_ROUTES.CATALOG,         label: "Ver todas las propiedades" },
  { to: PUBLIC_ROUTES.SCHEDULE_VISIT,  label: "Agendar una visita" },
  { to: PUBLIC_ROUTES.CONTACT,         label: "Contáctanos" },
  { to: "/acceso-clientes",            label: "Portal del cliente" },
];

const FooterSection = ({ title, links }) => (
  <div>
    <h3
      className="text-xs font-bold uppercase tracking-[0.15em] mb-4"
      style={{ color: "var(--color-footer-text)" }}
    >
      {title}
    </h3>
    <ul className="space-y-2 text-sm">
      {links.map((item) => (
        <li key={item.to}>
          <Link
            to={item.to}
            className="transition-colors duration-150 hover:text-amber-400"
            style={{ color: "var(--color-footer-muted)" }}
          >
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  </div>
);

const PublicLayout = () => {
  const year = new Date().getFullYear();

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundColor: "var(--color-bg)",
        color: "var(--color-text)",
        transition: "background-color 0.3s ease, color 0.25s ease",
      }}
    >
      <Navbar />

      <main id="root-main" className="flex-1">
        <Outlet />
      </main>

      <footer
        className="border-t pt-14 pb-8 mt-0"
        style={{
          backgroundColor: "var(--color-footer-bg)",
          borderColor: "var(--color-footer-border)",
          transition: "background-color 0.3s ease, border-color 0.3s ease",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Brand statement */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12 pb-12 border-b" style={{ borderColor: "var(--color-footer-border)" }}>
            <div className="lg:col-span-5">
              <p
                className="font-display text-2xl sm:text-3xl leading-tight"
                style={{ color: "#fbbf24", fontStyle: "italic", fontWeight: 400 }}
              >
                Rincón Bedoya
                <br />
                &amp; Asociados
              </p>
              <p
                className="mt-4 text-sm leading-relaxed max-w-md"
                style={{ color: "var(--color-footer-muted)" }}
              >
                Gestión inmobiliaria integral con respaldo jurídico
                especializado. Caldas, Risaralda y creciendo por toda Colombia.
              </p>
            </div>
            <div className="lg:col-span-7 grid grid-cols-2 lg:grid-cols-2 gap-8">
              <div>
                <h3
                  className="text-xs font-bold uppercase tracking-[0.15em] mb-4"
                  style={{ color: "var(--color-footer-text)" }}
                >
                  Contacto
                </h3>
                <ul className="space-y-2 text-sm" style={{ color: "var(--color-footer-muted)" }}>
                  <li>Cra 5 #9-28, Anserma, Caldas</li>
                  <li>
                    <a href="tel:+573105968202" className="hover:text-amber-400 transition-colors">
                      +57 310 596 8202
                    </a>
                  </li>
                  <li>
                    <a href="mailto:inmojuridi09@gmail.com" className="hover:text-amber-400 transition-colors">
                      inmojuridi09@gmail.com
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h3
                  className="text-xs font-bold uppercase tracking-[0.15em] mb-4"
                  style={{ color: "var(--color-footer-text)" }}
                >
                  Horarios
                </h3>
                <ul className="space-y-2 text-sm" style={{ color: "var(--color-footer-muted)" }}>
                  <li>Lun–Vie · 8:00 a.m. a 5:30 p.m.</li>
                  <li>Sábados · 8:30 a.m. a 1:00 p.m.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Link grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 text-left mb-10">
            <FooterSection title="Propiedades destacadas" links={featuredSeoLinks} />
            <FooterSection title="Ciudades en Caldas"     links={caldasLinks} />
            <FooterSection title="Ciudades en Risaralda"  links={risaraldaLinks} />
            <FooterSection title="Enlaces útiles"         links={usefulLinks} />
          </div>

          {/* Bottom bar */}
          <div
            className="pt-6 border-t flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            style={{ borderColor: "var(--color-footer-border)" }}
          >
            <p className="text-xs" style={{ color: "var(--color-footer-muted)" }}>
              &copy; {year} Inmobiliaria Rincón Bedoya &amp; Asociados. Todos los derechos reservados.
            </p>
            <div className="flex items-center gap-4 text-xs" style={{ color: "var(--color-footer-muted)" }}>
              <Link to={PUBLIC_ROUTES.PRIVACY_POLICY} className="hover:text-amber-400 transition-colors">
                Política de privacidad
              </Link>
              <span aria-hidden="true" className="opacity-40">·</span>
              <span>Creado por Mateo Carvajal Tamayo</span>
            </div>
          </div>

          <p
            className="mt-4 text-[11px] leading-relaxed"
            style={{ color: "var(--color-footer-muted)", opacity: 0.7 }}
          >
            Cobertura principal en Anserma, Riosucio, Supía, Belalcázar,
            La Merced, Filadelfia, Marmato y Manizales (Caldas); Pereira,
            Dosquebradas, La Virginia, Santa Rosa de Cabal, Quinchía y Viterbo
            (Risaralda). Operamos también en otros departamentos —
            consúltanos por tu zona.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;