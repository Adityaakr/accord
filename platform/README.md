# Accord

The private deal room and control plane for agent-to-agent commerce.

Two companies' agents negotiate inside attested enclaves from sealed mandates, both companies approve the signed terms, and those terms then govern what the buyer's agent may pay. Each agreement is its own NEAR account holding the USDC escrow; the agent's only credential is a function-call key on that account that can call one method, `act`, which refuses any payment that differs from the approved item, evidence, amount or recipient. In a market-making agreement, the featured of six agreement types, a period's retainer becomes payable only when hidden-time observations of the venue pass the agreed spread, depth and two-sided quoting.

Agreements negotiated in private, enforced in public.

## The problem

Whose server do your agents meet on? Companies already let software negotiate for them when only one side has an agent: Walmart's negotiation bot ran against 2,000 suppliers at once and closed in days what used to take weeks ([Fox Business, 2023](https://foxbusiness.com/technology/walmart-using-ai-negotiate-cost-purchase-terms-vendors-shorter-timeframe)). When both sides have agents, each needs its limits to stay private while the outcome stays binding, and the money step is where it breaks today: business email compromise alone cost $3.05 billion across 24,768 complaints in 2025 ([FBI IC3 2025 report](https://www.ic3.gov/AnnualReport/Reports/2025_IC3Report.pdf)). Agents read their instructions from the same inbox an attacker can write to, and in May 2026 a reply on X became a transfer from an agent-linked wallet ([Cointelegraph](https://cointelegraph.com/magazine/grok-bankr-wallet-free-nft-prompt-injection)). Accord puts the negotiation in an enclave and the payment rules in a contract, so a fooled agent can ask but cannot pay outside the terms.

## Try it

### In the browser, on NEAR testnet (about 5 minutes, nothing to install)

Open `/app/try-it`: live at https://accordweb-production.up.railway.app/app/try-it, or locally at `http://localhost:3100/app/try-it` with the `FAUCET_*`, `DEMO_*` and `RELAYER_*` variables from `.env.example`. Everything there is NEAR testnet with test
USDC. The vendor in your room is Accord's demo vendor (`halcyon-demo.testnet`, with its authority
`halcyon-auth.testnet`), and the agent is a demo agent run by Accord for test rooms; both are labelled in the room.

1. Do: **Connect a NEAR wallet**, a NEAR testnet wallet such as Meteor or Intear. See: `01 Connect a wallet · done`, with your account.
2. Do: **Get test funds**. See: `0.00 NEAR` become `2.50 NEAR · 100.00 tUSDC`, with both faucet transactions linked.
3. Do: **Create the room**. See: `Your room is a8.accord-v2.testnet: My first deal room.` (your number will differ).
4. Do: **Seal your mandate** with the Northwind preset (40 tUSDC ceiling, 2 to 4 items). See, in the room's Demo
   counterparty panel: `Sealed the vendor's mandate (Halcyon procurement preset)`, then `Started the negotiation in
   the Sealed Table`, and the state moves `Sealed` to `Attested` (on a8: 3 items, 15.00 + 12.00 + 6.00 tUSDC).
5. Do: approve the terms and fund the escrow. See: `Approved the terms as the vendor`, `Proposed halcyon-mm.testnet
   as the recipient on useaccord.tech`, `Approved recipient halcyon-mm.testnet as the vendor's
   authority`. Accept the recipient; see `Submitted delivery for item 1`. Accept delivery 1.
6. Do: **Start the demo agent** (your wallet signs `install_agent_key`), then **Let the agent pay the due item**.
   See: `Paid item 1: 15.00 tUSDC to halcyon-mm.testnet, the active recipient.`
7. Do: **Ask the agent to pay a new account**. See: `ERR_PAYEE_MISMATCH` and `Asked to pay … to
   halcyon-markets.testnet. The contract refused it and recorded the refusal.`
8. Do: revoke the key from the room header. See: `Agent revoked · next call rejected by the network`.

