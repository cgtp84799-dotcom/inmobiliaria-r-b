// src/modules/clients/components/portal/SectionPerfil.jsx

import { useState, useEffect } from 'react';
import {
  FaUser, FaPhone, FaEnvelope, FaMapMarkerAlt,
  FaSave, FaSpinner, FaCheckCircle, FaLock, FaHome,
} from 'react-icons/fa';
import { sendPasswordResetEmail } from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../../../core/config/firebase.config';
import { useAuth } from '../../../../core/contexts/AuthContext';
import toast from 'react-hot-toast';

function getInitials(name = '') {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
}

export default function SectionPerfil({ clientData, clientId, onSave }) {
  const { currentUser } = useAuth();
  const isGoogle  = currentUser?.providerData?.[0]?.providerId === 'google.com';
  const photo     = currentUser?.photoURL;
  const email     = currentUser?.email || '';

  const [form, setForm] = useState({
    nombre:           '',
    telefono:         '',
    ubicacionInteres: '',
    presupuesto:      '',
    tipoPropiedad:    '',
  });
  const [saving,     setSaving]     = useState(false);
  const [resetSent,  setResetSent]  = useState(false);

  // Sincronizar form cuando llegan los datos del cliente
  useEffect(() => {
    if (!clientData) return;
    setForm({
      nombre:           clientData.nombre           || currentUser?.displayName || '',
      telefono:         clientData.telefono         || '',
      ubicacionInteres: clientData.ubicacionInteres || '',
      presupuesto:      clientData.presupuesto      || '',
      tipoPropiedad:    clientData.tipoPropiedad    || '',
    });
  // Solo re-sincronizar cuando cambia el id del cliente (nueva sesión)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientData?.id]);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSave() {
    setSaving(true);
    try {
      const updates = {
        nombre:           form.nombre.trim(),
        telefono:         form.telefono.trim(),
        ubicacionInteres: form.ubicacionInteres.trim(),
        presupuesto:      form.presupuesto.trim(),
        tipoPropiedad:    form.tipoPropiedad,
        updatedAt:        serverTimestamp(),
      };

      // 1. Actualizar clients/{clientId}
      if (clientId) {
        await updateDoc(doc(db, 'clients', clientId), updates);
      }

      // 2. Actualizar users/{email} (displayName + phone)
      if (email) {
        await updateDoc(doc(db, 'users', email), {
          displayName: form.nombre.trim(),
          phone:       form.telefono.trim(),
          updatedAt:   serverTimestamp(),
        });
      }

      toast.success('Perfil actualizado');
      onSave?.();
    } catch (err) {
      console.error('SectionPerfil handleSave:', err);
      toast.error('Error al guardar cambios');
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordReset() {
    if (!email) return;
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
      toast.success('Email de restablecimiento enviado');
    } catch {
      toast.error('Error al enviar el email');
    }
  }

  const name = form.nombre || email.split('@')[0] || '?';

  const inputClass = `
    w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-2.5 text-sm
    text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60
    focus:ring-1 focus:ring-amber-500/30 transition
  `;

  return (
    <div className="space-y-6 max-w-lg">
      <h2 className="text-lg font-bold text-white">Mi perfil</h2>

      {/* Avatar */}
      <div className="flex items-center gap-4">
        {photo ? (
          <img
            src={photo}
            alt={name}
            className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-500/30"
          />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border-2 border-amber-500/20 flex items-center justify-center text-amber-400 text-xl font-bold">
            {getInitials(name)}
          </div>
        )}
        <div>
          <p className="text-white font-semibold">{name}</p>
          <p className="text-slate-500 text-sm">{email}</p>
          {isGoogle && (
            <span className="text-xs text-blue-400 mt-0.5 block">Cuenta de Google</span>
          )}
        </div>
      </div>

      {/* Datos personales */}
      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Datos personales</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">
              Nombre completo
            </label>
            <div className="relative">
              <FaUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none" />
              <input
                value={form.nombre}
                onChange={update('nombre')}
                className={`${inputClass} pl-9`}
                placeholder="Tu nombre completo"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">Teléfono</label>
            <div className="relative">
              <FaPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none" />
              <input
                value={form.telefono}
                onChange={update('telefono')}
                className={`${inputClass} pl-9`}
                placeholder="Ej: 3001234567"
                type="tel"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">Email</label>
            <div className="relative">
              <FaEnvelope className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none" />
              <input
                value={email}
                disabled
                className={`${inputClass} pl-9 cursor-not-allowed opacity-50`}
              />
            </div>
            <p className="text-[11px] text-slate-600 mt-1">El email no se puede modificar</p>
          </div>
        </div>
      </div>

      {/* Preferencias */}
      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Preferencias de búsqueda</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Zona de interés</label>
            <div className="relative">
              <FaMapMarkerAlt className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none" />
              <input
                value={form.ubicacionInteres}
                onChange={update('ubicacionInteres')}
                placeholder="Ej: Laureles, El Poblado"
                className={`${inputClass} pl-9`}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Presupuesto máximo</label>
            <input
              value={form.presupuesto}
              onChange={update('presupuesto')}
              placeholder="Ej: 500.000.000"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Tipo de propiedad</label>
            <div className="relative">
              <FaHome className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none" />
              <select
                value={form.tipoPropiedad}
                onChange={update('tipoPropiedad')}
                className={`${inputClass} pl-9`}
              >
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
        </div>
      </div>

      {/* Botón guardar */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-sm transition shadow-lg shadow-amber-500/20 disabled:opacity-60"
      >
        {saving ? <FaSpinner className="animate-spin" /> : <FaSave />}
        {saving ? 'Guardando...' : 'Guardar cambios'}
      </button>

      {/* Seguridad — solo si no es Google */}
      {!isGoogle && (
        <div className="border-t border-slate-800 pt-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
            <FaLock className="text-slate-500 text-xs" /> Seguridad
          </h3>
          {resetSent ? (
            <p className="text-emerald-400 text-sm flex items-center gap-1.5">
              <FaCheckCircle /> Email enviado. Revisa tu bandeja de entrada.
            </p>
          ) : (
            <button
              onClick={handlePasswordReset}
              className="text-sm text-amber-400 hover:underline"
            >
              Cambiar contraseña →
            </button>
          )}
        </div>
      )}
    </div>
  );
}