# KIT.md: the Accord build kit (v7), read this first

This kit is everything needed to build Accord end to end for NEAR HACKATHON (development closes 14 Nov 2026, 23:59 UTC) with Claude Code doing the building and Adi doing only what needs a human. Every decision that matters is written down; the build agent executes the files in order, keeps every claim true, and stops at the points that need Adi.

If two files disagree, the order of authority is: `HACKATHON.md` (the organisers' rules), then `DECISIONS.md` (verified facts and spec changes), then `GOAL.md` (what ships and the claims), then `INTERFACES.md`, then `ARCHITECTURE.md`, then everything else.

## Accord in eight lines

- Headline: **The private deal room and control plane for agent-to-agent commerce.** Thesis line: agreements negotiated in private, enforced in public.
- Two companies each seal a mandate in the browser. Inside an OutLayer TEE, two negotiators built from the two mandates run on NEAR AI Cloud's private inference: a quote, one counter with reasons, a final answer, accept or walk away. Code checks the result against both mandates; only the terms, hashes and an attestation come out.
- Both companies approve the terms. The agreement then lives in its own NEAR sub-account, code pinned by hash, no full-access key, holding USDC (NEP-141).
- The buyer's agent holds one function-call key on that account, able to call `act` and nothing else. `act` pays only an item that is due on the agreed evidence, at the approved amount, to the authorised recipient; everything else is refused and recorded on chain. A canary request or repeated refusals delete the key; the buyer can delete it in one transaction; the vendor can still claim what it has earned.
- The recipient is authorised by a file on the vendor's domain (fetched in an enclave), the vendor's settlement authority and the buyer, with a 24-hour delay on any change.
- Accord Atlas, the first application, pays market-making retainers only for periods where enough observations of Rhea's USDC/wNEAR pool, taken at times only the observer's enclave knows, met the agreed spread and depth, unless the buyer approves an exception.
- Three proofs print on testnet: `make negotiate`, `make attack`, `make revoke`. Three judge paths need no help from us: `make verify`, `make sandbox`, `make demo`.
- Every guarantee is stated with its limit; `GOAL.md` "Claims and their limits" is the source of truth.

## The files

| File | What it is | Who reads it, when |
| --- | --- | --- |
| `CLAUDE.md` | Working rules: what never happens without Adi's yes, the three proofs, the claims policy, one loop iteration | The build agent, first, every session |
| `HACKATHON.md` | The organisers' rules, verbatim (31 Oct copy) | First; re-fetched before submitting |
| `GOAL.md` | What ships: positioning, the claims and their limits, the build decided, the definition of done, each selected track's prompt requirements, the judge paths, the README structure | Before Phase 0 |
| `ARCHITECTURE.md` | How it works and why: accounts and keys, the lifecycle, the payment gates, Payee, the Sealed Table, Accord Atlas, the keeper, the agent, custody, privacy, invariants, threat model, failures, costs | Before writing code |
| `INTERFACES.md` | Every type, method, event, error, job input and output, schema, SDK call, MCP tool, CLI command, route, environment variable and printed line | While writing code |
| `PROGRESS.md` | The work queue: Phase 0 probes, then phases 1 to 8 with dated gates and fallbacks | Every loop iteration |
| `DECISIONS.md` | Verified facts with sources (31 Oct research), design decisions with the alternatives rejected, open questions, spec changes, submission values | Every iteration; probes write into it |
| `REFERENCES.md` | Evidence for the README's problem section | When writing the README |
| `DEMO.md` | The video shot by shot, the short cut, the X post drafts (lowercase, tags), the hosted demo | Phase 7 |
| `SUBMISSION.md` | The one submission: values, tracks rule, the idea text, payload build and checks, sending, the release check | Phases 7 and 8 |
| `WIN_PLAN.md` | How judging works, the five criteria, positioning against what the organisers link, nine levers after gate G2 | After gate G2 |
| `LOOP_PROMPT.md` | The prompts Adi pastes into Claude Code | Adi |
| `SETUP_FROM_YOU.md` | Everything only Adi can do, in the order the build will need it | Adi, before the kickoff |
| `starter/` | Files the build copies in at scaffold time: the fictional companies' mandates and domain file, the attack messages, the two negotiator prompts and their output schema, the literal planner's rules, `.env.example` | `PROGRESS.md` 0.11 |
| `website/` | The site copy, the site specification and nine diagrams, updated on 31 Oct for NEAR settlement | The app uses the same words; Adi's site repository uses the files directly |

Into the product repository go this file and every file above except `LOOP_PROMPT.md`, `SETUP_FROM_YOU.md` and `website/ARCHIVE_brief_v1.md` (the superseded v1 brief, which describes the old Base settlement and would mislead a screener), on `main`. At release (`PROGRESS.md` 7.3) the build files move to `docs/build/` and a short evaluator `CLAUDE.md` and `AGENTS.md` take the root, because screeners' agents load a root `CLAUDE.md` as instructions. The product's own `README.md` is written by the build (`PROGRESS.md` 0.11 and 5.3) for judges; this file is not it. `DECISIONS.md`, `CHANGELOG.md` and `BLOCKED.md` are living files; `CHANGELOG.md` stays at the root after the move.

## Dates and gates

| Date (UTC) | Gate | Passes when |
| --- | --- | --- |
| 1 Nov | G0 | The NEAR AI, OutLayer and key probes printed real output into `DECISIONS.md` |
| 3 Nov | G1 | `make sandbox` passes; `make test` green |
| 6 Nov | G-Atlas | One live Atlas observation on chain with a valid signature; decides what the video leads with |
| 8 Nov | G2 | `make negotiate`, `make attack`, `make revoke` print live on testnet |
| 10 Nov | G3 | The hosted app is up; `/try` and `/verify/<id>` work |
| 12 to 13 Nov | | Release candidate, two rehearsals, the video and X post (Adi), the repository public (Adi) |
| 14 Nov, 12:00 | | Submission after Adi confirms the printed payload |

## What changed from v6

USDC moves on NEAR instead of Base, so the reporter, Chain Signatures and the in-flight nonce burn are gone, and `make revoke` replaces `make inflight` as the third proof. Each agreement is its own account with pinned code. An independent review on 31 Oct then hardened the jobs: they read the agreement's state instead of trusting their caller, sign with keys derived from their own enclave-generated seeds, and the Sealed Table's seed is readable only by runs an agreement requests (and the keyless account's runs that publish its public key); Atlas slot times now come from the observer's seed and each sample is the first mainnet block after its time. The organisers' track prompts are acceptance criteria. An SDK, an MCP server and a CLI are part of the core. The website copy and diagrams were updated to match. A re-check the same day bounded `close()` (deliveries end with the term, and what cannot be paid is set aside for the vendor instead of blocking the refund), made stale payment locks unambiguous, moved the `pubkey` runs to a keyless releases account, put the NEAR AI key under the same access condition as the seeds, stated that the deployer owns the observer's seed, and gave the `/try` room its own principals, budget and daily cap. `DECISIONS.md` section 10 lists every change.

## Words that are never written

The full list is in `GOAL.md` ("Withdrawn" and "Words never written"). The short version: no trust words (secure, trustless, bank-grade, military-grade, AI-powered, seamless, revolutionary, autonomous as an adjective for the product), no "Glassbook", no "confidential settlement" or "private payments", no "verified business", nothing that says the agent cannot be tricked or that Atlas proves who earned a payment.
