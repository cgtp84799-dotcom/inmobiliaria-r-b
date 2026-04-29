// FIX [PERFORMANCE]: carga diferida de páginas públicas/no críticas para reducir JS inicial.
// src/App.jsx
// ─────────────────────────────────────────────────────────────
// Árbol de rutas — versión con todos los fixes.
//
// FIXES APLICADOS:
//   1. HomeOrRedirect: la home pública es accesible para cualquier usuario
//      autenticado que navegue directamente a "/". Solo redirige automáti-
//      camente al dashboard si REDIRECT_HOME_WHEN_AUTHED = true.
//      Esto evita que un admin no pueda ver su propio sitio público.
//
//   2. AuthenticatedRootRedirect: añadido loading guard para no redirigir
//      mientras userData aún no cargó desde Firestore.
//
//   3. Ruta duplicada eliminada: TYPE_CITY_PROPERTIES y CITY_PROPERTIES
//      tenían el mismo patrón. React Router usaba solo la primera.
//      LocationPage ya parsea el slug internamente — una sola ruta basta.
//
//   4. NotificationInitializer: efectos separados para que un fallo de SW
//      no bloquee Firebase Messaging.
//
// NOTA: HelmetProvider está en src/main.jsx — NO se duplica aquí.
// ─────────────────────────────────────────────────────────────

import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { AuthProvider, useAuth } from './core/contexts/AuthContext';
import { PUBLIC_ROUTES, PRIVATE_ROUTES, AUTH_ROUTES } from './core/config/routes.config';
import { USER_ROLES } from './modules/users/types/user.types';
import { requestNotificationPermission, initializeMessaging } from './core/services/notificationService';

import ScrollToTop    from './shared/components/ScrollToTop';
import SettingsFab    from './shared/components/UI/SettingsFab';
import PublicLayout   from './shared/components/Layout/PublicLayout';
import AdminLayout    from './shared/components/Layout/AdminLayout';
import ProtectedRoute from './shared/components/ProtectedRoute';
import ErrorBoundary from './shared/components/UI/ErrorBoundary';

// ── Páginas públicas (Home eager, resto lazy) ───────────────────────────────
import HomePage           from './modules/public/pages/HomePage';

// ── Páginas lazy públicas secundarias ──────────────────────────────────────
const DepartmentHubPage = lazy(() => import('./modules/public/pages/DepartmentHubPage'));
const NotFoundPage      = lazy(() => import('./modules/public/pages/NotFoundPage'));
const AuthPage          = lazy(() => import('./modules/auth/pages/AuthPage'));
const ContactPage       = lazy(() => import('./modules/public/pages/ContactPage'));
const LocationPage      = lazy(() => import('./modules/public/pages/LocationPage'));
const PrivacyPolicyPage = lazy(() => import('./modules/public/pages/PrivacyPolicyPage'));
const AccessRequestPage = lazy(() => import('./modules/users/pages/AccessRequestPage'));
const ProfilePage       = lazy(() => import('./modules/profile/pages/ProfilePage'));
const CatalogPage       = lazy(() => import('./modules/public/pages/CatalogPage'));
const PropertyDetailPage= lazy(() => import('./modules/public/pages/PropertyDetailPage'));

// ── Páginas lazy privadas ──────────────────────────────────────────────────
const ClientAuthPage     = lazy(() => import('./modules/auth/pages/ClientAuthPage'));
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

// ─────────────────────────────────────────────────────────────
// COMPORTAMIENTO DE "/" CUANDO HAY SESION ACTIVA:
//   false → home pública visible para todos (recomendado)
//           Un admin puede ver su propio sitio sin cerrar sesión.
//   true  → redirige automáticamente al dashboard/portal
//           (comportamiento original, menos flexible)
// ─────────────────────────────────────────────────────────────
const REDIRECT_HOME_WHEN_AUTHED = false;

// ── Spinner para Suspense ──────────────────────────────────────────────────
const PageLoader = () => (
  <div className="flex items-center justify-center h-[60vh]" role="status" aria-live="polite">
    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    <span className="sr-only">Cargando...</span>
  </div>
);

const S = ({ children }) => <Suspense fallback={<PageLoader />}>{children}</Suspense>;

// ── Inicializador de notificaciones push ───────────────────────────────────
function NotificationInitializer() {
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker
      .register('/firebase-messaging-sw.js')
      .catch((e) => console.error('SW error:', e));
  }, []);

  useEffect(() => {
    initializeMessaging();
  }, []);

  useEffect(() => {
    if (!currentUser?.email) return;
    const t = setTimeout(() => requestNotificationPermission(currentUser.email), 3000);
    return () => clearTimeout(t);
  }, [currentUser?.email]);

  return null;
}

// ── Redirect al home correcto según rol ───────────────────────────────────
function AuthenticatedRootRedirect() {
  const { userData, loading } = useAuth();

  // Guard: esperar a que userData llegue de Firestore antes de redirigir
  if (loading || !userData) return null;

  const { role } = userData;
  if (role === USER_ROLES.VIEWER)                               return <Navigate to={PRIVATE_ROUTES.CLIENT_PORTAL} replace />;
  if (role === USER_ROLES.ADMIN || role === USER_ROLES.MEMBER)  return <Navigate to={PRIVATE_ROUTES.DASHBOARD}     replace />;

  return null; // rol desconocido → mostrar home pública
}

