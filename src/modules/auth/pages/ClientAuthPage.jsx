import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaEnvelope, FaLock, FaUser, FaPhone,
  FaEye, FaEyeSlash, FaArrowLeft,
  FaCheckCircle, FaHeart, FaCalendarAlt,
  FaFileContract, FaSpinner, FaWhatsapp, FaHome,
  FaKey, FaHandshake, FaUserTie,
} from 'react-icons/fa';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { auth, db } from '../../../core/config/firebase.config';
import toast from 'react-hot-toast';

// ── Tipos de cliente ──────────────────────────────────────────────────────────
const CLIENT_TYPES = [
  {
    id: 'comprador',
    icon: FaHome,
    title: 'Quiero comprar',
    desc: 'Busco mi próxima propiedad',
    color: 'text-primary border-primary/30 bg-primary/5 hover:bg-primary/10',
    activeColor: 'border-primary bg-primary/15 text-primary',
  },
  {
    id: 'arrendatario',
    icon: FaKey,
    title: 'Quiero arrendar',
    desc: 'Busco una propiedad para vivir',
    color: 'text-blue-400 border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10',
    activeColor: 'border-blue-400 bg-blue-500/15 text-blue-400',
  },
  {
    id: 'propietario',
    icon: FaHandshake,
    title: 'Tengo una propiedad',
    desc: 'Quiero vender o arrendar',
    color: 'text-purple-400 border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10',
    activeColor: 'border-purple-400 bg-purple-500/15 text-purple-400',
  },
];

const BENEFITS = {
  comprador: [
    'Guarda propiedades favoritas y compáralas',
    'Agenda visitas en 2 clics desde el catálogo',
    'Recibe alertas de nuevas propiedades',
    'Accede al historial de tus visitas',
  ],
  arrendatario: [
    'Consulta tu contrato de arriendo activo',
    'Ve las fechas de vencimiento y renovación',
    'Descarga tus documentos en PDF',
    'Comunícate directamente con tu agente',
  ],
  propietario: [
    'Monitorea el estado de tu inmueble',
    'Recibe actualizaciones de visitas agendadas',
    'Accede a tu contrato y estado de pagos',
    'Historial completo de interacciones',
  ],
};

