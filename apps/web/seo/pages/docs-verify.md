Verify an agreement

# Verify an agreement

Check any Accord agreement from public data with one command and no keys, or run five of the checks in the browser at /verify.

## The command

make verify

`make verify DEAL=<agreement>`

Needs no account and no keys. Reads NEAR testnet, the release, OutLayer and NEAR AI's attestation report.

On agreement a6

`make verify DEAL=a6.accord-v2.testnet`

Other agreements to check

- 01 Release 4 The security-review fixes. `make verify DEAL=a10.accord-v2.testnet` prints `code = release 4 · 5 ok · 1 partial · 1 not checked`. JSON: `/app/api/verify/a10.accord-v2.testnet`. [a10.accord-v2.testnet](/verify?agreement=a10.accord-v2.testnet)

- 02 Circle USDC The second factory, on release 3. `make verify DEAL=a1.accord-usdc.testnet` (the same as `ACCORD_FACTORY=accord-usdc.testnet make verify`). JSON: `/app/api/verify/a1.accord-usdc.testnet`. [a1.accord-usdc.testnet](/verify?agreement=a1.accord-usdc.testnet)

## What each check means

- 01 Contract code The account's code hash equals the published release (`8wMuMRre…` = release 3, global by hash), and the code has no deploy method. [ok](https://testnet.nearblocks.io/txns/7m8pj7u2D5aAXJ3RPbPWkhShKpJxwWHhPSpRrKr9nPVh)

- 02 Agreement keys No full-access key; at most one `FunctionCall` key for `act`. On a6 there are `0` keys, because the agent was revoked. [ok](https://testnet.nearblocks.io/address/a6.accord-v2.testnet?tab=accesskeys)

- 03 Sealed outcome The outcome was signed inside the enclave by the release's Sealed Table key; the commitments and the agreement match. [ok](https://testnet.nearblocks.io/txns/GfX5qKq35rvtUVkp9nBPgw3kkzDSXx6hfY2H5cb3wfHW)

- 04 Enclave release Each job key's pubkey run, looked up by OutLayer request id: Sealed Table run `13682` = task `28492`, its wasm (`7c832ce9…`) and caller match the release; the same for Payee and the observer. Checking each run's TDX quote needs the outlayer-verify tool. [not checked](https://app.outlayer.ai/docs/trust-verification)

- 05 Model attestation The real model (`z-ai/glm-5.3-flash`): the attestation report is fetched with a fresh nonce and the nonce is bound in it. This attests the model as served now, not the negotiating run; the run's own attestation is bound in the signed outcome, which the sealed check verifies. The hardware quote and GPU evidence are not checked by `make verify`; `make probe-ai` checks them. [partial](https://testnet-api.outlayer.ai/attestations/by-request/13596)

- 06 Recipient `halcyon-mm.testnet`, proven on the vendor's domain `accordweb-production.up.railway.app`, signed by the release's Payee key. [ok](https://testnet.nearblocks.io/txns/6koRbw5QDYTgVU52Fe1vH755QGLPwZabQhF1kTk5rup6)

- 07 Record Payments match the receipts: `1` payment, `1` refusal, `0` exceptions. [ok](https://testnet.nearblocks.io/txns/2k57zg7iE44muCGRbcc2JTVmy5uGHHyCePXNPmcWCKEQ)

## The result on a6

make verify DEAL=a6.accord-v2.testnet · 9 Nov 2026

accord verify · a6.accord-v2.testnet

- code code hash 8wMuMRre… = release 3 (global by hash) · no deploy method ok

- keys 0 keys · none · no full access ok

- sealed outcome signature ok · commitments match · agreement matches ok

- release sealed-table run 13682 = task 28492 · wasm 7c832ce9… and caller match · quote not checked (needs outlayer-verify) · payee run 13672 = task 28478 · wasm 24071443… and caller match · quote not checked (needs outlayer-verify) · observer run 13683 = task 28493 · wasm 8240179a… and caller match · quote not checked (needs outlayer-verify) not checked

- model z-ai/glm-5.3-flash · attestation report fetched with fresh nonce c940dede… · nonce bound in the report · the model is attested as served now; the run's own attestation is bound in the signed outcome (sealed check) · hardware quote and GPU evidence not checked here (make probe-ai checks them) · partial

- payee halcyon-mm.testnet · proof accordweb-production.up.railway.app signed by the release's payee key · authority approved · buyer accepted · active ok

- record 1 payment · 1 refusal (1 in the log) · 0 exceptions · 0 set aside · 0 observation conflicts · receipts match paid ok

- verify: 5 checks ok · 1 partial · 1 not checked

5 checks ok, 1 partial, 1 not checked: the model check binds the fresh nonce but does not check the hardware quote here, and the enclave release check needs the outlayer-verify tool, which was not installed for this run. See [OutLayer trust and verification](https://app.outlayer.ai/docs/trust-verification).

## In the browser

[/verify](/verify) headlines the full seven-check verdict that `make verify` gives (on a6: `5 ok · 1 partial · 1 not checked`), then five quick reads of any agreement id live from NEAR testnet: the agreement, the contract code, the access keys, the recipient and the record. No account, no keys.

/verify on a6.accord-v2.testnet.

The sealed outcome, the model attestation and the release attestation are checked by `make verify` and in the app, not by /verify.

On this page

- The command

- What each check means

- The result on a6

- In the browser
