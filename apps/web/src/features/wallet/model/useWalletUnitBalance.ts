'use client';

import { formatUnits } from 'viem';
import { useAccount, useReadContract } from 'wagmi';
import { TOKEN_ADDRESS, ZERO_ADDRESS, tokenAbi } from './contracts';

const UNIT_DECIMALS = 18;
const BALANCE_REFRESH_MS = 10_000;

function addThousandsSeparators(value: string): string {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function formatUnitBalance(balance?: bigint): string {
  if (balance === undefined) return '0';

  const [whole, fraction = ''] = formatUnits(balance, UNIT_DECIMALS).split('.');
  const visibleFraction = fraction.slice(0, 2).replace(/0+$/, '');

  return visibleFraction
    ? `${addThousandsSeparators(whole)}.${visibleFraction}`
    : addThousandsSeparators(whole);
}

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
