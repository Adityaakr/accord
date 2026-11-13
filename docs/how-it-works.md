# How it works: lifecycle and one deal

The parts and the `act()` gates are in the README's [How it works](../README.md#how-it-works); the full design is [`platform/ARCHITECTURE.md`](../platform/ARCHITECTURE.md).

```mermaid
stateDiagram-v2
    direction LR
    [*] --> Sealed: create_agreement
    Sealed --> Sealed: commit_mandate (buyer, then vendor)
    Sealed --> Attested: start_negotiation, signed outcome checked on chain
    Sealed --> NoDeal: walk away, limit check failed, or 3 infrastructure failures
    Sealed --> Cancelled: either party
    Attested --> Executing: both approve the same terms hash
    Attested --> Cancelled: either party
    Executing --> Executing: act paid (payment_sent)
    Executing --> Executing: act refused, recorded (act_refused, ERR_*)
    Executing --> Executing: revoke_agent (key deleted) or install_agent_key
    Executing --> Settled: close() pays eligible items, refunds the rest
    Settled --> [*]
    NoDeal --> [*]
    Cancelled --> [*]
```

States are the contract's own (`State` in [`platform/crates/accord-core/src/types.rs`](../platform/crates/accord-core/src/types.rs)).

```mermaid
sequenceDiagram
    autonumber
    actor Buyer
    actor Vendor
    actor Auth as Vendor's authority
    participant ST as Sealed Table<br/>(OutLayer enclave)
    participant AC as Agreement controls<br/>(a6.accord-v2.testnet)
    participant PY as Payee<br/>(OutLayer enclave)
    participant Agent as Buyer's agent<br/>(one act key)
    Buyer->>AC: commit_mandate (ciphertext + commitment hash)
    Vendor->>AC: commit_mandate (ciphertext + commitment hash)
    AC->>ST: start_negotiation (agreement id + fresh nonce)
    ST->>ST: quote, counter, final, accept. Code checks both mandates' limits
    ST-->>AC: terms + transcript hash + attestation, signed by the release key
    Note over AC: state Attested
    Buyer->>AC: approve_terms(terms_hash)
    Vendor->>AC: approve_terms(terms_hash)
    Note over AC: state Executing
    Buyer->>AC: fund escrow (ft_transfer_call, 35.50 tUSDC)
    Vendor->>AC: propose_recipient(halcyon-mm.testnet, domain)
    AC->>PY: request the Payee job
    PY->>PY: fetch /.well-known/accord.json over TLS
    PY-->>AC: signed proof (on_payee_proof)
    Auth->>AC: approve_recipient
    Buyer->>AC: accept_recipient
    Buyer->>AC: install_agent_key (FunctionCall key, method act)
    Agent->>AC: act(Pay item 1, 16.50, halcyon-mm.testnet)
    AC-->>Agent: paid: ft_transfer to the authorised recipient
    Agent->>AC: act(Pay 13.00 to halcyon-markets.testnet)
    AC-->>Agent: Refused ERR_PAYEE_MISMATCH, recorded, nothing sent
    Buyer->>AC: revoke_agent (DeleteKey in the same transaction)
    Agent-xAC: next call: AccessKeyDoesNotExist (rejected by the network)
```

## The demo agent in a room

The literal path is [`platform/app/e2e/try-without-wallet.mjs`](../platform/app/e2e/try-without-wallet.mjs) (Playwright; it never clicks a pay button). The server side is [`platform/app/src/server/demo.ts`](../platform/app/src/server/demo.ts) and [`demoagent.ts`](../platform/app/src/server/demoagent.ts): the counterparty makes the vendor's next valid move, so calling it twice does nothing twice; the demo agent's key is derived per room and signs `act` itself, never through the relayer.

<p align="center">
  <img src="../apps/web/public/docs/agent-paid.webp" width="300" alt="The demo agent panel after a payment inside the terms: Paid item 2, 12.00 tUSDC to halcyon-mm.testnet, the active recipient, with the act transaction linked." />
  &nbsp;&nbsp;
  <img src="../apps/web/public/docs/agent-refused.webp" width="300" alt="The demo agent panel after a redirected payment: ERR_PAYEE_MISMATCH, a request to pay 6.00 tUSDC for item 3 to halcyon-markets.testnet, refused and recorded by the contract, with its transaction." />
  <br/><sub>The demo agent's panel: a payment inside the terms, then a redirect the contract refused.</sub>
</p>
