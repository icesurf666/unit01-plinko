import type { FeedDrop } from '@plinko/shared';

export const FEED_LIMIT = 30;
const FEED_CACHE_KEY = 'unit01.feedHistory';

function feedKey(drop: FeedDrop): string {
  return `${drop.ts}:${drop.addr}:${drop.stake}:${drop.bucket}:${drop.multiplier}`;
}

export function mergeFeed(next: FeedDrop, prev: FeedDrop[]): FeedDrop[] {
  const seen = new Set<string>();
  return [next, ...prev].filter((drop) => {
    const key = feedKey(drop);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, FEED_LIMIT);
}

export function readCachedFeed(): FeedDrop[] {
  try {
    const raw = window.localStorage.getItem(FEED_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, FEED_LIMIT) as FeedDrop[] : [];
  } catch {
    return [];
  }
}

export function cacheFeed(items: FeedDrop[]): void {
  try {
    window.localStorage.setItem(FEED_CACHE_KEY, JSON.stringify(items.slice(0, FEED_LIMIT)));
  } catch {
    // Feed cache is best-effort; private mode/storage quota should not break the game.
  }
}

export function displayAddr(addr: string): string {
  if (addr === 'demo') return 'You';
  if (addr.startsWith('guest:')) return `guest:${addr.slice(-8)}`;
  if (addr.length <= 18) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
