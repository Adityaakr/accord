# Accord website: final copy

Everything under "Part A" is text visitors read, in page order. "Part B" is for the people building the page and is never rendered. Product names are fixed: Accord, Sealed Table, Agreement controls, Payee, Glassbook. Headline: "The private deal room and control plane for agent-to-agent commerce." Deal room names the negotiation half and the category; control plane names the enforcement half (Agreement controls, Payee, revocation) and separates the contract, which decides, from the rail on Base, which moves the money. The interface calls an agreement a deal room; code, documentation and events say agreement.

---

## Part A. Visitor-facing copy

### Navigation

Accord · Glassbook · How it works · Sealed Table · Payee · Security · Research · Docs · GitHub · `Open a deal room`

### Hero

Built on NEAR · open source · running on testnet

**The private deal room and control plane for agent-to-agent commerce.**

Agreements negotiated in private, enforced in public.

Accord is the deal room where two companies' agents negotiate a commercial agreement in confidence, and the control plane that enforces the approved terms on what the buyer's agent may authorise and pay. It is built for treasuries, procurement teams and foundations that already pay vendors in stablecoins. The first application, Glassbook, applies it to market-making agreements.

`Open a deal room` · `Explore Glassbook`

Product preview caption: A live agreement on NEAR testnet: the approved terms, the authorised recipient, and payments and refusals as they happen.

### Audience band

Built for treasuries · procurement teams · foundations · market makers and the projects that engage them

### Glassbook

The first application built on Accord

**Glassbook: liquidity agreements paid on measured conditions.**

Token projects and foundations engage market makers for a retainer and a set of quoting commitments. Glassbook turns that engagement into an Accord agreement.

Each side states its position in confidence: the retainer, the maximum spread, the minimum depth within one percent of the mid price, the required uptime, the venue and the observation schedule. The Sealed Table negotiates the terms; both sides approve them.

Each period, an observer inside an attested enclave samples the venue's public order book on the agreed schedule and records whether the conditions were met. A period pays when the agreed number of observation slots pass; otherwise it is withheld and people on both sides decide. The demonstration shows the approved conditions, every slot with its attestation, each period's decision and the transaction on Base Sepolia.

Scope: the venue's order book shows the market's condition, not which participant provided it. Attributing liquidity to the market maker's own account needs authenticated account data from the venue, which is planned and not yet implemented. Glassbook pays on the conditions as agreed; it does not yet establish who met them.

`See the Glassbook demonstration`

Join as a project or a market maker →

### Why these belong together

**Negotiation, approval and payment in one place.**

Kept in separate systems, each step leaks or breaks on its own: a negotiation run by one company's agent exposes the other company's position to it; an approval kept in email gives an agent nothing it can enforce; a payment instruction that arrives by message is what fraud imitates. In Accord, each step's output is what the next step enforces. The Sealed Table's terms are what both companies approve, the approved terms are the agent's only authority, and the recipient established through Payee is the only destination that authority can reach.

### How it works

**How a deal room works.**

1. Sealed. Each company seals its mandate in the browser; only a commitment hash is recorded.
2. Attested. The Sealed Table negotiates inside an attested enclave; code checks the result against both mandates' limits; the terms are recorded with an attestation anyone can verify.
3. Executing. Both companies approve, and the buyer funds the agreement's address on Base. The agent holds one key for one method; a payment must match the approved milestone, amount and recipient, or it is refused and recorded.
4. Settled. Payments complete under the agreed conditions, people decide the exceptions, and the record remains.

### Sealed Table, Agreement controls and Payee

**The parts of the room.**

Sealed Table. Confidential negotiation between agents. Two sealed mandates enter an attested enclave on NEAR; the agents negotiate with private inference, and deterministic code checks each proposal against both mandates' limits. Only the terms, the commitment hashes and an attestation come out.

Agreement controls. The control plane: the approved terms, enforced by the contract. A payment request must match the milestone, the amount, the recipient version and the destination, or it is refused and recorded. Revocation removes the agent's key and stops new authorisations in one transaction. The transfer itself, on Base, is the data plane; the contract decides, the rail moves.

Payee. Recipient authorisation. A vendor proves control of its domain inside an enclave, its settlement authority approves the destination, and the buyer accepts it. A change needs a fresh proof, the authority's approval and a 24-hour delay.

`Verify your domain`

### Why now

Why now

**An agent can be talked into paying. The contract cannot.**

