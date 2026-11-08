#!/usr/bin/env node
/* Post-build: writes a real, crawlable HTML file for every route, plus the files AI agents and search engines read.
   For each route in seo/routes.mjs it injects the page's title, description, canonical URL, Open Graph and Twitter tags,
   JSON-LD (Organization, WebSite, SoftwareApplication, WebPage, BreadcrumbList, and any page-level data such as
   FAQPage) and the page's content as semantic HTML inside #root. React replaces that content on load; agents and
   crawlers that do not run JavaScript read it as is. Also writes: /<slug>.md (each page as Markdown), /llms.txt,
   /llms-full.txt, /sitemap.xml, /robots.txt and /404.html. Content comes from seo/pages (npm run seo:snapshot). */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { ROUTES, SITE_URL } from "../seo/routes.mjs"
import { ACCOUNTS, ANSWERS, BUILT_ON, CLAIMS, CONTROLS, FOR_AGENTS, GLOSSARY, HOW_STEPS, NAMING, NOT_DONE, ONE_LINE, REPO, STATUS, TRY_STEPS, USE_CASES } from "../seo/facts.mjs"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const DIST = join(ROOT, "dist")
const PAGES = join(ROOT, "seo/pages")
const TEMPLATE = readFileSync(join(DIST, "index.html"), "utf8")
const OG_IMAGE = `${SITE_URL}/og-image.png`
const TODAY = new Date().toISOString().slice(0, 10)
const TAGLINE = "The private deal room and control plane for agent-to-agent commerce."
const ABOUT = "Accord is the private deal room and control plane for agent-to-agent commerce on NEAR. It turns private negotiations into enforceable payment rules. Two companies' agents negotiate in confidence inside an attested enclave (the Sealed Table); both companies approve the terms; from then on those terms are the only authority the buyer's agent has over money. A NEAR contract (Agreement controls) refuses any payment whose amount, milestone or recipient differs from the approved terms, and Payee binds the recipient to a domain the vendor controls. Settlement is USDC on NEAR. Agreement types (market making, security remediation, infrastructure services, agent-to-agent services, vendor contracts and grants) change the commercial fields and the evidence accepted, not the controls. Two types are built: vendor contracts, which ran end to end on NEAR testnet (agreement a6.accord-v2.testnet), and the featured market-making agreement, a retainer paid only for periods where enough observations of the venue's public liquidity, taken at hidden times, met the agreed spread, depth and two-sided quoting (run end to end on a local node reading real NEAR mainnet blocks; not yet on testnet). The other four are planned. Accord runs on NEAR testnet only; mainnet follows an audit."

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
const abs = (href) => (href.startsWith("/") ? SITE_URL + href : href)

/* Minimal Markdown → HTML for the captured pages (headings, paragraphs, lists, quotes, tables, links, code, bold) */
function inlineMd(t) {
  let s = esc(t)
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>")
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, txt, href) => `<a href="${href}">${txt}</a>`)
  return s
}
function mdToHtml(md) {
  const blocks = md.split(/\n{2,}/)
  const html = []
  let list = []
  const flush = () => { if (list.length) { html.push(`<ul>${list.map((l) => `<li>${inlineMd(l)}</li>`).join("")}</ul>`); list = [] } }
  for (const b of blocks) {
    const t = b.trim()
    if (!t) continue
    if (t.startsWith("- ")) { list.push(t.slice(2)); continue }
    flush()
    const h = t.match(/^(#{1,6}) (.*)$/)
    if (h) { const n = Math.min(h[1].length, 6); html.push(`<h${n}>${inlineMd(h[2])}</h${n}>`); continue }
    if (t.startsWith("> ")) { html.push(`<blockquote>${inlineMd(t.slice(2))}</blockquote>`); continue }
    if (t.startsWith("| ")) {
      const rows = t.split("\n").filter((r) => !/^\|\s*-+/.test(r)).map((r) => r.replace(/^\||\|$/g, "").split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, "|")))
      const [head, ...body] = rows
      if (!head) continue
      html.push(`<table><thead><tr>${head.map((c) => `<th>${inlineMd(c)}</th>`).join("")}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${inlineMd(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`)
      continue
    }
    html.push(`<p>${inlineMd(t)}</p>`)
  }
  flush()
  return html.join("\n")
}

