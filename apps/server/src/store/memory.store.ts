import { Injectable } from '@nestjs/common';
import { StoreService, freshSeed, initialBalanceForPlayer, type SeedCtx } from './store.service';

// In-memory implementation (demo without a DB). Idempotency via a Set of keys.
interface Player {
  balance: number;
  seed: SeedCtx;
}

@Injectable()
export class MemoryStore extends StoreService {
  override readonly backendName = 'memory';

  private readonly players = new Map<string, Player>();
  private readonly applied = new Set<string>();

  private ensure(addr: string): Player {
    let p = this.players.get(addr);
    if (!p) {
      p = { balance: initialBalanceForPlayer(addr), seed: freshSeed() };
      this.players.set(addr, p);
    }
    return p;
  }

  private applyOnce(idemKey: string, apply: () => void): boolean {
    if (this.applied.has(idemKey)) return false;
    this.applied.add(idemKey);
    apply();
    return true;
  }

  async get(addr: string) {
    const p = this.ensure(addr);
    return { balance: p.balance, seed: p.seed };
  }

  async setClientSeed(addr: string, clientSeed: string) {
    this.ensure(addr).seed = freshSeed(clientSeed);
  }

  async nextNonce(addr: string) {
    const p = this.ensure(addr);
    p.seed.nonce += 1;
    return p.seed;
  }

  async applyDrop(addr: string, stake: number, payout: number, idemKey: string) {
    const p = this.ensure(addr);
    this.applyOnce(idemKey, () => {
      p.balance += payout - stake;
    });
    return p.balance;
  }

  async reserve(addr: string, amount: number, idemKey: string) {
    const p = this.ensure(addr);
    if (this.applied.has(idemKey)) return true;
    if (p.balance < amount) return false;
    this.applyOnce(idemKey, () => {
      p.balance -= amount;
    });
    return true;
  }

  async creditDeposit(addr: string, amount: number, idemKey: string) {
    const p = this.ensure(addr);
    this.applyOnce(idemKey, () => {
      p.balance += amount;
    });
    return p.balance;
  }

  async rotate(addr: string) {
    const p = this.ensure(addr);
    const revealed = p.seed;
    p.seed = freshSeed(revealed.clientSeed);
    return {
      revealed: { serverSeed: revealed.serverSeed, serverSeedHash: revealed.serverSeedHash },
      next: { serverSeedHash: p.seed.serverSeedHash },
    };
  }
}