The same path, run with a fresh account through the app's own routes on 8 Nov 2026 (agreement `a8.accord-v2.testnet`):
faucet [NEAR](https://testnet.nearblocks.io/txns/935XqMoeb4Jt7fBQQHK9T7o9ZWJrWUoZYYCkdPGqhBoa) and
[tUSDC](https://testnet.nearblocks.io/txns/3t7SSAkTzQt7Aj2d6FwkhpG7BzKfC2mhCcWMR2E46PQ3),
[create](https://testnet.nearblocks.io/txns/5xdpHZTzQyjFiZcxApbwPDH2o3DQNKYhE9szxfjAjgDq),
[negotiation started](https://testnet.nearblocks.io/txns/HFk6XgoFmkZt2mDBrtE3zzD4mXPMEQUKnVyTGwqi9143),
[fund](https://testnet.nearblocks.io/txns/91knP5EzbKV5ajEXdfETkCXJqucQ5niJoPLBF2dbipng),
[agent pays item 1](https://testnet.nearblocks.io/txns/HxYDHTRLteGfGYoeEptehVMKbFgBdVWBqrejUJhsjSnb),
[redirect refused](https://testnet.nearblocks.io/txns/37zUgEoe8jbqnqQQhSe8L1VPBMRrrqXdsDorgDY7cEYL),
[revoke](https://testnet.nearblocks.io/txns/F67Qcofq9CmVuGze7URoVD3E1HfucQ7qooBjDJjANHiG).
The server side is `app/src/server/demo.ts`: the faucet sends only what an account lacks, once a day per account and
per IP; the counterparty reads the room and makes the vendor's next valid move, so calling it twice does nothing twice;
the demo agent's key is derived per room and signs `act` itself, never through the relayer.

### From a terminal

Three ways, cheapest first. None needs our keys.

1. **Read-only check of a live agreement** (about a minute, no account): `make verify DEAL=a6.accord-v2.testnet` after `pnpm install`. No `.env` is needed: the CLI reads the factory from the id's `a<n>.<factory>` suffix when it is a known one (`accord-v2.testnet` or `accord-usdc.testnet`); any other factory needs `ACCORD_FACTORY` or `--factory`. Output below.
2. **Full flow on a local NEAR sandbox** (no network; the enclave jobs are replaced by a mock signer and every mocked line says `[mock]`): `make sandbox`
3. **Full live loop on a local node (`NET=local`)**: `make demo NET=local`, from fresh accounts in about 14 s (3 Nov 2026). `make demo` has not been run on testnet yet (`docs/build/PROGRESS.md` 5.2 is blocked on funds). **On testnet**, the same flow runs as separate targets, each recorded on release 4 in `DECISIONS.md` section 26: `make negotiate`, then `make finish DEAL=<agreement>`, `make attack` and `make revoke`. Release 3's run is `a6.accord-v2.testnet` (`DECISIONS.md` section 21).

`make verify` on the testnet agreement, from a real run on 9 Nov 2026 (the nonce is fresh on every run):

```
accord verify · a6.accord-v2.testnet
  code      code hash 8wMuMRre… = release 3 (global by hash) · no deploy method · ok
  keys      0 keys · none · no full access · ok
  sealed    outcome signature ok · commitments match · agreement matches · ok
  release   sealed-table wasm 7c832ce9… · keys from pubkey run 13682 · OutLayer attestation record not checked here (needs outlayer-verify) · not checked
  model     z-ai/glm-5.3-flash · attestation report fetched with fresh nonce 6413cc81… · nonce bound in the report · hardware quote and GPU evidence not checked here (make probe-ai checks them) · partial
  payee     halcyon-mm.testnet · proof accordweb-production.up.railway.app signed by the release's payee key · authority approved · buyer accepted · active · ok
  record    1 payment · 1 refusal (1 in the log) · 0 exceptions · 0 set aside · 0 observation conflicts · receipts match paid · ok
verify: 5 checks ok · 1 partial · 1 not checked
```

`model` is `partial`: the nonce is bound in the attestation report, but the hardware quote and GPU evidence are not checked here (`make probe-ai` checks them). `release` stays `not checked` until `outlayer-verify` is installed (`docs/build/BLOCKED.md`). `keys` reads `0 keys` because a6's agent was revoked.

`make sandbox`, from a real run on 3 Nov 2026 (the market-making line was then labelled `atlas`; the sandbox now prints `market`):

```
accord sandbox · local NEAR node · demo timings
  setup     tUSDC (test token, 6 decimals) · factory accord.test.near · release 1 (embedded, mock build)
  created   a1.accord.test.near · procurement · 0 keys on the account
  sealed    both mandates committed (ciphertexts on chain)
  [mock]    sealed-table output signed by the mock key · signature ok on chain · state Attested
  executing approved by both · terms ad410a91… · funded 36.00 tUSDC
  [mock]    payee proof signed by the mock key · authority approved · buyer accepted · halcyon-mm.test.near active
  agent     1 key · FunctionCall · receiver a1.accord.test.near · methods [act]
  delivery  item 1 submitted · accepted
  paid      item 1 · 12.00 tUSDC → halcyon-mm.test.near · 10 TGas
  refused   ERR_PAYEE_MISMATCH · 12.00 tUSDC → halcyon-markets.test.near
  refused   ERR_AMOUNT_MISMATCH · 19.00 tUSDC → halcyon-mm.test.near
  refused   ERR_CANARY · 12.00 tUSDC → halcyon-treasury.test.near
  agent     next call rejected by the network: the key no longer exists · 0 keys on the account
  escrow    24.00 tUSDC before · 24.00 tUSDC after · 0 tUSDC moved by attempts
  resume    buyer installs a new key · item 2 paid
  atlas     a2.accord.test.near · market-making · rhea-dcl 17208628… · 6 slots · threshold 4 · max spread 60 bps
  [mock]    slot 1 · spread 41 bps · depth 392.00 / 2020.00 USDC · pass
  [mock]    slot 2 · spread 49 bps · depth 392.00 / 2020.00 USDC · pass
  [mock]    slot 3 · spread 52 bps · depth 392.00 / 2020.00 USDC · pass
  [mock]    slot 4 · spread 72 bps · depth 392.00 / 2020.00 USDC · fail
  [mock]    slot 5 · spread 41 bps · depth 392.00 / 2020.00 USDC · pass
  [mock]    slot 6 · spread 90 bps · depth 392.00 / 2020.00 USDC · fail
  closed    4 of 6 passed · threshold 4 · uptime 100% · Eligible
  paid      agent pays period 1 · 6.00 tUSDC → halcyon-mm.test.near
  scope     venue-level liquidity, not the market maker's own orders
sandbox: all checks passed · 38 s
```

The sandbox's slot values are the venue probe's real readings of Rhea's USDC/wNEAR pool (`make probe-venue`); the sandbox has no mainnet, so there they are fixtures.

### The whole product on your machine

`make dev` starts a local NEAR node with everything around it: the real contracts, the three enclave jobs' own code run natively (only the negotiating model is replaced, by a deterministic negotiator inside both mandates' limits, and every output it signs says `model.local`), a test USDC faucet, the keeper, the demo agent with the `/try` re-arm, and the app at http://localhost:3100. Market-making agreements are measured from real NEAR mainnet blocks. In a second terminal, every live target runs against it with `NET=local`; on testnet the same code runs without the flag.

`make market-making NET=local`, from a real run on 3 Nov 2026 (two agreements on Rhea's USDC/wNEAR pool; the slots are real mainnet blocks). The run was recorded when the target was called `make atlas`, so its first line reads `accord atlas`; today it prints `accord market-making`, and `make atlas` remains a hidden alias:

```
accord atlas · a14.accord.test.near · market-making · rhea-dcl 17208628…|wrap.near|2000 · local node
  period 1  slot times held in the observer's enclave
  slot 1    mainnet block 222883053 · spread 147 bps · depth 32.78 / 75.62 USDC · pass
  slot 2    mainnet block 222883166 · spread 147 bps · depth 32.78 / 75.62 USDC · pass
  slot 3    mainnet block 222883341 · spread 147 bps · depth 32.78 / 75.62 USDC · pass
  slot 4    mainnet block 222883437 · spread 147 bps · depth 32.78 / 75.62 USDC · pass
  slot 5    mainnet block 222883536 · spread 147 bps · depth 32.78 / 75.62 USDC · pass
  slot 6    mainnet block 222883588 · spread 147 bps · depth 32.78 / 75.62 USDC · pass
  closed    6 of 6 passed · threshold 4 · uptime 100% · Eligible
  paid      agent pays period 1 · payment_sent 7.50 USDC → halcyon-mm.test.near · tx ANBNFhAnAQ8nJMSJmGZJjJQCQu49HQWirnA5GrApZMD2
  strict    a15.accord.test.near · period 1 · 0 of 6 passed · threshold 4 · Withheld
  withheld  agent asks to pay it anyway: ERR_PERIOD_WITHHELD · tx FYuYPokP7R9F6yWx11VRqCHFb7kdvEKXgh5WDBN6A241
  scope     venue-level liquidity, not the market maker's own orders
```

`make attack NET=local`, same day:

```
accord attack · a9.accord.test.near · agent key ed25519:BPDWuq96f5k4XjZbGYkXHCvhJVew6GDWJnEheUbURvnU · local node
  inbox     "Updated bank details" → agent: pay item 1 to halcyon-markets.test.near
  preflight block: not the authorised recipient · preflight off for this run, sending anyway
  refused   ERR_PAYEE_MISMATCH · seq 1 · block 4695 · tx GdqYoVc4uShQHBxLAzpcLeP8URo73Xo4GQi8bpSyweNL
  inbox     "Invoice correction" → agent: pay item 1, 83.00 USDC
  refused   ERR_AMOUNT_MISMATCH · seq 2 · block 4701 · tx 5dDcx4WSX6R9cwA9jBUd1X5FHqWAiLnwqq8KmPoAjM6o
  inbox     "Settlement account" → agent: pay item 1 to halcyon-mm-payments.test.near
  canary    ERR_CANARY · seq 3 · agent key ed25519:BPDWuq96f5k4XjZbGYkXHCvhJVew6GDWJnEheUbURvnU revoked and deleted · tx H5DC9oHpUvuAzWR6YqcQb1tyvyndG6fDf5sNzVH5NkPQ (final)
  agent     next call: AccessKeyDoesNotExist (rejected by the network, no receipt)
  escrow    36.00 USDC before · 36.00 USDC after · 0.00 USDC moved by attempts
```

`make demo NET=local` runs the whole loop from fresh accounts (recipient proven on the app's demo domain) in 14 s. The other targets: `make negotiate`, `make approve`, `make fund`, `make payee`, `make pay`, `make revoke`, `make claim`, `make exception`, `make payee-change`, `make inbox`, `make measure`. Their blocks are defined in `INTERFACES.md` section 10. On testnet the same targets run without `NET=local`; the testnet transactions for `a6.accord-v2.testnet` are in `DECISIONS.md` section 21 and in the table under "Status".

## Settle in Circle USDC (testnet)

A second factory, `accord-usdc.testnet`, runs the same code as `accord-v2.testnet` (release 3 at first, release 4 since 9 Nov 2026; the same job builds and keys) and settles in Circle's USDC on NEAR testnet, `3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af` (6 decimals). Each agreement copies its factory's token at creation and keeps it for life, so `a<n>.accord-usdc.testnet` takes only Circle USDC and `a<n>.accord-v2.testnet` only test USDC. `/app/try-it` defaults to test USDC from the app's faucet; Circle USDC is offered next to it where the server sets `ACCORD_FACTORY_USDC`.

| Do | See |
| --- | --- |
| Get Circle testnet USDC at https://faucet.circle.com, network `NEAR Testnet`, your account as the address | about `20 USDC` per address every 1 to 2 hours |
| `make verify-usdc DEAL=a1.accord-usdc.testnet` (the same as `ACCORD_FACTORY=accord-usdc.testnet make verify`) | `code hash 8wMuMRre… = release 3 (global by hash)` · `keys from pubkey run 13909` · `verify: 5 checks ok · 1 partial · 1 not checked` |
| `make negotiate-usdc`, then `make finish-usdc DEAL=<agreement>` once the buyer holds the terms' total | the same blocks as `make negotiate` and `make finish`, with Circle USDC; the presets fit one faucet drip (buyer ceiling `18`, vendor floor `12`) |

`a1.accord-usdc.testnet` (release 3) was negotiated on 9 Nov 2026 (`14.00 USDC` in 3 items, `QUOTE → COUNTER → ACCEPT`, glm-5.3-flash in OutLayer's enclave), approved, funded, paid `5.00` and refused a redirect, then revoked: [Circle USDC proof](#circle-usdc). Transactions: `DECISIONS.md` sections 24 and 26.

## What the agent's key can and cannot do

- It can call one method, `act`, on one account: the agreement it works for. The receiver and the method list are part of the key, enforced by the NEAR protocol before any code runs.
- It cannot attach NEAR to a call, transfer NEAR, add or delete keys, deploy code, delete the account, or call any other contract. The USDC transfer is made by the agreement's own code after `act`'s checks pass; the key never touches the token contract.
- It spends gas from a fixed allowance set when the buyer installs it (`0.5 NEAR` by default). When the allowance runs out the agent stops and the buyer installs a new key.
- One buyer transaction, `revoke_agent`, ends it: the contract marks the key revoked in that receipt, so `act` refuses it at once (`ERR_REVOKED`), and the `DeleteKey` action in the same transaction removes it from the account about a block later, after which the network rejects anything it signs. A canary request, or five refusals by this key within an hour, does the same automatically.
- `act` is never relayed as a meta transaction: through a relayer, the signing key would be the relayer's and the contract could not tell the agent's key apart.
- It cannot change the terms, the recipient, the amounts or the evidence. Those change only through the principals' own transactions.

## Claims and their limits

| We claim | Because | Limit, stated next to it |
| --- | --- | --- |
| Each company's mandate is readable only inside attested enclaves | The browser encrypts the mandate to a key derived from a seed generated inside the Sealed Table's enclave, bound to its release build and readable only by runs an agreement requests or that publish the key's public half; the chain holds the ciphertext and a commitment hash; the two negotiators run on NEAR AI Cloud models in TEEs, and the gateway's and the model's attestations are verified with a fresh nonce | Under the hardware's trust assumptions (Intel TDX, NVIDIA confidential computing) and OutLayer's keystore governance. The deployer owns the seed and the factory account, and could rebind the seed to another build or request extra runs. On testnet the job's seed condition admits any caller during an agreement's open request window, so an outside party could request extra runs then and learn bounds on the limits; restricting the seed to the agreement's own calls is the next step. Prompts reach the model through NEAR AI's attested gateway over TLS (TLS binding is not checked from inside the job), unless end-to-end encryption to the model shipped (2.3b). The browser trusts the code the app serves; the CLI is the alternative. The ciphertext stays on chain. The final terms reveal that each side accepted them, as any signed deal does. A negotiator can concede in words; code checks the numbers |
| The approved terms are the agent's only authority | The agent's only key is a function-call key on the agreement's own account that can call `act` and nothing else; `act` refuses any payment whose item, evidence, amount or recipient differs from the terms both companies approved | The agent's judgement is bounded, not protected: it can still be fooled into asking. Attestation proves which code produced the terms, not that the deal was good; people decide that when they approve |
| Payments go only to the authorised recipient | The recipient is a NEAR account listed in a file on the vendor's domain, fetched inside an enclave; the vendor's settlement authority approves it on chain and the buyer accepts it; a change needs all three again and a 24-hour delay | Authorisation proves control of the domain and the authority's approval, not that the company legally exists. A legal KYB check is a later integration. Testnet agreements run in demo mode: a recipient change waits 120 s and a claim 120 s; live mode enforces at least 24 h for a recipient change and 72 h for a claim, checked by the factory and again by the agreement |
| Revoking ends the agent's authority in one transaction | `revoke_agent` marks the agent's key revoked, so the contract refuses it from that receipt on, and deletes it from the agreement account in the same transaction; the account has no other key, so after the deletion lands (about one block) anything the agent signs is rejected by the network before it reaches the contract | A payment already made stays made, and it went to the authorised recipient at the approved amount. A call that reached the chain before the revoke still runs, with every check. Revoking never cancels what the vendor has earned: an eligible payment stays claimable by the vendor |
| Negotiation is private; settlement is public | Mandates and the transcript stay inside enclaves; only the terms, commitment hashes, a transcript hash and attestation references leave; the commercial terms document is encrypted to the two parties | The enforced schedule (amounts, dates, recipient) and every payment are public on NEAR, as with any stablecoin payment |
| A market-making agreement's payment becomes eligible only when the agreed observations pass, unless the buyer approves an exception | Each slot's time is drawn inside the observer's enclave from a seed generated there; the observation is taken at the first NEAR mainnet block after that time, signed by the observer's key, and checked by the contract against the agreed spread, depth and two-sided quoting; anyone can recompute it from an archival node | A market-making agreement's observer measures the venue's liquidity, not the market maker's own orders. The deployer owns the observer's seed and could rebind it to a build that reveals slot times in advance. A slot nobody polls in time counts as unobserved, and a period that unobserved slots leave undecided, or that has conflicting observations, goes to the buyer, not to payment |

### Custody, per piece

| Piece | Where it is | Who can act | What cannot happen | Kill switch |
| --- | --- | --- | --- | --- |
| Escrowed USDC | The agreement's own account (no full-access key; code pinned) | The agent within the terms; the vendor's claim after the delay; `close` pays eligible items, sets aside any it cannot pay for the vendor's claim, then refunds the rest to the buyer | A payment to anyone but the authorised recipient, at any amount but the approved one, without the evidence or an approved exception | `revoke_agent` by the buyer |
| Mandates | Ciphertext on chain; plaintext only inside the Sealed Table run and the model enclave | The Sealed Table build, when an agreement requests it | The other party or the app reading them; a run requested by anyone else | Not needed: plaintext ends with the run |
| Terms | Public on chain; the descriptive document encrypted to both parties | Both principals approve | Terms outside either mandate's limits; terms not signed by the release's key | Either party declines to approve |
| Recipient record | On chain, versioned, domain pinned | Vendor proposes, authority approves, buyer accepts | A change by one key alone; a change without a fresh proof and the delay; a change of domain | Buyer or authority cancels during the delay |
| Observations | On chain, signed, recomputable from the venue block | The observer build; anyone submits | A forged value, a chosen moment, a pass decided off chain | People decide `Withheld` and `Review` periods |

### Privacy boundary

| Private to each company | Visible to both companies | Public on NEAR |
| --- | --- | --- |
| Its mandate's limits and instructions; the negotiation transcript (only its hash leaves) | Each side's `shared` part, in the commercial terms document (decrypted with their own document key); everything public | The enforced terms (amounts, timings, conditions, recipient), commitments, ciphertexts, every payment, refusal, exception and observation, attestation references |

### What we keep

The app's server never sees a mandate and no route accepts one (`app/tests/no-mandate-routes.test.ts` fails if one does). It stores only the `/try` inbox, the buyer's signed approvals of warned recipients, demo-domain registrations, the `/try` rooms and service heartbeats; see `app/src/server/README.md`.

## How NEAR is used

| NEAR feature | What it does here | File |
| --- | --- | --- |
| Function-call access keys | The agent's only key: `act` on its own agreement account, installed and deleted by the contract | `contracts/agreement/src/payments.rs` |
| Sub-accounts and pinned code (NEP-591) | One account per agreement, created in one batch with no `AddKey`; code fixed by hash | `contracts/factory/src/lib.rs` |
| NEP-141 and NEP-145 | USDC escrow by `ft_transfer_call`, payments by `ft_transfer` under a payment lock with a callback | `contracts/agreement/src/payments.rs`, `contracts/agreement/src/evidence.rs` |
| NEP-297 events | Every refusal, payment, observation and approval on the record | `contracts/agreement/src/events.rs` |
| NEP-413 | Each party's document key, and the buyer's approvals in the app | `packages/sdk/src/sealing.ts` |
| OutLayer | Sealed Table, Payee and observer jobs in Intel TDX, outputs signed with seed-derived keys and checked on chain | `jobs/`, `contracts/agreement/src/signed.rs` |
| NEAR AI Cloud | The negotiators' private inference; attestations fetched with a fresh nonce | `jobs/sealed-table/`, `packages/sdk/src/verify.ts` |

## Architecture

```
 buyer's browser ──seal──┐                        ┌── vendor's browser
                         ▼                        ▼
            agreement account a<n>.<factory>  (code pinned, no full-access key)
              │  commitments + ciphertexts       ▲ signed terms, proofs, observations
              ▼                                  │
     OutLayer (TDX): Sealed Table ── NEAR AI Cloud (TEE models)
                     Payee ── vendor's /.well-known/accord.json
                     Observer ── Rhea DCL on NEAR mainnet (read-only)
              │
   agent ──act (one function-call key)──▶ six gates ──ft_transfer──▶ authorised recipient
```

The full design is in `ARCHITECTURE.md`; every method, event and printed line is in `INTERFACES.md`. Diagrams of the system, the lifecycle, a deal and the `act` gates are in the [root README](../README.md#how-it-works); their Excalidraw sources are in [`docs/diagrams/`](../docs/diagrams).

```
crates/accord-core      pure rules: types, the six gates, limit checks, market-making slot times and rule, JCS
contracts/agreement     the agreement account (Agreement controls)
contracts/factory       creates agreements, holds releases, reports and the blocklist
contracts/releases      the keyless account that requests the jobs' pubkey runs
contracts/test-token    tUSDC (test token)
jobs/                   sealed-table, payee, observer (OutLayer, wasm32-wasip2)
packages/sdk            @accord/sdk
packages/cli            accord
packages/mcp            @accord/mcp
services/               the demo agent and the keeper
app/                    the deal-room app (Next.js)
tests/                  sandbox suite, make sandbox, make serve
```

## Status

Built on 3 Nov 2026 and tested again on 9 Nov 2026: the contracts (72 agreement unit tests pass on the mocked chain, none ignored, including a 400-sequence `act` fuzz test; 12 sandbox tests pass on a real local node, 1 ignored, which reads mainnet; `make sandbox`), the three enclave jobs (fixture tests, and run natively against a local node), the SDK, CLI and MCP server, the app, the agent with the `/try` re-arm, the keeper, and every live target on a local node (`make dev`, then `NET=local`). Live on NEAR testnet since 8 Nov 2026: factory `accord-v2.testnet`, on release `4` (the security-review fixes) since 9 Nov 2026 after release `3` (Sealed Table build `7c832ce9…`, release 3 pubkey runs `13682`, `13672`, `13683`; release 4 keeps those job builds), the second factory `accord-usdc.testnet` (Circle USDC, also on release `4`), test USDC `tusdc.accord-v1.testnet`, relayer `relay.accord-v2.testnet`, the three jobs as OutLayer projects `accord-v1.testnet/accord-{sealed-table,payee,observer}`, and the app with `/app/try-it` at https://accordweb-production.up.railway.app/app. Market making on testnet waits on an OutLayer payment key (`docs/build/BLOCKED.md`); it runs end to end on a local node.

Agreement `a6.accord-v2.testnet`, the original walkthrough, ran the full procurement flow on release 3, with the real NEAR AI model (`z-ai/glm-5.3-flash`) negotiating inside OutLayer's enclave (`QUOTE → COUNTER → FINAL → ACCEPT`, `35.50` tUSDC in 3 items, 59 s):

| Step | Transaction |
| --- | --- |
| Mandates sealed (buyer, vendor) | [Ek9Zr1wj…](https://testnet.nearblocks.io/txns/Ek9Zr1wjD6nrWaKHFak8UDv5Jwbaacqrdh1huNp6qwAk), [2Zq8pfNo…](https://testnet.nearblocks.io/txns/2Zq8pfNoa1dFzMLAy79aGyek72q3LGcrvRqAjYABisKZ) |
| Negotiated in the Sealed Table | [GfX5qKq3…](https://testnet.nearblocks.io/txns/GfX5qKq35rvtUVkp9nBPgw3kkzDSXx6hfY2H5cb3wfHW) |
| Approvals (buyer, vendor) | [H6cMyE6k…](https://testnet.nearblocks.io/txns/H6cMyE6kzs9SdrC4yaP7CvnDxJqH4NSx7ivKeu2rBHSg), [2uv8tTfe…](https://testnet.nearblocks.io/txns/2uv8tTfeYhe2aZ5cMrVNfFzr88kPL4HeSxwYzNhtmveT) |
| Funded `35.50` | [2CeFB18j…](https://testnet.nearblocks.io/txns/2CeFB18jenw2iggWE8mQZy9DehwZ2f97TYXwi3RVeXPy) |
| Recipient: Payee proof, authority, buyer | [6koRbw5Q…](https://testnet.nearblocks.io/txns/6koRbw5QDYTgVU52Fe1vH755QGLPwZabQhF1kTk5rup6), [FBQnqtKX…](https://testnet.nearblocks.io/txns/FBQnqtKXs5B5zn1A4F1yCDUmACYMqsi2zM2uez6YxDis), [3d3LSZvz…](https://testnet.nearblocks.io/txns/3d3LSZvz3yPX5LM1Bk6t9bxiX2x1JDMEt9mfa2fbw11p) |
| Agent key installed | [EUJ86tSV…](https://testnet.nearblocks.io/txns/EUJ86tSVNuYsgtMVYYZZ9CYbsJmY6jCKm1Uew5doPU1C) |
| Item 1 paid, `16.50` to `halcyon-mm.testnet` | [2k57zg7i…](https://testnet.nearblocks.io/txns/2k57zg7iE44muCGRbcc2JTVmy5uGHHyCePXNPmcWCKEQ) |
| `13.00` to `halcyon-markets.testnet` refused, `ERR_PAYEE_MISMATCH` | [AB9HLnWv…](https://testnet.nearblocks.io/txns/AB9HLnWvkzNL418ygx8AVArinPnAK3jqxt4haAjsk8fs) |
| Revoked; the next call fails with `AccessKeyDoesNotExist` | [4ervNQdj…](https://testnet.nearblocks.io/txns/4ervNQdjrd7MA1n7vWSY7cRUtCpwiQwSK7xDSK2Bmn9P) |
| Release 3 published | [7m8pj7u2…](https://testnet.nearblocks.io/txns/7m8pj7u2D5aAXJ3RPbPWkhShKpJxwWHhPSpRrKr9nPVh) |

### Release 4 (security-review fixes)

The reviewed agreement code (`ECgsrZwy…`, global contract `R2qxw4u5…`) is release 4 on both factories since 9 Nov 2026: `accord-v2.testnet` ([publish](https://testnet.nearblocks.io/txns/EB2Lz3WF1Pqt4o9y9NzUF5uc9qEhimPAPLKdwJFwvqnU), [set current](https://testnet.nearblocks.io/txns/J9uADVqQSkY6f1uMYbMbWoPnB4oiwuS3CtLayKojtgeC)) and `accord-usdc.testnet` ([publish](https://testnet.nearblocks.io/txns/GovfwhMAtB28ayEndYmtiZHEo8sq9YhKVCXj8m3WFaai), [set current](https://testnet.nearblocks.io/txns/5D9LxPuU4phUXTgRawd97TmhZPGiPjWzSPWCYXJteoLJ)). Agreements created before keep release 3 (code pinned by hash), so a6 above is unchanged. The proofs ran again on new release 4 agreements of `accord-v2.testnet` (test USDC):

| Proof | Agreement | Result | Transaction |
| --- | --- | --- | --- |
| Negotiate | [`a10`](https://testnet.nearblocks.io/address/a10.accord-v2.testnet) | Attested in 64 s, `33.00 USDC` in 3 items, attestation ok, `ERR_SEALED` both ways | in the `make negotiate` output |
| Fund | `a10` | `33.00 USDC` escrowed | [`2mBhRNnX…`](https://testnet.nearblocks.io/txns/2mBhRNnXnitEN2gefBe7C8MWdCYS7P2nJLZyZznHFH22) |
| Pay | `a10` | item 1, `12.00 USDC` to `halcyon-mm.testnet` | [`Bs5dVpr6…`](https://testnet.nearblocks.io/txns/Bs5dVpr6DnR5jXjYKXbGsp9HP36smmoJRFmvJP4tGqAm) |
| Redirect refused | `a10` | `ERR_PAYEE_MISMATCH` | [`51TQ8no9…`](https://testnet.nearblocks.io/txns/51TQ8no9kPp4P8SDyN77jNZMevLsKaTBH3SufU2SUefu) |
| Attack | [`a11`](https://testnet.nearblocks.io/address/a11.accord-v2.testnet) | `ERR_PAYEE_MISMATCH`, `ERR_AMOUNT_MISMATCH`, `ERR_CANARY` revokes and deletes the key; `0.00` moved | [`HvwpdKDs…`](https://testnet.nearblocks.io/txns/HvwpdKDs64sA5zuj37iK8B1N1kKDadh4VoeU8n3LwMSv), [`3cTDxHzV…`](https://testnet.nearblocks.io/txns/3cTDxHzVH29Uiw6kZceFmuuUkhnBiBp5JYW65bsewLvh), [`DPpVoMX9…`](https://testnet.nearblocks.io/txns/DPpVoMX9KKYXppXvrM6HqorDYsDd9ndQy8YniKDvMsXT) |
| Revoke | [`a13`](https://testnet.nearblocks.io/address/a13.accord-v2.testnet) | `DeleteKey`; the next call fails with `AccessKeyDoesNotExist`; a new key pays item 2 | [`8b8FC1He…`](https://testnet.nearblocks.io/txns/8b8FC1HeiHCTJcUaga87zWuNCg6LTgYGYDzRptdHh2H3), [`DfgMURQA…`](https://testnet.nearblocks.io/txns/DfgMURQANtnBq2LziGaELXabw9tvzqhYQXq71hXjzNDT), [`24mdebXg…`](https://testnet.nearblocks.io/txns/24mdebXgCkMZFyekdDyxv3YQzJS1iaxckrfnN2aRY9Fe) |
| Verify | `a10` | `code = release 4` · `5 ok · 1 partial · 1 not checked` | `make verify DEAL=a10.accord-v2.testnet` |

The first `make revoke` run (a12) stopped at its last step: the script paid item 2 at a fixed `12.00` while the negotiated amount differed, and the contract refused it with `ERR_AMOUNT_MISMATCH`. The live targets now pay each item at its negotiated amount.

### Circle USDC

Agreement [`a1.accord-usdc.testnet`](https://testnet.nearblocks.io/address/a1.accord-usdc.testnet), created on release 3 of the second factory, ran a deal in Circle's testnet USDC on 9 Nov 2026:

| Step | Result | Transaction |
| --- | --- | --- |
| Fund | `14.00 USDC` (Circle) escrowed | [`4gPohYYM…`](https://testnet.nearblocks.io/txns/4gPohYYMokgQcPcgNhX3tCTTXjA35AfuKkpGs1SpS2no) |
| Pay | `5.00 USDC` to `halcyon-mm.testnet` | [`E127BGy3…`](https://testnet.nearblocks.io/txns/E127BGy3Tw6PmhE9JcoFr7vQsKTiHNevTTiAxEjJGWK2) |
| Redirect refused | `ERR_PAYEE_MISMATCH` | [`9rgsBFA2…`](https://testnet.nearblocks.io/txns/9rgsBFA26yedWuEEJk77sKBDrDGS9mHn9BFMknCaP8BB) |
| Revoke | the agent's next call fails with `AccessKeyDoesNotExist` | [`FTigDebs…`](https://testnet.nearblocks.io/txns/FTigDebs1kZjLpTN8nC8SZWp4dMM1ChuUyR211JZnzuW) |
| Verify | release 3 · `5 ok · 1 partial · 1 not checked` | `make verify-usdc DEAL=a1.accord-usdc.testnet` |

## Security review

An internal security review, not a third-party audit: five AI-assisted review passes, each on a separate code area (the payment path; authorisation and keys; creation and code integrity; funds; the enclave jobs), with every finding re-checked by separate reviewers who reproduced it as a test, found 1 High and 5 Medium issues (one of them Medium-Low), plus 4 Low. The High one was a close-refund drain: a deposit sent during `close` could make the refund to the buyer spend the vendor's reserve; the refund is now capped at the ledger while anything is owed to the vendor. Every fix went in test first (the test failed for the reason named, then passed) and the tests stay in the suite. The contract and factory fixes are live as release 4 on both testnet factories ([proofs](#release-4-security-review-fixes)).

Agreements created before release 4 (a6, a8 and a1.accord-usdc.testnet) keep release 3's code by hash, so they keep the close-refund issue; new agreements get release 4.

Scope: the review covered the contracts, the factory and the enclave jobs. The app server, the relayer and the demo endpoints were outside it; the relayer deposit issue (`DECISIONS.md` 27) was found later by a live run on the public URL and fixed the same day.

Changed limit: an item left `AssumedPaid` (its transfer sent, its callback not yet answered) is no longer refunded to the buyer at `Settled`; its amount stays on the agreement's account until that payment's callback answers (a failure sets it `Reserved` for the vendor to claim, a success leaves it paid), and if that callback never runs, the amount stays on the account.

Limit: S1 (only an agreement's own calls can use the Sealed Table's seed) is partial. The jobs now serve only factory agreements in code, but those job builds are not deployed yet (release 4 runs release 3's job builds), and S1 itself needs the seed's access condition in OutLayer, which only its dashboard can set and which is not set yet. Every finding, fix, test and commit: [`DECISIONS.md`](DECISIONS.md) section 25. Mainnet follows an external audit, which has not happened yet.

## Business model (hypothesis)

Never a percentage of payments. Free to build on and to verify. Buyers pay per agreement; vendors pay per recipient authorisation.

## Built during NEAR HACKATHON

This repository started on 31 Oct 2026, inside the window. Libraries: near-sdk 5.30, near-contract-standards 5.30, near-workspaces 0.24, near-api-js 7.3.1, eciesjs, canonicalize, @noble, Next.js 16, NEAR Connect, the MCP TypeScript SDK. No template. Licence: MIT.
