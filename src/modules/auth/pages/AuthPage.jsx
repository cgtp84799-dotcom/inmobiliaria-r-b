/**
 * src/modules/auth/pages/AuthPage.jsx
 * Login exclusivo para agentes y admins.
 * Si ya hay sesión activa redirige según rol:
 *   viewer   → /portal
 *   admin/member → /dashboard
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaEnvelope, FaLock, FaShieldAlt, FaArrowLeft } from 'react-icons/fa';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../../core/config/firebase.config';
import { useAuth } from '../../../core/contexts/AuthContext';
import { PRIVATE_ROUTES, AUTH_ROUTES, PUBLIC_ROUTES } from '../../../core/config/routes.config';
import { USER_ROLES } from '../../users/types/user.types';
import toast from 'react-hot-toast';

// Límite de intentos (en memoria — sin localStorage)
const MAX_ATTEMPTS  = 5;
const BLOCK_TIME_MS = 30_000;
let failedAttempts  = 0;
let blockedUntil    = 0;

export default function AuthPage() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [isBlocked,          setIsBlocked]          = useState(false);
  const [blockSecondsLeft,   setBlockSecondsLeft]   = useState(0);

  const { currentUser, userData, signIn } = useAuth();
  const navigate = useNavigate();

  // ── Si ya hay sesión, redirigir según rol ─────────────────────────────────
  useEffect(() => {
    if (!currentUser || !userData?.role) return;
    const role = userData.role;
    if (role === USER_ROLES.VIEWER) {
      navigate(PRIVATE_ROUTES.CLIENT_PORTAL, { replace: true });
    } else if (role === USER_ROLES.ADMIN || role === USER_ROLES.MEMBER) {
      navigate(PRIVATE_ROUTES.DASHBOARD, { replace: true });
    }
  }, [currentUser, userData, navigate]);

  const startBlockCountdown = () => {
    setIsBlocked(true);
    const iv = setInterval(() => {
      const rem = Math.ceil((blockedUntil - Date.now()) / 1000);
      if (rem <= 0) {
        clearInterval(iv);
        setIsBlocked(false);
        setBlockSecondsLeft(0);
        failedAttempts = 0;
      } else {
        setBlockSecondsLeft(rem);
      }
    }, 500);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (Date.now() < blockedUntil) {
      toast.error(`Demasiados intentos. Espera ${Math.ceil((blockedUntil - Date.now()) / 1000)}s.`);
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
      failedAttempts = 0;
      // La redirección final la hace el useEffect cuando userData carga
      // pero también navegamos aquí por si ya estaba cargado
      const role = userData?.role;
      if (role === USER_ROLES.VIEWER) {
        navigate(PRIVATE_ROUTES.CLIENT_PORTAL, { replace: true });
      } else {
        navigate(PRIVATE_ROUTES.DASHBOARD, { replace: true });
      }
    } catch (error) {
      failedAttempts++;
      if (failedAttempts >= MAX_ATTEMPTS) {
        blockedUntil = Date.now() + BLOCK_TIME_MS;
        startBlockCountdown();
        toast.error(`Bloqueado ${BLOCK_TIME_MS / 1000}s tras ${MAX_ATTEMPTS} intentos fallidos.`);
      } else {
        const left = MAX_ATTEMPTS - failedAttempts;
        toast.error(error.message || `Credenciales incorrectas. Quedan ${left} intento${left !== 1 ? 's' : ''}.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    if (!email.trim()) { toast.error('Escribe tu correo arriba primero.'); return; }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      toast.success('Revisa tu correo: enviamos el enlace de recuperación.');
    } catch (error) {
      const msgs = {
        'auth/user-not-found': 'No encontramos cuenta con ese correo.',
        'auth/invalid-email':  'El correo no tiene formato válido.',
      };
      toast.error(msgs[error.code] || 'Error al enviar el correo.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-yellow-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }}
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

        {/* Formulario */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-slate-900/90 to-slate-950/90 backdrop-blur-xl border border-slate-800/50 rounded-3xl p-8 shadow-2xl"
        >
          {isBlocked && (
            <div className="mb-5 p-3 rounded-xl bg-red-950/60 border border-red-800/60 text-red-300 text-sm text-center">
              ⚠️ Demasiados intentos. Espera <span className="font-bold">{blockSecondsLeft}s</span> para continuar.
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Correo electrónico</label>
              <div className="relative group">
                <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" />
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950/70 border border-slate-700 text-slate-100 rounded-xl pl-12 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-slate-600"
                  placeholder="tu@correo.com" required autoComplete="email"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-slate-300">Contraseña</label>
                <button type="button" onClick={handleForgot} className="text-xs text-slate-400 hover:text-primary transition-colors">
                  ¿Olvidé mi contraseña?
                </button>
              </div>
              <div className="relative group">
                <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" />
                <input
                  type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/70 border border-slate-700 text-slate-100 rounded-xl pl-12 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-slate-600"
                  placeholder="••••••••" required autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit" disabled={loading || isBlocked}
              className="w-full bg-gradient-to-r from-yellow-400 via-primary to-yellow-600 text-slate-950 font-bold rounded-xl py-3.5 hover:shadow-xl hover:shadow-primary/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? 'Verificando acceso...' : isBlocked ? `Bloqueado (${blockSecondsLeft}s)` : 'Ingresar al panel'}
            </button>
          </form>

          {/* Link a solicitar acceso */}
          <div className="mt-6 pt-6 border-t border-slate-800/50 text-center">
            <Link to={AUTH_ROUTES.ACCESS_REQUEST} className="text-sm text-slate-400 hover:text-primary transition-colors font-medium">
              ¿No tienes acceso?{' '}<span className="text-primary">Solicitar autorización →</span>
            </Link>
          </div>

          {/* Link al portal de clientes */}
          <div className="mt-3 text-center">
            <Link to={PUBLIC_ROUTES.CLIENT_AUTH} className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
              ¿Eres cliente?{' '}<span className="text-primary/70 hover:text-primary">Accede a tu portal →</span>
            </Link>
          </div>
        </motion.div>

        {/* Volver al inicio */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-6 text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-primary transition-colors font-medium">
            <FaArrowLeft className="text-xs" /> Volver al inicio
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}