Built on NEAR

# The private deal room and control plane for agent-to-agent commerce.

Accord turns private negotiations between AI agents into enforceable payment controls. Each agent negotiates within its company’s confidential mandate, both companies approve the terms, and the contract then decides what the buyer’s agent can authorise, who it can pay, how much, and on what evidence.

[Request early access](/join) [Explore Atlas](/atlas)

[Accord Atlas The first application on Accord Liquidity agreements with measurable payment conditions](/atlas)

> Illustrative Accord product: the deal-room list, an Accord Atlas market-making agreement shown as its seven-step pipeline from sealed mandates to the USDC transfer on NEAR, and the agreement's activity: a refused payment, a missed observation slot and a settled period.

###### Sealed Table

Agents negotiate in confidence. Only the agreed terms and a proof come out.

###### Agreement controls

The contract enforces the terms. Any payment that doesn't match is refused.

###### Payee

Payments go only to a recipient the vendor has proven and the buyer accepted.

###### Accord Atlas

The first app on Accord: liquidity agreements paid on measured conditions.

## Built for commerce in stablecoins.

Tied to agreed spread, depth and uptime

- Market-making retainers

- Vendor contracts

- Treasury payouts

- Selling to AI agents

- Agent-to-agent services

Deal room · NEAR/USDC retainer, Q1 Illustrative

Renew our NEAR/USDC market-making retainer: up to 20,000 USDC a period, spread under 50 bps, at least 10,000 USDC of depth within 1%, 90% uptime. Our agent must not overpay or pay the wrong desk.

18,500 USDC a period. Paid on measured liquidity.

- Terms agreed inside the Sealed Table; both mandates stayed sealed Confidential negotiation · passed

- Your agent's key can call `act()` and nothing else Agent permissions · passed

- Any amount, period or recipient off the terms is refused Payment controls · passed

- Paying `halcyon-mm.testnet` only, bound to halcyon.example Recipient authorisation · passed

- Each period's payment becomes eligible when 5 of 6 slots pass Conditional settlement · passed

Deal room · Vendor invoices, October run Illustrative

Process October's vendor invoices, 214 in the queue. Pay each one only if it matches its purchase order and a confirmed delivery, only to the vendor's proven address, and hold anything that doesn't.

212 invoices cleared. Two held for you.

- Rates per vendor agreed in the Sealed Table; your limits stayed sealed Confidential negotiation · passed

- Your agent can only pay invoices matched to an approved order Agent permissions · passed

- Duplicates, overcharges and changed bank details are refused Payment controls · passed

- Each vendor is paid only at the address bound to its domain Recipient authorisation · passed

- Paid as one batch once delivery is confirmed; two mismatches held Conditional settlement · passed

Deal room · Grant G-114, wallet SDK Illustrative

Fund grant G-114 for the wallet SDK: up to 45,000 USDC in three tranches, each only after our committee accepts the milestone report. Pay the team's own address and nobody else.

42,000 USDC in three tranches. Released on acceptance.

- Grant size and tranches agreed in the Sealed Table; your maximum stayed sealed Confidential negotiation · passed

- Your agent can only pay these three tranches Agent permissions · passed

- A changed amount or an unscheduled tranche is refused Payment controls · passed

- Paying `sdkworks.testnet` only, bound to sdkworks.example Recipient authorisation · passed

- Each tranche becomes payable when the committee accepts the report Conditional settlement · passed

Deal room · Data API subscription Illustrative

A buyer's agent wants our on-chain data API. Hold at least 2,000 USDC a month for six months, and start only once the agreement is funded.

2,150 USDC a month. Funded before work starts.

- Price agreed in the Sealed Table; your floor stayed sealed Confidential negotiation · passed

- The buyer approved on-chain; its agent can only pay these terms Agent permissions · passed

- Neither agent can change the schedule alone Payment controls · passed

- Paid only to your account `yourco.testnet`, bound to yourco.example Recipient authorisation · passed

- Work starts once 12,900 USDC is funded; then paid monthly on schedule Conditional settlement · passed

Deal room · Inference credits Illustrative

Buy inference for our research agent from a provider's agent: up to 500 USDC a week, never more than 2,000 USDC in total, and stop when I revoke.

