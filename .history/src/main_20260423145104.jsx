/**
 * Copyright (c) 2025 Mateo Carvajal Tamayo
 * Todos los derechos reservados.
 *
 * Software desarrollado para Andrés Medardo Rincón Bedoya
 * NIT: 1087985594-7 | Matrícula Mercantil: 238639
 * Cámara de Comercio de Manizales por Caldas
 *
 * Uso no autorizado está prohibido.
 */

// ─────────────────────────────────────────────────────────────
// Entry point de la aplicación.
//
// ÁRBOL DE PROVIDERS (orden importa):
//   StrictMode        → detecta efectos con cleanup incorrecto en dev
//   HelmetProvider    → contexto global para react-helmet-async (SEO)
//   ThemeProvider     → tema visual (dark/light) sin depender de Auth
//   App               → BrowserRouter + AuthProvider viven adentro
//                       (AuthProvider necesita estar dentro de
//                        BrowserRouter para que useNavigate funcione)
//
// NOTA: AuthProvider NO va aquí — está en App.jsx dentro de
//       BrowserRouter. Tenerlo en ambos lugares crea un contexto
//       duplicado donde el interno silenciosamente opaca al externo.
// ─────────────────────────────────────────────────────────────

import React from "react";
import ReactDOM from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";

import { ThemeProvider } from "./core/contexts/ThemeContext";
import App from "./App";

import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HelmetProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </HelmetProvider>
  </React.StrictMode>
);