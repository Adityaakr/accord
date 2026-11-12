/* The facts agents and answer engines read about Accord, in one place: llms.txt, llms-full.txt, /facts.json and the
   home page's JSON-LD (ItemList of use cases, DefinedTermSet glossary) are all built from here by scripts/prerender.mjs.
   Keep every line inside what is built: status "demo" means built and shown in the demonstration (run end to end on a
   NEAR testnet; agreement a6.accord-v2.testnet ran the full flow on 8 Nov 2026), "planned" means designed, not built. Refusal codes are the contract's own (accord-core RefusalCode). */

export const ONE_LINE = "Accord is the private deal room and control plane for agent-to-agent commerce: agents negotiate privately, both companies approve the terms, and a NEAR contract enforces who can authorise payments, who can receive them, how much can be paid and what evidence is required."

export const STATUS = {
  network: "NEAR testnet: factories accord-v2.testnet (test USDC) and accord-usdc.testnet (Circle's testnet USDC), both on release 5 since 10 Nov 2026 (release 4's security-review fixes, now on the reviewed enclave job builds); the full flow ran on agreement a6.accord-v2.testnet on release 3 (https://testnet.nearblocks.io/address/a6.accord-v2.testnet), and on release 5 from fresh accounts in one command on 10 Nov 2026 in 1:29: a65.accord-v2.testnet (https://testnet.nearblocks.io/address/a65.accord-v2.testnet), payment and a refused redirect, verify 6 checks ok · 1 partial",
  release4: "Release 4 proofs, 9 Nov 2026, on new agreements of accord-v2.testnet: a10.accord-v2.testnet negotiated (33.00 tUSDC, test USDC, in 3 items), was funded (https://testnet.nearblocks.io/txns/2mBhRNnXnitEN2gefBe7C8MWdCYS7P2nJLZyZznHFH22), paid item 1, 12.00 tUSDC to halcyon-mm.testnet (https://testnet.nearblocks.io/txns/Bs5dVpr6DnR5jXjYKXbGsp9HP36smmoJRFmvJP4tGqAm) and refused a redirect with ERR_PAYEE_MISMATCH (https://testnet.nearblocks.io/txns/51TQ8no9kPp4P8SDyN77jNZMevLsKaTBH3SufU2SUefu); a11.accord-v2.testnet refused a redirect, an altered amount and a canary request (the canary revoked and deleted the key; 0.00 moved); on a13.accord-v2.testnet revoke deleted the key, the next call failed with AccessKeyDoesNotExist and a new key paid item 2. Check: make verify DEAL=a10.accord-v2.testnet prints code = release 4 and, with the outlayer-verify tool installed, verify: 6 checks ok · 1 partial (7 checks: model is partial because the hardware quote is not checked there; release proves the three job runs with outlayer-verify, and is not checked without the tool), or GET /app/api/verify/a10.accord-v2.testnet",
  marketMaking: "Market making on testnet, 10 Nov 2026, factory accord-v2.testnet, release 5, test USDC (tUSDC): a56.accord-v2.testnet (https://testnet.nearblocks.io/address/a56.accord-v2.testnet) had its period 1 observed 6 of 6 by the observer in OutLayer's enclave, reading Rhea's USDC/wNEAR pool on NEAR mainnet (spread 176 bps, depth 36.56 / 55.00 USDC within 300 bps), closed Eligible, and the agent paid 6.00 tUSDC to halcyon-mm.testnet (https://testnet.nearblocks.io/txns/42HuyHX2SPWNbnT7tKKni6WwyKKCK556vmKo3TydVPeD); a57.accord-v2.testnet, with stricter conditions, passed 0 of 6, closed Withheld, and the agent's payment was refused with ERR_PERIOD_WITHHELD (https://testnet.nearblocks.io/txns/4W1Ud2GVRPZnJL4uJdyEjAfdB5igT3S1DGTJxxLNcS1Y). Both verify 6 checks ok · 1 partial. The run watched period 1 of each agreement; the observations measure the venue's liquidity, not the market maker's own orders.",
  circleUsdc: "Circle USDC proof, 9 Nov 2026: a1.accord-usdc.testnet (release 3 of the second factory) was funded with 14.00 Circle USDC (https://testnet.nearblocks.io/txns/4gPohYYMokgQcPcgNhX3tCTTXjA35AfuKkpGs1SpS2no), paid 5.00 to halcyon-mm.testnet (https://testnet.nearblocks.io/txns/E127BGy3Tw6PmhE9JcoFr7vQsKTiHNevTTiAxEjJGWK2), refused a redirect with ERR_PAYEE_MISMATCH (https://testnet.nearblocks.io/txns/9rgsBFA26yedWuEEJk77sKBDrDGS9mHn9BFMknCaP8BB) and was revoked (https://testnet.nearblocks.io/txns/FTigDebs1kZjLpTN8nC8SZWp4dMM1ChuUyR211JZnzuW); the agent's next call failed with AccessKeyDoesNotExist. Check: make verify-usdc DEAL=a1.accord-usdc.testnet, or GET /app/api/verify/a1.accord-usdc.testnet",
  audit: "An internal security review (five AI-assisted review passes on separate code areas, each finding re-checked by separate AI review passes; not a third-party audit; severities are self-assigned) found 1 High (a close refund that could spend the vendor's reserve) and 5 Medium issues, plus 4 groups of Low findings (13 individual items); each fix landed together with a failing test that it makes pass. The contract and factory fixes went live as release 4 on both testnet factories and are carried into release 5 (current since 10 Nov 2026), which adds the reviewed enclave job builds. Scope: the contracts, the factory and the enclave jobs; the app server, the relayer and the demo endpoints were outside it, and the relayer deposit issue (DECISIONS.md 27) was found later by a live run and fixed the same day. Limit: S1 (only an agreement's own calls can use the Sealed Table's seed) is partial: it needs the seed's OutLayer access condition, which is not set yet, and the seeds still also admit the earlier job builds (without the factory-only check) so that release 3 and 4 rooms keep working. Agreements created before release 4 (a6, a8 and a1.accord-usdc.testnet) keep release 3's code by hash, and so the close-refund issue. Changed limit: an AssumedPaid amount stays on the agreement's account until its payment's callback answers, and stays there if that callback never runs. Mainnet follows an external audit. Details: platform/DECISIONS.md section 25 (https://github.com/Adityaakr/accord/blob/main/platform/DECISIONS.md#25-security-review-fixes-and-release-4-9-nov-2026)",
  hosts: "The site is served at https://accordweb-production.up.railway.app and at its custom domain https://useaccord.tech (the same Railway service; www.useaccord.tech has no certificate). Both serve the same /.well-known/accord.json, and the /app/try-it rooms propose the demo recipient on useaccord.tech (the app's DEMO_DOMAIN).",
  settlement: "USDC on NEAR (NEP-141), from each agreement's own account",
  mainnet: "Follows an external audit; not live",
  stage: "Testnet. Start at /app/try-it; the app opens with your own NEAR wallet, or without one through a throwaway testnet key made in your browser tab; settlement on testnet uses a test USDC token",
  howToTest: "Open /app/try-it and follow five steps: choose Try without a wallet (a throwaway testnet key made in your browser tab) or connect a NEAR testnet wallet (Meteor or Intear), get up to 2.35 testnet NEAR and 100 test USDC from the faucet (once a day per account, up to 30 accounts per connection a day, within a daily budget), open a deal room against Accord's demo vendor (halcyon-demo.testnet), seal your limits (40 tUSDC ceiling, 2 to 4 items), then watch the demo counterparty negotiate in the Sealed Table, approve and deliver while you approve, fund and accept. You start a demo agent run by Accord for the test room, and it pays the due item to the proven recipient on its own (no click), the contract refuses a payment to a new account with ERR_PAYEE_MISMATCH, and you revoke the agent key. With a throwaway key, Finish closes the room and returns the test NEAR and test USDC to the faucet. With no funds or no wallet, or if the faucet refuses, watch a 60-second replay of a recorded run at /app/replay (a32.accord-v2.testnet, every step with its transaction), write to the agent in the live attack room at /app/try (pre-funded, on chain, refused by the contract), or verify any agreement at /app/verify. Everything is on NEAR testnet with test USDC.",
}

