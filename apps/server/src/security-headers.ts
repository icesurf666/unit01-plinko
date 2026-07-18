import type { HttpRequestLike, HttpResponseLike, NextFunction } from './http-types';

export function createSecurityHeadersMiddleware() {
  return (_req: HttpRequestLike, res: HttpResponseLike, next: NextFunction): void => {
    res.setHeader('x-content-type-options', 'nosniff');
    res.setHeader('referrer-policy', 'no-referrer');
    res.setHeader('permissions-policy', 'camera=(), microphone=(), geolocation=()');
    next();
  };
}
