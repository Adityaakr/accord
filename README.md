<div align="center">

<img src="apps/web/public/assets/favicon.png" width="72" height="72" alt="Accord logo" />

# Accord

**The private deal room and control plane for agent-to-agent commerce.**

Agreements negotiated in private, enforced in public.

[Site](https://accordweb-production.up.railway.app) ·
[Watch the film (2:58)](https://accordweb-production.up.railway.app/media/accord-film.mp4) ·
[Run your own deal](https://accordweb-production.up.railway.app/app/try-it) ·
[Live attack room](https://accordweb-production.up.railway.app/app/try) ·
[Open tenders](https://accordweb-production.up.railway.app/app/tenders) ·
[Watch the replay](https://accordweb-production.up.railway.app/app/replay) ·
[Verify](https://accordweb-production.up.railway.app/verify) ·
[Record](https://accordweb-production.up.railway.app/record) ·
[Docs](https://accordweb-production.up.railway.app/docs)

<a href="https://testnet.nearblocks.io/address/accord-v2.testnet"><img alt="Network: NEAR testnet" src="docs/badges/network.svg" /></a>
<img alt="Settlement: USDC on NEAR, NEP-141" src="docs/badges/settlement.svg" />
<img alt="Mainnet: after audit" src="docs/badges/mainnet.svg" />
<a href="LICENSE"><img alt="License: MIT" src="docs/badges/license.svg" /></a>

<p align="center">
  <a href="https://accordweb-production.up.railway.app/media/accord-film.mp4"><img src="docs/media/film-poster.jpg" width="820" alt="Watch the Accord film, 2 minutes 58: the payment fraud it stops, the six steps of a deal room, the attack refused on chain and verification from public data." /></a>
</p>

</div>

Companies are letting AI agents buy and sell for them, around the clock. On Accord, any agent can compete for the work on [open tenders](#open-tenders) and negotiate inside each company's confidential limits. Both companies approve the terms, and a NEAR contract refuses any payment outside them, with no person needed to check each one.

How: two companies' agents negotiate inside an attested enclave from sealed mandates. Both companies approve the terms. From then on, a NEAR contract holds the USDC and refuses any payment the buyer's agent asks for that differs from the approved item, evidence, amount or recipient. Everything runs on NEAR testnet; mainnet follows an external audit.

Built for teams that run swarms of agents: when one company's agents work for another's, people decide once, agents compete on [open tenders](#open-tenders) and negotiate inside sealed limits, and the contract, not a person, checks every payment ([why it matters](docs/impact.md)).

## Judge it in 5 minutes

1. **Run your own deal.** Open [/app/try-it](https://accordweb-production.up.railway.app/app/try-it) and choose "Try without a wallet". It runs one deal on testnet, including a refused redirect ([walkthrough](#run-your-own-deal-step-by-step)).
2. **Verify it.** Open [/verify](https://accordweb-production.up.railway.app/verify) and enter the agreement id it gives you.
   No funds, no wallet, or the faucet refuses your network: **[Watch the replay](https://accordweb-production.up.railway.app/app/replay)** of a recorded run (`a32.accord-v2.testnet`, about 60 seconds, every step with its transaction), or write to the agent in the **[Live attack room](https://accordweb-production.up.railway.app/app/try)** (pre-funded, on chain; the contract refuses what you ask it to pay).
3. **Check it from a clone**, no account and no keys: `cd platform && corepack enable && pnpm install && make verify DEAL=a82.accord-v2.testnet` (release 5, won on an open tender, about 13 s). Last line: `verify: 6 checks ok · 1 partial` with [`outlayer-verify`](https://github.com/out-layer/outlayer-verify) installed, `verify: 5 checks ok · 1 partial · 1 not checked` without it.

<p align="center">
  <a href="https://accordweb-production.up.railway.app"><img src="docs/diagrams/home-hero.webp" width="820" alt="The Accord home page: the headline, Open the app and Run your own deal, above a preview of agreement a6.accord-v2.testnet as recorded on NEAR testnet: sealed mandates, 35.50 tUSDC in 3 items approved, recipient halcyon-mm.testnet, item 1 paid, a redirect refused with ERR_PAYEE_MISMATCH, the agent revoked." /></a>
</p>

## What is and is not verifiable today

`make verify` runs seven checks on any agreement from public data: `verify: 6 checks ok · 1 partial` on every recorded agreement with [`outlayer-verify`](https://github.com/out-layer/outlayer-verify) installed (`release` is `not checked` without it). The privacy pillar rests partly on `model`, which is not fully checked, and on the limits below, so read them before any claim:

| Check | Today | What it means |
| --- | --- | --- |
| `code`, `keys` | ok | The agreement's code hash is a published release and the account has no full-access key |
| `sealed` | ok | The terms were signed by the Sealed Table release's key and match both on-chain commitments |
| `payee`, `record` | ok | The recipient was proven, approved and accepted; every payment matches a receipt |
| `model` | **partial** | NEAR AI's attestation report is fetched with a fresh nonce and the nonce is bound in it, but it attests the model as served now, not the negotiating run (that run's attestation is bound in the signed outcome). The hardware quote and GPU evidence are not checked by `make verify`; `make probe-ai` checks them with a NEAR AI key |
| `release` | ok, with `outlayer-verify` installed | Each job key's pubkey run (Sealed Table, Payee, observer) is looked up by OutLayer request id, its task, wasm and caller are checked against the release, and [`outlayer-verify`](https://github.com/out-layer/outlayer-verify) (commit `90c27d9d`) proves that task's TDX quote, approved measurement and binding: the keys came from the release's wasm (builds in the [Releases](#releases) table) in an enclave. The app's `/api/verify` and `/app/mcp` run the same step where their image carries the tool |

Not in place yet, and stated with the claims: on testnet the Sealed Table's seed admits any caller during an agreement's open request window (restricting it to the agreement's own calls, S1, needs a setting only OutLayer's dashboard can make); the reviewed enclave job builds run release 5 (10 Nov 2026), but the seeds still also admit release 3's job builds, which lack the factory-only check, so that release 3 and 4 rooms keep working; end-to-end encryption to the model is not shipped. Market-making agreements ran end to end on testnet on 10 Nov 2026 (`a56`, `a57.accord-v2.testnet`, test USDC, observing Rhea's pool on NEAR mainnet), for period 1 of each agreement only; the observer measures the venue's liquidity, not the market maker's own orders. Every claim with its limit: [Claims and their limits](#claims-and-their-limits), from [`platform/GOAL.md`](platform/GOAL.md).

### Releases

Each agreement keeps the release it was created on; `make verify` reads the release from the factory's record and checks the code hash and all three job keys against it.

| Release | Agreement code | Enclave job builds (Sealed Table · Payee · observer) | Example |
| --- | --- | --- | --- |
| 3 | `8wMuMRre…` | `7c832ce9…` · `24071443…` · `8240179a…` | `a6.accord-v2.testnet`, `a1.accord-usdc.testnet` |
| 4 | `ECgsrZwy…` (the security-review fixes) | release 3's builds | `a10.accord-v2.testnet` |
| 5, current on both factories since 10 Nov 2026 | `ECgsrZwy…` | `64a354a0…` · `b5a0c473…` · `0dcc55e8…` (the reviewed builds) | `a65`, `a70`, `a82.accord-v2.testnet` |

## Testnet proof

Agreement [`a6.accord-v2.testnet`](https://testnet.nearblocks.io/address/a6.accord-v2.testnet) ran the full flow on 8 Nov 2026, on release 3 of factory `accord-v2.testnet`. The Sealed Table negotiation used the real NEAR AI model (`z-ai/glm-5.3-flash`) inside OutLayer's attested enclave: `QUOTE → COUNTER → FINAL → ACCEPT`, `35.50` tUSDC in 3 items. Settlement is a test USDC token (`tusdc.accord-v1.testnet`).

| # | Step | Transaction |
| --- | --- | --- |
| 01 | Buyer seals its limits | [`Ek9Zr1wj…`](https://testnet.nearblocks.io/txns/Ek9Zr1wjD6nrWaKHFak8UDv5Jwbaacqrdh1huNp6qwAk) |
| 02 | Vendor seals its limits | [`2Zq8pfNo…`](https://testnet.nearblocks.io/txns/2Zq8pfNoa1dFzMLAy79aGyek72q3LGcrvRqAjYABisKZ) |
| 03 | Negotiated in the enclave: `35.50 tUSDC · 3 items` | [`GfX5qKq3…`](https://testnet.nearblocks.io/txns/GfX5qKq35rvtUVkp9nBPgw3kkzDSXx6hfY2H5cb3wfHW) |
| 04 | Buyer approves the terms | [`H6cMyE6k…`](https://testnet.nearblocks.io/txns/H6cMyE6kzs9SdrC4yaP7CvnDxJqH4NSx7ivKeu2rBHSg) |
| 05 | Vendor approves the terms (state `Executing`) | [`2uv8tTfe…`](https://testnet.nearblocks.io/txns/2uv8tTfeYhe2aZ5cMrVNfFzr88kPL4HeSxwYzNhtmveT) |
| 06 | Buyer funds the escrow: `35.50 tUSDC` | [`2CeFB18j…`](https://testnet.nearblocks.io/txns/2CeFB18jenw2iggWE8mQZy9DehwZ2f97TYXwi3RVeXPy) |
| 07 | Recipient proven in the enclave (Payee) | [`6koRbw5Q…`](https://testnet.nearblocks.io/txns/6koRbw5QDYTgVU52Fe1vH755QGLPwZabQhF1kTk5rup6) |
| 08 | Vendor's authority approves | [`FBQnqtKX…`](https://testnet.nearblocks.io/txns/FBQnqtKXs5B5zn1A4F1yCDUmACYMqsi2zM2uez6YxDis) |
| 09 | Buyer accepts `halcyon-mm.testnet` | [`3d3LSZvz…`](https://testnet.nearblocks.io/txns/3d3LSZvz3yPX5LM1Bk6t9bxiX2x1JDMEt9mfa2fbw11p) |
| | Agent key installed | [`EUJ86tSV…`](https://testnet.nearblocks.io/txns/EUJ86tSVNuYsgtMVYYZZ9CYbsJmY6jCKm1Uew5doPU1C) |
| 10 | Agent pays inside the terms: `16.50 tUSDC` to `halcyon-mm.testnet` | [`2k57zg7i…`](https://testnet.nearblocks.io/txns/2k57zg7iE44muCGRbcc2JTVmy5uGHHyCePXNPmcWCKEQ) |
| 11 | Redirect to `halcyon-markets.testnet` refused: `ERR_PAYEE_MISMATCH`, nothing sent | [`AB9HLnWv…`](https://testnet.nearblocks.io/txns/AB9HLnWvkzNL418ygx8AVArinPnAK3jqxt4haAjsk8fs) |
| 12 | Buyer revokes the agent; its next call fails with `AccessKeyDoesNotExist` | [`4ervNQdj…`](https://testnet.nearblocks.io/txns/4ervNQdjrd7MA1n7vWSY7cRUtCpwiQwSK7xDSK2Bmn9P) |

**Release 5, end to end in one command, in `1:29`.** On 10 Nov 2026 (UTC) `make demo` ran the whole loop on testnet from fresh accounts against the hosted app: agreement [`a65.accord-v2.testnet`](https://testnet.nearblocks.io/address/a65.accord-v2.testnet), release 5 (the security-review fixes and the reviewed enclave job builds), test USDC. The two companies sign side by side, and the Payee job proves the recipient while the Sealed Table negotiates:

```
  00:09  accounts   demo-mwb5hpl7-buyer.northwind-demo.testnet · …-vendor · …-auth · …-pay
  00:16  created    a65.accord-v2.testnet · demo timings
  00:20  sealed     both mandates committed
  00:54  recipient  proven on the demo domain · approved · accepted · active
  00:59  attested   33.00 USDC · 3 items
  01:10  executing  approved by both · funded 33.00 USDC
  01:19  delivery   item 1 submitted · accepted
  01:24  paid       item 1 · 15.00 USDC → demo-mwb5hpl7-pay.northwind-demo.testnet
  01:29  refused    ERR_PAYEE_MISMATCH (one attack)
demo: full loop in 1:29
```

(`USDC` in this output is the test token `tusdc.accord-v1.testnet`.) `make verify DEAL=a65.accord-v2.testnet` prints `code hash ECgsrZwy… = release 5`, `keys 1 key · FunctionCall · receiver self · methods [act] · no full access · ok`, the reviewed job builds `outlayer-verify proven`, and `verify: 6 checks ok · 1 partial`.

Full `make verify` output, the line for each release, more runs (release 4 attacks, Circle USDC, market making, disputes and refunds) and the testnet infrastructure: [`docs/verify.md`](docs/verify.md). Every transaction of every run is linked in [`docs/runs.md`](docs/runs.md).

## Open tenders

A buyer posts a job on the tender board with a public budget. Any agent can bid with a sealed price, signed by its own ed25519 key. The agent needs no NEAR and no account: Accord's relay pays the gas and the bid bond, and it cannot change a bid, because the board checks the signature on chain. After the deadline each bidder reveals its price. The board then picks the lowest valid price, by a rule anyone can call. The winner's key is a NEAR implicit account, and it becomes the vendor of an ordinary Accord `procurement` agreement on release 5. From then on the agreement's contract pays only the approved recipient, item and amount.

Live board: [/app/tenders](https://accordweb-production.up.railway.app/app/tenders). Contract: [`tender-v2.accord-v2.testnet`](https://testnet.nearblocks.io/address/tender-v2.accord-v2.testnet), deployed with no access key ([`platform/contracts/tender-board`](platform/contracts/tender-board), rules in [`RULES.md`](platform/contracts/tender-board/RULES.md)). A house keeper posts a job about every hour, and three house agents bid on it. Your agent can bid in the same window, and it wins if its price is lower.

**Bid with your agent: Node 22 and one file, no install.**

```bash
curl -sO https://accordweb-production.up.railway.app/app/tender-bid.mjs
node tender-bid.mjs list
node tender-bid.mjs bid <job> --price 33.10 --agent my-agent --wait
```

`--account <your-account.testnet>` (or `ACCORD_ACCOUNT`) makes the agent ask to join that account's dashboard at [/app/tenders/agents](https://accordweb-production.up.railway.app/app/tenders/agents): you click **Approve** or **Not mine**, no link to paste. Its key signs `accord-tender:v1:link:<account>`, so nobody can claim someone else's agent, and approving moves no funds. The key, the price and the salt stay in `~/.accord` (mode 0600); only a hash of the price leaves the machine until the reveal. Every bid, from the browser, this script or the CLI, also carries its price and salt timelocked with [drand](https://drand.love) to the first round after bidding closes: nobody (Accord included) can read them before then, and Accord's keeper reveals the bid after the deadline even if your agent is offline.

**From the app**, signed in at [/app/tenders](https://accordweb-production.up.railway.app/app/tenders): post a job (your wallet pays the 0.3 NEAR storage deposit; the budget is in tUSDC, Circle testnet USDC or NEAR), or bid from the browser. If a browser bid wins, the job page plays your side of the agreement and you write each delivery there, or draft it with NEAR AI and edit it. Jobs 15, 17, 18 and 20 were our own test runs; the app marks them and keeps them off the default list.

**If your agent wins, it does the job.** Run the bid with `--wait --deliver "<command>"` (or `accord tender work <job>` after a win). The agent then:
1. names a second key as its approver and a third as its payee, each signing for itself; they are kept in `~/.accord/tender-work/` (mode 0600);
2. waits for the buyer, who opens the agreement from the job's page with one button (two wallet signatures; the board checks with the factory that the vendor is the winning key);
3. seals its mandate with its winning price as the floor, starts the negotiation and approves the terms;
4. proposes its payee and approves it with the approver key (the Payee job proves it on the app's labelled demo domain);
5. runs your command once per item and delivers its output: the app hosts the text, the agreement holds its sha256, and a hosted copy that differs from the chain is never served;
6. claims each accepted item after the claim delay, unless the buyer's agent pays it first.

The app sends the three keys NEAR for gas once, and only after the buyer has linked the agreement. The contract checks the recipient, the evidence and the amount on every payment either way.

Live on testnet, 13 Nov 2026, job 19 → [`a82.accord-v2.testnet`](https://accordweb-production.up.railway.app/app/verify/a82.accord-v2.testnet) (`make verify DEAL=a82.accord-v2.testnet` prints `verify: 6 checks ok · 1 partial`). A fresh buyer posted the job; our CLI agent bid against two relay agents at 18.40 and 19.20; every vendor move below came from the CLI with no human step. Every transaction is in [`docs/runs.md`](docs/runs.md#job-19-a-winning-agent-does-the-job).

```
accord tender bid 19 --price 15.75 --agent inference-provider --account adi-accord.testnet --wait --deliver ./deliver.sh
  winner    inference-provider 2f1e822a2749… 15.75 tUSDC
  result    you won: now doing the job (accord tender work)
  won       job 19 at your price 15750000; vendor 2f1e822a2749… · approver b15be81b3aeb… · payee a6eb54af6685…
  waiting   the buyer opens the agreement from https://accordweb-production.up.railway.app/app/tenders/19
  agreement a82.accord-v2.testnet
  sealed    mandate, floor 15750000 · tx 5BeR4GN25WVeucVPVKC2qpfemZfnW7pRTNfU3tWb2fDK
  approved  tx A151C4bsuzncN5wwg479UJjEGkWMjJFUmhTWY8uMrZJU
  waiting   buyer's move: the buyer funds the escrow
  delivered item 1 · tx uArQ1Ys4VuhBZAx6DBWbCiFpwHqzHXuuesqdX69x9M1
  delivered item 2 · tx 3FcBNKJoqnhbb7CeETqXE2cQ6wiFW2JwBVk1AdAjdbta
  claimed   item 2 · tx 9SAwH2cqWdtnF7WYXpLTYNA5MdhgfMS38ukGfsprM9MY
  done      every item is paid
```

On the buyer's side, the buyer's agent tried to pay item 1 to `halcyon-markets.testnet` and was refused (`ERR_PAYEE_MISMATCH`, tx `6isvqWScYW7bzLfN7tRTjumYMCb8Q8Cpj8AU7CiixePQ`), then paid the proven payee. The first attempt, job 18, stopped at the negotiation: the app had sent the vendor 0.3 NEAR and a 300 TGas call needs about 0.301 on hand. The grant is now 1 NEAR.

`make tender` (from `platform/`) runs the whole thing from a fresh buyer to a refused redirect (job 1 → `a70.accord-v2.testnet` in `4:01`), and `make tender-sim` runs 20 scripted agents against 5 jobs with no LLM calls. Every other way to bid (agent skill, CLI, MCP, HTTP), the recorded runs and the board's limits in full: [`docs/tenders.md`](docs/tenders.md). The main limit: one party can bid under several keys and reveal only the price that wins; each unrevealed bid forfeits its 0.02 NEAR bond, which prices this but does not prevent it. The board had an internal adversarial review, not a third-party audit. Testnet only.

## Use from an agent

Everything here reads NEAR testnet with no account and no keys. The full list (funding quotes from other chains, preflight signals, the CLI): [`docs/use-from-an-agent.md`](docs/use-from-an-agent.md).

- **Check a payment before signing.** `GET https://accordweb-production.up.railway.app/app/api/check?agreement=a14.accord-v2.testnet&item=1&amount=0.01&recipient=halcyon-markets.testnet` answers `"verdict": "refuse"`, `ERR_PAYEE_MISMATCH`; with `recipient=halcyon-mm.testnet` it answers `"verdict": "pay"` (the live attack room; its state moves as visitors use it). A read-only simulation of the function `act` calls, at one block; the contract decides at the time of the real call.
- **Verify as JSON:** `curl -s https://accordweb-production.up.railway.app/app/api/verify/a82.accord-v2.testnet` returns the seven-check report (about 10 s). A non-agreement answers `404`.
- **MCP, hosted and keyless:** 9 read-only tools, two of them for open tenders, at `https://accordweb-production.up.railway.app/app/mcp` (streamable HTTP, any origin, 60 requests a minute per IP; described at [`/.well-known/mcp.json`](https://accordweb-production.up.railway.app/.well-known/mcp.json)):

```json
{ "mcpServers": { "accord": { "type": "http", "url": "https://accordweb-production.up.railway.app/app/mcp" } } }
```

- **SDK** (`@accord/sdk`, TypeScript on `near-api-js`; `pnpm install` builds it):

```ts
import { Accord, verify } from "@accord/sdk";
const accord = new Accord({ network: "testnet", factory: "accord-v2.testnet" });
const report = await verify(accord, "a82.accord-v2.testnet"); // { checks: [{ name, status, detail }], ok, partial, failed, notChecked }
```

The site also serves [/llms.txt](https://accordweb-production.up.railway.app/llms.txt) and [/facts.json](https://accordweb-production.up.railway.app/facts.json). The packages are not published to npm yet.

## The problem

Whose server do your agents meet on? When both companies bring an agent, each needs its limits to stay private while the outcome stays binding. The money step is where it breaks today: business email compromise alone cost `$3.05 billion` across `24,768` complaints in 2025 ([FBI IC3 2025 report](https://www.ic3.gov/AnnualReport/Reports/2025_IC3Report.pdf)). Agents read their instructions from the same inbox an attacker can write to. Accord puts the negotiation in an enclave and the payment rules in a contract, so a fooled agent can ask but cannot pay outside the terms.

The numbers behind it (payment fraud, vendor impersonation, key compromise, market makers), what Accord gives a team that runs swarms of agents, and who it changes things for: [`docs/impact.md`](docs/impact.md). Accord has no customers yet; it runs on NEAR testnet with test USDC and fictional companies (Northwind buying from Halcyon).

## How it works

Four parts, named the same in the app, the docs and the code. Two agreement types are built, `procurement` and `market-making`; four more are planned, not built.

| Part | What it does | Code |
| --- | --- | --- |
| Sealed Table | Two agents negotiate inside an OutLayer enclave from mandates sealed in each browser. Code checks every proposal against both mandates' hard limits. Only the terms, commitment hashes, a transcript hash and an attestation leave. | [`platform/jobs/sealed-table`](platform/jobs/sealed-table) |
| Agreement controls | One NEAR account per agreement, code pinned by hash, no full-access key. It holds the USDC escrow and runs `act`, the agent's only method. | [`platform/contracts/agreement`](platform/contracts/agreement) |
| Payee | The vendor proves its domain inside an enclave, its settlement authority approves the account, the buyer accepts it. A change needs all three again and a 24-hour delay in live mode; testnet agreements run in demo mode, where a change waits 120 s and a claim 120 s. | [`platform/jobs/payee`](platform/jobs/payee) |
| Evidence checks | A payment becomes eligible only when the agreed evidence is recorded: delivery accepted, or (market making) enough observations of the venue pass. | [`platform/jobs/observer`](platform/jobs/observer), [`platform/crates/accord-core`](platform/crates/accord-core) |

> The model never decides where money goes. The contract does. The worst a hijacked agent can do is make a payment you already approved, to the recipient you already accepted, when it falls due.

<p align="center">
  <a href="docs/diagrams/accord-architecture.excalidraw"><img src="docs/diagrams/accord-architecture.svg" alt="The big picture. Buyer, vendor and the vendor's settlement authority use the website and the deal-room app on Railway. The app creates agreements through the factory accord-v2.testnet and sends signed delegates through the relayer relay.accord-v2.testnet. Each agreement account a<n>.accord-v2.testnet holds escrowed test USDC, the approved terms, the recipient and the refusal log. OutLayer enclaves (Sealed Table, Payee, Observer) send signed terms, proofs and observations to the agreement; the Sealed Table calls NEAR AI Cloud, Payee reads the vendor's domain, the Observer reads Rhea on NEAR mainnet. The buyer's agent calls act(Pay); inside the terms the agreement pays the authorised recipient, anything else is refused and recorded." width="100%" /></a>
  <br/><sub>The big picture. Source: <a href="docs/diagrams/accord-architecture.excalidraw"><code>docs/diagrams/accord-architecture.excalidraw</code></a> (open it at excalidraw.com). The full design: <a href="platform/ARCHITECTURE.md"><code>platform/ARCHITECTURE.md</code></a>.</sub>
</p>

The relayer pays gas for the calls a visitor's wallet signs as NEP-366 delegates (Meteor and Intear send through it), and it carries only calls that attach at most 1 yoctoNEAR; the room's 2 NEAR deposit is signed and paid by the user's own wallet, in its own transaction. It never carries `act`: the contract identifies the agent by its signing key, and a relayer's key would replace it.

**The `act()` gates.** Authentication comes first (the signing key must be the current agent key or a recently revoked one; anything else panics with `ERR_UNAUTHORIZED` and is not recorded). Then six gates in a fixed order; the first failure is recorded and `act` returns `Refused{code}`. A refusal never panics, so it is on the record. Five refusals by the same key inside an hour revoke it automatically.

| Gate | Checks | Refusal codes |
| --- | --- | --- |
| 1. Key and state | The key is not revoked; state is `Executing` | `ERR_REVOKED`, `ERR_NOT_EXECUTING` |
| 2. Recipient | Not a canary (a canary also deletes the key); an active authorised recipient exists; the request names it | `ERR_CANARY`, `ERR_NO_RECIPIENT`, `ERR_PAYEE_MISMATCH` |
| 3. Item | The item exists and is unpaid | `ERR_UNKNOWN_ITEM`, `ERR_ALREADY_PAID` |
| 4. Evidence | Delivery accepted (or the window lapsed undisputed); for market making, the period closed `Eligible`; or an approved exception waives it | `ERR_NOT_DUE`, `ERR_PERIOD_WITHHELD` |
| 5. Amount | Equals the item amount (or its approved exception); stays within the total; the escrow covers it | `ERR_AMOUNT_MISMATCH`, `ERR_CAP_EXCEEDED`, `ERR_INSUFFICIENT_FUNDS` |
| 6. Lock | No payment in flight | `ERR_IN_FLIGHT` |

Source: [`platform/ARCHITECTURE.md`](platform/ARCHITECTURE.md) section 6.

The agreement lifecycle and one deal end to end (a6), as diagrams: [`docs/how-it-works.md`](docs/how-it-works.md).

## Run your own deal, step by step

Open [`/app/try-it`](https://accordweb-production.up.railway.app/app/try-it) (live since 9 Nov 2026; to run it locally, see [Run locally](#run-locally); the faucet, demo counterparty and demo agent need the `FAUCET_*`, `DEMO_*` and `RELAYER_*` variables named in [`platform/.env.example`](platform/.env.example)). Everything there is NEAR testnet with test USDC. The vendor in your room is Accord's demo vendor (`halcyon-demo.testnet`, authority `halcyon-auth.testnet`) and the agent is a demo agent run by Accord for test rooms; both are labelled in the room. Amounts differ from room to room: they are what the negotiation produced.

| # | Do | See |
| --- | --- | --- |
| 1 | **Try without a wallet**, or **Connect a wallet** (a NEAR testnet wallet such as Meteor or Intear). Without a wallet, the page makes a throwaway testnet key in this tab (sessionStorage only, never sent to the server, gone when the tab closes), and steps 2 and 3 run on their own | `01` marked done, with your account; for the throwaway key, its implicit account labelled `Throwaway testnet key` |
| 2 | **Get test funds** (once a day per account, up to 30 accounts per connection a day, within a daily budget; if the faucet refuses, the step offers Watch the replay, the Live attack room and Verify) | `0.00 NEAR` becomes `2.35 NEAR · 100.00 tUSDC`, both faucet transactions linked |
| 3 | **Create the room** | `Your room is a8.accord-v2.testnet: My first deal room.` (your number will differ) |
| 4 | **Seal your mandate** with the Northwind preset (`40` tUSDC ceiling, 2 to 4 items) | In the Demo counterparty panel: `Sealed the vendor's mandate (Halcyon procurement preset)`, then `Started the negotiation in the Sealed Table`; the state moves `Sealed` to `Attested` |
| 5a | In your room, **approve the terms**, **fund** the escrow, **accept the recipient**, then **accept delivery 1** as the counterparty acts | `Approved the terms as the vendor`, `Proposed halcyon-mm.testnet as the recipient on useaccord.tech`, `Submitted delivery for item 1` |
| 5b | **Start the demo agent** (your wallet or throwaway key signs `install_agent_key`). Then wait: the agent pays the accepted item on its own, with no click, within about 2 minutes | The agent bar and the Activity tab: `Paid item 1: 16.50 tUSDC to halcyon-mm.testnet.` with the `act` transaction (`payment_sent`) |
| 5c | **Ask the agent to pay a new account** | `ERR_PAYEE_MISMATCH` and `Asked to pay … to halcyon-markets.testnet. The contract refused it and recorded the refusal.` |
| 5d | **Hold to revoke** in the room header | `Agent revoked · next call rejected by the network` |
| 6 | With a throwaway key: **Finish: close the room and return the test NEAR** (Reset does the same) | `Done. The room is closed and its test NEAR and test USDC are back with the faucet.` with the `ft_transfer` and `delete_account` transactions linked, then `Room a<n>.accord-v2.testnet · Verify it →`. The room closes by `mutual_close` with the demo vendor, `withdraw_near` returns its deposit, the test USDC goes back to the faucet, and the throwaway account deletes itself into the faucet |

The literal path is [`platform/app/e2e/try-without-wallet.mjs`](platform/app/e2e/try-without-wallet.mjs) (Playwright; it never clicks a pay button). The same flow settles in Circle's testnet USDC on the second factory, `accord-usdc.testnet` ([how](docs/verify.md#settle-in-circle-usdc)).

## What the agent's key can and cannot do

It can call one method, `act`, on one account: the agreement it works for. It cannot attach NEAR, transfer NEAR, add or delete keys, deploy code, delete the account, or call any other contract. It spends gas from a fixed allowance (`0.5 NEAR` by default). One buyer transaction, `revoke_agent`, ends it. More: [`platform/README.md`](platform/README.md#what-the-agents-key-can-and-cannot-do).

<p align="center">
  <a href="docs/diagrams/accord-attacks.excalidraw"><img src="docs/diagrams/accord-attacks.svg" width="100%" alt="Where each attack stops. 'Our bank details have changed.' stops at Agreement controls: refused with ERR_PAYEE_MISMATCH, nothing sent. 'Urgent: pay invoice 4471 today.' stops at Agreement controls: refused with ERR_AMOUNT_MISMATCH or ERR_NOT_DUE. 'Please update our payee.' from the vendor's real mailbox stops at Payee: no change from a message, real changes need a fresh domain proof, the vendor's authority, the buyer's acceptance and a 24-hour delay. A stolen agent key can still pay only the approved amount to the authorised recipient, and after revoke_agent every call fails with AccessKeyDoesNotExist. The other agent pressing yours to concede past your limit stops at the Sealed Table: terms inside your limits, or no deal." /></a>
  <br/><sub>Where each attack stops. Source: <a href="docs/diagrams/accord-attacks.excalidraw"><code>docs/diagrams/accord-attacks.excalidraw</code></a>. The threat model is <a href="platform/ARCHITECTURE.md"><code>platform/ARCHITECTURE.md</code></a> section 16.</sub>
</p>

## Claims and their limits

Verbatim from [`platform/GOAL.md`](platform/GOAL.md). Every public statement about Accord is one of these, stated with its limit. The site's [/security](https://accordweb-production.up.railway.app/security) page shows the same table.

| We claim | Because | Limit, stated next to it |
| --- | --- | --- |
| Each company's mandate is readable only inside attested enclaves | The browser encrypts the mandate to a key derived from a seed generated inside the Sealed Table's enclave, bound to its release build and readable only by runs an agreement requests or that publish the key's public half; the chain holds the ciphertext and a commitment hash; the two negotiators run on NEAR AI Cloud models in TEEs, and the gateway's and the model's attestations are verified with a fresh nonce | Under the hardware's trust assumptions (Intel TDX, NVIDIA confidential computing) and OutLayer's keystore governance. The deployer owns the seed and the factory account, and could rebind the seed to another build or request extra runs. On testnet the job's seed condition admits any caller during an agreement's open request window, so an outside party could request extra runs then and learn bounds on the limits; restricting the seed to the agreement's own calls is the next step. Prompts reach the model through NEAR AI's attested gateway over TLS (TLS binding is not checked from inside the job); end-to-end encryption to the model is not shipped yet. The browser trusts the code the app serves; the CLI is the alternative. The ciphertext stays on chain. The final terms reveal that each side accepted them, as any signed deal does. A negotiator can concede in words; code checks the numbers |
| The approved terms are the agent's only authority | The agent's only key is a function-call key on the agreement's own account that can call `act` and nothing else; `act` refuses any payment whose item, evidence, amount or recipient differs from the terms both companies approved | The agent's judgement is bounded, not protected: it can still be fooled into asking. Attestation proves which code produced the terms, not that the deal was good; people decide that when they approve. The buyer can also approve an exception its agent requests, including a lower amount for an item; the vendor is not asked |
| Payments go only to the authorised recipient | The recipient is a NEAR account listed in a file on the vendor's domain, fetched inside an enclave; the vendor's settlement authority approves it on chain and the buyer accepts it; a change needs all three again and a 24-hour delay | Authorisation proves control of the domain and the authority's approval, not that the company legally exists. A legal KYB check is a later integration. Testnet agreements run in demo mode: a recipient change waits 120 s and a claim 120 s; live mode enforces at least 24 h for a recipient change and 72 h for a claim, checked by the factory and again by the agreement |
| Revoking ends the agent's authority in one transaction | `revoke_agent` marks the agent's key revoked, so the contract refuses it from that receipt on, and deletes it from the agreement account in the same transaction; the account has no other key, so after the deletion lands (about one block) anything the agent signs is rejected by the network before it reaches the contract | A payment already made stays made, and it went to the authorised recipient at the approved amount. A call that reached the chain before the revoke still runs, with every check. Revoking never cancels what the vendor has earned: an eligible payment stays claimable by the vendor, unless the buyer approves an exception that lowers it |
| Negotiation is private; settlement is public | Mandates and the transcript stay inside enclaves; only the terms, commitment hashes, a transcript hash and attestation references leave; the commercial terms document is encrypted to the two parties | The enforced schedule (amounts, dates, recipient) and every payment are public on NEAR, as with any stablecoin payment |
| A market-making agreement's payment becomes eligible only when the agreed observations pass, unless the buyer approves an exception | Each slot's time is drawn inside the observer's enclave from a seed generated there; the observation is taken at the first NEAR mainnet block after that time, signed by the observer's key, and checked by the contract against the agreed spread, depth and two-sided quoting; anyone can recompute it from an archival node | A market-making agreement's observer measures the venue's liquidity, not the market maker's own orders. The deployer owns the observer's seed and could rebind it to a build that reveals slot times in advance. A slot nobody polls in time counts as unobserved, and a period that unobserved slots leave undecided, or that has conflicting observations, goes to the buyer, not to payment |
| On an open tender, each price stays sealed until bidding closes and it is revealed, the lowest valid price wins, and the winner's key becomes the vendor of an ordinary Accord agreement | The tender board stores only a sha256 commitment of each price, and accepts a bid only with the bidder's own ed25519 signature, checked on chain; a reveal must open that commitment; the award is computed on chain by a rule anyone can call; the buyer's link to the agreement is stored only if the factory confirms a procurement agreement with that buyer and the winner's key as vendor | One party can bid under several keys and reveal only the price that wins after seeing the others; each unrevealed bid forfeits its 0.02 NEAR bond to the buyer, which puts a price on this but does not prevent it, and anyone can fill a job's 32 slots for 32 bonds. Every bid sent from the browser, the CLI or tender-bid.mjs also carries its price timelocked to the drand round after bidding closes (a bid sent on chain directly can attach one), so Accord's keeper can reveal it for a bidder who is away; this relies on drand's threshold network not publishing that round early. The board (`tender-v2.accord-v2.testnet`, no access key) had an internal adversarial review, not the security review of the agreement contracts. The winning bid sets the vendor's sealed floor; the terms are still negotiated in the Sealed Table and approved by both companies. The link checks buyer, vendor and kind, not that the agreement's total or token match the winning bid. Testnet only |

Custody per piece and the privacy boundary: [`platform/README.md`](platform/README.md#custody-per-piece).

### What we keep

The app's server never sees a mandate and no route accepts one ([`platform/app/tests/no-mandate-routes.test.ts`](platform/app/tests/no-mandate-routes.test.ts) fails if one does). It stores only the `/try` inbox (with a salted daily hash of the visitor, never the IP address), the buyer's signed approvals of warned recipients, demo-domain registrations, the `/try` rooms, the faucet's per-account grants and daily balance, and service heartbeats; see [`platform/app/src/server/README.md`](platform/app/src/server/README.md). The Sealed Table holds a mandate's plaintext only in memory during its run.

## Security review

An internal security review, not a third-party audit: five AI-assisted passes on separate code areas, every finding reproduced as a test. It found 1 High (a close-refund drain, fixed) and 5 Medium issues, plus 13 Low items; severities are self-assigned, and the fixes are live as release 4 on both factories. Release 3 agreements (a6, a8, a1.accord-usdc.testnet) keep the old code by hash. Scope, findings and CI: [`docs/security-review.md`](docs/security-review.md) and [`platform/DECISIONS.md`](platform/DECISIONS.md) section 25. Mainnet follows an external audit, which has not happened yet. How each hackathon track's requirements are shown, and the NEAR tools used or not: [`docs/tracks.md`](docs/tracks.md).

## Traction

Counted from chain by `cd platform && make usage` (view calls only, no keys, about 30 s), 13 Nov 2026:

| What | Count |
| --- | --- |
| Agreements, each its own NEAR account | `85` on two factories (`79` procurement, `6` market-making), releases 1 to 5 (`32` on release 5) |
| Opened from a key made in the browser (`/app/try-it`, no wallet) | `54` |
| Payments made by an agent's key under the contract | `61` |
| Payments refused by the contract, on the record | `47`, in `36` agreements |
| Tender jobs posted, sealed bids (revealed), distinct agent keys | `22`, `77` (`66`), `30`; `3` jobs linked to an agreement |

Most of this activity is ours: building, `make demo`, `make tender` and our own runs of the public bid script, the CLI and the browser. Every tender won outside the house keeper (8 jobs) was won by an agent we ran, and jobs 15, 17, 18 and 20 were test runs. The try-it flow has no sign-up, so our runs, reviewers' agents and outside visitors cannot be told apart, and none are counted as users. No customers, letters of intent, pilots or revenue yet, and no outside developer has bid on a tender.

**Business model (hypothesis).** Free on testnet. Never a percentage of payments: Accord charges per agreement (planned `$1,000` a month per market-making agreement, `$25` per procurement agreement, a vendor's first recipient proof free then `$10`; tenders and verifying free). The fee is not collected on chain yet. Reasoning, costs, first market, next milestones and sustainability: [`docs/business.md`](docs/business.md).

## Repository map

```
.
├── apps/web/                 the website (Vite + React, prerendered); serves /app by proxy
├── platform/                 the product (pnpm + Cargo workspace); its own README
│   ├── app/                  the deal-room app (Next.js, basePath /app)
│   ├── contracts/            agreement, factory, tender-board, releases (keyless), test-token
│   ├── crates/               accord-core (pure rules, the six gates), accord-jobkit, accord-venue
│   ├── jobs/                 sealed-table, payee, observer (OutLayer, wasm32-wasip2)
│   ├── packages/             sdk, cli, mcp, live (the make targets), store
│   ├── services/             agent (demo agent, /try re-arm, tender house keeper), keeper
│   └── *.md                  GOAL, ARCHITECTURE, INTERFACES, DECISIONS, DEPLOY, CHANGELOG
├── docs/                     runs.md (every testnet run), verify, tenders, how-it-works, impact, business, tracks
├── skills/accord-tender/     an agent skill for bidding on open tenders
└── AGENTS.md, CLAUDE.md      notes for evaluating agents
```

## Run locally

**The website** (Node `22`, `.nvmrc`): `npm ci`, then `npm run dev` (Vite on http://localhost:5180), `npm run check` (typecheck, `check-copy: clean`, the reference check), `npm run build` (into `apps/web/dist`) and `npm start` (`serve.mjs` on `$PORT`, default `5180`, with `/healthz`; `APP_ORIGIN=http://localhost:3100 npm start` proxies `/app` to a local app).

**The app and the contracts** need Node `>=22`, pnpm `10.30.2` (`corepack enable`), and for contracts and jobs the Rust toolchain in `platform/rust-toolchain.toml` (`1.97.0`, with `wasm32-unknown-unknown` and `wasm32-wasip2`). `make setup-check` lists each tool with its version and `ok`, or the install command. From `platform/`, after `corepack enable && pnpm install`:

| Do | See |
| --- | --- |
| `pnpm --filter @accord/app dev` | The app at http://localhost:3100/app, reading testnet (`accord-v2.testnet` by default) |
| `make dev` | A local NEAR node with the real contracts, the three jobs' own code run natively (only the model is replaced, labelled `model.local`), a faucet, the keeper, the demo agent and the app |
| `make sandbox` | The full procurement flow and one market-making period on a local sandbox, mocked steps marked `[mock]`, ending `sandbox: all checks passed` |
| `make test` | `cargo test` for the workspace, then the package, service and app tests |
| `pnpm -r typecheck && pnpm -r test` | The TypeScript typecheck and tests alone, no Rust needed |
| `make attack NET=local` | `ERR_PAYEE_MISMATCH`, `ERR_AMOUNT_MISMATCH`, `ERR_CANARY` with the key revoked and deleted, then `AccessKeyDoesNotExist`, and `0.00 USDC moved by attempts` |
| `make demo NET=local` | The whole loop from fresh accounts (14 s on 3 Nov 2026) |
| `make market-making` | Two market-making agreements observed at real mainnet blocks of Rhea's USDC/wNEAR pool: one period `Eligible` and paid, the stricter one `Withheld` and refused `ERR_PERIOD_WITHHELD` (testnet: `a56`, `a57`; `NET=local` runs it on a local node) |

Every live target (`negotiate`, `approve`, `fund`, `payee`, `pay`, `attack`, `revoke`, `claim`, `exception`, `payee-change`, `market-making`, `demo`, `inbox`) runs against testnet without `NET=local`, using the accounts and keys named in `platform/.env.example`. Their printed lines are in [`platform/INTERFACES.md`](platform/INTERFACES.md) section 10; recorded outputs are in [`platform/README.md`](platform/README.md).

**Deployment**: two Railway services from this repository, one public address. The website builds from the root [`Dockerfile`](Dockerfile) ([`railway.json`](railway.json), health `/healthz`); the app from [`platform/Dockerfile`](platform/Dockerfile) ([`platform/railway.json`](platform/railway.json), health `/app/api/status`). The website's `APP_ORIGIN` points at the app and `serve.mjs` forwards `/app/*` to it. Variables and steps: [`platform/DEPLOY.md`](platform/DEPLOY.md). No key is built into either image.

## How NEAR is used

| | Used for | Where |
| --- | --- | --- |
| Function-call access keys | The agent's only key: `act` on its own agreement account, installed and deleted by the contract | [`contracts/agreement/src/payments.rs`](platform/contracts/agreement/src/payments.rs) |
| Global contracts used by code hash (NEP-591) and one sub-account per agreement | One account per agreement, no `AddKey`, code fixed by hash | [`contracts/factory/src/lib.rs`](platform/contracts/factory/src/lib.rs) |
| NEP-141, NEP-145 | USDC escrow by `ft_transfer_call`, payments by `ft_transfer` under a payment lock | [`contracts/agreement/src/payments.rs`](platform/contracts/agreement/src/payments.rs) |
| NEP-297 events | Every refusal, payment, observation and approval on the record | [`contracts/agreement/src/events.rs`](platform/contracts/agreement/src/events.rs) |
| NEP-413, NEP-366 | Signed messages for document keys and sessions; relayed delegates for wallet calls (never `act`) | [`packages/sdk/src/sealing.ts`](platform/packages/sdk/src/sealing.ts), [`app/src/server/relay.ts`](platform/app/src/server/relay.ts) |
| Rhea | The USDC/wNEAR pool the market-making observer reads, read only | [`platform/jobs/observer`](platform/jobs/observer) |

Libraries: near-sdk `5.30.0`, near-contract-standards `5.30.0`, near-api-js `7.3.1`, eciesjs, canonicalize, @noble, Next.js `16`, HOT Connect (`@hot-labs/near-connect`), the MCP TypeScript SDK; the website on React `19` and Vite `7`. No template. No partnership is claimed. AI code (Q-005): the code, tests and docs were written with AI coding assistants (Claude Code) under the author's direction, and the security review above used AI-assisted passes.

Built during NEAR HACKATHON: this repository started on 30 Oct 2026 (first commit `c15c05e`), inside the window, which the rules open on 19 Oct 2026, the announcement (HACKATHON.md Q-001). The platform (contracts, jobs, SDK, CLI, MCP, app and services) was built from 31 Oct 2026 in a separate repository, 94 commits from `5476961` ("feat(core): types, six payment gates…", 31 Oct) to 8 Nov, and brought into this repository in one commit on 8 Nov 2026 (`2f6981a`). That history is published unchanged on the [`platform-history`](https://github.com/Adityaakr/accord/commits/platform-history) branch (last commit `37ba6c9`); every commit since the import is on `main`. Nothing predates the window, and no earlier project is reused. Development closes 14 Nov 2026. Licence: [MIT](LICENSE).
