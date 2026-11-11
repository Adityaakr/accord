"use client";

// Post a job on the board: signed in the person's own wallet, which attaches the board's storage deposit
// (TENDER_POST_DEPOSIT, 0.3 NEAR). A call with a deposit is never relayed (the relayer carries at most 1 yoctoNEAR),
// so this is the same wallet path as creating a deal room. The evidence hash is the sha256 of a short text that says
// what counts as done; the board stores the hash. The budget is parsed in the chosen token's own decimals.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  TENDER_POST_DEPOSIT, TENDER_TOKENS, TenderBoardClient, formatUnits, parseTenderAmount, type TenderJob,
} from "@accord/sdk";
import { useAppConfig } from "@/components/AppConfig";
import { browserAccord } from "@/components/chainClient";
import { SignInCard } from "@/components/SignInCard";
import { Stage } from "@/components/Stage";
import { useWallet } from "@/components/wallet/WalletProvider";
import f from "../../agreements/new/flow.module.css";
import styles from "../act.module.css";

const BID_WINDOWS = [["15", "15 min"], ["60", "1 h"], ["240", "4 h"], ["1440", "1 day"]] as const;
const REVEAL_WINDOWS = [["10", "10 min"], ["60", "1 h"], ["240", "4 h"]] as const;
const TOKEN_CHOICE: Record<string, string> = {
  "tusdc.accord-v1.testnet": "Test USDC",
  "wrap.testnet": "NEAR",
};
const tokenChoice = (id: string, symbol: string) => TOKEN_CHOICE[id] ?? (symbol === "USDC" ? "Circle USDC" : symbol);

async function sha256Hex(text: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(d), (x) => x.toString(16).padStart(2, "0")).join("");
}

const two = (n: number) => String(n).padStart(2, "0");

function Group({ label, note, children }: { label: ReactNode; note?: ReactNode; children: ReactNode }) {
  return (
    <div className={f.group}>
      <div className={f.groupLabel}><span className={f.groupName}>{label}</span></div>
      {note ? <p className={f.note}>{note}</p> : null}
      <div className={f.rows}>{children}</div>
    </div>
  );
}

function Row({ n, label, id, labelId, hint, end, text, children }: {
  n: number; label: string; id?: string; labelId?: string; hint?: ReactNode; end?: boolean; text?: boolean; children: ReactNode;
}) {
  return (
    <div className={`${f.row} ${text ? f.rowText : ""}`}>
      <span className={`mono ${f.num}`}>{two(n)}</span>
      {id ? <label htmlFor={id} className={f.name}>{label}</label> : <span id={labelId} className={f.name}>{label}</span>}
      <div className={`${f.control} ${end ? f.controlEnd : ""}`}>
        {children}
        {hint ? <span className={f.hint}>{hint}</span> : null}
      </div>
    </div>
  );
}

function Choices({ labelledBy, value, options, onChange }: {
  labelledBy: string; value: string; options: readonly (readonly [string, string])[]; onChange: (v: string) => void;
}) {
  return (
    <div className={f.choices} role="radiogroup" aria-labelledby={labelledBy}>
      {options.map(([id, label]) => (
        <button key={id} type="button" role="radio" aria-checked={value === id}
          className={`${f.choice} ${value === id ? f.choiceOn : ""}`} onClick={() => onChange(id)}>
          <span className={f.dotMark} aria-hidden="true" />{label}
        </button>
      ))}
    </div>
  );
}

