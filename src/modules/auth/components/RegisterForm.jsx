import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../core/contexts/AuthContext';
import { FaEnvelope, FaLock, FaUser, FaEye, FaEyeSlash } from 'react-icons/fa';
import toast from 'react-hot-toast';

const RegisterForm = () => {
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const { signUp }  = useAuth();
  const navigate    = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    // Firebase rechaza < 6 chars con un error opaco.
    if (!formData.email.trim() || !formData.email.includes('@')) {
      toast.error('Correo inválido');
      return;
    }
    if (formData.password.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      // signUp espera (email, password, displayName: string)
      await signUp(formData.email, formData.password, formData.displayName);
      navigate('/dashboard');
    } catch (error) {
      // AuthContext ya lanza el mensaje localizado — solo mostrarlo
      toast.error(error.message || 'Error al crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Nombre */}
      <div>
        <label className="block text-light mb-2 text-sm font-semibold">
          Nombre completo
        </label>
        <div className="relative">
          <FaUser className="absolute left-4 top-3.5 text-primary/50" />
          <input
            type="text"
            name="displayName"
            value={formData.displayName}
            onChange={handleChange}
            required
            placeholder="Tu nombre"
            className="w-full bg-dark border border-primary/30 rounded-lg pl-12 pr-4 py-3 text-light focus:border-primary outline-none transition"
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="block text-light mb-2 text-sm font-semibold">
          Correo electrónico
        </label>
        <div className="relative">
          <FaEnvelope className="absolute left-4 top-3.5 text-primary/50" />
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="tu@email.com"
            className="w-full bg-dark border border-primary/30 rounded-lg pl-12 pr-4 py-3 text-light focus:border-primary outline-none transition"
          />
        </div>
      </div>

      {/* Rol eliminado — AuthContext siempre asigna 'viewer' en el registro.
          El admin asigna el rol real desde UsersPage después de aprobar. */}

      {/* Password */}
      <div>
        <label className="block text-light mb-2 text-sm font-semibold">
          Contraseña
        </label>
        <div className="relative">
          <FaLock className="absolute left-4 top-3.5 text-primary/50" />
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            placeholder="••••••••"
            className="w-full bg-dark border border-primary/30 rounded-lg pl-12 pr-12 py-3 text-light focus:border-primary outline-none transition"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-3.5 text-primary/50 hover:text-primary"
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>
      </div>

      {/* Confirmar Password */}
      <div>
        <label className="block text-light mb-2 text-sm font-semibold">
          Confirmar contraseña
        </label>
        <div className="relative">
          <FaLock className="absolute left-4 top-3.5 text-primary/50" />
          <input
            type={showPassword ? 'text' : 'password'}
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            placeholder="••••••••"
            className="w-full bg-dark border border-primary/30 rounded-lg pl-12 pr-4 py-3 text-light focus:border-primary outline-none transition"
          />
        </div>
      </div>

      {/* Info — expectativa honesta para el usuario */}
      <p className="text-xs text-light/50 text-center">
        Tu cuenta quedará pendiente de aprobación por un administrador.
      </p>

      {/* Botón */}
      <button
        type="submit"
        disabled={loading}
        className="w-full button-gold py-3 text-base font-bold disabled:opacity-50"
      >
        {loading ? 'Creando cuenta...' : 'Crear cuenta'}
      </button>

    </form>
  );
};

export default RegisterForm;