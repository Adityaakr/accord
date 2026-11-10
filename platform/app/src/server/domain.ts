// Proof that an organisation controls its domain: a DNS TXT record on the domain, or a file on its website. Both
// carry the organisation's own token, so a record set up for another organisation does not count.

import "server-only";
import { Resolver, resolveTxt } from "node:dns/promises";

export const domainRecord = (token: string) => `accord-verify=${token}`;
export const domainFile = (domain: string) => `https://${domain}/.well-known/accord-org.txt`;

// The host's resolver first, then Cloudflare and Google directly. A check made before the record was added leaves
// "no TXT record" in the host's resolver for the domain's negative TTL (often 10 minutes or more), so a person who
// adds the record and checks again would otherwise be told it is missing while every public resolver already has it.
const PUBLIC = [["1.1.1.1", "1.0.0.1"], ["8.8.8.8", "8.8.4.4"]];
function txtLookups(domain: string): (() => Promise<string[][]>)[] {
  return [
    () => resolveTxt(domain),
    ...PUBLIC.map((servers) => () => {
      const r = new Resolver({ timeout: 2500, tries: 1 });
      r.setServers(servers);
      return r.resolveTxt(domain);
    }),
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
