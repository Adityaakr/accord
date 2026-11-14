"use client";

// After the award, before the agreement: who moves next, and the buyer's one button.
//
// - The winning agent accepts by running `accord tender work <job>` (or `bid --wait`): it names its approver and payee,
//   both keys it holds, and the app funds them for gas. Until then the buyer waits, and this panel says so.
// - The buyer then opens the agreement: one wallet signature creates a procurement agreement with the winner's key as
//   vendor and its approver as vendor authority, a second links it on the board (which checks it with the factory).
//   The deal room takes over from there; the winning agent seals, approves, proves its payee, delivers and is paid.
//   On a house job the buyer is the keeper (services/agent/src/tenderdeal.ts), which opens the agreement itself.
// - A winner that bid from this browser does the job on this page (WinnerWork.tsx); an agent elsewhere uses the CLI.
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

export function WinnerPanel({ board, job, setup, house = false }: { board: string; job: TenderJob; setup: WinnerSetup | null; house?: boolean }) {
  const w = useWallet();
  const cfg = useAppConfig();
  const router = useRouter();
  const [mine, setMine] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setMine(!!job.winner && browserKey()?.id === job.winner); }, [job.winner]);
  const isBuyer = !!w.accountId && w.accountId === job.buyer;

  // The agreement made by an earlier click whose link did not go through: retried by linking only, never created twice.
  const madeKey = `accord.tender.made.${board}.${job.id}`;
  const [made, setMade] = useState<string | null>(null);
  useEffect(() => { try { setMade(localStorage.getItem(madeKey)); } catch { /* storage blocked */ } }, [madeKey]);

  async function open() {
    if (!w.signer || !setup || !job.winner) return;
    setError(null);
    try {
      const reader = browserAccord(cfg);
      // the agreement must come from the factory the board checks links against
      const factory = await reader.chain.view<string>(board, "get_factory", {});
      const accord = browserAccord(cfg, { factory, signer: w.signer });
      let agreement = made;
      if (!agreement) {
        setBusy("Creating the agreement: sign in your wallet");
        agreement = (await accord.createAgreement({
          kind: "procurement", title: `Tender ${job.id}: ${job.title}`.slice(0, 120), vendor: job.winner, vendor_authority: setup.authority,
          canaries: [], params: DEMO_PARAMS,
        })).agreement;
        setMade(agreement);
        try { localStorage.setItem(madeKey, agreement); } catch { /* storage blocked: a retry would create again */ }
      }
      setBusy(`Linking ${agreement} to the job: sign once more`);
      const n = Number(agreement.slice(1, agreement.indexOf(".")));
      const r = await new TenderBoardClient(accord.chain, board).link(w.signer, job.id, n);
      // the board answers with the linked account, or nothing when its factory check refused the agreement
      if (!r.ok || typeof r.value !== "string" || !r.value) throw new Error(`the board did not link ${agreement}${r.failure ? `: ${r.failure}` : ""}. Try linking again.`);
      try { localStorage.removeItem(madeKey); } catch { /* */ }
      router.push(`/agreements/${agreement}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
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
          <span className="small">A procurement agreement with the winner&apos;s key as vendor, linked to this job. The board checks it with the factory.{house ? " This is a house job: its buyer is the keeper, which opens the agreement by itself about a minute after the winner accepts." : ""}</span>
        </li>
        <li>
          <span className={styles.stepTitle}>The deal</span>
          <span className="small">Both seal their mandates (the winner&apos;s floor is its price), the Sealed Table settles the terms, both approve, the buyer funds. The agent delivers its work and is paid; a payment anywhere else is refused.</span>
        </li>
      </ol>

      {house ? (
        setup ? <p className="small" role="status">The house buyer is opening the agreement. This page shows it when it is linked.</p> : null
      ) : isBuyer && setup ? (
        <div className={styles.award}>
          <button type="button" className={styles.button} onClick={() => void open()} disabled={!!busy || !w.signer} aria-busy={!!busy}>
            {busy ?? (made ? `Link ${made} to this job` : "Open the agreement with the winner")}
          </button>
          <p className="small">Two wallet signatures. The creation deposit is the factory&apos;s; nothing is funded yet.</p>
        </div>
      ) : isBuyer ? (
        <p className="small">You posted this job. The button to open the agreement appears here once the winner accepts.</p>
      ) : !w.accountId && setup ? (
        <p className="small">The buyer, <span className="mono">{job.buyer}</span>, signs in here to open the agreement.</p>
      ) : null}
      {error ? <p className={`small ${styles.bad}`} role="alert">{error}</p> : null}

      {!setup && !mine ? <Command caption="If your agent won (CLI)" text={workCmd(job.id)} /> : null}
    </div>
  );
}
