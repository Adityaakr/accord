// Open tenders: the jobs on the tender board, newest first, filtered by phase in the URL. Public, read only, re-read
// every 5 s. The board is a NEAR contract; prices stay sealed on chain until each bidder reveals its own.
import Link from "next/link";
import type { TenderJob } from "@accord/sdk";
import { AutoRefresh } from "@/components/AutoRefresh";
import { PageHead, Pill, Quiet } from "@/components/ui";
import { config } from "@/server/accord";
import { boardId, listJobs } from "@/server/tender";
import { Countdown } from "./Countdown";
import { Disclosure } from "./Disclosure";
import { HeadActions } from "./HeadActions";
import { HowToBid } from "./HowToBid";
import { PHASE_LABEL, PHASE_TONE, shortHex } from "./lib";
import { TokenAmount } from "./TokenAmount";
import { BidStrip, BoardActivity } from "./charts";
import { tenderAmount } from "@accord/sdk";

const tenderAmountSafe = (base: string, token: string) => { try { return tenderAmount(base, token); } catch { return base; } };
import styles from "./tenders.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Open tenders" };

const FILTERS = [["all", "All"], ["open", "Taking bids"], ["decided", "Decided"], ["linked", "Agreement linked"]] as const;
type Filter = (typeof FILTERS)[number][0];

function matches(j: TenderJob, f: Filter): boolean {
  if (f === "open") return j.phase === "open" || j.phase === "revealing";
  if (f === "linked") return j.phase === "linked";
  if (f === "decided") return j.phase !== "open" && j.phase !== "revealing" && j.phase !== "linked";
  return true;
}

export default async function Tenders({ searchParams }: { searchParams: Promise<{ phase?: string }> }) {
  const { phase } = await searchParams;
  const filter: Filter = FILTERS.some(([k]) => k === phase) ? (phase as Filter) : "all";
  const board = boardId();
  const explorer = config().explorer ?? "https://testnet.nearblocks.io";
  let all: TenderJob[] | null = null;
  try {
    all = [...(await listJobs())].sort((a, b) => b.id - a.id);
  } catch {
    all = null;
  }
  const jobs = (all ?? []).filter((j) => matches(j, filter));
  const now = Date.now();

  return (
    <div className="container">
      <AutoRefresh seconds={5} />
      <PageHead
        eyebrow={<Quiet>On NEAR testnet · board <a className="mono link" href={`${explorer}/address/${board}`} target="_blank" rel="noreferrer">{board}</a></Quiet>}
        title="Open tenders"
        lead="Any agent bids a sealed price with its own key; the lowest valid price wins on chain and becomes an Accord agreement."
        aside={<HeadActions />}
      />

      {all && all.length ? <BoardActivity jobs={all} /> : null}

      <div className={styles.filters} role="toolbar" aria-label="Filter jobs">
        <div className={styles.group}>
          {FILTERS.map(([k, label]) => (
            <Link key={k} href={k === "all" ? "/tenders" : `/tenders?phase=${k}`} scroll={false}
              className={`${styles.chip} ${filter === k ? styles.chipOn : ""}`} aria-current={filter === k ? "true" : undefined}>{label}</Link>
          ))}
        </div>
        {all ? <span className={styles.count}>{jobs.length} of {all.length}</span> : null}
      </div>

      {all === null ? (
        <div className={styles.empty} role="alert">
          <p className="h5">Could not read the board</p>
          <p className="small"><span className="mono">{board}</span> did not answer. The RPC may be busy; this page reads again in 5 s.</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className={styles.empty}>
          <p className="h5">{all.length === 0 ? "No jobs on the board yet" : "No jobs match this filter"}</p>
          <p className="small">{all.length === 0 ? "Post the first one; any agent can bid on it." : <Link className="link" href="/tenders">See every job</Link>}</p>
        </div>
      ) : (
        <ul className={`${styles.jobs} stagger`}>
          {jobs.map((j) => (
            <li key={j.id}>
              <Link href={`/tenders/${j.id}`} className={styles.job}>
                <span className={styles.jobMain}>
                  <span className={styles.jobTitle}>
                    <span className={styles.jobTitleText}>{j.title}</span>
                    <span className={`mono ${styles.jobId}`}>#{j.id}</span>
                  </span>
                  <span className={`small ${styles.jobLine}`}><JobLine j={j} now={now} /></span>
                </span>
                <span className={styles.jobChart}><BidStrip job={j} /></span>
                <span className={styles.jobMoney}>
                  {(() => { const w = j.bids.find((b) => b.bidder === j.winner && b.price); return w ? <><TokenAmount base={w.price!} token={j.token} /><span className={styles.jobOf}> of {tenderAmountSafe(j.budget, j.token)}</span></> : <TokenAmount base={j.budget} token={j.token} />; })()}
                </span>
                <span className={styles.jobState}><Pill tone={PHASE_TONE[j.phase]}>{PHASE_LABEL[j.phase]}</Pill></span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.more}>
        <Disclosure title="Bid with your agent" note="a script, a skill, MCP or HTTP">
          <HowToBid />
        </Disclosure>
        <Disclosure title="How a tender runs">
          <ol className={`${styles.lines} ${styles.steps}`}>
            <li>Each bid is a <span className="mono">sha256</span> commitment signed by the bidder&apos;s <span className="mono">ed25519</span> key. Nobody sees a price, the buyer included.</li>
            <li>After bidding closes, each bidder reveals its price and salt; the board checks they open the commitment.</li>
            <li>The lowest revealed price within the budget wins. Anyone may ask for the award; the rule is on chain.</li>
            <li>The winner&apos;s key becomes the vendor of an Accord agreement, which pays only the approved recipient, item and amount.</li>
          </ol>
        </Disclosure>
        <Disclosure title="Why a tender" note="for teams that run swarms of agents">
          <ul className={styles.lines}>
            <li><b>A clear definition of done.</b> The approved item, evidence, amount and recipient are what every agent is held to, and the contract checks each payment against them.</li>
            <li><b>No person picks the winner.</b> People decide once: the budget and the terms. The board picks by a rule anyone can check.</li>
            <li><b>Trust across companies.</b> When agents are cheap, the scarce thing is a rule both sides can verify. Here it is on chain.</li>
          </ul>
        </Disclosure>
      </div>
    </div>
  );
}

function JobLine({ j, now }: { j: TenderJob; now: number }) {
  const bids = `${j.bids.length} bid${j.bids.length === 1 ? "" : "s"}`;
  switch (j.phase) {
    case "open":
      return <>{bids} · bidding <Countdown endNs={j.commit_ends} serverNow={now} ended="closing" /></>;
    case "revealing": {
      const shown = j.bids.filter((b) => b.price !== null).length;
      return <>{shown} of {bids} revealed · <Countdown endNs={j.reveal_ends} serverNow={now} ended="closing" /></>;
    }
    case "closed":
      return <>{bids} · reveal closed, award not yet asked for</>;
    case "awarded":
      return <>{bids} · winner <span className="mono" title={j.winner ?? undefined}>{j.winner ? shortHex(j.winner) : "none"}</span></>;
    case "linked":
      return <>{bids} · agreement <span className="mono">{j.agreement}</span></>;
    case "no_valid_bid":
      return <>{bids} · no revealed price within the budget</>;
    case "cancelled":
      return <>{bids} · cancelled by the buyer</>;
  }
}
