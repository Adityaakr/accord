# Accord website: final copy

Everything under "Part A" is text visitors read, in page order. "Part B" is for the people building the page and is never rendered. Product names are fixed: Accord (the platform), Sealed Table, Agreement controls, Payee, and Accord Atlas (the first application). Write "Accord Atlas" in headings and at the first mention on each page, "Atlas" after that; the agreement type in code stays `market-making`. Accord Atlas had a different working name until 30 Oct 2026; that name is retired. Headline: "The private deal room and control plane for agent-to-agent commerce." Deal room names the negotiation half and the category; control plane names the enforcement half (Agreement controls, Payee, revocation) and separates the contract, which decides, from the token transfer it makes, which moves the money. The interface calls an agreement a deal room; code, documentation and events say agreement.

---

## Part A. Visitor-facing copy

### Navigation

Accord · Accord Atlas · How it works · Sealed Table · Payee · Security · Research · Docs · GitHub · `Open a deal room`

### Hero

Introducing Accord Atlas · Liquidity agreements with conditional payments →

**The private deal room and control plane for agent-to-agent commerce.**

Agreements negotiated in private, enforced in public.

Accord turns privately negotiated agreements into enforceable rules for AI agent payments. Each business sets a confidential mandate, its agent negotiates within those limits, and both businesses approve the terms. From then on, the contract decides who can authorise a payment, who can receive it, how much, and on what evidence.

`Open a deal room` · `Explore Atlas`

Built on NEAR · open source · running on testnet

Product preview caption: A live agreement on NEAR testnet: the approved terms, the authorised recipient, and payments and refusals as they happen.

### Capability band

Core capabilities · Confidential negotiation · Scoped agent permissions · Payment controls · Recipient authorisation · Conditional settlement

Built for business agreements settled in stablecoins · Vendor contracts · Market-making retainers · Agent-to-agent services

### Accord Atlas

The first application built on Accord

**Accord Atlas: agreed liquidity conditions, enforced payment rules.**

Accord Atlas connects market-making retainers to the liquidity conditions both parties approve. An attested observer samples the venue's public liquidity at hidden times within an agreed schedule, checking spread, depth and two-sided quoting against the agreement.

When the required observations pass, payment becomes eligible for release under Accord's payment controls. Otherwise, it remains withheld for both parties to review. Each payment decision is linked to the terms and observations behind it.

Scope: Atlas measures venue-level liquidity, not the market maker's individual contribution. Verification using the market maker's authenticated account data is planned.

`See the Atlas demonstration`

Join as a project or a market maker →

### Why these belong together

**Negotiation, approval and payment in one place.**

Kept in separate systems, each step leaks or breaks on its own: a negotiation run by one company's agent exposes the other company's position to it; an approval kept in email gives an agent nothing it can enforce; a payment instruction that arrives by message is what fraud imitates. In Accord, each step's output is what the next step enforces. The Sealed Table's terms are what both companies approve, the approved terms are the agent's only authority, and the recipient established through Payee is the only destination that authority can reach.

### How it works

How it works

**How a deal room works.**

Four states, and each one leaves evidence on NEAR.

[figure: `deal-room.svg`]

01 · Sealed. Each company sets its limits in the browser and seals them. Only the sealed mandate and its commitment hash go on NEAR; the other side never sees the numbers. `commitment hash`

02 · Attested. Both agents negotiate inside the Sealed Table, an attested enclave. Code checks every proposal against both mandates, and the terms come out with an attestation anyone can verify. `terms · attestation`

03 · Executing. Both companies approve and the buyer funds the escrow. The buyer's agent holds one key for one method; a payment that doesn't match the terms is refused. `payments · refusals`

04 · Settled. Payments complete as agreed, people decide any exceptions, and unspent funds return to the buyer. The full record stays on NEAR. `the record`

### Sealed Table, Agreement controls and Payee

**The parts of the room.**

Sealed Table. Confidential negotiation between agents. Two sealed mandates enter an attested enclave on NEAR; the agents negotiate with private inference, and deterministic code checks each proposal against both mandates' limits. Only the terms, the commitment hashes and an attestation come out.

Agreement controls. The control plane: the approved terms, enforced by the contract. A payment request must name a payment that is due on the agreed evidence, at the approved amount, to the authorised recipient, or it is refused and recorded. Revocation deletes the agent's only key in one transaction. The USDC sits in the agreement's own NEAR account, and only the contract can send it.

Payee. Recipient authorisation. A vendor proves control of its domain inside an enclave, its settlement authority approves the recipient account, and the buyer accepts it. A change needs a fresh proof, the authority's approval and a 24-hour delay.

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