const pageData = (slug) => {
  const md = existsSync(join(PAGES, `${slug}.md`)) ? readFileSync(join(PAGES, `${slug}.md`), "utf8") : ""
  const meta = existsSync(join(PAGES, `${slug}.json`)) ? JSON.parse(readFileSync(join(PAGES, `${slug}.json`), "utf8")) : {}
  return { md, meta }
}

const ORG = {
  "@context": "https://schema.org", "@type": "Organization", "@id": `${SITE_URL}/#organization`,
  name: "Accord", url: `${SITE_URL}/`, logo: `${SITE_URL}/assets/favicon-dark.png`, description: TAGLINE, sameAs: [REPO],
}
const WEBSITE = { "@context": "https://schema.org", "@type": "WebSite", "@id": `${SITE_URL}/#website`, name: "Accord", url: `${SITE_URL}/`, description: TAGLINE, publisher: { "@id": `${SITE_URL}/#organization` }, inLanguage: "en" }
const APP = {
  "@context": "https://schema.org", "@type": "SoftwareApplication", "@id": `${SITE_URL}/#software`,
  name: "Accord", applicationCategory: "BusinessApplication", applicationSubCategory: "Agent payments and negotiation infrastructure",
  operatingSystem: "Web", url: `${SITE_URL}/`, description: ABOUT, image: OG_IMAGE,
  featureList: CONTROLS.map((c) => `${c.name}: ${c.text}`),
  isAccessibleForFree: true,
  offers: { "@type": "Offer", name: "NEAR testnet", url: `${SITE_URL}/app/try-it`, price: "0", priceCurrency: "USD", availability: "https://schema.org/InStock", description: "Free on NEAR testnet with test USDC: open /app/try-it with a NEAR wallet. Mainnet follows an audit. Planned: Accord Teams (subscription) and market-making agreements (per monitored market). No percentage-based Accord fee on payment amounts; production prices are published before launch." },
  publisher: { "@id": `${SITE_URL}/#organization` }, sameAs: [REPO],
}
/* The public source: the contracts, enclave jobs, SDK, MCP server, CLI, app and this site */
const SOURCE = {
  "@context": "https://schema.org", "@type": "SoftwareSourceCode", "@id": `${SITE_URL}/#source`, name: "Accord source code",
  codeRepository: REPO, url: REPO, license: "https://opensource.org/licenses/MIT", programmingLanguage: ["Rust", "TypeScript"],
  runtimePlatform: "NEAR", targetProduct: { "@id": `${SITE_URL}/#software` }, author: { "@id": `${SITE_URL}/#organization` },
}

