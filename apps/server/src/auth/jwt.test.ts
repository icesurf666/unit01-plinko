import { describe, expect, it } from 'vitest';
import { createJwt, verifyJwt } from './jwt';

describe('jwt', () => {
  it('round-trips signed wallet claims', () => {
    const token = createJwt(
      {
        sub: '0xabc',
        wallet: '0xabc',
        kind: 'wallet',
        iat: 10,
        exp: 20,
      },
      'secret',
    );

    expect(verifyJwt(token, 'secret', 15)).toMatchObject({
      sub: '0xabc',
      wallet: '0xabc',
      kind: 'wallet',
    });
  });

  it('rejects tampered tokens and expired claims', () => {
    const token = createJwt({ sub: 'guest:1', kind: 'guest', iat: 10, exp: 20 }, 'secret');
    const parts = token.split('.');
    const tampered = `${parts[0]}.${Buffer.from(JSON.stringify({ sub: 'guest:2', exp: 20 })).toString('base64url')}.${parts[2]}`;

    expect(() => verifyJwt(tampered, 'secret', 15)).toThrow();
    expect(() => verifyJwt(token, 'secret', 21)).toThrow();
  });
});
