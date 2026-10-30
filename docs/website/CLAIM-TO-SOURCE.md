# Claim-to-source table (homepage research cards and /research)

For editorial review. Every factual claim placed in `src/sections/ResearchCards.tsx` (homepage, section "The research behind the room.") and `src/pages/Research.tsx` (`/research`) is listed with its source and the verified wording it rests on. "Verified wording" is taken from `content/RESEARCH-VERIFIED.md` (every source opened and read in the original on 29 October 2026). Paraphrases are marked P; verbatim quotes on the site are marked V and appear on the page in quotation marks with the word "verbatim".

Where a claim is Accord's own reading of a source, it appears on the research page only under the label "Accord's design interpretation" and is listed in the second table here so a reviewer can see it is not attributed to the source.

## Homepage cards (`/#research`)

| # | Claim on the card | Source | Verified wording it rests on | Kind |
| --- | --- | --- | --- | --- |
| H1 | A theoretical paper models AI agents bargaining inside a trusted execution environment, one with a budget cap, the other an acceptance threshold. | NDAI Agreements, arXiv:2502.07924 | "proposes that both parties delegate to AI agents running inside a trusted execution environment, with the buyer's agent given a budget cap and the seller's agent an acceptance threshold"; type: "Theoretical economics paper (game-theoretic model, no implementation, no experiment)" | P |
| H2 | Disclosure happens only on mutual acceptance. | NDAI Agreements | "the TEE releases the good and the payment only on mutual accept and otherwise deletes the session" | P |
| H3 | The caps preserve most of the gains even when agents err. | NDAI Agreements | Verbatim in the paper: "we model "agent errors" in payments or disclosures and demonstrate that budget caps and acceptance thresholds suffice to preserve most of the efficiency gains." | P |
| H4 | A model, not a deployed system. | NDAI Agreements | "No system was built or tested; it is a model." | P |
| H5 | Authors: Stephenson, Miller, Sun, Annem and Parikh; arXiv, February 2025. | NDAI Agreements | "Matthew Stephenson, Andrew Miller, Xyn Sun, Bhargav Annem, Rohan Parikh. Submitted 11 Feb 2025 (v1, the only version)" | fact |
| H6 | In a 2024 benchmark, an LLM agent prompted to fake desperation improved its negotiation payoff by 20% against standard GPT-4. | NegotiationArena, arXiv:2402.05863 | Prompting GPT-4 to "fake being desperate" raised win rate and payoff; abstract verbatim: "by pretending to be desolate and desperate, LLMs can improve their payoffs by 20% when negotiating against the standard GPT-4." | P |
| H7 | The authors also measured anchoring and other irrational behaviours. | NegotiationArena | "Irrational behaviours quantified: anchoring (Spearman 0.716 between first offer and final price); "split-the-difference" habits; ..." | P |
| H8 | The models tested date from late 2023. | NegotiationArena | "Models are from late 2023; results are not claimed to transfer to current models." (GPT-4 gpt-4-1106-preview, GPT-3.5 gpt-3.5-turbo-1106, Claude 2, Claude 2.1) | P |
| H9 | Authors: Bianchi, Chia, Yuksekgonul, Tagliabue, Jurafsky and Zou; arXiv, February 2024. | NegotiationArena | "Federico Bianchi, Patrick John Chia, Mert Yuksekgonul, Jacopo Tagliabue, Dan Jurafsky, James Zou. Submitted 8 Feb 2024 (v1, the only version)" | fact |
| H10 | OWASP lists prompt injection first in its 2025 Top 10 for LLM applications. | OWASP LLM01:2025 | Title: "LLM01:2025 Prompt Injection", OWASP Top 10 for LLM Applications 2025 (the LLM01 designation is the first entry) | P |
| H11 | Instructions can arrive indirectly, inside external content the model reads. | OWASP LLM01:2025 | Verbatim on the page: "Indirect prompt injections occur when an LLM accepts input from external sources, such as websites or files." | P |
| H12 | Fool-proof prevention is unclear. | OWASP LLM01:2025 | Verbatim on the page: "it is unclear if there are fool-proof methods of prevention for prompt injection." | P |
| H13 | It recommends deterministic validation, least privilege in code and human approval for privileged operations. | OWASP LLM01:2025 | Mitigation 2 "use deterministic code to validate adherence to these formats"; mitigation 4 "handle these functions in code rather than providing them to the model. Restrict the model's access privileges to the minimum necessary"; mitigation 5 "Implement human-in-the-loop controls for privileged operations" | P |
| H14 | Attribution: OWASP Gen AI Security Project, LLM01:2025 Prompt Injection. | OWASP LLM01:2025 | "OWASP Top 10 for LLM Applications 2025 (OWASP Gen AI Security Project). No author byline or publication date on the page" | fact |
| H15 | Pay.UK's Confirmation of Payee checks the account name before a UK payment is sent. | Pay.UK CoP page | "CoP is an account name-checking service for UK domestic payments: before a payment is initiated or collected, the payer's provider checks the account name ... against the payee's provider" | P |
| H16 | The FBI's guidance on business email compromise is to verify changes in account information with the intended recipient through a secondary channel. | FBI IC3 BEC page | Verbatim on the page: "Use secondary channels or two-factor authentication to verify requests for changes in account information with the intended recipient." | P |
| H17 | Attribution: Pay.UK; FBI Internet Crime Complaint Center. | Pay.UK; IC3 | Page owners as read | fact |

