// Addresses are injected after deployment via NEXT_PUBLIC_* env.
import { parseIntegerInput } from '@/shared/lib/number';

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

export const CHAIN_ID = parseIntegerInput(process.env.NEXT_PUBLIC_CHAIN_ID ?? '', {
  fallback: 84532,
  min: 1,
});
export const TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_TOKEN_ADDRESS ?? ZERO_ADDRESS) as `0x${string}`;
export const VAULT_ADDRESS = (process.env.NEXT_PUBLIC_VAULT_ADDRESS ?? ZERO_ADDRESS) as `0x${string}`;
export const HAS_TOKEN_ADDRESS = TOKEN_ADDRESS !== ZERO_ADDRESS;
export const HAS_VAULT_ADDRESS = VAULT_ADDRESS !== ZERO_ADDRESS;
export const HAS_VAULT_CONTRACTS = HAS_TOKEN_ADDRESS && HAS_VAULT_ADDRESS;

export const tokenAbi = [
  { type: 'function', name: 'faucet', inputs: [], outputs: [], stateMutability: 'nonpayable' },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'nonces',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

export const vaultAbi = [
  {
    type: 'function',
    name: 'deposit',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'depositWithPermit',
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'withdraw',
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'sig', type: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;
