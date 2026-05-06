// src/modules/auth/pages/EmailVerifyTokenPage.jsx
//
// Página a la que aterriza el cliente al hacer click en el link del email
// de verificación. Lee el token de la URL (/verificar-email/:token), llama
// a la Cloud Function confirmEmailVerification y muestra resultado.
//
// IMPORTANTE: NO está protegida por ProtectedRoute. El usuario puede
// aterrizar desde otro dispositivo / navegador donde no tenga sesión.
//
// Estados:
//   • verifying  → llamando a la CF
//   • success    → token validado, cuenta activada
//   • error      → token inválido / expirado / ya usado
//
// Tras éxito:
//   - Si tiene sesión activa en este navegador → redirect al portal cliente.
//   - Si no → redirect al login con mensaje de éxito.

import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaCheckCircle, FaTimesCircle, FaSpinner, FaArrowRight,
  FaPaperPlane, FaSignInAlt,
} from 'react-icons/fa';
import { reload } from 'firebase/auth';
import { auth } from '../../../core/config/firebase.config';
import { useAuth } from '../../../core/contexts/AuthContext';
import { PRIVATE_ROUTES, PUBLIC_ROUTES } from '../../../core/config/routes.config';
import { confirmEmailVerification } from '../services/emailVerification.service';
import toast from 'react-hot-toast';

const STATE = {
  VERIFYING: 'verifying',
  SUCCESS:   'success',
  ERROR:     'error',
};

// Mensajes específicos por código de error de la CF.
const ERROR_MESSAGES = {
  token_not_found:    'El enlace no es válido o ya fue usado.',
  token_used:         'Este enlace ya fue utilizado. Tu cuenta probablemente ya está activa.',
  token_invalidated:  'Este enlace fue reemplazado por uno más reciente. Revisa tu bandeja.',
  token_expired:      'El enlace expiró. Solicita uno nuevo desde la página de verificación.',
};

export default function EmailVerifyTokenPage() {
  const { token } = useParams();
  const navigate  = useNavigate();
  const { currentUser } = useAuth();

  const [state, setState] = useState(STATE.VERIFYING);
  const [errorMsg, setErrorMsg] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState('');

  // Guard contra doble ejecución en StrictMode (dev) — confirmEmailVerification
  // es idempotente desde el lado del servidor, pero igual evitamos doble UI.
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    let isMounted = true;
    (async () => {
      try {
        if (!token) {
          if (isMounted) {
            setErrorMsg('No se recibió ningún token.');
            setState(STATE.ERROR);
          }
          return;
        }

        const result = await confirmEmailVerification(token);

        if (!isMounted) return;
        setVerifiedEmail(result?.email || '');
        setState(STATE.SUCCESS);

        // Si hay sesión activa, refrescar el authUser para que
        // emailVerified=true se propague localmente (Firebase Auth lo
        // detecta vía reload).
        try {
          if (auth.currentUser) {
            await reload(auth.currentUser);
          }
        } catch (_) {
          // No crítico — el ProtectedRoute lo deja pasar igual con
          // userData.emailVerified=true (que sí escribió la CF).
        }
      } catch (err) {
        console.error('[EmailVerifyToken] confirm error:', err);
        if (!isMounted) return;
        const msg = ERROR_MESSAGES[err.code] || err.message || 'No pudimos verificar el enlace.';
        setErrorMsg(msg);
        setState(STATE.ERROR);
      }
    })();

    return () => { isMounted = false; };
  }, [token]);

  // Auto-redirect tras éxito si ya hay sesión activa.
  useEffect(() => {
    if (state !== STATE.SUCCESS) return;
    if (!currentUser) return;
    const t = setTimeout(() => {
      navigate(PRIVATE_ROUTES.CLIENT_PORTAL, { replace: true });
    }, 2000);
    return () => clearTimeout(t);
  }, [state, currentUser, navigate]);

  // ── UI ──────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ background: 'var(--color-bg)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md rounded-2xl p-7 sm:p-9 border"
        style={{
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
        }}
      >
        {state === STATE.VERIFYING && <Verifying />}
        {state === STATE.SUCCESS  && (
          <Success
            email={verifiedEmail}
            hasSession={!!currentUser}
            onGoPortal={() => navigate(PRIVATE_ROUTES.CLIENT_PORTAL, { replace: true })}
            onGoLogin={() => navigate(PUBLIC_ROUTES.CLIENT_AUTH, { replace: true })}
          />
        )}
        {state === STATE.ERROR && (
          <ErrorState
            message={errorMsg}
            onRetry={() => navigate(PUBLIC_ROUTES.EMAIL_VERIFICATION, { replace: true })}
            onLogin={() => navigate(PUBLIC_ROUTES.CLIENT_AUTH, { replace: true })}
          />
        )}
      </motion.div>
    </div>
  );
}

