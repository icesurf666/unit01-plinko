import { UnauthorizedException } from '@nestjs/common';
import { isAddress, type Hex } from 'viem';

const ADDRESS_LINE_RE = /\n(0x[a-fA-F0-9]{40})\n/;
const CHAIN_ID_LINE_RE = /\nChain ID: (\d+)(?:\n|$)/;
const NONCE_LINE_RE = /\nNonce: ([A-Za-z0-9_-]+)(?:\n|$)/;

export interface SiweMessageFields {
  address: Hex;
  nonce: string;
  chainId: number;
}

export interface BuildSiweMessageInput {
  address: string;
  chainId: number;
  domain: string;
  nonce: string;
  uri: string;
  issuedAt?: Date;
}

export function buildSiweMessage({
  address,
  chainId,
  domain,
  nonce,
  uri,
  issuedAt = new Date(),
}: BuildSiweMessageInput): string {
  return `${domain} wants you to sign in with your Ethereum account:
${address}

Sign in to UNIT-01 Plinko.

URI: ${uri}
Version: 1
Chain ID: ${chainId}
Nonce: ${nonce}
Issued At: ${issuedAt.toISOString()}`;
}

export function parseSiweMessage(message: string): SiweMessageFields {
  const address = message.match(ADDRESS_LINE_RE)?.[1];
  const nonce = message.match(NONCE_LINE_RE)?.[1];
  const chainId = Number(message.match(CHAIN_ID_LINE_RE)?.[1]);

  if (!address || !nonce || !Number.isSafeInteger(chainId) || !isAddress(address)) {
    throw new UnauthorizedException('Invalid SIWE message.');
  }

  return { address: address as Hex, nonce, chainId };
}
