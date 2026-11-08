# SUBMISSION.md: the one submission

One submission per project, never editable, and a repository can be submitted once (HACKATHON.md). This file is how the agent prepares it and how Adi sends it. The agent never sends it without Adi's yes in the conversation, after he has read the full printed payload.

## When

- The API accepts submissions from 2026-11-01T00:00:00Z to 2026-11-14T23:59:00Z and answers `403` outside that window.
- Send only when all of these are true: the repository is public, the X post is live, the hosted demo is up, and `make release-check` passes on a fresh clone.
- Target: 14 Nov, 12:00 UTC (17:30 IST). That leaves twelve hours for a `503` retry or a fix to the repository. The deadline in IST is 15 Nov, 05:29.

## Values Adi decides (never guessed, never generated)

The agent asks for each value, writes it into `DECISIONS.md` under "Submission values" except the email and payout account (those go in `.submission/values.json`, which is gitignored), and validates it with `make submission-check`.

| Field | Rule (HACKATHON.md) | Value |
| --- | --- | --- |
| `projectName` | 2 to 80 characters | Adi decides. Suggested: `Accord` |
| `leadName` | 2 to 80 characters | Adi |
| `email` | valid, at most 160 characters, at most 2 submissions per email | Adi |
| `size` | exactly one of `1`, `2 - 4`, `4 - 6`, `6 - 8`, `8+` | Adi |
| `tracks` | ids from the table, each once, every track the project fits | See "Tracks" below |
| `nearAddress` | mainnet payout account, 2 to 64 characters, lowercase, matches the regex in HACKATHON.md | Adi creates it in a wallet. The agent never creates or suggests one |
| `projectUrl` | public repository URL, at most 300 characters, unique | Adi |
| `demoUrl` | the X post URL, at most 300 characters | Adi posts, then pastes the link |
| `idea` | 20 to 2,000 characters: the problem, the product, how NEAR fits | The draft below, updated to what actually shipped |
| `consent` | `true` only after Adi agrees to the notice, read to him verbatim | "I agree that the organizers may use these details to review our submission and contact us about this hackathon." |

Do not add any other field. `website` is a spam trap: any non-empty value rejects the submission, so the payload has no `website` key at all.

If Adi submits a second, independent project (Q-015), both READMEs name the other project, and the `idea` text below ends with one line that names it. Ask him before the release check.

## Tracks

Every track the project fits, decided by what passed, not by what was planned. The agent proposes the list from `PROGRESS.md` with evidence for each, and Adi decides.

| Track id | Include when | Evidence the README points to |
| --- | --- | --- |
| `security` | Always (lead) | The function-call key and its limits, `make attack`, `make revoke`, the recipient check (allow, warn, block) in the SDK wrapper |
| `privacy` | Always | The Sealed Table: mandates encrypted in the browser, the TEE run, NEAR AI Cloud attestation verified with a fresh nonce and shown in a "Verified" panel, nothing kept server-side |
| `agents` | Always | Agents negotiate (quote, one counter with reasons, accept or walk away), pay in USDC under the terms, a receipt per payment, the MCP server any agent can use |
| `business` | Always | Humans set the constraints (mandates, approvals, revoke as the kill switch), procurement and treasury flows, the public ledger, `make demo` under two minutes |
| `realworld` | `WIN_PLAN.md` lever 4 passes (gasless vendor through a relayer limited to Accord contracts, the invoice view, CSV export, the bookkeeper section) | Vendor never holds NEAR; the invoice view with amount, due date, line items and the fund button; paid, pending and refunded with transaction links; the CSV. The README says plainly that the prompt's "payment goes through the 1Click API" is met only as a labelled `dry: true` quote (lever 9), because NEAR Intents has no testnet (Q-007) and Accord signs nothing on mainnet |
| `social` | `WIN_PLAN.md` lever 3 passes (a Sputnik DAO is the buyer) | Terms approved and revoke exercised through DAO proposals on testnet |
| `swarms` | `WIN_PLAN.md` lever 5 passes (sealed tender, sub-account per agent, 20 by 5 simulation) | `RULES.md`, `make swarm`, the `/tender` page |

Never include a track only to get another draw. A track the README cannot back with a do-X-see-Y step is left out.

## The idea text (draft; finalise on 13 Nov to what shipped)

1,924 characters as drafted. Every sentence must stay true to the "Claims and their limits" table in `GOAL.md`, and the limits sentence stays in whatever else is cut; if a feature did not ship, delete its sentence rather than soften it.

