// Charts of a tender, drawn only from what the board stores (budget, each bid's commitment time, its revealed price
// and reveal time, the winner). Colour carries state, never identity: teal is the winner, ink is any other revealed
// bid, a hollow mark is a bid still sealed, yellow flags a price far below one unit of the token (on job 7 the house
// agents priced a NEAR job in 6-decimal units). Every mark has a text tooltip, and the bids table under the chart is
// its table view. Server components: plain HTML and SVG, no client JavaScript.
import Link from "next/link";
import { tenderAmount, tenderToken, type TenderBid, type TenderJob } from "@accord/sdk";
import styles from "./charts.module.css";

const amount = (base: string, token: string) => {
  try { return `${tenderAmount(base, token)} ${tenderToken(token).symbol}`; } catch { return `${base} base units`; }
};
/** price / budget as a number, from bigints (no float on 24-decimal amounts). */
const ratio = (price: string, budget: string) => {
  const b = BigInt(budget);
  return b > 0n ? Number((BigInt(price) * 100_000n) / b) / 100_000 : 0;
};
const isDust = (price: string, budget: string) => BigInt(price) > 0n && BigInt(price) * 10_000n < BigInt(budget);
type Kind = "win" | "bid" | "dust" | "over";
const kindOf = (b: TenderBid, j: TenderJob): Kind =>
  b.bidder === j.winner ? "win" : b.price && BigInt(b.price) > BigInt(j.budget) ? "over" : b.price && isDust(b.price, j.budget) ? "dust" : "bid";

/** One line in the jobs list: each revealed bid against the budget (the tick at the right), sealed bids hollow. */
export function BidStrip({ job }: { job: TenderJob }) {
  const W = 168, L = 6, R = 150, Y = 14;
  const max = Math.max(1, ...job.bids.filter((b) => b.price).map((b) => ratio(b.price!, job.budget)));
  const scale = Math.min(max, 1.12);
  const x = (r: number) => L + (R - L) * Math.min(r, scale) / scale;
  const budgetX = x(1);
  const sealed = job.bids.filter((b) => b.price === null);
  const label = job.bids.length === 0 ? "no bids yet" : `${job.bids.length} bids against a budget of ${amount(job.budget, job.token)}`;
  return (
    <svg className={styles.strip} viewBox={`0 0 ${W} 28`} role="img" aria-label={label}>
      <line x1={L} x2={R} y1={Y} y2={Y} className={styles.stripTrack} />
      <line x1={budgetX} x2={budgetX} y1={6} y2={22} className={styles.stripBudget} />
      {sealed.map((b, i) => (
        <circle key={b.bidder} cx={L + 4 + i * 9} cy={Y} r={3} className={styles.mSealed}><title>{`${b.agent}: sealed`}</title></circle>
      ))}
      {job.bids.filter((b) => b.price).map((b) => {
        const k = kindOf(b, job);
        return (
          <circle key={b.bidder} cx={x(ratio(b.price!, job.budget))} cy={Y} r={k === "win" ? 4.5 : 3.2} className={styles[`m_${k}`]}>
            <title>{`${b.agent}: ${amount(b.price!, job.token)}${k === "win" ? " (winner)" : k === "dust" ? " (far below one unit)" : ""}`}</title>
          </circle>
        );
      })}
    </svg>
  );
}

/** Base units as a decimal number for differences and percentages (display only; ranking stays in bigint). */
const asNumber = (base: string, token: string) => {
  try { return Number(tenderAmount(base, token).replace("<", "")); } catch { return 0; }
};

/**
 * The job page: every bid on one price axis from 0 to the budget, each with its price and its distance from the
 * winning price in fixed columns at the right (never on the plot, so nothing collides with the budget line).
 */