450 USDC a week. Capped at 1,800.

- Price agreed agent to agent in the Sealed Table; both limits stayed sealed Confidential negotiation · passed

- Your agent can only pay 450 USDC a week Agent permissions · passed

- Anything over the weekly amount or the 1,800 USDC cap is refused Payment controls · passed

- Paying `inferhub.testnet` only, bound to inferhub.example Recipient authorisation · passed

- Each week becomes payable on schedule, until you revoke Conditional settlement · passed

The first application built on Accord

## Accord Atlas: liquidity agreements with measurable payment conditions.

Built on Accord, Atlas links a market maker's recurring retainer to the spread, depth and uptime both sides agreed. An attested observer samples the venue's public order book on the agreed schedule. When the agreed number of observations pass, the payment is released; when they don't, it is held for both sides to decide.

[See the Atlas demonstration](/atlas) [Join as a project or a market maker →](/join)

Why Atlas

Projects, market makers and exchanges keep pointing at the same gap.

- Kain Warwick Mar 2025 Synthetix founder Market makers cost projects $50k to $300k+ a month in the 2017 cycle. Good ones aim for tight spreads; many exercised their call options and dumped. Payment follows the spread, depth and uptime both sides agreed. [[45] Source · paraphrase](https://bitcoinist.com/disturbing-truth-about-crypto-market-makers/)

- Jelle Buth Apr 2025 Co-founder, Enflux (a market maker) Projects should define liquidity KPIs from order-book activity before they commit. In loan-option deals those KPIs are often missing or vague. The KPIs become the agreement's payment conditions. [[46] Source · paraphrase](https://cointelegraph.com/magazine/market-maker-deals-quietly-killing-crypto-projects)

- LO:TECH survey Aug 2025 Commissioned by LO:TECH, a market maker 52% of 2,000+ respondents in 98 countries do not trust market makers. The report recommends enforceable contracts and real-time dashboards. Attested observations of the order book decide each payment. [[47] Source · paraphrase](https://www.theblock.co/post/367243/global-survey-reveals-deep-mistrust-in-crypto-market-making-urgent-call-for-transparency)

- Binance Mar 2026 Market-maker guidance Projects must disclose their market maker's details, legal entity and contract terms to the listing platform. Disclosure shows what was agreed. Atlas measures whether it was met. [[48] Source · paraphrase](https://finance.yahoo.com/markets/crypto/articles/binance-requests-market-maker-transparency-191855624.html)

> Illustrative Accord Atlas monitor for a NEAR/USDC market-making retainer. Approved conditions: spread at most 40 bps, at least 12,000 USDC of depth within 1%, 95% uptime, 5 of 6 observation slots to pass. The venue's public order book is sampled six times and each slot attested; slot 3 fails with a 47 bps spread and 9,820 USDC of depth. 5 of 6 pass, the period is eligible and 18,500 USDC is settled to halcyon-mm.near in USDC on NEAR.

Scope Atlas measures the market's condition on the venue, not which participant supplied it. Attributing liquidity to the market maker's own account is planned.

How it works

## How a deal room works.

- 01 Sealed Each company seals its mandate in the browser; only a commitment hash is recorded.

- 02 Attested The Sealed Table negotiates inside an attested enclave; code checks the result against both mandates' limits; the terms are recorded with an attestation anyone can verify.

- 03 Executing Both companies approve, and the buyer funds the agreement's USDC escrow on NEAR. The agent holds one key for one method; a payment must match the approved milestone, amount and recipient, or it is refused and recorded.

- 04 Settled Payments complete under the agreed conditions, people decide the exceptions, and the record remains.

Why now

## An agent can be talked into paying. The contract cannot.

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

- BEC ASI01 goal hijack What the agent does Asks to pay the new account Where it stops **Agreement controls** destination is not the authorised recipient Result `ERR_PAYEE_MISMATCH` nothing paid

Not stopped by the contract: a person approving the wrong terms, or a payment the terms already allow. Those stay with people, on the record.

Where each attack stops. Each attack ends at a check in code; the tags give the closest entry in the OWASP Top 10 for Agentic Applications.[5](/research#owasp-agentic-2026)

Try to move the money ↓

> Illustrative: the demonstration agent's inbox. A message with new bank details and an urgent invoice are both refused by the contract with their reasons; the scheduled payment to the authorised recipient goes through.

## Try to move the money.

When the demonstration opens, its agent's inbox is public. Send it new bank details, an urgent invoice or an instruction from the chief executive; the agent is deliberately literal and will act on it. The contract refuses, and your attempt appears in the public refusal log with the reason. Revocation removes the agent's key and stops every new payment at once.

[Preview the demonstration](/try)

Privacy and control

## What stays private, what is public, and what Accord does not do.

##### Private to each company

Its mandate and the negotiation; only hashes leave the enclave.

##### Visible to both companies

The approved terms, the schedule, every payment, exception and refusal.

##### Public

The payment schedule the contract enforces and the USDC transfers on NEAR, as with any stablecoin payment.

##### No recall

Revocation is not a recall: it stops every new payment at once, and a payment already made stays made.

##### Not legal identity

It does not verify that a company legally exists; Payee establishes control of a domain and approval by the recipient's authority.

##### Not fairness or truth

It does not prove that a negotiation was fair or that external data is truthful; attestation shows which code ran on which inputs.

Settlement happens on NEAR itself: the contract moves the USDC, so every payment is checked and recorded in one place. Mainnet follows an audit.

[Security documentation →](/security)

Research

## The research behind the room.

- 01 Informs Sealed Table Tamper-proof programs let a seller disclose without being expropriated. Stephenson, Miller et al. · NDAI Agreements · arXiv 2025 · [Source](https://arxiv.org/abs/2502.07924)

- 02 Informs Agreement controls Define at the contract level what an agent can and cannot do. Crowley, Catalini, Hall et al. · a16z Frontier · 2026 · [Source](https://a16zfrontier.com/posts/article/5-ways-blockchains-help-ai-agents/)

- 03 Informs Accord Atlas Paid liquidity obligations raised liquidity and firm value. Menkveld and Wang · Journal of Financial Markets · 2013 · [Source](https://doi.org/10.1016/j.finmar.2012.12.003)

[arxiv.org/abs/2502.07924 Informs Sealed Table](https://arxiv.org/abs/2502.07924) [a16zfrontier.com Informs Agreement controls](https://a16zfrontier.com/posts/article/5-ways-blockchains-help-ai-agents/) [ideas.repec.org · J. Financial Markets Informs Accord Atlas](https://doi.org/10.1016/j.finmar.2012.12.003)

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

Pricing

## Clear pricing for agreements, controls and monitoring.

Our planned pricing combines agreement management with the negotiation and monitoring your business needs. No percentage-based Accord fee on payment amounts.

Developer preview Coming soon

Free testnet access

Explore private negotiation, payment controls and agreement records using test funds.

[Request early access](/join?role=partner)

Accord Teams Planned

Subscription

Manage business agreements with confidential negotiation, approval workflows and controlled payments.

[Discuss your requirements](/join?role=buyer)

Accord Atlas Planned

Per monitored market

Connect agreed liquidity conditions to payment eligibility, with a defined observation schedule and verifiable records.

[Discuss an Atlas pilot](/join?role=project)

Production prices and included allowances will be published before launch. Network and third-party fees may apply.

FAQ

## Questions.

###### Who can see my mandate?

###### What if the model negotiates badly?

###### What if my agent is tricked?

###### Our vendor really did change banks. What happens?

###### How does Accord Atlas decide whether a period pays?

###### Can we use Accord if the other side has no agent?

###### What does it cost?

###### Is it live?

## Choose your seat at the table.

Accord is pre-launch: the testnet build is under way and early access is by request. Tell us which side you are on.

[Token project Pay your market maker on measured conditions Put the retainer behind the spread, depth and uptime you agreed, with Accord Atlas. Request early access](/join?role=project) [Market maker Get paid for the liquidity you already provide Negotiate terms without showing your floor, and get paid when the agreed conditions are measured. Join as a market maker](/join?role=market-maker) [Integration partner Build on Accord Bring your agents to a deal room, or add a deal type with its own mandate schema and release rule. Talk to us about integrating](/join?role=partner)

[Explore Atlas](/atlas)

Runs on NEAR testnet. Mainnet follows an audit.
