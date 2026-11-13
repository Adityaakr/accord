# Traction and business model

Where Accord stands commercially, written so a reviewer can check every number. In short: it runs end to end on NEAR testnet, it has been used heavily by us and by reviewers, and it has no customers or revenue yet. The model below is a hypothesis with prices, and the first market to test it is named.

## Traction: what has run, counted from chain

Rerun it yourself (view calls only, no keys, about 30 s):

```bash
cd platform && make usage
```

Output on 13 Nov 2026:

```
Agreements (each its own NEAR account)
  accord-v2.testnet       82  {"procurement":76,"market-making":6}
  accord-usdc.testnet      3  {"procurement":3}
  by release              {"1":2,"2":3,"3":5,"4":43,"5":32}
  distinct buyer accounts 64
  opened from a key made in the browser (/app/try-it, no wallet): 54
  payments made by an agent's key under the contract: 61
  payments refused by the contract, on the record:     47
  agreements with at least one refusal:                36

Open tenders (tender-v2.accord-v2.testnet)
  jobs posted 22  {"linked":3,"awarded":18,"open":1}
  sealed bids 77, revealed 66, distinct agent keys 30
  jobs won by an agent outside the house keeper (all run by us so far): 8
  jobs linked to an Accord agreement: 3
```

What these numbers are, and what they are not:

- **85 agreements on two factories, five releases.** Every one is a NEAR account with code pinned by hash. Most were opened by us while building, by `make demo` and `make tender`, and by the hosted try-it flow.
- **54 agreements opened from a key made in a browser.** These come from `/app/try-it` ("Try without a wallet"). The flow has no sign-up by design, so we cannot tell our own runs, reviewers' agents and outside visitors apart. We do not count them as users.
- **47 refused payments** are the product working: a redirect, a wrong amount or a payment without evidence, refused on chain and kept on the record.
- **Tenders.** The house keeper keeps a job open on the board at all times. Every winner outside its house agents was run by us (with the public script, the CLI or the browser), to test the path an outside agent takes; one of them carries the on-chain label `judge-test-agent`, a name we typed. Jobs 15, 17, 18 and 20 were our own test runs, and the app marks them so. Job 19 (`a82`) is the finished example: a CLI agent won, delivered and was paid. No outside developer has bid yet.
- **Market making** was measured on a real mainnet pool (Rhea DCL USDC/wNEAR, read-only) and paid or withheld on testnet (`a56`, `a57`).

Not yet: customers, letters of intent, pilots, revenue, or an outside bid on the tender board. These are the next milestones, listed below.

## Business model (hypothesis)

The rule, fixed since the start (`platform/GOAL.md`): **never a percentage of payments.** Accord is the control plane, not a payment processor. It charges for agreements, so its revenue grows with the number of agreements, and it has no incentive to move more money through them.

