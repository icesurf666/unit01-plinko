'use client';

import { useState } from 'react';
import { useAccount, useReadContract, useSignMessage, useSignTypedData, useWriteContract } from 'wagmi';
import { TOKEN_ADDRESS, VAULT_ADDRESS, tokenAbi, vaultAbi } from './contracts';
import { buildDepositPermit, splitPermitSignature } from './permit';
import { isSignedInAs, requestWithdrawSig, signInWithWallet } from '@/shared/lib/api';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// Encapsulates on-chain wallet actions (faucet / permit deposit / withdraw) so the
// component stays presentational. Returns the status of the last operation.
export function useVault() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { signTypedDataAsync } = useSignTypedData();
  const { signMessageAsync } = useSignMessage();
  const { data: tokenNonce } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: tokenAbi,
    functionName: 'nonces',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });
  const [status, setStatus] = useState('');
  const authenticated = isSignedInAs(address);

  async function run(label: string, fn: () => Promise<unknown>): Promise<boolean> {
    try {
      setStatus(`${label} in progress...`);
      await fn();
      setStatus(`${label} complete`);
      return true;
    } catch (e) {
      setStatus(`${label}: ${errorMessage(e).slice(0, 60)}`);
      return false;
    }
  }

  function requireWallet() {
    if (!address) throw new Error('Wallet is not connected.');
    return address;
  }

  function requireSignedWallet() {
    const wallet = requireWallet();
    if (!isSignedInAs(wallet)) throw new Error('Sign in with this wallet before depositing.');
    return wallet;
  }

  const faucet = () =>
    run('Faucet', () =>
      writeContractAsync({ address: TOKEN_ADDRESS, abi: tokenAbi, functionName: 'faucet' }),
    );

  const signIn = () =>
    run('Sign-in', async () => {
      const wallet = requireWallet();
      await signInWithWallet(wallet, (message) => signMessageAsync({ message }));
    });

  const deposit = (amount: number) =>
    run('Deposit', async () => {
      const wallet = requireSignedWallet();
      const permit = buildDepositPermit(wallet, amount, (tokenNonce as bigint) ?? 0n);
      const sig = await signTypedDataAsync(permit);
      const { r, s, v } = splitPermitSignature(sig);
      await writeContractAsync({
        address: VAULT_ADDRESS,
        abi: vaultAbi,
        functionName: 'depositWithPermit',
        args: [permit.message.value, permit.message.deadline, v, r, s],
      });
    });

  const withdraw = (amount: number) =>
    run('Withdraw', async () => {
      const wallet = requireWallet();
      const w = await requestWithdrawSig(amount, wallet); // server EIP-712 signature
      await writeContractAsync({
        address: VAULT_ADDRESS,
        abi: vaultAbi,
        functionName: 'withdraw',
        args: [BigInt(w.amountWei), BigInt(w.nonce), BigInt(w.deadline), w.sig as `0x${string}`],
      });
    });

  return {
    address,
    connected: isConnected,
    authenticated,
    status,
    signIn,
    faucet,
    deposit,
    withdraw,
  };
}
