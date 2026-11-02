import Link from "next/link";
import { accord, config } from "@/server/accord";
import { Account, PageHead, Panel, Pill, Usdc, Hash } from "@/components/ui";
import styles from "../pages.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Record" };

export default async function Record() {
  const a = accord();
  const c = config();
  const records = await a.listAgreements({ limit: 100 }).catch(() => []);
  const rows = (await Promise.all(records.map(async (r) => {
    const [receipts, view] = await Promise.all([a.agreement(r.account).receipts().catch(() => []), a.agreement(r.account).get().catch(() => null)]);
    return { r, receipts, view };
  })));
  const payments = rows.flatMap(({ r, receipts }) => receipts.map((x) => ({ ...x, agreement: r.account }))).sort((x, y) => y.at - x.at);
  const paid = payments.reduce((s, p) => s + BigInt(p.amount), 0n);
  const refused = rows.reduce((s, x) => s + (x.view?.refusals ?? 0), 0);
  const refunded = rows.reduce((s, x) => s + BigInt(x.view?.refunded ?? "0"), 0n);

  return (
    <div className="container">
      <PageHead
        title="Record"
        lead="Every payout, refusal and refund across the deal rooms, read from the agreements' own accounts. The amounts are public on NEAR, as with any stablecoin payment."
        aside={<a className={styles.button} href="/api/record.csv">Download CSV</a>}
      />
      <div className={styles.cols3} style={{ marginBottom: 32 }}>
        <Panel title="Paid out"><span className="h2"><Usdc amount={paid} /></span><span className="small">{payments.length} payments, each to an authorised recipient</span></Panel>
        <Panel title="Refused"><span className="h2 num">{refused}</span><span className="small">requests the terms did not allow</span></Panel>
        <Panel title="Refunded"><span className="h2"><Usdc amount={refunded} /></span><span className="small">returned to buyers at settlement</span></Panel>
      </div>
      <Panel title="Payments" flush>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Date (UTC)</th><th>Agreement</th><th>Item</th><th>Amount</th><th>Recipient</th><th>Via</th><th>Evidence</th></tr></thead>
            <tbody>
              {payments.length === 0 && <tr><td colSpan={7}>No payments yet.</td></tr>}
              {payments.map((p) => (
                <tr key={`${p.agreement}-${p.payment_id}`}>
                  <td className="mono">{new Date(p.at * 1000).toISOString().replace("T", " ").slice(0, 16)}</td>
                  <td><Link className="mono link" href={`/agreements/${p.agreement}`}>{p.agreement}</Link></td>
                  <td className="mono">{p.item}</td>
                  <td><Usdc amount={p.amount} /></td>
                  <td><Account id={p.recipient} href={c.explorer ? `${c.explorer}/address/${p.recipient}` : undefined} /></td>
                  <td><Pill tone={p.via === "agent" ? "teal" : "neutral"}>{p.via}</Pill></td>
                  <td><Hash value={p.evidence_hash} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
