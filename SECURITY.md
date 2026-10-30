# Security policy

Accord runs on NEAR testnet. There is no mainnet deployment and no audit yet; mainnet follows an audit.

## Reporting a vulnerability

Please report privately through GitHub: **Security → Report a vulnerability** on this repository. Do not open a public issue.

Include what you found, how to reproduce it and what an attacker could do with it. We aim to acknowledge reports within three working days.

## Scope

- The agreement contract, the enclave jobs (negotiation, payee verification, observation) and the agent, as specified in `docs/product/GOAL.md`.
- The website in `apps/web`, including its forms and any endpoint it calls.

## What Accord does and does not claim

Read the claims table in the README before reporting a design issue: each claim is stated with its limit. A finding that goes beyond a stated limit is exactly what we want to hear about.
