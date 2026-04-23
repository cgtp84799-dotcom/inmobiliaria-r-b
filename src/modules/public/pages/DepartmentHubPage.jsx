// src/modules/public/pages/DepartmentHubPage.jsx
// ─────────────────────────────────────────────────────────────
// Hub por departamento — versión mínima funcional.
//
// URL: /propiedades/departamento/:department
//      p.ej. /propiedades/departamento/caldas
//
// Qué hace:
//   • Valida que el slug corresponde a un departamento real (geography.config)
//   • Si no existe, redirige al catálogo
//   • Muestra breadcrumb visual + schema (vía <Breadcrumbs />)
//   • Lista las ciudades del departamento con links a sus landings
//   • <SeoHead> dinámico por departamento con Breadcrumb + ItemList + AdminArea
//
// NOTA: Esta versión no consulta Firestore todavía. La integración con
// propertyService para traer propiedades reales del departamento se hará
// en un batch posterior, sin cambiar esta firma/API.
// ─────────────────────────────────────────────────────────────

import { useMemo } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { FaMapMarkerAlt, FaArrowRight, FaWhatsapp, FaSearch } from "react-icons/fa";

import {
  findDepartment,
  getCitiesByDepartment,
} from "../../../core/config/geography.config";
import {
  buildCityUrl,
  buildDepartmentUrl,
  PUBLIC_ROUTES,
} from "../../../core/config/routes.config";
import {
  SeoHead,
  buildBreadcrumbSchema,
  buildItemListSchema,
} from "../../../shared/components/SEO";
import Breadcrumbs from "../../../shared/components/UI/Breadcrumbs";

const BASE_URL = "https://inmobiliaria-ryb-y-asociados.com";
const COMPANY_NAME = "Inmobiliaria Rincón Bedoya y Asociados";
const COMPANY_PHONE_DISPLAY = "+57 310 596 8202";

