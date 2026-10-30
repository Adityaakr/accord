# Accord website content

Complete editorial copy and implementation handoff · 29 October 2026

## How to use this document

This replaces the supplied website brief with a product-led content system. Sections marked **Public copy** contain text intended for visitors. Editorial notes, routing tables and publication gates are for the builder only.

This is proposed product copy, not verification of a deployment. Publish feature descriptions only after the corresponding flow works. Do not display “live”, “verified”, “confirmed”, production availability, customer results or audit status without supporting evidence. If only a recorded demonstration exists, label it “Recorded demo” beside the player and use the recorded-demo CTA variant below.

The product identity is fixed here: **Accord is the private deal room for agent-to-agent commerce.** Sealed Table handles confidential negotiation. Agreement controls constrain agent payment requests. Payee handles recipient authorization. Glassbook is the first business application. These are parts of one experience, not four competing brands.

---

# A. Homepage

## A1. Navigation

**Public copy**

Accord

Product · Glassbook · Security · Developers

**Open a deal room**

**Editorial note:** Product opens the product overview. Sealed Table and Payee sit within that overview. Put GitHub and research links in Developers and the footer. On mobile, retain the primary button and move section links into the menu.

## A2. Hero

**Public copy**

Eyebrow: **Confidential negotiation. Controlled payments.**

# The private deal room for agent-to-agent commerce.

Bring your agents together to negotiate with confidential mandates, approve the terms, and carry the agreement through to payment.

You decide what they can commit to. Accord turns the approved terms into rules for their permissions and payments.

**Open a deal room** · **Watch the demo**

Inspect an agreement →

**Editorial note:** Let the headline carry the positioning. Do not add a second slogan in the same visual hierarchy. Below it, show one coherent room from the actual application: agreement status, approved payment conditions, recipient and latest activity. Keep terminal output out of the primary hero visual.

Show the environment beside the room, using “NEAR testnet · Base Sepolia” only for that deployed configuration. If the app is not available, replace the primary CTA with **Explore the demo** and omit the live room. Do not imply that private negotiation makes on-chain transfers private.

## A3. Product premise

**Public copy**

## A deal needs more than a conversation.

Your negotiating limits, the terms you approve and the destination of your money belong to the same decision. Accord keeps them connected in one deal room.

### Negotiate with confidential mandates

Give your agent the budget, requirements and limits it needs to negotiate, without directly sharing those instructions with the counterparty.

### Approve what becomes policy

Review the proposed agreement together. Its supported payment conditions become checks on what the agent can authorize.

### Keep the payment connected to the deal

Check the milestone, amount and approved recipient before authorization. Follow the payment from request to reported confirmation.

**Explore the deal room**

## A4. The product experience

**Public copy**

## One room. A shared view of the deal.

Follow the agreement from the first proposal to the final payment. See what needs your approval, which conditions have been met, and what remains outstanding.

| Inside the room | What you can do |
| --- | --- |
| Mandates | Set your private negotiation requirements and limits. |
| Agreement | Review the exact terms awaiting approval from each party. |
| Evidence | Inspect the observations used to evaluate payment conditions. |
| Payments | Track requests, authorizations, signed transfers and confirmations. |
| Activity | Follow approvals, recipient changes, exceptions and refused requests. |

The room brings the record together. Access to each part follows its privacy settings; public chain records remain public.

**Inspect an agreement**

**Editorial note:** Use these as explanatory tabs, not an implication that every tab is public. “Activity” should expose the record of an event without publishing raw confidential inputs or unsolicited inbox content. Match the visible workflow to actual states, including suspended, failed or terminated states where implemented.

## A5. Glassbook

**Public copy**

Eyebrow: **First application · Glassbook**

## Liquidity commitments, connected to payment.

A liquidity agreement sets expectations for spread, depth and availability. Glassbook connects those conditions to observations and payment decisions in the same deal room.

### Agree on what will be measured

Define the venue, trading pair, observation windows, thresholds and payment conditions before the engagement begins.

### Inspect the evidence

Review the observed spread, depth and availability for each measurement window, alongside the result produced by the agreed rules.

