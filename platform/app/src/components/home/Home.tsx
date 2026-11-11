"use client";

// Home, per workspace (docs/build/PLATFORM.md §7, simplified after Aditya's review): one clear next step at the top with at most
// two more behind "more"; then at most three numbers in a quiet row; then the workspace's rooms. Everything is read
// from contract views through /api/me and filtered to the workspace's role; nothing here signs. "Customise" shows,
// hides and reorders the three modules, remembered per account and workspace in this browser.

import { sumBySymbol } from "@/lib/units";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Portfolio, PortfolioRoom } from "@/server/data";
import { useWallet } from "../wallet/WalletProvider";
import { useWorkspace } from "../workspace/Workspace";
import { KindLabel } from "../rooms/KindLabel";
import { StatePill, Usdc } from "../ui";
import { onVisibleInterval } from "../visible";
import { TenderAgents } from "./TenderAgents";
import styles from "./Home.module.css";

type Module = "next" | "numbers" | "rooms";
const MODULE_NAME: Record<Module, string> = { next: "Next for you", numbers: "Numbers", rooms: "Your rooms" };
const DEFAULT: { id: Module; on: boolean }[] = [{ id: "next", on: true }, { id: "numbers", on: true }, { id: "rooms", on: true }];

export function Home() {
  const w = useWallet();
  const { ws } = useWorkspace();
  const [data, setData] = useState<Portfolio | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [editing, setEditing] = useState(false);
  const store = `accord-home:${w.accountId ?? "guest"}:${ws.id}`;
  const [layout, setLayout] = useState(DEFAULT);

  useEffect(() => {
    try { const v = JSON.parse(localStorage.getItem(store) ?? "null"); setLayout(Array.isArray(v) && v.length === 3 ? v : DEFAULT); } catch { setLayout(DEFAULT); }
  }, [store]);
  const save = (next: typeof DEFAULT) => { setLayout(next); try { localStorage.setItem(store, JSON.stringify(next)); } catch { /* this page only */ } };

  useEffect(() => {
    if (!w.accountId) { setData(null); return; }
    let live = true;
    const load = () => fetch(`/api/me?account=${encodeURIComponent(w.accountId!)}`, { cache: "no-store" })
      .then(async (r) => { const b = await r.json(); if (!r.ok) throw new Error(b.error ?? `HTTP ${r.status}`); return b as Portfolio; })
      .then((b) => { if (live) { setData(b); setError(null); } })
      .catch((e: Error) => { if (live) setError(e.message); });
    void load();
    const stop = onVisibleInterval(load, 15000);
    return () => { live = false; stop(); };
  }, [w.accountId]);

  // the workspace's slice of the portfolio
  const view = useMemo(() => {
    if (!data) return null;
    const role = ws.id === "reviewer" ? "buyer" : ws.role;
    const rooms = role ? data.rooms.filter((r) => r.roles.includes(role)) : data.rooms;
    let needs = role ? data.needs.filter((n) => n.role === role) : data.needs;
    if (ws.id === "reviewer") needs = needs.filter((n) => n.action === "Review a delivery");
    return { rooms, needs };
  }, [data, ws]);

  if (!w.accountId) return <div className="container"><p className={styles.quiet}>Taking you to sign in…</p></div>;

  if (ws.id === "auditor") {
    return (
      <div className="container">
        <div className={styles.head}><div><p className="eyebrow">Auditor workspace</p><h1 className="h2">Check any agreement</h1></div></div>
        <div className={styles.auditor}>
          <p className="body-lg">Verifying needs no account and no keys: every check reads public data on NEAR.</p>
          <div className={styles.auditorLinks}><Link href="/verify" className={styles.primary}>Verify an agreement</Link><Link href="/record" className={styles.secondary}>Open the public record</Link></div>
        </div>
      </div>
    );
  }

  const blocks: Record<Module, React.ReactNode> = {
    next: view && <NextFor key="next" needs={view.needs} more={more} setMore={setMore} />,
    numbers: view && data && <Numbers key="numbers" ws={ws.id} rooms={view.rooms} data={data} needs={view.needs.length} />,
    rooms: view && <Rooms key="rooms" rooms={view.rooms} role={ws.role} account={w.accountId} showNew={ws.id === "buyer"} />,
  };

  return (
    <div className="container">
      <div className={styles.head}>
        <div>
          <p className="eyebrow">{ws.name} workspace</p>
          <h1 className="h2">Home</h1>
        </div>
        <div className={styles.headActions}>
          <button type="button" className={styles.customise} onClick={() => setEditing((v) => !v)} aria-expanded={editing}>{editing ? "Done" : "Customise"}</button>
          {ws.id === "buyer" ? <Link href="/agreements/new" className={styles.primary}>New deal room</Link> : null}
        </div>
      </div>

      {editing && (
        <div className={styles.editor} role="group" aria-label="Customise Home">
          {layout.map((m, i) => (
            <div key={m.id} className={styles.editRow}>
              <label className={styles.editLabel}>
                <input type="checkbox" checked={m.on} onChange={() => save(layout.map((x) => (x.id === m.id ? { ...x, on: !x.on } : x)))} />
                <span>{MODULE_NAME[m.id]}</span>
              </label>
              <span className={styles.editMove}>
                <button type="button" disabled={i === 0} onClick={() => { const n = [...layout]; [n[i - 1], n[i]] = [n[i]!, n[i - 1]!]; save(n); }} aria-label={`Move ${MODULE_NAME[m.id]} up`}>↑</button>
                <button type="button" disabled={i === layout.length - 1} onClick={() => { const n = [...layout]; [n[i + 1], n[i]] = [n[i]!, n[i + 1]!]; save(n); }} aria-label={`Move ${MODULE_NAME[m.id]} down`}>↓</button>
              </span>
            </div>
          ))}
          <button type="button" className={styles.reset} onClick={() => save(DEFAULT)}>Reset</button>
        </div>
      )}

      {error && <div className={styles.error} role="alert"><p className="h5">The chain could not be read</p><p className="small mono">{error}</p></div>}
      {!data && !error && <div className={styles.loading} aria-busy="true"><span /><span /><span /></div>}
      {data && (
        <div className={styles.stack}>
          {layout.filter((m) => m.on).map((m) => blocks[m.id])}
          {ws.id === "buyer" || ws.id === "vendor" ? <TenderAgents account={w.accountId} /> : null}
        </div>
      )}
    </div>
  );
}

