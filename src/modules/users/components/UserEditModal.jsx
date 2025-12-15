// src/modules/users/components/UserEditModal.jsx

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaTimes, FaUser, FaEnvelope, FaPhone, FaShieldAlt, 
  FaCheckCircle, FaExclamationTriangle, FaLock, FaEye, FaEyeSlash,
  FaUserShield, FaUsers, FaUsersCog, FaEye as FaEyeIcon
} from 'react-icons/fa';
import { 
  USER_ROLES, USER_ROLE_LABELS, USER_ROLE_DESCRIPTIONS, 
  USER_ROLE_COLORS, USER_STATUS, USER_STATUS_LABELS,
  canManageUser 
} from '../types/user.types';

const UserEditModal = ({ 
  user, 
  isOpen, 
  onClose, 
  onSave, 
  currentUserRole,
  mode = 'edit' // 'edit' o 'create'
}) => {
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    phone: '',
    role: USER_ROLES.MEMBER,
    status: USER_STATUS.ACTIVE,
    password: '',
    confirmPassword: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && mode === 'edit') {
      setFormData({
        displayName: user.displayName || '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role || USER_ROLES.MEMBER,
        status: user.status || USER_STATUS.ACTIVE,
        password: '',
        confirmPassword: ''
      });
    } else if (mode === 'create') {
      setFormData({
        displayName: '',
        email: '',
        phone: '',
        role: USER_ROLES.MEMBER,
        status: USER_STATUS.ACTIVE,
        password: '',
        confirmPassword: ''
      });
    }
    setErrors({});
  }, [user, mode, isOpen]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.displayName.trim()) {
      newErrors.displayName = 'El nombre es obligatorio';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'El email es obligatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (!formData.role) {
      newErrors.role = 'Selecciona un rol';
    }

    if (mode === 'create') {
      if (!formData.password) {
        newErrors.password = 'La contraseña es obligatoria';
      } else if (formData.password.length < 6) {
        newErrors.password = 'Mínimo 6 caracteres';
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Las contraseñas no coinciden';
      }
    }

    // Verificar si puede asignar este rol
    if (mode === 'edit' && user && !canManageUser(currentUserRole, formData.role)) {
      newErrors.role = 'No tienes permisos para asignar este rol';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error guardando usuario:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case USER_ROLES.SUPER_ADMIN:
      case USER_ROLES.ADMIN:
        return <FaShieldAlt />;
      case USER_ROLES.MANAGER:
        return <FaUsersCog />;
      case USER_ROLES.MEMBER:
        return <FaUsers />;
      case USER_ROLES.VIEWER:
        return <FaEyeIcon />;
      default:
        return <FaUser />;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-primary/20 to-blue-500/20 border-b border-slate-700 px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <FaUserShield className="text-primary text-xl" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-light">
                  {mode === 'create' ? 'Crear Nuevo Usuario' : 'Editar Usuario'}
                </h2>
                <p className="text-slate-400 text-sm">
                  {mode === 'create' 
                    ? 'Completa la información del nuevo miembro del equipo' 
                    : 'Modifica los datos y permisos del usuario'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-light transition-all flex items-center justify-center"
            >
              <FaTimes />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Información básica */}
            <div>
              <h3 className="text-lg font-semibold text-light mb-4 flex items-center gap-2">
                <FaUser className="text-primary" />
                Información Básica
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nombre */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Nombre completo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                    className={`w-full bg-slate-800 border ${errors.displayName ? 'border-red-500' : 'border-slate-700'} rounded-xl py-3 px-4 text-light focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all`}
                    placeholder="Juan Pérez Gómez"
                  />
                  {errors.displayName && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <FaExclamationTriangle /> {errors.displayName}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Correo electrónico <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    disabled={mode === 'edit'}
                    className={`w-full bg-slate-800 border ${errors.email ? 'border-red-500' : 'border-slate-700'} rounded-xl py-3 px-4 text-light focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                    placeholder="usuario@ejemplo.com"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <FaExclamationTriangle /> {errors.email}
                    </p>
                  )}
                  {mode === 'edit' && (
                    <p className="text-slate-500 text-xs mt-1">
                      El email no se puede cambiar después de crear el usuario
                    </p>
                  )}
                </div>

                {/* Teléfono */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-light focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="+57 310 123 4567"
                  />
                </div>
              </div>
            </div>

            {/* Contraseña (solo en creación) */}
            {mode === 'create' && (
              <div>
                <h3 className="text-lg font-semibold text-light mb-4 flex items-center gap-2">
                  <FaLock className="text-primary" />
                  Credenciales de Acceso
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Contraseña <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        className={`w-full bg-slate-800 border ${errors.password ? 'border-red-500' : 'border-slate-700'} rounded-xl py-3 px-4 pr-12 text-light focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all`}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-light transition-colors"
                      >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <FaExclamationTriangle /> {errors.password}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Confirmar contraseña <span className="text-red-500">*</span>
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className={`w-full bg-slate-800 border ${errors.confirmPassword ? 'border-red-500' : 'border-slate-700'} rounded-xl py-3 px-4 text-light focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all`}
                      placeholder="••••••••"
                    />
                    {errors.confirmPassword && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <FaExclamationTriangle /> {errors.confirmPassword}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Rol y permisos */}
            <div>
              <h3 className="text-lg font-semibold text-light mb-4 flex items-center gap-2">
                <FaShieldAlt className="text-primary" />
                Rol y Permisos
              </h3>
              
              <div className="space-y-3">
                {Object.values(USER_ROLES).map(role => {
                  const color = USER_ROLE_COLORS[role];
                  const isSelected = formData.role === role;
                  const canSelect = canManageUser(currentUserRole, role);
                  
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => canSelect && setFormData(prev => ({ ...prev, role }))}
                      disabled={!canSelect}
                      className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                        isSelected
                          ? `border-${color}-500 bg-${color}-500/10`
                          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                      } ${!canSelect ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg bg-${color}-500/20 flex items-center justify-center flex-shrink-0 text-${color}-500`}>
                          {getRoleIcon(role)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-light">
                              {USER_ROLE_LABELS[role]}
                            </span>
                            {isSelected && (
                              <FaCheckCircle className={`text-${color}-500`} />
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
              {errors.role && (
                <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
                  <FaExclamationTriangle /> {errors.role}
                </p>
              )}
            </div>

            {/* Estado */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Estado del usuario
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-light focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              >
                {Object.entries(USER_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </form>

          {/* Footer */}
          <div className="border-t border-slate-700 px-6 py-4 flex items-center justify-end gap-3 bg-slate-900/50">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2.5 button-gold font-semibold disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-900 border-t-transparent" />
                  Guardando...
                </>
              ) : (
                <>
                  <FaCheckCircle />
                  {mode === 'create' ? 'Crear Usuario' : 'Guardar Cambios'}
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default UserEditModal;