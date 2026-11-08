/* The facts agents and answer engines read about Accord, in one place: llms.txt, llms-full.txt, /facts.json and the
   home page's JSON-LD (ItemList of use cases, DefinedTermSet glossary) are all built from here by scripts/prerender.mjs.
   Keep every line inside what is built: status "demo" means built and shown in the demonstration (run end to end on a
   NEAR testnet; agreement a6.accord-v2.testnet ran the full flow on 8 Nov 2026), "planned" means designed, not built. Refusal codes are the contract's own (accord-core RefusalCode). */

export const ONE_LINE = "Accord is the private deal room and control plane for agent-to-agent commerce: agents negotiate privately, both companies approve the terms, and a NEAR contract enforces who can authorise payments, who can receive them, how much can be paid and what evidence is required."

export const STATUS = {
  network: "NEAR testnet: factory accord-v2.testnet, release 3; the full flow ran on agreement a6.accord-v2.testnet (https://testnet.nearblocks.io/address/a6.accord-v2.testnet)",
  settlement: "USDC on NEAR (NEP-141), from each agreement's own account",
  mainnet: "Follows an audit; not live",
  stage: "Testnet. Start at /app/try-it; the app opens with your own NEAR wallet; settlement on testnet uses a test USDC token",
  howToTest: "Open /app/try-it and follow five steps: connect a NEAR testnet wallet (Meteor or Intear), get 2.5 testnet NEAR and 100 test USDC from the faucet, open a deal room against Accord's demo vendor (halcyon-demo.testnet), seal your limits (40 tUSDC ceiling, 2 to 4 items), then watch the demo counterparty negotiate in the Sealed Table, approve and deliver while you approve, fund and accept. A demo agent run by Accord for the test room pays the due item to the proven recipient, the contract refuses a payment to a new account with ERR_PAYEE_MISMATCH, and you revoke the agent key. Everything is on NEAR testnet with test USDC.",
}

/* The public source repository (MIT). VITE_REPO_URL can point the site's links elsewhere; agents get this one. */
export const REPO = "https://github.com/Adityaakr/accord"

/* The six agreement types. Same controls in every one; the commercial fields and the evidence accepted change. */
export const USE_CASES = [
  { id: "market-making", name: "Market-making agreements", status: "demo", url: "/use-cases/market-making",
    outcome: "Pay a market maker for liquidity that showed up.",
    how: "A retainer is paid for a period only if enough observations of the venue's public liquidity, taken at hidden times inside an agreed schedule, meet the agreed spread, depth and two-sided quoting. In the demonstration, 4 of 6 readings of Rhea's USDC/wNEAR pool must pass.",
    evidence: "Attested observations of the pool's public liquidity",
    limit: "Public order-book observations measure the venue's liquidity, not the hired market maker's own contribution. Verification with the market maker's authenticated account data is planned. Its recorded runs are on a local node reading real NEAR mainnet blocks; no market-making observation is recorded on NEAR testnet yet." },
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
  { q: "How do I test Accord myself?", a: STATUS.howToTest },
  { q: "Is Accord live?", a: "On NEAR testnet, yes. Accord is deployed there (factory accord-v2.testnet, release 3). The full flow ran there on agreement a6.accord-v2.testnet: sealed limits, the Sealed Table negotiation by the real NEAR AI model inside OutLayer's attested enclave, approvals, funding, a payment, a refused redirect (ERR_PAYEE_MISMATCH) and a revocation. Settlement on testnet uses a test USDC token. Mainnet follows an audit." },
  { q: "How does a deal room work?", a: "In six steps: each company seals its limits; the agents negotiate inside an attested enclave and only the agreed terms come out; both companies approve, the recipient is bound and the buyer funds a USDC escrow; the agent pays through one method, act, and anything off the terms is refused; the agreed evidence decides whether each payment is eligible; eligible payments settle to the approved recipient and the record stays checkable." },
  { q: "How is Accord different from a wallet spending limit or an allowlist?", a: "The limits come from a negotiated agreement both companies approved, not from a setting one side controls. The terms (items, amounts, evidence and recipient) are fixed in the agreement's own NEAR account, the agent's only key can call one method, act, and the recipient is bound to the vendor's domain, approved by its settlement authority and accepted by the buyer. Limit: Accord bounds what the agent can pay; it does not make the agent's judgement better." },
  { q: "What is private and what is public?", a: "Private: each company's mandate (its limits) and the negotiation transcript stay inside attested enclaves; the commercial terms document is encrypted to the two parties. Public: the enforced schedule (amounts, dates, recipient), every payment and every refusal are on NEAR, as with any stablecoin payment. Limit: privacy rests on the enclave hardware (Intel TDX, NVIDIA confidential computing), OutLayer's keystore governance and the deployer never rebinding the seed to another build." },
  { q: "What stops a fooled agent from paying the wrong account?", a: "The contract, not the agent. Every act call must match the approved item, amount, evidence and recipient; a payment to any other account is refused with ERR_PAYEE_MISMATCH and recorded, and a changed amount with ERR_AMOUNT_MISMATCH. Agreement a6.accord-v2.testnet recorded such a refusal on testnet. Limit: the agent can still be fooled into asking; a payment inside the terms goes through." },
  { q: "Which wallets can I sign in with?", a: "External NEAR wallets only, through HOT Connect: Meteor, Intear, Ledger, Nightly or WalletConnect, switched to testnet. Meteor and Intear send through Accord's relayer, so you pay no gas. There is no email sign-in, and Accord never holds your wallet's keys." },
  { q: "What is not done yet?", a: "Mainnet (it follows an audit), market-making observations on testnet (market making runs end to end on a local node reading real NEAR mainnet blocks; on testnet it waits on an OutLayer payment key), the four planned agreement types, funding from other chains through NEAR Intents, a legal KYB check, and verification with a market maker's own account data." },
  { q: "What is Accord built on?", a: "NEAR (the agreement contract, escrow and record), NEAR AI Cloud (private inference for the negotiating agents), OutLayer (attested enclaves), USDC on NEAR (settlement) and Rhea (the pool the market-making observer reads). Funding from other chains through NEAR Intents is planned. No partnership is claimed." },
]

