"use client";

// Five steps, each with its live status read from the chain (or the faucet) and one button. The visitor signs every
// buyer step in their own wallet; Accord's demo vendor answers in the room.

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Accord, AccordError, DEMO_PARAMS, formatUnits, type AgreementView } from "@accord/sdk";
import { useWallet } from "@/components/wallet/WalletProvider";
import { useAppConfig } from "@/components/AppConfig";
import { useOrg } from "@/components/org/OrgProvider";
import { IconTile } from "@/components/IconTile";
import type { PixelName } from "@/components/PixelIcon";
import { readClient } from "@/components/me/client";
import styles from "./tryit.module.css";

interface Demo { vendor: string; authority: string; recipient: string; stranger: string; domain: string }
interface Ready { faucet: boolean; counterparty: boolean; agent: boolean }
interface Balances { near: string; tusdc: string }

const ROOM_KEY = "accord-try-it-room";
const TITLE = "My first deal room";
const YOCTO = 10n ** 24n;
const near = (y: string) => (Number(BigInt(y) / 10n ** 21n) / 1000).toFixed(2);

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
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ step: number; ok: boolean; text: string; txs?: { label: string; hash: string }[] } | null>(null);
  const txUrl = (h: string) => (explorer ? `${explorer}/txns/${h}` : null);

  const load = useCallback(async () => {
    if (!w.accountId) { setBal(null); setRoom(null); return; }
    const a = new Accord({ network: network === "sandbox" ? "sandbox" : "testnet", factory: cfg.factory, rpc: cfg.rpc });
    try {
      const ft = (await a.config()).token;
      const [info, usdc] = await Promise.all([
        a.chain.account(w.accountId).catch(() => null),
        a.chain.view<string>(ft, "ft_balance_of", { account_id: w.accountId }).catch(() => "0"),
      ]);
      setBal({ near: String(info?.amount ?? "0"), tusdc: String(usdc ?? "0") });
    } catch { /* the RPC is slow; the next pass reads it */ }
    // this browser's try-it room, else the visitor's newest room with the demo vendor
    let id: string | null = null;
    try { id = localStorage.getItem(`${ROOM_KEY}:${w.accountId}`); } catch { /* no storage */ }
    if (!id) {
      const mine = await a.listAgreements({ party: w.accountId }).catch(() => []);
      id = mine.filter((r) => r.buyer === w.accountId && r.vendor === demo.vendor).sort((x, y) => y.id - x.id)[0]?.account ?? null;
    }
    if (id) {
      const c = readClient(cfg, id);
      const [v, cm] = await Promise.all([c.get().catch(() => null), c.commitments().catch(() => null)]);
      setRoom(v);
      setBuyerSealed(!!cm?.buyer || (v ? v.state !== "Sealed" : false));
    } else setRoom(null);
  }, [w.accountId, network, cfg, demo.vendor]);

  useEffect(() => {
    void load();
    const t = setInterval(() => { if (document.visibilityState === "visible") void load(); }, 8000);
    return () => clearInterval(t);
  }, [load]);

  const funded = !!bal && BigInt(bal.near) >= 2n * YOCTO + YOCTO / 5n && BigInt(bal.tusdc) >= 40_000_000n;

  async function faucet() {
    setBusy("faucet"); setMsg(null);
    try {
      if (!org.session && !(await org.confirm())) { setMsg({ step: 2, ok: false, text: "The faucet needs you to confirm it's you, so it knows which account to fund." }); return; }
      const r = await fetch("/api/faucet", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      const b = (await r.json()) as { error?: string; txs?: { label: string; hash: string }[]; balances?: Balances };
      if (!r.ok) { setMsg({ step: 2, ok: false, text: b.error ?? `the faucet said ${r.status}` }); return; }
      if (b.balances) setBal(b.balances);
      setMsg({ step: 2, ok: true, text: b.txs?.length ? "Sent. Your balances are below." : "Your account already had enough.", txs: b.txs });
    } catch (e) {
      setMsg({ step: 2, ok: false, text: (e as Error).message });
    } finally { setBusy(null); }
  }

  async function create() {
    if (!w.signer || !w.accountId) return;
    setBusy("create"); setMsg(null);
    try {
      const a = new Accord({ network: network === "sandbox" ? "sandbox" : "testnet", factory: cfg.factory, rpc: cfg.rpc, signer: w.signer });
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
      setMsg({ step: 3, ok: false, text: e instanceof AccordError ? e.code ?? e.message : (e as Error).message });
    } finally { setBusy(null); }
  }

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
    : room.state === "Executing" ? `Executing · funded ${formatUnits(room.funded)} of ${formatUnits(room.total)} tUSDC · paid ${formatUnits(room.paid)} · ${room.refusals} refused`
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
      <ol className={styles.steps}>
        <Row n={1} icon="key" status={s1} title="Connect a wallet" text={w.accountId
          ? <>Signed in as <span className="mono">{w.accountId}</span>.</>
          : <>A NEAR testnet wallet: <a className="link" href="https://wallet.meteorwallet.app" target="_blank" rel="noreferrer">Meteor</a> or <a className="link" href="https://wallet.intear.tech" target="_blank" rel="noreferrer">Intear</a> (switch it to testnet). Ledger, Nightly and WalletConnect work too. Meteor and Intear send through Accord&apos;s relayer, so you pay no gas.</>}>
          {!w.accountId && <Link className={styles.primary} href="/signin?next=/try-it">Sign in</Link>}
        </Row>

        <Row n={2} icon="bank" status={s2} title="Get test funds" text={<>
          The faucet tops your account up to 2.5 testnet NEAR (the room&apos;s 2 NEAR deposit, returned when it closes) and 100 test USDC. Once a day per account.
          {bal && <span className={`mono ${styles.bal}`}>{near(bal.near)} NEAR · {formatUnits(bal.tusdc)} tUSDC</span>}
        </>}>
          {w.accountId && s2 !== "done" && (
            <button type="button" className={styles.primary} disabled={busy !== null || !ready.faucet} onClick={() => void faucet()}>
              {busy === "faucet" ? "Sending…" : org.session ? "Get test funds" : "Confirm it's you and get test funds"}
            </button>
          )}
          <Note step={2} />
        </Row>

        <Row n={3} icon="store" status={s3} title="Open a deal room" text={room
          ? <>Your room is <Link className="mono link" href={roomHref!}>{room.account}</Link>: {room.title}.</>
          : <>Prefilled: a vendor contract with <span className="mono">{demo.vendor}</span>, its authority <span className="mono">{demo.authority}</span>, domain <span className="mono">{demo.domain}</span>, titled &quot;{TITLE}&quot;. Your wallet signs <span className="mono">create_agreement</span> with a {deposit ? formatUnits(deposit, 24) : "2"} NEAR deposit.</>}>
          {!room && w.accountId && (
            <button type="button" className={styles.primary} disabled={busy !== null || s3 !== "now"} onClick={() => void create()}>
              {busy === "create" ? "Waiting for your wallet…" : "Create the room"}
            </button>
          )}
          <Note step={3} />
        </Row>

        <Row n={4} icon="lock" status={s4} title="Seal your limits" text={<>
          Pick the Northwind buyer preset: a ceiling of 40 tUSDC across 2 to 4 items. Your limits are encrypted to the Sealed Table; the vendor never sees them. The demo vendor seals its own (floor 30, target 38).
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
