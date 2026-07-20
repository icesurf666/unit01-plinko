import { BadRequestException, Body, Controller, Get, Headers, Post, UseGuards } from '@nestjs/common';
import { dropRequestSchema, type FeedDrop, type DropResult, type MeResult } from '@plinko/shared';
import { AuthGuard } from '../auth/auth.guard';
import { Player } from '../auth/player.decorator';
import { GameService } from './game.service';

// Player identity comes from a server-issued JWT: guest session or SIWE wallet session.
@Controller()
@UseGuards(AuthGuard)
export class DropController {
  constructor(private readonly game: GameService) {}

  @Get('me')
  async me(@Player() player: string): Promise<MeResult> {
    return this.game.me(player);
  }

  @Get('feed')
  async feed(): Promise<FeedDrop[]> {
    return this.game.feedHistory();
  }

  @Post('drop')
  async drop(
    @Player() player: string,
    @Body() body: unknown,
    @Headers('x-request-id') requestId?: string,
  ): Promise<DropResult> {
    const parsed = dropRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.game.drop(player, parsed.data, requestId);
  }

  @Post('seed/rotate')
  async rotate(@Player() player: string) {
    return this.game.rotateSeed(player);
  }
}
