Verify

# Verify this agreement.

One screen that walks through an agreement's attestation chain: job id, measurement on OutLayer's register, the outlayer-verify output, commitment hashes, refusal events on the explorer, the payment on NEAR.

## Verify this agreement

## The attestation chain, step by step.

- `01` Job id The negotiation, the payee binding and the observer run in attested TDX enclaves; each run is a job with an id.

- `02` Measurement on OutLayer's register The contract accepts a result only when the job's measurement is approved on OutLayer's register contract.

- `03` The `outlayer-verify` output Attestation shows which code ran on which inputs; the check exits `0`. `outlayer-verify job <id>`

- `04` Commitment hashes Each company seals its mandate in the browser and only a commitment hash is recorded; the commitments in the output must match the ones on chain, and the per-response signatures are checked offline against the transcript hash the enclave published. `make verify-negotiation JOB=<id>`

- `05` Refusal events on the explorer Every refusal is an event with its reason; read the events on the testnet explorer, and after a revocation the agent's key is shown gone. `near account list-keys <contract>`

- `06` The payment on NEAR Each USDC transfer is a public NEAR transaction made by the contract itself; read it on the testnet explorer, as with any stablecoin payment.
