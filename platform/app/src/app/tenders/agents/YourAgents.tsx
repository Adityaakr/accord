"use client";

// Your agents: the tender bidder keys linked to the signed-in account, each with what the board says it did. A key
// is linked only with its own signature over "accord-tender:v1:link:<account>", so nobody can put an agent on
// someone else's list. Reading and linking use the app session ("Confirm it's you"); nothing here signs a
// transaction or can move funds.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { TenderJob } from "@accord/sdk";
import { ConfirmYou } from "@/components/org/ConfirmYou";
import { useOrg } from "@/components/org/OrgProvider";
import { RoomLink } from "@/components/RoomLink";
import { SignInCard } from "@/components/SignInCard";
import { Stage } from "@/components/Stage";
import { PageHead, Panel, Pill, Quiet, Usdc, type Tone } from "@/components/ui";
import { onVisibleInterval } from "@/components/visible";
import { useWallet } from "@/components/wallet/WalletProvider";
import type { AgentView } from "@/server/tenderagents";
import { browserKey, ensureBrowserKey, linkBrowserKey } from "../browserKey";
import { Command } from "../Command";
import { PHASE_TONE, linkCli, linkScript, shortHex, symbolOf } from "../lib";
import styles from "../act.module.css";

export interface LinkParams { bidder: string; sig: string; label: string; source: string }
type Data = { account: string; agents: AgentView[] };

const SOURCE_TONE: Record<string, Tone> = { browser: "teal", script: "neutral", cli: "neutral", mcp: "purple" };
const LEAD = "The agents that bid on open tenders for you. Each one is a key that signed to say you run it; the board decides every bid and award, and this page shows what it decided.";

export function YourAgents({ link }: { link: LinkParams | null }) {
  const w = useWallet();
  const o = useOrg();
  const head = (
    <PageHead
      eyebrow={<Quiet><Link className="link" href="/tenders">Open tenders</Link>{w.accountId ? <> · signed in as <span className="mono">{w.accountId}</span></> : null}</Quiet>}
      title="Your agents"
      lead={LEAD}
    />
  );

  if (w.restoring || (w.accountId && o.checking)) {
    return <div className="container">{head}<div className={styles.loading} aria-busy="true" /></div>;
  }
  if (!w.accountId) {
    return (
      <div className="container">
        {head}
        {link ? <p className={`${styles.note} ${styles.gap}`}>Sign in as the account this link was made for, and it will ask you to link agent <span className="mono">{link.label || shortHex(link.bidder)}</span>.</p> : null}
        <Stage><SignInCard title="Sign in to see your agents" /></Stage>
      </div>
    );
  }
  if (o.session !== w.accountId) {
    return (
      <div className="container">
        {head}
        <Stage><ConfirmYou why="Your agents are saved for your account." /></Stage>
      </div>
    );
  }
  return <Signed account={w.accountId} link={link} head={head} />;
}

function Signed({ account, link, head }: { account: string; link: LinkParams | null; head: React.ReactNode }) {
  const router = useRouter();
  const reloadOrg = useOrg().reload;
  const [data, setData] = useState<Data | null>(null);
  const [tokens, setTokens] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((x) => x + 1), []);

  useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        const r = await fetch("/api/tenders/agents", { cache: "no-store" });
        const b = (await r.json().catch(() => ({}))) as Data & { error?: string };
        if (r.status === 401) { void reloadOrg(); return; }
        if (!r.ok) throw new Error(b.error ?? `HTTP ${r.status}`);
        if (live) { setData(b); setError(null); }
        // each job's token, for the amounts' symbol; the bid list carries only base units
        const jobs = (await fetch("/api/tenders", { cache: "no-store" }).then((x) => x.json()).catch(() => null)) as { jobs?: TenderJob[] } | null;
        if (live && jobs?.jobs) setTokens(Object.fromEntries(jobs.jobs.map((j) => [j.id, j.token])));
      } catch (e) {
        if (live) setError((e as Error).message);
      }
    };
    void load();
    const stop = onVisibleInterval(() => void load(), 15000);
    return () => { live = false; stop(); };
  }, [tick, reloadOrg]);

  const agents = data?.agents ?? [];
  const sym = (job: number) => (tokens[job] ? symbolOf(tokens[job]!) : "USDC");

  return (
    <div className="container">
      {head}
      <div className={styles.page}>
        {link ? <LinkCard account={account} link={link} onDone={() => { router.replace("/tenders/agents"); reload(); }} /> : null}
        {error ? <p className={`${styles.msg} ${styles.bad}`} role="alert">Could not read your agents: {error}</p> : null}
        <div className={styles.grid}>
          <div className={styles.main}>
            <Panel title="Linked agents" eyebrow={data ? `${agents.length} linked` : undefined} flush>
              {!data && !error ? (
                <div className={styles.empty}><div className={styles.loading} style={{ width: "100%" }} aria-busy="true" /></div>
              ) : agents.length === 0 ? (
                <div className={styles.empty}>
                  <p className="h5">No agents linked yet</p>
                  <p className="small">Bid from this browser, or link an agent that runs elsewhere. Its bids and wins then show here.</p>
                </div>
              ) : (
                <ul className={styles.agents}>
                  {agents.map((a) => <AgentCard key={a.bidder} a={a} sym={sym} onUnlinked={reload} />)}
                </ul>
              )}
            </Panel>
          </div>
          <aside className={styles.side}>
            <AddAgent account={account} linked={agents.map((a) => a.bidder)} onLinked={reload} />
          </aside>
        </div>
      </div>
    </div>
  );
}

