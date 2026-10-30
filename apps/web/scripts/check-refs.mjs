#!/usr/bin/env node
/* Footnote guard (brief §7): every <Ref n={…} /> marker in src/sections, src/components and src/pages must resolve to a
   row in src/content/references.ts, and every row must be referenced at least once. Exit 1 if either fails. */
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const SCAN_DIRS = ["src/sections", "src/components", "src/pages"].map((d) => join(root, d))
const REFERENCES_FILE = join(root, "src/content/references.ts")

function walk(dir, out = []) {
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return out
  }
  for (const name of entries) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (p.endsWith(".tsx")) out.push(p)
  }
  return out
}

/* Rows: every `{ n: <int>` inside the REFERENCES array literal. */
const refSource = readFileSync(REFERENCES_FILE, "utf8")
const rowsBlock = refSource.slice(refSource.indexOf("export const REFERENCES"), refSource.indexOf("export const UNNUMBERED"))
const rows = new Set([...rowsBlock.matchAll(/\{\s*n:\s*(\d+)/g)].map((m) => Number(m[1])))

/* Markers: `<Ref n={3} />` and `<Ref n={[1, 2]} />` (whitespace tolerant). */
const MARKER_RE = /<Ref\b[^>]*?\bn=\{\s*(\[[^\]]*\]|\d+)\s*\}/g
const used = new Map() // n -> [file:line, ...]
for (const file of SCAN_DIRS.flatMap((d) => walk(d))) {
  const text = readFileSync(file, "utf8")
  for (const m of text.matchAll(MARKER_RE)) {
    const line = text.slice(0, m.index).split("\n").length
    const nums = m[1].startsWith("[") ? [...m[1].matchAll(/\d+/g)].map((x) => Number(x[0])) : [Number(m[1])]
    for (const n of nums) {
      if (!used.has(n)) used.set(n, [])
      used.get(n).push(`${file.slice(root.length + 1)}:${line}`)
    }
  }
}

/* Source links by row number: `ref: <n>` in a data table (e.g. the "In their words" quotes in Reviews.tsx). */
for (const file of SCAN_DIRS.flatMap((d) => walk(d))) {
  const text = readFileSync(file, "utf8")
  for (const m of text.matchAll(/\bref:\s*(\d+)/g)) {
    const n = Number(m[1]); const line = text.slice(0, m.index).split("\n").length
    if (!used.has(n)) used.set(n, [])
    used.get(n).push(`${file.slice(root.length + 1)}:${line} (ref)`)
  }
}

/* Range citations the brief writes in prose, e.g. "(rows 21 to 33)" in §4.10, count as references to every row in the range. */
const RANGE_RE = /rows\s+(\d+)\s+to\s+(\d+)/g
for (const file of SCAN_DIRS.flatMap((d) => walk(d))) {
  const text = readFileSync(file, "utf8")
  for (const m of text.matchAll(RANGE_RE)) {
    const line = text.slice(0, m.index).split("\n").length
    for (let n = Number(m[1]); n <= Number(m[2]); n++) {
      if (!used.has(n)) used.set(n, [])
      used.get(n).push(`${file.slice(root.length + 1)}:${line} (range)`)
    }
  }
}

const orphanMarkers = [...used.keys()].filter((n) => !rows.has(n)).sort((a, b) => a - b)
const unreferencedRows = [...rows].filter((n) => !used.has(n)).sort((a, b) => a - b)

console.log(`check-refs: ${rows.size} rows in references.ts (${Math.min(...rows)}–${Math.max(...rows)}), ${used.size} distinct markers used`)
console.log(`markers with no row: ${orphanMarkers.length ? orphanMarkers.join(", ") : "none"}`)
for (const n of orphanMarkers) console.log(`  [${n}] at ${used.get(n).join(", ")}`)
console.log(`rows never referenced: ${unreferencedRows.length ? unreferencedRows.join(", ") : "none"}`)

// Unreferenced rows are a warning: /research is a bibliography, every row need not carry a marker.
process.exit(orphanMarkers.length || unreferencedRows.length ? 1 : 0)