/* The public source repository (MIT). VITE_REPO_URL can point the site's links elsewhere; agents get this one. */
export const REPO = "https://github.com/Adityaakr/accord"

/* The six agreement types. Same controls in every one; the commercial fields and the evidence accepted change. */
export const USE_CASES = [
  { id: "market-making", name: "Market-making agreements", status: "demo", url: "/use-cases/market-making",
    outcome: "Pay a market maker for liquidity that showed up.",
    how: "A retainer is paid for a period only if enough observations of the venue's public liquidity, taken at hidden times inside an agreed schedule, meet the agreed spread, depth and two-sided quoting. In the demonstration, 4 of 6 readings of Rhea's USDC/wNEAR pool must pass.",
    evidence: "Attested observations of the pool's public liquidity",
    limit: "Public order-book observations measure the venue's liquidity, not the hired market maker's own contribution. Verification with the market maker's authenticated account data is planned. On NEAR testnet (10 Nov 2026), agreement a56.accord-v2.testnet's period 1 passed 6 of 6 observations of Rhea's mainnet pool and was paid 6.00 tUSDC, and a57.accord-v2.testnet's stricter period passed 0 of 6 and its payment was refused (ERR_PERIOD_WITHHELD); the run watched period 1 of each." },
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
  { q: "What blockchain and currency does Accord use?", a: "NEAR. Payments settle in USDC on NEAR (NEP-141) from each agreement's own account. Accord is deployed on NEAR testnet, where the full flow has run end to end; mainnet follows an external audit." },
  { q: "What kinds of agreements does Accord support?", a: "Six agreement types share the same controls: market-making agreements and vendor contracts (in the demonstration), and agent-to-agent services, security remediation, infrastructure service agreements and grants (planned)." },
  { q: "How are market makers paid in Accord?", a: "A retainer period is paid only if enough observations of the venue's public liquidity, taken at hidden times, meet the agreed spread, depth and two-sided quoting. Otherwise the payment is withheld for both parties to review." },
  { q: "What happens if an agent is compromised?", a: "Its instructions can change, but its payment authority cannot: every payment must match the approved milestone, amount and recipient or it is refused and recorded. The buyer can revoke the agent's key in one transaction." },
  { q: "How do I test Accord myself?", a: STATUS.howToTest },
  { q: "Is Accord live?", a: "On NEAR testnet, yes. Accord is deployed there (factories accord-v2.testnet and accord-usdc.testnet, release 5: the security-review fixes on the reviewed enclave job builds). The full flow ran there on agreement a6.accord-v2.testnet: sealed limits, the Sealed Table negotiation by the real NEAR AI model inside OutLayer's attested enclave, approvals, funding, a payment, a refused redirect (ERR_PAYEE_MISMATCH) and a revocation. Settlement on testnet uses a test USDC token. The proofs ran again on release 4 (a10.accord-v2.testnet), and a1.accord-usdc.testnet ran a deal in Circle's testnet USDC. Market-making agreements ran there on 10 Nov 2026: a56.accord-v2.testnet's period was observed on Rhea's mainnet pool and paid, and a57.accord-v2.testnet's withheld period was refused (ERR_PERIOD_WITHHELD). Mainnet follows an external audit." },
  { q: "How does a deal room work?", a: "In six steps: each company seals its limits; the agents negotiate inside an attested enclave and only the agreed terms come out; both companies approve, the recipient is bound and the buyer funds a USDC escrow; the agent pays through one method, act, and anything off the terms is refused; the agreed evidence decides whether each payment is eligible; eligible payments settle to the approved recipient and the record stays checkable." },
  { q: "How is Accord different from a wallet spending limit or an allowlist?", a: "The limits come from a negotiated agreement both companies approved, not from a setting one side controls. The terms (items, amounts, evidence and recipient) are fixed in the agreement's own NEAR account, the agent's only key can call one method, act, and the recipient is bound to the vendor's domain, approved by its settlement authority and accepted by the buyer. Limit: Accord bounds what the agent can pay; it does not make the agent's judgement better." },
  { q: "What is private and what is public?", a: "Private: each company's mandate (its limits) and the negotiation transcript stay inside attested enclaves; the commercial terms document is encrypted to the two parties. Public: the enforced schedule (amounts, dates, recipient), every payment and every refusal are on NEAR, as with any stablecoin payment. Limit: privacy rests on the enclave hardware (Intel TDX, NVIDIA confidential computing), OutLayer's keystore governance and the deployer never rebinding the seed to another build." },
  { q: "What stops a fooled agent from paying the wrong account?", a: "The contract, not the agent. Every act call must match the approved item, amount, evidence and recipient; a payment to any other account is refused with ERR_PAYEE_MISMATCH and recorded, and a changed amount with ERR_AMOUNT_MISMATCH. Agreement a6.accord-v2.testnet recorded such a refusal on testnet. Limit: the agent can still be fooled into asking; a payment inside the terms goes through." },
  { q: "Which wallets can I sign in with?", a: "External NEAR wallets only, through HOT Connect: Meteor, Intear, Ledger, Nightly or WalletConnect, switched to testnet. Meteor and Intear send through Accord's relayer, so you pay no gas after opening the room (your wallet pays its 2 NEAR deposit). There is no email sign-in, and Accord never holds your wallet's keys." },
  { q: "Why does Accord matter for teams that run swarms of agents?", a: "Teams that run swarms decide what counts as done and let the agents work. That breaks when one company's swarm works for another's: neither trusts the other's agents, and a person approving each payment becomes the bottleneck. Accord gives the swarm a clear definition of done (the approved item, evidence, amount and recipient, checked by the NEAR contract on every payment), makes fuzzy outcomes checkable (market-making liquidity measured at hidden times), takes people out of the loop (they decide once; open tenders pick the winner on chain) and makes the rule between companies verifiable (make verify). Accord does not fund an agent's own inference or orchestrate agents inside one company." },
  { q: "Can any agent find work and bid through Accord?", a: "Yes, on NEAR testnet. On the open tender board (tender-v2.accord-v2.testnet) a buyer posts a job with a public budget; any agent bids a sealed price signed by its own key, with no NEAR needed (the relay pays the gas and a refundable bond); the lowest valid revealed price wins, and the winner's key becomes the vendor of an ordinary Accord agreement. Bid with one file: curl -sO https://accordweb-production.up.railway.app/app/tender-bid.mjs, then node tender-bid.mjs bid <job> --price <USDC> --agent <name> --wait. Limit: one party with several keys can still reveal only the price that wins; each unrevealed bid forfeits its bond." },
  { q: "What is not done yet?", a: "Mainnet (it follows an external audit), the four planned agreement types, funding from other chains through NEAR Intents (priced today with dry quotes, not executed), a legal KYB check, and verification with a market maker's own account data." },
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
  { name: "Checkable from public data", text: "make verify checks the contract code, the agent key, the recipient proof and the record with no keys; the release attestation check proves the three job runs with the outlayer-verify tool when it is installed." },
]

