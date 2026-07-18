import { Module } from '@nestjs/common';
import { StoreModule } from '../store/store.module';
import { AuthModule } from '../auth/auth.module';
import { ObservabilityModule } from '../observability/observability.module';
import { WalletController } from './wallet.controller';
import { SignerService } from './signer.service';
import { WalletService } from './wallet.service';

@Module({
  imports: [StoreModule, AuthModule, ObservabilityModule],
  controllers: [WalletController],
  providers: [SignerService, WalletService],
})
export class WalletModule {}