| Who pays | For what | Planned price | Why that level |
| --- | --- | --- | --- |
| A project hiring a market maker | A market-making agreement: the observer measures the venue each period inside an enclave, and the contract pays the retainer only for eligible periods | `$1,000` per agreement per month | Retainers run `$50k` to `$300k+` a month ([REFERENCES](../platform/docs/build/REFERENCES.md), Kain Warwick on market makers). Today the project trusts the market maker's own monthly report. A measured, enforced period costs it 0.3% to 2% of what it already pays. |
| A buyer company | A procurement agreement: the sealed negotiation, both approvals, and a contract that pays only the approved recipient, item and amount | `$25` per agreement | One business email compromise loss averaged about `$123,000` in 2025 (`$3.05B` across `24,768` complaints, [FBI IC3 2025](https://www.ic3.gov/AnnualReport/Reports/2025_IC3Report.pdf)). The price is small next to one redirected invoice. |
| A vendor | A recipient authorisation: the Payee proves the vendor controls its domain and the receiving account | First one free, then `$10` each | Joining is how a vendor gets paid, so the first proof is free; it is reusable in every later agreement, with any buyer. |
| Nobody | Posting a tender, bidding, verifying an agreement, the SDK, CLI and MCP server | Free | Bidders are the supply side, and free verification is what lets others trust and build on agreements. A won tender becomes a procurement agreement, billed as above. |

**Cost per agreement, measured on testnet.**
- **Storage:** a `2 NEAR` creation deposit, staked for the agreement account's storage. The code is global, by hash.
- **Enclave runs:** about `0.007 NEAR` each at default limits (`platform/DECISIONS.md`).
- **Model calls:** `z-ai/glm-5.3-flash` at `$0.08` / `$0.50` per million tokens.

Apart from the storage deposit, the marginal cost is cents, so the prices above leave a high gross margin.

**Collecting the fee.** At first this is an invoice, off chain. The natural place on chain is the factory's `create_agreement`, as a fee alongside the deposit. That is not built: the contracts on testnet charge no fee.

## Who buys first

**Token projects that pay a market maker a monthly retainer**, starting on NEAR. They already pay every month and cannot check what they are paying for. The venue is public, so the measurement needs no one's report. The buyer is one decision-maker, often a foundation, not a procurement department. And Accord has already run this end to end on a real pool (`a56`, `a57`).

**Then companies whose agents pay vendors.** Procurement agreements, sold through agent and procurement platforms (candidates, not partners, in [Partners whose products fit](#partners-whose-products-fit) below). This market is larger, and its sales cycle is longer.

## Next milestones, in order

1. **Three pilot conversations with NEAR projects that pay a market maker.**
   - The offer: one market-making agreement on testnet against their own pool, for one month. Free in exchange for feedback.
   - Success: a signed letter of intent at the price above.
2. **One outside developer's agent wins a tender job.**
   - The path is already open: `/app/tender-bid.mjs`, the CLI, MCP, and the skill at `skills/accord-tender/SKILL.md`.
   - Success: a job won by a key we did not make, recorded in `docs/runs.md`.
3. **One agent platform integrates `accord_verify`** (the MCP server) before its agents pay.

Each will be recorded in `docs/runs.md` or this file when it happens, with its evidence, and not before.

## Sustainability

### The loop that pays for itself

1. A buyer opens an agreement and pays for it (planned per-agreement fee, [above](#business-model-hypothesis)).
2. Each vendor it buys from joins free, because joining is how it gets paid; its proven domain and recipient are reusable in every later agreement, with any buyer.
3. Vendors that buy from their own suppliers open agreements too, and bring their vendors in free. Each paying buyer adds unpaid vendors who are one step from paying.
4. Verifying stays free for anyone (`make verify`, the MCP server, `/app/api/verify`), so tools built on top send more agreements, not less trust.

Revenue grows with the number of agreements, never with a cut of the money moving through them, and the costs it pays are per agreement too: a `2 NEAR` creation deposit on testnet (global code, by hash), the enclave runs and the model calls.

### Partners whose products fit

Candidates, not partners: no relationship with any of them is claimed.

| Candidate | Their product | The fit |
| --- | --- | --- |
| [Circle](https://www.circle.com/multi-chain-usdc/near) | Native USDC on NEAR | `accord-usdc.testnet` already settles in Circle's testnet USDC; mainnet settles in native USDC |
| [Pactum](https://pactum.com/) | AI supplier negotiation agents | The terms its agents reach could be the terms an Accord agreement enforces at payment time |
| [Coupa](https://siliconangle.com/?p=754391) | Procurement suite with AI agents (and Pactum for negotiation) | Where the pre-payment check, refusal alerts and finance exports meet the buyer's existing approvals |
| [Stripe and OpenAI ACP](https://stripe.com/blog/developing-an-open-standard-for-agentic-commerce), [Google AP2](https://ap2-protocol.org/), [Visa Intelligent Commerce](https://usa.visa.com/about-visa/newsroom/press-releases.releaseId.21366.html), [Mastercard Agent Pay](https://newsroom.mastercard.com/news/press/2025/april/mastercard-unveils-agent-pay-pioneering-agentic-payments-technology-to-power-commerce-in-the-age-of-ai) | Agent checkout and card rails for one party's agent | Accord adds the two-company terms and the recipient both approved; an agent's token or mandate could be scoped to an approved agreement |
| [x402](https://www.x402.org/) | HTTP-native stablecoin payments, with NEAR among its launch collaborators | An x402 payment could be gated by the agreement's recipient and amount checks |
| [Rhea Finance](https://www.rhea.finance/) | NEAR DEX | The market-making observer already measures a Rhea pool (a56, a57) |
| Exchanges that police market-maker deals ([Binance](https://www.binance.com/en/blog/community/483141898861583811)) | Due diligence on token projects' market makers | A market-making agreement's on-chain record of measured periods is evidence a project can show a listing team |
| [NEAR Intents / 1Click](https://docs.near-intents.org/), [OutLayer](https://app.outlayer.ai/), [NEAR AI Cloud](https://docs.near.ai/cloud/private-inference) | Cross-chain swaps; enclave compute; private inference | Quotes for funding an agreement from other chains (`accord fund-quote`, dry, live); OutLayer and NEAR AI Cloud already run Accord's enclave jobs and model calls |

### What keeps working, and what is left

- **Agreements do not depend on Accord's servers.** Each agreement is its own NEAR account with no full-access key and code pinned by hash; its rules, ledger and refusals are on chain, and `make verify` and the MCP server read the chain directly.
- **The hosted demo stays up and funded through 25 Nov 2026**: the site, the app, the faucet (a scheduled job checks every 2 hours and tops it up when it falls under 30 NEAR) and the pre-funded `/try` room.
- **Open source, MIT**, with CI on every push (website checks, TypeScript typecheck and tests, the Rust money-path tests).
- **Before mainnet, in order:** restrict the Sealed Table's seed to the agreement's own calls (S1, an OutLayer setting); remove release 3's job builds from the seeds' access; check the hardware quote in `make verify`; a third-party audit of the contracts; then the factory on mainnet with Circle USDC. Tracked in [`platform/docs/build/BLOCKED.md`](../platform/docs/build/BLOCKED.md) and [`platform/DECISIONS.md`](../platform/DECISIONS.md).
- **Next in the product:** an organisation-wide spend limit across all its agreements, funding an agreement from other chains through NEAR Intents (priced today with dry quotes; executing them waits for mainnet), and a DAO as the buyer.