Relevance lines on the four cards ("Informs Sealed Table: ...", "Informs Agreement controls: ...", "Informs Payee: ...") describe Accord's design and are not attributed to any source. The Payee line states that recipient authorization rests on domain control and destination approval "rather than bank-account name matching", which is the distinction the directive requires between CoP and Payee. No verbatim quotation is used on the homepage.

## Research page (`/research`), per source

Each card's "What it establishes" and "What it does not establish" blocks are paraphrases of the corresponding sections 3 and 4 of `content/RESEARCH-VERIFIED.md`. The rows below list the discrete factual claims and the two verbatim quotes.

| # | Claim on the page | Source | Verified wording it rests on | Kind |
| --- | --- | --- | --- | --- |
| R1 | NDAI Agreements: title, five authors, 11 February 2025, arXiv:2502.07924 v1; theoretical, no implementation or experiment. | RESEARCH-VERIFIED §1.1, §1.2 | As quoted at H5; "Theoretical economics paper (game-theoretic model, no implementation, no experiment)" | fact |
| R2 | Disclosure paradox as a bargaining game; baseline is no disclosure and failed trade; TEE releases good and payment only on mutual accept, otherwise deletes the session; unique equilibrium is full disclosure and efficient trade with aligned agents and sufficient hardware trust; strictly better than baseline under random agent errors because the cap truncates overpayment and the threshold rejects underpayment. | RESEARCH-VERIFIED §1.3 | "formalises the Arrow/Nelson disclosure paradox ... Theorem 1 shows that with perfectly aligned agents and sufficient TEE security the unique equilibrium is full disclosure and efficient trade. Section 5 and Appendix C show the mechanism stays strictly better than the baseline for both sides under random agent errors, because the budget cap truncates overpayment and the threshold rejects underpayment." | P |
| R3 | No system built or tested; assumes TEEs cannot be compromised; errors idiosyncratic and mean-zero; single information good sold once; no empirical LLM claim. | RESEARCH-VERIFIED §1.4 | "It assumes TEEs are fully secure ("Hardware trust assumptions. We assume TEEs are fully secure."). Agent errors are assumed idiosyncratic and mean-zero. It is about a single information good (an invention) sold once ... It does not claim anything about LLM behaviour empirically." (The word "secure" is avoided in site copy by the copy checker, hence "cannot be compromised".) | P |
| R4 | NegotiationArena: title, six authors, 8 February 2024, arXiv:2402.05863 v1; experimental benchmark. | RESEARCH-VERIFIED §2.1, §2.2 | As quoted at H9; "Experimental result (open-source benchmark plus LLM-vs-LLM experiments)" | fact |
| R5 | Three scenarios (resource exchange, multi-turn ultimatum, seller and buyer); GPT-4, GPT-3.5, Claude 2, Claude 2.1; 60 negotiations per ordered pair per scenario; "fake desperation" and "cunning" raised win rate and payoff in every game; 20% headline; Spearman 0.716; split-the-difference; counter-offers above ask; stake-size shifts; weaker model misread its goal in 20% of games. | RESEARCH-VERIFIED §2.3 | "three two-agent scenarios (resource exchange, multi-turn ultimatum, seller-and-buyer) ... 60 negotiations per ordered pair per scenario ... raised its win rate and payoff in every game tested ... anchoring (Spearman 0.716 ...) ... counter-offered a price above the seller's ask 41% of the time ... outcomes shifted with the absolute size of the stake ... GPT-3.5 misread its own goal in 20% of its sell/buy games" | P |
| R6 | Models from late 2023; 20% is one persona against one model in synthetic games; no real money, counterparties or human-in-the-loop; no privacy/TEE/payments/prompt-injection study; adversarial-attack remark is a hypothesis. | RESEARCH-VERIFIED §2.4 | Section 4 as written | P |
| R7 | AP2: title, Stavan Parikh and Rao Surapaneni (Google), 17 September 2025, vendor blog. | RESEARCH-VERIFIED §3.1, §3.2 | "Dated September 17, 2025 on the page. (The old brief says 16 Sep 2025 ... Use the page date ...)" | fact (corrected date) |
| R8 | Open protocol for agent-led payments, extension of A2A, alongside MCP; authorization, authenticity, accountability; Intent Mandate (request, conditions such as price limits and timing); Cart Mandate (signed on approval, exact items and price); chain ends linking payment method to the Cart Mandate; cryptographically signed, backed by verifiable credentials; more than 60 collaborating organisations; A2A x402 extension. | RESEARCH-VERIFIED §3.3 | Section 3 as written | P |
| R9 | Consumer-to-merchant model; no two-party negotiation, confidentiality or enforcement; no payee verification; no "Payment Mandate" object; 60 organisations are collaborators, not deployments. | RESEARCH-VERIFIED §3.4 | Section 4 as written | P |
| R10 | a16z essay: title, six authors (Crowley, Catalini, Hall, Harkavy, Levine, Neville), 16 April 2026, expert opinion with the firm's disclaimer. | RESEARCH-VERIFIED §4.1, §4.2 | "Byline as shown: Christian Crowley, Christian Catalini, Andrew Hall, Elizabeth Harkavy, Noah Levine, and Sean Neville. Confirmed. Dated 04.16.26" | fact |
| R11 | V: "There is still no broadly adopted, interoperable way for one agent to prove to another who it represents, what it's allowed to do, and how it gets paid." | a16z essay | RESEARCH-VERIFIED §4.6, first quote | V |
| R12 | Five arguments: identity for non-humans; enforceable guarantees and records; stablecoins and HTTP-embedded rails for merchants processors struggle to underwrite; verification as the scarce input, receipts travelling with settlement; scoped delegation at the smart-contract level. | RESEARCH-VERIFIED §4.3 | Section 3 as written (the verbatim scoped-delegation sentence is not used because it contains an em-dash and product names) | P |
| R13 | Advocacy, not a study; figures not reused because the firm's disclaimer says third-party information was not independently verified; no discussion of confidential negotiation, TEEs or payee verification. | RESEARCH-VERIFIED §4.4 | Section 4 as written | P |
| R14 | Willison: title, author, 16 June 2025, practitioner blog. | RESEARCH-VERIFIED §5.1, §5.2 | "Posted 16 June 2025" | fact |
| R15 | Three legs (private data, untrusted content, external communication); models follow instructions in any content and cannot rank by origin; reported production exploits fixed by closing the exfiltration path; end users should avoid the trifecta. | RESEARCH-VERIFIED §5.3 | Section 3 as written | P |
| R16 | V: "Here's the really bad news: we still don't know how to 100% reliably prevent this from happening." | Willison post | RESEARCH-VERIFIED §5.6, second quote | V |
| R17 | About exfiltration not payments; incidents not prevalence; design-pattern research helps developers. | RESEARCH-VERIFIED §5.4 | Section 4 as written | P |
| R18 | OWASP: title, OWASP Gen AI Security Project, no byline, no page date, 2025. | RESEARCH-VERIFIED §6.1 | "No author byline or publication date on the page; footer copyright 2025 OWASP Foundation" | fact |
| R19 | Definition of prompt injection incl. input not visible to humans; direct vs indirect; impacts (unauthorised access to functions, executing commands in connected systems, manipulating critical decision-making); seven mitigations prefaced by "fool-proof prevention unclear"; mitigations 2, 4, 5, 6 as paraphrased. | RESEARCH-VERIFIED §6.3, §6.6 | Verbatim mitigation wording as listed in §6.6 | P |
| R20 | Guidance not measurement; no incidence data; mitigations unranked; generic to LLM applications. | RESEARCH-VERIFIED §6.4 | Section 4 as written | P |
| R21 | IC3 BEC: title, Internet Crime Complaint Center (FBI), undated page. | RESEARCH-VERIFIED §7.1 | "No date or byline on the page." | fact |
| R22 | Definition of BEC (transfer of funds; compromised business email accounts via social engineering or intrusion; unauthorised transfer); response guidance (contact originating bank, file with IC3). | RESEARCH-VERIFIED §7.3 | Section 3 and verbatim "Business Email Compromise (BEC) is a sophisticated scam targeting both businesses and individuals performing a transfer of funds." | P |
| R23 | V: "Use secondary channels or two-factor authentication to verify requests for changes in account information with the intended recipient." | IC3 BEC page | RESEARCH-VERIFIED §7.6, second quote | V |
| R24 | No dollar totals, complaint counts or year figures on the page; no "payment redirection" phrase. | RESEARCH-VERIFIED §7.4 | Section 4 as written | P |
| R25 | Pay.UK CoP: title, Pay.UK, undated page (footer 2026), service launched 2020, implemented standard. | RESEARCH-VERIFIED §8.1, §8.2 | "No date or byline; footer copyright Pay.UK 2026." | fact |
| R26 | Name check with personal/business indicator before initiation or collection, API-based peer-to-peer with a directory and no central infrastructure; purpose to reduce misdirected payments and assure the intended account holder; over 300 organisations since 2020; more than 2m checks a day; regulator mandated expansion in 2024. | RESEARCH-VERIFIED §8.3, §8.6 | Verbatim: "Since launching in 2020, over 300 organisations have already implemented CoP, with more than 2m checks being completed every day."; "the Payment System Regulator mandated its expansion in 2024" (site says "the regulator") | P |
| R27 | No match-outcome definitions, fraud statistics or cumulative counts; participants are regulated PSPs; nothing about agents, third-party APIs or non-UK schemes. | RESEARCH-VERIFIED §8.4 | Section 4 as written | P |
| R28 | Kraken book: public endpoint, level-2 book with aggregated quantities per price level, depths 10 to 1000, snapshot then sequential updates, CRC32 checksum of top 10 bids and asks, no token field. | RESEARCH-VERIFIED §9.3, §9.6 | Verbatim: "The book channel streams level 2 (L2) order book. It describes the individual price levels in the book with aggregated order quantities at each level." | P |
| R29 | Kraken executions: authenticated endpoint, order status and execution events for the account, token required, trade events with exec/trade ids, last_qty, last_price, cost, fees, liquidity indicator maker/taker, snapshot of last 50 fills. | RESEARCH-VERIFIED §9.3, §9.6 | Verbatim: "The executions channel streams order status and execution events for this account."; "This channel contains account specific data, an authentication token is required in the request."; "The liquidity indicator: t taker, m maker." | P |
| R30 | Public book does not attribute resting quantity; executions shows only the account's own fills; nothing about replay or signing; no Accord relationship; no integration. | RESEARCH-VERIFIED §9.4 | Section 4 as written | P |

