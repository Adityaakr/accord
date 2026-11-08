Concepts

# Concepts

The agreement's states, the parts of Accord, the agent's one scoped key, and the refusal codes the contract records instead of panicking.

## The agreement lifecycle

Each agreement is its own NEAR account, `a<id>.accord-v2.testnet`, created by the factory. Its state is one of six values in `accord-core` (`State`). Every state has a path to `Settled`, `NoDeal` or `Cancelled`.

- 01 Sealed Created by the buyer's `create_agreement`. Each side commits its mandate with `commit_mandate`: only a commitment hash and ciphertext go on chain. Sub-status `AwaitingMandates`, then `Ready`, then `Requested` once `start_negotiation` sends the run. Sealed

- 02 Attested The Sealed Table's signed outcome passed the checks in `on_sealed_result`: signature, nonce, both commitments, release, parameters, structure and terms hash. Attested

- 03 Executing Both parties called `approve_terms` with the same terms hash. `executing_at` is set and the items are created; funding, recipients, deliveries and payments happen here. Executing

- 04 Settled `close` (after the term and grace period) or `mutual_close` paid eligible items, set aside any it could not pay as `Reserved` for the vendor's claim, and refunded the rest to the buyer. Settled

- 05 No deal A walk-away, a failed limit check, bad input, or three infrastructure failures. Nothing was funded, so there is nothing to refund. NoDeal

- 06 Cancelled Either party called `cancel` before `Executing`. Cancelled

The deal room in the app groups these into four phases: Sealed, Agreed, Funded and bound, and Paid, refused, revoked. See them on [/record](/record).

The room shows the same lifecycle as a strip; the steps between the contract's states are the app's.

## The parts of Accord

- 01 Sealed Table The negotiation, inside an OutLayer TDX enclave with negotiators on NEAR AI Cloud. Code checks every proposal against both mandates; only the terms, commitment hashes, a transcript hash and attestation references leave. jobs/sealed-table

- 02 Agreement controls The contract on each agreement account. It holds the escrow and the approved terms and checks every payment request against them in six gates. contracts/agreement

- 03 Payee Recipient authorisation: the vendor's domain file lists the account, fetched inside an enclave; the vendor's settlement authority approves it on chain; the buyer accepts it. A change needs all three again and a delay. jobs/payee

- 04 Evidence checks A payment becomes eligible only when the agreed evidence is recorded: an accepted delivery (procurement) or a period that passed its observations (market making), or an exception the buyer approved.

Payee proves control of the domain and the authority's approval, not that the company legally exists.

## The agent and its scoped key

What the key can and cannot do

- 01 Can call One method on one account: the agreement it works for. The receiver and the method list are part of the key, enforced by the NEAR protocol before any code runs. act

- 02 Cannot Attach NEAR, transfer NEAR, add or delete keys, deploy code, delete the account, call any other contract, or change the terms, the recipient, the amounts or the evidence.

- 03 Gas allowance Fixed when the buyer installs it with `install_agent_key`. A key's allowance cannot be raised; when it runs out the agent stops (`NotEnoughAllowance`) and the buyer installs a new key. 0.5 NEAR

- 04 Revoke One buyer transaction marks the key revoked, so `act` refuses it at once (`ERR_REVOKED`), and deletes it in the same transaction. About a block later the network rejects anything it signs (`AccessKeyDoesNotExist`). [revoke_agent](https://testnet.nearblocks.io/txns/4ervNQdjrd7MA1n7vWSY7cRUtCpwiQwSK7xDSK2Bmn9P)

- 05 Automatic revoke A payment request naming a canary account, or `refusal_limit` (`5`) refusals by the current key inside `refusal_window_secs` (`3600`), revokes and deletes the key the same way. ERR_CANARY · 5 in 3600 s

Revoking is not a recall: a payment already made stays made, and it went to the authorised recipient at the approved amount. An eligible payment stays claimable by the vendor with `claim`.

## Refusals

A refusal never panics. `act`, `claim` and `close` return `Refused` with a sequence number, emit an `act_refused` event and keep the refusal in a ring of the last `128`. Only a call that cannot come from the agent panics: `ERR_UNAUTHORIZED`, with no record. The gates run in order and the first failure is recorded.

Refusal codes, in gate order

- 01 1 · Key revoked The key was revoked; covers the block between the revoke and its `DeleteKey`. ERR_REVOKED

- 02 1 · Not executing The agreement is not in `Executing`. ERR_NOT_EXECUTING

- 03 2 · Canary The recipient is a canary account; the key is also revoked and deleted. ERR_CANARY

- 04 2 · No recipient No active authorised recipient exists yet. ERR_NO_RECIPIENT

- 05 2 · Wrong recipient The recipient is not the active authorised one. Agreement a6 refused a redirect to `halcyon-markets.testnet` this way. [ERR_PAYEE_MISMATCH](https://testnet.nearblocks.io/txns/AB9HLnWvkzNL418ygx8AVArinPnAK3jqxt4haAjsk8fs)

- 06 3 · Unknown item No item with that id. ERR_UNKNOWN_ITEM

- 07 3 · Already paid The item is paid. ERR_ALREADY_PAID

- 08 4 · Not due The delivery is not accepted and its acceptance window has not lapsed. ERR_NOT_DUE

- 09 4 · Period withheld Market making: the period did not close `Eligible` and was not resolved to pay. ERR_PERIOD_WITHHELD

- 10 5 · Wrong amount Not the item's amount, or its approved exception amount. ERR_AMOUNT_MISMATCH

- 11 5 · Over the total Paid plus this amount would exceed the terms total. Also returned when no further exception can be requested. ERR_CAP_EXCEEDED

- 12 5 · Escrow short The escrow does not cover the amount. ERR_INSUFFICIENT_FUNDS

- 13 6 · Payment in flight Another payment holds the lock until its callback returns. ERR_IN_FLIGHT

The control plane as gates · every request, the same order, no gate skipped

`act(Pay{item, amount, recipient})` from the agent's one key, which can call this one method

- Key and state ERR_REVOKED ERR_NOT_EXECUTING other keys: rejected

- Recipient ERR_CANARY → revoke ERR_NO_RECIPIENT ERR_PAYEE_MISMATCH

- Item ERR_UNKNOWN_ITEM ERR_ALREADY_PAID

- Evidence ERR_NOT_DUE ERR_PERIOD_WITHHELD

- Amount ERR_AMOUNT_MISMATCH ERR_CAP_EXCEEDED ERR_INSUFFICIENT_FUNDS

- Lock ERR_IN_FLIGHT

- Pay ft_transfer, locked

Public refusal log every refusal is an on-chain event with its reason · nothing was sent

The agent cannot reorder, skip or argue with a gate. Humans change the inputs (approve an exception, accept a new recipient); the gates stay the same.

Every `act` request passes the same gates in the same order; the first one that fails names the refusal, and nothing is sent.

On this page

- The agreement lifecycle

- The parts of Accord

- The agent and its scoped key

- Refusals