Losses reported to the FBI in 2025 · `$20.9B` · Up from `$6.9B` in 2021 · [chart: `losses.svg`]

Business email compromise, 2025 · `$3.0B` · 24,768 complaints about messages that redirect or request a payment

Complaints that referenced AI, 2025 · `22,364` · `$893M` in losses. The FBI notes that AI-made content is getting harder to detect and easier to make.

Source: FBI Internet Crime Complaint Center, Internet Crime Reports for 2025 and 2023.

Agents now read the messages. In May 2026, a wallet bot paid an attacker tokens then valued at $150,000 to $174,000 after an AI model on X translated a reply written in Morse code into a transfer instruction. The UK's National Cyber Security Centre warns that prompt injection "may never be totally mitigated" and recommends deterministic safeguards outside the model. In Accord, the contract is that safeguard: it checks every payment against the approved terms and the authorised recipient.

Worst case

The most a hijacked agent can do is make a payment you already approved, to the recipient you already accepted, when it falls due.

Figure caption: Where each attack stops. Each attack ends at a check in code; the tags give the closest entry in the OWASP Top 10 for Agentic Applications.

Try to move the money ↓

### Security demonstration

**Try to move the money.**

The demonstration agent's inbox is public. Send it new bank details, an urgent invoice or an instruction from the chief executive; the agent is deliberately literal and will act on it, and your attempt appears in the public refusal log with the contract's reason. Revocation is shown exactly: the agent's key is removed and new authorisations stop at once, and a transfer signed before revocation is listed so the buyer can cancel it before it is broadcast.

From · Subject · Message · `Send to the agent`

Attempts so far: live count · Money moved by attempts: `0` · Ten messages an hour per visitor · Testnet USDC on Base Sepolia

### Privacy and control

**What stays private, what is public, and what Accord does not do.**

Private to each company: its mandate and the negotiation; only hashes leave the enclave. Visible to both companies: the approved terms, the schedule, every payment, exception and refusal. Public: the payment schedule the contract enforces and the transfers on Base, as with any stablecoin payment.

Accord does not recall a signed transfer; revocation stops new authorisations and lists signed transfers for cancellation. It does not verify that a company legally exists; Payee establishes control of a domain and approval by the recipient's authority. It does not prove that a negotiation was fair or that external data is truthful; attestation shows which code ran on which inputs. It does not verify Base receipts inside the contract; a reporter service reports status and the application checks the chain. Mainnet follows an audit.

Security documentation →

### Research

**The research behind the room.**

Confidential negotiation, delegated authority and payment verification each have an established body of research and practice. These are the foundations informing Accord's design.

