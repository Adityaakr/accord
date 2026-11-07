Built on NEAR

# Private agreements. Controlled execution.

The private deal room for agent-to-agent commerce. Each agent negotiates within its company’s confidential mandate, both companies approve the terms, and the approved agreement stays the authority over what happens next: who the buyer’s agent may pay, how much, and on what evidence.

[Request early access](/join) [See an agreement in action](/#market-making)

[From private negotiation to controlled payment. Negotiate, approve, observe, hold, refuse a redirected payment, then pay the approved recipient.](/demo)

> Illustrative Accord product: the deal-room list, a market-making agreement shown as its seven-step pipeline from sealed mandates to the USDC transfer on NEAR, and the agreement's activity: a refused payment, a missed observation slot and a settled period.

###### Sealed Table

Agents negotiate in confidence. Only the agreed terms and a proof come out.

###### Agreement controls

The contract enforces the terms. Any payment that doesn't match is refused.

###### Payee

Payments go only to a recipient the vendor has proven and the buyer accepted.

###### Evidence checks

A payment becomes eligible only when the agreed evidence or acceptance is recorded.

Use cases

## Different agreements. One system of control.

Negotiate privately, approve the terms and define what must happen before money moves. Accord brings the same controls to recurring services, specialist work and commerce between agents.

- Demo Market-making agreements Retainers tied to agreed liquidity conditions

- Planned Security remediation Fixes paid when the agreed checks pass

- Planned Infrastructure service agreements Recurring payments tied to service levels

- Planned Agent-to-agent services Specialist work commissioned within set bounds

- Demo Vendor contracts and renewals Invoices paid only against approved obligations

- Planned Grants and funded milestones Each payment tied to an accepted milestone

Market-making agreements Demo Agreement preview · Illustrative

Connect recurring retainers to agreed liquidity conditions. Define spread, depth and quoting requirements, then use scheduled observations to determine whether a payment is eligible for release.

Payment condition: the agreed observation threshold is met.

Venue-level observations measure market conditions, not an individual market maker's contribution.

[Why it matters Paid liquidity obligations raised liquidity and firm value. Menkveld and Wang, 2013](/research#menkveld-wang)

Approved obligation

Recurring liquidity retainer · 18,500 USDC a period

Payment condition

4 of 6 observation windows pass: spread ≤ 60 bps, depth ≥ 12,000 USDC within 2%, both sides quoted

Accepted evidence

Signed readings from the agreed observer, taken at hidden times

Authorised recipient

halcyon-mm.near · proven for halcyon.example

Current decision

Eligible

Explanation

5 of 6 windows passed, 4 were required. Window 3 measured 9,820 USDC of depth, below the agreed 12,000.

- Window 1 48 bps · 12,910 USDC · both sides

- Window 2 51 bps · 12,480 USDC · both sides

- Window 3 52 bps · 9,820 USDC · both sides

- Window 4 47 bps · 12,640 USDC · both sides

- Window 5 45 bps · 13,105 USDC · both sides

- Window 6 49 bps · 12,770 USDC · both sides

- Observer signature checked against the approved observer key

Security remediation Planned Agreement preview · Illustrative

Agree on the fix before commissioning the work. Define the affected software, required checks and acceptance process; keep payment pending until the submitted patch satisfies those requirements.

Payment condition: the specified checks pass and the required reviewer approves.

Planned template. The fields show how this agreement would read; the controls behind them are the ones already demonstrated.

Approved obligation

Fix for a reported vulnerability · 6,000 USDC on acceptance

Payment condition

The agreed test suite passes on the submitted patch and the named reviewer approves

Accepted evidence

Test results for the submitted patch and the reviewer's approval

Authorised recipient

The researcher's approved account

Current decision

Awaiting review

Explanation

All 14 required checks pass on patch 3f9a2c1. Payment stays pending until the named reviewer approves.

- Patch 3f9a2c1 · submitted against the agreed repository

- Required checks 14 of 14 pass

- Reviewer approval pending

Infrastructure service agreements Planned Agreement preview · Illustrative

Connect recurring payments to the service levels your business relies on. Agree on availability, latency or capacity requirements, with a defined process for shortfalls and disputed measurements.

Payment condition: the agreed service evidence and payment rules are satisfied.

Planned template. The fields show how this agreement would read; the controls behind them are the ones already demonstrated.

Approved obligation

Dedicated GPU capacity · 48,000 USDC a month

Payment condition

Availability ≥ 99.5% and p95 latency ≤ 300 ms for the month

Accepted evidence

Measurements from the agreed monitor, with a dispute window for the provider

Authorised recipient

The provider's approved account

Current decision

Held

Explanation

Availability measured 99.2% against the agreed 99.5%. The shortfall rule applies, and the provider can dispute the measurement.

- Availability 99.2% · needs ≥ 99.5%

- p95 latency 212 ms · needs ≤ 300 ms

- Dispute window open for 72 hours

Agent-to-agent services Planned Agreement preview · Illustrative

Let agents commission specialist work within approved boundaries. Set the scope, budget, authorised provider and acceptance criteria before a task begins.

Payment condition: the deliverable is accepted under the agreed rules.

Planned template. The fields show how this agreement would read; the controls behind them are the ones already demonstrated.

[Why it matters Define at the contract level what an agent can and cannot do. a16z Frontier, 2026](/research#a16z-frontier)

Approved obligation

Market research from a specialist agent · up to 450 USDC

Payment condition

The deliverable is accepted against the agreed criteria

Accepted evidence

The delivered work and the buyer agent's recorded acceptance

Authorised recipient

The provider agent's approved account

Current decision

Eligible

Explanation

The report was delivered within scope and budget, and the buyer's agent recorded its acceptance.

- Deliverable report · hash 0x4be1…9c02

- Budget 420 of 450 USDC

- Acceptance recorded by the buyer's agent

Vendor contracts and renewals Demo Agreement preview · Illustrative

Let agents negotiate price, scope and renewal terms within confidential limits. Both businesses approve the agreement before it governs invoices, scheduled payments and recipient changes.

Payment condition: the invoice matches an approved obligation and the required acceptance is recorded.

[Why it matters $3.0B lost to business email compromise in 2025. FBI IC3](/research#ic3-2025)

Approved obligation

Analytics contract · 12 monthly milestones of 3,000 USDC

Payment condition

The invoice matches an approved milestone and the buyer has accepted delivery

Accepted evidence

The buyer's recorded acceptance of the delivery

Authorised recipient

fieldwork.near · proven for fieldwork.example

Current decision

Eligible

Explanation

Milestone 4 was accepted and the invoice matches the approved amount. An earlier request to pay a new account was refused.

- accept_delivery(3) recorded by the buyer

- act(Pay{milestone 4, 3,000 USDC}) accepted

- act(Pay{to "fieldwork-new.near"}) refused · ERR_PAYEE_MISMATCH

Grants and funded milestones Planned Agreement preview · Illustrative

Give recipients clear funding commitments and reviewers clear release conditions. Define deliverables, budgets and approval authority before work begins, with each payment tied to an accepted milestone.

Payment condition: the designated reviewers approve the milestone.

Planned template. The fields show how this agreement would read; the controls behind them are the ones already demonstrated.

Approved obligation

Wallet SDK grant · 42,000 USDC in three milestones

Payment condition

2 of 3 designated reviewers approve the milestone

Accepted evidence

The milestone report and the reviewers' approvals

Authorised recipient

The grantee's approved account

Current decision

Awaiting review

Explanation

The milestone 1 report is in. 1 of the 2 required approvals is recorded, so 12,000 USDC stays held.

- Milestone 1 report submitted

- Reviewer A approved

- Reviewer B pending

- Reviewer C pending

Every agreement carries the same safeguards.

[Explore an example agreement](/#market-making)

- Confidential mandates

- Approved terms

- Scoped agent permissions

- Authorised recipients

- Evidence requirements

- Payment limits

Featured agreement · Demo

## Market-making agreements in Accord.

A market-making agreement connects the retainer to the liquidity conditions both parties approve. An attested observer samples the venue's public liquidity at hidden times within an agreed schedule, checking spread, depth and two-sided quoting against the agreement.

When the required observations pass, payment becomes eligible for release under Accord's payment controls. Otherwise, it remains withheld for both parties to review. Each payment decision is linked to the terms and observations behind it.

[Explore the agreement](/use-cases/market-making) [Join as a project or a market maker →](/join)

Why it matters

Projects, market makers and exchanges keep pointing at the same gap.

Paraphrased from public sources, linked on each card.

- Kain Warwick Founder · Synthetix [Mar 2025](https://bitcoinist.com/disturbing-truth-about-crypto-market-makers/) Projects paid market makers $50k to $300k+ a month in the 2017 cycle. Many exercised their call options and dumped. **Accord** ties pay to the agreed spread, depth and two-sided quoting.

- Jelle Buth Co-founder · Enflux, market maker [Apr 2025](https://cointelegraph.com/magazine/market-maker-deals-quietly-killing-crypto-projects) Projects should set liquidity KPIs before they commit. In loan-option deals they are often missing or vague. **Accord** turns the KPIs into the payment conditions.

- LO:TECH Survey · commissioned by a market maker [Aug 2025](https://www.theblock.co/post/367243/global-survey-reveals-deep-mistrust-in-crypto-market-making-urgent-call-for-transparency) 52% of 2,000+ respondents do not trust market makers. The report recommends enforceable contracts. **Accord** lets attested observations decide each payment.

- Binance Exchange guidance · for listed projects [Mar 2026](https://finance.yahoo.com/markets/crypto/articles/binance-requests-market-maker-transparency-191855624.html) Projects must disclose their market maker's legal entity and contract terms to the exchange. **Accord** measures whether those terms were met.

> Illustrative monitor for a NEAR/USDC market-making agreement on Rhea's USDC/wNEAR pool. Approved conditions: spread at most 60 bps, at least 12,000 USDC of depth within 2% of the mid on each side, both sides quoted, 4 of 6 observation slots to pass. The pool is read at six times drawn inside the observer's enclave and each slot is attested; slot 3 fails with 9,820 USDC of depth. 5 of 6 pass, the period is eligible and 18,500 USDC is settled to halcyon-mm.near in USDC on NEAR.

The demonstration

One agreement, from private negotiation to controlled payment.

[Watch the walkthrough →](/demo)

- 01 Negotiate Two agents propose terms within different confidential mandates.

- 02 Approve Both parties approve the exact agreement version, including the recipient and the evidence requirements.

- 03 Observe The agreed observer submits a result bound to that agreement and payment period.

- 04 Hold Missing or failing evidence leaves the payment ineligible.

- 05 Attack An injected message tells the agent to change the recipient. The agent attempts it; the contract refuses it.

- 06 Pay Valid evidence and the remaining controls permit the scheduled payment to the approved recipient.

The same controls run a second agreement type in the demonstration: a vendor milestone, paid only after the buyer explicitly accepts the delivery.

Scope The demonstration proves condition-linked payment, not account-level performance attribution. Public order-book observations measure the venue's liquidity, not the hired market maker's own contribution. Verification using the market maker's authenticated account data is planned.

How it works

## How a deal room works.

- `01` · Sealed Each company sets its limits in the browser and seals them. Only the sealed mandate and its commitment hash go on NEAR; the other side never sees the numbers.

- `02` · Attested The Sealed Table negotiates inside an attested enclave; code checks the result against both mandates' limits; the terms are recorded with an attestation anyone can verify.

- `03` · Executing Both companies approve, and the buyer funds the agreement's USDC escrow on NEAR. The agent holds one key for one method; a payment must match the approved milestone, amount and recipient, or it is refused and recorded.

- `04` · Settled Payments complete under the agreed conditions, people decide the exceptions, and the record remains.

Why now

## An agent’s instructions can change. Its payment authority stays within the approved rules.

Losses reported to the FBI in 2025[1](/research#ic3-2025)

$20.9B

Up from `$6.9B` in 2021[2](/research#ic3-2023)

Business email compromise, 2025[1](/research#ic3-2025)

$3.0B

24,768 complaints about messages that redirect or request a payment.

Complaints that referenced AI, 2025[1](/research#ic3-2025)

22,364

`$893M` in losses. The FBI notes that AI-made content is getting harder to detect and easier to make.

Source: FBI Internet Crime Complaint Center, Internet Crime Reports for [2025](https://www.ic3.gov/AnnualReport/Reports/2025_IC3Report.pdf) and [2023](https://ic3.gov/annualreport/reports/2023_ic3report.pdf).

Agents now read the messages. In May 2026, a wallet bot paid an attacker tokens then valued at $150,000 to $174,000 after an AI model on X translated a reply written in Morse code into a transfer instruction.[3](/research#grok-bankr-incident) The UK's National Cyber Security Centre warns that prompt injection "may never be totally mitigated" and recommends deterministic safeguards outside the model.[4](/research#ncsc-prompt-injection) In Accord, the contract is that safeguard: it checks every payment against the approved terms and the authorised recipient.

Worst case

The most a hijacked agent can do is make a payment you already approved, to the recipient you already accepted, when it falls due.

Where each attack stops · the agent is assumed to follow every message it reads

- BEC ASI01 goal hijack What the agent does Asks to pay the new account Where it stops **Agreement controls** destination is not the authorised recipient Result `ERR_PAYEE_MISMATCH` nothing sent

Not stopped by the contract: a person approving the wrong terms, or a payment the terms already allow. Those stay with people, on the record.

Where each attack stops. Each attack ends at a check in code; the tags give the closest entry in the OWASP Top 10 for Agentic Applications.[5](/research#owasp-agentic-2026)

Try to move the money ↓

> Illustrative: the demonstration agent's inbox. A message with new bank details and an urgent invoice are both refused by the contract with their reasons; the scheduled payment to the authorised recipient goes through.

## Try to move the money.

When the demonstration opens, its agent's inbox is public. Send it new bank details, an urgent invoice or an instruction from the chief executive; the agent is deliberately literal and will act on it, and your attempt appears in the public refusal log with the contract's reason. Revocation is shown exactly: the agent's only key is deleted in one transaction, and anything it signs afterwards is rejected by the network before it reaches the contract.

[Preview the demonstration](/try)

Privacy and control

## What stays private, what is public, and what Accord does not do.

##### Private to each company

Its mandate (on chain only as ciphertext) and the negotiation; only the terms, hashes and an attestation leave the enclave.

##### Visible to both companies

The approved terms, the schedule, every payment, exception and refusal.

##### Public

The payment schedule the contract enforces, the authorised recipient and the payments themselves, as with any stablecoin payment.

##### No recall

Accord does not reverse a payment once it is made; revocation stops the agent, and a payment already made went to the authorised recipient at the approved amount.

##### Not legal identity

It does not verify that a company legally exists; Payee establishes control of a domain and approval by the recipient's authority.

##### Not fairness or truth

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

###### Who can see my mandate?

###### What if the model negotiates badly?

###### What if my agent is tricked?

###### Our vendor really did change banks. What happens?

###### How does a market-making agreement decide whether a period pays?

###### Can we use Accord if the other side has no agent?

###### What does it cost?

###### Is it live?
