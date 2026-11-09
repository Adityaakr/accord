# Security policy

Accord runs on NEAR testnet. There is no mainnet deployment and no third-party audit yet; mainnet follows an external audit.

An internal security review ran on 9 Nov 2026: five AI-assisted review passes, each on a separate code area (the payment path; authorisation and keys; creation and code integrity; funds; the enclave jobs), with every finding re-checked by separate reviewers who reproduced it as a test. It is not a third-party audit. It found 1 High, 5 Medium (one of them Medium-Low) and 4 Low issues; the contract and factory fixes are release 4 on both testnet factories, and agreements created before release 4 keep release 3's code. Every finding, fix, test and commit, and the limits that remain: [`platform/DECISIONS.md`](platform/DECISIONS.md) sections 25 and 26.

## Reporting a vulnerability

Please report privately. Open a private security advisory (**Security → Advisories → Report a vulnerability**) if it is enabled on this repository; otherwise contact the maintainer through the GitHub profile [github.com/Adityaakr](https://github.com/Adityaakr) and ask for a private channel. Do not open a public issue.

Include what you found, how to reproduce it and what an attacker could do with it. We aim to acknowledge reports within three working days.

## Scope

- The agreement contract, the enclave jobs (negotiation, payee verification, observation) and the agent, as specified in `platform/GOAL.md` and built in `platform/`.
- The website in `apps/web`, including its forms and any endpoint it calls.

## What Accord does and does not claim

Read the claims table in the README before reporting a design issue: each claim is stated with its limit. A finding that goes beyond a stated limit is exactly what we want to hear about.
