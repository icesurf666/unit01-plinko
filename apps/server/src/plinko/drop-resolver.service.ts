import { Injectable } from '@nestjs/common';
import { resolveDrop, type Risk, type ResolvedDrop } from '@plinko/shared';

// Stateless (ADR-7): a pure resolution of a bet from the committed seed. Any
// instance can handle any drop, no leader election needed.
@Injectable()
export class DropResolverService {
  resolve(serverSeed: string, clientSeed: string, nonce: number, risk: Risk): ResolvedDrop {
    return resolveDrop(serverSeed, clientSeed, nonce, risk);
  }
}
