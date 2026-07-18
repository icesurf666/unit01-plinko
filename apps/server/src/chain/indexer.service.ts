import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createPublicClient, http, parseAbiItem, type Address } from 'viem';
import { normalizeEvmAddress } from '@plinko/shared';
import { bigintEnv } from '../config/env';
import { StoreService } from '../store/store.service';

// ADR-6: event indexing with N confirmations, backfill from lastBlock,
// idempotency by txHash:logIndex. Cursor/dedup are in-memory here;
// Postgres + the ledger would persist them.
const DEPOSITED = parseAbiItem('event Deposited(address indexed user, uint256 amount)');
const WITHDRAWN = parseAbiItem('event Withdrawn(address indexed user, uint256 amount, uint256 nonce)');

const CHUNK = 10n; // Alchemy free tier: eth_getLogs is capped at 10 blocks per request
const UNIT_WEI = 10n ** 18n;

interface VaultEventLog {
  args: {
    amount?: bigint;
    user?: unknown;
  };
  logIndex: number;
  transactionHash: string;
}

function wholeUnitAmount(amountWei: bigint): number {
  const wholeUnits = amountWei / UNIT_WEI;
  if (wholeUnits > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error('Indexed amount exceeds safe integer range.');
  }
  return Number(wholeUnits);
}

@Injectable()
export class IndexerService implements OnModuleInit {
  private readonly log = new Logger('Indexer');
  private readonly client = createPublicClient({
    transport: http(
      process.env.RPC_URL ?? process.env.BASE_SEPOLIA_RPC_URL ?? 'https://sepolia.base.org',
    ),
  });
  private readonly vault = (process.env.VAULT_ADDRESS ?? '') as Address;
  private readonly confirmations = bigintEnv('CONFIRMATIONS', { defaultValue: 2, min: 0 });
  private lastBlock = bigintEnv('START_BLOCK', { defaultValue: 0, min: 0 });
  private readonly seen = new Set<string>();

  constructor(private readonly store: StoreService) {}

  onModuleInit(): void {
    if (!this.vault || /^0x0+$/.test(this.vault)) {
      this.log.warn('VAULT_ADDRESS not set — indexer disabled');
      return;
    }
    void this.start();
  }

  private async start(): Promise<void> {
    if (this.lastBlock === 0n) {
      try {
        const head = await this.client.getBlockNumber();
        this.lastBlock = head > 10n ? head - 10n : 0n; // start near head (10-block limit)
      } catch (e) {
        this.log.warn(`init block failed, starting from 0: ${(e as Error).message}`);
      }
    }
    this.log.log(`indexer started from block ${this.lastBlock}, vault ${this.vault}`);
    setInterval(() => void this.poll(), 12_000);
    void this.poll();
  }

  private async poll(): Promise<void> {
    try {
      const head = await this.client.getBlockNumber();
      const safe = head - this.confirmations;
      if (safe <= this.lastBlock) return;

      const from = this.lastBlock + 1n;
      const to = from + CHUNK - 1n < safe ? from + CHUNK - 1n : safe; // chunk ≤ CHUNK blocks

      const deposits = await this.client.getLogs({
        address: this.vault,
        event: DEPOSITED,
        fromBlock: from,
        toBlock: to,
      });
      await this.handleDeposits(deposits);

      const withdrawals = await this.client.getLogs({
        address: this.vault,
        event: WITHDRAWN,
        fromBlock: from,
        toBlock: to,
      });
      this.handleWithdrawals(withdrawals);

      this.lastBlock = to;
    } catch (e) {
      this.log.warn(`poll failed (retry in 12s): ${(e as Error).message.slice(0, 80)}`);
    }
  }

  private async handleDeposits(logs: VaultEventLog[]): Promise<void> {
    for (const log of logs) {
      const key = `d:${log.transactionHash}:${log.logIndex}`;
      if (this.markSeen(key)) continue;

      const user = normalizeEvmAddress(String(log.args.user));
      const amount = wholeUnitAmount(log.args.amount ?? 0n);
      const balance = await this.store.creditDeposit(user, amount, `deposit:${key}`);
      this.log.log(`DEPOSIT +${amount} UNIT -> ${user} (balance ${balance})`);
    }
  }

  private handleWithdrawals(logs: VaultEventLog[]): void {
    for (const log of logs) {
      const key = `w:${log.transactionHash}:${log.logIndex}`;
      if (this.markSeen(key)) continue;

      // The balance was already reserved when /withdraw was signed; the chain event confirms settlement.
      this.log.log(`WITHDRAW settled -> ${normalizeEvmAddress(String(log.args.user))}`);
    }
  }

  private markSeen(key: string): boolean {
    if (this.seen.has(key)) return true;
    this.seen.add(key);
    return false;
  }
}
