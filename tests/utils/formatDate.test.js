// FIX [TEST]: cobertura para formatShort/formatLong/formatDateTime/formatRelative.
import { describe, expect, it, vi } from 'vitest';
import { formatDateTime, formatLong, formatRelative, formatShort } from '../../src/shared/utils/formatDate';

describe('formatDate utils', () => {
  it('devuelve fallback para entrada inválida', () => {
    expect(formatShort(null)).toBe('—');
    expect(formatLong('foo')).toBe('—');
  });

  it('formatea fecha en corto y largo', () => {
    const date = new Date('2026-04-06T10:30:00.000Z');
    expect(formatShort(date)).toMatch(/2026/);
    expect(formatLong(date)).toMatch(/2026/);
    expect(formatDateTime(date)).toMatch(/2026/);
  });

  it('acepta timestamp estilo Firestore', () => {
    const stub = { toDate: () => new Date('2026-04-06T10:30:00.000Z') };
    expect(formatShort(stub)).toMatch(/2026/);
  });

  it('calcula relativo en pasado cercano', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-10T10:00:00.000Z'));
    const value = new Date('2026-04-10T09:59:00.000Z');
    expect(formatRelative(value)).toMatch(/minuto|min/);
    vi.useRealTimers();
  });
});