/* Home: the six agreement types as an ItemList, and the glossary as a DefinedTermSet */
const USE_CASE_LIST = {
  "@context": "https://schema.org", "@type": "ItemList", "@id": `${SITE_URL}/#use-cases`, name: "Accord agreement types",
  description: "Six agreement types share the same controls; the commercial fields and the evidence accepted change.",
  itemListElement: USE_CASES.map((u, i) => ({
    "@type": "ListItem", position: i + 1,
    item: { "@type": "Service", "@id": `${SITE_URL}/#use-case-${u.id}`, name: u.name, description: `${u.outcome} ${u.how} Status: ${u.status}.`, url: abs(u.url), provider: { "@id": `${SITE_URL}/#organization` }, isRelatedTo: { "@id": `${SITE_URL}/#software` } },
  })),
}
const GLOSSARY_SET = {
  "@context": "https://schema.org", "@type": "DefinedTermSet", "@id": `${SITE_URL}/#glossary`, name: "Accord glossary",
  hasDefinedTerm: GLOSSARY.map((g) => ({ "@type": "DefinedTerm", name: g.term, description: g.def.replace(/`/g, ""), inDefinedTermSet: `${SITE_URL}/#glossary` })),
}
const HOW_TO = {
  "@context": "https://schema.org", "@type": "HowTo", "@id": `${SITE_URL}/#how`, name: "How a deal room works",
  description: "One agreement from sealed limits to a settled payment, in six steps. Every agreement type runs the same way; only the terms and the evidence change.",
  step: HOW_STEPS.map((h, i) => ({ "@type": "HowToStep", position: i + 1, name: h.name, text: h.text, url: `${SITE_URL}/#how` })),
}
const CONTROL_LIST = {
  "@context": "https://schema.org", "@type": "ItemList", "@id": `${SITE_URL}/#features`, name: "Seven controls between an agent and the money",
  itemListElement: CONTROLS.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, description: c.text, url: `${SITE_URL}/#features` })),
}
/* /docs/quickstart: the /app/try-it walkthrough as HowTo steps (do X, see Y) */
const TRY_HOW_TO = {
  "@context": "https://schema.org", "@type": "HowTo", "@id": `${SITE_URL}/docs/quickstart#try-it`, name: "Run one Accord deal on NEAR testnet at /app/try-it",
  description: "Connect a NEAR wallet, get test funds, open a deal room against Accord's demo vendor, let the demo agent pay, watch a redirect get refused and revoke the key. Everything is on NEAR testnet with test USDC.",
  totalTime: "PT3M", estimatedCost: { "@type": "MonetaryAmount", currency: "USD", value: "0" },
  tool: [{ "@type": "HowToTool", name: "A NEAR testnet wallet (Meteor, Intear, Ledger, Nightly or WalletConnect) through HOT Connect" }],
  step: TRY_STEPS.map((t, i) => ({ "@type": "HowToStep", position: i + 1, name: t.name, text: `${t.do} You see: ${t.see}`, url: `${SITE_URL}/app/try-it` })),
}
const isDoc = (r) => r.path.startsWith("/docs/")
const docsHome = () => ROUTES.find((r) => r.path === "/docs")
const RUNTIME_DUPES = ["Organization", "SoftwareApplication", "WebSite", "WebPage", "BreadcrumbList"]

function render(route, target = route) {
  const { md, meta } = pageData(target.slug)
  const url = `${SITE_URL}${target.path === "/" ? "/" : target.path}`
  const title = meta.title || `Accord: ${target.name}`
  const description = meta.description || target.summary
  const crumbs = [{ name: "Accord", url: `${SITE_URL}/` }, ...(isDoc(target) ? [{ name: docsHome().name, url: `${SITE_URL}/docs` }] : []), ...(target.path === "/" ? [] : [{ name: target.name.replace(/^Docs: /, ""), url }])]
  const ld = [ORG, WEBSITE, APP, SOURCE,
    { "@context": "https://schema.org", "@type": "WebPage", "@id": `${url}#webpage`, url, name: title, description, isPartOf: { "@id": `${SITE_URL}/#website` }, about: { "@id": `${SITE_URL}/#software` }, primaryImageOfPage: OG_IMAGE, dateModified: TODAY, inLanguage: "en" },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.url })) },
    ...(target.path === "/" ? [USE_CASE_LIST, HOW_TO, CONTROL_LIST, GLOSSARY_SET] : []),
    ...(target.path === "/docs" || isDoc(target) ? [{
      "@context": "https://schema.org", "@type": "TechArticle", "@id": `${url}#article`, url, headline: title.slice(0, 110), description,
      dateModified: TODAY, inLanguage: "en", proficiencyLevel: "Beginner", image: OG_IMAGE,
      author: { "@id": `${SITE_URL}/#organization` }, publisher: { "@id": `${SITE_URL}/#organization` },
      about: { "@id": `${SITE_URL}/#software` }, isPartOf: { "@id": `${SITE_URL}/#website` }, mainEntityOfPage: { "@id": `${url}#webpage` },
    }] : []),
    ...(target.path === "/docs/quickstart" ? [TRY_HOW_TO] : []),
    ...(meta.ld || []).map((s) => { try { return JSON.parse(s) } catch { return null } }).filter((o) => o && !RUNTIME_DUPES.includes(o["@type"])),
  ].filter((o, i, all) => all.findIndex((x) => x["@type"] === o["@type"] && (x["@id"] || "") === (o["@id"] || "")) === i)
  const head = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<link rel="alternate" type="text/markdown" title="${esc(title)} (Markdown)" href="${SITE_URL}/${target.slug}.md" />`,
    `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />`,
    `<meta property="og:type" content="${target.path === "/" ? "website" : "article"}" />`,
    `<meta property="og:site_name" content="Accord" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:image" content="${OG_IMAGE}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="Accord: ${esc(TAGLINE)}" />`,
    `<meta property="og:locale" content="en_GB" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    `<meta name="twitter:image" content="${OG_IMAGE}" />`,
    `<link rel="alternate" type="text/plain" title="Accord for AI agents (llms.txt)" href="${SITE_URL}/llms.txt" />`,
    `<link rel="alternate" type="application/json" title="Accord facts (JSON)" href="${SITE_URL}/facts.json" />`,
    /* the FAQ script keeps the id the FAQ section updates in place, so the live page never holds two FAQPage blocks */
    ...ld.map((o) => `<script type="application/ld+json" ${o["@type"] === "FAQPage" ? 'id="faq-jsonld"' : "data-prerender"}>${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`),
  ].join("\n    ")

  const nav = ROUTES.filter((r) => !r.alias).map((r) => `<li><a href="${r.path}">${esc(r.name)}</a>: ${esc(r.summary)}</li>`).join("")
  const body = `<div id="root"><div data-prerender>
<header><p><a href="/">Accord</a>: ${esc(TAGLINE)}</p></header>
<main>
${md ? mdToHtml(md) : `<h1>${esc(title)}</h1><p>${esc(description)}</p>`}
</main>
<nav aria-label="Site"><h2>Pages</h2><ul>${nav}</ul></nav>
<footer><p>${esc(ABOUT)}</p><p>Live on NEAR testnet (factory accord-v2.testnet); the full flow ran on agreement a6.accord-v2.testnet; mainnet follows an audit. <a href="/llms.txt">llms.txt</a> · <a href="/sitemap.xml">Sitemap</a> · <a href="${REPO}">GitHub</a></p></footer>
</div></div>`

  let html = TEMPLATE
  html = html.replace(/<title>[\s\S]*?<\/title>/, "")
  html = html.replace(/\s*<meta name="description"[^>]*>/, "").replace(/\s*<meta property="og:[^>]*>/g, "").replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/g, "")
  html = html.replace("<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />", (m) => `${m}\n    ${head}\n    <script>document.documentElement.classList.add("js")</script>\n    <style>html.js [data-prerender]{display:none}</style>`)
  html = html.replace('<div id="root"></div>', body)
  return html
}

