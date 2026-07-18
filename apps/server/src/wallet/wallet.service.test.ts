import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { StoreService } from '../store/store.service';
import type { AuditService } from '../observability/audit.service';
import type { SignerService } from './signer.service';
import { WalletService } from './wallet.service';

const wallet = '0x1111111111111111111111111111111111111111';

function makeService() {
  const store = {
    nextWithdrawNonce: vi.fn().mockReturnValue(123),
    reserve: vi.fn().mockResolvedValue(true),
    get: vi.fn().mockResolvedValue({ balance: 77, seed: {} }),
  } as unknown as StoreService;
  const signer = {
    signerAddress: '0x2222222222222222222222222222222222222222',
    signWithdraw: vi.fn().mockResolvedValue('0xsig'),
  } as unknown as SignerService;
  const audit = {
    event: vi.fn(),
  } as unknown as AuditService;

  return { audit, service: new WalletService(store, signer, audit), signer, store };
}

describe('WalletService', () => {
  it('reserves balance, signs a withdraw authorization, and audits it', async () => {
    const { audit, service, signer, store } = makeService();

    const result = await service.signWithdraw(wallet, { amount: 5, to: wallet }, 'req-1');

    expect(store.reserve).toHaveBeenCalledWith(wallet, 5, 'withdraw:123');
    expect(signer.signWithdraw).toHaveBeenCalledWith(wallet, 5n * 10n ** 18n, 123n, expect.any(BigInt));
    expect(result).toMatchObject({
      amount: 5,
      amountWei: '5000000000000000000',
      balance: 77,
      nonce: 123,
      signer: '0x2222222222222222222222222222222222222222',
      to: wallet,
    });
    expect(audit.event).toHaveBeenCalledWith(
      'wallet.withdraw_signed',
      expect.objectContaining({ amount: 5, player: wallet, requestId: 'req-1' }),
    );
  });

  it('rejects guest and mismatched wallet withdrawals', async () => {
    const { service } = makeService();

    await expect(service.signWithdraw('guest:1', { amount: 5, to: wallet })).rejects.toThrow(
      ForbiddenException,
    );
    await expect(
      service.signWithdraw('0x3333333333333333333333333333333333333333', { amount: 5, to: wallet }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects withdrawals when reserve fails', async () => {
    const { service, store } = makeService();
    vi.mocked(store.reserve).mockResolvedValue(false);

    await expect(service.signWithdraw(wallet, { amount: 5, to: wallet })).rejects.toThrow(
      BadRequestException,
    );
  });
});
