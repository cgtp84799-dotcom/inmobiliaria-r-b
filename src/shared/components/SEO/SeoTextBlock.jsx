// src/shared/components/SEO/SeoTextBlock.jsx
// ─────────────────────────────────────────────────────────────
// Bloque visual de contenido SEO — diseño integrado con la
// estética editorial del home (tokens CSS, dorado/ámbar, dark).
//
// El JSON-LD del FAQPage se genera por separado con buildFaqSchema()
// y se pasa a <SeoHead structuredData={[...]} />. Este componente
// sólo es UI.
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
import { FaChevronDown, FaArrowRight, FaMapMarkerAlt } from "react-icons/fa";

export default function SeoTextBlock({
  title = "Sobre esta búsqueda",
  paragraphs = [],
  faqs = [],
  relatedLinks = [],
  relatedTitle = "Explora otras zonas",
}) {
  const hasContent =
    paragraphs.length > 0 || faqs.length > 0 || relatedLinks.length > 0;
  if (!hasContent) return null;

  return (
    <section
      aria-labelledby="seo-text-block-title"
      style={{
        background: "var(--color-surface-off)",
        borderTop: "1px solid var(--color-border)",
        marginTop: "5rem",
        padding: "4rem 0 4.5rem",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Eyebrow + Título ────────────────────────────────── */}
        <div className="mb-10">
          <span
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] mb-4"
            style={{ color: "var(--color-text-muted)" }}
          >
            <FaMapMarkerAlt style={{ color: "#d97706" }} />
            Información de zona
          </span>

          <h2
            id="seo-text-block-title"
            className="font-display text-3xl sm:text-4xl leading-tight"
            style={{ color: "var(--color-text)" }}
          >
            {title.includes("sobre") || title.includes("Todo") ? (
              <>
                {title.split(" ").slice(0, 2).join(" ")}{" "}
                <em>{title.split(" ").slice(2).join(" ")}</em>
              </>
            ) : (
              <em>{title}</em>
            )}
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">

          {/* ── Columna izquierda: párrafos + FAQs ─────────────── */}
          <div className="lg:col-span-7 space-y-10">

            {/* Párrafos editoriales */}
            {paragraphs.length > 0 && (
              <div className="space-y-4">
                {paragraphs.map((p, i) => (
                  <p
                    key={`seo-p-${i}`}
                    className="text-base leading-relaxed max-w-2xl"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {p}
                  </p>
                ))}
              </div>
            )}

            {/* FAQs expandibles */}
            {faqs.length > 0 && (
              <div>
                <div
                  className="flex items-center gap-3 mb-5"
                  style={{
                    borderBottom: "1px solid var(--color-border)",
                    paddingBottom: "0.75rem",
                  }}
                >
                  <span
                    className="font-display text-xl"
                    style={{ color: "var(--color-text)" }}
                  >
                    Preguntas frecuentes
                  </span>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: "rgba(245,158,11,0.12)",
                      color: "#d97706",
                    }}
                  >
                    {faqs.length}
                  </span>
                </div>

                <ul className="space-y-2">
                  {faqs.map((f, i) => (
                    <li
                      key={`faq-${i}`}
                      className="rounded-xl overflow-hidden"
                      style={{
                        background: "var(--color-surface)",
                        border: "1px solid var(--color-border)",
                      }}
                    >
                      <details className="group">
                        <summary
                          className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer list-none font-medium text-sm"
                          style={{ color: "var(--color-text)" }}
                        >
                          <span className="leading-snug">{f.question}</span>
                          <FaChevronDown
                            className="text-[0.65rem] flex-shrink-0 transition-transform duration-200 group-open:rotate-180"
                            style={{ color: "#d97706" }}
                          />
                        </summary>
                        <div
                          className="px-5 pb-4 text-sm leading-relaxed"
                          style={{
                            color: "var(--color-text-muted)",
                            borderTop: "1px solid var(--color-divider)",
                            paddingTop: "0.75rem",
                          }}
                        >
                          {f.answer}
                        </div>
                      </details>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* ── Columna derecha: links relacionados ─────────────── */}
          {relatedLinks.length > 0 && (
            <div className="lg:col-span-5">
              <div
                className="rounded-2xl p-6 sm:p-7 h-fit lg:sticky lg:top-28"
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  boxShadow: "var(--shadow-card)",
                }}
              >
                <div className="flex items-center gap-2 mb-5">
                  <span
                    className="w-1 h-5 rounded-full flex-shrink-0"
                    style={{ background: "var(--gradient-gold, linear-gradient(135deg,#f59e0b,#d97706))" }}
                  />
                  <h3
                    className="font-display text-lg"
                    style={{ color: "var(--color-text)" }}
                  >
                    {relatedTitle}
                  </h3>
                </div>

                <ul className="flex flex-wrap gap-2">
                  {relatedLinks.map((link) => (
                    <li key={link.url}>
                      <Link
                        to={link.url}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full transition-all duration-200"
                        style={{
                          background: "var(--color-surface-off)",
                          border: "1px solid var(--color-border)",
                          color: "var(--color-text-muted)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "#d97706";
                          e.currentTarget.style.color = "#d97706";
                          e.currentTarget.style.background = "rgba(245,158,11,0.06)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "var(--color-border)";
                          e.currentTarget.style.color = "var(--color-text-muted)";
                          e.currentTarget.style.background = "var(--color-surface-off)";
                        }}
                      >
                        <span>{link.label}</span>
                        <FaArrowRight className="text-[0.55rem] opacity-60" />
                      </Link>
                    </li>
                  ))}
                </ul>

                {/* Nota discreta al pie */}
                <p
                  className="mt-5 pt-4 text-xs leading-relaxed"
                  style={{
                    color: "var(--color-text-faint)",
                    borderTop: "1px solid var(--color-divider)",
                  }}
                >
                  Contenido actualizado periódicamente. ¿No encuentras tu zona?{" "}
                  <Link
                    to="/contacto"
                    className="underline underline-offset-2"
                    style={{ color: "#d97706" }}
                  >
                    Escríbenos
                  </Link>
                  .
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}