function NextFor({ needs, more, setMore }: { needs: Portfolio["needs"]; more: boolean; setMore: (v: boolean) => void }) {
  const [first, ...rest] = needs;
  if (!first) {
    return (
      <section className={styles.nextEmpty}>
        <p><span className={styles.strong}>Nothing needs you right now.</span> Your rooms move on their own until a decision is yours.</p>
      </section>
    );
  }
  const extra = rest.slice(0, 2);
  return (
    <section className={styles.next} aria-labelledby="next-title">
      <p id="next-title" className={styles.nextLabel}>Next for you</p>
      <Link href={first.href} className={styles.nextMain}>
        <span className={styles.nextText}>
          <span className={styles.nextAction}>{first.action}</span>
          <span className={styles.nextDetail}>{first.title} · {first.detail}</span>
        </span>
        <span className={styles.go}>Open <span aria-hidden="true">→</span></span>
      </Link>
      {extra.length > 0 && (
        <>
          <button type="button" className={styles.moreBtn} onClick={() => setMore(!more)} aria-expanded={more}>
            {more ? "Show less" : `Show ${extra.length} more`}
          </button>
          {more && (
            <ul className={styles.moreList}>
              {extra.map((n, i) => (
                <li key={`${n.room}-${n.action}-${i}`}>
                  <Link href={n.href} className={styles.moreItem}><span>{n.action}</span><span className={styles.moreRoom}>{n.title}</span><span aria-hidden="true">→</span></Link>
                </li>
              ))}
              {rest.length > 2 && <li><Link href="/approvals" className={styles.moreAll}>See everything waiting in Approvals</Link></li>}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

function Numbers({ ws, rooms, data, needs }: { ws: string; rooms: PortfolioRoom[]; data: Portfolio; needs: number }) {
  const refused = rooms.reduce((a, r) => a + r.refusals, 0);
  // one figure per token: test USDC and Circle USDC are never added together
  const total = (pick: (r: PortfolioRoom) => string | bigint) => <Amounts parts={sumBySymbol(rooms.map((r) => ({ amount: pick(r), symbol: r.symbol ?? data.unit })))} fallback={data.unit} />;
  const items: { label: string; value: React.ReactNode; note: React.ReactNode; refusal?: boolean }[] =
    ws === "vendor" ? [
      { label: "Paid to you", value: total((r) => r.paid), note: `across ${rooms.length} room${rooms.length === 1 ? "" : "s"}` },
      { label: "Still to come", value: total((r) => BigInt(r.total) - BigInt(r.paid)), note: "under the approved terms" },
      { label: "Waiting on you", value: String(needs), note: needs ? "see Next for you" : "nothing to do" },
    ] : ws === "authority" ? [
      { label: "Rooms you authorise", value: String(rooms.length), note: "your company is the vendor" },
      { label: "Changes waiting", value: String(needs), note: needs ? "a recipient to approve" : "none pending" },
    ] : ws === "reviewer" ? [
      { label: "To review", value: String(needs), note: "deliveries to accept or dispute" },
    ] : [
      { label: "In escrow", value: total((r) => r.escrowed), note: `across ${rooms.length} room${rooms.length === 1 ? "" : "s"} you fund` },
      { label: "Paid this month", value: <Usdc amount={data.paidThisMonth} symbol={data.unit} />, note: BigInt(data.paidTotal) > 0n ? "every payment matched its terms" : "no payments yet" },
      { label: "Refused", value: String(refused), refusal: refused > 0, note: data.topCode && refused ? <span className="mono">{data.topCode.code}</span> : "every payment matched its terms" },
    ];
  return (
    <div className={styles.numbers}>
      {items.map((x) => (
        <div key={x.label} className={styles.number}>
          <span className={styles.numLabel}>{x.label}</span>
          <span className={`${styles.numValue} ${x.refusal ? styles.refusal : ""}`}>{x.value}</span>
          <span className={styles.numNote}>{x.note}</span>
        </div>
      ))}
    </div>
  );
}

function Rooms({ rooms, role, account, showNew }: { rooms: PortfolioRoom[]; role: string | null; account: string; showNew: boolean }) {
  return (
    <section aria-labelledby="rooms-title">
      <div className={styles.sectionHead}>
        <h2 id="rooms-title" className="h4">Your rooms</h2>
        <Link href={`/rooms?party=${encodeURIComponent(account)}${role ? `&role=${role}` : ""}`} className="small weak">See all</Link>
      </div>
      {rooms.length === 0 ? (
        <div className={styles.ghost}>
          <p className="h5">{showNew ? "Start your first deal room" : "No rooms yet in this workspace"}</p>
          <p className="small">{showNew ? "Seal your limits, let the agents negotiate, approve the terms, and the contract enforces every payment." : "When a company invites you to a deal room, it shows up here."}</p>
          {showNew ? <Link href="/agreements/new" className={styles.primary}>New deal room</Link> : null}
        </div>
      ) : (
        <ul className={`${styles.rooms} stagger`}>
          {rooms.slice(0, 6).map((r) => (
            <li key={r.account}>
              <Link href={`/agreements/${r.account}`} className={styles.room}>
                <span className={styles.roomMain}>
                  <span className={styles.roomTitle}>{r.title}</span>
                  <KindLabel kind={r.kind} with={r.counterparty} />
                </span>
                <span className={styles.roomMoney}><Usdc amount={r.paid} symbol={r.symbol} /> <span className="faint">of</span> <Usdc amount={r.total} symbol={r.symbol} /></span>
                <span className={styles.roomState}><StatePill state={r.state} /></span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Amounts per token, joined; 0 in the fallback unit when there are none. */
function Amounts({ parts, fallback }: { parts: { symbol: string; amount: bigint }[]; fallback: string }) {
  const shown = parts.length ? parts : [{ symbol: fallback, amount: 0n }];
  return <>{shown.map((p, i) => <span key={p.symbol}>{i > 0 ? " · " : null}<Usdc amount={p.amount} symbol={p.symbol} /></span>)}</>;
}
