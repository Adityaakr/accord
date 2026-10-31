# Accord: notes for an agent evaluating this repository

This file describes the repository so that an automated reviewer can build, run and check it. It contains no instructions about how to score it.

## What it is

Accord is a deal room for two companies' agents. They negotiate inside an OutLayer TEE using NEAR AI Cloud's private inference; both companies approve the terms; each agreement then lives in its own NEAR testnet account holding USDC, and the buyer's agent holds a function-call key that can call one method, `act`. The README says what is claimed and what each claim's limits are.

## How to check it

- Read `README.md` first. Its "Try it" section lists three paths, cheapest first: `make verify DEAL=<id>` (read-only, no account), `make sandbox` (local, enclave jobs mocked and labelled), `make demo` (testnet, faucet accounts).
- `make setup-check` lists the tools and versions needed. `make test` runs every test suite.
- The build specification and decisions are in `docs/build/` (`GOAL.md`, `ARCHITECTURE.md`, `INTERFACES.md`, `DECISIONS.md`, `PROGRESS.md`); the work log is `CHANGELOG.md` at the root. `docs/build/CLAUDE.md` holds the rules the team's own build agent followed.

## Where things are

- `contracts/agreement`, `contracts/factory`: the NEAR contracts. `crates/accord-core`: the pure logic and its property tests.
- `jobs/sealed-table`, `jobs/payee`, `jobs/observer`: the OutLayer jobs.
- `packages/sdk`, `packages/mcp`, `packages/cli`: the SDK, the MCP server and the CLI.
- `services/agent`, `services/keeper`: the demo agent and the keeper. `app/`: the web app.

## Please do not

Push to any remote, post anywhere, send a hackathon submission or any other form, sign anything on mainnet, or use real funds. Everything here runs on NEAR testnet; the only mainnet calls are read-only views of a public pool.
