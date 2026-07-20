'use client';

import { useEffect, useRef, useState } from 'react';
import { useVault } from '../model/useVault';
import { DEFAULT_DEPOSIT } from '@/shared/config';
import { currentAuthSession, signOut, startDemoSession } from '@/shared/lib/api';
import { parseIntegerInput } from '@/shared/lib/number';

const BALANCE_REFRESH_DELAYS_MS = [2_500, 8_000, 18_000];

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function WalletPanel({
  onSessionChanged,
  onError,
}: {
  onSessionChanged?: () => void | Promise<void>;
  onError?: (message: string) => void;
}) {
  const { address, connected, authenticated, status, signIn, faucet, deposit, withdraw } = useVault();
  const refreshTimers = useRef<number[]>([]);
  const [session, setSession] = useState(() => currentAuthSession());
  const [sessionStatus, setSessionStatus] = useState('');
  const [amount, setAmount] = useState(DEFAULT_DEPOSIT);

  useEffect(() => {
    return () => {
      for (const timer of refreshTimers.current) window.clearTimeout(timer);
    };
  }, []);

  async function refreshSession() {
    setSession(currentAuthSession());
    await onSessionChanged?.();
  }

  function scheduleBalanceRefresh() {
    void refreshSession();
    for (const delay of BALANCE_REFRESH_DELAYS_MS) {
      const timer = window.setTimeout(() => void refreshSession(), delay);
      refreshTimers.current.push(timer);
    }
  }

  async function startDemo() {
    try {
      setSessionStatus('Starting demo...');
      await startDemoSession();
      await refreshSession();
      setSessionStatus('Demo mode active');
    } catch (e) {
      const message = (e as Error).message;
      setSessionStatus(message);
      onError?.(message);
    }
  }

  async function signInWallet() {
    setSessionStatus('');
    try {
      const ok = await signIn();
      if (ok) await refreshSession();
    } catch (e) {
      onError?.((e as Error).message);
    }
  }

  async function endSession() {
    signOut();
    setSession(currentAuthSession());
    setSessionStatus('Signed out');
    await onSessionChanged?.();
  }

  async function runWalletAction(action: () => Promise<boolean>, settledMessage: string) {
    setSessionStatus('');
    const ok = await action();
    if (!ok) return;
    setSessionStatus(settledMessage);
    scheduleBalanceRefresh();
  }

  const sessionLabel =
    session?.kind === 'wallet' && session.wallet
      ? `Wallet session · ${shortAddress(session.wallet)}`
      : session?.kind === 'guest'
        ? 'Demo session active'
        : null;
  const walletSessionMismatch = Boolean(
    address && session?.kind === 'wallet' && session.wallet && !authenticated,
  );

  if (!connected) {
    return (
      <div className="wallet-panel">
        {sessionLabel ? (
          <div className="auth-state ok session-state">
            <span>{sessionLabel}</span>
            <button type="button" onClick={() => void endSession()}>
              Sign out
            </button>
          </div>
        ) : (
          <div className="auth-state">No session. Start demo or connect a wallet.</div>
        )}
        <button className="signbtn demo" onClick={() => void startDemo()}>
          Start demo
        </button>
        <div className="wallet-note muted">Connect a wallet to deposit or withdraw UNIT.</div>
        {sessionStatus && <div className="wp-status mono">{sessionStatus}</div>}
      </div>
    );
  }

  return (
    <div className="wallet-panel">
      <div className={`auth-state ${authenticated ? 'ok' : walletSessionMismatch ? 'warn' : ''}`}>
        {authenticated
          ? 'Wallet signed in'
          : walletSessionMismatch
            ? 'Wallet switched. Sign in with this wallet or sign out the old session.'
            : 'Wallet connected. Sign a SIWE message to use vault actions.'}
      </div>
      {sessionLabel && (
        <div className="session-state">
          <span>{sessionLabel}</span>
          <button type="button" onClick={() => void endSession()}>
            Sign out
          </button>
        </div>
      )}
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
        <button
          onClick={() =>
            void runWalletAction(faucet, 'Faucet submitted. Wallet balance refreshes after confirmation.')
          }
        >
          Faucet
        </button>
        <button
          disabled={!authenticated}
          onClick={() =>
            void runWalletAction(
              () => deposit(amount),
              'Deposit submitted. Playable balance refreshes after indexer confirmations.',
            )
          }
        >
          Deposit
        </button>
        <button
          disabled={!authenticated}
          onClick={() =>
            void runWalletAction(
              () => withdraw(amount),
              'Withdraw submitted. Playable balance refreshes after reserve/settlement.',
            )
          }
        >
          Withdraw
        </button>
      </div>
      {(status || sessionStatus) && <div className="wp-status mono">{status || sessionStatus}</div>}
    </div>
  );
}
