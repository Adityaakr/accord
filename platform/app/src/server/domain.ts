// Proof that an organisation controls its domain: a DNS TXT record on the domain, or a file on its website. Both
// carry the organisation's own token, so a record set up for another organisation does not count.

import "server-only";
import { resolveTxt } from "node:dns/promises";

export const domainRecord = (token: string) => `accord-verify=${token}`;
export const domainFile = (domain: string) => `https://${domain}/.well-known/accord-org.txt`;

async function viaDns(domain: string, want: string): Promise<boolean> {
  try {
    const records = await Promise.race([
      resolveTxt(domain),
      new Promise<string[][]>((_, no) => setTimeout(() => no(new Error("timeout")), 5000)),
    ]);
    return records.some((parts) => parts.join("").trim() === want);
  } catch {
    return false;
  }
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
