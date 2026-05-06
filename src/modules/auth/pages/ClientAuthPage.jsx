import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import {
  FaEnvelope, FaLock, FaUser, FaPhone,
  FaEye, FaEyeSlash, FaSpinner,
  FaArrowRight, FaMoon, FaSun, FaMapMarkerAlt,
  FaHeart, FaCalendarCheck, FaFileAlt, FaBell, FaShieldAlt,
} from 'react-icons/fa';
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signInWithPopup, GoogleAuthProvider, updateProfile,
} from 'firebase/auth';
import {
  doc, setDoc, getDoc, updateDoc, serverTimestamp,
  collection, query, where, getDocs, addDoc,
} from 'firebase/firestore';
import { auth, db } from '../../../core/config/firebase.config';
import { useAuth } from '../../../core/contexts/AuthContext';
import { useTheme } from '../../../core/contexts/ThemeContext';
import { PRIVATE_ROUTES, PUBLIC_ROUTES } from '../../../core/config/routes.config';
import { USER_ROLES } from '../../users/types/user.types';
import { requestEmailVerification } from '../services/emailVerification.service';
import toast from 'react-hot-toast';


const googleProvider = new GoogleAuthProvider();
// Antes esta función buscaba con `email == email` (sin normalizar), pero el
// portal busca con `email == norm(email)` (lowercase + trim). Si el usuario
// se registra con "Pedro@Mail.com" pero el portal lo busca como "pedro@mail.com",
// no encuentra → crea otro doc → DUPLICADO.
//
// SOLUCIÓN:
//   1. Normalizar siempre el email a lowercase antes de buscar Y de crear.
//   2. Si no encontramos por normalizado, también buscar por original
//      (compatibilidad con docs antiguos sin normalizar).
//   3. Si tras todo eso no existe, recién crear con email normalizado.
async function ensureClientDocs(user, extra = {}) {
  const rawEmail = user.email || '';
  const email = String(rawEmail).toLowerCase().trim();
  if (!email) return;

  // /users — ID es el email, ya lo normalizamos
  const uRef = doc(db, 'users', email);
  const uSnap = await getDoc(uRef);
  if (uSnap.exists()) {
    const d = uSnap.data();
    if (d.role === USER_ROLES.ADMIN || d.role === USER_ROLES.MEMBER) return;
    // Sincronizar emailVerified si Auth dice que está verificado pero
    // el doc todavía dice que no (caso típico tras click en el link).
    const updates = {};
    if (d.status === 'pending' && d.role === USER_ROLES.VIEWER) {
      updates.status = 'active';
    }
    if (user.emailVerified && d.emailVerified !== true) {
      updates.emailVerified = true;
      updates.emailVerifiedAt = serverTimestamp();
    }
    if (Object.keys(updates).length > 0) {
      updates.updatedAt = serverTimestamp();
      await updateDoc(uRef, updates);
    }
  } else {
    // Cuentas Google ya vienen verificadas. Cuentas password=false hasta
    // que el usuario haga click en el email.
    const verified = user.emailVerified === true;
    await setDoc(uRef, {
      uid: user.uid, role: USER_ROLES.VIEWER, status: 'active',
      displayName: extra.displayName ?? user.displayName ?? email.split('@')[0],
      phone: extra.phone ?? '', photoURL: user.photoURL ?? null,
      favorites: [],
      emailVerified: verified,
      ...(verified ? { emailVerifiedAt: serverTimestamp() } : {}),
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
  }

  // /clients — buscar por email normalizado y por original (legacy)
  const q1 = query(collection(db, 'clients'), where('email', '==', email));
  let found = !((await getDocs(q1)).empty);
  if (!found && rawEmail !== email) {
    const q2 = query(collection(db, 'clients'), where('email', '==', rawEmail));
    found = !((await getDocs(q2)).empty);
  }
  if (!found) {
    await addDoc(collection(db, 'clients'), {
      nombre: extra.displayName ?? user.displayName ?? email.split('@')[0],
      email, // siempre normalizado
      telefono: extra.phone ?? '',
      tipoCliente: 'portal',
      estado: 'activo',
      notas: '',
      favorites: [],
      agentId: null,
      createdViaPortal: true,
      onboardingDone: false,
      createdAt: serverTimestamp(),
    });
  }
}


const ERR = {
  'auth/user-not-found': 'No existe una cuenta con ese email.',
  'auth/wrong-password': 'Contraseña incorrecta.',
  'auth/email-already-in-use': 'Ya existe una cuenta con ese email.',
  'auth/weak-password': 'Contraseña demasiado débil (mínimo 6 caracteres).',
  'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde.',
  'auth/invalid-credential': 'Email o contraseña incorrectos.',
  'auth/network-request-failed': 'Sin conexión a internet.',
  'auth/popup-blocked': 'Popup bloqueado. Permite popups para este sitio.',
};


/* Blueprint SVG animado — sin cambios */
function Blueprint({ dark }) {
  const accent = dark ? 'rgba(251,191,36,0.22)' : 'rgba(146,64,14,0.18)';
  const faint  = dark ? 'rgba(251,191,36,0.07)' : 'rgba(146,64,14,0.07)';
  const gridStroke = dark ? 'rgba(255,255,255,0.035)' : 'rgba(15,23,42,0.04)';
  const corners = [[70,70],[730,70],[70,830],[730,830]];
  const hLines = [180, 360, 540, 720];
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 900"
      preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <filter id="glow2">
          <feGaussianBlur stdDeviation="1.2" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <pattern id="grid2" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M 60 0 L 0 0 0 60" fill="none" stroke={gridStroke} strokeWidth="0.6"/>
        </pattern>
      </defs>
      <rect width="800" height="900" fill="url(#grid2)" />
      <motion.rect x="40" y="40" width="720" height="820" rx="2" fill="none"
        stroke={faint} strokeWidth="0.8"
        initial={{ pathLength:0, opacity:0 }} animate={{ pathLength:1, opacity:1 }}
        transition={{ duration:2.5, ease:'easeInOut' }}/>
      <motion.rect x="70" y="70" width="660" height="760" rx="1" fill="none"
        stroke={faint} strokeWidth="0.5"
        initial={{ pathLength:0, opacity:0 }} animate={{ pathLength:1, opacity:1 }}
        transition={{ duration:2.8, delay:0.3 }}/>
      <motion.line x1="400" y1="40" x2="400" y2="860" stroke={faint} strokeWidth="0.6"
        initial={{ scaleY:0, opacity:0 }} animate={{ scaleY:1, opacity:1 }}
        style={{ transformOrigin:'400px 450px' }}
        transition={{ duration:1.8, delay:0.5 }}/>
      <motion.line x1="40" y1="450" x2="760" y2="450" stroke={faint} strokeWidth="0.6"
        initial={{ scaleX:0, opacity:0 }} animate={{ scaleX:1, opacity:1 }}
        style={{ transformOrigin:'400px 450px' }}
        transition={{ duration:1.8, delay:0.6 }}/>
      <motion.line x1="40" y1="40" x2="760" y2="860" stroke={faint} strokeWidth="0.35"
        initial={{ pathLength:0, opacity:0 }} animate={{ pathLength:1, opacity:1 }}
        transition={{ duration:3, delay:0.8 }}/>
      <motion.line x1="760" y1="40" x2="40" y2="860" stroke={faint} strokeWidth="0.35"
        initial={{ pathLength:0, opacity:0 }} animate={{ pathLength:1, opacity:1 }}
        transition={{ duration:3, delay:1 }}/>
      <motion.circle cx="400" cy="450" r="200" fill="none" stroke={faint} strokeWidth="0.5"
        strokeDasharray="5 10"
        initial={{ opacity:0, scale:0.8 }} animate={{ opacity:1, scale:1 }}
        style={{ transformOrigin:'400px 450px' }}
        transition={{ duration:2, delay:1.2 }}/>
      <motion.circle cx="400" cy="450" r="320" fill="none" stroke={faint} strokeWidth="0.4"
        strokeDasharray="3 14"
        initial={{ opacity:0, scale:0.85 }} animate={{ opacity:1, scale:1 }}
        style={{ transformOrigin:'400px 450px' }}
        transition={{ duration:2.2, delay:1.4 }}/>
      {corners.map(([cx, cy], i) => (
        <g key={i} filter="url(#glow2)">
          <motion.line x1={cx} y1={cy} x2={cx+(cx<400?28:-28)} y2={cy}
            stroke={accent} strokeWidth="1.5"
            initial={{ pathLength:0, opacity:0 }} animate={{ pathLength:1, opacity:1 }}
            transition={{ duration:0.5, delay:1.6+i*0.1 }}/>
          <motion.line x1={cx} y1={cy} x2={cx} y2={cy+(cy<450?28:-28)}
            stroke={accent} strokeWidth="1.5"
            initial={{ pathLength:0, opacity:0 }} animate={{ pathLength:1, opacity:1 }}
            transition={{ duration:0.5, delay:1.7+i*0.1 }}/>
          <motion.circle cx={cx} cy={cy} r="3.5" fill={accent}
            initial={{ scale:0, opacity:0 }} animate={{ scale:1, opacity:1 }}
            style={{ transformOrigin:`${cx}px ${cy}px` }}
            transition={{ duration:0.3, delay:2+i*0.08 }}/>
        </g>
      ))}
      {hLines.map((y, i) => (
        <motion.line key={i} x1="40" y1={y} x2="760" y2={y}
          stroke={i%2===0?accent:faint}
          strokeWidth={i%2===0?0.55:0.3}
          strokeDasharray={i%2===0?'2 6':'1 12'}
          initial={{ scaleX:0, opacity:0 }} animate={{ scaleX:1, opacity:1 }}
          style={{ transformOrigin:`400px ${y}px` }}
          transition={{ duration:1.4, delay:2.2+i*0.15 }}/>
      ))}
      {Array.from({ length:12 }, (_, i) => (
        <motion.line key={i} x1={40+i*60} y1={40} x2={40+i*60} y2={56}
          stroke={accent} strokeWidth="0.9"
          initial={{ opacity:0 }} animate={{ opacity:1 }}
          transition={{ delay:2.5+i*0.06, duration:0.4 }}/>
      ))}
      <motion.circle cx="400" cy="450" r="12" fill="none" stroke={accent} strokeWidth="1"
        animate={{ r:[12,18,12], opacity:[0.7,0.15,0.7] }}
        transition={{ duration:3.5, repeat:Infinity, ease:'easeInOut' }}/>
      <motion.circle cx="400" cy="450" r="4" fill={accent}
        animate={{ opacity:[0.9,0.3,0.9] }}
        transition={{ duration:3.5, repeat:Infinity, ease:'easeInOut' }}/>
    </svg>
  );
}


/* ── LeftPanel REDISEÑADO — vende los beneficios del portal ── */
function LeftPanel({ dark }) {
  const ref = useRef(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness:55, damping:20 });
  const sy = useSpring(my, { stiffness:55, damping:20 });
  const bpX = useTransform(sx, [-1,1], [-10,10]);
  const bpY = useTransform(sy, [-1,1], [-10,10]);
  const gX  = useTransform(sx, [-1,1], [-24,24]);
  const gY  = useTransform(sy, [-1,1], [-24,24]);

  function onMove(e) {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set(((e.clientX - r.left) / r.width  - 0.5) * 2);
    my.set(((e.clientY - r.top)  / r.height - 0.5) * 2);
  }

  const bg = dark
    ? 'bg-[radial-gradient(ellipse_at_25%_15%,_#1c1000_0%,_#040a18_50%,_#030712_100%)]'
    : 'bg-[radial-gradient(ellipse_at_25%_15%,_#fef3c7_0%,_#ede8df_50%,_#ddd8cf_100%)]';

  /* Cada beneficio = lo que el cliente hace dentro del portal */
  const benefits = [
    {
      icon: FaHeart,
      title: 'Guarda tus favoritos',
      desc: 'Marca las propiedades que más te gustan y accede a ellas en cualquier momento sin perder nada.',
    },
    {
      icon: FaCalendarCheck,
      title: 'Agenda y sigue tus visitas',
      desc: 'Solicita visitas desde el portal y consulta su estado en tiempo real — sin llamadas ni mensajes de WhatsApp.',
    },
    {
      icon: FaFileAlt,
      title: 'Documentos en un solo lugar',
      desc: 'Tus contratos, fichas técnicas y archivos siempre disponibles, organizados y listos para descargar.',
    },
    {
      icon: FaBell,
      title: 'Novedades de tu proceso',
      desc: 'Recibe actualizaciones sobre las propiedades que te interesan y el avance de cada gestión.',
    },
  ];

  const featureCard = dark
    ? 'bg-[var(--color-surface)]/[0.04] border border-white/[0.07] hover:bg-[var(--color-surface)]/[0.07] hover:border-white/[0.12]'
    : 'bg-[var(--color-surface)]/50 border border-white/70 shadow-sm hover:bg-[var(--color-surface)]/75 hover:border-white/90';

  const iconWrap = dark
    ? 'bg-amber-400/10 text-amber-400'
    : 'bg-amber-600/10 text-amber-700';

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={() => { mx.set(0); my.set(0); }}
      className={`relative hidden lg:flex flex-col overflow-hidden ${bg}`}
    >
      {/* Blueprint parallax */}
      <motion.div className="absolute inset-0" style={{ x: bpX, y: bpY }}>
        <Blueprint dark={dark} />
      </motion.div>

      {/* Glows parallax */}
      <motion.div className="absolute inset-0 pointer-events-none" style={{ x: gX, y: gY }}>
        <div className={`absolute top-[-8%] left-[8%] w-[440px] h-[440px] rounded-full blur-[120px] ${dark ? 'bg-amber-500/11' : 'bg-amber-300/28'}`}/>
        <div className={`absolute bottom-[-6%] right-[-4%] w-[380px] h-[380px] rounded-full blur-[100px] ${dark ? 'bg-blue-700/9' : 'bg-slate-400/20'}`}/>
        <div className={`absolute top-[42%] left-[38%] w-[200px] h-[200px] rounded-full blur-[70px] ${dark ? 'bg-amber-400/5' : 'bg-amber-200/40'}`}/>
      </motion.div>

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-between h-full px-12 py-10 xl:px-16 xl:py-12">

        {/* ── Header: logo + ubicación ── */}
        <motion.div
          initial={{ opacity:0, y:-16 }} animate={{ opacity:1, y:0 }}
          transition={{ duration:0.55, ease:[0.22,1,0.36,1] }}
          className="flex items-start justify-between"
        >
          <img
            src={dark ? '/logo-dark.png' : '/logo-light.png'}
            alt="Rincón Bedoya & Asociados"
            className="h-12 xl:h-14 w-auto object-contain"
            onError={e => { e.currentTarget.style.display='none'; }}
          />
          <div className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-[11px] font-medium
            ${dark ? 'bg-[var(--color-surface)]/6 text-[var(--color-text)]/45 border border-white/8' : 'bg-black/5 text-[var(--color-text-muted)] border border-black/8'}`}>
            <FaMapMarkerAlt className={`text-[10px] ${dark ? 'text-amber-400/70' : 'text-amber-700/70'}`}/>
            Anserma, Caldas
          </div>
        </motion.div>

        {/* ── Hero copy ── */}
        <div className="flex flex-col gap-6">

          <motion.div
            initial={{ opacity:0, y:32 }} animate={{ opacity:1, y:0 }}
            transition={{ duration:0.7, delay:0.15, ease:[0.22,1,0.36,1] }}
          >
            <p className={`text-[10px] font-bold uppercase tracking-[0.45em] mb-4
              ${dark ? 'text-amber-400/55' : 'text-amber-800/55'}`}>
              Tu portal privado de clientes
            </p>
            <h2
              className={`font-serif leading-[0.93] tracking-tight
                ${dark ? 'text-[var(--color-text)]' : 'text-slate-900'}`}
              style={{ fontSize: 'clamp(2.4rem, 3.2vw, 4rem)' }}
            >
              Todo tu proceso<br/>
              inmobiliario,<br/>
              <span className={dark ? 'text-amber-400' : 'text-amber-600'}>en un solo lugar.</span>
            </h2>

            <p className={`mt-5 text-sm xl:text-[15px] leading-[1.8] max-w-sm
              ${dark ? 'text-[var(--color-text)]/42' : 'text-[var(--color-text-muted)]'}`}>
              Accede a tus propiedades guardadas, el estado de tus visitas, tus documentos y el seguimiento de tu proceso — todo desde aquí, sin intermediarios.
            </p>
          </motion.div>

          {/* ── Grilla de beneficios ── */}
          <motion.div
            initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
            transition={{ duration:0.65, delay:0.35 }}
            className="grid grid-cols-2 gap-3"
          >
            {benefits.map((b, i) => (
              <motion.div
                key={i}
                initial={{ opacity:0, y:16 }}
                animate={{ opacity:1, y:0 }}
                transition={{ duration:0.45, delay:0.45 + i * 0.08, ease:[0.22,1,0.36,1] }}
                whileHover={{ y:-3 }}
                className={`rounded-2xl p-4 xl:p-5 transition-all duration-200 cursor-default backdrop-blur-sm ${featureCard}`}
              >
                {/* Icono */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-3 ${iconWrap}`}>
                  <b.icon className="text-sm" />
                </div>
                {/* Título */}
                <p className={`text-[13px] font-bold leading-snug mb-1.5
                  ${dark ? 'text-[var(--color-text)]/88' : 'text-slate-800'}`}>
                  {b.title}
                </p>
                {/* Descripción */}
                <p className={`text-[11px] leading-[1.6]
                  ${dark ? 'text-[var(--color-text)]/35' : 'text-[var(--color-text-muted)]'}`}>
                  {b.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>

          {/* ── Sello de confianza ── */}
          <motion.div
            initial={{ opacity:0, x:-16 }} animate={{ opacity:1, x:0 }}
            transition={{ duration:0.5, delay:0.8 }}
            className={`flex items-center gap-3 rounded-2xl px-4 py-3.5
              ${dark
                ? 'bg-amber-400/6 border border-amber-400/12'
                : 'bg-amber-600/5 border border-amber-600/12'}`}
          >
            <FaShieldAlt className={`flex-shrink-0 text-base ${dark ? 'text-amber-400/70' : 'text-amber-700/70'}`} />
            <p className={`text-[11.5px] leading-[1.55]
              ${dark ? 'text-[var(--color-text)]/45' : 'text-[var(--color-text-muted)]'}`}>
              <span className={`font-semibold ${dark ? 'text-[var(--color-text)]/70' : 'text-[var(--color-text-faint)]'}`}>
                +15 años de experiencia.
              </span>{' '}
              Respaldo jurídico especializado en cada proceso de compra, venta y arriendo en Caldas.
            </p>
          </motion.div>

        </div>

        {/* ── Footer ── */}
        <motion.div
          initial={{ opacity:0 }} animate={{ opacity:1 }}
          transition={{ delay:0.9, duration:0.6 }}
          className={`flex items-center justify-between text-[11px]
            ${dark ? 'text-[var(--color-text)]/22' : 'text-[var(--color-text-muted)]'}`}
        >
          <span>© {new Date().getFullYear()} Rincón Bedoya & Asociados</span>
          <Link to="/politica-privacidad"
            className="underline underline-offset-2 opacity-60 hover:opacity-100 transition-opacity">
            Privacidad
          </Link>
        </motion.div>

      </div>
    </div>
  );
}


