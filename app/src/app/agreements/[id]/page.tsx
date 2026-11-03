import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatUnits, type ItemView, type Refusal } from "@accord/sdk";
import { room, type Room } from "@/server/data";
import { config } from "@/server/accord";
import { Account, Empty, Hash, KV, Meter, Near, Panel, Pill, StatePill, StateStrip, Usdc, type Tone } from "@/components/ui";
import { SourceLine } from "@/components/SourceLine";
import { AutoRefresh } from "@/components/AutoRefresh";
import { VerifiedPanel } from "./VerifiedPanel";
import { Actions } from "./Actions";
import { Periods } from "./Periods";
import { Conditions } from "@/components/atlas";
import styles from "./room.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: id };
}

const ITEM_TONE: Record<string, Tone> = {
  Open: "neutral", Delivered: "warn", Disputed: "warn", Eligible: "teal", Paid: "muted", AssumedPaid: "warn",
  Reserved: "purple", Unfunded: "refusal",
};

function duration(secs: number): string {
  if (secs >= 86_400 && secs % 3_600 === 0) return `${(secs / 86_400).toFixed(secs % 86_400 ? 1 : 0)} d`;
  if (secs >= 3_600) return `${(secs / 3_600).toFixed(secs % 3_600 ? 1 : 0)} h`;
  if (secs >= 60) return `${Math.round(secs / 60)} min`;
  return `${secs} s`;
}

function when(t: number | null | undefined, now: number): string {
  if (!t) return "";
  const d = t - now;
  const abs = Math.abs(d);
  const s = abs < 90 ? `${abs} s` : abs < 5_400 ? `${Math.round(abs / 60)} min` : abs < 172_800 ? `${Math.round(abs / 3_600)} h` : `${Math.round(abs / 86_400)} d`;
  return d >= 0 ? `in ${s}` : `${s} ago`;
}

