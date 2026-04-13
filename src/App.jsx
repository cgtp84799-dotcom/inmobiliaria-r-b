/**
 * src/App.jsx  — archivo completo listo para reemplazar
 *
 * Cambios respecto a la versión anterior:
 *  1. routes.config.js ya no tiene CLIENT_PORTAL duplicado
 *  2. /portal usa  <ProtectedRoute clientOnly>  → viewer pasa, staff va a /dashboard
 *  3. Sin sesión en /portal → ProtectedRoute redirige a /acceso-clientes (no a /login)
 *  4. La segunda ruta <Route path="/portal"> duplicada fue eliminada
 *  5. AuthPage y ClientAuthPage incluyen useEffect de redirección si ya hay sesión
 */

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
} from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { Toaster }  from 'react-hot-toast';
import { motion }   from 'framer-motion';
import { Helmet }   from 'react-helmet-async';

import {
  FaBuilding, FaKey, FaGavel, FaFileContract, FaHandshake, FaShieldAlt,
  FaWhatsapp, FaInstagram, FaFacebook, FaEnvelope, FaPhone, FaMapMarkerAlt,
  FaClock, FaHome, FaSearch, FaCheckCircle, FaBalanceScale, FaUserTie,
} from 'react-icons/fa';

import PublicLayout    from './shared/components/Layout/PublicLayout';
import AdminLayout     from './shared/components/Layout/AdminLayout';
import ScrollToTop     from './shared/components/ScrollToTop';
import { AuthProvider, useAuth } from './core/contexts/AuthContext';
import { PUBLIC_ROUTES, PRIVATE_ROUTES, AUTH_ROUTES } from './core/config/routes.config';
import {
  requestNotificationPermission,
  initializeMessaging,
} from './core/services/notificationService';
import { USER_ROLES } from './modules/users/types/user.types';

import AuthPage           from './modules/auth/pages/AuthPage';
import CatalogPage        from './modules/public/pages/CatalogPage';
import PropertyDetailPage from './modules/public/pages/PropertyDetailPage';
import AccessRequestPage  from './modules/users/pages/AccessRequestPage';
import ProtectedRoute     from './shared/components/ProtectedRoute';
import SettingsFab        from './shared/components/UI/SettingsFab';
import LocationPage       from './modules/public/pages/LocationPage';
import ProfilePage        from './modules/profile/pages/ProfilePage';
import PrivacyPolicyPage  from './modules/public/pages/PrivacyPolicyPage';

const VisitsPage         = lazy(() => import('./modules/visits/pages/VisitsPage'));
const ScheduleVisitPage  = lazy(() => import('./modules/visits/pages/ScheduleVisitPage'));
const DashboardPage      = lazy(() => import('./modules/dashboard/pages/DashboardPage'));
const AgentDashboard     = lazy(() => import('./modules/agents/pages/AgentDashboard'));
const PropertyManagement = lazy(() => import('./modules/properties/pages/PropertyManagement'));
const ClientManagement   = lazy(() => import('./modules/clients/pages/ClientManagement'));
const ContractsPage      = lazy(() => import('./modules/contracts/pages/ContractsPage'));
const DocumentsPage      = lazy(() => import('./modules/documents/pages/DocumentsPage'));
const ContactsPage       = lazy(() => import('./modules/contacts/pages/ContactsPage'));
const CalendarPage       = lazy(() => import('./modules/calendar/pages/CalendarPage'));
const UsersPage          = lazy(() => import('./modules/users/pages/UsersPage'));
const RequestsPage       = lazy(() => import('./modules/users/pages/RequestsPage'));
const ClientAuthPage     = lazy(() => import('./modules/auth/pages/ClientAuthPage'));
const ClientPortal       = lazy(() => import('./modules/clients/pages/ClientPortal'));

