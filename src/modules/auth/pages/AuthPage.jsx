// src/modules/auth/pages/AuthPage.jsx
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaEnvelope, FaLock, FaShieldAlt,
  FaArrowLeft, FaEye, FaEyeSlash, FaSpinner,
} from 'react-icons/fa';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../../core/config/firebase.config';
import { useAuth } from '../../../core/contexts/AuthContext';
import { PRIVATE_ROUTES, AUTH_ROUTES, PUBLIC_ROUTES } from '../../../core/config/routes.config';
import { USER_ROLES } from '../../users/types/user.types';
import { getHomeRoute } from '../../../shared/components/ProtectedRoute';
import toast from 'react-hot-toast';

// ════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ════════════════════════════════════════════════════════════════════════

const MAX_ATTEMPTS  = 5;
const BLOCK_TIME_MS = 30_000;

const FIREBASE_ERRORS = {
  'auth/user-not-found':        'No encontramos cuenta con ese correo.',
  'auth/wrong-password':        'Contraseña incorrecta.',
  'auth/invalid-email':         'El correo no tiene formato válido.',
  'auth/user-disabled':         'Esta cuenta está deshabilitada.',
  'auth/too-many-requests':     'Demasiados intentos. Intenta más tarde.',
  'auth/invalid-credential':    'Correo o contraseña incorrectos.',
  'auth/network-request-failed':'Sin conexión. Verifica tu internet.',
};

// ════════════════════════════════════════════════════════════════════════
// RATE LIMITING — sessionStorage (persiste F5, se limpia al cerrar tab)
// ════════════════════════════════════════════════════════════════════════

const RL_KEY_ATTEMPTS = 'auth_rl_attempts';
const RL_KEY_UNTIL    = 'auth_rl_until';

function getRLAttempts() {
  return parseInt(sessionStorage.getItem(RL_KEY_ATTEMPTS) || '0', 10);
}
function getRLUntil() {
  return parseInt(sessionStorage.getItem(RL_KEY_UNTIL) || '0', 10);
}
function setRLAttempts(n) {
  sessionStorage.setItem(RL_KEY_ATTEMPTS, String(n));
}
function setRLUntil(ts) {
  sessionStorage.setItem(RL_KEY_UNTIL, String(ts));
}
function clearRL() {
  sessionStorage.removeItem(RL_KEY_ATTEMPTS);
  sessionStorage.removeItem(RL_KEY_UNTIL);
}

// ════════════════════════════════════════════════════════════════════════
// COMPONENTE
// ════════════════════════════════════════════════════════════════════════

