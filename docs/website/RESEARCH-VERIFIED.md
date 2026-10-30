# Accord website: research verification pass

Verified 29 October 2026. Each source below was opened and read in the original (raw page text pulled with curl, or the arXiv HTML full text where the PDF could not be rendered locally). Nothing here is taken from snippets, summaries or memory. Where a quote is marked verbatim, the exact wording appears on the page as fetched on this date. Where a page could not be opened, that is stated.

Method notes:
- arXiv PDFs downloaded fine but could not be rendered here (no poppler). Both papers were therefore read in full from arXiv's HTML full-text renders (`arxiv.org/html/2502.07924v1`, `arxiv.org/html/2402.05863v1`), which carry the same v1 content.
- The Pay.UK page returned HTTP 403 to a browser user-agent and HTTP 200 to a plain curl user-agent; the 200 response was read.
- The a16z crypto URL 301-redirects to `a16zfrontier.com`; the redirected page was read.
- The two Kraken docs pages are JavaScript-rendered but the server-side HTML contains the full documentation text, which was read.

---

## 1. NDAI Agreements

1. **Title, authors, date.** "NDAI Agreements". Matthew Stephenson, Andrew Miller, Xyn Sun, Bhargav Annem, Rohan Parikh. Submitted 11 Feb 2025 (v1, the only version; 21 pages, 1 figure). arXiv:2502.07924, econ.TH with cs.AI cross-list. Affiliations shown in the HTML render: Pantera Capital; Teleport, Flashbots; Caltech; Nous Research, University of Chicago Booth. (The HTML header prints "This version: August 24, 2026", which is a render-date artefact; arXiv lists only v1 of 11 Feb 2025.)
2. **Type and URL.** Theoretical economics paper (game-theoretic model, no implementation, no experiment). https://arxiv.org/abs/2502.07924 ; https://arxiv.org/pdf/2502.07924
3. **What it establishes.** It formalises the Arrow/Nelson disclosure paradox as a seller-buyer bargaining game over an information good under hold-up: once the seller discloses anything, the buyer can expropriate it without paying, so in the baseline the seller discloses nothing and trade fails. It proposes that both parties delegate to AI agents running inside a trusted execution environment, with the buyer's agent given a budget cap and the seller's agent an acceptance threshold; the TEE releases the good and the payment only on mutual accept and otherwise deletes the session. Theorem 1 shows that with perfectly aligned agents and sufficient TEE security the unique equilibrium is full disclosure and efficient trade. Section 5 and Appendix C show the mechanism stays strictly better than the baseline for both sides under random agent errors, because the budget cap truncates overpayment and the threshold rejects underpayment.
4. **What it does NOT establish.** No system was built or tested; it is a model. It assumes TEEs are fully secure ("Hardware trust assumptions. We assume TEEs are fully secure."). Agent errors are assumed idiosyncratic and mean-zero. It is about a single information good (an invention) sold once, not about recurring commercial negotiation, liquidity services or payment routing. It does not claim anything about LLM behaviour empirically. The "max securable value" estimate (about $1bn) in Appendix D rests on "somewhat ad hoc assumptions" by the authors' own description.
5. **Accord decision it informs.** Sealed Table (two-sided private inputs inside a confidential execution path; disclosure conditional on agreement). Agreement controls (hard budget cap and acceptance threshold enforced by code rather than by the model).
6. **Verbatim quotes.**
   - "By delegating the disclosure and payment decisions to tamper-proof programs, the seller can safely reveal the invention without risking expropriation, achieving full disclosure and an efficient ex post transfer."
   - "Recognizing that real AI agents are imperfect, we model "agent errors" in payments or disclosures and demonstrate that budget caps and acceptance thresholds suffice to preserve most of the efficiency gains."

---

## 2. NegotiationArena

