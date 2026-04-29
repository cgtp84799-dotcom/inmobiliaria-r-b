// public/theme-init.js
//
// Script blocker que se ejecuta ANTES de que React monte.
// Lee la preferencia de tema del usuario y la aplica al <html>
// para evitar el FOUC (Flash Of Unstyled Content) cuando el
// tema guardado es "light" pero el HTML tiene data-theme="dark"
// hardcoded.
//
// Debe cargarse SIN async/defer en el <head> para que sea
// blocking — pero es tan corto (~20 líneas minificadas) que
// no afecta la métrica LCP de manera perceptible.
//
// CSP-safe: archivo externo, no requiere 'unsafe-inline'.

(function () {
  try {
    var KEY = 'ryb-theme';
    var saved = localStorage.getItem(KEY);
    var theme;
    if (saved === 'light' || saved === 'dark') {
      theme = saved;
    } else {
      // Sin preferencia guardada → respetar preferencia del sistema
      var prefersDark = window.matchMedia
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
        : true; // fallback dark si matchMedia no disponible
      theme = prefersDark ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (_e) {
    // localStorage bloqueado (private browsing en Safari, etc.) → no hacer nada
  }
})();