/* Payment controls: the home page's #payment-controls (PaymentControls) and the app's /app/controls. All three are
   live in the app today; PAYMENT_CONTROLS_NEXT names the planned ones in one line. */
export const PAYMENT_CONTROLS = [
  { name: "Check a payment", when: "before", status: "live", url: "/app/check", api: "/app/api/check",
    text: "Before signing, see whether a room's contract would pay or refuse a payment, gate by gate. It runs accord-core's own check_pay (the function the contract's act calls) over the agreement's chain state at one block; replayed against 24 recorded payments and refusals, it matched every one. Read-only, no transaction; as JSON at /app/api/check (CORS: any origin)." },
  { name: "Refusal alerts", when: "during", status: "live", url: "/app/settings?tab=alerts", api: null,
    text: "Webhook, Telegram or email the moment the contract refuses your agent, with an incident view and revoke. Webhooks are signed (X-Accord-Signature, HMAC-SHA256 over the timestamp and the body), retried and kept in a delivery log; the incident view shows what was tried beside what was approved, with hold-to-revoke. The alert reports a refusal the contract already made." },
  { name: "Finance exports", when: "after", status: "live", url: "/app/record?scope=org", api: null,
    text: "Every payment matched to your PO or invoice, ready for QuickBooks or Xero: QuickBooks Online (3 or 4 columns), a Xero bank statement, or Accord's CSV with token, recipient, transaction link and evidence hash. References stay private to the organisation, never on chain." },
]
export const PAYMENT_CONTROLS_NEXT = "Next (planned): continuous monitoring, Accord Guard"

