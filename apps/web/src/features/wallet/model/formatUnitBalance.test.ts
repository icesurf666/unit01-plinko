import { describe, expect, it } from 'vitest';
import { formatUnitBalance } from './formatUnitBalance';

describe('formatUnitBalance', () => {
  it('formats missing and zero balances', () => {
    expect(formatUnitBalance()).toBe('0');
    expect(formatUnitBalance(0n)).toBe('0');
  });

  it('formats whole UNIT amounts with separators', () => {
    expect(formatUnitBalance(1234567n * 10n ** 18n)).toBe('1,234,567');
  });

  it('keeps at most two visible decimals and trims trailing zeroes', () => {
    expect(formatUnitBalance(1234560000000000000n)).toBe('1.23');
    expect(formatUnitBalance(1200000000000000000n)).toBe('1.2');
  });
});
