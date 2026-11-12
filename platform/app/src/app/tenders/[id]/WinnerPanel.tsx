"use client";

// After the award, before the agreement: who moves next, and the buyer's one button.
//
// - The winning agent accepts by running `accord tender work <job>` (or `bid --wait`): it names its approver and payee,
//   both keys it holds, and the app funds them for gas. Until then the buyer waits, and this panel says so.
// - The buyer then opens the agreement: one wallet signature creates a procurement agreement with the winner's key as
//   vendor and its approver as vendor authority, a second links it on the board (which checks it with the factory).
//   The deal room takes over from there; the winning agent seals, approves, proves its payee, delivers and is paid.
// - A winner that bid from this browser downloads its key to finish the job from the CLI.
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DEMO_PARAMS, TenderBoardClient, type TenderJob } from "@accord/sdk";
import { useAppConfig } from "@/components/AppConfig";
import { browserAccord } from "@/components/chainClient";
import { useWallet } from "@/components/wallet/WalletProvider";
import type { WinnerSetup } from "@/server/tenderwork";
import { browserKey } from "../browserKey";
import { Command } from "../Command";
import { shortHex } from "../lib";
import styles from "./job.module.css";

const workCmd = (job: number) => `accord tender work ${job} --deliver "./do-the-job.sh"`;

export function WinnerPanel({ board, job, setup }: { board: string; job: TenderJob; setup: WinnerSetup | null }) {
  const w = useWallet();
  const cfg = useAppConfig();
  const router = useRouter();
  const [mine, setMine] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setMine(!!job.winner && browserKey()?.id === job.winner); }, [job.winner]);
  const isBuyer = !!w.accountId && w.accountId === job.buyer;

  async function open() {
    if (!w.signer || !setup || !job.winner) return;
    setError(null);
    try {
      setBusy("Creating the agreement: sign in your wallet");
      const accord = browserAccord(cfg, { signer: w.signer });
      const { agreement } = await accord.createAgreement({
        kind: "procurement", title: `Tender ${job.id}: ${job.title}`.slice(0, 120), vendor: job.winner, vendor_authority: setup.authority,
        canaries: [], params: DEMO_PARAMS,
      });
      setBusy("Linking it to the job: sign once more");
      const n = Number(agreement.slice(1, agreement.indexOf(".")));
      const r = await new TenderBoardClient(accord.chain, board).link(w.signer, job.id, n);
      if (!r.ok) throw new Error(`the board did not link ${agreement}: ${r.failure ?? "refused"}. Link it again from this page.`);
      router.push(`/agreements/${agreement}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }

  function downloadKey() {
    const k = browserKey();
    if (!k) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify({ seed: k.seed, id: k.id }, null, 2)], { type: "application/json" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `accord-bidder-${k.id.slice(0, 8)}.json` });
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={styles.next}>
      <ol className={styles.nextSteps}>
        <li className={setup ? styles.stepDone : styles.stepNow}>
          <span className={styles.stepTitle}>The winner accepts</span>
          <span className="small">
            {setup
              ? <>Accepted: approver <span className="mono">{shortHex(setup.authority)}</span>, paid to <span className="mono">{shortHex(setup.recipient)}</span>{setup.funded ? ", funded for gas" : ""}.</>
              : <>The winning agent runs <span className="mono">accord tender work {job.id}</span>. This page updates when it does.</>}
          </span>
        </li>
        <li className={setup ? styles.stepNow : undefined}>
          <span className={styles.stepTitle}>The buyer opens the agreement</span>
          <span className="small">A procurement agreement with the winner&apos;s key as vendor, linked to this job. The board checks it with the factory.</span>
        </li>
        <li>
          <span className={styles.stepTitle}>The deal</span>
          <span className="small">Both seal their mandates (the winner&apos;s floor is its price), the Sealed Table settles the terms, both approve, the buyer funds. The agent delivers its work and is paid; a payment anywhere else is refused.</span>
        </li>
      </ol>

      {isBuyer && setup ? (
        <div className={styles.award}>
          <button type="button" className={styles.button} onClick={() => void open()} disabled={!!busy || !w.signer} aria-busy={!!busy}>
            {busy ?? "Open the agreement with the winner"}
          </button>
          <p className="small">Two wallet signatures. The creation deposit is the factory&apos;s; nothing is funded yet.</p>
        </div>
      ) : isBuyer ? (
        <p className="small">You posted this job. The button to open the agreement appears here once the winner accepts.</p>
      ) : !w.accountId && setup ? (
        <p className="small">The buyer, <span className="mono">{job.buyer}</span>, signs in here to open the agreement.</p>
      ) : null}
      {error ? <p className={`small ${styles.bad}`} role="alert">{error}</p> : null}

      {mine && !setup ? (
        <div className={styles.mine}>
          <p className="small"><b>This browser&apos;s key won.</b> Download it, then run the job from a terminal with the CLI. Your agent does the rest: it accepts, waits for the agreement, delivers what your command prints and is paid.</p>
          <div className={styles.award}>
            <button type="button" className={styles.button} onClick={downloadKey}>Download this browser&apos;s key</button>
          </div>
          <Command caption="Then, from a clone of the repository" text={`accord tender work ${job.id} --key ~/Downloads/accord-bidder-${job.winner!.slice(0, 8)}.json --deliver "./do-the-job.sh"`} />
        </div>
      ) : !setup ? (
        <Command caption="If your agent won" text={workCmd(job.id)} />
      ) : null}
    </div>
  );
}
