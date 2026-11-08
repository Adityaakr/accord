# Accord platform: the product plan

8 November 2026. One product, Accord. This turns the working local-node app into the platform a funded company would ship:
who signs in and how, what they see, every journey, and exactly what is needed to run it end to end on NEAR testnet.
Grounded in this repo (file:line), live NEAR docs and npm (checked 8 Nov 2026), and the marketing site's design system.

## 1. Recommendation

Keep the app (Next.js, `@hot-labs/near-connect`, the SDK, the contracts) and add the layer a business needs on top of it:
**one sign-in with the person's own NEAR wallet, an organisation with members and roles, a "Needs you" home, and
deal rooms that guide each party through their next step.** Wallets connect through **HOT Connect**, already wired in.
Sign-in is external NEAR wallets only (9 Nov 2026; email sign-in through NEAR Auth was built on 8 Nov and removed).
Every money action is signed by the person, in their own wallet, never by Accord's servers. Organisations live off chain in v1 (one signer per role, as the
contract requires today); production adds a Sputnik DAO or multisig per company plus a contract-level **guardian** that can
only revoke the agent, so the kill switch stays one click.

## 2. Why

- **The contract already fixes who can do what.** One `buyer`, `vendor` and `vendor_authority` per agreement
  (contracts/agreement/src/lib.rs:309-311); only the buyer funds, installs or revokes the agent key, accepts recipients and
  approves exceptions (evidence.rs:20, payments.rs:31-68, recipients.rs:106, evidence.rs:142). The platform decides which
  person stands behind each account; it can never loosen the rules.
- **NEAR's own recommendation is HOT Connect.** `@hot-labs/near-connect` v0.12.0 (26 Oct 2026) is in NEAR's login docs;
  Wallet Selector is in maintenance (its README points to HOT Connect); MyNearWallet shut down on 31 Oct 2026.
  The app is on v0.11.4 (app/package.json): a minor upgrade.
- **Accord must not become a custodian.** If an email reset can sign, email takeover is control of the money, and
  Accord holding a signing share undermines the non-custodial position (FinCEN 2019 CVC guidance; not legal advice).
  The person's own wallet keeps every key outside Accord.
- **The data for a real home already exists.** `agreements_for(account)` (contracts/factory/src/lib.rs:628) and
  `listAgreements({party})` (packages/sdk/src/accord.ts:61) are unused; the home lists every room on the factory
  (app/src/app/page.tsx:10, server/data.ts:17).

## 3. Email sign-in: considered and removed

Email sign-in (NEAR Auth MPC accounts, and Privy before it) was weighed on 8 Nov and NEAR Auth was built. On 9 Nov 2026
sign-in became external NEAR wallets only: an email account could not seal a mandate (its signatures are public), the
shared testnet client only returned to `localhost:3000`, and one way in keeps every signing path in the person's wallet.

## 4. Who uses it

| Role | Does | Signs on chain |
|---|---|---|
| Org admin | Workspace, members, agents | No |
| Negotiator | Seals the mandate, watches negotiation | `commit_mandate` |
| Approver | Approves terms | `approve_terms` |
| Treasurer | Funds escrow, accepts recipient and deliveries, decides exceptions | `ft_transfer_call`, `accept_recipient`, `accept_delivery`, `approve_exception` |
| Guardian | Revokes the agent, one click | `revoke_agent` |
| Operator | Runs rooms day to day; cannot move money | No |
| Vendor | Seals its floor, approves, delivers, claims | `commit_mandate`, `approve_terms`, `submit_delivery`, `claim` |
| Settlement authority | Approves the vendor's recipient (must differ from the vendor; recipients.rs:90) | `approve_recipient` |
| Reviewer | Accepts a milestone (security fixes, grants; planned) | Planned |
| The agent | Calls `act()` and nothing else | Function-call key |
| Auditor | Reads and verifies; no account | None |

v1 (testnet): roles are off chain and only shape the interface; the on-chain signer is the control. Production: Sputnik DAO
or multisig per company (`sputnikv2.testnet`, live), guardian role added to the contract.

## 5. The journeys

