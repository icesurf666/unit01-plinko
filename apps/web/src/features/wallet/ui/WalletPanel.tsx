'use client';

import { useState } from 'react';
import { useVault } from '../model/useVault';
import { DEFAULT_DEPOSIT } from '@/shared/config';
import { parseIntegerInput } from '@/shared/lib/number';

export function WalletPanel({
  onAuthenticated,
  onError,
}: {
  onAuthenticated?: () => void | Promise<void>;
  onError?: (message: string) => void;
}) {
  const { connected, authenticated, status, signIn, faucet, deposit, withdraw } = useVault();
  const [amount, setAmount] = useState(DEFAULT_DEPOSIT);

  if (!connected) {
    return <div className="wallet-panel muted">Connect a wallet to deposit or withdraw UNIT.</div>;
  }

  return (
    <div className="wallet-panel">
      <div className={`auth-state ${authenticated ? 'ok' : ''}`}>
        {authenticated ? 'Wallet signed in' : 'Wallet connected. Sign a SIWE message to use vault actions.'}
      </div>
      {!authenticated && (
        <button
          className="signbtn"
          onClick={() => {
            signIn()
              .then((ok) => {
                if (ok) void onAuthenticated?.();
              })
              .catch((e) => onError?.((e as Error).message));
          }}
        >
          Sign in with Ethereum
        </button>
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
      {status && <div className="wp-status mono">{status}</div>}
    </div>
  );
}
