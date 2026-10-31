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

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const DIST = join(ROOT, "dist")
const PAGES = join(ROOT, "seo/pages")
const TEMPLATE = readFileSync(join(DIST, "index.html"), "utf8")
const OG_IMAGE = `${SITE_URL}/og-image.png`
const TODAY = new Date().toISOString().slice(0, 10)
const TAGLINE = "The private deal room and control plane for agent-to-agent commerce."
const ABOUT = "Accord is a private deal room and control plane for agent-to-agent commerce on NEAR. Two companies' agents negotiate in confidence inside an attested enclave (the Sealed Table); both companies approve the terms; from then on those terms are the only authority the buyer's agent has over money. A NEAR contract (Agreement controls) refuses any payment whose amount, milestone or recipient differs from the approved terms, and Payee binds the recipient to a domain the vendor controls. Settlement is USDC on NEAR. The first application, Accord Atlas, pays market makers' retainers only when the agreed spread, depth and uptime are measured on the venue."

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
  name: "Accord", url: `${SITE_URL}/`, logo: `${SITE_URL}/assets/favicon-dark.png`, description: TAGLINE,
}
const WEBSITE = { "@context": "https://schema.org", "@type": "WebSite", "@id": `${SITE_URL}/#website`, name: "Accord", url: `${SITE_URL}/`, description: TAGLINE, publisher: { "@id": `${SITE_URL}/#organization` }, inLanguage: "en" }
const APP = {
  "@context": "https://schema.org", "@type": "SoftwareApplication", "@id": `${SITE_URL}/#software`,
  name: "Accord", applicationCategory: "BusinessApplication", applicationSubCategory: "Agent payments and negotiation infrastructure",
  operatingSystem: "Web", url: `${SITE_URL}/`, description: ABOUT, image: OG_IMAGE,
  featureList: ["Confidential negotiation between agents in an attested enclave (Sealed Table)", "Approved terms enforced by a NEAR contract on every payment (Agreement controls)", "Recipient authorisation bound to a domain the vendor controls (Payee)", "One-transaction revocation of the agent's key", "Settlement in USDC on NEAR", "Accord Atlas: market-making retainers released on measured spread, depth and uptime"],
  offers: { "@type": "Offer", name: "Developer preview", price: "0", priceCurrency: "USD", availability: "https://schema.org/PreOrder", description: "Free testnet access, coming soon. Planned: Accord Teams (subscription) and Accord Atlas (per monitored market). No percentage-based Accord fee on payment amounts; production prices published before launch." },
  publisher: { "@id": `${SITE_URL}/#organization` },
}

function render(route, target = route) {
  const { md, meta } = pageData(target.slug)
  const url = `${SITE_URL}${target.path === "/" ? "/" : target.path}`
  const title = meta.title || `Accord: ${target.name}`
  const description = meta.description || target.summary
  const crumbs = [{ name: "Accord", url: `${SITE_URL}/` }, ...(target.path === "/" ? [] : [{ name: target.name, url }])]
  const ld = [ORG, WEBSITE, APP,
    { "@context": "https://schema.org", "@type": "WebPage", "@id": `${url}#webpage`, url, name: title, description, isPartOf: { "@id": `${SITE_URL}/#website` }, about: { "@id": `${SITE_URL}/#software` }, primaryImageOfPage: OG_IMAGE, dateModified: TODAY, inLanguage: "en" },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.url })) },
    ...(meta.ld || []).map((s) => { try { return JSON.parse(s) } catch { return null } }).filter((o) => o && !["Organization", "SoftwareApplication", "WebSite"].includes(o["@type"])),
  ]
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
    ...ld.map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`),
  ].join("\n    ")

  const nav = ROUTES.filter((r) => !r.alias).map((r) => `<li><a href="${r.path}">${esc(r.name)}</a>: ${esc(r.summary)}</li>`).join("")
  const body = `<div id="root"><div data-prerender>
