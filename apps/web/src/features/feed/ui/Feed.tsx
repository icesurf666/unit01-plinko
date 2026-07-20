'use client';

import { useEffect, useState } from 'react';
import { BIG_WIN_MULT, type FeedDrop } from '@plinko/shared';
import { getSocket } from '@/shared/lib/api';

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
    const socket = getSocket();
    const onDrop = (d: FeedDrop) => setItems((prev) => [d, ...prev].slice(0, 30));
    socket.on('drop', onDrop);
    return () => {
      socket.off('drop', onDrop);
    };
  }, []);

  return (
    <div className="feed">
      <div className="h">Live Drop Feed</div>
      {items.map((d, i) => (
        <FeedRow key={`${d.ts}-${d.addr}-${i}`} drop={d} index={i} />
      ))}
    </div>
  );
}
