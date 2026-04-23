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
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ["console.log", "console.info", "console.debug"],
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

          // Firebase — por módulo para tree-shaking óptimo
          if (id.includes("firebase/app")       || id.includes("@firebase/app"))       return "firebase-app";
          if (id.includes("firebase/auth")      || id.includes("@firebase/auth"))      return "firebase-auth";
          if (id.includes("firebase/firestore") || id.includes("@firebase/firestore")) return "firebase-firestore";
          if (id.includes("firebase/storage")   || id.includes("@firebase/storage"))   return "firebase-storage";
          if (id.includes("firebase/messaging") || id.includes("@firebase/messaging")) return "firebase-messaging";
          if (id.includes("firebase")           || id.includes("@firebase"))           return "firebase-misc";

          // SEO
          if (id.includes("react-helmet-async")) return "seo";

          // Animaciones
          if (id.includes("framer-motion")) return "framer-motion";

          // Iconos
          if (id.includes("react-icons"))  return "icons-fa";
          if (id.includes("lucide-react")) return "icons-lucide";

          // Toasts
          if (id.includes("react-hot-toast")) return "toast";

          // Calendario — react-big-calendar + invariant (dependencia problemática)
          // ✅ @fullcalendar eliminado del package.json — no se usa en código fuente
          if (id.includes("react-big-calendar") || id.includes("invariant")) return "calendar-lazy";

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
          // ✅ jspdf standalone eliminado del package.json
          if (id.includes("html2pdf") || id.includes("html2canvas")) return "pdf-lazy";

          // DnD — solo @dnd-kit (hello-pangea eliminado — no se usa en fuente)
          if (id.includes("@dnd-kit")) return "dnd-lazy";

          // Resto lazy
          if (id.includes("swiper"))                return "swiper-lazy";
          if (id.includes("emoji-picker-react"))     return "emoji-lazy";
          if (id.includes("@jitsi"))                return "jitsi-lazy";
          if (id.includes("react-h5-audio-player")) return "audio-lazy";
          if (id.includes("date-fns"))              return "date-fns";

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
      "@jitsi/react-sdk",
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
