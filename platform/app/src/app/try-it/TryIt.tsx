"use client";

// Five steps, each with its live status read from the chain (or the faucet) and one button. The visitor signs every
// buyer step in their own wallet, or with a throwaway testnet key made in this tab ("Try without a wallet"); Accord's
// demo vendor answers in the room. With the throwaway key the faucet and the room open on their own: there is no
// wallet prompt to wait for, and every call is still signed in this browser.

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DEMO_PARAMS, formatUnits, type AgreementView } from "@accord/sdk";
import { useWallet } from "@/components/wallet/WalletProvider";
import { ThrowawayTag } from "@/components/wallet/ThrowawayTag";
import { CIRCLE_FAUCET, useAppConfig } from "@/components/AppConfig";
import { useOrg } from "@/components/org/OrgProvider";
import { IconTile } from "@/components/IconTile";
import type { PixelName } from "@/components/PixelIcon";
import { errorText, readClient } from "@/components/me/client";
import { browserAccord } from "@/components/chainClient";
import { onVisibleInterval } from "@/components/visible";
import { AccountId } from "@/components/account/AccountId";
import { fundingGap, near2, usdc2 } from "@/lib/funding";
import styles from "./tryit.module.css";

interface Demo { vendor: string; authority: string; recipient: string; stranger: string; domain: string }
interface Ready { faucet: boolean; counterparty: boolean; agent: boolean }
/** From /api/chain/balances: NEAR (0 for an account the chain does not know yet) and the chosen currency's token. */
interface Balances { near: string; ft: string; exists: boolean; currency: "default" | "usdc" }

const ROOM_KEY = "accord-try-it-room";
const TITLE = "My first deal room";
/** How often the page re-reads while it is visible; a hidden tab reads nothing. */
const POLL_MS = 10_000;

type Status = "done" | "now" | "later";

