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
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

import { ThemeProvider } from "./core/contexts/ThemeContext";
import { AuthProvider } from "./core/contexts/AuthContext";
import { HelmetProvider } from "react-helmet-async";

// ⚠️ React.StrictMode eliminado intencionalmente:
// En desarrollo, StrictMode monta/desmonta cada componente DOS VECES para
// detectar side-effects. Esto duplica los listeners onSnapshot de Firestore
// antes de que el cleanup pueda ejecutarse, causando el error interno
// "INTERNAL ASSERTION FAILED: Unexpected state (ID: ca9)" del SDK v12.
// En producción StrictMode no tiene efecto, pero en dev provoca el crash.
ReactDOM.createRoot(document.getElementById("root")).render(
  <HelmetProvider>
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </HelmetProvider>
);
