import { describe, it, expect, afterAll } from 'vitest';
import { LedgerStore } from './ledger.store';
import { makeDb } from './db';
import { accounts, ledgerEntries } from './schema';

// Integration test: runs only when DATABASE_URL is set
// (locally `docker compose up -d`, in CI a postgres service).
const url = process.env.DATABASE_URL;

describe.skipIf(!url)('LedgerStore (integration · Postgres)', () => {
  const store = new LedgerStore();
  const probe = makeDb(url as string);

  afterAll(async () => {
    await store.close();
    await probe.client.end();
  });

  it('deposit/drop/reserve move the balance and keep the double-entry invariant', async () => {
    await store.onModuleInit(); // apply migrations
    const addr = '0x' + Math.random().toString(16).slice(2, 12);

    expect((await store.get(addr)).balance).toBe(1000); // signup grant
    expect(await store.applyDrop(addr, 10, 30, `d:${addr}`)).toBe(1020); // win +20
    expect(await store.creditDeposit(addr, 50, `dep:${addr}`)).toBe(1070);
    expect(await store.reserve(addr, 100, `wd:${addr}`)).toBe(true);
    expect((await store.get(addr)).balance).toBe(970);

    // a repeated key does not double-apply
    await store.applyDrop(addr, 10, 30, `d:${addr}`);
    expect((await store.get(addr)).balance).toBe(970);

    // ── INVARIANTS (ADR-2) ──────────────────────────────────────────
    const entries = await probe.db.select().from(ledgerEntries);
    const accs = await probe.db.select().from(accounts);

    // 1) every transaction is balanced (Σ per tx = 0)
    const byTx = new Map<string, number>();
    for (const e of entries) byTx.set(e.txId, (byTx.get(e.txId) ?? 0) + e.amount);
    for (const [, sum] of byTx) expect(sum).toBe(0);

    // 2) each account's balance = Σ of its entries
    for (const acc of accs) {
      const sum = entries
        .filter((e) => e.accountId === acc.id)
        .reduce((s, e) => s + e.amount, 0);
      expect(sum).toBe(acc.balance);
    }
  });
});