export function TryIt({ network, explorer, deposit, demo, ready }: {
  network: string; explorer: string | null; token: string | null; deposit: string | null; demo: Demo; ready: Ready;
}) {
  const w = useWallet();
  const org = useOrg();
  const cfg = useAppConfig();
  const router = useRouter();
  const [bal, setBal] = useState<Balances | null>(null);
  const [room, setRoom] = useState<AgreementView | null>(null);
  const [buyerSealed, setBuyerSealed] = useState(false);
  // the account whose room lookup has finished, so the throwaway flow never opens a second room while it reads
  const [checked, setChecked] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ step: number; ok: boolean; text: string; txs?: { label: string; hash: string }[] } | null>(null);
  // Settlement: test USDC from our faucet by default; Circle's testnet USDC when the server offers it and the visitor
  // picks it. An existing room keeps the currency of the factory that created it.
  const currencies = cfg.currencies ?? [];
  const [picked, setPicked] = useState<"default" | "usdc">("default");
  const roomCurrency = room ? currencies.find((c) => c.factory === room.factory)?.id : undefined;
  const currencyId = roomCurrency ?? picked;
  const factory = currencies.find((c) => c.id === currencyId)?.factory ?? cfg.factory;
  const circle = currencyId === "usdc";
  const sym = circle ? "USDC" : "tUSDC";
  const txUrl = (h: string) => (explorer ? `${explorer}/txns/${h}` : null);

  // a faucet answer is newer than the server's balance cache (a few seconds): polls inside this window keep it
  const holdBal = useRef(0);

  const load = useCallback(async () => {
    if (!w.accountId) { setBal(null); setRoom(null); setChecked(null); return; }
    const a = browserAccord(cfg, { factory });
    try {
      const r = await fetch(`/api/chain/balances?account=${encodeURIComponent(w.accountId)}&currency=${currencyId}`, { cache: "no-store" });
      const b = (await r.json()) as Partial<Balances> & { busy?: boolean };
      // busy: keep what was shown; never show a 0 the chain did not say
      if (r.ok && !b.busy && b.near !== undefined && b.ft !== undefined && Date.now() > holdBal.current) {
        setBal({ near: b.near, ft: b.ft, exists: b.exists ?? true, currency: currencyId });
      }
    } catch { /* offline for a moment; the next pass reads it */ }
    // this browser's try-it room, else the visitor's newest room with the demo vendor
    let id: string | null = null;
    try { id = localStorage.getItem(`${ROOM_KEY}:${w.accountId}`); } catch { /* no storage */ }
    if (!id) {
      const lists = await Promise.all([cfg.factory, ...(cfg.currencies ?? []).map((c) => c.factory).filter((f) => f !== cfg.factory)]
        .map((f) => a.onFactory(f).listAgreements({ party: w.accountId! }).catch(() => [])));
      const mine = lists.flat().sort((x, y) => x.created_at - y.created_at);
      id = mine.filter((r) => r.buyer === w.accountId && r.vendor === demo.vendor).at(-1)?.account ?? null;
    }
    if (id) {
      const c = readClient(cfg, id);
      const [v, cm] = await Promise.all([c.get().catch(() => null), c.commitments().catch(() => null)]);
      setRoom(v);
      setBuyerSealed(!!cm?.buyer || (v ? v.state !== "Sealed" : false));
      // an unreadable room (slow RPC) stays unchecked, so nothing opens a new one in its place
      if (v) setChecked(w.accountId);
    } else { setRoom(null); setChecked(w.accountId); }
  }, [w.accountId, cfg, demo.vendor, factory, currencyId]);

  useEffect(() => {
    void load();
    return onVisibleInterval(() => void load(), POLL_MS);
  }, [load]);

  // Enough NEAR for the room's deposit and gas, and enough of the chosen token for the buyer preset's ceiling (40
  // tUSDC, or 18 USDC for Circle). Balances read for another currency do not count.
  const shown = bal && bal.currency === currencyId ? bal : null;
  const gap = shown ? fundingGap(circle ? "usdc" : "default", shown) : null;
  const funded = !!gap?.funded;

  async function faucet() {
    setBusy("faucet"); setMsg(null);
    try {
      if (!org.session && !(await org.confirm())) { setMsg({ step: 2, ok: false, text: "The faucet needs you to confirm it's you, so it knows which account to fund." }); return; }
      // a Circle USDC room needs only NEAR from Accord's faucet: its test USDC does not fund that room
      const nearOnly = circle;
      const r = await fetch("/api/faucet", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(nearOnly ? { only: "near" } : {}) });
      const b = (await r.json()) as { error?: string; txs?: { label: string; hash: string }[]; balances?: { near: string; tusdc: string } };
      if (!r.ok) { setMsg({ step: 2, ok: false, text: b.error ?? `The faucet could not send right now (${r.status}).` }); return; }
      if (b.balances) {
        const got = b.balances;
        holdBal.current = Date.now() + 6_000;
        setBal((prev) => ({ near: got.near, ft: nearOnly ? prev?.ft ?? "0" : got.tusdc, exists: true, currency: currencyId }));
      }
      setMsg({ step: 2, ok: true, text: b.txs?.length ? (nearOnly ? "Sent test NEAR. Your balances are below." : "Sent. Your balances are below.") : "Your account already had enough.", txs: b.txs });
    } catch (e) {
      setMsg({ step: 2, ok: false, text: errorText(e) });
    } finally { setBusy(null); }
  }

  async function create() {
    if (!w.signer || !w.accountId) return;
    setBusy("create"); setMsg(null);
    try {
      const a = browserAccord(cfg, { factory, signer: w.signer });
      const { agreement, tx } = await a.createAgreement({
        kind: "procurement", title: TITLE, vendor: demo.vendor, vendor_authority: demo.authority, canaries: [], params: DEMO_PARAMS,
      });
      try {
        localStorage.setItem(`${ROOM_KEY}:${w.accountId}`, agreement);
        localStorage.setItem(`accord-brief:${agreement}`, JSON.stringify({ brief: "Market data pipelines and treasury reporting, delivered in 2 to 4 items.", domain: demo.domain }));
      } catch { /* no storage */ }
      setMsg({ step: 3, ok: true, text: `Opened ${agreement}.`, txs: [{ label: "create_agreement", hash: tx.txHash }] });
      await load();
    } catch (e) {
      setMsg({ step: 3, ok: false, text: errorText(e) });
    } finally { setBusy(null); }
  }

  // The throwaway key signs without a prompt, so the flow moves on by itself: faucet, then the room. Each runs once
  // per page load; a failure stays on screen with its button, as with a wallet.
  const auto = useRef({ faucet: false, create: false });
  const throwaway = w.method === "throwaway";
  useEffect(() => {
    if (!throwaway || !bal || busy !== null || room || checked !== w.accountId) return;
    if (!funded && gap?.faucet && ready.faucet && !auto.current.faucet) { auto.current.faucet = true; void faucet(); return; }
    if (funded && !auto.current.create) { auto.current.create = true; void create(); }
    // faucet and create read the latest state when they run
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [throwaway, bal, busy, room, funded, ready.faucet, checked, w.accountId]);
  useEffect(() => { if (!throwaway) auto.current = { faucet: false, create: false }; }, [throwaway]);

  const s1: Status = w.accountId ? "done" : "now";
  const s2: Status = !w.accountId ? "later" : funded || room ? "done" : "now";
  const s3: Status = room ? "done" : s2 === "done" ? "now" : "later";
  const s4: Status = room && buyerSealed ? "done" : room ? "now" : "later";
  const paid = room ? BigInt(room.paid) > 0n : false;
  const s5: Status = paid && room!.refusals > 0 ? "done" : s4 === "done" ? "now" : "later";

  const roomHref = room ? `/agreements/${room.account}` : null;
  const stage = !room ? null
    : room.state === "Sealed" ? (buyerSealed ? "Both mandates in; the Sealed Table negotiates next." : "Waiting for your mandate.")
    : room.state === "Attested" ? "Terms are back. Approve them in the room."
    : room.state === "Executing" ? `Executing · funded ${formatUnits(room.funded)} of ${formatUnits(room.total)} ${sym} · paid ${formatUnits(room.paid)} · ${room.refusals} refused`
    : room.state;

  const Note = ({ step }: { step: number }) => msg && msg.step === step ? (
    <div className={msg.ok ? styles.noteOk : styles.note} role="status">
      <span>{msg.text}</span>
      {msg.txs?.map((t) => <a key={t.hash} className="mono link small" href={txUrl(t.hash) ?? "#"} target="_blank" rel="noreferrer">{t.label} · tx {t.hash.slice(0, 8)}</a>)}
    </div>
  ) : null;

  return (
    <div className={styles.wrap}>
      {network !== "testnet" && <p className="small">This server runs on {network}. The guided path is for NEAR testnet.</p>}
      {(!ready.faucet || !ready.counterparty || !ready.agent) && (
        <p className={`small ${styles.missing}`}>
          On this server: faucet {ready.faucet ? "on" : "off"} · demo counterparty {ready.counterparty ? "on" : "off"} · demo agent {ready.agent ? "on" : "off"}.
        </p>
      )}
      {currencies.length > 1 && !room && (
        <fieldset className="small" aria-label="Settle in" style={{ border: 0, padding: 0, margin: "0 0 16px", display: "flex", flexWrap: "wrap", gap: "8px 20px" }}>
          <span>Settle in</span>
          <label><input type="radio" name="currency" checked={currencyId === "default"} onChange={() => setPicked("default")} /> Test USDC (instant, from our faucet)</label>
          <label><input type="radio" name="currency" checked={currencyId === "usdc"} onChange={() => setPicked("usdc")} /> Circle USDC (testnet, from faucet.circle.com)</label>
        </fieldset>
      )}
      <ol className={styles.steps}>
        <Row n={1} icon="key" status={s1} title="Connect a wallet, or try without one" text={w.accountId
          ? <><span className={styles.signedIn}>Signed in as <AccountId id={w.accountId} copy /> <ThrowawayTag /></span>{throwaway && <> The faucet funds it and the room opens on their own; every call is signed in this tab.</>}</>
          : <>{w.throwawayAvailable && <>No wallet? Try without one: the page creates a temporary key in this browser tab, funded by Accord&apos;s faucet. Closing the tab removes it. Or connect your</>}{!w.throwawayAvailable && <>Your</>} NEAR wallet: <a className="link" href="https://wallet.meteorwallet.app" target="_blank" rel="noreferrer">Meteor</a> or <a className="link" href="https://wallet.intear.tech" target="_blank" rel="noreferrer">Intear</a>. Ledger, Nightly and WalletConnect work too. Meteor and Intear send through Accord&apos;s relayer, so you pay no gas after opening the room (your wallet pays its 2 NEAR deposit from the faucet&apos;s NEAR).</>}>
          {!w.accountId && w.throwawayAvailable && (
            <button type="button" className={styles.primary} onClick={() => void w.startThrowaway()}>Try without a wallet</button>
          )}
          {!w.accountId && <Link className={w.throwawayAvailable ? styles.secondary : styles.primary} href="/signin?next=/try-it">Connect a wallet</Link>}
          {w.error && !w.accountId && <p className="small" role="alert">{w.error}</p>}
        </Row>

        <Row n={2} icon="bank" status={s2} title="Get test funds" text={<>
          {circle
            ? <>Get Circle&apos;s testnet USDC at <a className="link" href={CIRCLE_FAUCET} target="_blank" rel="noreferrer">faucet.circle.com</a> (network NEAR Testnet, your account as the address): about 20 USDC per address every 1 to 2 hours. Our faucet sends the testnet NEAR: up to 2.5 NEAR, for the room&apos;s 2 NEAR deposit (returned when it closes) and gas. Once a day per account.</>
            : <>The faucet tops your account up to 2.5 testnet NEAR (the room&apos;s 2 NEAR deposit, returned when it closes) and 100 test USDC. Once a day per account.</>}
          {shown && <span className={`mono ${styles.bal}`}>{near2(shown.near)} NEAR · {usdc2(shown.ft)} {sym}</span>}
          {gap?.line && s2 !== "done" && <span className={styles.gap}>{gap.line}</span>}
        </>}>
          {w.accountId && s2 !== "done" && (!gap || gap.faucet) && (
            <button type="button" className={styles.primary} disabled={busy !== null || !ready.faucet} onClick={() => void faucet()}>
              {busy === "faucet" ? "Sending…" : faucetLabel(gap?.button ?? (circle ? "Get test NEAR" : "Get test funds"), !!org.session)}
            </button>
          )}
          <Note step={2} />
        </Row>

        <Row n={3} icon="store" status={s3} title="Open a deal room" text={room
          ? <>Your room is <Link className="mono link" href={roomHref!}>{room.account}</Link>: {room.title}.</>
          : <>Prefilled: a vendor contract with <span className="mono">{demo.vendor}</span>, its authority <span className="mono">{demo.authority}</span>, domain <span className="mono">{demo.domain}</span>, titled &quot;{TITLE}&quot;. {throwaway ? "Your throwaway key signs" : "Your wallet signs"} <span className="mono">create_agreement</span> with a {deposit ? formatUnits(deposit, 24) : "2"} NEAR deposit.</>}>
          {!room && w.accountId && (
            <button type="button" className={styles.primary} disabled={busy !== null || s3 !== "now"} onClick={() => void create()}>
              {busy === "create" ? (throwaway ? "Opening the room…" : "Waiting for your wallet…") : "Create the room"}
            </button>
          )}
          <Note step={3} />
        </Row>

        <Row n={4} icon="lock" status={s4} title="Seal your limits" text={<>
          {circle
            ? <>Pick the Northwind buyer preset for Circle USDC: a ceiling of 18 USDC across 2 to 4 items, inside one faucet drip. Your limits are encrypted to the Sealed Table; the vendor never sees them. The demo vendor seals its own (floor 12, target 16).</>
            : <>Pick the Northwind buyer preset: a ceiling of 40 tUSDC across 2 to 4 items. Your limits are encrypted to the Sealed Table; the vendor never sees them. The demo vendor seals its own (floor 30, target 38).</>}
        </>}>
          {room && room.state === "Sealed" && !buyerSealed && <Link className={styles.primary} href={`/agreements/${room.account}/seal`}>Seal your mandate</Link>}
        </Row>

        <Row n={5} icon="agents" status={s5} title="Watch the demo counterparty act" text={<>
          In the room, the Demo counterparty panel starts the negotiation, approves the terms, proposes and approves its recipient, and delivers. You approve, fund, accept, then start the demo agent: it pays the due item to the proven recipient, and when you ask it to pay a new account the contract refuses with <span className="mono">ERR_PAYEE_MISMATCH</span>. Revoke the key from the room header to end it.
          {stage && <span className={`mono ${styles.bal}`}>{stage}</span>}
        </>}>
          {roomHref && <Link className={s5 === "now" ? styles.primary : styles.secondary} href={roomHref}>Open the room</Link>}
        </Row>
      </ol>
      <p className="small">
        Prefer to read first? <Link className="link" href="/verify">Check any agreement yourself</Link> or see <Link className="link" href="/try">the attack recorded on testnet</Link>.
        {" "}<button type="button" className="link small" onClick={() => { try { if (w.accountId) localStorage.removeItem(`${ROOM_KEY}:${w.accountId}`); } catch { /* */ } setRoom(null); router.refresh(); }}>Start over with a new room</button>
      </p>
    </div>
  );
}

/** "Get test NEAR", or "Confirm it's you and get test NEAR" before the session exists. */
const faucetLabel = (base: string, session: boolean) => (session ? base : `Confirm it's you and ${base[0]!.toLowerCase()}${base.slice(1)}`);

function Row({ n, icon, status, title, text, children }: {
  n: number; icon: PixelName; status: Status; title: string; text: React.ReactNode; children?: React.ReactNode;
}) {
  return (
    <li className={`${styles.step} ${status === "done" ? styles.done : status === "now" ? styles.now : styles.later}`}>
      <IconTile name={status === "done" ? "check" : icon} size={44} tone={status === "done" ? "teal" : undefined} />
      <div className={styles.text}>
        <div className={styles.head}>
          <span className="mono small">{String(n).padStart(2, "0")}</span>
          <h2 className="h4">{title}</h2>
          <span className={`mono small ${styles.status}`}>{status === "done" ? "done" : status === "now" ? "your move" : "next"}</span>
        </div>
        <p className="small">{text}</p>
        {children && <div className={styles.actions}>{children}</div>}
      </div>
    </li>
  );
}
