'use client';

import { useState } from 'react';
import { useVault } from '../model/useVault';
import { DEFAULT_DEPOSIT } from '@/shared/config';
import { startDemoSession } from '@/shared/lib/api';
import { parseIntegerInput } from '@/shared/lib/number';

export function WalletPanel({
  onSessionChanged,
  onError,
}: {
  onSessionChanged?: () => void | Promise<void>;
  onError?: (message: string) => void;
}) {
  const { connected, authenticated, status, signIn, faucet, deposit, withdraw } = useVault();
  const [demoStatus, setDemoStatus] = useState('');
  const [amount, setAmount] = useState(DEFAULT_DEPOSIT);

  async function startDemo() {
    try {
      setDemoStatus('Starting demo...');
      await startDemoSession();
      await onSessionChanged?.();
      setDemoStatus('Demo mode active');
    } catch (e) {
      const message = (e as Error).message;
      setDemoStatus(message);
      onError?.(message);
    }
  }

  async function signInWallet() {
    setDemoStatus('');
    try {
      const ok = await signIn();
      if (ok) await onSessionChanged?.();
    } catch (e) {
      onError?.((e as Error).message);
    }
  }

  if (!connected) {
    return (
      <div className="wallet-panel">
        <div className="auth-state">No session. Start demo or connect a wallet.</div>
        <button className="signbtn demo" onClick={() => void startDemo()}>
          Start demo
        </button>
        <div className="wallet-note muted">Connect a wallet to deposit or withdraw UNIT.</div>
        {demoStatus && <div className="wp-status mono">{demoStatus}</div>}
      </div>
    );
  }

  return (
    <div className="wallet-panel">
      <div className={`auth-state ${authenticated ? 'ok' : ''}`}>
        {authenticated ? 'Wallet signed in' : 'Wallet connected. Sign a SIWE message to use vault actions.'}
      </div>
      {!authenticated && (
        <div className="wp-session-actions">
          <button className="signbtn" onClick={() => void signInWallet()}>
            Sign in with Ethereum
          </button>
          <button className="signbtn demo" onClick={() => void startDemo()}>
            Start demo
          </button>
        </div>
      )}
      <div className="wp-row">
        <span>Amount</span>
        <input
          className="mono"
          value={amount}
          onChange={(e) => setAmount(parseIntegerInput(e.target.value, { min: 1, fallback: 1 }))}
        />
      </div>
      <div className="wp-btns">
        <button onClick={faucet}>Faucet</button>
        <button disabled={!authenticated} onClick={() => deposit(amount)}>
          Deposit
        </button>
        <button disabled={!authenticated} onClick={() => withdraw(amount)}>
          Withdraw
        </button>
      </div>
      {(status || demoStatus) && <div className="wp-status mono">{status || demoStatus}</div>}
    </div>
  );
}
