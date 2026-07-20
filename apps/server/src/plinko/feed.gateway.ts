import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Server } from 'socket.io';
import { BIG_WIN_MULT, type FeedDrop } from '@plinko/shared';
import { corsOrigin } from '../cors';

// ADR-8: transactional work over REST, broadcast events over ws. Global feed only.
@WebSocketGateway({ cors: { origin: corsOrigin, credentials: true } })
export class FeedGateway {
  @WebSocketServer() server!: Server;
  private readonly recent: FeedDrop[] = [];

  broadcastDrop(d: FeedDrop): void {
    this.recent.unshift(d);
    this.recent.splice(30);
    this.server.emit('drop', d);
    if (d.multiplier >= BIG_WIN_MULT) this.server.emit('big_win', d);
  }

  history(): FeedDrop[] {
    return [...this.recent];
  }
}
