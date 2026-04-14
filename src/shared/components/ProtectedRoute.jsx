// src/shared/components/ProtectedRoute.jsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth }    from '../../core/contexts/AuthContext';
import { USER_ROLES } from '../../modules/users/types/user.types';
import { PRIVATE_ROUTES, PUBLIC_ROUTES } from '../../core/config/routes.config';

// ─── Pantalla de carga ─────────────────────────────────────────────────────────
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

// ─── Acceso denegado (agente sin permisos suficientes) ─────────────────────────
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

// ─── Helpers de ruta ───────────────────────────────────────────────────────────

/** Ruta de login según el rol */
const LOGIN_BY_ROLE = {
  [USER_ROLES.VIEWER]: PUBLIC_ROUTES.CLIENT_AUTH,
  default:             '/login',
};

export const getLoginRoute = (role) =>
  LOGIN_BY_ROLE[role] ?? LOGIN_BY_ROLE.default;

/** Ruta de inicio después del login según el rol */
const HOME_BY_ROLE = {
  [USER_ROLES.ADMIN]:  PRIVATE_ROUTES.DASHBOARD,
  [USER_ROLES.MEMBER]: PRIVATE_ROUTES.DASHBOARD,
  [USER_ROLES.VIEWER]: PRIVATE_ROUTES.CLIENT_PORTAL,
  default:             '/login',
};

export const getHomeRoute = (role) =>
  HOME_BY_ROLE[role] ?? HOME_BY_ROLE.default;

// ─── ProtectedRoute ────────────────────────────────────────────────────────────
const ProtectedRoute = ({
  children,
  allowedRoles,
  clientOnly = false,
  agentOnly  = false,
  redirectTo,
}) => {
  const { currentUser, userData, loading } = useAuth();
  const location = useLocation();

  // 1. Auth aún resolviendo
  if (loading) return <LoadingScreen />;

  // 2. No autenticado → inferir qué login mostrar
  if (!currentUser) {
    const isPortalRoute = location.pathname.startsWith('/portal');
    const loginRoute    = isPortalRoute
      ? PUBLIC_ROUTES.CLIENT_AUTH
      : '/login';

    return (
      <Navigate
        to={redirectTo ?? loginRoute}
        state={{ from: location }}
        replace
      />
    );
  }

  const role       = userData?.role;
  const validRoles = Object.values(USER_ROLES);
  const isViewer   = role === USER_ROLES.VIEWER;

  // 3. Rol ausente o no reconocido → sesión corrupta, forzar re-login
  if (!role || !validRoles.includes(role)) {
    return <Navigate to="/login" replace />;
  }

  // 4. clientOnly → solo viewers; admin/member van al dashboard
  if (clientOnly && !isViewer) {
    return <Navigate to={redirectTo ?? PRIVATE_ROUTES.DASHBOARD} replace />;
  }

  // 5. agentOnly → solo admin/member; viewers van a su portal
  if (agentOnly && isViewer) {
    return <Navigate to={redirectTo ?? PRIVATE_ROUTES.CLIENT_PORTAL} replace />;
  }

  // 6. Roles específicos requeridos
  if (allowedRoles?.length && !allowedRoles.includes(role)) {
    if (isViewer) return <Navigate to={PRIVATE_ROUTES.CLIENT_PORTAL} replace />;
    return <AccessDenied />;
  }

  // 7. Todo correcto
  return children ? children : <Outlet />;
};

// ─── HOCs de conveniencia para AppRouter ──────────────────────────────────────

/** Solo para viewers (portal de clientes) */
export const ClientRoute = (props) => <ProtectedRoute clientOnly {...props} />;

/** Solo para admin y member (panel interno) */
export const AgentRoute  = (props) => <ProtectedRoute agentOnly  {...props} />;

/** Solo para admin */
export const AdminRoute  = (props) => (
  <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN]} {...props} />
);

export default ProtectedRoute;