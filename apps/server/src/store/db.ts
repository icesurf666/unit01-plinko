import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export type Sql = ReturnType<typeof postgres>;

export function makeDb(url: string) {
  const client = postgres(url, { max: 5 });
  return { db: drizzle(client, { schema }), client };
}

export type Db = ReturnType<typeof makeDb>['db'];
