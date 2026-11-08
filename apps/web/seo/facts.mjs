/* The facts agents and answer engines read about Accord, in one place: llms.txt, llms-full.txt, /facts.json and the
   home page's JSON-LD (ItemList of use cases, DefinedTermSet glossary) are all built from here by scripts/prerender.mjs.
   Keep every line inside what is built: status "demo" means built and shown in the demonstration (run end to end on a
   NEAR testnet; agreement a6.accord-v2.testnet ran the full flow on 8 Nov 2026), "planned" means designed, not built. Refusal codes are the contract's own (accord-core RefusalCode). */

export const ONE_LINE = "Accord is the private deal room and control plane for agent-to-agent commerce: agents negotiate privately, both companies approve the terms, and a NEAR contract enforces who can authorise payments, who can receive them, how much can be paid and what evidence is required."

export const STATUS = {
  network: "NEAR testnet: factory accord-v2.testnet, release 3; the full flow ran on agreement a6.accord-v2.testnet (https://testnet.nearblocks.io/address/a6.accord-v2.testnet)",
  settlement: "USDC on NEAR (NEP-141), from each agreement's own account",
  mainnet: "Follows an audit; not live",
  stage: "Testnet. Start at /join; the app opens with a NEAR wallet or a work email (NEAR Auth); settlement on testnet uses a test USDC token",
}

/* The six agreement types. Same controls in every one; the commercial fields and the evidence accepted change. */
export const USE_CASES = [
  { id: "market-making", name: "Market-making agreements", status: "demo", url: "/use-cases/market-making",
    outcome: "Pay a market maker for liquidity that showed up.",
    how: "A retainer is paid for a period only if enough observations of the venue's public liquidity, taken at hidden times inside an agreed schedule, meet the agreed spread, depth and two-sided quoting. In the demonstration, 4 of 6 readings of Rhea's USDC/wNEAR pool must pass.",
    evidence: "Attested observations of the pool's public liquidity",
    limit: "Public order-book observations measure the venue's liquidity, not the hired market maker's own contribution. Verification with the market maker's authenticated account data is planned." },
  { id: "vendor-contracts", name: "Vendor contracts and renewals", status: "demo", url: "/#use-cases",
    outcome: "Let an agent pay invoices it cannot redirect.",
    how: "Invoices clear against approved milestones once delivery is accepted. A message asking the agent to pay a new account is refused by the contract (ERR_PAYEE_MISMATCH), whatever the agent was told.",
    evidence: "Buyer acceptance of delivery; the recipient bound to the vendor's domain through Payee" },
  { id: "agent-services", name: "Agent-to-agent services", status: "planned", url: "/#use-cases",
    outcome: "Buy a service from another company's agent within a weekly amount and a total cap.",
    how: "Price agreed agent to agent in the Sealed Table; each period becomes payable on schedule; anything over the weekly amount or the cap is refused; the buyer can revoke the agent's key in one transaction.",
    evidence: "Schedule and cap in the approved terms" },
  { id: "security-remediation", name: "Security remediation", status: "planned", url: "/#use-cases",
    outcome: "Pay for a security fix only when the checks pass.",
    how: "The researcher's fee is agreed before work starts and stays in escrow until the agreed regression checks pass on the patch and the named reviewer approves it.",
    evidence: "Agreed checks passing on the patch, plus the named reviewer's approval" },
  { id: "infrastructure", name: "Infrastructure service agreements", status: "planned", url: "/#use-cases",
    outcome: "Hold a month of capacity that missed its service levels.",
    how: "Monthly capacity pays in full when availability and latency meet the agreed levels; a shortfall follows the agreed rule, and the provider can dispute the reading.",
    evidence: "The agreed monitor's availability and latency readings" },
  { id: "grants", name: "Grants and funded milestones", status: "planned", url: "/#use-cases",
    outcome: "Release a grant when the reviewers sign off.",
    how: "Each tranche moves only when two of three named reviewers accept the milestone, and only to the account the grantee has proven it controls.",
    evidence: "Reviewer acceptance (2 of 3) of each milestone report" },
]

