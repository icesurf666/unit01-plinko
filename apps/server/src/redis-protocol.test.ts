import { describe, expect, it } from 'vitest';
import { parseRedisFrame, serializeRedisCommand } from './redis-protocol';

describe('redis protocol helpers', () => {
  it('serializes commands as RESP arrays', () => {
    expect(serializeRedisCommand(['SET', 'key', 1])).toBe(
      '*3\r\n$3\r\nSET\r\n$3\r\nkey\r\n$1\r\n1\r\n',
    );
  });

  it('parses simple strings, integers, bulk strings, and nil', () => {
    expect(parseRedisFrame(Buffer.from('+OK\r\n'))).toBe('OK');
    expect(parseRedisFrame(Buffer.from(':42\r\n'))).toBe(42);
    expect(parseRedisFrame(Buffer.from('$5\r\nhello\r\n'))).toBe('hello');
    expect(parseRedisFrame(Buffer.from('$-1\r\n'))).toBeNull();
  });

  it('returns undefined for partial frames', () => {
    expect(parseRedisFrame(Buffer.from('+OK'))).toBeUndefined();
    expect(parseRedisFrame(Buffer.from('$5\r\nhel'))).toBeUndefined();
  });

  it('throws on error frames and unsupported frames', () => {
    expect(() => parseRedisFrame(Buffer.from('-ERR nope\r\n'))).toThrow('ERR nope');
    expect(() => parseRedisFrame(Buffer.from('*1\r\n+OK\r\n'))).toThrow('Unsupported Redis response.');
  });
});
