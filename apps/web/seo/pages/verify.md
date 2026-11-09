Verify

# Verify an agreement.

Check any Accord agreement from public data. No account, no keys.

Examples

Agreement [a6.accord-v2.testnet](https://testnet.nearblocks.io/address/a6.accord-v2.testnet)

Live from testnet 5 of 5 ok

- 01 Agreement [a6.accord-v2.testnet](https://testnet.nearblocks.io/address/a6.accord-v2.testnet) · by [accord-v2.testnet](https://testnet.nearblocks.io/address/accord-v2.testnet) ok

- 02 Contract code [Release 3](https://testnet.nearblocks.io/txns/7m8pj7u2D5aAXJ3RPbPWkhShKpJxwWHhPSpRrKr9nPVh) · [8wMuMRre…](https://testnet.nearblocks.io/address/a6.accord-v2.testnet?tab=contract) ok

- 03 Access keys [None; the agent is revoked](https://testnet.nearblocks.io/address/a6.accord-v2.testnet?tab=accesskeys) ok

- 04 Recipient [halcyon-mm.testnet](https://testnet.nearblocks.io/address/halcyon-mm.testnet) · [v1 proof](https://testnet.nearblocks.io/txns/FBQnqtKXs5B5zn1A4F1yCDUmACYMqsi2zM2uez6YxDis) ok

- 05 Record Executing · [16.50 of 35.50 paid](https://testnet.nearblocks.io/txns/2k57zg7iE44muCGRbcc2JTVmy5uGHHyCePXNPmcWCKEQ) · [1 refusal](https://testnet.nearblocks.io/txns/AB9HLnWvkzNL418ygx8AVArinPnAK3jqxt4haAjsk8fs) ok

Sealed outcome, model attestation and release attestation are checked by make verify and in the app. [Open in the app](/app/verify/a6.accord-v2.testnet)[The command](/docs/cli)

Full check · make verify Recorded for a6.accord-v2.testnet

[make verify DEAL=a6.accord-v2.testnet](/docs/cli)

- 01 Contract code [Matches the published release](https://testnet.nearblocks.io/txns/7m8pj7u2D5aAXJ3RPbPWkhShKpJxwWHhPSpRrKr9nPVh) ok

- 02 Agreement keys [No full-access key](https://testnet.nearblocks.io/address/a6.accord-v2.testnet?tab=accesskeys) ok

- 03 Sealed outcome [Signed inside the enclave](https://testnet.nearblocks.io/txns/GfX5qKq35rvtUVkp9nBPgw3kkzDSXx6hfY2H5cb3wfHW) ok

- 04 Enclave release [Needs the outlayer-verify tool](https://app.outlayer.ai/docs/trust-verification) not checked

- 05 Model attestation [The model as served now, fresh nonce bound; the run's attestation is in the sealed outcome](https://testnet-api.outlayer.ai/attestations/13596) partial

- 06 Recipient [Proven on the vendor's domain](https://testnet.nearblocks.io/txns/6koRbw5QDYTgVU52Fe1vH755QGLPwZabQhF1kTk5rup6) ok

- 07 Record [Payments match the receipts](https://testnet.nearblocks.io/txns/2k57zg7iE44muCGRbcc2JTVmy5uGHHyCePXNPmcWCKEQ) ok

5 ok · 1 partial · 1 not checked [a6.accord-v2.testnet](https://testnet.nearblocks.io/address/a6.accord-v2.testnet) recorded Show raw output accord verify · a6.accord-v2.testnet code code hash 8wMuMRre… = release 3 (global by hash) · no deploy method · ok keys 0 keys · none · no full access · ok sealed outcome signature ok · commitments match · agreement matches · ok release sealed-table wasm 7c832ce9… · keys from pubkey run 13682 · OutLayer attestation record not checked here (needs outlayer-verify) · not checked model z-ai/glm-5.3-flash · attestation report fetched with fresh nonce 3d293e48… · nonce bound in the report · the model is attested as served now; the run's own attestation is bound in the signed outcome (sealed check) · hardware quote and GPU evidence not checked here (make probe-ai checks them) · partial payee halcyon-mm.testnet · proof accordweb-production.up.railway.app signed by the release's payee key · authority approved · buyer accepted · active · ok record 1 payment · 1 refusal (1 in the log) · 0 exceptions · 0 set aside · 0 observation conflicts · receipts match paid · ok verify: 5 checks ok · 1 partial · 1 not checked
