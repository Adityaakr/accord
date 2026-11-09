"use client";

// The demo counterparty and demo agent, in rooms opened against Accord's demo vendor (halcyon-demo.testnet) on
// testnet. The counterparty is Accord's own vendor and authority accounts making their next valid move; the agent
// is run by Accord for this test room and pays with the key the buyer installs. Every buyer step stays in the
// buyer's own wallet, and the contract checks every call the same way it checks anyone's.

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRefreshSoon } from "@/components/refreshSoon";
import type { AgreementView } from "@accord/sdk";
import { useWallet } from "@/components/wallet/WalletProvider";
import { tokenSymbol, useAppConfig } from "@/components/AppConfig";
import { Panel } from "@/components/ui";
import { agreementClient, errorText } from "@/components/me/client";
import { useOrg } from "@/components/org/OrgProvider";
import { POLL_MS, isBusyStatus, nextPollDelay } from "@/components/pollbackoff";
import styles from "./demo.module.css";

interface Step { did: string | null; next: string; tx: string | null; yourMove: boolean; error?: string }
interface AgentOut { action: string; item: number; amount: string; recipient: string | null; result: { status: string; code?: string; txHash: string }; error?: string }


export function DemoPanel({ agreement: a, explorer }: { agreement: AgreementView; explorer: string | null }) {
  const w = useWallet();
  const org = useOrg();
  const cfg = useAppConfig();
  const refreshSoon = useRefreshSoon();
  const [step, setStep] = useState<Step | null>(null);
  // the network is busy: the panel keeps its last state, says so in one quiet line, and polls less often
  const [netBusy, setNetBusy] = useState(false);
  const delay = useRef(POLL_MS);
  const [last, setLast] = useState<{ did: string; tx: string | null; at: number } | null>(null);
  const [auto, setAuto] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [agent, setAgent] = useState<{ ok: boolean; text: string; tx?: string; refusal?: string } | null>(null);
  const [agentKey, setAgentKey] = useState<{ publicKey: string; installed: boolean } | null>(null);
  const running = useRef(false);
  const isBuyer = w.accountId === a.buyer;
  const txUrl = (h: string) => (explorer ? `${explorer}/txns/${h}` : null);
  const client = useMemo(() => (w.signer ? agreementClient(w.signer, cfg, a.account) : null), [w.signer, cfg, a.account]);
  const closed = a.state === "Settled" || a.state === "Cancelled" || a.state === "NoDeal";
  // A closed room is never polled, so the panel says why it ended instead of waiting for a step that will not come.
  const sym = tokenSymbol(cfg, a.factory);
  const closedText = a.state === "NoDeal"
    ? `No deal: the buyer's ceiling was below the vendor's floor, so the Sealed Table agreed nothing and no money moved. Open a new room with a ceiling of at least ${sym === "USDC" ? 12 : 30} ${sym}.`
    : a.state === "Cancelled" ? "This room was cancelled before execution. Nothing left to do." : "This room is settled. Nothing left to do.";
  // Signed out, the panel only describes the room: it never calls the demo endpoints (the counterparty and the agent
  // act for a signed-in visitor, in practice the room's buyer).
  const signedIn = !!w.accountId;
  // the buyer revoked the agent's key and has not installed another: the agent cannot pay any more
  const revoked = a.revoked_keys > 0 && !a.agent_key;

  const runStep = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    const busy = (retryAfter: string | null) => {
      delay.current = nextPollDelay(delay.current, true, retryAfter ? Number(retryAfter) : null);
      setNetBusy(true);
    };
    try {
      const r = await fetch("/api/demo-counterparty/step", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ agreement: a.account }),
      });
      const b = (await r.json().catch(() => ({}))) as Step;
      if (isBusyStatus(r.status)) { busy(r.headers.get("retry-after")); return; }
      delay.current = POLL_MS;
      setNetBusy(false);
      if (!r.ok) { setStep({ did: null, next: b.error ?? `the counterparty could not act (${r.status})`, tx: null, yourMove: false, error: b.error }); return; }
      setStep(b);
      if (b.did) { setLast({ did: b.did, tx: b.tx, at: Date.now() }); refreshSoon(); }
    } catch {
      busy(null); // no answer at all (offline, a dropped connection): the same quiet back-off
    } finally {
      running.current = false;
    }
  }, [a.account, refreshSoon]);

  useEffect(() => {
    if (!auto || closed || !signedIn) return;
    let stop = false;
    let t: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      if (document.visibilityState === "visible") await runStep();
      if (!stop) t = setTimeout(() => void tick(), delay.current);
    };
    void tick();
    return () => { stop = true; clearTimeout(t); };
  }, [auto, closed, signedIn, runStep]);

  useEffect(() => {
    if (a.state !== "Executing" || !signedIn) return;
    void fetch("/api/demo-agent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ agreement: a.account, action: "key" }) })
      .then((r) => (r.ok ? r.json() : null)).then((b: { publicKey: string; installed: boolean } | null) => setAgentKey(b)).catch(() => setAgentKey(null));
  }, [a.account, a.state, a.agent_key, signedIn]);

  async function startAgent() {
    if (!client || !agentKey) return;
    setBusy("start"); setAgent(null);
    try {
      const tx = await client.installAgentKey(agentKey.publicKey, a.params.agent_allowance);
      setAgent({ ok: true, text: "The demo agent's key is installed on the agreement account.", tx: tx.txHash });
      refreshSoon();
    } catch (e) {
      setAgent({ ok: false, text: `Install the agent key: ${errorText(e)}` });
    } finally { setBusy(null); }
  }

  async function agentDo(action: "pay" | "attack") {
    setBusy(action); setAgent(null);
    try {
      // pay and attack need the buyer's session (the cookie /api/session sets, same origin so fetch sends it);
      // without one, confirm it is you with a signed message and ask once more
      const ask = () => fetch("/api/demo-agent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ agreement: a.account, action }) });
      let r = await ask();
      if (r.status === 401) {
        if (!(await org.confirm())) { setAgent({ ok: false, text: "Confirm it's you (a signed message, no transaction) so the demo agent knows the buyer asked." }); return; }
        r = await ask();
      }
      const b = (await r.json()) as AgentOut;
      if (!r.ok) { setAgent({ ok: false, text: b.error ?? `the agent could not act (${r.status})` }); return; }
      const amt = (Number(b.amount) / 1e6).toFixed(2);
      if (b.result.status === "refused") {
        setAgent({ ok: false, refusal: b.result.code, text: `Asked to pay ${amt} ${tokenSymbol(cfg, a.factory)} for item ${b.item} to ${b.recipient}. The contract refused it and recorded the refusal.`, tx: b.result.txHash });
      } else if (b.result.status === "sent") {
        setAgent({ ok: true, text: `Paid item ${b.item}: ${amt} ${tokenSymbol(cfg, a.factory)} to ${b.recipient}, the active recipient.`, tx: b.result.txHash });
      } else {
        setAgent({ ok: false, text: `Item ${b.item}: ${b.result.status}`, tx: b.result.txHash });
      }
      refreshSoon();
    } catch (e) {
      setAgent({ ok: false, text: errorText(e) });
    } finally { setBusy(null); }
  }

  const installed = !!agentKey?.installed && !!a.agent_key;
  // a key the demo agent did not derive (installed from Your actions, or by your own agent): it cannot pay with it
  const foreign = !!a.agent_key && !!agentKey && !agentKey.installed;

  async function replaceForeignKey() {
    if (!client) return;
    setBusy("replace"); setAgent(null);
    try {
      const tx = await client.revokeAgent();
      setAgent({ ok: true, text: "Revoked the other key. Start the demo agent now: it gets a new key of its own.", tx: tx.txHash });
      refreshSoon();
    } catch (e) {
      setAgent({ ok: false, text: `Revoke the other key: ${errorText(e)}` });
    } finally { setBusy(null); }
  }

  return (
    <Panel title="Demo counterparty" eyebrow="Testnet demo" aside={<button type="button" className={styles.toggle} onClick={() => setAuto((v) => !v)} aria-pressed={auto}>{auto ? "auto on" : "auto off"}</button>}>
      <div className={styles.body}>
        <p className="small">
          Accord plays the vendor (<span className="mono">{a.vendor}</span>) and its authority (<span className="mono">{a.vendor_authority}</span>) in this test room. It makes their next valid move and nothing else; the contract checks each call.
        </p>
        <div className={styles.box}>
          <span className="eyebrow">last action</span>
          {last ? (
            <span>{last.did}{last.tx ? <> · {txUrl(last.tx) ? <a className="mono link" href={txUrl(last.tx)!} target="_blank" rel="noreferrer">tx {last.tx.slice(0, 8)}</a> : <span className="mono">tx {last.tx.slice(0, 8)}</span>}</> : null}</span>
          ) : <span className="small">None yet in this tab.</span>}
          <span className="eyebrow">next</span>
          <span className={step?.yourMove ? styles.you : undefined}>{closed ? closedText : !signedIn ? "Sign in as the buyer to run the demo counterparty in this room." : step ? step.next : "Reading the room…"}</span>
          {netBusy && <span className="small" role="status">The network is busy, retrying.</span>}
        </div>
        {closed && <Link className={styles.btn} href="/try-it">Open a new room</Link>}
        {!closed && signedIn && <button type="button" className={styles.btn} disabled={running.current} onClick={() => void runStep()}>Run next step</button>}

        {a.state === "Executing" && (
          <div className={styles.agent}>
            <span className="eyebrow">demo agent run by Accord for this test room</span>
            <p className="small">
              It holds one function-call key on the agreement account, which you install and can revoke. It signs <span className="mono">act</span> itself; nothing is relayed.
            </p>
            {revoked && (
              <p className={`small ${styles.you}`} role="status">
                The agent&apos;s key is revoked: anything it signs is rejected by the network. <Link className="link" href="/try-it">Finish on Try it</Link> closes the room and returns the test funds{isBuyer ? <>, or start the agent again below with a new key</> : null}.
              </p>
            )}
            {!isBuyer ? <p className="small">Sign in as the buyer, <span className="mono" style={{ overflowWrap: "anywhere" }}>{a.buyer}</span>, to start the agent.</p>
              : foreign ? (
                <>
                  <p className={`small ${styles.you}`} role="status">
                    The key installed on this room is not the demo agent&apos;s, so the demo agent cannot sign with it and the due item waits. Revoke that key, then start the demo agent.
                  </p>
                  <button type="button" className={`${styles.btn} ${styles.primary}`} disabled={busy !== null || !client} onClick={() => void replaceForeignKey()}>
                    {busy === "replace" ? "Waiting for the network…" : "Revoke the other key"}
                  </button>
                </>
              ) : !installed ? (
                <button type="button" className={`${styles.btn} ${styles.primary}`} disabled={busy !== null || !agentKey || !client} onClick={() => void startAgent()}>
                  {busy === "start" ? "Waiting for the network…" : "Start the demo agent"}
                </button>
              ) : (
                <>
                  <button type="button" className={`${styles.btn} ${styles.primary}`} disabled={busy !== null || revoked || !a.agent_key} onClick={() => void agentDo("pay")}>
                    {busy === "pay" ? "Waiting for the network…" : "Let the agent pay the due item"}
                  </button>
                  <button type="button" className={styles.btn} disabled={busy !== null || revoked || !a.agent_key} onClick={() => void agentDo("attack")}>
                    {busy === "attack" ? "Waiting for the network…" : "Ask the agent to pay a new account"}
                  </button>
                  <p className="small">Then revoke the key from the room header: the agent's next call fails at the network.</p>
                </>
              )}
            {agent && (
              <div className={styles.box} role="status">
                {agent.refusal && <span className={`mono ${styles.refusal}`}>{agent.refusal}</span>}
                <span className={agent.ok ? styles.ok : undefined}>{agent.text}</span>
                {agent.tx && (txUrl(agent.tx) ? <a className="mono link small" href={txUrl(agent.tx)!} target="_blank" rel="noreferrer">tx {agent.tx.slice(0, 10)}</a> : <span className="mono small">tx {agent.tx.slice(0, 10)}</span>)}
              </div>
            )}
          </div>
        )}
      </div>
    </Panel>
  );
}
