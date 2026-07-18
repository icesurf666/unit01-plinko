const DEFAULT_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'];

export function allowedOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS ?? process.env.FRONTEND_ORIGIN;
  if (!raw) return DEFAULT_ORIGINS;
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function corsOrigin(origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void): void {
  // Allow server-to-server, curl, and health checks that do not send Origin.
  if (!origin) {
    cb(null, true);
    return;
  }
  if (allowedOrigins().includes(origin)) {
    cb(null, true);
    return;
  }
  cb(new Error(`Origin ${origin} is not allowed by CORS.`), false);
}