/* A retired path: a noindex page that sends browsers and crawlers on (the server also answers 301) */
const redirectPage = (to) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Accord: moved</title><meta name="robots" content="noindex, follow" /><link rel="canonical" href="${abs(to.split("#")[0])}" />
<meta http-equiv="refresh" content="0; url=${to}" /></head>
<body><p>This page moved: <a href="${to}">${abs(to)}</a></p></body></html>
`
const write = (p, s) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, s) }
const pages = ROUTES.filter((r) => !r.alias)
for (const r of ROUTES) {
  const target = r.alias ? pages.find((p) => p.path === r.alias) : r
  const file = r.path === "/" ? join(DIST, "index.html") : join(DIST, r.path.slice(1), "index.html")
  write(file, r.redirect ? redirectPage(r.redirect) : render(r, target))
}

/* Old and retired paths, for the server's 301s (scripts/serve.mjs reads this file; the pre-rendered pages stay as a fallback) */
write(join(DIST, "redirects.json"), JSON.stringify(Object.fromEntries(ROUTES.filter((r) => r.alias).map((r) => [r.path, r.redirect || r.alias])), null, 2) + "\n")

/* 404: the app shell (React shows the not-found page), never indexed */
write(join(DIST, "404.html"), TEMPLATE.replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/g, "").replace("<title>", '<meta name="robots" content="noindex" />\n    <title>'))

/* Markdown copies of every page, llms.txt and llms-full.txt. Links are absolute so a copy read on its own still
   resolves. Each page is written at /<slug>.md and at its own path plus .md (/product/payee.md, /index.md), the
   two places agents look. */
const absLinks = (md) => md.replace(/\]\((\/[^)\s]*)\)/g, (_, h) => `](${SITE_URL}${h})`)
const yaml = (v) => JSON.stringify(String(v))
const full = [] /* the header (with the agent-facing sections) is added once llms.txt's sections exist, below */
for (const r of pages) {
  const { md, meta } = pageData(r.slug)
  const doc = `---\ntitle: ${yaml(meta.title || r.name)}\nurl: ${SITE_URL}${r.path}\ndescription: ${yaml(meta.description || r.summary)}\nupdated: ${TODAY}\nsite_index: ${SITE_URL}/llms.txt\n---\n\n> ${r.summary}\n\n${absLinks(md)}`
  write(join(DIST, `${r.slug}.md`), doc)
  write(join(DIST, r.path === "/" ? "index.md" : `${r.path.slice(1)}.md`), doc)
  full.push(`\n\n---\n\n# ${r.name}\n\nURL: ${SITE_URL}${r.path}\n\n${absLinks(md)}`)
}

