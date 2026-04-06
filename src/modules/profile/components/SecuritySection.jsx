import { useState } from 'react';
import { FaLock, FaEye, FaEyeSlash, FaSpinner, FaEnvelope, FaShieldAlt } from 'react-icons/fa';

/** Calcula fortaleza: 0-4 */
function getPasswordStrength(password) {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

const STRENGTH_LABELS = ['', 'Débil', 'Regular', 'Buena', 'Excelente'];
const STRENGTH_COLORS = ['', 'bg-red-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];

export default function SecuritySection({ saving, onChangePassword, onSendReset }) {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [errors, setErrors] = useState({});

  const strength = getPasswordStrength(form.next);

  const toggleShow = (field) => setShow((prev) => ({ ...prev, [field]: !prev[field] }));

  const validate = () => {
    const e = {};
    if (!form.current) e.current = 'Ingresa tu contraseña actual';
    if (!form.next) e.next = 'Ingresa la nueva contraseña';
    else if (form.next.length < 8) e.next = 'Mínimo 8 caracteres';
    else if (strength < 2) e.next = 'La contraseña es demasiado débil';
    if (form.next !== form.confirm) e.confirm = 'Las contraseñas no coinciden';
    if (form.current && form.next && form.current === form.next)
      e.next = 'La nueva contraseña debe ser diferente a la actual';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await onChangePassword({ currentPassword: form.current, newPassword: form.next });
      setForm({ current: '', next: '', confirm: '' });
      setErrors({});
    } catch {
      // el hook ya muestra el toast; solo prevenimos reset del form
    }
  };

  const PasswordInput = ({ id, field, label, required }) => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-2">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show[field] ? 'text' : 'password'}
          value={form[field]}
          onChange={(e) => {
            setForm((prev) => ({ ...prev, [field]: e.target.value }));
            if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
          }}
          aria-invalid={!!errors[field]}
          aria-describedby={errors[field] ? `${id}-error` : undefined}
          className={`w-full bg-slate-800 border rounded-xl py-3 px-4 pr-12 text-light focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all ${
            errors[field] ? 'border-red-500' : 'border-slate-700'
          }`}
        />
        <button
          type="button"
          onClick={() => toggleShow(field)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-light transition-colors"
          aria-label={show[field] ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          {show[field] ? <FaEyeSlash /> : <FaEye />}
        </button>
      </div>
      {errors[field] && (
        <p id={`${id}-error`} role="alert" className="text-red-400 text-xs mt-1">
          {errors[field]}
        </p>
      )}
    </div>
  );

  return (
    <section aria-labelledby="security-heading" className="card-soft p-6 border border-slate-800">
      <h2 id="security-heading" className="text-lg font-bold text-white mb-5 flex items-center gap-2">
        <FaLock className="text-primary" />
        Seguridad
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <PasswordInput id="current-password" field="current" label="Contraseña actual" required />
        <PasswordInput id="new-password" field="next" label="Nueva contraseña" required />

        {/* Indicador de fortaleza */}
        {form.next && (
          <div aria-live="polite">
            <div className="flex gap-1 mb-1">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-all ${
                    i <= strength ? STRENGTH_COLORS[strength] : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-slate-400">
              Fortaleza:{' '}
              <span className={`font-semibold text-${['', 'red', 'yellow', 'blue', 'green'][strength]}-400`}>
                {STRENGTH_LABELS[strength]}
              </span>
            </p>
          </div>
        )}

        <PasswordInput id="confirm-password" field="confirm" label="Confirmar nueva contraseña" required />

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-2.5 button-gold font-semibold disabled:opacity-50"
          >
            {saving ? <FaSpinner className="animate-spin" /> : <FaShieldAlt />}
            {saving ? 'Cambiando...' : 'Cambiar contraseña'}
          </button>

          <button
            type="button"
            onClick={onSendReset}
            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition-all"
          >
            <FaEnvelope className="text-primary" />
            Enviar enlace por email
          </button>
        </div>
      </form>
    </section>
  );
}