export default function DepartmentHubPage() {
  const { department: departmentSlug } = useParams();

  const department = useMemo(
    () => findDepartment(departmentSlug),
    [departmentSlug]
  );

  const cities = useMemo(
    () => (department ? getCitiesByDepartment(department.slug) : []),
    [department]
  );

  // Slug inválido → 302 al catálogo
  if (!department) {
    return <Navigate to={PUBLIC_ROUTES.CATALOG} replace />;
  }

  const canonicalPath = buildDepartmentUrl(department.slug);
  const canonicalUrl = `${BASE_URL}${canonicalPath}`;

  const seoTitle =
    `Propiedades en ${department.name}, Colombia — ` +
    `${cities.length} ciudades | ${COMPANY_NAME}`;

  const seoDescription =
    `Casas, apartamentos, fincas y locales en venta y arriendo en ` +
    `${department.name}, Colombia. Explora inmuebles en ${cities.length} ` +
    `ciudades con respaldo jurídico completo.`;

  // ── Schemas ────────────────────────────────────────────────
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Inicio",       url: "/" },
    { name: "Propiedades",  url: "/catalogo" },
    { name: department.name },
  ]);

  const adminAreaSchema = {
    "@context": "https://schema.org",
    "@type": "AdministrativeArea",
    name: department.name,
    containedInPlace: { "@type": "Country", name: "Colombia" },
    url: canonicalUrl,
  };

  const citiesItemList = buildItemListSchema({
    name: `Ciudades en ${department.name}`,
    description: `Municipios con propiedades en venta y arriendo en ${department.name}`,
    items: cities.map((c) => ({
      name: c.name,
      url: buildCityUrl(c.slug),
    })),
  });

  const structuredData = [
    breadcrumbSchema,
    adminAreaSchema,
    citiesItemList,
  ].filter(Boolean);

  // ── Breadcrumb visual (sin emitir schema — ya lo emite SeoHead) ─
  const breadcrumbItems = [
    { label: "Propiedades", href: "/catalogo" },
    { label: department.name },
  ];

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SeoHead
        title={seoTitle}
        description={seoDescription}
        path={canonicalPath}
        keywords={`propiedades ${department.name.toLowerCase()}, casas en venta ${department.name.toLowerCase()}, inmobiliaria ${department.name.toLowerCase()}, bienes raíces ${department.name.toLowerCase()} colombia`}
        structuredData={structuredData}
      />

      <Breadcrumbs items={breadcrumbItems} emitSchema={false} />

      {/* ── Hero ──────────────────────────────────────────── */}
      <header className="mt-4 mb-10">
        <p
          className="text-xs sm:text-sm font-semibold tracking-widest uppercase"
          style={{ color: "var(--color-gold, #b45309)" }}
        >
          Departamento
        </p>
        <h1
          className="text-3xl sm:text-4xl lg:text-5xl font-bold mt-2 mb-4"
          style={{ color: "var(--color-text)" }}
        >
          Propiedades en {department.name}
        </h1>
        <p
          className="text-base sm:text-lg max-w-3xl leading-relaxed"
          style={{ color: "var(--color-text-muted)" }}
        >
          Explora nuestra selección de inmuebles en los principales municipios
          de {department.name}, Colombia. Cada propiedad cuenta con
          verificación jurídica completa y acompañamiento integral de{" "}
          {COMPANY_NAME}.
        </p>
      </header>

      {/* ── Grid de ciudades ──────────────────────────────── */}
      <section aria-labelledby="cities-grid" className="mb-14">
        <h2
          id="cities-grid"
          className="text-xl sm:text-2xl font-semibold mb-6"
        >
          {cities.length > 0
            ? `Ciudades en ${department.name}`
            : `Aún sin ciudades catalogadas`}
        </h2>

        {cities.length === 0 ? (
          <p style={{ color: "var(--color-text-muted)" }}>
            Aún no tenemos ciudades catalogadas en este departamento.
            Escríbenos para personalizar tu búsqueda.
          </p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cities.map((c) => (
              <li key={c.slug}>
                <Link
                  to={buildCityUrl(c.slug)}
                  className="group block p-5 rounded-xl border transition-colors"
                  style={{ borderColor: "var(--color-border, #334155)" }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <FaMapMarkerAlt
                        className="text-sm flex-shrink-0"
                        style={{ color: "var(--color-gold, #b45309)" }}
                      />
                      <h3
                        className="text-lg font-semibold"
                        style={{ color: "var(--color-text)" }}
                      >
                        {c.name}
                      </h3>
                    </div>
                    <FaArrowRight className="text-sm opacity-60 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p
                    className="text-sm mt-2"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Ver propiedades en venta y arriendo en {c.name}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <section
        className="p-6 sm:p-8 rounded-xl text-center"
        style={{
          background: "var(--color-surface-2, #0f172a)",
          border: "1px solid var(--color-border, #334155)",
        }}
      >
        <h2
          className="text-xl sm:text-2xl font-semibold mb-3"
          style={{ color: "var(--color-text)" }}
        >
          ¿No encuentras la propiedad ideal en {department.name}?
        </h2>
        <p
          className="mb-5 max-w-2xl mx-auto text-sm sm:text-base"
          style={{ color: "var(--color-text-muted)" }}
        >
          Nuestro equipo puede buscar propiedades a tu medida con verificación
          jurídica completa. Contáctanos y recibe asesoría personalizada al{" "}
          {COMPANY_PHONE_DISPLAY}.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href={`https://wa.me/573105968202?text=${encodeURIComponent(
              `Hola, me interesan propiedades en ${department.name}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 justify-center px-5 py-2.5 rounded-lg font-medium"
            style={{
              background: "var(--color-gold, #b45309)",
              color: "var(--color-gold-contrast, #0f172a)",
            }}
          >
            <FaWhatsapp />
            <span>Hablar por WhatsApp</span>
          </a>
          <Link
            to={PUBLIC_ROUTES.CATALOG}
            className="inline-flex items-center gap-2 justify-center px-5 py-2.5 rounded-lg font-medium border"
            style={{ borderColor: "var(--color-border, #334155)" }}
          >
            <FaSearch />
            <span>Ver catálogo</span>
          </Link>
          <Link
            to={PUBLIC_ROUTES.CONTACT}
            className="inline-flex items-center gap-2 justify-center px-5 py-2.5 rounded-lg font-medium border"
            style={{ borderColor: "var(--color-border, #334155)" }}
          >
            Formulario de contacto
          </Link>
        </div>
      </section>
    </main>
  );
}