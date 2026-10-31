Verify

# Verify this agreement.

One command checks a live agreement from public data, with no keys: the contract code, the agreement's keys, the Sealed Table release, the sealed outcome, the model attestation, the recipient and the record.

## Verify this agreement

## What make verify checks, line by line.

`make verify DEAL=<agreement>`

The block starts with `accord verify · <agreement>`. Values in angle brackets are real values at run time.

- `01` Contract code `code code hash <8>… = release <v> (<global by hash | embedded>) · no deploy method · ok`

- `02` Agreement keys `keys <0 | 1> key · FunctionCall · receiver self · methods [act] · no full access · ok`

- `03` Sealed Table release `release sealed-table wasm <8>… · keys from pubkey run <task id> · attestation verified · seed binding <shown | not exposed> · ok`

- `04` Sealed outcome `sealed outcome signature ok · commitments match · nonce matches · ok`

- `05` Model attestation `model <model> · gateway TDX <ok | not checked> · model TDX <ok | not checked> · GPU <ok | not checked> · fresh nonce bound · ok`

- `06` Recipient `payee <recipient> · proof <domain> · authority approved · buyer accepted · active · ok`

- `07` Record `record <n> payments · <n> refusals · <n> exceptions · <n> set aside · <n> observation conflicts · events match state · ok`

It ends with `verify: <n> checks ok`. It fetches the attestation report from NEAR AI Cloud without a key when the endpoint allows it; otherwise it uses `NEARAI_API_KEY` if set, or the hosted relay at `/api/verify/<id>` with a nonce it generates itself, and prints which.
