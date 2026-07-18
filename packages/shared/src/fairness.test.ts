import { describe, it, expect } from 'vitest';
import {
  bucketOf,
  derivePath,
  normalizeSha256Commitment,
  resolveDrop,
  sha256Hex,
  verifyFairDrop,
  verifyServerSeedCommitment,
} from './fairness';
import { isRisk, PAYOUTS, RISKS, ROWS } from './payouts';

describe('risk helpers', () => {
  it('guards risk values at runtime', () => {
    expect(isRisk('low')).toBe(true);
    expect(isRisk('med')).toBe(true);
    expect(isRisk('high')).toBe(true);
    expect(isRisk('medium')).toBe(false);
  });
});

describe('derivePath', () => {
  it('is deterministic: same input → same path', () => {
    const a = derivePath('server', 'client', 1);
    const b = derivePath('server', 'client', 1);
    expect(a).toEqual(b);
  });

  it('returns a path of length ROWS with 0/1 bits', () => {
    const path = derivePath('s', 'c', 7);
    expect(path).toHaveLength(ROWS);
    expect(path.every((b) => b === 0 || b === 1)).toBe(true);
  });

  it('changes when nonce / clientSeed / serverSeed change', () => {
    const base = derivePath('s', 'c', 1);
    expect(derivePath('s', 'c', 2)).not.toEqual(base);
    expect(derivePath('s', 'x', 1)).not.toEqual(base);
    expect(derivePath('z', 'c', 1)).not.toEqual(base);
  });
});

describe('bucketOf', () => {
  it('always lands in [0, ROWS]', () => {
    for (let nonce = 0; nonce < 2000; nonce++) {
      const bucket = bucketOf(derivePath('seed', 'default', nonce));
      expect(bucket).toBeGreaterThanOrEqual(0);
      expect(bucket).toBeLessThanOrEqual(ROWS);
    }
  });

  it('converges to the center (binomial distribution)', () => {
    const N = 20000;
    let sum = 0;
    for (let n = 0; n < N; n++) sum += bucketOf(derivePath('seed', 'default', n));
    const mean = sum / N;
    // expectation of B(ROWS, 0.5) = ROWS/2
    expect(mean).toBeGreaterThan(ROWS / 2 - 0.3);
    expect(mean).toBeLessThan(ROWS / 2 + 0.3);
  });
});

describe('resolveDrop', () => {
  it('multiplier = PAYOUTS[risk][bucket]', () => {
    for (const risk of RISKS) {
      const r = resolveDrop('seed', 'default', 42, risk);
      expect(r.multiplier).toBe(PAYOUTS[risk][r.bucket]);
      expect(r.bucket).toBe(bucketOf(r.path));
    }
  });
});

describe('sha256Hex', () => {
  it('matches a known vector (sha256 of the empty string)', () => {
    expect(sha256Hex('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });

  it('is deterministic and changes with the input', () => {
    expect(sha256Hex('abc')).toBe(sha256Hex('abc'));
    expect(sha256Hex('abc')).not.toBe(sha256Hex('abd'));
  });
});

describe('commitment verification', () => {
  it('normalizes hash input and accepts an optional 0x prefix', () => {
    const hash = sha256Hex('server');
    expect(normalizeSha256Commitment(`0x${hash.toUpperCase()}`)).toBe(hash);
    expect(verifyServerSeedCommitment('server', `0x${hash}`).hashMatch).toBe(true);
  });

  it('rejects malformed commitments instead of silently comparing garbage', () => {
    expect(() => normalizeSha256Commitment('abc')).toThrow(/32-byte/);
    expect(() => verifyServerSeedCommitment('server', 'not-a-hash')).toThrow(/32-byte/);
  });

  it('returns null when no expected hash is provided', () => {
    expect(verifyServerSeedCommitment('server').hashMatch).toBeNull();
  });
});

describe('verifyFairDrop', () => {
  it('recomputes outcome and commitment in one pure function', () => {
    const hash = sha256Hex('server');
    const result = verifyFairDrop('server', 'client', 3, 'med', hash);
    expect(result.hashMatch).toBe(true);
    expect(result.bucket).toBe(bucketOf(result.path));
    expect(result.multiplier).toBe(PAYOUTS.med[result.bucket]);
  });

  it('validates user-entered verifier fields', () => {
    expect(() => verifyFairDrop('', 'client', 1, 'low')).toThrow(/server seed/);
    expect(() => verifyFairDrop('server', 'client', -1, 'low')).toThrow(/Nonce/);
  });
});

describe('PAYOUTS (game config)', () => {
  it('every risk profile has ROWS+1 buckets and is symmetric', () => {
    for (const risk of RISKS) {
      const arr = PAYOUTS[risk];
      expect(arr).toHaveLength(ROWS + 1);
      for (let i = 0; i <= ROWS; i++) expect(arr[i]).toBe(arr[ROWS - i]);
    }
  });

  it('center < edge (house edge in the center, jackpot at the edges)', () => {
    for (const risk of RISKS) {
      const arr = PAYOUTS[risk];
      const center = arr[ROWS / 2];
      const edge = arr[0];
      expect(center).toBeLessThan(edge);
      expect(center).toBeLessThanOrEqual(1);
    }
  });
});
