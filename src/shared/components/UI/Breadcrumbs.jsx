// src/shared/components/UI/Breadcrumbs.jsx
import { Link } from 'react-router-dom';
import { FaChevronRight, FaHome } from 'react-icons/fa';

/*
  Props:
  - items: Array<{ label: string, href?: string }>
    El último item se renderiza como texto (página actual).
    Si un item intermedio no tiene href, también se trata como texto.
*/
export default function Breadcrumbs({ items }) {
  if (!items?.length) return null;

  return (
    <nav
      aria-label="Ruta de navegación"
      className="mb-3 sm:mb-4"
    >
      <ol
        className="flex flex-wrap items-center gap-1 sm:gap-1.5 text-xs sm:text-sm"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {/* Inicio */}
        <li className="flex items-center gap-1">
          <Link
            to="/"
            className="inline-flex items-center gap-1 transition-colors duration-150
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
                       rounded-sm"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
            aria-label="Inicio"
          >
            <FaHome className="text-[11px] sm:text-xs" aria-hidden="true" />
            <span className="hidden sm:inline">Inicio</span>
          </Link>
        </li>

        {items.map((item, index) => {
          const isLast      = index === items.length - 1;
          const isClickable = !isLast && !!item.href;

          return (
            <li
              key={`${item.href ?? item.label}-${index}`}
              className="flex items-center gap-1"
            >
              {/* Separador */}
              <FaChevronRight
                className="text-[8px] sm:text-[9px] flex-shrink-0"
                style={{ color: 'var(--color-text-faint)' }}
                aria-hidden="true"
              />

              {isClickable ? (
                <Link
                  to={item.href}
                  className="truncate max-w-[160px] sm:max-w-[220px]
                             transition-colors duration-150
                             focus-visible:outline-none focus-visible:ring-2
                             focus-visible:ring-primary/50 rounded-sm"
                  style={{ color: 'var(--color-text-muted)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-primary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className="truncate max-w-[160px] sm:max-w-[220px] font-medium"
                  style={{ color: 'var(--color-text)' }}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}