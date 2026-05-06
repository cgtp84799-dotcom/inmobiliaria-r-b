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

// ── Notifica al admin ───────────────────────────────────────────────
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
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });

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

  const card = {
    background: 'var(--color-surface)',
    border:     '1px solid var(--color-border)',
    boxShadow:  'var(--shadow-lg)',
  };
  const inputStyle = {
    background:  'var(--color-input-bg)',
    borderColor: 'var(--color-input-border)',
    color:       'var(--color-input-text)',
  };
  const labelStyle = { color: 'var(--color-text-muted)' };

  // ── Pantalla de éxito ──
  if (sent) {
    return (
      <section className="py-20 px-4 flex justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center rounded-2xl p-10"
          style={card}
        >
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center"
               style={{ background: 'rgba(34,197,94,0.12)' }}>
            <FaCheckCircle className="text-3xl" style={{ color: '#22c55e' }} />
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
            ¡Solicitud enviada!
          </h2>
          <p className="mb-8 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Un administrador revisará tu solicitud y te contactará al correo{' '}
            <span className="font-semibold text-primary">{formData.email}</span>.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-primary text-slate-950 font-bold px-6 py-3 rounded-xl hover:opacity-90 transition text-sm"
          >
            <FaArrowLeft className="text-xs" />
            Volver al inicio
          </Link>
        </motion.div>
      </section>
    );
  }

  return (
    <section className="py-12 px-4 flex justify-center">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-lg w-full"
      >
        {/* Encabezado */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
          >
            <FaUserPlus className="text-slate-950 text-2xl" />
          </div>
          <h1 className="text-3xl font-extrabold mb-1" style={{ color: 'var(--color-text)' }}>
            Solicitar acceso
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Completa el formulario y un administrador revisará tu solicitud.
          </p>
        </div>

        {/* Card formulario */}
        <div className="rounded-2xl p-8" style={card}>
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Nombre */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={labelStyle}>
                Nombre completo <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <FaUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none"
                        style={{ color: 'var(--color-text-faint)' }} />
                <input
                  type="text"
                  value={formData.name}
                  onChange={handleChange('name')}
                  placeholder="Juan Pérez"
                  required
                  className="w-full rounded-xl py-3 pl-10 pr-4 text-sm border outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={labelStyle}>
                Correo electrónico <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <FaEnvelope className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none"
                             style={{ color: 'var(--color-text-faint)' }} />
                <input
                  type="email"
                  value={formData.email}
                  onChange={handleChange('email')}
                  placeholder="tu@correo.com"
                  required
                  className="w-full rounded-xl py-3 pl-10 pr-4 text-sm border outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={labelStyle}>
                Teléfono{' '}
                <span className="text-xs font-normal normal-case" style={{ color: 'var(--color-text-faint)' }}>(opcional)</span>
              </label>
              <div className="relative">
                <FaPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none"
                         style={{ color: 'var(--color-text-faint)' }} />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange('phone')}
                  placeholder="310 123 4567"
                  className="w-full rounded-xl py-3 pl-10 pr-4 text-sm border outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Mensaje */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={labelStyle}>
                Motivo de la solicitud
              </label>
              <div className="relative">
                <FaCommentAlt className="absolute left-3.5 top-3.5 text-sm pointer-events-none"
                              style={{ color: 'var(--color-text-faint)' }} />
                <textarea
                  value={formData.message}
                  onChange={handleChange('message')}
                  placeholder="Cuéntanos por qué necesitas acceso..."
                  rows={4}
                  className="w-full rounded-xl py-3 pl-10 pr-4 text-sm border outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Divisor */}
            <hr style={{ borderColor: 'var(--color-divider)' }} />

            {/* Botones */}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-primary hover:opacity-90 text-slate-950 font-bold py-3 rounded-xl
                           shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed
                           hover:scale-[1.01] active:scale-[0.99] text-sm"
              >
                {loading ? 'Enviando...' : 'Enviar solicitud'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="px-5 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-80"
                style={{
                  background: 'var(--color-surface-off)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-muted)',
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>

        {/* FIX BUG-02: /acceso → AUTH_ROUTES.LOGIN */}
        <p className="text-center text-sm mt-6" style={{ color: 'var(--color-text-faint)' }}>
          ¿Ya tienes cuenta?{' '}
          <Link
            to={AUTH_ROUTES.LOGIN}
            className="font-semibold text-primary hover:opacity-80 transition-opacity"
          >
            Inicia sesión aquí
          </Link>
        </p>
      </motion.div>
    </section>
  );
};

export default AccessRequestPage;