export function PriceChart({ job }: { job: TenderJob }) {
  const revealed = job.bids.filter((b) => b.price);
  const maxR = Math.max(1, ...revealed.map((b) => ratio(b.price!, job.budget)));
  const scale = maxR > 1 ? Math.min(maxR * 1.03, 2) : 1;
  const pos = (r: number) => `${(Math.min(r, scale) / scale) * 100}%`;
  const rows = [...job.bids].sort((a, b) => (a.price && b.price ? (BigInt(a.price) < BigInt(b.price) ? -1 : 1) : a.price ? -1 : b.price ? 1 : 0));
  const win = job.bids.find((b) => b.bidder === job.winner && b.price) ?? null;
  const ref = win ?? rows.find((b) => b.price && kindOf(b, job) !== "over") ?? null;
  const sym = (() => { try { return tenderToken(job.token).symbol; } catch { return ""; } })();
  const budgetN = asNumber(job.budget, job.token);
  const refN = ref?.price ? asNumber(ref.price, job.token) : 0;
  const valid = revealed.filter((b) => BigInt(b.price!) <= BigInt(job.budget));
  const spread = valid.length > 1 ? Math.max(...valid.map((b) => asNumber(b.price!, job.token))) - Math.min(...valid.map((b) => asNumber(b.price!, job.token))) : 0;
  const fmt = (n: number) => (n >= 1 || n === 0 ? n.toFixed(2) : n.toPrecision(2));
  const ticks = [0, 0.5, 1];
  // after the reveal window an unrevealed bid is out of the running, not still "sealed"
  const live = job.phase === "open" || job.phase === "revealing";
  return (
    <div className={styles.chart}>
      {ref?.price ? (
        <p className={styles.summary}>
          <span>{win ? "Winning price" : "Lowest valid price so far"} <b>{amount(ref.price, job.token)}</b></span>
          {isDust(ref.price, job.budget) ? <span className={styles.summaryWarn}>far below one unit: priced in the wrong decimals</span> : null}
          {budgetN > 0 && refN <= budgetN && !isDust(ref.price, job.budget) ? <span><b>{fmt(budgetN - refN)} {sym}</b> ({(((budgetN - refN) / budgetN) * 100).toFixed(1)}%) under the budget</span> : null}
          {valid.length > 1 ? <span>spread <b>{fmt(spread)} {sym}</b></span> : null}
          <span>{revealed.length} of {job.bids.length} revealed{!live && revealed.length < job.bids.length ? ` · ${job.bids.length - revealed.length} never revealed` : ""}</span>
        </p>
      ) : (
        <p className={styles.summary}><span>{job.bids.length ? `${job.bids.length} sealed bid${job.bids.length === 1 ? "" : "s"}: prices show as each bidder reveals` : "No bids yet"}</span></p>
      )}
      <div className={styles.head} aria-hidden="true">
        <span>Agent</span><span>Price against the budget</span><span className={styles.num}>Price</span><span className={styles.num}>vs {win ? "winner" : "lowest"}</span>
      </div>
      <div className={styles.rows}>
        {rows.map((b) => {
          const k = b.price ? kindOf(b, job) : null;
          const r = b.price ? ratio(b.price, job.budget) : 0;
          const diff = b.price && ref?.price ? asNumber(b.price, job.token) - refN : null;
          const note = !b.price ? "sealed" : k === "win" ? (isDust(b.price, job.budget) ? "lowest · too small" : "lowest") : k === "over" ? "over budget"
            : k === "dust" ? "too small" : b.bidder === ref?.bidder ? "lowest" : diff !== null ? `+${fmt(diff)}` : "";
          return (
            <div key={b.bidder} className={`${styles.row} ${k === "win" ? styles.rowIsWin : ""}`}>
              <span className={`${styles.rowLabel} ${k === "win" ? styles.rowWin : ""}`}>{b.agent}</span>
              <span className={styles.track}>
                <span className={styles.budgetLine} style={{ left: pos(1) }} aria-hidden="true" />
                {b.price && k ? (
                  <>
                    <span className={`${styles.stem} ${k === "win" ? styles.stemWin : ""}`} style={{ width: pos(r) }} aria-hidden="true" />
                    <span className={`${styles.dot} ${styles[`d_${k}`]}`} style={{ left: pos(r) }} tabIndex={0}
                      data-tip={`${b.agent} · ${amount(b.price, job.token)} · ${(r * 100).toFixed(1)}% of the budget${k === "dust" || isDust(b.price, job.budget) ? " · far below one unit: priced in the wrong decimals" : ""}`} />
                  </>
                ) : (
                  <span className={styles.sealedBar} aria-hidden="true" />
                )}
              </span>
              <span className={`${styles.num} ${styles.price}`}>{b.price ? amount(b.price, job.token) : !live ? (
                <span className={styles.sealedTag} data-tip={`${b.agent} did not reveal before the window closed: its price stays hidden, it cannot win, and its bid bond is forfeit`} tabIndex={0}>not revealed</span>
              ) : (
                <span className={styles.sealedTag} data-tip={`${b.agent} · only a sha256 is on chain until it reveals`} tabIndex={0}>
                  <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="2" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" /></svg>sealed
                </span>
              )}</span>
              <span className={`${styles.num} ${styles.delta} ${k === "win" || note === "lowest" ? styles.deltaWin : ""} ${note.includes("small") ? styles.deltaWarn : ""}`}>{b.price ? note : ""}</span>
            </div>
          );
        })}
        {rows.length === 0 ? <p className="small weak">The first sealed bid shows here as soon as it lands.</p> : null}
      </div>
      <div className={styles.axis} aria-hidden="true">
        <span />
        <span className={styles.axisTrack}>
          {ticks.map((t) => (
            <span key={t} className={`${styles.tick} ${t === 1 ? styles.tickBudget : t === 0.5 ? styles.tickMid : ""}`} style={{ left: pos(t) }}>
              {t === 1 ? `budget ${fmt(budgetN)}` : fmt(budgetN * t)}
            </span>
          ))}
        </span>
        <span /><span />
      </div>
    </div>
  );
}

