export const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
export const HEX_SIGNATURE_RE = /^0x[a-fA-F0-9]+$/;

export function normalizeEvmAddress(address: string): string {
  const value = address.trim().toLowerCase();
  if (!EVM_ADDRESS_RE.test(value)) throw new Error('Expected an EVM address.');
  return value;
}

export function sameEvmAddress(a: string, b: string): boolean {
  return normalizeEvmAddress(a) === normalizeEvmAddress(b);
}