The demonstration agent's inbox is public. Send it new bank details, an urgent invoice or an instruction from the chief executive; the agent is deliberately literal and will act on it, and your attempt appears in the public refusal log with the contract's reason. Revocation is shown exactly: the agent's only key is deleted in one transaction, and anything it signs afterwards is rejected by the network before it reaches the contract.

From · Subject · Message · `Send to the agent`

Attempts so far: live count · Paid outside the terms: `0` · Ten messages an hour per visitor · Testnet USDC on NEAR · This public room re-arms its agent five minutes after a revocation; in a real agreement only the buyer can.

### Privacy and control

**What stays private, what is public, and what Accord does not do.**

Private to each company: its mandate (on chain only as ciphertext) and the negotiation; only the terms, hashes and an attestation leave the enclave. Visible to both companies: the approved terms, the schedule, every payment, exception and refusal. Public: the payment schedule the contract enforces, the authorised recipient and the payments themselves, as with any stablecoin payment.

Accord does not reverse a payment once it is made; revocation stops the agent, and a payment already made went to the authorised recipient at the approved amount. It does not verify that a company legally exists; Payee establishes control of a domain and approval by the recipient's authority. It does not prove that a negotiation was fair or that external data is truthful; attestation shows which code ran on which inputs. A keeper service triggers scheduled steps such as observations; it cannot move funds or change an outcome. Mainnet follows an audit.

Security documentation →

### Research

**The research behind the room.**

Confidential negotiation, delegated authority and payment verification each have an established body of research and practice. These are the foundations informing Accord's design.