export default async function DealRoom({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let r: Room;
  try {
    r = await room(id);
  } catch {
    notFound();
  }
  const { view: a, terms } = r;
  const c = config();
  const explorer = (acct: string) => (c.explorer ? `${c.explorer}/address/${acct}` : undefined);
  const now = a.now;
  const isAtlas = a.kind === "market-making";
  const total = BigInt(a.total);
  const paid = BigInt(a.paid);
  const funded = BigInt(a.funded);
  const reserved = BigInt(a.reserved);
  const escrow = funded - paid - BigInt(a.refunded);

  return (
    <div className="container">
      <AutoRefresh seconds={6} />
      <header className={styles.head}>
        <div className={styles.headTop}>
          <Link href="/" className="small link">Deal rooms</Link>
          <SourceLine {...r.source} />
        </div>
        <div className={styles.titleRow}>
          <h1 className="h2">{a.title}</h1>
          <div className={styles.titlePills}>
            {isAtlas ? <Pill tone="purple">Accord Atlas</Pill> : <Pill>procurement</Pill>}
            <StatePill state={a.state} />
            {a.params.mode === "demo" && <Pill tone="warn" title="Shorter timelocks and delays than a live agreement">demo timings</Pill>}
          </div>
        </div>
        <p className={styles.subline}>
          <Account id={a.account} href={explorer(a.account)} />
          <span className="faint">·</span>
          <span className="small">release {a.release}</span>
          <span className="faint">·</span>
          <span className="small">{a.buyer} <span className="faint">buys from</span> {a.vendor}</span>
        </p>
        <StateStrip state={a.state} />
      </header>

      <div className={styles.grid}>
        <div className={styles.main}>
          <Panel
            title="Terms"
            eyebrow={terms ? <>terms <Hash value={a.terms_hash} /> · approved by {[a.approvals.buyer && "buyer", a.approvals.vendor && "vendor"].filter(Boolean).join(" and ") || "nobody yet"}</> : "waiting for the Sealed Table"}
          >
            {terms ? (
              <>
                <div className={styles.figures}>
                  <Figure label="Total" value={<Usdc amount={terms.total} />} />
                  <Figure label={isAtlas ? "Periods" : "Items"} value={<span className="num">{terms.items.length}</span>} />
                  <Figure label="Term" value={<span className="num">{duration(terms.duration_secs)}</span>} />
                  <Figure label={isAtlas ? "Slots per period" : "Acceptance window"}
                    value={<span className="num">{isAtlas && terms.atlas ? `${terms.atlas.slots_per_period} · pass ${terms.atlas.pass_threshold}` : duration(terms.acceptance_window_secs)}</span>} />
                </div>
                {terms.atlas && (
                  <div className={styles.conditions}>
                    <span className="small">Each slot passes when</span>
                    <Conditions atlas={terms.atlas} twoSided={a.params.require_two_sided} />
                    <span className="small faint">venue Rhea DCL · {terms.atlas.venue.RheaDcl.pool_id.slice(0, 8)}… · read on NEAR mainnet</span>
                  </div>
                )}
              </>
            ) : (
              <Empty>
                {a.state === "Sealed"
                  ? `Mandates in: ${[a.negotiation === "AwaitingMandates" ? "waiting for both" : "both sealed"]}. The terms appear here once the Sealed Table returns a signed outcome and the contract checks it.`
                  : "No terms."}
              </Empty>
            )}
          </Panel>

          {r.items.length > 0 && (
            <Panel title={isAtlas ? "Retainer periods" : "Items"} flush>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr><th>#</th><th>Amount</th><th>Due</th><th>Evidence</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {r.items.map((it) => <ItemRow key={it.id} it={it} now={now} />)}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}

          {isAtlas && r.periods.length > 0 && terms?.atlas && (
            <Periods periods={r.periods} observations={r.observations} atlas={terms.atlas} now={now} />
          )}

          <RefusalLog refusals={r.refusals} total={a.refusals} />

          <Panel title="Receipts" eyebrow="every payment is a receipt: item, evidence, amount, recipient, transaction" flush>
            {r.receipts.length === 0 ? (
              <div className={styles.pad}><Empty>No payments yet.</Empty></div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>Payment</th><th>Item</th><th>Amount</th><th>Recipient</th><th>Via</th><th>Evidence</th><th>Block</th></tr></thead>
                  <tbody>
                    {r.receipts.map((x) => (
                      <tr key={x.payment_id}>
                        <td className="mono">#{x.payment_id}</td>
                        <td className="mono">{x.item}</td>
                        <td><Usdc amount={x.amount} /></td>
                        <td><Account id={x.recipient} /></td>
                        <td><Pill tone={x.via === "agent" ? "teal" : "neutral"}>{x.via}</Pill></td>
                        <td><Hash value={x.evidence_hash} /></td>
                        <td className="mono weak">{x.block.toLocaleString("en-US")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          {r.exceptions.length > 0 && (
            <Panel title="Exceptions" eyebrow="a one-off change to one item, decided by the buyer; never a recipient change">
              <ul className={styles.exceptions}>
                {r.exceptions.map((e) => (
                  <li key={e.id} className={styles.exception}>
                    <div className={styles.exceptionTop}>
                      <span className="h5">Item {e.item} · <Usdc amount={e.amount} /></span>
                      <Pill tone={e.status === "pending" ? "warn" : e.status === "approved" ? "teal" : "muted"}>{e.status}</Pill>
                    </div>
                    <p className="body">{e.reason}</p>
                    <span className="small">asked by the {e.by}{e.waive_evidence ? " · waives evidence" : ""} · {when(e.at, now)}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>

        <aside className={styles.side}>
          <Actions agreement={a} items={r.items} exceptions={r.exceptions} recipients={r.recipients} periods={r.periods} />

          <Panel title="Escrow" eyebrow={`held by ${a.account.split(".")[0]} itself`}>
            <div className={styles.escrowFigure}>
              <Usdc amount={escrow < 0n ? 0n : escrow} />
              <span className="small">in escrow</span>
            </div>
            <Meter value={paid} max={total > 0n ? total : 1n} />
            <KV rows={[
              ["Funded", <Usdc key="f" amount={funded} />],
              ["Paid", <Usdc key="p" amount={paid} />],
              ...(reserved > 0n ? [["Set aside for the vendor", <Usdc key="r" amount={reserved} />] as [string, React.ReactNode]] : []),
              ...(BigInt(a.refunded) > 0n ? [["Refunded", <Usdc key="rf" amount={a.refunded} />] as [string, React.ReactNode]] : []),
              ["Terms total", <Usdc key="t" amount={total} />],
              ["NEAR for gas and storage", <Near key="n" yocto={a.budget.liquid} />],
            ]} />
            {a.in_flight && (
              <p className="small">Payment #{a.in_flight.payment_id} in flight: <Usdc amount={a.in_flight.amount} /> for item {a.in_flight.item}.</p>
            )}
          </Panel>

          <Panel title="Recipient" eyebrow="proven on the vendor's domain, approved by its authority, accepted by the buyer">
            {a.recipient ? (
              <KV rows={[
                ["Account", <Account key="a" id={a.recipient.account} href={explorer(a.recipient.account)} />],
                ["Domain", <span key="d" className="mono">{a.recipient.domain}</span>],
                ["Version", <span key="v" className="mono">{a.recipient.version}</span>],
                ["Rating", <RatingPill key="r" rating={r.recipients.find((v) => v.version === a.recipient?.version)?.rating ?? null} />],
              ]} />
            ) : (
              <Empty>No active recipient. Payments refuse with <span className="mono">ERR_NO_RECIPIENT</span> until one is proven, approved and accepted.</Empty>
            )}
            {a.pending_recipient && (
              <div className={styles.pending}>
                <span className="small">Change pending: <span className="mono strong">{a.pending_recipient.account}</span></span>
                <span className="small">{a.pending_recipient.status}{a.pending_recipient.active_at ? ` · active ${when(a.pending_recipient.active_at, now)}` : ""}</span>
              </div>
            )}
          </Panel>

          <Panel title="Agent key" eyebrow="one function-call key on this account, for act only">
            {a.agent_key ? (
              <KV rows={[
                ["Key", <span key="k" className="mono" title={a.agent_key}>{a.agent_key.slice(0, 16)}…</span>],
                ["Can call", <span key="c" className="mono">act on {a.account.split(".")[0]}</span>],
                ["Revoked before", <span key="r" className="mono">{a.revoked_keys}</span>],
              ]} />
            ) : (
              <div className={styles.noKey}>
                <Pill tone={a.revoked_keys > 0 ? "refusal" : "muted"}>{a.revoked_keys > 0 ? "revoked" : "none"}</Pill>
                <span className="small">
                  {a.canary_tripped
                    ? "A canary request revoked the key. The account has no key; anything the agent signs is rejected by the network."
                    : a.revoked_keys > 0 ? "The buyer revoked the key. Only the buyer can install a new one." : "The buyer installs it once the agreement is executing."}
                </span>
              </div>
            )}
          </Panel>

          <VerifiedPanel agreement={a.account} model={a.model} />

          <Panel title="Parties">
            <KV rows={[
              ["Buyer", <Account key="b" id={a.buyer} href={explorer(a.buyer)} />],
              ["Vendor", <Account key="v" id={a.vendor} href={explorer(a.vendor)} />],
              ["Settlement authority", <Account key="s" id={a.vendor_authority} href={explorer(a.vendor_authority)} />],
              ["Keeper", <Account key="k" id={a.keeper} />],
              ["Started", <span key="e" className="small">{a.executing_at ? when(a.executing_at, now) : "not yet"}</span>],
              ["Ends", <span key="n" className="small">{a.ends_at ? when(a.ends_at, now) : "not yet"}</span>],
            ]} />
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function Figure({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className={styles.figure}>
      <span className="small">{label}</span>
      <span className={styles.figureValue}>{value}</span>
    </div>
  );
}

function ItemRow({ it, now }: { it: ItemView; now: number }) {
  const evidence = it.evidence === "DeliveryAccepted"
    ? (it.delivery ? <>delivered <Hash value={it.delivery.evidence_hash} /></> : <span className="faint">no delivery yet</span>)
    : <>period {it.evidence.PeriodEligible.period + 1}</>;
  return (
    <tr>
      <td className="mono">{it.id}</td>
      <td>
        <Usdc amount={it.due_amount} />
        {it.exception && <span className="small"> · exception</span>}
      </td>
      <td className="small">{it.due_at ? when(it.due_at, now) : <span className="faint">after approval</span>}</td>
      <td className="small">{evidence}{it.pending_exception !== null && <span className="small"> · exception pending</span>}</td>
      <td><Pill tone={ITEM_TONE[it.status] ?? "neutral"}>{it.status === "AssumedPaid" ? "assumed paid" : it.status.toLowerCase()}</Pill></td>
    </tr>
  );
}

function RatingPill({ rating }: { rating: string | null }) {
  if (!rating) return <span className="faint">none</span>;
  return <Pill tone={rating === "allow" ? "teal" : rating === "warn" ? "warn" : "refusal"}>{rating}</Pill>;
}

function RefusalLog({ refusals, total }: { refusals: Refusal[]; total: number }) {
  return (
    <Panel
      title="Refusal log"
      eyebrow="every payment the terms did not allow, refused on chain and recorded"
      aside={<span className={`mono ${total > 0 ? styles.refusalCount : "faint"}`}>{total}</span>}
      flush
    >
      <div aria-live="polite" aria-relevant="additions">
        {refusals.length === 0 ? (
          <div className={styles.pad}><Empty>No refusals. Every request so far matched the approved terms.</Empty></div>
        ) : (
          <ul className={styles.refusals}>
            {refusals.map((x) => (
              <li key={x.seq} className={styles.refusal}>
                <span className="mono faint">#{x.seq}</span>
                <span className={`mono ${styles.code}`}>{x.code}</span>
                <span className="small">
                  {x.amount !== "0" && <>item {x.item} · <Usdc amount={x.amount} /></>}
                  {x.recipient && <> → <span className="mono strong">{x.recipient}</span></>}
                </span>
                <span className="small mono faint">{x.via}{x.signer ? ` · ${x.signer.slice(0, 14)}…` : ""}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}
