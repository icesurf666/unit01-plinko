import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MISSING_SESSION_MESSAGE } from './api';

const API_URL = 'https://api.example.test';
const WALLET = '0x1111111111111111111111111111111111111111';
const OTHER_WALLET = '0x2222222222222222222222222222222222222222';

function base64Url(input: object): string {
  return Buffer.from(JSON.stringify(input)).toString('base64url');
}

function token(payload: object): string {
  return `${base64Url({ alg: 'none' })}.${base64Url(payload)}.signature`;
}

function futureToken(payload: object): string {
  return token({ exp: Math.floor(Date.now() / 1000) + 3600, ...payload });
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
    status,
  });
}

function installWindowStub() {
  const store = new Map<string, string>();
  vi.stubGlobal('window', {
    atob: (value: string) => Buffer.from(value, 'base64').toString('binary'),
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      removeItem: (key: string) => {
        store.delete(key);
      },
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    },
  });
}

async function loadApi() {
  vi.resetModules();
  process.env.NEXT_PUBLIC_API_URL = `${API_URL}/`;
  installWindowStub();
  return import('./api');
}

describe('api client', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it('starts demo sessions and persists the returned JWT', async () => {
    const api = await loadApi();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ expiresAt: 123, kind: 'guest', token: 'jwt' }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(api.startDemoSession()).resolves.toMatchObject({ kind: 'guest', token: 'jwt' });
    expect(api.currentAuthSession()).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/auth/guest`, { method: 'POST' });
  });

  it('runs the SIWE nonce, signature and verify flow', async () => {
    const api = await loadApi();
    const signMessage = vi.fn().mockResolvedValue('0xsig');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ message: 'Sign this nonce' }))
      .mockResolvedValueOnce(
        jsonResponse({
          expiresAt: 123,
          kind: 'wallet',
          token: futureToken({ kind: 'wallet', sub: WALLET, wallet: WALLET }),
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    await api.signInWithWallet(WALLET, signMessage);

    expect(signMessage).toHaveBeenCalledWith('Sign this nonce');
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `${API_URL}/auth/nonce?address=${encodeURIComponent(WALLET)}`,
      {},
    );
    expect(fetchMock).toHaveBeenNthCalledWith(2, `${API_URL}/auth/verify`, {
      body: JSON.stringify({ message: 'Sign this nonce', signature: '0xsig' }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });
    expect(api.isSignedInAs(WALLET)).toBe(true);
  });

  it('does not send gameplay requests without an active session', async () => {
    const api = await loadApi();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(api.drop(10, 'med')).rejects.toMatchObject({
      message: MISSING_SESSION_MESSAGE,
      status: 401,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends gameplay requests with bearer auth for a matching wallet session', async () => {
    const api = await loadApi();
    const auth = await import('./auth-session');
    const sessionToken = futureToken({ kind: 'wallet', sub: WALLET, wallet: WALLET });
    auth.setAuthToken(sessionToken);
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ balance: 90, payout: 20 }));
    vi.stubGlobal('fetch', fetchMock);

    await api.drop(10, 'high', WALLET);

    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/drop`, {
      body: JSON.stringify({ stake: 10, risk: 'high' }),
      headers: {
        authorization: `Bearer ${sessionToken}`,
        'content-type': 'application/json',
      },
      method: 'POST',
    });
  });

  it('blocks wallet-scoped requests when the session belongs to another wallet', async () => {
    const api = await loadApi();
    const auth = await import('./auth-session');
    auth.setAuthToken(futureToken({ kind: 'wallet', sub: WALLET, wallet: WALLET }));
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(api.drop(10, 'low', OTHER_WALLET)).rejects.toMatchObject({
      message: MISSING_SESSION_MESSAGE,
      status: 401,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('surfaces backend error messages consistently', async () => {
    const api = await loadApi();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ message: ['stake must be positive'] }, 400));
    vi.stubGlobal('fetch', fetchMock);

    await expect(api.getFeedHistory()).rejects.toMatchObject({
      message: 'stake must be positive',
      status: 400,
    });
  });
});
