# Render Deployment

The Render build can succeed while the service still fails at runtime. The server intentionally validates production configuration before binding a port, so missing secrets fail fast instead of running with insecure defaults.

## Required Server Env Vars

Set these in the Render service dashboard under Environment.

```bash
JWT_SECRET=<long random value>
CORS_ORIGINS=https://unit01-plinko-qm61uo2y9-unit501.vercel.app
SIWE_DOMAIN=unit01-plinko-qm61uo2y9-unit501.vercel.app
SIWE_URI=https://unit01-plinko-qm61uo2y9-unit501.vercel.app
RPC_URL=https://<base-sepolia-rpc>
TRUSTED_SIGNER_PK=<server signer private key>
VAULT_ADDRESS=0x41408D9A4987428EdA217aF5e6C9C5BE06680E9E
TOKEN_ADDRESS=0xf9Ea47bebfbF8B51040d342a1EAdbd6E19381fc7
CHAIN_ID=84532
```

Generate `JWT_SECRET` locally:

```bash
openssl rand -hex 32
```

## Store Mode

Use one of these modes:

```bash
# Production-like persistent ledger
DATABASE_URL=<render postgres internal database url>
```

or:

```bash
# Demo only: in-memory ledger, resets on restart/redeploy
ALLOW_MEMORY_STORE_IN_PRODUCTION=true
```

Redis is optional. If you did not provision Redis, delete `REDIS_URL` from the
Render environment instead of leaving a placeholder value. A bad Redis URL can
slow auth nonce creation until the client falls back to memory.

## Frontend Env Vars

The web app must point at the Render API:

```bash
NEXT_PUBLIC_API_URL=https://unit01-plinko.onrender.com
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_TOKEN_ADDRESS=0xf9Ea47bebfbF8B51040d342a1EAdbd6E19381fc7
NEXT_PUBLIC_VAULT_ADDRESS=0x41408D9A4987428EdA217aF5e6C9C5BE06680E9E
NEXT_PUBLIC_WC_PROJECT_ID=<optional 32-character Reown/WalletConnect project id>
```

Do not include leading/trailing spaces or quotes in Vercel env values. A value like
` https://unit01-plinko.onrender.com` breaks WebSocket URLs as `wss://%20https/...`.
Do not use placeholders such as `UNIT01_PLINKO_DEMO` for `NEXT_PUBLIC_WC_PROJECT_ID`:
leave it empty unless you have a real project ID.

## Common Failure

If logs show:

```text
Error: Missing required production env: JWT_SECRET, CORS_ORIGINS, SIWE_DOMAIN, SIWE_URI
```

the service is deployed without the required runtime env vars. Add them in Render and redeploy. If the next error mentions `DATABASE_URL`, either attach Postgres or explicitly set `ALLOW_MEMORY_STORE_IN_PRODUCTION=true` for a demo deployment.

If browser logs show CORS errors from Vercel, set `CORS_ORIGINS` to the exact
browser origin shown in the error, without a trailing slash. For the current
preview URL:

```bash
CORS_ORIGINS=https://unit01-plinko-qm61uo2y9-unit501.vercel.app
```
