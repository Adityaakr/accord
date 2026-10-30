# Accord homepage: final visitor copy

Editorial pass of 29 October 2026 against `content/EDITORIAL-DIRECTIVE.md` (Part 1). Facts, identity and terminology come from `content/ACCORD_WEBSITE_CONTENT.md`; slot shapes come from `framer-export/REFILL-V2.md`. Part A is visitor text, laid out field by field so each line can be lifted into the matching template slot. Part B is for the team only.

Conventions: sentence case for headings and buttons; no em-dashes; limits sit beside the claims they qualify. Fields marked "fixed" must not be reworded.

---

# Part A: Visitor copy

<!-- count:start -->

## Slot 1 · Hero

- **Pill label:** Negotiation, approval and payment in one room
- **H1 (fixed):** The private deal room for agent-to-agent commerce.
- **Subheading:** Accord gives buyers and vendors one place where their agents negotiate from confidential mandates, both sides approve the terms, and payment follows the agreement. Glassbook, its first application, covers liquidity agreements.
- **Second line:** You decide what your agent can commit to. Approved terms become the rules for its permissions and payments.
- **Primary button:** Open a deal room
- **Secondary button:** Watch the demo
- **Small link line:** Inspect an agreement →

Four cards under the product image:

- **Sealed Table** · Confidential negotiation between agents.
- **Agreement controls** · Approved terms govern permissions and payment requests.
- **Payee** · Recipient authorization and destination changes.
- **Glassbook** · The first application, for liquidity agreements.

## Slot 2 · Showcase (product preview, 5 tabs)

- **Section label:** The deal room
- **H2:** Follow the deal from first proposal to final payment.
- **Lead:** See what needs your approval, which conditions are met and what remains outstanding. Both parties work from the same record, within its privacy settings.

Tabs:

- **Mandates** · Set the private requirements and limits your agent negotiates within.
- **Agreement** · Review the exact terms awaiting approval from each party.
- **Evidence** · Inspect the observations used to evaluate each payment condition.
- **Payments** · Track requests, authorizations, signed transfers and reported confirmations.
- **Activity** · Follow approvals, recipient changes, exceptions and refused requests.

- **Closing line:** Negotiation inputs stay confidential; chain records stay public.
- **Button:** Inspect an agreement

## Slot 3 · Glassbook (5 badge cards + 3 text columns)

- **Label:** First application · Glassbook
- **H2:** Liquidity commitments, connected to payment.
- **Lead:** A team that retains a market maker agrees on spread, depth and availability. Glassbook gives both sides a deal room where those conditions are defined up front, measured, and tied to the payment decision.

Three columns:

- **Agree on what will be measured** · Define the venue, trading pair, observation windows, spread and depth thresholds, and the rule that decides payment eligibility.
- **Inspect the evidence** · For each window, review observed spread, depth and availability beside the result the agreed rule produced. Gaps and exceptions are shown too.
- **Follow the payment decision** · When the agreed conditions are met, payment becomes eligible for authorization. Otherwise the room shows what is outstanding, whether a failed condition or incomplete evidence, and which review applies.

Five card labels:

- Agreed condition
- Observation window
- Data coverage
- Result
- Payment status

- **Scope line:** Current scope: Glassbook measures venue-level order-book conditions. It does not attribute liquidity to the contracted market maker, so it cannot show that a firm earned its fee.
- **Button:** See a Glassbook agreement

## Slot 4 · Why together (3 image cards)

- **Label:** Why one room
- **H2:** A deal needs more than a conversation.
- **Lead:** Your negotiating limits, the terms you approve and where your money goes are one decision. Accord keeps them in one deal room.

Cards:

- **Negotiate with confidential mandates** · Give your agent the budget, requirements and limits it needs, without handing them to the counterparty, who receives only the proposed terms.
- **Approve what becomes policy** · Review the proposed agreement together. Once approved, its supported payment conditions become the checks on every agent request.
- **Keep payment tied to the deal** · Every payment request is checked for milestone, amount and approved recipient before authorization. Follow it from request to reported confirmation.

- **Button:** Explore the deal room

## Slot 5 · Workflow (4-step stepper)

- **Label:** How it works
- **H2:** From private mandates to controlled settlement.

Steps:

