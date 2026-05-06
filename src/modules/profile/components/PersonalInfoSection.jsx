import { useState, useEffect } from 'react';
import { FaUser, FaPhone, FaSave, FaSpinner } from 'react-icons/fa';

const PHONE_REGEX = /^[+\d\s\-()]{7,20}$/;

export default function PersonalInfoSection({ userData, saving, onSave }) {
  const [form, setForm] = useState({ displayName: '', phone: '' });
  const [errors, setErrors] = useState({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (userData) {
      setForm({
        displayName: userData.displayName || '',
        phone: userData.phone || '',
      });
      setDirty(false);
    }
  }, [userData]);

  const validate = () => {
    const e = {};
    if (!form.displayName.trim()) e.displayName = 'El nombre es obligatorio';
    else if (form.displayName.trim().length < 3) e.displayName = 'Mínimo 3 caracteres';
    if (form.phone && !PHONE_REGEX.test(form.phone)) e.phone = 'Teléfono inválido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    await onSave({ displayName: form.displayName.trim(), phone: form.phone.trim() });
    setDirty(false);
  };

  return (
    <section aria-labelledby="personal-info-heading" className="card-soft p-6 border border-[var(--color-border)]">
      <h2 id="personal-info-heading" className="text-lg font-bold text-[var(--color-text)] mb-5 flex items-center gap-2">
        <FaUser className="text-primary" />
        Información personal
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-[var(--color-text)] mb-2">
            Nombre completo <span className="text-red-400">*</span>
          </label>
          <input
            id="displayName"
            type="text"
            value={form.displayName}
            onChange={(e) => handleChange('displayName', e.target.value)}
            placeholder="Juan Pérez"
            aria-describedby={errors.displayName ? 'displayName-error' : undefined}
            aria-invalid={!!errors.displayName}
            className={`w-full bg-[var(--color-surface)] border rounded-xl py-3 px-4 text-light focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all ${
              errors.displayName ? 'border-red-500' : 'border-[var(--color-border)]'
            }`}
          />
          {errors.displayName && (
            <p id="displayName-error" role="alert" className="text-red-400 text-xs mt-1">
              {errors.displayName}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-[var(--color-text)] mb-2">
            Teléfono
          </label>
          <input
            id="phone"
            type="tel"
            value={form.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="+57 310 123 4567"
            aria-describedby={errors.phone ? 'phone-error' : undefined}
            aria-invalid={!!errors.phone}
            className={`w-full bg-[var(--color-surface)] border rounded-xl py-3 px-4 text-light focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all ${
              errors.phone ? 'border-red-500' : 'border-[var(--color-border)]'
            }`}
          />
          {errors.phone && (
            <p id="phone-error" role="alert" className="text-red-400 text-xs mt-1">
              {errors.phone}
            </p>
          )}
        </div>

        {/* El email es solo lectura — es el docId y no cambia */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-[var(--color-text)] mb-2">
            Correo electrónico
          </label>
          <input
            id="email"
            type="email"
            value={userData?.email || ''}
            readOnly
            disabled
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl py-3 px-4 text-[var(--color-text-muted)] cursor-not-allowed"
          />
          <p className="text-[var(--color-text-muted)] text-xs mt-1">
            El correo no se puede modificar — es tu identificador en el sistema.
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving || !dirty}
            className="inline-flex items-center gap-2 px-6 py-2.5 button-gold font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {saving ? (
              <>
                <FaSpinner className="animate-spin" /> Guardando...
              </>
            ) : (
              <>
                <FaSave /> Guardar cambios
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}