# Accord website: the brief

You are writing and building the public site for Accord. This file is the source of truth. The copy below is final unless a line is marked `draft`; your job is to set it, wire the live values, keep every number footnoted, and refuse to add words that are not here. Where you need to invent (alt text, loading states, 404), stay inside the rules in section 2. When this file and anything else disagree, this file wins; when this file and the contract disagree, the contract wins and you tell Adi.

Companion files in the repository: `GOAL.md` (the product spec; the "Claims and their limits" table there is verbatim on the site), `REFERENCES.md` (every source, sections A1 to A6 and B), `HACKATHON.md` (the organisers' rules; the site is part of a NEAR HACKATHON entry, window closes 14 Nov 2026 23:59 UTC).

## 1. What Accord is, in eight lines

- Category and headline: **The private deal room for agent-to-agent commerce.**
- Thesis line, under the headline everywhere: **Agreements negotiated in private, enforced in public.**
- One-liner (meta description, GitHub About, first line of the README): Accord is the private deal room for agent-to-agent commerce: agreements negotiated in private and enforced in public. Inside the room: Sealed table for the negotiation, Payee for where money may go, and Glassbook, the first deal type.
- The argument: every deal tool today is one side's agent on that side's server (a seller's deal desk on the seller's, a procurement bot on the buyer's). When both companies have an agent, the side with more information wins, so every company arms its agent and every vendor hides its floor. Accord is the room neither side owns.
- Inside the room, four named parts, used identically in the nav, the app, the README and the repository tree: **Sealed table** (`jobs/negotiate`, the negotiation enclave), **terms as policy** (`contracts/agreement`, the approved terms as the agent's only authority), **Payee** (`jobs/verify-payee`, confirmation of payee for agents), **Glassbook** (`jobs/observe` plus the market-making deal type, the first product). Procurement is the reference deal type, named as such, not a part.
- Two questions carry the drama so the headline does not have to: the problem section asks **Whose server do your agents meet on?**; the Glassbook section asks **Did your market maker earn this payment?**
- The interface calls an agreement a deal room. Code, docs and events say agreement.
- Built on NEAR: NEAR AI Cloud private inference, OutLayer attested enclaves, function-call keys, Chain Signatures; settled in USDC on Base. Testnet live; mainnet after an audit.

## 2. Rules the copy follows

1. Numbers over adjectives. Every sourced number carries a footnote marker `[n]` that links to the matching row in section 9; no sourced number without a row. Live values and the product's own parameters (`24 h`, `k` of `n`, `1%` of mid, counts read from the contract) carry no marker.
2. No word the reader has to trust: never secure, trustless, bank-grade, military-grade, AI-powered, seamless, revolutionary, autonomous (as an adjective for the product). Say what is checked and by whom.
3. Every guarantee is stated with its limit next to it. The five claims and their limits in section 4.8 appear verbatim; nothing on the site may be stronger than that table.
4. Retired phrases, never to be written in any form: "agreement layer", "hand your agent a budget", "the deal is the account", "the slow middle", "neutral ground" as a headline, "negotiated blind", "executable agreements" or "smart legal contracts" (that is the Accord Project's category, https://accordproject.org/), "keys die everywhere", "revoked everywhere", "private payments", "confidential settlement", "verified business", "nothing leaks".
5. Nothing is attributed to a person who has not said it. Verbatim quotes are marked verbatim and come only from section 9; everything else is a paraphrase and is labelled so. Nobody is called a judge, advisor or supporter.
6. Sentence case for every heading and button. No em-dashes anywhere in our own words; a verbatim quotation keeps its original punctuation. Otherwise use a colon, a semicolon or a full stop. Monospace for every metric, command, account id, refusal string and state name.
7. Two audiences, buyer first, vendor second. Primary button `Open a deal room`, secondary `Verify your domain`.
8. If a screen is not live on testnet it does not appear. A recorded Glassbook agreement is labelled recorded.
9. One comparison table on the site (section 4.11), naming real products; every cell must be defensible from the linked docs, otherwise the cell says "not addressed".
10. Do not add sections, testimonials, logo walls, counters of volume, a dated roadmap, or judges' names in the hero.

## 3. Page structure

| # | Section | Anchor | Job |
| --- | --- | --- | --- |
| 0 | Nav | | Accord · The room · Sealed table · Payee · Glassbook · Proof · Security · Docs · GitHub · `Open app` |
| 1 | Hero | `#top` | Category, thesis, mechanism, two doors in, live proof strip |
| 2 | The problem | `#problem` | Whose server do your agents meet on? Three cards, the host's sentence |
| 2a | In their words | `#named` | Who has named this problem: people, companies, research, regulators |
| 2b | What's in the room | `#room` | The four parts, each with guarantee, limit and command |
| 3 | How it works | `#how` | One room, four states |
| 4 | The proof | `#proof` | Seven claims, seven commands; then the open inbox |
| 5 | Security | `#security` | Custody, authority and limits per piece; the privacy boundary; what we do not claim |
| 6 | For buyers, for vendors, one-sided mode | `#buyers` `#vendors` `#one-sided` | Each side in its own terms |
| 6b | Glassbook | `#glassbook` | The first deal type |
| 6c | Where Accord sits | `#compare` | The one comparison table |
| 7 | Under the hood | `#near` | What NEAR does here and what it does not yet; the commands block |
| 8 | FAQ | `#faq` | Twelve questions |
| 9 | References | `#references` | Every number and quote, numbered 1 to 44, with links |
| 10 | Footer | | Final band, columns, badge, microcopy |

## 4. The copy

### 4.1 Hero

Eyebrow: Agreements between companies' agents · built on NEAR · open source · testnet live

Headline: **The private deal room for agent-to-agent commerce.**

Thesis line (large, directly under): Agreements negotiated in private, enforced in public.

Subhead: Two companies' agents negotiate at a sealed table inside an attested enclave that neither side controls; only the terms leave it, and both humans approve them. From then on the contract enforces those terms on the money, in the open: the approved milestone and amount, a payee that proved its own address, and for market making an order book that met the agreed spread and depth. Every refusal is a public event anyone can verify.

Buttons: `Open a deal room` (buyers) · `Verify your domain` (vendors). Tertiary links: Watch the demo (3 min) · Inspect the execution (the public record page, `/record`) · Try to move the money (`#inbox`).

Proof strip (one line, live values): Mandates readable by the other side: `0` · payments outside the approved terms or the bound payee: `0` · emails sent to the demo agent by visitors: `<live:attempts>`, money they moved: `0` · every negotiation verifiable with `outlayer-verify`

Built-on line (small): Built on NEAR AI Cloud · OutLayer · Chain Signatures · settled in USDC on Base

Used-for band (thin strip under the hero): For protocol procurement · grants and accelerator desks · market-making engagements · agent-to-agent services

Hero visual: two live panels. Left, the agreement page from the app on testnet (four-state strip Sealed, Attested, Executing, Settled; approved terms; bound payee with its domain proof; last transfer on Base Sepolia). Right, the live refusal log, newest first, each line a visitor's attempt and the contract's refusal string. Both refresh; neither is an illustration.

### 4.2 The problem

Headline: Whose server do your agents meet on?

Lead: Every deal tool is one side's agent on that side's server. A seller's deal desk runs on the seller's; a procurement bot runs on the buyer's. When both companies have an agent, the side with more information wins, so every company arms its agent and every vendor hides its floor. Three things follow, and today's tools fix at most one of them, from one side.

| Card | Title | Body | Footnotes |
| --- | --- | --- | --- |
| 1 | Negotiation leaks | The moment you tell an agent your bottom line, whoever runs that agent has it. One-sided bots work because they see everything: Walmart's negotiates with `2,000` suppliers at once, closes in days what took weeks, and `75%` of suppliers prefer it. The two-sided version exists only as research and hackathon prototypes, because no vendor will send its walk-away to the buyer's cloud. | [1] [2] |
| 2 | Execution has no boundary | A prompt is not a policy. On 4 May 2026 an agent-driven trading account decoded an instruction hidden in Morse code in a tweet reply and sent about `$175K` to the attacker, with no error raised. That August a coding agent deleted a founder's database. | [3] [4] |
| 3 | Payment follows the last email | Spending limits stop an agent paying too much; nothing stops it paying the right amount to the wrong account. Business email compromise cost `$3.05B` across `24,768` complaints in 2025, the second-largest loss category the FBI counts, behind investment fraud. Banks fixed the human version with confirmation of payee, and Europe now requires it; agents have nothing. | [5] [6] [7] |

Under the cards, verbatim: "Businesses will not deploy agents that expose their revenue, counterparties, or financial operations on a public ledger." Illia Polosukhin, 14 May 2026. [8]

Transition: Accord fixes all three in one room that neither side owns.

### 4.3 In their words

Headline: Who has named this problem.

Lead: Not our framing. The people who run the chains, the funds, the exchanges, the card networks and the research groups have each named a piece of it, in public, with dates. Verbatim where marked; everything else paraphrases the linked source. Each row says which part of the room it points at.

People

| Who | When | What they said | The piece it names |
| --- | --- | --- | --- |
| Illia Polosukhin, NEAR co-founder | 14 May 2026 | "Businesses will not deploy agents that expose their revenue, counterparties, or financial operations on a public ledger." (verbatim) [8] | Privacy of the deal |
| Illia Polosukhin | 26 Feb 2026 | Agents should be treated as hostile by default, with policy caps that hold even if the model is compromised [10] | Terms as policy |
| Eddy Lazzarin, a16z crypto | 28 Apr 2026 | The core unsolved problem is authorization: proving to a counterparty that an agent represents you [12] | The approved mandate as the agent's authority |
| Haseeb Qureshi, Dragonfly | 7 Oct 2026 | The delegation model that works is sub-cards with owner-set limits; privacy wins when it is easy [13] | Scoped keys, private positions |
| Haseeb Qureshi | 19 May 2025 | Ideal disclosure of market-maker terms leaves almost no information gap; market makers are repeat players while teams launch once [33] | Glassbook |
| Kain Warwick, Synthetix and Infinex | 26 Mar 2025 | Options exercised and dumped, wash trading on tier-two venues, retainers of `$50K` to `$300K+` a month [32] | Glassbook |
| Jack Forestell, Visa | 30 Apr 2025 | "These agents will need to be trusted with payments, not only by users, but by banks and sellers as well." (verbatim) [38] | Payee: trust has to come from the seller's side too |
| Simon Willison | 16 Jun 2025 | The lethal trifecta: access to private data, exposure to untrusted content, and the ability to communicate externally; combine the three and an attacker can trick the agent into sending your data to them [35] | The open inbox: swap "exfiltrate" for "pay" and it is our threat model |
| Stepan Gershuni | 2026 | Agents finish long tasks, but more than half needed a person to step in [14] | The exception path |
| Mert Mumtaz, Helius | 7 Aug 2026 | The strongest overlap of AI and crypto is security, not agent payments; institutions want privacy tuned to policy [34] | Security before convenience |

Companies

| Who | When | What they did or said | The piece it names |
| --- | --- | --- | --- |
| Walmart with Pactum | 8 Nov 2022; 26 Apr 2023 | Closing agreements with `68%` of suppliers approached (HBR); `2,000` suppliers at once, about `3%` saved, `75%` preferred it [36] [1] | One-sided negotiation works and pays; the other side's agent cannot join |
| Google, AP2 | 16 Sep 2025 | Signed intent and cart mandates between user, agent and merchant, more than `60` partners [15] | The receipt is standardised; how the terms were reached and what enforces them is not |
| OpenAI with Stripe, Agentic Commerce Protocol | 29 Sep 2025 | "Users stay in control — they explicitly confirm each step before any action is taken." (verbatim) [37] | Human approval as the norm, consumer side |
| Mastercard, Agent Pay | 29 Apr 2025 | "Consumers will have complete control over what the agent is allowed to purchase on their behalf" (verbatim) [39] | Owner-set limits, consumer side; nothing yet for two companies |
| Binance | 25 Mar 2026 | Projects must disclose the market maker and the terms; profit-sharing and guaranteed returns banned [30] | Disclosure of terms without proof they were kept |
| Pay.UK; STET and SEPAmail | 18 Mar 2024; 9 Oct 2025 | Two billion confirmation-of-payee checks; verification of payee mandatory for euro instant payments [6] [7] | Confirmation of payee exists for humans, not for agents |
| OutLayer | docs read 29 Oct 2026 | Allowlists, limits, multisig approvals and freeze for agent wallets [16] | The payer-side allowlist; Payee adds the payee's side |

Research and whitepapers

| Who | When | Finding | The piece it names |
| --- | --- | --- | --- |
| Myerson and Satterthwaite, Journal of Economic Theory | 1983 | Bilateral trade under two-sided private information cannot be efficient, incentive-compatible, individually rational and budget-balanced at once; the literature's response is a mechanism both sides commit to in advance, such as the sealed-bid double auction [43] [44] | Why the sealed table is a mechanism, not a feature |
| Chatterjee and Samuelson, Operations Research | 1983 | Bargaining under incomplete information: the sealed-bid double auction [44] | The sealed table's ancestor |
| Bianchi, Chia, Yuksekgonul, Tagliabue, Jurafsky and Zou, NegotiationArena | 8 Feb 2024 | LLM agents improve payoffs by about `20%` by pretending to be desperate; irrational behaviours quantified [42] | Why code checks the hard limits and humans approve |
| NDAI Agreements; TEE negotiation study | Feb 2025; Mar 2026 | Two-sided sealed negotiation inside enclaves, as research [2] | The sealed table on paper |
| OWASP Top 10 for LLM Applications | 2025 | Prompt injection is LLM01; indirect injection arrives through external content [41] | The open inbox |
| Gartner | 25 Jun 2025 | More than `40%` of agentic AI projects will be cancelled by end of 2027, citing escalating costs, unclear business value or inadequate risk controls [40] | The controls gap |
| Cong, Li, Tang and Yang, Management Science | 2023 | Wash trading above `70%` of reported volume on unregulated venues [29] | Glassbook |
| FBI Internet Crime Complaint Center | 7 Apr 2026 | Business email compromise cost `$3.046B` across `24,768` complaints in 2025 [5] | Payee |

Regulators and enforcement

| Who | When | Action | The piece it names |
| --- | --- | --- | --- |
| US Department of Justice, District of Massachusetts | 9 Oct 2024; 13 Jun 2025 | Eighteen charged, four of them market makers; Gotbit sentenced, `$23M` forfeited [26] [27] | Glassbook |
| European Union, MiCA Title VI | from 30 Dec 2024 | The market-abuse regime applies to crypto, with extraterritorial reach [28] | Glassbook |
| European Union, instant payments regulation | 9 Oct 2025 | Verification of payee mandatory [7] | Payee |

Closing line: Every row above names one piece. No row names the room: the place where two companies' agents meet, where neither position is exposed, and where the money follows the terms both sides approved. That is the gap Accord fills.

### 4.4 What's in the room

Headline: Four parts, one agreement.

Lead: A deal room is one agreement. Four named parts do the work, and each is a directory in the repository you can run. Every part is stated the same way: what it guarantees, where it stops, and the command that shows it.

| Part | What it is | What it guarantees | Where it stops | Command |
| --- | --- | --- | --- | --- |
| Sealed table | The negotiation enclave. Two mandates in, terms out, nothing else. Two agents negotiate on NEAR AI Cloud private inference inside an OutLayer enclave; code checks the terms against both mandates' hard limits before they leave. | Raw mandates never leave the enclave; one run per pair of commitments; the contract accepts only an attested result whose commitments match | The terms you sign show that you accepted them; attestation proves which code ran, not that the deal was good; hardware trust assumptions apply | `make negotiate` |
| Terms as policy | The contract that turns the approved terms into the agent's only authority. One scoped key, one method, every payment matched to milestone, amount, payee version and destination. | Nothing outside the approved terms is ever signed; `revoke` ends every new authorisation in one transaction; signed transfers are listed and burnable | Revocation is not a recall; settlement status is reported by the reporter and checked by the app, not proven to the contract | `make pay` · `make attack` · `make inflight` |
| Payee | Confirmation of payee for agents. The vendor proves control of its domain inside an enclave, its own settlement authority approves the destination, the buyer accepts it, and changes wait `24 h`. | Money can only go to the bound payee version; one key alone cannot change it; every version carries its proof | Proves control and authorisation, not that a company exists; legal KYB is a v2 integration | `make bind-payee` · `make payee-change` |
| Glassbook | The first deal type: market making. An observer samples the venue's public order book inside an enclave and attests spread, depth and uptime; a period pays only when `k` of `n` slots pass. | The retainer follows the measured book, not the monthly report; a failing period is withheld and a human decides | Measures the venue's book, not the market maker's own orders (v1); retainer-only engagements; one venue per agreement | `make observe` · `make glassbook` |

Line under the table: The parts compose in one direction. The sealed table produces the terms, the terms name the payee, the payee binding is what the kill switch protects, and a deal type decides what evidence releases a payment. Remove any one and a company cannot hand an agent a budget. Procurement ships as the reference deal type; Glassbook is the first product.

### 4.5 How it works

Headline: One room, four states.

Lead: A deal room is one agreement on NEAR that neither side owns. It moves through four states, and each move is checked by the contract, not by whichever agent happens to be in the room.

| State | What happens | What the other side sees |
| --- | --- | --- |
| Sealed | The buyer writes a mandate: ceiling, walk-away, schedule, caps. The vendor writes theirs. Each is encrypted in the browser to the negotiation enclave's key. Only a hash of each goes on chain. | A commitment hash. Not the numbers. |
| Attested | The contract requests one run on OutLayer for this pair of commitments. Inside the enclave, two agents negotiate from the sealed mandates, calling models served in NEAR AI Cloud TEEs. Before anything leaves the enclave, code (not the model) checks the proposed terms against both mandates' hard limits. The run returns the terms plus both commitment hashes, and the contract refuses the result unless the hashes match the ones it already holds. | The agreed terms, and a job id anyone can check with `outlayer-verify`. |
| Executing | Both humans approve the terms, and the buyer funds the agreement's Base address, which only the contract can obtain a signature for. From then on the approved terms are the policy: the buyer's agent holds a key that can only call `act`, and `act` refuses any payment whose amount, timing, destination or payee version differs from what was approved. The contract signs each transfer through Chain Signatures; a reporter service broadcasts it on Base and reports its status. | Payment states and refusals on NEAR; the transfers on Base. |
| Settled | The last milestone pays, or either side terminates. The record stays: terms, payments, refusals, and every exception a human approved. | A record both sides can cite. |

Line under the table: The agent runs the agreement inside the terms. Humans set the limits, approve the terms, and approve the exceptions.

Visual: the four states as a horizontal stepper on a line that is the contract. Caption: The contract, not the agent, is what stops the attack.

### 4.6 The proof

Headline: Seven claims. Seven commands.

Lead: Every claim on this page is a line printed by a command in the repository, and the README quotes that line. These are the seven the demo runs, including the one most products leave out: what happens to a payment that was already signed when the kill switch was pulled.

| # | Beat | The line you see | Why it is true |
| --- | --- | --- | --- |
| 1 | Neither side can read the other's mandate | `mandate readable by the other side: NO` (printed for both) | The mandates are encrypted to the enclave's key and the chain holds only hashes. The job's measurement is approved on OutLayer's register contract, and `outlayer-verify job <id>` exits `0`. One run per pair of commitments, so nobody can probe a mandate by re-running the negotiation. |
| 2 | The terms are attested, not asserted | `terms attested · job <id> · commitments match · limits checked` | The contract stores terms only when the enclave's callback carries both commitment hashes it already holds. Inside the enclave, code checks the terms against both mandates' hard limits before they leave. |
| 3 | A redirect fails | `act(Pay) refused: ERR_PAYEE_MISMATCH` | The agent reads an email asking it to pay a new account, and tries. The payee on the agreement is the one the vendor's settlement authority approved and the buyer accepted. The contract never compares the email to anything; it compares destinations. |
| 4 | An altered amount fails | `act(Pay) refused: ERR_AMOUNT_MISMATCH` | The amount must equal the approved milestone, or an exception the buyer approved for it. Nothing else is signed. |
| 5 | The agent is cut off | `canary touched · agent key deleted · new authorisations: none` | Decoy destinations sit in the agent's tools and memory as a tripwire. Touching one calls `revoke`: the agent's key is deleted on NEAR in the same transaction and the contract stops requesting signatures. The tripwire is detection; the defence is rows 3 and 4. |
| 6 | In flight is handled, not hand-waved | `signed, not broadcast: 1 · nonce 7 burned · broadcast failed: nonce used` | Revocation cannot recall a transfer that was already signed. The agreement page lists every signed transfer with its nonce and status; the buyer burns the nonce of any that has not landed, and the stale broadcast fails. Worst case: an authorised payment lands, to the bound payee, at the approved amount. Never a redirect. |
| 7 | A human approves the exception | `exception 1: approved by buyer · milestone 2 amount updated once` | The agent asks, the contract waits, the buyer approves in the app, the payment clears. The change applies once and is recorded. |

Under the table: `Watch the demo` · monospace line: `make negotiate` · `make pay` · `make exception` · `make attack` · `make inflight`. Beats 1, 3, 4 and 6 are terminal captures from the real run, not mockups.

The open inbox (anchor `#inbox`)

Headline: Try to move the money.

Lead: The demo agent's inbox is public. Send it an instruction: new bank details, an urgent invoice, a message from the CEO. The agent is deliberately naive and will act on what you send. The contract refuses anything outside the approved terms and the bound payee, and your attempt appears in the refusal log with the contract's reason.

Form: From (any name) · Subject · Body · `Send to the agent`. Under it, live: `attempts so far: <live:attempts>` · `money moved by attempts: 0` · `last refusal: <live:last_refusal>`.

Rules line: Ten emails an hour per visitor; the agent reads every one; the funds are testnet USDC on Base Sepolia at the agreement's address, shown live; the agent's key can only call `act` on the agreement contract. If you find a way to move the money, open an issue on the repository and we will put your name in the README. The only thing a successful attempt could achieve is a payment to the bound payee at the approved amount.

### 4.7 Security

Headline: Custody, authority and limits, per piece.

Lead: Where the money and the secrets sit, who can act on them, what cannot happen, how to stop it, and what we do not claim. Stated per piece, because a promise is not a specification.

| Piece | Where it is | Who can act | What cannot happen | Kill switch |
| --- | --- | --- | --- | --- |
| Agreement funds | USDC at the agreement's Base address, derived through Chain Signatures. Only the contract can obtain a signature for it, and only through `act`. | The buyer's agent, within the approved terms | A transfer to anyone but the bound payee version. An amount other than the approved one. Any new signature after revocation. | `revoke`, by the buyer |
| Mandates | Sealed blobs. Plaintext exists only inside the negotiation enclave, during the run. | The enclave, during the job | The other party, the operator or the app reading them | Nothing to switch off: the plaintext is gone when the run ends |
| Negotiation | An OutLayer job calling models in NEAR AI Cloud TEEs; one run per pair of commitments | The job | Terms outside either mandate's hard limits; terms not produced by the attested run | Both humans must approve the terms |
| Signed transfers | Listed on the agreement with nonce and status, from the moment the signature is requested | The reporter broadcasts; the buyer can burn a nonce | A signed transfer going anywhere but the bound payee, at any amount but the approved one | `burn_nonce`, by the buyer |
| Payee record | On the contract, versioned, each version tied to a domain proof fetched inside an enclave | The vendor proposes, the vendor's settlement authority approves, a `24 h` timelock runs, the buyer accepts | A change by one key alone; a change without a fresh domain proof | The buyer can pause |

What stays private, and what does not

| Stays private | Visible to the two parties | Public |
| --- | --- | --- |
| Your ceiling, your walk-away, your weights. The negotiation itself: only its hash leaves the enclave. The commercial terms document: encrypted to the two parties, only its hash on chain. | The approved terms, the schedule, every payment, exception and refusal | The payment schedule the contract enforces (amounts and dates) and the transfers on Base, as with any stablecoin payment |

What we do not claim

- Revocation is not a recall. It ends every new authorisation at once; a transfer already signed stays valid on Base until its nonce is used. We list those transfers and let the buyer burn the nonce. Whatever lands was authorised, to the bound payee, at the approved amount.
- "Bound payee" means control of a domain plus approval by the vendor's own settlement authority, with the hash of a company document attested. It is not a legal KYB and does not prove that a company exists.
- "Sealed" means the raw mandates never leave the enclave, under the hardware's trust assumptions. The terms you sign still show that you accepted them, as any signed deal does.
- Attestation proves which code ran, not that the deal was good. The code checks the hard limits; the humans decide whether to sign.
- The payment schedule is visible on NEAR and the transfers are visible on Base. Private settlement is on the roadmap, not on this page.
- Settlement status is reported by the reporter service and checked by the app against Base. The contract does not verify Base receipts in v1.
- The demo agent is deliberately naive about instructions in email. The product is the boundary around the agent, not the agent's judgement.

Pull line (paraphrase, attributed): Illia Polosukhin has argued that agents should be treated as hostile by default, with policy caps that hold even when the model is compromised. Accord is what that looks like as a contract. [10]

### 4.8 The five claims and their limits (verbatim from GOAL.md; render as a table in the Security section)

| We claim | Because | Limit, stated next to it |
| --- | --- | --- |
| The raw mandates never leave the enclave | Each mandate is encrypted in the browser to the negotiation job's key; the chain holds a hash; the job runs once per pair of commitments inside an OutLayer TDX enclave whose measurement is approved on the register contract | Under the hardware's trust assumptions. The final terms reveal that each side accepted them, as any signed deal does. The operator of the enclave is trusted not to break TDX, nothing more |
| The approved terms are the agent's only authority | The agent's key can call `act` and nothing else; `act` refuses any payment whose milestone, amount, payee version or destination differs from the approved terms | The agent's judgement is not protected, only bounded. Attestation proves which code produced the terms, not that the deal was good; the humans decide that |
| Payments go only to the bound payee | The payee is a destination tied to a domain the vendor controls (proof fetched inside an enclave), approved by the vendor's settlement authority, accepted by the buyer, versioned; a change needs a fresh proof, the authority and `24 h` | "Bound" is not "verified as a real business": it proves control and authorisation, not corporate existence. A legal KYB is a v2 integration |
| `revoke` ends every new authorisation at once | It deletes the agent's function-call key and sets the revoked flag in one transaction; the contract requests no further signatures for the agreement | Revocation is not a recall. A transfer signed before `revoke` stays valid on Base until its nonce is used; the contract lists those and the buyer can burn the nonce. Whatever lands was authorised, to the bound payee, at the approved amount |
| Negotiation is private, settlement is not | Mandates and the transcript stay inside the enclave; the commercial terms document is encrypted to the two parties and only its hash is on chain | The payment schedule the contract enforces (amounts and dates) is public on NEAR, and transfers are public on Base, as with any stablecoin payment. Settlement status is reported by the reporter and checked by the app, not proven to the contract |

### 4.9 For buyers, for vendors, one-sided mode (three columns)

For buyers. Headline: Your ceiling never leaves the room.
Body: Software prices rose `12.7%` to `16.4%` a month in 2026 while negotiated discounts averaged `32.8%` off list, so every renewal you do not negotiate is money left on the table, and every renewal you do negotiate costs a person a week. [9] With Accord you write the mandate once: ceiling, walk-away, schedule, caps. The agent negotiates from it without ever being able to reveal it, then executes inside the terms you approved. Anything outside them comes back to you as an exception you approve or refuse in one click.
Bullets: Your walk-away is never readable by the vendor, the vendor's agent, or us. · Payments can only go to the payee the vendor bound to its own domain and its own settlement authority approved, at the amounts you approved. · One `revoke` and the agent can authorise nothing more; anything already signed is listed, and you can cancel it before it lands.
Button: `Open a deal room`

For vendors. Headline: Your floor never leaves the room either.
Body: Buyers' agents are coming whether or not you have one. The question is whether yours negotiates with the same information advantage theirs has. In Accord your mandate is sealed exactly like the buyer's, the terms are attested before either side approves, and the buyer's agent cannot pay anyone but the payee you bound. If someone spoofs your finance team and asks the buyer's agent to update your bank details, the contract refuses and you are told.
Bullets: Your floor stays sealed; the buyer sees terms, not your mandate. · A payee change needs a fresh domain proof, your settlement authority and a `24 h` timelock; one stolen key cannot redirect your receivables. · Binding happens once per domain and is reusable across agreements.
Button: `Verify your domain`

One-sided mode. Headline: No agent on the other side? The room still holds.
Body: Most vendors will not have an agent on day one. In one-sided mode a person on the vendor side negotiates through the app against the buyer's agent. The buyer's mandate stays sealed from them exactly as it would from an agent, and everything after the terms are approved, from payee binding to the kill switch, works the same way.
One bullet: The human still cannot read the buyer's mandate. That is the whole point of the mode.
Button: `See the one-sided flow`

### 4.10 Glassbook

Headline: Did your market maker earn this payment?

Sub-line: Glassbook, the first deal type on Accord: a retainer that pays only when the order book says the market maker showed up.

Lead: Token projects pay market makers to keep their books tight, and almost nobody can tell whether they did. Fewer than `1%` of protocols disclose any terms [21]; the project negotiates without knowing the market rate while the market maker negotiates every week; the KPIs are self-reported, and projects that signed loan-option deals have watched the token fall afterwards [22]; and when it goes wrong it goes wrong in public: more than `$5B` of market cap gone from one token in a day [24], `66M` tokens sold for `$38M` before an exchange froze the proceeds [25], more than `$300M` of alleged wash trades for one firm on one venue [23].

Three lines:

- The project's mandate (maximum retainer, minimum spread, depth and uptime, required venues) and the market maker's (minimum retainer, venues covered, the KPI floor it will commit to) go into the room; only the terms come out.
- An observer runs inside an enclave: it samples the venue's public order book, computes spread, depth within `1%` of mid and uptime against the terms, and attests the result. A period pays when `k` of `n` observation slots pass; otherwise it is withheld and a human decides.
- The market maker's fee destination is a bound payee like any other, and `revoke` works the same way.

The limit, stated: Glassbook v0 measures the venue's book, not the market maker's own orders. Attribution needs the market maker's read-only key inside the enclave; that is v1. Retainer-only engagements in v0; loan-plus-option structures are v1.

Why it is first: the evidence is the strongest of any deal type we looked at (rows 21 to 33), the industry's answer so far is disclosure and dashboards without enforcement [30] [31], and the DOJ now prosecutes the worst cases years later [26] [27]. Nobody has shipped the sensor inside the contract.

Button: `See a Glassbook agreement` (live on testnet, or the recorded one labelled recorded).

### 4.11 Where Accord sits

Headline: One room, compared with one-sided tools.

Lead: Deal desks, policy wallets and payment mandates each solve one side of the problem, from one side's server. The table says exactly what each does and does not do; the references carry the sources.

| | Deal desks (Pactum, seller deal desks) | Policy wallets (OutLayer custody and similar) [16] | Signed payment mandates (Google AP2) [15] | Accord |
| --- | --- | --- | --- | --- |
| Who runs the negotiation | One side's agent, on that side's server | Not a negotiation tool | Not a negotiation protocol | An attested enclave neither side owns |
| What the counterparty sees of your mandate | Everything you type | Not applicable | Not addressed | Nothing; the chain holds a hash |
| Where the terms come from | The desk's own rules and the other side's answers | Typed by the owner's admin | Signed by the user and the merchant | Produced inside the enclave, checked against both mandates, approved by both humans |
| Who sets the payout destination | The platform or the seller | The payer's admin, on an allowlist, changeable by the admin with no delay described in the docs | The merchant | The payee, from a domain it controls, approved by its own settlement authority, changed only after `24 h` |
| What enforces the terms on the money | Escrow release on signature | Limits and allowlists | Nothing on chain | The contract: milestone, amount, payee version and destination, or refusal |
| After revocation | Not applicable | Freeze stops new operations | Not applicable | New authorisations stop at once; signed transfers are listed and burnable |
| Verifiable by a third party | No | Policies evaluated in a TEE | Verifiable credentials | `outlayer-verify` on every run, every refusal an on-chain event |

Footnote line: Dealproof (ETHGlobal NYC) hosted a negotiation in an enclave and planned escrow release; it does not bind the output to on-chain commitments or a payee [2]. Escrow products (Safe, Request) hold funds until someone signs; the terms are not the policy.

### 4.12 Under the hood

Headline: What NEAR does here, and what it does not yet.

Lead: Five pieces of the NEAR stack, each protecting one stated property, each with a command that checks it. Nothing is in the design for decoration.

| Piece | What it protects | How you check it |
| --- | --- | --- |
| NEAR AI Cloud | The negotiation turns run on open-weight models inside TEEs, and every response carries a signature | `make verify-negotiation JOB=<id>` verifies the per-response signatures offline against the transcript hash the enclave published [20] |
| OutLayer | The negotiation, the payee binding and the observer run in attested TDX enclaves. The contract accepts a result only when the job's measurement is approved on OutLayer's register contract and the commitments in the output match the ones on chain | `outlayer-verify job <id>` exits `0` [19] |
| The agreement contract | The approved terms are the only authority the agent has. Every refusal is an event with its reason | Read the events on the testnet explorer, or run `make attack` and watch them appear |
| Named accounts and scoped keys | The agent's key can call `act` on this contract and nothing else. `revoke` deletes it in the same transaction that flags the agreement | `near account list-keys <contract>` shows the key gone after `make attack` |
| Chain Signatures | The agreement's Base address can be signed for only by the contract, only through `act`. Signing and broadcasting are separate steps, which is exactly why signed transfers are listed and burnable [18] | `make inflight` burns a nonce and shows the stale broadcast fail on Base Sepolia |

What NEAR does not do here, yet: confidential settlement (NEAR Intents has no testnet and the transfer lands on Base in the open, so v1 settles on one rail and says so; destination-agnostic payouts through Intents are the next rail); legal KYB (the enclave proves control of a domain and attests a document's hash; a registry lookup is a v2 integration); proving Base receipts to the contract (the reporter reports, the app checks Base; a light client is out of scope).

Commands block (copyable):

```
git clone <repo-url> && cd accord
make setup              # testnet accounts, contract, the agreement's Base Sepolia address
make negotiate          # two sealed mandates in, attested terms out
make verify-negotiation JOB=<id>
make bind-payee         # domain proof in the enclave, authority approves, buyer accepts
make pay                # milestone 1 to the bound payee on Base Sepolia
make exception          # out-of-mandate request, buyer approves, milestone 2 pays
make attack             # redirect refused, amount refused, canary, revoke
make inflight           # the signed-but-unbroadcast transfer, nonce burned
make observe SLOT=1     # Glassbook: one attested observation slot
make glassbook          # the market-making scenario end to end
```

Closing line: Everything above runs on NEAR testnet and Base Sepolia. Mainnet after an audit.

### 4.13 FAQ (accordion, in this order)

1. Isn't this three products stapled together? No. It is one agreement with three stages, and the output of each stage is the input the next stage enforces. The sealed table's terms become the contract's policy; the policy names the bound payee; the payee binding is what the kill switch protects. Remove any stage and a business cannot hand the agent a budget: the negotiation leaks, or the execution is unbounded, or the payment is misdirected.
2. Who can see my mandate? Nobody outside the enclave. Your browser encrypts it to the negotiation job's key; the chain stores a hash; the job decrypts it inside a TDX enclave for one run, and the plaintext is gone when the run ends. The other side sees the terms. What the terms reveal about your mandate is what any signed deal reveals: that you were willing to accept it.
3. What if the model negotiates badly? Then you do not sign. The model proposes; code inside the enclave checks the proposal against both mandates' hard limits before anything leaves; both humans approve the terms before they become policy. Attestation tells you which code ran, not that the deal was good, which is why the approval step is a human. It is also why there is an exception path: in practice, more than half of long agent tasks have needed a person to step in. [14]
4. What if my agent gets tricked? We assume it will. The demo agent follows a spoofed "new bank details" email and tries to pay the attacker. The contract refuses because the destination is not the bound payee, and refuses again when the amount is altered, because the amount is not the approved one. Decoy destinations in the agent's memory trip `revoke`. The agent's judgement is not what protects the money; the contract's comparison is. [10]
5. The vendor really did change banks. What then? The vendor proposes the new destination, the enclave fetches a fresh domain proof, the vendor's settlement authority approves, a `24 h` timelock runs, and the buyer sees all of it before the first payment to the new destination. One stolen key, on either side, cannot do it. Yes, this is slower than updating a field. That is the point.
6. Why not a spending-limit wallet with an allowlist? Allowlists are good, and Accord can run on top of one. The difference is who puts the address on the list. In a policy wallet the payer's admin types it, which is exactly the step business email compromise targets, and the policy changes the moment the admin edits it. In Accord the payee asserts its own destination from a domain it controls, its own authority approves it, changes are delayed, and the whole policy is derived from a negotiation both sides can verify. Haseeb Qureshi has argued that the delegation model that works is a sub-card with owner-set limits; Accord is where the limits and the payee come from. A hackathon sketch, Dhruva Check, put payee tiers on a testnet without the proof, the authority or the delay. [13] [16] [17]
7. How is this different from Google's AP2? AP2 standardises signed mandates between a user, their agent and a merchant, and it is the right shape for the receipt. It does not say how the terms in the cart were reached, and it enforces nothing on chain. Accord's approved terms could be expressed as an AP2 cart mandate; Accord adds how the cart was produced (a sealed two-sided negotiation) and what enforces it (funds the agent cannot move outside the terms, a payee that was bound, a kill switch with a documented in-flight story). [15]
8. How does the vendor know the agent speaks for the buyer? Because the authority is on chain, not in the agent's mouth. The agreement is created by the buyer from a named NEAR account, which adds the agent's key; the agent's authority is exactly the approved terms, which the vendor can read. Eddy Lazzarin has called proving that an agent represents you the core unsolved problem for agent commerce; the attested, approved mandate is our answer to it. [12]
9. Why NEAR? Four things exist here together: function-call keys that scope an agent to one method on one contract and die in one transaction; private inference with a signature on every response; attested enclave jobs that call back into contracts; and Chain Signatures, so the agreement can hold and pay on Base without a bridge. The host has stated the bar: businesses need confidential inference, attestation and human checkpoints before they deploy agents. [11] [8]
10. Who is it for first? Protocol treasuries and DAOs paying the infrastructure vendors they already pay in USDC; foundations running grants and accelerator desks; token projects engaging market makers, through Glassbook; and agents buying services from agents on the NEAR agent market. In every case a human sets the mandate and approves the exceptions.
11. What does it cost? Testnet is free. Planned pricing on mainnet: a flat fee per agreement, paid by the buyer when the terms are approved, and a fee per payee binding, paid by the vendor. No percentage of payment amounts, so the room has no stake in the size of the deal.
12. Is it live? On NEAR testnet and Base Sepolia, yes: the hosted agreement page is the one in the hero, and the repository reproduces it with `make`. Mainnet after an audit, and after the limits above have been pushed back one by one: a registry lookup for KYB, settlement through Intents, receipt verification in the contract.

### 4.14 Footer

Final band. Headline: Negotiated in private. Enforced in public. Sub-line: Open a deal room: ten minutes on testnet. Both sides keep their positions; the contract keeps the terms. Buttons: `Open a deal room` · `Verify your domain`. Small line: Runs on NEAR testnet and Base Sepolia. Mainnet after an audit.

Columns: Product (The room · Sealed table · Payee · Glassbook · Proof · Security · FAQ) · Verify (GitHub · README · Testnet contract `<contract-id>` · Record page · `outlayer-verify` guide [19] · References) · Watch (The demo · The X post) · Company (About · Contact · Terms · Privacy).

Badge: "Built at NEAR HACKATHON, November 2026", linking to the X post and the repository. One badge, no other logos.

Meta: title "Accord: the private deal room for agent-to-agent commerce"; description "Agreements negotiated in private, enforced in public. Sealed table, Payee and Glassbook, built on NEAR."; social image is the two-panel hero with the headline and the thesis line.

Microcopy (refusals use the contract's own strings, then one plain sentence):

| Where | Text |
| --- | --- |
| Mandate editor, empty | Only you will ever read this. It is encrypted in your browser before it leaves. |
| Mandate committed | `mandate sealed · commitment <hash>` Your mandate is sealed. The other side sees this hash and nothing else. |
| Negotiation running | `round 3 of 8` Two agents, one enclave. You will see terms, not the transcript. |
| Terms attested | `terms attested · job <id> · commitments match · limits checked` Approve to make these terms the agent's policy. |
| Payee bound | `payee bound · <domain> · v1` Payments can go here and nowhere else. |
| Refusal, destination | `ERR_PAYEE_MISMATCH` Refused: the destination is not the bound payee (payee v1). Nothing was signed. |
| Refusal, amount | `ERR_AMOUNT_MISMATCH` Refused: the amount is not the approved one for milestone 2. Nothing was signed. |
| Canary | `ERR_CANARY · agent revoked` The agent tried to pay a decoy. Its key was deleted in this transaction. |
| Revoked, in flight | `signed, not broadcast: 1` One transfer was signed before revocation. Burn its nonce to cancel it. |
| Nonce burned | `nonce 7 burned` The stale transfer can no longer land. |
| Exception pending | `exception 1: pending` The agent asked for something outside the terms. Approve or refuse. |
| Payee change pending | `payee change · awaiting authority` Proposed by the vendor. Needs the vendor's settlement authority, then `24 h`. |
| Glassbook slot | `slot 3: FAIL · spread p50 48 bps · depth min 9,800 · uptime 71%` One of `n` observations for period 2. |
| Period withheld | `period 2: Withheld · 1 of 3 slots passed` The market maker may request an exception; the buyer decides. |
| Settled | `state: Settled` Every payment, refusal and exception is on the record page. |

## 5. Live values

Placeholders the site fills from the contract, the app's API and the Base RPC; never hard-code them: `<live:attempts>` (visitor emails sent), `<live:last_refusal>` (last refusal string and time), `<live:agreement>` (the demo agreement id and state), `<live:balance>` (the agreement's Base Sepolia USDC and ETH), `<live:slots>` (Glassbook observations for the current period), `<contract-id>`, `<repo-url>`, `<demo-url>` (the X post), `<record-url>`. If a live value cannot be fetched, show the last known value with its timestamp, never a fake one.

## 6. Design direction

Dark page. Satoshi for text; a monospace face for every number, command, state and refusal string. Red appears only for a refusal, a canary trip and a revocation; one accent colour for everything else. The hero is two live panels, not an illustration. Section 2a is set small and dense, like a bibliography. Section 2b is four equal cards: name large, guarantee under it, limit smaller, command in monospace at the foot. Tables are plain, full width, with monospace numbers. Every section ends in a command or a call to action, never a slogan. Phone width: 16 px gutters, tables scroll horizontally inside their container, no horizontal page scroll. No animation beyond the live values updating.

## 7. Definition of done for the site

- Every number on the page has a footnote marker, and every marker resolves to its row in section 9; no row is unreferenced, no marker is orphaned.
- `grep -ri` for every retired phrase and every trust word in section 2 returns nothing in the built site, including alt text and meta tags.
- The five claims table (4.8) matches `GOAL.md` byte for byte.
- Every button and link resolves: `Open a deal room` to `/agreements/new`, `Verify your domain` to `/payee` (the vendor onboarding route in GOAL.md), the demo to `<demo-url>`, the record page to `<record-url>`, GitHub to `<repo-url>`.
- The open inbox posts into the agent's inbox store, is rate-limited to `10` an hour per visitor, holds no key and cannot call the contract.
- Live values come from live sources; the page renders with last-known values if a source is down.
- Nothing recorded is shown as live; the recorded Glassbook agreement, if used, carries the word recorded next to its title.
- The page passes a screen reader on the hero, the four cards and the proof table; tables have headers; the refusal log is a live region.
- Lighthouse performance and accessibility above `90` on a phone profile.

## 8. How to work

Read this file, then `GOAL.md` and `REFERENCES.md`. Build the page in the order of section 3, section by section, committing after each. Set the copy exactly as written; do not improve it. Where a value is live, wire the source and the fallback. Run the checks in section 7 and print each result with the literal output before telling Adi the site is ready. If anything here cannot be made true by the product as built (a command that does not print the quoted line, a claim the contract does not enforce), stop and report it; do not soften the line to fit.

## 9. References (the numbered rows every footnote resolves to; all opened 29 Oct 2026)

| # | Source | Date | Link |
| --- | --- | --- | --- |
| 1 | Fox Business, Walmart using AI to negotiate with vendors (Pactum): `2,000` suppliers, about `3%` saved, `75%` preferred it | 26 Apr 2023 | https://foxbusiness.com/technology/walmart-using-ai-negotiate-cost-purchase-terms-vendors-shorter-timeframe |
| 2 | NDAI Agreements (arXiv 2502.07924); TEE negotiation study (arXiv 2603.19011); Dealproof, ETHGlobal NYC prototype | Feb 2025; Mar 2026; 2026 | https://arxiv.org/abs/2502.07924 · https://arxiv.org/abs/2603.19011 · https://github.com/kkoci/Dealproof |
| 3 | Alex Spinov on dev.to with SlowMist: an agent-driven account sent about `$175K` after a Morse-code prompt in a tweet | 4 May 2026 | https://dev.to/alex_spinov/grok-lost-175k-to-a-tweet-add-a-pre-send-tx-canary-1mbe |
| 4 | Unchained: a coding agent deleted Kain Warwick's database | 14 Aug 2026 | https://www.kazuha.ai/sources/unchained/posts/uneasy-money-an-agent-deleted-kain-s-database-two-ai-models-rebuilt-it-in-30-sec |
| 5 | FBI IC3 2025 report via McDonald Hopkins: BEC `$3.046B`, `24,768` complaints | 7 Apr 2026 | https://www.mcdonaldhopkins.com/insights/news/the-sobering-truth-of-the-fbis-2025-internet-crime-complaint-center-report |
| 6 | Pay.UK, Confirmation of Payee reaches two billion checks | 18 Mar 2024 | https://www.wearepay.uk/confirmation-of-payee-reaches-two-billion-checks-helping-protect-uk-consumers-against-fraud/ |
| 7 | STET and SEPAmail, interoperable Verification of Payee for 9 Oct 2025 | 9 Oct 2025 | https://www.stet.eu/en/news/news1/stet-and-sepamaileu-will-set-up-an-interoperable-verification-of-payee-(vop)-solution-for-october-9th-2025.html?page=8 |
| 8 | Illia Polosukhin, NEAR AI announcement, PR Newswire (verbatim quote) | 14 May 2026 | https://tools.prnewswire.com/en-us/live/20813/release/20260514EN59736 |
| 9 | Vertice, SaaS inflation index: `12.7%` to `16.4%` a month; discounts average `32.8%` | Oct 2026 | https://www.vertice.one/insights/saas-inflation-rate |
| 10 | Illia Polosukhin on The Chopping Block (paraphrase) | 26 Feb 2026 | https://rosetta.to/u/unchainedcrypto/the-ai-agent-revolution-crypto-isn-t-talking-about-the-chopping-block |
| 11 | Illia Polosukhin on Bankless (paraphrase) | 24 Mar 2026 | https://rosetta.to/u/bankless/illia-polosukhin-why-ai-agents-are-still-useless-and-what-fixes-them-near-founde |
| 12 | Eddy Lazzarin, a16z crypto, via TechFlow (paraphrase) | 28 Apr 2026 | https://www.techflowpost.com/en-US/article/31368 |
| 13 | Haseeb Qureshi at TOKEN2049, via RootData (paraphrase) | 7 Oct 2026 | https://www.rootdata.com/news/781111 |
| 14 | Stepan Gershuni, cryptoEssay (paraphrase) | 2026 | https://t.me/s/cryptoEssay |
| 15 | Google Cloud, Announcing Agents to Payments (AP2) | 16 Sep 2025 | https://cloud.google.com/blog/products/ai-machine-learning/announcing-agents-to-payments-ap2-protocol |
| 16 | OutLayer, agent custody documentation | read 29 Oct 2026 | https://app.outlayer.ai/docs/agent-custody |
| 17 | Dhruva Check, hackathon project | 2026 | https://hackquest.io/projects/Dhruva |
| 18 | NEAR docs, Chain Signatures implementation (signing and relaying are separate steps) | current | https://docs.near.org/chain-abstraction/chain-signatures/implementation |
| 19 | OutLayer, trust and verification (`outlayer-verify`) | current | https://app.outlayer.ai/docs/trust-verification |
| 20 | NEAR AI Cloud, verification (per-response signatures) | current | https://docs.near.ai/cloud/verification |
| 21 | Novora disclosure study via Cointelegraph: fewer than `1%` of `150+` protocols disclose terms | 16 Apr 2026 | https://cointelegraph.com/news/crypto-market-maker-disclosure-study-novora-report |
| 22 | Cointelegraph Magazine, market maker deals are quietly killing crypto projects | 16 Apr 2025 | https://cointelegraph.com/magazine/market-maker-deals-quietly-killing-crypto-projects |
| 23 | The Block on the WSJ report about DWF Labs: more than `$300M` of alleged wash trades | 9 May 2024 | https://www.theblock.co/post/293429/dwf-labs-denies-report-that-it-did-300-million-of-wash-trading-on-binance-last-year |
| 24 | Cointelegraph Magazine on Mantra (OM): more than `$5B` gone in a day | 13 Apr 2025 | https://cointelegraph.com/magazine/mantra-om-token-collapsed-24-hours |
| 25 | The Block on Movement Labs: `66M` MOVE sold for `$38M` | 2 May 2025 | https://www.theblock.co/post/352879/movement-labs-suspends-co-founder-rushi-manche-following-market-making-scandal |
| 26 | US DOJ, District of Massachusetts: eighteen charged, four market makers | 9 Oct 2024 | https://www.justice.gov/usao-ma/pr/eighteen-individuals-and-entities-charged-international-operation-targeting-widespread |
| 27 | US DOJ, Gotbit sentencing: `$23M` forfeited | 13 Jun 2025 | https://www.justice.gov/usao-ma/pr/cryptocurrency-financial-services-firm-gotbit-and-founder-sentenced-market-manipulation |
| 28 | MiCA Title VI market-abuse requirements, via Solidus Labs | from 30 Dec 2024 | https://www.soliduslabs.com/post/micas-title-vi-market-abuse-requirements-for-crypto-asset-service-providers |
| 29 | Cong, Li, Tang and Yang, Crypto Wash Trading, Management Science (NBER w30783) | 2023 | https://nber.org/papers/w30783 |
| 30 | Binance market-maker guidance, via Unlock | 25 Mar 2026 | https://www.unlock-bc.com/en/binance-tightens-rules-for-token-market-makers |
| 31 | Forgd market-maker leaderboard on DefiLlama, via Cointelegraph: `35` firms, `500+` projects | 5 Aug 2026 | https://cointelegraph.com/news/forgd-market-maker-leaderboard-defillama |
| 32 | Kain Warwick on X; Unchained episode on market making | 26 Mar and 1 Apr 2025 | https://x.com/kaiynne/status/1904775834826912170 · https://unchainedcrypto.com/at-what-price-freedom-stopping-all-out-crime-in-crypto-market-making/ |
| 33 | Haseeb Qureshi, Dragonfly roundtable, via ChainCatcher (paraphrase) | 19 May 2025 | https://www.chaincatcher.com/en/article/2182079 |
| 34 | Mert Mumtaz, Helius, via Genfinity (paraphrase) | 7 Aug 2026 | https://genfinity.io/2026/08/07/helius-mert-mumtaz-solana-privacy-protocol-encrypted-balances/ |
| 35 | Simon Willison, The lethal trifecta for AI agents | 16 Jun 2025 | https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/ |
| 36 | Harvard Business Review, How Walmart Automated Supplier Negotiations (Van Hoek, DeWitt, Lacity, Johnson): `68%` of suppliers approached | 8 Nov 2022 | https://hbr.org/2022/11/how-walmart-automated-supplier-negotiations |
| 37 | OpenAI, Buy it in ChatGPT: Instant Checkout and the Agentic Commerce Protocol with Stripe (verbatim quote) | 29 Sep 2025 | https://openai.com/index/buy-it-in-chatgpt/ |
| 38 | Visa, Find and Buy with AI: Visa Intelligent Commerce (Jack Forestell, verbatim quote) | 30 Apr 2025 | https://usa.visa.com/about-visa/newsroom/press-releases.releaseId.21361.html |
| 39 | Mastercard, Agent Pay (verbatim quote) | 29 Apr 2025 | https://www.mastercard.com/news/press/2025/april/mastercard-unveils-agent-pay-pioneering-agentic-payments-technology-to-power-commerce-in-the-age-of-ai/ |
| 40 | Gartner, more than `40%` of agentic AI projects cancelled by end of 2027 | 25 Jun 2025 | https://www.gartner.com/en/newsroom/press-releases/2025-06-25-gartner-predicts-over-40-percent-of-agentic-ai-projects-will-be-canceled-by-end-of-2027 |
| 41 | OWASP Top 10 for LLM Applications, LLM01:2025 Prompt Injection | 2025 | https://genai.owasp.org/llmrisk/llm01-prompt-injection/ |
| 42 | Bianchi et al., How Well Can LLMs Negotiate? NegotiationArena (ICML 2024): about `20%` better payoffs by feigning desperation | 8 Feb 2024 | https://arxiv.org/abs/2402.05863 |
| 43 | Myerson and Satterthwaite, Efficient Mechanisms for Bilateral Trading, Journal of Economic Theory 29(2) | 1983 | https://doi.org/10.1016/0022-0531(83)90048-0 |
| 44 | Chatterjee and Samuelson, Bargaining under Incomplete Information, Operations Research 31(5) | 1983 | https://doi.org/10.1287/opre.31.5.835 |

Also cited in the under-the-hood section without a number: NEAR AI Cloud private inference https://docs.near.ai/cloud/private-inference · OutLayer getting started https://app.outlayer.ai/docs/getting-started · NEAR Intents confidential execution https://intents.near.org/confidential (the reason the site makes no confidential-settlement claim) · the Accord Project https://accordproject.org/ (the reason the site never says "executable agreements").