Confidential disclosure under hold-up. In NDAI Agreements, Matthew Stephenson, Andrew Miller and co-authors model a seller who cannot reveal an idea without risking its appropriation, and show that delegating disclosure and payment to tamper-proof programs in trusted execution environments lets both sides transact. The Sealed Table follows this design. [Source](https://arxiv.org/abs/2502.07924)

Scoped delegation at the contract level. Christian Crowley, Christian Catalini, Andrew Hall, Elizabeth Harkavy, Noah Levine and Sean Neville argue for tools that "let users define, at the smart contract level, what an agent can and cannot do." Accord's agent holds one key, one method and the approved terms. [Source](https://a16zfrontier.com/posts/article/5-ways-blockchains-help-ai-agents/)

Liquidity contracts with obligations create value. Albert Menkveld and Ting Wang studied 74 Euronext small-caps whose designated market makers guaranteed a minimum liquidity supply for a fixed fee, and measured higher liquidity, lower liquidity risk and a 3.5% abnormal return. Atlas makes the obligation measurable each period. [Source](https://doi.org/10.1016/j.finmar.2012.12.003)

Explore the research →

### Closing

**Open a deal room.**

Ten minutes on NEAR testnet. Each side keeps its position; the contract keeps the terms.

`Open a deal room` · `Explore Atlas`

Runs on NEAR testnet. Mainnet follows an audit.

### FAQ

**Questions.**

**Who can see my mandate?**
No one outside the attested enclaves that run the negotiation. Your browser encrypts it to a key that exists only inside the Sealed Table, the chain stores the ciphertext and a hash, and the Sealed Table decrypts it for one negotiation, in which the negotiators run on NEAR AI Cloud's private inference. The other side sees the agreed terms. What the terms reveal is what any signed agreement reveals: that you were willing to accept them. This rests on the enclave hardware, on your browser running the published code (the command-line tool is the alternative), and on the operator never moving the key to a different build.

**What if the model negotiates badly?**
You do not approve the terms. The model proposes; code checks each proposal against both mandates' limits before anything leaves the enclave; both companies approve before the terms take effect. Attestation shows which code ran, not that the deal was good. That judgement stays with people.

**What if my agent is tricked?**
Assume it will be. The demonstration agent follows a spoofed request for new bank details and tries to pay. The contract refuses because the account is not the authorised recipient, and refuses again when the amount is changed. The agent's judgement is not what protects the money; the contract's comparison is.

**Our vendor really did change banks. What happens?**
The vendor proposes the new account, an enclave fetches a fresh domain proof, the vendor's settlement authority approves, the buyer accepts, and a 24-hour delay runs before the first payment can reach it. One stolen key, on either side, cannot do it.

**How does Accord Atlas decide whether a period pays?**
The approved terms set the venue, the number of observation slots, the maximum spread, the minimum depth and the threshold. An observer in an attested enclave draws each slot's time from a seed generated inside it and reads the pool at the first block after that time, so anyone can recompute the reading. A slot passes when it meets every condition. When the agreed number of slots pass, the period's payment becomes eligible and still goes through the same payment controls as any other payment; otherwise it is withheld, or goes to the buyer if unobserved slots could have changed the result. Atlas also reports uptime: the share of observed slots in which the pool quoted both sides. Two limits: Atlas measures the pool's liquidity, not the market maker's own positions, and the hidden times rest on the operator never moving the observer's seed to a build that reveals them.

**Can we use Accord if the other side has no agent?**
Yes. Every negotiation in the Sealed Table runs between two negotiators built from the two mandates, so a person who writes a mandate in the application takes part exactly as a company with its own agent does. Their limits stay sealed from the other side, and everything after approval works the same way.

**What does it cost?**
Testnet is free. Planned pricing: a flat fee per agreement paid by the buyer when terms are approved, and a fee per recipient authorisation paid by the vendor. No percentage of payment amounts.

**Is it live?**
Accord runs on NEAR testnet, with payments in testnet USDC on NEAR. The demonstration agreements on this page are live unless marked recorded. Mainnet follows an audit.

### Footer

Columns: Product (Accord Atlas · How it works · Sealed Table · Payee · Security · Research · Changelog · Status) · Build (GitHub · Documentation · Testnet contract · Record page · Verify an agreement · Join a deal room) · Watch (Demonstration video · Announcement) · Company (About · Contact · Brand · Terms · Privacy). Changelog, Status and Brand appear once those pages exist.

Badge: Built at NEAR HACKATHON, November 2026.

Bottom line: Open source under the MIT licence · Runs on NEAR testnet. Mainnet follows an audit.

### Metadata

Title: Accord: the private deal room and control plane for agent-to-agent commerce
Description: Two companies' agents negotiate in confidence, both companies approve the terms, and the terms govern what the buyer's agent may pay. Built on NEAR. First application: Accord Atlas.
Social image: the live agreement page beside the refusal log, with the headline.

### Microcopy

| State | Text |
| --- | --- |
| Mandate editor, empty | Only you will read this. It is encrypted in your browser before it leaves. |
| Mandate sealed | Your mandate is sealed. The other side sees a commitment hash and an encrypted copy only the Sealed Table can open. |
| Negotiation in progress | Two agents, one enclave. You will see the terms, not the transcript. |
| Terms attested | Terms attested and checked against both mandates. Approve to make them the agent's authority. |
| Recipient authorised | Payments can go to this account and nowhere else. |
| Payment refused: destination | Refused: the account is not the authorised recipient. Nothing was sent. |
| Payment refused: amount | Refused: the amount is not the approved amount for this payment. Nothing was sent. |
| Agent revoked | The agent's key has been deleted. Nothing it signs can reach the contract until the buyer installs a new key. |
| Payment in progress | Sent by the agreement's account and waiting for the token contract's answer, usually within seconds. |
| Exception pending | The agent requested something outside the terms. Approve or decline. |
| Recipient change pending | Proposed by the vendor. Awaiting the vendor's settlement authority, then a 24-hour delay. |
| Atlas slot recorded | Observation recorded with its attestation. |
| Period eligible | Enough slots passed. The payment now goes through the same checks as any other. |
| Period withheld | Fewer slots passed than the terms require. Awaiting a decision from both sides. |
| Settled | Every payment, refusal and exception is on the record page. |
| Item set aside | Earned, but there was no payable recipient at close. Held in this deal room for the vendor's claim. |
| Assumed paid | This payment's outcome could not be confirmed, so it counts as paid. The vendor can request an exception to settle it. |
| Inbox: sending | Sending to the agent. |
| Inbox: delivered | Delivered. The agent reads its inbox every minute; your attempt will appear in the log with the contract's reason. |
| Inbox: rate limited | Ten messages an hour per visitor. Try again at `10:40 UTC`. |
| Inbox: hourly limit | The inbox is at its limit for this hour. Try again after `11:00 UTC`. |
| Inbox: room paused | Today's demo rooms are used up. The room reopens at `00:00 UTC`; the refusal log stays live. |
| Inbox: empty message | Write a message first. |
| Inbox: store unreachable | The inbox store is unreachable; nothing was sent. Try again in a minute. |
| Live panel: source down | last known · `09:41 UTC` |
| Refusal log: empty | No attempts yet. Send the agent a message. |
| Record page: empty | No deal rooms for this account. |
| 404 | There is no deal room at this address. |

---

## Part B. Editorial and implementation notes

### Word count

Homepage copy in Part A, excluding navigation, FAQ, footer, metadata and microcopy, counting every word a visitor reads in each section (labels and captions included): about 1,320 words (hero 109, capability band 26, accord atlas 115, why these belong together 98, how it works 134, sealed table, agreement controls and payee 147, why now 213, security demonstration 110, privacy and control 144, research 192, closing 36). Hold it at this size: substitute, do not add. The FAQ is about 400 words. The layout, visual direction and supporting pages are in `LANDING_PAGE_SPEC.md`.

### Destinations

`Open a deal room` → `/agreements/new`. `Explore Atlas` and `See the Atlas demonstration` → `/atlas` (the live Accord Atlas agreement, or the recorded one with "recorded" beside its title). `Verify your domain` → `/payee`. `Try to move the money ↓` → `#try`, the security demonstration further down the same page. `Send to the agent` → the inbox store only (no key, no contract call, rate limit `10` an hour per visitor). "Security documentation →" → `/security`. "Explore the research →" → `/research` (copy in `RESEARCH_PAGE.md`). Record page → `/record`.

### Live values

"Attempts so far" is read from the inbox store. "Paid outside the terms" is read from the contract's refusal and payment events and shows `0` only while that is what the events say; a payment the terms allow, if a visitor asks for exactly that, is listed separately as an approved payment, never hidden. No other counters appear on the page. If a value cannot be fetched, show the last known value with its timestamp. The Why now figures are not live values: each is a dated figure from the FBI's reports, footnoted to its row on `/research`. The sentence "A successful attempt can only ever produce a payment to the authorised recipient at the approved amount." appears under the form on `/try`; on the homepage the worst-case statement in Why now carries it.

### Rules kept from the earlier brief

Sentence case for headings and buttons. No em-dashes in our own words; quotations keep their punctuation. Monospace for commands, states and amounts in the application; in prose, numbers are written plainly. No "secure", "trustless", "bank-grade", "military-grade", "AI-powered", "seamless", "revolutionary" or "autonomous" as an adjective for the product. No competitor dismissals, no claim that no one else has solved the problem, no reference to hackathon judges, no portraits, seals or logo walls. Research cards name authors and link to the original source; they do not imply review, endorsement or partnership. The Kraken documentation is cited on the research page to explain aggregate versus account-attributed data, not as an integration.

### Material improvements in this pass

- The hero says what Accord is, who it is for, what it does and what to explore, with two buttons and no architecture, commands or caveats.
- Accord Atlas moved to the second screen with the full flow (who, which conditions, what evidence, how it decides, what to inspect) and a scope statement beside the claim. The headline no longer says the market maker "earned" the payment, because venue-level data cannot establish that.
- Sections that repeated one another were merged: the problem cards, the statements by named people, the comparison table, the four-part table and the seven-row proof table became "Why these belong together", "How a deal room works", "The parts of the room" and "Security demonstration".
- Judges' names and quotations, the comparison with named competitors, and the sentence "nobody has shipped" were removed from the homepage. Prior art is described accurately on the research page.
- The hero proof strip was removed; the only live counters are in the security demonstration, where they report the demonstration's own events.
- A Why now section (added 30 Oct) sets up the security demonstration: the FBI's figures with their years, one dated agent incident, the NCSC's guidance on prompt injection, the worst case stated exactly, and a figure showing where each attack ends. It says where attacks end; it never claims that Accord stops cyber attacks in general.
- Terminology made consistent: deal room, Sealed Table, Agreement controls, Payee, Accord Atlas, authorised recipient, settlement authority, observation slot, period.
- A compact research section with three verified sources replaced the long sourced-statements section; the depth, including NegotiationArena and the security sources, moved to the research page.

### Unresolved factual dependencies

- Every product behaviour described here must display as written once the build exists: the refusal strings, the attestation check, the slot records, the pending-transfer list. If a line cannot be made true, it comes off the page rather than being softened.
- The planned pricing in the FAQ is a plan; it stays labelled "planned" until set.
- "Mainnet follows an audit" is a statement of intent; name the auditor only when engaged.
- The live Accord Atlas agreement depends on the observer job returning attested slots from a public venue; until then the Accord Atlas demonstration is marked recorded.
- The repository, demonstration and record URLs, and the testnet contract id, are filled in at publish time.
- The Why now figures are the FBI's numbers for 2025 and are always shown with the year. When the FBI publishes its next annual report, update the research row first, then the tiles.
- The May 2026 incident is described from published reporting (Cointelegraph, 13 May 2026; Giskard, 7 May 2026), whose estimates run from $150,000 to $174,000. The companies involved are named on `/research` with the reporting, never on the homepage, and the site never says Accord would have prevented it.