1. **Title, authors, date.** "How Well Can LLMs Negotiate? NegotiationArena Platform and Analysis". Federico Bianchi, Patrick John Chia, Mert Yuksekgonul, Jacopo Tagliabue, Dan Jurafsky, James Zou. Submitted 8 Feb 2024 (v1, the only version). arXiv:2402.05863, cs.AI with cs.CL and cs.GT. Keywords line reads "Machine Learning, ICML".
2. **Type and URL.** Experimental result (open-source benchmark plus LLM-vs-LLM experiments). https://arxiv.org/abs/2402.05863 ; https://arxiv.org/pdf/2402.05863
3. **What it establishes.** The paper introduces a framework with three two-agent scenarios (resource exchange, multi-turn ultimatum, seller-and-buyer) and runs GPT-4 (gpt-4-1106-preview), GPT-3.5 (gpt-3.5-turbo-1106), Claude 2 and Claude 2.1 against each other, 60 negotiations per ordered pair per scenario, temperature 0.7. Prompting GPT-4 to "fake being desperate" or to be "cunning" raised its win rate and payoff in every game tested (80 games per pair); the abstract gives the headline figure that pretending to be desperate improves payoffs by 20% against standard GPT-4. The "cunning" persona in the ultimatum game won 82% of decisive games but had roughly the same average payoff as default (about 49) because it caused more no-deal outcomes. Irrational behaviours quantified: anchoring (Spearman 0.716 between first offer and final price); "split-the-difference" habits; a buyer whose willingness to pay was an order of magnitude above cost counter-offered a price above the seller's ask 41% of the time versus 11% for a default buyer; outcomes shifted with the absolute size of the stake (Player 1 took almost 79% when splitting $10,000,000,000); GPT-3.5 misread its own goal in 20% of its sell/buy games, and its errors degraded GPT-4's play ("babysitting").
4. **What it does NOT establish.** Models are from late 2023; results are not claimed to transfer to current models. The 20% figure is for one persona against one model in the paper's own synthetic games, not a general law. Prompts are acknowledged as "slightly biased towards Claude". No real money, no real counterparties, no human-in-the-loop condition was tested. It does not study privacy, TEEs, payments or prompt injection as such; the adversarial-attack remark is a hypothesis stated by the authors, not a tested result.
5. **Accord decision it informs.** Agreement controls (hard limits checked by deterministic code rather than left to model compliance; human approval). Sealed Table (an agent that can be talked into giving ground is a reason to keep walk-away values out of the dialogue).
6. **Verbatim quotes.**
   - "For example, by pretending to be desolate and desperate, LLMs can improve their payoffs by 20% when negotiating against the standard GPT-4."
   - "In practice, the erroneous behavior of less effective agents could be leveraged as a type of adversarial attack to manipulate LLM agents."

---

## 3. Google, Agent Payments Protocol (AP2)

