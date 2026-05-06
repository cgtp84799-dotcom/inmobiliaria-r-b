import React       from 'react';
import ReactDOM    from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { ThemeProvider } from './core/contexts/ThemeContext';
import App from './App';
import './index.css';

// NOTA: <ErrorBoundary> YA envuelve a <App /> dentro de App.jsx.
// No duplicarlo aquí para evitar dos boundaries anidados (el interno
// captura primero y el externo nunca se dispara).

// Prerender.io espera a que esto sea `true` antes de tomar el snapshot.
// Se pone false aquí para que nunca tome el snapshot antes de que
// React termine de cargar los datos de Firestore.
window.prerenderReady = false;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </HelmetProvider>
  </React.StrictMode>
);