async function sendWelcomeEmail(name, email, clientType) {
  const typeLabel = { comprador: 'comprador', arrendatario: 'arrendatario', propietario: 'propietario' };
  try {
    await addDoc(collection(db, 'mail'), {
      to: email,
      message: {
        subject: `¡Bienvenido a R&B Inmobiliaria, ${name}! 🏠`,
        html: `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/><style>
body{margin:0;padding:0;background:#f0f4f8;font-family:'Inter','Segoe UI',Arial,sans-serif;}
.w{background:#f0f4f8;padding:40px 16px;}
.c{max-width:560px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);}
.h{background:linear-gradient(135deg,#0f172a,#1e293b);padding:36px 40px;text-align:center;}
.b{padding:40px;}
.f{background:#f8f9fb;border-top:1px solid #e8ecf0;padding:24px 40px;text-align:center;}
.f p{color:#9ca3af;font-size:12px;line-height:1.6;margin:0;}
.f a{color:#b8952a;text-decoration:none;}
h1{font-size:26px;font-weight:800;color:#111827;margin:0 0 8px;text-align:center;}
.sub{font-size:15px;color:#6b7280;margin:0 0 24px;line-height:1.6;text-align:center;}
.card{background:#f9fafb;border-radius:12px;padding:8px 16px;margin:0 0 28px;}
.row{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #f3f4f6;}
.row:last-child{border-bottom:none;}
.ico{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#b8952a,#d4a836);text-align:center;line-height:36px;flex-shrink:0;font-size:16px;}
.rtxt{font-size:14px;color:#374151;font-weight:500;}
.btn{display:inline-block;background:linear-gradient(135deg,#b8952a,#d4a836);color:#fff;font-weight:700;font-size:15px;padding:14px 36px;border-radius:50px;text-decoration:none;}
</style></head><body>
<div class="w"><div class="c">
<div class="h"><img src="https://inmobiliaria-ryb-y-asociados.com/logo.jpg.png" alt="R&amp;B" height="52"/></div>
<div class="b">
<div style="text-align:center;font-size:56px;margin-bottom:20px;">🏠</div>
<h1>¡Bienvenido, ${name}!</h1>
<p class="sub">Te registraste como <strong>${typeLabel[clientType] || 'cliente'}</strong> en R&amp;B Inmobiliaria.<br/>Desde tu portal personal puedes:</p>
<div class="card">
<div class="row"><div class="ico">📅</div><p class="rtxt">Agendar y seguir tus visitas en tiempo real</p></div>
<div class="row"><div class="ico">📋</div><p class="rtxt">Acceder a tus contratos y documentos PDF</p></div>
<div class="row"><div class="ico">❤️</div><p class="rtxt">Guardar tus propiedades favoritas</p></div>
<div class="row"><div class="ico">🔔</div><p class="rtxt">Recibir notificaciones de novedades</p></div>
</div>
<div style="text-align:center;margin-bottom:24px;">
<a href="https://inmobiliaria-ryb-y-asociados.com/portal" class="btn">Ir a mi portal →</a>
</div>
<p style="text-align:center;font-size:13px;color:#9ca3af;">¿Preguntas? <a href="https://wa.me/573105968202" style="color:#b8952a;font-weight:600;">WhatsApp 310 596 8202</a></p>
</div>
<div class="f"><p><strong style="color:#374151;">Inmobiliaria Rincón Bedoya &amp; Asociados</strong><br/>Cra 5 No. 9-28, Anserma, Caldas<br/><a href="tel:+573105968202">+57 310 596 8202</a></p></div>
</div></div></body></html>`,
      },
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn('[ClientAuth] welcome email:', e.message);
  }
}

export default function ClientAuthPage() {
  const [searchParams]  = useSearchParams();
  const navigate        = useNavigate();
  const [tab, setTab]   = useState(searchParams.get('mode') === 'register' ? 'register' : 'login');
  const [loading, setL] = useState(false);
  const [showPw, setP]  = useState(false);
  const [done, setDone] = useState(false);
  const [clientType, setClientType] = useState('comprador');

  const [lf, setLf] = useState({ email: '', password: '' });
  const [rf, setRf] = useState({ nombre: '', email: '', telefono: '', password: '', confirm: '' });

  const ic = 'w-full bg-slate-900/80 border border-slate-700 text-white rounded-xl pl-11 pr-4 py-3.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-slate-600';

  const handleLogin = async (e) => {
    e.preventDefault(); setL(true);
    try {
      await signInWithEmailAndPassword(auth, lf.email.trim(), lf.password);
      navigate('/portal');
    } catch (err) {
      const m = {
        'auth/user-not-found':    'No hay cuenta con ese correo.',
        'auth/wrong-password':    'Contraseña incorrecta.',
        'auth/invalid-credential':'Correo o contraseña incorrectos.',
        'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos.',
      };
      toast.error(m[err.code] || 'Error al iniciar sesión');
    } finally { setL(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (rf.password !== rf.confirm) { toast.error('Las contraseñas no coinciden'); return; }
    if (rf.password.length < 6)     { toast.error('Mínimo 6 caracteres'); return; }
    setL(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, rf.email.trim(), rf.password);
      await updateProfile(cred.user, { displayName: rf.nombre.trim() });
      await setDoc(doc(db, 'users', rf.email.trim()), {
        uid:         cred.user.uid,
        email:       rf.email.trim(),
        displayName: rf.nombre.trim(),
        phone:       rf.telefono.trim(),
        role:        'viewer',
        status:      'active',
        clientType,
        photoURL:    '',
        favorites:   [],
        createdAt:   serverTimestamp(),
        updatedAt:   serverTimestamp(),
      });
      await sendWelcomeEmail(rf.nombre.trim(), rf.email.trim(), clientType);
      setDone(true);
    } catch (err) {
      const m = {
        'auth/email-already-in-use': 'Ya existe una cuenta con ese correo.',
        'auth/invalid-email':        'Correo no válido.',
        'auth/weak-password':        'Contraseña muy débil.',
      };
      toast.error(m[err.code] || 'Error al crear la cuenta');
    } finally { setL(false); }
  };

  const handleForgot = async () => {
    if (!lf.email.trim()) { toast.error('Escribe tu correo primero'); return; }
    try {
      await sendPasswordResetEmail(auth, lf.email.trim());
      toast.success('Enlace de recuperación enviado ✉️');
    } catch (err) {
      toast.error(err.code === 'auth/user-not-found' ? 'No hay cuenta con ese correo.' : 'Error al enviar.');
    }
  };

  // ── Pantalla de éxito ──────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-6">
        <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 180 }}
            className="w-24 h-24 rounded-full bg-green-500/15 border-2 border-green-500/30 flex items-center justify-center mx-auto mb-8">
            <FaCheckCircle className="text-green-400 text-4xl" />
          </motion.div>
          <h1 className="text-3xl font-extrabold text-white mb-3">
            ¡Listo, {rf.nombre.trim().split(' ')[0]}! 🎉
          </h1>
          <p className="text-slate-400 text-sm mb-2 leading-relaxed">
            Tu cuenta fue creada. Te enviamos un correo de bienvenida a{' '}
            <span className="text-primary font-semibold">{rf.email}</span>
          </p>
          <p className="text-slate-600 text-xs mb-10">Si no lo ves, revisa spam.</p>
          <div className="space-y-3">
            <button onClick={() => navigate('/portal')}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-yellow-400 text-slate-950 font-extrabold text-base hover:opacity-90 transition-opacity">
              Ir a mi portal →
            </button>
            <Link to="/catalogo" className="block w-full py-3 rounded-2xl border border-slate-700 text-slate-400 hover:border-slate-600 hover:text-white transition-colors text-sm font-semibold">
              Explorar propiedades
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const selectedType = CLIENT_TYPES.find((t) => t.id === clientType);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col lg:flex-row">

      {/* ── Panel izquierdo: propuesta de valor ─────────────────────────── */}
      <div className="hidden lg:flex lg:w-2/5 xl:w-1/3 flex-col justify-center px-12 xl:px-16 py-20 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/3 w-64 h-64 bg-primary/6 rounded-full blur-3xl" />
          <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-yellow-500/5 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center gap-3 mb-14">
            <img src="/logo.jpg.png" alt="R&B" className="h-10 w-auto"
              onError={(e) => e.target.style.display = 'none'} />
            <div>
              <p className="text-white font-bold text-sm leading-tight">Rincón Bedoya</p>
              <p className="text-primary text-xs font-semibold">& Asociados</p>
            </div>
          </Link>

          <h2 className="text-3xl xl:text-4xl font-extrabold text-white mb-3 leading-tight">
            Tu portal<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-yellow-400">
              inmobiliario
            </span><br />personal
          </h2>
          <p className="text-slate-400 mb-8 leading-relaxed text-sm">
            Todo lo que necesitas, en un solo lugar.
          </p>

          {/* Beneficios dinámicos según tipo */}
          <AnimatePresence mode="wait">
            <motion.div key={clientType}
              initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
              className="space-y-3 mb-10">
              {(BENEFITS[clientType] || BENEFITS.comprador).map((b, i) => (
                <div key={i} className="flex items-center gap-3">
                  <FaCheckCircle className="text-primary flex-shrink-0" size={13} />
                  <p className="text-slate-300 text-sm">{b}</p>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>

          <div className="pt-8 border-t border-slate-800/60">
            <p className="text-slate-600 text-xs">
              ¿Eres agente o administrador?{' '}
              <Link to="/login" className="text-primary hover:underline font-semibold">
                Acceso al panel →
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* ── Panel derecho: formulario ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 lg:px-14">

        {/* Logo mobile */}
        <div className="lg:hidden mb-6 text-center">
          <Link to="/">
            <img src="/logo.jpg.png" alt="R&B" className="h-12 mx-auto mb-1"
              onError={(e) => e.target.style.display = 'none'} />
          </Link>
        </div>

        <div className="w-full max-w-md">

          {/* Tabs login/register */}
          <div className="flex bg-slate-900/80 rounded-2xl p-1 mb-7 border border-slate-800">
            {[{ id: 'login', label: 'Iniciar sesión' }, { id: 'register', label: 'Crear cuenta' }].map(({ id, label }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-200
                  ${tab === id
                    ? 'bg-gradient-to-r from-primary to-yellow-400 text-slate-950 shadow-lg'
                    : 'text-slate-400 hover:text-white'}`}>
                {label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">

            {/* ── LOGIN ── */}
            {tab === 'login' && (
              <motion.div key="login" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <h1 className="text-2xl font-extrabold text-white mb-1">Bienvenido de vuelta</h1>
                <p className="text-slate-500 text-sm mb-7">Accede a tu portal personal</p>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="relative">
                    <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={12} />
                    <input type="email" required placeholder="tu@correo.com" value={lf.email}
                      onChange={(e) => setLf({ ...lf, email: e.target.value })} className={ic} autoComplete="email" />
                  </div>
                  <div className="relative">
                    <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={12} />
                    <input type={showPw ? 'text' : 'password'} required placeholder="Tu contraseña" value={lf.password}
                      onChange={(e) => setLf({ ...lf, password: e.target.value })} className={`${ic} pr-11`} autoComplete="current-password" />
                    <button type="button" onClick={() => setP(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-primary transition-colors">
                      {showPw ? <FaEyeSlash size={13} /> : <FaEye size={13} />}
                    </button>
                  </div>
                  <button type="button" onClick={handleForgot} className="text-xs text-slate-500 hover:text-primary transition-colors">
                    ¿Olvidaste tu contraseña?
                  </button>
                  <button type="submit" disabled={loading}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-yellow-400 text-slate-950 font-extrabold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2 mt-1">
                    {loading ? <><FaSpinner className="animate-spin" size={13} /> Verificando...</> : 'Entrar a mi portal →'}
                  </button>
                </form>
                <p className="mt-5 text-center text-slate-500 text-sm">
                  ¿No tienes cuenta?{' '}
                  <button onClick={() => setTab('register')} className="text-primary font-semibold hover:underline">Créala gratis</button>
                </p>
              </motion.div>
            )}

            {/* ── REGISTRO ── */}
            {tab === 'register' && (
              <motion.div key="register" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <h1 className="text-2xl font-extrabold text-white mb-1">Crea tu cuenta gratis</h1>
                <p className="text-slate-500 text-sm mb-6">En 30 segundos · Sin compromiso</p>

                {/* Selector de tipo de cliente */}
                <div className="mb-5">
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">¿Para qué necesitas el portal?</p>
                  <div className="grid grid-cols-3 gap-2">
                    {CLIENT_TYPES.map(({ id, icon: Icon, title, color, activeColor }) => (
                      <button key={id} type="button" onClick={() => setClientType(id)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-center
                          ${clientType === id ? activeColor : color}`}>
                        <Icon size={16} />
                        <span className="text-[10px] font-bold leading-tight">{title}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleRegister} className="space-y-3">
                  <div className="relative">
                    <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={12} />
                    <input type="text" required placeholder="Tu nombre completo" value={rf.nombre}
                      onChange={(e) => setRf({ ...rf, nombre: e.target.value })} className={ic} autoComplete="name" />
                  </div>
                  <div className="relative">
                    <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={12} />
                    <input type="email" required placeholder="tu@correo.com" value={rf.email}
                      onChange={(e) => setRf({ ...rf, email: e.target.value })} className={ic} autoComplete="email" />
                  </div>
                  <div className="relative">
                    <FaPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={12} />
                    <input type="tel" placeholder="Teléfono (opcional)" value={rf.telefono}
                      onChange={(e) => setRf({ ...rf, telefono: e.target.value })} className={ic} />
                  </div>
                  <div className="relative">
                    <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={12} />
                    <input type={showPw ? 'text' : 'password'} required placeholder="Elige una contraseña" minLength={6} value={rf.password}
                      onChange={(e) => setRf({ ...rf, password: e.target.value })} className={`${ic} pr-11`} />
                    <button type="button" onClick={() => setP(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-primary transition-colors">
                      {showPw ? <FaEyeSlash size={13} /> : <FaEye size={13} />}
                    </button>
                  </div>
                  <div className="relative">
                    <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={12} />
                    <input type={showPw ? 'text' : 'password'} required placeholder="Confirma tu contraseña" value={rf.confirm}
                      onChange={(e) => setRf({ ...rf, confirm: e.target.value })} className={ic} />
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-yellow-400 text-slate-950 font-extrabold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2 mt-1">
                    {loading ? <><FaSpinner className="animate-spin" size={13} /> Creando cuenta...</> : 'Crear mi cuenta gratis →'}
                  </button>
                </form>
                <p className="mt-4 text-center text-slate-500 text-sm">
                  ¿Ya tienes cuenta?{' '}
                  <button onClick={() => setTab('login')} className="text-primary font-semibold hover:underline">Inicia sesión</button>
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer */}
          <div className="mt-8 pt-5 border-t border-slate-800/50 flex flex-col items-center gap-3">
            <a href="https://wa.me/573105968202?text=Hola, quiero información sobre propiedades"
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/15 transition-colors text-sm font-semibold">
              <FaWhatsapp size={13} /> Contactar por WhatsApp
            </a>
            <Link to="/" className="flex items-center gap-1.5 text-slate-600 hover:text-slate-400 transition-colors text-xs">
              <FaArrowLeft size={9} /> Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}