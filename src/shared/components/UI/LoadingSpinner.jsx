// src/shared/components/UI/LoadingSpinner.jsx
import { motion } from 'framer-motion';

/* ─── Tamaños disponibles ───────────────────────────────────── */
const SIZES = {
  xs: { ring: 'w-5 h-5',  border: 'border-2', text: 'text-xs', gap: 'mt-2' },
  sm: { ring: 'w-8 h-8',  border: 'border-2', text: 'text-xs', gap: 'mt-3' },
  md: { ring: 'w-12 h-12', border: 'border-4', text: 'text-sm', gap: 'mt-4' },
  lg: { ring: 'w-16 h-16', border: 'border-4', text: 'text-base', gap: 'mt-4' },
};

/*
  Props:
  - size:      'xs' | 'sm' | 'md' | 'lg'   (default: 'md')
  - text:      string | null  — null oculta el label   (default: 'Cargando...')
  - fullPage:  bool — centra en toda la pantalla        (default: false)
  - overlay:   bool — fondo semitransparente (implica fullPage) (default: false)
*/
export default function LoadingSpinner({
  size     = 'md',
  text     = 'Cargando...',
  fullPage = false,
  overlay  = false,
}) {
  const s = SIZES[size] ?? SIZES.md;

  const spinner = (
    <div
      role="status"
      aria-live="polite"
      aria-label={text || 'Cargando'}
      className="flex flex-col items-center justify-center"
    >
      {/* Anillo giratorio */}
      <motion.div
        className={`${s.ring} ${s.border} rounded-full`}
        style={{
          borderColor:      'var(--color-primary-highlight)',
          borderTopColor:   'var(--color-primary)',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
        aria-hidden="true"
      />

      {/* Texto */}
      {text && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className={`${s.text} ${s.gap} font-medium`}
          style={{ color: 'var(--color-text-muted)' }}
        >
          {text}
        </motion.p>
      )}
    </div>
  );

  /* ── Variante full-page ─────────────────────────────────────── */
  if (fullPage || overlay) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{
          backgroundColor: overlay
            ? 'oklch(from var(--color-bg) l c h / 0.75)'
            : 'var(--color-bg)',
        }}
      >
        {spinner}
      </div>
    );
  }

  /* ── Variante inline (default) ──────────────────────────────── */
  return (
    <div className="flex items-center justify-center py-12 w-full">
      {spinner}
    </div>
  );
}