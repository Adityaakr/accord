"use client";

// The job, done from the browser that won it. This browser's bidder key is the agreement's vendor; it makes two more
// keys here (the approver, which approves the payee as the vendor's authority, and the payee, which is paid), keeps all
// three in localStorage and offers them as a file. Then it plays the vendor's side one move at a time (vendorMove in
// @accord/sdk, the same rules the CLI's `accord tender work` follows): seal with the winning price as the floor, start
// the negotiation, approve the terms, propose and approve the payee. Each delivery is the winner's own text (or a NEAR
// AI draft it edited), hosted by the app and hashed into the agreement; claims run after the claim delay. Every move
// is the contract's to accept or refuse.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Accord, KeySigner, bidderKey, bidderNearKey, newBidderKey, signDelivery, signDraft, signWinner, tenderVendorMandate, vendorMove,
  type BidderKey, type TenderJob, type VendorMove, type VendorView,
} from "@accord/sdk";
import { useAppConfig } from "@/components/AppConfig";
import type { WinnerSetup } from "@/server/tenderwork";
import { browserKey, read, write } from "../browserKey";
import styles from "./job.module.css";

interface Keys { vendor: BidderKey; authority: BidderKey; recipient: BidderKey }
type Log = { at: string; text: string; tx?: string };

const storeKey = (board: string, job: number) => `accord.tender.work.${board}.${job}`;

function loadKeys(board: string, job: number, vendor: BidderKey): Keys | null {
  const raw = read(storeKey(board, job));
  if (!raw) return null;
  try {
    const k = JSON.parse(raw) as { vendor: string; authority: string; recipient: string };
    return k.vendor === vendor.id ? { vendor, authority: bidderKey(k.authority), recipient: bidderKey(k.recipient) } : null;
  } catch { return null; }
}

