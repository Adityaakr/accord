#!/usr/bin/env node
/* Tests for scripts/serve.mjs, run against the real server on spare ports with a stand-in app behind it:
   - the proxy sets x-accord-client-ip itself (from X-Real-IP, else the rightmost X-Forwarded-For entry, else its socket
     peer), replacing any value the visitor sent;
   - the site's own responses carry HSTS and the Content-Security-Policy; proxied /app responses keep the app's own
     headers and get no site CSP.
   Usage: node scripts/test-serve.mjs (needs no build: a missing dist answers 404 with the same headers). */
import { createServer, request } from "node:http"
import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import assert from "node:assert/strict"

const here = dirname(fileURLToPath(import.meta.url))
const SITE_PORT = 52181
const APP_PORT = 52182

const app = createServer((req, res) => {
  res.writeHead(200, { "content-type": "application/json", "x-app": "yes" })
  res.end(JSON.stringify({ ip: req.headers["x-accord-client-ip"] ?? null }))
})
await new Promise((r) => app.listen(APP_PORT, "127.0.0.1", r))

const site = spawn(process.execPath, [join(here, "serve.mjs")], {
  env: { ...process.env, PORT: String(SITE_PORT), HOST: "127.0.0.1", APP_ORIGIN: `http://127.0.0.1:${APP_PORT}`, SERVE_EXTRA_PORTS: "off" },
  stdio: ["ignore", "pipe", "inherit"],
})
await new Promise((resolve, reject) => {
  site.stdout.on("data", (d) => { if (String(d).includes("serving")) resolve() })
  site.on("exit", (c) => reject(new Error(`serve.mjs exited ${c}`)))
})

function get(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const r = request({ host: "127.0.0.1", port: SITE_PORT, path, headers }, (res) => {
      let body = ""
      res.on("data", (d) => (body += d))
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body }))
    })
    r.on("error", reject)
    r.end()
  })
}

let failed = 0
async function test(name, f) {
  try { await f(); console.log(`ok   ${name}`) } catch (e) { failed++; console.log(`FAIL ${name}\n     ${e.message}`) }
}

await test("X-Real-IP from the edge wins over a spoofed x-accord-client-ip and X-Forwarded-For", async () => {
  const r = await get("/app/api/x", { "x-real-ip": "203.0.113.7", "x-forwarded-for": "6.6.6.6, 203.0.113.9", "x-accord-client-ip": "6.6.6.6" })
  assert.equal(JSON.parse(r.body).ip, "203.0.113.7")
})
await test("without X-Real-IP, the rightmost X-Forwarded-For entry, never the client's leftmost", async () => {
  const r = await get("/app/api/x", { "x-forwarded-for": "6.6.6.6, 203.0.113.9", "x-accord-client-ip": "6.6.6.6" })
  assert.equal(JSON.parse(r.body).ip, "203.0.113.9")
})
await test("with neither, the proxy's own socket peer", async () => {
  const r = await get("/app/api/x", { "x-accord-client-ip": "6.6.6.6" })
  assert.match(JSON.parse(r.body).ip, /127\.0\.0\.1/)
})
await test("site responses carry HSTS and the CSP", async () => {
  const r = await get("/")
  assert.equal(r.headers["strict-transport-security"], "max-age=31536000")
  const csp = r.headers["content-security-policy"] || ""
  assert.match(csp, /default-src 'self'/)
  assert.match(csp, /connect-src [^;]*https:\/\/test\.rpc\.fastnear\.com/)
  assert.match(csp, /img-src 'self' data:/)
})
await test("redirects carry them too", async () => {
  const r = await get("/signin")
  assert.equal(r.status, 308)
  assert.ok(r.headers["content-security-policy"])
})
await test("/record.csv goes to the app's CSV", async () => {
  const r = await get("/record.csv")
  assert.equal(r.status, 308)
  assert.equal(r.headers.location, "/app/record.csv")
})
await test("proxied /app responses keep the app's headers and get no site CSP", async () => {
  const r = await get("/app/api/x")
  assert.equal(r.headers["x-app"], "yes")
  assert.equal(r.headers["content-security-policy"], undefined)
})

site.kill("SIGTERM")
app.close()
if (failed) { console.log(`${failed} failed`); process.exit(1) }
console.log("serve.mjs: all passed")
process.exit(0)
