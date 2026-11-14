# The OutLayer dependency

Two steps of an agreement run as jobs on [OutLayer](https://outlayer.ai)'s testnet enclave worker (the contract [`outlayer.testnet`](https://testnet.nearblocks.io/address/outlayer.testnet)): the negotiation (the Sealed Table) and the
recipient proof (the Payee job). Accord has one enclave provider and no second path. This page says what that means, what
the app does about it, and why the remaining limit is not something a patch removes. Detail and every transaction:
[`platform/DECISIONS.md`](../platform/DECISIONS.md) section 36.

## The limit, in numbers

- A NEAR contract waits for an answer inside one yield ([NEP-519, Yield Execution](https://github.com/near/NEPs/blob/master/neps/nep-0519.md)): about `200` blocks, about `116 s` on testnet.
- The Sealed Table runs for about `55 s` once a worker picks it up (`41` to `64 s` from request to answer on a quiet
  queue), which leaves about a minute for the worker to pick the request up.
- An agreement has `3` negotiation attempts. An answer that arrives after the yield counts as a failed attempt, and three
  of them end the room as `No deal` with nothing funded.

The worker is shared with other projects. When their requests are queued ahead, ours is answered late.

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