/* Built on: the strip under the hero. No partnership is claimed. */
export const BUILT_ON = [
  { name: "NEAR", role: "The agreement contract, its escrowed USDC and the on-chain record of every payment and refusal." },
  { name: "NEAR AI Cloud", role: "Private inference for the negotiating agents; each response's signature is checked in the enclave." },
  { name: "OutLayer", role: "Attested enclaves for the Sealed Table, the recipient binding and the market observer." },
  { name: "USDC on NEAR", role: "Settlement as a NEP-141 token, paid only by the contract from each agreement's own account." },
  { name: "NEAR Intents", role: "Quotes only: what funding an agreement's total from USDC on Base, Ethereum, Arbitrum or Solana costs, from the 1Click API as dry quotes (nothing is signed or sent; accord fund-quote, /app/api/fund-quote/<agreement>). Executing them waits for mainnet." },
  { name: "Rhea", role: "The USDC/wNEAR pool the market-making observer reads at hidden times." },
]

/* /app/try-it, step by step: HowTo data on /docs/quickstart and the "Try it" section of llms.txt. Each step is do X, see Y.
   `n` is the page's own numbering: five steps, the fifth in four parts in your room, Finish, then a check from public data. */
export const TRY_STEPS = [
  { n: "1", name: "Try without a wallet, or connect one", do: "Open /app/try-it and choose \"Try without a wallet\": the page makes a throwaway testnet key in your browser tab (kept in sessionStorage, never sent to the server, gone when the tab closes), and the faucet and the room then run on their own. Or connect a NEAR testnet wallet through HOT Connect (Meteor or Intear send through Accord's relayer, so you pay no gas after opening the room, whose 2 NEAR deposit your wallet pays).", see: "Step 1 marked done with your account; a throwaway key shows its implicit account short, such as 477577…e512, with a copy button, labelled Throwaway testnet key." },
  { n: "2", name: "Get test funds", do: "Get test funds from the faucet: once a day per account, up to 30 accounts per connection a day, within a daily budget. If it refuses, the step offers a 60-second replay (/app/replay), the live attack room (/app/try, pre-funded) and /app/verify instead.", see: "Your balance reads 2.35 NEAR and 100 tUSDC, with both faucet transactions linked." },
  { n: "3", name: "Create the deal room", do: "Create the room, prefilled against Accord's demo vendor halcyon-demo.testnet; your wallet signs create_agreement on the factory accord-v2.testnet with a 2 NEAR deposit, returned when the room closes.", see: "A new agreement account such as a8.accord-v2.testnet, in state Sealed." },
  { n: "4", name: "Seal your limits", do: "Seal the Northwind preset (40 tUSDC ceiling, 2 to 4 items); it is encrypted in your browser to the Sealed Table.", see: "The demo counterparty seals its own mandate and the negotiation runs; the state moves from Sealed to Attested." },
  { n: "5a", name: "Approve, fund and accept", do: "In your room, while the demo counterparty acts (the page's step 5): approve the terms, fund the escrow, accept the recipient and the first delivery.", see: "The recipient halcyon-mm.testnet proven on the vendor's domain, approved by its authority and active once you accept it." },
  { n: "5b", name: "Start the demo agent", do: "Start the demo agent; your wallet signs install_agent_key, one function-call key that can call act and nothing else. Then wait: the agent pays the accepted item on its own, with no click, within about 2 minutes.", see: "The agent bar and the Activity tab read Paid item 1: <amount> tUSDC to halcyon-mm.testnet, with the act transaction (payment_sent)." },
  { n: "5c", name: "Try a redirect", do: "Ask the agent to pay a new account.", see: "ERR_PAYEE_MISMATCH: the contract refused it, recorded the refusal and moved nothing." },
  { n: "5d", name: "Revoke the key", do: "Hold to revoke in the room header.", see: "Agent revoked; its next call is rejected by the network (AccessKeyDoesNotExist)." },
  { n: "6", name: "Finish", do: "With a throwaway key, click Finish: close the room and return the test NEAR (Reset does the same). The room closes early by mutual_close with the demo vendor, withdraw_near returns its deposit, the account's test USDC goes back to the faucet with ft_transfer, and the throwaway account deletes itself with the faucet as beneficiary.", see: "Done. The room is closed and its test NEAR and test USDC are back with the faucet, with the ft_transfer and delete_account transactions linked, then the room's id with a Verify link, kept for the tab after the reset." },
  { n: "After", name: "Check it from public data", do: "Open /verify and enter your agreement account (or open /verify?agreement=<account>).", see: "The verdict of all seven checks, as make verify prints it (for example 6 ok · 1 partial with the outlayer-verify tool installed: model is partial; without the tool release is not checked, 5 ok · 1 partial · 1 not checked), with five quick reads live from testnet in the browser; no account and no keys. /record shows agreement a6's 12 transactions." },
]