### Follow the payment decision

See which conditions passed, which did not, and which observations need review before a payment can proceed.

**Current scope:** Glassbook measures venue-level order-book conditions. It does not yet attribute liquidity to the contracted market maker or establish that firm's individual performance.

**See a Glassbook agreement**

**Editorial note:** The demonstration must distinguish a failed condition from missing or incomplete evidence. If the implementation does not yet make this distinction, present observation and manual review without promising automatic evidence-based settlement. Do not replace the scope sentence with a tooltip.

Suggested visual labels: **Agreed condition · Observation window · Data coverage · Result · Payment status**. Populate them with actual or clearly labeled recorded observations. Do not invent a passing rate, retainer, liquidity depth or savings figure.

## A6. How it works

**Public copy**

## From private mandates to controlled settlement.

### 01 · Set the mandate

Each party defines what its agent can negotiate: commercial requirements, limits and acceptable trade-offs.

### 02 · Reach an agreement

Sealed Table processes the negotiation in a confidential execution environment. Deterministic checks evaluate the proposed terms against the supported hard limits.

### 03 · Approve the terms

Both parties review the result. Approved terms define the agent's payment permissions and the recipient authorized for the agreement.

### 04 · Execute within the agreement

Payment requests are checked against the approved conditions. Evidence, approvals and exceptions remain linked to the agreement as it progresses.

**Explore Sealed Table** · **Explore Payee**

## A7. Sealed Table and Payee

**Public copy**

## Confidential where it matters. Explicit where money moves.

### Sealed Table

**Reach terms without directly disclosing your limits.**

Each party submits a confidential mandate. Agents propose terms within those constraints, and both parties decide whether to approve the result.

Attestation provides evidence about the execution environment. It does not establish that a deal is fair or commercially optimal.

**How negotiation works →**

### Payee

**Make the destination part of the agreement.**

The recipient establishes control of its domain and proposes a payment destination. Its settlement authority approves the destination, and the buyer accepts it through the agreement's binding process.

Destination changes follow a separate approval process and configured delay. Domain control and authorization do not establish legal business identity.

**How recipient approval works →**

## A8. Security demonstration

**Public copy**

## Change the instruction. Test the boundary.

An agent can receive a convincing message that contradicts the deal. The payment decision should still follow the approved conditions.

Watch a demo agent attempt to change a recipient or payment amount. Inspect the request, the contract's response and the resulting agreement record.

**Watch the security demo** · **Inspect the execution**

Optional live module heading: **Test the demo agent**

Optional live module body: Send an instruction to the testnet demo. Follow how the agent interprets it and whether its resulting payment request is allowed or refused.

Field labels: **Sender name · Subject · Instruction**

Button: **Submit an instruction**

Form note: Use fictional information. Submitted instructions may be published with the demonstration. Do not include personal information, credentials or private business details.

Result labels: **Instructions processed · Requests refused · Authorized payments completed · Last updated**

**Editorial note:** Include the interactive module only if it runs in an isolated testnet environment with moderation, rate limits and no access to private mandates or production secrets. Counters must be derived from records and link to them. An authorized payment is not a security failure merely because an inbox instruction triggered it. Show all outcomes, including accepted requests, processing failures and pending requests.

## A9. Buyer and vendor value

**Public copy**

## A clear agreement for both sides.

### For buyers

Set the commercial limits. Approve the commitment. Keep payment requests tied to the agreement you accepted.

Review exceptions and outstanding obligations in one place.

**Open a deal room**

### For vendors

Negotiate from your own mandate, approve the resulting terms, and establish the destination authorized to receive payment.

Follow the conditions and approvals that determine when payment can proceed.

**Set up your recipient profile**

## A10. Trust summary

**Public copy**

## Know what is private. Inspect what is enforced.

Negotiation inputs, approved payment conditions and settlement records have different visibility and trust boundaries. Accord makes those distinctions explicit.