/** The job page: when each bid was sealed and revealed, against the bidding and reveal windows. */
export function ActivityTimeline({ job, now }: { job: TenderJob; now: number }) {
  const t0 = job.created_at, t1 = job.reveal_ends;
  const span = Math.max(1, t1 - t0);
  const at = (t: number) => `${Math.max(0, Math.min(1, (t - t0) / span)) * 100}%`;
  const nowNs = now * 1e6;
  const live = nowNs < t1;
  const clock = (ns: number) => new Date(ns / 1e6).toISOString().slice(11, 16);
  return (
    <div className={styles.timeline}>
      <div className={styles.tlHead} aria-hidden="true">
        <span className={styles.tlLabel} style={{ left: "0%" }}>Bidding <b>until {clock(job.commit_ends)}</b></span>
        <span className={`${styles.tlLabel} ${styles.tlLabelEnd}`} style={{ left: "100%" }}>Reveal <b>until {clock(t1)}</b></span>
      </div>
      <div className={styles.tlBands} aria-hidden="true">
        <span className={styles.bandBid} style={{ left: "0%", width: at(job.commit_ends) }} />
        <span className={styles.bandReveal} style={{ left: at(job.commit_ends), width: `calc(100% - ${at(job.commit_ends)})` }} />
        {live ? <span className={styles.now} style={{ left: at(nowNs) }} /> : null}
      </div>
      {live ? <div className={styles.tlNow} aria-hidden="true"><span className={styles.nowLabel} style={{ left: at(nowNs) }}>now {clock(nowNs)}</span></div> : null}
      <div className={styles.tlRows}>
        {job.bids.map((b) => (
          <div key={b.bidder} className={styles.tlRow}>
            <span className={styles.rowLabel}>{b.agent}</span>
            <span className={styles.tlTrack}>
              {b.revealed_at ? <span className={`${styles.tlSpan} ${b.bidder === job.winner ? styles.tlSpanWin : ""}`} style={{ left: at(b.committed_at), width: `calc(${at(b.revealed_at)} - ${at(b.committed_at)})` }} aria-hidden="true" /> : null}
              <span className={styles.tlCommit} style={{ left: at(b.committed_at) }} tabIndex={0} data-tip={`${b.agent} · sealed at ${clock(b.committed_at)} UTC`} />
              {b.revealed_at ? <span className={`${styles.tlReveal} ${b.bidder === job.winner ? styles.tlRevealWin : ""}`} style={{ left: at(b.revealed_at) }} tabIndex={0} data-tip={`${b.agent} · revealed at ${clock(b.revealed_at)} UTC`} /> : null}
            </span>
            <span className={styles.tlTimes}>sealed {clock(b.committed_at)}{b.revealed_at ? <> → revealed {clock(b.revealed_at)}</> : " · not revealed"}</span>
          </div>
        ))}
      </div>
      <div className={styles.axis} aria-hidden="true">
        <span className={styles.rowLabel} />
        <span className={styles.axisTrack}>
          <span className={styles.tick} style={{ left: "0%" }}>posted {clock(t0)} UTC</span>
          <span className={`${styles.tick} ${styles.tickEnd}`} style={{ left: "100%" }}>closed {clock(t1)}</span>
        </span>
      </div>
      <p className={styles.legend}>
        <span><i className={styles.lgCommit} />sealed</span>
        <span><i className={styles.lgReveal} />revealed</span>
        <span><i className={styles.lgWin} />winner</span>
      </p>
    </div>
  );
}

/** The jobs list: how busy the board is, one bar per job (bids), newest at the right. */
export function BoardActivity({ jobs }: { jobs: TenderJob[] }) {
  const recent = [...jobs].sort((a, b) => a.id - b.id).slice(-16);
  const maxBids = Math.max(1, ...recent.map((j) => j.bids.length));
  const bids = jobs.reduce((n, j) => n + j.bids.length, 0);
  const agents = new Set(jobs.flatMap((j) => j.bids.map((b) => b.bidder))).size;
  const open = jobs.filter((j) => j.phase === "open" || j.phase === "revealing").length;
  const linked = jobs.filter((j) => j.agreement).length;
  return (
    <div className={styles.board}>
      <dl className={styles.stats}>
        <div><dt>Jobs</dt><dd>{jobs.length}</dd></div>
        <div><dt>Sealed bids</dt><dd>{bids}</dd></div>
        <div><dt>Agents</dt><dd>{agents}</dd></div>
        <div><dt>Taking bids</dt><dd>{open}</dd></div>
        <div><dt>Agreements</dt><dd>{linked}</dd></div>
      </dl>
      <div className={styles.barsWrap}>
      <span className={styles.barsCaption}>Bids per job <i className={styles.lgLive} /> taking bids <i className={styles.lgLinked} /> agreement</span>
      <div className={styles.bars} role="img" aria-label={`Bids per job for the last ${recent.length} jobs`}>
        {recent.map((j) => (
          <Link key={j.id} href={`/tenders/${j.id}`} className={styles.barCol} data-tip={`#${j.id} · ${j.bids.length} bids · ${j.phase.replace("_", " ")}`}>
            <span className={styles.barCount}>{j.bids.length}</span>
            <span className={`${styles.bar} ${j.phase === "open" || j.phase === "revealing" ? styles.barLive : j.agreement ? styles.barLinked : ""}`} style={{ height: `${Math.round(6 + 30 * (j.bids.length / maxBids))}px` }} />
            <span className={styles.barId}>{j.id}</span>
          </Link>
        ))}
      </div>
      </div>
    </div>
  );
}
