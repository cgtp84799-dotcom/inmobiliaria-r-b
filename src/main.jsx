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

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HelmetProvider>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </HelmetProvider>
  </React.StrictMode>
);
