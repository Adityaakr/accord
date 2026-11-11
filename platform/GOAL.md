# GOAL.md: Accord, end to end (v7, 31 Oct 2026)

v7 replaces the Base-rail kit (v4 to v6). Settlement is NEAR-native: each agreement is its own NEAR account holding USDC (NEP-141), and the buyer's agent holds one function-call key on that account. The "Claims and their limits" table below is the source of truth for every sentence in the README, the app, `docs/build/DEMO.md`, `docs/build/SUBMISSION.md` and the website copy. Nothing anywhere may be stronger than it. `ARCHITECTURE.md` explains how it works; `INTERFACES.md` defines every method, type, event, error, job schema, SDK call, MCP tool, CLI command and printed line; `docs/build/PROGRESS.md` is the order of work.

## The goal

Ship Accord as a working, reproducible product on NEAR testnet and submit it before 14 Nov 2026 23:59 UTC in the tracks `security` (lead), `privacy`, `agents` and `business`, plus any track in `docs/build/SUBMISSION.md` whose lever passes. Adi's standing aim is the grand prize and track prizes, and a product that keeps going after the hackathon. Judges cannot run what they cannot reproduce, and Claude Code and Codex screen every entry first (HACKATHON.md Q-017), so reproducibility is part of the product.

Positioning, fixed:

- Headline: "The private deal room and control plane for agent-to-agent commerce." Thesis line: "Agreements negotiated in private, enforced in public." Short form for the footer and the video's last frame: "Negotiated in private. Enforced in public."
- Four parts, named identically in the app, the README, the repository tree and the site: Sealed Table (`jobs/sealed-table`), Agreement controls (`contracts/agreement`), Payee (`jobs/payee` plus the recipient methods), Evidence checks (delivery acceptance, and for market making `jobs/observer`).
- Accord is one product. Market making is one of six agreement types and the featured one (8 Nov 2026: the earlier sub-brand name for it is retired; write "market-making agreements", and keep `market-making` as the agreement type in code). Passing observations make a payment eligible; the payment still goes through the recipient and authorisation checks.
- The interface calls an agreement a deal room; code, docs and events say agreement.

## What v7 changes and why

| Change | Why |
| --- | --- |
| USDC on NEAR, held by the agreement's own account, paid by `ft_transfer` from that account | One chain, one transaction tree: the check and the payment happen in the same transaction, so there is no signed transfer waiting anywhere and no reporter to trust. Matches the live site |
| Each agreement is a sub-account created by the factory, with its code pinned by hash and no full-access key | The agent's key can touch one agreement and nothing else; the code holding the funds cannot change during the agreement; anyone can check both on the explorer |
| The third proof is `make revoke` instead of `make inflight` | With NEAR settlement the in-flight risk moves into the contract (one lock across the token callback); what judges need to see is the key deleted, the network rejecting the agent, and only the buyer able to resume |
| Job outputs are signed by a key derived from a seed only that job's build can read, and the contract checks the signature | OutLayer's worker contract holds full-access keys, so a callback alone is not proof a TEE produced a result. OutLayer's own signing keys differ per caller, so they cannot be a release key |
| Jobs read everything from the agreement's state over pinned endpoints, never from their caller | Anyone can call an OutLayer job; reading state means a caller cannot feed a job chosen data, and two callers get the same answer |
| The mandate key comes from a seed generated inside the enclave (`PROTECTED_` secret), readable only by runs an agreement requests and by the runs that publish its public key | Neither the app nor anyone running the job directly can decrypt a mandate. The deployer, who owns the secret, could rebind it to another build; that is stated as a limit |
| Market-making slot times come from the observer's own seed, and each sample is the first mainnet block after its time | Nobody knows a slot time in advance, every caller gets the identical observation, and the keeper holds no secret |
| Every selected track's prompt requirements are acceptance criteria | The organisers' prompts say: swap the idea, keep the requirements and the checkpoint |
| An SDK, an MCP server and a CLI | Any agent can use an agreement; the screeners can drive it |

