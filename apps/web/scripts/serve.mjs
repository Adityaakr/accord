#!/usr/bin/env node
/* Production server for the static site: no dependencies, one process, one port.
   Serves apps/web/dist on $PORT (default 5180) at 0.0.0.0, with long-lived caching for hashed assets,
   a single-page-app fallback to index.html for client routes, and basic hardening headers.
   Used by `npm start` at the repository root (Railway, Render, Fly, any container host). */
import { createServer } from "node:http"
import { createReadStream, statSync } from "node:fs"
import { extname, join, normalize, resolve, sep, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const DIST = resolve(dirname(fileURLToPath(import.meta.url)), "..", "dist")
const PORT = Number(process.env.PORT) || 5180
const HOST = process.env.HOST || "0.0.0.0"

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

const server = createServer((req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD", ...HEADERS }).end()
    return
  }
  if (req.url === "/healthz") {
    res.writeHead(200, { "Content-Type": "text/plain", "Cache-Control": "no-store" }).end("ok")
    return
  }
  let f = fileFor(req.url || "/")
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
  const hashed = f.path.includes(`${sep}assets${sep}`) && /-[A-Za-z0-9_-]{8,}\.(js|css)$/.test(f.path)
  res.writeHead(status, {
    "Content-Type": TYPES[ext] || "application/octet-stream",
    "Content-Length": f.size,
    "Cache-Control": hashed ? "public, max-age=31536000, immutable" : ext === ".html" || ext === ".md" || ext === ".txt" || ext === ".xml" ? "public, max-age=0, must-revalidate" : "public, max-age=3600",
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