```text
Companies are starting to let AI agents negotiate with vendors and pay them. Two things break: an agent that can pay can be talked into paying the wrong account, and a negotiation run on someone's server exposes both sides' limits.

Accord is the private deal room and control plane for agent-to-agent commerce. Each company encrypts its mandate in the browser. Inside an OutLayer TEE, two negotiators built from the mandates run on NEAR AI Cloud's private inference: a quote, one counter with reasons, a final answer. Code checks every proposal against both mandates; only the terms, hashes and an attestation leave.

Both companies approve the terms. The agreement then lives in its own NEAR sub-account holding USDC. The buyer's agent gets one function-call key on it, able to call one method, act. The contract pays only an item that is due on the agreed evidence, at the approved amount, to the authorised recipient (domain proof, vendor authority, buyer acceptance; changes wait 24 hours). Anything else is refused on chain; a canary request deletes the key; the buyer can delete it in one transaction; the vendor can still claim what it earned.

Market-making agreements pay market-making retainers only for periods where enough hidden-time samples of Rhea's USDC/wNEAR pool met the agreed spread and depth, unless the buyer approves an exception.

Limits we state: the enclaves are trusted hardware, and the deployer owns their seeds and could rebind them; prompts reach the models through NEAR AI's attested gateway; terms and payments are public on NEAR; authorisation proves domain control, not legal existence; the market-making observer measures the pool, not who supplied the liquidity.

NEAR is load-bearing: function-call keys, sub-accounts with pinned code, NEP-141 USDC, OutLayer and NEAR AI Cloud. Everything runs on testnet; the README has do-X-see-Y steps, and anyone can try to make the agent pay them at /try.
```

## How the agent builds and checks the payload

`scripts/submission/build.mjs` (written in `PROGRESS.md` 8.2; never committed with values in it):

1. Reads `.submission/values.json` (gitignored) and "Submission values" in `docs/build/DECISIONS.md` (item 7.3 moved the build kit there before this script is written).
2. Generates `requestId` once with `crypto.randomUUID()` and stores it in `.submission/request-id`. If that file exists, it reuses the value; it never generates a second one.
3. Validates every field: lengths; `size` in the exact set; `tracks` a non-empty array of distinct ids from the thirteen; `nearAddress` lowercase, 2 to 64 characters, matching `^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$`; both URLs `http(s)` and at most 300 characters; `idea` 20 to 2,000 characters; `consent === true`; exactly the eleven keys; no `website` key; body under 12,000 bytes.
4. Checks the world: `projectUrl` returns `200` without credentials (the repository is public), `demoUrl` resolves, the README on the default branch contains the "Try it" section, `LICENSE` exists.
5. Prints the full JSON, pretty, and stops. It never sends.

## How it is sent

Only after Adi has read the printed JSON and said yes in the conversation:

```sh
curl -sS -X POST https://nearhackathon.com/api/applications \
  -H 'Content-Type: application/json' \
  --data-binary @.submission/payload.json
```

| Status | What happened | What to do |
| --- | --- | --- |
| `201` | Saved | Tell Adi. Tag the submitted commit `hackathon-submission` (locally; Adi pushes the tag). |
| `400` | A field failed validation | Fix the fields named in `fields`, print the payload again, wait for yes, resend with the same `requestId` |
| `403` | Not open, or looked cross-site | Tell Adi. Do not retry |
| `409` | Repository already submitted, or the email has 2 submissions | Ask Adi. Never change the link or the email to get around it |
| `413` | Body too large | Shorten `idea` |
| `503` | Storage busy | Wait a minute, resend the same payload with the same `requestId` |

The payload holds personal data: `.submission/` is in `.gitignore`, and `make release-check` fails if anything under it is tracked.

## Release check (run on 13 Nov, again before sending)

- Fresh clone into a temp directory; `make setup-check` and the README's numbered steps 1 to 8 produce the quoted "see" lines.
- `git log -p --all` contains no key material: no `ed25519:` private keys, no `secret`, `api_key`, `sk-`, `BEGIN`, no 64-hex strings outside test fixtures that are labelled as such.
- The words in `GOAL.md` "Words never written" appear nowhere in the repository, the app's strings, `DEMO.md` or the X post text.
- The README names every library and template used (Q-005), says the repository began on `<date>` inside the window (Q-001), and if any code predates 1 Nov, links the diff from the `pre-hackathon` tag (Q-003).
- `LICENSE` is MIT (Q-014). The hosted demo is up and `/status` is green.
- A fresh clone checks out `main`; the build kit sits in `docs/build/`; the root `CLAUDE.md` and `AGENTS.md` are the short evaluator files from `PROGRESS.md` 7.3 and contain no request about scoring.
- Re-fetch https://nearhackathon.com/HACKATHON.md and diff it against the repository copy; report any change to Adi before sending.
