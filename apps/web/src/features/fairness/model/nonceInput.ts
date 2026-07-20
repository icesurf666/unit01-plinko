import { parseIntegerInput } from '@/shared/lib/number';

export function parseNonceInput(value: string): number {
  return parseIntegerInput(value, { min: 0, fallback: 0 });
}
