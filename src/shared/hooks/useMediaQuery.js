// src/shared/hooks/useMediaQuery.js
//
// Hook unificado para detectar breakpoints responsive.
// Reemplaza los múltiples `useEffect + window.innerWidth + resize listener`
// dispersos en Sidebar, AdminLayout, CatalogPage, PropertyClientPrint, etc.
//
// Uso:
//   const isMobile     = useMediaQuery('(max-width: 767px)');
//   const isDesktop    = useMediaQuery('(min-width: 1024px)');
//   const isDark       = useMediaQuery('(prefers-color-scheme: dark)');
//
// O con los breakpoints predefinidos (Tailwind-like):
//   const isDesktop = useBreakpoint('lg');  // >= 1024px
//   const isMobile  = useBreakpoint('sm', 'below');

import { useEffect, useState } from 'react';

/**
 * Devuelve `true` si la media query matchea el viewport actual.
 * SSR-safe: en servidor devuelve `false`.
 *
 * @param {string} query — media query válida de CSS
 * @returns {boolean}
 */
export function useMediaQuery(query) {
  const getMatch = () => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  };

  const [matches, setMatches] = useState(getMatch);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;

    const mql = window.matchMedia(query);

    // Sincronizar estado por si el SSR hydration difiere
    setMatches(mql.matches);

    // Safari < 14 no tiene addEventListener en MediaQueryList.
    // Fallback con addListener (deprecated pero compat amplio).
    const handler = (e) => setMatches(e.matches);
    if (mql.addEventListener) {
      mql.addEventListener('change', handler);
      return () => mql.removeEventListener('change', handler);
    }
    mql.addListener(handler);
    return () => mql.removeListener(handler);
  }, [query]);

  return matches;
}

// ═══════════════════════════════════════════════════════════════════════════
//  Breakpoints (Tailwind defaults — mantener en sincronía con tailwind.config)
// ═══════════════════════════════════════════════════════════════════════════
export const BREAKPOINTS = {
  sm:  640,
  md:  768,
  lg:  1024,
  xl:  1280,
  '2xl': 1536,
};

/**
 * Variante con nombres de breakpoint.
 *
 * @param {keyof typeof BREAKPOINTS} bp
 * @param {'above'|'below'} direction
 * @returns {boolean}
 *
 * @example
 *   useBreakpoint('md')            // true si viewport >= 768px
 *   useBreakpoint('md', 'below')   // true si viewport < 768px
 */
export function useBreakpoint(bp, direction = 'above') {
  const px = BREAKPOINTS[bp];
  if (!px) {
    // Fail loud — evitar silent bugs si alguien pone 'xxl' por error
    throw new Error(`[useBreakpoint] Breakpoint desconocido: ${bp}`);
  }
  const query = direction === 'below' ? `(max-width: ${px - 1}px)` : `(min-width: ${px}px)`;
  return useMediaQuery(query);
}

// ═══════════════════════════════════════════════════════════════════════════
//  Preferencias del usuario
// ═══════════════════════════════════════════════════════════════════════════

/** true si el sistema del usuario está en modo oscuro. */
export const usePrefersDark = () => useMediaQuery('(prefers-color-scheme: dark)');

/** true si el usuario activó "reduce motion" en su SO. */
export const usePrefersReducedMotion = () =>
  useMediaQuery('(prefers-reduced-motion: reduce)');