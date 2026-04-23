// src/modules/public/pages/NotFoundPage.jsx
// ─────────────────────────────────────────────────────────────
// 404 con SEO correcto:
//   • noindex,follow
//   • Canonical apuntando al catálogo (señala la intención al bot)
//   • Links de rescate a páginas populares
//
// Diseño deliberadamente mínimo para evitar dependencias frágiles.
// ─────────────────────────────────────────────────────────────

import { Link } from "react-router-dom";
import { FaHome, FaSearch, FaWhatsapp } from "react-icons/fa";
import { SeoHead } from "../../../shared/components/SEO";

const COMPANY_NAME = "Inmobiliaria Rincón Bedoya y Asociados";

const POPULAR_LINKS = [
  { label: "Catálogo de propiedades",          url: "/catalogo" },
  { label: "Propiedades en Manizales",         url: "/propiedades/zona/manizales" },
  { label: "Propiedades en Pereira",           url: "/propiedades/zona/pereira" },
  { label: "Propiedades en Anserma",           url: "/propiedades/zona/anserma" },
  { label: "Casas en venta en Manizales",      url: "/propiedades/zona/casas-en-venta-manizales" },
  { label: "Apartamentos en arriendo Pereira", url: "/propiedades/zona/apartamentos-en-arriendo-pereira" },
  { label: "Departamento de Caldas",           url: "/propiedades/departamento/caldas" },
  { label: "Departamento de Risaralda",        url: "/propiedades/departamento/risaralda" },
];

export default function NotFoundPage() {
  return (
    <main className="min-h-[60vh] max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <SeoHead
        title={`Página no encontrada (404) | ${COMPANY_NAME}`}
        description="La página que buscas no existe o fue movida. Explora el catálogo de propiedades con respaldo jurídico en Colombia."
        path="/catalogo"
        noindex
      />

      <div className="text-center mb-10">
        <p
          className="text-sm font-semibold tracking-widest uppercase"
          style={{ color: "var(--color-gold, #b45309)" }}
        >
          Error 404
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold mt-3 mb-4">
          Página no encontrada
        </h1>
        <p
          className="text-base sm:text-lg max-w-xl mx-auto"
          style={{ color: "var(--color-text-muted, #94a3b8)" }}
        >
          La URL que ingresaste no existe o la propiedad ya no está publicada.
          Te dejamos algunos accesos rápidos para seguir explorando.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
        <Link
          to="/"
          className="inline-flex items-center gap-2 justify-center px-5 py-2.5 rounded-lg font-medium"
          style={{
            background: "var(--color-gold, #b45309)",
            color: "var(--color-gold-contrast, #0f172a)",
          }}
        >
          <FaHome />
          <span>Volver al inicio</span>
        </Link>

        <Link
          to="/catalogo"
          className="inline-flex items-center gap-2 justify-center px-5 py-2.5 rounded-lg font-medium border"
          style={{ borderColor: "var(--color-border, #334155)" }}
        >
          <FaSearch />
          <span>Ver catálogo</span>
        </Link>

        <a
          href="https://wa.me/573105968202"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 justify-center px-5 py-2.5 rounded-lg font-medium border"
          style={{ borderColor: "var(--color-border, #334155)" }}
        >
          <FaWhatsapp />
          <span>Hablar por WhatsApp</span>
        </a>
      </div>

      <section aria-labelledby="popular-links">
        <h2 id="popular-links" className="text-xl font-semibold mb-4 text-center">
          Enlaces populares
        </h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {POPULAR_LINKS.map((link) => (
            <li key={link.url}>
              <Link
                to={link.url}
                className="flex items-center gap-2 p-3 rounded-lg border transition-colors text-sm"
                style={{ borderColor: "var(--color-border, #334155)" }}
              >
                <FaSearch className="text-xs flex-shrink-0 opacity-70" />
                <span>{link.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}