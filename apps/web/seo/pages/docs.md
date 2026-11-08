Developers

# Follow the deal into the code.

Reproduce the flow, reproduce a refusal, and check every step yourself on NEAR testnet.

## Try it on testnet about 3 minutes

- 01 Open /app/try-it and sign in with Meteor or Intear on testnet, or your email. You see: step 1 marked done with your account name.

- 02 Get test funds. You see: your balance reads 2.50 NEAR and 100 tUSDC, with both faucet transactions linked.

- 03 Create the room (prefilled against halcyon-demo.testnet). You see: a new agreement account such as a8.accord-v2.testnet, in state Sealed.

- 04 Seal your mandate with the Northwind preset: 40 tUSDC ceiling, 2 to 4 items. You see: the Demo counterparty panel seals the vendor's mandate and starts the negotiation; the state moves Sealed, then Attested.

- 05 Approve the terms, fund the escrow, accept the recipient and the first delivery. You see: the counterparty approves, proposes halcyon-mm.testnet, the Payee job proves it on the vendor's domain, its authority approves, and once you accept it the recipient is active; the vendor then submits delivery for item 1.

- 06 Start the demo agent, then let it pay the due item. You see: Paid item 1: <amount> tUSDC to halcyon-mm.testnet, the active recipient, with the act transaction linked (the amount is what the negotiated terms say; 15.00 on a8).

- 07 Ask the agent to pay a new account. You see: ERR_PAYEE_MISMATCH: the contract refused it and recorded the refusal. Nothing moves; the refusal appears in the room's activity.

- 08 Revoke the key from the room header. You see: Agent revoked · next call rejected by the network. Starting the demo agent again installs a new key.

[Try a deal in 3 minutes](/app/try-it)

NEAR testnet with test USDC. Nothing here moves real money; the demo vendor and the demo agent are Accord's own testnet accounts, labelled in the room.

## What NEAR does here

