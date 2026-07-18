'use client';

import { useEffect, useState } from 'react';
import { BIG_WIN_MULT, type FeedDrop } from '@plinko/shared';
import { getSocket } from '@/shared/lib/api';

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
        <div
          key={i}
          className={`feed-row ${d.multiplier >= 1 ? 'win' : ''} ${
            d.multiplier >= BIG_WIN_MULT ? 'big' : ''
          }`}
        >
          <span className="addr">{d.addr === 'demo' ? 'You' : d.addr}</span>
          <span className="mult">{d.multiplier}×</span>
          <span>{d.multiplier >= 1 ? '+' : ''}{d.payout - d.stake}</span>
        </div>
      ))}
    </div>
  );
}
