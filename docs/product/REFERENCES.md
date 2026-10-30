# References

Section A is the evidence base for Accord's README and pitch. Section B is the market-maker evidence base, kept for the second-vertical slide (the same agreement object with a market maker on the other side). Every row was opened on 28 or 29 Oct 2026. Quote the paraphrase, link the source, never invent a quote.

## A. Accord: businesses cannot hand an agent a budget

### A1. Negotiation: one-sided bots work, two-sided is blocked by exposure

| Source | Date | What it says | Use it for |
| --- | --- | --- | --- |
| Pactum at Walmart, via Fox Business: https://foxbusiness.com/technology/walmart-using-ai-negotiate-cost-purchase-terms-vendors-shorter-timeframe | 26 Apr 2023 | Walmart's negotiation bot ran against 2,000 suppliers at once, saved about 3% on average, closed in days what took weeks, and 75% of suppliers preferred it | The one-sided market exists and pays |
| Vertice SaaS inflation index: https://www.vertice.one/insights/saas-inflation-rate | Oct 2026 | Software price inflation ran at 12.7% to 16.4% a month in 2026 while negotiated discounts average 32.8% off list | Every renewal is a negotiation someone is losing |
| Illia Polosukhin, NEAR AI announcement: https://tools.prnewswire.com/en-us/live/20813/release/20260514EN59736 | 14 May 2026 | "Businesses will not deploy agents that expose their revenue, counterparties, or financial operations on a public ledger." | The wall between one-sided bots and two-agent negotiation, in the host's words |
| Eddy Lazzarin, a16z crypto show via TechFlow: https://www.techflowpost.com/en-US/article/31368 | 28 Apr 2026 | Agents pick the easiest option and will not wait for a sales call; the core unsolved problem is authorization, proving to a counterparty that an agent represents you | The attested mandate is the authorization |
| NDAI Agreements: https://arxiv.org/abs/2502.07924 ; TEE negotiation study: https://arxiv.org/abs/2603.19011 | Feb 2025, Mar 2026 | Two-sided sealed negotiation inside enclaves, as research | Prior art, research half |
| Dealproof (ETHGlobal NYC hackathon project): https://github.com/kkoci/Dealproof | 2026 (read 29 Oct 2026) | Two Claude agents negotiate data access inside a Phala TDX confidential VM; transcripts stay in the enclave; a Sepolia escrow contract is described and listed as not yet deployed; 61 commits, 5 stars | Prior art, shipped prototype. Never write "never shipped". The difference: Accord checks the enclave output against on-chain commitments, turns the terms into enforced policy, binds the payee and handles revocation |

### A2. Execution: agents need a boundary a contract enforces

| Source | Date | What it says | Use it for |
| --- | --- | --- | --- |
| Illia Polosukhin, Bankless: https://rosetta.to/u/bankless/illia-polosukhin-why-ai-agents-are-still-useless-and-what-fixes-them-near-founde | 24 Mar 2026 | Security is the main barrier because people withhold the access agents need; agents are a chief of staff, not a replacement; businesses need confidential inference, attestation and human checkpoints | Humans set the mandate and approve exceptions |
| Illia Polosukhin, Chopping Block: https://rosetta.to/u/unchainedcrypto/the-ai-agent-revolution-crypto-isn-t-talking-about-the-chopping-block | 26 Feb 2026 | Treat agents as hostile by default, with policy caps that hold even if the model is compromised | The contract, not the agent, stops the attack |
| Haseeb Qureshi, Bankless: https://rosetta.to/u/bankless/haseeb-quereshi-crypto-s-not-made-for-humans-it-s-for-ai?t=0 | 2 Mar 2026 | Agents running businesses end to end is hype; give an agent a small segregated wallet with explicit rules | The mandate is the wallet with rules |
| Haseeb Qureshi, TOKEN2049 via RootData: https://www.rootdata.com/news/781111 | 7 Oct 2026 | The delegation model that works is sub-cards with owner-set limits; privacy wins when it is easy | Scoped keys and caps, privacy by default |
| Stepan Gershuni, cryptoEssay: https://t.me/s/cryptoEssay | 2026 | Agents finish four-to-eight-hour tasks but more than half needed a person to step in | The exception path |
| Kain Warwick, Unchained: https://www.kazuha.ai/sources/unchained/posts/uneasy-money-an-agent-deleted-kain-s-database-two-ai-models-rebuilt-it-in-30-sec | 14 Aug 2026 | A coding agent deleted his database | Unbounded agents break things |

