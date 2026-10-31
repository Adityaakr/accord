# Accord research page: copy and editorial tables

Part A is the visitor-facing copy for `/research`. Part B is the claim-to-source table and the list of claims removed or qualified, for editorial review; it is not rendered. Every source below was opened and read on 29 or 30 Oct 2026; where only an abstract or a documentation page was read, that is stated.

---

## Part A. Visitor-facing copy

### Header

**The research behind the room.**

Accord's design responds to problems that researchers, standards bodies, payment networks and practitioners have documented. This page lists those sources by the question each one answers, states what each establishes and what it does not, and names the design decision it informs. Findings are the authors' own; the connection to Accord is ours. Nothing here implies that any author or organisation has reviewed or endorsed Accord.

---

### How often do these attacks happen, and are they growing?

**Internet Crime Report 2025.** FBI Internet Crime Complaint Center, published April 2026. Annual statistics from complaints filed with the FBI. https://www.ic3.gov/AnnualReport/Reports/2025_IC3Report.pdf

What it establishes: 1,008,597 complaints and $20.877 billion in reported losses in 2025, 26 percent more than in 2024. Business email compromise accounted for 24,768 complaints and $3,046,598,558 in losses. 22,364 complaints referenced artificial intelligence, with $893,346,472 in losses, and the report notes that "AI-enabled synthetic content is becoming increasingly difficult to detect and easier to make".

What it does not establish: losses that were never reported, or anything about agents that pay under agreed terms. The largest category in the total is investment fraud; the category closest to Accord's case is business email compromise, which the homepage shows separately.

Design decision it informs: in Accord a payment destination never comes from a message, and a payment request that does not match the approved terms is refused.

**Internet Crime Report 2023.** FBI Internet Crime Complaint Center, published March 2024. https://ic3.gov/annualreport/reports/2023_ic3report.pdf

What it establishes: reported losses of $6.9 billion in 2021, $10.3 billion in 2022 and $12.5 billion in 2023. With the 2025 report's $16.6 billion for 2024 and $20.877 billion for 2025, these are the five values in the homepage chart.

What it does not establish: whether the growth reflects more crime, more reporting, or both.

Design decision it informs: none on its own; it dates the trend shown on the homepage.

**The Grok and Bankr incident, as reported.** Cointelegraph Magazine, Dilip Kumar Patairya, 13 May 2026, https://cointelegraph.com/magazine/grok-bankr-wallet-free-nft-prompt-injection; Giskard, 7 May 2026, https://giskard.ai/knowledge/how-grok-got-prompt-injected-an-x-user-drained-150-000-from-an-ai-wallet. Secondary reporting of a public incident.

What it establishes: in May 2026 an attacker replied to Grok on X with a message in Morse code. Grok translated it; the translation was an instruction to send 3 billion DRB tokens to the attacker's address, and Bankr's bot executed it from a Grok-linked wallet, on Base according to Cointelegraph. Reported values run from $150,000 to $174,000, and Giskard reports that about 80 percent was later returned. Both accounts say that an NFT sent to the wallet beforehand had widened what the bot was allowed to do.

What it does not establish: anything about Accord. Bankr is a general-purpose wallet bot, not a system for paying under agreed terms, and nothing here suggests that Accord would have prevented the incident.

Design decision it informs: in Accord the output of a model is never a payment instruction; only a request that matches the approved terms and the authorised recipient is signed.

---

### Why keep negotiating mandates confidential?

**NDAI Agreements.** Matthew Stephenson, Andrew Miller, Xyn Sun, Bhargav Annem and Rohan Parikh. arXiv 2502.07924, submitted 11 February 2025. Theoretical paper with a bargaining model. https://arxiv.org/abs/2502.07924

What it establishes: in a model where a seller must reveal an information good to be paid and risks having it taken, delegating disclosure and payment to tamper-proof programs (AI agents in trusted execution environments) lets the seller reveal safely; the authors describe such solutions as an "ironclad NDA". Because real agents err, the model adds budget caps and acceptance thresholds and finds they preserve most of the gains.

