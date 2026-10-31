# Accord

The private deal room and control plane for agent-to-agent commerce.

<!-- One paragraph, plain: what Accord is. Then the thesis line. No adjectives the product cannot prove. -->

Agreements negotiated in private, enforced in public.

## The problem

<!-- Open with the question "Whose server do your agents meet on?" Five sentences, three sources from docs/build/REFERENCES.md (not rows that quote members of the jury). -->

## Try it

Three ways, cheapest first. None needs our keys.

1. **Read-only check of a live agreement** (about a minute, no account): `make verify DEAL=<live agreement>`
   <!-- paste the literal block from a real run -->
2. **Full flow on a local NEAR sandbox** (no network; the enclave jobs are mocked and every mocked line says `[mock]`): `make sandbox`
3. **Full live loop on testnet** (faucet accounts, under two minutes): `make demo`

Then the live flow, step by step:

| # | Do | See |
| --- | --- | --- |
| 1 | `make setup` | <!-- literal output --> |
| 2 | `make negotiate` | <!-- the negotiate block --> |
| … | … | … |
| 10 | `make revoke` | <!-- the revoke block --> |

## What the agent's key can and cannot do

<!-- Copy docs/build/ARCHITECTURE.md section 3.1 here, as plain sentences. -->

## Claims and their limits

<!-- The table from docs/build/GOAL.md, verbatim. Then the custody table, the privacy boundary, and "What we keep". -->

## How NEAR is used

| NEAR feature | What it does here | File |
| --- | --- | --- |
| Function-call access keys | The agent's only key: one method on one agreement account | `contracts/agreement/src/keys.rs` |
| Sub-accounts and pinned code (NEP-591) | One account per agreement; code fixed by hash; no full-access key | `contracts/factory/src/lib.rs` |
| NEP-141 and NEP-145 | USDC escrow, storage registration, `ft_transfer` with a callback lock | `contracts/agreement/src/pay.rs` |
| NEP-297 events | Every refusal and payment on the record | `contracts/agreement/src/events.rs` |
| OutLayer | Sealed Table, Payee and observer jobs in Intel TDX; outputs signed with seed-derived keys | `jobs/` |
| NEAR AI Cloud | Private inference for the negotiators; gateway and model attestations verified with a fresh nonce | `jobs/sealed-table/src/nearai.rs` |

<!-- Adjust file paths to the real ones. -->

## Architecture

<!-- One diagram (docs/build/ARCHITECTURE.md section 1) and a link to docs/build/ARCHITECTURE.md. The repository map. -->

## Track by track

<!-- The "Track requirements" table from docs/build/GOAL.md, each row linked to the step that shows it. Only tracks in the submission. -->

## Related NEAR tools

<!-- Factual: what each related tool does and how Accord uses or differs from it. No dismissals. Include the Agent Market finding (docs/build/DECISIONS.md section 7). -->

## Business model (hypothesis)

<!-- Never a percentage of payments; free to build and verify; buyers pay per agreement; vendors pay per recipient authorisation. Marked as a hypothesis. -->

## Built during NEAR HACKATHON

<!-- Start date of the repository (inside the window, Q-001); libraries and templates used (Q-005); the other project, if any (Q-015); licence MIT. -->