### A3. Settlement: paying the right amount to the wrong account

| Source | Date | What it says | Use it for |
| --- | --- | --- | --- |
| FBI IC3, Internet Crime Report 2025: https://www.ic3.gov/AnnualReport/Reports/2025_IC3Report.pdf (summary: https://www.mcdonaldhopkins.com/insights/news/the-sobering-truth-of-the-fbis-2025-internet-crime-complaint-center-report) | Apr 2026 | 1,008,597 complaints and $20.877B in reported losses, up 26% on 2024; business email compromise $3,046,598,558 across 24,768 complaints, second-highest behind investment fraud; 22,364 complaints referenced AI ($893,346,472); "AI-enabled synthetic content is becoming increasingly difficult to detect and easier to make" | The Why now tiles; the dollar figure |
| FBI IC3, Internet Crime Report 2023: https://ic3.gov/annualreport/reports/2023_ic3report.pdf | Mar 2024 | Reported losses $6.9B (2021), $10.3B (2022), $12.5B (2023) | The trend in the Why now chart |
| Grok and Bankr prompt injection, reported by Cointelegraph Magazine (13 May 2026): https://cointelegraph.com/magazine/grok-bankr-wallet-free-nft-prompt-injection and Giskard (7 May 2026): https://giskard.ai/knowledge/how-grok-got-prompt-injected-an-x-user-drained-150-000-from-an-ai-wallet | May 2026 | Grok translated a Morse-code reply on X; the translation was an instruction to send 3 billion DRB; Bankr's bot executed it from a Grok-linked wallet (on Base, per Cointelegraph); valued at $150K to $174K depending on the report; about 80% later returned (Giskard); an NFT sent beforehand had widened the bot's permissions | The agent attack, with a date; companies named on /research only |
| Pay.UK, Confirmation of Payee: https://www.wearepay.uk/confirmation-of-payee-reaches-two-billion-checks-helping-protect-uk-consumers-against-fraud/ | 18 Mar 2024 | Two billion checks run; a name-match prompt before a payment | Banking solved the human version |
| EU verification of payee, STET and SEPAmail: https://www.stet.eu/en/news/news1/stet-and-sepamaileu-will-set-up-an-interoperable-verification-of-payee-(vop)-solution-for-october-9th-2025.html?page=8 | 9 Oct 2025 | Verification of payee mandatory for euro instant payments | Regulation now requires it for humans; nothing requires it for agents |
| Mert Mumtaz, Genfinity: https://genfinity.io/2026/08/07/helius-mert-mumtaz-solana-privacy-protocol-encrypted-balances/ | 7 Aug 2026 | The strongest AI-crypto overlap is security, not agent payments; institutions want privacy rings tuned to policy | Judge fit for security and privacy |
| Dhruva Check (hackathon project): https://hackquest.io/projects/Dhruva | 2026 | "Confirmation of payee for the agent economy", tiered payees on a testnet | Prior art to name; no TEE verification, canaries or cross-chain revocation |

### A4. Prior art table for the README (corrected 29 Oct 2026 after the outside review)

Describe each one accurately; the reviewers will check. Two earlier lines were wrong and are retired: "policy wallets answer how much, not whom" (OutLayer custody has recipient allowlists) and "sealed negotiation never shipped" (Dealproof shipped a prototype).

