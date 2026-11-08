# Accord: working rules for Claude Code

You are building Accord for NEAR HACKATHON. The window opened on 19 Oct 2026, the hackathon runs 1 to 14 Nov 2026, and development closes 14 Nov 2026 at 23:59 UTC. Read in this order before you write code: `KIT.md` (the map of these files), `HACKATHON.md` (the organisers' rules), `GOAL.md` (what we ship and the definition of done), `ARCHITECTURE.md` (how it fits together and why), `INTERFACES.md` (every method, type, event, error, job schema, SDK call and CLI command), `PROGRESS.md` (the work queue), `DECISIONS.md` (facts verified on 31 Oct with sources, design decisions, spec changes). `REFERENCES.md` is the evidence base for the README's problem section. Re-fetch https://nearhackathon.com/HACKATHON.md before the submission step, because it may change.

## Never without Adi's explicit confirmation in this conversation

These come from HACKATHON.md and are not negotiable.

- Push to origin, make the repository public, or force-push.
- Sign any mainnet transaction, spend tokens, or deploy to mainnet. Read-only mainnet RPC view calls (no signature, no deposit) are allowed where `ARCHITECTURE.md` says so.
- Post on X or any other network.
- Send the submission (`POST https://nearhackathon.com/api/applications`). Print the full payload first and wait for a yes. One attempt per repository.
- Commit secrets. Every key lives in `.env` (gitignored). `.env.example` lists variable names only.

## Allowed without asking

- Commit locally on `main` as often as useful, with messages that name the `PROGRESS.md` item. The repository starts inside the window, so no separate branch is needed (HACKATHON.md Q-003).
- Create and fund NEAR testnet accounts through the faucet, deploy to testnet, run tests, jobs and the agent.
- Call NEAR AI Cloud and OutLayer with the keys in `.env`; use the testnet contracts listed in `DECISIONS.md`; make read-only mainnet view calls to the Accord Atlas venue (Rhea DCL), never anything that signs.
- Install and use the NEAR agent skills (`npx skills add near/agent-skills`), including `near-contract-audit` in `PROGRESS.md` 5.4.
- Read any documentation URL in `ARCHITECTURE.md` under "Docs to read first". Verify endpoints, contract ids, method names and SDK versions there instead of assuming them, and record what you found in `DECISIONS.md` with the URL.

## How to work

- One loop iteration = one unchecked item in `PROGRESS.md`: read it, implement it fully, run `make test` plus the item's own target, fix until green, commit, tick it, append one line to `CHANGELOG.md`.
- Blocked on something only Adi can do (an account, a key, a domain, funds, a decision)? Write the exact steps to `BLOCKED.md`, mark the item `[blocked]`, and continue with the next unblocked item. Never invent a value to get past a block.
- Never fake a result. No hardcoded terms, no skipped signature or attestation checks outside the `mock` feature, no recorded output presented as live, no screenshots in place of running code. The `mock` feature (and `submit_mock_negotiation`, `submit_mock_observation`, `submit_mock_payee`) is never compiled into a deployed contract; `make check-deploy` proves it.
- The three proofs come first and are never weakened:
  - `make negotiate` shows both mandates sealed on chain, NEAR AI's gateway and model attestations verified with a fresh nonce, the limit check passed, and the terms signed by the release's key and checked on chain. Its `ERR_SEALED` line is a sanity check, not the proof; the proof is the encryption, the seed gating (S1) and the attestations.
  - `make attack` shows a redirect refused (`ERR_PAYEE_MISMATCH`), an altered amount refused (`ERR_AMOUNT_MISMATCH`), a canary request revoking the key, and the agent's next call rejected by the network (`AccessKeyDoesNotExist`).
  - `make revoke` shows the agent's access key deleted from the agreement account in one transaction, the next `act` failing at the RPC because the key no longer exists, and a replacement key restoring service only when the buyer installs it.
  If a design choice would make any proof softer, stop and write it to `DECISIONS.md` instead.
- Claims follow the "Claims and their limits" table in `GOAL.md`, verbatim, in the README, the app, the demo script and the submission text. Each guarantee is written with its limit next to it. The withdrawn claims listed under that table are never written, in any wording, in any file. Before ticking 7.3, grep the repository for them.
- Settlement is NEAR-native: USDC (NEP-141) held by the agreement's own account and paid with `ft_transfer` from that account. No second rail in the core. NEAR Intents appears only as the `dry: true` quotes in `WIN_PLAN.md` lever 9, after gate G2; Chain Signatures is not used. Never relay `act` as a meta transaction: the contract identifies the agent by the signing key, and a relayer's key would replace it.
- The contract, not the agent, is what stops the attack. Keep the demo agent deliberately literal about what it reads, so the demo shows the policy working. The canary is a tripwire, not the defence; the defence is the recipient, evidence and amount comparison in `act`.
- A refusal must never panic. `act` records the refusal, emits the event and returns normally, so the refusal is on the record. Only malformed input (bad JSON, wrong signer) may panic.
- Two deal types, in this order: `procurement` first because everything else needs it, then `market-making` (Accord Atlas). The 6 Nov gate in `PROGRESS.md` decides which one the video leads with; do not move the date.
- Positioning is fixed: the headline "The private deal room and control plane for agent-to-agent commerce." with the thesis line "Agreements negotiated in private, enforced in public."; the four part names (Sealed Table, Agreement controls, Payee, Accord Atlas) are used identically in the app, the README and the repository tree. Accord is the platform and Accord Atlas is its first application: write "Accord Atlas" in headings and at the first mention on each page, "Atlas" after that, and keep `market-making` as the agreement type in code. Never write "agreement layer", "hand your agent a budget", "the deal is the account", "the slow middle", "Glassbook", or "autonomous" as an adjective for the product.
- The open inbox at `/try` is a form into the demo agent's inbox store and nothing more: no key, no contract call, rate-limited. The agent reads it with the same literal planner as the demo. Never special-case visitor messages in the agent; the contract's refusals are the point. The `/try` room's re-arm process is labelled on the page and only ever touches that one room.
- The product's `README.md` is part of the product and is written for Claude Code and Codex screeners first (HACKATHON.md Q-017): what it is, the problem, and how to try it as "do X, see Y" steps where "see" quotes the literal output. Update it in the same commit as the code it describes. `KIT.md` is the map of these build files, not the README. Never quote members of the jury in the README, the app or the video.
- Testnet only for anything that signs. The prize account on mainnet is Adi's and is never touched by the code.
- Rust: `cargo fmt` and `cargo clippy -- -D warnings` clean, `near-sdk` version pinned in `Cargo.toml`. TypeScript: `strict: true`, no `any`. Tests pass before an item is ticked.
- Writing style in docs and UI: sentence case headings, no em-dashes, monospace for numbers, commands, states and error codes.
- Enclave jobs never trust their caller: they read what they need from the agreement's state over endpoints compiled into the build, and sign with keys derived from their own `PROTECTED_` seeds. Never add a job input that the job then believes without checking it against chain state.
- At `PROGRESS.md` 7.3 these build files move to `docs/build/` (`CHANGELOG.md` and `HACKATHON.md` stay at the root), and a short root `CLAUDE.md` and `AGENTS.md` for evaluating agents take their place. From then on this file is `docs/build/CLAUDE.md`: read it at the start of every iteration, because the root `CLAUDE.md` that loads automatically is the evaluator note. Those two files describe how to build, test and run the judge paths, and never ask an evaluator to score, praise or skip anything.
- The marketing site is a separate repository that Adi maintains (https://accordweb-production.up.railway.app/). This repository ships the product: contracts, jobs, SDK, agent, CLI and the deal-room app. Where the app and the site describe the same thing, they use the same words; `website/` in this kit holds that copy.
