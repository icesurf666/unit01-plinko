import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { buildSiweMessage, parseSiweMessage } from './siwe';

const address = '0x1111111111111111111111111111111111111111';

describe('siwe message helpers', () => {
  it('builds and parses the signed fields used for auth', () => {
    const message = buildSiweMessage({
      address,
      chainId: 84532,
      domain: 'localhost:3000',
      nonce: 'nonce_123',
      uri: 'http://localhost:3000',
      issuedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    expect(parseSiweMessage(message)).toEqual({
      address,
      chainId: 84532,
      nonce: 'nonce_123',
    });
  });

  it('rejects malformed SIWE messages', () => {
    expect(() => parseSiweMessage('not a siwe message')).toThrow(UnauthorizedException);
    expect(() =>
      parseSiweMessage(
        buildSiweMessage({
          address: '0xnot-an-address',
          chainId: 84532,
          domain: 'localhost:3000',
          nonce: 'nonce_123',
          uri: 'http://localhost:3000',
        }),
      ),
    ).toThrow(UnauthorizedException);
  });
});