| Fix | Who | What it does | Where it stops, and where Accord differs |
| --- | --- | --- | --- |
| One-sided negotiation bots | Pactum (Walmart), and the AI negotiation startups | Negotiate for one side at scale, with measured savings | The bot sees everything; the other side's agent cannot join. Accord seals both sides and lets the vendor's agent in |
| Signed payment mandates | Google AP2, Agents to Payments, announced 16 Sep 2025 with 60+ partners including Coinbase (x402) and Mysten Labs: https://cloud.google.com/blog/products/ai-machine-learning/announcing-agents-to-payments-ap2-protocol | Intent mandates and cart mandates signed as verifiable credentials between a user, their agent and a merchant | No negotiation protocol, no statement on hiding the buyer's limits from the merchant, no on-chain enforcement. Accord's approved terms could be expressed as an AP2 cart mandate; Accord adds how the cart was produced and what enforces it |
| Agent policy wallets | OutLayer agent custody: https://app.outlayer.ai/docs/agent-custody (read 29 Oct 2026) | Address whitelists and blacklists, per-transaction, hourly, daily and monthly limits, multisig approval above a threshold, time windows, instant freeze; policies stored encrypted on chain and evaluated in a TEE; EVM, Solana, NEAR and Intents | The owner's admin types the allowlist and can change it at once with no delay; for Intents swaps and cross-chain withdrawals the TEE does not re-check token or amount. Accord binds the payee from the payee's own domain and settlement authority, delays changes, and derives the whole policy from an attested negotiation; it could feed such a wallet its policy |
| Payee tiers | Dhruva Check (hackathon project): https://hackquest.io/projects/Dhruva | "Confirmation of payee for the agent economy", tiered payees on a testnet | No enclave domain proof, no settlement authority, no timelock, no revocation |
| Sealed negotiation, shipped | Dealproof (ETHGlobal NYC): https://github.com/kkoci/Dealproof | TEE negotiation between two Claude agents in a Phala TDX CVM; escrow on Sepolia described, not deployed | No commitment check on chain, no enforced terms, no bound payee, no revocation story |
| Sealed negotiation, research | NDAI Agreements and the TEE negotiation study | Two-sided sealed negotiation inside enclaves | Research without settlement |
| AP automation agents on cards | Ramp, Brex and similar | Pay approved invoices on virtual cards with limits | No negotiation, no sealed terms; destination controls belong to the card network |

### A6. In their words: who has named the problem (for the site's section 2a and the README's problem section)

Paraphrase unless marked verbatim. Each row names the piece of the room it points at. Nobody on this list is described as a judge, advisor or supporter anywhere public; they appear only for what they said.

