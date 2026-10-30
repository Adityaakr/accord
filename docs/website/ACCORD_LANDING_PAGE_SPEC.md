# Accord website: complete landing page specification

This is the end-to-end specification for the Accord site: brand system, every homepage section with its copy and its visual direction, the supporting pages, components, states, motion, accessibility, performance, SEO, analytics, security, legal, and the launch checklist. It is written for the agent building the site and for the designer; nothing in it is addressed to visitors except the copy blocks, which are final. The copy blocks are `FINAL_COPY.md` Part A, reproduced here so that each section's words sit beside its visual direction. If the two files ever differ, `FINAL_COPY.md` wins on words and this file wins on structure, layout and visuals, and the difference is a bug to fix in both. Where this file and `GOAL.md` differ on what the product does, `GOAL.md` wins and the line here comes off the page.

Product names: Accord, Sealed Table, Agreement controls, Payee, Glassbook. The interface says deal room; code, docs and events say agreement. Headline: **The private deal room and control plane for agent-to-agent commerce.** Thesis line: **Agreements negotiated in private, enforced in public.**

---

## 1. Brand system

### 1.1 Positioning in one paragraph

Accord is the deal room where two companies' agents negotiate a commercial agreement in confidence, and the control plane that enforces the approved terms on what the buyer's agent may authorise and pay. It is built for treasuries, procurement teams and foundations that already pay vendors in stablecoins. Glassbook, the first application, applies it to market-making agreements. The brand's promise is precision: every guarantee on the site is stated with its limit next to it, every number resolves to a source, and every product behaviour on the page is something the build prints.

### 1.2 Voice

Calm, exact, declarative. Short sentences. Nouns the reader already has (deal room, terms, recipient, refusal) rather than coined ones. No trust words (secure, trustless, bank-grade, military-grade, AI-powered, seamless, revolutionary, autonomous as an adjective for the product). No competitor dismissals, no judge references, no claim that nobody else has solved the problem. No em-dashes in our own words. Sentence case for headings, labels and buttons. Numbers in prose are written plainly; in the application and in figures they are set in the monospace face.

### 1.3 Colour tokens

Dark-first, with a complete light theme. Every colour on the site is one of these tokens; no literal colours in components.

| Token | Dark | Light | Use |
| --- | --- | --- | --- |
| `--bg` | `#0e131a` | `#f5f7f9` | Page background (ink with a blue bias, never pure black) |
| `--fg` | `#e8edf2` | `#16212b` | Body text |
| `--muted` | `#9aa7b4` | `#5d6b78` | Secondary text, captions, eyebrows |
| `--line` | `#33404d` | `#c9d2db` | Borders, rules, table lines |
| `--surface` | `#16202a` | `#e9eef3` | Section plates, figure containers |
| `--surface-2` | `#1d2935` | `#ffffff` | Cards, inputs, boxes inside figures |
| `--edge` | `#0a0f14` | `#c2ccd6` | The thickness edge of the drawn planes |
| `--accent` | `#d8a84a` | `#8a5d0b` | One accent: where terms are enforced (Agreement controls, the control plane), primary buttons, the active state |
| `--refuse` | `#ef5a5a` | `#c43c3c` | Semantic only: a refusal, a canary trip, a revocation, a failing slot, a withheld period |
| `--pass` | `#4fc48a` | `#1f8a5b` | Semantic only: a match, a passing slot, a confirmed payment |
| `--pending` | `#8fa3b8` | `#6b7f93` | Semantic only: pending, in flight, awaiting a person |

Rules: red appears nowhere decorative. The accent is the only non-semantic colour. Semantic colours never carry meaning alone; every state also has a label or an icon shape.

### 1.4 Type

- Display and body: Satoshi (Indian Type Foundry, distributed by Fontshare), weights 500 and 700. Read the Fontshare licence before choosing how to load it: self-host the woff2 files under `/fonts` if the licence permits, otherwise load from Fontshare's CDN and add that origin to the CSP `font-src`. Fallback stack: `"Satoshi", "Manrope", system-ui, -apple-system, "Segoe UI", sans-serif`.
- Monospace: JetBrains Mono (self-hosted, weights 400, 500). Fallback: `ui-monospace, SFMono-Regular, Menlo, monospace`. Used for commands, refusal strings, states, amounts, slot metrics, chips.
- Scale (desktop / phone): display 56/40, h2 36/28, h3 22/20, lead 20/18, body 17/16, small 14/14, mono 13/13, eyebrow 12 with 0.06em letter-spacing. Line height 1.1 for display, 1.2 for headings, 1.55 for body. Headings use `text-wrap: balance`. Running text stays near 65 characters.
- Numbers in tables and live panels use `font-variant-numeric: tabular-nums`.

### 1.5 Layout

- 12-column grid, max width 1200 px, gutters 24 px desktop and 16 px phone (`max(16px, env(safe-area-inset-left))`). Section vertical rhythm 96 px desktop, 64 px phone. Spacing scale 4, 8, 12, 16, 24, 32, 48, 64, 96.
- Radius 6 px on inputs, chips and figure boxes; 10 px on cards and plates. Borders 1 px `--line`. No drop shadows; depth is drawn (the planes in the figures), not simulated.
- Figures sit in a plate (`--surface`, 1 px border, 12 px padding) with `overflow-x: auto` and a minimum drawn width of 760 px so phones scroll the figure, never the page.

