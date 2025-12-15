
/**
 * Copyright (c) 2025 Mateo Carvajal Tamayo
 * Todos los derechos reservados.
 * 
 * Este código es propiedad de Mateo Carvajal Tamayo.
 * Uso no autorizado está prohibido.
 */
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

import { ThemeProvider } from "./core/contexts/ThemeContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);