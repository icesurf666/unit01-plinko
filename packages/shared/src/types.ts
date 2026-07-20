import { z } from 'zod';
import { RISKS, type Risk } from './payouts';
import { EVM_ADDRESS_RE, HEX_SIGNATURE_RE } from './identity';

// -- Auth -----------------------------------------------------------------
export const authNonceRequestSchema = z.object({
  address: z.string().regex(EVM_ADDRESS_RE),
});
export type AuthNonceRequest = z.infer<typeof authNonceRequestSchema>;

export interface AuthNonceResult {
  address: string;
  nonce: string;
  message: string;
  expiresAt: number;
}

export const authVerifyRequestSchema = z.object({
  message: z.string().min(1).max(2048),
  signature: z.string().regex(HEX_SIGNATURE_RE),
});
export type AuthVerifyRequest = z.infer<typeof authVerifyRequestSchema>;

export interface AuthTokenResult {
  token: string;
  subject: string;
  expiresAt: number;
}

// ── REST /drop ──────────────────────────────────────────────────────
export const dropRequestSchema = z.object({
  stake: z.number().finite().positive(),
  risk: z.enum(RISKS),
  clientSeed: z.string().max(128).optional(),
});
export type DropRequest = z.infer<typeof dropRequestSchema>;

export interface DropResult {
  dropId: string;
  nonce: number;
  path: number[];
  bucket: number;
  multiplier: number;
  payout: number;
  stake: number;
  risk: Risk;
  balance: number;
  serverSeedHash: string;
}

export interface MeResult {
  balance: number;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
}

// ── REST /withdraw (server signs the EIP-712 authorization) ─────────
export const withdrawRequestSchema = z.object({
  amount: z.number().finite().positive(),
  to: z.string().regex(EVM_ADDRESS_RE),
});
export type WithdrawRequest = z.infer<typeof withdrawRequestSchema>;

export interface WithdrawSigned {
  to: string;
  amount: number; // whole UNIT
  amountWei: string; // 18 decimals, for the contract
  nonce: number;
  deadline: number;
  sig: string;
  signer: string;
  balance: number; // off-chain balance after the reserve
}

// ── WS feed (broadcast) ─────────────────────────────────────────────
export interface FeedDrop {
  addr: string;
  stake: number;
  risk: Risk;
  bucket: number;
  multiplier: number;
  payout: number;
  ts: number;
}

// ── REST /ready ─────────────────────────────────────────────────────
export interface SystemStatusResult {
  status: 'ready' | 'degraded';
  checks: {
    store: {
      backend: string;
      ok: boolean;
      error?: string;
    };
    redis: {
      configured: boolean;
      ok: boolean;
    };
  };
  ts: number;
}
