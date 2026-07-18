import { pgTable, serial, integer, text, bigint, uuid, timestamp, unique } from 'drizzle-orm/pg-core';

// Double-entry ledger (ADR-2). Amounts are whole UNIT (bigint, no float).
// accounts.balance is a materialized cache, moved in the same transaction.

export const accounts = pgTable(
  'accounts',
  {
    id: serial('id').primaryKey(),
    ownerType: text('owner_type').notNull(), // 'player' | 'system'
    ownerRef: text('owner_ref').notNull(), // player address | 'house' | 'external'
    balance: bigint('balance', { mode: 'number' }).notNull().default(0),
  },
  (t) => ({ ownerUniq: unique('accounts_owner_uniq').on(t.ownerType, t.ownerRef) }),
);

export const ledgerTransactions = pgTable('ledger_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: text('type').notNull(), // GRANT | DEPOSIT | DROP | WITHDRAW_RESERVE
  idempotencyKey: text('idempotency_key').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const ledgerEntries = pgTable('ledger_entries', {
  id: serial('id').primaryKey(),
  txId: uuid('tx_id')
    .notNull()
    .references(() => ledgerTransactions.id),
  accountId: integer('account_id')
    .notNull()
    .references(() => accounts.id),
  amount: bigint('amount', { mode: 'number' }).notNull(), // entries per tx always sum to 0
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Provably-fair state per player.
export const serverSeeds = pgTable('server_seeds', {
  playerAddr: text('player_addr').primaryKey(),
  serverSeed: text('server_seed').notNull(),
  serverSeedHash: text('server_seed_hash').notNull(),
  clientSeed: text('client_seed').notNull(),
  nonce: bigint('nonce', { mode: 'number' }).notNull().default(0),
});