- **01 · Set the mandate** · Each party defines what its agent can negotiate: requirements, hard limits and acceptable trade-offs.
- **02 · Reach an agreement** · Sealed Table runs the negotiation in a confidential execution environment; deterministic checks test each proposal against the supported hard limits in both mandates.
- **03 · Approve the terms** · Both parties review the result. Approved terms define the agent's payment permissions and the authorized recipient.
- **04 · Execute within the agreement** · Payment requests are checked against the approved conditions before authorization. Evidence, approvals and exceptions stay linked to the agreement.

- **Buttons:** Explore Sealed Table · Explore Payee

## Slot 6 · Sealed Table and Payee (2 alternating image rows)

- **Label:** Inside Accord
- **H2:** Confidential where it matters, explicit where money moves.

Row 1:

- **Title:** Sealed Table
- **Sub-line:** Reach terms without disclosing your limits.
- **Paragraph 1:** Each party submits a confidential mandate. Agents propose terms within those constraints; both parties decide whether to approve the result.
- **Paragraph 2:** Attestation is evidence about the execution environment, not that a deal is fair or commercially optimal; you can decline terms that satisfy your limits but miss your expectations. Accepted terms can still reveal your preferences.
- **Link label:** How negotiation works →

Row 2:

- **Title:** Payee
- **Sub-line:** Make the destination part of the agreement.
- **Paragraph 1:** The recipient demonstrates control of its domain and proposes a payment destination. Its settlement authority approves it; the buyer accepts it in the agreement. Payment requests are checked against the approved recipient version.
- **Paragraph 2:** A new destination is a new decision: changes follow a separate approval process and a configured delay; an email instruction is not enough. Domain control and destination approval do not establish legal business identity.
- **Link label:** How recipient approval works →

## Slot 7 · Security demonstration (1 image row + form module)

- **Row title:** Change the instruction. Test the boundary.
- **Paragraph 1:** An agent can receive a message that contradicts the deal, such as a new payment address or a revised amount. Payment should still follow the approved conditions.
- **Paragraph 2:** Watch a demo agent try to act on one, then inspect the request, the contract's response and the agreement record: specific refusals, not proof against every attack.
- **Buttons:** Watch the security demo · Inspect the execution

Form module:

- **Module heading:** Test the demo agent
- **Module body:** Send the testnet demo agent an instruction and see whether the payment request it produces is allowed or refused.
- **Field labels:** Sender name · Subject · Instruction
- **Submit label:** Submit an instruction
- **Form note:** Use fictional details. Instructions may be published, so include no personal information, credentials or private business details.
- **Result labels:** Instructions processed · Requests refused · Authorized payments completed · Last updated

## Slot 8 · Privacy and control (6 icon cards)

- **Label:** Privacy and control
- **H2:** Know what is private. Inspect what is enforced.
- **Lead:** Negotiation inputs, approved terms and settlement records sit behind different boundaries.

Cards:

- **Confidential mandates** · Mandates run through the configured confidential execution path. Protection depends on its code, attestation, key handling and infrastructure, set out on the security page.
- **Approved terms** · Both parties review the deal before activation. On-chain payment conditions are public; encryption does not hide fields on a public chain.
- **Agent permissions** · The agreement restricts which payment operations an agent can request. Deployment keys, upgrade authority and other signing paths are disclosed on the security page.
- **Recipient authorization** · The binding process establishes domain control and destination approval. It is not legal business verification; counterparty due diligence remains yours.
- **Revocation** · Revoking an agent stops new authorizations through that path once the contract processes it. It does not recall a transfer already signed.
- **Settlement** · Transfers on Base are public. A reporter supplies settlement status and the app checks it against Base; the NEAR contract does not verify Base receipts itself.

- **Buttons:** Read the trust model · Review the execution record

## Slot 9 · Research (3–4 cards, no portraits)

- **Heading (fixed):** The research behind the room.
- **Intro (fixed):** Confidential negotiation, delegated authority and payment verification each have an established body of research and practice. These are the foundations informing Accord's design.
- **Cards:** [from RESEARCH-VERIFIED.md]
- **Link label:** Explore the research →

<!-- count:skip-start -->

## Slot 10 · FAQ

- **Heading:** Before you open a deal room.

**What does the AI decide, and what do people decide?**
Agents propose terms and request actions. Deterministic rules check the supported hard limits and payment conditions; a request that fails those checks is refused. People approve the agreement, approve any recipient change and handle exceptions through the agreement's defined approval process.

