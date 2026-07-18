import { Global, Module } from '@nestjs/common';
import { StoreService } from './store.service';
import { MemoryStore } from './memory.store';
import { LedgerStore } from './ledger.store';

// DATABASE_URL set → Postgres ledger; otherwise in-memory (demo without a DB).
@Global()
@Module({
  providers: [
    {
      provide: StoreService,
      useClass: process.env.DATABASE_URL ? LedgerStore : MemoryStore,
    },
  ],
  exports: [StoreService],
})
export class StoreModule {}
