// One tender, live, in the deal room's frame: the head (breadcrumb, title and phase, one line of facts), the five
// steps as thin bars, then the bids (sealed until each bidder reveals), the award and, once linked, the Accord
// agreement it became with its payments and refusals. Public, read only, re-read every 3 s while the tender moves.
import Link from "next/link";
import { notFound } from "next/navigation";
import type { TenderBid, TenderJob } from "@accord/sdk";
import { Account, KV, Panel, Pill, StatePill } from "@/components/ui";
import { AutoRefresh } from "@/components/AutoRefresh";
import { RoomLink } from "@/components/RoomLink";
import { config } from "@/server/accord";
import { boardId, dealOf, getJob, jobCount, type DealSummary } from "@/server/tender";
import { Countdown } from "../Countdown";
import { Disclosure } from "../Disclosure";
import { AgentsLink } from "../HeadActions";
import { HowToBid } from "../HowToBid";
import { PHASE_LABEL, PHASE_NOTE, shortHex, tokenOf, withinBudget } from "../lib";
import { TokenAmount } from "../TokenAmount";
import { ActivityTimeline, PriceChart } from "../charts";
import { AwardButton } from "./AwardButton";
import { WinnerPanel } from "./WinnerPanel";
import { WinnerWork } from "./WinnerWork";
import { winnerSetup } from "@/server/tenderwork";
import { BrowserBid } from "./BrowserBid";
import styles from "./job.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `Tender ${id}` };
}

const STEPS = ["Posted", "Sealed bids", "Reveal", "Award", "Agreement"] as const;

/** The current step (all before it are done; 5 means all done) and, for a tender that stopped, why. */
function stepAt(j: TenderJob): { at: number; stopped: string | null } {
  switch (j.phase) {
    case "open": return { at: 1, stopped: null };
    case "revealing": return { at: 2, stopped: null };
    case "closed": return { at: 3, stopped: null };
    case "awarded": return { at: 4, stopped: null };
    case "linked": return { at: 5, stopped: null };
    case "no_valid_bid": return { at: 3, stopped: "no valid bid" };
    case "cancelled": return { at: j.bids.length ? 2 : 1, stopped: "cancelled" };
  }
}

type Status = "sealed" | "not_revealed" | "over_budget" | "winner" | "valid";
type BidView = { bid: TenderBid; status: Status };

function bidViews(j: TenderJob): BidView[] {
  const live = j.phase === "open" || j.phase === "revealing";
  const views = j.bids.map((bid): BidView => {
    if (bid.price === null) return { bid, status: live ? "sealed" : "not_revealed" };
    if (j.winner === bid.bidder) return { bid, status: "winner" };
    return { bid, status: withinBudget(bid.price, j.budget) ? "valid" : "over_budget" };
  });
  const rank = (v: BidView) => (v.status === "winner" ? 0 : v.status === "valid" ? 1 : v.status === "over_budget" ? 2 : 3);
  return views.sort((a, b) => {
    const r = rank(a) - rank(b);
    if (r) return r;
    if (a.bid.price !== null && b.bid.price !== null) {
      const d = BigInt(a.bid.price) - BigInt(b.bid.price);
      if (d !== 0n) return d < 0n ? -1 : 1;
    }
    return a.bid.committed_at - b.bid.committed_at;
  });
}

const iso = (ns: number) => `${new Date(ns / 1e6).toISOString().slice(0, 16).replace("T", " ")} UTC`;

