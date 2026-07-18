import { describe, expect, it } from 'vitest';
import { normalizeEvmAddress, sameEvmAddress } from './identity';

describe('identity helpers', () => {
  it('normalizes EVM addresses', () => {
    expect(normalizeEvmAddress(' 0xAa000000000000000000000000000000000000Aa ')).toBe(
      '0xaa000000000000000000000000000000000000aa',
    );
  });

  it('rejects invalid EVM addresses', () => {
    expect(() => normalizeEvmAddress('0x123')).toThrow(/EVM address/);
  });

  it('compares addresses case-insensitively', () => {
    expect(
      sameEvmAddress(
        '0xAa000000000000000000000000000000000000Aa',
        '0xaa000000000000000000000000000000000000aa',
      ),
    ).toBe(true);
  });
});
