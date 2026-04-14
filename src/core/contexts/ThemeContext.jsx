// src/core/contexts/ThemeContext.jsx
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);
const THEME_KEY = 'ryb-theme';

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de ThemeProvider');
  return ctx;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem(THEME_KEY, next);
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
    return () => {
      if (!had) document.documentElement.classList.remove('dark');
    };
  }, []);
}