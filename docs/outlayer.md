# The OutLayer dependency

Two steps of an agreement run as jobs on [OutLayer](https://outlayer.ai)'s testnet enclave worker (the contract [`outlayer.testnet`](https://testnet.nearblocks.io/address/outlayer.testnet)): the negotiation (the Sealed Table) and the
recipient proof (the Payee job). Accord has one enclave provider and no second path. This page says what that means, what
the app does about it, and why the remaining limit is not something a patch removes. Detail and every transaction:
[`platform/DECISIONS.md`](../platform/DECISIONS.md) sections 36 (the slow queue, 14 Nov 2026) and 38 (OutLayer's price for a stored answer, 22 Nov 2026).

## The limit, in numbers

- A NEAR contract waits for an answer inside one yield ([NEP-519, Yield Execution](https://github.com/near/NEPs/blob/master/neps/nep-0519.md)): about `200` blocks, about `116 s` on testnet.
- The Sealed Table runs for about `55 s` once a worker picks it up (`41` to `64 s` from request to answer on a quiet
  queue), which leaves about a minute for the worker to pick the request up.
- An agreement has `3` negotiation attempts. An answer that arrives after the yield counts as a failed attempt, and three
  of them end the room as `No deal` with nothing funded.

The worker is shared with other projects. When their requests are queued ahead, ours is answered late.

An attempt also fails when OutLayer answers in time with an error. The contract cannot tell the two apart: OutLayer
returns `null` to it for a failed run and for a run answered after the yield alike. Its own log line in the attempt's
transaction can: `Execution failed: "<error>"` for an error, `Execution promise failed` for an answer that came too late.

## What we saw on 14 Nov 2026

| When (UTC) | Agreement | What happened |
| --- | --- | --- |
| from 12:10 | [`a85`](https://testnet.nearblocks.io/address/a85.accord-v2.testnet), [`a86`](https://testnet.nearblocks.io/address/a86.accord-v2.testnet), [`a87`](https://testnet.nearblocks.io/address/a87.accord-v2.testnet), [`a88`](https://testnet.nearblocks.io/address/a88.accord-v2.testnet) | All ended `NoDeal`: every attempt came back after the yield. One request (`45013`) was answered `359 s` after it was made |
| 14:59 | [`a90.accord-v2.testnet`](https://accordweb-production.up.railway.app/app/verify/a90.accord-v2.testnet) | Held by the guard, then `Attested` on its first attempt, `212 s` after both sides sealed |
| 19:35 | [`a96.accord-v2.testnet`](https://accordweb-production.up.railway.app/app/verify/a96.accord-v2.testnet) | Queue empty: `Attested` in `69 s`, first attempt |
| 19:41 | [`a97.accord-v2.testnet`](https://accordweb-production.up.railway.app/app/verify/a97.accord-v2.testnet) | The wallet-free flow on the hosted app: held for about `16` minutes, then negotiated and ran to `Settled` (`make verify DEAL=a97.accord-v2.testnet` prints `verify: 7 checks ok`; [how to verify](verify.md)) |

Between 19:43 and 20:14 UTC the queue read slow in most of the readings we took: `5` to `12` of its newest requests unanswered in a row,
the oldest `54` to `117 s` old. The accounts whose requests were waiting included [`maskbid.testnet`](https://testnet.nearblocks.io/address/maskbid.testnet),
[`tredio-oracle.testnet`](https://testnet.nearblocks.io/address/tredio-oracle.testnet), [`enclave.parry.testnet`](https://testnet.nearblocks.io/address/enclave.parry.testnet), [`veil-clouds.testnet`](https://testnet.nearblocks.io/address/veil-clouds.testnet), [`drizzle-replay.testnet`](https://testnet.nearblocks.io/address/drizzle-replay.testnet),
[`lowball-house-ck.testnet`](https://testnet.nearblocks.io/address/lowball-house-ck.testnet) and [`sentinel.v1.lien-13569.testnet`](https://testnet.nearblocks.io/address/sentinel.v1.lien-13569.testnet). None of them is Accord's. They are named because anyone
can check them: they were waiting on the same worker, they are not its cause.

## What we saw on 22 Nov 2026

Every new negotiation on release 6 ended `No deal`, and OutLayer was not slow: it answered each attempt in `35` to `50 s`
with an error. Between 16 and 22 Nov 2026 OutLayer began holding NEAR, at NEAR's storage price of `0.00001` NEAR a byte,
for any job output of `1024` bytes or more until the request settles, and release 6 attached `0.05` NEAR per run. On
[`a102.accord-v2.testnet`](https://testnet.nearblocks.io/address/a102.accord-v2.testnet) (the wallet-free flow on the hosted app) and [`a103.accord-v2.testnet`](https://testnet.nearblocks.io/address/a103.accord-v2.testnet) (`make negotiate`) all six attempts logged
`Execution failed: "output_storage_unpaid: the output is 7043 bytes and needs 70430000000000000000000 yoctoNEAR held
for its storage; the payment had 44702776900000000000000 left after the run's cost. ..."` ([`4FqBXLF8…`](https://testnet.nearblocks.io/txns/4FqBXLF85jhX47wuq5phhLMtgp6Cb68jADNNcSTdaits)). The app
said the enclave had answered late, and its demo panel that the limits did not overlap: neither was true.

**Release 7** (23 Nov 2026, current on both factories) attaches OutLayer's worst-case cost for the run's limits plus the
storage of the largest answer the contract reads (`16` KiB), with a quarter on top: about `0.22` NEAR per Sealed Table or
Payee run. The unused part is refunded, so the margin costs nothing. `make check-deploy` holds those deposits against
OutLayer's live `estimate_execution_cost` view, so a further price rise fails the release check, not the next room.
Rooms created before release 7 keep their release and their old deposit. On release 7 the wallet-free flow on the hosted
app ran to `Settled` ([`a106.accord-v2.testnet`](https://useaccord.tech/app/verify/a106.accord-v2.testnet), `make verify` prints `verify: 7 checks ok`).

The same week OutLayer took the worker build that had run releases 3 to 6's key runs off its approved list on
[`worker.outlayer.testnet`](https://testnet.nearblocks.io/address/worker.outlayer.testnet), so `outlayer-verify` fails their identity layer while the Intel quote still verifies.
`make verify` reads the approved list again at each run's own block and reports such a run as `not checked`
(`worker build no longer approved; quote valid`), not `failed`; release 7's key runs ran on the current build and are
proven.

## What the app does

- **It reads the queue before it starts.** `tableQueue` ([`platform/packages/sdk/src/outlayer.ts`](../platform/packages/sdk/src/outlayer.ts)) reads OutLayer's
  unanswered requests with view calls, no key. The worker counts as slow when its newest `3` or more requests in a row
  are all unanswered and the oldest of them was made `45 s` ago or more.
- **It holds instead of spending an attempt.** Everything of ours that starts a negotiation (the keeper, the demo
  vendor, a tender winner's browser and CLI, `make negotiate`, `make demo`) waits while the queue is slow, for `15`
  minutes at most. The recipient proposal is held the same way.
- **It says so, in red, with the evidence.** While the queue reads slow, [`/app/try-it`](https://accordweb-production.up.railway.app/app/try-it) and a room's Negotiation tab show
  `OutLayer is slow and having problems right now`, the measured numbers, and the accounts waiting on the same worker,
  each read live from [`outlayer.testnet`](https://testnet.nearblocks.io/address/outlayer.testnet) and linked to the explorer. The notice goes when the queue clears.
- **It names the cause of a `No deal`.** A room, its demo panel, and the notice on `/app/try-it` and the tender pages
  read OutLayer's own log line in each attempt's transaction ([`platform/app/src/lib/nodeal.ts`](../platform/app/src/lib/nodeal.ts)) and say which it was:
  an error OutLayer returned (quoted), an answer after the yield, or an answer the contract refused. When the
  transactions cannot be read they say only that no signed answer arrived.

<img src="media/outlayer-slow-try-it.png" width="820" alt="The hosted /app/try-it page on 14 Nov 2026 at 21:05 UTC. A red notice reads: OutLayer is slow and having problems right now. None of its newest 7 requests is answered, and the oldest of them was made 45 s ago; a negotiation has about 116 s in all. Below it: waiting on the same shared worker right now, read from outlayer.testnet: pwnbounty-d1c276.testnet, nixo.testnet, enclave.parry.testnet, drizzle-replay.testnet, veil-clouds.testnet. None of these accounts is Accord's: their requests are unanswered too.">

The hosted `/app/try-it` on 14 Nov 2026 at 21:05 UTC, captured as served: `7` requests unanswered in a row, the oldest
`45 s` old, and the five accounts they belonged to at that moment: [`pwnbounty-d1c276.testnet`](https://testnet.nearblocks.io/address/pwnbounty-d1c276.testnet), [`nixo.testnet`](https://testnet.nearblocks.io/address/nixo.testnet), [`enclave.parry.testnet`](https://testnet.nearblocks.io/address/enclave.parry.testnet), [`drizzle-replay.testnet`](https://testnet.nearblocks.io/address/drizzle-replay.testnet), [`veil-clouds.testnet`](https://testnet.nearblocks.io/address/veil-clouds.testnet).

## Check the queue yourself

No account and no keys: `get_stats` on [`outlayer.testnet`](https://testnet.nearblocks.io/address/outlayer.testnet) returns the count of finished requests, and the unanswered
ones sit at ids from that count upwards. `get_request` on one of them returns its `sender_id` and the `timestamp` it was
made at; an id that has been answered, or whose yield has ended, returns `null`. The hosted app serves the same reading
as JSON: [`GET /app/api/table-queue`](https://accordweb-production.up.railway.app/app/api/table-queue).

## Why this is structural, not a bug

- **NEAR fixes the wait** at about `200` blocks ([NEP-519](https://github.com/near/NEPs/blob/master/neps/nep-0519.md)). A contract cannot lengthen it.
- **A late answer could be accepted in a separate transaction**, since the enclave signs its result. That path exists in
  the agreement contract (`submit_sealed_result`, fallback F1 in [`platform/contracts/agreement/src/negotiation.rs`](../platform/contracts/agreement/src/negotiation.rs)) and is
  deliberately compiled out of every release: with OutLayer's seed restriction (S1) not set, a keeper could request its
  own run for the live nonce and submit whichever signed outcome it prefers. `make check-deploy` refuses a release wasm
  that carries it. Enabling it safely needs that OutLayer setting and a new agreement release.
- **There is no second enclave provider wired in.** A long [OutLayer](https://outlayer.ai) outage still ends a room as `No deal`.

## What needs no new negotiation

[The replay](https://accordweb-production.up.railway.app/app/replay), [the live attack room](https://accordweb-production.up.railway.app/app/try), [`/verify`](https://accordweb-production.up.railway.app/verify) and [`make verify`](verify.md) read agreements that are
already past negotiation, so they work whatever OutLayer's queue looks like.
