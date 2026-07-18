export interface IntegerEnvOptions {
  defaultValue: number;
  max?: number;
  min?: number;
}

export function integerEnv(key: string, { defaultValue, min, max }: IntegerEnvOptions): number {
  const raw = process.env[key];
  if (!raw) return defaultValue;

  const value = Number(raw);
  if (!Number.isSafeInteger(value)) {
    throw new Error(`${key} must be an integer.`);
  }
  if (min !== undefined && value < min) {
    throw new Error(`${key} must be >= ${min}.`);
  }
  if (max !== undefined && value > max) {
    throw new Error(`${key} must be <= ${max}.`);
  }
  return value;
}

export function bigintEnv(key: string, options: IntegerEnvOptions): bigint {
  return BigInt(integerEnv(key, options));
}
