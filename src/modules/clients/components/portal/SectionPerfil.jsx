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
    w-full rounded-xl px-4 py-2.5 text-sm transition
    bg-[var(--color-input-bg)] border border-[var(--color-input-border)]
    text-[var(--color-text)] placeholder:text-[var(--color-text-faint)]
    focus:outline-none focus:border-[var(--color-input-focus)]
    focus:ring-1 focus:ring-[var(--color-input-focus)]
  `;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2
          className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight"
          style={{ color: 'var(--color-text)' }}
        >
          Mi perfil
        </h2>
        <p
          className="text-sm mt-1"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Mantén tus datos al día para que podamos ayudarte mejor.
        </p>
      </div>

      {/* Tarjeta principal */}
      <div
        className="rounded-2xl border p-5 sm:p-7 space-y-7"
        style={{
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        {/* Avatar + nombre */}
        <div className="flex items-center gap-4">
          {photo ? (
            <img
              src={photo}
              alt={name}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover"
              style={{ border: '2px solid var(--color-gold)' }}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-xl sm:text-2xl font-bold"
              style={{
                background:
                  'linear-gradient(135deg, var(--color-gold-soft), var(--color-gold))',
                color: 'var(--color-bg)',
              }}
            >
              {getInitials(name)}
            </div>
          )}
          <div className="min-w-0">
            <p
              className="font-semibold truncate text-base sm:text-lg"
              style={{ color: 'var(--color-text)' }}
            >
              {name}
            </p>
            <p
              className="text-sm truncate"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {email}
            </p>
            {isGoogle && (
              <span
                className="text-xs mt-0.5 inline-flex items-center gap-1"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <FaCheckCircle className="text-[10px]" /> Cuenta de Google
              </span>
            )}
          </div>
        </div>

        {/* Datos personales */}
        <div>
          <h3
            className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Datos personales
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label
                className="block text-xs mb-1.5 font-medium"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Nombre completo
              </label>
              <div className="relative">
                <FaUser
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none"
                  style={{ color: 'var(--color-text-muted)' }}
                />
                <input
                  value={form.nombre}
                  onChange={update('nombre')}
                  className={`${inputClass} pl-9`}
                  placeholder="Tu nombre completo"
                />
              </div>
            </div>
            <div>
              <label
                className="block text-xs mb-1.5 font-medium"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Teléfono
              </label>
              <div className="relative">
                <FaPhone
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none"
                  style={{ color: 'var(--color-text-muted)' }}
                />
                <input
                  value={form.telefono}
                  onChange={update('telefono')}
                  className={`${inputClass} pl-9`}
                  placeholder="Ej: 3001234567"
                  type="tel"
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label
                className="block text-xs mb-1.5 font-medium"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Email
              </label>
              <div className="relative">
                <FaEnvelope
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none"
                  style={{ color: 'var(--color-text-muted)' }}
                />
                <input
                  value={email}
                  disabled
                  className={`${inputClass} pl-9 cursor-not-allowed opacity-60`}
                />
              </div>
              <p
                className="text-[11px] mt-1"
                style={{ color: 'var(--color-text-faint)' }}
              >
                El email no se puede modificar.
              </p>
            </div>
          </div>
        </div>

        {/* Preferencias */}
        <div>
          <h3
            className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Preferencias de búsqueda
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label
                className="block text-xs mb-1.5"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Zona de interés
              </label>
              <div className="relative">
                <FaMapMarkerAlt
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none"
                  style={{ color: 'var(--color-text-muted)' }}
                />
                <input
                  value={form.ubicacionInteres}
                  onChange={update('ubicacionInteres')}
                  placeholder="Ej: Laureles, El Poblado"
                  className={`${inputClass} pl-9`}
                />
              </div>
            </div>
            <div>
              <label
                className="block text-xs mb-1.5"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Presupuesto máximo
              </label>
              <input
                value={form.presupuesto}
                onChange={update('presupuesto')}
                placeholder="Ej: 500.000.000"
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label
                className="block text-xs mb-1.5"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Tipo de propiedad
              </label>
              <div className="relative">
                <FaHome
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none"
                  style={{ color: 'var(--color-text-muted)' }}
                />
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
        <div className="flex justify-end pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl text-sm transition disabled:opacity-60"
            style={{
              background: 'var(--color-gold)',
              color: 'var(--color-bg)',
              boxShadow: '0 4px 12px rgba(180, 83, 9, 0.18)',
            }}
          >
            {saving ? <FaSpinner className="animate-spin" /> : <FaSave />}
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      {/* Seguridad — solo si no es Google — fuera de la card principal */}
      {!isGoogle && (
        <div
          className="rounded-2xl border p-5 sm:p-6"
          style={{
            background: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
          }}
        >
          <h3
            className="text-sm font-semibold mb-2 flex items-center gap-2"
            style={{ color: 'var(--color-text)' }}
          >
            <FaLock
              className="text-xs"
              style={{ color: 'var(--color-text-muted)' }}
            />
            Seguridad
          </h3>
          <p
            className="text-sm mb-3"
            style={{ color: 'var(--color-text-muted)' }}
          >
            ¿Quieres cambiar tu contraseña? Te enviamos un enlace seguro a tu email.
          </p>
          {resetSent ? (
            <p
              className="text-sm flex items-center gap-1.5"
              style={{ color: '#10b981' }}
            >
              <FaCheckCircle /> Email enviado. Revisa tu bandeja de entrada.
            </p>
          ) : (
            <button
              onClick={handlePasswordReset}
              className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
              style={{ color: 'var(--color-gold)' }}
            >
              Cambiar contraseña →
            </button>
          )}
        </div>
      )}
    </div>
  );
}