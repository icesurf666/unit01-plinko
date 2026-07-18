function missing(keys: string[]): string[] {
  return keys.filter((key) => !process.env[key]);
}

function isZeroAddress(value?: string): boolean {
  return !value || /^0x0{40}$/i.test(value);
}

export function validateRuntimeConfig(): void {
  if (process.env.NODE_ENV !== 'production') return;

  const required = missing([
    'JWT_SECRET',
    'CORS_ORIGINS',
    'SIWE_DOMAIN',
    'SIWE_URI',
    'RPC_URL',
    'TRUSTED_SIGNER_PK',
  ]);

  if (isZeroAddress(process.env.VAULT_ADDRESS)) required.push('VAULT_ADDRESS');
  if (isZeroAddress(process.env.TOKEN_ADDRESS)) required.push('TOKEN_ADDRESS');

  if (required.length) {
    throw new Error(`Missing required production env: ${required.join(', ')}`);
  }

  if (!process.env.DATABASE_URL && process.env.ALLOW_MEMORY_STORE_IN_PRODUCTION !== 'true') {
    throw new Error('DATABASE_URL is required in production unless ALLOW_MEMORY_STORE_IN_PRODUCTION=true.');
  }

  if (process.env.REDIS_URL?.startsWith('redis://') && process.env.ALLOW_INSECURE_REDIS_IN_PRODUCTION !== 'true') {
    throw new Error('Use rediss:// in production or set ALLOW_INSECURE_REDIS_IN_PRODUCTION=true explicitly.');
  }

  const insecureOrigins = process.env.CORS_ORIGINS!.split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin && !origin.startsWith('https://'));
  if (insecureOrigins.length && process.env.ALLOW_INSECURE_ORIGINS_IN_PRODUCTION !== 'true') {
    throw new Error(
      `Production CORS origins must use https://: ${insecureOrigins.join(', ')}`,
    );
  }
}
