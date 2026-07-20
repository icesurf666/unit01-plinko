import { describe, expect, it } from 'vitest';
import { parseNonceInput } from './nonceInput';

describe('parseNonceInput', () => {
  it('accepts safe non-negative integer strings', () => {
    expect(parseNonceInput('0')).toBe(0);
    expect(parseNonceInput('42')).toBe(42);
  });

  it('rejects invalid, fractional and negative values to zero', () => {
    expect(parseNonceInput('abc')).toBe(0);
    expect(parseNonceInput('1.5')).toBe(0);
    expect(parseNonceInput('-1')).toBe(0);
  });

  it('rejects unsafe integers to zero', () => {
    expect(parseNonceInput(`${Number.MAX_SAFE_INTEGER + 1}`)).toBe(0);
  });
});
