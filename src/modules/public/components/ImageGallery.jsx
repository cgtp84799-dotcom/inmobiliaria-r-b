import { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Thumbs, Zoom } from 'swiper/modules';
import { FaTimes } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

// Importar estilos de Swiper
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/thumbs';
import 'swiper/css/zoom';

const ImageGallery = ({ images }) => {
  const [thumbsSwiper, setThumbsSwiper] = useState(null);
  const [showLightbox, setShowLightbox] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl h-96 flex items-center justify-center">
        <p className="text-slate-500">Sin imágenes disponibles</p>
      </div>
    );
  }

  return (
    <>
      {/* Galería principal */}
      <div className="space-y-3">
        {/* Swiper principal */}
        <div className="relative rounded-xl overflow-hidden">
          <Swiper
            modules={[Navigation, Pagination, Thumbs]}
            navigation
            pagination={{ clickable: true }}
            thumbs={{ swiper: thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null }}
            onSlideChange={(swiper) => setActiveIndex(swiper.activeIndex)}
            className="h-96 lg:h-[500px]"
          >
            {images.map((img, index) => (
              <SwiperSlide key={index}>
                <img
                  src={img}
                  alt={`Imagen ${index + 1}`}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => {
                    setActiveIndex(index);
                    setShowLightbox(true);
                  }}
                />
              </SwiperSlide>
            ))}
          </Swiper>

          {/* Contador */}
          <div className="absolute bottom-4 right-4 z-10 px-3 py-1 bg-black/70 backdrop-blur-sm text-white rounded-full text-sm font-semibold">
            {activeIndex + 1} / {images.length}
          </div>
        </div>

        {/* Miniaturas */}
        <Swiper
          onSwiper={setThumbsSwiper}
          modules={[Thumbs]}
          spaceBetween={10}
          slidesPerView={5}
          breakpoints={{
            320: { slidesPerView: 3 },
            640: { slidesPerView: 4 },
            768: { slidesPerView: 5 },
            1024: { slidesPerView: 6 },
          }}
          watchSlidesProgress
          className="h-20"
        >
          {images.map((img, index) => (
            <SwiperSlide key={index}>
              <img
                src={img}
                alt={`Miniatura ${index + 1}`}
                className={`w-full h-full object-cover rounded-lg cursor-pointer border-2 transition-all ${
                  index === activeIndex
                    ? 'border-primary scale-105'
                    : 'border-slate-700 hover:border-primary/50'
                }`}
              />
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
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
            onClick={() => setShowLightbox(false)}
          >
            <button
              onClick={() => setShowLightbox(false)}
              className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition z-50"
            >
              <FaTimes size={24} />
            </button>

            <Swiper
              modules={[Navigation, Pagination, Zoom]}
              navigation
              pagination={{ clickable: true }}
              zoom
              initialSlide={activeIndex}
              className="w-full h-full"
              onClick={(e) => e.stopPropagation()}
            >
              {images.map((img, index) => (
                <SwiperSlide key={index}>
                  <div className="swiper-zoom-container">
                    <img
                      src={img}
                      alt={`Imagen ${index + 1}`}
                      className="max-h-[90vh] max-w-[90vw] object-contain mx-auto"
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