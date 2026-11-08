Research

# The research behind the room.

Accord's design responds to problems that researchers, standards bodies, payment networks and practitioners have documented. This page lists those sources by the question each one answers, states what each establishes and what it does not, and names the design decision it informs. Findings are the authors' own; the connection to Accord is ours. Nothing here implies that any author or organisation has reviewed or endorsed Accord.

6 questions, 25 sources. Choose a floor to read its sources.

Floor 06 · Attacks

## How often do these attacks happen, and are they growing?

[ic3.gov PDF Internet Crime Report 2025](https://www.ic3.gov/AnnualReport/Reports/2025_IC3Report.pdf)

### Internet Crime Report 2025.

FBI Internet Crime Complaint Center, published April 2026. Annual statistics from complaints filed with the FBI. [Source ↗](https://www.ic3.gov/AnnualReport/Reports/2025_IC3Report.pdf)

What it establishes

1,008,597 complaints and $20.877 billion in reported losses in 2025, 26 percent more than in 2024. Business email compromise accounted for 24,768 complaints and $3,046,598,558 in losses. 22,364 complaints referenced artificial intelligence, with $893,346,472 in losses, and the report notes that "AI-enabled synthetic content is becoming increasingly difficult to detect and easier to make".

More

#### What it does not establish

losses that were never reported, or anything about agents that pay under agreed terms. The largest category in the total is investment fraud; the category closest to Accord's case is business email compromise, which the homepage shows separately.

#### Design decision it informs

in Accord a payment destination never comes from a message, and a payment request that does not match the approved terms is refused.

[ic3.gov PDF Internet Crime Report 2023](https://ic3.gov/annualreport/reports/2023_ic3report.pdf)

### Internet Crime Report 2023.

FBI Internet Crime Complaint Center, published March 2024. [Source ↗](https://ic3.gov/annualreport/reports/2023_ic3report.pdf)

What it establishes

reported losses of $6.9 billion in 2021, $10.3 billion in 2022 and $12.5 billion in 2023. With the 2025 report's $16.6 billion for 2024 and $20.877 billion for 2025, these are the five values in the homepage chart.

More

#### What it does not establish

whether the growth reflects more crime, more reporting, or both.

#### Design decision it informs

none on its own; it dates the trend shown on the homepage.

[financialprofessionals.org Document 2026 AFP Payments Fraud and Control Survey](https://www.financialprofessionals.org/about/learn-more/press-releases/Details/over-75-percent-of-us-firms-experienced-payments-fraud-in-2025-while-ai-adoption-for-fraud-mitigation-lags/)

### 2026 AFP Payments Fraud and Control Survey.

Association for Financial Professionals, press release, 14 April 2026. Survey of 465 treasury practitioners at US organisations, conducted January 2026, reporting 2025. [Source ↗](https://www.financialprofessionals.org/about/learn-more/press-releases/Details/over-75-percent-of-us-firms-experienced-payments-fraud-in-2025-while-ai-adoption-for-fraud-mitigation-lags/)

What it establishes

74% of organisations were affected by business email compromise in 2025, and 76% of US organisations experienced attempted or actual payments fraud.

More

#### What it does not establish

how much was lost, or anything about payments made by agents. It is a survey of practitioners, not a count of incidents.

#### Design decision it informs

a message can never change where an Accord payment goes; the recipient is fixed when both companies approve the terms.

[chainalysis.com Document Crypto theft in 2025](https://www.chainalysis.com/blog/crypto-hacking-stolen-funds-2026/)

### Crypto theft in 2025.

Chainalysis, blog post, 18 December 2025, ahead of its 2026 Crypto Crime Report. [Source ↗](https://www.chainalysis.com/blog/crypto-hacking-stolen-funds-2026/)

What it establishes

over $3.4 billion was stolen in crypto from January through early December 2025, with the February compromise of Bybit alone accounting for $1.5 billion.

More

#### What it does not establish

that agents were involved; most of the value came from a few large service compromises.

#### Design decision it informs

agreement funds sit in each agreement's own account with no full-access key, and only the contract can send them.

[deloitte.com Document Generative AI is expected to magnify the risk of deepfakes and other fraud in banking](https://www.deloitte.com/us/en/insights/industry/financial-services/deepfake-banking-fraud-risk-on-the-rise.html)

### Generative AI is expected to magnify the risk of deepfakes and other fraud in banking.

Deloitte Center for Financial Services, 29 May 2024. A forecast built from the FBI's fraud categories under conservative, base and aggressive adoption scenarios. [Source ↗](https://www.deloitte.com/us/en/insights/industry/financial-services/deepfake-banking-fraud-risk-on-the-rise.html)

What it establishes

Deloitte predicts generative AI could enable fraud losses of $40 billion in the United States by 2027, from $12.3 billion in 2023, a compound annual growth rate of 32%.

More

#### What it does not establish

a measured loss. It is the forecast of one firm, and its conservative scenario is lower.

#### Design decision it informs

Accord does not try to detect convincing fakes; a payment that does not match the approved terms is refused however convincing the request.

[cointelegraph.com](https://cointelegraph.com/magazine/grok-bankr-wallet-free-nft-prompt-injection)

### The Grok and Bankr incident, as reported.

Cointelegraph Magazine, Dilip Kumar Patairya, 13 May 2026, [cointelegraph.com/magazine/grok-bankr-wallet-free-nft-prompt-injection](https://cointelegraph.com/magazine/grok-bankr-wallet-free-nft-prompt-injection); Giskard, 7 May 2026, [giskard.ai/knowledge/how-grok-got-prompt-injected-an-x-user-drained-150-000-from-an-ai-wallet](https://giskard.ai/knowledge/how-grok-got-prompt-injected-an-x-user-drained-150-000-from-an-ai-wallet). Secondary reporting of a public incident.

What it establishes

in May 2026 an attacker replied to Grok on X with a message in Morse code. Grok translated it; the translation was an instruction to send 3 billion DRB tokens to the attacker's address, and Bankr's bot executed it from a Grok-linked wallet, on Base according to Cointelegraph. Reported values run from $150,000 to $174,000, and Giskard reports that about 80 percent was later returned. Both accounts say that an NFT sent to the wallet beforehand had widened what the bot was allowed to do.

More

#### What it does not establish

anything about Accord. Bankr is a general-purpose wallet bot, not a system for paying under agreed terms, and nothing here suggests that Accord would have prevented the incident.

#### Design decision it informs

in Accord the output of a model is never a payment instruction; only a request that matches the approved terms and the authorised recipient is signed.

Floor 05 · Confidential mandates

## Why keep negotiating mandates confidential?

[arxiv.org](https://arxiv.org/abs/2502.07924)

### NDAI Agreements.

Matthew Stephenson, Andrew Miller, Xyn Sun, Bhargav Annem and Rohan Parikh. arXiv 2502.07924, submitted 11 February 2025. Theoretical paper with a bargaining model. [Source ↗](https://arxiv.org/abs/2502.07924)

What it establishes

in a model where a seller must reveal an information good to be paid and risks having it taken, delegating disclosure and payment to tamper-proof programs (AI agents in trusted execution environments) lets the seller reveal safely; the authors describe such solutions as an "ironclad NDA". Because real agents err, the model adds budget caps and acceptance thresholds and finds they preserve most of the gains.

More

#### What it does not establish

that arbitrary commercial negotiations become fair, optimal or fully private; the results are for a modelled hold-up problem, with full guarantees only within what the enclave can protect.

#### Design decision it informs

the Sealed Table runs the negotiation inside an attested enclave, hard limits from both mandates are checked by code, and both companies approve before anything binds.

[prnewswire.co.uk](https://www.prnewswire.co.uk/news-releases/near-ai-brings-private-usdc-stablecoin-payments-to-the-agentic-economy-302772315.html)

### NEAR AI Brings Private USDC Stablecoin Payments to the Agentic Economy.

NEAR AI press release, 14 May 2026. Commercial announcement by the host of the hackathon Accord is built for. [Source ↗](https://www.prnewswire.co.uk/news-releases/near-ai-brings-private-usdc-stablecoin-payments-to-the-agentic-economy-302772315.html)

What it establishes

the announcement quotes NEAR's co-founder, Illia Polosukhin: "Businesses will not deploy agents that expose their revenue, counterparties, or financial operations on a public ledger." It argues for confidential stablecoin settlement as a baseline for business agents.

More

#### What it does not establish

that Accord provides confidential settlement. Accord keeps the negotiation and both mandates confidential; the payment schedule and the USDC transfers are public on NEAR. The statement is cited as motivation for the broader problem, and the part Accord addresses today is the negotiation, not the settlement. Nothing here implies that NEAR or its co-founder has reviewed or endorsed Accord.

#### Design decision it informs

the Sealed Table's confidentiality, and the honesty of the privacy boundary stated on the Security page.

[doi.org](https://doi.org/10.1016/0022-0531(83)90048-0)

### Efficient Mechanisms for Bilateral Trading.

Roger Myerson and Mark Satterthwaite. Journal of Economic Theory 29(2), 1983. Theoretical result. [Source ↗](https://doi.org/10.1016/0022-0531(83)90048-0)

What it establishes

when a buyer and a seller each hold private information about value, no trading mechanism is at once efficient, incentive-compatible, individually rational and budget-balanced.

More

#### What it does not establish

that any particular mechanism, including a sealed negotiation, produces fair or efficient outcomes.

#### Design decision it informs

Accord presents the Sealed Table as a mechanism both sides commit to in advance, and makes no claim about efficiency or fairness of the resulting terms.

[doi.org](https://doi.org/10.1287/opre.31.5.835)

### Bargaining under Incomplete Information.

Kalyan Chatterjee and William Samuelson. Operations Research 31(5), 1983. Theoretical model of the sealed-bid double auction. [Source ↗](https://doi.org/10.1287/opre.31.5.835)

What it establishes

the properties of a mechanism in which both parties submit sealed bids and trade occurs at a price between them, under private information.

More

#### Design decision it informs

the lineage of the Sealed Table.

[arxiv.org](https://arxiv.org/abs/2402.05863)

### How Well Can LLMs Negotiate? NegotiationArena Platform and Analysis.

Federico Bianchi, Patrick John Chia, Mert Yuksekgonul, Jacopo Tagliabue, Dan Jurafsky and James Zou. arXiv 2402.05863, 8 February 2024; presented at ICML 2024. Experimental benchmark. [Source ↗](https://arxiv.org/abs/2402.05863)

What it establishes

in benchmark negotiations between language-model agents, behavioural tactics change outcomes; agents that pretended to be desperate improved their payoffs by about 20 percent against a standard GPT-4 counterpart, and the agents showed measurable irrational behaviours.

More

#### What it does not establish

savings or outcomes for real commercial negotiations; the setting is a benchmark with modelled scenarios.

#### Design decision it informs

deterministic code checks every proposal against both mandates' hard limits before it leaves the enclave, a pair of mandates is negotiated once, and people approve the terms.

Floor 04 · Agent authority

## How does an agent demonstrate its authority?

[a16zfrontier.com](https://a16zfrontier.com/posts/article/5-ways-blockchains-help-ai-agents/)

### The missing infrastructure for AI agents: 5 ways blockchains can help.

Christian Crowley, Christian Catalini, Andrew Hall, Elizabeth Harkavy, Noah Levine and Sean Neville. a16z Frontier, 16 April 2026. Expert essay. [Source ↗](https://a16zfrontier.com/posts/article/5-ways-blockchains-help-ai-agents/)

What it establishes

the authors' argument that agents acting as economic actors need portable identity tied to a principal and its permissions, transparent execution logs so "people can check whether their delegate stayed within bounds", and scoped delegation tools that "let users define, at the smart contract level, what an agent can and cannot do".

More

#### What it does not establish

a standard, a measurement, or any view of Accord.

#### Design decision it informs

the buyer's agent holds a function-call key restricted to one method on one contract; the approved terms are its whole authority; every refusal is a public event.

[cloud.google.com](https://cloud.google.com/blog/products/ai-machine-learning/announcing-agents-to-payments-ap2-protocol)

### Announcing the Agent Payments Protocol (AP2).

Google Cloud, 16 September 2025. Commercial announcement of an open protocol. [Source ↗](https://cloud.google.com/blog/products/ai-machine-learning/announcing-agents-to-payments-ap2-protocol)

What it establishes

AP2 defines signed mandates (an intent mandate capturing the user's instructions, a cart mandate recording the approved items and price) as verifiable credentials, so that a payment carries evidence of the user's authorisation, with more than 60 collaborating organisations.

More

#### What it does not establish

a negotiation protocol between two parties' agents, on-chain enforcement, or any statement about keeping a buyer's limits from the merchant (the announcement does not address it).

#### Design decision it informs

Accord's approved terms are an authorisation record both companies sign; they could be expressed in a mandate format such as AP2's. AP2 is prior art for the receipt; Accord's contribution is how the terms are reached and how they are enforced on the funds.

[docs.near.org](https://docs.near.org/protocol/access-keys)

### Access keys.

NEAR Protocol documentation. Technical documentation. [Source ↗](https://docs.near.org/protocol/access-keys)

What it establishes

NEAR accounts can hold function-call access keys restricted to named methods on a named contract, with an allowance that covers gas only.

More

#### Design decision it informs

the agent's key can call `act` on the agreement contract and nothing else, and can be deleted in one transaction.

Floor 03 · Malicious instructions

## What should constrain an agent that follows malicious instructions?

[simonwillison.net](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/)

### The lethal trifecta for AI agents.

Simon Willison, 16 June 2025. Practitioner essay. [Source ↗](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/)

What it establishes

an agent that combines access to private data, exposure to untrusted content and the ability to communicate externally can be tricked by an attacker into sending that data to the attacker.

More

#### What it does not establish

anything about payments. Applying the reasoning to unauthorised payments (the ability to pay replaces the ability to exfiltrate) is Accord's design interpretation.

#### Design decision it informs

the demonstration agent is assumed to be compromised by whatever arrives in its inbox; the contract, not the agent, decides what can be paid.

[genai.owasp.org](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)

### LLM01:2025 Prompt Injection.

OWASP Top 10 for LLM Applications, 2025. Security guidance from a standards body. [Source ↗](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)

What it establishes

prompt injection is the first-ranked risk; "indirect prompt injections occur when an LLM accepts input from external sources, such as websites or files"; recommended mitigations include constraining model behaviour, enforcing privilege control and requiring human approval for high-risk actions.

More

#### What it does not establish

that any system eliminates prompt injection.

#### Design decision it informs

the agent's privileges are bounded by the contract (one key, one method, approved terms, authorised recipient), exceptions require human approval, and Accord does not claim to prevent injection, only to bound what it can cause.

[claude.com Document Piloting Claude in Chrome](https://claude.com/blog/claude-for-chrome)

### Piloting Claude in Chrome.

Anthropic, 25 August 2025 (updated November and December 2025). The model maker's own red-teaming of a browser agent, run in autonomous mode. [Source ↗](https://claude.com/blog/claude-for-chrome)

What it establishes

across 123 prompt-injection test cases representing 29 attack scenarios, deliberate attacks succeeded 23.6% of the time without safety mitigations and 11.2% of the time with them.

More

#### What it does not establish

the rate for any other model, product or later version; Anthropic reports further improvements after this test.

#### Design decision it informs

Accord does not rely on the model resisting every injection; the contract checks each payment whatever the agent was told.

[ncsc.gov.uk](https://www.ncsc.gov.uk/blog-post/prompt-injection-is-not-sql-injection)

### Prompt injection is not SQL injection (it may be worse).

UK National Cyber Security Centre, blog post, 8 December 2025, with the NCSC announcement "Mistaking AI vulnerability could lead to large-scale breaches", 10 December 2025. Guidance from a national cyber security authority. [Source ↗](https://www.ncsc.gov.uk/blog-post/prompt-injection-is-not-sql-injection)[Source 2 ↗](https://www.ncsc.gov.uk/news/mistaking-ai-vulnerability-could-lead-to-large-scale-breaches)

What it establishes

current language models "simply do not enforce a security boundary between instructions and data inside a prompt"; prompt injection "may never be totally mitigated in the way SQL injection attacks can be"; design protections should "focus more on deterministic (non-LLM) safeguards that constrain the actions" of the system.

More

#### What it does not establish

anything about payments or about Accord; the guidance is general.

#### Design decision it informs

Accord assumes the agent will be steered by what it reads and puts every payment decision in deterministic code: the contract's checks on each payment, and the Sealed Table's limit check on each proposal.

[genai.owasp.org Document OWASP Top 10 for Agentic Applications for 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/)

### OWASP Top 10 for Agentic Applications for 2026.

OWASP GenAI Security Project, 9 December 2025. Security framework, described by OWASP as globally peer-reviewed. [Source ↗](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/)

What it establishes

ten risks specific to agents, among them agent goal hijack (ASI01), tool misuse and exploitation (ASI02), identity and privilege abuse (ASI03) and insecure inter-agent communication (ASI07).

More

#### What it does not establish

that any product addresses these risks. The tags in the homepage figure "Where each attack stops" are Accord's own mapping of each attack to the closest entry, not OWASP's.

#### Design decision it informs

least privilege for the agent's key, a check on every payment, and a limit check on every proposal exchanged between agents.

Floor 02 · Payment destinations

## How should payment destinations be established and changed?

[ic3.gov](https://www.ic3.gov/CrimeInfo/BEC)

### Business Email Compromise.

FBI Internet Crime Complaint Center, crime information page. Law-enforcement guidance. [Source ↗](https://www.ic3.gov/CrimeInfo/BEC)

What it establishes

business email compromise is "a sophisticated scam targeting both businesses and individuals performing a transfer of funds", typically through a compromised or spoofed business email account; the FBI advises confirming requests to change account information with the intended recipient through a secondary channel.

More

#### What it does not establish

figures on this page; the IC3 annual reports carry the statistics.

#### Design decision it informs

in Accord a payment destination is never taken from a message. The recipient proves control of its domain, the recipient's own settlement authority approves the destination, the buyer accepts it, and a change requires a fresh proof, the authority's approval and a 24-hour delay.

[wearepay.uk](https://www.wearepay.uk/what-we-do/overlay-services/confirmation-of-payee/)

### Confirmation of Payee.

Pay.UK. Live industry service, launched 2020. [Source ↗](https://www.wearepay.uk/what-we-do/overlay-services/confirmation-of-payee/)

What it establishes

"Confirmation of Payee (CoP) is an account name-checking service designed to help reduce misdirected payments", run before a payment is initiated; more than 300 organisations have implemented it and more than two million checks are completed every day; the Payment Systems Regulator mandated its expansion in 2024.

More

#### What it does not establish

anything about stablecoins, agents or domain control. CoP matches an account name at a bank; Payee binds a destination to a domain the recipient controls and an approval by the recipient's authority. The purpose is shared; the mechanism is different.

#### Design decision it informs

a recipient check is expected practice for human payments; Payee is the equivalent step for payments an agent requests.

Floor 01 · Evidence to release

## What evidence is sufficient to release a payment?

[docs.kraken.com](https://docs.kraken.com/exchange/api-reference/spot-websocket-v2/book)

### Kraken WebSocket API v2, book channel.

Exchange documentation. [Source ↗](https://docs.kraken.com/exchange/api-reference/spot-websocket-v2/book)

What it establishes

a public order-book feed "describes the individual price levels in the book with aggregated order quantities at each level"; messages carry price and quantity only, with no account or order identifiers.

[docs.kraken.com](https://docs.kraken.com/exchange/api-reference/spot-websocket-v2/executions)

### Kraken WebSocket API v2, executions channel.

Exchange documentation. [Source ↗](https://docs.kraken.com/exchange/api-reference/spot-websocket-v2/executions)

What it establishes

the executions channel "streams order status and execution events for this account" and "contains account specific data, an authentication token is required".

[doi.org](https://doi.org/10.1016/j.finmar.2012.12.003)

### How do designated market makers create value for small-caps?

Albert J. Menkveld and Ting Wang. Journal of Financial Markets 16(3), 571 to 603, 2013. Empirical event study of 74 Euronext stocks. [Source ↗](https://doi.org/10.1016/j.finmar.2012.12.003)

What it establishes

contracts in which a designated market maker guarantees a minimum liquidity supply for a fixed annual fee raised liquidity, lowered liquidity risk and produced an average abnormal return of 3.5 percent; the market makers traded more and took losses on high-spread days, when the obligation was likely binding.

More

#### What it does not establish

results for crypto venues or for agreements measured the way Accord's market-making agreements measure them.

#### Design decision it informs

a liquidity agreement with a stated obligation is a known, valuable contract; a market-making agreement in Accord makes the obligation measurable each period and ties the retainer to the measurement.

[doi.org](https://doi.org/10.1111/jofi.12285)

### Market Making Contracts, Firm Value, and the IPO Decision.

Hendrik Bessembinder, Jia Hao and Kuncheng Zheng. Journal of Finance 70(5), 1997 to 2028, 2015. Theory with empirical discussion. [Source ↗](https://doi.org/10.1111/jofi.12285)

What it establishes

the authors argue that "firm value and welfare are improved by a contract where the firm engages a designated market maker", most of all when uncertainty about value and information asymmetry are high.

More

#### What it does not establish

how such contracts should be monitored or enforced.

#### Design decision it informs

the party paying for liquidity has a documented reason to pay; Accord's contribution is to pay against measured conditions rather than a report.

#### What the pair does not establish

any integration or relationship between Accord and Kraken. The two pages are cited to show a distinction that holds at any venue: public order-book data describes aggregate market conditions, while attributing orders and fills to a participant requires that participant's authenticated account data.

#### Design decision it informs

The market-making agreement's observer reads public order-book data and therefore measures conditions, not contribution. The market-making page says so beside the claim. Account-attributed verification, using the market maker's authenticated feed inside the enclave, is planned and not implemented.

## Related approaches, and where each stops

Described from their own public material, as prior art rather than as competitors.

One-sided negotiation services such as Pactum negotiate for one company at scale. The Harvard Business Review case on Walmart (Remko Van Hoek, Michael DeWitt, Mary Lacity and Travis Johnson, 8 November 2022) reports the system "negotiating and closing agreements with 68% of suppliers approached"; Harvard's Program on Negotiation, drawing on the same authors, reports that the earlier Canada pilot with 89 suppliers "closed deals with 64% of the suppliers" in "an average of 11 days" (Katie Shonk, 28 July 2026). They address the case where one company runs the agent; Accord addresses the case where both do. [hbr.org/2022/11/how-walmart-automated-supplier-negotiations](https://hbr.org/2022/11/how-walmart-automated-supplier-negotiations) · [www.pon.harvard.edu/daily/negotiation-skills-daily/chatbot-negotiations-what-can-ai-do-for-you/](https://www.pon.harvard.edu/daily/negotiation-skills-daily/chatbot-negotiations-what-can-ai-do-for-you/)

Agent custody and policy wallets such as OutLayer's custody product offer address allowlists, per-transaction and daily limits, approval thresholds and an instant freeze, configured by the wallet's owner. These are payer-side controls. Payee adds the recipient's side of the destination, and the two can be combined. [app.outlayer.ai/docs/agent-custody](https://app.outlayer.ai/docs/agent-custody)

Signed payment mandates (Google's AP2, above) standardise the authorisation record between a user, an agent and a merchant, and are complementary to the approval step in a deal room.

Enclave-based negotiation prototypes, such as Dealproof from ETHGlobal New York, run agent negotiations inside a confidential virtual machine, with escrow release described as planned. Accord binds the enclave's output to on-chain commitments and to the authorised recipient. [github.com/kkoci/Dealproof](https://github.com/kkoci/Dealproof)

Market-maker ratings, such as the Forgd leaderboard on DefiLlama, publish spread, depth and uptime scores from data firms share. They inform; they do not pay or withhold. [cointelegraph.com/news/forgd-market-maker-leaderboard-defillama](https://cointelegraph.com/news/forgd-market-maker-leaderboard-defillama)

## Limits of this page

Crime statistics count reported losses, not all losses. Theory is theory: the bargaining results describe models, not Accord's outcomes. Benchmarks are benchmarks: NegotiationArena does not predict a customer's savings. Equity-market studies are not crypto-market studies. Documentation shows what an interface provides, not that Accord integrates with it. The working product has to supply its own evidence, which is what the demonstration agreements and the refusal log are for.