**Buyer, first time**
1. **useaccord.tech/app → Sign in.** One card: "Connect a NEAR wallet" (HOT Connect: Meteor, Intear, Ledger, Nightly,
   WalletConnect on testnet). Meteor and Intear send through Accord's relayer, so there is no gas.
2. **Create the organisation.** Name, domain, verify the domain (DNS TXT, the same proof Payee uses), invite finance and an
   operator by email. Each invitee signs in the same way.
3. **Connect an agent.** Your agent through the MCP server (packages/mcp, 14 tools) or the CLI. The screen shows the exact
   scope before anything is created: "This key can call `act()` on this agreement and nothing else." The key is generated
   where the agent runs; Accord stores only the public key.
4. **New deal room.** Pick a type (market making, vendor contracts live; four marked Planned), write the brief in plain
   language, name the counterparty by domain. Accord creates the agreement (the 7 NEAR deposit is shown and explained
   before signing).
5. **Invite the counterparty.** A link bound to the agreement account and the inviter's verified domain.
6. **Seal.** The mandate editor (free-form, not presets), sealed in the browser (exists: agreements/[id]/seal). Signature
   moment: the numbers resolve into a commitment hash and the field locks.
7. **Negotiation, live.** Two masked columns, proposals passing through the Sealed Table band, each turn ticked against both
   limits without showing them. Terms resolve into one card with the attestation link.
8. **Approve.** Approver signs `approve_terms` after reading the terms back from chain.
9. **Recipient.** Three steps with state: vendor's domain proof, its authority's approval, your acceptance.
10. **Fund.** USDC into the agreement's own account; the amount read back from chain; step-up confirmation. Funding from
    other chains via NEAR Intents is mainnet-only (no testnet exists) and comes later.
11. **Run.** Periods or invoices, evidence slots, next eligible payment, every `act()` call and refusal as it happens.
12. **Exceptions.** Held amounts wait in Approvals; the treasurer decides.
13. **Settle and verify.** Payments with transaction links; one-click export with its `make verify` command.

**Vendor, by invitation**: opens the link without an account and sees the brief and the buyer's verified domain → signs in →
seals its floor → watches the same negotiation from its side → approves → runs Payee (DNS or file proof, authority signs) →
gets its room with "your next payment becomes eligible when…" and a Claim button after the claim delay.

## 6. Information architecture

Left navigation, in this order:

- **Home**: "Needs you" first, then the numbers (section 7).
- **Deal rooms**: table of name, type, counterparty, step (the seven-dot pipeline), escrowed, paid, next eligible, flags.
  Room detail: header with the pipeline, the agent's status and a Revoke control always in view; tabs **Terms ·
  Negotiation · Recipient · Funds · Evidence · Activity · Verify**.
- **Approvals**: one inbox for terms to approve, recipients to accept, deliveries, exceptions. J/K to move, A to approve.
- **Agents**: every key, its scope, its rooms, last call, refusals, Revoke.
- **Recipients**: bound payees across rooms; pending changes with their 24-hour timer.
- **Record**: the organisation's ledger; CSV.
- **Settings**: Organisation (domain proof) · Members and roles (the matrix in section 4) · Wallets and keys · Notifications
  (email, Slack, webhook on refusal, hold, approval needed, recipient change) · Developers (MCP endpoint, API keys) · Billing.
- **Profile** (from the avatar): name, sign-in methods, the NEAR account, active sessions, passkeys.

## 7. Home

1. **Needs you** (full width): "2 invoices held · 1 recipient to accept · 1 set of terms to approve"; each row opens the
   decision.
2. **Escrowed**: USDC held across rooms.
3. **Paid this month**: with "every payment matched its terms".
4. **Refused**: count and top code (`ERR_PAYEE_MISMATCH ×3`), the module that proves the product.
5. **Next eligible**: the next payment and the evidence still missing.
6. **Agents**: active, revoked, last call.

Empty states teach: one ghost room card with the seven steps; "No refusals. Every payment matched its terms."; "Connect an
agent. It will be able to call `act()` and nothing else."

## 8. Design and motion (from the website)

