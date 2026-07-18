# Employer Review Guide

UNIT-01 Plinko is best reviewed as an architecture project, not as a casino game.
The interesting work is the trust boundary between browser, API, database, and
contracts.

## 60-Second Pitch

I built a production-shaped GambleFi system with:

- Hybrid game resolution: fast off-chain Plinko outcomes, on-chain custody.
- Provably fair commit-reveal math shared by the server and browser verifier.
- EIP-2612 permit deposits and EIP-712 server-authorized withdrawals.
- Postgres double-entry ledger with an in-memory demo fallback.
- Chain event indexer with confirmation delay and idempotent deposit crediting.
- SIWE-style auth, JWT sessions, strict CORS, rate limiting, readiness checks,
  metrics, structured audit logs, standardized errors, and CI.

## Best Files To Review

| File | What To Look For |
| --- | --- |
| `packages/shared/src/fairness.ts` | Pure deterministic resolver shared by client and server |
| `apps/server/src/plinko/drop.controller.ts` | Stateless game resolution and balance mutation flow |
| `apps/server/src/store/ledger.store.ts` | Double-entry ledger and idempotent transaction posting |
| `apps/server/src/chain/indexer.service.ts` | Confirmation delay, chunked log polling, deposit idempotency |
| `apps/server/src/auth/auth.service.ts` | SIWE-style message verification and JWT issuing |
| `apps/server/src/wallet/signer.service.ts` | EIP-712 withdrawal authorization |
| `packages/contracts/src/PlinkoVault.sol` | Minimal vault, permit deposits, signature-based withdrawals |
| `apps/web/src/features/fairness/ui/VerifyForm.tsx` | Offline verification UX |

## Interview Talking Points

- Why not fully on-chain: block time and gas make per-drop transactions a poor UX.
- Why the client does not decide outcomes: the animation visualizes a server-resolved path.
- Why a ledger instead of a balance column: auditability, replay safety, and money-movement invariants.
- Why shared fairness code matters: one resolver implementation removes server/client divergence.
- Why EIP-712: readable typed signatures, domain separation, deadline, nonce, and replay protection.
- Why operational endpoints matter: `/ready`, `/metrics`, request IDs, and audit logs make failures debuggable.
- Why standardized errors matter: clients get stable envelopes while server internals stay out of public responses.

## Known Production Gaps

- Use managed Redis for SIWE nonces and rate limits in multi-instance deployments.
- Add dashboards/alerts for drop error rate, withdraw signing failures, indexer lag, and RPC failures.
- Add SIWE message domain hardening per deployment environment.
- Add formal contract audit before any real-money deployment.
- Add compliance controls; this demo is testnet-only and not a gambling product.