// ── Wrapper de la home pública ─────────────────────────────────────────────
function HomeOrRedirect() {
  const { currentUser, userData, loading } = useAuth();

  if (REDIRECT_HOME_WHEN_AUTHED) {
    if (currentUser && !loading && userData) return <AuthenticatedRootRedirect />;
    if (currentUser && loading) return null;
  }

  return <HomePage />;
}

// ── Árbol de rutas ─────────────────────────────────────────────────────────
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

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* RUTAS PÚBLICAS                                                  */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <Route element={<PublicLayout />}>
          <Route path={PUBLIC_ROUTES.HOME}    element={<HomeOrRedirect />} />
          <Route path={PUBLIC_ROUTES.CATALOG} element={<S><CatalogPage /></S>} />

          {/*
            FIX: una sola ruta de zona.
            CITY_PROPERTIES y TYPE_CITY_PROPERTIES comparten el mismo
            patrón (/propiedades/zona/:param) — React Router solo matchea
            la primera declarada. LocationPage ya distingue internamente
            "manizales" de "casas-en-venta-manizales" por lo que una
            sola ruta es correcta y suficiente.
          */}
          <Route path={PUBLIC_ROUTES.CITY_PROPERTIES} element={<S><LocationPage /></S>} />

          <Route
            path={PUBLIC_ROUTES.DEPARTMENT_HUB}
            element={<S><DepartmentHubPage /></S>}
          />

          {/* DESPUÉS de /zona/* y /departamento/* para evitar colisiones */}
          <Route
            path={PUBLIC_ROUTES.PROPERTY_DETAIL}
            element={<S><PropertyDetailPage /></S>}
          />

          <Route path={PUBLIC_ROUTES.CONTACT}        element={<S><ContactPage /></S>} />
          <Route path="/ubicacion"                   element={<S><LocationPage /></S>} />
          <Route path={PUBLIC_ROUTES.PRIVACY_POLICY} element={<S><PrivacyPolicyPage /></S>} />
          <Route
            path={PUBLIC_ROUTES.SCHEDULE_VISIT}
            element={<S><ScheduleVisitPage /></S>}
          />

          <Route path="*" element={<S><NotFoundPage /></S>} />
        </Route>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* AUTH AGENTES                                                    */}
        {/* NOTA: AUTH_ROUTES.LOGIN y "/login" coincidían y apuntaban a dos  */}
        {/* componentes distintos. React Router solo matcheaba el primero.  */}
        {/* Mantenemos AuthPage como la ruta oficial de login de agentes.   */}
        {/* LoginPage legacy queda eliminado del árbol.                     */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <Route path={AUTH_ROUTES.LOGIN}          element={<S><AuthPage /></S>} />
        <Route path={AUTH_ROUTES.ACCESS_REQUEST} element={<S><AccessRequestPage /></S>} />

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* AUTH CLIENTES                                                   */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <Route
          path={PUBLIC_ROUTES.CLIENT_AUTH}
          element={<S><ClientAuthPage /></S>}
        />

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* PORTAL DE CLIENTES                                              */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <Route
          path={PRIVATE_ROUTES.CLIENT_PORTAL}
          element={
            <ProtectedRoute clientOnly>
              <S><ClientPortal /></S>
            </ProtectedRoute>
          }
        />

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* PANEL INTERNO (admin + member)                                  */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <Route
          element={
            <ProtectedRoute agentOnly>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path={PRIVATE_ROUTES.DASHBOARD}    element={<S><DashboardPage /></S>} />
          <Route path={PRIVATE_ROUTES.PROPERTIES}   element={<S><PropertyManagement /></S>} />
          <Route path={PRIVATE_ROUTES.CLIENTS}      element={<S><ClientManagement /></S>} />
          <Route path={PRIVATE_ROUTES.CONTRACTS}    element={<S><ContractsPage /></S>} />
          <Route path={PRIVATE_ROUTES.DOCUMENTS}    element={<S><DocumentsPage /></S>} />
          <Route path={PRIVATE_ROUTES.QUERIES}      element={<S><ContactsPage /></S>} />
          <Route path={PRIVATE_ROUTES.CALENDAR}     element={<S><CalendarPage /></S>} />
          <Route path={PRIVATE_ROUTES.VISITS}       element={<S><VisitsPage /></S>} />
          <Route path={PRIVATE_ROUTES.PROFILE}      element={<S><ProfilePage /></S>} />
          <Route path={PRIVATE_ROUTES.AGENTS}       element={<S><AgentsPage /></S>} />
          <Route path={PRIVATE_ROUTES.AGENT_DETAIL} element={<S><AgentDetailPage /></S>} />

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

      </Routes>

      <SettingsFab />
    </>
  );
}

// ── Entry point ────────────────────────────────────────────────────────────
export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
