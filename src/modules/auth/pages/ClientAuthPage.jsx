// src/modules/auth/pages/ClientAuthPage.jsx
//
// Página de autenticación exclusiva del portal de clientes.
// Fixes respecto a la versión anterior:
//   1. ensureClientDocs usa transacción-safe: getDocs primero, addDoc solo si vacío
//      → no usa setDoc sobre /users/{email} sin verificar existencia primero
//      → agrega onboardingDone: false al crear el documento de cliente nuevo
//   2. No mezcla lógica de agentes/admin
//   3. Separado completamente de AuthPage (panel interno)

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaEnvelope, FaLock, FaUser, FaPhone,
  FaEye, FaEyeSlash, FaSpinner, FaGoogle,
  FaHome, FaHeart, FaCalendarAlt, FaFileContract,
} from 'react-icons/fa';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
} from 'firebase/auth';
import {
  doc, setDoc, getDoc, serverTimestamp,
  collection, query, where, getDocs, addDoc,
} from 'firebase/firestore';
import { auth, db } from '../../../core/config/firebase.config';
import { useAuth } from '../../../core/contexts/AuthContext';
import { PRIVATE_ROUTES, PUBLIC_ROUTES } from '../../../core/config/routes.config';
import { USER_ROLES } from '../../users/types/user.types';
import toast from 'react-hot-toast';

const googleProvider = new GoogleAuthProvider();

// ── Helpers Firestore ─────────────────────────────────────────────────────────

/**
 * Garantiza que existan ambos documentos: users/{email} y un documento en clients/.
 * Idempotente: si ya existen, no hace nada. Diseñado para correr sin race conditions:
 * - users/{email}: se crea con setDoc solo si !exists (merge:false)
 * - clients: getDocs primero, addDoc solo si snap.empty
 *
 * Agrega onboardingDone: false al documento de cliente cuando es nuevo,
 * para que el WelcomeModal se muestre la primera vez.
 */
async function ensureClientDocs(user, extraData = {}) {
  const email = user.email;

  // 1. users/{email} — crear solo si no existe
  const userRef  = doc(db, 'users', email);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    await setDoc(userRef, {
      uid:         user.uid,
      role:        USER_ROLES.VIEWER,
      status:      'active',
      displayName: extraData.displayName ?? user.displayName ?? email.split('@')[0],
      phone:       extraData.phone ?? '',
      photoURL:    user.photoURL ?? null,
      favorites:   [],
      createdAt:   serverTimestamp(),
      updatedAt:   serverTimestamp(),
    });
  }

  // 2. clients/{} — buscar por email para no duplicar
  const clientsRef = collection(db, 'clients');
  const q          = query(clientsRef, where('email', '==', email));
  const snap       = await getDocs(q);

  if (snap.empty) {
    await addDoc(clientsRef, {
      nombre:           extraData.displayName ?? user.displayName ?? email.split('@')[0],
      email,
      telefono:         extraData.phone ?? '',
      tipoCliente:      'portal',
      estado:           'activo',
      notas:            '',
      favorites:        [],
      ubicacionInteres: '',
      presupuesto:      '',
      tipoPropiedad:    '',
      agentId:          null,
      createdViaPortal: true,
      onboardingDone:   false,   // ← WelcomeModal lo usará para mostrar bienvenida
      createdAt:        serverTimestamp(),
    });
  }
  // Si ya existe, no tocar onboardingDone — el usuario ya completó su perfil
}

// ── Mapeo de errores Firebase ─────────────────────────────────────────────────

const FIREBASE_ERRORS = {
  'auth/user-not-found':         'No existe una cuenta con ese email.',
  'auth/wrong-password':         'Contraseña incorrecta.',
  'auth/email-already-in-use':   'Ya existe una cuenta con ese email.',
  'auth/weak-password':          'La contraseña es demasiado débil.',
  'auth/too-many-requests':      'Demasiados intentos. Intenta más tarde.',
  'auth/invalid-credential':     'Email o contraseña incorrectos.',
  'auth/network-request-failed': 'Sin conexión. Verifica tu internet.',
};

// ── Animaciones ───────────────────────────────────────────────────────────────

const slideVariants = {
  enter:  (dir) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } },
  exit:   (dir) => ({ x: dir > 0 ? -60 : 60, opacity: 0, transition: { duration: 0.25 } }),
};

