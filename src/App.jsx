// src/App.jsx
import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { AuthProvider, useAuth } from './core/contexts/AuthContext';
import { PUBLIC_ROUTES, PRIVATE_ROUTES, AUTH_ROUTES } from './core/config/routes.config';
import { USER_ROLES } from './modules/users/types/user.types';
import { requestNotificationPermission, initializeMessaging } from './core/services/notificationService';

import ScrollToTop from './shared/components/ScrollToTop';
import SettingsFab from './shared/components/UI/SettingsFab';
import PublicLayout from './shared/components/Layout/PublicLayout';
import AdminLayout from './shared/components/Layout/AdminLayout';
import ProtectedRoute from './shared/components/ProtectedRoute';

// ── Páginas públicas (non-lazy, pequeñas) ────────────────────────────────────
import AuthPage from './modules/auth/pages/AuthPage';
import HomePage from './modules/public/pages/HomePage';
import ContactPage from './modules/public/pages/ContactPage';
import LocationPage from './modules/public/pages/LocationPage';
import PrivacyPolicyPage from './modules/public/pages/PrivacyPolicyPage';
import AccessRequestPage from './modules/users/pages/AccessRequestPage';
import ProfilePage from './modules/profile/pages/ProfilePage';
import CatalogPage from './modules/public/pages/CatalogPage';
import PropertyDetailPage from './modules/public/pages/PropertyDetailPage';

// ── Páginas lazy ─────────────────────────────────────────────────────────────
const ClientAuthPage     = lazy(() => import('./modules/auth/pages/ClientAuthPage'));
const LoginPage          = lazy(() => import('./modules/auth/pages/LoginPage'));
const ClientPortal       = lazy(() => import('./modules/clients/pages/ClientPortal'));
const DashboardPage      = lazy(() => import('./modules/dashboard/pages/DashboardPage'));
const PropertyManagement = lazy(() => import('./modules/properties/pages/PropertyManagement'));
const ClientManagement   = lazy(() => import('./modules/clients/pages/ClientManagement'));
const ContractsPage      = lazy(() => import('./modules/contracts/pages/ContractsPage'));
const DocumentsPage      = lazy(() => import('./modules/documents/pages/DocumentsPage'));
const ContactsPage       = lazy(() => import('./modules/contacts/pages/ContactsPage'));
const CalendarPage       = lazy(() => import('./modules/visits/pages/CalendarPage'));
const VisitsPage         = lazy(() => import('./modules/visits/pages/VisitsPage'));
const ScheduleVisitPage  = lazy(() => import('./modules/visits/pages/ScheduleVisitPage'));
const UsersPage          = lazy(() => import('./modules/users/pages/UsersPage'));
const RequestsPage       = lazy(() => import('./modules/users/pages/RequestsPage'));
const AgentDashboard     = lazy(() => import('./modules/agents/pages/AgentDashboard'));
const AgentsPage         = lazy(() => import('./modules/agents/pages/AgentsPage'));
const AgentDetailPage    = lazy(() => import('./modules/agents/pages/AgentDetailPage'));

// ── Spinner de carga para Suspense ───────────────────────────────────────────
const PageLoader = () => (
  <div className="flex items-center justify-center h-[60vh]">
    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const S = ({ children }) => <Suspense fallback={<PageLoader />}>{children}</Suspense>;

// ── Inicializador de notificaciones push ─────────────────────────────────────
function NotificationInitializer() {
  const { currentUser } = useAuth();

  useEffect(() => {
    initializeMessaging();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/firebase-messaging-sw.js')
        .then((r) => console.log('SW registrado:', r.scope))
        .catch((e) => console.error('SW error:', e));
    }
    if (currentUser?.email) {
      const t = setTimeout(() => requestNotificationPermission(currentUser.email), 3000);
      return () => clearTimeout(t);
    }
  }, [currentUser]);

  return null;
}

// ── Redirect raíz inteligente según rol ──────────────────────────────────────
function RootRedirect() {
  const { userData } = useAuth();
  const role = userData?.role;
  if (role === USER_ROLES.VIEWER)  return <Navigate to={PRIVATE_ROUTES.CLIENT_PORTAL} replace />;
  if (role === USER_ROLES.ADMIN || role === USER_ROLES.MEMBER) return <Navigate to={PRIVATE_ROUTES.DASHBOARD} replace />;
  return <Navigate to={AUTH_ROUTES.LOGIN} replace />;
}