// ── Estados visuales ─────────────────────────────────────────────────────────

function Verifying() {
  return (
    <div className="text-center">
      <div className="flex justify-center mb-6">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center"
          style={{
            background:
              'linear-gradient(135deg, var(--color-gold-soft) 0%, var(--color-gold) 100%)',
            boxShadow: '0 8px 24px rgba(180, 83, 9, 0.18)',
          }}
        >
          <FaSpinner className="animate-spin" size={32} style={{ color: 'var(--color-bg)' }} />
        </div>
      </div>
      <h1
        className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight mb-2"
        style={{ color: 'var(--color-text)' }}
      >
        Verificando tu correo…
      </h1>
      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
        Espera un momento mientras confirmamos tu cuenta.
      </p>
    </div>
  );
}

function Success({ email, hasSession, onGoPortal, onGoLogin }) {
  return (
    <div className="text-center">
      <div className="flex justify-center mb-6">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.25)',
          }}
        >
          <FaCheckCircle size={36} style={{ color: '#ffffff' }} />
        </div>
      </div>

      <h1
        className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight mb-2"
        style={{ color: 'var(--color-text)' }}
      >
        ¡Cuenta activada!
      </h1>

      <p className="text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>
        Tu correo
        {email ? (
          <>
            {' '}
            <strong className="break-all" style={{ color: 'var(--color-text)' }}>
              {email}
            </strong>
          </>
        ) : null}{' '}
        fue confirmado correctamente.
      </p>

      <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
        En breve recibirás un correo de bienvenida con todo lo que puedes hacer en tu portal.
      </p>

      <div className="space-y-2.5">
        {hasSession ? (
          <button
            type="button"
            onClick={onGoPortal}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all"
            style={{
              background: 'var(--color-gold)',
              color: 'var(--color-bg)',
              boxShadow: '0 4px 14px rgba(180, 83, 9, 0.22)',
            }}
          >
            Ir a mi portal <FaArrowRight size={12} />
          </button>
        ) : (
          <button
            type="button"
            onClick={onGoLogin}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all"
            style={{
              background: 'var(--color-gold)',
              color: 'var(--color-bg)',
              boxShadow: '0 4px 14px rgba(180, 83, 9, 0.22)',
            }}
          >
            <FaSignInAlt size={13} /> Iniciar sesión
          </button>
        )}
      </div>

      {hasSession && (
        <p className="mt-4 text-[11px]" style={{ color: 'var(--color-text-faint)' }}>
          Te llevaremos al portal automáticamente en unos segundos…
        </p>
      )}
    </div>
  );
}

function ErrorState({ message, onRetry, onLogin }) {
  return (
    <div className="text-center">
      <div className="flex justify-center mb-6">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            boxShadow: '0 8px 24px rgba(220, 38, 38, 0.22)',
          }}
        >
          <FaTimesCircle size={36} style={{ color: '#ffffff' }} />
        </div>
      </div>

      <h1
        className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight mb-2"
        style={{ color: 'var(--color-text)' }}
      >
        No pudimos verificar
      </h1>

      <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
        {message}
      </p>

      <div className="space-y-2.5">
        <button
          type="button"
          onClick={onRetry}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all"
          style={{
            background: 'var(--color-gold)',
            color: 'var(--color-bg)',
            boxShadow: '0 4px 14px rgba(180, 83, 9, 0.22)',
          }}
        >
          <FaPaperPlane size={12} /> Reenviar correo
        </button>

        <button
          type="button"
          onClick={onLogin}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-colors"
          style={{
            background: 'var(--color-inner-card)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
          }}
        >
          <FaSignInAlt size={12} /> Volver al login
        </button>
      </div>

      <div className="mt-5">
        <Link
          to="/"
          className="text-xs font-medium transition-colors"
          style={{ color: 'var(--color-text-faint)' }}
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