/* The seven claims (platform/GOAL.md "Claims and their limits"), shortened; /security shows the full table. */
export const CLAIMS = [
  { claim: "Each company's mandate is readable only inside attested enclaves.", limit: "Under the hardware's trust assumptions (Intel TDX, NVIDIA confidential computing) and OutLayer's keystore governance. The deployer owns the seed and the factory account and could rebind the seed to another build. On testnet the job's seed condition admits any caller during an agreement's open request window, so an outside party could request extra runs then and learn bounds on the limits; restricting the seed to the agreement's own calls is the next step. Prompts reach the model through NEAR AI's attested gateway over TLS; end-to-end encryption to the model is not shipped yet. The browser trusts the code the app serves; the CLI is the alternative." },
  { claim: "The approved terms are the agent's only authority.", limit: "The agent's judgement is bounded, not protected: it can still be fooled into asking. Attestation proves which code produced the terms, not that the deal was good; people decide that when they approve. The buyer can also approve an exception its agent requests, including a lower amount for an item; the vendor is not asked." },
  { claim: "Payments go only to the authorised recipient.", limit: "Authorisation proves control of the domain and the settlement authority's approval, not that the company legally exists. A legal KYB check is a later integration. Testnet agreements run in demo mode: a recipient change waits 120 s and a claim 120 s; live mode enforces at least 24 h for a recipient change and 72 h for a claim, checked by the factory and again by the agreement." },
  { claim: "Revoking ends the agent's authority in one transaction.", limit: "A payment already made stays made. A call that reached the chain before the revoke still runs, with every check. Revoking never cancels what the vendor has earned." },
  { claim: "Negotiation is private; settlement is public.", limit: "The enforced schedule (amounts, dates, recipient) and every payment are public on NEAR, as with any stablecoin payment." },
  { claim: "A market-making agreement's payment becomes eligible only when the agreed observations pass, unless the buyer approves an exception.", limit: "The observer measures the venue's liquidity, not the market maker's own orders. The deployer owns the observer's seed. A slot nobody polls in time counts as unobserved, and an undecided period goes to the buyer, not to payment." },
  { claim: "On an open tender, each price stays sealed until bidding closes and it is revealed, the lowest valid price wins, and the winner's key becomes the vendor of an ordinary Accord agreement.", limit: "One party can bid under several keys and reveal only the price that wins after seeing the others; each unrevealed bid forfeits its 0.02 NEAR bond to the buyer, which puts a price on this but does not prevent it. A bid made in the browser also carries its price timelocked to the drand round after bidding closes, so Accord's keeper can reveal it for a bidder who is away; this relies on drand's threshold network not publishing that round early. The board had an internal adversarial review, not the security review of the agreement contracts. Testnet only." },
]

