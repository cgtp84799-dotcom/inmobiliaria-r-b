import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  FaUserPlus, FaEnvelope, FaUser, FaPhone, FaCommentAlt, FaArrowLeft
} from 'react-icons/fa';
import {
  collection, addDoc, serverTimestamp, query, where, getDocs
} from 'firebase/firestore';
import { db } from '../../../core/config/firebase.config';

// ── Notifica al admin escribiendo en /notifications ──────────────────────────
const notifyAdmins = async ({ name, email }) => {
  try {
    // Busca todos los usuarios con rol admin para notificarlos
    const adminsSnap = await getDocs(
      query(collection(db, 'users'), where('role', '==', 'admin'))
    );
    const writes = adminsSnap.docs.map((adminDoc) =>
      addDoc(collection(db, 'notifications'), {
        type:      'access_request',
        title:     'Nueva solicitud de acceso',
        message:   `${name} (${email}) solicitó acceso al sistema.`,
        userId:    adminDoc.id,          // docId = email del admin
        read:      false,
        createdAt: serverTimestamp(),
      })
    );
    await Promise.all(writes);
  } catch (err) {
    // No bloqueamos el flujo principal si falla la notificación
    console.warn('No se pudo notificar a los admins:', err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
const AccessRequestPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [formData, setFormData] = useState({
    name:    '',
    email:   '',
    phone:   '',
    message: '',
  });

  const handleChange = (field) => (e) =>
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error('Nombre y correo son obligatorios.');
      return;
    }

    setLoading(true);
    try {
      // Escribe en /accessRequests (regla Firestore: allow create: if true)
      await addDoc(collection(db, 'accessRequests'), {
        name:      formData.name.trim(),
        email:     formData.email.trim().toLowerCase(),
        phone:     formData.phone.trim(),
        message:   formData.message.trim() || 'Sin mensaje adicional.',
        status:    'pending',
        createdAt: serverTimestamp(),
      });

      // Notifica a todos los admins
      await notifyAdmins({
        name:  formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
      });

      setSent(true);
      toast.success('Solicitud enviada. Te contactaremos pronto.');
    } catch (error) {
      console.error('Error enviando solicitud:', error);
      toast.error('Error al enviar. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // ── Pantalla de confirmación ───────────────────────────────────────────────
  if (sent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center bg-slate-900/60 backdrop-blur-xl border border-slate-800/50 rounded-3xl p-10 shadow-2xl"
        >
          <div className="w-20 h-20 mx-auto mb-6 bg-green-500/10 rounded-2xl flex items-center justify-center">
            <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">¡Solicitud enviada!</h2>
          <p className="text-slate-400 mb-8">
            Un administrador revisará tu solicitud y te contactará al correo{' '}
            <span className="text-primary font-medium">{formData.email}</span>.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-primary text-slate-950 font-bold px-6 py-3 rounded-xl hover:opacity-90 transition"
          >
            <FaArrowLeft className="text-sm" />
            Volver al inicio
          </Link>
        </motion.div>
      </div>
    );
  }

  // ── Formulario ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decoración */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-primary rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '1s' }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-lg w-full relative z-10"
      >
        {/* Encabezado */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-primary to-yellow-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/30">
              <FaUserPlus className="text-slate-950 text-3xl" />
            </div>
          </motion.div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            <span className="bg-gradient-to-r from-primary via-yellow-500 to-primary bg-clip-text text-transparent">
              Solicitar acceso
            </span>
          </h1>
          <p className="text-slate-400">
            Completa el formulario y un administrador revisará tu solicitud.
          </p>
        </div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-8 shadow-2xl"
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Nombre completo <span className="text-red-400">*</span>
              </label>
              <div className="relative group">
                <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={handleChange('name')}
                  placeholder="Juan Pérez"
                  className="w-full bg-slate-950/50 border border-slate-700/70 rounded-xl py-3 pl-12 pr-4 text-slate-100
                             placeholder-slate-500 focus:outline-none focus:border-primary focus:ring-2
                             focus:ring-primary/30 transition-all"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Correo electrónico <span className="text-red-400">*</span>
              </label>
              <div className="relative group">
                <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={handleChange('email')}
                  placeholder="tu@correo.com"
                  className="w-full bg-slate-950/50 border border-slate-700/70 rounded-xl py-3 pl-12 pr-4 text-slate-100
                             placeholder-slate-500 focus:outline-none focus:border-primary focus:ring-2
                             focus:ring-primary/30 transition-all"
                  required
                />
              </div>
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Teléfono <span className="text-slate-500">(opcional)</span>
              </label>
              <div className="relative group">
                <FaPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange('phone')}
                  placeholder="310 123 4567"
                  className="w-full bg-slate-950/50 border border-slate-700/70 rounded-xl py-3 pl-12 pr-4 text-slate-100
                             placeholder-slate-500 focus:outline-none focus:border-primary focus:ring-2
                             focus:ring-primary/30 transition-all"
                />
              </div>
            </div>

            {/* Mensaje */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Motivo de la solicitud
              </label>
              <div className="relative">
                <FaCommentAlt className="absolute left-4 top-3.5 text-slate-500" />
                <textarea
                  value={formData.message}
                  onChange={handleChange('message')}
                  placeholder="Cuéntanos por qué necesitas acceso..."
                  rows={4}
                  className="w-full bg-slate-950/50 border border-slate-700/70 rounded-xl py-3 pl-12 pr-4 text-slate-100
                             placeholder-slate-500 focus:outline-none focus:border-primary focus:ring-2
                             focus:ring-primary/30 transition-all resize-none"
                />
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-primary to-yellow-600 hover:from-yellow-500 hover:to-primary
                           text-slate-950 font-bold py-3.5 rounded-xl shadow-lg hover:shadow-primary/50
                           transition-all disabled:opacity-50 disabled:cursor-not-allowed
                           hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? 'Enviando...' : 'Enviar solicitud'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="px-6 py-3.5 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 font-semibold rounded-xl
                           border border-slate-700/50 hover:border-slate-600 transition-all"
              >
                Cancelar
              </button>
            </div>
          </form>
        </motion.div>

        {/* Link de vuelta al login */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-slate-500 text-sm mt-6"
        >
          ¿Ya tienes cuenta?{' '}
          <Link
            to="/acceso"
            className="text-primary hover:text-yellow-500 font-semibold transition-colors"
          >
            Inicia sesión aquí
          </Link>
        </motion.p>
      </motion.div>
    </div>
  );
};

export default AccessRequestPage;
