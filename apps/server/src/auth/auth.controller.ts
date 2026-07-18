import { BadRequestException, Body, Controller, Get, Headers, Post, Query } from '@nestjs/common';
import {
  authNonceRequestSchema,
  authVerifyRequestSchema,
  type AuthNonceResult,
  type AuthTokenResult,
} from '@plinko/shared';
import type { Hex } from 'viem';
import { AuthService } from './auth.service';
import { AuditService } from '../observability/audit.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly audit: AuditService,
  ) {}

  @Post('guest')
  guest(@Headers('x-request-id') requestId?: string): AuthTokenResult {
    const token = this.auth.createGuestToken();
    this.audit.event('auth.guest_issued', { requestId, subject: token.subject });
    return token;
  }

  @Get('nonce')
  async nonce(
    @Query('address') address: string,
    @Headers('x-request-id') requestId?: string,
  ): Promise<AuthNonceResult> {
    const parsed = authNonceRequestSchema.safeParse({ address });
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const nonce = await this.auth.createNonce(parsed.data.address);
    this.audit.event('auth.nonce_issued', { requestId, wallet: nonce.address, expiresAt: nonce.expiresAt });
    return nonce;
  }

  @Post('verify')
  async verify(
    @Body() body: unknown,
    @Headers('x-request-id') requestId?: string,
  ): Promise<AuthTokenResult> {
    const parsed = authVerifyRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const token = await this.auth.verifySiwe(parsed.data.message, parsed.data.signature as Hex);
    this.audit.event('auth.wallet_verified', { requestId, subject: token.subject });
    return token;
  }
}