| Who | Date | What they said or did | Piece | Link |
| --- | --- | --- | --- | --- |
| Jack Forestell, Visa (Visa Intelligent Commerce launch) | 30 Apr 2025 | Verbatim: "These agents will need to be trusted with payments, not only by users, but by banks and sellers as well." Partners: Anthropic, IBM, Microsoft, Mistral AI, OpenAI, Perplexity, Samsung, Stripe | Payee | https://usa.visa.com/about-visa/newsroom/press-releases.releaseId.21361.html |
| Mastercard, Agent Pay | 29 Apr 2025 | Verbatim: "Consumers will have complete control over what the agent is allowed to purchase on their behalf"; Microsoft and IBM partnerships | Owner-set limits, consumer side | https://www.mastercard.com/news/press/2025/april/mastercard-unveils-agent-pay-pioneering-agentic-payments-technology-to-power-commerce-in-the-age-of-ai/ |
| OpenAI with Stripe, Agentic Commerce Protocol | 29 Sep 2025 | Verbatim: "Users stay in control — they explicitly confirm each step before any action is taken."; merchants remain merchant of record; Etsy live, Shopify merchants coming | Human approval, consumer side | https://openai.com/index/buy-it-in-chatgpt/ |
| Simon Willison, "The lethal trifecta for AI agents" | 16 Jun 2025 | Private data, untrusted content and external communication together let an attacker drive the agent | The open inbox | https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/ |
| OWASP Top 10 for LLM Applications, LLM01:2025 | 2025 | Prompt injection is the first risk; "Indirect prompt injections occur when an LLM accepts input from external sources, such as websites or files." | The open inbox | https://genai.owasp.org/llmrisk/llm01-prompt-injection/ |
| UK National Cyber Security Centre, "Prompt injection is not SQL injection (it may be worse)" and the announcement "Mistaking AI vulnerability could lead to large-scale breaches" | 8 and 10 Dec 2025 | Verbatim: prompt injection "may never be totally mitigated in the way SQL injection attacks can be"; design protections should "focus more on deterministic (non-LLM) safeguards that constrain the actions" of the system | The contract, not the agent, decides | https://www.ncsc.gov.uk/blog-post/prompt-injection-is-not-sql-injection · https://www.ncsc.gov.uk/news/mistaking-ai-vulnerability-could-lead-to-large-scale-breaches |
| OWASP GenAI Security Project, Top 10 for Agentic Applications for 2026 | 9 Dec 2025 | Ten agent risks, including ASI01 agent goal hijack, ASI02 tool misuse and exploitation, ASI03 identity and privilege abuse and ASI07 insecure inter-agent communication (names confirmed from two secondary summaries) | The tags in "Where each attack stops" | https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/ |
| Gartner press release | 25 Jun 2025 | More than 40% of agentic AI projects will be cancelled by the end of 2027, citing escalating costs, unclear business value or inadequate risk controls; about 130 of thousands of vendors judged real | The controls gap | https://www.gartner.com/en/newsroom/press-releases/2025-06-25-gartner-predicts-over-40-percent-of-agentic-ai-projects-will-be-canceled-by-end-of-2027 |
| Harvard Business Review, Van Hoek, DeWitt, Lacity, Johnson | 8 Nov 2022 | Walmart's chatbot "negotiating and closing agreements with 68% of suppliers approached" | One-sided negotiation works | https://hbr.org/2022/11/how-walmart-automated-supplier-negotiations |
| Bianchi, Chia, Yuksekgonul, Tagliabue, Jurafsky, Zou, NegotiationArena (ICML 2024) | 8 Feb 2024 | LLM agents improve payoffs by about 20% by pretending to be desperate; irrational behaviours quantified | Code checks limits, humans approve | https://arxiv.org/abs/2402.05863 |
| Myerson and Satterthwaite, Journal of Economic Theory 29(2), 265 to 281 | 1983 | No bilateral trading mechanism under two-sided private information is at once efficient, incentive-compatible, individually rational and budget-balanced; the remedy studied is a mechanism both sides commit to | The sealed table as a mechanism | https://doi.org/10.1016/0022-0531(83)90048-0 |
| Chatterjee and Samuelson, Operations Research 31(5), 835 to 851 | 1983 | Bargaining under incomplete information; the sealed-bid double auction | The sealed table's ancestor | https://doi.org/10.1287/opre.31.5.835 |
| Mert Mumtaz, Helius, via Genfinity | 7 Aug 2026 | The strongest AI and crypto overlap is security, not agent payments; institutions want privacy tuned to policy | Security first | https://genfinity.io/2026/08/07/helius-mert-mumtaz-solana-privacy-protocol-encrypted-balances/ |

The README's problem section may use at most three of these beside the section A1 to A3 rows; the site's section 2a uses them all. Never quote a paraphrase as if verbatim.

### A5. Stack documentation the README and the website cite

| Source | What it supports |
| --- | --- |
| NEAR docs, Chain Signatures implementation: https://docs.near.org/chain-abstraction/chain-signatures/implementation | Obtaining a signature and relaying the signed transaction are separate steps; the basis for the in-flight panel and `burn_nonce`. Never claim revocation recalls a signed transaction |
| OutLayer trust and verification: https://app.outlayer.ai/docs/trust-verification | How `outlayer-verify` checks a job's measurement against the register contract |
| NEAR AI Cloud verification: https://docs.near.ai/cloud/verification | Per-response signatures and offline verification |
| NEAR Intents confidential execution: https://intents.near.org/confidential | Confidential Intents is a private execution environment; it does not hide data an application publishes or an ordinary transfer on the destination chain. The reason v1 makes no confidential-settlement claim |

## B. The second vertical: market-maker deals (kept from v2)


Every row was opened on 29 Oct 2026. Quote the paraphrase, link the source, never invent a quote. The argument runs in this order: the deal structure misaligns incentives (1), it has blown up repeatedly with named losses (2), regulators now treat the symptoms as crime (3), the scale is measured (4), the industry's response is disclosure and monitoring without enforcement, which is the gap (5), and two judges are on the record (6).

### 1. The deal structure, described by market makers themselves