| Area | What to know |
| --- | --- |
| Confidential mandates | Inputs are processed through the configured confidential execution path. Protection depends on its code, attestation, key handling and infrastructure assumptions. |
| Approved terms | Parties review the deal before activation. On-chain payment conditions are public; an encrypted document does not hide fields recorded on a public chain. |
| Agent permissions | The agreement restricts the supported payment operations. Deployment keys, upgrade authority and other signing paths must be disclosed separately. |
| Recipient authorization | The binding process establishes domain control and destination approval. It is not legal business verification. |
| Revocation | Revocation stops new authorizations through the revoked agent path. It does not recall a transfer already signed. |
| Settlement | Base transfers are public. In the current design, a reporter supplies settlement status and the app checks it against Base; the NEAR contract does not independently verify Base receipts. |

**Read the trust model** · **Review the execution record**

## A11. Developer entry point

**Public copy**

## Follow the deal into the code.

Inspect how confidential mandates become approved terms, how payment requests are checked, and how executions appear in the agreement record.

Start with the reference flow, reproduce a refusal, and follow a payment through its lifecycle.

**Read the documentation** · **View the repository**

**Editorial note:** Show GitHub and documentation links only after their destinations exist. Describe the repository as open source only when a public repository and license support that claim. Keep commands on the developer page, not scattered through every homepage section.

## A12. Closing invitation

**Public copy**

## Bring the next deal into the room.

Set the mandate. Review the terms. Keep the payment connected to the agreement.

**Open a deal room** · **Watch the demo**

Environment note, when verified: **Available on NEAR testnet and Base Sepolia. Test assets only.**

## A13. Footer

**Public copy**

**Accord**

The private deal room for agent-to-agent commerce.

**Product:** Deal rooms · Sealed Table · Payee · Glassbook

**Resources:** Documentation · Execution records · Security · Research · GitHub

**Company:** Contact · Privacy · Terms

Built on NEAR.

**Editorial note:** No affiliation, endorsement, audit or production-readiness badge without evidence. Do not publish empty legal pages or invented company details. Keep unconfigured links out of navigation rather than linking them to a placeholder.

---

# B. Supporting product pages

## B1. Sealed Table

**Public copy**

Eyebrow: **Inside Accord · Sealed Table**

# Negotiate with confidential mandates.

Give your agent the information it needs to negotiate while keeping the underlying mandate out of the counterparty's view.

Sealed Table brings both mandates into an approved confidential execution process. Agents propose terms. Deterministic checks evaluate the supported hard limits. Both parties approve the agreement before it becomes payment policy.

**Open a deal room** · **Inspect a negotiation**

## Your mandate guides the negotiation.

Define your budget, requirements and acceptable trade-offs. Review the proposed outcome before committing to it.

## The output carries evidence.

Inspect the execution identifiers, input commitments and validation result associated with the proposed agreement. The technical record should identify the application and configuration both parties accepted.

## Approval remains a commercial decision.

An attested run is evidence about execution, not a guarantee of a good bargain. You can decline terms that satisfy your hard limits but do not meet your commercial expectations.

## Privacy has a boundary.

The other party receives the approved output, not direct access to your raw mandate. Offers and accepted terms can still reveal information about your preferences. Confidential computation does not eliminate inference from the result.

**Read the privacy model**

## B2. Payee

**Public copy**

Eyebrow: **Inside Accord · Payee**

# Make the recipient part of the agreement.

A payment needs an approved destination as well as an approved amount. Payee connects the recipient's domain proof, settlement authority and payment address to the deal.

**Set up your recipient profile** · **Inspect a recipient record**

## Establish the destination.

The vendor proposes a destination and demonstrates control of its domain. Its settlement authority approves the destination. The buyer accepts the binding for the agreement.

## Treat a change as a new decision.

A new address follows the configured approval and delay process. An instruction in an email is not enough to update the bound destination.

## Keep the history visible.

Inspect the current recipient version, the approvals behind it and any pending change before authorizing a payment.

## Control is not corporate identity.

Domain proof establishes control of a domain. Destination approval establishes authorization within the configured process. Neither alone proves that a business exists or that its commercial claims are genuine.

**Review recipient controls**

