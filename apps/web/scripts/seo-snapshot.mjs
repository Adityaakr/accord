#!/usr/bin/env node
/* Captures each route's rendered content as clean Markdown into seo/pages/<slug>.md, plus the JSON-LD the page adds
   at runtime, so the build can pre-render real HTML for crawlers and AI agents (scripts/prerender.mjs).
   Run after copy changes, with the dev server up:  npm run dev  then  npm run seo:snapshot
   Requires Playwright (npx playwright install chromium). */
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { ROUTES } from "../seo/routes.mjs"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const BASE = process.env.SNAPSHOT_URL || "http://localhost:5180"
const OUT = join(ROOT, "seo/pages")
mkdirSync(OUT, { recursive: true })

let chromium
try { ({ chromium } = await import("playwright")) } catch {
  const p = process.env.PLAYWRIGHT_PATH
  if (!p) { console.error("Playwright not found: npm i -D playwright, or set PLAYWRIGHT_PATH"); process.exit(1) }
  ;({ chromium } = await import(p))
}

/* Runs in the page: walks <main> and turns it into Markdown. Skips decorative and duplicate UI (aria-hidden, nav,
   buttons, svg), keeps every tab panel and quote card so no content is lost. */
function toMarkdown() {
  const root = document.querySelector("main") || document.body
  const out = []
  const clean = (s) => s.replace(/\s+/g, " ").trim()
  const skip = (el) => {
    if (!(el instanceof HTMLElement || el instanceof SVGElement)) return false
    const tag = el.tagName.toLowerCase()
    if (el.hasAttribute && el.hasAttribute("data-seo-skip")) return true
    if (tag === "button" && el.getAttribute("role") === "tab") return false
    if (["script", "style", "svg", "nav", "footer", "button", "form", "noscript", "canvas", "video", "iframe"].includes(tag)) return true
    if (el.getAttribute("aria-hidden") === "true" && el.getAttribute("role") !== "tabpanel" && tag !== "figure") return true
    return false
  }
  const inline = (node) => {
    if (node.nodeType === 3) return node.textContent
    if (!(node instanceof Element) || skip(node)) return ""
    const tag = node.tagName.toLowerCase()
    const inner = [...node.childNodes].map((c) => {
      const t = inline(c)
      if (c instanceof Element && !getComputedStyle(c).display.startsWith("inline") || (c instanceof Element && /inline-(flex|block|grid)/.test(getComputedStyle(c).display))) return ` ${t} `
      return t
    }).join("")
    if (tag === "a") {
      const href = node.getAttribute("href") || ""
      const t = clean(inner)
      if (!t) return ""
      const abs = href.startsWith("/") ? href : href
      return href && !href.startsWith("#") ? `[${t}](${abs})` : t
    }
    if (tag === "code") return "`" + clean(inner) + "`"
    if (tag === "strong" || tag === "b") return clean(inner) ? `**${clean(inner)}**` : ""
    if (tag === "br") return " "
    if (node.getAttribute("role") === "img" && node.getAttribute("aria-label")) return ` ${node.getAttribute("aria-label")} `
    return inner
  }
  const BLOCK = new Set(["h1", "h2", "h3", "h4", "h5", "h6", "p", "li", "blockquote", "table", "dt", "dd", "figcaption"])
  const walk = (el) => {
    if (skip(el)) return
    const tag = el.tagName.toLowerCase()
    if (el.getAttribute("role") === "img" && el.getAttribute("aria-label")) { out.push(`> ${clean(el.getAttribute("aria-label"))}`); return }
    if (/^h[1-6]$/.test(tag)) { const t = clean(el.getAttribute("aria-label") || inline(el)); if (t) out.push(`${"#".repeat(Number(tag[1]))} ${t}`); return }
    if (el.getAttribute("role") === "tab") { const t = clean(inline(el)); if (t) out.push(`- ${t}`); return }
    if (tag === "table") {
      const rows = [...el.querySelectorAll("tr")].map((tr) => [...tr.children].map((c) => clean(inline(c)).replace(/\|/g, "\\|")))
      if (rows.length) {
        out.push(`| ${rows[0].join(" | ")} |`, `| ${rows[0].map(() => "---").join(" | ")} |`, ...rows.slice(1).map((r) => `| ${r.join(" | ")} |`))
      }
      return
    }
    if (tag === "li") { const t = clean(inline(el)); if (t) out.push(`- ${t}`); return }
    if (tag === "blockquote") { const t = clean(inline(el)); if (t) out.push(`> ${t}`); return }
    if (tag === "p" || tag === "dt" || tag === "dd" || tag === "figcaption") { const t = clean(inline(el)); if (t) out.push(t); return }
    const kids = [...el.children]
    const hasBlock = (n) => [...n.querySelectorAll("*")].some((c) => BLOCK.has(c.tagName.toLowerCase()) || c.getAttribute("role") === "img")
    if (!kids.length || !hasBlock(el)) { const t = clean(inline(el)); if (t && t.length > 1) out.push(t); return }
    kids.forEach(walk)
  }
  walk(root)
  const dedup = out.filter((l, i) => l !== out[i - 1])
  const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent)
  return { md: dedup.join("\n\n"), ld, title: document.title, description: document.querySelector('meta[name="description"]')?.content || "" }
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" })
for (const r of ROUTES.filter((x) => !x.alias)) {
  await page.goto(BASE + r.path, { waitUntil: "networkidle" })
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { scrollTo(0, y); await new Promise((f) => setTimeout(f, 40)) } scrollTo(0, 0) })
  await page.waitForTimeout(600)
  const snap = await page.evaluate(toMarkdown)
  writeFileSync(join(OUT, `${r.slug}.md`), snap.md.trim() + "\n")
  writeFileSync(join(OUT, `${r.slug}.json`), JSON.stringify({ title: snap.title, description: snap.description, ld: snap.ld }, null, 2) + "\n")
  console.log(`${r.path.padEnd(24)} ${snap.md.length} chars`)
}
await browser.close()