export default async function TenderJobPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ posted?: string }> }) {
  const { id: raw } = await params;
  const { posted } = await searchParams;
  if (!/^[1-9][0-9]{0,8}$/.test(raw)) notFound();
  const id = Number(raw);
  const board = boardId();
  const explorer = config().explorer ?? "https://testnet.nearblocks.io";

  let job: TenderJob | null;
  try {
    job = await getJob(id);
  } catch {
    return (
      <div className="container">
        <AutoRefresh seconds={5} />
        <header className={styles.head}>
          <Link href="/tenders" className="small link">Open tenders</Link>
          <div className={styles.titleRow}><h1 className="h2">Tender {id}</h1></div>
        </header>
        <div className={styles.error} role="alert">
          <p className="h5">Could not read the board</p>
          <p className="small"><span className="mono">{board}</span> did not answer. The RPC may be busy; this page reads again in 5 s.</p>
        </div>
      </div>
    );
  }
  if (!job) {
    // The board is read at final finality, a few seconds behind the wallet that just posted: a job one or two past the
    // count is most likely on its way, so wait for it rather than call it missing.
    const count = await jobCount().catch(() => null);
    const arriving = count === null ? posted === "1" : id > count && id <= count + 2;
    if (!arriving) notFound();
    return (
      <div className="container">
        <AutoRefresh seconds={2} />
        <header className={styles.head}>
          <Link href="/tenders" className="small link">Open tenders</Link>
          <div className={styles.titleRow}><h1 className="h2">Tender {id}</h1><Pill>confirming</Pill></div>
        </header>
        <div className={styles.error} role="status">
          <p className="h5">Your job is on its way to the board</p>
          <p className="small">The transaction went through; the board&apos;s final state is a few seconds behind it. This page reads <span className="mono">{board}</span> again every 2 s and shows the job as soon as it is final.</p>
        </div>
      </div>
    );
  }

  const deal: DealSummary | null = job.agreement ? await dealOf(job.agreement) : null;
  const setup = job.winner ? await winnerSetup(id) : null;
  const now = Date.now();
  const moving = job.phase === "open" || job.phase === "revealing" || job.phase === "closed" || job.phase === "awarded";
  const { at, stopped } = stepAt(job);
  const views = bidViews(job);
  const revealed = job.bids.filter((b) => b.price !== null).length;
  const allRevealed = job.bids.length > 0 && revealed === job.bids.length;
  const canAward = job.phase === "closed" || (job.phase === "revealing" && allRevealed);
  const winner = views.find((v) => v.status === "winner")?.bid ?? null;
  // The house keeper's buyer (services/agent/src/tender.ts), so a house job says it stops at the award.
  const house = job.buyer === (process.env.TENDER_BUYER_ACCOUNT || process.env.TRY_BUYER_ACCOUNT || "");
  const tok = tokenOf(job.token);
  const amount = (base: string) => <TokenAmount base={base} token={job.token} />;
  const notes: Record<(typeof STEPS)[number], string> = {
    "Posted": iso(job.created_at).slice(0, 10),
    "Sealed bids": `${job.bids.length} bid${job.bids.length === 1 ? "" : "s"}`,
    "Reveal": job.phase === "open" ? "after bidding" : `${revealed} revealed`,
    "Award": job.winner ? `winner ${shortHex(job.winner)}` : stopped === "no valid bid" ? "no valid bid" : "lowest valid price",
    "Agreement": job.agreement ?? (tok && !tok.links ? "opened separately" : "not linked"),
  };

  return (
    <div className="container">
      <AutoRefresh seconds={moving ? 3 : 15} />
      <header className={styles.head}>
        <div className={styles.headTop}>
          <Link href="/tenders" className="small link">Open tenders</Link>
          <AgentsLink />
        </div>
        <div className={styles.titleRow}>
          <h1 className="h2">{job.title}</h1>
          <span className={`${styles.stateChip} ${job.phase === "open" || job.phase === "revealing" || job.phase === "linked" ? styles.stateLive : ""}`}
            title={PHASE_NOTE[job.phase]}>{PHASE_LABEL[job.phase]}</span>
        </div>
        <p className={styles.subline}>
          <span className="small mono">#{job.id}</span>
          <span className="small">budget {amount(job.budget)}</span>
          <span className="small">buyer <Account id={job.buyer} href={`${explorer}/address/${job.buyer}`} /></span>
          <span className="small">
            {job.phase === "open" ? <>bidding <Countdown endNs={job.commit_ends} serverNow={now} ended="closing" /></>
              : job.phase === "revealing" ? <>reveal <Countdown endNs={job.reveal_ends} serverNow={now} ended="closing" /></>
              : <>closed <span className="mono">{iso(job.reveal_ends)}</span></>}
          </span>
          <span className="small">evidence <span className="mono" title={job.evidence_hash}>{shortHex(job.evidence_hash, 8)}</span></span>
        </p>
        {job.spec ? <p className={styles.spec}>{job.spec}</p> : null}
        <ol className={styles.pipeline} aria-label={`Tender progress: ${stopped ?? STEPS[Math.min(at, STEPS.length - 1)]}`}>
          {STEPS.map((s, i) => {
            const done = i < at, on = i === at && !stopped, ended = i === at && !!stopped;
            return (
              <li key={s} className={`${styles.step} ${done ? styles.done : ""} ${on ? styles.on : ""} ${ended ? styles.ended : ""}`}
                aria-current={i === at ? "step" : undefined} style={{ ["--i" as string]: i }}>
                <span className={styles.bar} aria-hidden="true" />
                <span className={styles.name}>{s}</span>
                <span className={styles.note}>{ended ? stopped : notes[s]}</span>
              </li>
            );
          })}
        </ol>
      </header>

      <div className={styles.grid}>
        <div className={styles.main}>
          <Panel title="Bids against the budget" aside={<span className="small">{job.bids.filter((b) => b.price).length} of {job.bids.length} revealed</span>}>
            <PriceChart job={job} />
          </Panel>
          {job.bids.length ? (
            <Panel title="Activity" aside={<span className="small">when each bid was sealed and revealed</span>}>
              <ActivityTimeline job={job} now={now} />
            </Panel>
          ) : null}
          <Panel title="Bids" flush aside={<span className="small">sealed until each bidder reveals</span>}>
            {views.length === 0 ? (
              <p className={`small ${styles.pad}`}>No bids yet.{job.phase === "open" ? " Bid from this browser or with your agent." : null}</p>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr><th scope="col">Agent</th><th scope="col" className={styles.key}>Key</th><th scope="col" className={styles.right}>Price</th><th scope="col" className={styles.right}>Status</th></tr>
                  </thead>
                  <tbody>
                    {views.map(({ bid, status }) => (
                      <tr key={bid.bidder} className={status === "winner" ? styles.winRow : undefined}>
                        <td className={styles.agent} title={bid.agent}>{bid.agent}</td>
                        <td className={styles.key}><span className="mono weak" title={`key ${bid.bidder}\ncommitment ${bid.commitment}`}>{shortHex(bid.bidder)}</span></td>
                        <td className={styles.right}>
                          {bid.price === null
                            ? status === "sealed" ? <span className={styles.sealed}><Lock />sealed</span> : <span className="faint">hidden</span>
                            : amount(bid.price)}
                        </td>
                        <td className={styles.right}><BidStatus status={status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          {(() => {
            const w = job.bids.find((b) => b.bidder === job.winner && b.price);
            const dust = w?.price && BigInt(w.price) > 0n && BigInt(w.price) * 10_000n < BigInt(job.budget);
            return dust ? (
              <p className={styles.recordNote} role="note">
                <b>Kept as a record of a fixed bug.</b> The house keeper priced this job in 6-decimal units while its budget is in a 24-decimal token, so its prices are near zero and one of them won. Fixed on 11 Nov 2026: the keeper now bids only on jobs in its own token, and every client reads each job&apos;s decimals. Job 8 shows the same job after the fix.
              </p>
            ) : null;
          })()}
          <Panel title="Award">
            {job.phase === "open" || (job.phase === "revealing" && !canAward) ? (
              <p className="small">The award opens when the reveal window closes, or once every bid is revealed. The lowest revealed price within the budget wins.</p>
            ) : canAward ? (
              <>
                <p className="small">The reveal is over. The board picks the lowest revealed price within the budget.</p>
                <AwardButton job={job.id} />
              </>
            ) : job.phase === "no_valid_bid" ? (
              <p className="small">No revealed price was within the budget, so nothing was awarded.</p>
            ) : job.phase === "cancelled" ? (
              <p className="small">The buyer cancelled this job.</p>
            ) : (
              <>
                <KV rows={[
                  ["Winner", winner
                    ? <span key="w"><span className="mono" title={winner.bidder}>{shortHex(winner.bidder)}</span> <span className="weak">{winner.agent}</span></span>
                    : <span key="w" className="mono">{job.winner ? shortHex(job.winner) : "none"}</span>],
                  ["Price", winner?.price ? <span key="p">{amount(winner.price)}</span> : <span key="p" className="faint">none</span>],
                  ["Agreement", job.agreement ? <RoomLink key="a" className="mono link" id={job.agreement} /> : <span key="a" className="faint">not linked</span>],
                ]} />
                {!job.agreement ? (
                  house || (tok && !tok.links) ? (
                    <p className="small">
                      {house
                        ? "A house job: the keeper posts it, bids with three house agents and asks for the award, and opens no agreement. Job 1 shows the full deal after an award (a70)."
                        : "This board links only tUSDC agreements; the buyer opens this one separately with the winner's key as vendor."}
                    </p>
                  ) : <WinnerPanel board={board} job={job} setup={setup} />
                ) : null}
                {job.winner && !house && (!tok || tok.links) ? <WinnerWork board={board} job={job} setup={setup} /> : null}
              </>
            )}
          </Panel>

          {job.agreement ? (
            <Panel title="The agreement"
              aside={<><RoomLink className="small mono link" id={job.agreement} /><Link className="small link" href={`/verify/${job.agreement}`}>Verify</Link></>}>
              {deal ? (
                <>
                  <KV rows={[
                    ["State", <StatePill key="s" state={deal.state} />],
                    ["Payments", <span key="p" className="num">{deal.paid}</span>],
                    ["Refusals", <span key="r" className="num">{deal.refused}</span>],
                  ]} />
                  {deal.codes.length ? (
                    <ul className={styles.codes} aria-label="Refusal codes">
                      {deal.codes.map((c) => <li key={c} className={`mono ${styles.code}`}>{c}</li>)}
                    </ul>
                  ) : null}
                  <p className="small">The winner&apos;s key is its vendor. The contract pays only the approved recipient, item and amount.</p>
                </>
              ) : (
                <p className="small" role="alert">Could not read <span className="mono">{job.agreement}</span> right now; this page reads again shortly.</p>
              )}
            </Panel>
          ) : null}
        </div>

        <aside className={styles.side}>
          <BrowserBid board={board} job={job} />
          <Panel title="The job">
            <KV rows={[
              ["Budget", <span key="b">{amount(job.budget)}</span>],
              ["Token", <span key="t" className="mono" title={job.token}>{tok ? tok.symbol : shortHex(job.token)}</span>],
              ["Bids close", <span key="c" className="mono">{iso(job.commit_ends)}</span>],
              ["Reveals close", <span key="r" className="mono">{iso(job.reveal_ends)}</span>],
            ]} />
          </Panel>
          <div className={styles.howto}>
            <Disclosure title="Bid with your agent" note={job.phase === "open" ? "script, skill, MCP or HTTP" : "on any open job"}>
              {job.phase === "open"
                ? <HowToBid job={job.id} />
                : <p className="small">This job no longer takes bids. The same commands work on any open job: <Link className="link" href="/tenders?phase=open">jobs taking bids</Link>.</p>}
            </Disclosure>
          </div>
        </aside>
      </div>
    </div>
  );
}

function BidStatus({ status }: { status: Status }) {
  switch (status) {
    case "winner": return <Pill tone="teal">winner</Pill>;
    case "valid": return <Pill tone="neutral">revealed</Pill>;
    case "over_budget": return <Pill tone="warn">over budget</Pill>;
    case "sealed": return <Pill tone="muted">sealed</Pill>;
    case "not_revealed": return <Pill tone="muted">not revealed</Pill>;
  }
}

function Lock() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="3" y="7" width="10" height="7.5" rx="1.6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
