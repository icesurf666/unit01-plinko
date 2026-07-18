import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { DropRequest, DropResult, MeResult, ResolvedDrop } from '@plinko/shared';
import type { SeedCtx } from '../store/store.service';
import { StoreService } from '../store/store.service';
import { AuditService } from '../observability/audit.service';
import { DropResolverService } from './drop-resolver.service';
import { FeedGateway } from './feed.gateway';

interface BuildDropResultInput {
  balance: number;
  dropId: string;
  request: DropRequest;
  resolved: ResolvedDrop;
  seed: SeedCtx;
}

@Injectable()
export class GameService {
  constructor(
    private readonly store: StoreService,
    private readonly resolver: DropResolverService,
    private readonly feed: FeedGateway,
    private readonly audit: AuditService,
  ) {}

  async me(player: string): Promise<MeResult> {
    const p = await this.store.get(player);
    return {
      balance: p.balance,
      serverSeedHash: p.seed.serverSeedHash,
      clientSeed: p.seed.clientSeed,
      nonce: p.seed.nonce,
    };
  }

  async drop(player: string, request: DropRequest, requestId?: string): Promise<DropResult> {
    const p = await this.store.get(player);
    if (p.balance < request.stake) throw new BadRequestException('insufficient balance');

    if (request.clientSeed && request.clientSeed !== p.seed.clientSeed) {
      await this.store.setClientSeed(player, request.clientSeed);
    }

    const seed = await this.store.nextNonce(player);
    const resolved = this.resolver.resolve(
      seed.serverSeed,
      seed.clientSeed,
      seed.nonce,
      request.risk,
    );
    const payout = Math.floor(request.stake * resolved.multiplier);
    const dropId = randomUUID();
    const balance = await this.store.applyDrop(player, request.stake, payout, `drop:${dropId}`);
    const result = this.buildDropResult({ balance, dropId, request, resolved, seed });

    this.broadcastDrop(player, result);
    this.auditDrop(requestId, player, result);

    return result;
  }

  async rotateSeed(player: string) {
    return this.store.rotate(player);
  }

  private buildDropResult({
    balance,
    dropId,
    request,
    resolved,
    seed,
  }: BuildDropResultInput): DropResult {
    return {
      dropId,
      nonce: seed.nonce,
      path: resolved.path,
      bucket: resolved.bucket,
      multiplier: resolved.multiplier,
      payout: Math.floor(request.stake * resolved.multiplier),
      stake: request.stake,
      risk: request.risk,
      balance,
      serverSeedHash: seed.serverSeedHash,
    };
  }

  private broadcastDrop(player: string, result: DropResult): void {
    this.feed.broadcastDrop({
      addr: player,
      stake: result.stake,
      risk: result.risk,
      bucket: result.bucket,
      multiplier: result.multiplier,
      payout: result.payout,
      ts: Date.now(),
    });
  }

  private auditDrop(requestId: string | undefined, player: string, result: DropResult): void {
    this.audit.event('game.drop_resolved', {
      requestId,
      player,
      dropId: result.dropId,
      stake: result.stake,
      risk: result.risk,
      bucket: result.bucket,
      multiplier: result.multiplier,
      payout: result.payout,
      balance: result.balance,
    });
  }
}
