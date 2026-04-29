// tests/frontend/ProtectedRoute.test.jsx
//
// Tests para src/shared/components/ProtectedRoute.jsx

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import React from 'react';

const mocks = vi.hoisted(() => ({
  authState: { current: { currentUser: null, userData: null, loading: false } },
}));

vi.mock('../../src/core/contexts/AuthContext', () => ({
  useAuth: () => mocks.authState.current,
}));

vi.mock('../../src/core/config/firebase.config', () => ({
  auth: {}, db: {}, rtdb: {},
}));

vi.mock('../../src/core/config/routes.config', () => ({
  PRIVATE_ROUTES: { DASHBOARD: '/dashboard', CLIENT_PORTAL: '/portal' },
  PUBLIC_ROUTES: { CLIENT_AUTH: '/portal/login' },
}));

import ProtectedRoute from '../../src/shared/components/ProtectedRoute.jsx';

const Protected   = () => <div data-testid="protected">PROTECTED CONTENT</div>;
const LoginPage   = () => <div data-testid="login">LOGIN</div>;
const PortalLogin = () => <div data-testid="portal-login">PORTAL LOGIN</div>;
const Dashboard   = () => <div data-testid="dashboard">DASHBOARD</div>;
const Portal      = () => <div data-testid="portal-home">PORTAL</div>;

function setupRouter(children, initialEntry = '/protected') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/protected" element={children} />
        <Route path="/protected/*" element={children} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/portal/login" element={<PortalLogin />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/portal" element={<Portal />} />
        <Route path="/portal/*" element={<Portal />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  mocks.authState.current = { currentUser: null, userData: null, loading: false };
});

afterEach(() => {
  cleanup();
});

describe('ProtectedRoute', () => {
  it('✅ agentOnly redirige a /login si NO autenticado', () => {
    mocks.authState.current = { currentUser: null, userData: null, loading: false };
    setupRouter(
      <ProtectedRoute agentOnly><Protected /></ProtectedRoute>
    );
    expect(screen.getByTestId('login')).toBeInTheDocument();
    expect(screen.queryByTestId('protected')).toBeNull();
  });

  it('✅ admin autenticado puede ver ruta agentOnly', () => {
    mocks.authState.current = {
      currentUser: { email: 'admin@ryb.com', uid: 'u1' },
      userData: { role: 'admin', status: 'active' },
      loading: false,
    };
    setupRouter(
      <ProtectedRoute agentOnly><Protected /></ProtectedRoute>
    );
    expect(screen.getByTestId('protected')).toBeInTheDocument();
  });

  it('✅ viewer en agentOnly redirige al portal', () => {
    mocks.authState.current = {
      currentUser: { email: 'cliente@ryb.com', uid: 'u2' },
      userData: { role: 'viewer', status: 'active' },
      loading: false,
    };
    setupRouter(
      <ProtectedRoute agentOnly><Protected /></ProtectedRoute>
    );
    expect(screen.getByTestId('portal-home')).toBeInTheDocument();
    expect(screen.queryByTestId('protected')).toBeNull();
  });

  it('✅ clientOnly redirige a dashboard si role NO es viewer (admin/member)', () => {
    mocks.authState.current = {
      currentUser: { email: 'member@ryb.com', uid: 'u3' },
      userData: { role: 'member', status: 'active' },
      loading: false,
    };
    setupRouter(
      <ProtectedRoute clientOnly><Protected /></ProtectedRoute>
    );
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
  });

  it('✅ allowedRoles=[admin]: member es rechazado', () => {
    mocks.authState.current = {
      currentUser: { email: 'member@ryb.com', uid: 'u3' },
      userData: { role: 'member', status: 'active' },
      loading: false,
    };
    setupRouter(
      <ProtectedRoute allowedRoles={['admin']}><Protected /></ProtectedRoute>
    );
    expect(screen.queryByTestId('protected')).toBeNull();
    expect(screen.getByText(/acceso denegado/i)).toBeInTheDocument();
  });

  it('✅ usuario con status="blocked" ve "Cuenta inhabilitada"', () => {
    mocks.authState.current = {
      currentUser: { email: 'blocked@ryb.com', uid: 'u4' },
      userData: { role: 'admin', status: 'blocked' },
      loading: false,
    };
    setupRouter(
      <ProtectedRoute agentOnly><Protected /></ProtectedRoute>
    );
    expect(screen.getByText(/cuenta inhabilitada/i)).toBeInTheDocument();
    expect(screen.queryByTestId('protected')).toBeNull();
  });

  it('✅ loading=true muestra LoadingScreen, no contenido', () => {
    mocks.authState.current = { currentUser: null, userData: null, loading: true };
    setupRouter(
      <ProtectedRoute agentOnly><Protected /></ProtectedRoute>
    );
    expect(screen.queryByTestId('protected')).toBeNull();
    expect(screen.queryByTestId('login')).toBeNull();
    expect(screen.getByAltText(/Rincón Bedoya/i)).toBeInTheDocument();
  });
});
