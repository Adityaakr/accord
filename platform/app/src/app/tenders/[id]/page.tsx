// One tender, live: the job, where it stands, every bid (sealed until its bidder reveals it), the award and, once
// linked, the Accord agreement it became with its payments and refusals. Public, read only, re-read every 3 s while
// the tender is moving.
import Link from "next/link";
import { notFound } from "next/navigation";
import type { TenderBid, TenderJob } from "@accord/sdk";
import { AutoRefresh } from "@/components/AutoRefresh";
import { IconTile } from "@/components/IconTile";
import { RoomLink } from "@/components/RoomLink";
import { KV, PageHead, Panel, Pill, Quiet, StatePill, Usdc } from "@/components/ui";
import { config } from "@/server/accord";
import { boardId, dealOf, getJob, type DealSummary } from "@/server/tender";
import { Countdown } from "../Countdown";
import { HowToBid } from "../HowToBid";
import { PHASE_NOTE, PHASE_TONE, shortHex, symbolOf, windowEnd, withinBudget } from "../lib";
import { AwardButton } from "./AwardButton";
import styles from "./job.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `Tender ${id}` };
}

const RAIL = ["Posted", "Sealed bids", "Reveal", "Award", "Agreement", "Paid / refused"] as const;

/** Index of the current step on the rail, and whether the tender stopped there. */
function railAt(j: TenderJob, deal: DealSummary | null): { at: number; stopped: string | null } {
  switch (j.phase) {
    case "open": return { at: 1, stopped: null };
    case "revealing": return { at: 2, stopped: null };
    case "closed": return { at: 3, stopped: null };
    case "awarded": return { at: 4, stopped: null };
    case "linked": return { at: deal && (deal.paid > 0 || deal.refused > 0) ? 5 : 4, stopped: null };
    case "no_valid_bid": return { at: 3, stopped: "no valid bid" };
    case "cancelled": return { at: j.bids.length ? 1 : 0, stopped: "cancelled" };
  }
}

type BidView = { bid: TenderBid; status: "sealed" | "not_revealed" | "over_budget" | "winner" | "valid" };

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