Dark tokens, teal accent, Host Grotesk, JetBrains Mono for values, red only for refusals and revocation. Working screens are
flat and dense on elevation tokens; the teal stage and floating card appear only at the four signature moments: **the seal**
(about 600 ms, once), **the live negotiation**, **the refusal** (slides in with its code and "nothing sent"; no shake, no
modal) and **revoke** (hold to confirm; "next call rejected by the network"). Motion follows the site: eased, no bounce, blur
crossfades for state changes. Every number links to its proof. ⌘K command bar. No gradient KPI cards, donut charts, chat
bubble, token logos, gas or seed phrases in the main flow.

## 9. Security rules for the platform layer

Never on Accord's servers: a principal key (buyer, vendor, authority), the document-key seed or its NEP-413 signature,
mandate plaintext, an agent's private key, or any key able to approve, accept, fund or decide an exception. Sessions view and
draft, never sign. Before every signature, read the amount and recipient back from chain. Alert every member on
`recipient_proposed`. Invitations bound to the agreement account and a verified domain. Before mainnet: owner behind a
multisig with a timelock, `demo_allowed=false`, factory full-access key deleted, guardian role, sanctions screening and KYB,
external audit, legal opinion on money transmission (not legal advice; verify with counsel).

## 10. Build order

1. **Testnet live** (unblocks everything): accounts, release, USDC, NEAR AI, OutLayer, Railway (section 11).
2. **Sign-in**: HOT Connect 0.12 (wallets only); profile; network from config, not hard-coded (WalletProvider.tsx:127).
3. **Home and Deal rooms for "my" rooms**: `agreements_for`; Needs you; room tabs.
4. **Organisation**: domain proof, members, roles, invitations, notifications (Postgres in packages/store).
5. **Signature moments and the negotiation view**.
6. **Approvals inbox, Agents, Recipients, Record per organisation; ⌘K**.
7. **Production**: DAO or multisig companies, guardian role, deliveries as real uploads, the planned agreement types,
   NEAR Intents funding on mainnet.

## 11. What is needed from Aditya

From BLOCKED.md, plus the new platform:

| # | What | Why |
|---|---|---|
| 1 | Yes to creating the testnet accounts and keys (`make setup`; keys stay in the gitignored `.env`, never printed) | Deployer, buyer, vendor, authority, keeper, demo accounts |
| 2 | About 90 testnet NEAR: ~60 in `accord-v1.testnet` for the global release, ~12 factory, ~15 buyer | The faucet rate-limits; release 1 (PROGRESS 2.7) |
| 3 | Testnet USDC: Circle faucet (check NEAR is listed) or near-faucet.io, ~70 to the buyer and one drip to the /try buyer | Funding escrow |
| 4 | NEAR AI Cloud credits or a spending limit at cloud.near.ai (completions return HTTP 402 today); rotate the key | Live negotiation |
| 5 | OutLayer: install `outlayer-cli`, `outlayer login testnet` as `accord-v1.testnet` | Enclave jobs: Sealed Table, Payee proof, observer |
| 6 | (none: email sign-in was removed on 9 Nov 2026) | |
| 7 | Railway: app, agent, keeper and Postgres services with variables; the app's public host | Running it for others |
| 8 | A domain (e.g. accord.app or accord.xyz) with DNS access | App URL, verified-domain demo, email |
| 9 | A sending email (Resend or Postmark) and a contact address | Invitations and notifications |
| 10 | Mainnet only, later: NEAR Intents partner JWT (optional), audit, counsel | Production |

## Telemetry
- divergence: 0.81 (evidence 0.93, conclusion 0.63) | threshold 0.30 UNCALIBRATED
- grounding: n/a (no eval fixtures)
- models: lenses=opus (code map, wallet research, product design, security and regulatory)
- claims: contract roles grounded (lib.rs, payments.rs, recipients.rs, evidence.rs) · near-connect 0.12.0 grounded (npm) ·
  NEAR Auth MPC supported (auth.near.org) · Intents no testnet supported (docs.near-intents.org) · security.md errors
  grounded and fixed on the site (website commit 8dbe850)
- fleet: 4 lenses, one round