// ── Árbol de rutas ────────────────────────────────────────────────────────────
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

        {/* ── Públicas con Navbar + Footer ── */}
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
            element={<S><ScheduleVisitPage /></S>}
          />
        </Route>

        {/* ── Auth agentes (sin layout) ── */}
        <Route path={AUTH_ROUTES.LOGIN}          element={<AuthPage />} />
        <Route path="/login"                     element={<S><LoginPage /></S>} />
        <Route path={AUTH_ROUTES.ACCESS_REQUEST} element={<AccessRequestPage />} />

        {/* ── Auth clientes (pública, sin layout) ── */}
        <Route
          path={PUBLIC_ROUTES.CLIENT_AUTH}
          element={<S><ClientAuthPage /></S>}
        />

        {/* ────────────────────────────────────────────────────────────────── */}
        {/* PORTAL DE CLIENTES                                                */}
        {/* Solo viewers pasan. Admin/member → /dashboard                    */}
        {/* Sin sesión → /acceso-clientes                                    */}
        {/* ────────────────────────────────────────────────────────────────── */}
        <Route
          path={PRIVATE_ROUTES.CLIENT_PORTAL}
          element={
            <ProtectedRoute clientOnly>
              <S><ClientPortal /></S>
            </ProtectedRoute>
          }
        />

        {/* ────────────────────────────────────────────────────────────────── */}
        {/* PANEL INTERNO (admin + member)                                    */}
        {/* Viewer → /portal | Sin sesión → /login                           */}
        {/* AdminLayout contiene Sidebar + Topbar                            */}
        {/* ────────────────────────────────────────────────────────────────── */}
        <Route
          element={
            <ProtectedRoute agentOnly>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          {/* Dashboard */}
          <Route path={PRIVATE_ROUTES.DASHBOARD}   element={<S><DashboardPage /></S>} />

          {/* Módulos operativos */}
          <Route path={PRIVATE_ROUTES.PROPERTIES}  element={<S><PropertyManagement /></S>} />
          <Route path={PRIVATE_ROUTES.CLIENTS}     element={<S><ClientManagement /></S>} />
          <Route path={PRIVATE_ROUTES.CONTRACTS}   element={<S><ContractsPage /></S>} />
          <Route path={PRIVATE_ROUTES.DOCUMENTS}   element={<S><DocumentsPage /></S>} />
          <Route path={PRIVATE_ROUTES.QUERIES}     element={<S><ContactsPage /></S>} />
          <Route path={PRIVATE_ROUTES.CALENDAR}    element={<S><CalendarPage /></S>} />
          <Route path={PRIVATE_ROUTES.VISITS}      element={<S><VisitsPage /></S>} />

          {/* Perfil (todos los agentes) */}
          <Route path={PRIVATE_ROUTES.PROFILE}     element={<ProfilePage />} />

          {/* Agentes — todos los del panel pueden verlo */}
          <Route path={PRIVATE_ROUTES.AGENTS}      element={<S><AgentsPage /></S>} />
          <Route path={PRIVATE_ROUTES.AGENT_DETAIL} element={<S><AgentDetailPage /></S>} />

          {/* Solo admin ── */}
          <Route
            path={PRIVATE_ROUTES.USERS}
            element={
              <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN]}>
                <S><UsersPage /></S>
              </ProtectedRoute>
            }
          />
          <Route
            path={PRIVATE_ROUTES.REQUESTS}
            element={
              <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN]}>
                <S><RequestsPage /></S>
              </ProtectedRoute>
            }
          />
          <Route
            path={PRIVATE_ROUTES.AGENT_DASHBOARD}
            element={
              <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN]}>
                <S><AgentDashboard /></S>
              </ProtectedRoute>
            }
          />
        </Route>

        {/* ── Raíz → redirect inteligente según rol ── */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <RootRedirect />
            </ProtectedRoute>
          }
        />

        {/* ── 404 → home ── */}
        <Route path="*" element={<Navigate to={PUBLIC_ROUTES.HOME} replace />} />

      </Routes>

      <SettingsFab />
    </>
  );
}

// ── Entry point ───────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}