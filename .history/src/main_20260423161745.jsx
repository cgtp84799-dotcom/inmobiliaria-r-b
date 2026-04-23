import React from "react";
import ReactDOM from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "./core/contexts/ThemeContext";
import App from "./App";
import "./index.css";

// ← Añade este import
import ErrorBoundary from "./shared/components/UI/ErrorBoundary";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>          {/* ← añadir */}
      <HelmetProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </HelmetProvider>
    </ErrorBoundary>         {/* ← añadir */}
  </React.StrictMode>
);