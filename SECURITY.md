# Security policy

Accord runs on NEAR testnet. There is no mainnet deployment and no third-party audit yet; mainnet follows an external audit.

An internal security review ran on 9 Nov 2026: five AI-assisted review passes, each on a separate code area (the payment path; authorisation and keys; creation and code integrity; funds; the enclave jobs), with every finding re-checked by separate AI review passes that reproduced it as a test. It is not a third-party audit, and its severities are self-assigned. Each fix landed together with a failing test that it makes pass. It found 1 High, 5 Medium (one of them Medium-Low) and 4 groups of Low findings (13 individual items); the contract and factory fixes are release 4 on both testnet factories, and agreements created before release 4 keep release 3's code. Every finding, fix, test and commit, and the limits that remain: [`platform/DECISIONS.md`](platform/DECISIONS.md) sections 25 and 26.

Scope: the review covered the contracts, the factory and the enclave jobs. The app server, the relayer and the demo endpoints were outside it; the relayer deposit issue ([`platform/DECISIONS.md`](platform/DECISIONS.md) 27) was found later by a live run on the public URL and fixed the same day.

## Reporting a vulnerability

Please report privately. Open a private security advisory (**Security → Advisories → Report a vulnerability**) if it is enabled on this repository; otherwise contact the maintainer through the GitHub profile [github.com/Adityaakr](https://github.com/Adityaakr) and ask for a private channel. Do not open a public issue.

Include what you found, how to reproduce it and what an attacker could do with it. We aim to acknowledge reports within three working days.

## Scope

- The agreement contract, the enclave jobs (negotiation, payee verification, observation) and the agent, as specified in `platform/GOAL.md` and built in `platform/`.
- The website in `apps/web`, including its forms and any endpoint it calls.

### Open demo endpoints (by design)

The testnet demo has endpoints that take no session. The two counterparty endpoints are same-origin JSON only, rate-limited per client and per room, and act only in rooms opened against Accord's demo vendor:

- `POST /app/api/demo-counterparty/step`: Accord's demo vendor and its authority make their next valid move in the room (seal, start the negotiation, approve, propose and activate the recipient, deliver). It reads the room from chain each time, so a repeat does nothing twice, and the contract checks every call. Past 15 s it answers `pending` while the move finishes.
- `POST /app/api/demo-counterparty/close`: the demo vendor joins an early close only after the room's buyer asked for it on chain (`mutual_close`).
- `POST /app/api/inbox`: a message into the demo agent's inbox for the public `/try` room, rate-limited per visitor and in total; it holds no key and calls no contract.

`POST /app/api/demo-agent` with `pay` or `attack` needs the room buyer's session; `POST /app/api/faucet` needs a session and is limited per account and per connection. The room page calls the demo endpoints only for a signed-in visitor.

## What Accord does and does not claim

Read the claims table in the README before reporting a design issue: each claim is stated with its limit. A finding that goes beyond a stated limit is exactly what we want to hear about.
