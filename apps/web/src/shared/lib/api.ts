import { io, type Socket } from 'socket.io-client';
import {
  type AuthNonceResult,
  type AuthTokenResult,
  type DropResult,
  type FeedDrop,
  type MeResult,
  type Risk,
  type SystemStatusResult,
  type WithdrawSigned,
} from '@plinko/shared';
import {
  clearAuthToken,
  currentAuthSession,
  getAuthToken,
  hasUsableAuthToken,
  isSignedInAs,
  sessionMatchesAddress,
  setAuthToken,
  signedInWallet,
} from './auth-session';

function apiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').trim().replace(/\/+$/, '');
}

const API = apiBaseUrl();
export const MISSING_SESSION_MESSAGE = 'Start demo mode or sign in with your wallet first.';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export { currentAuthSession, isSignedInAs, sessionMatchesAddress, signedInWallet };

export function hasActiveSession(address?: string): boolean {
  return sessionMatchesAddress(address);
}

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
  if (hasUsableAuthToken(token) && sessionMatchesAddress(address)) return;

  throw new ApiError(MISSING_SESSION_MESSAGE, 401);
}

export async function startDemoSession(): Promise<AuthTokenResult> {
  const guest = await request<AuthTokenResult>('/auth/guest', { method: 'POST' });
  setAuthToken(guest.token);
  return guest;
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

async function authHeaders(address?: string): Promise<Record<string, string>> {
  await ensureSession(address);
  const token = getAuthToken();
  if (!token) throw new ApiError('Missing auth token.', 401);
  return { authorization: `Bearer ${token}` };
}

async function jsonHeaders(address?: string): Promise<Record<string, string>> {
  return { 'content-type': 'application/json', ...(await authHeaders(address)) };
}

export async function drop(stake: number, risk: Risk, address?: string): Promise<DropResult> {
  return request<DropResult>('/drop', {
    method: 'POST',
    headers: await jsonHeaders(address),
    body: JSON.stringify({ stake, risk }),
  });
}

export async function getMe(address?: string): Promise<MeResult> {
  return request<MeResult>('/me', { headers: await authHeaders(address) });
}

export async function getFeedHistory(): Promise<FeedDrop[]> {
  return request<FeedDrop[]>('/feed');
}

export async function getSystemStatus(): Promise<SystemStatusResult> {
  return request<SystemStatusResult>('/ready');
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
