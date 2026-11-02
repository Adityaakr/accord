// The ledger as CSV for an accountant: one row per payment, with the transaction link where the network has one.
import { accord, config } from "@/server/accord";
import { formatUnits } from "@accord/sdk";

export const dynamic = "force-dynamic";

function cell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export async function GET() {
  const a = accord();
  const c = config();
  const records = await a.listAgreements({ limit: 100 });
  const rows = [["date_utc", "agreement", "item", "description_hash", "amount_usdc", "recipient", "via", "status", "inference_cost_usd", "transaction_url"]];
  for (const r of records) {
    const receipts = await a.agreement(r.account).receipts().catch(() => []);
    for (const x of receipts) {
      rows.push([
        new Date(x.at * 1000).toISOString(), r.account, String(x.item), x.evidence_hash ?? "", formatUnits(x.amount, 6, 6),
        x.recipient, x.via, "paid", "", c.explorer ? `${c.explorer}/address/${r.account}` : `block ${x.block}`,
      ]);
    }
  }
  return new Response(rows.map((row) => row.map(cell).join(",")).join("\n") + "\n", {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=accord-record.csv" },
  });
}
