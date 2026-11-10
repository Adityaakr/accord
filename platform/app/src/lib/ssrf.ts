// Webhook URLs are typed by an organisation's admin and fetched by Accord's server, so they must never reach the
// server's own network: https only, no credentials in the URL, standard port, and every address the host resolves
// to must be public (no loopback, private, link-local, CGNAT, multicast, documentation or reserved ranges, IPv4 or
// IPv6, including IPv4-mapped IPv6). server/webhook.ts resolves the name once, checks every address, then connects
// to the checked address itself (no second lookup, so DNS rebinding cannot swap it), with a timeout, no redirects
// and a cap on the response it reads. Pure here, so the rules are unit-tested.
//
// Local development may allow http://localhost (and 127.0.0.1) with `allowDevHttp`, which the server sets only when
// NODE_ENV is not production or ACCORD_WEBHOOK_DEV_HTTP=1.

import { isIP } from "node:net";

const V4_BLOCKED: [string, number][] = [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12],
  ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24],
  ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4], ["255.255.255.255", 32],
];

function v4(ip: string): number | null {
  const p = ip.split(".");
  if (p.length !== 4 || p.some((x) => !/^\d{1,3}$/.test(x) || Number(x) > 255)) return null;
  return p.reduce((a, x) => a * 256 + Number(x), 0);
}

function inV4(ip: number, base: string, bits: number): boolean {
  const b = v4(base)!;
  const size = 2 ** (32 - bits);
  return Math.floor(ip / size) === Math.floor(b / size);
}

/** 8 groups of 16 bits, or null. Handles :: and a trailing dotted IPv4. */
function v6(ip: string): number[] | null {
  let s = ip.toLowerCase().replace(/^\[|\]$/g, "").replace(/%.*$/, "");
  const dotted = s.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted) {
    const n = v4(dotted[1]!);
    if (n === null) return null;
    s = s.slice(0, -dotted[1]!.length) + `${(n >>> 16).toString(16)}:${(n & 0xffff).toString(16)}`;
  }
  const halves = s.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const fill = halves.length === 2 ? 8 - head.length - tail.length : 0;
  const groups = [...head, ...Array(Math.max(0, fill)).fill("0"), ...tail];
  if (groups.length !== 8 || groups.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return null;
  return groups.map((g) => parseInt(g, 16));
}

/** True when an address must never be fetched. Anything that does not parse is blocked too. */
export function isBlockedAddress(ip: string): boolean {
  const kind = isIP(ip.replace(/^\[|\]$/g, "").replace(/%.*$/, ""));
  if (kind === 4) {
    const n = v4(ip)!;
    return V4_BLOCKED.some(([b, bits]) => inV4(n, b, bits));
  }
  if (kind === 6) {
    const g = v6(ip);
    if (!g) return true;
    const [a, b2] = [g[0]!, g[1]!];
    if (g.every((x) => x === 0)) return true; // ::
    if (g.slice(0, 7).every((x) => x === 0) && g[7] === 1) return true; // ::1
    // IPv4-mapped (::ffff:a.b.c.d), IPv4-compatible (::a.b.c.d) and NAT64 (64:ff9b::/96): judge the IPv4 inside
    const embedded = (hi: number, lo: number) => isBlockedAddress(`${hi >>> 8}.${hi & 255}.${lo >>> 8}.${lo & 255}`);
    if (g.slice(0, 5).every((x) => x === 0) && (g[5] === 0xffff || g[5] === 0)) return embedded(g[6]!, g[7]!);
    if (a === 0x64 && b2 === 0xff9b) return embedded(g[6]!, g[7]!);
    if ((a & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
    if ((a & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
    if ((a & 0xffc0) === 0xfec0) return true; // fec0::/10 site-local (deprecated)
    if ((a & 0xff00) === 0xff00) return true; // multicast
    if (a === 0x2001 && b2 === 0x0db8) return true; // documentation
    if (a === 0x2002) return embedded(g[1]!, g[2]!); // 6to4 carries an IPv4
    if (a === 0x2001 && b2 === 0) return true; // Teredo
    if (a === 0x0100 && g[1] === 0 && g[2] === 0 && g[3] === 0) return true; // discard-only
    return false;
  }
  return true;
}

export type UrlCheck = { ok: true; url: URL; dev: boolean } | { ok: false; error: string };

const DEV_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** The URL's shape: https on 443 (or the dev exception), a host name, no user or password, at most 500 characters. */
export function checkWebhookUrl(raw: string, opts: { allowDevHttp: boolean }): UrlCheck {
  if (raw.length > 500) return { ok: false, error: "the URL is longer than 500 characters" };
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return { ok: false, error: "that is not a URL" };
  }
  if (u.username || u.password) return { ok: false, error: "the URL must not carry a user name or password" };
  const host = u.hostname.toLowerCase();
  if (opts.allowDevHttp && DEV_HOSTS.has(host) && (u.protocol === "http:" || u.protocol === "https:")) return { ok: true, url: u, dev: true };
  if (u.protocol !== "https:") return { ok: false, error: "the URL must start with https://" };
  if (u.port && u.port !== "443") return { ok: false, error: "use the standard https port (443)" };
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return { ok: false, error: "that host is not reachable from the internet" };
  if (isIP(host.replace(/^\[|\]$/g, "")) && isBlockedAddress(host)) return { ok: false, error: "that address is private or reserved" };
  if (!isIP(host.replace(/^\[|\]$/g, "")) && !host.includes(".")) return { ok: false, error: "use a full host name, like hooks.example.com" };
  return { ok: true, url: u, dev: false };
}

/** Every resolved address must be public; one private answer blocks the URL. */
export function checkResolved(addresses: readonly string[]): { ok: true; address: string; family: 4 | 6 } | { ok: false; error: string } {
  if (addresses.length === 0) return { ok: false, error: "the host does not resolve" };
  const bad = addresses.find(isBlockedAddress);
  if (bad) return { ok: false, error: "the host resolves to a private or reserved address" };
  const first = addresses[0]!;
  return { ok: true, address: first, family: isIP(first) === 6 ? 6 : 4 };
}
