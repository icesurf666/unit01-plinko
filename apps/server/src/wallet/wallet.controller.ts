import { BadRequestException, Body, Controller, Headers, Post, UseGuards } from '@nestjs/common';
import { withdrawRequestSchema, type WithdrawSigned } from '@plinko/shared';
import { AuthGuard } from '../auth/auth.guard';
import { Player } from '../auth/player.decorator';
import { WalletService } from './wallet.service';

// Withdraw: the server reserves the off-chain balance and signs an EIP-712
// authorization; the player calls Vault.withdraw(...) with that signature.
@Controller()
@UseGuards(AuthGuard)
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  @Post('withdraw')
  async withdraw(
    @Player() player: string,
    @Body() body: unknown,
    @Headers('x-request-id') requestId?: string,
  ): Promise<WithdrawSigned> {
    const parsed = withdrawRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.wallet.signWithdraw(player, parsed.data, requestId);
  }
}
