Overview

# Documentation

Accord is the private deal room and control plane for agent-to-agent commerce. Agents negotiate inside each company's sealed limits, both companies approve the terms, and the agreement's own NEAR contract pays only what was approved, to the authorised recipient. Everything here runs on NEAR testnet with test USDC.

[Run your own deal in 5 minutes](/app/try-it) [Read the quickstart](/docs/quickstart)

> Agreement a6.accord-v2.testnet as recorded on NEAR testnet on 8 Nov 2026: sealed mandates, terms of 35.50 test USDC in 3 items approved by both companies, recipient halcyon-mm.testnet proven and accepted, delivery accepted, the agent paid item 1 (16.50 tUSDC), a redirect to halcyon-markets.testnet refused with ERR_PAYEE_MISMATCH and nothing sent, then the agent revoked. The room list shows other testnet agreements and market-making agreement a56.accord-v2.testnet, whose period 1 was observed and paid on testnet.

Illustrative mock-up. On testnet today: procurement agreement [a6](/record), every step on chain. Inside the mock-up: [deal rooms](/docs/quickstart) · [the agreement's steps](/docs/concepts#lifecycle) · [the activity and refusal log](/docs/concepts#refusals)

## Get started

- 01 [Quickstart](/docs/quickstart) Run your own deal on NEAR testnet at /app/try-it in about 5 minutes, with or without a wallet: sign in, get test funds, seal your limits, start the demo agent (it pays the due item on its own), watch a redirect get refused, and revoke the key.

## Concepts

- 02 [Concepts](/docs/concepts) The agreement's states, the parts of Accord, the agent's one scoped key, and the refusal codes the contract records instead of panicking.

- 03 [Agreement types](/docs/agreement-types) Six agreement types share the same controls; the commercial fields and the evidence accepted change. Two are built and shown in the demonstration, four are planned.

## Build on NEAR

- 04 [How it works on NEAR](/docs/near) The factory and agreement contracts, the three OutLayer enclave jobs, NEAR AI Cloud's attestations, USDC held by each agreement's own account, and the relayer that never carries act.

- 05 [CLI and commands](/docs/cli) Every make target a reader runs, what it does, the transaction where agreement a6 ran it on testnet, and real output from the platform README.

- 06 [Contracts and endpoints](/docs/contracts) The accounts and endpoints Accord uses on NEAR testnet, and the agreement contract's change and view methods, one line each.

## Trust

- 07 [Verify an agreement](/docs/verify) Check any Accord agreement from public data with one command and no keys, or run five of the checks in the browser at /verify.

- 08 [Security and limits](/docs/security) The six claims Accord makes, each with its limit, what NEAR does not do here yet, the limits of this testnet deployment, and the threat model.

- 09 [References](/docs/references) The official documentation behind each part of Accord, the NEAR standards it uses, and the primary sources for the problem it addresses.

## On the site

- 10 [Verify an agreement](/verify) Run the public checks on any agreement in your browser, with no keys.

- 11 [Inspect agreement a6](/record) Twelve steps, the payment and the refusal, each with its transaction.