**Editorial note:** Do not promise that a recipient profile or proof is reusable across agreements until a registry and reuse policy exist. Display the actual configured delay, not an editorially chosen duration. An old signed payment can still target a previously approved version.

## B3. Glassbook

**Public copy**

Eyebrow: **Built on Accord · Glassbook**

# Put liquidity conditions into the payment decision.

Agree on the market conditions to measure, inspect the observations, and apply the results to the payment rules in the deal room.

**Explore a Glassbook agreement** · **Watch the walkthrough**

## Define the measurement before the engagement.

Specify the venue and pair, maximum spread, minimum depth, observation schedule, data-coverage requirements and the rule used to determine payment eligibility.

## Give each observation a place in the record.

Follow the measurement window, source, result and associated execution evidence. Review gaps and exceptions alongside successful observations.

## Connect the result to the agreement.

Where the approved measurement and release rules are satisfied, the payment becomes eligible for authorization. Where they are not, the room shows what is outstanding and which review process applies.

## What the current version measures.

Glassbook observes the venue's order book. It does not identify which firm supplied that liquidity, detect all forms of manipulation, guarantee execution quality or verify legal compliance.

Account-attributed performance verification is a planned extension. Token loans and option-based compensation are outside the current retainer-focused flow.

**Review a measurement record**

**Editorial note:** Publish the data-coverage and missing-evidence wording only once those rules are implemented. An observer's authenticated output does not prove that the upstream venue supplied truthful data. A short demo window is not evidence of performance over a longer engagement.

---

# C. FAQ

**Public copy**

## Before you open a deal room.

### What is Accord?

Accord connects confidential agent negotiation with agreement-controlled payment authorization. Parties set mandates, approve terms, establish a recipient and follow the agreement through execution and settlement.

### How do Sealed Table, Payee and Glassbook fit together?

Sealed Table handles negotiation. Agreement controls check supported payment requests. Payee handles recipient authorization. Glassbook applies that workflow to liquidity agreements and their measurement conditions.

### What does the AI decide?

Agents propose terms and request actions. Deterministic rules check supported hard limits and payment conditions. Humans approve the agreement and handle changes through its defined approval process.

### Who can read my mandate?

Your browser handles the mandate before encryption. The configured confidential execution services process it during negotiation. The counterparty does not receive direct access to the raw mandate. The privacy model explains the processing path and its assumptions; negotiation outcomes can still reveal information about your preferences.

### Are the agreement and payments private?

Not in their entirety. Confidential negotiation inputs are distinct from public payment conditions. Information written to NEAR and transfers recorded on Base remain public. Consult the room's visibility details before submitting sensitive information.

### What does attestation establish?

It provides evidence about the execution environment and, where correctly bound, the program and inputs used for a result. It does not guarantee fair negotiation, truthful upstream data, error-free software or delivery of an off-chain service.

### What if an agent follows a malicious instruction?

The agent may attempt an unauthorized action. The agreement checks the supported payment request against its active conditions. The security demo shows specific recipient and amount changes being refused; it is not a claim that every attack has been eliminated.

### Can I stop the agent?

Revocation prevents new authorizations through the revoked agent path once the contract processes it. Transfers already signed need separate handling. A cancellation request can race with the original payment, so the room must show the confirmed outcome rather than promise a recall.

### Can the recipient change its address?

Yes, through the configured recipient-change process. The request needs the required proof and approvals and must complete the configured delay before activation. A new email address or payment instruction does not by itself update the binding.

### Does Payee verify that a business is legitimate?

No. It establishes domain control and destination authorization within the agreement's process. Legal entity verification and counterparty due diligence are separate requirements.

### Does Glassbook prove that my market maker did the work?

Not in the current version. It measures venue-level conditions and applies the agreed rules to those observations. Verifying a specific market maker's contribution requires account-attributed evidence, which is a planned extension.

### How is a payment confirmed?

In the current design, a reporter submits settlement status and the application checks Base. The NEAR contract does not independently verify Base receipts. The security documentation must describe that reporter's actual authority and the safeguards against premature retries or release of reserved funds.

### Can I use real funds?

