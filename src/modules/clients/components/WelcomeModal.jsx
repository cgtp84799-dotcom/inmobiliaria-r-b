// src/modules/clients/components/WelcomeModal.jsx
//
// FIX: updateProfile necesita el objeto Auth User puro de Firebase,
// no el currentUser del contexto (que ahora ES el Auth User puro, pero
// por seguridad importamos auth directamente y usamos auth.currentUser).

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaUser, FaPhone, FaMapMarkerAlt, FaHome,
  FaCheckCircle, FaTimes, FaArrowRight, FaSpinner,
} from 'react-icons/fa';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../../core/config/firebase.config';
import { useAuth } from '../../../core/contexts/AuthContext';
import toast from 'react-hot-toast';

const STEPS = ['bienvenida', 'perfil', 'preferencias', 'listo'];

export default function WelcomeModal({ clientId, clientData, onDone }) {
  const { currentUser } = useAuth();

  const [step,    setStep]    = useState(0);
  const [saving,  setSaving]  = useState(false);
  const [form,    setForm]    = useState({
    nombre:           clientData?.nombre || currentUser?.displayName || '',
    telefono:         clientData?.telefono || '',
    ubicacionInteres: clientData?.ubicacionInteres || '',
    presupuesto:      clientData?.presupuesto || '',
    tipoPropiedad:    clientData?.tipoPropiedad || '',
  });

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleFinish() {
    setSaving(true);
    try {
      // ★ FIX (auditoría — duplicación reportada): antes de actualizar el doc,
      // forzamos un resolveClientByEmail que dedupera duplicados creados por
      // race conditions previas. Esto garantiza que escribimos en EL doc real,
      // no en uno fantasma que el panel mostraría como cliente separado.
      const { resolveClientByEmail } = await import('../services/client.portal.service');
      const email = currentUser?.email || auth.currentUser?.email;
      let realClientId = clientId;
      if (email) {
        try {
          const resolved = await resolveClientByEmail(email);
          realClientId = resolved.id;
        } catch (e) {
          console.warn('[WelcomeModal] resolveClientByEmail falló, usando clientId del prop:', e?.message);
        }
      }

      // Actualizar documento de cliente
      if (realClientId) {
        await updateDoc(doc(db, 'clients', realClientId), {
          nombre:           form.nombre.trim() || clientData?.nombre,
          telefono:         form.telefono.trim(),
          ubicacionInteres: form.ubicacionInteres.trim(),
          presupuesto:      form.presupuesto.trim(),
          tipoPropiedad:    form.tipoPropiedad,
          onboardingDone:   true,
          updatedAt:        serverTimestamp(),
        });
      }

      // FIX: Usar auth.currentUser (el objeto Auth puro) en vez de currentUser del contexto.
      // auth.currentUser siempre es el Firebase Auth User con getIdToken(), etc.
      const authUser = auth.currentUser;
      if (authUser && form.nombre.trim() && form.nombre.trim() !== authUser.displayName) {
        await updateProfile(authUser, { displayName: form.nombre.trim() });
      }

      // Actualizar users/{email}
      if (email) {
        await updateDoc(doc(db, 'users', email), {
          displayName: form.nombre.trim() || currentUser?.displayName,
          phone:       form.telefono.trim(),
          updatedAt:   serverTimestamp(),
        });
      }

      setStep(STEPS.indexOf('listo'));
    } catch (err) {
      console.error('WelcomeModal handleFinish:', err);
      toast.error('Error al guardar. Puedes completarlo más tarde en tu perfil.');
      onDone(); // No bloquear al usuario
    } finally {
      setSaving(false);
    }
  }

  async function handleSkip() {
    // ★ FIX (auditoría — duplicación reportada): igual que handleFinish,
    // forzamos dedup antes de marcar onboardingDone.
    try {
      const { resolveClientByEmail } = await import('../services/client.portal.service');
      const email = currentUser?.email || auth.currentUser?.email;
      let realClientId = clientId;
      if (email) {
        try {
          const resolved = await resolveClientByEmail(email);
          realClientId = resolved.id;
        } catch { /* fallback al clientId del prop */ }
      }
      if (realClientId) {
        await updateDoc(doc(db, 'clients', realClientId), {
          onboardingDone: true,
          updatedAt: serverTimestamp(),
        });
      }
    } catch { /* silencioso — no bloquear UX */ }
    onDone();
  }

  const inputClass = `
    w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-3 text-sm
    text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60
    focus:ring-1 focus:ring-amber-500/30 transition
  `;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      />

      <motion.div
        className="relative z-10 w-full max-w-md bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden"
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className="h-1 bg-slate-800">
          <motion.div
            className="h-full bg-amber-500"
            animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>

        <div className="p-7">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="bienvenida" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }}>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">👋</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">¡Bienvenido al portal!</h2>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Tarda menos de 2 minutos en configurar tu perfil para que podamos mostrarte
                    las propiedades que más te interesan.
                  </p>
                </div>
                <div className="space-y-3 mb-6">
                  {[
                    { icon: '❤️', text: 'Guarda propiedades favoritas' },
                    { icon: '📅', text: 'Agenda y gestiona tus visitas' },
                    { icon: '📄', text: 'Accede a tus contratos' },
                    { icon: '🔔', text: 'Recibe notificaciones personalizadas' },
                  ].map((f, i) => (
                    <div key={i} className="flex items-center gap-3 bg-slate-800/40 rounded-xl px-4 py-3">
                      <span className="text-base">{f.icon}</span>
                      <span className="text-sm text-slate-300">{f.text}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => setStep(1)}
                  className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 rounded-xl transition shadow-lg shadow-amber-500/20">
                  Configurar mi perfil <FaArrowRight className="text-xs" />
                </button>
                <button onClick={handleSkip}
                  className="w-full mt-2 text-sm text-slate-500 hover:text-slate-400 py-2 transition">
                  Omitir por ahora
                </button>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="perfil" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center">
                    <FaUser className="text-amber-400 text-sm" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold">Tus datos</h3>
                    <p className="text-slate-500 text-xs">Para identificarte y contactarte</p>
                  </div>
                </div>
                <div className="space-y-3 mb-6">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5 font-medium">Nombre completo</label>
                    <div className="relative">
                      <FaUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none" />
                      <input value={form.nombre} onChange={update('nombre')} placeholder="Tu nombre completo"
                        className={`${inputClass} pl-9`} autoComplete="name" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5 font-medium">Teléfono (opcional)</label>
                    <div className="relative">
                      <FaPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none" />
                      <input value={form.telefono} onChange={update('telefono')} placeholder="Ej: 3001234567" type="tel"
                        className={`${inputClass} pl-9`} autoComplete="tel" />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setStep(0)}
                    className="flex-1 py-3 rounded-xl border border-slate-700/60 text-slate-400 hover:text-white hover:border-slate-600 text-sm transition">
                    Atrás
                  </button>
                  <button onClick={() => setStep(2)}
                    className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 rounded-xl transition">
                    Continuar <FaArrowRight className="text-xs" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="preferencias" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center">
                    <FaHome className="text-amber-400 text-sm" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold">¿Qué buscas?</h3>
                    <p className="text-slate-500 text-xs">Así encontramos lo que más te conviene</p>
                  </div>
                </div>
                <div className="space-y-3 mb-6">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5 font-medium">Zona de interés</label>
                    <div className="relative">
                      <FaMapMarkerAlt className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none" />
                      <input value={form.ubicacionInteres} onChange={update('ubicacionInteres')}
                        placeholder="Ej: Laureles, El Poblado, Envigado" className={`${inputClass} pl-9`} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5 font-medium">Presupuesto máximo (opcional)</label>
                    <input value={form.presupuesto} onChange={update('presupuesto')}
                      placeholder="Ej: 500.000.000" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5 font-medium">Tipo de propiedad</label>
                    <select value={form.tipoPropiedad} onChange={update('tipoPropiedad')} className={inputClass}>
                      <option value="">Sin preferencia</option>
                      <option value="Apartamento">Apartamento</option>
                      <option value="Casa">Casa</option>
                      <option value="Local">Local comercial</option>
                      <option value="Oficina">Oficina</option>
                      <option value="Lote">Lote</option>
                      <option value="Bodega">Bodega</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setStep(1)}
                    className="flex-1 py-3 rounded-xl border border-slate-700/60 text-slate-400 hover:text-white hover:border-slate-600 text-sm transition">
                    Atrás
                  </button>
                  <button onClick={handleFinish} disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 rounded-xl transition disabled:opacity-60">
                    {saving ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
                    {saving ? 'Guardando...' : 'Guardar y entrar'}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="listo" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }} className="text-center py-4">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                  className="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-5">
                  <FaCheckCircle className="text-emerald-400 text-3xl" />
                </motion.div>
                <h2 className="text-2xl font-bold text-white mb-2">¡Todo listo!</h2>
                <p className="text-slate-400 text-sm mb-6">
                  Tu perfil está configurado. Ya puedes explorar propiedades y gestionar tus visitas.
                </p>
                <button onClick={onDone}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 rounded-xl transition shadow-lg shadow-amber-500/20">
                  Ir a mi portal →
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}