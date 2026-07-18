export type RedisCommandPart = string | number;
export type RedisScalar = string | number | null;
export type RedisParsedFrame = RedisScalar | undefined;

const CRLF = '\r\n';

function parseInteger(value: string, context: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw new Error(`Invalid Redis ${context}.`);
  return parsed;
}

export function serializeRedisCommand(parts: RedisCommandPart[]): string {
  return `*${parts.length}${CRLF}${parts
    .map((part) => {
      const value = String(part);
      return `$${Buffer.byteLength(value)}${CRLF}${value}${CRLF}`;
    })
    .join('')}`;
}

export function parseRedisFrame(buf: Buffer): RedisParsedFrame {
  const text = buf.toString('utf8');
  const firstLineEnd = text.indexOf(CRLF);
  if (firstLineEnd < 0) return undefined;

  const type = text[0];
  if (type === '+') return text.slice(1, firstLineEnd);
  if (type === ':') return parseInteger(text.slice(1, firstLineEnd), 'integer response');
  if (type === '-') throw new Error(text.slice(1, firstLineEnd));
  if (type !== '$') throw new Error('Unsupported Redis response.');

  const length = parseInteger(text.slice(1, firstLineEnd), 'bulk length');
  if (length < 0) return null;

  const bodyStart = firstLineEnd + CRLF.length;
  const frameLength = bodyStart + length + CRLF.length;
  if (buf.length < frameLength) return undefined;
  return text.slice(bodyStart, bodyStart + length);
}
