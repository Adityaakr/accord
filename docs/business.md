# Traction and business model

Where Accord stands commercially, written so a reviewer can check every number. In short: it runs end to end on NEAR testnet, it has been used heavily by us and by reviewers, and it has no customers or revenue yet. The model below is a hypothesis with prices, and the first market to test it is named.

## Traction: what has run, counted from chain

Rerun it yourself (view calls only, no keys, about 30 s):

```bash
cd platform && make usage
```

Output on 11 Nov 2026:

```
Agreements (each its own NEAR account)
  accord-v2.testnet       76  {"procurement":70,"market-making":6}
  accord-usdc.testnet      3  {"procurement":3}
  by release              {"1":2,"2":3,"3":5,"4":43,"5":26}
  distinct buyer accounts 58
  opened from a key made in the browser (/app/try-it, no wallet): 48
  payments made by an agent's key under the contract: 56
  payments refused by the contract, on the record:     45
  agreements with at least one refusal:                34

Open tenders (tender-v2.accord-v2.testnet)
  jobs posted 11  {"linked":1,"awarded":9,"open":1}
  sealed bids 37, revealed 33, distinct agent keys 11
  jobs won by an agent outside the house keeper (all run by us so far): 3
  jobs linked to an Accord agreement: 1
```

What these numbers are, and what they are not:

- **79 agreements on two factories, five releases.** Every one is a NEAR account with code pinned by hash. Most were opened by us while building, by `make demo` and `make tender`, and by the hosted try-it flow.
- **48 agreements opened from a key made in a browser.** These come from `/app/try-it` ("Try without a wallet"). The flow has no sign-up by design, so we cannot tell our own runs, reviewers' agents and outside visitors apart. We do not count them as users.
- **45 refused payments** are the product working: a redirect, a wrong amount or a payment without evidence, refused on chain and kept on the record.
- **Tenders.** The house keeper keeps a job open on the board at all times. The three winners outside its house agents (`outside-claude`, `judge-test-agent`, `near-agent-a`) were run by us with the public script, to test the path an outside agent takes. No outside developer has bid yet.
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

**Then companies whose agents pay vendors.** Procurement agreements, sold through agent and procurement platforms (candidates, not partners, in the README's "Partners whose products fit"). This market is larger, and its sales cycle is longer.

## Next milestones, in order

1. **Three pilot conversations with NEAR projects that pay a market maker.**
   - The offer: one market-making agreement on testnet against their own pool, for one month. Free in exchange for feedback.
   - Success: a signed letter of intent at the price above.
2. **One outside developer's agent wins a tender job.**
   - The path is already open: `/app/tender-bid.mjs`, the CLI, MCP, and the skill at `skills/accord-tender/SKILL.md`.
   - Success: a job won by a key we did not make, recorded in `docs/runs.md`.
3. **One agent platform integrates `accord_verify`** (the MCP server) before its agents pay.

Each will be recorded in `docs/runs.md` or this file when it happens, with its evidence, and not before.
