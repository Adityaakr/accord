// Brief §7: `grep -ri` for every retired phrase and every trust word must return nothing in the built site.
// Usage: node scripts/check-copy.mjs [dir ...]   (default: src index.html; pass dist after a build)
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

const TRUST_WORDS = ["secure", "trustless", "bank-grade", "military-grade", "ai-powered", "seamless", "revolutionary"]
const RETIRED = [
  "agreement layer", "hand your agent a budget", "the deal is the account", "the slow middle",
  "negotiated blind", "executable agreements", "smart legal contracts", "keys die everywhere",
  "revoked everywhere", "private payments", "confidential settlement", "verified business", "nothing leaks",
]
// "autonomous" only as an adjective for the product; "neutral ground" only as a headline — flagged for manual review.
const REVIEW = ["autonomous", "neutral ground"]
// Lines the brief itself contains and allows (its own exceptions); exact substrings.
const ALLOW = [
  "confidential settlement (the USDC transfer is public on NEAR",  // §4.12, the brief's own clause
  "Private settlement is on the roadmap",                   // §4.7 (not a retired phrase, listed for clarity)
  "Users stay in control — they explicitly confirm",        // [37] verbatim quote; brief rule 5 (no misquoting) wins over rule 6 (no em-dashes)
  "confidential-settlement claim",                          // §9 unnumbered line, the brief's own text
  "never says \"executable agreements\"",                   // §9 unnumbered line, the brief's own text
  "never says &quot;executable agreements&quot;",           // same line in the built HTML
  "\"executable agreements\")",                             // the same §9 line when JSX splits it across lines
  "that Accord provides confidential settlement",           // research page, NEAR AI source: the kit's own sentence denying the claim
]

const roots = process.argv.slice(2).length ? process.argv.slice(2) : ["src", "index.html"]
const files = []
function walk(p) {
  const st = statSync(p)
  if (st.isDirectory()) { for (const f of readdirSync(p)) if (!/node_modules|\.map$/.test(f)) walk(join(p, f)) }
  else if (/\.(tsx?|css|html|js|md)$/.test(p) && !/check-copy\.mjs$/.test(p)) files.push(p)
}
roots.forEach(walk)

let bad = 0
for (const f of files) {
  const text = readFileSync(f, "utf8")
  const lines = text.split("\n")
  lines.forEach((line, i) => {
    const l = line.toLowerCase()
    if (ALLOW.some((a) => line.includes(a))) return
    for (const w of [...TRUST_WORDS, ...RETIRED]) {
      const re = new RegExp(`\\b${w.replace(/[-\s]/g, "[-\\s]")}\\b`, "i")
      if (re.test(l)) { console.log(`${f}:${i + 1}: "${w}" → ${line.trim().slice(0, 120)}`); bad++ }
    }
    for (const w of REVIEW) if (l.includes(w)) console.log(`${f}:${i + 1}: REVIEW "${w}" → ${line.trim().slice(0, 120)}`)
    if (line.includes("—")) { console.log(`${f}:${i + 1}: em-dash → ${line.trim().slice(0, 120)}`); bad++ }
  })
}
console.log(bad === 0 ? "check-copy: clean" : `check-copy: ${bad} hit(s)`)
process.exit(bad === 0 ? 0 : 1)
