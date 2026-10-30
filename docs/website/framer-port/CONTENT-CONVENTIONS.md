# Accord content rebuild: conventions for section implementers

Source of truth for ALL copy: `content/ACCORD_WEBSITE_README.md` (the brief). Read §1, §2, §3, your section in §4, §5, §6, §7 before writing. Rules that bind you:

1. **Copy is final. Set it exactly as written.** Do not improve, shorten, add or paraphrase. Smart quotes/apostrophes as in the brief. Sentence case headings/buttons. No em-dashes anywhere (the brief has none; don't introduce one).
2. **Every number carries `<Ref n={…} />`** right after it (from `src/components/Ref`), using the footnote numbers in the brief. Never a number without its marker.
3. **Monospace for every metric, command, account id, refusal string and state name**: wrap in `<Mono>` (`src/components/Mono`). Refusal strings / canary / revocation lines use `<Mono tone="refusal">`; that is the only red on the site.
4. **Forbidden words/phrases (brief §2 rules 2 and 4)**: secure, trustless, bank-grade, military-grade, AI-powered, seamless, revolutionary, autonomous (adjective for the product); "agreement layer", "hand your agent a budget" (NB: the brief's own copy in §4.4 and FAQ 1 uses "hand an agent a budget" / "hand the agent a budget" — those exact lines are allowed because they are the brief's; do not write new ones), "the deal is the account", "the slow middle", "neutral ground" as a headline, "negotiated blind", "executable agreements", "smart legal contracts", "keys die everywhere", "revoked everywhere", "private payments", "confidential settlement", "verified business", "nothing leaks". Run `grep -ri` on your files before reporting.
5. **No sections, testimonials, logo walls, volume counters, roadmap dates or judges' names** beyond what the brief specifies.
6. **Live values** (`<live:attempts>`, `<live:last_refusal>`, `<live:agreement>`, `<live:balance>`, `<live:slots>`): use `useLive()` + `asOfLabel()` from `src/lib/live.ts`. Show the value with its source label ("live" or "last known · timestamp"). Never hard-code a number for them. Placeholder links/ids come from `src/content/links.ts` (`LINKS`, `isPlaceholder`): render a placeholder as plain text, never as a broken link.
7. **Buttons**: `<Button href={LINKS.openDealRoom}>Open a deal room</Button>` (primary) and `<Button href={LINKS.verifyDomain} variant="secondary">Verify your domain</Button>`.

## Design system (keep the template's look; it is the user's explicit choice)

- Section root: `<section id="<anchor from brief §3>" className={\`section ${styles.section}\`}>` with the template rhythm: `gap: 64px; padding: 72px 0; scroll-margin-top: 40px`; Tablet `gap 48; padding 72px 24px`; Phone `gap 32; padding 72px 16px`. Breakpoints: `@media (max-width: 1199.98px)` tablet, `@media (max-width: 809.98px)` phone. Phone: 16px gutters, no horizontal page scroll.
- Heading: `<SectionHeading eyebrow="…" title="…" lead={…} accent="…" />` (`src/components/SectionHeading`). Eyebrow = a short label you take from the brief's section name (e.g. "The problem", "In their words"); title = the brief's headline; lead = the brief's lead. Accent colours cycle through the template palette: hero white, problem orange, named yellow, room green, how teal, proof cyan, security blue, audiences purple, glassbook pink, compare lime, near orange, faq yellow, references teal.
- Cards: fill `var(--elevation-strong)`, radius 4, padding 24px 20px (or 32px 24px for content cards), gap 16–24, hairline `1px solid var(--hairline)` only where a divider is needed. Nested/secondary surfaces `var(--elevation-medium)`.
- Tables: `<div className="table-wrap"><table className="table">…</table></div>` (`.table-dense` for §4.3 bibliography). `<th>` headers always. Phone: scroll inside the wrapper.
- Type: headings `.t-h2` (section), `.t-h4`/`.t-h5` (card titles), body `.t-body-lg` (leads) / `.t-body-sm` (table cells, dense text), labels `.t-h6`. Mono via `.mono` / `<Mono>`.
- Motion: the template's appear pattern only. Use `Appear` from `src/lib/motion.tsx` with the standard effect (`appear("0s")`, cards staggered by 0.1s, from `src/components/SectionHeading` export `appear`). No other animation.
- Every section ends in a command (`<Mono block>` or inline) or a CTA, never a slogan, exactly where the brief puts it.
- Reusable existing components you may use: `Button`, `Mono`, `Ref`, `SectionHeading`, `Dots`, `FaqAccordion` (+ its CSS), `ContentCard`, `IconCard`, `MediaCard`, `TestimonialCard` is NOT to be used (no testimonials).

## Deliverable

- `src/sections/<Name>.tsx` + `<Name>.module.css` (replace the stub; keep the export name). Shared pieces you create go in `src/components/` with your section's name prefix.
- `npx tsc -b` clean. Dev server at http://localhost:5180 (do not start another). Verify at 1440 / 810 / 390 with Playwright if you can (`~/.npm/_npx/e41f203b7505f1fb/node_modules/playwright`, Chromium cached in `~/Library/Caches/ms-playwright`): no horizontal page scroll on phone, tables scroll inside their wrapper, no console errors.
- Report: files, anchors, every number → ref mapping you used, any brief line you could not set verbatim and why.