### 1.6 Imagery and illustration

- No stock photography, no portraits, no logo walls, no emoji.
- Illustration is the eight figures in `website/diagrams/`: seven hand-drawn diagrams (room, states, attack, glassbook, visibility, gates, threats) and one chart (`losses.svg`, the FBI's reported losses, with its table view). They are inlined so they inherit the tokens. Do not redraw them; edit a label only when the product changes, and record the change in `DECISIONS.md`.
- Product imagery is the live product: the agreement page and the refusal log embedded as live panels, or a screenshot that refreshes on a timer. Nothing recorded is shown as live; the recorded Glassbook agreement carries the word "recorded" beside its title.

### 1.7 Motion

- Page load: no entrance animation; the page is complete at rest.
- Live panels: a new refusal line enters with a 200 ms fade and 4 px rise; counters tick without animation.
- Hover: cards and figure boxes shift border to `--accent` at 60% over 120 ms; buttons darken 6%.
- The states stepper highlights the hovered state and reveals its two lines; keyboard focus does the same.
- `prefers-reduced-motion: reduce` removes all transforms and transitions; content never depends on motion.

### 1.8 Iconography

Minimal line icons at 1.5 px stroke, `currentColor`, used only where they carry meaning: a lock on sealed mandates, a filled or half-filled circle in the visibility matrix, a chevron on gates, a check or cross on slots. No decorative icon rows.

---

## 2. Global elements

### 2.1 Navigation

Sticky, 64 px, background `--bg` at 92% with 12 px blur, bottom border `--line`. Left: the Accord wordmark (text, Satoshi 700, no symbol in v1). Centre: Glassbook · How it works · Sealed Table · Payee · Security · Verify · Research · Docs. Right: GitHub (icon plus label) and the primary button `Open a deal room`. Below 1100 px the centre links collapse into the menu. On phone: wordmark, the primary button, a menu button opening a full-height panel with the same links in the same order plus Join, Record, Changelog and Status.

### 2.2 Announcement band (optional, above the nav, 36 px)

Text: "Running on NEAR testnet and Base Sepolia · Built at NEAR HACKATHON, November 2026 · Mainnet follows an audit." Dismissible per viewer (localStorage, wrapped in try/catch). Remove after the hackathon.

### 2.3 Footer

Four columns on desktop, two on tablet, one on phone.

- Product: Glassbook · How it works · Sealed Table · Payee · Security · Research · Changelog · Status
- Build: GitHub · Documentation · Testnet contract `<contract-id>` · Record page · Verify an agreement · Join a deal room
- Watch: Demonstration video · Announcement
- Company: About · Contact · Brand · Terms · Privacy

Changelog, Status and Brand appear once those pages exist. Bottom row: the badge "Built at NEAR HACKATHON, November 2026" (text badge, links to the X post and the repository), the licence line "Open source under the MIT licence", and the line "Runs on NEAR testnet and Base Sepolia. Mainnet follows an audit." Theme toggle (system, light, dark) at the far right.

### 2.4 Buttons

- Primary: `--accent` fill, `--bg` text, 44 px tall, 16 px horizontal padding, radius 6. One per section at most.
- Secondary: 1 px `--fg` border at 60%, `--fg` text.
- Tertiary: text link with a trailing arrow glyph, `--fg`, underline on hover.
- Every button states what happens: `Open a deal room`, `Explore Glassbook`, `Verify your domain`, `Send to the agent`, `See the Glassbook demonstration`, `Verify this agreement`.

---

## 3. Homepage, section by section

Each section lists: purpose, layout, visual, copy (final), interaction, states, responsive behaviour, and the check that proves it was built as specified. Word budget for the homepage copy, excluding FAQ, footer, metadata and microcopy, is about 1,370 words by the count in `FINAL_COPY.md` Part B, of which the Why now section (3.7) is about 210. It does not grow further: changes are substitutions, not additions.

### 3.1 Hero

Purpose: in one screen, what Accord is, who it is for, what it does, and what to explore.

Layout: two columns on desktop (7 and 5 of 12), stacked on phone with the copy first. 96 px top padding. No background image or gradient.

Visual: right column holds two live panels stacked with a 12 px gap. Panel A, "Agreement", is the live agreement page in compact form: the four-state strip with the current state in `--accent`, the approved terms summary, the bound recipient with its domain, the last transfer with its Base Sepolia link. Panel B, "Refusal log", lists the last five refusals newest first, each a monospace line: time, the refusal string, one plain sentence. Both panels carry a small "live · updated 12 s ago" label; when a source is down, the label reads "last known · 09:41 UTC" and the content stays.

Copy:

Eyebrow: Built on NEAR · open source · running on testnet

Headline: **The private deal room and control plane for agent-to-agent commerce.** (Break after "control plane" on desktop.)

Thesis line, 20 px, `--muted`, directly under the headline: Agreements negotiated in private, enforced in public.

Subhead: Accord is the deal room where two companies' agents negotiate a commercial agreement in confidence, and the control plane that enforces the approved terms on what the buyer's agent may authorise and pay. It is built for treasuries, procurement teams and foundations that already pay vendors in stablecoins. The first application, Glassbook, applies it to market-making agreements.

Buttons: `Open a deal room` (primary, to `/agreements/new`) · `Explore Glassbook` (secondary, to `/glassbook`). Nothing else: no tertiary links, proof strip, counters, commands or caveats in the hero.

Panel caption (under the panels, 14 px `--muted`): A live agreement on NEAR testnet: the approved terms, the authorised recipient, and payments and refusals as they happen.

Interaction: panels refresh every 15 s; a new refusal line animates in. Clicking a panel opens the full agreement page.

States: loading shows the panel frame with the last-known content and a "loading" label, never a skeleton of nothing; error shows last-known with its timestamp.

Responsive: on phone, panels stack under the copy, Panel B limited to three lines.

Check: no counters, commands or caveats in the hero; the headline breaks after "control plane" at widths above 1024 px; both panels read from live sources.

### 3.2 Audience band

Purpose: name who it is for, in the place a larger company would put a logo wall. Accord has no customers to name yet, and the band never pretends otherwise.

Layout: a 56 px band, `--surface`, text chips centred, wrapping on phone.

Copy: Built for treasuries · procurement teams · foundations · market makers and the projects that engage them

Visual: chips in monospace 13 px with 1 px `--line` border. No logos. If a real customer ever consents to be named, it is a sentence with a link in this band, not a logo, and it is added to `FINAL_COPY.md` first.

### 3.3 Glassbook

Purpose: the first application, substantive and early, so the visitor remembers one concrete thing.

Layout: eyebrow and headline full width; then two columns: copy left (6 of 12), figure right (6 of 12); scope statement full width under both; button left-aligned.

Visual: `glassbook.svg` (one period, six slots, the release rule). Under the figure, if the observer is live, a compact live slot panel: the current period's slots as chips in the format `slot <n> · <pass|fail> · <spread> bps · <depth> · <uptime>%`, every value read from the contract's observation records, and the period's status pill. If not live, the figure alone plus the word "recorded" beside the demonstration link.

Copy:

Eyebrow: The first application built on Accord

Headline: **Glassbook: liquidity agreements paid on measured conditions.**

Token projects and foundations engage market makers for a retainer and a set of quoting commitments. Glassbook turns that engagement into an Accord agreement.

Each side states its position in confidence: the retainer, the maximum spread, the minimum depth within one percent of the mid price, the required uptime, the venue and the observation schedule. The Sealed Table negotiates the terms; both sides approve them.

Each period, an observer inside an attested enclave samples the venue's public order book on the agreed schedule and records whether the conditions were met. A period pays when the agreed number of observation slots pass; otherwise it is withheld and people on both sides decide. The demonstration shows the approved conditions, every slot with its attestation, each period's decision and the transaction on Base Sepolia.

Scope: the venue's order book shows the market's condition, not which participant provided it. Attributing liquidity to the market maker's own account needs authenticated account data from the venue, which is planned and not yet implemented. Glassbook pays on the conditions as agreed; it does not yet establish who met them.

Button: `See the Glassbook demonstration` (to `/glassbook`). Tertiary link as the section's last line: Join as a project or a market maker → (to `/join`).

Check: the scope paragraph is adjacent to the claim, same column width, same type size as body; the headline never says "earned".

### 3.4 Why these belong together

Purpose: the argument for one room rather than three tools.

Layout: headline left over a 7-column measure; the paragraph in one column of 65 characters; under it three small cards in a row (stacked on phone), each a failure mode with a line icon.

Visual: three cards, each carrying one clause of the paragraph verbatim and nothing else, with a line icon: "a negotiation run by one company's agent exposes the other company's position to it" (an open lock), "an approval kept in email gives an agent nothing it can enforce" (a document without a seal), "a payment instruction that arrives by message is what fraud imitates" (an envelope with an arrow). The cards restate the paragraph visually; they add no words and no claims.

Copy:

Headline: **Negotiation, approval and payment in one place.**

Kept in separate systems, each step leaks or breaks on its own: a negotiation run by one company's agent exposes the other company's position to it; an approval kept in email gives an agent nothing it can enforce; a payment instruction that arrives by message is what fraud imitates. In Accord, each step's output is what the next step enforces. The Sealed Table's terms are what both companies approve, the approved terms are the agent's only authority, and the recipient established through Payee is the only destination that authority can reach.

### 3.5 How it works

Purpose: the four states in one glance.

Layout: full-width figure plate; the numbered list from the copy becomes the figure caption in two columns on desktop.

Visual: `states.svg`. Interaction: hovering or focusing a state highlights it and its two lines; the "Executing" state is pre-highlighted in `--accent`.

Copy:

Headline: **How a deal room works.**

1. Sealed. Each company seals its mandate in the browser; only a commitment hash is recorded.
2. Attested. The Sealed Table negotiates inside an attested enclave; code checks the result against both mandates' limits; the terms are recorded with an attestation anyone can verify.
3. Executing. Both companies approve, and the buyer funds the agreement's address on Base. The agent holds one key for one method; a payment must match the approved milestone, amount and recipient, or it is refused and recorded.
4. Settled. Payments complete under the agreed conditions, people decide the exceptions, and the record remains.

No link in this section; the hero panels already open the live agreement.

### 3.6 The parts of the room

Purpose: the product's architecture as four named parts, and the headline made literal.

Layout: `room.svg` full width in a plate; under it three cards in a row (Sealed Table, Agreement controls, Payee) with Glassbook referenced by link since it has its own section; each card has a name in h3, the description, and a monospace chip row of its commands (the make targets exist in `GOAL.md`; the chips link to their lines in the documentation). Figure captions throughout the site are the ones in `website/diagrams/accord-drawn.html` unless this file gives a different one.

Visual: `room.svg` (the three planes). The Agreement controls card carries a thin `--accent` top rule to tie it to the control plane in the figure.

Copy:

Headline: **The parts of the room.**

Sealed Table. Confidential negotiation between agents. Two sealed mandates enter an attested enclave on NEAR; the agents negotiate with private inference, and deterministic code checks each proposal against both mandates' limits. Only the terms, the commitment hashes and an attestation come out. Chips: `make negotiate`.

Agreement controls. The control plane: the approved terms, enforced by the contract. A payment request must match the milestone, the amount, the recipient version and the destination, or it is refused and recorded. Revocation removes the agent's key and stops new authorisations in one transaction. The transfer itself, on Base, is the data plane; the contract decides, the rail moves. Chips: `make pay` · `make attack` · `make inflight`.

Payee. Recipient authorisation. A vendor proves control of its domain inside an enclave, its settlement authority approves the destination, and the buyer accepts it. A change needs a fresh proof, the authority's approval and a 24-hour delay. Chips: `make bind-payee` · `make payee-change`.

Button under the cards: `Verify your domain` (secondary, to `/payee`).

Figure caption: Sealed mandates enter the Sealed Table and only terms, commitment hashes and an attestation come out. The control plane, the agreement contract on NEAR, holds the approved terms, the bound recipient and the evidence from the Glassbook observer, and refuses anything that does not match into a public log. The data plane on Base moves USDC only when the control plane requests a signature.

### 3.7 Why now

Purpose: the case in numbers, then exactly where each attack on a paying agent ends, so the demonstration that follows reads as proof. The section answers "why does this matter now?" without claiming that Accord stops cyber attacks in general: it shows where each attack ends and states the worst case.

Layout: a full-width band on `--surface` with 1 px `--line` rules top and bottom, 96 px vertical padding (64 px on phone), content on the 12-column grid. Row 1: eyebrow and headline over 7 columns. Row 2: the stat group: the losses tile with its chart on the left (7 of 12, spanning two rows) and the two smaller tiles stacked on the right (5 of 12); the source line under the group, full width. Row 3: the body paragraph in a 65-character column. Row 4: the "Worst case" label and the statement. Row 5: `threats.svg` full width in a figure plate with its caption; the strip along the figure's foot states what the contract does not stop, so no separate limits line repeats it. Row 6: the link, left-aligned.

Visual:
- Stat tiles follow the stat tile component (section 5). Values in JetBrains Mono 500, 40 px desktop and 32 px phone; one context line in 14 px `--muted` with amounts in monospace `--fg`; no icons and no colour on the values. Sibling tiles share padding, label baseline and value baseline.
- The losses tile carries `losses.svg`, built to the column chart component (section 5): losses reported to the FBI's Internet Crime Complaint Center, 2021 to 2025; five 24 px columns with 4 px rounded tops on one baseline; solid hairline gridlines at $10B and $20B; years under the columns; value labels on the first and last column only; 2021 to 2024 in `--muted`, 2025 in `--fg`. It renders at its natural size, left-aligned, at most 480 px wide, and its text stays between 10.5 and 12 px at every width.
- `threats.svg`: five lanes read left to right: what arrives, what the agent does, where it stops, the result. The "where it stops" boxes carry the accent, because that is where terms are enforced; refusals end in red with the contract's error names; the payee-change lane ends in a dashed muted box (nothing changes); the negotiation lane ends neutral. OWASP tags sit in small monospace chips under each attack; the strip under the lanes states what the contract does not stop.
- The worst-case statement is set in Satoshi 500 at 24 px (20 px phone) in `--fg` across 7 columns, under a 12 px monospace "Worst case" label in `--muted`. No quotation marks, rule or accent: the sentence carries itself.

Copy:

Eyebrow: Why now

Headline: **An agent can be talked into paying. The contract cannot.**

Tile 1 (label · value · line): Losses reported to the FBI in 2025 · `$20.9B` · Up from `$6.9B` in 2021. Chart: `losses.svg`.

Tile 2: Business email compromise, 2025 · `$3.0B` · 24,768 complaints about messages that redirect or request a payment.

Tile 3: Complaints that referenced AI, 2025 · `22,364` · `$893M` in losses. The FBI notes that AI-made content is getting harder to detect and easier to make.

Source line, 12.5 px `--muted`, linking both reports: Source: FBI Internet Crime Complaint Center, Internet Crime Reports for 2025 and 2023.

Body: Agents now read the messages. In May 2026, a wallet bot paid an attacker tokens then valued at $150,000 to $174,000 after an AI model on X translated a reply written in Morse code into a transfer instruction. The UK's National Cyber Security Centre warns that prompt injection "may never be totally mitigated" and recommends deterministic safeguards outside the model. In Accord, the contract is that safeguard: it checks every payment against the approved terms and the authorised recipient.

Worst case: The most a hijacked agent can do is make a payment you already approved, to the recipient you already accepted, when it falls due.

Figure caption: Where each attack stops. Each attack ends at a check in code; the tags give the closest entry in the OWASP Top 10 for Agentic Applications.

Link: Try to move the money ↓ (to `#try`, the security demonstration below).

Interaction: each chart column is focusable and shows a tooltip on hover or focus ("2023 · $12.5B reported"); a "Show as table" toggle under the chart reveals a two-column table (year, reported losses) with the same five values. Hovering or focusing a lane in `threats.svg` dims the other lanes to 60 percent, with no movement. The link scrolls to `#try`; under reduced motion it jumps.

States: nothing in this section is live. Every number is a dated figure with a footnote marker that resolves to its row on `/research`; if a source is corrected, the research row changes first, then the tile.

Responsive: below 1024 px the losses tile goes full width with the two smaller tiles side by side under it; below 640 px all three stack. The body and the statement keep the 65-character measure. `threats.svg` scrolls inside its plate.

Check: every number matches its row in `RESEARCH_PAGE.md` Part B, with its year; both source links resolve; the error names in `threats.svg` match the contract's refusal strings in `GOAL.md`; nothing in the section says that Accord stops, prevents or fixes cyber attacks in general, or that it would have prevented the May 2026 incident; the companies in that incident are not named on the homepage.

### 3.8 Security demonstration

Purpose: an adversarial demonstration a visitor can run in thirty seconds, and the proof of the Why now section above it.

Layout: the section carries the anchor `id="try"`. Headline and lead; then two columns: the inbox form left (5 of 12), the live refusal log right (7 of 12) with the two counters above it. `attack.svg` lives on `/try`, because `threats.svg` in Why now already draws this flow on the homepage.

Visual: the form and the live log are the section's pictures. The refusal log is the same component as hero Panel B, taller (ten lines), newest first, so the last refusal is always its first line. Two counters in monospace 20 px, labels in 12 px `--muted` above the values: "Attempts so far" and "Money moved by attempts". Both are read from their sources (section 6); the mock-up uses no example numbers, and the page shows no counter until the store answers.

Copy:

Headline: **Try to move the money.**

The demonstration agent's inbox is public. Send it new bank details, an urgent invoice or an instruction from the chief executive; the agent is deliberately literal and will act on it, and your attempt appears in the public refusal log with the contract's reason. Revocation is shown exactly: the agent's key is removed and new authorisations stop at once, and a transfer signed before revocation is listed so the buyer can cancel it before it is broadcast.

Form: From · Subject · Message · `Send to the agent`. Help line under the form: Ten messages an hour per visitor · Testnet USDC on Base Sepolia. The sentence from `GOAL.md` ("A successful attempt can only ever produce a payment to the authorised recipient at the approved amount.") sits under the form on `/try`; on the homepage the worst-case statement in Why now carries it.

Form states: submitting ("Sending to the agent"), sent ("Delivered. The agent reads its inbox every minute; your attempt will appear in the log with the contract's reason."), rate-limited ("Ten messages an hour per visitor. Try again at 10:40 UTC."), validation ("Write a message first."), source down ("The inbox store is unreachable; nothing was sent. Try again in a minute.").

Security of the form: posts to the inbox store only; no key; no contract call; honeypot field; server-side rate limit by visitor; message length capped at 2,000 characters; content shown in the log is the contract's refusal, never the visitor's message text (the agent sees it, the public does not).

Check: counters are read from the inbox store and the contract's events; `money moved by attempts` shows `0` only while the events say so.

### 3.9 Privacy and control

Purpose: the honest boundary, drawn.

Layout: headline; `visibility.svg` in a plate (the three private/visible/public sentences become its caption); then the "does not do" paragraph in a 65-character column; tertiary link to `/security`.

Visual: `visibility.svg` (the matrix).

Copy:

Headline: **What stays private, what is public, and what Accord does not do.**

Caption: Private to each company: its mandate and the negotiation; only hashes leave the enclave. Visible to both companies: the approved terms, the schedule, every payment, exception and refusal. Public: the payment schedule the contract enforces and the transfers on Base, as with any stablecoin payment.

Accord does not recall a signed transfer; revocation stops new authorisations and lists signed transfers for cancellation. It does not verify that a company legally exists; Payee establishes control of a domain and approval by the recipient's authority. It does not prove that a negotiation was fair or that external data is truthful; attestation shows which code ran on which inputs. It does not verify Base receipts inside the contract; a reporter service reports status and the application checks the chain. Mainnet follows an audit.

Tertiary link: Security documentation (to `/security`).

### 3.10 Research

Purpose: the problem is documented; the design responds to it.

Layout: headline and the two-sentence intro; three cards in a row (stacked on phone), each 45 to 50 words with a source link; one tertiary link.

Visual: cards are text-only with the author names in `--fg` and the finding in `--muted`; a small "Source" link with an external-link glyph.

Copy:

Headline: **The research behind the room.**

Confidential negotiation, delegated authority and payment verification each have an established body of research and practice. These are the foundations informing Accord's design.

Card 1: Confidential disclosure under hold-up. In NDAI Agreements, Matthew Stephenson, Andrew Miller and co-authors model a seller who cannot reveal an idea without risking its appropriation, and show that delegating disclosure and payment to tamper-proof programs in trusted execution environments lets both sides transact. The Sealed Table follows this design. Source: https://arxiv.org/abs/2502.07924

Card 2: Scoped delegation at the contract level. Christian Crowley, Christian Catalini, Andrew Hall, Elizabeth Harkavy, Noah Levine and Sean Neville argue for tools that "let users define, at the smart contract level, what an agent can and cannot do." Accord's agent holds one key, one method and the approved terms. Source: https://a16zfrontier.com/posts/article/5-ways-blockchains-help-ai-agents/

Card 3: Liquidity contracts with obligations create value. Albert Menkveld and Ting Wang studied 74 Euronext small-caps whose designated market makers guaranteed a minimum liquidity supply for a fixed fee, and measured higher liquidity, lower liquidity risk and a 3.5% abnormal return. Glassbook makes the obligation measurable each period. Source: https://doi.org/10.1016/j.finmar.2012.12.003

Tertiary link: Explore the research (to `/research`).

Check: names and links match `RESEARCH_PAGE.md`; no card implies review or endorsement.

### 3.11 Closing band

Layout: full-width `--surface` band, centred, 96 px padding.

Copy:

Headline: **Open a deal room.**

Ten minutes on NEAR testnet. Each side keeps its position; the contract keeps the terms.

Buttons: `Open a deal room` · `Explore Glassbook`. Small line: Runs on NEAR testnet and Base Sepolia. Mainnet follows an audit.

### 3.12 FAQ

Layout: accordion, one open at a time, below the closing band and above the footer; eight questions. Headline: **Questions.** Copy is Part A of `FINAL_COPY.md`, verbatim. Mark up with FAQPage structured data.

---

## 4. Supporting pages

Every page uses the same nav, footer, tokens and type. Each has its own title, description and social image.

Two tiers. Tier 1 must exist before the repository goes public: the homepage, `/glassbook`, `/security`, `/research`, `/payee`, `/verify`, `/join`, `/try`, `/record`, `/docs`, the legal pages and the 404. Tier 2 follows once the definition of done in `GOAL.md` passes: `/sealed-table`, `/changelog`, `/status`, `/about`, `/brand`. A nav or footer link to a page that does not exist yet is not rendered.

| Route | Purpose | Content | Visual |
| --- | --- | --- | --- |
| `/glassbook` | The first application in full | The homepage Glassbook copy, then the live agreement: approved conditions, the slots table (slot, time, spread, depth, uptime, pass or fail, job id, attestation link), the period decisions, the Base transactions; the scope statement; the research rows 21 to 33 summarised in three lines; `Join as a project or a market maker` | `glassbook.svg`; live slots table; status pills |
| `/sealed-table` | Confidential negotiation | How a mandate is sealed in the browser, what the enclave does, the deterministic limit check, one run per pair, what leaves the enclave, `make negotiate` and `make verify-negotiation` with their printed lines, the limits | A detail crop of `room.svg`'s top plane; a terminal capture of `make negotiate` |
| `/payee` | Vendor onboarding | What a domain proof is; the exact `.well-known/accord.json` to publish (generated from a form: NEAR account, Base address); a checker that fetches and validates it; the settlement authority step; the 24-hour change rule; `Verify your domain` as the page's action | A step list with three steps; the checker's result panel |
| `/security` | The claims, their limits, and the controls | The five claims table from `GOAL.md` verbatim; the custody table; the privacy boundary; `gates.svg`; what the reporter can and cannot do; audit status ("none yet; mainnet follows an audit"); responsible disclosure contact; the retired-claims list is internal and not shown | `gates.svg`, `visibility.svg`, `threats.svg` |
| `/research` | The evidence | Part A of `RESEARCH_PAGE.md` | Text, dense, like a bibliography |
| `/verify` | Verify a live agreement | One screen that walks through an agreement's attestation chain: job id, measurement on OutLayer's register, the `outlayer-verify` output, commitment hashes, refusal events on the explorer, the Base transaction; each step with a copy button for the command | A vertical checklist with copyable commands |
| `/join` | Be the counterparty | How an external agent or a person joins a deal room: the sealed mandate format, one-sided mode, the two approvals, what the other side can and cannot see; a request form that writes to the inbox store (no key) | `states.svg` small; a three-step list |
| `/try` | The open inbox | The section 3.8 form and log on their own page, with `attack.svg` above the form and, under it, the sentence from `GOAL.md`: "A successful attempt can only ever produce a payment to the authorised recipient at the approved amount." | `attack.svg` |
| `/record` and `/record/<account>` | The public record | Agreements, payments, refusals, exceptions by account; filters; every row links to the explorer | Tables with status pills |
| `/docs` | Documentation | Links into the repository docs: setup, make targets with their printed lines, contract methods and events, the three jobs, the rail, the agent, the reporter | Code blocks with copy buttons |
| `/changelog` | What changed | One line per change from `CHANGELOG.md`, newest first, dated | Plain list |
| `/status` | Is it up | Contract id and network, the three jobs' last successful run with time, the observer's last slot, the reporter's last broadcast, the app build; each with a time and a pill | Pills; no uptime percentages |
| `/about` | Who and why | Three paragraphs: the problem, what was built, who built it (Merk Labs; Adi), built at NEAR HACKATHON, contact | Text |
| `/brand` | Name and marks | The wordmark, the tokens, how to write the five product names and "deal room", and one sentence stating that Accord is unrelated to the Accord Project (accordproject.org) and does not use that project's category terms (the terms themselves are not printed; the list lives in the repository README) | The wordmark on light and dark |
| `/legal/terms`, `/legal/privacy` | Legal | Testnet software provided as is under MIT; no custody; not legal, financial or verification advice; the privacy page states what the site stores (inbox messages, rate-limit counters by hashed address, no cookies, no third-party trackers) | Text |
| `404` | Not found | "There is no deal room at this address." with links to the homepage and `/record` | Text |

---

## 5. Components

| Component | Spec |
| --- | --- |
| Status pill | Monospace 12 px, 1 px border, radius 999; `Sealed`, `Attested`, `Executing`, `Settled` in `--fg`; `Refused`, `Withheld`, `Revoked` in `--refuse`; `Confirmed`, `Pass` in `--pass`; `Pending`, `In flight` in `--pending`. Always with the word, never colour alone |
| Live panel | Title row (name, live or last-known label with time), body, footer link to the full page; fixed minimum height to avoid layout shift; refresh every 15 s; `aria-live="polite"` on the log body |
| Refusal line | `12:04:31 UTC` · `ERR_PAYEE_MISMATCH` · "Refused: the destination is not the authorised recipient. Nothing was signed." |
| Figure plate | `figure` with the inline SVG in an `overflow-x: auto` container (`min-width: 760px` on the SVG), `figcaption` under it, `role="img"` and `aria-label` on the SVG |
| Card | `--surface-2`, 1 px `--line`, radius 10, 24 px padding, h3 then body then chips; hover border to accent at 60% |
| Stat tile | `--surface-2`, 1 px `--line`, radius 10, 20 px padding; label 12.5 px `--muted` in sentence case with no trailing colon; value in JetBrains Mono 500 (40 px desktop, 32 px phone); one context line 14 px `--muted`, amounts in monospace `--fg`; optional chart under the line. No colour on values. Every value carries its year and a footnote to its source |
| Column chart | One series in one colour (`--muted`), the latest period in `--fg`; columns at most 24 px wide with 4 px rounded tops and square bases on one baseline; solid 1 px gridlines in `--line`; tick labels in monospace 10.5 px `--muted`; value labels on the first and last column only; each column focusable with a tooltip; a "Show as table" toggle with the same values; never a second y-axis |
| Chip | Monospace 13 px, 1 px border, radius 6, 4 px by 8 px padding; commands are chips |
| Accordion | Button summary with chevron, `aria-expanded`, keyboard operable, one open at a time, content height animates 160 ms (none under reduced motion) |
| Form field | Label above, 44 px input, 1 px border, focus ring 2 px `--accent`; error text in `--refuse` under the field with the fix stated |
| Code block | Monospace 13 px, `--surface-2`, copy button top right with "Copied" confirmation, horizontal scroll inside the block |
| Table | Header row, zebra off, `tabular-nums`, horizontal scroll inside its container on phone, first column sticky on wide tables |
| Theme toggle | Three states (system, light, dark); sets `data-theme`; persisted per viewer in localStorage with try/catch |

---

## 6. Data and states

- Live sources: the agreement contract (view calls through the NEAR RPC), the inbox store (attempt count, last refusal), the Base RPC (transfer status), the observer's slot records (contract view). The app's API aggregates them with a 15 s cache.
- Every live value renders with a timestamp. When a source fails, the page keeps the last known value and labels it "last known · time". Nothing is invented; no placeholder numbers; no zeros that are not read from a source.
- Recorded content (the Glassbook agreement before the observer is live) carries "recorded" beside its title and in its panel label.
- Empty states: refusal log with no entries reads "No attempts yet. Send the agent a message." The record page with no agreements for an account reads "No deal rooms for this account."

---

## 7. Accessibility (WCAG 2.2 AA)

- Contrast at or above 4.5:1 for text and 3:1 for the accent on both themes (the token values above pass; re-check if any token changes).
- A skip link to main content; landmarks for header, main, footer; one h1 per page; headings in order.
- Every figure: `role="img"`, `aria-label` stating the claim, and a visible caption. Every table: header cells. The refusal log: `aria-live="polite"`.
- Every chart has a table view with the same values, and focusable columns with accessible names; no value is carried by colour alone.
- Keyboard: all controls reachable in order; visible focus ring; accordion and theme toggle operable with Enter and Space; no keyboard traps.
- Forms: labels, described errors, no colour-only validation.
- Motion: everything works under `prefers-reduced-motion`; nothing auto-plays with sound.
- Touch targets at least 44 px; text resizable to 200% without loss.

---

## 8. Performance

- Budgets on a mid-range phone over 4G: LCP under 2.0 s, INP under 200 ms, CLS under 0.05, total JavaScript under 120 KB compressed, fonts two files preloaded (Satoshi 500 and 700 subset; JetBrains Mono 400), SVG figures inline, images AVIF with WebP fallback and explicit dimensions, below-the-fold panels lazy.
- Static generation for every page except the live panels, which hydrate client-side from the API; the server renders their last-known state so the first paint is complete.
- Lighthouse performance and accessibility above 90 on the phone profile; printed in the launch checklist.

---

## 9. SEO and sharing

- Per page: a title that is a name (homepage: "Accord: the private deal room and control plane for agent-to-agent commerce"), a one-sentence description (homepage: the description in `FINAL_COPY.md` under Metadata), a canonical URL, Open Graph and Twitter card tags, a page-specific social image (homepage: the two live panels with the headline; Glassbook: `glassbook.svg` on `--bg`; security: `gates.svg`).
- Structured data: Organization on every page; SoftwareApplication on the homepage (name, applicationCategory, operatingSystem "Web", offers omitted); FAQPage on the FAQ; no review or rating markup.
- `sitemap.xml` and `robots.txt` (all pages indexable; `/try` and `/record` allowed; API routes disallowed).
- Headings carry the product terms (deal room, Sealed Table, Payee, Glassbook, control plane) naturally; no keyword stuffing.

---

## 10. Analytics and privacy

- No third-party scripts, no cookies, no fingerprinting. A self-hosted, cookieless page-view counter and six events: `cta_open_deal_room`, `cta_explore_glassbook`, `inbox_submit`, `verify_open`, `join_submit`, `theme_toggle`. Events carry the page and the time, nothing about the visitor.
- The privacy page states exactly this, plus what the inbox store keeps (message text for the agent, a hashed visitor key for the rate limit, the refusal that resulted) and for how long (30 days).

---

## 11. Site security

- Strict Content Security Policy: scripts and styles from self only, fonts from self (plus Fontshare's origin only if Satoshi is loaded from there), connections to the app's API and the public RPCs only, no inline event handlers, frame-ancestors none.
- No key material in the client, ever; the app signs nothing. The inbox form and the join form write to stores through the API with server-side validation, a honeypot field and a per-visitor rate limit.
- Security headers: HSTS, X-Content-Type-Options, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy denying camera, microphone and geolocation.
- A `security.txt` at `/.well-known/security.txt` with the disclosure contact and the policy linked from `/security`.

---

## 12. Legal and compliance notes for the copy

- Everywhere the site mentions money: testnet USDC on Base Sepolia; no real funds. Who controls the funds at each state is stated in the words of the custody table in `GOAL.md` (the agreement's Base address is controlled by the agreement contract through Chain Signatures); the site never writes "custodial" or "non-custodial" in its own words.
- Payee is described as recipient authorisation, never as KYB, identity verification or business verification.
- Glassbook is described as measuring venue conditions, never as attributing performance to a market maker, until account-attributed verification exists.
- No pricing is shown as current; the FAQ's pricing is labelled planned.
- No audit claim until an auditor is engaged; "Mainnet follows an audit" is the only sentence.
- The name: the site never uses "executable agreements" or "smart legal contracts" (the Accord Project's category, https://accordproject.org/); `/brand` says so.

---

## 13. Content governance

- The copy on this site is Part A of `FINAL_COPY.md` plus the page copy in section 4 above; edits go to those files first, then to the site.
- Every sourced number carries a footnote marker that resolves to a row on `/research`; product parameters and live values carry none.
- The Why now figures are always shown with their year. When the FBI publishes a new annual report, the research row changes first, then the tiles; the May 2026 incident sentence follows the cited reporting, including any correction.
- The five claims table on `/security` is byte-identical to `GOAL.md`.
- The retired phrases (in `README.md` at the repository root) never appear, including in alt text and metadata; the launch checklist greps for them.
- A change to the product that makes any sentence untrue removes the sentence the same day; the changelog records it.

---

## 14. Launch checklist

Print each result with literal output before declaring the site ready.

1. Copy diff: every paragraph in section 3 and in `FINAL_COPY.md` Part A matches the rendered text; no differences.
2. Grep of the built site, including alt text and metadata, for every retired phrase and every trust word: zero hits.
3. Every link and button resolves to its route in sections 2, 3 and 4; no placeholder hrefs remain (`<repo-url>`, `<demo-url>`, `<contract-id>`, `<record-url>` filled).
4. The six figures render inline on their sections, scroll inside their plates on a 390 px viewport, and carry captions and `aria-label`s.
5. Live panels read from live sources; the last-known state renders when a source is cut; counters match the inbox store and the contract's events.
6. The inbox form: rate limit enforced at 10 an hour per visitor; honeypot drops bots; no key or contract call in the client bundle (grep the bundle for `ed25519:`, `private_key`, `secret`).
7. `/security` claims table byte-identical to `GOAL.md`; `/research` matches `RESEARCH_PAGE.md` Part A.
8. Theme: light and dark both pass contrast; the toggle persists; no literal colours in components.
9. Lighthouse on the phone profile: performance and accessibility above 90; CLS under 0.05.
10. Accessibility pass: skip link, landmarks, heading order, focus rings, accordion by keyboard, `aria-live` on the log, tables with headers.
11. SEO: titles, descriptions, canonicals, social images per page; sitemap and robots present; FAQPage and Organization structured data validate.
12. Security headers and CSP present; `security.txt` reachable; no third-party requests in the network log.
13. 404 page and empty states render as specified.
14. The badge links to the X post and the repository; the footer disclaimer line is present on every page.
15. A recorded Glassbook agreement, if used, says "recorded" in its title and panel label.
16. Why now: every figure matches `RESEARCH_PAGE.md` Part B with its year; the incident sentence matches the cited reporting; the error names in `threats.svg` match `GOAL.md`; the chart's table view shows the same five values; no sentence on the site claims that Accord stops cyber attacks in general.

---

## 15. Implementation order

1. Tokens, type, grid, nav, footer, buttons, pills, figure plate, card, chip, code block, theme toggle.
2. Homepage sections 3.1 to 3.12 with static copy and inline figures; live panels wired to the API with last-known fallback.
3. `/security`, `/research`, `/glassbook`, `/payee`, `/verify`, `/join`, `/try`, `/record`.
4. `/docs`, `/changelog`, `/status`, `/about`, `/brand`, legal pages, 404.
5. SEO, structured data, social images, sitemap, robots, security headers, CSP, `security.txt`.
6. The launch checklist, printed.
