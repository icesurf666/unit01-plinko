import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { normalizeEvmAddress, type WithdrawRequest, type WithdrawSigned } from '@plinko/shared';
import type { Hex } from 'viem';
import { AuditService } from '../observability/audit.service';
import { StoreService } from '../store/store.service';
import { SignerService } from './signer.service';

const UNIT_DECIMALS = 18n;
const WITHDRAW_TTL_SECONDS = 60 * 60;

function wholeUnitToWei(amount: number): bigint {
  return BigInt(amount) * 10n ** UNIT_DECIMALS;
}

@Injectable()
export class WalletService {
  constructor(
    private readonly store: StoreService,
    private readonly signer: SignerService,
    private readonly audit: AuditService,
  ) {}

  async signWithdraw(
    player: string,
    { amount, to }: WithdrawRequest,
    requestId?: string,
  ): Promise<WithdrawSigned> {
    this.assertWalletPlayer(player, to);

    const nonce = this.store.nextWithdrawNonce();
    const reserved = await this.store.reserve(player, amount, `withdraw:${nonce}`);
    if (!reserved) throw new BadRequestException('insufficient balance');

    const deadline = Math.floor(Date.now() / 1000) + WITHDRAW_TTL_SECONDS;
    const amountWei = wholeUnitToWei(amount);
    const sig = await this.signer.signWithdraw(
      to as Hex,
      amountWei,
      BigInt(nonce),
      BigInt(deadline),
    );
    const me = await this.store.get(player);

    this.audit.event('wallet.withdraw_signed', {
      requestId,
      player,
      to,
      amount,
      nonce,
      balance: me.balance,
      signer: this.signer.signerAddress,
    });

    return {
      to,
      amount,
      amountWei: amountWei.toString(),
      nonce,
      deadline,
      sig,
      signer: this.signer.signerAddress,
      balance: me.balance,
    };
  }

  private assertWalletPlayer(player: string, to: string): void {
    if (player.startsWith('guest:')) {
      throw new ForbiddenException('Sign in with a wallet before withdrawing.');
    }
    if (player !== normalizeEvmAddress(to)) {
      throw new ForbiddenException('Withdrawal address must match the signed-in wallet.');
    }
  }
}
