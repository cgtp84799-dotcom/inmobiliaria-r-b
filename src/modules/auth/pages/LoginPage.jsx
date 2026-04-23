// src/modules/auth/pages/LoginPage.jsx
import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../../core/contexts/AuthContext';
// ✅ FIX: ruta corregida — ProtectedRoute vive en shared, no en core/components
import { getHomeRoute } from '../../../shared/components/ProtectedRoute';

const LoginPage = () => {
  const { signIn, userData } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  // La ruta que el usuario intentaba visitar antes de ser redirigido al login.
  // Si no hay ninguna (llegó directamente al login), usamos la ruta por defecto del rol.
  const from = location.state?.from?.pathname ?? null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn(email.trim().toLowerCase(), password);
      // userData puede no estar disponible aún en este frame porque el listener
      // de Firestore es asíncrono. Leemos el rol del resultado de Auth directamente
      // vía el listener, pero como workaround seguro: preferimos `from` si existe,
      // y como fallback usamos /dashboard (la ruta por defecto de admin/member).
      const destination = from ?? '/dashboard';
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src="/logo.jpg.png" alt="Rincón Bedoya" className="h-14 w-auto object-contain" />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
          <h1 className="text-xl font-bold text-white mb-1">Acceso al panel</h1>
          <p className="text-slate-400 text-sm mb-6">Ingresa con tu cuenta de agente o administrador.</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5" htmlFor="email">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary transition"
                placeholder="agente@rinconbedoya.com"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1.5" htmlFor="password">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary transition"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-2.5">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-slate-950 font-semibold py-2.5 rounded-xl hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed mt-1"
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <div className="mt-5 text-center">
            <Link
              to="/acceso-clientes"
              className="text-xs text-slate-500 hover:text-slate-300 transition"
            >
              ¿Eres cliente? Accede a tu portal →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
