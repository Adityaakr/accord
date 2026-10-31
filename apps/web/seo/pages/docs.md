Developers

# Follow the deal into the code.

## What NEAR does here, and what it does not yet.

| Piece | What it protects | How you check it |

| --- | --- | --- |

| NEAR AI Cloud | The negotiation turns run on open-weight models inside TEEs, and every response carries a signature | `make verify-negotiation JOB=<id>` checks the per-response signatures offline against the transcript hash the enclave published |

| OutLayer | The negotiation, the payee binding and the observer run in attested TDX enclaves. The contract accepts a result only when the job’s measurement is approved on OutLayer’s register contract and the commitments in the output match the ones on chain | `outlayer-verify job <id>` exits `0` |

| The agreement contract | The approved terms are the only authority the agent has. Every refusal is an event with its reason | Read the events on the testnet explorer, or run `make attack` and watch them appear |

| Named accounts and scoped keys | The agent’s key can call `act` on this contract and nothing else. `revoke` deletes it in the same transaction that flags the agreement | `near account list-keys <contract>` shows the key gone after `make attack` |

| USDC on NEAR | The agreement’s USDC is held in escrow by the contract (NEP-141 USDC on NEAR), and only the contract can move it, only through `act`. The transfer happens in the same call that checks the terms, so nothing is signed that is not paid | `make pay` shows the USDC transfer on the NEAR testnet explorer |

## What NEAR does not do here, yet:

confidential settlement (the USDC transfer is public on NEAR, as with any stablecoin payment; private payouts are the next step); legal KYB (the enclave proves control of a domain and attests a document’s hash; a registry lookup is a v2 integration).

## Commands

make setup # testnet accounts, contract, the agreement's USDC escrow make negotiate # two sealed mandates in, attested terms out make verify-negotiation JOB=<id> make bind-payee # domain proof in the enclave, authority approves, buyer accepts make pay # milestone 1 to the bound payee on NEAR testnet make exception # out-of-mandate request, buyer approves, milestone 2 pays make attack # redirect refused, amount refused, canary, revoke make observe SLOT=1 # Accord Atlas: one attested observation slot make atlas # the market-making scenario end to end

## Official references

- [NEAR access keys](https://docs.near.org/protocol/accounts-contracts/access-keys)

- [NEAR asynchronous cross-contract calls](https://docs.near.org/smart-contracts/anatomy/crosscontract)

- [NEAR AI Cloud private inference](https://docs.near.ai/cloud/private-inference)

- [OutLayer trust and verification](https://app.outlayer.ai/docs/trust-verification)

- [Kraken public order book](https://docs.kraken.com/exchange/api-reference/spot-websocket-v2/book)

- [Kraken account-specific execution data](https://docs.kraken.com/exchange/api-reference/spot-websocket-v2/executions)

The exchange references illustrate the difference between aggregate and account-specific evidence; they do not assert that Atlas has integrated Kraken.
