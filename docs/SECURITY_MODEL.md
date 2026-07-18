# Security Model

This project is testnet-only, but the architecture models the controls expected
in a real GambleFi system.

## Trust Boundaries

| Boundary | Control |
| --- | --- |
| Browser -> API | JWT session required for game and wallet endpoints |
| Wallet -> API | SIWE-style signed message proves wallet ownership |
| API -> contract | Withdrawals require EIP-712 signatures from the trusted server signer |
| Chain -> API ledger | Deposits are credited from confirmed contract events, not client claims |
| API -> database | Idempotency keys prevent replayed deposit/drop/withdraw mutations |

## Game Fairness

The server commits to `sha256(serverSeed)` before play. The player contributes a
`clientSeed`, and each drop uses a monotonic `nonce`.

```text
digest = HMAC_SHA256(serverSeed, `${clientSeed}:${nonce}`)
path   = low bits of digest bytes
bucket = number of right moves
```

The revealed seed can be checked in `/verify` without calling the server.

## Money Movement

- Deposits settle on-chain into `PlinkoVault`.
- The indexer credits in-game balance only after configured confirmations.
- Drops move funds inside the backend ledger.
- Withdrawals reserve off-chain balance before the server signs an EIP-712 authorization.
- `PlinkoVault` rejects expired signatures, reused nonces, and wrong signers.

## Operational Controls

- Strict CORS allowlist via `CORS_ORIGINS`.
- Rate limiting with Redis support and memory fallback.
- `JWT_SECRET` is required in production.
- Production startup fails fast if required secrets, contract addresses, RPC, CORS, or store configuration are missing.
- Production Redis must use `rediss://` unless insecure Redis is explicitly allowed.
- Request IDs are returned in `x-request-id`.
- Public API errors use a stable JSON envelope and do not expose server stack traces.
- `/ready` reports store and Redis degraded mode.
- `/metrics` exposes counters/latency data.
- Structured audit logs record auth, drops, and withdrawal signing.

## Non-Goals

- No real-money gambling support.
- No custodial production deployment.
- No compliance/KYC controls.
- No formal smart-contract audit.