| Source | Date | What it says |
| --- | --- | --- |
| Flowdesk, retainer versus loan and call model (a market maker's own explainer): https://flowdesk.co/updates/blogs/67215e228e4bf46d9bd3f247 | 29 Oct 2024 | In the loan-plus-call model the issuer lends a percentage of supply and writes a call option; the market maker sets the strategy, picks the exchanges and is paid through the option. In the retainer model the issuer pays monthly and sets strategy and venues jointly. The unregulated market lets market makers trade against the project's interest, especially in volatility. |
| Cointelegraph Magazine, "Market maker deals are quietly killing crypto projects": https://cointelegraph.com/magazine/market-maker-deals-quietly-killing-crypto-projects | 16 Apr 2025 | Six projects that signed loan-option deals all fell; a lawyer who reviews these deals has seen no token benefit; Enflux calls them information arbitrage and says projects should set clear liquidity KPIs; an accelerator saw tokens handed over and dumped. |
| Kain Warwick on X: https://x.com/kaiynne/status/1904775834826912170 (via Bitcoinist: https://bitcoinist.com/disturbing-truth-about-crypto-market-makers/) | 26 Mar 2025 | Call options exercised and dumped; wash trading on tier-two exchanges; retainers of $50k to $300k+ a month in the 2017 cycle; good market makers keep tight spreads and stay delta neutral; Synthetix was the first project grifted by DWF. |

### 2. Named incidents and losses

| Incident | Date | Numbers | Source |
| --- | --- | --- | --- |
| DWF Labs on Binance | 9 May 2024 | WSJ reported more than $300M of wash trades in 2023 across YGG and at least six other tokens; Binance's surveillance team recommended removing DWF and its head was fired a week later; DWF denied it | https://www.theblock.co/post/293429/dwf-labs-denies-report-that-it-did-300-million-of-wash-trading-on-binance-last-year |
| Mantra (OM) | 13 Apr 2025 | More than 90% drop in hours, more than $5B of market cap gone; Onchain Bureau alleged a loan-option deal with FalconX forced buys at expiry (FalconX and Mantra denied it); OKX cited tokenomics changes and coordinated cross-exchange flows | https://cointelegraph.com/magazine/mantra-om-token-collapsed-24-hours |
| Movement Labs (MOVE) | 2 May 2025 | A market maker sold 66M MOVE for $38M; Binance froze the proceeds; the agreement reportedly gave the counterparty about 5% of supply with incentives tied to a $5B valuation; co-founder suspended; Coinbase suspended trading | https://www.theblock.co/post/352879/movement-labs-suspends-co-founder-rushi-manche-following-market-making-scandal |

### 3. Enforcement and regulation

| Source | Date | What it says |
| --- | --- | --- |
| US Department of Justice, District of Massachusetts: https://www.justice.gov/usao-ma/pr/eighteen-individuals-and-entities-charged-international-operation-targeting-widespread | 9 Oct 2024 | Eighteen individuals and entities charged, including four market makers (Gotbit, ZM Quant, CLS Global, MyTrade); the FBI created its own token, NexFundAI, and three of them wash traded it; more than $25M seized; one market maker told a client that wash volume could get exchange listing fees waived. |
| US Department of Justice, Gotbit sentencing: https://www.justice.gov/usao-ma/pr/cryptocurrency-financial-services-firm-gotbit-and-founder-sentenced-market-manipulation | 13 Jun 2025 | Founder sentenced to eight months, $23M forfeited, the company ordered to dissolve; the third market maker to resolve criminal charges after MyTrade and CLS Global. |
| MiCA Title VI, via Solidus Labs: https://www.soliduslabs.com/post/micas-title-vi-market-abuse-requirements-for-crypto-asset-service-providers | applies from 30 Dec 2024 | The EU market-abuse regime applies to crypto, to any person professionally arranging or executing transactions, with extraterritorial reach; wash trading and manipulation are market abuse in the EU. |

### 4. The scale, measured

| Source | Date | What it says |
| --- | --- | --- |
| Cong, Li, Tang and Yang, "Crypto Wash Trading", Management Science 69(11): https://nber.org/papers/w30783 | 2023 | Across 29 exchanges, wash trading averaged more than 70% of reported volume on unregulated venues, trillions of dollars a year. |
| Chainalysis, via Economy Middle East: https://economymiddleeast.com/news/suspected-wash-trading-blockchains-2-57-billion-2024-report | Jan 2025 | Up to $2.57B of suspected wash trading on select blockchains in 2024; 4.52% of all tokens launched in 2024 showed pump-and-dump patterns. |
| Binance Research, via Cointelegraph: https://cointelegraph.com/news/binance-urges-small-medium-projects-high-fdv-trend | 20 May 2024 | About $155B of tokens unlock between 2024 and 2030; 80% of tokens listed on Binance in the prior six months fell after launch (per researcher Flow). |
| LO:TECH survey via The Block: https://www.theblock.co/post/367243/global-survey-reveals-deep-mistrust-in-crypto-market-making-urgent-call-for-transparency | 19 Aug 2025 | 52% of more than 2,000 respondents do not trust market makers; 67% want transparency on activity and fees; the report asks for real-time dashboards and enforceable KPI contracts. Commissioned by a market maker; say so. |
| Novora disclosure study via Cointelegraph: https://cointelegraph.com/news/crypto-market-maker-disclosure-study-novora-report | 16 Apr 2026 | Fewer than 1% of more than 150 protocols disclose any market-maker terms; one (Meteora) does; called the single most consequential transparency gap in the industry. |

### 5. The industry's response so far: disclosure and monitoring, no enforcement

| Source | Date | What it says | The gap it leaves |
| --- | --- | --- | --- |
| Binance updated market-maker guidance: https://www.unlock-bc.com/en/binance-tightens-rules-for-token-market-makers (also https://finance.yahoo.com/markets/crypto/articles/binance-requests-market-maker-transparency-191855624.html) | 25 Mar 2026 | Projects must disclose the market maker's identity, legal entity and agreement terms; profit-sharing and guaranteed-return arrangements banned; token loans must state how borrowed tokens may be used; blacklisting for misconduct. | Disclosure of terms, not proof the terms were kept. A Glassbook mandate is the stated permitted use, with the proof. |
| Forgd market-maker leaderboard on DefiLlama: https://cointelegraph.com/news/forgd-market-maker-leaderboard-defillama | 5 Aug 2026 | Spread, depth, volume and uptime ratings across 35 market-making firms and more than 500 projects. | Ratings depend on data market makers choose to share, and nothing is enforced. Glassbook measures the market maker's own orders inside an enclave and releases the fee by contract. |
| Haseeb Qureshi, Dragonfly roundtable, via ChainCatcher: https://www.chaincatcher.com/en/article/2182079 | 19 May 2025 | Three channels to normalise disclosure: exchanges require it, VCs require it, market makers refuse non-disclosing counterparties. | All three are norms. Glassbook is the contract. |

### 6. Judges on the record

| Judge | Source | Date | Paraphrase |
| --- | --- | --- | --- |
| Kain Warwick | X thread above; Unchained episode: https://unchainedcrypto.com/at-what-price-freedom-stopping-all-out-crime-in-crypto-market-making/ | 26 Mar and 1 Apr 2025 | Options exercised and dumped, wash trading, exit liquidity; an episode on market makers veering into "all-out crime" that ends on "what's the solution?" |
| Haseeb Qureshi | ChainCatcher roundtable above | 19 May 2025 | Ideal disclosure leaves almost no information gap; three channels to normalise it; market makers are repeat players while teams launch once. |

Not found on the record about market-maker deals: Mert Mumtaz, Eddy Lazzarin, Avichal Garg, Illia Polosukhin, Stepan Gershuni. Cite Illia only for private trading on NEAR Intents (https://crypto.news/near-co-founder-pitches-ai-pets-private-trading/, 3 Oct 2026) and Mert only for privacy and security (https://genfinity.io/2026/08/07/helius-mert-mumtaz-solana-privacy-protocol-encrypted-balances/, 7 Aug 2026).

### The one-paragraph version for the README

Market-maker deals are the least transparent contract in crypto: fewer than 1% of protocols disclose their terms, the loan-plus-call structure pays the market maker on price rather than on liquidity, and the self-reported monthly report is the only evidence a project gets. The results are public: $300M of alleged wash trades for one firm on one exchange, $5B of market cap gone from one token in a day, $38M extracted from another before the exchange froze it, and four market makers criminally charged after the FBI built a token to catch them. Regulators now treat the symptoms as market abuse, the largest exchange now demands the terms, and the industry's answer is dashboards. Glassbook is the missing piece: a mandate that states what the market maker may do, an enclave that measures what it did, and a contract that pays only for the difference.

### 7. The fixes tried so far, and where each one stops

Every fix on the market moves one piece of the problem and leaves the others. Glassbook moves all four at once: the project keeps custody, the strategy stays sealed, the market maker's own orders are measured, and the measurement is what pays. Use this in the README's prior-art section.

| Fix | Who | What it does | Custody stays with project | Strategy sealed | Own orders measured | Payment follows measurement | Where it stops |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Retainer model | Flowdesk and most tier-one firms (https://flowdesk.co/updates/blogs/67215e228e4bf46d9bd3f247) | Monthly fee instead of an option; strategy and venues agreed jointly | No, tokens and quote are still lent | Yes | No, self-reported | No, the fee is flat | Trust the monthly report |
| Liquidity SLAs in the contract | Golub 2023 (https://hackernoon.com/the-secret-behind-market-making-superpowers-is-in-the-liquidity-slas); Enflux in Cointelegraph (https://cointelegraph.com/magazine/market-maker-deals-quietly-killing-crypto-projects) | Spread and depth targets written into the deal | No | Yes | No, nobody measures them independently | Only by lawsuit | A clause with no sensor |
| Better option terms | Kain Warwick: European calls instead of American (https://x.com/kaiynne/status/1904775834826912170) | Harder to pump and exercise | No | Yes | No | No | Softens the option, keeps the loan |
| Disclosure rules | Binance guidance, Mar 2026 (https://www.unlock-bc.com/en/binance-tightens-rules-for-token-market-makers); Haseeb Qureshi's three channels (https://www.chaincatcher.com/en/article/2182079) | Terms reported to the exchange, profit-sharing banned, permitted use stated | No | Yes | No | No | Knowing the terms is not knowing they were kept |
| Monitoring and ratings | Forgd on DefiLlama, 35 firms, 500+ projects (https://cointelegraph.com/news/forgd-market-maker-leaderboard-defillama) | Spread, depth, volume, uptime dashboards | No | Yes | Partly, from data firms choose to share | No | Sees, cannot enforce |
| Exchange surveillance | Binance's own team; the DWF episode (https://www.theblock.co/post/293429/dwf-labs-denies-report-that-it-did-300-million-of-wash-trading-on-binance-last-year) | Detects wash trading, offboards accounts | No | Yes | Yes, but only the exchange sees it | No | Private to the venue; the team that flagged DWF was fired |
| Non-custodial DEX market making | Arrakis, 100+ issuers, $5B+ volume (https://arrakis.finance/project-tokens) | Vault the project controls, Arrakis runs the strategy on Uniswap and Aerodrome | Yes | No, Arrakis is the strategy | Not applicable, no third-party market maker | Not applicable | DEX only; replaces the market maker instead of verifying one; nothing for the exchange leg |
| Decentralised order-book liquidity | Elixir, near a $1B valuation by 2024 (https://www.theblock.co/post/281981/elixir-nears-unicorn-status-8-million-series-b-funding-round-mysten-labs-maelstrom) | A network of LPs supplies order-book liquidity | Yes | No | Not applicable | Not applicable | A liquidity source, not a way to hold a hired market maker to terms |
| Run your own bot | Hummingbot and similar | The project quotes with its own exchange keys | Yes | Not applicable | Yes, trivially | Not applicable | No expertise, no hedging; the project is now the market maker |
| Regulation | MiCA Title VI (https://www.soliduslabs.com/post/micas-title-vi-market-abuse-requirements-for-crypto-asset-service-providers); DOJ cases (https://www.justice.gov/usao-ma/pr/eighteen-individuals-and-entities-charged-international-operation-targeting-widespread) | Wash trading is market abuse; four market makers charged | No | Yes | After the fact, by subpoena | No | Punishes the worst cases years later; nothing for the ordinary deal |

The pattern: the legal fixes keep the loan and trust the report; the technical fixes remove the market maker instead of verifying one, and only on DEXs; the surveillance fixes see without enforcing. Nobody has shipped the sensor inside the contract: a measurement of the hired market maker's own orders that both parties trust because neither produced it, wired to the payment.
