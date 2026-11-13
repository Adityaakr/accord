# Use Accord from an agent

Everything below reads NEAR testnet with no account and no keys. Run it from `platform/` after `corepack enable && pnpm install`.

**Check a payment before signing.** [`/app/check`](https://accordweb-production.up.railway.app/app/check), or as JSON on the live attack room, which is executing: `GET https://accordweb-production.up.railway.app/app/api/check?agreement=a14.accord-v2.testnet&item=1&amount=0.01&recipient=halcyon-mm.testnet` answers `"verdict": "pay"` ("Would be paid: 0.01 tUSDC to halcyon-mm.testnet for item 1."), and the same call with `recipient=halcyon-markets.testnet` answers `"verdict": "refuse"`, `ERR_PAYEE_MISMATCH` (both on 10 Nov 2026; the room's state moves as visitors use it). It answers whether the agreement's contract would pay or refuse that payment, gate by gate (CORS any origin, GET only, 30 a minute per IP). It is a read-only simulation of `accord-core`'s `check_pay`, the function `act` calls, over chain state at one block: no transaction, and the contract decides at the time of the real call. Replayed against 24 recorded payments and refusals, it matches every one.

**Price funding from another chain.** `pnpm --silent --filter @accord/cli dev -- fund-quote --agreement a6.accord-v2.testnet`, or `GET https://accordweb-production.up.railway.app/app/api/fund-quote/a6.accord-v2.testnet` (CORS any origin, cached 60 s). NEAR Intents' 1Click prices delivering the agreement's total as native USDC on NEAR from USDC on Base, Ethereum, Arbitrum and Solana. Every request is `dry: true`: 1Click signs the quote and returns no deposit address, so nothing is signed or sent. A run on 10 Nov 2026:

```
accord fund-quote · a6.accord-v2.testnet · total 35.50 tUSDC · NEAR Intents 1Click, dry quote: nothing is signed or sent
  base      send 35.865347 USDC on Base → 35.50 USDC on NEAR · about 35 s
  eth       send 35.86546 USDC on Ethereum → 35.50 USDC on NEAR · about 45 s
  arb       send 35.865438 USDC on Arbitrum → 35.50 USDC on NEAR · about 25 s
  sol       send 35.865438 USDC on Solana → 35.50 USDC on NEAR · about 20 s
  signed    by 1Click ed25519:5vbW1wjAKv… at 2026-11-10T20:35:46.054Z
  scope     1Click runs on NEAR mainnet only: this prices the same total on mainnet; a testnet agreement cannot receive it
```

**MCP server** (`@accord/mcp`, stdio by default). With no key in the environment it serves 9 read-only tools: `accord_tender_jobs`, `accord_tender_job`, `accord_list_agreements`, `accord_get_agreement`, `accord_due_items`, `accord_preflight`, `accord_refusals`, `accord_receipts` and `accord_verify`. The paying, principal and bidding tools appear only when their keys are set ([`platform/INTERFACES.md`](../platform/INTERFACES.md) section 12).

```bash
ACCORD_FACTORY=accord-v2.testnet pnpm --silent --filter @accord/mcp dev            # stdio
ACCORD_FACTORY=accord-v2.testnet pnpm --silent --filter @accord/mcp dev -- --http 3333   # streamable HTTP at http://127.0.0.1:3333/mcp
```

On start it prints `accord-mcp · 9 tools · agent off · principal off` on stderr. An MCP client config runs the first command with `cwd` set to `platform/`.

**Without cloning.** A hosted, keyless, read-only MCP server at `https://accordweb-production.up.railway.app/app/mcp` (streamable HTTP; the 9 read tools; any origin; 60 requests a minute per IP). The site describes it at [`/.well-known/mcp.json`](https://accordweb-production.up.railway.app/.well-known/mcp.json):

```json
{ "mcpServers": { "accord": { "type": "http", "url": "https://accordweb-production.up.railway.app/app/mcp" } } }
```

Local stdio, from a clone (`cd platform && corepack enable && pnpm install` builds it):

```json
{ "mcpServers": { "accord": { "command": "node", "args": ["/path/to/repo/platform/packages/mcp/dist/main.js"] } } }
```

With the same deploy, the verify API and the public record CSV can be read from any origin (CORS `*`, GET only): `curl -H 'Origin: https://example.com' https://accordweb-production.up.railway.app/app/api/verify/a10.accord-v2.testnet`; the CSV is at `/app/record.csv`. Amounts are in the agreement token's own unit: tUSDC is the test token (`tusdc.accord-v1.testnet`, no value), USDC is Circle's testnet USDC (`accord-usdc.testnet` agreements). The packages are not published to npm yet.

Preflight on testnet: three of its signals, `age_days`, `tx_30d` and `code_changed_30d`, return `unavailable`. No keyless indexer gives an account's age or its transaction count, and `code_changed_30d` needs an archival RPC (`NEAR_ARCHIVAL_RPC_URL`), which is not set by default and which did not serve testnet state from 30 days back when tried on 9 Nov 2026. The rating comes from the RPC account read (exists, is a contract), the agreement (authorised recipient, canaries) and the factory's reports, blocklist and recipient stats.

**CLI** (`accord`; read-only commands need no key):

```bash
ACCORD_FACTORY=accord-v2.testnet pnpm --silent --filter @accord/cli dev -- show --agreement a6.accord-v2.testnet
ACCORD_FACTORY=accord-v2.testnet pnpm --silent --filter @accord/cli dev -- receipts --agreement a6.accord-v2.testnet --json
```

**SDK** (`@accord/sdk`, TypeScript on `near-api-js`; `pnpm install` builds it):

```ts
import { Accord, verify } from "@accord/sdk";
const accord = new Accord({ network: "testnet", factory: "accord-v2.testnet" });
const report = await verify(accord, "a6.accord-v2.testnet"); // { checks: [{ name, status, detail }], ok, partial, failed, notChecked }
```

**HTTP**: the live app returns the same seven-check report as JSON, with a nonce you choose (64 hex characters) or one it generates:

```bash
curl -s https://accordweb-production.up.railway.app/app/api/verify/a6.accord-v2.testnet
```

An account that is not an Accord agreement answers `404` with `{"error":"<account> is not an Accord agreement"}` (live: `/app/api/verify/nobody.testnet`). The site also serves [/llms.txt](https://accordweb-production.up.railway.app/llms.txt) and [/facts.json](https://accordweb-production.up.railway.app/facts.json).