1. **Title, authors, date.** "Powering AI commerce with the new Agent Payments Protocol (AP2)". Stavan Parikh (VP/GM, Payments, Google) and Rao Surapaneni (VP/GM, Business Applications Platform, Google Cloud). Dated September 17, 2025 on the page. (The old brief says 16 Sep 2025; the blog page as fetched shows 17 September. Use the page date or "September 2025".)
2. **Type and URL.** Commercial announcement (vendor blog). https://cloud.google.com/blog/products/ai-machine-learning/announcing-agents-to-payments-ap2-protocol
3. **What it establishes.** Google announced AP2 as an open protocol, usable as an extension of A2A and alongside MCP, for initiating agent-led payments across payment types. It frames three problems: authorization, authenticity and accountability. Its core construct is the Mandate: an Intent Mandate captures the user's request and conditions (price limits, timing); a Cart Mandate is signed on approval of a specific cart and records exact items and price; the chain ends by linking the payment method to the Cart Mandate. Mandates are described as cryptographically signed and backed by verifiable credentials. The page states collaboration with "more than 60 organizations" and lists examples (Adyen, American Express, Ant International, Coinbase, Etsy, Forter, Intuit, JCB, Mastercard, Mysten Labs, PayPal, Revolut, Salesforce, ServiceNow, UnionPay International, Worldpay). It also announces an "A2A x402 extension" for crypto payments built with Coinbase, Ethereum Foundation and MetaMask.
4. **What it does NOT establish.** It is a consumer-to-merchant purchase model: a human principal instructs one agent to buy from a merchant. It does not describe two-party negotiation, how terms were reached, confidentiality of either party's limits, or any enforcement that terms were honoured. The page does not define a "Payment Mandate" as a named object; it only describes linking the payment method to the Cart Mandate. Adoption numbers are "collaborating with", not deployments or transaction volume.
5. **Accord decision it informs.** Agreement controls (signed, auditable record of what was authorised is an industry direction, so Accord's approved-mandate record should be comparable in spirit). Payee (AP2 does not cover payee verification; that gap is where Payee sits). Sealed Table (AP2 standardises the receipt, not the negotiation).
6. **Verbatim quotes.**
   - "AP2 builds trust by using Mandates—tamper-proof, cryptographically-signed digital contracts that serve as verifiable proof of a user's instructions."
   - "This complete sequence—from intent, to cart, to payment—creates a non-repudiable audit trail that answers the critical questions of authorization and authenticity, providing a clear foundation for accountability."

---

## 4. a16z crypto, "The missing infrastructure for AI agents: 5 ways blockchains can help"

1. **Title, authors, date.** "The missing infrastructure for AI agents: 5 ways blockchains can help". Byline as shown: Christian Crowley, Christian Catalini, Andrew Hall, Elizabeth Harkavy, Noah Levine, and Sean Neville. Confirmed. Dated 04.16.26 (16 April 2026). Published on a16zfrontier.com (the a16zcrypto.com URL redirects there).
2. **Type and URL.** Expert opinion (venture-firm essay; carries the standard a16z disclaimer that views are those of the individuals and third-party data was not independently verified). https://a16zcrypto.com/posts/article/5-ways-blockchains-help-ai-agents/ (redirects to https://a16zfrontier.com/posts/article/5-ways-blockchains-help-ai-agents/)
3. **What it establishes.** Five arguments, each a section heading: (1) Identity for non-humans: agents lack a portable, verifiable way to prove who they represent, what they are permitted to do and how they get paid; the authors call this "KYA (know your agent)". (2) Governing AI-run systems: real authority over agents needs enforceable guarantees in the system itself, including records of what an agent did and assurance a provider cannot change its instructions underneath the user. (3) Filling gaps in traditional payment systems: stablecoins and HTTP-embedded payment rails (x402, MPP) for "headless" merchants that processors struggle to underwrite. (4) Repricing trust: when execution is cheap, verification becomes the scarce input; receipts and provenance should travel with settlement. (5) Preserving user control: scoped delegation frameworks let users define at the smart-contract level what an agent can and cannot do.
4. **What it does NOT establish.** It is advocacy by investors, not a study. Figures in it (non-human identities "roughly 100 to 1", x402 "roughly $1.6 million per month", NEAR Intents "more than $15 billion in cumulative DEX volume") are the authors' or third parties' numbers and are flagged as unverified by the firm's own disclaimer; do not re-use them as facts. It does not discuss confidential negotiation, TEEs or payee verification. It is not the same piece as the Eddy Lazzarin item cited in the old brief.
5. **Accord decision it informs.** Agreement controls (scoped, smart-contract-level permissions for an agent). Glassbook (verification as the scarce input; receipts travelling with settlement). Payee (identity and permission proof between agents).
6. **Verbatim quotes.**
   - "There is still no broadly adopted, interoperable way for one agent to prove to another who it represents, what it's allowed to do, and how it gets paid."
   - "When intelligence is cheap, what becomes expensive? Verification."
   - (Additional, user-control) "Scoped delegation frameworks — such as MetaMask's Delegation Toolkit, Coinbase's AgentKit and agentic wallets, and Merit Systems' AgentCash — let users define, at the smart contract level, what an agent can and cannot do."

---

## 5. Simon Willison, "The lethal trifecta for AI agents"

1. **Title, authors, date.** "The lethal trifecta for AI agents: private data, untrusted content, and external communication". Simon Willison. Posted 16 June 2025, 1:20 pm.
2. **Type and URL.** Expert opinion (practitioner blog post; the author coined the term "prompt injection"). https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/
3. **What it establishes.** It names three capabilities whose combination makes an agent exploitable: access to private data, exposure to untrusted content, and the ability to communicate externally. The mechanism is that LLMs follow instructions found in any content they process and cannot reliably rank instructions by origin. He lists production systems where this class of exploit was reported (Microsoft 365 Copilot, GitHub's MCP server, GitLab Duo, and a dated list back to April 2023) and says vendors usually fixed them by closing the exfiltration path. He states no 100% reliable prevention is known, is "deeply suspicious" of guardrail products claiming 95% detection, and says the only safe course for end users combining tools is to avoid the trifecta.
4. **What it does NOT establish.** It is about data exfiltration, not payments; the "swap exfiltrate for pay" reading is Accord's extension, not his. It is an argument from reported incidents, not a measured prevalence figure. He does not say the problem is unsolvable for application developers; he points to design-pattern research (quoting another paper: "once an LLM agent has ingested untrusted input, it must be constrained so that it is impossible for that input to trigger any consequential actions") as help for developers but not for end users.
5. **Accord decision it informs.** Agreement controls (untrusted content must not be able to trigger consequential actions; deterministic checks outside the model). Payee (external communication that moves money is the "ability to communicate externally" leg). Sealed Table (the private data leg is the counterparties' limits).
6. **Verbatim quotes.**
   - "If your agent combines these three features, an attacker can easily trick it into accessing your private data and sending it to that attacker."
   - "Here's the really bad news: we still don't know how to 100% reliably prevent this from happening."
   - Definition as written (list items): "Access to your private data", "Exposure to untrusted content", "The ability to externally communicate in a way that could be used to steal your data".

---

## 6. OWASP, LLM01:2025 Prompt Injection

1. **Title, authors, date.** "LLM01:2025 Prompt Injection", OWASP Top 10 for LLM Applications 2025 (OWASP Gen AI Security Project). No author byline or publication date on the page; footer copyright 2025 OWASP Foundation, CC BY-SA 4.0.
2. **Type and URL.** Implemented standard / industry guidance (community-maintained risk list). https://genai.owasp.org/llmrisk/llm01-prompt-injection/
3. **What it establishes.** Defines prompt injection as user prompts altering LLM behaviour or output in unintended ways, including inputs not visible to humans. Distinguishes direct injection (the user's own prompt) from indirect injection (instructions carried in external content the model ingests, such as websites or files). Lists impacts including unauthorised access to functions, executing commands in connected systems and manipulating critical decision-making. Gives seven mitigation strategies and states up front that fool-proof prevention is unclear.
4. **What it does NOT establish.** It is guidance, not a measured result; no incidence data. It does not rank mitigations by effectiveness. It is generic to LLM applications, not specific to payments or negotiation.
5. **Accord decision it informs.** Agreement controls (mitigations 2, 4, 5 and 6 map directly to deterministic validation, least privilege in code, human approval for high-risk actions and segregating external content). Payee (a payee change is a "high-risk action").
6. **Verbatim quotes.**
   - Indirect injection: "Indirect prompt injections occur when an LLM accepts input from external sources, such as websites or files. The content may have in the external content data that when interpreted by the model, alters the behavior of the model in unintended or unexpected ways."
   - Preface to mitigations: "Given the stochastic influence at the heart of the way models work, it is unclear if there are fool-proof methods of prevention for prompt injection."
   - Mitigation 2: "Specify clear output formats, request detailed reasoning and source citations, and use deterministic code to validate adherence to these formats."
   - Mitigation 4: "Provide the application with its own API tokens for extensible functionality, and handle these functions in code rather than providing them to the model. Restrict the model's access privileges to the minimum necessary for its intended operations."
   - Mitigation 5: "Implement human-in-the-loop controls for privileged operations to prevent unauthorized actions."
   - Mitigation 6: "Separate and clearly denote untrusted content to limit its influence on user prompts."

---

## 7. FBI IC3, Business Email Compromise

1. **Title, authors, date.** "Business Email Compromise (BEC)", Internet Crime Complaint Center (FBI). No date or byline on the page.
2. **Type and URL.** Official guidance page (law-enforcement crime information). https://www.ic3.gov/CrimeInfo/BEC
3. **What it establishes.** Defines BEC as a scam targeting businesses and individuals performing a transfer of funds, typically by compromising legitimate business email accounts through social engineering or intrusion, resulting in an unauthorised transfer. Its first protection tip is to verify requests for changes in account information with the intended recipient through a secondary channel or two-factor authentication. Incident response: contact the originating bank at once to request recall or reversal and a Hold Harmless Letter, and file a complaint with IC3.
4. **What it does NOT establish.** This page carries no dollar totals, complaint counts or year figures; the $3.046B / 24,768-complaint numbers in the old brief are from the IC3 annual report, which was not re-verified in this pass. The page does not use the phrase "payment redirection" or describe vendor impersonation in detail; the closest wording is "requests for changes in account information".
5. **Accord decision it informs.** Payee (the human-world control for a changed payee is out-of-band verification with the intended recipient; Payee is the agent-world equivalent).
6. **Verbatim quotes.**
   - "Business Email Compromise (BEC) is a sophisticated scam targeting both businesses and individuals performing a transfer of funds."
   - "Use secondary channels or two-factor authentication to verify requests for changes in account information with the intended recipient."

---

## 8. Pay.UK, Confirmation of Payee

1. **Title, authors, date.** "Confirmation of Payee", Pay.UK (Our Work, Overlay Services). No date or byline; footer copyright Pay.UK 2026.
2. **Type and URL.** Implemented standard / scheme documentation. https://www.wearepay.uk/what-we-do/overlay-services/confirmation-of-payee/
3. **What it establishes.** CoP is an account name-checking service for UK domestic payments: before a payment is initiated or collected, the payer's provider checks the account name (with a personal/business indicator) against the payee's provider via an API-based peer-to-peer service with a directory but no central infrastructure. Stated purpose: reduce misdirected payments and give assurance the money is going to the intended account holder; described as "an anti-fraud tool". Numbers on the page: launched 2020; over 300 organisations have implemented it; more than 2m checks completed every day; the Payment System Regulator mandated its expansion in 2024. Participants must be FCA- or NCA-regulated account-holding PSPs; nine aggregators are listed.
4. **What it does NOT establish.** The page does not give match/close-match/no-match outcome definitions, fraud-reduction statistics, or a cumulative check count (the "two billion checks" figure in the old brief is not on this page). It does not mention authorised push payment fraud by name. It says nothing about agents, APIs for third parties outside PSPs, or non-UK schemes.
5. **Accord decision it informs.** Payee (precedent that payee verification is a standard pre-payment control for humans; Accord's claim should be that nothing equivalent exists in the agent flow, stated as a design gap rather than a statistic).
6. **Verbatim quotes.**
   - "Confirmation of Payee (CoP) is an account name-checking service designed to help reduce misdirected payments and provide greater assurance that payments are being sent, and collected from, the intended account holder for UK domestic payments."
   - "Since launching in 2020, over 300 organisations have already implemented CoP, with more than 2m checks being completed every day."

---

## 9. Kraken WebSocket v2: `book` and `executions`

1. **Title, authors, date.** Kraken Developers, Spot WebSocket API v2: "Book (Level 2)" (public channel) and "Executions" (private channel). No date; living documentation.
2. **Type and URL.** Documentation. https://docs.kraken.com/exchange/api-reference/spot-websocket-v2/book ; https://docs.kraken.com/exchange/api-reference/spot-websocket-v2/executions
3. **What it establishes.** `book` (endpoint `ws.kraken.com/v2`, listed under Public Channels) streams a level-2 order book: price levels with aggregated quantities at each level, depth 10/25/100/500/1000, snapshot then sequential updates, each with a CRC32 checksum of the top 10 bids and asks. The subscribe request has no token field. `executions` (endpoint `ws-auth.kraken.com/v2`, Private Channels) streams order status and execution events "for this account", combining the v1 `openOrders` and `ownTrades` channels; an authentication token is required. Trade events carry `exec_id`, `trade_id`, `last_qty`, `last_price`, `cost`, `fees`, and `liquidity_ind` ("t" taker, "m" maker); `snap_trades: true` includes the last 50 fills in the snapshot.
4. **What it does NOT establish.** Nothing about Glassbook; Kraken has no relationship with Accord and these pages are cited only to show the difference between venue-wide aggregate data and account-attributed data. The public book does not attribute resting quantity to any participant, so it cannot by itself prove who provided liquidity. The executions feed only shows the authenticated account's own orders and fills, so it is the account holder (or someone holding their token) who can produce it. Neither page states anything about historical replay guarantees or data-signing.
5. **Accord decision it informs.** Glassbook (aggregate venue data vs account-attributed evidence; a market maker's own fills with maker/taker flags are the account-specific evidence a release condition can be built on, if the observer path is authentic and the token custody is disclosed).
6. **Verbatim quotes.**
   - book: "The book channel streams level 2 (L2) order book. It describes the individual price levels in the book with aggregated order quantities at each level."
   - executions: "The executions channel streams order status and execution events for this account." and "This channel contains account specific data, an authentication token is required in the request."
   - executions field: "The liquidity indicator: t taker, m maker." (field `liquidity_ind`)

---

## 10. Optional additional primary sources on market-maker measurement

Not completed. Attempts:
- Menkveld and Wang, "How do designated market makers create value for small-caps?", Journal of Financial Markets 16(3), 2013. Located via search; the published full text is for ScienceDirect subscribers only, so it was not read and is not cited here. An early 2008 working draft exists elsewhere but differs from the published version and was not used.
- Euronext liquidity-provider programme page and Cboe DMM page: URLs guessed returned 404. SSRN returned 403.
- Nasdaq Trader, "How to Become a Market Maker" (https://www.nasdaqtrader.com/Trader.aspx?id=MarketMakerProcess): read in full, but it only defines a market maker and describes registration steps; it says nothing about measuring service quality or contractual incentives. Verbatim, for the record: "A market maker is a NASDAQ member firm that buys and sells securities at prices it displays in NASDAQ for its own account (principal trades) and for customer accounts (agency trades)." Low relevance; do not build a claim on it.

Recommendation: if the Glassbook page wants an external citation on liquidity-provision contracts, obtain and read the published Menkveld and Wang paper or an exchange's actual DMM/LP rulebook before citing either.

---

## Claim-to-source table

| Claim the site could make | Source | Verified | Defensible wording |
| --- | --- | --- | --- |
| Two-sided sealed negotiation inside a TEE, with code-enforced budget caps and acceptance thresholds, has been formalised in economic theory. | 1 NDAI Agreements | Yes | "A 2025 theoretical paper (Stephenson, Miller, Sun, Annem, Parikh) models AI agents bargaining inside a trusted execution environment and shows that a budget cap and an acceptance threshold preserve most of the gains even when the agents make errors. It is a model, not a deployed system." |
| TEE-based negotiation eliminates hold-up in practice. | 1 | No | Do not claim. The paper assumes fully secure TEEs and perfectly or near-perfectly aligned agents; it lists hardware trust as a limitation. |
| LLM negotiators can be moved off their position by social tactics; a "desperate" persona improved payoff by about 20% against GPT-4 in a 2024 benchmark. | 2 NegotiationArena | Yes | "In the 2024 NegotiationArena benchmark, an LLM prompted to fake desperation improved its payoff by 20% against standard GPT-4; the authors also measured anchoring and other irrational behaviours. Models tested were GPT-4, GPT-3.5, Claude 2 and Claude 2.1." |
| LLM agents are irrational negotiators in general / current models behave this way. | 2 | No | Do not generalise beyond the models and games tested. Say "in that benchmark". |
| Hard limits must be checked by deterministic code, not left to the model. | 2 (motivation), 6 (mitigation 2 and 4) | Yes (as guidance) | "OWASP's LLM01:2025 guidance recommends validating with deterministic code and handling privileged functions in application code rather than in the model." |
| Industry is standardising signed, auditable proof of what a user authorised an agent to buy (AP2 Intent and Cart Mandates), with 60+ organisations named as collaborators. | 3 AP2 | Yes | "Google's AP2 (September 2025) defines signed Intent and Cart Mandates as a non-repudiable audit trail for agent purchases and names more than 60 collaborating organisations." |
| AP2 covers negotiation confidentiality, term enforcement or payee verification. | 3 | No | It does not. Safe contrast: "AP2 standardises the receipt for a consumer purchase; it does not cover how two parties' agents reach terms, keep their limits private, or verify the payee." |
| Agents lack an interoperable way to prove who they represent, what they may do and how they get paid (a16z). | 4 | Yes, as opinion | Attribute as opinion: "a16z crypto (April 2026) argues that ..." Quote the verbatim sentence. Do not present as fact or data. |
| Any numbers from the a16z piece (100:1, $1.6M/month, $15B). | 4 | No | Do not use; the firm's own disclaimer says third-party information was not independently verified. |
| The "lethal trifecta" definition and that no 100% reliable prevention is known. | 5 Willison | Yes | Quote the three legs verbatim and attribute to Simon Willison, 16 June 2025. State that Willison's post is about data exfiltration and that applying it to payments is Accord's extension. |
| Prompt injection is OWASP's LLM01 for 2025; indirect injection arrives via external content; mitigations include deterministic validation, least privilege in code, human approval, segregating untrusted content. | 6 OWASP | Yes | Use the verbatim definitions and mitigation wording above. |
| The FBI's recommended control for a changed payment destination is out-of-band verification with the intended recipient. | 7 IC3 | Yes | Quote: "Use secondary channels or two-factor authentication to verify requests for changes in account information with the intended recipient." |
| BEC cost $3.05B across 24,768 complaints in 2025 / second-largest loss category. | 7 (not on this page) | Not re-verified | Remove or cite the IC3 2025 annual report directly after reading it. |
| Confirmation of Payee exists for UK human payments: name check before paying, 300+ organisations, 2m+ checks a day, launched 2020, expansion mandated by the PSR in 2024. | 8 Pay.UK | Yes | Use those numbers with "according to Pay.UK's CoP page". |
| "Two billion confirmation-of-payee checks". | 8 (not on this page) | Not re-verified | Replace with "more than 2m checks a day" or find the original Pay.UK press release and read it. |
| EU requires verification of payee for euro instant payments (STET/SEPAmail). | old brief [7] | Not re-verified | Out of scope this pass; keep only if the original source is read. |
| A public order book is aggregate and anonymous; account-specific fills with maker/taker flags require the account holder's authenticated feed. | 9 Kraken | Yes | "Kraken's public `book` channel streams aggregated quantities per price level; its `executions` channel streams an account's own orders and fills, flagged maker or taker, and requires an authentication token." Add: "Illustrative only; Glassbook has not integrated Kraken." |
| Glassbook has integrated Kraken or any venue. | 9 | No | Do not claim unless true in the release. |
| Academic or exchange evidence on measuring market-maker service quality. | 10 | Not obtained | Omit until a primary source is read. |

---

## Removed or qualified (items from content/ACCORD_WEBSITE_README.md §4.3 and §4.1 cards)

Everything below was NOT re-verified in this pass. Unless its URL was in the list above, it is out of scope here; the site should not carry it until someone reads the original.

Items touched by this pass that need correction:
- Google AP2 date: old brief says 16 Sep 2025; the blog page shows September 17, 2025. Use the page date.
- Google AP2 "signed intent and cart mandates": consistent with the page. The phrase "Payment Mandate" is not defined on the page; avoid naming it as a third mandate type unless citing the spec repo.
- a16z: the verified author list and date (16 April 2026) belong to the "5 ways blockchains can help" essay. The old brief's Eddy Lazzarin row (28 Apr 2026, [12]) is a different item and was not re-verified.
- FBI IC3 BEC page: carries no dollar totals or complaint counts. The $3.05B / $3.046B / 24,768 / "second-largest loss category" figures (old brief [5]) are not on this page: not re-verified.
- Pay.UK: "Two billion confirmation-of-payee checks" (old brief [6]) is not on the CoP page; the page says "more than 2m checks being completed every day" and "over 300 organisations". Replace or re-source.
- NegotiationArena: old brief's "about 20%" and "irrational behaviours quantified" are correct per the paper; date 8 Feb 2024 correct.
- NDAI Agreements: "Feb 2025" correct (11 Feb 2025). The companion "TEE negotiation study, Mar 2026" ([2], second item) was not re-verified.
- OWASP: "Prompt injection is LLM01; indirect injection arrives through external content" correct per the page.
- Simon Willison: paraphrase in old brief is accurate to the post; prefer the verbatim definition above.
- Kraken: consistent with the docs.

Not re-verified in this pass (URL not in scope or not reachable from this task):
- Illia Polosukhin, 14 May 2026, PR Newswire quote "Businesses will not deploy agents that expose their revenue, counterparties, or financial operations on a public ledger." ([8])
- Illia Polosukhin, 26 Feb 2026, agents hostile by default / policy caps ([10])
- Eddy Lazzarin, a16z crypto, 28 Apr 2026, authorization as the unsolved problem ([12])
- Haseeb Qureshi, Dragonfly, 7 Oct 2026 ([13]) and 19 May 2025 ([33])
- Kain Warwick, 26 Mar 2025, retainers of $50K to $300K+ a month, wash trading ([32])
- Jack Forestell, Visa, 30 Apr 2025, "These agents will need to be trusted with payments, not only by users, but by banks and sellers as well." ([38])
- Stepan Gershuni, 2026, more than half of long tasks needed a person ([14])
- Mert Mumtaz, Helius, 7 Aug 2026 ([34])
- Walmart with Pactum: 68% of suppliers (HBR), 2,000 suppliers, about 3% saved, 75% preferred it ([36], [1])
- OpenAI with Stripe, Agentic Commerce Protocol, 29 Sep 2025, "Users stay in control — they explicitly confirm each step before any action is taken." ([37])
- Mastercard Agent Pay, 29 Apr 2025, "Consumers will have complete control over what the agent is allowed to purchase on their behalf" ([39])
- Binance, 25 Mar 2026, market-maker disclosure rules ([30])
- STET and SEPAmail, 9 Oct 2025, verification of payee mandatory for euro instant payments ([7])
- OutLayer docs: allowlists, limits, multisig approvals and freeze ([16]) (listed in §F5 as a release-verification reference, not re-read here)
- Myerson and Satterthwaite 1983 ([43]); Chatterjee and Samuelson 1983 ([44])
- Gartner, 25 Jun 2025, more than 40% of agentic AI projects cancelled by end of 2027 ([40])
- Cong, Li, Tang and Yang, Management Science 2023, wash trading above 70% ([29])
- FBI IC3 annual report, 7 Apr 2026, $3.046B across 24,768 complaints ([5])
- US DOJ District of Massachusetts, 9 Oct 2024 and 13 Jun 2025, eighteen charged, Gotbit $23M forfeited ([26], [27])
- EU MiCA Title VI from 30 Dec 2024 ([28])
- §4.1 card 2: 4 May 2026 Morse-code tweet instruction and about $175K sent ([3]); August coding agent deleted a founder's database ([4])

Per §F5 of ACCORD_WEBSITE_CONTENT.md, the current copy deliberately uses none of these statistics or quotations. This list exists so that nobody reintroduces them without reading the originals.