function LinkCard({ account, link, onDone }: { account: string; link: LinkParams; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const name = link.label || `agent ${link.bidder.slice(0, 6)}`;
  async function confirm() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/tenders/agents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ bidder: link.bidder, label: link.label || undefined, signature: link.sig, source: link.source }),
      });
      const b = (await r.json().catch(() => ({}))) as { error?: string };
      if (r.ok) { setMsg({ ok: true, text: `Linked ${name}.` }); onDone(); return; }
      setMsg({
        ok: false,
        text: r.status === 403
          ? `This link was made for another account. Run the link command again with ${account}.`
          : (b.error ?? `HTTP ${r.status}`),
      });
    } catch {
      setMsg({ ok: false, text: "Could not reach the app." });
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={styles.confirmCard} role="dialog" aria-label="Link an agent">
      <div className={styles.confirmText}>
        <span className="eyebrow">from a link made by {link.source}</span>
        <p className={styles.confirmTitle}>Link agent <span className="mono">{name}</span> (<span className="mono" title={link.bidder}>{shortHex(link.bidder)}</span>) to <span className="mono">{account}</span>?</p>
        <p className="small">The agent&apos;s key signed this link. Linking only shows its bids here; it cannot move funds.</p>
        {msg ? <p className={`${styles.msg} ${msg.ok ? styles.ok : styles.bad}`} role="status">{msg.text}</p> : null}
      </div>
      <div className={styles.actions}>
        <button type="button" className={`${styles.btn} ${styles.primary}`} onClick={() => void confirm()} disabled={busy} aria-busy={busy}>{busy ? "Linking…" : "Link"}</button>
        <Link href="/tenders/agents" className={`${styles.btn} ${styles.quiet}`}>Not now</Link>
      </div>
    </div>
  );
}

