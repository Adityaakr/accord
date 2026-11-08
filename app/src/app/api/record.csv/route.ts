// The ledger as CSV for an accountant: one row per payment, with the transaction link where the network has one.
// ?scope=org limits it to the rooms of the signed-in person's organisation (needs a session).
import { config } from "@/server/accord";
import { ledger } from "@/server/ledger";
import { formatUnits } from "@accord/sdk";

export const dynamic = "force-dynamic";

function cell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export async function GET(req: Request) {
  const c = config();
  const scope = new URL(req.url).searchParams.get("scope") === "org" ? "org" : "public";
  const l = await ledger(scope);
  if (l.unavailable) return new Response(l.unavailable === "no_session" ? "confirm it is you first\n" : "no organisation\n", { status: 401 });
  const rows = [["date_utc", "agreement", "title", "item", "description_hash", "amount_usdc", "recipient", "via", "status", "inference_cost_usd", "transaction_url"]];
  for (const r of l.rooms) {
    for (const x of r.receipts) {
      rows.push([
        new Date(x.at * 1000).toISOString(), r.record.account, r.view?.title ?? r.record.title, String(x.item), x.evidence_hash ?? "",
        formatUnits(x.amount, 6, 6), x.recipient, x.via, "paid", "", c.explorer ? `${c.explorer}/address/${r.record.account}` : `block ${x.block}`,
      ]);
    }
  }
  const name = scope === "org" ? "accord-record-organisation.csv" : "accord-record.csv";
  return new Response(rows.map((row) => row.map(cell).join(",")).join("\n") + "\n", {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename=${name}`, "cache-control": "no-store" },
  });
}
