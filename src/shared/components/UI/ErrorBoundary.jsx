import React from 'react';
import { motion } from 'framer-motion';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error capturado:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-dark px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-md"
          >
            <div className="bg-black/60 border border-red-500/50 rounded-xl p-8">
              <h1 className="text-3xl font-bold text-red-400 mb-4">
                ¡Oops! Algo salió mal
              </h1>
              <p className="text-light/70 mb-6">
                Lo sentimos, ha ocurrido un error inesperado. Por favor, recarga la página o intenta más tarde.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="button-gold"
              >
                Recargar página
              </button>
            </div>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;