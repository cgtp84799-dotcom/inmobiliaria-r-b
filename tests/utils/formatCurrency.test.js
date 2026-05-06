// FIX [TEST]: cobertura para formatCOP y formatCOPRange.
import { describe, expect, it } from 'vitest';
import { formatCOP, formatCOPRange } from '../../src/shared/utils/formatCurrency';

describe('formatCurrency utils', () => {
  it('formatea valores COP estándar', () => {
    expect(formatCOP(1500000)).toContain('1.500.000');
  });

  it('formatea compactado en millones', () => {
    expect(formatCOP(1500000, true)).toBe('$ 1,5M');
  });

  it('maneja nulos e inválidos', () => {
    expect(formatCOP(null)).toBe('—');
    expect(formatCOP('abc')).toBe('—');
  });

  it('formatea rangos', () => {
    expect(formatCOPRange(1000000, 2000000)).toContain('–');
    expect(formatCOPRange(1000000, null)).toContain('Desde');
    expect(formatCOPRange(null, 2000000)).toContain('Hasta');
    expect(formatCOPRange(null, null)).toBe('—');
  });
});