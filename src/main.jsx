import React       from 'react';
import ReactDOM    from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { ThemeProvider } from './core/contexts/ThemeContext';
import App from './App';
import './index.css';

// NOTA: <ErrorBoundary> YA envuelve a <App /> dentro de App.jsx.
// No duplicarlo aquí para evitar dos boundaries anidados (el interno
// captura primero y el externo nunca se dispara).

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </HelmetProvider>
  </React.StrictMode>
);
