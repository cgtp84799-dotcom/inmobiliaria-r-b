import { useState, useEffect } from 'react';
import { FaSun, FaMoon, FaBell, FaSpinner } from 'react-icons/fa';

const DEFAULT_PREFS = {
  emailNotifications: true,
  systemAlerts: true,
  activityUpdates: false,
};

export default function PreferencesSection({ userData, theme, saving, onToggleTheme, onSaveNotifications }) {
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (userData?.notificationPreferences) {
      setPrefs({ ...DEFAULT_PREFS, ...userData.notificationPreferences });
    }
  }, [userData]);

  const handleToggle = (key) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
    setDirty(true);
  };

  const handleSave = async () => {
    await onSaveNotifications(prefs);
    setDirty(false);
  };

  const Toggle = ({ id, label, description, checked, onToggle }) => (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-slate-800 last:border-0">
      <div>
        <label htmlFor={id} className="text-sm font-medium text-slate-200 cursor-pointer">
          {label}
        </label>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onToggle}
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
          checked ? 'bg-primary' : 'bg-slate-700'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
        <span className="sr-only">{checked ? 'Activado' : 'Desactivado'}</span>
      </button>
    </div>
  );

  return (
    <section aria-labelledby="preferences-heading" className="card-soft p-6 border border-slate-800">
      <h2 id="preferences-heading" className="text-lg font-bold text-white mb-5 flex items-center gap-2">
        <FaBell className="text-primary" />
        Preferencias
      </h2>

      {/* Tema */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Apariencia</h3>
        <button
          type="button"
          onClick={onToggleTheme}
          className="flex items-center gap-4 w-full p-4 bg-slate-800/50 hover:bg-slate-800 rounded-xl border border-slate-700 transition-all"
        >
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            {theme === 'dark' ? (
              <FaMoon className="text-primary text-lg" />
            ) : (
              <FaSun className="text-yellow-400 text-lg" />
            )}
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-slate-200">
              Tema {theme === 'dark' ? 'oscuro' : 'claro'}
            </p>
            <p className="text-xs text-slate-500">
              Clic para cambiar a tema {theme === 'dark' ? 'claro' : 'oscuro'}
            </p>
          </div>
        </button>
      </div>

      {/* Notificaciones */}
      <div>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Notificaciones</h3>
        <div className="space-y-0">
          <Toggle
            id="pref-email"
            label="Notificaciones por email"
            description="Recibe alertas importantes en tu correo"
            checked={prefs.emailNotifications}
            onToggle={() => handleToggle('emailNotifications')}
          />
          <Toggle
            id="pref-system"
            label="Alertas del sistema"
            description="Notificaciones dentro de la plataforma"
            checked={prefs.systemAlerts}
            onToggle={() => handleToggle('systemAlerts')}
          />
          <Toggle
            id="pref-activity"
            label="Actualizaciones de actividad"
            description="Cambios en propiedades y clientes asignados"
            checked={prefs.activityUpdates}
            onToggle={() => handleToggle('activityUpdates')}
          />
        </div>

        <div className="flex justify-end mt-4">
          <button
            type="button"
            disabled={saving || !dirty}
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-6 py-2.5 button-gold font-semibold disabled:opacity-50 transition-all"
          >
            {saving ? <FaSpinner className="animate-spin" /> : null}
            {saving ? 'Guardando...' : 'Guardar preferencias'}
          </button>
        </div>
      </div>
    </section>
  );
}