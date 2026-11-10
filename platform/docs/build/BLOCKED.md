# BLOCKED.md: what only Adi can do, with exact steps

Each entry names the `PROGRESS.md` item it blocks. Remove an entry when it is done.

Release 4 (the security-review fixes) is no longer blocked: it is published and current on both factories since 9 Nov 2026
(`DECISIONS.md` 26, set current on accord-v2.testnet `J9uADVqQSkY6f1uMYbMbWoPnB4oiwuS3CtLayKojtgeC` and on
accord-usdc.testnet `5D9LxPuU4phUXTgRawd97TmhZPGiPjWzSPWCYXJteoLJ`). Release 5 (the reviewed job builds) is current on both
since 10 Nov 2026 (`DECISIONS.md` 33, set current `8jSfWk6a3qzZRMrzqJj731njUGtRCYmWPLqLAqc3RAgF` and
`3wK4mZVZtF8x6XNwSGbzDSyLR2nPwDqkjktsmpaoKAwi`).

## 2.7 (S1) and security-review finding 5: the seed condition only the dashboard can set, then old-build access

Steps 1, 2, 3 and 5 of the 9 Nov list are done (10 Nov 2026, `DECISIONS.md` 33): the reviewed builds (Sealed Table
`64a354a0cf02f1e23424a3173291abb5e951667f3f49b01524cfa9180d130fac`, Payee
`b5a0c4731721657ab202d31c0b564f404baaa12137920edf35a62ea3308cb26b`, observer
`0dcc55e828b3b828edf938734a4f797c2b40c4480cd438a4396dbea146733d72`) are deployed and active, and release 5 names them on
both factories. Step 3 was done as "old build OR new build" on each secret row, not a move, so release 3 and 4 rooms
(a6, a10, a14 for `/app/try`, every try-it room before a52) keep running on `7c832ce9…`, `24071443…`, `8240179a…`. What
is left:

1. **The seed condition (dashboard).** In the OutLayer dashboard (CLI 0.2.2 has no Account Pattern), on the Sealed
   Table's row (`accord-v1.testnet/accord-sealed-table`, which holds `PROTECTED_SEALED_SEED` and `NEARAI_API_KEY`), set,
   with **Direct calls only** ticked:
   `(Account Pattern ^a[0-9]+\.(accord-v2|accord-usdc)\.testnet$ OR Whitelist releases.accord-v2.testnet, releases.accord-usdc.testnet) AND (One build only 64a354a0cf02f1e23424a3173291abb5e951667f3f49b01524cfa9180d130fac OR One build only 7c832ce9bbea56effda01e9ddf9c413f0d8d2c8baed837e1a524c77529f0a2e1)`
   and on the Payee's row (`accord-v1.testnet/accord-payee`, `PROTECTED_PAYEE_SEED`):
   `(Account Pattern ^a[0-9]+\.(accord-v2|accord-usdc)\.testnet$ OR Whitelist releases.accord-v2.testnet, releases.accord-usdc.testnet) AND (One build only b5a0c4731721657ab202d31c0b564f404baaa12137920edf35a62ea3308cb26b OR One build only 24071443f098c10bbc2ddc0eef79ab99ec696039cf6eb06c14aa813d73e7e876)`.
   If the panel offers only one pattern, use `^(a[0-9]+|releases)\.(accord-v2|accord-usdc)\.testnet$`. Keep both builds
   in the build part, or release 3 and 4 rooms stop. Leave the observer's row as it is (any caller, the two builds): the
   keeper asks it over HTTPS, and every caller gets the identical signed observation. Then: a run requested directly
   (not by an agreement) must be refused before the code starts; run `make negotiate`, the try-it e2e
   (`app/e2e/try-without-wallet.mjs`) and `make verify DEAL=a10.accord-v2.testnet`; then drop the testnet sentence from
   claim 1's limit (GOAL.md and every copy of the table).
2. **Remove the old builds' access (later, after 18 Nov).** While each row also admits `7c832ce9…` / `24071443…` /
   `8240179a…`, a caller can name an old build, which lacks the factory-only check (finding 5) and the off-curve refusal
   (finding 4). Removing the old leaf stops every job run for release 3 and 4 rooms (negotiation retries, payee proofs,
   observations), so do it only once those rooms no longer need runs: `outlayer secrets access --project
   accord-v1.testnet/accord-<job> --build <new sha256>` for each of the three (with the dashboard condition from 1 in
   place, set the build part to the new build only instead). Then say in the README that release 3 and 4 rooms can no
   longer request job runs.

## 3.7: market making on testnet (done 10 Nov 2026)