What it does not establish: that arbitrary commercial negotiations become fair, optimal or fully private; the results are for a modelled hold-up problem, with full guarantees only within what the enclave can secure.

Design decision it informs: the Sealed Table runs the negotiation inside an attested enclave, hard limits from both mandates are checked by code, and both companies approve before anything binds.

**NEAR AI Brings Private USDC Stablecoin Payments to the Agentic Economy.** NEAR AI press release, 14 May 2026. Commercial announcement by the host of the hackathon Accord is built for. https://www.prnewswire.co.uk/news-releases/near-ai-brings-private-usdc-stablecoin-payments-to-the-agentic-economy-302772315.html

What it establishes: the announcement quotes NEAR's co-founder, Illia Polosukhin: "Businesses will not deploy agents that expose their revenue, counterparties, or financial operations on a public ledger." It argues for confidential stablecoin settlement as a baseline for business agents.

What it does not establish: that Accord provides confidential settlement. Accord keeps the negotiation and both mandates confidential; the payment schedule and the payments are public on NEAR. The statement is cited as motivation for the broader problem, and the part Accord addresses today is the negotiation, not the settlement. Nothing here implies that NEAR or its co-founder has reviewed or endorsed Accord.

Design decision it informs: the Sealed Table's confidentiality, and the honesty of the privacy boundary stated on the Security page.

**Efficient Mechanisms for Bilateral Trading.** Roger Myerson and Mark Satterthwaite. Journal of Economic Theory 29(2), 1983. Theoretical result. https://doi.org/10.1016/0022-0531(83)90048-0

What it establishes: when a buyer and a seller each hold private information about value, no trading mechanism is at once efficient, incentive-compatible, individually rational and budget-balanced.

What it does not establish: that any particular mechanism, including a sealed negotiation, produces fair or efficient outcomes.

Design decision it informs: Accord presents the Sealed Table as a mechanism both sides commit to in advance, and makes no claim about efficiency or fairness of the resulting terms.

**Bargaining under Incomplete Information.** Kalyan Chatterjee and William Samuelson. Operations Research 31(5), 1983. Theoretical model of the sealed-bid double auction. https://doi.org/10.1287/opre.31.5.835

What it establishes: the properties of a mechanism in which both parties submit sealed bids and trade occurs at a price between them, under private information.

Design decision it informs: the lineage of the Sealed Table.

**How Well Can LLMs Negotiate? NegotiationArena Platform and Analysis.** Federico Bianchi, Patrick John Chia, Mert Yuksekgonul, Jacopo Tagliabue, Dan Jurafsky and James Zou. arXiv 2402.05863, 8 February 2024; presented at ICML 2024. Experimental benchmark. https://arxiv.org/abs/2402.05863

What it establishes: in benchmark negotiations between language-model agents, behavioural tactics change outcomes; agents that pretended to be desperate improved their payoffs by about 20 percent against a standard GPT-4 counterpart, and the agents showed measurable irrational behaviours.

What it does not establish: savings or outcomes for real commercial negotiations; the setting is a benchmark with modelled scenarios.

Design decision it informs: deterministic code checks every proposal against both mandates' hard limits before it leaves the enclave, a pair of mandates is negotiated once, and people approve the terms.

---

### How does an agent demonstrate its authority?

**The missing infrastructure for AI agents: 5 ways blockchains can help.** Christian Crowley, Christian Catalini, Andrew Hall, Elizabeth Harkavy, Noah Levine and Sean Neville. a16z Frontier, 16 April 2026. Expert essay. https://a16zfrontier.com/posts/article/5-ways-blockchains-help-ai-agents/

What it establishes: the authors' argument that agents acting as economic actors need portable identity tied to a principal and its permissions, transparent execution logs so "people can check whether their delegate stayed within bounds", and scoped delegation tools that "let users define, at the smart contract level, what an agent can and cannot do".

