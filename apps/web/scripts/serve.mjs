#!/usr/bin/env node
/* Production server for the static site: no dependencies, one process, one port.
   Serves apps/web/dist on $PORT (default 5180) at 0.0.0.0, with long-lived caching for hashed assets,
   a single-page-app fallback to index.html for client routes, and basic hardening headers.
   Used by `npm start` at the repository root (Railway, Render, Fly, any container host).
   /app and /app/* go to the Accord app service when APP_ORIGIN is set (see platform/DEPLOY.md). */
import { createServer, request as httpRequest } from "node:http"
import { request as httpsRequest } from "node:https"
import { createReadStream, readFileSync, readdirSync, statSync } from "node:fs"
import { createHash } from "node:crypto"
import { extname, join, normalize, resolve, sep, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const DIST = resolve(dirname(fileURLToPath(import.meta.url)), "..", "dist")
const PORT = Number(process.env.PORT) || 5180
const HOST = process.env.HOST || "0.0.0.0"
/* The Accord app runs as its own service (platform/, served under /app). APP_ORIGIN is that service's URL; requests to
   /app and /app/* are forwarded to it, streaming, with method, headers, body, status, Set-Cookie and redirects kept. */
const APP_ORIGIN = (process.env.APP_ORIGIN || "").replace(/\/$/, "")

const STARTING = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Accord app</title><meta name="robots" content="noindex"><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0d0c;color:#e8ece9;font:16px/1.5 system-ui,sans-serif}
main{max-width:420px;padding:24px}h1{font-weight:500;font-size:22px;margin:0 0 8px}p{color:#9aa39e;margin:0 0 16px}a{color:#91cfb5}</style></head>
<body><main><h1>The app is starting up</h1><p>The Accord app is not connected to this site yet. You can still check any agreement from public data.</p>
<p><a href="/verify">Verify an agreement</a> &middot; <a href="/">Back to Accord</a></p></main></body></html>`

/* The visitor's IP as this proxy's trusted upstream reported it, for the app's per-IP limits (the faucet, the
   inbox, the relayer). Railway's edge sets X-Real-IP to the client's address (docs.railway.com/networking/
   public-networking/specs-and-limits); without it, the rightmost X-Forwarded-For entry this proxy received is the one
   the edge appended (anything to its left came from the client); without either, this proxy's own socket peer.
   Limit: off Railway, with no edge in front, X-Real-IP is whatever the client sent. */
function clientIpFor(req) {
  const real = String(req.headers["x-real-ip"] || "").trim()
  if (real) return real
  const xff = String(req.headers["x-forwarded-for"] || "").split(",").map((s) => s.trim()).filter(Boolean)
  if (xff.length) return xff[xff.length - 1]
  return req.socket?.remoteAddress || "unknown"
}

function proxyToApp(req, res) {
  if (!APP_ORIGIN) {
    res.writeHead(503, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Retry-After": "60" }).end(req.method === "HEAD" ? undefined : STARTING)
    return
  }
  const target = new URL(req.url || "/app", APP_ORIGIN)
  const headers = { ...req.headers }
  // keep the visitor's host for the app's same-origin checks and cookies; the upstream gets its own Host header
  headers["x-forwarded-host"] = req.headers.host || ""
  // Railway's edge rewrites x-forwarded-host to the app's own host; this one reaches the app unchanged
  headers["x-accord-site-host"] = req.headers.host || ""
  headers["x-forwarded-proto"] = req.headers["x-forwarded-proto"] || "https"
  // set here, replacing any value the visitor sent: the app keys its per-IP limits on this header
  headers["x-accord-client-ip"] = clientIpFor(req)
  headers.host = target.host
  const send = target.protocol === "https:" ? httpsRequest : httpRequest
  const up = send(target, { method: req.method, headers }, (r) => {
    const out = { ...r.headers }
    // a redirect to the app's own origin is rewritten to this site, so the visitor stays on one address
    if (out.location && out.location.startsWith(APP_ORIGIN)) out.location = out.location.slice(APP_ORIGIN.length) || "/app"
    res.writeHead(r.statusCode || 502, out)
    r.pipe(res)
  })
  up.on("error", () => {
    if (!res.headersSent) res.writeHead(502, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" })
    res.end(STARTING)
  })
  req.pipe(up)
}

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif",
  ".gif": "image/gif", ".ico": "image/x-icon", ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8", ".md": "text/markdown; charset=utf-8", ".xml": "application/xml; charset=utf-8", ".webmanifest": "application/manifest+json",
  ".mp4": "video/mp4", ".pdf": "application/pdf",
}

/* The Content-Security-Policy for the site's own responses (the static pages, their assets and the redirects), never for
   the proxied /app responses, which keep the app's own headers. It allows what the site loads: its own files, Google
   Fonts (index.html), the NEAR testnet RPC hosts /verify reads (src/lib/nearVerify.ts), the app at /app on this origin,
   images from itself and data: URIs, inline styles, and the inline scripts in the built pages by their sha256 (read from dist at
   start, so a rebuild needs no edit here). VITE_ACCORD_API_URL and VITE_APP_URL, when they name another origin, and
   CSP_CONNECT_EXTRA (space-separated origins) are added to connect-src. */
const RPC_HOSTS = ["https://test.rpc.fastnear.com", "https://rpc.testnet.fastnear.com"]

function inlineScriptHashes() {
  const hashes = new Set()
  const walk = (dir) => {
    let entries = []
    try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      const full = join(dir, e.name)
      if (e.isDirectory()) walk(full)
      else if (e.name.endsWith(".html")) {
        const html = readFileSync(full, "utf8")
        for (const m of html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/g)) {
          hashes.add(`'sha256-${createHash("sha256").update(m[1]).digest("base64")}'`)
        }
      }
    }
  }
  walk(DIST)
  return [...hashes]
}

function originOf(url) {
  try { return /^https?:\/\//.test(url || "") ? new URL(url).origin : null } catch { return null }
}

const CONNECT = ["'self'", ...RPC_HOSTS, originOf(process.env.VITE_ACCORD_API_URL), originOf(process.env.VITE_APP_URL),
  ...(process.env.CSP_CONNECT_EXTRA || "").split(/\s+/).filter(Boolean)].filter(Boolean)

const CSP = [
  "default-src 'self'",
  `script-src 'self' ${inlineScriptHashes().join(" ")}`.trim(),
  // styles: the prerendered pages and the components use style attributes and a style element; scripts stay locked to hashes
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "media-src 'self'",
  `connect-src ${[...new Set(CONNECT)].join(" ")}`,
  "frame-src 'self'",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ")

const HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "SAMEORIGIN",
  "Strict-Transport-Security": "max-age=31536000",
  "Content-Security-Policy": CSP,
}

function fileFor(urlPath) {
  let p
  try { p = decodeURIComponent(urlPath.split("?")[0]) } catch { return null }
  const full = normalize(join(DIST, p))
  if (full !== DIST && !full.startsWith(DIST + sep)) return null // no path traversal
  try {
    const st = statSync(full)
    if (st.isFile()) return { path: full, size: st.size }
    if (st.isDirectory()) {
      const idx = join(full, "index.html")
      const s2 = statSync(idx)
      return { path: idx, size: s2.size }
    }
  } catch { /* not found */ }
  return null
}

/* Old and retired paths answer 301 to their main page (dist/redirects.json, written by the pre-render from seo/routes.mjs) */
let REDIRECTS = {}
try { REDIRECTS = JSON.parse(readFileSync(join(DIST, "redirects.json"), "utf8")) } catch { /* none */ }

const APP_ONLY = /^\/(signin|try-it|rooms|agreements|enter|profile|settings|onboarding|approvals|deliveries|invite|recipients|payout|agents|market-making)(\/|$)/

const server = createServer((req, res) => {
  const path = (req.url || "/").split("?")[0]
  if (path === "/app" || path.startsWith("/app/")) return proxyToApp(req, res)
  /* App-only paths typed or linked without the /app prefix (e.g. /signin): send them to the app */
  if (APP_ONLY.test(path)) {
    res.writeHead(308, { Location: "/app" + (req.url || "/"), ...HEADERS }).end()
    return
  }
  const moved = REDIRECTS[path.replace(/\/$/, "") || "/"]
  if (moved && (req.method === "GET" || req.method === "HEAD")) {
    const q = (req.url || "").includes("?") ? (req.url || "").slice((req.url || "").indexOf("?")) : ""
    const [p, h] = moved.split("#")
    res.writeHead(301, { Location: p + q + (h ? `#${h}` : ""), "Cache-Control": "public, max-age=3600", ...HEADERS }).end()
    return
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD", ...HEADERS }).end()
    return
  }
  if (req.url === "/healthz") {
    res.writeHead(200, { "Content-Type": "text/plain", "Cache-Control": "no-store" }).end("ok")
    return
  }
  /* Agents that ask for Markdown (Accept: text/markdown) get the page's Markdown copy at the same URL */
  const pathOnly = (req.url || "/").split("?")[0].replace(/\/$/, "") || "/"
  const wantsMd = /text\/markdown/.test(req.headers.accept || "") && !extname(pathOnly)
  let f = (wantsMd && fileFor(pathOnly === "/" ? "/index.md" : `${pathOnly}.md`)) || fileFor(req.url || "/")
  let status = 200
  // Every public route is pre-rendered to its own index.html. Anything else is a real 404: the app shell from
  // 404.html (React shows the not-found page, and it is marked noindex), so crawlers never index soft 404s.
  if (!f) {
    f = fileFor("/404.html") || fileFor("/index.html")
    status = 404
  }
  if (!f) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", ...HEADERS }).end("Not found")
    return
  }
  const ext = extname(f.path)
  /* Every page points agents to its Markdown copy and to the site's llms.txt */
  const mdLink = status === 200 && ext === ".html" ? `<${pathOnly === "/" ? "/index.md" : `${pathOnly}.md`}>; rel="alternate"; type="text/markdown", ` : ""
  const hashed = f.path.includes(`${sep}assets${sep}`) && /-[A-Za-z0-9_-]{8,}\.(js|css)$/.test(f.path)
  res.writeHead(status, {
    "Content-Type": TYPES[ext] || "application/octet-stream",
    "Content-Length": f.size,
    "Cache-Control": hashed ? "public, max-age=31536000, immutable" : ext === ".html" || ext === ".md" || ext === ".txt" || ext === ".xml" ? "public, max-age=0, must-revalidate" : "public, max-age=3600",
    ...(ext === ".md" ? { Vary: "Accept" } : {}),
    ...(ext === ".html" ? { Link: `${mdLink}</llms.txt>; rel="describedby"; type="text/plain"`, Vary: "Accept" } : {}),
    ...HEADERS,
  })
  if (req.method === "HEAD") { res.end(); return }
  createReadStream(f.path).on("error", () => res.destroy()).pipe(res)
})

/* Listen on $PORT, and also on the ports hosts most often target by default (8080, 3000, 5180), so a public domain
   pinned to a fixed target port still reaches the app. Extra ports that are taken are skipped. */
const handler = server.listeners("request")[0]
const extra = process.env.SERVE_EXTRA_PORTS === "off" ? [] : [8080, 3000, 5180].filter((p) => p !== PORT)
const servers = [server]
server.listen(PORT, HOST, () => console.log(`accord web: serving ${DIST} on http://${HOST}:${PORT}`))
for (const p of extra) {
  const s = createServer(handler)
  s.on("error", (e) => console.log(`accord web: port ${p} skipped (${e.code})`))
  s.listen(p, HOST, () => console.log(`accord web: also listening on ${p}`))
  servers.push(s)
}
for (const sig of ["SIGTERM", "SIGINT"]) process.on(sig, () => { servers.forEach((s) => s.close()); setTimeout(() => process.exit(0), 500) })