/* What is not built or not live yet. Said plainly so no reader assumes it. */
export const NOT_DONE = [
  "Mainnet: Accord runs on NEAR testnet only; mainnet follows an external audit.",
  "Market making on testnet ran one period per agreement (a56 paid, a57 withheld and refused, 10 Nov 2026); the hosted keeper does not yet ask the observer on its own (its service has no OutLayer payment key), so the recorded observations came from make market-making.",
  "make demo (the one-command loop) ran on testnet on 10 Nov 2026 in 1:29 from fresh accounts (a65.accord-v2.testnet, release 5, verify 6 ok · 1 partial); the time follows the enclave negotiation (39 s there; an earlier run with a 64 s negotiation took 2:20). On a local node it runs in 14 s (3 Nov 2026).",
  "Verification: make verify reports 7 checks; model is partial (the nonce is bound in the attestation report, the hardware quote is not checked there). release is ok with the outlayer-verify tool installed (6 ok · 1 partial on every recorded agreement, 10 Nov 2026) and not checked without it; release 4 agreements ran release 3's job builds, release 5 agreements run the reviewed ones.",
  "Four agreement types are planned, not built: agent-to-agent services, security remediation, infrastructure service agreements, and grants and funded milestones.",
  "Funding an agreement from other chains through NEAR Intents is priced only: dry 1Click quotes, nothing signed or sent; 1Click has no testnet, so executing a quote waits for mainnet.",
  "A legal KYB check of the vendor is a later integration; Payee proves domain control and the authority's approval only.",
  "Verifying a market maker's own contribution with its authenticated account data is planned.",
  "The SDK, MCP server and CLI are not published to npm; they run from a clone of the repository (https://github.com/Adityaakr/accord), under platform/packages.",
  "Production prices are published before launch; testnet use is free with test funds.",
  "The Sealed Table seed's OutLayer access condition (S1) is not set yet. The reviewed enclave job builds are deployed and release 5 runs them (10 Nov 2026), but the seeds still also admit the earlier job builds so that release 3 and 4 rooms keep working, and the earlier builds do not have the factory-only check.",
]

