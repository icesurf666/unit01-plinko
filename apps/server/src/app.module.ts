import { Module } from '@nestjs/common';
import { PlinkoModule } from './plinko/plinko.module';
import { WalletModule } from './wallet/wallet.module';
import { ChainModule } from './chain/chain.module';
import { AuthModule } from './auth/auth.module';
import { ObservabilityModule } from './observability/observability.module';
import { StoreModule } from './store/store.module';
import { HealthController } from './health.controller';

@Module({
  imports: [ObservabilityModule, StoreModule, AuthModule, PlinkoModule, WalletModule, ChainModule],
  controllers: [HealthController],
})
export class AppModule {}
