import Link from "next/link";
import { config, factoryOf, symbolFor } from "@/server/accord";
import { sumBySymbol } from "@/lib/units";
import { ledger } from "@/server/ledger";
import { Account, PageHead, Panel, Pill, Usdc, EvidenceHash } from "@/components/ui";
import styles from "../pages.module.css";
import rstyles from "./record.module.css";
import { withBase } from "@/lib/basePath";

export const dynamic = "force-dynamic";
export const metadata = { title: "Record" };

export default async function Record({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const c = config();
  const scope = (await searchParams).scope === "org" ? "org" : "public";
  const l = await ledger(scope);
  const rows = l.rooms.map(({ record, receipts, view }) => ({ r: record, receipts, view }));
  const symbolOf = (r: { account: string }, view: { factory: string } | null) => symbolFor(view?.factory ?? factoryOf(r.account));
  const payments = rows.flatMap(({ r, receipts, view }) => receipts.map((x) => ({ ...x, agreement: r.account, symbol: symbolOf(r, view) }))).sort((x, y) => y.at - x.at);
  // one total per token: test USDC and Circle USDC are never added together
  const paidBy = sumBySymbol(payments);
  const refundedBy = sumBySymbol(rows.filter((x) => x.view).map((x) => ({ amount: x.view!.refunded, symbol: symbolOf(x.r, x.view) })).filter((x) => BigInt(x.amount) > 0n));
  const refused = rows.reduce((s, x) => s + (x.view?.refusals ?? 0), 0);
  const csv = scope === "org" ? "/api/record.csv?scope=org" : "/api/record.csv";

  return (
    <div className="container">
      <PageHead
        title="Record"
        lead={scope === "org" ? "Every payout, refusal and refund in the rooms where a member of your organisation is a party, read from the agreements' own accounts." : "Every payout, refusal and refund across the deal rooms, read from the agreements' own accounts. The amounts are public on NEAR, as with any stablecoin payment."}
        aside={l.unavailable ? undefined : <a className={styles.button} href={withBase(csv)}>Download CSV</a>}
      />
      <nav className={rstyles.scopes} aria-label="Record scope">
        <Link href="/record" className={`${rstyles.scope} ${scope === "public" ? rstyles.scopeOn : ""}`} aria-current={scope === "public" ? "page" : undefined}>Public ledger</Link>
        <Link href="/record?scope=org" className={`${rstyles.scope} ${scope === "org" ? rstyles.scopeOn : ""}`} aria-current={scope === "org" ? "page" : undefined}>Your organisation</Link>
        {scope === "public" ? <span className={rstyles.scopeNote}>{l.factories.join(" · ")}</span> : null}
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
        <Panel title="Paid out"><Totals parts={paidBy} /><span className="small">{payments.length} payments, each to an authorised recipient</span></Panel>
        <Panel title="Refused"><span className="h2 num">{refused}</span><span className="small">requests the terms did not allow</span></Panel>
        <Panel title="Refunded"><Totals parts={refundedBy} /><span className="small">returned to buyers at settlement</span></Panel>
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
                  <td><Usdc amount={p.amount} symbol={p.symbol} /></td>
                  <td><Account id={p.recipient} href={c.explorer ? `${c.explorer}/address/${p.recipient}` : undefined} /></td>
                  <td><Pill tone={p.via === "agent" ? "teal" : "neutral"}>{p.via}</Pill></td>
                  <td><EvidenceHash value={p.evidence_hash} agreement={p.agreement} item={p.item} /></td>
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

/** A money total per token, each on its own line; 0 in test USDC when there is none. */
function Totals({ parts }: { parts: { symbol: string; amount: bigint }[] }) {
  const shown = parts.length ? parts : [{ symbol: "tUSDC", amount: 0n }];
  return <>{shown.map((p) => <span key={p.symbol} className="h2" style={{ display: "block" }}><Usdc amount={p.amount} symbol={p.symbol} /></span>)}</>;
}
