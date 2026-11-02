# Accord

The private deal room and control plane for agent-to-agent commerce.

Two companies' agents negotiate inside attested enclaves from sealed mandates, both companies approve the signed terms, and those terms then govern what the buyer's agent may pay. Each agreement is its own NEAR account holding the USDC escrow; the agent's only credential is a function-call key on that account that can call one method, `act`, which refuses any payment that differs from the approved item, evidence, amount or recipient. Accord Atlas, the first application, applies the same agreement to market making: a period's retainer becomes payable only when hidden-time observations of the venue pass the agreed spread, depth and two-sided quoting.

Agreements negotiated in private, enforced in public.

## The problem

Whose server do your agents meet on? Companies already let software negotiate for them when only one side has an agent: Walmart's negotiation bot ran against 2,000 suppliers at once and closed in days what used to take weeks ([Fox Business, 2023](https://foxbusiness.com/technology/walmart-using-ai-negotiate-cost-purchase-terms-vendors-shorter-timeframe)). When both sides have agents, each needs its limits to stay private while the outcome stays binding, and the money step is where it breaks today: business email compromise alone cost $3.05 billion across 24,768 complaints in 2025 ([FBI IC3 2025 report](https://www.ic3.gov/AnnualReport/Reports/2025_IC3Report.pdf)). Agents read their instructions from the same inbox an attacker can write to, and in May 2026 a reply on X became a transfer from an agent-linked wallet ([Cointelegraph](https://cointelegraph.com/magazine/grok-bankr-wallet-free-nft-prompt-injection)). Accord puts the negotiation in an enclave and the payment rules in a contract, so a fooled agent can ask but cannot pay outside the terms.

## Try it

Three ways, cheapest first. None needs our keys.

1. **Read-only check of a live agreement** (about a minute, no account): `make verify DEAL=<live agreement>`. Testnet agreements follow the first release; see "Status" below.
2. **Full flow on a local NEAR sandbox** (no network; the enclave jobs are replaced by a mock signer and every mocked line says `[mock]`): `make sandbox`
3. **Full live loop on testnet** (faucet accounts, under two minutes): `make demo`, after the first release.

`make sandbox`, from a real run on 3 Nov 2026:

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

To run the deal-room app against a local sandbox with one agreement in each state: `make serve`, then `ACCORD_NETWORK=sandbox pnpm --filter @accord/app dev` and open http://localhost:3100.

The live flow on testnet (`make negotiate`, `make approve`, `make fund`, `make payee`, `make pay`, `make attack`, `make revoke`, `make claim`, `make exception`, `make atlas`) runs after the first release; each step's printed block is defined in `INTERFACES.md` section 10 and is pasted here from the first real run.

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
| Each company's mandate is readable only inside attested enclaves | The browser encrypts the mandate to a key derived from a seed generated inside the Sealed Table's enclave, bound to its release build and readable only by runs an agreement requests or that publish the key's public half; the chain holds the ciphertext and a commitment hash; the two negotiators run on NEAR AI Cloud models in TEEs, and the gateway's and the model's attestations are verified with a fresh nonce | Under the hardware's trust assumptions (Intel TDX, NVIDIA confidential computing) and OutLayer's keystore governance. The deployer owns the seed and the factory account, and could rebind the seed to another build or request extra runs. Prompts reach the model through NEAR AI's attested gateway over TLS (TLS binding is not checked from inside the job), unless end-to-end encryption to the model shipped (2.3b). The browser trusts the code the app serves; the CLI is the alternative. The ciphertext stays on chain. The final terms reveal that each side accepted them, as any signed deal does. A negotiator can concede in words; code checks the numbers |
| The approved terms are the agent's only authority | The agent's only key is a function-call key on the agreement's own account that can call `act` and nothing else; `act` refuses any payment whose item, evidence, amount or recipient differs from the terms both companies approved | The agent's judgement is bounded, not protected: it can still be fooled into asking. Attestation proves which code produced the terms, not that the deal was good; people decide that when they approve |
| Payments go only to the authorised recipient | The recipient is a NEAR account listed in a file on the vendor's domain, fetched inside an enclave; the vendor's settlement authority approves it on chain and the buyer accepts it; a change needs all three again and a 24-hour delay | Authorisation proves control of the domain and the authority's approval, not that the company legally exists. A legal KYB check is a later integration |
| Revoking ends the agent's authority in one transaction | `revoke_agent` marks the agent's key revoked, so the contract refuses it from that receipt on, and deletes it from the agreement account in the same transaction; the account has no other key, so after the deletion lands (about one block) anything the agent signs is rejected by the network before it reaches the contract | A payment already made stays made, and it went to the authorised recipient at the approved amount. A call that reached the chain before the revoke still runs, with every check. Revoking never cancels what the vendor has earned: an eligible payment stays claimable by the vendor |
| Negotiation is private; settlement is public | Mandates and the transcript stay inside enclaves; only the terms, commitment hashes, a transcript hash and attestation references leave; the commercial terms document is encrypted to the two parties | The enforced schedule (amounts, dates, recipient) and every payment are public on NEAR, as with any stablecoin payment |
| An Accord Atlas payment becomes eligible only when the agreed observations pass, unless the buyer approves an exception | Each slot's time is drawn inside the observer's enclave from a seed generated there; the observation is taken at the first NEAR mainnet block after that time, signed by the observer's key, and checked by the contract against the agreed spread, depth and two-sided quoting; anyone can recompute it from an archival node | Atlas measures the venue's liquidity, not the market maker's own orders. The deployer owns the observer's seed and could rebind it to a build that reveals slot times in advance. A slot nobody polls in time counts as unobserved, and a period that unobserved slots leave undecided, or that has conflicting observations, goes to the buyer, not to payment |

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

The full design is in `ARCHITECTURE.md`; every method, event and printed line is in `INTERFACES.md`.

```
crates/accord-core      pure rules: types, the six gates, limit checks, Atlas slot times and rule, JCS
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

Built and tested: the contracts (30 unit tests on the mocked chain, 8 sandbox tests on a real local node, `make sandbox`), the SDK, CLI and MCP server, the app, the agent, the keeper, and the enclave jobs. The first testnet release waits on the OutLayer setup (`BLOCKED.md`); until then the live targets print `not implemented`.

## Business model (hypothesis)

Never a percentage of payments. Free to build on and to verify. Buyers pay per agreement; vendors pay per recipient authorisation.

## Built during NEAR HACKATHON

This repository started on 31 Oct 2026, inside the window. Libraries: near-sdk 5.30, near-contract-standards 5.30, near-workspaces 0.24, near-api-js 7.3.1, eciesjs, canonicalize, @noble, Next.js 16, NEAR Connect, the MCP TypeScript SDK. No template. Licence: MIT.