## Accord's design interpretation (ours, labelled as such on the page)

These statements appear only under the "Accord's design interpretation" label and are not attributed to any source. They are consistent with the product boundaries in `content/EDITORIAL-DIRECTIVE.md` and the existing security-page copy (domain control and destination approval; revocation is not recall; attestation is not fairness).

| Source card | Interpretation stated |
| --- | --- |
| NDAI Agreements | Limits are inputs to a confidential run, not to the counterparty's agent; disclosure conditional on agreement; cap and threshold enforced by code; Accord does not adopt the paper's hardware assumption (assumptions are on the security page). |
| NegotiationArena | Walk-away values stay out of the dialogue; hard limits checked by deterministic code; human approval before terms take effect. |
| AP2 | AP2 standardises the receipt; Accord's approved agreement is meant to be comparable in spirit; negotiation and the recipient's side are the gaps Sealed Table and Payee address. |
| a16z essay | Authority demonstrated rather than asserted; approved agreement as the record of permissions; permissions bounded in code; Payee as recipient identity; cited as the authors' argument only, no relationship implied. |
| Willison | "Pay" for "exfiltrate" is Accord's extension, labelled; payment requests checked by deterministic code against the approved agreement; recipient established through Payee. |
| OWASP | Accord does not claim to eliminate prompt injection; mitigations applied as design decisions (permissions in code, deterministic validation, payee change as privileged operation, counterparty content kept apart). |
| IC3 BEC | Payee as the agent-world equivalent of out-of-band verification: domain control, destination approval, a change does not take effect because a message asked for it. |
| Pay.UK CoP | Payee is not bank-account name matching; recipient-side control in the agent flow where we have not found an equivalent, stated as a design observation, not a statistic. |
| Kraken book | Aggregate venue data shows whether conditions held at the venue, not that a particular market maker met them; Glassbook does not claim to prove the fee was earned. |
| Kraken executions | Account-attributed fills are the evidence a release condition could rest on, given an authentic observation path and disclosed token custody; a direction, not a feature; no venue integrated. |