/* The accounts on NEAR testnet, for agents that want to look them up */
export const ACCOUNTS = [
  { role: "Factory (release 5, the security-review fixes on the reviewed job builds; test USDC)", account: "accord-v2.testnet" },
  { role: "Agreement that ran the full flow on 8 Nov 2026 (release 3)", account: "a6.accord-v2.testnet" },
  { role: "Agreement on release 4: negotiated, funded, paid, redirect refused (9 Nov 2026; make verify DEAL=a10.accord-v2.testnet)", account: "a10.accord-v2.testnet" },
  { role: "Test USDC (tUSDC, NEP-141, 6 decimals)", account: "tusdc.accord-v1.testnet" },
  { role: "Factory settling in Circle USDC (release 5, the security-review fixes on the reviewed job builds)", account: "accord-usdc.testnet" },
  { role: "Circle USDC agreement: funded 14.00, paid 5.00, redirect refused, revoked (9 Nov 2026, release 3; make verify DEAL=a1.accord-usdc.testnet)", account: "a1.accord-usdc.testnet" },
  { role: "Circle USDC on testnet (NEP-141, 6 decimals; faucet.circle.com)", account: "3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af" },
  { role: "Relayer", account: "relay.accord-v2.testnet" },
  { role: "OutLayer", account: "outlayer.testnet" },
  { role: "Demo vendor (Accord's own account)", account: "halcyon-demo.testnet" },
  { role: "Demo vendor's settlement authority", account: "halcyon-auth.testnet" },
  { role: "Demo vendor's authorised recipient", account: "halcyon-mm.testnet" },
]