const sect = (title, list) => `## ${title}\n\n${list.map((r) => `- [${r.name}](${SITE_URL}/${r.slug}.md): ${r.summary}`).join("\n")}\n`
const core = ["home", "market-making", "product", "sealed-table", "payee", "security"]
const evidence = ["research", "verify", "record"]
const docsPages = pages.filter((r) => r.path === "/docs" || r.path.startsWith("/docs/"))
const near = (a) => `https://testnet.nearblocks.io/address/${a}`

/* The agent-facing sections, shared by llms.txt and the top of llms-full.txt. No URL is followed directly by a period. */
const agentSections = `Source code (MIT): ${REPO} · Machine-readable facts: ${SITE_URL}/facts.json · Every page as Markdown: ${SITE_URL}/llms-full.txt

## Status

- Network: NEAR testnet only. Mainnet follows an audit and is not live.
- Proof: agreement a6.accord-v2.testnet ran the full flow on 8 Nov 2026 on factory accord-v2.testnet, release 3: sealed limits, the Sealed Table negotiation by the real NEAR AI model inside OutLayer's attested enclave, approvals, funding, a payment, a refused redirect (ERR_PAYEE_MISMATCH) and a revocation. Each of its 12 transactions is linked at ${SITE_URL}/record
- Settlement: USDC on NEAR (NEP-141), from each agreement's own account; on testnet a test USDC token (tUSDC).
- Agreement types: six; two are built (vendor contracts, called procurement in code, and market-making agreements) and four are planned.
- Sign-in: external NEAR wallets only, through HOT Connect. There is no email sign-in.

## Try it (no code, about 3 minutes, NEAR testnet)

Start at ${SITE_URL}/app/try-it (walkthrough with screenshots: ${SITE_URL}/docs/quickstart). A faucet, a demo counterparty and a demo agent run by Accord are built in; everything uses test USDC.

${TRY_STEPS.map((t, i) => `${i + 1}. **${t.name}.** Do: ${t.do} See: ${t.see}`).join("\n")}

## Key URLs

- [Try it](${SITE_URL}/app/try-it): the guided test room on NEAR testnet, with faucet, demo counterparty and demo agent
- [Sign in](${SITE_URL}/app/signin): the app, with your own NEAR wallet
- [Verify an agreement](${SITE_URL}/verify): five public checks of any agreement in the browser, no account and no keys; ${SITE_URL}/verify?agreement=<account> opens one directly
- [Public record](${SITE_URL}/record): agreement a6's 12 transactions, each linked to the explorer
- [Security](${SITE_URL}/security): the claims table with every limit, custody, the privacy boundary and the threat model
${docsPages.map((r) => `- [${r.name}](${SITE_URL}${r.path}): ${r.summary}`).join("\n")}

## Testnet accounts

${ACCOUNTS.map((a) => `- ${a.role}: [${a.account}](${near(a.account)})`).join("\n")}
- OutLayer jobs: accord-v1.testnet/accord-sealed-table, accord-v1.testnet/accord-payee, accord-v1.testnet/accord-observer

## Accord for AI agents

An agent never holds a wallet: the buyer installs one function-call key on the agreement's own account that can call \`act\` and nothing else, and the contract checks every payment against the approved terms. The code is at ${REPO} (packages: ${REPO}/tree/main/platform/packages). Ways in:

${FOR_AGENTS.map((f) => `- **${f.name}**: ${f.text}`).join("\n")}

## Claims and their limits

Every public statement about Accord is one of these six, each with its limit. The full table is at ${SITE_URL}/security

${CLAIMS.map((c, i) => `${i + 1}. **${c.claim}** Limit: ${c.limit}`).join("\n")}

## Not done yet

${NOT_DONE.map((n) => `- ${n}`).join("\n")}
`