## Removed or qualified

Carried from `content/RESEARCH-VERIFIED.md` ("Removed or qualified"). None of the items below appears on the homepage research section or on `/research` after this pass.

Corrected in this pass:
- Google AP2 date: 16 Sep 2025 (old brief) replaced by 17 September 2025 (the page date).
- "Payment Mandate" is not named as a third mandate type; the page only describes linking the payment method to the Cart Mandate.
- a16z: the essay is attributed to Crowley, Catalini, Hall, Harkavy, Levine and Neville, 16 April 2026. The old brief's Eddy Lazzarin item (28 Apr 2026) is a different piece and is not used on these pages.
- FBI IC3: the $3.046B / $3.05B / 24,768-complaint / "second-largest loss category" figures are not on the BEC page and are not used.
- Pay.UK: "two billion confirmation-of-payee checks" is not on the CoP page; replaced by the page's "over 300 organisations" and "more than 2m checks ... every day".
- NDAI Agreements: the companion "TEE negotiation study, Mar 2026" was not re-verified and is not cited.
- Willison: the paraphrase is kept to the post's own definition; the payments application is labelled as Accord's design interpretation.
- Menkveld and Wang 2013, exchange DMM/LP rulebooks and Nasdaq Trader "How to Become a Market Maker": not obtained or low relevance; no market-maker measurement citation is made.

