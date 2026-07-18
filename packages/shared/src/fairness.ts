// Provably-fair core. A single util shared by the server and the /verify page.
// Stake scheme: path = HMAC_SHA256(serverSeed, `${clientSeed}:${nonce}`).

import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
import { PAYOUTS, ROWS, type Risk } from './payouts';

const enc = new TextEncoder();

/** 12 direction bits (0 = left, 1 = right), the low bit of the first ROWS bytes. */
export function derivePath(serverSeed: string, clientSeed: string, nonce: number): number[] {
  const digest = hmac(sha256, enc.encode(serverSeed), enc.encode(`${clientSeed}:${nonce}`));
  const bits: number[] = [];
  for (let r = 0; r < ROWS; r++) bits.push(digest[r] & 1);
  return bits;
}

/** Bucket index 0..ROWS = number of "right" moves. */
export function bucketOf(path: number[]): number {
  return path.reduce((a, b) => a + b, 0);
}

export interface ResolvedDrop {
  path: number[];
  bucket: number;
  multiplier: number;
}

export interface VerifiedDrop extends ResolvedDrop {
  computedHash: string;
  hashMatch: boolean | null;
}

export function resolveDrop(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  risk: Risk,
): ResolvedDrop {
  const path = derivePath(serverSeed, clientSeed, nonce);
  const bucket = bucketOf(path);
  const multiplier = PAYOUTS[risk][bucket];
  return { path, bucket, multiplier };
}

/** sha256(hex) — the commitment to a server seed. */
export function sha256Hex(input: string): string {
  return bytesToHex(sha256(enc.encode(input)));
}

export function normalizeHex(input: string): string {
  return input.trim().toLowerCase().replace(/^0x/, '');
}

export function normalizeSha256Commitment(input: string): string {
  const value = normalizeHex(input);
  if (!/^[a-f0-9]{64}$/.test(value)) {
    throw new Error('Expected a 32-byte SHA-256 hash.');
  }
  return value;
}

export function verifyServerSeedCommitment(
  serverSeed: string,
  expectedHash?: string,
): { computedHash: string; hashMatch: boolean | null } {
  const computedHash = sha256Hex(serverSeed);
  if (!expectedHash?.trim()) return { computedHash, hashMatch: null };
  return {
    computedHash,
    hashMatch: computedHash === normalizeSha256Commitment(expectedHash),
  };
}

export function verifyFairDrop(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  risk: Risk,
  expectedHash?: string,
): VerifiedDrop {
  if (!serverSeed.trim()) throw new Error('Enter a server seed.');
  if (!Number.isSafeInteger(nonce) || nonce < 0) throw new Error('Nonce must be a non-negative integer.');
  const resolved = resolveDrop(serverSeed.trim(), clientSeed, nonce, risk);
  return {
    ...resolved,
    ...verifyServerSeedCommitment(serverSeed.trim(), expectedHash),
  };
}
