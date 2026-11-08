import Link from "next/link";
import { roomTable, type RoomRow } from "@/server/data";
import { PageHead, Usdc } from "@/components/ui";
import { KindLabel } from "@/components/rooms/KindLabel";
import { SourceLine } from "@/components/SourceLine";
import { STEPS } from "@/app/agreements/[id]/pipeline";
import styles from "./rooms.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Deal rooms" };

// Deal rooms (PLATFORM.md §6): the signed-in person's rooms (?party=, set by the sidebar) or every room on the factory,
// one row each with its seven-step pipeline, money and what waits. Filters live in the URL.
const TYPES = [["all", "All types"], ["market-making", "Market making"], ["procurement", "Vendor contracts"]] as const;
const STATES = [["all", "Any state"], ["open", "In negotiation"], ["executing", "Executing"], ["needs", "Needs you"], ["ended", "Ended"]] as const;

function matches(r: RoomRow, type: string, state: string): boolean {
  if (type !== "all" && r.kind !== type) return false;
  if (state === "open") return r.state === "Sealed" || r.state === "Attested";
  if (state === "executing") return r.state === "Executing";
  if (state === "needs") return r.needs > 0;
  if (state === "ended") return r.state === "Settled" || !!r.terminal;
  return true;
}

export default async function Rooms({ searchParams }: { searchParams: Promise<{ party?: string; role?: string; type?: string; state?: string }> }) {
  const { party, role, type = "all", state = "all" } = await searchParams;
  let data: Awaited<ReturnType<typeof roomTable>> | null = null;
  let error: string | null = null;
  try {
    data = await roomTable(party);
  } catch (e) {
    error = (e as Error).message;
  }
  const all = (data?.rows ?? []).filter((r) => !role || !party || r.roles.includes(role as RoomRow["roles"][number]));
  const rows = all.filter((r) => matches(r, type, state));
  const href = (k: "type" | "state", v: string) => {
    const q = new URLSearchParams();
    if (party) q.set("party", party);
    if (role) q.set("role", role);
    const t = k === "type" ? v : type, s = k === "state" ? v : state;
    if (t !== "all") q.set("type", t);
    if (s !== "all") q.set("state", s);
    const qs = q.toString();
    return `/rooms${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="container">
      <PageHead
        eyebrow={data ? <SourceLine {...data.source} /> : null}
        title={party ? (role === "vendor" ? "Rooms you sell in" : role === "authority" ? "Rooms you authorise" : role === "buyer" ? "Rooms you buy in" : "Your deal rooms") : "All deal rooms"}
        lead={party ? <>Rooms where <span className="mono">{party}</span> is {role === "vendor" ? "the vendor" : role === "authority" ? "the vendor's settlement authority" : role === "buyer" ? "the buyer" : "the buyer, the vendor or the vendor's authority"}. <Link href="/rooms" className="weak">See every room on the factory</Link>.</> : "Every deal room on the factory. Each is its own NEAR account; the terms both companies approved decide what the buyer's agent may pay."}
        aside={!role || role === "buyer" ? <Link href="/agreements/new" className={styles.primary}>New deal room</Link> : null}
      />

      <div className={styles.filters} role="toolbar" aria-label="Filter deal rooms">
        <div className={styles.group}>
          {TYPES.map(([k, label]) => <Link key={k} href={href("type", k)} className={`${styles.chip} ${type === k ? styles.chipOn : ""}`} aria-current={type === k ? "true" : undefined}>{label}</Link>)}
        </div>
        <div className={styles.group}>
          {STATES.filter(([k]) => party || k !== "needs").map(([k, label]) => <Link key={k} href={href("state", k)} className={`${styles.chip} ${state === k ? styles.chipOn : ""}`} aria-current={state === k ? "true" : undefined}>{label}</Link>)}
        </div>
        <span className={styles.count}>{rows.length} of {all.length}</span>
      </div>

      {error && <div className={styles.error} role="alert"><p className="h5">The chain could not be read</p><p className="small mono">{error}</p></div>}

      {data && rows.length === 0 && (
        <div className={styles.empty}>
          <p className="h4">{all.length === 0 ? (party ? "You are not in a deal room yet" : "No deal rooms yet") : "No rooms match these filters"}</p>
          <p className="body">{all.length === 0 ? "Start a market-making or vendor deal room. Each one runs seven steps, from sealed limits to a settled payment." : "Clear a filter to see more."}</p>
        </div>
      )}

      {rows.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Room</th>
                <th scope="col">Counterparty</th>
                <th scope="col">Step</th>
                <th scope="col" className={styles.num}>Escrowed</th>
                <th scope="col" className={styles.num}>Paid</th>
                <th scope="col">Next eligible</th>
                <th scope="col"><span className="visually-hidden">Flags</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const counterparty = party && r.buyer !== party ? r.buyer : r.vendor;
                const stepName = r.terminal ? (r.terminal === "NoDeal" ? "No deal" : "Cancelled") : STEPS[r.step];
                return (
                  <tr key={r.account}>
                    <td>
                      <Link href={`/agreements/${r.account}`} className={styles.room}>
                        <span className={styles.title}>{r.title}</span>
                        <KindLabel kind={r.kind} />
                      </Link>
                    </td>
                    <td className="mono small" data-label="Counterparty">{counterparty}</td>
                    <td data-label="Step">
                      <span className={styles.step} aria-label={`Step ${r.step + 1} of 7: ${stepName}`}>
                        <span className={styles.dots} aria-hidden="true">
                          {STEPS.map((s, i) => <i key={s} className={r.terminal ? styles.dotEnded : i < r.step || r.state === "Settled" ? styles.dotDone : i === r.step ? styles.dotOn : ""} />)}
                        </span>
                        <span className={styles.stepName}>{stepName}</span>
                      </span>
                    </td>
                    <td className={styles.num} data-label="Escrowed"><Usdc amount={r.escrowed} /></td>
                    <td className={styles.num} data-label="Paid"><Usdc amount={r.paid} /></td>
                    <td data-label="Next eligible">{r.next ? <span className={styles.next}><Usdc amount={r.next.amount} /><span className={styles.nextNote}>{r.next.payableNow ? "eligible now" : "waiting on evidence"}</span></span> : <span className="faint small">none</span>}</td>
                    <td className={styles.flagCell}>
                      {r.needs > 0 || r.refusals > 0 ? (
                        <span className={styles.flags}>
                          {r.needs > 0 && <Link href={`/agreements/${r.account}`} className={styles.needs}>{r.needs} for you</Link>}
                          {r.refusals > 0 && <span className={styles.refused}>{r.refusals} refused</span>}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