## Claims and their limits

Every public statement about Accord is one of these seven, stated with its limit. The README carries this table verbatim, and `/security` on the site shows it byte for byte.

| We claim | Because | Limit, stated next to it |
| --- | --- | --- |
| Each company's mandate is readable only inside attested enclaves | The browser encrypts the mandate to a key derived from a seed generated inside the Sealed Table's enclave, bound to its release build and readable only by runs an agreement requests or that publish the key's public half; the chain holds the ciphertext and a commitment hash; the two negotiators run on NEAR AI Cloud models in TEEs, and the gateway's and the model's attestations are verified with a fresh nonce | Under the hardware's trust assumptions (Intel TDX, NVIDIA confidential computing) and OutLayer's keystore governance. The deployer owns the seed and the factory account, and could rebind the seed to another build or request extra runs. On testnet the job's seed condition admits any caller during an agreement's open request window, so an outside party could request extra runs then and learn bounds on the limits; restricting the seed to the agreement's own calls is the next step. Prompts reach the model through NEAR AI's attested gateway over TLS (TLS binding is not checked from inside the job); end-to-end encryption to the model is not shipped yet. The browser trusts the code the app serves; the CLI is the alternative. The ciphertext stays on chain. The final terms reveal that each side accepted them, as any signed deal does. A negotiator can concede in words; code checks the numbers |
| The approved terms are the agent's only authority | The agent's only key is a function-call key on the agreement's own account that can call `act` and nothing else; `act` refuses any payment whose item, evidence, amount or recipient differs from the terms both companies approved | The agent's judgement is bounded, not protected: it can still be fooled into asking. Attestation proves which code produced the terms, not that the deal was good; people decide that when they approve. The buyer can also approve an exception its agent requests, including a lower amount for an item; the vendor is not asked |
| Payments go only to the authorised recipient | The recipient is a NEAR account listed in a file on the vendor's domain, fetched inside an enclave; the vendor's settlement authority approves it on chain and the buyer accepts it; a change needs all three again and a 24-hour delay | Authorisation proves control of the domain and the authority's approval, not that the company legally exists. A legal KYB check is a later integration. Testnet agreements run in demo mode: a recipient change waits 120 s and a claim 120 s; live mode enforces at least 24 h for a recipient change and 72 h for a claim, checked by the factory and again by the agreement |
| Revoking ends the agent's authority in one transaction | `revoke_agent` marks the agent's key revoked, so the contract refuses it from that receipt on, and deletes it from the agreement account in the same transaction; the account has no other key, so after the deletion lands (about one block) anything the agent signs is rejected by the network before it reaches the contract | A payment already made stays made, and it went to the authorised recipient at the approved amount. A call that reached the chain before the revoke still runs, with every check. Revoking never cancels what the vendor has earned: an eligible payment stays claimable by the vendor, unless the buyer approves an exception that lowers it |
| Negotiation is private; settlement is public | Mandates and the transcript stay inside enclaves; only the terms, commitment hashes, a transcript hash and attestation references leave; the commercial terms document is encrypted to the two parties | The enforced schedule (amounts, dates, recipient) and every payment are public on NEAR, as with any stablecoin payment |
| A market-making agreement's payment becomes eligible only when the agreed observations pass, unless the buyer approves an exception | Each slot's time is drawn inside the observer's enclave from a seed generated there; the observation is taken at the first NEAR mainnet block after that time, signed by the observer's key, and checked by the contract against the agreed spread, depth and two-sided quoting; anyone can recompute it from an archival node | A market-making agreement's observer measures the venue's liquidity, not the market maker's own orders. The deployer owns the observer's seed and could rebind it to a build that reveals slot times in advance. A slot nobody polls in time counts as unobserved, and a period that unobserved slots leave undecided, or that has conflicting observations, goes to the buyer, not to payment |
| On an open tender, each price stays sealed until its bidder reveals it, the lowest valid price wins, and the winner's key becomes the vendor of an ordinary Accord agreement | The tender board stores only a sha256 commitment of each price, and accepts a bid only with the bidder's own ed25519 signature, checked on chain; a reveal must open that commitment; the award is computed on chain by a rule anyone can call; the buyer's link to the agreement is stored only if the factory confirms a procurement agreement with that buyer and the winner's key as vendor | One party can bid under several keys and reveal only the price that wins after seeing the others; each unrevealed bid forfeits its 0.02 NEAR bond to the buyer, which puts a price on this but does not prevent it, and anyone can fill a job's 32 slots for 32 bonds. The board (`tender-v2.accord-v2.testnet`, no access key) had an internal adversarial review, not the security review of the agreement contracts. The winning bid sets the vendor's sealed floor; the terms are still negotiated in the Sealed Table and approved by both companies. The link checks buyer, vendor and kind, not that the agreement's total or token match the winning bid. Testnet only |