**Who can read my mandate?**
Your browser handles the mandate before it is encrypted. The configured confidential execution services process it during negotiation. The counterparty does not receive direct access to it. The privacy model describes that processing path and its assumptions. Offers and accepted terms can still reveal something about your preferences; confidential computation does not remove inference from the result.

**Which parts of a deal are public?**
Negotiation inputs are confidential. Agreement state recorded on NEAR and transfers recorded on Base are public, including any payment conditions written there. The room's visibility details list which fields fall on each side; consult them before entering sensitive information into a field that will be recorded on-chain.

**What happens when a payment request is refused?**
Nothing is authorized. The refusal is recorded in the agreement's activity with the reason: a destination that does not match the approved recipient version, an amount that does not match the approved payment, or an evidence condition that has not been satisfied. The agent can request an exception, but a request on its own changes nothing.

**Can the terms change after approval?**
Only through the agreement's authorized approval path. An exception that alters a bilateral obligation needs approval from the parties the agreement names, not a one-sided override. Until that approval is recorded, payment requests continue to be checked against the original conditions.

**Can I cancel a payment that is already underway?**
You can request cancellation, but it can race with the original payment. Where the original completes first, the room shows that; where the replacement completes first, the room shows that instead. Until one outcome is settled under the configured confirmation policy, the room marks it unresolved and you should not retry.

**Which liquidity arrangements does Glassbook support today?**
The current flow is built around a retainer paid against venue-level order-book conditions: spread, depth and availability over agreed observation windows. Token loans and option-based compensation are outside this flow. Attributing liquidity to a specific market maker's accounts is a planned extension, not a current feature.

**Is the demonstration recorded or running on the testnet?**
Each demonstration is labelled. A recorded walkthrough carries a "Recorded demo" label beside the player. Panels that read from the testnet show a "Last updated" timestamp and link to the records they summarise. If a panel cannot refresh, it says so and shows the last retrieved data.

**Can I use real funds?**
Not in the current demonstration, which targets NEAR testnet and Base Sepolia. Use test assets only. Production availability, supported assets and pricing have not been announced.

<!-- count:skip-end -->

## Slot 11 · Closing

- **H2:** Bring the next deal into the room.
- **Line:** Set the mandate, review the terms and keep the payment connected to the agreement.
- **Buttons:** Open a deal room · Watch the demo
- **Environment note (only when the app is configured):** Available on NEAR testnet and Base Sepolia. Test assets only.

<!-- count:end -->

## Slot 12 · Navigation, footer, metadata

Navigation:

- **Items:** Product · Glassbook · Security · Developers
- **Button:** Open a deal room

Footer:

- **Tagline:** The private deal room for agent-to-agent commerce.
- **Product:** Deal rooms · Sealed Table · Payee · Glassbook
- **Resources:** Documentation · Execution records · Security · Research · GitHub (omit until a public repository is configured)
- **Company:** Contact · Privacy · Terms
- **Closing line:** Built on NEAR.

Metadata:

- **Browser title:** Accord | The private deal room for agent commerce
- **Meta description:** Agents negotiate from confidential mandates, both sides approve the terms, and payment follows the agreement. Glassbook is Accord's first application.
- **Social title:** The private deal room for agent-to-agent commerce.
- **Social description:** Confidential mandates, shared approval and payments governed by the agreement. Glassbook is Accord's first application, for liquidity agreements.

## Slot 13 · Microcopy (essential states)

Map each line to the actual backend state before rendering it. Do not show a success state because a request was submitted.

1. **Empty dashboard:** Your next agreement starts here. Open a deal room to define the terms, invite a counterparty and set the payment conditions.
2. **Mandate submitted:** Mandate submitted. Awaiting confirmation.
3. **Awaiting counterparty:** Waiting for the other party's mandate.
4. **No valid agreement:** No agreement met the configured limits. Review your mandate before starting a new attempt.
5. **Terms ready:** Proposed terms are ready for review.
6. **Agreement activated:** Agreement active. Payment requests will be checked against the approved conditions.
7. **Payment authorized:** Payment authorized. A transfer has not yet been confirmed.
8. **Destination refusal:** Payment refused. The destination does not match the approved recipient version.
9. **Amount refusal:** Payment refused. The requested amount does not match the approved payment.
10. **Evidence refusal:** Payment not authorized. The required evidence condition has not been satisfied.
11. **Evidence incomplete:** Insufficient evidence to determine the result. Follow the agreement's review rule.
12. **Revoke dialog:** Stop new authorizations through this agent? Transfers already signed may still complete.
13. **Cancellation submitted:** Cancellation requested. The original payment may still complete.
14. **Recorded demo:** Recorded demonstration. These observations are not live.
15. **Data unavailable:** We could not refresh this record. Showing the last retrieved data.