export function PostJobFlow({ board }: { board: string }) {
  const w = useWallet();
  const cfg = useAppConfig();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [spec, setSpec] = useState("");
  const [evidence, setEvidence] = useState("");
  const [hash, setHash] = useState<string | null>(null);
  const [token, setToken] = useState<string>(TENDER_TOKENS[0]!.id);
  const [budget, setBudget] = useState("");
  const [bidMins, setBidMins] = useState("60");
  const [revealMins, setRevealMins] = useState("60");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = evidence.trim();
    if (!t) { setHash(null); return; }
    let live = true;
    void sha256Hex(t).then((h) => { if (live) setHash(h); }).catch(() => undefined);
    return () => { live = false; };
  }, [evidence]);

  const tok = TENDER_TOKENS.find((t) => t.id === token) ?? TENDER_TOKENS[0]!;

  if (w.restoring) return <div className={f.col}><div className={styles.loading} aria-busy="true" /></div>;
  if (!w.accountId) {
    return (
      <div className={styles.gate}>
        <Stage><SignInCard title="Sign in to post a job" /></Stage>
      </div>
    );
  }

  function fillSample() {
    setTitle("Translate a product sheet into German");
    setSpec("Two pages, about 900 words, from English into German. Keep the layout and the product names. Due within 48 hours of the award.");
    setEvidence("The German product sheet as a PDF, reviewed by a native speaker, with the source and target word counts.");
    setBudget(tok.decimals > 6 ? "12.50" : "50.00");
    setBidMins("60");
    setRevealMins("60");
  }

  async function post() {
    setError(null);
    const t = title.trim();
    if (!t || t.length > 120) { setError("A title is 1 to 120 characters."); return; }
    if (spec.length > 1000) { setError("What's needed is at most 1000 characters."); return; }
    if (!evidence.trim()) { setError("Say what counts as done; its sha256 is the evidence hash."); return; }
    let units: bigint;
    try {
      units = parseTenderAmount(budget, token);
    } catch {
      setError("A budget is an amount like 50.00, with up to 6 decimals.");
      return;
    }
    if (units <= 0n) { setError("The budget must be more than 0."); return; }
    if (!w.signer || !w.accountId) { setError("Sign in with your wallet to post."); return; }
    setBusy(true);
    try {
      const evidenceHash = await sha256Hex(evidence.trim());
      const client = new TenderBoardClient(browserAccord(cfg).chain, board);
      const r = await client.postJob(w.signer, { title: t, spec, evidenceHash, budget: units, token, commitSecs: Number(bidMins) * 60, revealSecs: Number(revealMins) * 60 });
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

  return (
    <form className={f.flow} onSubmit={(e) => { e.preventDefault(); void post(); }}>
      <section aria-labelledby="t-job" className={f.col}>
        <div className={f.head}>
          <h2 id="t-job" className={f.h}>Write the job</h2>
          <p className={f.lead}>What the work is, what counts as done, and what you will pay at most.</p>
          <button type="button" className={f.quiet} onClick={fillSample}>Fill with an example</button>
        </div>

        <Group label="The job">
          <Row n={1} label="Title" id="j-title">
            <div className={f.box}>
              <input id="j-title" className={f.input} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120}
                placeholder="Translate a product sheet into German" required autoComplete="off" />
            </div>
          </Row>
          <Row n={2} label="What's needed" id="j-spec" text>
            <div className={f.box}>
              <textarea id="j-spec" className={`${f.input} ${f.textarea}`} value={spec} onChange={(e) => setSpec(e.target.value)} maxLength={1000} rows={3}
                placeholder="What the work is, its format and when it is due." />
            </div>
          </Row>
          <Row n={3} label="What counts as done" id="j-done" text hint="Its sha256 is stored on the board as the job's evidence hash.">
            <div className={`${f.box} ${styles.boxTop}`}>
              <textarea id="j-done" className={`${f.input} ${f.textarea}`} value={evidence} onChange={(e) => setEvidence(e.target.value)} maxLength={1000} rows={3}
                placeholder="The German sheet as a PDF, reviewed by a native speaker." required />
              <span className={f.unit} title={hash ?? undefined}>{hash ? `${hash.slice(0, 8)}…` : "sha256"}</span>
            </div>
          </Row>
        </Group>

        <Group label="Budget and timing">
          <Row n={4} label="Pay in" labelId="j-token"
            hint={tok.links ? undefined : "This board links only tUSDC agreements; for Circle USDC or NEAR the award is on chain and the agreement is opened separately."}>
            <Choices labelledBy="j-token" value={token} options={TENDER_TOKENS.map((t) => [t.id, tokenChoice(t.id, t.symbol)] as const)} onChange={setToken} />
          </Row>
          <Row n={5} label="Budget" id="j-budget" end>
            <div className={`${f.box} ${f.boxShort}`}>
              <input id="j-budget" className={`${f.input} ${f.mono} ${f.right}`} inputMode="decimal" autoComplete="off" placeholder={tok.decimals > 6 ? "12.50" : "50.00"}
                value={budget} onChange={(e) => setBudget(e.target.value)} required />
              <span className={f.unit}>{tok.symbol}</span>
            </div>
          </Row>
          <Row n={6} label="Bidding window" labelId="j-bid">
            <Choices labelledBy="j-bid" value={bidMins} options={BID_WINDOWS} onChange={setBidMins} />
          </Row>
          <Row n={7} label="Reveal window" labelId="j-reveal">
            <Choices labelledBy="j-reveal" value={revealMins} options={REVEAL_WINDOWS} onChange={setRevealMins} />
          </Row>
        </Group>
      </section>

      <div className={f.foot}>
        {error ? <p className={f.error} role="alert">{error}</p> : null}
        <p className={f.sign}>Costs <span className="mono">{formatUnits(TENDER_POST_DEPOSIT, 24, 1)}</span> NEAR for storage, paid by your wallet.</p>
        <div className={f.buttons}>
          <Link href="/tenders" className={f.back}>Back</Link>
          <button type="submit" className={f.primary} disabled={busy} aria-busy={busy}>
            {busy ? <><span className={f.spinner} aria-hidden="true" />Waiting for your wallet…</> : "Sign and post"}
          </button>
        </div>
      </div>
    </form>
  );
}