async function post(path: string, body: object): Promise<Record<string, unknown>> {
  const r = await fetch(`/api/tenders/${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  if (!r.ok) throw new Error(String(j.error ?? `HTTP ${r.status}`));
  return j;
}

const sha256 = async (text: string) =>
  Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))), (b) => b.toString(16).padStart(2, "0")).join("");

const MOVE_TEXT: Record<VendorMove["kind"], string> = {
  seal: "Seal your mandate (your winning price is the floor)", negotiate: "Start the negotiation in the Sealed Table",
  approve: "Approve the settled terms", propose: "Propose your payee", "authority-approve": "Approve your payee with your approver key",
  activate: "Activate your payee", deliver: "Deliver", claim: "Claim payment", wait: "Waiting", done: "Done",
};

export function WinnerWork({ board, job, setup }: { board: string; job: TenderJob; setup: WinnerSetup | null }) {
  const cfg = useAppConfig();
  const [vendor, setVendor] = useState<BidderKey | null>(null);
  const [keys, setKeys] = useState<Keys | null>(null);
  const [view, setView] = useState<VendorView | null>(null);
  const [move, setMove] = useState<VendorMove | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<Log[]>([]);
  const [auto, setAuto] = useState(true);
  const [text, setText] = useState<Record<number, string>>({});
  const [funded, setFunded] = useState(false);
  const running = useRef(false);

  useEffect(() => {
    const k = browserKey();
    if (k && k.id === job.winner) { setVendor(k); setKeys(loadKeys(board, job.id, k)); }
  }, [board, job.id, job.winner]);

  const say = useCallback((t: string, tx?: string) => setLog((l) => [{ at: new Date().toISOString().slice(11, 19), text: t, tx }, ...l].slice(0, 30)), []);

  const register = useCallback(async (k: Keys) => {
    const args = [board, job.id, k.authority.id, k.recipient.id] as const;
    return post(`${job.id}/winner`, {
      bidder: k.vendor.id, authority: k.authority.id, recipient: k.recipient.id,
      signature: signWinner(k.vendor.seed, ...args), authority_signature: signWinner(k.authority.seed, ...args), recipient_signature: signWinner(k.recipient.seed, ...args),
    });
  }, [board, job.id]);

  async function accept() {
    if (!vendor) return;
    setError(null); setBusy("Accepting");
    try {
      const k = keys ?? { vendor, authority: newBidderKey(), recipient: newBidderKey() };
      if (!keys && !write(storeKey(board, job.id), JSON.stringify({ vendor: vendor.id, authority: k.authority.seed, recipient: k.recipient.seed }))) {
        throw new Error("this browser cannot keep the approver and payee keys (storage is blocked)");
      }
      setKeys(k);
      await register(k);
      say("Accepted: approver and payee named; the buyer can open the agreement");
      location.reload();
    } catch (e) { setError((e as Error).message); } finally { setBusy(null); }
  }

  function downloadKeys() {
    if (!keys) return;
    const body = JSON.stringify({ note: "Accord tender job keys. The payee holds what the job paid; keep this file.", board, job: job.id,
      vendor: { id: keys.vendor.id, seed: keys.vendor.seed }, authority: { id: keys.authority.id, seed: keys.authority.seed }, recipient: { id: keys.recipient.id, seed: keys.recipient.seed } }, null, 2);
    const url = URL.createObjectURL(new Blob([body], { type: "application/json" }));
    Object.assign(document.createElement("a"), { href: url, download: `accord-tender-${job.id}-keys.json` }).click();
    URL.revokeObjectURL(url);
  }

  // The agreement's state and the next vendor move; signing uses the public RPC (the read proxy does not send).
  const accord = useCallback(() => new Accord({ network: "testnet", factory: cfg.factory, rpc: cfg.rpc }), [cfg.factory, cfg.rpc]);
  const refresh = useCallback(async (): Promise<VendorMove | null> => {
    if (!job.agreement || !keys || !setup) return null;
    const d = accord().agreement(job.agreement);
    const [a, c, recipients, items] = await Promise.all([d.get(), d.commitments(), d.recipients(), d.items()]);
    const v: VendorView = { agreement: a, sealed: { buyer: !!c.buyer, vendor: !!c.vendor }, recipients, items, now: a.now };
    const m = vendorMove(v, { recipient: keys.recipient.id, domain: setup.domain });
    setView(v); setMove(m);
    return m;
  }, [accord, job.agreement, keys, setup]);

  const as = useCallback((k: BidderKey) => {
    const base = accord();
    return base.withSigner(new KeySigner(k.id, bidderNearKey(k), base.chain)).agreement(job.agreement!);
  }, [accord, job.agreement]);

  async function deliver(item: number) {
    if (!keys || !job.agreement) return;
    const body = (text[item] ?? "").trim();
    if (!body) { setError(`write the delivery for item ${item} first`); return; }
    setBusy(`Delivering item ${item}`); setError(null);
    try {
      const sha = await sha256(body);
      const r = await post(`${job.id}/deliveries`, { agreement: job.agreement, item, body, content_type: "text/plain", signature: signDelivery(keys.vendor.seed, job.agreement, item, sha) });
      if (r.sha256 !== sha) throw new Error("the app stored a different delivery than the one sent");
      const uri = `${location.origin}${location.pathname.replace(/\/tenders\/.*$/, "")}${String(r.path)}`;
      const tx = await as(keys.vendor).submitDelivery(item, sha, uri);
      say(`Delivered item ${item} (sha256 ${sha.slice(0, 12)}…)`, tx.txHash);
      await refresh();
    } catch (e) { setError((e as Error).message); } finally { setBusy(null); }
  }

  async function draft(item: number) {
    if (!keys) return;
    setBusy(`NEAR AI is drafting item ${item}`); setError(null);
    try {
      const r = await post(`${job.id}/draft`, { item, signature: signDraft(keys.vendor.seed, board, job.id, item) });
      setText((t) => ({ ...t, [item]: String(r.text) }));
      say(`Draft for item ${item} from NEAR AI (${String(r.model)}); edit it before you deliver`);
    } catch (e) { setError((e as Error).message); } finally { setBusy(null); }
  }

  // One automatic move at a time (never a delivery: that is the winner's text).
  const step = useCallback(async () => {
    if (running.current || !keys || !setup || !job.agreement) return;
    running.current = true;
    try {
      if (!funded) { await register(keys).catch(() => null); setFunded(true); }
      const m = await refresh();
      if (!m || !auto || m.kind === "wait" || m.kind === "done" || m.kind === "deliver") return;
      setBusy(MOVE_TEXT[m.kind]); setError(null);
      const vendorAgreement = as(keys.vendor);
      let tx: string | undefined;
      switch (m.kind) {
        case "seal": tx = (await vendorAgreement.sealMandate(tenderVendorMandate(BigInt(job.bids.find((b) => b.bidder === keys.vendor.id)!.price!), { job: job.id, title: job.title }), { role: "vendor" })).txHash; break;
        case "negotiate": tx = (await vendorAgreement.startNegotiation()).txHash; break;
        case "approve": tx = (await vendorAgreement.approveTerms(m.terms)).txHash; break;
        case "propose": tx = (await vendorAgreement.proposeRecipient(m.recipient, m.domain)).txHash; break;
        case "authority-approve": tx = (await as(keys.authority).approveRecipient(m.version)).txHash; break;
        case "activate": tx = (await vendorAgreement.activateRecipient(m.version)).txHash; break;
        case "claim": { const r = await vendorAgreement.claim(m.item); tx = r.txHash; if (r.status !== "sent") say(`Claim ${m.item} refused: ${r.code ?? r.status}`); break; }
      }
      say(MOVE_TEXT[m.kind] + ("item" in m ? ` (item ${m.item})` : ""), tx);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally { setBusy(null); running.current = false; }
  }, [as, auto, funded, job, keys, refresh, register, say, setup]);

  useEffect(() => {
    if (!job.agreement || !keys) return;
    void step();
    const t = setInterval(() => void step(), 6000);
    return () => clearInterval(t);
  }, [job.agreement, keys, step]);

  if (!vendor) return null;
  const items = view?.items ?? [];
  const toDeliver = view?.agreement.state === "Executing" ? items.filter((i) => i.status === "Open" || i.status === "Disputed") : [];

  return (
    <div className={styles.mine}>
      <p className="small"><b>This browser&apos;s key won this job.</b> Do the work here: this page plays your side of the agreement with your keys, and you write (or draft with NEAR AI) what you deliver. The contract pays only your proven payee.</p>
      {!setup ? (
        <div className={styles.award}>
          <button type="button" className={styles.button} onClick={() => void accept()} disabled={!!busy}>{busy ?? "Accept the job"}</button>
          <p className="small">Makes your approver and payee keys in this browser and tells the buyer you accept. No funds move.</p>
        </div>
      ) : !job.agreement ? (
        <p className="small">Accepted. Waiting for the buyer to open the agreement; this page carries on when they do.</p>
      ) : (
        <>
          <p className="small">
            <b>Next:</b> {move ? (move.kind === "wait" ? (move.buyer ? `the buyer's move: ${move.why}` : move.why) : move.kind === "done" ? move.why : MOVE_TEXT[move.kind] + ("item" in move ? ` item ${move.item}` : "")) : "reading the agreement"}
            {busy ? <> · <span aria-busy="true">{busy}…</span></> : null}
          </p>
          <label className="small"><input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> Make my moves automatically while this page is open (deliveries always wait for you)</label>
          {toDeliver.map((i) => (
            <div key={i.id} className={styles.award}>
              <label className="small" htmlFor={`d${i.id}`}><b>Item {i.id}</b> · {i.status === "Disputed" ? "disputed: deliver again" : "your delivery"}</label>
              <textarea id={`d${i.id}`} className={styles.deliverBox} rows={8} maxLength={65536} value={text[i.id] ?? ""}
                onChange={(e) => setText((t) => ({ ...t, [i.id]: e.target.value }))} placeholder="What you delivered: a report, results, links. Its sha256 goes into the agreement." />
              <div className={styles.row2}>
                <button type="button" className={styles.buttonQuiet} onClick={() => void draft(i.id)} disabled={!!busy}>Draft with NEAR AI</button>
                <button type="button" className={styles.button} onClick={() => void deliver(i.id)} disabled={!!busy || !(text[i.id] ?? "").trim() || move?.kind !== "deliver"}>Deliver item {i.id}</button>
              </div>
            </div>
          ))}
        </>
      )}
      {error ? <p className={`small ${styles.bad}`} role="alert">{error}</p> : null}
      {keys ? <p className="small"><button type="button" className={styles.linkButton} onClick={downloadKeys}>Download your keys</button> · your payee <span className="mono">{keys.recipient.id.slice(0, 12)}…</span> holds what the job pays; keep the file.</p> : null}
      {log.length ? (
        <ul className={`small ${styles.workLog}`} aria-label="What this page did">
          {log.map((l, i) => <li key={i}><span className="mono faint">{l.at}</span> {l.text}{l.tx ? <> · <a className="mono link" href={`https://testnet.nearblocks.io/txns/${l.tx}`} target="_blank" rel="noreferrer">{l.tx.slice(0, 10)}…</a></> : null}</li>)}
        </ul>
      ) : null}
    </div>
  );
}
