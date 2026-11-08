import { Underline } from "./Underline";
import { InviteCard } from "./InviteCard";
import type { Metadata } from "next";
import Link from "next/link";
import { KindLabel } from "@/components/rooms/KindLabel";
import { notFound } from "next/navigation";
import { formatUnits, type ItemView, type Refusal } from "@accord/sdk";
import { room, type Room } from "@/server/data";
import { config } from "@/server/accord";
import { Account, Empty, Hash, KV, Meter, Near, Panel, Pill, StatePill, Usdc, type Tone } from "@/components/ui";
import { SourceLine } from "@/components/SourceLine";
import { AutoRefresh } from "@/components/AutoRefresh";
import { VerifiedPanel } from "./VerifiedPanel";
import { Actions } from "./Actions";
import { Periods } from "./Periods";
import { Conditions } from "@/components/atlas";
import { RoomHeader } from "./RoomHeader";
import { Negotiation, type NegotiationProps } from "./Negotiation";
import { Activity, type Event } from "./Activity";
import { currentStep } from "./pipeline";
import styles from "./room.module.css";

/* The room's tabs (PLATFORM.md §6). The tab lives in the URL (?tab=) so it survives the live refresh and can be
   linked; without one the room opens where its state is: negotiation while sealing, terms while attested, activity
   while executing, funds once settled. */
const TABS = [
  ["terms", "Terms"], ["negotiation", "Negotiation"], ["recipient", "Recipient"], ["funds", "Funds"],
  ["evidence", "Evidence"], ["activity", "Activity"], ["verify", "Verify"],
] as const;
type Tab = (typeof TABS)[number][0];
const usd = (v: string | bigint) => formatUnits(v, 6, 2);

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

