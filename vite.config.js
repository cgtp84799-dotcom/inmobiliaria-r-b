import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],


  resolve: {
    alias: {
      "@": "/src",
    },
  },

  build: {
    target: "es2015",
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,   
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        
        manualChunks: {
          "react-vendor":    ["react", "react-dom", "react-router-dom"],
          "firebase-vendor": ["firebase/app", "firebase/auth", "firebase/firestore", "firebase/storage"],
          "ui-vendor":       ["framer-motion", "react-hot-toast", "react-icons"],
        },
      },
    },

    chunkSizeWarningLimit: 500,
  },


  server: {
    port: 5173,
    open: false,
  },
})