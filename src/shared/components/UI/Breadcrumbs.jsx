// src/shared/components/UI/Breadcrumbs.jsx
// ─────────────────────────────────────────────────────────────
// Breadcrumbs visuales + BreadcrumbList JSON-LD inline.
//
// Props:
//   · items: Array<{ label: string, href?: string }>
//     - El primer item típicamente es "Inicio" (o se puede omitir, ya
//       renderizamos un home icon por defecto).
//     - El último item se renderiza como texto (sin link).
//     - Si un item intermedio no tiene href, también se trata como texto.
//   · includeHome (default true): si es false, no renderiza el ícono de Home
//     inicial (útil cuando `items` ya trae "Inicio" como primer elemento).
//   · emitSchema (default true): si es false, NO emite JSON-LD
//     (evita duplicación cuando la página ya emite su propio BreadcrumbList).
//
// El schema JSON-LD incluye "Inicio" como posición 1 siempre (coincide con
// lo que se muestra visualmente).
// ─────────────────────────────────────────────────────────────

import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FaChevronRight, FaHome } from 'react-icons/fa';

const BASE_URL = 'https://inmobiliaria-ryb-y-asociados.com';

const toAbsolute = (href) => {
  if (!href) return undefined;
  const s = String(href).trim();
  if (/^https?:\/\//i.test(s)) return s;
  return `${BASE_URL}${s.startsWith('/') ? '' : '/'}${s}`;
};

export default function Breadcrumbs({
  items,
  includeHome = true,
  emitSchema = true,
}) {
  if (!items?.length) return null;

  // ── Construir schema JSON-LD ─────────────────────────────────────
  const schemaItems = [];
  let position = 1;

  if (includeHome) {
    schemaItems.push({
      '@type': 'ListItem',
      position: position++,
      name: 'Inicio',
      item: `${BASE_URL}/`,
    });
  }

  items.forEach((item) => {
    if (!item?.label) return;
    const node = {
      '@type': 'ListItem',
      position: position++,
      name: item.label,
    };
    if (item.href) node.item = toAbsolute(item.href);
    schemaItems.push(node);
  });

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: schemaItems,
  };

  return (
    <>
      {emitSchema && schemaItems.length >= 2 && (
        <Helmet>
          <script type="application/ld+json">
            {JSON.stringify(breadcrumbSchema)}
          </script>
        </Helmet>
      )}

      <nav
        aria-label="Ruta de navegación"
        className="mb-3 sm:mb-4"
      >
        <ol
          className="flex flex-wrap items-center gap-1 sm:gap-1.5 text-xs sm:text-sm"
          style={{ color: 'var(--color-text-muted)' }}
          itemScope
          itemType="https://schema.org/BreadcrumbList"
        >
          {includeHome && (
            <li
              className="flex items-center gap-1"
              itemProp="itemListElement"
              itemScope
              itemType="https://schema.org/ListItem"
            >
              <Link
                to="/"
                className="inline-flex items-center gap-1 transition-colors duration-150
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
                           rounded-sm"
                style={{ color: 'var(--color-text-muted)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
                aria-label="Inicio"
                itemProp="item"
              >
                <FaHome className="text-[11px] sm:text-xs" aria-hidden="true" />
                <span className="hidden sm:inline" itemProp="name">Inicio</span>
              </Link>
              <meta itemProp="position" content="1" />
            </li>
          )}

          {items.map((item, index) => {
            const isLast      = index === items.length - 1;
            const isClickable = !isLast && !!item.href;
            const itemPosition = (includeHome ? 2 : 1) + index;

            return (
              <li
                key={`${item.href ?? item.label}-${index}`}
                className="flex items-center gap-1"
                itemProp="itemListElement"
                itemScope
                itemType="https://schema.org/ListItem"
              >
                <FaChevronRight
                  className="text-[9px] sm:text-[10px] opacity-60"
                  aria-hidden="true"
                />

                {isClickable ? (
                  <Link
                    to={item.href}
                    className="inline-flex items-center gap-1 transition-colors duration-150
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
                               rounded-sm px-0.5"
                    style={{ color: 'var(--color-text-muted)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-primary)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
                    itemProp="item"
                  >
                    <span itemProp="name">{item.label}</span>
                  </Link>
                ) : (
                  <span
                    className="inline-flex items-center gap-1 font-medium truncate max-w-[220px] sm:max-w-none"
                    style={{ color: isLast ? 'var(--color-text)' : 'var(--color-text-muted)' }}
                    aria-current={isLast ? 'page' : undefined}
                    itemProp="name"
                    title={item.label}
                  >
                    {item.label}
                  </span>
                )}

                <meta itemProp="position" content={String(itemPosition)} />
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}