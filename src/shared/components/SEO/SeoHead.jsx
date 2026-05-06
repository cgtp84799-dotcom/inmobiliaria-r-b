// src/shared/components/SEO/SeoHead.jsx
// ─────────────────────────────────────────────────────────────
// Componente central de SEO. Abstrae todo el <Helmet> de cada página:
// title, description, canonical, robots, Open Graph, Twitter Card, hreflang.
//
// Uso básico:
//   <SeoHead
//     title="Casas en venta en Manizales"
//     description="..."
//     path="/propiedades/zona/casas-en-venta-manizales"
//   />
//
// Uso con imagen dinámica (propiedades):
//   <SeoHead
//     title={title}
//     description={desc}
//     path={path}
//     image={firstPropertyImage}
//     imageAlt={property.title}
//     type="article"
//     price={property.price}
//     priceCurrency="COP"
//   />
// ─────────────────────────────────────────────────────────────

import { Helmet } from "react-helmet-async";
import { SITE_URL as BASE_URL } from '../../../core/config/site.config';

const COMPANY_NAME = "Inmobiliaria Rincón Bedoya y Asociados";
const DEFAULT_IMAGE = `${BASE_URL}/logo-light.png`;
const DEFAULT_IMAGE_ALT = "Inmobiliaria Rincón Bedoya y Asociados";

// ─── Helpers ──────────────────────────────────────────────────────────────

const toAbsolute = (url) => {
  if (!url) return "";
  const v = String(url).trim();
  if (/^https?:\/\//i.test(v)) return v;
  return `${BASE_URL}${v.startsWith("/") ? "" : "/"}${v}`;
};

/**
 * Elimina query params que generan duplicate content: utm_*, fbclid, gclid,
 * source, ref, etc. Mantiene los parámetros que SÍ afectan el contenido:
 * ciudad, operacion, tipo, min, max, hab, ban, q, page.
 */
const CONTENT_PARAMS = new Set([
  "ciudad", "operacion", "tipo", "min", "max",
  "hab", "ban", "q", "page", "orden", "sort",
]);

const cleanPath = (path) => {
  if (!path) return "/";
  const [pathname, query = ""] = String(path).split("?");
  if (!query) return pathname || "/";
  const params = new URLSearchParams(query);
  const clean = new URLSearchParams();
  for (const [key, val] of params.entries()) {
    if (CONTENT_PARAMS.has(key.toLowerCase()) && val) {
      clean.append(key, val);
    }
  }
  const cleanQs = clean.toString();
  return cleanQs ? `${pathname}?${cleanQs}` : pathname || "/";
};

// ─── Componente ───────────────────────────────────────────────────────────

export default function SeoHead({
  // básicos
  title,
  description,
  path = "/",
  canonical,            // override manual (si se pasa, gana sobre path)

  // indexación
  noindex = false,
  nofollow = false,

  // Open Graph / Twitter
  image,
  imageAlt,
  imageWidth = 1200,
  imageHeight = 630,
  imageType = "image/jpeg",
  type = "website",     // "website" | "article" | "product"
  locale = "es_CO",

  // Producto (propiedades inmobiliarias)
  price,
  priceCurrency = "COP",
  availability,         // "in stock" | "out of stock"

  // Artículo / fechas
  publishedTime,
  modifiedTime,

  // JSON-LD (array de objetos o un objeto)
  structuredData,

  // hreflang alternates extras (por defecto ya incluimos es-CO, es, x-default)
  alternates = [],

  // Keywords opcional
  keywords,

  // children permite que cada página agregue tags custom
  children,
}) {
  const cleanedPath = cleanPath(path);
  const finalCanonical = canonical || `${BASE_URL}${cleanedPath}`;
  const finalImage = toAbsolute(image || DEFAULT_IMAGE);
  const finalImageAlt = imageAlt || title || DEFAULT_IMAGE_ALT;

  const robotsContent = [
    noindex ? "noindex" : "index",
    nofollow ? "nofollow" : "follow",
    "max-image-preview:large",
    "max-snippet:-1",
    "max-video-preview:-1",
  ].join(", ");

  const jsonLdArray = Array.isArray(structuredData)
    ? structuredData
    : structuredData
      ? [structuredData]
      : [];

  return (
    <Helmet prioritizeSeoTags>
      <html lang="es-CO" />

      {/* ── Básicos ─────────────────────────────────────────── */}
      <title>{title}</title>
      {description && <meta name="description" content={description} />}
      {keywords && <meta name="keywords" content={keywords} />}
      <meta name="robots" content={robotsContent} />
      <meta name="googlebot" content={robotsContent} />

      {/* ── Canonical ───────────────────────────────────────── */}
      <link rel="canonical" href={finalCanonical} />

      {/* ── Hreflang (Colombia-first) ───────────────────────── */}
      <link rel="alternate" hrefLang="es-CO" href={finalCanonical} />
      <link rel="alternate" hrefLang="es" href={finalCanonical} />
      <link rel="alternate" hrefLang="x-default" href={finalCanonical} />
      {alternates.map((alt) => (
        <link
          key={`${alt.hreflang}-${alt.href}`}
          rel="alternate"
          hrefLang={alt.hreflang}
          href={toAbsolute(alt.href)}
        />
      ))}

      {/* ── Open Graph ──────────────────────────────────────── */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={finalCanonical} />
      <meta property="og:title" content={title} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:image" content={finalImage} />
      <meta property="og:image:secure_url" content={finalImage} />
      <meta property="og:image:width" content={String(imageWidth)} />
      <meta property="og:image:height" content={String(imageHeight)} />
      <meta property="og:image:alt" content={finalImageAlt} />
      <meta property="og:image:type" content={imageType} />
      <meta property="og:locale" content={locale} />
      <meta property="og:locale:alternate" content="es_ES" />
      <meta property="og:locale:alternate" content="es_MX" />
      <meta property="og:site_name" content={COMPANY_NAME} />

      {/* ── Product OG (Facebook product tags) ──────────────── */}
      {price && (
        <meta property="product:price:amount" content={String(price)} />
      )}
      {price && (
        <meta property="product:price:currency" content={priceCurrency} />
      )}
      {price && (
        <meta property="og:price:amount" content={String(price)} />
      )}
      {price && (
        <meta property="og:price:currency" content={priceCurrency} />
      )}
      {availability && (
        <meta property="product:availability" content={availability} />
      )}

      {/* ── Article timestamps ──────────────────────────────── */}
      {publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {modifiedTime && (
        <meta property="article:modified_time" content={modifiedTime} />
      )}

      {/* ── Twitter / X ─────────────────────────────────────── */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@inmobiliaria_ryb" />
      <meta name="twitter:creator" content="@inmobiliaria_ryb" />
      <meta name="twitter:title" content={title} />
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image" content={finalImage} />
      <meta name="twitter:image:alt" content={finalImageAlt} />

      {/* ── WhatsApp refuerzo ───────────────────────────────── */}
      <meta name="image" content={finalImage} />

      {/* ── JSON-LD ─────────────────────────────────────────── */}
      {}
      {jsonLdArray.map((json, i) => (
        <script key={`ld-${i}`} type="application/ld+json">
          {JSON.stringify(json).replace(/<\/script>/gi, '<\\/script>')}
        </script>
      ))}

      {/* ── Custom children (meta tags extra de cada página) ── */}
      {children}
    </Helmet>
  );
}