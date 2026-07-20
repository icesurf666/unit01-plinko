'use client';

import { useState } from 'react';
import {
  useAccount,
  useReadContract,
  useSignMessage,
  useSignTypedData,
  useSwitchChain,
  useWriteContract,
} from 'wagmi';
import {
  CHAIN_ID,
  HAS_TOKEN_ADDRESS,
  HAS_VAULT_ADDRESS,
  HAS_VAULT_CONTRACTS,
  TOKEN_ADDRESS,
  VAULT_ADDRESS,
  tokenAbi,
  vaultAbi,
} from './contracts';
import { buildDepositPermit, splitPermitSignature } from './permit';
import { isSignedInAs, requestWithdrawSig, signInWithWallet } from '@/shared/lib/api';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// Encapsulates on-chain wallet actions (faucet / permit deposit / withdraw) so the
// component stays presentational. Returns the status of the last operation.
export function useVault() {
  const { address, chainId, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const { signTypedDataAsync } = useSignTypedData();
  const { signMessageAsync } = useSignMessage();
  const onExpectedChain = !isConnected || chainId === undefined || chainId === CHAIN_ID;
  const { data: tokenNonce } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: tokenAbi,
    functionName: 'nonces',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && HAS_TOKEN_ADDRESS && onExpectedChain) },
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

  function requireChain() {
    if (chainId !== undefined && chainId !== CHAIN_ID) {
      throw new Error(`Switch wallet to chain ${CHAIN_ID}.`);
    }
  }

  function requireToken() {
    if (!HAS_TOKEN_ADDRESS) throw new Error('UNIT token address is not configured.');
  }

  function requireVault() {
    if (!HAS_VAULT_ADDRESS) throw new Error('Vault address is not configured.');
  }

  function requireSignedWallet() {
    const wallet = requireWallet();
    if (!isSignedInAs(wallet)) throw new Error('Sign in with this wallet before depositing.');
    return wallet;
  }

  const faucet = () =>
    run('Faucet', async () => {
      requireWallet();
      requireChain();
      requireToken();
      await writeContractAsync({ address: TOKEN_ADDRESS, abi: tokenAbi, functionName: 'faucet' });
    });

  const signIn = () =>
    run('Sign-in', async () => {
      const wallet = requireWallet();
      await signInWithWallet(wallet, (message) => signMessageAsync({ message }));
    });

  const deposit = (amount: number) =>
    run('Deposit', async () => {
      const wallet = requireSignedWallet();
      requireChain();
      requireToken();
      requireVault();
      if (tokenNonce === undefined) throw new Error('Token nonce is not loaded yet.');
      const permit = buildDepositPermit(wallet, amount, tokenNonce as bigint);
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
      requireChain();
      requireVault();
      const w = await requestWithdrawSig(amount, wallet); // server EIP-712 signature
      await writeContractAsync({
        address: VAULT_ADDRESS,
        abi: vaultAbi,
        functionName: 'withdraw',
        args: [BigInt(w.amountWei), BigInt(w.nonce), BigInt(w.deadline), w.sig as `0x${string}`],
      });
    });

  const switchToExpectedChain = () =>
    run('Network', () => switchChainAsync({ chainId: CHAIN_ID }));

  return {
    address,
    connected: isConnected,
    authenticated,
    chainId,
    expectedChainId: CHAIN_ID,
    contractsConfigured: HAS_VAULT_CONTRACTS,
    tokenConfigured: HAS_TOKEN_ADDRESS,
    vaultConfigured: HAS_VAULT_ADDRESS,
    onExpectedChain,
    status,
    signIn,
    switchToExpectedChain,
    faucet,
    deposit,
    withdraw,
  };
}
