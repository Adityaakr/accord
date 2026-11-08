import Link from "next/link";
import { config } from "@/server/accord";
import { ledger } from "@/server/ledger";
import { Account, PageHead, Panel, Pill, Usdc, Hash } from "@/components/ui";
import styles from "../pages.module.css";
import rstyles from "./record.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Record" };

export default async function Record({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const c = config();
  const scope = (await searchParams).scope === "org" ? "org" : "public";
  const l = await ledger(scope);
  const rows = l.rooms.map(({ record, receipts, view }) => ({ r: record, receipts, view }));
  const payments = rows.flatMap(({ r, receipts }) => receipts.map((x) => ({ ...x, agreement: r.account }))).sort((x, y) => y.at - x.at);
  const paid = payments.reduce((s, p) => s + BigInt(p.amount), 0n);
  const refused = rows.reduce((s, x) => s + (x.view?.refusals ?? 0), 0);
  const refunded = rows.reduce((s, x) => s + BigInt(x.view?.refunded ?? "0"), 0n);
  const csv = scope === "org" ? "/api/record.csv?scope=org" : "/api/record.csv";

  return (
    <div className="container">
      <PageHead
        title="Record"
        lead={scope === "org" ? "Every payout, refusal and refund in the rooms where a member of your organisation is a party, read from the agreements' own accounts." : "Every payout, refusal and refund across the deal rooms, read from the agreements' own accounts. The amounts are public on NEAR, as with any stablecoin payment."}
        aside={l.unavailable ? undefined : <a className={styles.button} href={csv}>Download CSV</a>}
      />
      <nav className={rstyles.scopes} aria-label="Record scope">
        <Link href="/record" className={`${rstyles.scope} ${scope === "public" ? rstyles.scopeOn : ""}`} aria-current={scope === "public" ? "page" : undefined}>Public ledger</Link>
        <Link href="/record?scope=org" className={`${rstyles.scope} ${scope === "org" ? rstyles.scopeOn : ""}`} aria-current={scope === "org" ? "page" : undefined}>Your organisation</Link>
        {l.org ? <span className={rstyles.scopeNote}>{l.org.name} · {l.rooms.length} room{l.rooms.length === 1 ? "" : "s"} · {l.org.members.length} member{l.org.members.length === 1 ? "" : "s"}</span> : null}
      </nav>
      {l.unavailable ? (
        <div className={rstyles.gate}>
          <p className="h5">{l.unavailable === "no_session" ? "Confirm it is you to see your organisation's record" : "You are not in an organisation yet"}</p>
          <p className="small">{l.unavailable === "no_session" ? "One signature in your wallet, no transaction and no fee. Then the record shows every room where a member of your organisation is a party." : "Create one, or join with an invitation, and the record gathers every room your members are part of."}</p>
          <Link href={l.unavailable === "no_session" ? "/settings" : "/onboarding"} className={styles.button}>{l.unavailable === "no_session" ? "Open Settings" : "Set up your organisation"}</Link>
        </div>
      ) : (<>
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
      </>)}
    </div>
  );
}
