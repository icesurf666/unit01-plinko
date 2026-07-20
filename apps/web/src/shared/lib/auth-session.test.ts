import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearAuthToken,
  currentAuthSession,
  isSignedInAs,
  sessionMatchesAddress,
  setAuthToken,
} from './auth-session';

function base64Url(input: object): string {
  return Buffer.from(JSON.stringify(input)).toString('base64url');
}

function token(payload: object): string {
  return `${base64Url({ alg: 'none' })}.${base64Url(payload)}.signature`;
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

describe('auth session helpers', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    installWindowStub();
    clearAuthToken();
  });

  it('returns null when no usable token exists', () => {
    expect(currentAuthSession()).toBeNull();
    expect(sessionMatchesAddress()).toBe(false);
  });

  it('decodes a guest session and allows it for any connected wallet', () => {
    setAuthToken(token({ exp: Math.floor(Date.now() / 1000) + 3600, kind: 'guest', sub: 'guest:1' }));

    expect(currentAuthSession()).toMatchObject({ kind: 'guest', subject: 'guest:1' });
    expect(sessionMatchesAddress('0x1111111111111111111111111111111111111111')).toBe(true);
  });

  it('matches wallet sessions case-insensitively', () => {
    setAuthToken(token({
      exp: Math.floor(Date.now() / 1000) + 3600,
      kind: 'wallet',
      sub: '0x1111111111111111111111111111111111111111',
      wallet: '0x1111111111111111111111111111111111111111',
    }));

    expect(isSignedInAs('0x1111111111111111111111111111111111111111')).toBe(true);
    expect(sessionMatchesAddress('0x2222222222222222222222222222222222222222')).toBe(false);
  });

  it('rejects expired sessions before they can be used', () => {
    setAuthToken(token({ exp: Math.floor(Date.now() / 1000) - 1, kind: 'guest', sub: 'guest:old' }));

    expect(currentAuthSession()).toBeNull();
    expect(sessionMatchesAddress()).toBe(false);
  });
});
