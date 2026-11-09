Quickstart

# Quickstart

Run one deal on NEAR testnet at /app/try-it in about 3 minutes: sign in, get test funds, seal your limits, let the demo agent pay, watch a redirect get refused, and revoke the key.

## Before you start

- 01 Network Everything on this path is testnet with a test USDC token. Nothing here moves real money. NEAR testnet

- 02 Sign-in Your own NEAR wallet, switched to testnet. Meteor and Intear send through Accord's relayer, so you pay no gas after opening the room (your wallet pays its 2 NEAR deposit). Meteor · Intear · Ledger · Nightly · WalletConnect

- 03 Test funds The faucet tops your account up once a day per account. The room's `2 NEAR` deposit is returned when it closes. 2.50 NEAR · 100 tUSDC

- 04 Counterparty Accord's demo vendor, with its authority `halcyon-auth.testnet`. The demo vendor and the demo agent are Accord's own testnet accounts, labelled in the room. [halcyon-demo.testnet](https://testnet.nearblocks.io/address/halcyon-demo.testnet)

- 05 Time about 3 minutes

Sealing a mandate takes a wallet signature (NEP-413) that derives your document key, so the key never leaves your browser.

## Sign in and open a room

- 01 Open [/app/try-it](/app/try-it) and sign in with Meteor or Intear on testnet. You see Step 1 marked done with your account name. `/app/try-it` before sign-in. Each step turns to done as you go.

- 02 Get test funds. You see Your balance reads `2.50 NEAR` and `100 tUSDC`, with both faucet transactions linked.

- 03 Create the room, prefilled against `halcyon-demo.testnet`. Your wallet signs `create_agreement` on the factory `accord-v2.testnet` with a `2 NEAR` deposit. You see A new agreement account such as `a8.accord-v2.testnet`, in state `Sealed`.

## Seal your limits and negotiate

- 01 Seal your mandate with the Northwind preset: `40 tUSDC` ceiling, 2 to 4 items. Your limits are encrypted in the browser to the Sealed Table; the vendor never sees them. The demo vendor seals its own preset (floor `30`, target `38`). You see The Demo counterparty panel seals the vendor's mandate and starts the negotiation; the state moves `Sealed`, then `Attested`.

- 02 Approve the terms, fund the escrow, accept the recipient and the first delivery. You see The counterparty approves, proposes `halcyon-mm.testnet`, the Payee job proves it on the vendor's domain, its authority approves, and once you accept it the recipient is active; the vendor then submits delivery for item 1. The room as the deal moves: the state strip, and the agent's one key with Hold to revoke.

The counterparty reads the room and makes the vendor's next valid move, so pressing it twice does nothing twice.

## Pay, refuse, revoke

- 01 Start the demo agent, then let it pay the due item. Starting the agent asks your wallet to sign `install_agent_key`: one function-call key on the agreement account that can call `act` and nothing else. You see `Paid item 1: <amount> tUSDC to halcyon-mm.testnet`, the active recipient, with the `act` transaction linked. The amount is what the negotiated terms say (`15.00` on a8).

- 02 Ask the agent to pay a new account. You see `ERR_PAYEE_MISMATCH`: the contract refused it and recorded the refusal. Nothing moves; the refusal appears in the room's activity.

- 03 Revoke the key from the room header. You see `Agent revoked · next call rejected by the network`. Starting the demo agent again installs a new key.

The demo agent's panel in a test room: a payment inside the terms, then a redirect the contract refused.

The demo agent's key is derived per room and signs `act` itself, never through the relayer.

## Check what happened

- 01 Verify the agreement Five public checks in the browser, no account and no keys. [/verify](/verify)

- 02 Read a full record Agreement a6's 12 steps, each linked to its transaction. [/record](/record)

- 03 Run it from a terminal The full loop on testnet from fresh faucet accounts. [make demo](/docs/cli#verify-demo)

- 04 What each state means [Concepts](/docs/concepts#lifecycle)

On this page

- Before you start

- Sign in and open a room

- Seal your limits and negotiate

- Pay, refuse, revoke

- Check what happened
