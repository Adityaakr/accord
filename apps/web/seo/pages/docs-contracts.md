Contracts and endpoints

# Contracts and endpoints

The accounts and endpoints Accord uses on NEAR testnet, and the agreement contract's change and view methods, one line each.

## On NEAR testnet

- 01 Factory [accord-v2.testnet](https://testnet.nearblocks.io/address/accord-v2.testnet)

- 02 Release The audit fixes, current since 9 Nov 2026 ([set current](https://testnet.nearblocks.io/txns/J9uADVqQSkY6f1uMYbMbWoPnB4oiwuS3CtLayKojtgeC)). Release 3: [publish](https://testnet.nearblocks.io/txns/7m8pj7u2D5aAXJ3RPbPWkhShKpJxwWHhPSpRrKr9nPVh). [release 4](https://testnet.nearblocks.io/txns/EB2Lz3WF1Pqt4o9y9NzUF5uc9qEhimPAPLKdwJFwvqnU)

- 03 Agreement Ran the full flow on 8 Nov 2026 on release 3; see [/record](/record). [a6.accord-v2.testnet](https://testnet.nearblocks.io/address/a6.accord-v2.testnet)

- 04 Agreement on release 4 Negotiated, funded, paid item 1 and refused a redirect on 9 Nov 2026: [fund](https://testnet.nearblocks.io/txns/2mBhRNnXnitEN2gefBe7C8MWdCYS7P2nJLZyZznHFH22), [pay](https://testnet.nearblocks.io/txns/Bs5dVpr6DnR5jXjYKXbGsp9HP36smmoJRFmvJP4tGqAm), [refused](https://testnet.nearblocks.io/txns/51TQ8no9kPp4P8SDyN77jNZMevLsKaTBH3SufU2SUefu). [a10.accord-v2.testnet](https://testnet.nearblocks.io/address/a10.accord-v2.testnet)

- 05 Circle USDC factory Settles in Circle's testnet USDC (`3e2210e1…afcb8af`); release 4 current ([publish](https://testnet.nearblocks.io/txns/GovfwhMAtB28ayEndYmtiZHEo8sq9YhKVCXj8m3WFaai), [set current](https://testnet.nearblocks.io/txns/5D9LxPuU4phUXTgRawd97TmhZPGiPjWzSPWCYXJteoLJ)). [accord-usdc.testnet](https://testnet.nearblocks.io/address/accord-usdc.testnet)

- 06 Circle USDC agreement Release 3. [Funded](https://testnet.nearblocks.io/txns/4gPohYYMokgQcPcgNhX3tCTTXjA35AfuKkpGs1SpS2no) `14.00 USDC`, [paid](https://testnet.nearblocks.io/txns/E127BGy3Tw6PmhE9JcoFr7vQsKTiHNevTTiAxEjJGWK2) `5.00`, [refused](https://testnet.nearblocks.io/txns/9rgsBFA26yedWuEEJk77sKBDrDGS9mHn9BFMknCaP8BB) a redirect, [revoked](https://testnet.nearblocks.io/txns/FTigDebs1kZjLpTN8nC8SZWp4dMM1ChuUyR211JZnzuW). [a1.accord-usdc.testnet](https://testnet.nearblocks.io/address/a1.accord-usdc.testnet)

- 07 Token Test USDC, 6 decimals. [tusdc.accord-v1.testnet](https://testnet.nearblocks.io/address/tusdc.accord-v1.testnet)

- 08 OutLayer [outlayer.testnet](https://testnet.nearblocks.io/address/outlayer.testnet)

- 09 Attestations `/attestations/<id>` returns the TDX quote for that run. [testnet-api.outlayer.ai](https://testnet-api.outlayer.ai/attestations/13596)

- 10 Relayer Linked: a transaction it relayed. [relay.accord-v2.testnet](https://testnet.nearblocks.io/txns/DyFrt2v9sGhxnRiWVwSydXPWS48exUis56YydCMmrBhC)

- 11 NEAR RPC [rpc.testnet.near.org](https://docs.near.org/api/rpc/providers)

- 12 Explorer [testnet.nearblocks.io](https://testnet.nearblocks.io)

## Factory methods

- 01 create_agreement(args) Creates `a<id>.<factory>` pinned to the current release; enforces the live minimums on the parameters. buyer · payable

- 02 publish_release · set_current_release Completes a release with its job keys and attestation task ids; new agreements use the current one. owner

- 03 report_recipient · record_payment Recipient reports (with the refusal as evidence) and payment stats for the Payee signals. an agreement account

- 04 Views `config()`, `release(v)`, `current_release()`, `agreement(id)`, `agreements(from, limit)`, `agreements_for(account)`, `reports(account)`, `blocked(account)`, `recipient_stats(account, buyer?)`. anyone

## Agreement change methods

Negotiation and approval

- 01 commit_mandate Stores the caller's commitment and ciphertext (at most `8 KB`); replaceable until the negotiation starts. buyer · vendor

- 02 start_negotiation Needs both commitments and at least `280 TGas`; requests the Sealed Table run with only the agreement id and a fresh nonce. anyone

- 03 approve_terms(terms_hash) Both approvals of the same hash move the agreement to `Executing`. buyer · vendor

- 04 cancel Before `Executing`: `Cancelled`. buyer · vendor

Funds, recipient and agent

- 01 ft_on_transfer Funding with `msg` `fund` from the buyer, credited up to the total; the rest is returned. token

- 02 propose_recipient · approve_recipient · accept_recipient · activate_recipient · cancel_recipient_change The Payee flow: proposal and enclave proof, the authority's approval, the buyer's acceptance, activation after the delay, cancellation during it. vendor · authority · buyer · anyone

- 03 install_agent_key(public_key, allowance) Adds the one `FunctionCall` key (receiver self, method `act`), replacing any current key. buyer

- 04 revoke_agent Marks the key revoked and deletes it in the same transaction. buyer

- 05 act(action) `Pay` or `RequestException` through the six gates; returns the outcome, panics only with `ERR_UNAUTHORIZED`. agent key

Evidence, exceptions and closing

- 01 submit_delivery · accept_delivery · dispute_delivery Delivery evidence for procurement items and the acceptance window. vendor · buyer

- 02 request_exception · approve_exception · reject_exception A one-off amount change for one item, optionally waiving its evidence; never a recipient change. vendor · buyer

- 03 record_observation · close_period · resolve_period Market making: signed observations, the period's outcome, and the buyer's decision on `Review` or `Withheld`. anyone · buyer

- 04 claim(item) Pulls an eligible payment to the authorised recipient after the claim delay, agent or no agent. vendor

- 05 close · mutual_close · withdraw_near Pay eligible items, set aside what cannot be paid, refund the rest, `Settled`; then the buyer withdraws spare NEAR. anyone · both · buyer

- 06 resolve_stale_lock Clears a payment lock older than `600` blocks by reading the token balance. anyone

## Agreement view methods

- 01 get_agreement State, negotiation, parties, release, parameters, approvals, funded, paid, reserved, the payment lock, recipient, agent key present, refusal and exception counts, budget.

- 02 get_terms · get_items · due_items The approved terms; each item with its status and absolute due time; the items payable now.

- 03 get_refusals(from, limit) The refusal log: sequence, time, block, code, item, amount, recipient, signer key.

- 04 get_recipients · get_exceptions Every recipient version and every exception.

- 05 get_periods · get_observations(period) Market-making periods and their stored observations.

- 06 get_commitments · get_documents · get_sealed_output Both commitments and ciphertexts, the encrypted terms documents, and the Sealed Table's signed output.

- 07 get_receipts · get_budget One receipt per payment; the account's balance, storage stake and liquid NEAR.

No view returns or derives a mandate's plaintext.

On this page

- On NEAR testnet

- Factory methods

- Agreement change methods

- Agreement view methods