- 01 NEAR AI Cloud The negotiation turns run on open-weight models inside TEEs, and every response carries a signature. Check: [make verify-negotiation JOB=<id>](https://docs.near.ai/cloud/private-inference) checks the per-response signatures offline against the transcript hash the enclave published.

- 02 OutLayer The negotiation, the payee binding and the observer run in attested TDX enclaves. The contract accepts a result only when the job’s measurement is approved on OutLayer’s register contract and the commitments in the output match the ones on chain. Check: [outlayer-verify job <id>](https://app.outlayer.ai/docs/trust-verification) exits 0.

- 03 The agreement contract The approved terms are the only authority the agent has. Every refusal is an event with its reason. Check: Read the events on the [testnet explorer](https://testnet.nearblocks.io/address/a6.accord-v2.testnet), or run [make attack](https://testnet.nearblocks.io/txns/AB9HLnWvkzNL418ygx8AVArinPnAK3jqxt4haAjsk8fs) and watch them appear.

- 04 Named accounts and scoped keys The agent’s key can call act on this contract and nothing else. [revoke](https://testnet.nearblocks.io/txns/4ervNQdjrd7MA1n7vWSY7cRUtCpwiQwSK7xDSK2Bmn9P) deletes it in the same transaction that flags the agreement. Check: [near account list-keys <contract>](https://docs.near.org/tools/near-cli) shows the key gone after [make attack](https://testnet.nearblocks.io/txns/AB9HLnWvkzNL418ygx8AVArinPnAK3jqxt4haAjsk8fs).

- 05 USDC on NEAR The agreement’s USDC (NEP-141 on NEAR) sits in the agreement’s own account, and only the contract can send it: through act after the request is checked against the approved terms, through the vendor's claim of an eligible payment, or as the refund at close. Check: [make pay](https://testnet.nearblocks.io/txns/2k57zg7iE44muCGRbcc2JTVmy5uGHHyCePXNPmcWCKEQ) prints payment_sent with the amount, the recipient and the transaction link.

## What NEAR does not do here, yet

- 01 Settlement privacy The USDC transfer is public on NEAR, as with any stablecoin payment; private payouts are the next step.

- 02 Legal KYB The enclave proves control of a domain and attests a document’s hash; a registry lookup is a v2 integration.

## Commands

- 01 make sandbox the full flow on a local NEAR sandbox, mocked steps marked local

- 02 make negotiate two sealed mandates in, attested terms out [tx](https://testnet.nearblocks.io/txns/GfX5qKq35rvtUVkp9nBPgw3kkzDSXx6hfY2H5cb3wfHW)

- 03 make approve both companies approve; the agreement is Executing [tx](https://testnet.nearblocks.io/txns/2uv8tTfeYhe2aZ5cMrVNfFzr88kPL4HeSxwYzNhtmveT)

- 04 make fund the buyer funds the agreement's USDC [tx](https://testnet.nearblocks.io/txns/2CeFB18jenw2iggWE8mQZy9DehwZ2f97TYXwi3RVeXPy)

- 05 make payee recipient proven, approved and accepted [tx](https://testnet.nearblocks.io/txns/3d3LSZvz3yPX5LM1Bk6t9bxiX2x1JDMEt9mfa2fbw11p)

- 06 make pay milestone 1 to the authorised recipient on NEAR testnet [tx](https://testnet.nearblocks.io/txns/2k57zg7iE44muCGRbcc2JTVmy5uGHHyCePXNPmcWCKEQ)

- 07 make exception a changed amount waits for the buyer's approval local

- 08 make attack redirect and amount refused, the canary deletes the key [tx](https://testnet.nearblocks.io/txns/AB9HLnWvkzNL418ygx8AVArinPnAK3jqxt4haAjsk8fs)

- 09 make revoke the key deleted, the next call rejected by the network [tx](https://testnet.nearblocks.io/txns/4ervNQdjrd7MA1n7vWSY7cRUtCpwiQwSK7xDSK2Bmn9P)

- 10 make atlas one market-making period on Rhea's pool, read-only local

- 11 make verify DEAL=<agreement> no keys needed [verify](/verify)

Each tx is the transaction where agreement a6 ran that step on NEAR testnet.

## Contracts and endpoints NEAR testnet

- 01 Factory [accord-v2.testnet](https://testnet.nearblocks.io/address/accord-v2.testnet)

- 02 Release [release 3](https://testnet.nearblocks.io/txns/7m8pj7u2D5aAXJ3RPbPWkhShKpJxwWHhPSpRrKr9nPVh)

- 03 Agreement [a6.accord-v2.testnet](https://testnet.nearblocks.io/address/a6.accord-v2.testnet)

- 04 Token [tusdc.accord-v1.testnet](https://testnet.nearblocks.io/address/tusdc.accord-v1.testnet)

- 05 OutLayer [outlayer.testnet](https://testnet.nearblocks.io/address/outlayer.testnet)

- 06 Attestations [testnet-api.outlayer.ai](https://testnet-api.outlayer.ai/attestations/13596)

- 07 Relayer [relayer transaction](https://testnet.nearblocks.io/txns/DyFrt2v9sGhxnRiWVwSydXPWS48exUis56YydCMmrBhC)

- 08 NEAR RPC [rpc.testnet.near.org](https://docs.near.org/api/rpc/providers)

- 09 Explorer [testnet.nearblocks.io](https://testnet.nearblocks.io)

## Official references

- 01 [NEAR access keys](https://docs.near.org/protocol/accounts-contracts/access-keys)

- 02 [NEAR asynchronous cross-contract calls](https://docs.near.org/smart-contracts/anatomy/crosscontract)

- 03 [NEAR AI Cloud private inference](https://docs.near.ai/cloud/private-inference)

- 04 [OutLayer trust and verification](https://app.outlayer.ai/docs/trust-verification)

- 05 [Kraken public order book](https://docs.kraken.com/exchange/api-reference/spot-websocket-v2/book)

- 06 [Kraken account-specific execution data](https://docs.kraken.com/exchange/api-reference/spot-websocket-v2/executions)

The exchange references illustrate the difference between aggregate and account-specific evidence; they do not assert that Accord has integrated Kraken.
