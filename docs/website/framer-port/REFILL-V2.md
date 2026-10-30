# Refill v2: the product-led copy (content/ACCORD_WEBSITE_CONTENT.md)

The owner's rules, in priority order:
1. **The Framer template design stays exactly as it is** (layout, images, cards, animations, colours, breakpoints). Words change; markup geometry does not. Add only what a slot needs (a second button, a short line), in the template's own presets.
2. **Minimise text.** Let images and the card/accordion visuals carry meaning. Short paragraphs. No dense tables on the homepage; deep material lives on the supporting pages (`/product/sealed-table`, `/product/payee`, `/glassbook`, `/security`, `/docs`, `/research`).
3. **Copy comes from `content/ACCORD_WEBSITE_CONTENT.md`** ("the doc"): set the **Public copy** verbatim for the section you are mapped to. Editorial notes are instructions to you, not copy. Do not reuse the old brief's copy (`content/ACCORD_WEBSITE_README.md`) except where this file says so.
4. **Honesty gates** (doc intro + F3/F6): never write "live", "verified", "confirmed", production availability, customer results, audit status, savings, launch dates. Stale data is timestamped (`useLive()` + `asOfLabel()`; label "Last updated"). A recorded demo is labelled "Recorded demo". Revocation is not recall. Attestation is not fairness.
5. **Links** (doc F1): `LINKS` in `src/content/links.ts`. Unconfigured external links (GitHub, demo video) are **omitted**, never rendered as placeholder text: use `LINKS.repo && <a …>`. Internal routes exist: `/agreements/new` (app, may be unset → falls back to `/demo`), `/demo`, `/product`, `/product/sealed-table`, `/product/payee`, `/payee`, `/glassbook`, `/security`, `/docs`, `/research`, `/record`, `/contact`, `/privacy-policy`.
6. **People quotes** (owner request, overrides doc F5 for the one "In their words" section): six quote cards stay on the homepage with REAL photos from `public/assets/people/<slug>.jpg` (illia-polosukhin, eddy-lazzarin, haseeb-qureshi, jack-forestell, simon-willison). Quotes and attributions come from the old brief §4.3 (`content/ACCORD_WEBSITE_README.md`), labelled "verbatim" / "paraphrase" with the source link from `src/content/references.ts` as a small `.ls-link-inline` "source" link. No footnote markers on the homepage.
7. Old-brief words to avoid in our own copy still hold: secure, trustless, bank-grade, military-grade, AI-powered, seamless, revolutionary, autonomous. No em-dashes in our own words.

## Slot map (template section → doc section)
| Template slot (file) | Doc section | Notes |
| --- | --- | --- |
| Hero (`sections/Hero.tsx`) | A2 | eyebrow, H1, two short paragraphs, `Open a deal room` + `Watch the demo`, "Inspect an agreement →" link; hero image stays; 4 action cards = Sealed Table / Agreement controls / Payee / Glassbook with the doc's one-line identities (intro paragraph) |
| Features, 3 image cards (`Features.tsx`) | A3 Product premise | 3 cards + `Explore the deal room` |
| Overview / Showcase (`Overview.tsx`) | A4 Product experience | 5 accordions = Mandates / Agreement / Evidence / Payments / Activity with images 1–5; line + `Inspect an agreement` |
| Compliance, 5 badge cards (`Compliance.tsx`) | A5 Glassbook | eyebrow/H2/lead, three sub-items as text columns, 5 cards = Agreed condition · Observation window · Data coverage · Result · Payment status, scope sentence, `See a Glassbook agreement` |
| NEW `HowSteps.tsx` | A6 How it works | 4 steps in the hero action-card style on the stepper line, two buttons |
| About, 3 image rows (`About.tsx`) | A7 + A8 | rows: Sealed Table, Payee (A7), "Change the instruction. Test the boundary." (A8) with its two buttons |
| Proof (`Proof.tsx`) | A8 live module | heading "Test the demo agent", body, form (Sender name · Subject · Instruction · `Submit an instruction`), form note, result labels from `useLive()`; the two live panels stay; no seven-claims table |
| NEW `Audience.tsx` | A9 | two image cards (content-image-4/5) For buyers / For vendors with their buttons |
| Benefits, 6 icon cards (`Benefits.tsx`) | A10 Trust summary | 6 cards = the six areas with their "What to know" text; buttons `Read the trust model` (/security) · `Review the execution record` (/record) |
| Reviews, 6 cards (`Reviews.tsx`) | people quotes (rule 6) | photos; no tables |
| Integrations, ticker (`Integrations.tsx`) | A11 Developer entry point | heading, two lines, `Read the documentation` (/docs) + `View the repository` (only if LINKS.repo); ticker = NEAR · OutLayer · NEAR AI Cloud · Chain Signatures · Base |
| Faq (`Faq.tsx`) | C | 13 questions, heading "Before you open a deal room." |
| Cta (`Cta.tsx`) | A12 | H2, line, two buttons, environment note only if `LINKS.app` is set |
| Footer / Nav | A13 / A1 | done by the integrator |
| Pages: `pages/SealedTable.tsx` `pages/Payee.tsx` `pages/GlassbookPage.tsx` `pages/Product.tsx` `pages/Security.tsx` `pages/Docs.tsx` `pages/Research.tsx` `pages/Demo.tsx` `pages/Record.tsx` | B1 / B2 / B3 / A3+A7 / A10 + old security tables / A11 + commands / old §4.3 tables + references / "demonstration is being prepared" / live panels | each page = the template's page shell (`.section` max 1080, the Hero-style heading: pill + H1 + lead, then image rows / cards / tables in template style) |

## Done
`npx tsc -b` clean · dev server http://localhost:5180 (don't start another) · Playwright at 1440/810/390: looks like the template, no horizontal scroll, no console errors · `node scripts/check-copy.mjs <your files>` clean. Report: files, doc sections set, anything you had to add or could not set.
