Developers

# Follow the deal into the code.

Inspect how confidential mandates become approved terms, how payment requests are checked, and how executions appear in the agreement record.

Start with the reference flow, reproduce a refusal, and follow a payment through its lifecycle.

## What NEAR does here, and what it does not yet.

| Piece | What it protects | How you check it |
| --- | --- | --- |
| NEAR AI Cloud | The negotiation turns run on open-weight models inside TEEs, and every response carries a signature | `make verify-negotiation JOB=<id>` checks the per-response signatures offline against the transcript hash the enclave published |
| OutLayer | The negotiation, the payee binding and the observer run in attested TDX enclaves. The contract accepts a result only when the job’s measurement is approved on OutLayer’s register contract and the commitments in the output match the ones on chain | `outlayer-verify job <id>` exits `0` |
| The agreement contract | The approved terms are the only authority the agent has. Every refusal is an event with its reason | Read the events on the testnet explorer, or run `make attack` and watch them appear |
| Named accounts and scoped keys | The agent’s key can call `act` on this contract and nothing else. `revoke` deletes it in the same transaction that flags the agreement | `near account list-keys <contract>` shows the key gone after `make attack` |
| USDC on NEAR | The agreement’s USDC (NEP-141 on NEAR) sits in the agreement’s own account, and only the contract can send it: through `act` after the request is checked against the approved terms, through the vendor's `claim` of an eligible payment, or as the refund at `close` | `make pay` prints `payment_sent` with the amount, the recipient and the transaction link |

## What NEAR does not do here, yet:

confidential settlement (the USDC transfer is public on NEAR, as with any stablecoin payment; private payouts are the next step); legal KYB (the enclave proves control of a domain and attests a document’s hash; a registry lookup is a v2 integration).

## Commands

make sandbox # the full flow on a local NEAR sandbox, mocked steps marked make negotiate # two sealed mandates in, attested terms out make approve # both companies approve; the agreement is Executing make fund # the buyer funds the agreement's USDC make payee # recipient proven, approved and accepted make pay # milestone 1 to the authorised recipient on NEAR testnet make exception # a changed amount waits for the buyer's approval make attack # redirect and amount refused, the canary deletes the key make revoke # the key deleted, the next call rejected by the network make atlas # one market-making period on Rhea's pool, read-only make verify DEAL=<agreement> # no keys needed

## Official references

- [NEAR access keys](https://docs.near.org/protocol/accounts-contracts/access-keys)

- [NEAR asynchronous cross-contract calls](https://docs.near.org/smart-contracts/anatomy/crosscontract)

- [NEAR AI Cloud private inference](https://docs.near.ai/cloud/private-inference)

- [OutLayer trust and verification](https://app.outlayer.ai/docs/trust-verification)

- [Kraken public order book](https://docs.kraken.com/exchange/api-reference/spot-websocket-v2/book)

- [Kraken account-specific execution data](https://docs.kraken.com/exchange/api-reference/spot-websocket-v2/executions)

The exchange references illustrate the difference between aggregate and account-specific evidence; they do not assert that Accord has integrated Kraken.
