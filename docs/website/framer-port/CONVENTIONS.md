# Accord — Framer → React port conventions (read fully before touching a section)

Goal: a **pixel- and motion-exact** local port of the Framer project
`https://framer.com/projects/Asset-copy--FtoD6CPL6XTjffzJp9iJ-26og3` (title "Asset (copy)", brand already renamed to Accord).
Every value you write must come from the Framer tree, not from the screenshot or your taste.

## How to read the source
1. Call the Framer MCP `open_project` with the URL above → you get a `session` handle.
2. In `exec`, paste the entire contents of `framer-export/compact.js` at the top of your program, then call:
   - `dumpScope("<nodeId>")` – full compact subtree (Desktop / primary variant).
   - `dumpScope("uX81zskxr<nodeId>", true)` – Tablet overrides only. `dumpScope("Ue6QXWSr_<nodeId>", true)` – Phone overrides only.
   - `dumpComponent("<componentId>")` – a canvas component with all variants (replicas as diffs).
   - `collectAssets("<nodeId>")` – asset refs + icons inside a subtree.
   - `await api.tree.screenshot("<nodeId>")` – reference screenshot; use `view_image`-style inspection to compare.
   - For `ComponentInstanceNode`s, read `$control__<varId>` keys to get the instance's text/image/variant overrides; `api.controls.components([id])` gives the control schema.
   - Icons: `api.tree.toSVG(iconNodeId)` exports the SVG. Vector shapes: `toSVG(shapeContainerId)`.
   - A program that returns > ~40 KB is truncated: split by subtree or `api.store(key, json)` then `api.load(key).slice(a, b)`.
3. Framer semantics → CSS (be literal):
   - `layout: stack` → `display:flex`; `stackDirection` → `flex-direction`; `stackAlignment` (cross axis) → `align-items`; `stackDistribution` (main axis) → `justify-content`; `gap`; `padding`.
   - `width/height: "1fr"` → fills the parent's axis: inside a **horizontal** stack `flex: 1 1 0px; min-width:0`; inside a **vertical** stack `width: 100%` (height 1fr → `flex:1 1 0px`).
   - `"auto"` → hug content. `"100%"` → `width:100%`. `maxWidth/minWidth` → literal.
   - `layout: grid` → `display:grid`; `gridColumnCount` → `grid-template-columns: repeat(n, minmax(0,1fr))`; `gridColumnMinWidth` → `repeat(auto-fill, minmax(Xpx, 1fr))`; `gridRowHeightType: auto` → `grid-auto-rows: 1fr`, `fit` → `auto`.
   - A node with **no** `layout` positions its children absolutely by their pins (`left/top/right/bottom`, `centerAnchorX/Y`).
   - `position: absolute` + pins → literal. `zIndex` → literal. `overflow: clip/hidden` → literal.
   - `fill: var(--token-…)` → use the same `var(--token-…)` (all tokens exist in `src/styles/tokens.css`, aliases too). `fill: data:framer/asset-reference,<ID>.png…` → `background-image:url("/assets/<file>.png"); background-size:cover` — look the file up in the asset map below.
   - `border*`, `radius`, `boxShadows[]` (→ `box-shadow` comma list), `opacity`, `blur` (→ `filter: blur()`), `backgroundBlur` (→ `backdrop-filter`), `blendingMode` (→ `mix-blend-mode`), `masks` (→ `mask-image`), `aspectRatio` → literal.
   - Text: `textStylePreset` ids → classes in `src/styles/global.css` (`.t-h1 … .t-h6 .t-link .t-body-lg .t-body-sm .t-h2-32 .t-h3-24 .t-h1-38`). Inline `fontSize/fontWeight/textColor/lineHeight/letterSpacing/textAlignment` on a node override the preset → write them as CSS. `linkStylePreset` HNT3wvBos → `.ls-link`, FTn6Ho50C → `.ls-link-inline`. Keep the `tag` (h1…h6/p). Preserve smart quotes/apostrophes and `\n` line breaks (`<br/>`).
   - `textWrap: balance` → `text-wrap: balance`. `textTruncation` → line clamp.
4. Motion (use `motion/react`; helpers in `src/lib/motion.tsx`):
   - `appearEffect` → `<Appear effect={…}>` (pass the exact JSON) or `motion.div` with `initial/whileInView/viewport{once, amount}` and `toTransition(t)`.
   - `hoverEffect`/`tapEffect`/gesture variants (`$gesture: "hover" | "pressed"`) → `whileHover`/`whileTap` with the variant's diff values and the node's `transition`.
   - `transition` on a variant frame = the transition used when switching variants → use it for `animate`/`layout` transitions.
   - `loopEffect` → `animate` with `repeat: Infinity`, `repeatType`, `repeatDelay`.
   - `tickerEffect` (Logos ticker) → an infinite CSS/motion marquee: duplicate the track, translateX −50%, velocity = px/s, `hoverModifier` slows/pauses, `directionModifier`.
   - `scrollVariantEffect`, `styleTransformEffect`, `parallaxEffect` → `useScroll`/`useTransform`.
   - Component variant switching via `onTap: SET_VARIANT` → React state; `cycle` → next variant. Variant transition = the variant frame's `transition`. Use `AnimatePresence`/`layout` so height/opacity changes animate like Framer's layout transitions.
   - `textEffect` (per-word/char reveal) → split text and stagger with the given transition.
