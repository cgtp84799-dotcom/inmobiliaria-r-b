// src/core/contexts/ThemeContext.jsx
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);
const THEME_KEY = 'ryb-theme';

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de ThemeProvider');
  return ctx;
};

/**
 * Lee el tema inicial respetando este orden de prioridad:
 *   1. localStorage (preferencia explícita del usuario)
 *   2. data-theme del <html> (lo establece public/theme-init.js antes del paint)
 *   3. prefers-color-scheme del sistema
 *   4. fallback 'dark'
 */
function readInitialTheme() {
  if (typeof window === 'undefined') return 'dark';
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // localStorage bloqueado en private browsing — continuar con fallbacks
  }
  const dataAttr = document.documentElement.getAttribute('data-theme');
  if (dataAttr === 'light' || dataAttr === 'dark') return dataAttr;
  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
}

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(readInitialTheme);

  // Aplica tema al <html> cada vez que cambia
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }
  }, [theme]);

  // Escucha cambios en la preferencia del sistema
  // Solo aplica si el usuario NO ha elegido manualmente
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => {
      let saved;
      try { saved = localStorage.getItem(THEME_KEY); } catch { saved = null; }
      if (saved !== 'dark' && saved !== 'light') {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };
    if (mql.addEventListener) {
      mql.addEventListener('change', handler);
      return () => mql.removeEventListener('change', handler);
    }
    mql.addListener(handler);
    return () => mql.removeListener(handler);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // localStorage bloqueado — el cambio aplica solo para esta sesión
    }
  };

  const value = useMemo(() => ({ theme, toggleTheme }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

/**
 * Hook para forzar dark mode mientras el componente esté montado.
 * Úsalo en el componente raíz del ClientPortal y ClientAuthPage.
 * Al desmontar, restaura la clase que tenía antes.
 */
export function useForceDark() {
  useEffect(() => {
    const had = document.documentElement.classList.contains('dark');
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-theme', 'dark');
    return () => {
      if (!had) {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
      }
    };
  }, []);
}