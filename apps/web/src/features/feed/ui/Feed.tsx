'use client';

import { useEffect, useState } from 'react';
import { BIG_WIN_MULT, type FeedDrop } from '@plinko/shared';
import { getFeedHistory, getSocket } from '@/shared/lib/api';

const FEED_LIMIT = 30;
const FEED_CACHE_KEY = 'unit01.feedHistory';

function feedKey(drop: FeedDrop): string {
  return `${drop.ts}:${drop.addr}:${drop.stake}:${drop.bucket}:${drop.multiplier}`;
}

function mergeFeed(next: FeedDrop, prev: FeedDrop[]): FeedDrop[] {
  const seen = new Set<string>();
  return [next, ...prev].filter((drop) => {
    const key = feedKey(drop);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, FEED_LIMIT);
}

function readCachedFeed(): FeedDrop[] {
  try {
    const raw = window.localStorage.getItem(FEED_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, FEED_LIMIT) as FeedDrop[] : [];
  } catch {
    return [];
  }
}

function cacheFeed(items: FeedDrop[]): void {
  try {
    window.localStorage.setItem(FEED_CACHE_KEY, JSON.stringify(items.slice(0, FEED_LIMIT)));
  } catch {
    // Feed cache is best-effort; private mode/storage quota should not break the game.
  }
}

function displayAddr(addr: string): string {
  if (addr === 'demo') return 'You';
  if (addr.startsWith('guest:')) return `guest:${addr.slice(-8)}`;
  if (addr.length <= 18) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function FeedRow({ drop, index }: { drop: FeedDrop; index: number }) {
  const [copied, setCopied] = useState(false);
  const canCopy = drop.addr !== 'demo';
  const pnl = drop.payout - drop.stake;

  async function copyAddress(): Promise<void> {
    if (!canCopy) return;
    try {
      await navigator.clipboard.writeText(drop.addr);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 900);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      className={`feed-row ${drop.multiplier >= 1 ? 'win' : ''} ${
        drop.multiplier >= BIG_WIN_MULT ? 'big' : ''
      }`}
    >
      <button
        className="addr"
        title={canCopy ? `Copy ${drop.addr}` : 'Your demo drop'}
        type="button"
        onClick={() => void copyAddress()}
        disabled={!canCopy}
        aria-label={canCopy ? `Copy player address for drop ${index + 1}` : 'Your demo drop'}
      >
        <span>{copied ? 'Copied' : displayAddr(drop.addr)}</span>
      </button>
      <span className="mult">{drop.multiplier}×</span>
      <span className={pnl >= 0 ? 'pnl pos' : 'pnl'}>{pnl >= 0 ? '+' : ''}{pnl}</span>
    </div>
  );
}

export function Feed() {
  const [items, setItems] = useState<FeedDrop[]>([]);

  useEffect(() => {
    let cancelled = false;
    setItems(readCachedFeed());

    getFeedHistory()
      .then((history) => {
        if (!cancelled) {
          const next = history.slice(0, FEED_LIMIT);
          setItems(next);
          cacheFeed(next);
        }
      })
      .catch(() => {
        if (!cancelled) setItems(readCachedFeed());
      });

    const socket = getSocket();
    const onDrop = (d: FeedDrop) =>
      setItems((prev) => {
        const next = mergeFeed(d, prev);
        cacheFeed(next);
        return next;
      });
    socket.on('drop', onDrop);
    return () => {
      cancelled = true;
      socket.off('drop', onDrop);
    };
  }, []);

  return (
    <div className="feed">
      <div className="h">Live Drop Feed</div>
      <div className="feed-list">
        {items.map((d, i) => (
          <FeedRow key={`${d.ts}-${d.addr}-${i}`} drop={d} index={i} />
        ))}
      </div>
    </div>
  );
}