export default async function DealRoom({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; created?: string }> }) {
  const { id } = await params;
  const { tab: tabParam, created } = await searchParams;
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

  const step = currentStep(a, r.items, r.periods);
  const terminal = a.state === "NoDeal" || a.state === "Cancelled" ? a.state : null;
  const fallback: Tab = a.state === "Sealed" ? "negotiation" : a.state === "Attested" ? "terms" : a.state === "Executing" ? "activity" : "funds";
  const tab: Tab = (TABS.find(([k]) => k === tabParam)?.[0] ?? fallback) as Tab;

  const neg = a.negotiation;
  const negotiation: NegotiationProps = {
    phase: terminal === "NoDeal" ? "ended" : a.state !== "Sealed" || neg === "Done" ? "done"
      : neg === "AwaitingMandates" ? "awaiting" : typeof neg === "object" && "Requested" in neg ? "requested" : "ready",
    attempt: typeof neg === "object" ? ("Requested" in neg ? neg.Requested.attempt : neg.Ready.attempts + 1) : null,
    buyer: a.buyer, vendor: a.vendor,
    buyerCommit: r.commitments.buyer?.commitment ?? null, vendorCommit: r.commitments.vendor?.commitment ?? null,
    terms: terms ? { total: usd(terms.total), items: terms.items.length, hash: a.terms_hash, label: isAtlas ? "periods" : "items" } : null,
    verifyHref: `/verify/${a.account}`,
  };

  const due = new Map(r.items.map((it) => [it.id, it.due_amount]));
  const events: Event[] = [
    ...r.refusals.map((x): Event => ({
      kind: "refusal", key: `r${x.seq}`, at: x.at, seq: x.seq, code: x.code, item: x.item, via: x.via,
      amount: x.amount !== "0" ? usd(x.amount) : null, recipient: x.recipient || null,
      allowedAmount: x.code === "ERR_AMOUNT_MISMATCH" && due.has(x.item) ? usd(due.get(x.item)!) : null,
      allowedRecipient: x.code === "ERR_PAYEE_MISMATCH" ? a.recipient?.account ?? null : null,
    })),
    ...r.receipts.map((x): Event => ({ kind: "payment", key: `p${x.payment_id}`, at: x.at, id: x.payment_id, item: x.item, amount: usd(x.amount), recipient: x.recipient, via: x.via, block: x.block })),
    ...r.exceptions.map((x): Event => ({ kind: "exception", key: `e${x.id}`, at: x.at, id: x.id, item: x.item, amount: usd(x.amount), status: x.status, by: x.by, reason: x.reason })),
  ].sort((p, q) => q.at - p.at);

  const termsPanel = (
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
            ? `Mandates in: ${a.negotiation === "AwaitingMandates" ? "waiting for both" : "both sealed"}. The terms appear here once the Sealed Table returns a signed outcome and the contract checks it.`
            : "No terms."}
        </Empty>
      )}
    </Panel>
  );

  const itemsPanel = r.items.length > 0 && (
    <Panel title={isAtlas ? "Retainer periods" : "Items"} flush>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th>#</th><th>Amount</th><th>Due</th><th>Evidence</th><th>Status</th></tr></thead>
          <tbody>{r.items.map((it) => <ItemRow key={it.id} it={it} now={now} />)}</tbody>
        </table>
      </div>
    </Panel>
  );

  const partiesPanel = (
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
  );

  return (
    <div className="container">
      <AutoRefresh seconds={6} />
      <header className={styles.head}>
        <div className={styles.headTop}>
          <Link href="/rooms" className="small link">Deal rooms</Link>
          <SourceLine {...r.source} />
        </div>
        <div className={styles.titleRow}>
          <h1 className="h2">{a.title}</h1>
          <div className={styles.titlePills}>
            <StatePill state={a.state} />
            {a.params.mode === "demo" && <Pill tone="warn" title="Shorter timelocks and delays than a live agreement">demo timings</Pill>}
          </div>
        </div>
        <p className={styles.subline}>
          <KindLabel kind={a.kind} />
          <span className="faint">·</span>
          <Account id={a.account} href={explorer(a.account)} />
          <span className="faint">·</span>
          <span className="small">release {a.release}</span>
          <span className="faint">·</span>
          <span className="small">{a.buyer} <span className="faint">buys from</span> {a.vendor}</span>
        </p>
        <RoomHeader room={a.account} buyer={a.buyer} step={step} terminal={terminal} agentKey={a.agent_key}
          revokedKeys={a.revoked_keys} canaryTripped={a.canary_tripped} executing={a.state === "Executing"} />
      </header>

      {created === "1" && <InviteCard room={a.account} buyer={a.buyer} vendor={a.vendor} authority={a.vendor_authority} />}

      <nav className={styles.tabs} aria-label="Deal room sections">
        {TABS.map(([k, label]) => (
          <Link key={k} href={`?tab=${k}`} scroll={false} className={`${styles.tab} ${k === tab ? styles.tabOn : ""}`} aria-current={k === tab ? "page" : undefined}>
            {label}
            {k === "activity" && a.refusals > 0 ? <span className={styles.tabCount}>{a.refusals}</span> : null}
            {k === tab ? <Underline /> : null}
          </Link>
        ))}
      </nav>

      <div className={styles.grid}>
        <div className={styles.main}>
          {tab === "terms" && <>{termsPanel}{itemsPanel}{partiesPanel}</>}

          {tab === "negotiation" && <Negotiation {...negotiation} />}

          {tab === "recipient" && (
            <>
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
              <Panel title="Versions" eyebrow="every recipient this room has seen, newest first" flush>
                {r.recipients.length === 0 ? <div className={styles.pad}><Empty>None proposed yet.</Empty></div> : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead><tr><th>v</th><th>Account</th><th>Domain</th><th>Status</th><th>Proposed</th></tr></thead>
                      <tbody>
                        {[...r.recipients].reverse().map((v) => (
                          <tr key={v.version}>
                            <td className="mono">{v.version}</td>
                            <td><Account id={v.account} /></td>
                            <td className="mono">{v.domain}</td>
                            <td><Pill tone={v.status === "Active" ? "teal" : v.status === "ProofFailed" || v.status === "Cancelled" ? "muted" : "neutral"}>{v.status}</Pill></td>
                            <td className="small">{when(v.proposed_at, now)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
            </>
          )}

          {tab === "funds" && (
            <>
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
              <Receipts receipts={r.receipts} />
            </>
          )}

          {tab === "evidence" && (
            <>
              {itemsPanel || <Panel title="Evidence"><Empty>Nothing to check until the terms are approved.</Empty></Panel>}
              {isAtlas && r.periods.length > 0 && terms?.atlas && (
                <Periods periods={r.periods} observations={r.observations} atlas={terms.atlas} now={now} />
              )}
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
            </>
          )}

          {tab === "activity" && (
            <Panel
              title="Activity"
              eyebrow="every payment, refusal and exception, newest first"
              aside={<span className={`mono ${a.refusals > 0 ? styles.refusalCount : "faint"}`}>{a.refusals}</span>}
              flush
            >
              <Activity events={events} now={now} />
            </Panel>
          )}

          {tab === "verify" && (
            <>
              <VerifiedPanel agreement={a.account} model={a.model} />
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
              <Panel title="Check it yourself">
                <pre className={styles.cmd}>make verify DEAL={a.account}</pre>
                <p className="small">Reads public data only, with no keys. <Link className="link" href={`/verify/${a.account}`}>Open the checks in the browser</Link></p>
              </Panel>
            </>
          )}
        </div>

        <aside className={styles.side}>
          <Actions agreement={a} items={r.items} exceptions={r.exceptions} recipients={r.recipients} periods={r.periods} />
          <Panel title="At a glance">
            <KV rows={[
              ["In escrow", <Usdc key="e" amount={escrow < 0n ? 0n : escrow} />],
              ["Paid", <Usdc key="p" amount={paid} />],
              ["Refused", <span key="r" className={`mono ${a.refusals > 0 ? styles.refusedText : ""}`}>{a.refusals}</span>],
              ["Recipient", a.recipient ? <span key="rc" className="mono">{a.recipient.account}</span> : <span key="rc" className="faint">none yet</span>],
            ]} />
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function Receipts({ receipts }: { receipts: Room["receipts"] }) {
  return (
    <Panel title="Receipts" eyebrow="every payment is a receipt: item, evidence, amount, recipient, transaction" flush>
      {receipts.length === 0 ? (
        <div className={styles.pad}><Empty>No payments yet.</Empty></div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Payment</th><th>Item</th><th>Amount</th><th>Recipient</th><th>Via</th><th>Evidence</th><th>Block</th></tr></thead>
            <tbody>
              {receipts.map((x) => (
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
