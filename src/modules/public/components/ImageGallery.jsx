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

const ImageGallery = ({ images }) => {
  const [thumbsSwiper, setThumbsSwiper] = useState(null);
  const [mainSwiper, setMainSwiper] = useState(null);
  const [showLightbox, setShowLightbox] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // ✅ bloquear scroll del body cuando el lightbox está abierto
  useEffect(() => {
    if (!showLightbox) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [showLightbox]);

  // ✅ reset índice si cambian imágenes
  useEffect(() => {
    setActiveIndex(0);
    if (mainSwiper && !mainSwiper.destroyed) mainSwiper.slideTo(0, 0);
  }, [images?.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!images || images.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl h-72 sm:h-96 flex items-center justify-center">
        <p className="text-slate-500 text-sm sm:text-base">Sin imágenes disponibles</p>
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
                  alt={`Imagen ${index + 1}`}
                  className="w-full h-full object-cover cursor-pointer"
                  loading="lazy"
                  onClick={() => {
                    setActiveIndex(index);
                    setShowLightbox(true);
                  }}
                />
              </SwiperSlide>
            ))}
          </Swiper>

          <div className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4 z-10 px-2.5 sm:px-3 py-1 bg-black/70 backdrop-blur-sm text-white rounded-full text-xs sm:text-sm font-semibold">
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
                aria-label={`Ver miniatura ${index + 1}`}
              >
                <img
                  src={img}
                  alt={`Miniatura ${index + 1}`}
                  className={`w-full h-full object-cover rounded-lg cursor-pointer border-2 transition-all ${
                    index === activeIndex
                      ? "border-primary scale-[1.02]"
                      : "border-slate-700 hover:border-primary/50"
                  }`}
                  loading="lazy"
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
          >
            <button
              onClick={() => setShowLightbox(false)}
              className="absolute top-3 sm:top-4 right-3 sm:right-4 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition z-50"
              aria-label="Cerrar"
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
                      alt={`Imagen ${index + 1}`}
                      className="max-h-[90vh] max-w-[92vw] sm:max-w-[90vw] object-contain mx-auto"
                      loading="lazy"
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