export default function AuthPage() {
  const [email,       setEmail]      = useState('');
  const [password,    setPassword]   = useState('');
  const [showPass,    setShowPass]   = useState(false);
  const [submitting,  setSubmitting] = useState(false);
  const [isBlocked,   setIsBlocked]  = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const countdownRef = useRef(null);

  const { currentUser, userData, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from        = location.state?.from?.pathname;
  const defaultDest = PRIVATE_ROUTES.DASHBOARD;

  // ── Restaurar bloqueo activo al montar (sobrevive F5) ──────────────────
  useEffect(() => {
    const until = getRLUntil();
    if (until && Date.now() < until) {
      startBlockCountdown(until);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Limpiar countdown al desmontar ─────────────────────────────────────
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // ── Redirect si ya está autenticado ────────────────────────────────────
  useEffect(() => {
    if (!currentUser || !userData?.role) return;

    if (userData.role === USER_ROLES.VIEWER) {
      navigate(PRIVATE_ROUTES.CLIENT_PORTAL, { replace: true });
    } else {
      const dest = from && !from.startsWith('/login') ? from : defaultDest;
      navigate(dest, { replace: true });
    }
  }, [currentUser, userData, navigate, from, defaultDest]);

  // ════════════════════════════════════════════════════════════════════════
  // RATE LIMITING — funciones
  // ════════════════════════════════════════════════════════════════════════

  function startBlockCountdown(until) {
    setIsBlocked(true);
    setSecondsLeft(Math.ceil((until - Date.now()) / 1000));

    if (countdownRef.current) clearInterval(countdownRef.current);

    countdownRef.current = setInterval(() => {
      const rem = Math.ceil((getRLUntil() - Date.now()) / 1000);
      if (rem <= 0) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
        clearRL();
        setIsBlocked(false);
        setSecondsLeft(0);
      } else {
        setSecondsLeft(rem);
      }
    }, 500);
  }

  // ════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ════════════════════════════════════════════════════════════════════════

  async function handleLogin(e) {
    e.preventDefault();

    // Verificar bloqueo activo
    const until = getRLUntil();
    if (until && Date.now() < until) {
      toast.error(`Demasiados intentos. Espera ${Math.ceil((until - Date.now()) / 1000)}s.`);
      return;
    }

    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      clearRL(); // Login exitoso → resetear contador
      const dest = from && !from.startsWith('/login') ? from : defaultDest;
      navigate(dest, { replace: true });
    } catch (err) {
      const attempts = getRLAttempts() + 1;
      setRLAttempts(attempts);

      if (attempts >= MAX_ATTEMPTS) {
        const blockedUntil = Date.now() + BLOCK_TIME_MS;
        setRLUntil(blockedUntil);
        startBlockCountdown(blockedUntil);
        toast.error(`Bloqueado ${BLOCK_TIME_MS / 1000}s tras ${MAX_ATTEMPTS} intentos fallidos.`);
      } else {
        const left = MAX_ATTEMPTS - attempts;
        const msg  = FIREBASE_ERRORS[err.code] ?? 'Credenciales incorrectas.';
        toast.error(`${msg} Quedan ${left} intento${left !== 1 ? 's' : ''}.`);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgot() {
    if (!email.trim()) {
      toast.error('Escribe tu correo arriba primero.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      toast.success('Revisa tu correo — enviamos el enlace de recuperación.');
    } catch (err) {
      toast.error(FIREBASE_ERRORS[err.code] ?? 'Error al enviar el correo.');
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4 relative overflow-hidden">

      {/* Fondo decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-20 right-20 w-96 h-96 bg-primary/8 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-yellow-600/8 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
            className="inline-flex items-center justify-center w-16 h-16 bg-slate-800 border border-slate-700 rounded-2xl mb-4 shadow-lg"
            aria-hidden="true"
          >
            <FaShieldAlt className="text-primary text-2xl" />
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-1.5">Acceso Autorizado</h1>
          <p className="text-slate-400 text-sm">
            Solo para agentes y personal de Rincón Bedoya &amp; Asociados
          </p>
        </div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-8 shadow-2xl shadow-black/40"
        >
          {/* Banner de bloqueo */}
          {isBlocked && (
            <div
              role="alert"
              className="mb-5 p-3 rounded-xl bg-red-950/60 border border-red-800/60 text-red-300 text-sm text-center"
            >
              Demasiados intentos. Espera{' '}
              <span className="font-bold">{secondsLeft}s</span> para continuar.
            </div>
          )}

          <form onSubmit={handleLogin} noValidate className="space-y-5">

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                Correo electrónico
              </label>
              <div className="relative">
                <FaEnvelope
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950/70 border border-slate-700 text-slate-100 rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-slate-600"
                  placeholder="tucorreo@ejemplo.com"
                  required
                  autoComplete="email"
                  disabled={submitting || isBlocked}
                />
              </div>
            </div>

            {/* Contraseña */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="text-sm font-medium text-slate-300">
                  Contraseña
                </label>
                <button
                  type="button"
                  onClick={handleForgot}
                  className="text-xs text-slate-400 hover:text-primary transition-colors"
                >
                  ¿Olvidé mi contraseña?
                </button>
              </div>
              <div className="relative">
                <FaLock
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/70 border border-slate-700 text-slate-100 rounded-xl pl-11 pr-11 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-slate-600"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  disabled={submitting || isBlocked}
                />
                <button
                  type="button"
                  aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1"
                >
                  {showPass ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || isBlocked}
              className="w-full bg-primary hover:bg-yellow-400 text-slate-950 font-bold rounded-xl py-3 transition-all duration-200 shadow-md hover:shadow-lg hover:shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting && <FaSpinner className="animate-spin" aria-hidden="true" />}
              {submitting
                ? 'Verificando...'
                : isBlocked
                  ? `Bloqueado ${secondsLeft}s`
                  : 'Ingresar al panel'}
            </button>
          </form>

          {/* Links internos */}
          <div className="mt-6 pt-5 border-t border-slate-800/50 space-y-2.5 text-center">
            <div>
              <Link
                to={AUTH_ROUTES.ACCESS_REQUEST}
                className="text-sm text-slate-400 hover:text-primary transition-colors"
              >
                ¿No tienes acceso?{' '}
                <span className="text-primary font-medium">Solicitar autorización</span>
              </Link>
            </div>
            <div>
              <Link
                to={PUBLIC_ROUTES.CLIENT_AUTH}
                className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
              >
                ¿Eres cliente?{' '}
                <span className="text-primary/70 hover:text-primary transition-colors">
                  Accede a tu portal
                </span>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Volver al inicio */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-6 text-center"
        >
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors"
          >
            <FaArrowLeft className="text-xs" aria-hidden="true" />
            Volver al inicio
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}