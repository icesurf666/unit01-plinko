import { afterEach, describe, expect, it } from 'vitest';
import { integerEnv } from './env';

const KEY = 'PLINKO_TEST_INTEGER_ENV';

afterEach(() => {
  delete process.env[KEY];
});

describe('integerEnv', () => {
  it('returns the default when the variable is missing', () => {
    expect(integerEnv(KEY, { defaultValue: 10 })).toBe(10);
  });

  it('rejects malformed and out-of-range values', () => {
    process.env[KEY] = 'abc';
    expect(() => integerEnv(KEY, { defaultValue: 10 })).toThrow(`${KEY} must be an integer.`);

    process.env[KEY] = '0';
    expect(() => integerEnv(KEY, { defaultValue: 10, min: 1 })).toThrow(`${KEY} must be >= 1.`);
  });
});