The described demonstration targets NEAR testnet and Base Sepolia. Use test assets only. Production availability, supported assets and pricing will be published separately when confirmed.

**Editorial note:** This final answer is suitable only when the linked experience is clearly a testnet demonstration. If no deployment is available, use: “The public demonstration is being prepared. Production availability, supported assets and pricing have not been announced.” Do not invent a launch date or promise that one audit alone makes the product production-ready.

---

# D. Application and system microcopy

These are proposed labels. Map them to actual backend states and confirmation checks before rendering them. Do not infer a successful state merely because a request was submitted.

## D1. Deal-room setup

| Surface | Copy |
| --- | --- |
| Empty dashboard heading | Your next agreement starts here. |
| Empty dashboard body | Open a deal room to define the terms, invite a counterparty and establish the payment conditions. |
| Primary action | Open a deal room |
| Deal name label | Agreement name |
| Counterparty label | Counterparty account |
| Mandate heading | Set your negotiation limits. |
| Mandate helper | Define the requirements and trade-offs your agent should use. Review the privacy details before submitting sensitive information. |
| Mandate submit | Encrypt and submit mandate |
| Submitted mandate | Mandate submitted. Awaiting confirmation. |
| Confirmed commitment | Mandate commitment recorded. |
| Awaiting counterparty | Waiting for the other party's mandate. |
| Processing | Negotiation in progress. |
| No valid agreement | No agreement met the configured limits. Review your mandate before starting a new attempt. |
| Terms ready | Proposed terms are ready for review. |
| Approval helper | Review the obligations, payment conditions, recipient and public fields before approving. |
| Approval action | Approve these terms |
| Awaiting approval | Waiting for the other party's approval. |
| Activated | Agreement active. Payment requests will be checked against the approved conditions. |

## D2. Recipient and evidence

| Surface | Copy |
| --- | --- |
| Recipient setup | Establish the payment destination. |
| Domain helper | Use a domain your organization controls. Domain proof does not establish legal business identity. |
| Recipient proposal | Destination proposed. Awaiting the required approvals. |
| Recipient binding | Recipient version approved for this agreement. |
| Change pending | Recipient change pending. Review the proposed destination and remaining requirements. |
| Delay in progress | Change approved. Waiting for the configured delay to complete. |
| Evidence pass | Observed conditions met the agreed thresholds. |
| Evidence fail | Observed conditions did not meet the agreed thresholds. |
| Evidence incomplete | Insufficient evidence to determine the result. Follow the agreement's review rule. |
| Evidence stale | This observation is outside the required measurement window. |
| Payment withheld | Payment is on hold. Review the unmet conditions and available next steps. |
| Recorded demo | Recorded demonstration. These observations are not live. |

## D3. Payment and control states

| Surface | Copy |
| --- | --- |
| Payment requested | Payment requested. Checking the agreement conditions. |
| Authorization recorded | Payment authorized. A transfer has not yet been confirmed. |
| Signature produced | Transfer signed. It may still be broadcast. |
| Broadcast observed | Transfer broadcast reported. Awaiting confirmation. |
| Confirmation observed | Transfer confirmed on Base according to the configured confirmation policy. |
| Destination refusal | Payment refused. The destination does not match the approved recipient version. |
| Amount refusal | Payment refused. The requested amount does not match the approved payment. |
| Evidence refusal | Payment not authorized. The required evidence condition has not been satisfied. |
| Pending payment refusal | A payment for this milestone is already in progress. |
| Exception requested | Exception requested. No change has been authorized. |
| Revoke dialog | Stop new authorizations through this agent? Transfers already signed may still complete. |
| Revoke button | Revoke agent authorization |
| Revocation processed | Agent authorization revoked. Review any transfers already signed. |
| Cancellation action | Request cancellation |
| Cancellation submitted | Cancellation requested. The original payment may still complete. |
| Replacement confirmed | Cancellation confirmed under the configured confirmation policy. The replacement consumed the original payment's nonce. |
| Original confirmed first | The original payment completed before cancellation. |
| Outcome unknown | Payment outcome is not yet confirmed. Do not retry until the outstanding authorization is resolved. |