Not re-verified and therefore removed from `/research` with the old bibliography tables (they remain in `src/content/references.ts`, untouched, and in the homepage "In their words" section, which was outside this pass):
- Illia Polosukhin, 14 May 2026 (PR Newswire quote) and 26 Feb 2026 (hostile by default / policy caps).
- Eddy Lazzarin, a16z crypto, 28 Apr 2026.
- Haseeb Qureshi, Dragonfly, 7 Oct 2026 and 19 May 2025.
- Kain Warwick, 26 Mar 2025 (retainers, wash trading).
- Jack Forestell, Visa, 30 Apr 2025.
- Stepan Gershuni, 2026.
- Mert Mumtaz, Helius, 7 Aug 2026.
- Walmart with Pactum (68%, 2,000 suppliers, about 3%, 75%).
- OpenAI with Stripe, Agentic Commerce Protocol, 29 Sep 2025.
- Mastercard Agent Pay, 29 Apr 2025.
- Binance, 25 Mar 2026, market-maker disclosure rules.
- STET and SEPAmail, 9 Oct 2025, EU verification of payee.
- OutLayer docs (allowlists, limits, multisig approvals, freeze).
- Myerson and Satterthwaite 1983; Chatterjee and Samuelson 1983.
- Gartner, 25 Jun 2025 (40% of agentic AI projects cancelled).
- Cong, Li, Tang and Yang, Management Science 2023 (wash trading above 70%).
- FBI IC3 annual report, 7 Apr 2026.
- US DOJ District of Massachusetts, 9 Oct 2024 and 13 Jun 2025 (Gotbit).
- EU MiCA Title VI.
- The 4 May 2026 Morse-code tweet instruction and the August coding-agent database deletion.

