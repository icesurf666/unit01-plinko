'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useBalance } from '@/features/game';
import { useWalletUnitBalance } from '@/features/wallet';
import { initAudio, isMuted, toggleMuted } from '@/shared/lib/sound';

export function Topbar() {
  const balance = useBalance();
  const walletUnit = useWalletUnitBalance();
  const [muted, setMuted] = useState(false);
  const walletBalanceText = walletUnit.isLoading ? '...' : walletUnit.formatted;

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="wordmark">
          UNIT-<b>01</b> PLINKO
        </div>
        <nav className="nav">
          <Link href="/">Play</Link>
          <Link href="/verify">Verify</Link>
        </nav>
      </div>
      <div className="topbar-right">
        <button
          className="mutebtn"
          title="sound"
          onClick={() => {
            initAudio();
            setMuted(toggleMuted());
          }}
        >
          {muted || isMuted() ? '♪̶' : '♪'}
        </button>
        <div className="balances" aria-label="Balances">
          {walletUnit.connected && walletUnit.isConfigured && (
            <div className={`balance wallet-balance ${walletUnit.isError ? 'is-error' : ''}`}>
              <div className="big mono tabular">
                {walletUnit.isError ? 'unavailable' : walletBalanceText}{' '}
                <span className="balance-unit">UNIT</span>
              </div>
              <div className="sub mono">Wallet · on-chain</div>
            </div>
          )}
          <div className="balance">
            <div className="big mono tabular">
              {Math.round(balance).toLocaleString('en-US')} <span className="balance-unit">UNIT</span>
            </div>
            <div className="sub mono">Playable · off-chain ledger</div>
          </div>
        </div>
        <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
      </div>
    </header>
  );
}
