import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../core/contexts/AuthContext";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { currentUser, userData, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark">
        <p className="text-muted">Verificando sesión...</p>
      </div>
    );
  }

  // TU RUTA REAL ES /acceso
  if (!currentUser) return <Navigate to="/acceso" replace />;

  if (allowedRoles?.length) {
    const role = userData?.role;
    if (!role || !allowedRoles.includes(role)) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-dark">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-primary mb-2">Acceso denegado</h2>
            <p className="text-muted">No tienes permisos para acceder a esta sección.</p>
          </div>
        </div>
      );
    }
  }

  return children ? children : <Outlet />;
};

export default ProtectedRoute;