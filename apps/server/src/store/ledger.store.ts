import { join } from 'node:path';
import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { StoreService, freshSeed, START_BALANCE, type SeedCtx } from './store.service';
import { makeDb, type Db, type Sql } from './db';
import { accounts, ledgerEntries, ledgerTransactions, serverSeeds } from './schema';

type Entry = { ownerType: 'player' | 'system'; ownerRef: string; amount: number };
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

// Double-entry ledger on Postgres (ADR-2): append-only entries, balance is a
// materialized cache moved in the same transaction; FOR UPDATE on the account.
@Injectable()
export class LedgerStore extends StoreService implements OnModuleInit, OnModuleDestroy {
  override readonly backendName = 'postgres-ledger';

  private readonly log = new Logger('Ledger');
  private readonly db: Db;
  private readonly sql: Sql;

  constructor() {
    super();
    const conn = makeDb(process.env.DATABASE_URL as string);
    this.db = conn.db;
    this.sql = conn.client;
  }

  async onModuleInit(): Promise<void> {
    // Migrate on start (the apps/server/drizzle folder next to dist).
    await migrate(this.db, { migrationsFolder: join(__dirname, '..', '..', 'drizzle') });
    this.log.log('Postgres ledger ready, migrations applied');
  }

  async onModuleDestroy(): Promise<void> {
    await this.close();
  }

  /** Close the connection pool (for tests / graceful shutdown). */
  async close(): Promise<void> {
    await this.sql.end();
  }

  override async ready(): Promise<boolean> {
    await this.sql`SELECT 1`;
    return true;
  }

  private async accountId(tx: Tx, ownerType: string, ownerRef: string): Promise<number> {
    const ins = await tx
      .insert(accounts)
      .values({ ownerType, ownerRef, balance: 0 })
      .onConflictDoNothing()
      .returning({ id: accounts.id });
    if (ins[0]) return ins[0].id as number;
    const ex = await tx
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.ownerType, ownerType), eq(accounts.ownerRef, ownerRef)));
    return ex[0].id as number;
  }

  /** A balanced transaction (Σ=0), idempotent by key. true = applied just now. */
  private async post(tx: Tx, type: string, idemKey: string, entries: Entry[]): Promise<boolean> {
    const t = await tx
      .insert(ledgerTransactions)
      .values({ type, idempotencyKey: idemKey })
      .onConflictDoNothing()
      .returning({ id: ledgerTransactions.id });
    if (!t[0]) return false; // already applied
    const txId = t[0].id as string;
    for (const e of entries) {
      const accId = await this.accountId(tx, e.ownerType, e.ownerRef);
      await tx.insert(ledgerEntries).values({ txId, accountId: accId, amount: e.amount });
      await tx
        .update(accounts)
        .set({ balance: sql`${accounts.balance} + ${e.amount}` })
        .where(eq(accounts.id, accId));
    }
    return true;
  }

  private async ensureSignup(addr: string): Promise<void> {
    await this.db.transaction(async (tx: Tx) => {
      await this.post(tx, 'GRANT', `signup:${addr}`, [
        { ownerType: 'player', ownerRef: addr, amount: START_BALANCE },
        { ownerType: 'system', ownerRef: 'house', amount: -START_BALANCE },
      ]);
    });
    await this.db
      .insert(serverSeeds)
      .values({ playerAddr: addr, ...freshSeed() })
      .onConflictDoNothing();
  }

  private async playerBalance(addr: string): Promise<number> {
    const r = await this.db
      .select({ b: accounts.balance })
      .from(accounts)
      .where(and(eq(accounts.ownerType, 'player'), eq(accounts.ownerRef, addr)));
    return r[0]?.b ?? 0;
  }

  private async seedOf(addr: string): Promise<SeedCtx> {
    const r = await this.db.select().from(serverSeeds).where(eq(serverSeeds.playerAddr, addr));
    const s = r[0];
    return {
      serverSeed: s.serverSeed,
      serverSeedHash: s.serverSeedHash,
      clientSeed: s.clientSeed,
      nonce: s.nonce,
    };
  }

  async get(addr: string) {
    await this.ensureSignup(addr);
    return { balance: await this.playerBalance(addr), seed: await this.seedOf(addr) };
  }

  async setClientSeed(addr: string, clientSeed: string) {
    await this.ensureSignup(addr);
    const s = freshSeed(clientSeed);
    await this.db
      .update(serverSeeds)
      .set({ serverSeed: s.serverSeed, serverSeedHash: s.serverSeedHash, clientSeed, nonce: 0 })
      .where(eq(serverSeeds.playerAddr, addr));
  }

  async nextNonce(addr: string) {
    const r = await this.db
      .update(serverSeeds)
      .set({ nonce: sql`${serverSeeds.nonce} + 1` })
      .where(eq(serverSeeds.playerAddr, addr))
      .returning();
    const s = r[0];
    return {
      serverSeed: s.serverSeed,
      serverSeedHash: s.serverSeedHash,
      clientSeed: s.clientSeed,
      nonce: s.nonce,
    };
  }

  async applyDrop(addr: string, stake: number, payout: number, idemKey: string) {
    const delta = payout - stake;
    await this.db.transaction(async (tx: Tx) => {
      // FOR UPDATE on the player's account — serialize money operations (ADR-2).
      await tx.execute(
        sql`SELECT id FROM accounts WHERE owner_type='player' AND owner_ref=${addr} FOR UPDATE`,
      );
      await this.post(tx, 'DROP', idemKey, [
        { ownerType: 'player', ownerRef: addr, amount: delta },
        { ownerType: 'system', ownerRef: 'house', amount: -delta },
      ]);
    });
    return this.playerBalance(addr);
  }

  async reserve(addr: string, amount: number, idemKey: string) {
    return this.db.transaction(async (tx: Tx) => {
      const locked = await tx
        .select({ id: accounts.id, balance: accounts.balance })
        .from(accounts)
        .where(and(eq(accounts.ownerType, 'player'), eq(accounts.ownerRef, addr)))
        .for('update');
      const acc = locked[0];
      if (!acc || acc.balance < amount) return false;
      await this.post(tx, 'WITHDRAW_RESERVE', idemKey, [
        { ownerType: 'player', ownerRef: addr, amount: -amount },
        { ownerType: 'system', ownerRef: 'external', amount: amount },
      ]);
      return true;
    });
  }

  async creditDeposit(addr: string, amount: number, idemKey: string) {
    await this.ensureSignup(addr);
    await this.db.transaction(async (tx: Tx) => {
      await this.post(tx, 'DEPOSIT', idemKey, [
        { ownerType: 'player', ownerRef: addr, amount: amount },
        { ownerType: 'system', ownerRef: 'external', amount: -amount },
      ]);
    });
    return this.playerBalance(addr);
  }

  async rotate(addr: string) {
    await this.ensureSignup(addr);
    const cur = await this.seedOf(addr);
    const s = freshSeed(cur.clientSeed);
    await this.db
      .update(serverSeeds)
      .set({ serverSeed: s.serverSeed, serverSeedHash: s.serverSeedHash, nonce: 0 })
      .where(eq(serverSeeds.playerAddr, addr));
    return {
      revealed: { serverSeed: cur.serverSeed, serverSeedHash: cur.serverSeedHash },
      next: { serverSeedHash: s.serverSeedHash },
    };
  }
}
