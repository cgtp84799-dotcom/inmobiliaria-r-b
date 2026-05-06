// tests/frontend/useVisits.test.jsx
//
// Tests para src/modules/visits/hooks/useVisits.js
// vi.mock se hoistea al tope, por eso usamos vi.hoisted() para definir
// el mockVisitService antes que el mock se evalúe.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, act, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';

// ─── vi.hoisted: se ejecuta ANTES que vi.mock ──────────────────────────
const mocks = vi.hoisted(() => {
  return {
    visitService: {
      subscribeAll: vi.fn(),
      subscribePending: vi.fn(),
      subscribeByAgent: vi.fn(),
      approveVisit: vi.fn().mockResolvedValue(undefined),
      rejectVisit: vi.fn().mockResolvedValue(undefined),
      completeVisit: vi.fn().mockResolvedValue(undefined),
      rescheduleVisit: vi.fn().mockResolvedValue(undefined),
      deleteVisit: vi.fn().mockResolvedValue(undefined),
    },
    authState: { current: null },
  };
});

vi.mock('../../src/core/contexts/AuthContext', () => ({
  useAuth: () => mocks.authState.current,
}));

vi.mock('../../src/core/config/firebase.config', () => ({
  auth: {}, db: {}, rtdb: {},
}));

vi.mock('../../src/modules/visits/services/visit.service', () => ({
  visitService: mocks.visitService,
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { useVisits } from '../../src/modules/visits/hooks/useVisits.js';

function HookHarness({ onState }) {
  const state = useVisits();
  React.useEffect(() => { onState(state); });
  return null;
}

beforeEach(() => {
  mocks.visitService.subscribeAll.mockReset();
  mocks.visitService.subscribePending.mockReset();
  mocks.visitService.subscribeByAgent.mockReset();
  mocks.visitService.approveVisit.mockReset().mockResolvedValue(undefined);

  mocks.visitService.subscribeAll.mockImplementation((onData) => {
    onData([
      { id: 'v1', status: 'pending', clientEmail: 'a@x.com' },
      { id: 'v2', status: 'approved', clientEmail: 'b@x.com' },
    ]);
    return () => {};
  });
  mocks.visitService.subscribePending.mockImplementation((onData) => {
    onData([
      { id: 'p1', status: 'pending', agentEmail: null, createdAt: { seconds: 100 } },
      { id: 'p2', status: 'pending', agentEmail: 'someone@x.com', createdAt: { seconds: 90 } },
    ]);
    return () => {};
  });
  mocks.visitService.subscribeByAgent.mockImplementation((email, onData) => {
    onData([{ id: 'a1', status: 'approved', agentEmail: email, createdAt: { seconds: 110 } }]);
    return () => {};
  });
});

afterEach(() => {
  cleanup();
});

describe('useVisits', () => {
  it('✅ Admin: ve TODAS las visitas (subscribeAll)', async () => {
    mocks.authState.current = {
      currentUser: { email: 'admin@ryb.com', uid: 'u1' },
      userData: { role: 'admin' },
      isAdmin: true, isMember: false, canOperate: true,
    };
    let lastState;
    render(<HookHarness onState={(s) => { lastState = s; }} />);
    await waitFor(() => expect(lastState?.loading).toBe(false));
    expect(mocks.visitService.subscribeAll).toHaveBeenCalledTimes(1);
    expect(lastState.visits).toHaveLength(2);
  });

  it('✅ Member: combina pendientes sin agente + asignadas a él', async () => {
    mocks.authState.current = {
      currentUser: { email: 'member@ryb.com', uid: 'u2' },
      userData: { role: 'member' },
      isAdmin: false, isMember: true, canOperate: true,
    };
    let lastState;
    render(<HookHarness onState={(s) => { lastState = s; }} />);
    await waitFor(() => expect(lastState?.loading).toBe(false));

    expect(mocks.visitService.subscribePending).toHaveBeenCalledTimes(1);
    expect(mocks.visitService.subscribeByAgent).toHaveBeenCalledWith(
      'member@ryb.com', expect.any(Function), expect.any(Function)
    );
    expect(mocks.visitService.subscribeAll).not.toHaveBeenCalled();

    const ids = lastState.visits.map((v) => v.id);
    expect(ids).toContain('p1');
    expect(ids).toContain('a1');
    expect(ids).not.toContain('p2');
  });

  it('✅ Viewer: lista vacía (sin acceso)', async () => {
    mocks.authState.current = {
      currentUser: { email: 'cliente@ryb.com', uid: 'u3' },
      userData: { role: 'viewer' },
      isAdmin: false, isMember: false, canOperate: false,
    };
    let lastState;
    render(<HookHarness onState={(s) => { lastState = s; }} />);
    await waitFor(() => expect(lastState?.loading).toBe(false));
    expect(lastState.visits).toEqual([]);
    expect(mocks.visitService.subscribeAll).not.toHaveBeenCalled();
    expect(mocks.visitService.subscribePending).not.toHaveBeenCalled();
  });

  it('✅ approve() con isMember auto-asigna al agente logueado', async () => {
    mocks.authState.current = {
      currentUser: {
        email: 'member@ryb.com', uid: 'u-mem', displayName: 'Member',
      },
      userData: { role: 'member' },
      isAdmin: false, isMember: true, canOperate: true,
    };
    let lastState;
    render(<HookHarness onState={(s) => { lastState = s; }} />);
    await waitFor(() => expect(lastState?.loading).toBe(false));

    await act(async () => {
      await lastState.approve({ id: 'visitX', propertyName: 'Casa' }, 'notas', {});
    });

    expect(mocks.visitService.approveVisit).toHaveBeenCalledTimes(1);
    const callArgs = mocks.visitService.approveVisit.mock.calls[0];
    expect(callArgs[0]).toMatchObject({ id: 'visitX' });
    expect(callArgs[1]).toBe('notas');
    expect(callArgs[2]).toMatchObject({
      agentId: 'u-mem',
      agentName: 'Member',
      agentEmail: 'member@ryb.com',
    });
  });

  it('✅ approve() respeta agentData explícito si se pasa (no auto-asigna)', async () => {
    mocks.authState.current = {
      currentUser: { email: 'member@ryb.com', uid: 'u-mem', displayName: 'M' },
      userData: { role: 'member' },
      isAdmin: false, isMember: true, canOperate: true,
    };
    let lastState;
    render(<HookHarness onState={(s) => { lastState = s; }} />);
    await waitFor(() => expect(lastState?.loading).toBe(false));

    await act(async () => {
      await lastState.approve(
        { id: 'visitY' },
        '',
        { agentId: 'other-uid', agentName: 'Other', agentEmail: 'other@ryb.com' }
      );
    });

    const callArgs = mocks.visitService.approveVisit.mock.calls[0];
    expect(callArgs[2]).toMatchObject({
      agentId: 'other-uid',
      agentEmail: 'other@ryb.com',
    });
  });

  it('✅ Admin no auto-asigna en approve() (no es member)', async () => {
    mocks.authState.current = {
      currentUser: { email: 'admin@ryb.com', uid: 'u-adm', displayName: 'Admin' },
      userData: { role: 'admin' },
      isAdmin: true, isMember: false, canOperate: true,
    };
    let lastState;
    render(<HookHarness onState={(s) => { lastState = s; }} />);
    await waitFor(() => expect(lastState?.loading).toBe(false));

    await act(async () => {
      await lastState.approve({ id: 'visitZ' }, '', {});
    });

    const callArgs = mocks.visitService.approveVisit.mock.calls[0];
    expect(callArgs[2]).toEqual({});
  });
});