# Contributing to Accord

Thank you for helping. This repository holds the Accord website (`apps/web`) and the product (`platform/`: contracts, enclave jobs, SDK, CLI, agent and the deal-room app). Read the README first; `platform/CLAUDE.md` holds the build rules for `platform/`.

## Setup

The website:

```sh
nvm use            # Node from .nvmrc
npm install        # installs the apps/* workspace
npm run dev        # http://localhost:5180
```

The product:

```sh
cd platform
corepack enable && pnpm install   # also builds @accord/sdk and @accord/store, which the others import
make setup-check   # each pinned tool with its version and ok
make test          # cargo tests, then the package, service and app tests
```

## Before you open a pull request

```sh
npm run check      # typecheck, copy rules, reference integrity
npm run build      # production build
npm run check:rendered   # optional: copy rules on the rendered pages (needs Playwright and a running dev server)
```

CI runs the first two on every push to `main` and every pull request, plus `npm run test:serve -w @accord/web` (the site server). For `platform/` it runs `cargo test -p accord-core -p accord-agreement -p accord-factory`, `pnpm -r typecheck` and every package, service and app test; locally, run `make test` too.

## Copy rules

Accord's credibility is its claims. The copy check (`apps/web/scripts/check-copy.mjs`) enforces these, and reviewers enforce the rest.

- Every public statement about Accord is one of the claims in `platform/GOAL.md`, written with its limit next to it.
- No trust words as product adjectives: secure, trustless, bank-grade, military-grade, AI-powered, seamless, revolutionary, autonomous.
- No retired phrases (the list is in the check script and in `GOAL.md`).
- No em-dashes in our own words. Quotations keep their punctuation.
- No competitor dismissals, no claims that nobody else has solved the problem.
- Numbers on the site carry their year and link to their source on `/research`.
- Illustrative product screens say "Illustrative".

## Naming

Accord is one product. Its parts are Sealed Table, Agreement controls, Payee and Evidence checks. Market making is one of six agreement types and the featured one: write "market-making agreements" (the earlier sub-brand name was retired on 8 Nov 2026), and keep `market-making` as the agreement type in code.

## Design

The site uses the tokens in `apps/web/src/styles/tokens.css` and `global.css`. For translucent lines and washes use `rgba(var(--ink-rgb), a)`, never a hard-coded white, so both themes work. Check light and dark mode, desktop and phone, and reduced motion.

## Commits

Conventional commits: `feat(web): …`, `fix(web): …`, `docs: …`, `chore: …`, `ci: …`. One logical change per commit.