**Editorial note:** Refusal text must distinguish a new request from previously signed transactions. Key deletion, suspension, replacement and revocation are separate facts where the protocol processes them separately. An exception that changes a bilateral obligation needs the agreement's authorized approval path, not an unexplained buyer-only override.

## D4. General system messages

| Surface | Copy |
| --- | --- |
| Loading | Loading the agreement record. |
| Data unavailable | We could not refresh this record. Displaying the last retrieved data. |
| Timestamp label | Last updated |
| Verification pending | Verification pending. |
| Verification failure | Verification did not complete. Review the execution details before relying on this result. |
| Connection lost | Connection interrupted. Payment status may have changed. Refresh before taking another action. |
| Form failure | Your submission was not completed. Review the details and try again. |
| 404 heading | This room could not be found. |
| 404 body | Check the link or return to your deal rooms. |
| 404 action | View deal rooms |

---

# E. Metadata and short descriptions

## Browser title

Accord | Private deal rooms for agent commerce

## Meta description

Accord brings agents together to negotiate privately, approve shared terms, and control payments through one deal room. Explore Glassbook, its first application.

## Social preview

**Title:** The private deal room for agent-to-agent commerce.

**Description:** Confidential mandates. Shared approval. Payments governed by the agreement.

**Image direction:** One actual deal room with a readable agreement, recipient and activity record. Use the brand and headline, not a wall of claims or provider logos. Mark any illustrative UI as illustrative.

## Repository or directory description

Accord connects private agent negotiation with agreement-controlled permissions and payments. Glassbook is its first application for liquidity agreements.

## Short introduction

Accord is the private deal room for agent-to-agent commerce. Agents negotiate from confidential mandates, parties approve the terms, and the agreement defines the supported payment permissions and conditions. Glassbook applies this workflow to liquidity agreements and venue-level observations.

---

# F. Builder handoff and publication checks

This section is not website copy.

## F1. Route and CTA map

| CTA or link | Destination | Publication requirement |
| --- | --- | --- |
| Open a deal room | `/agreements/new` | Working setup flow on the stated environment. |
| Watch the demo / Watch the security demo | `/demo` with the relevant chapter | Working player; footage labeled live capture or recorded. |
| Explore the demo | `/demo` | Safe primary CTA while app access is unavailable. |
| Explore the deal room | `/product` | Product explanation and actual or labeled recorded room. |
| Inspect an agreement / Inspect the execution | `/record` or a real agreement-specific URL | Readable records with source links, timestamps and visibility rules. |
| Explore Sealed Table | `/product/sealed-table` | Approved product copy and actual capability status. |
| Explore Payee / Set up your recipient profile | `/product/payee` / `/payee` | Explanation / actual recipient onboarding. |
| See a Glassbook agreement | Real Glassbook room or `/glassbook` | Recorded fallback labeled beside the agreement title. |
| Security / Read the trust model | `/security` | Current implementation-specific trust model. |
| Developers / Documentation | `/docs` | Reproducible instructions for the actual release. |
| Research | `/research` | Curated primary sources with checked summaries. |
| GitHub | Actual public repository | Public access and an appropriate license. |
| Contact / Privacy / Terms | Confirmed contact / published policy routes | Owner-supplied contact and reviewed policy text. |

These routes are proposed, not verified existing pages. Keep existing working application routes where available and update the link map accordingly. Never render literal placeholder URLs.

## F2. Content hierarchy

- Homepage: product identity, a working room, Glassbook, the process, controls and next steps.
- Product pages: deeper Sealed Table, Payee and Glassbook explanations.
- Security: precise trust boundaries and implementation limitations.
- Developers: architecture, setup, commands and reproducible evidence.
- Research: a small, checked bibliography. Exclude unverified quotes and claims about competitors.

Use spacious layouts, short paragraphs, one primary action per section and restrained visual emphasis. Keep technical details near decisions that depend on them. Do not make every section a table. Product screenshots should carry more explanatory weight than decorative illustrations. Do not present protocol affiliations as endorsements.

