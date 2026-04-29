// tests/frontend/profileService.test.js
//
// Test del método profileService.requestAccountDeletion.
// Mockea Firestore y verifica que crea un doc en /accountDeletionRequests
// con status: 'pending'.

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── Mocks ──────────────────────────────────────────────────────────────
const mockAddDoc = vi.fn().mockResolvedValue({ id: 'new-deletion-req' });
const mockGetDocs = vi.fn().mockResolvedValue({ empty: true, docs: [] });

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((db, name) => ({ __coll: name })),
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  query: vi.fn((...args) => ({ __query: true, args })),
  where: vi.fn((field, op, val) => ({ field, op, val })),
  limit: vi.fn((n) => ({ limit: n })),
  addDoc: (...args) => mockAddDoc(...args),
  getDocs: (...args) => mockGetDocs(...args),
  Timestamp: { now: () => ({ seconds: 12345 }) },
  serverTimestamp: vi.fn(() => 'TS'),
}));

vi.mock('firebase/auth', () => ({
  EmailAuthProvider: { credential: vi.fn() },
  reauthenticateWithCredential: vi.fn(),
  updatePassword: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));

vi.mock('firebase/storage', () => ({
  ref: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
}));

vi.mock('../../src/core/config/firebase.config', () => ({
  db: {}, auth: {}, storage: {},
}));

import { profileService } from '../../src/modules/profile/services/profile.service.js';

beforeEach(() => {
  mockAddDoc.mockClear();
  mockAddDoc.mockResolvedValue({ id: 'new-deletion-req' });
  mockGetDocs.mockClear();
  mockGetDocs.mockResolvedValue({ empty: true, docs: [] });
});

describe('profileService.requestAccountDeletion', () => {
  it('✅ Crea doc en /accountDeletionRequests con status="pending"', async () => {
    await profileService.requestAccountDeletion('uid-123', 'cliente@ryb.com', 'No la uso');

    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    const [collectionRef, payload] = mockAddDoc.mock.calls[0];
    expect(collectionRef.__coll).toBe('accountDeletionRequests');
    expect(payload).toMatchObject({
      uid: 'uid-123',
      email: 'cliente@ryb.com',
      reason: 'No la uso',
      status: 'pending',
    });
    expect(payload.createdAt).toBeDefined();
  });

  it('✅ reason vacío se persiste como string vacío (no undefined)', async () => {
    await profileService.requestAccountDeletion('uid-x', 'a@b.com', undefined);
    const payload = mockAddDoc.mock.calls[0][1];
    expect(payload.reason).toBe('');
  });

  it('🚫 Si ya existe solicitud pending del mismo email, lanza error', async () => {
    // Simular query que devuelve un doc existente
    mockGetDocs.mockResolvedValue({
      empty: false,
      docs: [{ id: 'existing', data: () => ({ status: 'pending' }) }],
    });

    await expect(
      profileService.requestAccountDeletion('uid-x', 'a@b.com', 'razón')
    ).rejects.toThrow(/ya tienes/i);

    // No debería haber llegado a addDoc
    expect(mockAddDoc).not.toHaveBeenCalled();
  });
});