<header><p><a href="/">Accord</a>: ${esc(TAGLINE)}</p></header>
<main>
${md ? mdToHtml(md) : `<h1>${esc(title)}</h1><p>${esc(description)}</p>`}
</main>
<nav aria-label="Site"><h2>Pages</h2><ul>${nav}</ul></nav>
<footer><p>${esc(ABOUT)}</p><p>Runs on NEAR testnet. Mainnet follows an audit. <a href="/llms.txt">llms.txt</a> · <a href="/sitemap.xml">Sitemap</a></p></footer>
</div></div>`

  let html = TEMPLATE
  html = html.replace(/<title>[\s\S]*?<\/title>/, "")
  html = html.replace(/\s*<meta name="description"[^>]*>/, "").replace(/\s*<meta property="og:[^>]*>/g, "").replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/g, "")
  html = html.replace("<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />", (m) => `${m}\n    ${head}\n    <script>document.documentElement.classList.add("js")</script>\n    <style>html.js [data-prerender]{display:none}</style>`)
  html = html.replace('<div id="root"></div>', body)
  return html
}

const write = (p, s) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, s) }
const pages = ROUTES.filter((r) => !r.alias)
for (const r of ROUTES) {
  const target = r.alias ? pages.find((p) => p.path === r.alias) : r
  const file = r.path === "/" ? join(DIST, "index.html") : join(DIST, r.path.slice(1), "index.html")
  write(file, render(r, target))
}

/* 404: the app shell (React shows the not-found page), never indexed */
write(join(DIST, "404.html"), TEMPLATE.replace("<title>", '<meta name="robots" content="noindex" />\n    <title>'))

/* Markdown copies of every page, llms.txt and llms-full.txt */
const full = [`# Accord\n\n> ${TAGLINE}\n\n${ABOUT}\n\nSource: ${SITE_URL}/ · Generated ${TODAY}`]
for (const r of pages) {
  const { md, meta } = pageData(r.slug)
  const doc = `---\ntitle: ${meta.title || r.name}\nurl: ${SITE_URL}${r.path}\ndescription: ${meta.description || r.summary}\n---\n\n${md}`
  write(join(DIST, `${r.slug}.md`), doc)
  full.push(`\n\n---\n\n# ${r.name}\n\nURL: ${SITE_URL}${r.path}\n\n${md}`)
}
write(join(DIST, "llms-full.txt"), full.join(""))

const sect = (title, list) => `## ${title}\n\n${list.map((r) => `- [${r.name}](${SITE_URL}/${r.slug}.md): ${r.summary}`).join("\n")}\n`
const core = ["home", "atlas", "product", "sealed-table", "payee", "security"]
const llms = `# Accord

> ${TAGLINE}

${ABOUT}

Key facts:
- Parts: Sealed Table (confidential negotiation in an attested enclave), Agreement controls (approved terms enforced by a NEAR contract), Payee (recipient authorisation), Accord Atlas (first application: liquidity agreements with measurable payment conditions).
- The buyer's agent holds one key that can call one method, \`act\`; payments that do not match the approved terms are refused with a recorded reason (for example ERR_PAYEE_MISMATCH, ERR_AMOUNT_MISMATCH).
- Network: NEAR testnet. Settlement: USDC on NEAR (NEP-141). Mainnet follows an audit.
- Built for: market-making retainers, vendor contracts and invoices, treasury payouts, selling to AI agents, agent-to-agent services.
- Pricing (planned): Developer preview with free testnet access (coming soon); Accord Teams, a subscription; Accord Atlas, per monitored market. No percentage-based Accord fee on payment amounts. Production prices published before launch; network and third-party fees may apply.
- Every claim is stated with its limit on the Security page; findings cited on the Research page are the authors' own.

${sect("Product", pages.filter((r) => core.includes(r.slug)))}
${sect("Evidence and documentation", pages.filter((r) => ["research", "docs", "verify", "record"].includes(r.slug)))}
${sect("Optional", pages.filter((r) => !core.includes(r.slug) && !["research", "docs", "verify", "record"].includes(r.slug)))}
## Full text

- [llms-full.txt](${SITE_URL}/llms-full.txt): every page as Markdown in one file
`
write(join(DIST, "llms.txt"), llms)

/* sitemap.xml and robots.txt */
write(join(DIST, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((r) => `  <url>\n    <loc>${SITE_URL}${r.path}</loc>\n    <lastmod>${TODAY}</lastmod>\n    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority.toFixed(1)}</priority>\n  </url>`).join("\n")}
</urlset>
`)
const bots = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-User", "Claude-SearchBot", "anthropic-ai", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "CCBot", "Bingbot", "Googlebot"]
write(join(DIST, "robots.txt"), `# Accord welcomes search engines and AI agents. Start with ${SITE_URL}/llms.txt
User-agent: *
Allow: /
Disallow: /api/

${bots.map((b) => `User-agent: ${b}\nAllow: /`).join("\n\n")}

Sitemap: ${SITE_URL}/sitemap.xml
`)
console.log(`prerender: ${ROUTES.length} routes, ${pages.length} Markdown pages, llms.txt, llms-full.txt, sitemap.xml, robots.txt, 404.html → ${SITE_URL}`)
