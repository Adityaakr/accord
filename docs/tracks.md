# Track by track

The organisers' requirements per track ([`platform/GOAL.md`](../platform/GOAL.md) "Track requirements"), and where each is shown.

| Track | Requirement | Shown by |
| --- | --- | --- |
| `security` | The agent signs with a function-call key scoped to one contract, never a full-access key | [What the agent's key can and cannot do](../README.md#what-the-agents-key-can-and-cannot-do); `make verify` `keys` line |
| `security` | A prompt-injected agent tries to pay a bad address and is stopped, with the log | The [Live attack room](https://accordweb-production.up.railway.app/app/try); `make attack`; a11's three refusals in [`docs/runs.md`](runs.md#release-4-security-review-fixes) |
| `security` | A wrapper that blocks or asks a human, with data sources per signal | `preflight()` in the SDK and `accord_preflight` return `allow`, `warn` or `block`; `warn` waits for the buyer in the app; signals and sources in [`platform/ARCHITECTURE.md`](../platform/ARCHITECTURE.md) section 7.3. Three signals are `unavailable` on testnet ([above](use-from-an-agent.md)) |
| `privacy` | NEAR AI Cloud, a TEE model, attestation with a fresh nonce, a Verified panel | `z-ai/glm-5.3-flash` in the Sealed Table; the room's Verified panel and `/verify`; `make probe-ai`. The model check is `partial` in `make verify` ([why](../README.md#what-is-and-is-not-verifiable-today)) |
| `privacy` | Keep nothing server-side; fictional sample documents | [What we keep](../README.md#what-we-keep); [`platform/fixtures/companies`](../platform/fixtures/companies) (Northwind, Halcyon) |
| `agents` | Negotiate: counter once with reasons, then accept or walk away | a6: `QUOTE → COUNTER → FINAL → ACCEPT`; `make negotiate` |
| `agents` | Payments in USDC; a receipt per task | tUSDC and Circle USDC on NEAR; `/record`, `/app/record.csv`, `accord receipts` |
| `agents` | Agent Market: how jobs are posted and paid, or say there is no public way | Checked 31 Oct 2026: Agent Market is mainnet-only and holds payments in its own ledger, with no hook for an outside escrow, so Accord does not integrate it (`platform/DECISIONS.md` section 7) |
| `business` | Humans set the constraints; a kill switch | Mandates, both approvals, exceptions; `revoke_agent` (`make revoke`, a13) |
| `business` | Every sale and payout on a public ledger; a demo loop under two minutes | `/record`; `make demo` ran the loop on testnet in `1:29` from fresh accounts (a65, 10 Nov 2026 UTC: the two companies sign side by side and the Payee proof runs during the negotiation); the time moves with the enclave negotiation, which took `39 s` there and `64 s` in a slower run (a64, `2:20`). On a local node it runs in 14 s |
| `swarms` | A coordinator that opens a round, collects sealed bids, reveals them and picks a winner; rules written first | The tender board ([`RULES.md`](../platform/contracts/tender-board/RULES.md), [`contracts/tender-board`](../platform/contracts/tender-board)): signed sealed bids, reveal, an on-chain award anyone can call; [Open tenders](tenders.md) |
| `swarms` | A simulation with many agents and scripted strategies, no LLM calls; a live page with rounds, bids, clearing price and the winner | `make tender-sim` (20 agents, 5 jobs); [/app/tenders](https://accordweb-production.up.railway.app/app/tenders); `make tender` and agents outside the house set (run by us) on testnet |
| `swarms` | Each agent traceable on chain; settlement | Each agent is its own implicit account, named by its key, rather than a sub-account under one parent, so an outside agent can join without anyone creating an account for it. The winner settles in USDC on NEAR under an Accord agreement, not through NEAR Intents (quotes only, [Related NEAR tools](tracks.md#related-near-tools)) |

Not claimed: `realworld` and `social`. Their extra requirements (an invoice view paid through 1Click, a Sputnik DAO as the buyer) are not built.

## Related NEAR tools

| Tool | How Accord relates |
| --- | --- |
| NEAR AI Cloud | Used: private inference for both negotiators, with attestations fetched with a fresh nonce |
| OutLayer | Used: Intel TDX enclaves for the Sealed Table, Payee and the observer; outputs signed with seed-derived keys and checked on chain |
| HOT Connect | Used: wallet sign-in in the app (Meteor, Intear, Ledger, Nightly, WalletConnect) |
| NEAR Intents Agent API | Not used. It gives one owner a policy-bound wallet for an agent (limits, allowlist, timelocks, approval, freeze). Accord is the policy two companies negotiated and both approved, enforced on an account neither can drain alone, with payments gated by evidence. The two could meet: an agreement's recipient and caps could be exported into such a policy (not built) |
| NEAR Intents 1Click | Used, quote only: what funding an agreement's total from USDC on Base, Ethereum, Arbitrum or Solana would cost, as `dry: true` quotes (nothing signed or sent). `accord fund-quote --agreement a6.accord-v2.testnet`, `GET /app/api/fund-quote/<agreement>` and the room's "Fund from another chain" panel. 1Click has no testnet, so for a testnet agreement it is a mainnet price |
| Agent Market | Not integrated: mainnet-only, with payments held in its own ledger and no outside escrow hook |
| Sputnik DAO, Trezu | Not integrated. A DAO as the buyer (proposals to create, fund and approve) was designed and not built; Trezu is mainnet-only |
| Chain Signatures | Not used: settlement is USDC on NEAR from the agreement's own account |
