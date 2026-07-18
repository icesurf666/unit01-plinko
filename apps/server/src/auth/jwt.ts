import { createHmac, timingSafeEqual } from 'node:crypto';

export interface AuthClaims {
  sub: string;
  iat: number;
  exp: number;
  wallet?: string;
  kind: 'guest' | 'wallet';
}

const enc = new TextEncoder();

function b64url(input: string | Uint8Array): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : Buffer.from(input);
  return buf.toString('base64url');
}

function sign(data: string, secret: string): string {
  return createHmac('sha256', enc.encode(secret)).update(data).digest('base64url');
}

export function createJwt(claims: AuthClaims, secret: string): string {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify(claims));
  const data = `${header}.${payload}`;
  return `${data}.${sign(data, secret)}`;
}

export function verifyJwt(token: string, secret: string, now = Math.floor(Date.now() / 1000)): AuthClaims {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token.');
  const [header, payload, signature] = parts;
  const expected = sign(`${header}.${payload}`, secret);
  const sigBuf = Buffer.from(signature, 'base64url');
  const expectedBuf = Buffer.from(expected, 'base64url');
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    throw new Error('Invalid token signature.');
  }
  const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as AuthClaims;
  if (!parsed.sub || !parsed.exp || parsed.exp < now) throw new Error('Token expired.');
  return parsed;
}