/* Input field — sin cambios */
function Field({ icon: Icon, type='text', placeholder, value, onChange, error, rightEl, autoComplete, dark }) {
  return (
    <div>
      <div className="relative group">
        <Icon className={`absolute left-4 top-1/2 -translate-y-1/2 text-xs pointer-events-none transition-colors duration-200
          ${dark ? 'text-amber-400/40 group-focus-within:text-amber-400' : 'text-amber-700/40 group-focus-within:text-amber-700'}`}/>
        <input type={type} placeholder={placeholder} value={value}
          onChange={onChange} autoComplete={autoComplete}
          className={`w-full rounded-2xl pl-11 ${rightEl?'pr-11':'pr-4'} py-3.5 text-sm
            border-0 outline-none ring-1 transition-all duration-200 backdrop-blur-sm
            ${dark
              ? `bg-[var(--color-surface)]/5 text-[var(--color-text)] placeholder-white/20 ring-white/8 focus:ring-amber-400/40 focus:bg-[var(--color-surface)]/8`
              : `bg-black/4 text-slate-900 placeholder-slate-400/60 ring-slate-900/10 focus:ring-amber-600/40 focus:bg-black/6`}
            ${error ? (dark?'!ring-red-400/50':'!ring-red-400/60') : ''}`}/>
        {rightEl && <div className="absolute right-4 top-1/2 -translate-y-1/2">{rightEl}</div>}
      </div>
      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            className="mt-1.5 pl-1 text-xs text-red-400">{error}</motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}


/* ── Main — sin cambios ── */
export default function ClientAuthPage() {
  const { currentUser, userData, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname ?? PRIVATE_ROUTES.CLIENT_PORTAL;
  const dark = theme === 'dark';

  const [mode, setMode] = useState('login');
  const [dir, setDir] = useState(1);
  const [busy, setBusy] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (loading || !currentUser || !userData) return;
    const role = userData.role;
    if (role === USER_ROLES.ADMIN || role === USER_ROLES.MEMBER) {
      navigate(PRIVATE_ROUTES.DASHBOARD, { replace:true }); return;
    }
    if (role === USER_ROLES.VIEWER) {
      const dest = from && !from.startsWith('/acceso-clientes') ? from : PRIVATE_ROUTES.CLIENT_PORTAL;
      navigate(dest, { replace:true });
    }
  }, [currentUser, userData, loading, navigate, from]);

  function switchMode(next) {
    setDir(next === 'register' ? 1 : -1);
    setMode(next); setErrors({});
    setPassword(''); setConfirm('');
  }

  function validate() {
    const e = {};
    if (!email.trim()) e.email = 'Email obligatorio';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Email inválido';
    if (!password) e.password = 'Contraseña obligatoria';
    else if (password.length < 6) e.password = 'Mínimo 6 caracteres';
    if (mode === 'register') {
      if (!name.trim()) e.name = 'Nombre obligatorio';
      if (confirm !== password) e.confirm = 'Las contraseñas no coinciden';
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
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        await ensureClientDocs(cred.user);
        // Si la cuenta no está verificada (email/password) → mandar a verificación.
        // Las cuentas creadas con Google ya vienen verificadas por Google.
        const providerId = cred.user.providerData?.[0]?.providerId;
        if (!cred.user.emailVerified && providerId === 'password') {
          toast('Verifica tu email para acceder.', { icon: '✉️' });
          navigate(PUBLIC_ROUTES.EMAIL_VERIFICATION, { replace: true });
          return;
        }
        toast.success('¡Bienvenido de nuevo!');
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(cred.user, { displayName: name.trim() });
        await ensureClientDocs(cred.user, { displayName: name.trim(), phone: phone.trim() });
        // Enviar email de verificación CUSTOM (no usa la plantilla de Firebase
        // Auth, que no se puede personalizar).
        // Importante: requestEmailVerification requiere ID token — el
        // createUserWithEmailAndPassword ya nos deja la sesión activa.
        try {
          await requestEmailVerification();
        } catch (verifyErr) {
          console.error('[signup] requestEmailVerification:', verifyErr);
          // No bloqueamos el flujo: el usuario puede reenviar desde la
          // página de verificación.
        }
        toast.success('Cuenta creada. Revisa tu email para activarla.');
        navigate(PUBLIC_ROUTES.EMAIL_VERIFICATION, { replace: true });
      }
    } catch (err) {
      toast.error(ERR[err.code] ?? 'Error inesperado. Intenta de nuevo.');
    } finally { setBusy(false); }
  }

  async function handleGoogle() {
    setBusy(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      await ensureClientDocs(cred.user);
      toast.success('¡Bienvenido!');
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user')
        toast.error(ERR[err.code] ?? 'Error al continuar con Google.');
    } finally { setBusy(false); }
  }

  if (loading) return (
    <div className={`min-h-screen flex items-center justify-center ${dark?'bg-[var(--color-bg)]':'bg-stone-50'}`}>
      <motion.div animate={{ rotate:360 }} transition={{ duration:1, repeat:Infinity, ease:'linear' }}>
        <FaSpinner className="text-amber-500 text-2xl"/>
      </motion.div>
    </div>
  );

  const rightBg = dark
    ? 'bg-[radial-gradient(ellipse_at_50%_0%,_#0d1b2a_0%,_#030712_60%)]'
    : 'bg-[radial-gradient(ellipse_at_50%_0%,_#fffdf7_0%,_#f5f0e8_60%)]';

  const cardBg = dark
    ? 'bg-[var(--color-surface)]/70 ring-1 ring-white/8 shadow-[0_40px_100px_rgba(0,0,0,0.65)]'
    : 'bg-[var(--color-surface)]/80 ring-1 ring-black/6 shadow-[0_40px_100px_rgba(15,23,42,0.15)]';

  const mutedColor = dark ? 'text-[var(--color-text)]/30' : 'text-[var(--color-text-muted)]';
  const dividerColor = dark ? 'bg-[var(--color-surface)]/8' : 'bg-slate-200/80';
  const tabActiveCls = dark
    ? 'bg-amber-400 text-slate-950 shadow-[0_6px_20px_rgba(251,191,36,0.28)]'
    : 'bg-amber-500 text-[var(--color-text)] shadow-[0_6px_20px_rgba(245,158,11,0.26)]';
  const tabInactiveCls = dark ? 'text-[var(--color-text)]/35 hover:text-[var(--color-text)]/70' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-faint)]';
  const ctaBtn = dark
    ? 'bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-[0_16px_48px_rgba(251,191,36,0.26)]'
    : 'bg-amber-500 text-[var(--color-text)] hover:bg-amber-600 shadow-[0_16px_48px_rgba(245,158,11,0.26)]';
  const googleBtn = dark
    ? 'bg-[var(--color-surface)]/5 ring-1 ring-white/10 text-[var(--color-text)] hover:bg-[var(--color-surface)]/10'
    : 'bg-[var(--color-surface)] ring-1 ring-slate-200 text-slate-800 hover:bg-slate-50';
  const themeBtnCls = dark
    ? 'bg-[var(--color-surface)]/5 ring-1 ring-white/10 text-[var(--color-text)]/50 hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]/10'
    : 'bg-black/4 ring-1 ring-black/8 text-[var(--color-text-muted)] hover:text-slate-900 hover:bg-black/7';

  return (
    <div className="min-h-screen transition-colors duration-500">
      <div className="grid min-h-screen lg:grid-cols-[1.15fr_0.85fr]">

        {/* LEFT */}
        <LeftPanel dark={dark} />

        {/* RIGHT — sin cambios */}
        <div className={`relative flex items-center justify-center overflow-hidden px-5 py-16 sm:px-8 lg:py-10 ${rightBg}`}>
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className={`absolute top-[-5%] right-[-10%] w-[320px] h-[320px] rounded-full blur-[90px] ${dark?'bg-amber-500/8':'bg-amber-200/40'}`}/>
            <div className={`absolute bottom-[-8%] left-[-5%] w-[280px] h-[280px] rounded-full blur-[80px] ${dark?'bg-blue-600/8':'bg-slate-300/30'}`}/>
          </div>

          <div className="relative z-10 w-full max-w-[400px]">
            {/* Mobile header */}
            <div className="flex items-center justify-between mb-7 lg:hidden">
              <Link to="/">
                <img src={dark?'/logo-dark.png':'/logo-light.png'} alt="Rincón Bedoya & Asociados"
                  className="h-10 w-auto object-contain"
                  onError={e => { e.currentTarget.style.display='none'; }}/>
              </Link>
              <button type="button" onClick={toggleTheme} aria-label="Cambiar tema"
                className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200 ${themeBtnCls}`}>
                {dark ? <FaSun size={13}/> : <FaMoon size={13}/>}
              </button>
            </div>

            {/* Desktop theme toggle */}
            <div className="hidden lg:flex justify-end mb-6">
              <button type="button" onClick={toggleTheme} aria-label="Cambiar tema"
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-200 ${themeBtnCls}`}>
                {dark ? <FaSun size={12}/> : <FaMoon size={12}/>}
                {dark ? 'Modo oscuro' : 'Modo claro'}
              </button>
            </div>

            {/* Mobile eyebrow */}
            <div className="mb-6 lg:hidden text-center">
              <p className={`text-[10px] font-bold uppercase tracking-[0.4em] mb-2 ${dark?'text-amber-400/60':'text-amber-800/60'}`}>
                Portal privado
              </p>
              <h1 className={`font-serif text-3xl leading-tight ${dark?'text-[var(--color-text)]':'text-slate-900'}`}>
                Tu espacio <span className={dark?'text-amber-400':'text-amber-600'}>inmobiliario</span> personal.
              </h1>
            </div>

            {/* Desktop heading */}
            <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
              transition={{ duration:0.5, delay:0.2 }}
              className="hidden lg:block mb-6">
              <p className={`text-[10px] font-bold uppercase tracking-[0.4em] mb-2 ${dark?'text-amber-400/60':'text-amber-800/60'}`}>
                Acceso privado
              </p>
              <h2 className={`font-serif text-3xl xl:text-4xl leading-tight ${dark?'text-[var(--color-text)]':'text-slate-900'}`}>
                {mode === 'login' ? 'Bienvenido de nuevo.' : 'Crea tu acceso privado.'}
              </h2>
            </motion.div>

            {/* Card */}
            <motion.div
              initial={{ opacity:0, y:28, scale:0.97 }}
              animate={{ opacity:1, y:0, scale:1 }}
              transition={{ duration:0.55, delay:0.25, ease:[0.22,1,0.36,1] }}
              className={`rounded-[28px] p-5 sm:p-6 backdrop-blur-2xl transition-colors duration-300 ${cardBg}`}>

              {/* Tabs */}
              <div className={`relative grid grid-cols-2 rounded-[16px] p-1 mb-5 ${dark?'bg-[var(--color-surface)]/5':'bg-slate-100/90'}`}>
                <motion.div layout transition={{ type:'spring', stiffness:340, damping:28 }}
                  className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl ${tabActiveCls}
                    ${mode==='login'?'left-1':'left-[calc(50%+2px)]'}`}/>
                {[['login','Iniciar sesión'],['register','Crear cuenta']].map(([m, label]) => (
                  <button key={m} type="button" onClick={() => switchMode(m)}
                    className={`relative z-10 py-3 rounded-xl text-sm font-semibold transition-colors duration-200
                      ${mode===m ? (dark?'text-slate-950':'text-[var(--color-text)]') : tabInactiveCls}`}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Google */}
              <button type="button" onClick={handleGoogle} disabled={busy}
                className={`w-full flex items-center justify-center gap-3 rounded-2xl py-3.5 text-sm font-semibold transition-all duration-200 mb-5 disabled:opacity-50 ${googleBtn}`}>
                {busy ? <FaSpinner className="animate-spin text-amber-500"/> : (
                  <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                Continuar con Google
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-5">
                <div className={`h-px flex-1 ${dividerColor}`}/>
                <span className={`text-[11px] font-medium ${mutedColor}`}>o con email</span>
                <div className={`h-px flex-1 ${dividerColor}`}/>
              </div>

              {/* Form */}
              <AnimatePresence mode="wait" custom={dir}>
                <motion.form key={mode} custom={dir}
                  initial={{ opacity:0, x: dir>0?20:-20 }}
                  animate={{ opacity:1, x:0, transition:{ duration:0.3, ease:[0.22,1,0.36,1] } }}
                  exit={{ opacity:0, x: dir>0?-20:20, transition:{ duration:0.18 } }}
                  onSubmit={handleSubmit} className="space-y-3">
                  {mode==='register' && (
                    <Field icon={FaUser} placeholder="Nombre completo"
                      value={name} onChange={e=>setName(e.target.value)}
                      error={errors.name} autoComplete="name" dark={dark}/>
                  )}
                  <Field icon={FaEnvelope} type="email" placeholder="Correo electrónico"
                    value={email} onChange={e=>setEmail(e.target.value)}
                    error={errors.email} autoComplete="email" dark={dark}/>
                  {mode==='register' && (
                    <Field icon={FaPhone} type="tel" placeholder="Teléfono (opcional)"
                      value={phone} onChange={e=>setPhone(e.target.value)}
                      autoComplete="tel" dark={dark}/>
                  )}
                  <Field icon={FaLock} type={showPass?'text':'password'} placeholder="Contraseña"
                    value={password} onChange={e=>setPassword(e.target.value)}
                    error={errors.password}
                    autoComplete={mode==='login'?'current-password':'new-password'}
                    dark={dark}
                    rightEl={
                      <button type="button" onClick={()=>setShowPass(v=>!v)}
                        className={`transition-colors ${mutedColor} hover:text-current`}>
                        {showPass?<FaEyeSlash size={13}/>:<FaEye size={13}/>}
                      </button>
                    }/>
                  {mode==='register' && (
                    <Field icon={FaLock} type={showConfirm?'text':'password'} placeholder="Confirmar contraseña"
                      value={confirm} onChange={e=>setConfirm(e.target.value)}
                      error={errors.confirm} autoComplete="new-password" dark={dark}
                      rightEl={
                        <button type="button" onClick={()=>setShowConfirm(v=>!v)}
                          className={`transition-colors ${mutedColor}`}>
                          {showConfirm?<FaEyeSlash size={13}/>:<FaEye size={13}/>}
                        </button>
                      }/>
                  )}
                  <motion.button type="submit" disabled={busy}
                    whileHover={{ scale: busy?1:1.015 }} whileTap={{ scale: busy?1:0.985 }}
                    className={`w-full flex items-center justify-center gap-2.5 rounded-2xl py-4 text-sm font-bold transition-all duration-200 mt-2 disabled:opacity-50 ${ctaBtn}`}>
                    {busy ? <FaSpinner className="animate-spin"/> : <FaArrowRight className="text-xs"/>}
                    {mode==='login' ? 'Ingresar al portal' : 'Crear mi acceso privado'}
                  </motion.button>
                </motion.form>
              </AnimatePresence>

              {mode==='register' && (
                <p className={`mt-4 text-center text-[11px] leading-relaxed ${mutedColor}`}>
                  Al registrarte aceptas nuestra{' '}
                  <Link to="/politica-privacidad"
                    className={`font-semibold underline underline-offset-2 ${dark?'text-amber-400/80 hover:text-amber-300':'text-amber-700/80 hover:text-amber-800'}`}>
                    política de privacidad
                  </Link>.
                </p>
              )}
            </motion.div>

            {/* Bottom links */}
            <div className="mt-5 flex items-center justify-between">
              <Link to="/catalogo"
                className={`inline-flex items-center gap-1.5 text-xs font-medium transition-all duration-200 ${dark?'text-[var(--color-text)]/28 hover:text-[var(--color-text)]/55':'text-[var(--color-text-muted)] hover:text-[var(--color-text-faint)]'}`}>
                Ver catálogo
                <FaArrowRight className="text-[9px]"/>
              </Link>
              <p className={`text-[11px] lg:hidden ${mutedColor}`}>
                © {new Date().getFullYear()} RB & Asociados
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}