// ─────────────────────────────────────────────────────────────────────────────
const PageLoader = () => (
  <div className="flex items-center justify-center h-[60vh]">
    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
const NotificationInitializer = () => {
  const { currentUser } = useAuth();
  useEffect(() => {
    initializeMessaging();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/firebase-messaging-sw.js')
        .then((r) => console.log('✅ SW registrado:', r.scope))
        .catch((e) => console.error('❌ SW error:', e));
    }
    if (currentUser?.email) {
      const t = setTimeout(() => requestNotificationPermission(currentUser.email), 3000);
      return () => clearTimeout(t);
    }
  }, [currentUser]);
  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// HomePage y ContactPage se mantienen igual que en la versión anterior.
// Por brevedad se importan inline desde aquí — si ya los tienes como archivos
// separados, reemplaza este bloque por los imports correspondientes.
// ─────────────────────────────────────────────────────────────────────────────

const serviceColorMap = {
  primary:     { bg: 'bg-primary/10',    text: 'text-primary',    border: 'hover:border-primary/50'    },
  'blue-500':  { bg: 'bg-blue-500/10',   text: 'text-blue-500',   border: 'hover:border-blue-500/50'   },
  'green-500': { bg: 'bg-green-500/10',  text: 'text-green-500',  border: 'hover:border-green-500/50'  },
  'purple-500':{ bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'hover:border-purple-500/50' },
  'orange-500':{ bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'hover:border-orange-500/50' },
  'red-500':   { bg: 'bg-red-500/10',    text: 'text-red-500',    border: 'hover:border-red-500/50'    },
};

// NOTA: HomePage y ContactPage se asumen ya existentes en tu proyecto.
// Si están inline en App.jsx original, cópialos aquí tal cual.
// Solo se muestran como placeholders para no repetir cientos de líneas.
import HomePage    from './modules/public/pages/HomePage';
import ContactPage from './modules/public/pages/ContactPage';

// ─────────────────────────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <NotificationInitializer />
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155' },
          success: { iconTheme: { primary: '#f59e0b', secondary: '#0f172a' } },
        }}
      />

      <Routes>
        {/* ── Rutas públicas (con PublicLayout + Navbar) ──────────────────── */}
        <Route element={<PublicLayout />}>
          <Route path={PUBLIC_ROUTES.HOME}                 element={<HomePage />} />
          <Route path={PUBLIC_ROUTES.CATALOG}              element={<CatalogPage />} />
          <Route path={PUBLIC_ROUTES.CITY_PROPERTIES}      element={<CatalogPage />} />
          <Route path={PUBLIC_ROUTES.TYPE_CITY_PROPERTIES} element={<CatalogPage />} />
          <Route path={PUBLIC_ROUTES.PROPERTY_DETAIL}      element={<PropertyDetailPage />} />
          <Route path={PUBLIC_ROUTES.CONTACT}              element={<ContactPage />} />
          <Route path="/ubicacion"                         element={<LocationPage />} />
          <Route path={PUBLIC_ROUTES.PRIVACY_POLICY}       element={<PrivacyPolicyPage />} />
          <Route
            path={PUBLIC_ROUTES.SCHEDULE_VISIT}
            element={<Suspense fallback={<PageLoader />}><ScheduleVisitPage /></Suspense>}
          />
        </Route>

        {/* ── Auth de agentes — sin layout ───────────────────────────────── */}
        <Route path={AUTH_ROUTES.LOGIN}          element={<AuthPage />} />
        <Route path={AUTH_ROUTES.ACCESS_REQUEST} element={<AccessRequestPage />} />

        {/* ── Auth de clientes — pública, sin layout ─────────────────────── */}
        {/*    ProtectedRoute redirige aquí si hay viewer sin sesión en /portal */}
        <Route
          path={PUBLIC_ROUTES.CLIENT_AUTH}
          element={<Suspense fallback={<PageLoader />}><ClientAuthPage /></Suspense>}
        />

        {/* ── Portal de clientes — privado, sin AdminLayout ──────────────── */}
        {/*    clientOnly={true}: viewer pasa, admin/member van a /dashboard   */}
        <Route
          path={PRIVATE_ROUTES.CLIENT_PORTAL}
          element={
            <ProtectedRoute clientOnly={true}>
              <Suspense fallback={<PageLoader />}>
                <ClientPortal />
              </Suspense>
            </ProtectedRoute>
          }
        />

        {/* ── Rutas privadas del panel (AdminLayout) ─────────────────────── */}
        {/*    ProtectedRoute sin clientOnly: viewer → redirige a /portal      */}
        <Route
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path={PRIVATE_ROUTES.DASHBOARD}  element={<Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>} />
          <Route path={PRIVATE_ROUTES.PROPERTIES} element={<Suspense fallback={<PageLoader />}><PropertyManagement /></Suspense>} />
          <Route path={PRIVATE_ROUTES.CLIENTS}    element={<Suspense fallback={<PageLoader />}><ClientManagement /></Suspense>} />
          <Route path={PRIVATE_ROUTES.CONTRACTS}  element={<Suspense fallback={<PageLoader />}><ContractsPage /></Suspense>} />
          <Route path={PRIVATE_ROUTES.DOCUMENTS}  element={<Suspense fallback={<PageLoader />}><DocumentsPage /></Suspense>} />
          <Route path={PRIVATE_ROUTES.QUERIES}    element={<Suspense fallback={<PageLoader />}><ContactsPage /></Suspense>} />
          <Route path={PRIVATE_ROUTES.CALENDAR}   element={<Suspense fallback={<PageLoader />}><CalendarPage /></Suspense>} />
          <Route path={PRIVATE_ROUTES.VISITS}     element={<Suspense fallback={<PageLoader />}><VisitsPage /></Suspense>} />
          <Route path={PRIVATE_ROUTES.PROFILE}    element={<ProfilePage />} />

          {/* Solo admin */}
          <Route
            path={PRIVATE_ROUTES.USERS}
            element={
              <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN]}>
                <Suspense fallback={<PageLoader />}><UsersPage /></Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path={PRIVATE_ROUTES.REQUESTS}
            element={
              <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN]}>
                <Suspense fallback={<PageLoader />}><RequestsPage /></Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path={PRIVATE_ROUTES.AGENT_DASHBOARD}
            element={
              <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN]}>
                <Suspense fallback={<PageLoader />}><AgentDashboard /></Suspense>
              </ProtectedRoute>
            }
          />
        </Route>

        {/* ── Fallback ───────────────────────────────────────────────────── */}
        <Route path="*" element={<Navigate to={PUBLIC_ROUTES.HOME} replace />} />
      </Routes>

      <SettingsFab />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}