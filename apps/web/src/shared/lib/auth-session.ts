import { normalizeEvmAddress } from '@plinko/shared';

const TOKEN_KEY = 'unit01.authToken';
const TOKEN_EXPIRY_SKEW_MS = 10_000;

interface JwtPayload {
  sub: string;
  exp: number;
  wallet?: string;
  kind?: 'guest' | 'wallet';
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  if (typeof window !== 'undefined') window.localStorage.removeItem(TOKEN_KEY);
}

function isJwtPayload(value: unknown): value is JwtPayload {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Partial<JwtPayload>;
  const validKind = payload.kind === undefined || payload.kind === 'guest' || payload.kind === 'wallet';
  const validWallet = payload.wallet === undefined || typeof payload.wallet === 'string';
  return typeof payload.sub === 'string' && typeof payload.exp === 'number' && validKind && validWallet;
}

export function decodeAuthToken(token: string | null): JwtPayload | null {
  if (!token || typeof window === 'undefined') return null;
  try {
    const encodedPayload = token.split('.')[1];
    if (!encodedPayload) return null;
    const base64 = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const parsed = JSON.parse(window.atob(padded)) as unknown;
    return isJwtPayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function hasUsableAuthToken(token: string | null): boolean {
  const payload = decodeAuthToken(token);
  return Boolean(payload?.sub && payload.exp * 1000 > Date.now() + TOKEN_EXPIRY_SKEW_MS);
}

export function signedInWallet(): string | null {
  const payload = decodeAuthToken(getAuthToken());
  if (!payload || payload.kind !== 'wallet' || !payload.wallet) return null;
  return payload.wallet;
}

export function isSignedInAs(address?: string): boolean {
  if (!address) return false;
  try {
    return signedInWallet() === normalizeEvmAddress(address);
  } catch {
    return false;
  }
}

