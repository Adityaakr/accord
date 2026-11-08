Verify an agreement

# Verify an agreement

Check any Accord agreement from public data with one command and no keys, or run five of the checks in the browser at /verify.

## The command

make verify

`make verify DEAL=<agreement>`

Needs no account and no keys. Reads NEAR testnet, the release, OutLayer and NEAR AI's attestation report.

On agreement a6

`make verify DEAL=a6.accord-v2.testnet`

## What each check means

- 01 Contract code The account's code hash equals the published release (`8wMuMRre…` = release 3, global by hash), and the code has no deploy method. [ok](https://testnet.nearblocks.io/txns/7m8pj7u2D5aAXJ3RPbPWkhShKpJxwWHhPSpRrKr9nPVh)

- 02 Agreement keys No full-access key; at most one `FunctionCall` key for `act`. On a6 there are `0` keys, because the agent was revoked. [ok](https://testnet.nearblocks.io/address/a6.accord-v2.testnet?tab=accesskeys)

- 03 Sealed outcome The outcome was signed inside the enclave by the release's Sealed Table key; the commitments and the agreement match. [ok](https://testnet.nearblocks.io/txns/GfX5qKq35rvtUVkp9nBPgw3kkzDSXx6hfY2H5cb3wfHW)

- 04 Enclave release The Sealed Table build (`7c832ce9…`) and its keys from pubkey run `13682`. Checking the run's attestation needs the outlayer-verify tool. [not checked](https://app.outlayer.ai/docs/trust-verification)

- 05 Model attestation The real model (`z-ai/glm-5.3-flash`) with a fresh nonce bound in the report. [ok](https://testnet-api.outlayer.ai/attestations/13596)

- 06 Recipient `halcyon-mm.testnet`, proven on the vendor's domain `accordweb-production.up.railway.app`, signed by the release's Payee key. [ok](https://testnet.nearblocks.io/txns/6koRbw5QDYTgVU52Fe1vH755QGLPwZabQhF1kTk5rup6)

- 07 Record Payments match the receipts: `1` payment, `1` refusal, `0` exceptions. [ok](https://testnet.nearblocks.io/txns/2k57zg7iE44muCGRbcc2JTVmy5uGHHyCePXNPmcWCKEQ)

## The result on a6

make verify DEAL=a6.accord-v2.testnet · 8 Nov 2026

accord verify · a6.accord-v2.testnet

- code code hash 8wMuMRre… = release 3 (global by hash) · no deploy method ok

- keys 0 key · none · no full access ok

- sealed outcome signature ok · commitments match · agreement matches ok

- release sealed-table wasm 7c832ce9… · keys from pubkey run 13682 · … not checked

- model z-ai/glm-5.3-flash · fresh nonce 9debe4c3… · nonce bound in the report ok

- payee halcyon-mm.testnet · proof accordweb-production.up.railway.app signed by the release's payee key ok

- record 1 payments · 1 refusals · 0 exceptions · receipts match paid ok

- verify: 6 checks ok · 1 not checked

6 checks ok, 1 not checked: the enclave release check needs the outlayer-verify tool, which was not installed for this run. See [OutLayer trust and verification](https://app.outlayer.ai/docs/trust-verification).

## In the browser

[/verify](/verify) runs five public checks on any agreement id, live from NEAR testnet: the agreement, the contract code, the access keys, the recipient and the record. No account, no keys.

/verify on a6.accord-v2.testnet.

The sealed outcome, the model attestation and the release attestation are checked by `make verify` and in the app, not by /verify.

On this page

- The command

- What each check means

- The result on a6

- In the browser
