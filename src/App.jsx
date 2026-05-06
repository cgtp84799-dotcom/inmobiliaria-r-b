// src/App.jsx
//
// Árbol de rutas y wrappers globales.
//
// Comportamiento:
//   - HomeOrRedirect: la home pública es accesible para cualquier usuario
//     autenticado que navegue directamente a "/". Solo redirige automáti-
//     camente al dashboard cuando REDIRECT_HOME_WHEN_AUTHED = true.
//   - AuthenticatedRootRedirect: espera a que userData llegue de Firestore
//     antes de redirigir según el rol.
//   - NotificationInitializer: efectos separados para que un fallo del SW
//     no bloquee Firebase Messaging.
//   - ConditionalSettingsFab: oculta el FAB de ajustes en rutas auth.
//
// NOTA: HelmetProvider vive en src/main.jsx — no se duplica aquí.

import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import ErrorBoundary  from './shared/components/UI/ErrorBoundary';

// Boundary ligero para rutas individuales — muestra mensaje sin tumbar el layout
const RouteError = () => (
  <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 px-4 text-center">
    <div className="text-4xl">⚠️</div>
    <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text)' }}>
      No se pudo cargar esta sección
    </h2>
    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
      Recarga la página o vuelve al inicio.
    </p>
    <button
      onClick={() => window.location.reload()}
      className="px-5 py-2 rounded-xl text-sm font-semibold bg-primary text-slate-950 hover:opacity-90 transition"
    >
      Recargar
    </button>
  </div>
);

const RE = ({ children }) => (
  <ErrorBoundary fallback={<RouteError />}>{children}</ErrorBoundary>
);

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
const EmailVerificationPage = lazy(() => import('./modules/auth/pages/EmailVerificationPage'));
const EmailVerifyTokenPage  = lazy(() => import('./modules/auth/pages/EmailVerifyTokenPage'));
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

// ── SettingsFab condicional ────────────────────────────────────────────────
// Oculta el FAB de ajustes en rutas de autenticación, donde no aplica y
// puede confundir a usuarios sin sesión.
const FAB_HIDDEN_ROUTES = [
  '/login',
  '/acceso-clientes',
  '/solicitar-acceso',
  '/verificar-email',
];

function ConditionalSettingsFab() {
  const { pathname } = useLocation();
  const hide = FAB_HIDDEN_ROUTES.some((r) => pathname.startsWith(r));
  if (hide) return null;
  return <SettingsFab />;
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
          <Route path={PUBLIC_ROUTES.CATALOG} element={<RE><S><CatalogPage /></S></RE>} />

          <Route path={PUBLIC_ROUTES.CITY_PROPERTIES} element={<RE><S><LocationPage /></S></RE>} />

          <Route
            path={PUBLIC_ROUTES.DEPARTMENT_HUB}
            element={<RE><S><DepartmentHubPage /></S></RE>}
          />

          <Route
            path={PUBLIC_ROUTES.PROPERTY_DETAIL}
            element={<RE><S><PropertyDetailPage /></S></RE>}
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

        {/* Verificación de email — autocontenida, sin ProtectedRoute para
            evitar loop. La propia página verifica que haya sesión activa
            y redirige al portal cuando emailVerified === true. */}
        <Route
          path={PUBLIC_ROUTES.EMAIL_VERIFICATION}
          element={<S><EmailVerificationPage /></S>}
        />

        {/* Aterrizaje del link enviado por email. Llama a la Cloud Function
            confirmEmailVerification con el token de la URL. NO requiere
            sesión activa — el usuario puede aterrizar desde otro
            dispositivo. */}
        <Route
          path={PUBLIC_ROUTES.EMAIL_VERIFY_TOKEN}
          element={<S><EmailVerifyTokenPage /></S>}
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
          <Route path={PRIVATE_ROUTES.DASHBOARD}    element={<RE><S><DashboardPage /></S></RE>} />
          <Route path={PRIVATE_ROUTES.PROPERTIES}   element={<RE><S><PropertyManagement /></S></RE>} />
          <Route path={PRIVATE_ROUTES.CLIENTS}      element={<RE><S><ClientManagement /></S></RE>} />
          <Route path={PRIVATE_ROUTES.CONTRACTS}    element={<RE><S><ContractsPage /></S></RE>} />
          <Route path={PRIVATE_ROUTES.DOCUMENTS}    element={<RE><S><DocumentsPage /></S></RE>} />
          <Route path={PRIVATE_ROUTES.QUERIES}      element={<RE><S><ContactsPage /></S></RE>} />
          <Route path={PRIVATE_ROUTES.CALENDAR}     element={<RE><S><CalendarPage /></S></RE>} />
          <Route path={PRIVATE_ROUTES.VISITS}       element={<RE><S><VisitsPage /></S></RE>} />
          <Route path={PRIVATE_ROUTES.PROFILE}      element={<RE><S><ProfilePage /></S></RE>} />
          <Route path={PRIVATE_ROUTES.AGENTS}       element={<RE><S><AgentsPage /></S></RE>} />
          <Route path={PRIVATE_ROUTES.AGENT_DETAIL} element={<RE><S><AgentDetailPage /></S></RE>} />

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

      <ConditionalSettingsFab />
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