import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../core/contexts/AuthContext';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signIn(email, password);
      navigate('/dashboard');
    } catch (error) {
      console.error('Error en login:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Email */}
      <div>
        <label className="block text-light mb-2 text-sm font-semibold">
          Correo electrónico
        </label>
        <div className="relative">
          <FaEnvelope className="absolute left-4 top-3.5 text-primary/50" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="tu@email.com"
            className="w-full bg-dark border border-primary/30 rounded-lg pl-12 pr-4 py-3 text-light focus:border-primary outline-none transition"
          />
        </div>
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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

      {/* Botón */}
      <button
        type="submit"
        disabled={loading}
        className="w-full button-gold py-3 text-base font-bold disabled:opacity-50"
      >
        {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
      </button>

      {/* Nota para crear usuario demo */}
      <p className="text-center text-light/50 text-xs mt-4">
        Demo: crea un usuario desde Firebase Console o usa la función de registro
      </p>
    </form>
  );
};

export default LoginForm;