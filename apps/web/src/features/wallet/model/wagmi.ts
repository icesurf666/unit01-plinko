import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import { injectedWallet, walletConnectWallet } from '@rainbow-me/rainbowkit/wallets';
import { createConfig, http } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { defineChain } from 'viem';

const APP_NAME = 'UNIT-01 Plinko';
const VALID_WALLETCONNECT_PROJECT_ID = /^[a-f0-9]{32}$/i;
const CONNECTOR_ONLY_PROJECT_ID = '00000000000000000000000000000000';

// Local anvil chain for development without a deployment.
export const anvil = defineChain({
  id: 31337,
  name: 'Anvil',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['http://localhost:8545'] } },
});

const walletConnectProjectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID?.trim();
const hasWalletConnect = Boolean(
  walletConnectProjectId && VALID_WALLETCONNECT_PROJECT_ID.test(walletConnectProjectId),
);

const chains = [baseSepolia, anvil] as const;

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Wallets',
      wallets: hasWalletConnect ? [injectedWallet, walletConnectWallet] : [injectedWallet],
    },
  ],
  {
    appName: APP_NAME,
    projectId: hasWalletConnect ? walletConnectProjectId! : CONNECTOR_ONLY_PROJECT_ID,
  },
);

export const wagmiConfig = createConfig({
  chains,
  connectors,
  transports: {
    [baseSepolia.id]: http(),
    [anvil.id]: http(),
  },
  ssr: true,
});
