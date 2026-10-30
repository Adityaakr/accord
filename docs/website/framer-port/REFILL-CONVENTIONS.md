# Refill conventions: keep the template, swap the words

The owner's instruction, which overrides the brief's design direction: **the original Framer template design stays exactly as it is** (layout, images, animations, colours, card shapes, breakpoints). Only the words change. Where the brief has content the template has no slot for, add it **inside the same section** with the template's own card/table styling, or as one of the already-added table sections.

## Your inputs
- The ORIGINAL section file(s) you were given (restored from the Framer port): keep their JSX structure, CSS modules, motion and images. Edit copy in place. Do not restyle, re-space or re-animate anything. Do not remove images.
- The brief: `content/ACCORD_WEBSITE_README.md` (v4). Copy is set verbatim from the section you were mapped to.
- A parked content file in `framer-export/content-sections/` holds the same brief copy already typed as JSX with `<Ref>`/`<Mono>` markup, plus table markup. **Reuse its data/markup for the words**; do not reuse its layout where the template has one.

## Rules (brief §2, as they apply here)
1. Every sourced number carries `<Ref n={…} />` (`src/components/Ref`). Product parameters (`24 h`, `k` of `n`, `1%` of mid, live counts) carry none.
2. `<Mono>` for every metric, command, account id, refusal string and state name; `<Mono tone="refusal">` only for refusal strings, canary and revocation lines.
3. Forbidden: secure, trustless, bank-grade, military-grade, AI-powered, seamless, revolutionary, autonomous (product adjective); "agreement layer", "hand your agent a budget" (the brief's own "cannot hand an agent a budget" / "hand the agent a budget" lines are allowed verbatim), "the deal is the account", "the slow middle", "neutral ground" (headline), "negotiated blind", "executable agreements", "smart legal contracts", "keys die everywhere", "revoked everywhere", "private payments", "confidential settlement" (except the brief's own §4.12 clause), "verified business", "nothing leaks". No em-dashes in our own words; verbatim quotes keep theirs.
4. Where a template slot has no matching brief text (e.g. a pill label, a card eyebrow), use the brief's own section name or a phrase lifted from the brief; never write a new sentence. Where the template needs a short text and the brief gives a long one, use the long one and let the template wrap (do not cut copy).
5. Where brief content needs an element the template slot lacks (a bullets list under a description, a mono command foot on a card, a tertiary link row, a table under a card row), add it in the template's existing style: text presets `.t-body-sm/.t-body-lg/.t-h5/.t-h6`, hairline `1px solid var(--hairline)`, cards `var(--elevation-strong)` radius 4, tables `.table-wrap > .table` (`.table-dense` for bibliographies), with the section's own `appear()` stagger. Breakpoints `@media (max-width: 1199.98px)` / `(max-width: 809.98px)`.
6. Links/buttons: `LINKS` from `src/content/links.ts` (`openDealRoom`, `verifyDomain`, `oneSided`, `demo`, `record`, `repo`); `isPlaceholder()` → render as text, not a dead link. Live values: `useLive()` / `asOfLabel()` from `src/lib/live.ts`, never hard-coded.
7. Images: keep the template's. No stock faces attributed to real people: the testimonial avatar becomes a 48px circle with mono initials, same size/radius.

## Done
- `npx tsc -b` clean. Dev server at http://localhost:5180 (do not start another). Verify at 1440/810/390 with Playwright (`~/.npm/_npx/e41f203b7505f1fb/node_modules/playwright`, Chromium in `~/Library/Caches/ms-playwright`): the section still looks like the template (same images, cards, motion), no horizontal page scroll, no console errors.
- `node scripts/check-copy.mjs src` shows no hits in your files.
- Report: files, number→Ref mapping, any brief line not set verbatim and why, and anything you had to add beyond the template slot.
