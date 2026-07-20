'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { Topbar } from '@/widgets/topbar';
import { Controls, HowTo, launchBall, useGameActions, useGameStore, useRisk } from '@/features/game';
import { Feed } from '@/features/feed';
import { SystemStatus } from '@/features/system';
import { WalletPanel } from '@/features/wallet';
import { initAudio } from '@/shared/lib/sound';
import * as api from '@/shared/lib/api';

// Pixi touches window → client only, no SSR.
const PlinkoBoard = dynamic(() => import('@/features/game/ui/PlinkoBoard').then((m) => m.PlinkoBoard), {
  ssr: false,
});

export default function Page() {
  const risk = useRisk();
  const { setBalance } = useGameActions();
  const { address } = useAccount();
  const [error, setError] = useState('');

  async function refreshBalance() {
    if (!api.hasActiveSession(address)) {
      setBalance(0);
      return;
    }

    try {
      const me = await api.getMe(address);
      setBalance(me.balance);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  // Read the explicit demo or signed wallet balance whenever the wallet changes.
  useEffect(() => {
    let cancelled = false;
    if (!api.hasActiveSession(address)) {
      setBalance(0);
      return;
    }

    api
      .getMe(address)
      .then((me) => {
        if (!cancelled) setBalance(me.balance);
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, [address, setBalance]);

  async function handleDrop() {
    initAudio(); // arm audio after a user gesture
    setError('');
    if (!api.hasActiveSession(address)) {
      setError(api.MISSING_SESSION_MESSAGE);
      return;
    }

    const { balance, stake, risk: r } = useGameStore.getState();
    if (balance < stake) return;
    try {
      const res = await api.drop(stake, r, address);
      // update the balance when the ball lands — more dramatic
      launchBall(res.path, res.bucket, res.multiplier, () => setBalance(res.balance));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <main className="app">
      <Topbar />
      <div className="stage">
        <div className="board-wrap">
          <PlinkoBoard risk={risk} />
          <HowTo />
          {error && (
            <div className="toast error">
              <span>{error}</span>
              <button onClick={() => setError('')}>Dismiss</button>
            </div>
          )}
        </div>
        <aside className="side">
          <Controls onDrop={handleDrop} />
          <WalletPanel onSessionChanged={refreshBalance} onError={setError} />
          <SystemStatus />
          <Feed />
        </aside>
      </div>
    </main>
  );
}
