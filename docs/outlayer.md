# The OutLayer dependency

Two steps of an agreement run as jobs on OutLayer's testnet enclave worker: the negotiation (the Sealed Table) and the
recipient proof (the Payee job). Accord has one enclave provider and no second path. This page says what that means, what
the app does about it, and why the remaining limit is not something a patch removes. Detail and every transaction:
[`platform/DECISIONS.md`](../platform/DECISIONS.md) section 36.

## The limit, in numbers

- A NEAR contract waits for an answer inside one yield: about `200` blocks, about `116 s` on testnet.
- The Sealed Table runs for about `55 s` once a worker picks it up (`41` to `64 s` from request to answer on a quiet
  queue), which leaves about a minute for the worker to pick the request up.
- An agreement has `3` negotiation attempts. An answer that arrives after the yield counts as a failed attempt, and three
  of them end the room as `No deal` with nothing funded.

The worker is shared with other projects. When their requests are queued ahead, ours is answered late.

## What we saw on 14 Nov 2026

| When (UTC) | Agreement | What happened |
| --- | --- | --- |
| from 12:10 | `a85` to `a88.accord-v2.testnet` | All ended `NoDeal`: every attempt came back after the yield. One request (`45013`) was answered `359 s` after it was made |
| 14:59 | `a90.accord-v2.testnet` | Held by the guard, then `Attested` on its first attempt, `212 s` after both sides sealed |
| 19:35 | `a96.accord-v2.testnet` | Queue empty: `Attested` in `69 s`, first attempt |
| 19:41 | `a97.accord-v2.testnet` | The wallet-free flow on the hosted app: held for about `16` minutes, then negotiated and ran to `Settled` (`make verify DEAL=a97.accord-v2.testnet` prints `verify: 7 checks ok`) |

Between 19:43 and 20:14 UTC the queue read slow in most of the readings we took: `5` to `12` of its newest requests unanswered in a row,
the oldest `54` to `117 s` old. The accounts whose requests were waiting included `maskbid.testnet`,
`tredio-oracle.testnet`, `enclave.parry.testnet`, `veil-clouds.testnet`, `drizzle-replay.testnet`,
`lowball-house-ck.testnet` and `sentinel.v1.lien-13569.testnet`. None of them is Accord's. They are named because anyone
can check them: they were waiting on the same worker, they are not its cause.

## What the app does

- **It reads the queue before it starts.** `tableQueue` (`platform/packages/sdk/src/outlayer.ts`) reads OutLayer's
  unanswered requests with view calls, no key. The worker counts as slow when its newest `3` or more requests in a row
  are all unanswered and the oldest of them was made `45 s` ago or more.
- **It holds instead of spending an attempt.** Everything of ours that starts a negotiation (the keeper, the demo
  vendor, a tender winner's browser and CLI, `make negotiate`, `make demo`) waits while the queue is slow, for `15`
  minutes at most. The recipient proposal is held the same way.
- **It says so, in red, with the evidence.** While the queue reads slow, `/app/try-it` and a room's Negotiation tab show
  `OutLayer is slow and having problems right now`, the measured numbers, and the accounts waiting on the same worker,
  each read live from `outlayer.testnet` and linked to the explorer. The notice goes when the queue clears.

<!-- screenshot -->

## Check the queue yourself

No account and no keys: `get_stats` on `outlayer.testnet` returns the count of finished requests, and the unanswered
ones sit at ids from that count upwards. `get_request` on one of them returns its `sender_id` and the `timestamp` it was
made at; an id that has been answered, or whose yield has ended, returns `null`. The hosted app serves the same reading
as JSON: `GET https://accordweb-production.up.railway.app/app/api/table-queue`.

## Why this is structural, not a bug

- **NEAR fixes the wait** at about `200` blocks. A contract cannot lengthen it.
- **A late answer could be accepted in a separate transaction**, since the enclave signs its result. That path exists in
  the agreement contract (`submit_sealed_result`, fallback F1 in `platform/contracts/agreement/src/negotiation.rs`) and is
  deliberately compiled out of every release: with OutLayer's seed restriction (S1) not set, a keeper could request its
  own run for the live nonce and submit whichever signed outcome it prefers. `make check-deploy` refuses a release wasm
  that carries it. Enabling it safely needs that OutLayer setting and a new agreement release.
- **There is no second enclave provider wired in.** A long OutLayer outage still ends a room as `No deal`.

## What needs no new negotiation

The replay (`/app/replay`), the live attack room (`/app/try`), `/verify` and `make verify` read agreements that are
already past negotiation, so they work whatever OutLayer's queue looks like.
