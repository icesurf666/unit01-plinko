import { describe, expect, it, vi } from 'vitest';
import type { StoreService } from '../store/store.service';
import type { AuditService } from '../observability/audit.service';
import type { DropResolverService } from './drop-resolver.service';
import type { FeedGateway } from './feed.gateway';
import { GameService } from './game.service';

const seed = {
  serverSeed: 'server',
  serverSeedHash: 'hash',
  clientSeed: 'default',
  nonce: 1,
};

function makeService() {
  const store = {
    get: vi.fn().mockResolvedValue({ balance: 100, seed }),
    setClientSeed: vi.fn().mockResolvedValue(undefined),
    nextNonce: vi.fn().mockResolvedValue(seed),
    applyDrop: vi.fn().mockResolvedValue(105),
    rotate: vi.fn().mockResolvedValue({ revealed: {}, next: {} }),
  } as unknown as StoreService;
  const resolver = {
    resolve: vi.fn().mockReturnValue({ path: [1, 0, 1], bucket: 2, multiplier: 1.5 }),
  } as unknown as DropResolverService;
  const feed = {
    broadcastDrop: vi.fn(),
  } as unknown as FeedGateway;
  const audit = {
    event: vi.fn(),
  } as unknown as AuditService;

  return {
    audit,
    feed,
    resolver,
    service: new GameService(store, resolver, feed, audit),
    store,
  };
}

describe('GameService', () => {
  it('resolves, applies, broadcasts, and audits a drop', async () => {
    const { audit, feed, service, store } = makeService();
    const request = { stake: 10, risk: 'med' } as const;

    const result = await service.drop('player:1', request, 'req-1');

    expect(store.applyDrop).toHaveBeenCalledWith('player:1', 10, 15, expect.stringMatching(/^drop:/));
    expect(result).toMatchObject({
      balance: 105,
      bucket: 2,
      multiplier: 1.5,
      payout: 15,
      risk: 'med',
      stake: 10,
    });
    expect(feed.broadcastDrop).toHaveBeenCalledWith(
      expect.objectContaining({ addr: 'player:1', payout: 15 }),
    );
    expect(audit.event).toHaveBeenCalledWith(
      'game.drop_resolved',
      expect.objectContaining({ requestId: 'req-1', player: 'player:1', payout: 15 }),
    );
  });

  it('rotates the seed before resolving when the client seed changes', async () => {
    const { service, store } = makeService();

    await service.drop('player:1', { stake: 10, risk: 'low', clientSeed: 'custom' }, 'req-1');

    expect(store.setClientSeed).toHaveBeenCalledWith('player:1', 'custom');
    expect(store.nextNonce).toHaveBeenCalledWith('player:1');
  });
});