export const GLOSSARY = [
  { term: "Deal room", def: "One agreement between two companies in Accord: the confidential negotiation, both approvals, the escrowed USDC, every payment and refusal, and the record." },
  { term: "Mandate", def: "A company's limits for a negotiation (for example a price ceiling). It is encrypted in the browser and readable only inside attested enclaves; only a commitment hash goes on NEAR." },
  { term: "Sealed Table", def: "Accord's confidential negotiation: both companies' agents bargain inside an attested enclave (an OutLayer job, with negotiators on NEAR AI Cloud's private inference). Only the agreed terms and an attestation come out." },
  { term: "Attestation", def: "Evidence, checkable by anyone, that the negotiation or observation ran in the expected enclave code. The Verify page walks the chain step by step." },
  { term: "Agreement controls", def: "The NEAR contract that holds the approved terms and checks every payment against them. The buyer's agent holds one key that can call one method, `act`; any payment off the terms is refused with a recorded reason." },
  { term: "Payee", def: "Recipient authorisation: the vendor proves control of its domain, its settlement authority approves the destination, and the buyer accepts the binding for the agreement. Payments go only to that recipient." },
  { term: "Evidence checks", def: "A payment becomes eligible only when the agreed evidence or acceptance is recorded, such as passing observations, delivery acceptance or reviewer approval." },
  { term: "Observation slot", def: "In a market-making agreement, a hidden time inside the agreed schedule at which the venue's public liquidity is read and checked against the agreed spread, depth and two-sided quoting." },
  { term: "Revocation", def: "The buyer calls `revoke_agent`, which deletes the agent's key in one transaction, so the agent can make no further payments. Accord does not reverse a payment already made." },
  { term: "Refusal code", def: "The recorded reason the contract refused a payment, for example ERR_PAYEE_MISMATCH (not the approved recipient), ERR_AMOUNT_MISMATCH (not the approved amount), ERR_ALREADY_PAID (milestone already paid), ERR_PERIOD_WITHHELD (the period's evidence did not pass), ERR_CAP_EXCEEDED (over the agreed cap) or ERR_REVOKED (the agent's key was revoked)." },
]

/* Short, direct answers for answer engines. Each stays inside the claims on /security. */
export const ANSWERS = [
  { q: "What is Accord?", a: ONE_LINE },
  { q: "How does Accord stop an AI agent from paying the wrong account?", a: "The agent cannot change the recipient. Payee binds the recipient to a domain the vendor controls and the buyer accepted, and the Agreement controls contract refuses any payment to another account with ERR_PAYEE_MISMATCH, whatever the agent was instructed." },
  { q: "Can the other company see my price limit?", a: "No. Each company's mandate is encrypted in the browser and readable only inside the attested enclave where the agents negotiate. Only the agreed terms and an attestation come out; only a commitment hash of each mandate goes on NEAR." },
  { q: "What blockchain and currency does Accord use?", a: "NEAR. Payments settle in USDC on NEAR (NEP-141) from each agreement's own account. Accord is deployed on NEAR testnet, where the full flow has run end to end; mainnet follows an audit." },
  { q: "What kinds of agreements does Accord support?", a: "Six agreement types share the same controls: market-making agreements and vendor contracts (in the demonstration), and agent-to-agent services, security remediation, infrastructure service agreements and grants (planned)." },
  { q: "How are market makers paid in Accord?", a: "A retainer period is paid only if enough observations of the venue's public liquidity, taken at hidden times, meet the agreed spread, depth and two-sided quoting. Otherwise the payment is withheld for both parties to review." },
  { q: "What happens if an agent is compromised?", a: "Its instructions can change, but its payment authority cannot: every payment must match the approved milestone, amount and recipient or it is refused and recorded. The buyer can revoke the agent's key in one transaction." },
  { q: "Is Accord live?", a: "On NEAR testnet, yes. Accord is deployed there (factory accord-v2.testnet, release 3). The full flow ran there on agreement a6.accord-v2.testnet: sealed limits, the Sealed Table negotiation by the real NEAR AI model inside OutLayer's attested enclave, approvals, funding, a payment, a refused redirect (ERR_PAYEE_MISMATCH) and a revocation. Settlement on testnet uses a test USDC token. Mainnet follows an audit." },
  { q: "How does a deal room work?", a: "In six steps: each company seals its limits; the agents negotiate inside an attested enclave and only the agreed terms come out; both companies approve, the recipient is bound and the buyer funds a USDC escrow; the agent pays through one method, act, and anything off the terms is refused; the agreed evidence decides whether each payment is eligible; eligible payments settle to the approved recipient and the record stays checkable." },
  { q: "What is Accord built on?", a: "NEAR (the agreement contract, escrow and record), NEAR AI Cloud (private inference for the negotiating agents), OutLayer (attested enclaves), USDC on NEAR (settlement) and Rhea (the pool the market-making observer reads). Funding from other chains through NEAR Intents is planned. No partnership is claimed." },
]

