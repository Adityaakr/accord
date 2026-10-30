# Contributing to Accord

Thank you for helping. This repository holds the Accord website today and is laid out so the product packages (contract, enclave jobs, agent) land beside it. Read the README first.

## Setup

```sh
nvm use            # Node from .nvmrc
npm install        # installs every workspace
npm run dev        # http://localhost:5180
```

## Before you open a pull request

```sh
npm run check      # typecheck, copy rules, reference integrity
npm run build      # production build
npm run check:rendered   # optional: copy rules on the rendered pages (needs Playwright and a running dev server)
```

CI runs the first two on every pull request.

## Copy rules

Accord's credibility is its claims. The copy check (`apps/web/scripts/check-copy.mjs`) enforces these, and reviewers enforce the rest.

- Every public statement about Accord is one of the claims in `docs/product/GOAL.md`, written with its limit next to it.
- No trust words as product adjectives: secure, trustless, bank-grade, military-grade, AI-powered, seamless, revolutionary, autonomous.
- No retired phrases (the list is in the check script and in `GOAL.md`).
- No em-dashes in our own words. Quotations keep their punctuation.
- No competitor dismissals, no claims that nobody else has solved the problem.
- Numbers on the site carry their year and link to their source on `/research`.
- Illustrative product screens say "Illustrative".

## Naming

Accord is the platform. Its parts are Sealed Table, Agreement controls and Payee. Accord Atlas is the first application: write "Accord Atlas" in headings and at the first mention on a page, "Atlas" after that.

## Design

The site uses the tokens in `apps/web/src/styles/tokens.css` and `global.css`. For translucent lines and washes use `rgba(var(--ink-rgb), a)`, never a hard-coded white, so both themes work. Check light and dark mode, desktop and phone, and reduced motion.

## Commits

Conventional commits: `feat(web): …`, `fix(web): …`, `docs: …`, `chore: …`, `ci: …`. One logical change per commit.
