import { Module } from '@nestjs/common';
import { DropController } from './drop.controller';
import { DropResolverService } from './drop-resolver.service';
import { GameService } from './game.service';
import { StoreModule } from '../store/store.module';
import { FeedGateway } from './feed.gateway';
import { AuthModule } from '../auth/auth.module';
import { ObservabilityModule } from '../observability/observability.module';

@Module({
  imports: [StoreModule, AuthModule, ObservabilityModule],
  controllers: [DropController],
  providers: [DropResolverService, FeedGateway, GameService],
})
export class PlinkoModule {}
