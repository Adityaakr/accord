// Paste this whole file at the top of a Framer MCP `exec` program, then call e.g.
//   const out = dumpScope("dK4Q5QRjZ")              // a section on the Desktop breakpoint (full)
//   const tab = dumpScope("uX81zskxrdK4Q5QRjZ", true) // same section on Tablet → only overrides vs Desktop
//   return { out, tab }
// Replica/variant ids are compound: `${replicaId}${primaryNodeId}` (Tablet uX81zskxr, Phone Ue6QXWSr_).
// For component variants pass the variant frame id; replicas report `$orig` + only the attrs that differ.

const DROP = new Set(["children","constraintsLocked","__class","paragraphSpacing","$rect","$parentId","$scopeId","$groundNodeId","$mediaQuery","$originalId","$replicaId","$componentDisplayName","$status","nodeType","filterByBrowser","backfaceVisibility","tapHighlightColor"])
const KEEP$ = (k) => k.startsWith("$control__") || ["$isPrimary","$isReplica","$inheritsFrom","$gesture","$variants","$breakpoints","$layoutTemplateId","$itemCount"].includes(k)
const NOISE = { rotation: "0deg", rotateZ: "0deg", rotateX: "0deg", rotateY: "0deg", translateX: "0px", translateY: "0px", translateZ: "0px", skewX: "0deg", skewY: "0deg", scale: 1, opacity: 1, blur: "0px", backgroundBlur: "0px", brightness: "100%", contrast: "100%", grayscale: "0%", hueRotate: "0deg", invert: "0%", saturate: "100%", sepia: "0%", stackWrapEnabled: false, overflow: "visible", position: "relative", visible: true, draggable: false, squircle: "0%", perspective: "0px", padding: "0px", radius: "0px", gap: "0px", bold: false, italic: false, inlineCode: false, fontStyle: "normal" }
const STYLE_KEYS = ["textColor","fontWeight","fontSize","link","bold","italic","fontName","textDecoration","lineHeight","letterSpacing","textStylePreset"]

function compact(n, parentHasLayout) {
  const { tree } = api
  const o = {}
  const free = n.position === "absolute" || n.position === "fixed" || n.position === "sticky" || parentHasLayout === false
  for (const [k, v] of Object.entries(n)) {
    if (DROP.has(k) || v === null || v === undefined) continue
    if (k.startsWith("$") && !KEEP$(k)) continue
    if (k in NOISE && v === NOISE[k]) continue
    if (/^(left|top|right|bottom|centerAnchorX|centerAnchorY)$/.test(k) && !free) continue
    if (/^(padding|radius)(Top|Right|Bottom|Left|TopLeft|TopRight|BottomLeft|BottomRight)$/.test(k)) { const sh = k.startsWith("padding") ? "padding" : "radius"; if (typeof n[sh] === "string") continue }
    if (k === "name" && n.type === "RichTextNode" && v === tree.getInnerText(n)) continue
    if (k === "text" && n.type === "RichTextNode" && typeof v === "string") continue
    if (typeof v === "object") { const s = JSON.stringify(v); if (s === "{}" || s === "[]") continue }
    o[k] = v
  }
  if (n.type === "RichTextNode") o.text = tree.getInnerText(n)
  return o
}
function diff(a, b) { const o = {}; for (const [k, v] of Object.entries(a)) if (JSON.stringify(v) !== JSON.stringify(b[k])) o[k] = v; for (const k of Object.keys(b)) if (!(k in a) && k !== "text") o[k] = null; return o }
function richKids(n) {
  const blocks = n.children || [], runs = blocks.flatMap((b) => b.children || [])
  const styled = runs.some((r) => STYLE_KEYS.some((k) => r[k] !== undefined && r[k] !== null && r[k] !== false && !(k === "link" && JSON.stringify(r.link) === JSON.stringify(n.link)) && !(k === "textStylePreset" && r[k] === n.textStylePreset)))
  if (blocks.length <= 1 && runs.length <= 1 && !styled) return []
  return blocks.map((b) => ({ type: b.type, tag: b.tag, children: (b.children || []).map((r) => { const c = compact(r, true); delete c.id; return c }) }))
}
function build(n, inRep, parentHasLayout) {
  const { tree } = api
  let o = compact(n, parentHasLayout)
  const rep = inRep || !!n.$isReplica
  if (rep && n.$originalId) { const orig = tree.get(n.$originalId); if (orig) { const d = diff(o, compact(orig, parentHasLayout)); o = { id: n.id, type: n.type, $orig: n.$originalId, ...d }; delete o.text } }
  if (n.type === "RichTextNode") { const k = richKids(n); if (k.length) o.runs = k; return o }
  const hasLayout = n.layout === "stack" || n.layout === "grid"
  let kids = (n.children || []).map((c) => build(c, rep, hasLayout))
  if (rep) kids = kids.filter((k) => Object.keys(k).length > 3 || (k.children && k.children.length))
  if (kids.length) o.children = kids
  return o
}
/** Dump a node subtree. `replica=true` → only overrides relative to the primary (desktop/primary variant). */
function dumpScope(id, replica = false) {
  const n = api.tree.get(id)
  if (!n) return { error: "not found " + id }
  return build(n, replica, undefined)
}
/** Dump a ComponentNode: variables, variants, primary full + replicas as diffs. */
function dumpComponent(id) {
  const c = api.tree.get(id)
  return { id, name: c.name, variables: c.variables, $variants: c.$variants, children: (c.children || []).map((v) => build(v, !!v.$isReplica, undefined)) }
}
/** Collect every asset reference / icon in a subtree. */
function collectAssets(id) {
  const assets = new Set(), icons = []
  for (const n of api.tree.walk(id)) {
    if (typeof n.fill === "string" && n.fill.startsWith("data:framer/asset-reference")) assets.add(n.fill)
    for (const [k, v] of Object.entries(n)) {
      if (k.startsWith("$control__")) { if (typeof v === "string" && v.startsWith("data:framer")) assets.add(v); if (v && typeof v === "object" && typeof v.src === "string") assets.add(v.src) }
    }
    if (n.type === "IconNode") icons.push({ id: n.id, set: n.set, icon: n.icon })
  }
  return { assets: [...assets], icons }
}
// Asset URL: data:framer/asset-reference,<ID>.png?... → https://framerusercontent.com/images/<ID>.png