Confidential disclosure under hold-up. In NDAI Agreements, Matthew Stephenson, Andrew Miller and co-authors model a seller who cannot reveal an idea without risking its appropriation, and show that delegating disclosure and payment to tamper-proof programs in trusted execution environments lets both sides transact. The Sealed Table follows this design. [Source](https://arxiv.org/abs/2502.07924)

Scoped delegation at the contract level. Christian Crowley, Christian Catalini, Andrew Hall, Elizabeth Harkavy, Noah Levine and Sean Neville argue for tools that "let users define, at the smart contract level, what an agent can and cannot do." Accord's agent holds one key, one method and the approved terms. [Source](https://a16zfrontier.com/posts/article/5-ways-blockchains-help-ai-agents/)

Liquidity contracts with obligations create value. Albert Menkveld and Ting Wang studied 74 Euronext small-caps whose designated market makers guaranteed a minimum liquidity supply for a fixed fee, and measured higher liquidity, lower liquidity risk and a 3.5% abnormal return. Glassbook makes the obligation measurable each period. [Source](https://doi.org/10.1016/j.finmar.2012.12.003)

Explore the research →

### Closing

**Open a deal room.**

Ten minutes on NEAR testnet. Each side keeps its position; the contract keeps the terms.

`Open a deal room` · `Explore Glassbook`

Runs on NEAR testnet and Base Sepolia. Mainnet follows an audit.

### FAQ

**Questions.**

**Who can see my mandate?**
No one outside the enclave. Your browser encrypts it to the Sealed Table's key, the chain stores a hash, and the enclave decrypts it for one negotiation. The other side sees the agreed terms. What the terms reveal is what any signed agreement reveals: that you were willing to accept them.

**What if the model negotiates badly?**
You do not approve the terms. The model proposes; code checks each proposal against both mandates' limits before anything leaves the enclave; both companies approve before the terms take effect. Attestation shows which code ran, not that the deal was good. That judgement stays with people.

**What if my agent is tricked?**
Assume it will be. The demonstration agent follows a spoofed request for new bank details and tries to pay. The contract refuses because the destination is not the authorised recipient, and refuses again when the amount is changed. The agent's judgement is not what protects the money; the contract's comparison is.

**Our vendor really did change banks. What happens?**
The vendor proposes the new destination, the enclave fetches a fresh domain proof, the vendor's settlement authority approves, a 24-hour delay runs, and the buyer sees each step before the first payment to the new destination. One stolen key, on either side, cannot do it.

**How does Glassbook decide whether a period pays?**
The approved terms set the venue, the observation schedule, the maximum spread, the minimum depth and the required uptime. An observer in an attested enclave records each slot. A period pays when the agreed number of slots pass; otherwise it is withheld and people on both sides decide. Glassbook currently measures the venue's order book, not the market maker's own orders.

**Can we use Accord if the other side has no agent?**
Yes. In one-sided mode a person on the vendor side negotiates through the application against the buyer's agent. The buyer's mandate stays sealed from them, and everything after approval works the same way.

**What does it cost?**
Testnet is free. Planned pricing: a flat fee per agreement paid by the buyer when terms are approved, and a fee per recipient authorisation paid by the vendor. No percentage of payment amounts.

**Is it live?**
Accord runs on NEAR testnet with settlement on Base Sepolia. The demonstration agreements on this page are live unless marked recorded. Mainnet follows an audit.

### Footer

Columns: Product (Glassbook · How it works · Sealed Table · Payee · Security · Research · Changelog · Status) · Build (GitHub · Documentation · Testnet contract · Record page · Verify an agreement · Join a deal room) · Watch (Demonstration video · Announcement) · Company (About · Contact · Brand · Terms · Privacy). Changelog, Status and Brand appear once those pages exist.

Badge: Built at NEAR HACKATHON, November 2026.

Bottom line: Open source under the MIT licence · Runs on NEAR testnet and Base Sepolia. Mainnet follows an audit.

### Metadata

Title: Accord: the private deal room and control plane for agent-to-agent commerce
Description: Two companies' agents negotiate in confidence, both companies approve the terms, and the terms govern what the buyer's agent may pay. Built on NEAR. First application: Glassbook.
Social image: the live agreement page beside the refusal log, with the headline.

### Microcopy

| State | Text |
| --- | --- |
| Mandate editor, empty | Only you will read this. It is encrypted in your browser before it leaves. |
| Mandate sealed | Your mandate is sealed. The other side sees a commitment hash and nothing else. |
| Negotiation in progress | Two agents, one enclave. You will see the terms, not the transcript. |
| Terms attested | Terms attested and checked against both mandates. Approve to make them the agent's authority. |
| Recipient authorised | Payments can go to this destination and nowhere else. |
| Payment refused: destination | Refused: the destination is not the authorised recipient. Nothing was signed. |
| Payment refused: amount | Refused: the amount is not the approved amount for this milestone. Nothing was signed. |
| Agent revoked | The agent's key has been removed. No new authorisations are possible. |
| Signed transfer pending | One transfer was signed before revocation. Cancel it before it is broadcast. |
| Exception pending | The agent requested something outside the terms. Approve or decline. |
| Recipient change pending | Proposed by the vendor. Awaiting the vendor's settlement authority, then a 24-hour delay. |
| Glassbook slot recorded | Observation recorded with its attestation. |
| Period withheld | Fewer slots passed than the terms require. Awaiting a decision from both sides. |
| Settled | Every payment, refusal and exception is on the record page. |
| Inbox: sending | Sending to the agent. |
| Inbox: delivered | Delivered. The agent reads its inbox every minute; your attempt will appear in the log with the contract's reason. |
| Inbox: rate limited | Ten messages an hour per visitor. Try again at `10:40 UTC`. |
| Inbox: empty message | Write a message first. |
| Inbox: store unreachable | The inbox store is unreachable; nothing was sent. Try again in a minute. |
| Live panel: source down | last known · `09:41 UTC` |
| Refusal log: empty | No attempts yet. Send the agent a message. |
| Record page: empty | No deal rooms for this account. |
| 404 | There is no deal room at this address. |

---

## Part B. Editorial and implementation notes

### Word count

Homepage copy in Part A, excluding navigation, FAQ, footer, metadata and microcopy, counting every word a visitor reads in each section (labels and captions included): about 1,370 words (hero 107, audience band 14, Glassbook 207, why 98, how it works 103, parts 147, why now 213, security 110, privacy 144, research 192, closing 36). The same count gave about 1,190 before Why now was added on 30 Oct. Hold it at this size: substitute, do not add. The FAQ is about 400 words. The layout, visual direction and supporting pages are in `LANDING_PAGE_SPEC.md`.

### Destinations

`Open a deal room` → `/agreements/new`. `Explore Glassbook` and `See the Glassbook demonstration` → `/glassbook` (the live Glassbook agreement, or the recorded one with "recorded" beside its title). `Verify your domain` → `/payee`. `Try to move the money ↓` → `#try`, the security demonstration further down the same page. `Send to the agent` → the inbox store only (no key, no contract call, rate limit `10` an hour per visitor). "Security documentation →" → `/security`. "Explore the research →" → `/research` (copy in `RESEARCH_PAGE.md`). Record page → `/record`.

### Live values

"Attempts so far" is read from the inbox store. "Money moved by attempts" is read from the contract's refusal and payment events and shows `0` only while that is what the events say. No other counters appear on the page. If a value cannot be fetched, show the last known value with its timestamp. The Why now figures are not live values: each is a dated figure from the FBI's reports, footnoted to its row on `/research`. The sentence "A successful attempt can only ever produce a payment to the authorised recipient at the approved amount." appears under the form on `/try`; on the homepage the worst-case statement in Why now carries it.

### Rules kept from the earlier brief

Sentence case for headings and buttons. No em-dashes in our own words; quotations keep their punctuation. Monospace for commands, states and amounts in the application; in prose, numbers are written plainly. No "secure", "trustless", "bank-grade", "military-grade", "AI-powered", "seamless", "revolutionary" or "autonomous" as an adjective for the product. No competitor dismissals, no claim that no one else has solved the problem, no reference to hackathon judges, no portraits, seals or logo walls. Research cards name authors and link to the original source; they do not imply review, endorsement or partnership. The Kraken documentation is cited on the research page to explain aggregate versus account-attributed data, not as an integration.

### Material improvements in this pass

- The hero says what Accord is, who it is for, what it does and what to explore, with two buttons and no architecture, commands or caveats.
- Glassbook moved to the second screen with the full flow (who, which conditions, what evidence, how it decides, what to inspect) and a scope statement beside the claim. The headline no longer says the market maker "earned" the payment, because venue-level data cannot establish that.
- Sections that repeated one another were merged: the problem cards, the statements by named people, the comparison table, the four-part table and the seven-row proof table became "Why these belong together", "How a deal room works", "The parts of the room" and "Security demonstration".
- Judges' names and quotations, the comparison with named competitors, and the sentence "nobody has shipped" were removed from the homepage. Prior art is described accurately on the research page.
- The hero proof strip was removed; the only live counters are in the security demonstration, where they report the demonstration's own events.
- A Why now section (added 30 Oct) sets up the security demonstration: the FBI's figures with their years, one dated agent incident, the NCSC's guidance on prompt injection, the worst case stated exactly, and a figure showing where each attack ends. It says where attacks end; it never claims that Accord stops cyber attacks in general.
- Terminology made consistent: deal room, Sealed Table, Agreement controls, Payee, Glassbook, authorised recipient, settlement authority, observation slot, period.
- A compact research section with three verified sources replaced the long sourced-statements section; the depth, including NegotiationArena and the security sources, moved to the research page.

### Unresolved factual dependencies

- Every product behaviour described here must display as written once the build exists: the refusal strings, the attestation check, the slot records, the pending-transfer list. If a line cannot be made true, it comes off the page rather than being softened.
- The planned pricing in the FAQ is a plan; it stays labelled "planned" until set.
- "Mainnet follows an audit" is a statement of intent; name the auditor only when engaged.
- The live Glassbook agreement depends on the observer job returning attested slots from a public venue; until then the Glassbook demonstration is marked recorded.
- The repository, demonstration and record URLs, and the testnet contract id, are filled in at publish time.
- The Why now figures are the FBI's numbers for 2025 and are always shown with the year. When the FBI publishes its next annual report, update the research row first, then the tiles.
- The May 2026 incident is described from published reporting (Cointelegraph, 13 May 2026; Giskard, 7 May 2026), whose estimates run from $150,000 to $174,000. The companies involved are named on `/research` with the reporting, never on the homepage, and the site never says Accord would have prevented it.
