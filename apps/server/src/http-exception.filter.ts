import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { HttpRequestLike, HttpResponseLike } from './http-types';

function publicMessage(exception: unknown, statusCode: number): string {
  if (exception instanceof HttpException) {
    const response = exception.getResponse();
    if (typeof response === 'string') return response;
    if (typeof response === 'object' && response && 'message' in response) {
      const message = (response as { message?: unknown }).message;
      if (Array.isArray(message)) return message.join(', ');
      if (typeof message === 'string') return message;
      if (typeof message === 'object') return 'Invalid request.';
    }
  }
  if (statusCode >= 500) return 'Internal server error.';
  return 'Request failed.';
}

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<HttpRequestLike>();
    const res = ctx.getResponse<HttpResponseLike>();
    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const requestId = String(req.headers['x-request-id'] ?? '');

    if (statusCode >= 500) {
      // eslint-disable-next-line no-console
      console.error(
        JSON.stringify({
          ts: new Date().toISOString(),
          level: 'error',
          event: 'http.unhandled_error',
          requestId,
          path: req.path,
          message: exception instanceof Error ? exception.message : String(exception),
        }),
      );
    }

    res.status(statusCode).json({
      statusCode,
      message: publicMessage(exception, statusCode),
      error: exception instanceof HttpException ? exception.name : 'InternalServerError',
      path: req.path ?? 'unknown',
      requestId,
      timestamp: new Date().toISOString(),
    });
  }
}
