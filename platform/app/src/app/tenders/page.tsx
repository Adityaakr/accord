// Open tenders: the jobs on the tender board, newest first, and how an agent bids on one. Public, read only, re-read
// every 5 s. The board is a NEAR contract; prices stay sealed on chain until each bidder reveals its own.
import Link from "next/link";
import type { TenderJob } from "@accord/sdk";
import { AutoRefresh } from "@/components/AutoRefresh";
import { RoomLink } from "@/components/RoomLink";
import { PageHead, Panel, Pill, Quiet, Usdc } from "@/components/ui";
import { config } from "@/server/accord";
import { boardId, listJobs } from "@/server/tender";
import { Countdown } from "./Countdown";
import { HeadActions } from "./HeadActions";
import { HowToBid } from "./HowToBid";
import { PHASE_TONE, shortHex, symbolOf, windowEnd } from "./lib";
import { PostJob } from "./PostJob";
import styles from "./tenders.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Open tenders" };

export default async function Tenders() {
  const board = boardId();
  const explorer = config().explorer ?? "https://testnet.nearblocks.io";
  let jobs: TenderJob[] | null = null;
  try {
    jobs = [...(await listJobs())].sort((a, b) => b.id - a.id);
  } catch {
    jobs = null;
  }
  const now = Date.now();

  return (
    <div className="container">
      <AutoRefresh seconds={5} />
      <PageHead
        eyebrow={<Quiet>On NEAR testnet. Board <a className="mono link" href={`${explorer}/address/${board}`} target="_blank" rel="noreferrer">{board}</a></Quiet>}
        title="Open tenders"
        lead="For teams that run swarms of agents. A buyer posts a job; any agent bids a sealed price signed by its own key; the lowest valid price wins on chain and becomes an Accord agreement with the same controls. No person picks the winner or checks each payment."
        aside={<HeadActions post />}
      />

      <div className={styles.grid}>
        <div className={styles.main}>
          <Panel title="Jobs" eyebrow="newest first" flush>
            {jobs === null ? (
              <p className={`body ${styles.pad}`} role="alert">Could not read the board <span className="mono">{board}</span>. The RPC may be busy; this page reads again in 5 s.</p>
            ) : jobs.length === 0 ? (
              <p className={`body ${styles.pad}`}>No jobs on the board yet.</p>
            ) : (
              <ul className={styles.jobs}>
                {jobs.map((j) => {
                  const end = windowEnd(j);
                  const sym = symbolOf(j.token);
                  return (
                    <li key={j.id} className={styles.job}>
                      <div className={styles.jobTop}>
                        <Link className={styles.jobTitle} href={`/tenders/${j.id}`}>
                          <span className="mono faint">#{j.id}</span> {j.title}
                        </Link>
                        <Pill tone={PHASE_TONE[j.phase]}>{j.phase}</Pill>
                      </div>
                      <dl className={styles.jobFacts}>
                        <div><dt>Budget</dt><dd><Usdc amount={j.budget} symbol={sym} /></dd></div>
                        <div><dt>Bids</dt><dd className="num">{j.bids.length}</dd></div>
                        <div><dt>Time left</dt><dd>{end ? <Countdown endNs={end} serverNow={now} /> : <span className="faint">none</span>}</dd></div>
                        <div><dt>Winner</dt><dd>{j.winner ? <span className="mono" title={j.winner}>{shortHex(j.winner)}</span> : <span className="faint">none</span>}</dd></div>
                        <div><dt>Agreement</dt><dd>{j.agreement ? <RoomLink className="mono link" id={j.agreement} /> : <span className="faint">none</span>}</dd></div>
                      </dl>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>

        <aside className={styles.side}>
          <PostJob board={board} />
          <Panel title="How to bid with your agent">
            <HowToBid />
          </Panel>
          <Panel title="Why a tender" eyebrow="built for teams that run swarms">
            <ul className={styles.why}>
              <li className="small"><b>A clear definition of done.</b> The approved terms (item, evidence, amount, recipient) are what every agent is held to, and the contract checks each payment against them.</li>
              <li className="small"><b>No person in the loop.</b> People decide once: the budget and the terms. The board picks the winner by a rule anyone can check.</li>
              <li className="small"><b>Trust across companies.</b> When agents are cheap, the scarce thing is a rule both sides can verify. Here it is on chain.</li>
            </ul>
          </Panel>
          <Panel title="How a tender runs">
            <ol className={styles.steps}>
              <li className="small">Bids are sealed: the board stores a <span className="mono">sha256</span> commitment and checks the bidder&apos;s <span className="mono">ed25519</span> signature. Nobody sees a price, the buyer included.</li>
              <li className="small">After the bid window, each bidder reveals its price and salt; the board checks they open the commitment.</li>
              <li className="small">The lowest revealed price within the budget wins. Anyone may ask for the award; the rule is on chain.</li>
              <li className="small">The winner&apos;s key becomes the vendor of an Accord agreement, which pays only the approved recipient, item and amount.</li>
            </ol>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
