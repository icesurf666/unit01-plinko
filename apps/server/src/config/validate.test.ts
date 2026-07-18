import { afterEach, describe, expect, it } from 'vitest';
import { validateRuntimeConfig } from './validate';

const saved = { ...process.env };

function prodEnv(overrides: Record<string, string | undefined> = {}) {
  process.env = {
    ...saved,
    NODE_ENV: 'production',
    JWT_SECRET: 'secret',
    CORS_ORIGINS: 'https://plinko.example',
    SIWE_DOMAIN: 'plinko.example',
    SIWE_URI: 'https://plinko.example',
    RPC_URL: 'https://base-sepolia.example',
    TRUSTED_SIGNER_PK: '0xabc',
    VAULT_ADDRESS: '0x1111111111111111111111111111111111111111',
    TOKEN_ADDRESS: '0x2222222222222222222222222222222222222222',
    DATABASE_URL: 'postgres://user:pass@localhost:5432/plinko',
    ...overrides,
  };
}

describe('validateRuntimeConfig', () => {
  afterEach(() => {
    process.env = { ...saved };
  });

  it('accepts complete production config', () => {
    prodEnv();
    expect(() => validateRuntimeConfig()).not.toThrow();
  });

  it('rejects missing production secrets and zero addresses', () => {
    prodEnv({ JWT_SECRET: undefined, VAULT_ADDRESS: '0x0000000000000000000000000000000000000000' });
    expect(() => validateRuntimeConfig()).toThrow(/JWT_SECRET/);
    expect(() => validateRuntimeConfig()).toThrow(/VAULT_ADDRESS/);
  });

  it('requires explicit overrides for memory store and insecure redis', () => {
    prodEnv({ DATABASE_URL: undefined });
    expect(() => validateRuntimeConfig()).toThrow(/DATABASE_URL/);

    prodEnv({ REDIS_URL: 'redis://localhost:6379' });
    expect(() => validateRuntimeConfig()).toThrow(/rediss/);

    prodEnv({
      DATABASE_URL: undefined,
      ALLOW_MEMORY_STORE_IN_PRODUCTION: 'true',
      REDIS_URL: 'redis://localhost:6379',
      ALLOW_INSECURE_REDIS_IN_PRODUCTION: 'true',
    });
    expect(() => validateRuntimeConfig()).not.toThrow();
  });
});
