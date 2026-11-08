# Accord website (`apps/web`)

The marketing site for Accord, live at https://accordweb-production.up.railway.app. Vite and React, prerendered to static HTML so agents and crawlers read every page without JavaScript. In production it also serves the deal-room app at `/app` by proxying to the app service.

## Commands

Run from the repository root (npm workspace) or from `apps/web` without `-w`.

| Do | See |
| --- | --- |
| `npm ci` | Dependencies installed (repository root) |
| `npm run dev` | Vite on http://localhost:5180 |
| `npm run check` | `tsc -b`, then `check-copy: clean` and the footnote check (every `<Ref>` resolves to `src/content/references.ts`) |
| `npm run build` | `tsc -b`, `vite build`, then `scripts/prerender.mjs` writes each route's HTML, `/llms.txt`, `/llms-full.txt`, `/sitemap.xml`, `/robots.txt` and `/404.html` into `dist` |
| `npm start` | `scripts/serve.mjs` serves `dist` on `$PORT` (default `5180`) with `/healthz` |
| `npm run check:rendered -w @accord/web` | Renders each route of a running build in headless Chromium and checks the visible text for retired phrases and em-dashes |
| `npm run seo:snapshot -w @accord/web` | Refreshes `seo/pages`, the page content the prerender injects |

## Where things live

| Path | What |
| --- | --- |
| `src/pages/` | One component per route: Home, Product, Sealed Table, Payee, market making (`/use-cases/market-making`, alias `/atlas`), Security, Docs, Verify, Record, Research, Join, Try, Contact |
| `src/sections/`, `src/components/` | Page sections and shared components (`GatesFlow.tsx` is the `act` gate order, `AttackScene.tsx` is "Where each attack stops") |
| `src/content/testnet.ts` | Every testnet fact the site shows: factory `accord-v2.testnet`, release `3`, agreement `a6.accord-v2.testnet` and the transaction behind each step |
| `src/content/docs/` | The `/docs` pages as data |
| `src/content/links.ts` | Route and CTA map; the app is at `/app` unless `VITE_APP_URL` overrides it |
| `seo/facts.mjs` | The facts agents read (`llms.txt`, `/facts.json`, JSON-LD), kept inside what is built |
| `scripts/serve.mjs` | The production server: static files, SPA fallback, `/app` proxy |
| `public/docs/` | Screenshots used by the docs pages and the READMEs |

## The `/app` proxy

`/app` and `/app/*` are forwarded to the Next.js app in `platform/app` when `APP_ORIGIN` is set (the app service's URL, no trailing slash). The proxy keeps the visitor's host in `x-forwarded-host` and rewrites redirects to the app's own origin back to this site. Without `APP_ORIGIN`, `/app` answers `503` with a short "starting up" page that links to `/verify`.

```bash
# the app on :3100 (see platform/README.md), then:
npm run build && APP_ORIGIN=http://localhost:3100 npm start
```

## Configuration

All optional, build time (declared as build args in the root `Dockerfile`): `SITE_URL`, `VITE_ACCORD_API_URL`, `VITE_APP_URL`, `VITE_CONTACT_EMAIL`, `VITE_CONTRACT_ID`, `VITE_DEMO_VIDEO_URL`, `VITE_REPO_URL`, `VITE_X_POST_URL`. Run time: `PORT`, `HOST`, `APP_ORIGIN`. Unset external links are not rendered.

## Deployment

Railway builds the root [`Dockerfile`](../../Dockerfile) (see [`railway.json`](../../railway.json)): install, typecheck, Vite build, prerender, then `node apps/web/scripts/serve.mjs` with health check `/healthz`. The app service is described in [`platform/DEPLOY.md`](../../platform/DEPLOY.md).

## Copy rules

Facts come from the platform kit (`platform/GOAL.md` is the source for every claim). Sentence-case headings, no em-dashes, monospace for numbers, commands, states and error codes. `npm run check` fails on the trust words and retired phrases listed in `scripts/check-copy.mjs`.
