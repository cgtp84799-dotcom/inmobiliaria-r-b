// tests/frontend/AuthContext.test.jsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, act, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';

// vi.hoisted: define los mocks ANTES que vi.mock se evalúe (vi.mock se hoistea
// al tope del archivo). Esto permite que los mocks compartan estado con los
// tests sin caer en el "Cannot access X before initialization".
const mocks = vi.hoisted(() => ({
  authCallback: { current: null },
  userData: { current: null },
}));

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn().mockResolvedValue(undefined),
  onAuthStateChanged: vi.fn((auth, cb) => {
    mocks.authCallback.current = cb;
    return () => {};
  }),
  setPersistence: vi.fn().mockResolvedValue(undefined),
  browserLocalPersistence: 'local',
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((db, col, id) => ({ __col: col, __id: id })),
  getDoc: vi.fn(async () => {
    const data = mocks.userData.current;
    return {
      exists: () => data != null,
      data: () => data,
      id: 'mocked-id',
    };
  }),
  setDoc: vi.fn().mockResolvedValue(undefined),
  serverTimestamp: vi.fn(() => 'TS'),
  Timestamp: { now: () => 'NOW' },
}));

vi.mock('firebase/database', () => ({
  ref: vi.fn(() => ({})),
  set: vi.fn().mockResolvedValue(undefined),
  onValue: vi.fn(() => () => {}),
  onDisconnect: vi.fn(() => ({ set: vi.fn().mockResolvedValue(undefined) })),
  serverTimestamp: vi.fn(() => 'TS_RTDB'),
}));

vi.mock('../../src/core/config/firebase.config', () => ({
  auth: {}, db: {}, rtdb: {},
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn(), loading: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { AuthProvider, useAuth } from '../../src/core/contexts/AuthContext.jsx';

function ContextProbe() {
  const { currentUser, userData, loading, isAdmin, isMember, isViewer, canOperate, canRead } = useAuth();
  return (
    <div>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="user-email">{currentUser?.email || 'null'}</div>
      <div data-testid="role">{userData?.role || 'null'}</div>
      <div data-testid="isAdmin">{String(isAdmin)}</div>
      <div data-testid="isMember">{String(isMember)}</div>
      <div data-testid="isViewer">{String(isViewer)}</div>
      <div data-testid="canOperate">{String(canOperate)}</div>
      <div data-testid="canRead">{String(canRead)}</div>
    </div>
  );
}

async function triggerAuth(user, userData) {
  mocks.userData.current = userData;
  // Esperar a que el useEffect del AuthProvider haya registrado el callback
  // (setPersistence es async, así que onAuthStateChanged se ejecuta después)
  await waitFor(() => expect(mocks.authCallback.current).not.toBeNull());
  await act(async () => {
    if (mocks.authCallback.current) await mocks.authCallback.current(user);
  });
}

function setup() {
  return render(
    <AuthProvider>
      <ContextProbe />
    </AuthProvider>
  );
}

beforeEach(() => {
  mocks.authCallback.current = null;
  mocks.userData.current = null;
});

afterEach(() => {
  cleanup();
});

describe('AuthContext', () => {
  it('✅ loading=true mientras se resuelve onAuthStateChanged', async () => {
    setup();
    expect(screen.getByTestId('loading')).toHaveTextContent('true');
    expect(screen.getByTestId('user-email')).toHaveTextContent('null');
  });

  it('✅ currentUser, userData, isAdmin se exponen para admin', async () => {
    setup();
    await triggerAuth(
      { uid: 'uid-admin', email: 'admin@ryb.com', emailVerified: true, displayName: 'Admin' },
      { email: 'admin@ryb.com', role: 'admin', status: 'active' }
    );
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('user-email')).toHaveTextContent('admin@ryb.com');
    expect(screen.getByTestId('role')).toHaveTextContent('admin');
    expect(screen.getByTestId('isAdmin')).toHaveTextContent('true');
    expect(screen.getByTestId('isMember')).toHaveTextContent('false');
    expect(screen.getByTestId('canOperate')).toHaveTextContent('true');
  });

  it('✅ isAdmin=false, canOperate=true para member', async () => {
    setup();
    await triggerAuth(
      { uid: 'uid-m', email: 'member@ryb.com', emailVerified: true, displayName: 'M' },
      { email: 'member@ryb.com', role: 'member', status: 'active' }
    );
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('isAdmin')).toHaveTextContent('false');
    expect(screen.getByTestId('isMember')).toHaveTextContent('true');
    expect(screen.getByTestId('canOperate')).toHaveTextContent('true');
  });

  it('✅ Viewer (cliente) no es canOperate', async () => {
    setup();
    await triggerAuth(
      { uid: 'uid-v', email: 'cliente@ryb.com', emailVerified: true, displayName: 'C' },
      { email: 'cliente@ryb.com', role: 'viewer', status: 'active' }
    );
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('isAdmin')).toHaveTextContent('false');
    expect(screen.getByTestId('isMember')).toHaveTextContent('false');
    expect(screen.getByTestId('isViewer')).toHaveTextContent('true');
    expect(screen.getByTestId('canOperate')).toHaveTextContent('false');
    expect(screen.getByTestId('canRead')).toHaveTextContent('true');
  });

  it('✅ usuario null → loading=false, currentUser=null', async () => {
    setup();
    await triggerAuth(null, null);
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('user-email')).toHaveTextContent('null');
  });
});