Withdrawn and never written, in any wording, in any file: "keys die on NEAR and Base by the next block"; "confidential settlement", "private payments", "amounts are not on the public ledger"; "payee verified as a real business", "verified business", "KYB" as something Accord does; "neither mandate leaks", "nothing leaks", "randomised concessions prevent leakage"; "two-sided sealed negotiation has never shipped" (prototypes exist); "policy wallets answer how much, not whom" (custody products have allowlists); "the agent cannot be tricked", "unhackable", "impossible to steal"; "proves the market maker earned it", "Did your market maker earn this payment?"; "revoked everywhere", "keys die everywhere"; "first" or "only" as a claim about Accord.

### Words never written

"agreement layer", "hand your agent a budget", "the deal is the account", "the slow middle", "neutral ground" as a headline, "negotiated blind", "executable agreements" and "smart legal contracts" (the Accord Project's category since 2017), "Glassbook", and the trust words: secure, trustless, bank-grade, military-grade, AI-powered, seamless, revolutionary, and autonomous as an adjective for the product. No judge names or portraits, no competitor dismissals.

## The build, decided

- Platform: one factory contract, one agreement contract (one code hash per release, used by every agreement account), three OutLayer jobs (Sealed Table, Payee, observer), a keeper, a demo buyer agent, `@accord/sdk`, `@accord/mcp`, the `accord` CLI and the deal-room app. Pure decision logic lives in `crates/accord-core` (no `near-sdk` dependency) so it can be property-tested; the contract is a thin shell around it.
- Two agreement types, in this order: `procurement` (milestones released on accepted delivery; the reference type, built first because everything needs it) and `market-making` (retainer periods released when enough observation slots pass).
- Settlement: USDC on NEAR testnet, Circle's contract `3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af` (confirmed by check 0.6). The reproducible path for judges can use `tUSDC`, a 6-decimal NEP-141 test token the setup deploys, labelled as such everywhere it appears.
- Negotiation protocol: the vendor's negotiator quotes; the buyer's negotiator accepts or counters once with its reasons; the vendor accepts or makes a final offer; the buyer accepts or walks away. Code checks every proposal against both mandates, and the accepted terms once more. Each negotiator is a NEAR AI Cloud completion built from its own mandate and the other side's `shared` part only. Agents bring mandates, not conversations: no agent ever talks to the other side directly.
- Humans set the constraints: each company writes its mandate, both approve the terms, the buyer accepts the recipient and approves exceptions, and `revoke_agent` is the kill switch.
- The live testnet demo leads with procurement: agreement `a6.accord-v2.testnet` ran the full flow on release 3 (8 Nov 2026). Market making ran end to end on testnet on 10 Nov 2026, release 5: `a56.accord-v2.testnet` observed period 1 `6 of 6` on Rhea's USDC/wNEAR pool on NEAR mainnet, closed `Eligible` and the agent was paid `6.00 tUSDC`; `a57.accord-v2.testnet`'s stricter period 1 passed `0 of 6`, closed `Withheld`, and the agent's payment was refused `ERR_PERIOD_WITHHELD` (`docs/runs.md`). It runs end to end on a local node as well. Both types ship.
- Market-making v1 limits, said wherever market making appears: venue-level liquidity, not the market maker's own orders; retainer-only engagements (no loan-plus-option structures); one venue per agreement; slots are minutes in the demo and hours in production, set in the terms.

## Definition of done

Every line passes on a fresh clone by a reader who has never spoken to us. "Prints" means the literal lines in `INTERFACES.md` section 10, with real values.

| Check | Passes when |
| --- | --- |
| `make setup-check` | Prints each pinned tool with its version and `ok`; fails with the install command for anything missing |
| `make test` | `cargo test` (core unit and property tests, contract unit tests, sandbox integration tests), job tests against fixtures, `pnpm test` (SDK, MCP, CLI, app), all green |
| `make sandbox` | Runs the full procurement flow and one market-making period on a local NEAR sandbox with the three jobs replaced by the `mock` signer, every mocked line marked `[mock]`; ends with `sandbox: all checks passed` |
| `make check-deploy` | The release wasm has no `mock` symbols, its sha256 equals the factory's current release hash, and each live agreement account's `code_hash` equals its pinned release |
| `make negotiate` | Prints the negotiate block: both commitments, the OutLayer request, `gateway and model attestation ok`, `limits pass`, the terms hash, `signature ok on chain`, and the sanity check `ERR_SEALED` both ways |
| `make approve` · `make fund` · `make payee` | Both approvals and `state Executing`; the escrow funded; the recipient proven, approved, accepted and active, with its rating (`allow`) |
| `make pay` | The agent pays milestone 1 after the vendor's delivery is accepted: `payment_sent` with the amount, the recipient and the transaction link |
| `make attack` | Prints, in order: `ERR_PAYEE_MISMATCH`, `ERR_AMOUNT_MISMATCH`, `ERR_CANARY` with `revoked and deleted` (waited for finality), `AccessKeyDoesNotExist` for the next call, and `0 USDC moved by attempts` |
| `make revoke` | Prints the key before, the revoke transaction with its `DeleteKey` receipt, the rejected call after (`AccessKeyDoesNotExist`, waited for finality so the line is deterministic), the buyer's `AddKey` with a new allowance, and a payment succeeding with the new key. The sandbox suite separately proves `ERR_REVOKED` for a call landing between the two receipts |
| `make claim` | With the agent revoked, the vendor claims an eligible milestone after the claim delay and is paid to the authorised recipient |
| `make exception` | The agent requests a changed amount; it stays pending; the buyer approves; the payment goes out at the approved exception amount, to the same recipient. A second run shows the vendor's exception for a `Withheld` period with `waive_evidence`, approved by the buyer and paid |
| `make payee-change` | A recipient change: proof, authority approval, buyer acceptance, `active_at` 24 hours later (the demo timelock is printed when shorter), a payment to the old recipient still allowed until then and refused to the new one before then |
| `make market-making` | One market-making period: the observations with their mainnet blocks and signatures, `<k> of 6 passed · threshold 4 · uptime <u>% · Eligible` with `k ≥ 4`, the agent's payment; then the stricter agreement's period `Withheld`; the scope line |
| `make verify DEAL=<account>` | Needs no keys. Checks the code hash, the key list (one `FunctionCall` key or none, no full access), the Sealed Table signature and its attested key, the NEAR AI attestation with a fresh nonce, the commitments, the recipient chain, and the payment and refusal events; prints `verify: <n> checks ok` |
| `make demo` | From nothing: faucet accounts, a new agreement, negotiation, approvals, funding, recipient, delivery, payment, one refused attack; prints the elapsed time, under `2:00` |
| `make inbox` | The `redirect`, `amount` and `question` fixtures through the `/try` form: two refusals and one `no action`; the attempt counter increments; `paid outside the terms: 0` |
| `make release-check` | The checks in `docs/build/SUBMISSION.md` "Release check" pass |
| README | Follows "README requirements" below; every "see" line matches real output; the claims table, the custody table, the privacy boundary and the "What the agent's key can and cannot do" section are present; `LICENSE` (MIT) present |
| Hosted demo | The app is deployed with one agreement in each state and one live market-making agreement; `/status` green; up through 25 Nov |
| Video | Follows `docs/build/DEMO.md`; posted by Adi on X with "built at NEAR HACKATHON", @NEARProtocol and #NEARHackathon |
| Repository | Public by 14 Nov 23:59 UTC with `main` as the default branch; the build kit moved to `docs/build/` and a short evaluator `CLAUDE.md` and `AGENTS.md` at the root (PROGRESS 7.3); tag `hackathon-submission` on the submitted commit |
| Submission | `201` from the API after Adi confirms the printed payload |

### Where this stands (10 Nov 2026)

Not met yet, said plainly:

- `make demo` on testnet: not run (`docs/build/PROGRESS.md` 5.2 is blocked on funds). It runs on a local node, 14 s on 3 Nov 2026. On testnet the same flow ran as `make negotiate`, `make finish`, `make attack` and `make revoke` (`DECISIONS.md` 26) and through `/app/try-it` (`docs/runs.md`).
- Hosted demo: the app is live with `/status`. Market making on testnet is done (`make market-making`, `a56` and `a57.accord-v2.testnet`, 10 Nov 2026, period 1 of each, `docs/runs.md`), but the deployed keeper does not observe market-making rooms on its own until `OUTLAYER_PAYMENT_KEY` is set on its Railway service (`docs/build/BLOCKED.md` 3.7); the run's observations were asked by `make market-making`.
- `make verify`: with `outlayer-verify` installed it prints `verify: 6 checks ok · 1 partial` on every recorded agreement (10 Nov 2026: `a6`, `a10`, `a21`, `a48`, `a56`, `a57`, `a1` and `a2` of `accord-usdc.testnet`), not all checks ok. `release` is ok: `outlayer-verify` (commit `90c27d9d`) proves the TDX quote, approved measurement and binding of the three job keys' pubkey runs for release 3 and 4 agreements (`DECISIONS.md` 32); without the tool it is `not checked` (`5 checks ok · 1 partial · 1 not checked`). `model` is still partial (the hardware quote is not checked there). The remaining limits stand: S1 is not set (the seed admits any caller during an open request window), and the seeds still also admit release 3's job builds so that release 3 and 4 rooms keep working (release 5, current since 10 Nov 2026, runs the reviewed builds, `DECISIONS.md` 33).
- `make release-check`, the video, the public repository and the submission: not done yet (`docs/build/PROGRESS.md` 7.4, 7.5, 8).
- README: the claims table, "What the agent's key can and cannot do" and "What we keep" are in the root `README.md`; the custody table and the privacy boundary are in `platform/README.md`, linked from it.

## Track requirements

The organisers' prompts say to keep the requirements and the checkpoint. Each one is met by a feature and shown by a step the README numbers.

| Track | Requirement in the prompt | How Accord meets it | Shown by |
| --- | --- | --- | --- |
| `security` | Agent signs with a function-call key scoped to one contract, never a full-access key; README explains its limits | The agent's only key is on the agreement account, receiver the same account, method `act`, zero deposit, gas from a fixed allowance | README section "What the agent's key can and cannot do"; `make verify` key list |
| `security` | An attack demo: a prompt-injected agent tries to pay a known-bad address and is stopped; show the log | `make attack` and `/try`; the refusal log is on chain | `make attack` output; `/agreements/<id>` refusal log |
| `security` | A wrapper that refuses to sign on block and asks a human on warn; signals: account age and activity, contract or not and recent code changes, prior interactions, a shared blocklist with evidence | `preflight()` in the SDK and MCP server returns `allow`, `warn` or `block` with reasons; `warn` waits for the buyer's approval in the app ("Agent approvals"); the Payee job computes the same signals before a recipient can be accepted; refused recipients are reported to the factory with the refusal as evidence | `accord check <account>`; the recipient panel; the approvals panel; `make attack` prints the preflight line before the contract's refusal |
| `security` | Checkpoint: list the data sources per signal | `ARCHITECTURE.md` section 7.3 | Linked from the README |
| `privacy` | NEAR AI Cloud through `https://cloud-api.near.ai/v1`, a TEE model from the models endpoint | The negotiators use a NEAR-fleet TEE model by its canonical id with `x-no-aliasing: true` | `make probe-ai`; `DECISIONS.md` |
| `privacy` | Attestation report fetched with a fresh random nonce and verified as the docs describe; a "Verified" panel listing what was checked | The gateway's and the model's attestations, verified inside the Sealed Table per run, and live in the app's Verified panel (nonce from the browser) and `make verify` | The Verified panel on every deal room and on `/verify` |
| `privacy` | Keep nothing server-side after a response returns; say so and make it obvious in code | The app never sees a mandate in plaintext; the API has no write path for mandates; the job holds plaintext only in memory during the run | README "What we keep"; `app/src/server/README.md` and a test that fails if a mandate field reaches a server route |
| `privacy` | Fictional sample documents | `fixtures/companies/` (Northwind, Halcyon) with sample mandates | `make demo` uses them |
| `privacy` | Checkpoint: one completion plus attestation verified, before any UI | `make probe-ai` (PROGRESS 0.2) | Its printed lines in `DECISIONS.md` |
| `agents` | Negotiation: counter once with reasoning, then accept or walk away | The Sealed Table protocol (quote, counter with reasons, final, accept or walk away) | `make negotiate`; the terms show `rounds: 4` or fewer |
| `agents` | Payments in USDC or NEAR | USDC (NEP-141) | `make pay` |
| `agents` | A receipt for every task: what, from whom, price, whether the work passed | Every payment is a receipt: item, deliverable hash, acceptance, amount, recipient, transaction | `/record`, `/record.csv`, `accord receipts <deal>` |
| `agents` | Agent Market: how jobs are posted and paid programmatically; say so if there is no public way | Checked in PROGRESS 0.9; the build plan (an internal note, removed from the repository on 10 Nov 2026) | `DECISIONS.md` |
| `agents` | Checkpoint: how the agent holds its keys and what it cannot do without the human | README section "What the agent's key can and cannot do" | README |
| `business` | Humans only set the constraints; a kill switch they can flip at any time | Mandates, approvals, exceptions; `revoke_agent` | `make revoke` |
| `business` | The agent's own NEAR account; never a full-access key in plain text; OutLayer custody or a scoped function-call key | Each agreement account is the agent's working account for that agreement, holding no full-access key; the agent's only credential is a scoped function-call key on it, stored only in the agent's environment | README; `make verify` |
| `business` | Every sale, cost and payout on a public ledger page | `/record` with payments, refusals, exceptions and gas per agreement; `/record.csv` (redirects to `/app/record.csv`), whose `transaction_url` is the payment transaction. Inference cost is not stored on chain, so it is not in the record or the CSV | `/record` |
| `business` | A demo mode that runs one full loop on testnet in under two minutes | `make demo` | Its elapsed line |
| `realworld` (if lever 4 passes) | Gasless for the vendor through a relayer that only pays for calls to our own contracts | `commit_mandate` takes no deposit; a NEP-366 relayer that relays only delegate actions to Accord agreements or the factory, and refuses `act` | A vendor account with `0` NEAR completes its steps; a test shows the relayer refusing other receivers |
| `realworld` (if lever 4 passes) | Status a bookkeeper can trust; a CSV an accountant opens without questions | Paid, pending and refunded with transaction links; `/record.csv` | `/record` |
| `realworld` (if lever 4 passes) | An invoice page with amount, due date, line items and a pay button; payment through the 1Click API; the README written first for a bookkeeper | The invoice view of a deal room: the terms' items with amounts and due dates, and a Fund button (the buyer's `ft_transfer_call`); a README section for a bookkeeper. 1Click appears only as a labelled `dry: true` quote for paying in from another asset (lever 9), because NEAR Intents has no testnet (Q-007) and Accord signs nothing on mainnet; the README says this requirement is not met on testnet | `/agreements/<id>/invoice`; the README's realworld section |
| `social` (if lever 3 passes) | Use the existing DAO for custody and approvals, add tiers on top; a public board | A Sputnik DAO is the buyer: proposals create, fund and approve; payments inside the terms need no vote; an exception needs one approver role; the deal room shows each proposal | `make dao` |
| `swarms` (if lever 5 passes) | `RULES.md` first; a sub-account per agent; a coordinator that collects sealed bids and picks a winner; a 20 by 5 simulation with no LLM calls; a live page | Sealed tender in the Sealed Table | `make swarm`; `/tender` |

