import { Module } from '@nestjs/common';
import { StoreModule } from '../store/store.module';
import { IndexerService } from './indexer.service';

@Module({
  imports: [StoreModule],
  providers: [IndexerService],
})
export class ChainModule {}
