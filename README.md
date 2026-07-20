# UNIT-01 Plinko

UNIT-01 Plinko is a portfolio-grade GambleFi architecture demo: a hybrid
off-chain game resolver, on-chain vault, EIP-712 settlement, double-entry ledger,
chain indexer, shared deterministic fairness engine, PixiJS board, and real-time
feed.

The project is intentionally testnet-only. It does not handle real-money gambling;
the goal is to demonstrate full-stack Web3, backend, frontend, and product
engineering.

## Live Contracts

Base Sepolia:

| Contract | Address |
| --- | --- |
| PlinkoVault | [`0x41408D9A4987428EdA217aF5e6C9C5BE06680E9E`](https://sepolia.basescan.org/address/0x41408D9A4987428EdA217aF5e6C9C5BE06680E9E) |
| UNIT token | [`0xf9Ea47bebfbF8B51040d342a1EAdbd6E19381fc7`](https://sepolia.basescan.org/address/0xf9Ea47bebfbF8B51040d342a1EAdbd6E19381fc7) |

## What It Demonstrates

- A production-shaped Web3 game architecture, not a static dApp UI.
- SIWE-style wallet authentication, server-issued JWT sessions, strict CORS, and API rate limiting.
- Request IDs, security headers, readiness checks, Prometheus-style metrics, and structured JSON audit logs.
- Standardized API error responses and app-level error/404 screens.
- Provably fair outcome generation using commit-reveal and player-controlled seeds.
- Direct contract interaction from the frontend with wagmi, viem, and RainbowKit.
- EIP-2612 permit deposits and server-signed EIP-712 withdrawals.
- A backend-owned ledger model with an in-memory demo store and a Postgres/Drizzle implementation.
- Guest sessions receive demo credits; SIWE wallet sessions start from zero and are credited by indexed on-chain deposits.
- Real-time event broadcasting over Socket.IO.
- Shared TypeScript schemas and deterministic fairness utilities used by both client and server.
- Contract tests with Foundry, including fuzz coverage.

## Gameplay

The player selects a bet size and a risk level, then drops a ball through a
triangle of pegs. The server resolves the result deterministically from the
current seed context, returns the path and payout, and the PixiJS board animates
that already-decided outcome.

Payout is calculated as:

```text
payout = bet * bucket multiplier
```

High-risk edge buckets pay more but are rarer. Center buckets pay less and are
more common.

## Architecture

Fully on-chain Plinko would be slow and expensive because every drop would need a
transaction. UNIT-01 uses the common GambleFi split: game resolution is off-chain,
fund custody and settlement are on-chain.

```text
Browser: Next.js, React, PixiJS, wagmi, RainbowKit
  |-- REST: /auth/guest, /auth/nonce, /auth/verify, /me, /drop, /withdraw
  |-- WebSocket: live drop feed
  |-- JSON-RPC: deposit and withdraw transactions

NestJS server
  |-- AuthService: guest JWT + SIWE wallet JWT
  |-- Observability: request IDs, audit events, /health, /ready, /metrics
  |-- ErrorFilter: safe JSON error envelopes with request IDs
  |-- DropResolver: stateless provably fair outcome calculation
  |-- StoreService: MemoryStore or Postgres LedgerStore
  |-- SignerService: EIP-712 withdrawal signatures
  |-- IndexerService: on-chain deposit indexing
  |-- FeedGateway: Socket.IO broadcasts

Base Sepolia
  |-- UnitToken
  |-- PlinkoVault
```

## Provably Fair Model

The fairness flow uses commit-reveal with a player-controlled `clientSeed`.

```text
digest     = HMAC_SHA256(serverSeed, `${clientSeed}:${nonce}`)
bit[row]   = digest[row] & 1
bucket     = sum(bit[row])
multiplier = PAYOUTS[risk][bucket]
```

1. The server publishes `sha256(serverSeed)` before drops are played.
2. The player contributes `clientSeed`, preventing the server from freely
   selecting outcomes after seeing player intent.
3. Each drop increments `nonce`, preventing replay of a favorable result.
4. On seed rotation, the old `serverSeed` can be revealed and verified.
5. The `/verify` page recomputes outcomes in the browser using the same
   `packages/shared` fairness utility as the server.

## Monorepo Layout

```text
apps/web             Next.js app, PixiJS board, wallet panel, fairness verifier
apps/server          NestJS REST API, Socket.IO feed, signer, chain indexer
packages/shared      zod schemas, shared types, payout tables, fairness utilities
packages/contracts   Solidity contracts, deployment script, Foundry tests
```

## Tech Stack

| Area | Stack |
| --- | --- |
| Frontend | Next.js App Router, React 19, PixiJS, Zustand, Tailwind |
| Web3 client | wagmi v2, viem, RainbowKit, TanStack Query |
| Backend | NestJS, Socket.IO, viem |
| Persistence | In-memory demo store or Postgres with Drizzle |
| Contracts | Solidity 0.8.24, Foundry, OpenZeppelin |
| Monorepo | pnpm workspaces, TypeScript |

## Local Setup

Install dependencies:

```bash
pnpm install
```

Build the shared package:

```bash
pnpm build:shared
```

Start the web and server apps:

```bash
pnpm dev
```

Open:

```text
http://localhost:3000
```

Useful routes:

| Route | Purpose |
| --- | --- |
| `/` | Game UI |
| `/verify` | Offline provably fair verifier |
| `GET /health` | Server health check |
| `GET /ready` | Readiness check for store and Redis-backed degraded mode |
| `GET /metrics` | Prometheus-style counters and latency summaries |
| `POST /auth/guest` | Create a guest JWT for demo play |
| `GET /auth/nonce` | Create a SIWE nonce and message for a wallet |
| `POST /auth/verify` | Verify the wallet signature and issue a JWT |
| `POST /drop` | Resolve a drop |
| `POST /withdraw` | Reserve balance and return an EIP-712 withdrawal signature |

## Environment

Copy the example files before running a full Web3 flow:

```bash
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.local.example apps/web/.env.local
cp packages/contracts/.env.example packages/contracts/.env
```

Important variables:

| Variable | Used By | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Web | API base URL, defaults to `http://localhost:3001` |
| `NEXT_PUBLIC_CHAIN_ID` | Web | Base Sepolia is `84532` |
| `NEXT_PUBLIC_TOKEN_ADDRESS` | Web | UNIT token contract |
| `NEXT_PUBLIC_VAULT_ADDRESS` | Web | PlinkoVault contract |
| `NEXT_PUBLIC_WC_PROJECT_ID` | Web | WalletConnect project ID |
| `JWT_SECRET` | Server | HMAC secret for signed JWT sessions |
| `START_BALANCE` | Server | Guest-only demo credits; wallet accounts start from 0 |
| `CORS_ORIGINS` | Server | Comma-separated browser origins allowed to call the API |
| `SIWE_DOMAIN` | Server | Domain included in the SIWE message |
| `SIWE_URI` | Server | URI included in the SIWE message |
| `RATE_LIMIT_WINDOW_MS` | Server | Rate-limit window duration |
| `RATE_LIMIT_MAX` | Server | Requests allowed per IP/method/path/window |
| `DATABASE_URL` | Server | Enables the Postgres ledger store |
| `RPC_URL` | Server | Base Sepolia RPC used by the indexer |
| `TRUSTED_SIGNER_PK` | Server | Private key for EIP-712 withdrawal authorization |
| `VAULT_ADDRESS` | Server | Contract address used in the EIP-712 domain |

Never commit real private keys. The included examples are for local/testnet
development only.

## Tests

Run TypeScript package and app builds:

```bash
pnpm build
```

Run backend and shared tests:

```bash
pnpm --filter @plinko/server test
pnpm --filter @plinko/shared test
```

Run Solidity tests:

```bash
cd packages/contracts
forge test -vv
```

GitHub Actions runs the same build, Vitest, and Foundry checks on every change
under `plinko/`.

## Deployment Notes

- `render.yaml` contains a Render blueprint for the NestJS server.
- Render-specific env checklist: [`docs/RENDER_DEPLOYMENT.md`](docs/RENDER_DEPLOYMENT.md).
- The web app can be deployed separately to Vercel or any Next.js-compatible host.
- Production deployments should use Postgres by setting `DATABASE_URL`.
- The server signer must match the `trustedSigner` configured in `PlinkoVault`.
- `CORS_ORIGINS`, `SIWE_DOMAIN`, and `SIWE_URI` must match the deployed frontend.
- `JWT_SECRET`, `RPC_URL`, and `TRUSTED_SIGNER_PK` must be set as deployment secrets.
- Production startup validates required secrets, contract addresses, CORS origins, RPC, store mode, and Redis TLS.
- `GET /ready` reports store health and Redis degraded mode; `GET /health` stays cheap for uptime checks.
- `GET /metrics` exposes request counters, latency sums/counts, audit event counters, rate-limit rejections, and process uptime.
- API responses include `x-request-id`; incoming `x-request-id` is preserved for trace correlation.
- API errors use a stable JSON envelope with `statusCode`, `message`, `path`, `requestId`, and `timestamp`.
- Server audit events are one-line JSON logs for auth, drop resolution, and withdrawal signing.

## Current Status

- Implemented: game resolver, REST API, live feed, PixiJS animation, sound effects.
- Implemented: Base Sepolia contracts, permit deposits, EIP-712 withdrawals.
- Implemented: SIWE-style wallet authentication, JWT sessions, strict CORS, rate limiting.
- Implemented: request IDs, security headers, structured audit logs, readiness checks, metrics, standardized errors.
- Implemented: Postgres/Drizzle ledger store and in-memory demo fallback.
- Implemented: deposit event indexing with confirmation delay and idempotency.
- Implemented: in-browser fairness verifier.
- Remaining production hardening: observability dashboards, Redis TLS enforcement,
  externalized nonce/rate-limit storage in managed Redis, and a public deployment
  with stable demo data.

## Portfolio Review Points

If you are reviewing this project as an employer, the most relevant files are:

| File | Why It Matters |
| --- | --- |
| `packages/shared/src/fairness.ts` | Deterministic game outcome algorithm shared by client and server |
| `apps/server/src/auth/auth.service.ts` | SIWE-style wallet verification and server-issued JWT sessions |
| `apps/server/src/observability/audit.service.ts` | Structured JSON audit logs for production review |
| `apps/server/src/observability/metrics.service.ts` | Prometheus-style metrics without external dependencies |
| `apps/server/src/health.controller.ts` | Uptime and readiness endpoints |
| `apps/server/src/http-exception.filter.ts` | Safe public API errors with request IDs |
| `apps/server/src/plinko/drop.controller.ts` | Request validation, drop resolution, balance mutation, feed broadcast |
| `apps/server/src/store/ledger.store.ts` | Postgres-backed double-entry ledger implementation |
| `apps/server/src/chain/indexer.service.ts` | Chain event indexing and idempotent deposit crediting |
| `apps/server/src/wallet/signer.service.ts` | Server-side EIP-712 withdrawal signing |
| `packages/contracts/src/PlinkoVault.sol` | On-chain custody and signed withdrawal settlement |
| `apps/web/src/features/game/ui/PlinkoBoard.tsx` | Client-side rendering and animation integration |
| `apps/web/src/features/fairness/ui/VerifyForm.tsx` | User-facing offline fairness verification |

Additional review docs:

| Document | Purpose |
| --- | --- |
| `docs/EMPLOYER_REVIEW.md` | Fast architecture pitch and interview talking points |
| `docs/SECURITY_MODEL.md` | Trust boundaries, fairness, money movement, and operational controls |