Done: `OUTLAYER_PAYMENT_KEY` is in `.env` (payment key 1), and `make market-making NET=testnet` ran end to end on factory
`accord-v2.testnet`, release 5. `a56.accord-v2.testnet` observed period 1 `6 of 6` on Rhea's USDC/wNEAR pool on NEAR mainnet
(spread `176 bps`, depth `36.56 / 55.00 USDC` within `300 bps`), closed `Eligible`, and the agent paid `6.00 tUSDC`
(`42HuyHX2SPWNbnT7tKKni6WwyKKCK556vmKo3TydVPeD`); `a57.accord-v2.testnet` passed `0 of 6`, closed `Withheld`, and the agent's
payment was refused `ERR_PERIOD_WITHHELD` (`4W1Ud2GVRPZnJL4uJdyEjAfdB5igT3S1DGTJxxLNcS1Y`). Both verify `6 checks ok · 1
partial`. Every transaction: `docs/runs.md` at the repository root, "Market making on testnet"; what failed first:
`DECISIONS.md` 34. The keeper fix the run needed (`fa0c884`: the observer's HTTPS call sends `secrets_ref` and
`version_key`) is deployed.

Left for Adi: the Railway keeper service has no `OUTLAYER_PAYMENT_KEY`, so the hosted keeper does not observe
testnet market-making rooms on its own (it starts negotiations, activates recipients and closes periods, but asks the
observer for no slot). To have it observe them: in Railway, on the `keeper` service, set `OUTLAYER_PAYMENT_KEY` (and
`OUTLAYER_OWNER`, the observer project's owner `accord-v1.testnet`, if not set) and redeploy; then a new `make market-making` room, or the keeper's next
poll of an open period, shows `record_observation` calls signed by `accord-keeper.testnet` without the make target running.
The key spends OutLayer credit per observation (one call per open slot every `30 s` until observed).

## Known issue: the Sealed Table prompts are written for procurement (for a future job build, not fixed now)

`jobs/sealed-table/prompts/buyer.md` and `vendor.md` describe procurement terms only (items, `due_offset_secs`, the sum of
item amounts). For a market-making agreement they do not state the structure rules code enforces on `terms.atlas` (for
example, a threshold may not exceed `slots_per_period`, and the schedule comes from the buyer's request), and the retry
after an undeliverable proposal says only "the terms are outside your own limits or the agreement's structure", not which
rule failed. That is how `a50.accord-v2.testnet` ended `WALK_AWAY` (`DECISIONS.md` 34). The fixtures now avoid it (the
buyer's `shared` names the schedule), but any buyer whose `shared` part leaves the schedule out can hit it. Fix in a
future job build: a market-making section in both prompts with the structure rules, and a retry message that names the
failed rule without revealing the other side's limits. It changes the Sealed Table's wasm hash, so it needs a new build,
a seed access change and a new release (as in `DECISIONS.md` 33).

## Signed-in app screenshots on testnet

Testnet pages behind sign-in need a real wallet (Meteor or Intear). Sign in once at
http://localhost:3200/signin as `northwind-demo.testnet`; the public Verify page needs no sign-in.

## 4.7: Railway for the hosted app, agent and keeper (done 9 Nov 2026)

The website is live at https://accordweb-production.up.railway.app. **App done (9 Nov 2026):** the app service is
deployed and `/app/try-it` answers at https://accordweb-production.up.railway.app/app/try-it. **Agent (with re-arm) and
keeper done (9 Nov 2026):** both are deployed and their heartbeats show on `/app/status` (`/app/api/status` on 9 Nov:
`agent`, `keeper` and `rearm` each seconds old, the re-arm holding `a14.accord-v2.testnet`). The steps below are kept as the record; `DEPLOY.md` has them in full.

1. Create a Railway project with four services from this repository: `app` (`pnpm --filter @accord/app build && pnpm --filter @accord/app start`), `agent` (`pnpm --filter @accord/agent start`, `AGENT_REARM=on`), `keeper` (`pnpm --filter @accord/keeper start`) and a Postgres plugin.
2. Set on all three: `ACCORD_NETWORK=testnet`, `ACCORD_FACTORY`, `NEAR_RPC_URL`, `DATABASE_URL` (from the plugin). On the agent: the `TRY_*` accounts and keys. On the keeper: `KEEPER_ACCOUNT`, `KEEPER_KEY`, `OUTLAYER_OWNER`, `OUTLAYER_PAYMENT_KEY` (the observer runs through OutLayer's HTTPS API). On the app: `INBOX_DAILY_SALT` (any random string), `APP_URL` (its own public URL).
3. Done: the demo domain is `useaccord.tech` (a15's Payee proof was made on it, `DECISIONS.md` section 27). The Payee proof on `a6.accord-v2.testnet` was made on the earlier demo domain, `accordweb-production.up.railway.app`.