/* How an agent integrates. Only what exists in platform/packages (https://github.com/Adityaakr/accord/tree/main/platform/packages); none of it is published to npm yet. */
export const FOR_AGENTS = [
  { name: "Source", text: "Clone https://github.com/Adityaakr/accord (MIT) and run pnpm install in platform/. Read-only check of the testnet agreement, no keys: make verify DEAL=a6.accord-v2.testnet (with the outlayer-verify tool installed it prints verify: 6 checks ok · 1 partial, else 5 checks ok · 1 partial · 1 not checked; 7 checks in all); make verify DEAL=a10.accord-v2.testnet shows release 4, and make verify-usdc DEAL=a1.accord-usdc.testnet the Circle USDC deal. The same checks as JSON: GET https://accordweb-production.up.railway.app/app/api/verify/<agreement>. The MCP server, SDK and CLI live in platform/packages; methods, tools and commands are specified in platform/INTERFACES.md." },
  { name: "MCP server (@accord/mcp)", text: "pnpm --filter @accord/mcp dev from platform/ with ACCORD_FACTORY=accord-v2.testnet; stdio by default, or streamable HTTP at /mcp with --http <port>. Read tools need no key: accord_tender_jobs, accord_tender_job, accord_list_agreements, accord_get_agreement, accord_due_items, accord_preflight, accord_refusals, accord_receipts, accord_verify. accord_pay and accord_request_exception need the agent's function-call key (ACCORD_AGENT_KEY with AGENT_AGREEMENT); accord_pay runs preflight first and the contract checks again. Principal tools (accord_seal_mandate, accord_approve_terms, accord_submit_delivery, accord_propose_recipient) are off unless ACCORD_PRINCIPAL_KEY and ACCORD_PRINCIPAL_ACCOUNT are set; a key is never a tool argument." },
  { name: "Check a payment", text: "Before signing, see whether an agreement's contract would pay or refuse a payment, with each gate: https://accordweb-production.up.railway.app/app/check, or JSON at /app/api/check?agreement=<id>&item=<n>&amount=<base units, or a decimal for whole tokens>&recipient=<account> (CORS *, GET only). A read-only simulation of accord-core check_pay from chain state at one block; no transaction; the contract decides at the time of the real call." },
  { name: "Hosted MCP (no clone)", text: "A keyless, read-only MCP server over streamable HTTP at https://accordweb-production.up.railway.app/app/mcp with the 9 read tools (two read the open tender board), 60 requests a minute per IP, any origin (CORS *); described at https://accordweb-production.up.railway.app/.well-known/mcp.json. Client config: { \"mcpServers\": { \"accord\": { \"type\": \"http\", \"url\": \"https://accordweb-production.up.railway.app/app/mcp\" } } }. The verify API (/app/api/verify/<agreement>) and the record CSV (/app/record.csv) answer any origin (CORS *, GET only) from the same deploy. The packages are not published to npm." },
  { name: "SDK (@accord/sdk)", text: "TypeScript on near-api-js: agreements, sealing a mandate, the agent's act, preflight and verify." },
  { name: "Preflight on testnet", text: "accord_preflight and the SDK's preflight() return three signals as unavailable on testnet: age_days and tx_30d (no keyless indexer gives an account's age or transaction count) and code_changed_30d (it needs an archival RPC, NEAR_ARCHIVAL_RPC_URL, not set by default). The rating uses the RPC account read (exists, is a contract), the agreement (authorised recipient, canaries) and the factory's reports, blocklist and recipient stats instead." },
  { name: "CLI (accord)", text: "Every step of an agreement from a terminal (create, seal, negotiate, approve, fund, recipient, deliver, pay, agent revoke, verify and more); read-only commands (show, refusals, receipts, check, verify, watch) need no key. Run it with pnpm --filter @accord/cli dev -- <command>; make verify DEAL=<account> checks any agreement from public data." },
  { name: "Without code", text: "Read /llms.txt, /facts.json, or any page as Markdown (add .md to its path, or send Accept: text/markdown). /verify?agreement=<account> checks an agreement in the browser; testnet.nearblocks.io shows every transaction." },
]

/* The hosted MCP server, served as /.well-known/mcp.json by the pre-render and named in llms.txt. The tools are the nine
   read tools of a keyless @accord/mcp (platform/packages/mcp/src/tools.ts); none signs and none takes a key. */
export const MCP_CARD = {
  name: "accord",
  title: "Accord",
  description: "Keyless, read-only Accord MCP server on NEAR testnet: list agreements, read one agreement's terms, items, refusals and payments, check a recipient before paying, run the seven-check verify verdict, and read the open tender board's jobs and sealed bids. No tool signs; any origin; 60 requests a minute per IP.",
  url: "https://accordweb-production.up.railway.app/app/mcp",
  transport: "streamable-http",
  authentication: "none",
  network: "near-testnet",
  repository: REPO,
  documentation: "https://github.com/Adityaakr/accord#use-from-an-agent",
  tools: [
    { name: "accord_tender_jobs", description: "Open tenders on the board, newest first: budget (with its token's decimals), phase, sealed or revealed bids, winner and linked agreement." },
    { name: "accord_tender_job", description: "One tender job with its bids; prices stay null until each bidder reveals." },
    { name: "accord_list_agreements", description: "List agreements on the factories, or those of one party; paginated with limit (default 25, at most 100) and offset." },
    { name: "accord_get_agreement", description: "One agreement: state, parties, terms, items with status, recipient, agent key, budget and token unit." },
    { name: "accord_due_items", description: "Items eligible for payment now, with amount and the current recipient." },
    { name: "accord_preflight", description: "Check a recipient before paying: allow, warn or block with reasons." },
    { name: "accord_refusals", description: "The agreement's refusal log: code, item, amount, recipient, signer and block." },
    { name: "accord_receipts", description: "Payments the agreement made: item, amount, recipient, via and block." },
    { name: "accord_verify", description: "What anyone can check without a key: code, keys, sealed outcome, release, model attestation, payee and record." },
  ],
}