const llms = `# Accord

> ${TAGLINE}

${ABOUT}

${agentSections}
## Agreement types

Same controls in every type; the commercial fields and the evidence accepted change. "demo": built and run in the demonstration. "planned": designed, not built.

${USE_CASES.map((u) => `- **${u.name}** (${u.status}): ${u.outcome} ${u.how} Evidence: ${u.evidence}.${u.limit ? ` Limit: ${u.limit}` : ""}`).join("\n")}

## How a deal room works (six steps)

${HOW_STEPS.map((h, i) => `${i + 1}. **${h.name}**: ${h.text}`).join("\n")}

## Core features (seven controls)

${CONTROLS.map((c) => `- **${c.name}**: ${c.text}`).join("\n")}

## Built on

${BUILT_ON.map((b) => `- **${b.name}**: ${b.role}`).join("\n")}
No partnership with these projects is claimed.

## Pricing

Free on NEAR testnet with test funds today. Planned: Accord Teams, a subscription; market-making agreements, per monitored market. No percentage-based Accord fee on payment amounts. Production prices are published before launch; network and third-party fees may apply.

## Glossary

${GLOSSARY.map((g) => `- **${g.term}**: ${g.def}`).join("\n")}

## FAQ

${ANSWERS.map((x) => `- **${x.q}** ${x.a}`).join("\n")}

## Naming and scope

${NAMING.map((n) => `- ${n}`).join("\n")}

## How to describe Accord

- In one sentence: ${ONE_LINE}
- Status: ${STATUS.network}; settlement ${STATUS.settlement}; mainnet: ${STATUS.mainnet.toLowerCase()}. ${STATUS.stage}.
- Say "demo" or "planned" for each agreement type as listed above. Do not describe Accord as live on mainnet, and do not attribute a market maker's own performance to public order-book observations.
- Machine-readable facts: ${SITE_URL}/facts.json (the same facts as fields)
- Any page as Markdown: add .md to its path (for example ${SITE_URL}/product/payee.md), or send \`Accept: text/markdown\` to the page's own URL.

${sect("Product", pages.filter((r) => core.includes(r.slug)))}
${sect("Documentation", docsPages)}
${sect("Evidence", pages.filter((r) => evidence.includes(r.slug)))}
${sect("Optional", pages.filter((r) => !core.includes(r.slug) && !evidence.includes(r.slug) && !docsPages.includes(r)))}
## Full text

- [llms-full.txt](${SITE_URL}/llms-full.txt): every page as Markdown in one file
`
write(join(DIST, "llms.txt"), llms)
write(join(DIST, "llms-full.txt"), [`# Accord\n\n> ${TAGLINE}\n\n${ABOUT}\n\nSource: ${SITE_URL}/ (generated ${TODAY}). Short index: ${SITE_URL}/llms.txt\n\n${agentSections}`, ...full].join(""))

