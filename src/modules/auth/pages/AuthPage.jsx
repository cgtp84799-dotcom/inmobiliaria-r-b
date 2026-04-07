import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaEnvelope, FaLock, FaShieldAlt, FaArrowLeft
} from 'react-icons/fa';
import {
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../../../core/config/firebase.config';
import { useAuth } from '../../../core/contexts/AuthContext';
import { PRIVATE_ROUTES, AUTH_ROUTES } from '../../../core/config/routes.config';
import toast from 'react-hot-toast';

// ─── Límite de intentos fallidos (en memoria, sin localStorage) ──────────────
const MAX_ATTEMPTS  = 5;
const BLOCK_TIME_MS = 30_000; // 30 segundos

let failedAttempts = 0;
let blockedUntil   = 0;

const AuthPage = () => {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);

  const [isBlocked, setIsBlocked] = useState(false);
  const [blockSecondsLeft, setBlockSecondsLeft] = useState(0);

  const { signIn } = useAuth();
  const navigate   = useNavigate();

  const startBlockCountdown = () => {
    setIsBlocked(true);
    const interval = setInterval(() => {
      const remaining = Math.ceil((blockedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        clearInterval(interval);
        setIsBlocked(false);
        setBlockSecondsLeft(0);
        failedAttempts = 0;
      } else {
        setBlockSecondsLeft(remaining);
      }
    }, 500);
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (Date.now() < blockedUntil) {
      const remaining = Math.ceil((blockedUntil - Date.now()) / 1000);
      toast.error(`Demasiados intentos. Espera ${remaining}s antes de reintentar.`);
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
      failedAttempts = 0;
      // FIX: usar constante en vez de string hardcodeado
      navigate(PRIVATE_ROUTES.DASHBOARD);
    } catch (error) {
      failedAttempts++;
      console.error('Error de autenticación:', error);

      if (failedAttempts >= MAX_ATTEMPTS) {
        blockedUntil = Date.now() + BLOCK_TIME_MS;
        startBlockCountdown();
        toast.error(`Bloqueado por ${BLOCK_TIME_MS / 1000}s tras ${MAX_ATTEMPTS} intentos fallidos.`);
      } else {
        const left = MAX_ATTEMPTS - failedAttempts;
        toast.error(
          error.message || `Credenciales incorrectas. Te quedan ${left} intento${left !== 1 ? 's' : ''}.`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      toast.error('Escribe tu correo en el campo de arriba y luego haz clic aquí.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      toast.success('Revisa tu correo: te enviamos el enlace de recuperación.');
    } catch (error) {
      const messages = {
        'auth/user-not-found': 'No encontramos una cuenta con ese correo.',
        'auth/invalid-email':  'El correo no tiene un formato válido.',
      };
      toast.error(messages[error.code] || 'Error al enviar el correo. Intenta de nuevo.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-20 left-20 w-96 h-96 bg-yellow-600/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '1s' }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-yellow-400 via-primary to-yellow-600 rounded-2xl mb-4 shadow-2xl shadow-primary/30"
          >
            <FaShieldAlt className="text-slate-950 text-3xl" />
          </motion.div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 via-primary to-yellow-600 bg-clip-text text-transparent mb-2">
            Acceso Autorizado
          </h1>
          <p className="text-slate-400 text-sm">
            Solo para agentes y personal de Rincón Bedoya &amp; Asociados
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-slate-900/90 to-slate-950/90 backdrop-blur-xl border border-slate-800/50 rounded-3xl p-8 shadow-2xl"
        >
          {isBlocked && (
            <div className="mb-5 p-3 rounded-xl bg-red-950/60 border border-red-800/60 text-red-300 text-sm text-center">
              ⚠️ Demasiados intentos. Espera{' '}
              <span className="font-bold">{blockSecondsLeft}s</span>{' '}
              para volver a intentarlo.
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Correo electrónico
              </label>
              <div className="relative group">
                <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950/70 border border-slate-700 text-slate-100 rounded-xl pl-12 pr-4 py-3.5
                             focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all
                             placeholder:text-slate-600"
                  placeholder="tu@correo.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-slate-300">
                  Contraseña
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-slate-400 hover:text-primary transition-colors"
                >
                  ¿Olvidé mi contraseña?
                </button>
              </div>
              <div className="relative group">
                <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/70 border border-slate-700 text-slate-100 rounded-xl pl-12 pr-4 py-3.5
                             focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all
                             placeholder:text-slate-600"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || isBlocked}
              className="w-full bg-gradient-to-r from-yellow-400 via-primary to-yellow-600 text-slate-950 font-bold
                         rounded-xl py-3.5 hover:shadow-xl hover:shadow-primary/40
                         disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300
                         hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? 'Verificando acceso...' : isBlocked ? `Bloqueado (${blockSecondsLeft}s)` : 'Ingresar al panel'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-800/50 text-center">
            <Link
              to={AUTH_ROUTES.ACCESS_REQUEST}
              className="text-sm text-slate-400 hover:text-primary transition-colors font-medium"
            >
              ¿No tienes acceso?{' '}
              <span className="text-primary">Solicitar autorización →</span>
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-center"
        >
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-primary transition-colors font-medium"
          >
            <FaArrowLeft className="text-xs" />
            Volver al inicio
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default AuthPage;
