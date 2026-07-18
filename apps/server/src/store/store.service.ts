import { randomBytes } from 'node:crypto';
import { sha256Hex } from '@plinko/shared';
import { integerEnv } from '../config/env';

export interface SeedCtx {
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
}

export function freshSeed(clientSeed = 'default'): SeedCtx {
  const serverSeed = randomBytes(32).toString('hex');
  return { serverSeed, serverSeedHash: sha256Hex(serverSeed), clientSeed, nonce: 0 };
}

export const START_BALANCE = integerEnv('START_BALANCE', { defaultValue: 1000, min: 0 });

// Balance/seed abstraction. Implementations: MemoryStore (demo) and LedgerStore
// (Postgres, double-entry). All methods are async — one interface for both.
export abstract class StoreService {
  readonly backendName: string = 'unknown';

  abstract get(addr: string): Promise<{ balance: number; seed: SeedCtx }>;
  abstract setClientSeed(addr: string, clientSeed: string): Promise<void>;
  abstract nextNonce(addr: string): Promise<SeedCtx>;
  abstract applyDrop(addr: string, stake: number, payout: number, idemKey: string): Promise<number>;
  abstract reserve(addr: string, amount: number, idemKey: string): Promise<boolean>;
  abstract creditDeposit(addr: string, amount: number, idemKey: string): Promise<number>;
  abstract rotate(addr: string): Promise<{
    revealed: { serverSeed: string; serverSeedHash: string };
    next: { serverSeedHash: string };
  }>;

  async ready(): Promise<boolean> {
    return true;
  }

  private static wseq = 0;
  // EIP-712 withdraw nonce — monotonically unique by time (survives restarts).
  nextWithdrawNonce(): number {
    StoreService.wseq = (StoreService.wseq + 1) % 1000;
    return Date.now() * 1000 + StoreService.wseq;
  }
}
