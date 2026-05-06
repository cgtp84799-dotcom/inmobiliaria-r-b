// src/modules/public/components/ImageGallery.jsx
//
// CAMBIO SEO: Primera imagen ahora usa loading="eager" + fetchPriority="high"
// para mejorar el LCP (Largest Contentful Paint) en páginas de propiedad.
// Las imágenes 2+ siguen siendo lazy.

import { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Thumbs, Zoom } from "swiper/modules";
import { FaTimes } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/thumbs";
import "swiper/css/zoom";

// Recibe propertyTitle para mejorar SEO en alt
const ImageGallery = ({ images, propertyTitle = "Propiedad" }) => {
  const [thumbsSwiper, setThumbsSwiper] = useState(null);
  const [mainSwiper, setMainSwiper]     = useState(null);
  const [showLightbox, setShowLightbox] = useState(false);
  const [activeIndex, setActiveIndex]   = useState(0);

  // Bloquear scroll del body cuando el lightbox está abierto
  useEffect(() => {
    if (!showLightbox) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [showLightbox]);

  // Reset índice si cambian imágenes
  useEffect(() => {
    setActiveIndex(0);
    if (mainSwiper && !mainSwiper.destroyed) mainSwiper.slideTo(0, 0);
  }, [images?.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!images || images.length === 0) {
    return (
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl h-72 sm:h-96 flex items-center justify-center">
        <p className="text-[var(--color-text-muted)] text-sm sm:text-base">Sin imágenes disponibles</p>
      </div>
    );
  }

  const goTo = (index) => {
    setActiveIndex(index);
    if (mainSwiper && !mainSwiper.destroyed) mainSwiper.slideTo(index);
  };

  return (
    <>
      <div className="space-y-3">
        {/* Swiper principal */}
        <div className="relative rounded-xl overflow-hidden">
          <Swiper
            onSwiper={setMainSwiper}
            modules={[Navigation, Pagination, Thumbs]}
            navigation
            pagination={{ clickable: true }}
            thumbs={{ swiper: thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null }}
            onSlideChange={(swiper) => setActiveIndex(swiper.activeIndex)}
            className="aspect-[4/3] sm:aspect-[16/9] lg:aspect-[21/9]"
          >
            {images.map((img, index) => (
              <SwiperSlide key={index}>
                <img
                  src={img}
                  alt={
                    index === 0
                      // Primera imagen: alt más descriptivo y completo para Google
                      ? `${propertyTitle} — foto principal`
                      : `${propertyTitle} — foto ${index + 1} de ${images.length}`
                  }
                  className="w-full h-full object-cover cursor-pointer"

                  // ── CAMBIO CRÍTICO PARA SEO / CORE WEB VITALS ───────────
                  // La primera imagen es el LCP candidate de la página.
                  // Con loading="lazy" el browser la carga tarde → LCP alto
                  // → Google penaliza el ranking.
                  // Solución: primera imagen eager + alta prioridad,
                  //           el resto lazy como estaba.
                  loading={index === 0 ? "eager" : "lazy"}
                  fetchPriority={index === 0 ? "high" : "auto"}
                  decoding={index === 0 ? "sync" : "async"}
                  // ────────────────────────────────────────────────────────

                  width={1200}
                  height={800}
                  referrerPolicy="no-referrer"
                  onClick={() => {
                    setActiveIndex(index);
                    setShowLightbox(true);
                  }}
                  onError={(e) => {
                    // Fallback al logo local — nunca a servicios externos
                    e.currentTarget.src = "/og-default.jpg";
                    e.currentTarget.onerror = null; // Evitar loop
                  }}
                />
              </SwiperSlide>
            ))}
          </Swiper>

          <div className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4 z-10 px-2.5 sm:px-3 py-1 bg-black/70 backdrop-blur-sm text-[var(--color-text)] rounded-full text-xs sm:text-sm font-semibold">
            {activeIndex + 1} / {images.length}
          </div>
        </div>

        {/* Miniaturas */}
        <Swiper
          onSwiper={setThumbsSwiper}
          modules={[Thumbs]}
          spaceBetween={10}
          slidesPerView={4}
          breakpoints={{
            320: { slidesPerView: 4 },
            480: { slidesPerView: 5 },
            640: { slidesPerView: 6 },
            768: { slidesPerView: 7 },
            1024: { slidesPerView: 8 },
          }}
          watchSlidesProgress
          className="h-16 sm:h-20"
        >
          {images.map((img, index) => (
            <SwiperSlide key={index}>
              <button
                type="button"
                onClick={() => goTo(index)}
                className="w-full h-full"
                aria-label={`Ver foto ${index + 1} de ${propertyTitle}`}
              >
                <img
                  src={img}
                  alt={`${propertyTitle} — miniatura ${index + 1}`}
                  className={`w-full h-full object-cover rounded-lg cursor-pointer border-2 transition-all ${
                    index === activeIndex
                      ? "border-primary scale-[1.02]"
                      : "border-[var(--color-border)] hover:border-primary/50"
                  }`}
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    e.currentTarget.src = "/og-default.jpg";
                    e.currentTarget.onerror = null;
                  }}
                />
              </button>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {showLightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-3 sm:p-4"
            onClick={() => setShowLightbox(false)}
            role="dialog"
            aria-modal="true"
            aria-label={`Galería de fotos: ${propertyTitle}`}
          >
            <button
              onClick={() => setShowLightbox(false)}
              className="absolute top-3 sm:top-4 right-3 sm:right-4 p-3 bg-[var(--color-surface)]/10 hover:bg-[var(--color-surface)]/20 text-[var(--color-text)] rounded-full transition z-50"
              aria-label="Cerrar galería"
            >
              <FaTimes size={22} />
            </button>

            <Swiper
              modules={[Navigation, Pagination, Zoom]}
              navigation
              pagination={{ clickable: true }}
              zoom
              initialSlide={activeIndex}
              className="w-full h-full"
              onClick={(e) => e.stopPropagation()}
              onSlideChange={(swiper) => setActiveIndex(swiper.activeIndex)}
            >
              {images.map((img, index) => (
                <SwiperSlide key={index}>
                  <div className="swiper-zoom-container">
                    <img
                      src={img}
                      alt={`${propertyTitle} — foto ${index + 1} de ${images.length}`}
                      className="max-h-[90vh] max-w-[92vw] sm:max-w-[90vw] object-contain mx-auto"
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        e.currentTarget.src = "/og-default.jpg";
                        e.currentTarget.onerror = null;
                      }}
                    />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ImageGallery;