5. Breakpoints: Desktop `(min-width: 1200px)` is the base. Tablet `@media (max-width: 1199.98px)`, Phone `@media (max-width: 809.98px)`. Write desktop CSS first, then the Tablet/Phone override blocks from the replica diffs. A node with `visible:false` in a replica → `display:none` in that media query (and vice versa for nodes hidden on desktop).
6. Page shell: the breakpoint is a vertical stack centered; each top-level section is `width:1fr` + `maxWidth` (usually 1080px) → use `className="section"` (defined in global.css: `position:relative; width:100%; max-width:1080px; display:flex; flex-direction:column; align-items:flex-start`) and add the section's own `gap`/`padding`. On Tablet/Phone most sections add horizontal padding 24px — copy what the replica says.
   Every section needs `id="<elementId>"` (hero, overview, features, integrations, benefits, about, reviews, pricing, compliance, faq, cta) so nav hash links work.

## Repo layout (Vite + React 19 + TS, plain CSS Modules)
- `src/styles/tokens.css` – color tokens (ids preserved). `src/styles/global.css` – reset, text presets, link presets, `.section`.
- `src/lib/motion.tsx` – `Appear`, `toTransition`, `EASE_APPEAR [0.12,0.23,0.5,1]`, `EASE_APPEAR_SLOW [0.12,0.23,0.17,0.99]`, `EASE_UI [0.44,0,0.56,1]`, `SPRING_UI {0.4s, bounce 0.2}`.
- `src/components/` – `Button` (Primary/Secondary, `href`, `openInNewTab`, `fullWidth`), `Logo`/`LogoMark`, `Hamburger`, `Nav`, `Footer`, `Dots` (absolute 920×780 dots bg; pass `effect` when the Framer node has an appearEffect).
- `src/sections/<Name>.tsx` + `<Name>.module.css` – one file pair per home section. Export name and `id` must match the stub you replace.
- `src/pages/` – `Home` (already composes sections), `NotFound`, `PrivacyPolicy`, `Contact` stubs.
- Reusable canvas components (Content Card, Icon Card, Testimonial card, Media card, Logo Card, Showcase accordion, FAQ Accordion, Action card) → create `src/components/<Name>.tsx` + `.module.css` only if your section is the first to need it; check the folder first.
- Assets are in `public/assets/` (served at `/assets/...`). Asset map (Framer id → file):
  dots zPRaBFP7… → dots.png · hero Sh880sHy… → hero-image-2.png · Content-Image-1 QdBy8tuS… → content-image-1.png · Image e47XRTAf… → image.png · Content-Image-3 67kmPP65… → content-image-3.png · content-image-4 QDJ1llyO… → content-image-4.png · content-image-5 1syVCCka… → content-image-5.png · content-image-6 Vxk0TjEz… → content-image-6.png · avatars YQK93vI1/oA6anzOz/SiRls1AX/ItMpUsnu/9QcSbXS1/q3d47k6G → avatar-1…6.png · default avatar wvJZ12b8… → avatar-default.png · CCPA EWUrHU3u… → ccpa.png · ISO o3TiXxdk… → iso.png · GDPR mp8tEqGA… → gdpr.png · ENCRYPTED BvAdbZih… → encrypted.png · SOC RyDsR0fD… → soc.png · CTA image WhBcHipW… → cta-image.png · thumbnail xLrLAqDa… → thumbnail-1.png · logos EEj4wGO6 microsoft / PZZBOiNn make / YJlv4Wzd drive / ed9V9yLM monday / 5y77SUsk intercom / SdSj5jVy zapier / DpnhjqAn confluence / v5LKosv7 flatfile / V8vFhIZV airtable → logo-<name>.png · Showcase-image-1…5 PjqyNkmF/kBHFlqra/oPhC01aY/n2xJW9ln/qPVP81K0 → showcase-image-1…5.png · content-card default qKkxsvMm… → content-card-default.png.
  If you meet an asset id not in this map, download it: `curl -sfL https://framerusercontent.com/images/<ID>.<ext> -o public/assets/<name>` and note it in your report.
- Icons come from vector set `Y7SpbVH16cWqMhj75z1M`; export each needed icon with `api.tree.toSVG(iconNodeId)` and inline it as a React component in `src/components/icons.tsx` (append; don't clobber others' icons — re-read the file right before writing).

## Done means
- `npm run typecheck` passes; `npm run dev` renders your section with no console errors.
- Desktop (1440 wide), Tablet (810) and Phone (390) match the Framer screenshots of the same node: spacing, sizes, type, colors, image crops, hover/press states, and every appear/loop/ticker/accordion animation.
- Report back: files written, Framer node ids covered, any value you could not reproduce (with the reason), and any shared component you created.
