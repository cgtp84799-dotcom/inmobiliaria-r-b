// src/shared/components/SEO/SeoTextBlock.jsx
// ─────────────────────────────────────────────────────────────
// Bloque visual de contenido SEO para el footer de páginas de listado.
// Renderiza FAQs expandibles (<details>) + párrafos editoriales + un link
// a contenido relacionado.
//
// El JSON-LD del FAQPage se genera por separado con buildFaqSchema() y se
// pasa a <SeoHead structuredData={[...]} />. Este componente solo es UI.
//
// Uso:
//   <SeoTextBlock
//     title="Preguntas frecuentes sobre casas en Manizales"
//     paragraphs={['...', '...', '...']}
//     faqs={[{ question, answer }, ...]}
//     relatedLinks={[{ label, url }, ...]}
//   />
// ─────────────────────────────────────────────────────────────

import { Link } from "react-router-dom";
import { FaChevronDown, FaArrowRight } from "react-icons/fa";

export default function SeoTextBlock({
  title = "Sobre esta búsqueda",
  paragraphs = [],
  faqs = [],
  relatedLinks = [],
  relatedTitle = "Explora otras zonas",
}) {
  const hasContent = paragraphs.length > 0 || faqs.length > 0 || relatedLinks.length > 0;
  if (!hasContent) return null;

  return (
    <section
      aria-labelledby="seo-text-block-title"
      className="mt-16 pt-10 border-t"
      style={{ borderColor: "var(--color-border, #334155)" }}
    >
      <h2
        id="seo-text-block-title"
        className="text-2xl sm:text-3xl font-bold mb-6 heading-section"
      >
        {title}
      </h2>

      {/* ── Párrafos editoriales ──────────────────────────── */}
      {paragraphs.length > 0 && (
        <div
          className="prose prose-invert max-w-3xl space-y-4 mb-10 text-base leading-relaxed"
          style={{ color: "var(--color-text-muted, #cbd5e1)" }}
        >
          {paragraphs.map((p, i) => (
            <p key={`seo-p-${i}`}>{p}</p>
          ))}
        </div>
      )}

      {/* ── FAQs expandibles ──────────────────────────────── */}
      {faqs.length > 0 && (
        <div className="max-w-3xl mb-10">
          <h3 className="text-xl font-semibold mb-4">Preguntas frecuentes</h3>
          <ul className="space-y-2">
            {faqs.map((f, i) => (
              <li
                key={`faq-${i}`}
                className="rounded-lg border overflow-hidden"
                style={{ borderColor: "var(--color-border, #334155)" }}
              >
                <details className="group">
                  <summary
                    className="flex items-center justify-between gap-3 p-4 cursor-pointer list-none font-medium"
                    style={{ color: "var(--color-text, #f1f5f9)" }}
                  >
                    <span>{f.question}</span>
                    <FaChevronDown
                      className="text-xs flex-shrink-0 transition-transform group-open:rotate-180"
                    />
                  </summary>
                  <div
                    className="px-4 pb-4 text-sm leading-relaxed"
                    style={{ color: "var(--color-text-muted, #cbd5e1)" }}
                  >
                    {f.answer}
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Links internos relacionados ───────────────────── */}
      {relatedLinks.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4">{relatedTitle}</h3>
          <ul className="flex flex-wrap gap-2">
            {relatedLinks.map((link) => (
              <li key={link.url}>
                <Link
                  to={link.url}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full border transition-colors hover:border-[var(--color-gold,#b45309)]"
                  style={{ borderColor: "var(--color-border, #334155)" }}
                >
                  <span>{link.label}</span>
                  <FaArrowRight className="text-[0.65rem]" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}