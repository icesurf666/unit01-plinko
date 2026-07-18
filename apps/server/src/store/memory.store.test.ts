import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryStore } from './memory.store';

describe('MemoryStore', () => {
  let store: MemoryStore;
  const addr = '0xabc';

  beforeEach(() => {
    store = new MemoryStore();
  });

  it('a new player gets START_BALANCE and a seed with nonce 0', async () => {
    const me = await store.get(addr);
    expect(me.balance).toBe(1000);
    expect(me.seed.nonce).toBe(0);
    expect(me.seed.serverSeedHash).toHaveLength(64);
  });

  it('applyDrop moves the balance by payout − stake', async () => {
    await store.get(addr);
    expect(await store.applyDrop(addr, 10, 30, 'd1')).toBe(1020); // win +20
    expect(await store.applyDrop(addr, 10, 4, 'd2')).toBe(1014); // loss −6
  });

  it('applyDrop is idempotent by key (a replay does not double-apply)', async () => {
    await store.get(addr);
    await store.applyDrop(addr, 10, 30, 'same');
    expect(await store.applyDrop(addr, 10, 30, 'same')).toBe(1020);
  });

  it('reserve debits, rejects on insufficient funds, and is idempotent', async () => {
    await store.get(addr);
    expect(await store.reserve(addr, 100, 'w1')).toBe(true);
    expect((await store.get(addr)).balance).toBe(900);
    expect(await store.reserve(addr, 1e9, 'w2')).toBe(false); // not enough
    expect((await store.get(addr)).balance).toBe(900);
    expect(await store.reserve(addr, 100, 'w1')).toBe(true); // same key
    expect((await store.get(addr)).balance).toBe(900); // not debited twice
  });

  it('creditDeposit credits and is idempotent', async () => {
    await store.get(addr);
    expect(await store.creditDeposit(addr, 50, 'x1')).toBe(1050);
    expect(await store.creditDeposit(addr, 50, 'x1')).toBe(1050);
  });

  it('nextNonce increments', async () => {
    await store.get(addr);
    expect((await store.nextNonce(addr)).nonce).toBe(1);
    expect((await store.nextNonce(addr)).nonce).toBe(2);
  });

  it('rotate reveals the current seed and creates a new one', async () => {
    const before = (await store.get(addr)).seed;
    const { revealed, next } = await store.rotate(addr);
    expect(revealed.serverSeed).toBe(before.serverSeed);
    expect(next.serverSeedHash).not.toBe(before.serverSeedHash);
  });

  it('nextWithdrawNonce is unique and increasing', () => {
    const a = store.nextWithdrawNonce();
    const b = store.nextWithdrawNonce();
    expect(b).toBeGreaterThan(a);
  });
});