function AgentCard({ a, sym, onUnlinked }: { a: AgentView; sym: (job: number) => string; onUnlinked: () => void }) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  async function unlink() {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(`/api/tenders/agents?bidder=${a.bidder}`, { method: "DELETE", headers: { "content-type": "application/json" }, body: "{}" });
      const b = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(b.error ?? `HTTP ${r.status}`);
      onUnlinked();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }
  const linked = new Date(a.linked_at);
  return (
    <li className={styles.agent}>
      <div className={styles.agentTop}>
        <div className={styles.agentName}>
          <span className={styles.agentLabel}>{a.label}<Pill tone={SOURCE_TONE[a.source] ?? "neutral"}>{a.source}</Pill></span>
          <span className={styles.agentMeta}>
            <button type="button" className={styles.bidderId} title={`${a.bidder} (click to copy)`} aria-label={`Copy bidder id ${a.bidder}`}
              onClick={() => { void navigator.clipboard?.writeText(a.bidder).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1400); }).catch(() => undefined); }}>
              {copied ? "copied" : shortHex(a.bidder, 8)}
            </button>
            <span>linked <span className="mono">{Number.isNaN(linked.getTime()) ? a.linked_at : linked.toISOString().slice(0, 10)}</span></span>
          </span>
        </div>
        <div className={styles.stats}>
          <span className={styles.stat}><span className={styles.statValue}>{a.bids.length}</span><span className={styles.statLabel}>bids</span></span>
          <span className={styles.stat}><span className={styles.statValue}>{a.open}</span><span className={styles.statLabel}>open</span></span>
          <span className={styles.stat}><span className={`${styles.statValue} ${a.wins ? styles.won : ""}`}>{a.wins}</span><span className={styles.statLabel}>wins</span></span>
        </div>
      </div>

      {a.bids.length ? (
        <table className={styles.bids}>
          <thead><tr><th>Job</th><th>Title</th><th>Phase</th><th>Price</th><th>Outcome</th><th>Agreement</th></tr></thead>
          <tbody>
            {a.bids.map((b) => (
              <tr key={b.job}>
                <td><Link className="mono link" href={`/tenders/${b.job}`}>#{b.job}</Link></td>
                <td className={styles.bidTitle} title={b.title}>{b.title}</td>
                <td><Pill tone={PHASE_TONE[b.phase]}>{b.phase}</Pill></td>
                <td>{b.price !== null ? <Usdc amount={b.price} symbol={sym(b.job)} /> : <span className="mono faint">sealed</span>}</td>
                <td className="mono">{b.won ? <span className={styles.won}>won</span> : b.lost ? <span className={styles.lost}>lost</span> : <span className="faint">pending</span>}</td>
                <td className={b.agreement ? undefined : styles.hideNarrow}>{b.agreement ? <RoomLink className="mono link" id={b.agreement} /> : <span className="faint">none</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="small">No bids on the board&apos;s recent jobs yet. <Link className="link" href="/tenders">Open tenders</Link></p>
      )}

      <div className={styles.unlink}>
        {!asking ? (
          <button type="button" className={`${styles.btn} ${styles.quiet}`} onClick={() => setAsking(true)}>Unlink</button>
        ) : (
          <>
            <span>Unlink <span className="mono">{a.label}</span>? Its bids stay on the board.</span>
            <button type="button" className={`${styles.btn} ${styles.danger}`} onClick={() => void unlink()} disabled={busy} aria-busy={busy}>{busy ? "Unlinking…" : "Unlink"}</button>
            <button type="button" className={`${styles.btn} ${styles.quiet}`} onClick={() => setAsking(false)} disabled={busy}>Cancel</button>
          </>
        )}
        {err ? <span className={`${styles.msg} ${styles.bad}`} role="status">{err}</span> : null}
      </div>
    </li>
  );
}

function AddAgent({ account, linked, onLinked }: { account: string; linked: string[]; onLinked: () => void }) {
  const [here, setHere] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => { setHere(browserKey()?.id ?? null); }, []);
  const hereLinked = !!here && linked.includes(here);

  async function linkHere() {
    setBusy(true);
    setMsg(null);
    const got = ensureBrowserKey();
    if (!got) { setMsg({ ok: false, text: "This browser blocks storage, so it cannot keep a bidder key. Use the script instead." }); setBusy(false); return; }
    setHere(got.key.id);
    const err = await linkBrowserKey(got.key, account);
    setMsg(err === null ? { ok: true, text: "This browser's key is linked. Bid on any open job from its page." } : { ok: false, text: err === "no_session" ? "Confirm it is you first, then try again." : err });
    setBusy(false);
    if (err === null) onLinked();
  }

  return (
    <Panel title="Add an agent">
      <div className={styles.ways}>
        <div className={styles.way}>
          <span className={styles.wayTitle}>Bid from this browser</span>
          {hereLinked ? (
            <p className="small">This browser&apos;s key <span className="mono">{shortHex(here!, 8)}</span> is linked. Open a job that is taking bids and use &ldquo;Bid from this browser&rdquo;. <Link className="link" href="/tenders">Open tenders</Link></p>
          ) : (
            <>
              <p className="small">{here ? "This browser already holds a bidder key. Link it to see its bids here." : "Makes a bidder key kept in this browser and links it to your account. No NEAR needed: the relay pays the gas and the bond."}</p>
              <div className={styles.actions}>
                <button type="button" className={`${styles.btn} ${styles.primary}`} onClick={() => void linkHere()} disabled={busy} aria-busy={busy}>
                  {busy ? "Linking…" : here ? "Link this browser's key" : "Make a key and link it"}
                </button>
              </div>
            </>
          )}
          {msg ? <p className={`${styles.msg} ${msg.ok ? styles.ok : styles.bad}`} role="status">{msg.text}</p> : null}
        </div>
        <div className={styles.way}>
          <span className={styles.wayTitle}>An agent that runs elsewhere</span>
          <p className="small">Run this where the agent keeps its key (Node 22 or later). It prints a link; open it here while signed in as <span className="mono">{account}</span>.</p>
          <Command text={linkScript(account)} />
          <p className="small">From a clone of the repository, the CLI does the same:</p>
          <Command text={linkCli(account)} />
        </div>
      </div>
    </Panel>
  );
}