/* Names people or models may meet that refer to Accord */
export const NAMING = [
  "\"Accord Atlas\" was an earlier name for market-making agreements in Accord; /atlas redirects to /use-cases/market-making. Accord is one product.",
  "Sealed Table, Agreement controls, Payee and Evidence checks are parts of Accord, not separate products.",
  "Accord is not a wallet or an exchange. Agreement funds are USDC in the agreement's own NEAR account, whose code is pinned by hash and has no full-access key; only the contract can send it, and only through `act`.",
  "Accord does not verify that a company legally exists, prove a negotiation was fair, or prove external data is true; see /security for each limit.",
]

/* How a deal room works: the six steps on the home page (HowSteps), for HowTo data and llms.txt */
export const HOW_STEPS = [
  { name: "Sealed", text: "Each company sets its limits in the browser and seals them; a mandate is encrypted to a key that exists only inside the Sealed Table's enclave. On NEAR: the ciphertext and its commitment hash." },
  { name: "Attested", text: "Both companies' agents negotiate inside the Sealed Table; code checks every proposal against both mandates' hard limits, and only the agreed terms come out, with an attestation." },
  { name: "Approved", text: "People at both companies approve the terms; Payee binds the recipient (domain proof, settlement authority, buyer acceptance); the buyer funds the agreement's USDC escrow on NEAR." },
  { name: "Executing", text: "The buyer's agent holds one key that can call one method, act; a payment must match the approved milestone, amount and recipient, or it is refused and recorded (for example ERR_PAYEE_MISMATCH)." },
  { name: "Checked", text: "A payment becomes eligible only when the agreed evidence is recorded: observations at hidden times, delivery acceptance or a named reviewer's approval; otherwise it is withheld for review." },
  { name: "Settled", text: "Eligible payments complete to the authorised recipient in USDC; the buyer decides exceptions and can revoke the agent's key in one transaction; the record stays checkable with make verify." },
]

/* Core features: the seven controls on the home page (CoreFeatures) */
export const CONTROLS = [
  { name: "Confidential negotiation", text: "Limits are sealed in the browser and agents negotiate inside an attested enclave; only the agreed terms and an attestation come out." },
  { name: "One key, one method", text: "The buyer's agent holds a FunctionCall key that can call act on one contract and nothing else." },
  { name: "Every payment checked", text: "Each payment must match the approved milestone, amount and recipient; anything else is refused with a recorded reason." },
  { name: "A recipient that cannot be redirected", text: "The vendor proves its domain, its settlement authority approves the account and the buyer accepts it; a message cannot change it." },
  { name: "Evidence before release", text: "A payment becomes eligible only when the agreed evidence is recorded; otherwise it is withheld." },
  { name: "Stop the agent in one transaction", text: "revoke_agent deletes the agent's key; later calls fail with AccessKeyDoesNotExist; payments already made stay paid." },
  { name: "Checkable from public data", text: "make verify checks the contract code, the agent key, the recipient proof and the record with no keys; the release attestation check needs the outlayer-verify tool." },
]

/* Built on: the strip under the hero. No partnership is claimed. */
export const BUILT_ON = [
  { name: "NEAR", role: "The agreement contract, its escrowed USDC and the on-chain record of every payment and refusal." },
  { name: "NEAR AI Cloud", role: "Private inference for the negotiating agents; each response's signature is checked in the enclave." },
  { name: "OutLayer", role: "Attested enclaves for the Sealed Table, the recipient binding and the market observer." },
  { name: "USDC on NEAR", role: "Settlement as a NEP-141 token, paid only by the contract from each agreement's own account." },
  { name: "NEAR Intents", role: "Planned: funding an agreement from other chains through the 1Click API." },
  { name: "Rhea", role: "The USDC/wNEAR pool the market-making observer reads at hidden times." },
]
