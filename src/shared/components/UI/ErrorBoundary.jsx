// src/shared/components/UI/ErrorBoundary.jsx
import React from 'react';

/* ─────────────────────────────────────────────────────────────
   ErrorBoundary — debe ser class component (requisito de React)

   ⚠️  NO uses motion/framer-motion aquí:
   Si el error ocurrió dentro del árbol de AnimatePresence o
   MotionConfig, Framer también estará roto y el fallback
   tampoco renderizaría. CSS puro es más seguro.
───────────────────────────────────────────────────────────── */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
    this.handleReset = this.handleReset.bind(this);
  }

  static defaultProps = { fallback: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // En producción podrías enviar a Sentry / LogRocket aquí
    console.error('[ErrorBoundary] Error capturado:', error, errorInfo);
  }

  handleReset() {
    // Intenta recuperar el árbol sin recargar la página completa
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    // Si se pasó un fallback personalizado (ej: RouteError), usarlo en lugar del UI completo
    if (this.props.fallback) return this.props.fallback;

    const isDev  = import.meta.env.DEV;
    const msg    = this.state.error?.message;

    return (
      <div
        style={{
          minHeight:       '100dvh',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          padding:         '1rem',
          backgroundColor: 'var(--color-bg)',
          color:           'var(--color-text)',
          // Animación CSS pura — no depende de Framer
          animation:       'eb-fadein 0.3s ease both',
        }}
      >
        <style>{`
          @keyframes eb-fadein {
            from { opacity: 0; transform: translateY(16px); }
            to   { opacity: 1; transform: translateY(0);    }
          }
          @media (prefers-reduced-motion: reduce) {
            @keyframes eb-fadein { from, to { opacity: 1; transform: none; } }
          }
        `}</style>

        <div
          style={{
            width:           '100%',
            maxWidth:        '26rem',
            textAlign:       'center',
          }}
        >
          {/* Panel */}
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border:          '1px solid var(--color-error-highlight)',
              borderRadius:    '1rem',
              padding:         '2rem 1.75rem',
              boxShadow:       '0 12px 40px rgba(0,0,0,0.18)',
            }}
          >
            {/* Ícono SVG inline — sin dependencia de react-icons */}
            <div
              style={{
                width:           '3.5rem',
                height:          '3.5rem',
                borderRadius:    '50%',
                backgroundColor: 'var(--color-error-highlight)',
                display:         'flex',
                alignItems:      'center',
                justifyContent:  'center',
                margin:          '0 auto 1.25rem',
              }}
              aria-hidden="true"
            >
              <svg
                width="28" height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-error)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>

            <h1
              style={{
                fontSize:    '1.25rem',
                fontWeight:  700,
                marginBottom: '0.75rem',
                color:        'var(--color-text)',
              }}
            >
              ¡Algo salió mal!
            </h1>

            <p
              style={{
                fontSize:    '0.875rem',
                lineHeight:  1.6,
                color:       'var(--color-text-muted)',
                marginBottom: '1.5rem',
              }}
            >
              Ha ocurrido un error inesperado. Puedes intentar
              recuperar la vista o recargar la página completa.
            </p>

            {/* Detalle técnico — solo en desarrollo */}
            {isDev && msg && (
              <pre
                style={{
                  fontSize:        '0.7rem',
                  textAlign:       'left',
                  backgroundColor: 'var(--color-surface-offset)',
                  border:          '1px solid var(--color-border)',
                  borderRadius:    '0.5rem',
                  padding:         '0.75rem',
                  marginBottom:    '1.5rem',
                  color:           'var(--color-error)',
                  overflowX:       'auto',
                  whiteSpace:      'pre-wrap',
                  wordBreak:       'break-word',
                }}
              >
                {msg}
              </pre>
            )}

            {/* Botones */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {/* Reintentar — recupera sin recargar */}
              <button
                onClick={this.handleReset}
                style={{
                  flex:            1,
                  padding:         '0.625rem 1rem',
                  borderRadius:    '0.75rem',
                  fontSize:        '0.875rem',
                  fontWeight:      600,
                  cursor:          'pointer',
                  border:          '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-surface-offset)',
                  color:           'var(--color-text-muted)',
                  transition:      'background 0.15s, color 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-surface-dynamic)';
                  e.currentTarget.style.color           = 'var(--color-text)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-surface-offset)';
                  e.currentTarget.style.color           = 'var(--color-text-muted)';
                }}
              >
                Reintentar
              </button>

              {/* Recargar página completa */}
              <button
                onClick={() => window.location.reload()}
                style={{
                  flex:            1,
                  padding:         '0.625rem 1rem',
                  borderRadius:    '0.75rem',
                  fontSize:        '0.875rem',
                  fontWeight:      600,
                  cursor:          'pointer',
                  border:          'none',
                  backgroundColor: 'var(--color-primary)',
                  color:           '#fff',
                  transition:      'background 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary)';
                }}
              >
                Recargar
              </button>
            </div>
          </div>

          {/* Enlace de soporte */}
          <p
            style={{
              marginTop: '1.25rem',
              fontSize:  '0.75rem',
              color:     'var(--color-text-faint)',
            }}
          >
            Si el problema persiste,{' '}
            <a
              href="mailto:inmojuridi09@gmail.com"
              style={{
                color:          'var(--color-primary)',
                textDecoration: 'underline',
              }}
            >
              contáctanos
            </a>
            .
          </p>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;