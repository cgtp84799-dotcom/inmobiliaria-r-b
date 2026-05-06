// src/shared/components/LazyImage.jsx
import { useState, useEffect, useRef } from 'react';

export default function LazyImage({
  src, 
  alt, 
  className = '',
  placeholder = null,
  threshold = 0.1,
  rootMargin = '100px',
  ...props 
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);

  // Placeholder por defecto (gris claro)
  const defaultPlaceholder = (
    <div className={`bg-slate-200 animate-pulse ${className}`}>
      {!placeholder && (
        <div className="w-full h-full flex items-center justify-center">
          <svg className="w-8 h-8 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}
    </div>
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setHasError(true);
  };

  return (
    <div ref={imgRef} className={`relative ${className}`}>
      {/* Placeholder mientras carga */}
      {!isLoaded && !isInView && defaultPlaceholder}
      
      {/* Placeholder gris mientras carga la imagen real */}
      {isInView && !isLoaded && !hasError && (
        <div className={`absolute inset-0 bg-slate-200 animate-pulse ${className}`} />
      )}

      {/* Imagen real - solo se carga cuando está en view */}
      {isInView && (
        <img
          src={hasError ? '/placeholder-property.jpg' : src}
          alt={alt}
          className={`${className} transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
          decoding="async"
          {...props}
        />
      )}

      {/* Error fallback */}
      {hasError && isLoaded && (
        <div className={`absolute inset-0 bg-slate-100 flex items-center justify-center ${className}`}>
          <span className="text-[var(--color-text-muted)] text-sm">Imagen no disponible</span>
        </div>
      )}
    </div>
  );
}

export function useLazyImage(options = {}) {
  const { threshold = 0.1, rootMargin = '100px' } = options;
  const [isInView, setIsInView] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin]);

  return { ref, isInView };
}

export function LazyImageGallery({ images, alt = 'Imagen de propiedad', className = '', ...props }) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className={`bg-slate-200 ${className}`}>
        <div className="w-full h-full flex items-center justify-center text-[var(--color-text-muted)]">
          Sin imágenes
        </div>
      </div>
    );
  }

  return (
    <div className={className} {...props}>
      {/* Imagen principal */}
      <div className="relative aspect-video bg-slate-100">
        <LazyImage
          src={images[selectedIndex]}
          alt={`${alt} ${selectedIndex + 1}`}
          className="w-full h-full object-cover"
        />
        
        {/* Indicador de cantidad */}
        {images.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-black/50 text-[var(--color-text)] text-xs px-2 py-1 rounded">
            {selectedIndex + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 mt-2 overflow-x-auto py-1">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedIndex(idx)}
              className={`flex-shrink-0 w-20 h-14 rounded overflow-hidden border-2 transition-colors ${
                idx === selectedIndex 
                  ? 'border-amber-500 ring-2 ring-amber-500/30' 
                  : 'border-transparent hover:border-slate-300'
              }`}
            >
              <LazyImage
                src={img}
                alt={`${alt} thumbnail ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}