export default async function TenderJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: raw } = await params;
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
        <PageHead eyebrow={<Quiet><Link className="link" href="/tenders">Open tenders</Link></Quiet>} title={`Tender ${id}`} />
        <Panel title="Could not read the board">
          <p className="body" role="alert">The board <span className="mono">{board}</span> did not answer. The RPC may be busy; this page reads again in 5 s.</p>
        </Panel>
      </div>
    );
  }
  if (!job) notFound();

  const deal = job.agreement ? await dealOf(job.agreement) : null;
  const now = Date.now();
  const sym = symbolOf(job.token);
  const end = windowEnd(job);
  const moving = job.phase === "open" || job.phase === "revealing" || job.phase === "closed" || job.phase === "awarded";
  const { at, stopped } = railAt(job, deal);
  const views = bidViews(job);
  const allRevealed = job.bids.length > 0 && job.bids.every((b) => b.price !== null);
  const canAward = job.phase === "closed" || (job.phase === "revealing" && allRevealed);
  const winner = views.find((v) => v.status === "winner")?.bid ?? null;
  // The house keeper's buyer (services/agent/src/tender.ts), so a house job says it stops at the award.
  const house = job.buyer === (process.env.TENDER_BUYER_ACCOUNT || process.env.TRY_BUYER_ACCOUNT || "");

  return (
    <div className="container">
      <AutoRefresh seconds={moving ? 3 : 15} />
      <PageHead
        eyebrow={<Quiet><Link className="link" href="/tenders">Open tenders</Link> · job <span className="mono">#{job.id}</span> on <a className="mono link" href={`${explorer}/address/${board}`} target="_blank" rel="noreferrer">{board}</a></Quiet>}
        title={job.title}
        lead={job.spec}
        aside={
          <div className={styles.status} aria-live="polite">
            <Pill tone={PHASE_TONE[job.phase]}>{job.phase}</Pill>
            <span className="small">{PHASE_NOTE[job.phase]}</span>
            {end ? <Countdown endNs={end} serverNow={now} className={styles.countdown} ended="window closing" /> : null}
          </div>
        }
      />

      <ol className={styles.rail} aria-label={`Tender progress: ${stopped ?? RAIL[at]}`}>
        {RAIL.map((s, i) => {
          const done = i < at;
          const current = i === at;
          return (
            <li key={s} className={`${styles.step} ${done ? styles.done : ""} ${current ? styles.current : ""} ${current && stopped ? styles.stopped : ""}`}
              aria-current={current ? "step" : undefined}>
              <span className={styles.bar} aria-hidden="true" />
              <span className={styles.stepName}>{s}</span>
              {current && stopped ? <span className={`mono ${styles.stepNote}`}>{stopped}</span> : null}
            </li>
          );
        })}
      </ol>

      <div className={styles.grid}>
        <div className={styles.main}>
          <Panel title="Bids" eyebrow={`${job.bids.length} on the board · prices stay sealed until each bidder reveals`}
            aside={<span className="small">budget <Usdc amount={job.budget} symbol={sym} /></span>}>
            {views.length === 0 ? (
              <p className="body">No bids yet. {job.phase === "open" ? "Bid with your agent below." : null}</p>
            ) : (
              <ul className={styles.bids}>
                {views.map(({ bid, status }) => <BidCard key={bid.bidder} bid={bid} status={status} sym={sym} />)}
              </ul>
            )}
          </Panel>

          <Panel title="Award">
            {job.phase === "open" || (job.phase === "revealing" && !canAward) ? (
              <p className="body">The award opens when the reveal window closes, or once every bid is revealed. The lowest revealed price within the budget wins.</p>
            ) : canAward ? (
              <>
                <p className="body">The reveal is over. The board chooses the lowest revealed price within the budget.</p>
                <AwardButton job={job.id} />
              </>
            ) : job.phase === "no_valid_bid" ? (
              <p className="body">No revealed price was within the budget, so nothing was awarded.</p>
            ) : job.phase === "cancelled" ? (
              <p className="body">The buyer cancelled this job.</p>
            ) : winner ? (
              <>
              <KV rows={[
                ["Winner", <span key="w" className="mono" title={winner.bidder}>{shortHex(winner.bidder)} ({winner.agent})</span>],
                ["Price", winner.price ? <Usdc key="p" amount={winner.price} symbol={sym} /> : "none"],
                ["Agreement", job.agreement ? <RoomLink key="a" className="mono link" id={job.agreement} /> : <span key="a" className="faint">not yet linked</span>],
              ]} />
              {!job.agreement ? (
                <p className="small">
                  {house
                    ? "This is a house job: the keeper posts it, bids with three house agents and asks for the award, and opens no agreement. The full deal after an award is recorded on jobs 2 and 3 (agreements a68 and a69)."
                    : "Next, the buyer opens an Accord agreement with the winner's key as vendor and links it here. The board stores the link only if the factory confirms that buyer, that vendor and a procurement agreement."}
                </p>
              ) : null}
              </>
            ) : (
              <p className="body">Awarded to <span className="mono">{job.winner ? shortHex(job.winner) : "none"}</span>.</p>
            )}
          </Panel>

          {job.agreement ? (
            <Panel title="The agreement" eyebrow="the winner's Accord agreement"
              aside={<RoomLink className="mono link" id={job.agreement}>Open {job.agreement}</RoomLink>}>
              <p className="body">The winner&apos;s key is the vendor of this agreement. The contract pays only the approved recipient, item and amount.</p>
              {deal ? (
                <div className={styles.deal}>
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
                  <Link className="link small" href={`/verify/${job.agreement}`}>Verify {job.agreement}</Link>
                </div>
              ) : (
                <p className="small" role="alert">Could not read the agreement right now; this page reads again shortly.</p>
              )}
            </Panel>
          ) : null}
        </div>

        <aside className={styles.side}>
          <Panel title="The job">
            <KV rows={[
              ["Budget", <Usdc key="b" amount={job.budget} symbol={sym} />],
              ["Buyer", <a key="u" className="mono link" href={`${explorer}/address/${job.buyer}`} target="_blank" rel="noreferrer">{job.buyer}</a>],
              ["Evidence hash", <span key="e" className="mono" title={job.evidence_hash}>{shortHex(job.evidence_hash, 8)}</span>],
              ["Token", <span key="t" className="mono">{job.token}</span>],
              ["Bids close", <span key="c" className="mono">{iso(job.commit_ends)}</span>],
              ["Reveals close", <span key="r" className="mono">{iso(job.reveal_ends)}</span>],
            ]} />
          </Panel>
          {job.phase === "open" ? (
            <Panel title="Bid with your agent">
              <HowToBid job={job.id} />
            </Panel>
          ) : (
            <Panel title="Bid with your agent">
              <p className="small">This job no longer takes bids. The same command works on any open job: <Link className="link" href="/tenders">Open tenders</Link>.</p>
            </Panel>
          )}
        </aside>
      </div>
    </div>
  );
}

const iso = (ns: number) => `${new Date(ns / 1e6).toISOString().slice(0, 16).replace("T", " ")} UTC`;

function BidCard({ bid, status, sym }: { bid: TenderBid; status: BidView["status"]; sym: string }) {
  const sealed = status === "sealed";
  const cls = status === "winner" ? styles.winner : sealed ? styles.sealed : status === "valid" ? "" : styles.dim;
  return (
    <li className={`${styles.bid} ${cls}`}>
      <div className={styles.bidHead}>
        <IconTile name={bid.price === null ? "lock" : "unlock"} size={30} tone={sealed || status === "winner" ? "teal" : "metal"} />
        <div className={styles.bidNames}>
          <span className={styles.agent}>{bid.agent}</span>
          <span className={styles.bidder} title={bid.bidder}>{shortHex(bid.bidder)}</span>
        </div>
      </div>
      <div className={styles.price}>
        {bid.price === null ? (
          <>
            <span className={styles.mask} aria-hidden="true" />
            <span className="small">{sealed ? "price hidden" : "price never revealed"}</span>
          </>
        ) : (
          <span className={styles.amount}><Usdc amount={bid.price} symbol={sym} /></span>
        )}
      </div>
      <div className={styles.bidFoot}>
        <span className={styles.commit} title={bid.commitment}>commit {shortHex(bid.commitment, 8)}</span>
        {status === "winner" ? <Pill tone="teal">Lowest valid price</Pill>
          : status === "over_budget" ? <Pill tone="warn">over budget, not valid</Pill>
          : status === "not_revealed" ? <Pill tone="muted">not revealed</Pill>
          : status === "sealed" ? <Pill tone="neutral">sealed</Pill>
          : <Pill tone="neutral">revealed</Pill>}
      </div>
    </li>
  );
}
