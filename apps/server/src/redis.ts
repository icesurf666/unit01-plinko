import { Socket, createConnection } from 'node:net';
import { TLSSocket, connect as tlsConnect } from 'node:tls';
import { integerEnv } from './config/env';
import {
  parseRedisFrame,
  serializeRedisCommand,
  type RedisCommandPart,
  type RedisScalar,
} from './redis-protocol';

type RedisSocket = Socket | TLSSocket;

let warned = false;
let disabledUntil = 0;

function redisUrl(): string | null {
  const raw = process.env.REDIS_URL?.trim();
  if (!raw || ['false', 'null', 'undefined'].includes(raw.toLowerCase())) return null;
  return raw;
}

export function redisEnabled(): boolean {
  return Boolean(redisUrl());
}

export function redisCircuitOpen(): boolean {
  return Date.now() < disabledUntil;
}

async function open(url: URL): Promise<RedisSocket> {
  const defaultPort = url.protocol === 'rediss:' ? 6380 : 6379;
  const port = url.port ? Number(url.port) : defaultPort;
  const host = url.hostname || '127.0.0.1';
  const readyEvent = url.protocol === 'rediss:' ? 'secureConnect' : 'connect';
  const socket =
    url.protocol === 'rediss:'
      ? tlsConnect({ host, port, servername: host })
      : createConnection({ host, port });

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error('Redis connection timed out.'));
    }, integerEnv('REDIS_CONNECT_TIMEOUT_MS', { defaultValue: 500, min: 50 }));
    socket.once(readyEvent, () => {
      clearTimeout(timeout);
      resolve();
    });
    socket.once('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
  return socket;
}

async function rawCommand(parts: RedisCommandPart[]): Promise<RedisScalar> {
  const configuredUrl = redisUrl();
  if (!configuredUrl) return null;
  if (Date.now() < disabledUntil) return null;
  const url = new URL(configuredUrl);
  const socket = await open(url);
  try {
    if (url.password) {
      const password = decodeURIComponent(url.password);
      if (url.username) {
        await writeCommand(socket, ['AUTH', decodeURIComponent(url.username), password]);
      } else {
        await writeCommand(socket, ['AUTH', password]);
      }
    }
    const db = url.pathname.replace('/', '');
    if (db) {
      await writeCommand(socket, ['SELECT', db]);
    }
    return await writeCommand(socket, parts);
  } finally {
    socket.end();
  }
}

function writeCommand(socket: RedisSocket, parts: RedisCommandPart[]): Promise<RedisScalar> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const timeout = setTimeout(() => {
      cleanup();
      socket.destroy();
      reject(new Error('Redis command timed out.'));
    }, integerEnv('REDIS_COMMAND_TIMEOUT_MS', { defaultValue: 500, min: 50 }));
    const cleanup = () => {
      clearTimeout(timeout);
      socket.off('data', onData);
      socket.off('error', onError);
    };
    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };
    const onData = (chunk: Buffer) => {
      chunks.push(chunk);
      try {
        const value = parseRedisFrame(Buffer.concat(chunks));
        if (value === undefined) return;
        cleanup();
        resolve(value);
      } catch (e) {
        cleanup();
        reject(e);
      }
    };
    socket.on('data', onData);
    socket.once('error', onError);
    socket.write(serializeRedisCommand(parts));
  });
}

export async function redisCommand(parts: RedisCommandPart[]): Promise<RedisScalar> {
  try {
    return await rawCommand(parts);
  } catch (e) {
    disabledUntil = Date.now() + integerEnv('REDIS_RETRY_AFTER_MS', { defaultValue: 30_000, min: 1_000 });
    if (!warned) {
      warned = true;
      // eslint-disable-next-line no-console
      console.warn(`Redis unavailable, falling back to memory: ${(e as Error).message}`);
    }
    return null;
  }
}

export async function redisHealth(): Promise<{
  configured: boolean;
  ok: boolean;
  circuitOpen: boolean;
}> {
  if (!redisEnabled()) return { configured: false, ok: true, circuitOpen: false };
  const pong = await redisCommand(['PING']);
  return { configured: true, ok: pong === 'PONG', circuitOpen: redisCircuitOpen() };
}
