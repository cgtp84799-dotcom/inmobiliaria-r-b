// src/modules/users/components/UserEditModal.jsx

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  FaTimes, FaUser, FaLock, FaShieldAlt, FaCheckCircle,
  FaExclamationTriangle, FaEye as FaEyeIcon, FaEyeSlash,
  FaUserShield, FaUsers, FaEye,
} from 'react-icons/fa';
import {
  USER_ROLES,
  USER_ROLE_LABELS,
  USER_ROLE_DESCRIPTIONS,
  USER_ROLE_COLORS,
  USER_STATUS,
  USER_STATUS_LABELS,
  canManageUser,
} from '../types/user.types';


// ─── Constantes ───────────────────────────────────────────────────────────────

// ✅ Factory function en lugar de objeto compartido — evita mutaciones accidentales
const makeEmptyForm = () => ({
  displayName:     '',
  email:           '',
  phone:           '',
  role:            USER_ROLES.MEMBER,
  status:          USER_STATUS.ACTIVE,
  password:        '',
  confirmPassword: '',
});


const getRoleIcon = (role) => {
  switch (role) {
    case USER_ROLES.ADMIN:  return <FaShieldAlt />;
    case USER_ROLES.MEMBER: return <FaUsers />;
    case USER_ROLES.VIEWER: return <FaEye />;        // ← ícono del rol viewer
    default:                return <FaUser />;
  }
};


// ✅ Ahora incluye 'green' para MEMBER — coincide con USER_ROLE_COLORS
const ROLE_STYLE = {
  red:   { border: 'border-red-500',   bg: 'bg-red-500/10',   icon: 'bg-red-500/20 text-red-500',   check: 'text-red-500'   },
  green: { border: 'border-green-500', bg: 'bg-green-500/10', icon: 'bg-green-500/20 text-green-500', check: 'text-green-500' },
  blue:  { border: 'border-blue-500',  bg: 'bg-blue-500/10',  icon: 'bg-blue-500/20 text-blue-500',  check: 'text-blue-500'  },
  slate: { border: 'border-slate-500', bg: 'bg-slate-500/10', icon: 'bg-slate-500/20 text-slate-500', check: 'text-slate-500' },
};


// ─── Componente ───────────────────────────────────────────────────────────────

