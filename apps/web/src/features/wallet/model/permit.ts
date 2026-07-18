import { parseSignature, parseUnits, type Address, type Hex } from 'viem';
import { CHAIN_ID, TOKEN_ADDRESS, VAULT_ADDRESS } from './contracts';

const UNIT_DECIMALS = 18;
const PERMIT_TTL_SECONDS = 60 * 60;

export const permitTypes = {
  Permit: [
    { name: 'owner', type: 'address' },
    { name: 'spender', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
} as const;

export function unitToWei(amount: number): bigint {
  return parseUnits(String(amount), UNIT_DECIMALS);
}

export function permitDeadline(nowMs = Date.now()): bigint {
  return BigInt(Math.floor(nowMs / 1000) + PERMIT_TTL_SECONDS);
}

export function buildDepositPermit(owner: Address, amount: number, nonce: bigint) {
  return {
    domain: {
      name: 'UNIT',
      version: '1',
      chainId: CHAIN_ID,
      verifyingContract: TOKEN_ADDRESS,
    },
    types: permitTypes,
    primaryType: 'Permit',
    message: {
      owner,
      spender: VAULT_ADDRESS,
      value: unitToWei(amount),
      nonce,
      deadline: permitDeadline(),
    },
  } as const;
}

export function splitPermitSignature(signature: Hex): { r: Hex; s: Hex; v: number } {
  const { r, s, v } = parseSignature(signature);
  return { r, s, v: Number(v) };
}
