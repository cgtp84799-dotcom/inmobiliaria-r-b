import { Outlet, Link } from "react-router-dom";
import Navbar from "./Navbar";

const caldasLinks = [
  { to: "/propiedades/ciudad/anserma",    label: "Propiedades en Anserma" },
  { to: "/propiedades/ciudad/riosucio",   label: "Propiedades en Riosucio" },
  { to: "/propiedades/ciudad/supia",      label: "Propiedades en Supía" },
  { to: "/propiedades/ciudad/belalcazar", label: "Propiedades en Belalcázar" },
  { to: "/propiedades/ciudad/la-merced",  label: "Propiedades en La Merced" },
  { to: "/propiedades/ciudad/filadelfia", label: "Propiedades en Filadelfia" },
  { to: "/propiedades/ciudad/marmato",    label: "Propiedades en Marmato" },
  { to: "/propiedades/ciudad/manizales",  label: "Propiedades en Manizales" },
];

const risaraldaLinks = [
  { to: "/propiedades/ciudad/pereira",             label: "Propiedades en Pereira" },
  { to: "/propiedades/ciudad/dosquebradas",         label: "Propiedades en Dosquebradas" },
  { to: "/propiedades/ciudad/la-virginia",          label: "Propiedades en La Virginia" },
  { to: "/propiedades/ciudad/santa-rosa-de-cabal",  label: "Propiedades en Santa Rosa de Cabal" },
  { to: "/propiedades/ciudad/quinchia",             label: "Propiedades en Quinchía" },
  { to: "/propiedades/ciudad/viterbo",              label: "Propiedades en Viterbo" },
];

const featuredSeoLinks = [
  { to: "/propiedades/zona/casas-en-venta-anserma",              label: "Casas en venta en Anserma" },
  { to: "/propiedades/zona/apartamentos-en-venta-anserma",       label: "Apartamentos en venta en Anserma" },
  { to: "/propiedades/zona/lotes-en-venta-anserma",              label: "Lotes en venta en Anserma" },
  { to: "/propiedades/zona/fincas-en-venta-anserma",             label: "Fincas en venta en Anserma" },
  { to: "/propiedades/zona/casas-en-venta-pereira",              label: "Casas en venta en Pereira" },
  { to: "/propiedades/zona/apartamentos-en-arriendo-dosquebradas", label: "Apts. en arriendo en Dosquebradas" },
];

const usefulLinks = [
  { to: "/propiedades", label: "Ver todas las propiedades" },
  { to: "/nosotros",   label: "Nosotros" },
  { to: "/contacto",   label: "Contáctanos" },
];

const FooterSection = ({ title, links }) => (
  <div>
    <h3
      className="text-sm font-semibold mb-3"
      style={{ color: "var(--color-footer-text)" }}
    >
      {title}
    </h3>
    <ul className="space-y-1.5 text-xs sm:text-sm">
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

      <main className="flex-1">
        <Outlet />
      </main>

      <footer
        className="border-t py-8 sm:py-10 mt-12 sm:mt-16"
        style={{
          backgroundColor: "var(--color-footer-bg)",
          borderColor: "var(--color-footer-border)",
          transition: "background-color 0.3s ease, border-color 0.3s ease",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 text-left mb-6 sm:mb-8">
            <FooterSection title="Propiedades destacadas" links={featuredSeoLinks} />
            <FooterSection title="Ciudades en Caldas"     links={caldasLinks} />
            <FooterSection title="Ciudades en Risaralda"  links={risaraldaLinks} />
            <FooterSection title="Enlaces útiles"         links={usefulLinks} />
          </div>

          <div
            className="text-center border-t pt-4"
            style={{ borderColor: "var(--color-footer-border)" }}
          >
            <p className="text-sm" style={{ color: "var(--color-footer-muted)" }}>
              &copy; {year} Inmobiliaria Rincón Bedoya &amp; Asociados. Todos los derechos reservados.
            </p>
            <p className="text-xs mt-2" style={{ color: "var(--color-footer-muted)" }}>
              Cobertura en Anserma, Riosucio, Supía, Belalcázar, La Merced,
              Filadelfia, Marmato y Manizales en Caldas; Pereira, Dosquebradas,
              La Virginia, Santa Rosa de Cabal y Quinchía en Risaralda.
            </p>
            <p className="text-xs mt-2" style={{ color: "var(--color-footer-muted)" }}>
              Creado por Mateo Carvajal Tamayo.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
