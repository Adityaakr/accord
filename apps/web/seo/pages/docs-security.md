Security and limits

# Security and limits

The seven claims Accord makes, each with its limit, what NEAR does not do here yet, the limits of this testnet deployment, and the threat model.

## Claims and their limits

Claim its limit

- 01 Each company's mandate is readable only inside attested enclaves Under the hardware's trust assumptions (Intel TDX, NVIDIA confidential computing) and OutLayer's keystore governance. The deployer owns the seed and the factory account, and could rebind the seed to another build or request extra runs. On testnet the job's seed condition admits any caller during an agreement's open request window, so an outside party could request extra runs then and learn bounds on the limits; restricting the seed to the agreement's own calls is the next step. Prompts reach the model through NEAR AI's attested gateway over TLS (TLS binding is not checked from inside the job); end-to-end encryption to the model is not shipped yet. The browser trusts the code the app serves; the CLI is the alternative. The ciphertext stays on chain. The final terms reveal that each side accepted them, as any signed deal does. A negotiator can concede in words; code checks the numbers

- 02 The approved terms are the agent's only authority The agent's judgement is bounded, not protected: it can still be fooled into asking. Attestation proves which code produced the terms, not that the deal was good; people decide that when they approve. The buyer can also approve an exception its agent requests, including a lower amount for an item; the vendor is not asked

- 03 Payments go only to the authorised recipient Authorisation proves control of the domain and the authority's approval, not that the company legally exists. A legal KYB check is a later integration. Testnet agreements run in demo mode: a recipient change waits 120 s and a claim 120 s; live mode enforces at least 24 h for a recipient change and 72 h for a claim, checked by the factory and again by the agreement

- 04 Revoking ends the agent's authority in one transaction A payment already made stays made, and it went to the authorised recipient at the approved amount. A call that reached the chain before the revoke still runs, with every check. Revoking never cancels what the vendor has earned: an eligible payment stays claimable by the vendor, unless the buyer approves an exception that lowers it

- 05 Negotiation is private; settlement is public The enforced schedule (amounts, dates, recipient) and every payment are public on NEAR, as with any stablecoin payment

- 06 A market-making agreement's payment becomes eligible only when the agreed observations pass, unless the buyer approves an exception A market-making agreement's observer measures the venue's liquidity, not the market maker's own orders. The deployer owns the observer's seed and could rebind it to a build that reveals slot times in advance. A slot nobody polls in time counts as unobserved, and a period that unobserved slots leave undecided, or that has conflicting observations, goes to the buyer, not to payment

- 07 On an open tender, each price stays sealed until bidding closes and it is revealed, the lowest valid price wins, and the winner's key becomes the vendor of an ordinary Accord agreement One party can bid under several keys and reveal only the price that wins after seeing the others; each unrevealed bid forfeits its 0.02 NEAR bond to the buyer, which puts a price on this but does not prevent it, and anyone can fill a job's 32 slots for 32 bonds. Every bid sent from the browser, the CLI or tender-bid.mjs also carries its price timelocked to the drand round after bidding closes (a bid sent on chain directly can attach one), so Accord's keeper can reveal it for a bidder who is away; this relies on drand's threshold network not publishing that round early. The board (`tender-v2.accord-v2.testnet`, no access key) had an internal adversarial review, not the security review of the agreement contracts. The winning bid sets the vendor's sealed floor; the terms are still negotiated in the Sealed Table and approved by both companies. The link checks buyer, vendor and kind, not that the agreement's total or token match the winning bid. Testnet only

The reason behind each claim is on [/security](/security).

## What NEAR does not do here yet

- 01 Settlement privacy Settlement is not confidential: the USDC transfer is public on NEAR, as with any stablecoin payment. Only the negotiation is private.

- 02 Legal KYB Not done. The enclave proves control of a domain, and the vendor's settlement authority approves the account; a registry lookup is a later integration.

- 03 Mainnet Accord runs on NEAR testnet only; mainnet follows an external audit. not live

## Limits of this testnet deployment

- 01 Job secret condition The planned condition (only runs an agreement requests can read the seeds) is not expressible with outlayer-cli `0.2.2`. The seeds are locked to the exact build hash and open to any caller: anyone can get a signed output, but every output names the agreement and is checked by that agreement against state it reads itself, so a run requested by someone else cannot change an outcome.

- 02 Factory key The factory keeps its full-access key during the hackathon so fixes can ship. It cannot touch an existing agreement.

- 03 Test token The default factory and the full flow on a6 settle in the repository's test token. Circle's testnet USDC settles on the second factory, `accord-usdc.testnet`, where `a1.accord-usdc.testnet` ran a funded deal. [tusdc.accord-v1.testnet](https://testnet.nearblocks.io/address/tusdc.accord-v1.testnet)

- 04 Job builds `make verify` proves the three job runs with the outlayer-verify tool when it is installed (`6 ok · 1 partial` on a6), so the job keys came from the release's wasm in an enclave. Release 4 still runs release 3's job builds; the reviewed builds are not deployed. [release 3's](/docs/verify#a6-result)

## Threat model

Against the agent and the payment

- 01 A prompt-injected or confused agent Can ask `act` for anything. Stopped by the six gates, the canary, the refusal limit and preflight. Left over: an eligible payment to the authorised recipient, which the terms already allow.

- 02 Someone who stole the agent's key Same as the agent, stopped the same way, and by `revoke_agent`. Left over: burning the key's gas allowance.

- 03 An email or chat impersonating the vendor Can ask the agent to pay a new account or more. Stopped by the recipient and amount gates; no method takes a recipient from a message.

- 04 A hijacked vendor domain or a stolen authority key Can publish or approve an attacker's account. Stopped by the other approvals, the buyer's acceptance and the delay. Left over: the vendor must notice during the delay.

- 05 A dishonest buyer Can revoke the agent to avoid paying. Stopped by the vendor's claim after the delay; `close` pays eligible items before any refund.

Against the enclaves and the operators

- 01 A party probing the other's limits Stopped by one run per pair of commitments, jobs that read ciphertexts from chain state, envelopes bound to agreement, role and party, and salted request hashes. Left over: what any accepted or refused deal reveals.

- 02 OutLayer's operator Could resolve a request with arbitrary output. Stopped because the output must carry the build's signature from a seed only that build can read. Left over: keystore governance and TDX trust.

- 03 The deployer Could rebind a seed to another build or, while the factory keeps its full-access key, request extra runs. Stated in the limits of claims 1 and 6.

- 04 NEAR AI Cloud Sees the negotiators' prompts inside its TEEs. Checked by gateway and model attestations with a fresh nonce and per-response signatures. Left over: their TEE and GPU trust assumptions; TLS binding not checked from inside the job.

- 05 Our app server Could serve altered JavaScript that reads a mandate before encryption. Mitigated by open source, the CLI and SDK as an alternative sealing path, and subresource integrity.

On this page

- Claims and their limits

- What NEAR does not do here yet

- Limits of this testnet deployment

- Threat model
