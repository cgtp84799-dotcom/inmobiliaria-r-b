// vite.config.js
// ─────────────────────────────────────────────────────────────
// Configuración optimizada para SEO y Core Web Vitals.
//
// FIXES DE COMPATIBILIDAD ESM (abril 2026):
//
//   PROBLEMA: Varias dependencias usan sub-paquetes que solo tienen
//   named exports (sin `export default`). Cuando están en `exclude`,
//   Vite sirve su ESM raw al browser que intenta importar `default`
//   y explota con "does not provide an export named 'default'".
//
//   DEPENDENCIAS AFECTADAS:
//     • recharts@3.x     → usa es-toolkit/compat/get.js (named only)
//     • react-big-calendar → usa invariant/browser.js  (named only)
//
//   SOLUCIÓN: mover estas librerías (y sus sub-deps problemáticas)
//   a `optimizeDeps.include`. esbuild las pre-bundlea y resuelve
//   correctamente los re-exports internos.
//
// LIMPIEZA DEPS (2026-04):
//   • Eliminadas referencias a @fullcalendar/* — no se usa en código fuente
//   • Eliminada referencia a @hello-pangea/dnd — se usa solo @dnd-kit
//   • jspdf eliminado como standalone — se accede vía html2pdf.js
// ─────────────────────────────────────────────────────────────

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      "@": "/src",
    },
  },

  css: {
    devSourcemap: false,
  },

  build: {
    target: "es2020",

    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: false, // ★ FIX: antes true → eliminaba también console.error, perdiendo señales críticas en prod.
        drop_debugger: true,
        // Solo eliminamos logs informativos; conservamos error/warn.
        pure_funcs: ["console.log", "console.info", "console.debug", "console.trace"],
        pure_getters: true,
        passes: 2,
      },
      format: {
        comments: false,
      },
    },

    cssCodeSplit: true,
    cssMinify: true,
    assetsInlineLimit: 4096,
    sourcemap: false,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 600,

    rollupOptions: {
      output: {
        entryFileNames: "assets/js/[name]-[hash].js",
        chunkFileNames: "assets/js/[name]-[hash].js",
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name || "";
          if (/\.(gif|jpe?g|png|svg|webp|avif)$/i.test(name))
            return "assets/img/[name]-[hash][extname]";
          if (/\.(woff2?|eot|ttf|otf)$/i.test(name))
            return "assets/fonts/[name]-[hash][extname]";
          if (/\.css$/i.test(name))
            return "assets/css/[name]-[hash][extname]";
          return "assets/[name]-[hash][extname]";
        },

        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;

          // React core
          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("/scheduler/")
          ) return "react-core";

          // Router
          if (id.includes("react-router")) return "router";

          // ═══════════════════════════════════════════════════════════════════
          // Firebase — UN SOLO CHUNK
          //
          // Razón: Firebase tiene muchas dependencias cruzadas internas
          // (@firebase/util, @firebase/logger, @firebase/component, etc.) y
          // separarlo en chunks por módulo (app/auth/firestore/storage/etc.)
          // causa errores de TDZ "Cannot access 'X' before initialization"
          // en runtime. Los submódulos se importan unos a otros en orden
          // no determinista cuando están en chunks separados.
          //
          // Agrupar todo en 'firebase' resuelve el problema. El tree-shaking
          // sigue funcionando a nivel de archivo fuente (solo importas lo
          // que usas en tu código), pero el bundle agrupado no se fragmenta.
          // ═══════════════════════════════════════════════════════════════════
          if (
            id.includes("firebase/")   ||
            id.includes("@firebase/")  ||
            id.includes("/firebase/")  ||
            id.includes("/@firebase/")
          ) return "firebase";

          // SEO
          if (id.includes("react-helmet-async")) return "seo";

          // Animaciones
          if (id.includes("framer-motion")) return "framer-motion";

          // Iconos
          if (id.includes("react-icons"))  return "icons-fa";
          if (id.includes("lucide-react")) return "icons-lucide";

          // Toasts
          if (id.includes("react-hot-toast")) return "toast";

          // ═══════════════════════════════════════════════════════════════════
          // NOTA IMPORTANTE sobre agrupar en chunks manuales:
          //
          // react-big-calendar + invariant NO se agrupan en un chunk propio
          // porque producía un TDZ (Temporal Dead Zone) "Cannot access 'g'
          // before initialization" en runtime. La causa: invariant exporta
          // como CommonJS con side effects en top-level; al hoistear los
          // imports en el chunk lazy, Vite pone la ejecución de invariant
          // ANTES de declarar los symbols que luego usa react-big-calendar,
          // resultando en el TDZ.
          //
          // La solución robusta es dejar que Rollup/Vite determine el chunk
          // (va a 'vendor' por defecto) SIN perder el beneficio de lazy-load,
          // porque estos módulos solo se cargan cuando el CalendarPage hace
          // el import dinámico.
          // ═══════════════════════════════════════════════════════════════════

          // Mapas
          if (id.includes("leaflet") || id.includes("react-leaflet")) return "maps-lazy";

          // Charts — agrupados con es-toolkit para resolver sus re-exports
          if (
            id.includes("recharts")       ||
            id.includes("es-toolkit")     ||
            id.includes("victory-vendor") ||
            id.includes("d3-")
          ) return "charts-lazy";

          // PDF — html2pdf.js incluye jspdf y html2canvas internamente
          if (id.includes("html2pdf") || id.includes("html2canvas")) return "pdf-lazy";

          // DnD
          if (id.includes("@dnd-kit")) return "dnd-lazy";

          // Resto lazy
          if (id.includes("swiper"))   return "swiper-lazy";
          if (id.includes("date-fns")) return "date-fns";

          return "vendor";
        },
      },
    },

    modulePreload: { polyfill: true },
  },

  optimizeDeps: {
    include: [
      // Core
      "react",
      "react-dom",
      "react-router-dom",
      "react-helmet-async",

      // Firebase
      "firebase/app",
      "firebase/auth",
      "firebase/firestore",

      // FIX #1: recharts@3.x usa es-toolkit que no tiene export default.
      // Pre-bundlear con esbuild resuelve los named re-exports correctamente.
      "recharts",
      "es-toolkit",
      "es-toolkit/compat",

      // FIX #2: react-big-calendar usa invariant que tampoco tiene export default.
      // Mismo fix: mover a include para que esbuild lo pre-procese.
      "react-big-calendar",
      "invariant",
    ],
    exclude: [
      // Estas sí pueden excluirse — no tienen el problema de named-vs-default.
      "leaflet",
      "react-leaflet",
      "html2pdf.js",
      "html2canvas",
    ],
  },

  server: {
    port: 5173,
    open: false,
  },

  preview: {
    port: 4173,
    open: false,
  },
});