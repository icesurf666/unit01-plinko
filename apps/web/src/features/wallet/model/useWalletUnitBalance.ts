'use client';

import { useAccount, useReadContract } from 'wagmi';
import { TOKEN_ADDRESS, ZERO_ADDRESS, tokenAbi } from './contracts';
import { formatUnitBalance } from './formatUnitBalance';

const BALANCE_REFRESH_MS = 10_000;

export function useWalletUnitBalance() {
  const { address, isConnected } = useAccount();
  const hasTokenAddress = TOKEN_ADDRESS !== ZERO_ADDRESS;
  const enabled = Boolean(address && hasTokenAddress);

  const { data, isError, isLoading, refetch } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: tokenAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled,
      refetchInterval: enabled ? BALANCE_REFRESH_MS : false,
    },
  });

  return {
    balance: data,
    connected: isConnected,
    formatted: formatUnitBalance(data),
    isConfigured: hasTokenAddress,
    isError,
    isLoading,
    refetch,
  };
}