Directive rule applied: manipulation scandals are not used as evidence that Glassbook would have prevented them.

## Owner's tables (30 Oct 2026)

Appended from `content/ACCORD_RESEARCH_PAGE.md` Part B (editorial tables, not rendered), as the owner wrote them.


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
| OutLayer custody: allowlists, limits, approval thresholds, freeze, owner-configured | Research page | OutLayer agent custody docs | Page read 29 Oct 2026 |
| Dealproof: negotiation in a confidential VM; escrow planned | Research page | Dealproof repository | README read 29 Oct 2026 |
| Forgd leaderboard: spread, depth, uptime ratings from shared data | Research page | Cointelegraph, 5 Aug 2026 | Article read earlier in the project; re-open before publishing |
| Everything the homepage says the product does | Homepage | The product itself | Must be demonstrated by the build; not a research claim |

### Claims removed or qualified because the evidence did not support them

- "Did your market maker earn this payment?" replaced by "liquidity agreements paid on measured conditions": venue-level order-book data cannot attribute liquidity to one participant (Kraken book versus executions documentation makes the distinction plain).
- "Nobody has shipped the sensor inside the contract", "no row names the room" and similar claims that no one else has solved the problem: removed; unverifiable and unnecessary.
- Statements attributed to NEAR HACKATHON judges (Illia Polosukhin, Haseeb Qureshi, Eddy Lazzarin, Kain Warwick, Stepan Gershuni, Mert Mumtaz) removed from the site. The a16z perspective is now attributed to the actual authors of the a16z Frontier article rather than to a different a16z figure.
- Business email compromise described as the FBI's "largest" loss category: corrected earlier to second-largest behind investment fraud; the figure itself ($3.046B, 24,768 complaints, 2025) now appears only in internal references, pending confirmation against the IC3 2025 annual report PDF rather than a law-firm summary.
- Market-manipulation incidents (DWF, Mantra, Movement) and enforcement actions (DOJ, MiCA) removed from the product pages as evidence for Glassbook: they document a problem in the market, not that Glassbook would have prevented them.
- Walmart figures of 2,000 suppliers, about 3% savings and 75% supplier preference (Fox Business, 2023) replaced by the HBR figure of 68% of suppliers approached, which comes from the named authors' own case.
- Gartner's cancellation forecast, the Visa and Mastercard launch quotations, Cointelegraph's market-maker reporting and the Vertice SaaS inflation figures removed from the site: commercial announcements and secondary reporting that do not bear on a design decision. They remain in the internal references file.
- "Negotiated blind", "neutral ground", "executable agreements" and "the agreement layer" retired as positioning language (misreadings, or an existing project's category).
- Live counters removed from the hero; the only counters are in the security demonstration and report its own events.
- Comparison table naming competitors removed from the homepage; related approaches are described on the research page from their own material.