/* Names people or models may meet that refer to Accord */
export const NAMING = [
  "Accord is one product. Market-making agreements are one of its six agreement types, not a separate product; old links to /atlas redirect to /use-cases/market-making.",
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

/* /app/try-it, step by step: HowTo data on /docs/quickstart and the "Try it" section of llms.txt. Each step is do X, see Y. */
export const TRY_STEPS = [
  { name: "Connect a NEAR wallet", do: "Open /app/try-it and connect a NEAR testnet wallet through HOT Connect (Meteor or Intear send through Accord's relayer, so you pay no gas).", see: "Step 1 marked done with your account name." },
  { name: "Get test funds", do: "Get test funds from the faucet (once a day per account).", see: "Your balance reads 2.50 NEAR and 100 tUSDC, with both faucet transactions linked." },
  { name: "Create the deal room", do: "Create the room, prefilled against Accord's demo vendor halcyon-demo.testnet; your wallet signs create_agreement on the factory accord-v2.testnet with a 2 NEAR deposit, returned when the room closes.", see: "A new agreement account such as a8.accord-v2.testnet, in state Sealed." },
  { name: "Seal your limits", do: "Seal the Northwind preset (40 tUSDC ceiling, 2 to 4 items); it is encrypted in your browser to the Sealed Table.", see: "The demo counterparty seals its own mandate and the negotiation runs; the state moves from Sealed to Attested." },
  { name: "Approve, fund and accept", do: "Approve the terms, fund the escrow, accept the recipient and the first delivery.", see: "The recipient halcyon-mm.testnet proven on the vendor's domain, approved by its authority and active once you accept it." },
  { name: "Let the demo agent pay", do: "Start the demo agent; your wallet signs install_agent_key, one function-call key that can call act and nothing else.", see: "Paid item 1 to halcyon-mm.testnet, with the act transaction linked." },
  { name: "Try a redirect", do: "Ask the agent to pay a new account.", see: "ERR_PAYEE_MISMATCH: the contract refused it, recorded the refusal and moved nothing." },
  { name: "Revoke the key", do: "Revoke the agent from the room header.", see: "Agent revoked; its next call is rejected by the network (AccessKeyDoesNotExist)." },
  { name: "Check it from public data", do: "Open /verify and enter your agreement account (or open /verify?agreement=<account>).", see: "Five checks run in the browser with no account and no keys; /record shows agreement a6's 12 transactions." },
]

/* The six claims (platform/GOAL.md "Claims and their limits"), shortened; /security shows the full table. */
export const CLAIMS = [
  { claim: "Each company's mandate is readable only inside attested enclaves.", limit: "Under the hardware's trust assumptions (Intel TDX, NVIDIA confidential computing) and OutLayer's keystore governance. The deployer owns the seed and the factory account and could rebind the seed to another build. On testnet the job's seed condition admits any caller during an agreement's open request window, so an outside party could request extra runs then and learn bounds on the limits; restricting the seed to the agreement's own calls is the next step. Prompts reach the model through NEAR AI's attested gateway over TLS. The browser trusts the code the app serves; the CLI is the alternative." },
  { claim: "The approved terms are the agent's only authority.", limit: "The agent's judgement is bounded, not protected: it can still be fooled into asking. Attestation proves which code produced the terms, not that the deal was good; people decide that when they approve." },
  { claim: "Payments go only to the authorised recipient.", limit: "Authorisation proves control of the domain and the settlement authority's approval, not that the company legally exists. A legal KYB check is a later integration. Testnet agreements run in demo mode: a recipient change waits 120 s and a claim 120 s; live mode enforces at least 24 h for a recipient change and 72 h for a claim, checked by the factory and again by the agreement." },
  { claim: "Revoking ends the agent's authority in one transaction.", limit: "A payment already made stays made. A call that reached the chain before the revoke still runs, with every check. Revoking never cancels what the vendor has earned." },
  { claim: "Negotiation is private; settlement is public.", limit: "The enforced schedule (amounts, dates, recipient) and every payment are public on NEAR, as with any stablecoin payment." },
  { claim: "A market-making agreement's payment becomes eligible only when the agreed observations pass, unless the buyer approves an exception.", limit: "The observer measures the venue's liquidity, not the market maker's own orders. The deployer owns the observer's seed. A slot nobody polls in time counts as unobserved, and an undecided period goes to the buyer, not to payment." },
]

/* What is not built or not live yet. Said plainly so no reader assumes it. */
export const NOT_DONE = [
  "Mainnet: Accord runs on NEAR testnet only; mainnet follows an audit.",
  "Market making on testnet: it runs end to end on a local node reading real NEAR mainnet blocks; on testnet it waits on an OutLayer payment key, and no market-making observation is recorded on testnet yet.",
  "Four agreement types are planned, not built: agent-to-agent services, security remediation, infrastructure service agreements, and grants and funded milestones.",
  "Funding an agreement from other chains through NEAR Intents is planned.",
  "A legal KYB check of the vendor is a later integration; Payee proves domain control and the authority's approval only.",
  "Verifying a market maker's own contribution with its authenticated account data is planned.",
  "The SDK, MCP server and CLI are not published to npm; they run from a clone of the repository (https://github.com/Adityaakr/accord), under platform/packages.",
  "Production prices are published before launch; testnet use is free with test funds.",
]

/* The accounts on NEAR testnet, for agents that want to look them up */
export const ACCOUNTS = [
  { role: "Factory (release 3)", account: "accord-v2.testnet" },
  { role: "Agreement that ran the full flow on 8 Nov 2026", account: "a6.accord-v2.testnet" },
  { role: "Test USDC (tUSDC, NEP-141, 6 decimals)", account: "tusdc.accord-v1.testnet" },
  { role: "Factory settling in Circle USDC (release 3, same code; no funded flow yet)", account: "accord-usdc.testnet" },
  { role: "Circle USDC on testnet (NEP-141, 6 decimals; faucet.circle.com)", account: "3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af" },
  { role: "Relayer", account: "relay.accord-v2.testnet" },
  { role: "OutLayer", account: "outlayer.testnet" },
  { role: "Demo vendor (Accord's own account)", account: "halcyon-demo.testnet" },
  { role: "Demo vendor's settlement authority", account: "halcyon-auth.testnet" },
  { role: "Demo vendor's authorised recipient", account: "halcyon-mm.testnet" },
]

/* How an agent integrates. Only what exists in platform/packages (https://github.com/Adityaakr/accord/tree/main/platform/packages); none of it is published to npm yet. */
export const FOR_AGENTS = [
  { name: "Source", text: "Clone https://github.com/Adityaakr/accord (MIT) and run pnpm install in platform/. Read-only check of the testnet agreement, no keys: ACCORD_FACTORY=accord-v2.testnet make verify DEAL=a6.accord-v2.testnet (it prints verify: <n> checks ok). The MCP server, SDK and CLI live in platform/packages; methods, tools and commands are specified in platform/INTERFACES.md." },
  { name: "MCP server (@accord/mcp)", text: "pnpm --filter @accord/mcp dev from platform/ with ACCORD_FACTORY=accord-v2.testnet; stdio by default, or streamable HTTP at /mcp with --http <port>. Read tools need no key: accord_list_agreements, accord_get_agreement, accord_due_items, accord_preflight, accord_refusals, accord_receipts, accord_verify. accord_pay and accord_request_exception need the agent's function-call key (ACCORD_AGENT_KEY with AGENT_AGREEMENT); accord_pay runs preflight first and the contract checks again. Principal tools (accord_seal_mandate, accord_approve_terms, accord_submit_delivery, accord_propose_recipient) are off unless ACCORD_PRINCIPAL_KEY and ACCORD_PRINCIPAL_ACCOUNT are set; a key is never a tool argument." },
  { name: "SDK (@accord/sdk)", text: "TypeScript on near-api-js: agreements, sealing a mandate, the agent's act, preflight and verify." },
  { name: "CLI (accord)", text: "Every step of an agreement from a terminal (create, seal, negotiate, approve, fund, recipient, deliver, pay, agent revoke, verify and more); read-only commands (show, refusals, receipts, check, verify, watch) need no key. Run it with pnpm --filter @accord/cli dev -- <command>; make verify DEAL=<account> checks any agreement from public data." },
  { name: "Without code", text: "Read /llms.txt, /facts.json, or any page as Markdown (add .md to its path, or send Accept: text/markdown). /verify?agreement=<account> checks an agreement in the browser; testnet.nearblocks.io shows every transaction." },
]
