import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { baseSepolia } from 'wagmi/chains';
import { defineChain } from 'viem';

// Local anvil chain for development without a deployment.
export const anvil = defineChain({
  id: 31337,
  name: 'Anvil',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['http://localhost:8545'] } },
});

export const wagmiConfig = getDefaultConfig({
  appName: 'UNIT-01 Plinko',
  // WalletConnect projectId — not critical for injected wallets (MetaMask).
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? 'UNIT01_PLINKO_DEMO',
  chains: [baseSepolia, anvil],
  ssr: true,
});
