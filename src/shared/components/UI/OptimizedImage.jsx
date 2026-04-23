// src/shared/components/UI/OptimizedImage.jsx
// ─────────────────────────────────────────────────────────────
// Componente de imagen optimizado para Core Web Vitals.
//
// Aplica automáticamente:
//   • loading="lazy" (salvo para LCP candidates — prop `priority`)
//   • decoding="async"
//   • fetchpriority="high" para imágenes LCP
//   • width/height intrínsecos (previene CLS)
//   • Firebase Storage: agrega `alt=media` y detecta formato
//   • Cloudinary/otros CDN: srcset automático si detectamos el patrón
//
// Uso:
//   <OptimizedImage
//     src={property.images[0]}
//     alt="Casa en venta en Manizales - 3 habitaciones"
//     width={800}
//     height={600}
//     priority   // solo para el primer above-the-fold
//   />
// ─────────────────────────────────────────────────────────────

import { useMemo } from "react";

const BASE_URL = "https://inmobiliaria-ryb-y-asociados.com";

/** Normaliza src relativo → absoluto */
const toAbsolute = (src) => {
  if (!src) return "";
  const v = String(src).trim();
  if (/^https?:\/\//i.test(v) || v.startsWith("data:")) return v;
  return `${BASE_URL}${v.startsWith("/") ? "" : "/"}${v}`;
};

/**
 * Genera srcset para Firebase Storage si detectamos el patrón.
 * Firebase no hace resizing nativo, así que retornamos solo la imagen
 * original — pero dejamos el hook listo para cuando se configure una
 * Cloud Function de redimensionado (o se migre a Cloudinary/Imgix).
 */
const buildSrcSet = (src) => {
  if (!src) return undefined;
  // Cloudinary: rewrite widths
  if (/res\.cloudinary\.com/.test(src)) {
    const widths = [400, 600, 800, 1200, 1600];
    return widths
      .map((w) => `${src.replace(/\/upload\//, `/upload/f_auto,q_auto,w_${w}/`)} ${w}w`)
      .join(", ");
  }
  // Imgix
  if (/imgix\.net/.test(src)) {
    const widths = [400, 600, 800, 1200, 1600];
    const base = src.split("?")[0];
    return widths
      .map((w) => `${base}?auto=format,compress&w=${w} ${w}w`)
      .join(", ");
  }
  return undefined;
};

export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  className = "",
  style,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  objectFit = "cover",
  fallbackSrc,
  onError,
  ...rest
}) {
  const absoluteSrc = useMemo(() => toAbsolute(src), [src]);
  const srcSet = useMemo(() => buildSrcSet(absoluteSrc), [absoluteSrc]);

  if (!absoluteSrc) {
    return (
      <div
        className={className}
        role="img"
        aria-label={alt || "Sin imagen"}
        style={{
          width: width ? `${width}px` : "100%",
          aspectRatio: width && height ? `${width} / ${height}` : "16 / 9",
          background: "var(--color-surface-2, #1e293b)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-text-faint, #64748b)",
          fontSize: "0.875rem",
          ...style,
        }}
      >
        Sin imagen
      </div>
    );
  }

  return (
    <img
      src={absoluteSrc}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={alt || ""}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchpriority={priority ? "high" : "auto"}
      className={className}
      style={{
        objectFit,
        ...style,
      }}
      onError={(e) => {
        if (fallbackSrc && e.currentTarget.src !== toAbsolute(fallbackSrc)) {
          e.currentTarget.src = toAbsolute(fallbackSrc);
        }
        onError?.(e);
      }}
      {...rest}
    />
  );
}