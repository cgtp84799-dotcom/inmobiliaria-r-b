// src/shared/components/UI/Breadcrumbs.jsx
import { Link } from "react-router-dom";
import { FaChevronRight, FaHome } from "react-icons/fa";

const Breadcrumbs = ({ items }) => {
  if (!items || items.length === 0) return null;

  return (
    <nav
      aria-label="Ruta de navegación"
      className="mb-3 sm:mb-4 text-xs sm:text-sm text-slate-400"
    >
      <ol className="flex flex-wrap items-center gap-1 sm:gap-1.5">
        <li className="flex items-center gap-1">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-slate-300 hover:text-primary transition-colors"
          >
            <FaHome className="text-xs sm:text-sm" />
            <span className="hidden sm:inline">Inicio</span>
          </Link>
        </li>

        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li
              key={`${item.href || item.label}-${index}`}
              className="flex items-center gap-1"
            >
              <FaChevronRight className="text-[9px] sm:text-[10px] text-slate-500" />
              {isLast || !item.href ? (
                <span className="text-slate-400 truncate max-w-[160px] sm:max-w-[220px]">
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.href}
                  className="text-slate-300 hover:text-primary transition-colors truncate max-w-[160px] sm:max-w-[220px]"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;