/* facts.json: the same facts as llms.txt, for agents that want fields rather than prose */
write(join(DIST, "facts.json"), JSON.stringify({
  name: "Accord", url: `${SITE_URL}/`, repository: REPO, license: "MIT", tagline: TAGLINE, summary: ONE_LINE, updated: TODAY, status: STATUS,
  parts: GLOSSARY.filter((g) => ["Sealed Table", "Agreement controls", "Payee", "Evidence checks"].includes(g.term)),
  agreement_types: USE_CASES.map((u) => ({ ...u, url: abs(u.url) })),
  how_a_deal_room_works: HOW_STEPS, core_controls: CONTROLS, built_on: BUILT_ON,
  glossary: GLOSSARY, answers: ANSWERS, naming: NAMING,
  claims: CLAIMS, not_done_yet: NOT_DONE, testnet_accounts: ACCOUNTS.map((a) => ({ ...a, explorer: near(a.account) })),
  try_it: { url: `${SITE_URL}/app/try-it`, guide: `${SITE_URL}/docs/quickstart`, steps: TRY_STEPS },
  for_agents: FOR_AGENTS, sign_in: "External NEAR wallets only, through HOT Connect (Meteor, Intear, Ledger, Nightly, WalletConnect). No email sign-in.",
  key_urls: { try_it: `${SITE_URL}/app/try-it`, sign_in: `${SITE_URL}/app/signin`, verify: `${SITE_URL}/verify`, record: `${SITE_URL}/record`, security: `${SITE_URL}/security`, docs: docsPages.map((r) => `${SITE_URL}${r.path}`) },
  pages: pages.map((r) => ({ name: r.name, url: `${SITE_URL}${r.path}`, markdown: `${SITE_URL}/${r.slug}.md`, summary: r.summary })),
  index: { llms: `${SITE_URL}/llms.txt`, llms_full: `${SITE_URL}/llms-full.txt`, sitemap: `${SITE_URL}/sitemap.xml` },
}, null, 2) + "\n")

/* sitemap.xml and robots.txt */
write(join(DIST, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((r) => `  <url>\n    <loc>${SITE_URL}${r.path}</loc>\n    <lastmod>${TODAY}</lastmod>\n    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority.toFixed(1)}</priority>\n  </url>`).join("\n")}
</urlset>
`)
const bots = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-User", "Claude-SearchBot", "anthropic-ai", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot", "Applebot-Extended", "CCBot", "Bingbot", "Googlebot", "DuckAssistBot", "Meta-ExternalAgent", "Amazonbot", "MistralAI-User", "cohere-ai"]
write(join(DIST, "robots.txt"), `# Accord welcomes search engines and AI agents. Start with ${SITE_URL}/llms.txt
# Content signals (contentsignals.org): use this site for search results and to answer questions
User-agent: *
Content-Signal: search=yes, ai-input=yes
Allow: /
Disallow: /api/

${bots.map((b) => `User-agent: ${b}\nAllow: /`).join("\n\n")}

Sitemap: ${SITE_URL}/sitemap.xml
`)
console.log(`prerender: ${ROUTES.length} routes, ${pages.length} Markdown pages, llms.txt, llms-full.txt, facts.json, sitemap.xml, robots.txt, 404.html → ${SITE_URL}`)
