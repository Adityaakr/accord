// The ledger as CSV for an accountant: one row per payment, with the payment's own transaction where the network's
// transactions API has it (server/activity.ts; otherwise the block, and transaction_url empty). Amounts are in the
// agreement token's own unit (`unit`: tUSDC for the test token, USDC for Circle's), read from its ft_metadata.
// ?scope=org limits it to the rooms of the signed-in person's organisation (needs a session). The public CSV is
// readable from any origin (server/cors.ts); the org CSV is not, and a cross-origin request never carries cookies.
// Also served at /record.csv (src/app/record.csv/route.ts).
import { accord, config } from "@/server/accord";
import { roomActivity } from "@/server/activity";
import { readPreflight, withReadCors } from "@/server/cors";
import { ledger } from "@/server/ledger";
import { paymentTx, type PaymentRow } from "@/server/paymenttx";
import { allow, clientIp } from "@/server/ratelimit";
import { formatUnits } from "@accord/sdk";

export const dynamic = "force-dynamic";

function cell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

const symbols = new Map<string, Promise<{ symbol: string; decimals: number }>>();

/** The token's symbol and decimals from its ft_metadata (cached per process); the account id when it cannot be read. */
function tokenUnit(token: string): Promise<{ symbol: string; decimals: number }> {
  let p = symbols.get(token);
  if (!p) {
    p = accord().chain.view<{ symbol?: string; decimals?: number }>(token, "ft_metadata", {})
      .then((m) => ({ symbol: m.symbol || token, decimals: typeof m.decimals === "number" ? m.decimals : 6 }));
    p.catch(() => symbols.delete(token));
    symbols.set(token, p);
  }
  return p.catch(() => ({ symbol: /^tusdc\./.test(token) ? "tUSDC" : token, decimals: 6 }));
}

export async function GET(req: Request) {
  const c = config();
  const scope = new URL(req.url).searchParams.get("scope") === "org" ? "org" : "public";
  if (!allow(`record-csv:${clientIp(req)}`, 20, 60_000)) {
    return new Response("too many requests; wait a minute\n", { status: 429, headers: { "retry-after": "30" } });
  }
  const l = await ledger(scope);
  if (l.unavailable) return new Response(l.unavailable === "no_session" ? "confirm it is you first\n" : "no organisation\n", { status: 401 });
  const rows = [["date_utc", "agreement", "title", "item", "description_hash", "amount", "unit", "token", "recipient", "via", "status", "block", "transaction_url"]];
  const paid = l.rooms.filter((r) => r.receipts.length > 0);
  const filled = await Promise.all(paid.map(async (r) => {
    const v = r.view;
    const [activity, unit] = await Promise.all([
      v ? roomActivity({ agreement: r.record.account, buyer: v.buyer, vendor: v.vendor, authority: v.vendor_authority, keeper: v.keeper }).catch(() => null) : null,
      v ? tokenUnit(v.token) : Promise.resolve({ symbol: "", decimals: 6 }),
    ]);
    return { r, unit, rows: (activity?.entries ?? []) as PaymentRow[] };
  }));
  for (const { r, unit, rows: timeline } of filled) {
    for (const x of r.receipts) {
      const tx = paymentTx(x, timeline);
      rows.push([
        new Date(x.at * 1000).toISOString(), r.record.account, r.view?.title ?? r.record.title, String(x.item), x.evidence_hash ?? "",
        formatUnits(x.amount, unit.decimals, unit.decimals), unit.symbol, r.view?.token ?? "", x.recipient, x.via, "paid", String(x.block),
        tx && c.explorer ? `${c.explorer}/txns/${tx}` : tx ?? "",
      ]);
    }
  }
  const name = scope === "org" ? "accord-record-organisation.csv" : "accord-record.csv";
  const res = new Response(rows.map((row) => row.map(cell).join(",")).join("\n") + "\n", {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename=${name}`, "cache-control": "no-store" },
  });
  return scope === "public" ? withReadCors(res) : res;
}

export function OPTIONS() {
  return readPreflight();
}
