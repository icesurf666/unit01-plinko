import { io, type Socket } from 'socket.io-client';
import {
  type AuthNonceResult,
  type AuthTokenResult,
  type DropResult,
  type MeResult,
  type Risk,
  type WithdrawSigned,
} from '@plinko/shared';
import {
  clearAuthToken,
  decodeAuthToken,
  getAuthToken,
  hasUsableAuthToken,
  isSignedInAs,
  setAuthToken,
  signedInWallet,
} from './auth-session';

function apiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').trim().replace(/\/+$/, '');
}

const API = apiBaseUrl();

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export { isSignedInAs, signedInWallet };

export function signOut(): void {
  clearAuthToken();
}

async function readError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    const msg = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    return msg || `${res.status} ${res.statusText}`;
  } catch {
    return `${res.status} ${res.statusText}`;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, init);
  if (!res.ok) throw new ApiError(await readError(res), res.status);
  return res.json();
}

export async function ensureSession(address?: string): Promise<void> {
  const token = getAuthToken();
  if (address && isSignedInAs(address)) return;
  if (!address && hasUsableAuthToken(token)) return;

  const payload = decodeAuthToken(token);
  if (address && payload?.kind === 'guest' && hasUsableAuthToken(token)) return;

  const guest = await request<AuthTokenResult>('/auth/guest', { method: 'POST' });
  setAuthToken(guest.token);
}

export async function signInWithWallet(
  address: string,
  signMessage: (message: string) => Promise<string>,
): Promise<AuthTokenResult> {
  const nonce = await request<AuthNonceResult>(`/auth/nonce?address=${encodeURIComponent(address)}`);
  const signature = await signMessage(nonce.message);
  const session = await request<AuthTokenResult>('/auth/verify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: nonce.message, signature }),
  });
  setAuthToken(session.token);
  return session;
}

async function authHeaders(): Promise<Record<string, string>> {
  await ensureSession();
  const token = getAuthToken();
  if (!token) throw new ApiError('Missing auth token.', 401);
  return { authorization: `Bearer ${token}` };
}

async function jsonHeaders(): Promise<Record<string, string>> {
  return { 'content-type': 'application/json', ...(await authHeaders()) };
}

export async function drop(stake: number, risk: Risk): Promise<DropResult> {
  return request<DropResult>('/drop', {
    method: 'POST',
    headers: await jsonHeaders(),
    body: JSON.stringify({ stake, risk }),
  });
}

export async function getMe(address?: string): Promise<MeResult> {
  await ensureSession(address);
  return request<MeResult>('/me', { headers: await authHeaders() });
}

/** Reserves the off-chain balance and returns an EIP-712 signature for Vault.withdraw. */
export async function requestWithdrawSig(amount: number, to: string): Promise<WithdrawSigned> {
  if (!isSignedInAs(to)) throw new ApiError('Sign in with this wallet before withdrawing.', 401);
  return request<WithdrawSigned>('/withdraw', {
    method: 'POST',
    headers: await jsonHeaders(),
    body: JSON.stringify({ amount, to }),
  });
}

let socket: Socket | null = null;
export function getSocket(): Socket {
  if (!socket) socket = io(API, { transports: ['websocket'] });
  return socket;
}