const UserEditModal = ({ editingUser, isOpen, onClose, onSave, currentUserRole }) => {
  const isEditMode = !!editingUser;

  const [formData, setFormData]         = useState(makeEmptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors]             = useState({});
  const [loading, setLoading]           = useState(false);


  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    setShowPassword(false);
    setFormData(
      isEditMode
        ? {
            displayName:     editingUser.displayName || '',
            email:           editingUser.email       || '',
            phone:           editingUser.phone       || '',
            role:            editingUser.role        || USER_ROLES.MEMBER,
            status:          editingUser.status      || USER_STATUS.ACTIVE,
            password:        '',
            confirmPassword: '',
          }
        : makeEmptyForm()   // ✅ nueva instancia cada vez
    );
  }, [isOpen, editingUser, isEditMode]);


  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);


  const setField = useCallback(
    (field) => (e) => setFormData(prev => ({ ...prev, [field]: e.target.value })),
    []
  );


  const validateForm = () => {
    const e = {};

    if (!formData.displayName.trim())
      e.displayName = 'El nombre es obligatorio';

    if (!formData.email.trim())
      e.email = 'El correo es obligatorio';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      e.email = 'Correo electrónico inválido';

    if (!formData.role)
      e.role = 'Selecciona un rol';
    else if (!canManageUser(currentUserRole, formData.role))
      e.role = 'No tienes permisos para asignar este rol';

    if (!isEditMode) {
      if (!formData.password)
        e.password = 'La contraseña es obligatoria';
      else if (formData.password.length < 6)
        e.password = 'Mínimo 6 caracteres';

      if (formData.password !== formData.confirmPassword)
        e.confirmPassword = 'Las contraseñas no coinciden';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };


  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      await onSave(formData, editingUser);
      onClose();
    } catch (error) {
      const msg = error.message || 'Error al guardar usuario';
      if (msg.toLowerCase().includes('email')) {
        setErrors(prev => ({ ...prev, email: msg }));
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };


  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{    opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          >

            {/* ── Header ── */}
            <div className="bg-gradient-to-r from-primary/20 to-blue-500/20 border-b border-slate-700 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <FaUserShield className="text-primary text-xl" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-light">
                    {isEditMode ? 'Editar usuario' : 'Crear nuevo usuario'}
                  </h2>
                  <p className="text-slate-400 text-sm">
                    {isEditMode
                      ? 'Modifica los datos y permisos del usuario'
                      : 'Completa la información del nuevo miembro del equipo'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Cerrar modal"
                className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-light transition-all flex items-center justify-center"
              >
                <FaTimes />
              </button>
            </div>

            {/* ── Body (scrolleable) ── */}
            <form
              id="user-modal-form"
              onSubmit={handleSubmit}
              className="flex-1 overflow-y-auto p-6 space-y-8"
            >

              {/* Información básica */}
              <section>
                <h3 className="text-base font-semibold text-light mb-4 flex items-center gap-2">
                  <FaUser className="text-primary" />
                  Información básica
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* Nombre */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      Nombre completo <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.displayName}
                      onChange={setField('displayName')}
                      placeholder="Juan Pérez Gómez"
                      className={`w-full bg-slate-800 border rounded-xl py-3 px-4 text-light text-sm
                        focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all
                        ${errors.displayName ? 'border-red-500' : 'border-slate-700 focus:border-primary'}`}
                    />
                    <FieldError msg={errors.displayName} />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      Correo electrónico <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={setField('email')}
                      disabled={isEditMode}
                      placeholder="usuario@ejemplo.com"
                      className={`w-full bg-slate-800 border rounded-xl py-3 px-4 text-light text-sm
                        focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all
                        disabled:opacity-50 disabled:cursor-not-allowed
                        ${errors.email ? 'border-red-500' : 'border-slate-700 focus:border-primary'}`}
                    />
                    <FieldError msg={errors.email} />
                    {isEditMode && (
                      <p className="text-slate-500 text-xs mt-1">
                        El correo no se puede modificar una vez creado el usuario.
                      </p>
                    )}
                  </div>

                  {/* Teléfono */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={setField('phone')}
                      placeholder="+57 310 123 4567"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-light text-sm
                        focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>

                </div>
              </section>

              {/* Credenciales — solo en creación */}
              {!isEditMode && (
                <section>
                  <h3 className="text-base font-semibold text-light mb-4 flex items-center gap-2">
                    <FaLock className="text-primary" />
                    Credenciales de acceso
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {/* Contraseña */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">
                        Contraseña <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={setField('password')}
                          placeholder="••••••••"
                          className={`w-full bg-slate-800 border rounded-xl py-3 px-4 pr-12 text-light text-sm
                            focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all
                            ${errors.password ? 'border-red-500' : 'border-slate-700 focus:border-primary'}`}
                        />
                        {/* ✅ FaEyeIcon (alias) para el toggle — no confunde con el ícono del rol Viewer */}
                        <button
                          type="button"
                          onClick={() => setShowPassword(v => !v)}
                          aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-light transition-colors"
                        >
                          {showPassword ? <FaEyeSlash /> : <FaEyeIcon />}
                        </button>
                      </div>
                      <FieldError msg={errors.password} />
                    </div>

                    {/* Confirmar contraseña */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">
                        Confirmar contraseña <span className="text-red-500">*</span>
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={setField('confirmPassword')}
                        placeholder="••••••••"
                        className={`w-full bg-slate-800 border rounded-xl py-3 px-4 text-light text-sm
                          focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all
                          ${errors.confirmPassword ? 'border-red-500' : 'border-slate-700 focus:border-primary'}`}
                      />
                      <FieldError msg={errors.confirmPassword} />
                    </div>

                  </div>
                </section>
              )}

              {/* Rol y permisos */}
              <section>
                <h3 className="text-base font-semibold text-light mb-4 flex items-center gap-2">
                  <FaShieldAlt className="text-primary" />
                  Rol y permisos
                </h3>

                <div className="space-y-2">
                  {Object.values(USER_ROLES).map(role => {
                    const colorKey   = USER_ROLE_COLORS?.[role] ?? 'slate';
                    const style      = ROLE_STYLE[colorKey] ?? ROLE_STYLE.slate;
                    const isSelected = formData.role === role;
                    const canSelect  = canManageUser(currentUserRole, role);

                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => canSelect && setFormData(prev => ({ ...prev, role }))}
                        disabled={!canSelect}
                        aria-pressed={isSelected}
                        className={`w-full p-4 rounded-xl border-2 text-left transition-all
                          ${isSelected
                            ? `${style.border} ${style.bg}`
                            : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'}
                          ${!canSelect ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${style.icon}`}>
                            {getRoleIcon(role)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-light text-sm">
                                {USER_ROLE_LABELS[role]}
                              </span>
                              {isSelected && (
                                <FaCheckCircle className={`text-xs ${style.check}`} />
                              )}
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed">
                              {USER_ROLE_DESCRIPTIONS[role]}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <FieldError msg={errors.role} />
              </section>

              {/* Estado */}
              <section>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Estado del usuario
                </label>
                <select
                  value={formData.status}
                  onChange={setField('status')}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-light text-sm
                    focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                >
                  {Object.entries(USER_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </section>

            </form>

            {/* ── Footer ── */}
            <div className="border-t border-slate-700 px-6 py-4 flex items-center justify-end gap-3 bg-slate-900/50">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all font-medium text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="user-modal-form"
                disabled={loading}
                className="px-6 py-2.5 button-gold font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-900 border-t-transparent" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <FaCheckCircle />
                    {isEditMode ? 'Guardar cambios' : 'Crear usuario'}
                  </>
                )}
              </button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};


// ─── Subcomponente inline ─────────────────────────────────────────────────────
const FieldError = ({ msg }) =>
  msg ? (
    <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
      <FaExclamationTriangle className="flex-shrink-0" />
      {msg}
    </p>
  ) : null;


export default UserEditModal;