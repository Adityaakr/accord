Verify

# Verify this agreement.

One command checks a live agreement from public data, with no keys: the contract code, the agreement's keys, the Sealed Table release, the sealed outcome, the model attestation, the recipient and the record.

## Verify this agreement

## What make verify checks.

`$make verify DEAL=a6.accord-v2.testnet`

- Contract code Matches the published release ok

- Agreement keys No full-access key ok

- Sealed outcome Signed inside the enclave ok

- Enclave release Needs the outlayer-verify tool not checked

- Model attestation The real model, fresh nonce ok

- Recipient Proven on the vendor's domain ok

- Record Payments match the receipts ok

6 of 7 ok [a6.accord-v2.testnet](https://testnet.nearblocks.io/address/a6.accord-v2.testnet)

Show raw output accord verify · a6.accord-v2.testnet code code hash 8wMuMRre… = release 3 (global by hash) · no deploy method · ok keys 0 key · none · no full access · ok sealed outcome signature ok · commitments match · agreement matches · ok release sealed-table wasm 7c832ce9… · keys from pubkey run 13682 · … · not checked model z-ai/glm-5.3-flash · fresh nonce 9debe4c3… · nonce bound in the report · ok payee halcyon-mm.testnet · proof accordweb-production.up.railway.app signed by the release's payee key · ok record 1 payments · 1 refusals · 0 exceptions · receipts match paid · ok verify: 6 checks ok · 1 not checked

Reads public data only. No keys, no account.
