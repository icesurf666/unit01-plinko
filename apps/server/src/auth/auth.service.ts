import { randomBytes, randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { normalizeEvmAddress, sameEvmAddress } from '@plinko/shared';
import { isAddress, verifyMessage, type Hex } from 'viem';
import { createJwt, verifyJwt, type AuthClaims } from './jwt';
import { buildSiweMessage, parseSiweMessage } from './siwe';
import { integerEnv } from '../config/env';
import { redisCommand, redisEnabled } from '../redis';

interface NonceRecord {
  address: Hex;
  expiresAt: number;
}

const DEV_JWT_SECRET = 'unit-01-dev-secret-change-me';

function parseNonceRecord(serialized: string): NonceRecord | null {
  try {
    const parsed = JSON.parse(serialized) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const record = parsed as Record<string, unknown>;
    if (
      typeof record.address === 'string' &&
      isAddress(record.address) &&
      typeof record.expiresAt === 'number' &&
      Number.isFinite(record.expiresAt)
    ) {
      return { address: normalizeEvmAddress(record.address) as Hex, expiresAt: record.expiresAt };
    }
  } catch {
    return null;
  }
  return null;
}

@Injectable()
export class AuthService {
  private readonly nonces = new Map<string, NonceRecord>();
  private readonly jwtSecret = process.env.JWT_SECRET ?? DEV_JWT_SECRET;
  private readonly jwtTtlSec = integerEnv('JWT_TTL_SEC', { defaultValue: 60 * 60 * 24, min: 60 });
  private readonly nonceTtlMs = integerEnv('SIWE_NONCE_TTL_MS', {
    defaultValue: 5 * 60 * 1000,
    min: 1_000,
  });
  private readonly domain = process.env.SIWE_DOMAIN ?? 'localhost:3000';
  private readonly uri = process.env.SIWE_URI ?? 'http://localhost:3000';
  private readonly chainId = integerEnv('CHAIN_ID', { defaultValue: 84532, min: 1 });

  constructor() {
    if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is required in production.');
    }
  }

  createGuestToken(): { token: string; subject: string; expiresAt: number } {
    const subject = `guest:${randomUUID()}`;
    return this.issueToken({ sub: subject, kind: 'guest' });
  }

  async createNonce(address: string): Promise<{ address: string; nonce: string; message: string; expiresAt: number }> {
    if (!isAddress(address)) throw new UnauthorizedException('Invalid wallet address.');
    const normalized = normalizeEvmAddress(address) as Hex;
    const nonce = randomBytes(12).toString('base64url');
    const expiresAt = Date.now() + this.nonceTtlMs;
    const record: NonceRecord = { address: normalized, expiresAt };
    if (redisEnabled()) {
      const ok = await redisCommand([
        'SET',
        this.nonceKey(nonce),
        JSON.stringify(record),
        'EX',
        Math.ceil(this.nonceTtlMs / 1000),
      ]);
      if (ok === null) this.nonces.set(nonce, record);
    } else {
      this.nonces.set(nonce, record);
    }
    return {
      address: normalized,
      nonce,
      expiresAt,
      message: buildSiweMessage({
        address,
        chainId: this.chainId,
        domain: this.domain,
        nonce,
        uri: this.uri,
      }),
    };
  }

  async verifySiwe(message: string, signature: Hex): Promise<{ token: string; subject: string; expiresAt: number }> {
    const parsed = parseSiweMessage(message);
    const record = await this.consumeNonce(parsed.nonce);
    if (!record || record.expiresAt < Date.now()) throw new UnauthorizedException('SIWE nonce expired.');
    if (!sameEvmAddress(record.address, parsed.address)) {
      throw new UnauthorizedException('SIWE address does not match nonce.');
    }
    if (parsed.chainId !== this.chainId) throw new UnauthorizedException('Unexpected SIWE chain ID.');

    const ok = await verifyMessage({ address: parsed.address as Hex, message, signature });
    if (!ok) throw new UnauthorizedException('Invalid wallet signature.');

    const subject = normalizeEvmAddress(parsed.address);
    return this.issueToken({ sub: subject, wallet: subject, kind: 'wallet' });
  }

  verifyBearer(header?: string): AuthClaims {
    const token = header?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) throw new UnauthorizedException('Missing bearer token.');
    try {
      return verifyJwt(token, this.jwtSecret);
    } catch {
      throw new UnauthorizedException('Invalid bearer token.');
    }
  }

  private issueToken(base: Pick<AuthClaims, 'sub' | 'kind'> & Partial<AuthClaims>) {
    const now = Math.floor(Date.now() / 1000);
    const claims: AuthClaims = {
      ...base,
      iat: now,
      exp: now + this.jwtTtlSec,
    };
    return { token: createJwt(claims, this.jwtSecret), subject: claims.sub, expiresAt: claims.exp * 1000 };
  }

  private nonceKey(nonce: string): string {
    return `plinko:siwe:nonce:${nonce}`;
  }

  private async consumeNonce(nonce: string): Promise<NonceRecord | null> {
    if (redisEnabled()) {
      const raw = await redisCommand(['GETDEL', this.nonceKey(nonce)]);
      if (typeof raw === 'string') return parseNonceRecord(raw);
      const fallback = this.nonces.get(nonce) ?? null;
      this.nonces.delete(nonce);
      return fallback;
    }
    const record = this.nonces.get(nonce) ?? null;
    this.nonces.delete(nonce);
    return record;
  }
}
