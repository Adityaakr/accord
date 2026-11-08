Verify

# Verify an agreement.

Check any Accord agreement from public data. No account, no keys.

Agreement [a6.accord-v2.testnet](https://testnet.nearblocks.io/address/a6.accord-v2.testnet)

Live from testnet 5 of 5 ok

- 01 Agreement Created by accord-v2.testnet ok

- 02 Contract code Release 3 · 8wMuMRre… ok

- 03 Access keys None; the agent is revoked ok

- 04 Recipient halcyon-mm.testnet · v1 ok

- 05 Record Executing · 16.50 of 35.50 paid · 1 refusal ok

Sealed outcome, model attestation and release attestation are checked by make verify and in the app. [Open in the app](/app/verify/a6.accord-v2.testnet)[The command](/docs#near)

Full check · make verify

make verify DEAL=a6.accord-v2.testnet

- 01 Contract code Matches the published release ok

- 02 Agreement keys No full-access key ok

- 03 Sealed outcome Signed inside the enclave ok

- 04 Enclave release Needs the outlayer-verify tool not checked

- 05 Model attestation The real model, fresh nonce ok

- 06 Recipient Proven on the vendor's domain ok

- 07 Record Payments match the receipts ok

6 of 7 ok [a6.accord-v2.testnet](https://testnet.nearblocks.io/address/a6.accord-v2.testnet) Show raw output accord verify · a6.accord-v2.testnet code code hash 8wMuMRre… = release 3 (global by hash) · no deploy method · ok keys 0 key · none · no full access · ok sealed outcome signature ok · commitments match · agreement matches · ok release sealed-table wasm 7c832ce9… · keys from pubkey run 13682 · … · not checked model z-ai/glm-5.3-flash · fresh nonce 9debe4c3… · nonce bound in the report · ok payee halcyon-mm.testnet · proof accordweb-production.up.railway.app signed by the release's payee key · ok record 1 payments · 1 refusals · 0 exceptions · receipts match paid · ok verify: 6 checks ok · 1 not checked