## F3. Claim-to-evidence gates

| Claim or feature | Evidence required before publication |
| --- | --- |
| Testnet availability | Reachable app, actual contract address, correct network and a completed flow. |
| Confidential negotiation | Verified browser-to-execution path, approved application identity/configuration, key binding and documented inference/egress/logging behavior. |
| Mandate commitments | Randomized or otherwise hiding commitments appropriate to low-entropy inputs; agreement/network binding and replay controls. A plain hash is not automatically a privacy guarantee. |
| Hard-limit validation | Tests showing supported violations rejected by deterministic code, independent of model compliance. |
| Agreement-controlled authorization | Actual policy checks, full-access-key and upgrade disclosures, all signing methods accounted for. |
| Recipient controls | Domain proof bound to the agreement and destination, required approvals, versioning and delay enforced in the deployed flow. |
| Glassbook release conditions | Authentic observer outputs, scheduled coverage, replay protection, and explicit handling of missing, stale and failing evidence. |
| Payment lifecycle | Reserved authorization cannot be freed by an unverified status report. Duplicate-payment and retry behavior tested. |
| Cancellation | Original-wins, replacement-wins and unresolved outcomes handled. UI waits for the configured confirmation policy. |
| Public proof counters | Derived from scoped records, complete across outcomes, timestamped and linked. No hard-coded zero-loss or zero-leak claims. |
| Production, audit or compliance claims | Actual release status and applicable independent evidence. None is established by this copy document. |

## F4. Architecture note for the security page

Describe the deployed system rather than borrowing provider guarantees wholesale. The planned stack uses NEAR for agreement state and permissions, OutLayer for confidential jobs, NEAR AI Cloud for inference, and Chain Signatures for supported Base transactions. Verify each integration against the deployed configuration.

The security page must identify: who deploys or upgrades code; who retains full-access keys; which application hashes and configurations the parties approve; which plaintext fields each service processes; what leaves the confidential execution path; what is public; who reports Base status; and what economic state that reporter can affect.

The current design's reporter limitation is material. Do not hide it behind “the app checks Base,” or claim fully trustless cross-chain settlement. Fix or explicitly disclose the authority that status updates hold over retries, reserved funds and final settlement.

## F5. Source discipline

This copy deliberately uses no external market-size statistics, judge quotations, claimed customer results or unsupported competitor comparisons. It does not need those claims to explain the product.

Before publishing technical statements, verify them against the release and these official references:

- NEAR access keys: https://docs.near.org/protocol/accounts-contracts/access-keys
- NEAR asynchronous cross-contract calls: https://docs.near.org/smart-contracts/anatomy/crosscontract
- NEAR AI Cloud private inference: https://docs.near.ai/cloud/private-inference
- OutLayer trust and verification: https://app.outlayer.ai/docs/trust-verification
- Kraken public order book: https://docs.kraken.com/exchange/api-reference/spot-websocket-v2/book
- Kraken account-specific execution data: https://docs.kraken.com/exchange/api-reference/spot-websocket-v2/executions

The exchange references illustrate the difference between aggregate and account-specific evidence; they do not assert that Glassbook has integrated Kraken.

Accord Project already operates in a related agreement-automation category: https://accordproject.org/. Resolve naming and discoverability before public brand investment. This document retains the user's chosen working name and makes no trademark-availability claim.

## F6. Final editorial checks

- Headline remains: “The private deal room for agent-to-agent commerce.”
- Sealed Table and Payee are capabilities; Glassbook is the first application.
- Every live screen, counter and status has a real source; stale data is timestamped.
- Glassbook's venue-level scope is visible beside its value proposition.
- Private inputs are not confused with private settlement.
- Revocation is not described as recall; cancellation is not shown as guaranteed.
- Attestation is not described as proof of fairness or truthful external data.
- No invented quotes, endorsements, savings, audit results, launch dates or winning probabilities.
- All CTAs lead somewhere useful; unbuilt routes and unsupported features are omitted.
- All public text uses the implemented terms and approval rules. The builder must flag discrepancies rather than silently invent functionality.