What it does not establish: a standard, a measurement, or any view of Accord.

Design decision it informs: the buyer's agent holds a function-call key restricted to one method on one contract; the approved terms are its whole authority; every refusal is a public event.

**Announcing the Agent Payments Protocol (AP2).** Google Cloud, 16 September 2025. Commercial announcement of an open protocol. https://cloud.google.com/blog/products/ai-machine-learning/announcing-agents-to-payments-ap2-protocol

What it establishes: AP2 defines signed mandates (an intent mandate capturing the user's instructions, a cart mandate recording the approved items and price) as verifiable credentials, so that a payment carries evidence of the user's authorisation, with more than 60 collaborating organisations.

What it does not establish: a negotiation protocol between two parties' agents, on-chain enforcement, or any statement about keeping a buyer's limits from the merchant (the announcement does not address it).

Design decision it informs: Accord's approved terms are an authorisation record both companies sign; they could be expressed in a mandate format such as AP2's. AP2 is prior art for the receipt; Accord's contribution is how the terms are reached and how they are enforced on the funds.

**Access keys.** NEAR Protocol documentation. Technical documentation. https://docs.near.org/concepts/protocol/access-keys

What it establishes: NEAR accounts can hold function-call access keys restricted to named methods on a named contract, with an allowance that covers gas only.

Design decision it informs: the agent's key can call `act` on the agreement contract and nothing else, and can be deleted in one transaction.

---

### What should constrain an agent that follows malicious instructions?

**The lethal trifecta for AI agents.** Simon Willison, 16 June 2025. Practitioner essay. https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/

What it establishes: an agent that combines access to private data, exposure to untrusted content and the ability to communicate externally can be tricked by an attacker into sending that data to the attacker.

What it does not establish: anything about payments. Applying the reasoning to unauthorised payments (the ability to pay replaces the ability to exfiltrate) is Accord's design interpretation.

Design decision it informs: the demonstration agent is assumed to be compromised by whatever arrives in its inbox; the contract, not the agent, decides what can be paid.

**LLM01:2025 Prompt Injection.** OWASP Top 10 for LLM Applications, 2025. Security guidance from a standards body. https://genai.owasp.org/llmrisk/llm01-prompt-injection/

What it establishes: prompt injection is the first-ranked risk; "indirect prompt injections occur when an LLM accepts input from external sources, such as websites or files"; recommended mitigations include constraining model behaviour, enforcing privilege control and requiring human approval for high-risk actions.

What it does not establish: that any system eliminates prompt injection.

Design decision it informs: the agent's privileges are bounded by the contract (one key, one method, approved terms, authorised recipient), exceptions require human approval, and Accord does not claim to prevent injection, only to bound what it can cause.

**Prompt injection is not SQL injection (it may be worse).** UK National Cyber Security Centre, blog post, 8 December 2025, with the NCSC announcement "Mistaking AI vulnerability could lead to large-scale breaches", 10 December 2025. Guidance from a national cyber security authority. https://www.ncsc.gov.uk/blog-post/prompt-injection-is-not-sql-injection · https://www.ncsc.gov.uk/news/mistaking-ai-vulnerability-could-lead-to-large-scale-breaches

What it establishes: current language models "simply do not enforce a security boundary between instructions and data inside a prompt"; prompt injection "may never be totally mitigated in the way SQL injection attacks can be"; design protections should "focus more on deterministic (non-LLM) safeguards that constrain the actions" of the system.

What it does not establish: anything about payments or about Accord; the guidance is general.

Design decision it informs: Accord assumes the agent will be steered by what it reads and puts every payment decision in deterministic code: the contract's checks on each payment, and the Sealed Table's limit check on each proposal.

**OWASP Top 10 for Agentic Applications for 2026.** OWASP GenAI Security Project, 9 December 2025. Security framework, described by OWASP as globally peer-reviewed. https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/

What it establishes: ten risks specific to agents, among them agent goal hijack (ASI01), tool misuse and exploitation (ASI02), identity and privilege abuse (ASI03) and insecure inter-agent communication (ASI07).

What it does not establish: that any product addresses these risks. The tags in the homepage figure "Where each attack stops" are Accord's own mapping of each attack to the closest entry, not OWASP's.

Design decision it informs: least privilege for the agent's key, a check on every payment, and a limit check on every proposal exchanged between agents.

---

### How should payment destinations be established and changed?

**Business Email Compromise.** FBI Internet Crime Complaint Center, crime information page. Law-enforcement guidance. https://www.ic3.gov/CrimeInfo/BEC

What it establishes: business email compromise is "a sophisticated scam targeting both businesses and individuals performing a transfer of funds", typically through a compromised or spoofed business email account; the FBI advises confirming requests to change account information with the intended recipient through a secondary channel.

What it does not establish: figures on this page; the IC3 annual reports carry the statistics (see Part B).

Design decision it informs: in Accord a payment destination is never taken from a message. The recipient proves control of its domain, the recipient's own settlement authority approves the destination, the buyer accepts it, and a change requires a fresh proof, the authority's approval and a 24-hour delay.

**Confirmation of Payee.** Pay.UK. Live industry service, launched 2020. https://www.wearepay.uk/what-we-do/overlay-services/confirmation-of-payee/

What it establishes: "Confirmation of Payee (CoP) is an account name-checking service designed to help reduce misdirected payments", run before a payment is initiated; more than 300 organisations have implemented it and more than two million checks are completed every day; the Payment Systems Regulator mandated its expansion in 2024.

What it does not establish: anything about stablecoins, agents or domain control. CoP matches an account name at a bank; Payee binds a destination to a domain the recipient controls and an approval by the recipient's authority. The purpose is shared; the mechanism is different.

Design decision it informs: a recipient check is expected practice for human payments; Payee is the equivalent step for payments an agent requests.

---

### What evidence is sufficient to release a payment?

**Kraken WebSocket API v2, book channel.** Exchange documentation. https://docs.kraken.com/exchange/api-reference/spot-websocket-v2/book

What it establishes: a public order-book feed "describes the individual price levels in the book with aggregated order quantities at each level"; messages carry price and quantity only, with no account or order identifiers.

**Kraken WebSocket API v2, executions channel.** Exchange documentation. https://docs.kraken.com/exchange/api-reference/spot-websocket-v2/executions

What it establishes: the executions channel "streams order status and execution events for this account" and "contains account specific data, an authentication token is required".

What the pair does not establish: any integration or relationship between Accord and Kraken. The two pages are cited to show a distinction that holds at any venue: public order-book data describes aggregate market conditions, while attributing orders and fills to a participant requires that participant's authenticated account data.

Design decision it informs: Accord Atlas's observer reads public order-book data and therefore measures conditions, not contribution. The Accord Atlas page says so beside the claim. Account-attributed verification, using the market maker's authenticated feed inside the enclave, is planned and not implemented.

**How do designated market makers create value for small-caps?** Albert J. Menkveld and Ting Wang. Journal of Financial Markets 16(3), 571 to 603, 2013. Empirical event study of 74 Euronext stocks. https://doi.org/10.1016/j.finmar.2012.12.003

What it establishes: contracts in which a designated market maker guarantees a minimum liquidity supply for a fixed annual fee raised liquidity, lowered liquidity risk and produced an average abnormal return of 3.5 percent; the market makers traded more and took losses on high-spread days, when the obligation was likely binding.

What it does not establish: results for crypto venues or for agreements measured the way Accord Atlas measures them.

Design decision it informs: a liquidity agreement with a stated obligation is a known, valuable contract; Accord Atlas makes the obligation measurable each period and ties the retainer to the measurement.

**Market Making Contracts, Firm Value, and the IPO Decision.** Hendrik Bessembinder, Jia Hao and Kuncheng Zheng. Journal of Finance 70(5), 1997 to 2028, 2015. Theory with empirical discussion. https://doi.org/10.1111/jofi.12285

What it establishes: the authors argue that "firm value and welfare are improved by a contract where the firm engages a designated market maker", most of all when uncertainty about value and information asymmetry are high.

What it does not establish: how such contracts should be monitored or enforced.

Design decision it informs: the party paying for liquidity has a documented reason to pay; Accord's contribution is to pay against measured conditions rather than a report.

---

### Related approaches, and where each stops

Described from their own public material, as prior art rather than as competitors.

One-sided negotiation services such as Pactum negotiate for one company at scale. The Harvard Business Review case on Walmart (Remko Van Hoek, Michael DeWitt, Mary Lacity and Travis Johnson, 8 November 2022) reports the system "negotiating and closing agreements with 68% of suppliers approached"; Harvard's Program on Negotiation, drawing on the same authors, reports that the earlier Canada pilot with 89 suppliers "closed deals with 64% of the suppliers" in "an average of 11 days" (Katie Shonk, 28 July 2026). They address the case where one company runs the agent; Accord addresses the case where both do. https://hbr.org/2022/11/how-walmart-automated-supplier-negotiations · https://www.pon.harvard.edu/daily/negotiation-skills-daily/chatbot-negotiations-what-can-ai-do-for-you/

Agent custody and policy wallets such as OutLayer's custody product offer address allowlists, per-transaction and daily limits, approval thresholds and an instant freeze, configured by the wallet's owner. These are payer-side controls. Payee adds the recipient's side of the destination, and the two can be combined. https://app.outlayer.ai/docs/agent-custody

Signed payment mandates (Google's AP2, above) standardise the authorisation record between a user, an agent and a merchant, and are complementary to the approval step in a deal room.

Enclave-based negotiation prototypes, such as Dealproof from ETHGlobal New York, run agent negotiations inside a confidential virtual machine, with escrow release described as planned. Accord binds the enclave's output to on-chain commitments and to the authorised recipient. https://github.com/kkoci/Dealproof

Market-maker ratings, such as the Forgd leaderboard on DefiLlama, publish spread, depth and uptime scores from data firms share. They inform; they do not pay or withhold. https://cointelegraph.com/news/forgd-market-maker-leaderboard-defillama

### Limits of this page

Crime statistics count reported losses, not all losses. Theory is theory: the bargaining results describe models, not Accord's outcomes. Benchmarks are benchmarks: NegotiationArena does not predict a customer's savings. Equity-market studies are not crypto-market studies. Documentation shows what an interface provides, not that Accord integrates with it. The working product has to supply its own evidence, which is what the demonstration agreements and the refusal log are for.

---

## Part B. Editorial tables (not rendered)

### Claim-to-source table

| Claim on the site | Where | Source | Verification status |
| --- | --- | --- | --- |
| Delegating disclosure and payment to tamper-proof programs in TEEs lets a seller reveal without expropriation; budget caps limit agent error | Research card 1; research page | NDAI Agreements, arXiv 2502.07924 | Abstract read 29 Oct 2026; authors confirmed from the arXiv listing |
| Language-model agents raised payoffs by about 20% by feigning desperation; irrational behaviours quantified | Research page | NegotiationArena, arXiv 2402.05863 | Abstract read 29 Oct 2026; ICML 2024 venue from the ICML listing |
| "let users define, at the smart contract level, what an agent can and cannot do" | Research card 2; research page | a16z Frontier article, 16 Apr 2026 | Article read 29 Oct 2026; quotation verbatim; authors as listed |
| 74 Euronext small-caps; minimum liquidity supply for a fixed fee; 3.5% abnormal return; losses on high-spread days | Research card 3; research page | Menkveld and Wang 2013 | Abstract read 29 Oct 2026 via RePEc |
| "firm value and welfare are improved by a contract where the firm engages a designated market maker" | Research page | Bessembinder, Hao and Zheng 2015 | Abstract read 29 Oct 2026 via EconPapers; DOI 10.1111/jofi.12285 confirmed from the RePEc handle |
| Signed intent and cart mandates as verifiable credentials; 60+ organisations; no negotiation protocol; privacy of limits not addressed | Research page | Google Cloud AP2 announcement, 16 Sep 2025 | Announcement read 29 Oct 2026 |
| Function-call keys restricted to named methods, allowance covers gas | Research page | NEAR access keys documentation | Page read 29 Oct 2026: "Function-Call keys can only sign transactions calling a specific contract"; `method_names` sets the allowed methods; allowance is "the amount of NEAR allowed to be spent on gas" |
| The lethal trifecta definition and consequence | Research page | Willison, 16 Jun 2025 | Essay read 29 Oct 2026; the payments application is labelled as Accord's interpretation |
| Prompt injection is LLM01; indirect injection via external sources; mitigations | Research page | OWASP LLM01:2025 | Page read 29 Oct 2026 |
| BEC definition; confirm account changes through a secondary channel | Research page | FBI IC3 BEC page | Page read 29 Oct 2026 |
| CoP definition; launched 2020; 300+ organisations; 2m+ checks a day; PSR mandate 2024 | Research page | Pay.UK CoP page | Page read 29 Oct 2026 |
| Public book feed is aggregated price levels; executions feed is account-specific and authenticated | Research page | Kraken WebSocket v2 docs | Pages read 29 Oct 2026; cited as illustration, no integration |
| Walmart system closing with 68% of suppliers approached | Research page | HBR, 8 Nov 2022 | Article read 29 Oct 2026 |
| Walmart Canada pilot: 89 suppliers, closed with 64%, average 11 days | Research page | Harvard Program on Negotiation, Katie Shonk, 28 Jul 2026 | Article read 30 Oct 2026; figures attributed by PON to Van Hoek and co-authors |
| "Businesses will not deploy agents that expose their revenue, counterparties, or financial operations on a public ledger." | Research page only, with scope | NEAR AI press release, 14 May 2026 | Release read 30 Oct 2026; quotation verbatim; scope stated (confidential settlement is not what Accord provides) |
| OutLayer custody: allowlists, limits, approval thresholds, freeze, owner-configured | Research page | OutLayer agent custody docs | Page read 29 Oct 2026 |
| Dealproof: negotiation in a confidential VM; escrow planned | Research page | Dealproof repository | README read 29 Oct 2026 |
| Forgd leaderboard: spread, depth, uptime ratings from shared data | Research page | Cointelegraph, 5 Aug 2026 | Article read earlier in the project; re-open before publishing |
| Reported losses: $20.9B in 2025, up from $6.9B in 2021; chart values 6.9, 10.3, 12.5, 16.6, 20.9 ($B, 2021 to 2025) | Why now, tile 1 and chart | FBI IC3 Internet Crime Reports 2025 and 2023 | 2025 PDF read on ic3.gov 30 Oct 2026 ($20.877B, 1,008,597 complaints, up 26% on 2024; chart prints $16.6B for 2024); 2023 PDF read 30 Oct 2026 (2021 to 2023 values printed as text) |
| Business email compromise: $3.0B and 24,768 complaints in 2025 | Why now, tile 2 | FBI IC3 Internet Crime Report 2025 | PDF read 30 Oct 2026: $3,046,598,558 |
| 22,364 complaints referenced AI, $893M in losses; AI-made content harder to detect and easier to make | Why now, tile 3 | FBI IC3 Internet Crime Report 2025, "Artificial Intelligence (AI) Used in Cybercrime" | PDF read 30 Oct 2026: $893,346,472; sentence paraphrased on the homepage, verbatim on this page |
| May 2026: a Morse-code reply translated into a transfer instruction; a wallet bot sent tokens valued at $150,000 to $174,000 | Why now body; research page | Cointelegraph Magazine, 13 May 2026; Giskard, 7 May 2026 | Both read 30 Oct 2026; amounts differ by source, so the site gives the range; companies named on this page only |
| Prompt injection "may never be totally mitigated"; deterministic safeguards outside the model | Why now body; research page | NCSC blog, 8 Dec 2025; NCSC announcement, 10 Dec 2025 | Both read 30 Oct 2026; quotations verbatim |
| OWASP agentic tags ASI01, ASI02, ASI03, ASI07 | Figure "Where each attack stops"; research page | OWASP Top 10 for Agentic Applications for 2026, 9 Dec 2025 | Release page read 30 Oct 2026; risk names confirmed from two secondary summaries (Giskard, Speakeasy); the PDF itself was not opened |
| Worst case: a hijacked agent can at most make an approved payment to the accepted recipient when it falls due | Why now | The product itself (the `act` checks in `GOAL.md`) | Must be demonstrated by `make attack` and `make revoke` |
| Everything the homepage says the product does | Homepage | The product itself | Must be demonstrated by the build; not a research claim |

### Claims removed or qualified because the evidence did not support them

- "Did your market maker earn this payment?" replaced by "liquidity agreements paid on measured conditions", and on 30 Oct, with the rename to Accord Atlas, by "agreed liquidity conditions, enforced payment rules": venue-level order-book data cannot attribute liquidity to one participant (Kraken book versus executions documentation makes the distinction plain).
- "Nobody has shipped the sensor inside the contract", "no row names the room" and similar claims that no one else has solved the problem: removed; unverifiable and unnecessary.
- Statements attributed to NEAR HACKATHON judges (Haseeb Qureshi, Eddy Lazzarin, Kain Warwick, Stepan Gershuni, Mert Mumtaz) removed from the site. The NEAR AI announcement quoting Illia Polosukhin stays on the research page only, as the host's published statement, with its scope made explicit: it argues for confidential settlement, which Accord does not provide. The a16z perspective is attributed to the actual authors of the a16z Frontier article rather than to a different a16z figure.
- The "75% of suppliers preferred it" figure stays off the site: supplier-preference numbers differ between reports (the PON article gives 83% of suppliers that closed deals speaking favourably in post-pilot interviews), so the site cites only the agreement rates and days to close from the named authors' own case.
- Business email compromise described as the FBI's "largest" loss category: corrected to second-largest behind investment fraud. The figure ($3.046B, 24,768 complaints, 2025) was confirmed against the IC3 2025 report PDF on 30 Oct 2026 and now appears on the homepage with its year.
- "Cyber attacks are rising and Accord fixes them" was not used: Accord does not stop cyber attacks in general. The Why now section shows where each attack on a paying agent ends and states the worst case instead.
- The FBI's total is shown as exactly what it is, all losses reported to IC3, most of which are not business email compromise; the category that matches Accord's case is shown in its own tile.
- The May 2026 incident: the companies are named on this page only, the reported amounts differ ($150,000 to $174,000) so the range is given, and the site never says Accord would have prevented it. An earlier internal note citing a blog post and "about $175K" was replaced by the two published accounts.
- Market-manipulation incidents (DWF, Mantra, Movement) and enforcement actions (DOJ, MiCA) removed from the product pages as evidence for Accord Atlas: they document a problem in the market, not that Accord Atlas would have prevented them.
- Walmart figures of 2,000 suppliers, about 3% savings and 75% supplier preference (Fox Business, 2023) replaced by the HBR figure of 68% of suppliers approached, which comes from the named authors' own case.
- Gartner's cancellation forecast, the Visa and Mastercard launch quotations, Cointelegraph's market-maker reporting and the Vertice SaaS inflation figures removed from the site: commercial announcements and secondary reporting that do not bear on a design decision. They remain in the internal references file.
- "Negotiated blind", "neutral ground", "executable agreements" and "the agreement layer" retired as positioning language (misreadings, or an existing project's category).
- Live counters removed from the hero; the only counters are in the security demonstration and report its own events.
- Comparison table naming competitors removed from the homepage; related approaches are described on the research page from their own material.
