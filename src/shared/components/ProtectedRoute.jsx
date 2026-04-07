import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../core/contexts/AuthContext';
import { AUTH_ROUTES } from '../../core/config/routes.config';

// Spinner con logo RYB
const LoadingScreen = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 gap-4">
    <img
      src="/logo.jpg.png"
      alt="Rincón Bedoya"
      className="h-16 w-auto object-contain animate-pulse"
    />
    <div className="flex gap-1.5">
      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  </div>
);

// Pantalla de acceso denegado
const AccessDenied = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-950">
    <div className="text-center px-6">
      <div className="text-5xl mb-4">🔒</div>
      <h2 className="text-2xl font-bold text-primary mb-2">Acceso denegado</h2>
      <p className="text-slate-400 mb-6">No tienes permisos para ver esta sección.</p>
      <a
        href="/dashboard"
        className="inline-block bg-primary text-slate-950 font-semibold px-6 py-2.5 rounded-xl hover:opacity-90 transition"
      >
        Volver al panel
      </a>
    </div>
  </div>
);

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { currentUser, userData, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  // FIX: usar AUTH_ROUTES.LOGIN en vez de /acceso (ruta inexistente)
  if (!currentUser) return <Navigate to={AUTH_ROUTES.LOGIN} replace />;

  if (allowedRoles?.length) {
    const role = userData?.role;
    if (!role || !allowedRoles.includes(role)) {
      return <AccessDenied />;
    }
  }

  return children ? children : <Outlet />;
};

export default ProtectedRoute;