---

# Part B: Editorial notes

## Word count

Public homepage copy across slots 1–9 and 11, counting every visitor-facing field (headings, leads, card titles and bodies, scope line, button and link labels) and excluding the FAQ, navigation, footer, metadata, microcopy and the research-card placeholder: **1,098 words**, inside the directive's 800–1,100 range. Research cards, once written at 40–60 words each, add roughly 150–240 words to the rendered page; the directive counts them as part of the research section, so the team should treat 1,100 as the ceiling for everything else.

## Material improvements over ACCORD_WEBSITE_CONTENT.md

1. **The hero now answers "who" and "what you accomplish".** The old subheading named the workflow but not the audience. The new one names buyers and vendors, states the outcome (payment follows the agreement) and introduces Glassbook in the first screen, as the directive requires.
2. **Thirteen homepage sections reduced to the directive's nine-part narrative.** Product premise (A3), Buyer and vendor value (A9), Developer entry point (A11) and the quote wall overlapped or belonged elsewhere. A3 became "Why together" (slot 4); A9 is absorbed into the hero subheading and slot 4; A11 moves to the Developers page; the quote section is replaced by the directive's research section.
3. **Glassbook is now a complete story rather than a feature list.** The lead names who uses it (a team retaining a market maker), what they agree on, and how observations feed the payment decision. The scope limit says plainly what it means for the buyer (it cannot show that a particular firm earned its fee) and sits beside the feature rather than in a footnote.
4. **Each limit sits next to the claim it qualifies.** Sealed Table's second paragraph carries attestation-is-not-fairness and the inference caveat; Payee's second paragraph carries not-legal-identity and the change-approval-plus-delay rule; every Privacy and control card carries its own boundary; the security row says the demo shows specific refusals, not proof against every attack.
5. **Slogans in threes replaced with sentences.** The old eyebrow, premise lead, closing line and several card bodies were fragment chains. The new copy uses sentences with a subject and a verb while keeping the strongest existing headings (A deal needs more than a conversation; Know what is private. Inspect what is enforced; Change the instruction. Test the boundary).
6. **Terminology tightened.** Step 02 now says what is checked against what ("each proposed term against the supported hard limits in both mandates"); "recipient version" is used consistently where the old copy alternated between recipient, destination and binding; "the room" is used for the deal room throughout the preview and workflow.
7. **Showcase tabs became one-sentence actions.** Each description starts with a verb and says what the visitor can do in that tab; the closing line separates confidential negotiation inputs from public chain records in one short sentence.
8. **The FAQ shrank from thirteen to nine and stopped repeating the page.** Questions already answered in a section (what Accord is, how the parts fit, what attestation establishes, revocation, recipient changes, Payee and legitimacy, Glassbook attribution, how payment is confirmed) were dropped or reframed so that each answer adds something: the refusal record, the exception path, the cancellation race, Glassbook's supported arrangements, and how to tell recorded from testnet material.
9. **Metadata fits its limits.** Browser title 49 characters; meta description under 155 (the old one exceeded it).
10. **Banned vocabulary removed from visitor copy.** No "live", "verified", "confirmed", "secure", "trustless", "seamless", "revolutionary" or "military-grade" in slots 1–11. "Reported confirmations" (slot 2) and "reported confirmation" (slot 4) describe a reported state, not a claim. "Confirmed" survives only in microcopy item 7, which is rendered from an actual state; "live" survives only in the negation "not live" in microcopy item 14.
11. **Homepage copy cut from roughly 1,300 words in the original's equivalent sections to within the 800–1,100 target** by removing repeated statements (the counterparty-never-sees-the-mandate point now appears once, in slot 4, not again in slot 5) and by merging Sealed Table's "approval remains a commercial decision" into its attestation limit.

## Self-check for repetition and transitions

