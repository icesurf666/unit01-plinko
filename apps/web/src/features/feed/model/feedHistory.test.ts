import { describe, expect, it } from 'vitest';
import type { FeedDrop } from '@plinko/shared';
import { FEED_LIMIT, displayAddr, mergeFeed } from './feedHistory';

function drop(overrides: Partial<FeedDrop> = {}): FeedDrop {
  return {
    addr: '0x1111111111111111111111111111111111111111',
    bucket: 4,
    multiplier: 1,
    payout: 10,
    risk: 'low',
    stake: 10,
    ts: 1000,
    ...overrides,
  };
}

describe('feed history helpers', () => {
  it('deduplicates the incoming drop against existing feed rows', () => {
    const existing = drop();
    expect(mergeFeed(existing, [existing])).toEqual([existing]);
  });

  it('keeps the newest drop first and caps the feed length', () => {
    const previous = Array.from({ length: FEED_LIMIT + 5 }, (_, i) => drop({ ts: i }));
    const next = drop({ ts: 999 });

    const merged = mergeFeed(next, previous);

    expect(merged).toHaveLength(FEED_LIMIT);
    expect(merged[0]).toEqual(next);
  });

  it('formats guest and EVM addresses for compact display', () => {
    expect(displayAddr('demo')).toBe('You');
    expect(displayAddr('guest:1234567890')).toBe('guest:34567890');
    expect(displayAddr('0x1111111111111111111111111111111111111111')).toBe('0x1111...1111');
  });
});
