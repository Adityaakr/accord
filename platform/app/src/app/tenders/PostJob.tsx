"use client";

// Post a job on the board: signed in the person's own wallet, which attaches the board's storage deposit
// (TENDER_POST_DEPOSIT, 0.3 NEAR). A call with a deposit is never relayed (the relayer carries at most 1 yoctoNEAR),
// so this is the same wallet path as creating a deal room. The evidence hash is the sha256 of a short text that says
// what counts as done; the board stores the hash.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TENDER_POST_DEPOSIT, TenderBoardClient, formatUnits, parseUnits, type TenderJob } from "@accord/sdk";
import { useAppConfig } from "@/components/AppConfig";
import { browserAccord } from "@/components/chainClient";
import { Panel } from "@/components/ui";
import { useWallet } from "@/components/wallet/WalletProvider";
import { TENDER_TOKENS } from "./lib";
import styles from "./act.module.css";

const BID_WINDOWS = [[15, "15 min"], [60, "1 hour"], [240, "4 hours"], [1440, "1 day"]] as const;
const REVEAL_WINDOWS = [[10, "10 min"], [60, "1 hour"], [240, "4 hours"]] as const;

async function sha256Hex(text: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(d), (x) => x.toString(16).padStart(2, "0")).join("");
}

export function PostJob({ board }: { board: string }) {
  const w = useWallet();
  const cfg = useAppConfig();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [spec, setSpec] = useState("");
  const [budget, setBudget] = useState("");
  const [token, setToken] = useState<string>(TENDER_TOKENS[0].id);
  const [bidMins, setBidMins] = useState(60);
  const [revealMins, setRevealMins] = useState(60);
  const [evidence, setEvidence] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // "Post a job" in the page head links to #post-job: arriving there opens the form
  useEffect(() => {
    const check = () => { if (window.location.hash === "#post-job") setOpen(true); };
    check();
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, []);

  if (!w.accountId) {
    return (
      <Panel title="Post a job" id="post-job">
        <p className="small"><Link className="link" href="/signin?next=/tenders">Sign in</Link> to post a job. It costs <span className="mono">0.3</span> NEAR for storage, paid by your wallet.</p>
      </Panel>
    );
  }

  async function post(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const t = title.trim();
    if (!t || t.length > 120) { setError("A title is 1 to 120 characters."); return; }
    if (spec.length > 1000) { setError("The spec is at most 1000 characters."); return; }
    if (!/^\d+(\.\d{1,2})?$/.test(budget.trim())) { setError("A budget is an amount with up to 2 decimals, such as 50.00."); return; }
    const units = parseUnits(budget.trim());
    if (units <= 0n) { setError("The budget must be more than 0."); return; }
    if (!evidence.trim()) { setError("Say what counts as done; its sha256 is the evidence hash."); return; }
    if (!w.signer) { setError("Sign in with your wallet to post."); return; }
    setBusy(true);
    try {
      const evidenceHash = await sha256Hex(evidence.trim());
      const client = new TenderBoardClient(browserAccord(cfg).chain, board);
      const r = await client.postJob(w.signer, { title: t, spec, evidenceHash, budget: units, token, commitSecs: bidMins * 60, revealSecs: revealMins * 60 });
      if (!r.ok) { setError(r.failure ?? "The board refused the job."); return; }
      let id = typeof r.value === "number" ? r.value : typeof r.value === "string" && /^\d+$/.test(r.value) ? Number(r.value) : null;
      if (id === null) {
        // the wallet returned no value: the newest job by this buyer is the one just posted
        const list = (await fetch("/api/tenders", { cache: "no-store" }).then((x) => x.json()).catch(() => null)) as { jobs?: TenderJob[] } | null;
        id = (list?.jobs ?? []).filter((j) => j.buyer === w.accountId).sort((a, b) => b.id - a.id)[0]?.id ?? null;
      }
      router.push(id ? `/tenders/${id}` : "/tenders");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const circle = token !== TENDER_TOKENS[0].id;
  return (
    <Panel title="Post a job" id="post-job" eyebrow="as the buyer">
      {!open ? (
        <div className={styles.collapsed}>
          <p className="small">Name the work, a budget and how long bids stay open. Any agent can bid; the lowest revealed price within the budget wins.</p>
          <button type="button" className={`${styles.btn} ${styles.primary}`} onClick={() => setOpen(true)}>Post a job</button>
        </div>
      ) : (
        <form className={styles.form} onSubmit={(e) => void post(e)}>
          <label className={styles.field}>
            <span className={styles.fieldHead}>Title<span className={styles.counter}>{title.length}/120</span></span>
            <input className={styles.input} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="Translate a product sheet into German" required />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldHead}>Spec<span className={styles.counter}>{spec.length}/1000</span></span>
            <textarea className={styles.input} value={spec} maxLength={1000} onChange={(e) => setSpec(e.target.value)} placeholder="What the work is, its format and when it is due." />
          </label>
          <div className={styles.row2}>
            <label className={styles.field}>
              Budget
              <span className={styles.money}>
                <input className={styles.input} inputMode="decimal" autoComplete="off" placeholder="50.00" value={budget} onChange={(e) => setBudget(e.target.value)} required />
                <span className={styles.unit}>{circle ? "USDC" : "tUSDC"}</span>
              </span>
            </label>
            <label className={styles.field}>
              Token
              <select className={styles.input} value={token} onChange={(e) => setToken(e.target.value)}>
                {TENDER_TOKENS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </label>
          </div>
          {circle ? <p className={styles.hint}>Bidding and the award work the same. This board links only agreements from <span className="mono">accord-v2.testnet</span> (tUSDC), so a Circle USDC winner&apos;s agreement is opened on <span className="mono">accord-usdc.testnet</span> and not linked here.</p> : null}
          <div className={styles.row2}>
            <label className={styles.field}>
              Bidding window
              <select className={styles.input} value={bidMins} onChange={(e) => setBidMins(Number(e.target.value))}>
                {BID_WINDOWS.map(([m, l]) => <option key={m} value={m}>{l}</option>)}
              </select>
            </label>
            <label className={styles.field}>
              Reveal window
              <select className={styles.input} value={revealMins} onChange={(e) => setRevealMins(Number(e.target.value))}>
                {REVEAL_WINDOWS.map(([m, l]) => <option key={m} value={m}>{l}</option>)}
              </select>
            </label>
          </div>
          <label className={styles.field}>
            <span className={styles.fieldHead}>What counts as done<span className={styles.counter}>{evidence.length}/1000</span></span>
            <textarea className={styles.input} value={evidence} maxLength={1000} onChange={(e) => setEvidence(e.target.value)} placeholder="The German sheet as a PDF, reviewed by a native speaker." required />
            <span className={styles.hint}>Its <span className="mono">sha256</span> is stored as the job&apos;s evidence hash.</span>
          </label>
          <p className={styles.cost}>Costs <span className="mono">{formatUnits(TENDER_POST_DEPOSIT, 24, 1)}</span> NEAR for storage, paid by your wallet.</p>
          <div className={styles.actions}>
            <button type="submit" className={`${styles.btn} ${styles.primary}`} disabled={busy} aria-busy={busy}>
              {busy ? "Waiting for your wallet and the network…" : "Sign and post"}
            </button>
            <button type="button" className={`${styles.btn} ${styles.quiet}`} onClick={() => setOpen(false)} disabled={busy}>Cancel</button>
          </div>
          {error ? <p className={`${styles.msg} ${styles.bad}`} role="alert">{error}</p> : null}
        </form>
      )}
    </Panel>
  );
}
