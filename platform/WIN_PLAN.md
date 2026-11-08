# WIN_PLAN.md: what wins, and the levers after the core is green

This file is strategy. `GOAL.md` is the contract for what ships; nothing here may contradict it. The levers below start only after `PROGRESS.md` gate G2 (the three proofs print live on testnet) and are taken in order unless a lever is blocked.

## How the entry is judged

- Screening first: Claude Code and Codex run a reproducibility check, verify features against the README, write a structured report and give a preliminary score (HACKATHON.md Q-017). They read the README and run it. The human jury decides; a low AI score alone cannot reject.
- The site's FAQ says previous NEAR hackathons evaluated technical implementation, design, impact, originality and sustainability. No rubric weights are published, and nothing says whether one project can win a track prize and the grand prize together.
- The organisers' track prompts (github.com/nearai/near-hackathon-prompt-examples) say: swap the starter idea for your own, keep the requirements and the checkpoint. So each selected track's requirements are treated as acceptance criteria; the matrix in `GOAL.md` ("Track requirements") maps each one to a feature and a do-X-see-Y step.

## What the screeners need, in order

1. A README whose numbered steps run on a fresh clone without our keys. `GOAL.md` defines three paths: `make verify` (read-only checks against the live testnet agreements, no account needed), `make sandbox` (the full flow on a local NEAR sandbox with the jobs mocked and labelled mocked), and `make demo` (the full loop on testnet with faucet accounts and the hosted Sealed Table, under two minutes).
2. Each "see" line quotes the literal output, including the failure cases.
3. A claims table where every guarantee has its limit next to it, so a careful reader finds nothing overstated.
4. Every NEAR feature the README names is exercised by a step a screener can run.

## The five criteria, and where each is earned

| Criterion | Where Accord earns it | Evidence a judge can open |
| --- | --- | --- |
| Technical implementation | Agreement-as-account with an immutable code hash and no full-access key; a function-call key scoped to one method on one account; refusals recorded without panicking; a payment lock across the NEP-141 callback; TEE negotiation with commitments checked before and after; property tests on the invariants | `contracts/agreement/src/lib.rs`, `tests/invariants.rs`, `make verify`, the explorer view of the agreement account's keys |
| Design | Four states with evidence at each; the deal room shows what each party can and cannot see; one red colour for refusals only; the Verified panel lists what was checked | The hosted app, `/verify`, `/try` |
| Impact | Vendor payments and agent-run procurement are where business email compromise money is lost; agents make it worse; Accord bounds the worst case to an approved payment to the authorised recipient | `REFERENCES.md`, the README problem section, the open inbox counters (`attempts`, `money moved: 0`) |
| Originality | The policy the agent runs under is negotiated privately by both companies and approved by both, instead of being set by one owner; evidence conditions (accepted delivery, passing observations) gate each payment | The Sealed Table and the market-making deal type |
| Sustainability | An SDK, an MCP server and a CLI so any agent can use an agreement; per-agreement pricing hypotheses that never take a share of payments; Accord Atlas as a first market with a buyer who pays today | `packages/`, the README "Business model (hypothesis)" section |

## Positioning against what the organisers already link

The NEAR Intents Agent API (linked in five of the seven prompts we read) gives an agent a policy-bound wallet with limits, a destination allowlist, timelocks, owner approval and freeze, set by one owner. Accord is not a wallet policy. It is the agreement both companies negotiated and approved, enforced on an account neither can drain alone, with payments gated by evidence. Say that plainly and without dismissal in the README's "Related NEAR tools" table; where the two meet, lever 8 connects them.

## The core is not a lever

These are in `GOAL.md` and `PROGRESS.md`, not here: the three proofs, the Accord Atlas gate on 6 Nov, `make demo` under two minutes, the MCP server, the recipient check with allow, warn and block in the SDK wrapper, the Verified panel, the public ledger with receipts and CSV export, `/try`, `/verify`, `/join`, and the three judge paths.

## Levers, in priority order

