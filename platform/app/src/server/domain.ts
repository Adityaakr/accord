// Proof that an organisation controls its domain: a DNS TXT record on the domain, or a file on its website. Both
// carry the organisation's own token, so a record set up for another organisation does not count.

import "server-only";
import { Resolver, resolveTxt } from "node:dns/promises";

export const domainRecord = (token: string) => `accord-verify=${token}`;
export const domainFile = (domain: string) => `https://${domain}/.well-known/accord-org.txt`;

// Where the TXT record is looked up, in order: the domain's own authoritative nameservers, then the host's resolver,
// then Cloudflare and Google. Asking the authoritative servers is what makes the check instant: a check made before
// the record was added leaves "no TXT record" in every caching resolver for the domain's negative TTL (often 10
// minutes or more), but the servers that hold the zone answer from the zone itself. The others are fallbacks for a
// zone whose nameservers do not answer from here.
const PUBLIC = [["1.1.1.1", "1.0.0.1"], ["8.8.8.8", "8.8.4.4"]];
const resolverOn = (servers: string[]) => {
  const r = new Resolver({ timeout: 2500, tries: 1 });
  r.setServers(servers);
  return r;
};

/** The IPv4 addresses of the nameservers for the closest enclosing zone (a.b.example.com, b.example.com, example.com). */
async function authoritative(domain: string): Promise<string[]> {
  const labels = domain.split(".");
  for (let i = 0; i < labels.length - 1; i++) {
    const zone = labels.slice(i).join(".");
    const ns = await resolverOn(PUBLIC[0]!).resolveNs(zone).catch(() => [] as string[]);
    if (ns.length === 0) continue;
    const ips = (await Promise.all(ns.slice(0, 4).map((h) => resolverOn(PUBLIC[0]!).resolve4(h).catch(() => [] as string[])))).flat();
    return [...new Set(ips)];
  }
  return [];
}

function txtLookups(domain: string): (() => Promise<string[][]>)[] {
  return [
    async () => {
      const ips = await authoritative(domain);
      if (ips.length === 0) throw new Error("no nameservers");
      return resolverOn(ips).resolveTxt(domain);
    },
    () => resolveTxt(domain),
    ...PUBLIC.map((servers) => () => resolverOn(servers).resolveTxt(domain)),
  ];
}

async function viaDns(domain: string, want: string): Promise<boolean> {
  for (const lookup of txtLookups(domain)) {
    try {
      const records = await Promise.race([
        lookup(),
        new Promise<string[][]>((_, no) => setTimeout(() => no(new Error("timeout")), 5000)),
      ]);
      if (records.some((parts) => parts.join("").trim() === want)) return true;
    } catch {
      // no record or no answer from this resolver: try the next
    }
  }
  return false;
}

async function viaFile(domain: string, want: string): Promise<boolean> {
  try {
    const r = await fetch(domainFile(domain), { redirect: "error", signal: AbortSignal.timeout(5000), cache: "no-store" });
    if (!r.ok) return false;
    const text = (await r.text()).slice(0, 4096);
    return text.split(/\r?\n/).some((l) => l.trim() === want);
  } catch {
    return false;
  }
}

export async function checkDomain(domain: string, token: string): Promise<"dns" | "file" | null> {
  const want = domainRecord(token);
  if (await viaDns(domain, want)) return "dns";
  if (await viaFile(domain, want)) return "file";
  return null;
}
