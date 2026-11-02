import "server-only";

export interface DomainCheck {
  url: string;
  checks: { file: string; recipient_listed: string; authority_matches: string };
  form: "simple" | "list" | null;
  pairs: { recipient: string; settlement_authority: string }[];
}

export async function checkDomainFile(domain: string, account: string, authority: string): Promise<DomainCheck> {
  const url = `https://${domain}/.well-known/accord.json`;
  const out: DomainCheck = { url, checks: { file: "not fetched", recipient_listed: "not checked", authority_matches: "not checked" }, form: null, pairs: [] };
  let body: unknown;
  try {
    const res = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(8000) });
    if (!res.ok) { out.checks.file = `HTTP ${res.status}`; return out; }
    const text = await res.text();
    if (text.length > 64 * 1024) { out.checks.file = "larger than 64 KB"; return out; }
    body = JSON.parse(text);
  } catch (e) {
    out.checks.file = (e as Error).message.slice(0, 120);
    return out;
  }
  const f = body as { accord?: string; recipients?: string[]; settlement_authority?: string; entries?: { recipient: string; settlement_authority: string }[] };
  if (f.accord !== "1") { out.checks.file = "missing \"accord\": \"1\""; return out; }
  if (Array.isArray(f.entries)) {
    out.form = "list";
    out.pairs = f.entries.filter((e) => typeof e?.recipient === "string" && typeof e?.settlement_authority === "string");
  } else if (Array.isArray(f.recipients) && typeof f.settlement_authority === "string") {
    out.form = "simple";
    out.pairs = f.recipients.map((r) => ({ recipient: r, settlement_authority: f.settlement_authority! }));
  } else {
    out.checks.file = "neither the simple nor the list form";
    return out;
  }
  out.checks.file = "ok";
  const listed = out.pairs.filter((p) => p.recipient === account);
  out.checks.recipient_listed = account ? (listed.length ? "ok" : "account not listed") : "not checked";
  out.checks.authority_matches = authority ? (listed.some((p) => p.settlement_authority === authority) ? "ok" : "authority differs") : "not checked";
  return out;
}
