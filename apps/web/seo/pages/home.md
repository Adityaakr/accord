Built on NEAR

# The private deal room and control plane for agent-to-agent commerce.

Accord turns private negotiations into enforceable payment rules. Agents negotiate within each business’s confidential limits. Both parties approve the terms, and the contract enforces who can authorise payments, who can receive them, how much can be paid and what evidence is required.

[Open the app](/app/signin) [See an agreement in action](/#market-making)

[From private negotiation to controlled payment. Negotiate, approve, observe, hold, refuse a redirected payment, then pay the approved recipient.](/demo)

> Illustrative Accord product: the deal-room list, a market-making agreement shown as its seven-step pipeline from sealed mandates to the USDC transfer on NEAR, and the agreement's activity: a refused payment, a missed observation slot and a settled period.

## Sealed Table

Agents negotiate in confidence. Only the agreed terms and a proof come out.

## Agreement controls

The contract enforces the terms. Any payment that doesn't match is refused.

## Payee

Payments go only to a recipient the vendor has proven and the buyer accepted.

## Evidence checks

A payment becomes eligible only when the agreed evidence or acceptance is recorded.

## Built on

- NEAR : The agreement contract, its escrowed USDC and the on-chain record of every payment and refusal.

- NEAR AI Cloud : Private inference for the negotiating agents; each response's signature is checked in the enclave.

- OutLayer : Attested enclaves for the Sealed Table, the recipient binding and the market observer.

- USDC : Settlement on NEAR as a NEP-141 token, paid only by the contract from each agreement's own account.

- NEAR Intents : Planned: funding an agreement from other chains through NEAR Intents' 1Click API.

- Rhea : The USDC/wNEAR pool the market-making observer reads at hidden times.

Accord builds on these networks and services; it does not claim a partnership with them. NEAR Intents, for funding from other chains, is planned.

## Built for commerce in stablecoins.

Retainers paid on agreed spread, depth and two-sided quoting

- Market making

- Vendor contracts

- Agent services

- Security fixes

- Infrastructure

- Grants

Deal room · NEAR/USDC retainer, Q1 Illustrative

Renew our NEAR/USDC market-making retainer on Rhea: up to 20,000 USDC a period, spread under 70 bps, at least 10,000 USDC of depth within 2%, quotes on both sides. Our agent must not overpay or pay the wrong desk.

18,500 USDC a period. Paid on measured liquidity.

- Terms agreed inside the Sealed Table; both mandates stayed sealed Confidential negotiation · passed

- Your agent's key can call `act()` and nothing else Agent permissions · passed

- Any amount, period or recipient off the terms is refused Payment controls · passed

- Paying `halcyon-mm.near` only, bound to halcyon-mm.xyz Recipient authorisation · passed

- Each period's payment becomes eligible when 4 of 6 slots pass Conditional settlement · passed

Deal room · Vendor invoices, October run Illustrative

Process October's vendor invoices, 214 in the queue. Pay each one only if it matches its purchase order and a confirmed delivery, only to the vendor's proven address, and hold anything that doesn't.

212 invoices cleared. Two held for you.

- Rates per vendor agreed in the Sealed Table; your limits stayed sealed Confidential negotiation · passed

- Your agent can only pay invoices matched to an approved order Agent permissions · passed

- Duplicates, overcharges and changed bank details are refused Payment controls · passed

- Each vendor is paid only at the address bound to its domain Recipient authorisation · passed

- Paid as one batch once delivery is confirmed; two mismatches held Conditional settlement · passed

Deal room · Inference credits Planned Illustrative

Buy inference for our research agent from a provider's agent: up to 500 USDC a week, never more than 2,000 USDC in total, and stop when I revoke.

450 USDC a week. Capped at 1,800.

- Price agreed agent to agent in the Sealed Table; both limits stayed sealed Confidential negotiation · passed

- Your agent can only pay 450 USDC a week Agent permissions · passed

- Anything over the weekly amount or the 1,800 USDC cap is refused Payment controls · passed

- Paying `inferhub.near` only, bound to inferhub.xyz Recipient authorisation · passed

- Each week becomes payable on schedule, until you revoke Conditional settlement · passed

Deal room · SDK signature fix, report K-17 Planned Illustrative

Commission the fix for the signature bug Kestrel reported in our SDK: up to 8,000 USDC, paid only when our 14 regression checks pass on the patch and our security lead approves it.

6,000 USDC. Checks pass; held for your security lead.

- Fee agreed in the Sealed Table; your 8,000 USDC ceiling stayed sealed Confidential negotiation · passed

- Your agent's key can call `act()` and nothing else Agent permissions · passed

- A different amount or an early payment is refused Payment controls · passed

- Paying `kestrel-sec.near` only, bound to kestrel-sec.xyz Recipient authorisation · passed

- Payable once 14 of 14 checks pass and the security lead approves Conditional settlement · passed

Deal room · GPU capacity, November Planned Illustrative

Renew our GPU capacity with Northlight: up to 50,000 USDC a month for 99.5% availability and p95 latency under 300 ms. If a month misses, hold it under the shortfall rule and let them dispute the reading.

48,000 USDC a month. November held at 99.2%.

- Price agreed in the Sealed Table; your 50,000 USDC ceiling stayed sealed Confidential negotiation · passed

- Your agent can only pay the agreed monthly amount Agent permissions · passed

- Paying a month that missed the levels is refused Payment controls · passed

- Paying `northlight.near` only, bound to northlight.xyz Recipient authorisation · passed

- Each month becomes payable when the agreed monitor reports both levels met Conditional settlement · passed

Deal room · Grant G-114, wallet SDK Planned Illustrative

Fund grant G-114 for the wallet SDK: up to 45,000 USDC in three tranches, each only after two of our three reviewers accept the milestone report. Pay the team's own address and nobody else.

42,000 USDC in three tranches. Released on acceptance.

- Grant size and tranches agreed in the Sealed Table; your maximum stayed sealed Confidential negotiation · passed

- Your agent can only pay these three tranches Agent permissions · passed

- A changed amount or an unscheduled tranche is refused Payment controls · passed

- Paying `sdkworks.near` only, bound to sdkworks.xyz Recipient authorisation · passed

- Each tranche becomes payable when two of three reviewers accept the report Conditional settlement · passed

Featured agreement · Demo

## Market-making agreements in Accord.

A market-making agreement connects the retainer to the liquidity conditions both parties approve. An attested observer samples the venue's public liquidity at hidden times within an agreed schedule, checking spread, depth and two-sided quoting against the agreement.

When the required observations pass, payment becomes eligible for release under Accord's payment controls. Otherwise, it remains withheld for both parties to review. Each payment decision is linked to the terms and observations behind it.

[Explore the agreement](/use-cases/market-making) [See a market-making agreement run on testnet →](/#testnet)

Why it matters

Projects, market makers and exchanges keep pointing at the same gap.

Paraphrased from public sources, linked on each card.

- Kain Warwick Founder · Synthetix [Mar 2025](https://bitcoinist.com/disturbing-truth-about-crypto-market-makers/) Projects paid market makers $50k to $300k+ a month in the 2017 cycle. Many exercised their call options and dumped. **Accord** ties pay to the agreed spread, depth and two-sided quoting.

- Jelle Buth Co-founder · Enflux, market maker [Apr 2025](https://cointelegraph.com/magazine/market-maker-deals-quietly-killing-crypto-projects) Projects should set liquidity KPIs before they commit. In loan-option deals they are often missing or vague. **Accord** turns the KPIs into the payment conditions.

- LO:TECH Survey · commissioned by a market maker [Aug 2025](https://www.theblock.co/post/367243/global-survey-reveals-deep-mistrust-in-crypto-market-making-urgent-call-for-transparency) 52% of 2,000+ respondents do not trust market makers. The report recommends enforceable contracts. **Accord** lets attested observations decide each payment.

- Binance Exchange guidance · for listed projects [Mar 2026](https://finance.yahoo.com/markets/crypto/articles/binance-requests-market-maker-transparency-191855624.html) Projects must disclose their market maker's legal entity and contract terms to the exchange. **Accord** measures whether those terms were met.

> Illustrative monitor for a NEAR/USDC market-making agreement on Rhea's USDC/wNEAR pool. Approved conditions: spread at most 60 bps, at least 12,000 USDC of depth within 2% of the mid on each side, both sides quoted, 4 of 6 observation slots to pass. The pool is read at six times drawn inside the observer's enclave and each slot is attested; slot 3 fails with 9,820 USDC of depth. 5 of 6 pass, the period is eligible and 18,500 USDC is settled to halcyon-mm.near in USDC on NEAR.

Scope The demonstration proves condition-linked payment, not account-level performance attribution. Public order-book observations measure the venue's liquidity, not the hired market maker's own contribution. Verification using the market maker's authenticated account data is planned.

How it works

## How a deal room works.

One agreement from sealed limits to a settled payment, in six steps. Every agreement type runs the same way; only the terms and the evidence change.

- 01 Sealed

- 02 Attested

- 03 Approved

- 04 Executing

- 05 Checked

- 06 Settled

Step 01 of 06 · Sealed

### Sealed: each side seals its limits.

Each company sets its limits in the browser, such as a price ceiling or floor and the conditions it needs, and seals them. A mandate is encrypted to a key that exists only inside the Sealed Table's enclave.

Who acts

Each company, in its own browser

On NEAR

Each sealed mandate as ciphertext, with its commitment hash

Cannot happen

The other side, the operator or the app reading the numbers

Step 02 of 06 · Attested

### Attested: agents negotiate in the enclave.

Both companies' agents negotiate inside the Sealed Table, an attested enclave. Code checks every proposal against both mandates' hard limits, and only the agreed terms come out, with an attestation anyone can verify.

Who acts

Both agents, inside the enclave

On NEAR

The agreed terms, the sealed outcome and the attestation

Cannot happen

Terms outside either side's limits; a mandate leaving the enclave

Step 03 of 06 · Executing

### Approved: both companies approve and fund.

People at both companies read the terms and approve them. Payee binds the recipient: the vendor proves its domain, its settlement authority approves the account and the buyer accepts it. The buyer then funds the agreement's USDC escrow on NEAR.

Who acts

A person at each company

On NEAR

Both approvals, the authorised recipient and the escrowed USDC

Cannot happen

Terms taking effect before both sides approve

Step 04 of 06 · Executing

### Executing: the agent pays inside the rules.

The buyer's agent holds one key that can call one method, act. Each payment must match the approved milestone, amount and recipient; anything else is refused and recorded, whatever the agent was told.

Who acts

The buyer's agent, through act

On NEAR

Every payment and every refusal with its reason

Cannot happen

A payment to another account, a different amount or an early payment

Step 05 of 06 · Executing

### Checked: evidence decides each payment.

A payment becomes eligible only when the agreed evidence is recorded: observations of a market at hidden times, the buyer's acceptance of a delivery, or a named reviewer's approval. Otherwise it is withheld for both sides to review.

Who acts

An attested observer, the buyer or a named reviewer; a keeper triggers scheduled steps

On NEAR

Each observation or acceptance, and the result

Cannot happen

The keeper moving funds or changing an outcome

Step 06 of 06 · Settled

### Settled: paid, recorded, checkable.

Eligible payments complete to the authorised recipient in USDC. The buyer decides any exception and can revoke the agent's key in one transaction, and the record remains for anyone to check with one command.

Who acts

The contract pays; the buyer decides exceptions

On NEAR

The transfer, any exception and the full record

Cannot happen

A payment being reversed or redirected after the fact

Terms agreed inside both limits, with an attestation.

Core features

## Seven controls between an agent and the money.

Each one is enforced by the NEAR contract or the attested enclave, and each can be checked from public data.

Sealed Table

### Confidential negotiation

Each company seals its limits in the browser, and the agents negotiate inside an attested enclave. Only the agreed terms and an attestation come out, and both companies approve before anything takes effect.

Agent permissions

### One key, one method

The buyer's agent holds a key that can call one method, act, on one contract. It cannot deploy code, add keys or move funds any other way.

Agreement controls

### Every payment checked

Each payment must match the approved milestone, amount and recipient. Anything else is refused, and the reason is recorded.

Payee

### A recipient that cannot be redirected

The vendor proves its domain, its settlement authority approves the account and the buyer accepts it. A message cannot change it.

Evidence checks

### Evidence before release

A payment becomes eligible only when the agreed evidence is recorded. Otherwise it is withheld for both sides to review.

Revocation

### Stop the agent in one transaction

The buyer calls revoke_agent and the agent's key is deleted. Payments already made stay with the authorised recipient.

Verify

### Checkable from public data

One command checks an agreement from public data, with no keys: the contract code, the agent's key, the recipient proof and the record. The enclave release check follows the testnet release.

[Each claim and its limit, on Security →](/security)

Use cases

## Different agreements. One system of control.

Negotiate privately, approve the terms and define what must happen before money moves. Each card names what it runs on.

### Pay a market maker for liquidity that showed up

A project renews an 18,500 USDC retainer. Each period pays only if four of six readings of the pool, taken at hidden times, meet the agreed spread and depth.

Status: demo. Runs on the Rhea pool, OutLayer and NEAR.

### Let an agent pay invoices it cannot redirect

Invoices clear against approved milestones once delivery is accepted. A message asking to pay a new account is refused by the contract, whatever the agent was told.

Status: demo. Runs on Payee, USDC and NEAR.

### Negotiate a renewal without showing your ceiling

Both companies' agents bargain inside an enclave. Each side's limit stays sealed; only the agreed terms and an attestation come out for both to approve.

Status: demo. Runs on Sealed Table, NEAR AI and OutLayer.

### Planned: Pay for a security fix only when the checks pass

The researcher's fee is agreed before work starts and stays in escrow until the agreed checks pass on the patch and the named reviewer approves it.

Status: planned. Runs on Agreement controls and USDC.

### Planned: Hold a month of capacity that missed its levels

Monthly GPU capacity pays in full when availability and latency meet the agreed levels. A shortfall follows the agreed rule, and the provider can dispute the reading.

Status: planned. Runs on Agreement controls and USDC.

### Planned: Release a grant when the reviewers sign off

Each tranche moves only when two of three named reviewers accept the milestone, and only to the account the grantee has proven it controls.

Status: planned. Runs on Payee and USDC.

Any agreement with approved terms, agreed evidence and an authorised recipient works the same way.

Why now

## An agent’s instructions can change. Its payment authority stays within the approved rules.

Losses reported to the FBI in 2025[1](/research#ic3-2025)

$20.9B

Up from `$6.9B` in 2021[2](/research#ic3-2023)

Stablecoin transactions in a year[3](/research#a16z-state-of-crypto-2025)

$46T

`$9T` once bots and inflated activity are filtered out.

Stablecoins in circulation, November 2026[4](/research#defillama-stablecoins)

$292B

US-dollar stablecoins, by DefiLlama's daily count.

Exposed to business email compromise, 2013 to 2023[5](/research#ic3-bec-psa-2024)

$55.5B

`305,033` incidents reported to the FBI.

US organisations hit by business email compromise, 2025[6](/research#afp-2026)

74%

`76%` faced attempted or actual payments fraud.

US fraud losses generative AI could enable by 2027[7](/research#deloitte-genai-fraud)

$40B

A forecast, up from `$12.3B` in 2023.

Prompt injections that still worked on a browser agent[8](/research#anthropic-chrome)

11.2%

With the maker's mitigations, in 123 tests. `23.6%` without.

Sources: FBI Internet Crime Complaint Center, reports for [2025](https://www.ic3.gov/AnnualReport/Reports/2025_IC3Report.pdf) and [2023](https://ic3.gov/annualreport/reports/2023_ic3report.pdf) and its September 2024 notice; a16z crypto, State of Crypto 2025; DefiLlama, 8 November 2026; AFP Payments Fraud and Control Survey 2026; Deloitte, May 2024 (forecast); Anthropic, August 2025. Each is on [Research](/research#attack-trends).

Worst case

The most a hijacked agent can do is make a payment you already approved, to the recipient you already accepted, when it falls due.

Where each attack stops · the agent is assumed to follow every message it reads

- BEC ASI01 goal hijack What the agent does Asks to pay the new account Where it stops **Agreement controls** destination is not the authorised recipient Result `ERR_PAYEE_MISMATCH` nothing sent

**Where each attack stops, assuming the agent follows every message it reads**

| Attack | What the agent does | Where it stops | Result |
| --- | --- | --- | --- |
| Our bank details have changed. | Asks to pay the new account | Agreement controls: destination is not the authorised recipient | ERR_PAYEE_MISMATCH, nothing sent |
| Urgent: pay invoice 4471 today. | Asks for a payment the schedule does not hold | Agreement controls: amount and milestone checked against the approved schedule | ERR_AMOUNT_MISMATCH, ERR_NOT_DUE, nothing sent |
| Please update our payee. (sent from the vendor's real mailbox) | Has no method that changes a payee | Payee: fresh domain proof · vendor authority · buyer accepts · 24-hour delay | No change from a message, real changes wait 24 h |
| The agent's key is stolen | Attacker calls `act()` with the stolen key | Agreement controls: the key can still pay only the approved amount to the authorised recipient; the buyer deletes it with revoke_agent in one transaction | AccessKeyDoesNotExist, on every call after the revoke |
| The other agent presses yours (to concede past your limit) | May concede in the conversation | Sealed Table: code checks every proposal against both mandates' limits | Terms inside your limits, or no deal; you approve |

Not stopped by the contract: a person approving the wrong terms, or a payment the terms already allow. Those stay with people, on the record.

Where each attack stops. Each attack ends at a check in code; the tags give the closest entry in the OWASP Top 10 for Agentic Applications.[9](/research#owasp-agentic-2026)

Try to move the money ↓

Live on NEAR testnet

## One agreement, every step on chain.

Agreement [a6.accord-v2.testnet](https://testnet.nearblocks.io/address/a6.accord-v2.testnet) ran the full flow on testnet: sealed limits, a negotiation by the real model inside OutLayer's attested enclave, approvals, funding, a payment, a refused redirect and a revocation. Settlement is test USDC on NEAR testnet.

Agreement record [a6.accord-v2.testnet ↗](https://testnet.nearblocks.io/address/a6.accord-v2.testnet)

- [01 Buyer seals its limits Only a commitment and ciphertext go on chain tx ↗](https://testnet.nearblocks.io/txns/Ek9Zr1wjD6nrWaKHFak8UDv5Jwbaacqrdh1huNp6qwAk)

- [02 Vendor seals its limits The other side never sees the numbers tx ↗](https://testnet.nearblocks.io/txns/2Zq8pfNoa1dFzMLAy79aGyek72q3LGcrvRqAjYABisKZ)

- [03 Negotiated in the enclave 35.50 test USDC in 3 items, signed by the Sealed Table tx ↗](https://testnet.nearblocks.io/txns/GfX5qKq35rvtUVkp9nBPgw3kkzDSXx6hfY2H5cb3wfHW)

- [04 Buyer approves the terms Approval recorded on the agreement tx ↗](https://testnet.nearblocks.io/txns/H6cMyE6kzs9SdrC4yaP7CvnDxJqH4NSx7ivKeu2rBHSg)

- [05 Vendor approves the terms The agreement starts executing tx ↗](https://testnet.nearblocks.io/txns/2uv8tTfeYhe2aZ5cMrVNfFzr88kPL4HeSxwYzNhtmveT)

- [06 Buyer funds the escrow 35.50 test USDC into the agreement's own account tx ↗](https://testnet.nearblocks.io/txns/2CeFB18jenw2iggWE8mQZy9DehwZ2f97TYXwi3RVeXPy)

- [07 Recipient proven in the enclave Payee checks the vendor's domain tx ↗](https://testnet.nearblocks.io/txns/6koRbw5QDYTgVU52Fe1vH755QGLPwZabQhF1kTk5rup6)

- [08 Vendor's authority approves A separate account signs off the recipient tx ↗](https://testnet.nearblocks.io/txns/FBQnqtKXs5B5zn1A4F1yCDUmACYMqsi2zM2uez6YxDis)

- [09 Buyer accepts the recipient halcyon-mm.testnet is now the only destination tx ↗](https://testnet.nearblocks.io/txns/3d3LSZvz3yPX5LM1Bk6t9bxiX2x1JDMEt9mfa2fbw11p)

- [10 Agent pays inside the terms 16.50 test USDC to halcyon-mm.testnet tx ↗](https://testnet.nearblocks.io/txns/2k57zg7iE44muCGRbcc2JTVmy5uGHHyCePXNPmcWCKEQ)

- [11 A redirected payment is refused ERR_PAYEE_MISMATCH, nothing sent tx ↗](https://testnet.nearblocks.io/txns/AB9HLnWvkzNL418ygx8AVArinPnAK3jqxt4haAjsk8fs)

- [12 Buyer revokes the agent Its next call fails: AccessKeyDoesNotExist tx ↗](https://testnet.nearblocks.io/txns/4ervNQdjrd7MA1n7vWSY7cRUtCpwiQwSK7xDSK2Bmn9P)

Checked from public data

make verify DEAL=a6.accord-v2.testnet passes 6 checks: contract code, agent key, sealed outcome, model attestation, recipient proof, record. Not checked yet: release attestation (the outlayer-verify tool is not installed yet).

[Verify it in the app →](/app/verify/a6.accord-v2.testnet)

Behind it

- [Factory accord-v2.testnet ↗](https://testnet.nearblocks.io/address/accord-v2.testnet)

- [Factory deployed ↗](https://testnet.nearblocks.io/txns/2bH5kjeQKSYpEhaxcftUtsfqhYKUFwtYLi8k9GF2zZWg)

- [Release 3 published ↗](https://testnet.nearblocks.io/txns/7m8pj7u2D5aAXJ3RPbPWkhShKpJxwWHhPSpRrKr9nPVh)

- [Room created through Accord's relayer ↗](https://testnet.nearblocks.io/txns/DyFrt2v9sGhxnRiWVwSydXPWS48exUis56YydCMmrBhC)

- [Enclave key attestations ↗](https://testnet-api.outlayer.ai/attestations/13596)

Mainnet follows an audit.

[Open the app and create a deal room →](/app/signin) [Run it yourself from the docs](/docs)

> Illustrative: the demonstration agent's inbox. A message with new bank details and an urgent invoice are both refused by the contract with their reasons; the scheduled payment to the authorised recipient goes through.

## Try to move the money.

When the demonstration opens, its agent's inbox is public. Send it new bank details, an urgent invoice or an instruction from the chief executive; the agent is deliberately literal and will act on it, and your attempt appears in the public refusal log with the contract's reason. Revocation is shown exactly: the agent's only key is deleted in one transaction, and anything it signs afterwards is rejected by the network before it reaches the contract.

[Preview the demonstration](/try)

Privacy and control

## What stays private, what is public, and what Accord does not do.

### Private to each company

Its mandate (on chain only as ciphertext) and the negotiation; only the terms, hashes and an attestation leave the enclave.

### Visible to both companies

The approved terms, the schedule, every payment, exception and refusal.

### Public

The payment schedule the contract enforces, the authorised recipient and the payments themselves, as with any stablecoin payment.

### No recall

Accord does not reverse a payment once it is made; revocation stops the agent, and a payment already made went to the authorised recipient at the approved amount.

### Not legal identity

It does not verify that a company legally exists; Payee establishes control of a domain and approval by the recipient's authority.

### Not fairness or truth

It does not prove that a negotiation was fair or that external data is truthful; attestation shows which code ran on which inputs.

A keeper service triggers scheduled steps such as observations; it cannot move funds or change an outcome. Mainnet follows an audit.

[Security documentation →](/security)

Research

## The research behind the room.

- 01 Informs Sealed Table Tamper-proof programs let a seller disclose without being expropriated. Stephenson, Miller et al. · NDAI Agreements · arXiv 2025 · [Source](https://arxiv.org/abs/2502.07924)

- 02 Informs Agreement controls Define at the contract level what an agent can and cannot do. Crowley, Catalini, Hall et al. · a16z Frontier · 2026 · [Source](https://a16zfrontier.com/posts/article/5-ways-blockchains-help-ai-agents/)

- 03 Informs Market-making agreements Paid liquidity obligations raised liquidity and firm value. Menkveld and Wang · Journal of Financial Markets · 2013 · [Source](https://doi.org/10.1016/j.finmar.2012.12.003)

[arxiv.org/abs/2502.07924 Informs Sealed Table](https://arxiv.org/abs/2502.07924) [a16zfrontier.com Informs Agreement controls](https://a16zfrontier.com/posts/article/5-ways-blockchains-help-ai-agents/) [ideas.repec.org · J. Financial Markets Informs Market-making agreements](https://doi.org/10.1016/j.finmar.2012.12.003)

[Explore the research →](/research)

In their words

## Who has named this problem.

Verbatim where marked; everything else paraphrases the linked source.

> Illia Polosukhin

Verbatim

> "Businesses will not deploy agents that expose their revenue, counterparties, or financial operations on a public ledger."

Illia Polosukhin NEAR co-founder · 14 May 2026 · [source](https://tools.prnewswire.com/en-us/live/20813/release/20260514EN59736) 01 / 06

> Illia Polosukhin

Paraphrase

> Agents should be treated as hostile by default, with policy caps that hold even if the model is compromised

Illia Polosukhin NEAR co-founder · 26 Feb 2026 · [source](https://rosetta.to/u/unchainedcrypto/the-ai-agent-revolution-crypto-isn-t-talking-about-the-chopping-block) 02 / 06

> Eddy Lazzarin

Paraphrase

> The core unsolved problem is authorization: proving to a counterparty that an agent represents you

Eddy Lazzarin a16z crypto · 28 Apr 2026 · [source](https://www.techflowpost.com/en-US/article/31368) 03 / 06

> Haseeb Qureshi

Paraphrase

> The delegation model that works is sub-cards with owner-set limits; privacy wins when it is easy

Haseeb Qureshi Dragonfly · 7 Oct 2026 · [source](https://www.rootdata.com/news/781111) 04 / 06

> Jack Forestell

Verbatim

> "These agents will need to be trusted with payments, not only by users, but by banks and sellers as well."

Jack Forestell Visa · 30 Apr 2025 · [source](https://usa.visa.com/about-visa/newsroom/press-releases.releaseId.21361.html) 05 / 06

> Simon Willison

Paraphrase

> The lethal trifecta: access to private data, exposure to untrusted content, and the ability to communicate externally; combine the three and an attacker can trick the agent into sending your data to them

Simon Willison 16 Jun 2025 · [source](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/) 06 / 06

FAQ

## Questions.

### Who can see my mandate?

### What if the model negotiates badly?

### What if my agent is tricked?

### Our vendor really did change banks. What happens?

### How does a market-making agreement decide whether a period pays?

### Can we use Accord if the other side has no agent?

### What does it cost?

### Is it live?