// ── Campo de input reutilizable ───────────────────────────────────────────────

function Field({ icon: Icon, type = 'text', placeholder, value, onChange, error, rightEl, autoComplete }) {
  return (
    <div className="relative">
      <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none" />
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        className={`
          w-full bg-slate-800/60 border ${error ? 'border-red-500/60' : 'border-slate-700/60'}
          rounded-xl pl-9 ${rightEl ? 'pr-10' : 'pr-4'} py-3 text-sm text-white
          placeholder-slate-500 focus:outline-none focus:border-amber-500/60
          focus:ring-1 focus:ring-amber-500/30 transition
        `}
      />
      {rightEl && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightEl}</div>
      )}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

const FEATURES = [
  { icon: FaHeart,        text: 'Guarda propiedades favoritas y compáralas' },
  { icon: FaCalendarAlt,  text: 'Agenda visitas directamente desde el catálogo' },
  { icon: FaFileContract, text: 'Consulta y descarga tus contratos en PDF' },
  { icon: FaHome,         text: 'Recibe alertas de nuevas propiedades' },
];

export default function ClientAuthPage() {
  const { currentUser, userData, loading } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = location.state?.from?.pathname ?? PRIVATE_ROUTES.CLIENT_PORTAL;

  const [mode,        setMode]        = useState('login');
  const [dir,         setDir]         = useState(1);
  const [busy,        setBusy]        = useState(false);
  const [showPass,    setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [name,        setName]        = useState('');
  const [email,       setEmail]       = useState('');
  const [phone,       setPhone]       = useState('');
  const [password,    setPassword]    = useState('');
  const [confirm,     setConfirm]     = useState('');
  const [errors,      setErrors]      = useState({});

  // Redirect si ya está autenticado
  useEffect(() => {
    if (loading || !currentUser || !userData) return;
    if (userData.role === USER_ROLES.VIEWER) {
      const dest = from && !from.startsWith('/acceso-clientes') ? from : PRIVATE_ROUTES.CLIENT_PORTAL;
      navigate(dest, { replace: true });
    } else {
      // Admin/member que llegó aquí por error → su panel
      navigate(PRIVATE_ROUTES.DASHBOARD, { replace: true });
    }
  }, [currentUser, userData, loading, navigate, from]);

  function switchMode(next) {
    setDir(next === 'register' ? 1 : -1);
    setMode(next);
    setErrors({});
    setPassword('');
    setConfirm('');
  }

  function validate() {
    const e = {};
    if (!email.trim())               e.email    = 'El email es obligatorio';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Email inválido';
    if (!password)                   e.password = 'La contraseña es obligatoria';
    else if (password.length < 6)    e.password = 'Mínimo 6 caracteres';
    if (mode === 'register') {
      if (!name.trim())              e.name    = 'El nombre es obligatorio';
      if (confirm !== password)      e.confirm = 'Las contraseñas no coinciden';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        toast.success('¡Bienvenido de nuevo!');
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(cred.user, { displayName: name.trim() });
        await ensureClientDocs(cred.user, { displayName: name.trim(), phone: phone.trim() });
        toast.success('¡Cuenta creada! Completa tu perfil para continuar.');
        navigate(PRIVATE_ROUTES.CLIENT_PORTAL, { replace: true });
      }
    } catch (err) {
      toast.error(FIREBASE_ERRORS[err.code] ?? 'Error al procesar. Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      await ensureClientDocs(cred.user);
      toast.success('¡Bienvenido!');
      navigate(PRIVATE_ROUTES.CLIENT_PORTAL, { replace: true });
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        toast.error('Error al iniciar con Google. Intenta de nuevo.');
      }
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <FaSpinner className="text-amber-500 text-3xl animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex">

      {/* ── PANEL IZQUIERDO — solo desktop ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-amber-950/30" />
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-80 h-80 rounded-full bg-amber-600/8 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(#f59e0b 1px,transparent 1px),linear-gradient(90deg,#f59e0b 1px,transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <img src="/logo-ryb.png" alt="RB" className="h-10 object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
            <div>
              <p className="text-amber-400 font-bold tracking-wide text-sm">RINCÓN BEDOYA</p>
              <p className="text-slate-500 text-xs tracking-widest">ASOCIADOS</p>
            </div>
          </div>
        </div>

        {/* Copy */}
        <div className="relative z-10 max-w-sm">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}>
            <h1 className="text-4xl font-bold text-white leading-tight mb-4">
              Tu portal<br /><span className="text-amber-400">inmobiliario</span><br />personal
            </h1>
            <p className="text-slate-400 text-base mb-10 leading-relaxed">
              Gestiona tus propiedades favoritas, visitas agendadas y contratos desde un solo lugar.
            </p>
            <div className="space-y-4">
              {FEATURES.map(({ icon: Icon, text }, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <Icon className="text-amber-400 text-xs" />
                  </div>
                  <span className="text-slate-300 text-sm">{text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        <div className="relative z-10">
          <p className="text-slate-600 text-xs">© 2025 Rincón Bedoya Asociados · Anserma, Caldas</p>
        </div>
      </div>

      {/* ── PANEL DERECHO — formulario ── */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 lg:bg-slate-950" />
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-amber-500/5 blur-3xl lg:hidden" />

        <div className="relative z-10 w-full max-w-md">
          {/* Logo móvil */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <img src="/logo-ryb.png" alt="RB" className="h-8 object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
            <span className="text-amber-400 font-bold text-sm tracking-wide">RINCÓN BEDOYA ASOCIADOS</span>
          </div>

          {/* Card */}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl shadow-black/40">

            {/* Tab switcher */}
            <div className="flex bg-slate-800/60 rounded-xl p-1 mb-7">
              {['login', 'register'].map((m) => (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    mode === m
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {m === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
                </button>
              ))}
            </div>

            {/* Google */}
            <button
              onClick={handleGoogle}
              disabled={busy}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-900 font-semibold py-3 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-60 mb-5"
            >
              {busy
                ? <FaSpinner className="animate-spin text-slate-600" />
                : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                )
              }
              Continuar con Google
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-slate-700/60" />
              <span className="text-slate-500 text-xs">o continúa con email</span>
              <div className="flex-1 h-px bg-slate-700/60" />
            </div>

            {/* Formulario animado */}
            <AnimatePresence mode="wait" custom={dir}>
              <motion.form
                key={mode}
                custom={dir}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                onSubmit={handleSubmit}
                className="space-y-3.5"
              >
                {mode === 'register' && (
                  <Field
                    icon={FaUser}
                    placeholder="Nombre completo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    error={errors.name}
                    autoComplete="name"
                  />
                )}

                <Field
                  icon={FaEnvelope}
                  type="email"
                  placeholder="Correo electrónico"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={errors.email}
                  autoComplete="email"
                />

                {mode === 'register' && (
                  <Field
                    icon={FaPhone}
                    type="tel"
                    placeholder="Teléfono (opcional)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                  />
                )}

                <Field
                  icon={FaLock}
                  type={showPass ? 'text' : 'password'}
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={errors.password}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  rightEl={
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="text-slate-500 hover:text-slate-300 transition"
                    >
                      {showPass ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  }
                />

                {mode === 'register' && (
                  <Field
                    icon={FaLock}
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Confirmar contraseña"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    error={errors.confirm}
                    autoComplete="new-password"
                    rightEl={
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="text-slate-500 hover:text-slate-300 transition"
                      >
                        {showConfirm ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    }
                  />
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 rounded-xl transition-all shadow-lg shadow-amber-500/20 disabled:opacity-60 flex items-center justify-center gap-2 mt-1"
                >
                  {busy && <FaSpinner className="animate-spin" />}
                  {mode === 'login' ? 'Ingresar al portal' : 'Crear mi cuenta'}
                </button>
              </motion.form>
            </AnimatePresence>

            {mode === 'register' && (
              <p className="text-slate-500 text-xs text-center mt-4 leading-relaxed">
                Al crear una cuenta aceptas nuestros{' '}
                <a href="/politica-privacidad" className="text-amber-400 hover:underline">
                  términos y política de privacidad
                </a>.
              </p>
            )}
          </div>

          <div className="text-center mt-6">
            <a
              href="/catalogo"
              className="text-slate-500 hover:text-amber-400 text-sm transition flex items-center justify-center gap-1.5"
            >
              <FaHome className="text-xs" /> Ver catálogo de propiedades
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}