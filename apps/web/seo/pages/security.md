Security

# Know what is private. Inspect what is enforced.

| Area | What to know |

| --- | --- |

| Confidential mandates | Inputs are processed through the configured confidential execution path. Protection depends on its code, attestation, key handling and infrastructure assumptions. |

| Approved terms | Parties review the deal before activation. On-chain payment conditions are public; an encrypted document does not hide fields recorded on a public chain. |

| Agent permissions | The agreement restricts the supported payment operations. Deployment keys, upgrade authority and other signing paths must be disclosed separately. |

| Recipient authorization | The binding process establishes domain control and destination approval. It is not legal business verification. |

| Revocation | Revocation stops new authorizations through the revoked agent path. It does not recall a transfer already signed. |

| Settlement | Settlement is in USDC on NEAR. The contract makes each transfer itself, so payment and verification happen in the same place; the transfers are public, as with any stablecoin payment. |

## Custody, authority and limits, per piece.

| Piece | Where it is | Who can act | What cannot happen | Kill switch |

| --- | --- | --- | --- | --- |

| Agreement funds | USDC (NEP-141) held in escrow by the contract on NEAR. Only the contract can move it, and only through `act`. | The buyer's agent, within the approved terms | A transfer to anyone but the bound payee version. An amount other than the approved one. Any new signature after revocation. | `revoke`, by the buyer |

| Mandates | Sealed blobs. Plaintext exists only inside the negotiation enclave, during the run. | The enclave, during the job | The other party, the operator or the app reading them | Nothing to switch off: the plaintext is gone when the run ends |

| Negotiation | An OutLayer job calling models in NEAR AI Cloud TEEs; one run per pair of commitments | The job | Terms outside either mandate's hard limits; terms not produced by the attested run | Both humans must approve the terms |

| Payee record | On the contract, versioned, each version tied to a domain proof fetched inside an enclave | The vendor proposes, the vendor's settlement authority approves, a `24 h` timelock runs, the buyer accepts | A change by one key alone; a change without a fresh domain proof | The buyer can pause |

## What stays private, and what does not

| Stays private | Visible to the two parties | Public |

| --- | --- | --- |

| Your ceiling, your walk-away, your weights. The negotiation itself: only its hash leaves the enclave. The commercial terms document: encrypted to the two parties, only its hash on chain. | The approved terms, the schedule, every payment, exception and refusal | The payment schedule the contract enforces (amounts and dates) and the USDC transfers on NEAR, as with any stablecoin payment |

## Where each attack stops

Where each attack stops · the agent is assumed to follow every message it reads

- BEC ASI01 goal hijack What the agent does Asks to pay the new account Where it stops **Agreement controls** destination is not the authorised recipient Result `ERR_PAYEE_MISMATCH` nothing signed

Not stopped by the contract: a person approving the wrong terms, or a payment the terms already allow. Those stay with people, on the record.

## What we do not claim

- Revocation is not a recall. It ends every new payment at once, but a payment already made stays made. Whatever landed was authorised, to the bound payee, at the approved amount.

- "Bound payee" means control of a domain plus approval by the vendor's own settlement authority, with the hash of a company document attested. It is not a legal KYB and does not prove that a company exists.

- "Sealed" means the raw mandates never leave the enclave, under the hardware's trust assumptions. The terms you sign still show that you accepted them, as any signed deal does.

- Attestation proves which code ran, not that the deal was good. The code checks the hard limits; the humans decide whether to sign.

- The payment schedule and the USDC transfers are visible on NEAR. Private settlement is on the roadmap, not on this page.

- The demo agent is deliberately naive about instructions in email. The product is the boundary around the agent, not the agent's judgement.

## The five claims and their limits

| We claim | Because | Limit, stated next to it |

| --- | --- | --- |

| The raw mandates never leave the enclave | Each mandate is encrypted in the browser to the negotiation job's key; the chain holds a hash; the job runs once per pair of commitments inside an OutLayer TDX enclave whose measurement is approved on the register contract | Under the hardware's trust assumptions. The final terms reveal that each side accepted them, as any signed deal does. The operator of the enclave is trusted not to break TDX, nothing more |

| The approved terms are the agent's only authority | The agent's key can call `act` and nothing else; `act` refuses any payment whose milestone, amount, payee version or destination differs from the approved terms | The agent's judgement is not protected, only bounded. Attestation proves which code produced the terms, not that the deal was good; the humans decide that |

| Payments go only to the bound payee | The payee is a destination tied to a domain the vendor controls (proof fetched inside an enclave), approved by the vendor's settlement authority, accepted by the buyer, versioned; a change needs a fresh proof, the authority and `24 h` | "Bound" is not "verified as a real business": it proves control and authorisation, not corporate existence. A legal KYB is a v2 integration |

| `revoke` ends every new authorisation at once | It deletes the agent's function-call key and sets the revoked flag in one transaction; the contract requests no further signatures for the agreement | Revocation is not a recall. A payment made before `revoke` stays made. Whatever landed was authorised, to the bound payee, at the approved amount |

| Negotiation is private, settlement is not | Mandates and the transcript stay inside the enclave; the commercial terms document is encrypted to the two parties and only its hash is on chain | The payment schedule the contract enforces (amounts and dates) and the USDC transfers are public on NEAR, as with any stablecoin payment |

## Settlement on NEAR

Payments settle in USDC on NEAR. The contract that checks the terms also makes the transfer, so there is no second chain to report from. Transfers are public, as with any stablecoin payment.

[Review the execution record](/record)