- "Confidential mandate(s)" appears in the hero, slot 4 card 1, slot 5 step 1 (as "mandate") and slot 6 row 1. Each use does different work (positioning, benefit, process step, mechanism). If the designer wants fewer repetitions, slot 4 card 1's title can become "Negotiate without exposing your limits".
- "Approved conditions" appears in slot 1, slot 4, slot 5 step 4 and slot 7. This is the product's central promise and the repetition is deliberate.
- Flow: slot 2 (what you see) leads into slot 3 (the first thing to look at), then slot 4 (why the pieces belong together), slot 5 (the sequence), slot 6 (the two named capabilities), slot 7 (test it), slot 8 (the boundaries), slot 9 (the foundations), slot 11 (invitation). No section restates the previous section's lead.
- "The room shows" appears in slot 2 and slot 3 column 3; kept because the two refer to different views (the whole agreement; one payment condition).
- The word "approve" and its forms appear often across slots 1, 2, 4, 5 and 6. This is the product's vocabulary and was kept, but slot 4 card 2 was shortened to reduce density.

## Unresolved factual dependencies (product team to confirm before publishing)

1. **Failed condition vs incomplete evidence (slot 3, column 3; microcopy 11).** The copy says the room distinguishes a failed condition from incomplete evidence. ACCORD_WEBSITE_CONTENT.md A5 says this distinction must exist in the implementation before it is published. If it does not, replace column 3 with: "When the agreed conditions are met, payment becomes eligible for authorization. Otherwise the room shows what is outstanding for review."
2. **Refusal reasons recorded in Activity (FAQ "What happens when a payment request is refused?").** Assumes refusals are written to the agreement record with a reason, as D3 microcopy implies. Confirm the contract or app records the reason, not only the refusal.
3. **Cancellation outcomes (FAQ "Can I cancel").** Assumes the original-wins, replacement-wins and unresolved states from D3 are all implemented and surfaced. If only some are, cut the answer to the states that exist.
4. **Exception approval path (FAQ "Can the terms change").** Assumes exceptions that alter bilateral obligations require approval from both parties, as D3's editorial note demands. Confirm who the agreement names as approver.
5. **Recipient version checked on every payment request (slot 6, row 2).** Assumes the policy check compares each request against the approved recipient version. Confirm that previously signed transfers targeting an earlier version are surfaced, as B2's note warns.
6. **Configured delay (slot 6, row 2).** The copy says "a configured delay" and never states a duration. Do not insert one unless it is read from configuration.
7. **Planned account-attributed verification (FAQ "Which liquidity arrangements").** Roadmap statement from B3; confirm it is still planned before publishing a forward-looking phrase. It was removed from the homepage scope line to keep the homepage free of roadmap claims; restore it there only if the team wants it on the page.
8. **Testnet environment and the primary button.** "Open a deal room" assumes `/agreements/new` works on NEAR testnet and Base Sepolia. If the app is not configured, use "Explore the demo" as the primary button in hero and closing, omit the environment note, and replace the FAQ answer "Can I use real funds?" with: "The public demonstration is being prepared. Production availability, supported assets and pricing have not been announced."
9. **Security demonstration form module (slot 7).** Publish only if it runs in an isolated testnet environment with moderation, rate limits and no access to private mandates or production secrets. Result labels must be derived from scoped records and link to them; "Authorized payments completed" must appear alongside the others, since an authorized payment is a legitimate outcome, not a failure.
10. **GitHub link (footer).** Omit until a public repository with a licence exists.
11. **"Built on NEAR" (footer).** A description of the stack, not an endorsement. Confirm no partner badge or logo is added beside it.
12. **Glassbook audience phrasing (slot 3 lead).** "A team that retains a market maker" was chosen over "token project" to avoid asserting the asset class. If the narrower phrase is accurate and preferred, "A token project that retains a market maker" fits the same slot.
13. **Research cards (slot 9).** Left as the `[from RESEARCH-VERIFIED.md]` placeholder; that file does not yet exist in `content/`. Cards must follow the directive's Part 2 rules: no portraits, no seals, no endorsement headings, verified attributions only.
14. **Naming.** ACCORD_WEBSITE_CONTENT.md F5 notes that Accord Project operates in a related category. This copy keeps the working name and makes no trademark claim; resolve before public brand investment.