## Judge paths

Three ways to check Accord, in the README in this order, from cheapest to fullest:

1. `make verify DEAL=<live agreement>`: read-only against our live testnet agreements; no account, no key. Runs in about a minute.
2. `make sandbox`: the full flow on a local NEAR sandbox; no network, no key; the jobs are mocked and say so.
3. `make demo NET=local`: the full live loop on a local node (`NET=local`) from fresh accounts, the recipient proven on the app's labelled demo domain; 14 s on 3 Nov 2026. `make demo` on testnet has not been run yet (`docs/build/PROGRESS.md` 5.2 is blocked). On testnet the same flow runs as `make negotiate`, `make finish`, `make attack` and `make revoke`, each recorded on release 4 in `DECISIONS.md` section 26, with our deployed jobs (their NEAR AI key is an OutLayer secret, so the reader needs none).

## README requirements

Written for Claude Code and Codex first (Q-017), and for a person second. No marketing, and no statements quoted from members of the jury. In this order:

1. Title and the headline; one paragraph on what it is; the thesis line.
2. The problem, opening with the question "Whose server do your agents meet on?", in five sentences with three sources from `docs/build/REFERENCES.md`.
3. Try it: the three judge paths, then numbered "do X, see Y" steps 1 to 10 for the live flow, each "see" quoting the literal output.
4. What the agent's key can and cannot do (the security prompt's checkpoint, in plain words).
5. Claims and their limits (verbatim), custody table, privacy boundary, "What we keep".
6. How NEAR is used, concretely: function-call keys, sub-accounts and pinned code, NEP-141 and NEP-297, OutLayer, NEAR AI Cloud. Each with the file that does it.
7. Architecture in one diagram and a link to `ARCHITECTURE.md`; the repository map.
8. Track by track: the requirement table above, with links to the steps.
9. Related NEAR tools and how Accord uses or differs from them (factual, no dismissals).
10. Business model (hypothesis): never a percentage of payments; free to build and verify; buyers pay per agreement, vendors per recipient authorisation.
11. Built during the window (Q-001): the start date, libraries and templates used (Q-005), the other project if any (Q-015), licence.

## Non-goals for v1

Mainnet, any mainnet signing, a token, a marketplace, legal KYB, confidential settlement, a second settlement rail in the core, cross-chain payments beyond the dry quotes in the build plan (an internal note, removed from the repository on 10 Nov 2026), multi-venue market-making agreements, loan-plus-option market-making structures, agent-to-agent free-form chat outside the Sealed Table.
