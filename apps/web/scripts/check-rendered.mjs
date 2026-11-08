// Brief §7: grep the BUILT SITE as a reader sees it. Renders each route in headless Chromium and checks the visible
// text, alt text, title and meta description for every trust word / retired phrase / em-dash.
// Usage: node scripts/check-rendered.mjs [baseUrl]   (default http://localhost:5180)
import { chromium } from "/Users/adityakrx/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs"

const BASE = process.argv[2] ?? "http://localhost:5180"
const ROUTES = ["/", "/product", "/product/sealed-table", "/product/payee", "/use-cases/market-making", "/atlas", "/security", "/docs", "/docs/quickstart", "/docs/concepts", "/docs/agreement-types", "/docs/near", "/docs/verify", "/docs/cli", "/docs/contracts", "/docs/security", "/docs/references", "/research", "/record", "/404", "/privacy-policy", "/contact"]
const TRUST_WORDS = ["secure", "trustless", "bank-grade", "military-grade", "ai-powered", "seamless", "revolutionary"]
const RETIRED = [
  "agreement layer", "hand your agent a budget", "the deal is the account", "the slow middle", "negotiated blind",
  "executable agreements", "smart legal contracts", "keys die everywhere", "revoked everywhere", "private payments",
  "confidential settlement", "verified business", "nothing leaks",
]
const REVIEW = ["autonomous", "neutral ground"]
// The brief's own lines (set verbatim) that contain a flagged token:
const ALLOW = [
  "that Accord provides confidential settlement",  // research page, NEAR AI source: the kit's own sentence denying the claim
  "Users stay in control — they explicitly confirm",       // [37] verbatim quote
  "confidential settlement (the USDC transfer is public on NEAR",  // §4.12
  "confidential-settlement claim",                         // §9 unnumbered line
  'never says "executable agreements"',                    // §9 unnumbered line
]

const browser = await chromium.launch()
let bad = 0
for (const route of ROUTES) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } })
  await page.goto(BASE + route, { waitUntil: "networkidle" })
  // open every FAQ/accordion so hidden answers are included
  await page.evaluate(() => document.querySelectorAll("[aria-expanded='false']").forEach((e) => e.click()))
  await page.waitForTimeout(800)
  const dump = await page.evaluate(() => {
    const alts = [...document.querySelectorAll("[alt], [aria-label], [title]")].map((e) => [e.getAttribute("alt"), e.getAttribute("aria-label"), e.getAttribute("title")].filter(Boolean).join(" "))
    const meta = [document.title, document.querySelector("meta[name=description]")?.content, document.querySelector("meta[property='og:description']")?.content].filter(Boolean)
    return [...meta, ...alts, document.body.innerText].join("\n")
  })
  await page.close()
  const lines = dump.split("\n")
  lines.forEach((line, i) => {
    if (ALLOW.some((a) => line.includes(a))) return
    const l = line.toLowerCase()
    for (const w of [...TRUST_WORDS, ...RETIRED]) {
      const re = new RegExp(`\\b${w.replace(/[-\s]/g, "[-\\s]")}\\b`, "i")
      if (re.test(l)) { console.log(`${route} line ${i + 1}: "${w}" → ${line.trim().slice(0, 120)}`); bad++ }
    }
    for (const w of REVIEW) if (l.includes(w)) console.log(`${route} line ${i + 1}: REVIEW "${w}" → ${line.trim().slice(0, 120)}`)
    if (line.includes("—")) { console.log(`${route} line ${i + 1}: em-dash → ${line.trim().slice(0, 120)}`); bad++ }
  })
  console.log(`${route}: ${lines.length} lines checked`)
}
await browser.close()
console.log(bad === 0 ? "check-rendered: clean" : `check-rendered: ${bad} hit(s)`)
process.exit(bad === 0 ? 0 : 1)
