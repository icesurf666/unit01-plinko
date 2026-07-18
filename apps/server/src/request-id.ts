import { randomUUID } from 'node:crypto';
import type { HttpRequestLike, HttpResponseLike, NextFunction } from './http-types';

export function createRequestIdMiddleware() {
  return (req: HttpRequestLike, res: HttpResponseLike, next: NextFunction): void => {
    const requestId = String(req.headers['x-request-id'] || randomUUID());
    req.headers['x-request-id'] = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  };
}
