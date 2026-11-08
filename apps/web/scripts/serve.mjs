#!/usr/bin/env node
/* Production server for the static site: no dependencies, one process, one port.
   Serves apps/web/dist on $PORT (default 5180) at 0.0.0.0, with long-lived caching for hashed assets,
   a single-page-app fallback to index.html for client routes, and basic hardening headers.
   Used by `npm start` at the repository root (Railway, Render, Fly, any container host).
   /app and /app/* go to the Accord app service when APP_ORIGIN is set (see platform/DEPLOY.md). */
import { createServer, request as httpRequest } from "node:http"
import { request as httpsRequest } from "node:https"
import { createReadStream, statSync } from "node:fs"
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

function proxyToApp(req, res) {
  if (!APP_ORIGIN) {
    res.writeHead(503, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Retry-After": "60" }).end(req.method === "HEAD" ? undefined : STARTING)
    return
  }
  const target = new URL(req.url || "/app", APP_ORIGIN)
  const headers = { ...req.headers }
  // keep the visitor's host for the app's same-origin checks and cookies; the upstream gets its own Host header
  headers["x-forwarded-host"] = req.headers.host || ""
  headers["x-forwarded-proto"] = req.headers["x-forwarded-proto"] || "https"
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

const HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "SAMEORIGIN",
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

const APP_ONLY = /^\/(signin|try-it|rooms|agreements|enter|profile|settings|onboarding|approvals|deliveries|invite|recipients|payout|agents|market-making)(\/|$)/

const server = createServer((req, res) => {
  const path = (req.url || "/").split("?")[0]
  if (path === "/app" || path.startsWith("/app/")) return proxyToApp(req, res)
  /* App-only paths typed or linked without the /app prefix (e.g. /signin): send them to the app */
  if (APP_ONLY.test(path)) {
    res.writeHead(308, { Location: "/app" + (req.url || "/"), ...HEADERS }).end()
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
const extra = [8080, 3000, 5180].filter((p) => p !== PORT)
const servers = [server]
server.listen(PORT, HOST, () => console.log(`accord web: serving ${DIST} on http://${HOST}:${PORT}`))
for (const p of extra) {
  const s = createServer(handler)
  s.on("error", (e) => console.log(`accord web: port ${p} skipped (${e.code})`))
  s.listen(p, HOST, () => console.log(`accord web: also listening on ${p}`))
  servers.push(s)
}
for (const sig of ["SIGTERM", "SIGINT"]) process.on(sig, () => { servers.forEach((s) => s.close()); setTimeout(() => process.exit(0), 500) })
