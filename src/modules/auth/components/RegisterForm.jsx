import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../core/contexts/AuthContext';
import { FaEnvelope, FaLock, FaUser, FaEye, FaEyeSlash } from 'react-icons/fa';

const RegisterForm = () => {
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'agent'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);

    try {
      await signUp(formData.email, formData.password, {
        displayName: formData.displayName,
        role: formData.role,
        permissions: {
          properties: ['create', 'read', 'update'],
          clients: ['read', 'update'],
          documents: ['read'],
          chat: ['access']
        }
      });
      navigate('/dashboard');
    } catch (error) {
      console.error('Error en registro:', error);
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

      {/* Rol */}
      <div>
        <label className="block text-light mb-2 text-sm font-semibold">
          Rol
        </label>
        <select
          name="role"
          value={formData.role}
          onChange={handleChange}
          className="w-full bg-dark border border-primary/30 rounded-lg px-4 py-3 text-light focus:border-primary outline-none"
        >
          <option value="agent">Agente</option>
          <option value="lawyer">Abogado</option>
          <option value="admin">Administrador</option>
        </select>
      </div>

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