| # | Lever | Why it moves the result | Acceptance (done or not) | Track it unlocks | Who |
| --- | --- | --- | --- | --- | --- |
| 1 | Other teams' agents in our rooms | Evidence of use nobody asked for changes the question from "does it work" to "is it used" | `/join` live; at least one agreement whose counterparty agent we did not build, linked from `/record` with the counterparty's permission | none (raises all) | Agent builds; Adi recruits in week one on the NEAR Discord |
| 2 | Customer validation | One treasury or market maker saying the structure is useful answers the question the references cannot | A written statement quoted with permission on `/atlas` and in the README, or nothing; never implied | none (impact) | Adi |
| 3 | A Sputnik DAO as the buyer | The social prompt: use the existing DAO for custody and approvals, add tiers on top. Accord gives tiers for free: payments inside the terms need no vote, an exception needs one council approval, new terms need a full proposal | A DAO from `sputnikv2.testnet` (not the legacy `sputnik-v2.testnet`; about `6 NEAR` to create; the proposal bond must equal the policy's bond exactly) creates the agreement, funds it and approves its terms through passed `FunctionCall` proposals (funding is `ft_transfer_call` on the token at `150 TGas` with `1 yocto`, because the `Transfer` kind with a message gets only `10 TGas` on testnet), and revokes the agent through one; `act_proposal` always sends the stored `proposal` kind; Sputnik votes per proposal kind, so the one-approver tier for exceptions is a separate role with its own threshold; the deal room shows each proposal id; `make dao` runs it. Trezu runs these same DAOs but is mainnet-only, so the README says so and claims no Trezu integration | `social` | Agent |
| 4 | Gasless vendor and accountant export | The realworld prompt: the vendor never holds NEAR; status a bookkeeper trusts; CSV an accountant opens without questions | A NEP-366 relayer that pays only for delegate actions whose receiver is an Accord agreement or the factory (a test proves it refuses any other receiver); a vendor account with `0` NEAR seals its mandate (no deposit), approves terms and submits delivery, and an authority with `0` NEAR approves the recipient; `/record.csv` with date, agreement, item, amount, recipient, status, transaction link; the invoice view `/agreements/<id>/invoice` (amount, due dates, line items, a Fund button); a README section written for a bookkeeper (what paid, pending and refunded mean, how to read the CSV) | `realworld` (with the 1Click requirement stated as not met on testnet; lever 9 adds the dry quote) | Agent |
| 5 | Sealed tender | The swarms prompt: sealed bids, a coordinator, a sub-account per agent, a simulation with no LLM calls. Accord's Sealed Table already seals mandates; a tender seals bids and reveals only the winner | `RULES.md` written before code; one buyer pool against five vendor agents, each on its own sub-account; bids encrypted to the Sealed Table; winner and clearing price out, losing bids never revealed; `make swarm` runs 20 buyers by 5 sellers with scripted strategies and no LLM calls; `/tender` shows rounds, sealed bid hashes, clearing price and allocations | `swarms` | Agent, only if levers 3 and 4 are done or blocked |
| 6 | Accord Atlas attribution | The core already observes Rhea's DCL pool on chain; DCL positions are per account, so the same block can show how much of the in-band liquidity is the market maker's own. That answers the question venue-level data cannot | The observer also reads `list_liquidities{account_id}` for the market maker's declared accounts at the observation's block, sums the liquidity of positions overlapping the band, and records it; a new claim row (with its limit: declared accounts only) is added to `GOAL.md` only after it runs live; the scope line changes only then | none (Atlas depth; attribution alone does not meet the defi prompt) | Agent, after gate G-Atlas |
| 7 | Agent Market | The agents prompt asks how jobs are posted and paid programmatically, and says to report it if there is no public way | Checked on 31 Oct: Agent Market is mainnet-only, holds payments in its own custodial ledger, exposes buyer actions (create, award, accept) only through its web app and MCP server, and has no hook for an outside escrow. So: a README paragraph stating this with the sources, and no code. Revisit only if a public escrow hook appears | none (answers the agents prompt's checkpoint) | Agent writes the paragraph |
| 8 | Agent API bridge | Connects the negotiated terms to the wallet policy the organisers promote | With a demo key, an agreement exports its authorised recipient and per-period cap into an Agent API wallet policy; documented as a bridge, never as Accord's enforcement | none (agents, security depth) | Agent, only if time remains |
| 9 | 1Click quotes, pay-in and payout | The business and realworld prompts lean on NEAR Intents, which has no testnet (Q-007); the organisers' answer is `dry: true` quotes | The invoice view shows a `dry: true` quote from `POST https://1click.chaindefuser.com/v0/quote` for paying the invoice in from another asset, and the recipient panel shows one for a vendor who wants to receive on another chain (asset ids from `GET /v0/tokens`; no JWT needed for a dry quote, which carries a `0.25%` fee note); neither ever executes, and both say so | `realworld` (with lever 4) | Agent, last |

Not on this list, on purpose: any mainnet signing, a token, a marketplace, a second settlement rail in the core, a track added without a step that proves it.

## Week-one asks for Adi (they compound)

- Post in the NEAR Discord on 2 Nov asking two teams to be counterparties (lever 1). Offer them the MCP server and `/join`.
- Write to one token treasury and one market maker you know about the Accord Atlas structure (lever 2).
- Join NEAR Builders (https://nearbuilders.org/join) for the `$10` NEAR AI credit (Q-000) and top up for rehearsals.
