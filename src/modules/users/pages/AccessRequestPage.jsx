import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  FaUserPlus, FaEnvelope, FaUser, FaPhone, FaCommentAlt, FaArrowLeft, FaCheckCircle
} from 'react-icons/fa';
import {
  collection, addDoc, serverTimestamp, query, where, getDocs
} from 'firebase/firestore';
import { db } from '../../../core/config/firebase.config';
import { AUTH_ROUTES } from '../../../core/config/routes.config';

// ── Notifica al admin escribiendo en /notifications ────────────────────────
const notifyAdmins = async ({ name, email }) => {
  try {
    const adminsSnap = await getDocs(
      query(collection(db, 'users'), where('role', '==', 'admin'))
    );
    const writes = adminsSnap.docs.map((adminDoc) =>
      addDoc(collection(db, 'notifications'), {
        type:      'access_request',
        title:     'Nueva solicitud de acceso',
        message:   `${name} (${email}) solicitó acceso al sistema.`,
        userId:    adminDoc.id,
        read:      false,
        createdAt: serverTimestamp(),
      })
    );
    await Promise.all(writes);
  } catch (err) {
    console.warn('No se pudo notificar a los admins:', err);
  }
};

// ────────────────────────────────────────────────────────────────────────────────
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
      await addDoc(collection(db, 'accessRequests'), {
        name:      formData.name.trim(),
        email:     formData.email.trim().toLowerCase(),
        phone:     formData.phone.trim(),
        message:   formData.message.trim() || 'Sin mensaje adicional.',
        status:    'pending',
        createdAt: serverTimestamp(),
      });
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

  // ── Pantalla de confirmación ─────────────────────────────────────────────
if (sent) {
    return (
      <div className="py-16 sm:py-24 px-4 flex items-center justify-center" style={{ minHeight: 'calc(100vh - 160px)' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full text-center card-soft p-10 shadow-lg"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(34,197,94,0.12)' }}
          >
            <FaCheckCircle className="text-green-500 text-4xl" />
          </motion.div>
          <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--color-text)' }}>
            ¡Solicitud enviada!
          </h2>
          <p className="mb-8 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
            Un administrador revisará tu solicitud y te contactará al correo{' '}
            <span className="font-semibold" style={{ color: 'var(--tw-primary)' }}>{formData.email}</span>.
          </p>
          <Link
            to="/"
            className="button-gold inline-flex items-center gap-2"
          >
            <FaArrowLeft className="text-sm" />
            Volver al inicio
          </Link>
        </motion.div>
      </div>
    );
  }

  // ── Formulario ──────────────────────────────────────────────────────────────────
return (
    <div
      className="py-10 sm:py-16 px-4"
      style={{ minHeight: 'calc(100vh - 160px)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-lg mx-auto"
      >
        {/* Encabezado */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="w-18 h-18 mx-auto mb-5 w-[72px] h-[72px] rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}
          >
            <FaUserPlus className="text-slate-950 text-3xl" />
          </motion.div>
          <h1
            className="text-3xl sm:text-4xl font-extrabold mb-2"
            style={{ color: 'var(--color-text)' }}
          >
            Solicitar acceso
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Completa el formulario y un administrador revisará tu solicitud.
          </p>
        </div>

        {/* Card principal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="card-soft p-7 sm:p-9 shadow-lg"
        >
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Nombre */}
            <div>
              <label
                className="block text-sm font-semibold mb-1.5"
                style={{ color: 'var(--color-text)' }}
              >
                Nombre completo <span className="text-red-500">*</span>
              </label>
              <div className="relative group">
                <FaUser
                  className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--color-text-faint)' }}
                />
                <input
                  type="text"
                  value={formData.name}
                  onChange={handleChange('name')}
                  placeholder="Juan Pérez"
                  className="input-themed pl-11"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label
                className="block text-sm font-semibold mb-1.5"
                style={{ color: 'var(--color-text)' }}
              >
                Correo electrónico <span className="text-red-500">*</span>
              </label>
              <div className="relative group">
                <FaEnvelope
                  className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--color-text-faint)' }}
                />
                <input
                  type="email"
                  value={formData.email}
                  onChange={handleChange('email')}
                  placeholder="tu@correo.com"
                  className="input-themed pl-11"
                  required
                />
              </div>
            </div>

            {/* Teléfono */}
            <div>
              <label
                className="block text-sm font-semibold mb-1.5"
                style={{ color: 'var(--color-text)' }}
              >
                Teléfono{' '}
                <span className="font-normal text-xs" style={{ color: 'var(--color-text-faint)' }}>(opcional)</span>
              </label>
              <div className="relative group">
                <FaPhone
                  className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--color-text-faint)' }}
                />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange('phone')}
                  placeholder="310 123 4567"
                  className="input-themed pl-11"
                />
              </div>
            </div>

            {/* Motivo */}
            <div>
              <label
                className="block text-sm font-semibold mb-1.5"
                style={{ color: 'var(--color-text)' }}
              >
                Motivo de la solicitud
              </label>
              <div className="relative">
                <FaCommentAlt
                  className="absolute left-4 top-3.5"
                  style={{ color: 'var(--color-text-faint)' }}
                />
                <textarea
                  value={formData.message}
                  onChange={handleChange('message')}
                  placeholder="Cuéntanos por qué necesitas acceso..."
                  rows={4}
                  className="input-themed pl-11 resize-none"
                />
              </div>
            </div>

            {/* Acciones */}
            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="button-gold flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Enviando...' : 'Enviar solicitud'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
                style={{
                  background: 'var(--color-surface-off)',
                  color: 'var(--color-text-muted)',
                  border: '1px solid var(--color-border)',
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </motion.div>

        {/* FIX BUG: /acceso → AUTH_ROUTES.LOGIN */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="text-center text-sm mt-6"
          style={{ color: 'var(--color-text-faint)' }}
        >
          ¿Ya tienes cuenta?{' '}
          <Link
            to={AUTH_ROUTES.LOGIN}
            className="font-semibold transition-colors hover:opacity-80"
            style={{ color: 'var(--tw-primary)' }}
          >
            Inicia sesión aquí
          </Link>
        </motion.p>
      </motion.div>
    </div>
  );
};

export default AccessRequestPage;
