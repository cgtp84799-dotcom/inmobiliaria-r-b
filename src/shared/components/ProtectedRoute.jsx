import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../core/contexts/AuthContext';
import { AUTH_ROUTES } from '../../core/config/routes.config';
import { USER_ROLES } from '../../modules/users/types/user.types';

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

/**
 * ProtectedRoute — guarda rutas privadas.
 *
 * Lógica de redirección según rol:
 *   - No autenticado              → /login
 *   - viewer (cliente)            → si intenta entrar a ruta admin, va a /portal
 *   - admin/member                → acceso normal al dashboard
 *   - allowedRoles especificados  → verifica el rol exacto
 *
 * Props:
 *   clientOnly  — si true, solo permite viewer (para /portal)
 *   agentOnly   — si true, solo permite admin/member (para rutas del panel)
 *   allowedRoles — array de roles permitidos (para rutas muy específicas)
 */
const ProtectedRoute = ({ children, allowedRoles, clientOnly, agentOnly }) => {
  const { currentUser, userData, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  // No autenticado
  if (!currentUser) return <Navigate to={AUTH_ROUTES.LOGIN} replace />;

  const role = userData?.role;
  const validRoles = Object.values(USER_ROLES);

  // Rol no válido
  if (!role || !validRoles.includes(role)) return <AccessDenied />;

  // Ruta solo para clientes (viewer)
  if (clientOnly && role !== USER_ROLES.VIEWER) {
    // Admin/member que intenta ir a /portal → dashboard
    return <Navigate to="/dashboard" replace />;
  }

  // Ruta solo para agentes/admin (panel interno)
  if (agentOnly && role === USER_ROLES.VIEWER) {
    // Cliente que intenta entrar al dashboard → su portal
    return <Navigate to="/portal" replace />;
  }

  // Roles específicos
  if (allowedRoles?.length && !allowedRoles.includes(role)) {
    // viewer intentando entrar a ruta admin-only → su portal
    if (role === USER_ROLES.VIEWER) return <Navigate to="/portal" replace />;
    return <AccessDenied />;
  }

  return children ? children : <Outlet />;
};

export default ProtectedRoute;